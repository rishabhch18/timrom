import { UiTextPipe } from "./ui-text.pipe";
import { BuilderComponent } from "./builder.component";
import { CommunityPanelComponent } from "./community-panel.component";
import { Component, effect, inject, signal } from "@angular/core";
import { CallService } from "./call.service";
import { SocialService, Home, Item } from "./social.service";
import { ConnectedWorldComponent } from "./connected-world.component";
@Component({
  selector: "timrom-social",
  imports: [
    UiTextPipe,
    ConnectedWorldComponent,
    BuilderComponent,
    CommunityPanelComponent,
  ],
  templateUrl: "./social.component.html",
})
export class SocialComponent {
  readonly call = inject(CallService);
  readonly api = inject(SocialService);
  readonly panel = signal("homes");
  readonly adminHome=signal("");
  readonly signup = signal(false);
  readonly recover = signal(false);
  readonly method = signal("email");
  readonly challenge = signal("");
  readonly code = signal("");
  readonly selected = signal<Item | null>(null);
  readonly placement = signal<Item | null>(null);
  readonly rotation = signal(0);
  readonly search = signal("");
  readonly filterGenre = signal("");
  readonly filterRegion = signal("");
  readonly filterCountry = signal("");
  readonly filterState = signal("");
  readonly filterCity = signal("");
  readonly globeLongitude = signal(78);
  readonly chatExpanded = signal(false);
  readonly reply = signal("");
  readonly editing = signal("");
  t(en: string, hi: string) {
    return this.api.state()?.me.preferences?.["language"] === "hi" ? hi : en;
  }
  homes() {
    return (this.api.state()?.homes || []).filter(
      (h) =>
        (!this.filterGenre() || h.genre === this.filterGenre()) &&
        (!this.filterRegion() || h.region === this.filterRegion()) &&
        [h.name, h.city, h.country, h.state]
          .join(" ")
          .toLowerCase()
          .includes(this.search().toLowerCase()) &&
        (!this.filterCountry() ||
          h.country
            .toLowerCase()
            .includes(this.filterCountry().toLowerCase())) &&
        (!this.filterState() ||
          h.state.toLowerCase().includes(this.filterState().toLowerCase())) &&
        (!this.filterCity() ||
          h.city.toLowerCase().includes(this.filterCity().toLowerCase())),
    );
  }
  globe(h: Home) {
    if (h.latitude == null || h.longitude == null) return null;
    const lat = (h.latitude * Math.PI) / 180,
      lon = ((h.longitude - this.globeLongitude()) * Math.PI) / 180;
    return Math.cos(lon) < 0
      ? null
      : {
          x: 100 + 88 * Math.cos(lat) * Math.sin(lon),
          y: 100 - 88 * Math.sin(lat),
        };
  }
  unread() {
    return this.api.state()?.notifications.filter((n) => !n.seen).length || 0;
  }

  private accountId = "";
  constructor() {
    effect(() => {
      const state = this.api.state();
      if (!state) {
        this.accountId = "";
        return;
      }
      if (this.accountId !== state.me.id) {
        this.accountId = state.me.id;
        if (state.room) this.panel.set("");
      }
    });
  }
  worldCommand(value: { type: string; data: Record<string, unknown> }) {
    const item = this.placement();
    if (item && value.type === "move") {
      void this.api
        .command("place", {
          ...value.data,
          item: item.id,
          rotation: this.rotation(),
        })
        .then(() => this.placement.set(null))
        .catch((e) => this.api.error.set(e.message));
    } else void this.api.run(value.type, value.data);
  }
  place(item: Item) {
    this.placement.set(item);
    this.rotation.set(item.rotation || 0);
    this.panel.set("");
  }
  audible(id: string) {
    const p = this.api.state()?.room?.people.find((p) => p.id === id);
    return !!p?.speaker && !p?.muted && !p?.blocked && !p?.personalMuted;
  }
  cryptoId() {
    return crypto.randomUUID();
  }
  readonly activityKinds = [
    "Socializing",
    "Studying",
    "Working",
    "Gaming",
    "Eating",
    "Resting",
    "Sleeping",
  ];
  async account(event: Event) {
    event.preventDefault();
    const d = Object.fromEntries(new FormData(event.target as HTMLFormElement));
    try {
      const r = await this.api.auth(
        this.challenge()
          ? "verify"
          : this.recover()
            ? "reset"
            : this.signup()
              ? "signup"
              : this.method() === "phone"
                ? "mobile"
                : "login",
        { ...d, kind: this.method(), challenge: this.challenge() },
      );
      if (r["challenge"]) {
        this.challenge.set(r["challenge"]);
        this.code.set(r["developmentCode"] || "");
      } else {
        this.challenge.set("");
        this.code.set("");
      }
    } catch {}
  }
  form(event: Event, type: string, extra: Record<string, unknown> = {}) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const data: Record<string, unknown> = {
      ...Object.fromEntries(new FormData(form)),
      ...extra,
    };
    if (data["capacity"] !== undefined)
      data["capacity"] = data["capacity"] === "" ? 8 : Number(data["capacity"]);
    if (type === "chat") {
      data["reply"] = this.reply() || undefined;
      data["nonce"] = crypto.randomUUID();
    }
    void this.api
      .command(type, data)
      .then(() => {
        if (type === "chat") {
          form.reset();
          this.reply.set("");
        }
        if (type === "editMessage") this.editing.set("");
        if (type === "createHome" || type === "invite") this.panel.set("");
      })
      .catch((e) => this.api.error.set(e.message));
  }
  home() {
    const s = this.api.state();
    return s?.homes.find((h) => h.id === s.room?.home);
  }
  manage() {
    return ["owner", "admin"].includes(
      this.api.state()?.room?.role || this.home()?.role || "",
    );
  }
  enter(home: Home) {
    const room = home.rooms.find((r) => r.outdoor) || home.rooms[0];
    if (room) {
      void this.api.run("join", { room: room.id });
      this.panel.set("");
    }
  }
  async join(home: Home) {
    await this.api.run("joinHome", { home: home.id, acceptRules: true });
  }
  actions(item: Item) {
    return (
      (
        {
          chair: ["sit"],
          sofa: ["sit", "rest"],
          bed: ["rest", "sleep"],
          desk: ["study", "work"],
          counter: ["eat"],
        } as Record<string, string[]>
      )[item.asset] || []
    );
  }
  act(action: string) {
    const item = this.selected();
    if (item) void this.api.run("interact", { item: item.id, action });
    this.selected.set(null);
  }
  toggle(name: string) {
    this.panel.set(this.panel() === name ? "" : name);
  }
}
