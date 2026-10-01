import {
  Component,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  DestroyRef,
} from "@angular/core";
import { HeaderComponent } from "./header.component";
import { WorldComponent } from "./world.component";
import { WorldState, Item } from "./social.service";
@Component({
  selector: "timrom-connected-world",
  imports: [HeaderComponent, WorldComponent],
  template: `<timrom-header style="display:none" /><timrom-world />
    <div id="modal" hidden><div id="sheet"></div></div>
    <div id="fx"></div>
    <div class="connected-room-labels"></div>
    <div class="connected-view">
      <button
        title="Show whole home"
        aria-label="Show whole home"
        (click)="engine?.overview()"
      >
        ⌂</button
      ><button
        title="Follow avatar"
        aria-label="Follow avatar"
        (click)="engine?.follow()"
      >
        ◎
      </button>
    </div>`,
  host: {
    class: "connected-world",
    tabindex: "0",
    "aria-label": "Home world. Arrow keys to walk, W to wave.",
    "(keydown)": "keyboard($event)",
  },
})
export class ConnectedWorldComponent {
  readonly state = input.required<WorldState>();
  readonly command = output<{ type: string; data: Record<string, unknown> }>();
  readonly item = output<Item>();
  readonly failure = output<string>();
  private host = inject(ElementRef<HTMLElement>);
  private destroyRef = inject(DestroyRef);
  private disposed = false;
  engine: any;
  constructor() {
    effect(() => this.engine?.updateConnected(this.state()));
    afterNextRender(() => void this.mount());
    this.destroyRef.onDestroy(() => {
      this.disposed = true;
      this.engine?.destroy();
    });
  }
  keyboard(e: KeyboardEvent) {
    if ((e.target as HTMLElement).closest("input,textarea,select,button"))
      return;
    const s = this.state(),
      me = s.scene?.people.find((p) => p.id === s.me.id);
    if (!me) return;
    const delta: Record<string, number[]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    if (delta[e.key]) {
      e.preventDefault();
      const [dx, dy] = delta[e.key];
      this.command.emit({
        type: "move",
        data: { room: me.room, x: me.x + dx, y: me.y + dy },
      });
    }
    if (e.key.toLowerCase() === "w")
      this.command.emit({ type: "wave", data: {} });
  }
  private async mount() {
    try {
      const { mountTimrom } = await import("../world/timrom-engine.js");
      if (this.disposed) return;
      this.engine = mountTimrom(this.host.nativeElement, {
        live: true,
        storage: { load: (fn: () => unknown) => fn(), save: () => {} },
        onSnapshot: () => {},
        onError: (e: Error) => this.failure.emit(e.message),
        onCommand: (type: string, data: Record<string, unknown>) =>
          this.command.emit({ type, data }),
        onItem: (item: Item) => this.item.emit(item),
      });
      this.engine.updateConnected(this.state());
    } catch (e) {
      this.failure.emit(
        e instanceof Error ? e.message : "The 3D view could not start.",
      );
    }
  }
}
