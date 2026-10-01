import { Component, effect, inject, signal } from "@angular/core";
import { CallService } from "./call.service";
import { SocialService, Home, Item } from "./social.service";
import { ConnectedWorldComponent } from "./connected-world.component";
@Component({
  selector: "timrom-social",
  imports: [ConnectedWorldComponent],
  templateUrl: "./social.component.html",
})
export class SocialComponent {
  readonly call = inject(CallService);
  readonly api = inject(SocialService);
  readonly panel = signal("homes");
  readonly signup = signal(false);
  readonly method = signal("email");
  readonly challenge = signal("");
  readonly code = signal("");
  readonly selected = signal<Item | null>(null);
  readonly placement = signal<Item | null>(null);
  readonly rotation = signal(0);
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
    return !!p?.speaker && !p?.muted && !p?.blocked;
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
      data["nonce"] = crypto.randomUUID();
    }
    void this.api
      .command(type, data)
      .then(() => {
        if (type === "chat") form.reset();
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
