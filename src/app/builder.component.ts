import { UiTextPipe } from "./ui-text.pipe";
import { Component, inject, signal } from "@angular/core";
import { SocialService, LayoutRoom, Door } from "./social.service";
@Component({
  selector: "timrom-builder",
  imports: [UiTextPipe],
  template: `
    <h2>{{ "Home builder" | ui }}</h2>
    <p>
      {{
        "Edit a draft, then publish it together. Occupied rooms must be empty before resizing or moving."
          | ui
      }}
    </p>
    <button (click)="load()">{{ "Reload saved layout" | ui }}</button>
    <button [disabled]="!history.length" (click)="undo()">
      {{ "↶ Undo" | ui }}
    </button>
    @if (rooms().length) {
      <svg
        class="floor-editor"
        [attr.viewBox]="viewBox()"
        role="img"
        aria-label="Draft home floor plan"
      >
        @for (r of rooms(); track r.id) {
          <g
            (click)="selected.set(r.id)"
            tabindex="0"
            role="button"
            [attr.aria-label]="r.name"
            (keydown.enter)="selected.set(r.id)"
          >
            <rect
              [attr.x]="r.ox"
              [attr.y]="r.oy"
              [attr.width]="r.width"
              [attr.height]="r.height"
              [attr.fill]="
                r.id === selected()
                  ? '#c4b5df'
                  : r.outdoor
                    ? '#b6d09f'
                    : '#e9d6bc'
              "
              stroke="#756889"
              stroke-width=".15"
            />
            <text [attr.x]="r.ox + 1" [attr.y]="r.oy + 2" font-size="1">
              {{ r.name }}
            </text>
          </g>
        }
        @for (d of doors(); track $index) {
          <circle
            [attr.cx]="doorX(d)"
            [attr.cy]="doorY(d)"
            r=".65"
            fill="#fff"
            stroke="#685886"
            stroke-width=".2"
          />
        }
      </svg>
      @for (r of rooms(); track r.id) {
        @if (r.id === selected()) {
          <h3>{{ r.name }}</h3>
          <div class="form-grid">
            @for (k of axes; track k.key) {
              <label
                >{{ k.label
                }}<input
                  type="number"
                  [value]="r[k.key]"
                  (input)="change(r.id, k.key, +$any($event.target).value)"
              /></label>
            }
          </div>
        }
      }
      <h3>{{ "Doorways" | ui }}</h3>
      @for (d of doors(); track $index) {
        <div class="compact-row">
          <span>{{ name(d.a) }} ↔ {{ name(d.b) }}</span
          ><button aria-label="Remove doorway" (click)="remove($index)">
            ×
          </button>
        </div>
      }
      <form (submit)="addDoor($event)">
        <label
          >{{ "From" | ui
          }}<select name="a">
            @for (r of rooms(); track r.id) {
              <option [value]="r.id">{{ r.name }}</option>
            }
          </select></label
        ><label
          >{{ "To" | ui
          }}<select name="b">
            @for (r of rooms(); track r.id) {
              <option [value]="r.id">{{ r.name }}</option>
            }
          </select></label
        >
        <div class="form-grid">
          @for (k of ["ax", "ay", "bx", "by"]; track k) {
            <label
              >{{ doorLabel(k)
              }}<input [name]="k" type="number" min="0" value="0" required
            /></label>
          }
        </div>
        <button>{{ "Add doorway at these tiles" | ui }}</button>
      </form>
      <button (click)="connectAdjacent()">
        {{ "Connect touching rooms" | ui }}
      </button>
      <button class="primary" [disabled]="saving()" (click)="publish()">
        {{ saving() ? "Publishing…" : "Publish draft" }}
      </button>
      @if (note()) {
        <p role="status">{{ note() }}</p>
      }
    }
  `,
})
export class BuilderComponent {
  readonly api = inject(SocialService);
  readonly rooms = signal<LayoutRoom[]>([]);
  readonly doors = signal<Door[]>([]);
  readonly selected = signal("");
  readonly saving = signal(false);
  readonly note = signal("");
  readonly axes: { key: "ox" | "oy" | "width" | "height"; label: string }[] = [
    { key: "ox", label: "Left" },
    { key: "oy", label: "Top" },
    { key: "width", label: "Width" },
    { key: "height", label: "Height" },
  ];
  history: { rooms: LayoutRoom[]; doors: Door[] }[] = [];
  private revision = 0;
  private home = "";
  constructor() {
    this.load();
  }
  load() {
    const s = this.api.state()?.scene;
    if (!s) return;
    this.home = s.home;
    this.revision = s.revision;
    this.rooms.set(structuredClone(s.rooms));
    this.doors.set(structuredClone(s.portals));
    this.selected.set(s.rooms[0]?.id || "");
    this.history = [];
    this.note.set("");
  }
  remember() {
    this.history.push(
      structuredClone({ rooms: this.rooms(), doors: this.doors() }),
    );
    if (this.history.length > 50) this.history.shift();
  }
  undo() {
    const s = this.history.pop();
    if (s) {
      this.rooms.set(s.rooms);
      this.doors.set(s.doors);
    }
  }
  change(id: string, k: "ox" | "oy" | "width" | "height", value: number) {
    this.remember();
    this.rooms.update((rs) =>
      rs.map((r) => (r.id === id ? { ...r, [k]: value } : r)),
    );
  }
  remove(i: number) {
    this.remember();
    this.doors.update((ds) => ds.filter((_, n) => n !== i));
  }
  addDoor(e: Event) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target as HTMLFormElement));
    this.remember();
    this.doors.update((ds) => [
      ...ds,
      {
        a: String(d["a"]),
        b: String(d["b"]),
        ax: Number(d["ax"]),
        ay: Number(d["ay"]),
        bx: Number(d["bx"]),
        by: Number(d["by"]),
      },
    ]);
  }
  connectAdjacent() {
    this.remember();
    const ds: Door[] = [];
    const rooms = this.rooms();
    for (let i = 0; i < rooms.length; i++)
      for (let j = i + 1; j < rooms.length; j++) {
        let a = rooms[i],
          b = rooms[j];
        if (a.ox > b.ox) [a, b] = [b, a];
        const lo = Math.max(a.oy, b.oy),
          hi = Math.min(a.oy + a.height, b.oy + b.height);
        if (a.ox + a.width === b.ox && hi > lo) {
          const y = Math.floor((lo + hi - 1) / 2);
          ds.push({
            a: a.id,
            b: b.id,
            ax: a.width - 1,
            ay: y - a.oy,
            bx: 0,
            by: y - b.oy,
          });
        }
        a = rooms[i];
        b = rooms[j];
        if (a.oy > b.oy) [a, b] = [b, a];
        const l = Math.max(a.ox, b.ox),
          r = Math.min(a.ox + a.width, b.ox + b.width);
        if (a.oy + a.height === b.oy && r > l) {
          const x = Math.floor((l + r - 1) / 2);
          ds.push({
            a: a.id,
            b: b.id,
            ax: x - a.ox,
            ay: a.height - 1,
            bx: x - b.ox,
            by: 0,
          });
        }
      }
    this.doors.set(ds);
  }
  doorLabel(k: string) {
    return (
      {
        ax: "From column",
        ay: "From row",
        bx: "To column",
        by: "To row",
      } as Record<string, string>
    )[k];
  }
  name(id: string) {
    return this.rooms().find((r) => r.id === id)?.name;
  }
  doorX(d: Door) {
    return (this.rooms().find((r) => r.id === d.a)?.ox || 0) + d.ax + 0.5;
  }
  doorY(d: Door) {
    return (this.rooms().find((r) => r.id === d.a)?.oy || 0) + d.ay + 0.5;
  }
  viewBox() {
    return `-1 -1 ${Math.max(24, ...this.rooms().map((r) => r.ox + r.width)) + 2} ${Math.max(18, ...this.rooms().map((r) => r.oy + r.height)) + 2}`;
  }
  async publish() {
    this.saving.set(true);
    try {
      await this.api.command("publishLayout", {
        home: this.home,
        revision: this.revision,
        rooms: this.rooms(),
        doors: this.doors(),
      });
      this.revision++;
      this.history = [];
      this.note.set("Layout published.");
    } catch (e) {
      this.api.error.set((e as Error).message);
    } finally {
      this.saving.set(false);
    }
  }
}
