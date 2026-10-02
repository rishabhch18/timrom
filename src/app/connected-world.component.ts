import {
  Component,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  DestroyRef,
  signal,
} from "@angular/core";
import { HeaderComponent } from "./header.component";
import { WorldComponent } from "./world.component";
import { WorldState, Item } from "./social.service";
import { UiTextPipe } from "./ui-text.pipe";
import { keyboardDestination } from "../shared/navigation.mjs";
@Component({
  selector: "timrom-connected-world",
  imports: [HeaderComponent, WorldComponent, UiTextPipe],
  template: `<timrom-header style="display:none" /><timrom-world />
    <div id="modal" hidden><div id="sheet"></div></div>
    <div id="fx"></div>
    <div class="connected-room-labels"></div>
    <div class="connected-view">
      @if (activeAction()) {
        <button
          [attr.aria-label]="'Stand / finish action' | ui"
          (click)="command.emit({ type: 'stand', data: {} })"
        >
          ↑
        </button>
      }
      <button
        [attr.aria-label]="'Room furniture' | ui"
        [attr.aria-expanded]="objectsOpen()"
        (click)="objectsOpen.set(!objectsOpen())"
      >
        ▣
      </button>
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
    </div>
    @if (objectsOpen()) {
      <section class="world-objects" [attr.aria-label]="'Room furniture' | ui">
        <b>{{ "Room furniture" | ui }}</b>
        @for (object of roomItems(); track object.id; let i = $index) {
          <button (click)="choose(object)">
            {{ object.asset | ui }} {{ i + 1 }}
          </button>
        }
      </section>
    }`,
  host: {
    class: "connected-world",
    tabindex: "0",
    "aria-label": "Home world. Arrow keys to walk, W to wave.",
    "(keydown)": "keyboard($event)",
  },
})
export class ConnectedWorldComponent {
  readonly objectsOpen = signal(false);
  activeAction() {
    const s = this.state();
    return s.scene?.people.find((p) => p.id === s.me.id)?.action;
  }
  roomItems() {
    const s = this.state();
    return s.scene?.rooms.find((r) => r.id === s.room?.id)?.items || [];
  }
  choose(item: Item) {
    this.item.emit(item);
    this.objectsOpen.set(false);
  }
  readonly state = input.required<WorldState>();
  readonly command = output<{ type: string; data: Record<string, unknown> }>();
  readonly item = output<Item>();
  readonly failure = output<string>();
  private host = inject(ElementRef<HTMLElement>);
  private destroyRef = inject(DestroyRef);
  private disposed = false;
  engine: any;
  constructor() {
    effect(() => {
      // Read the signal before checking the asynchronously mounted engine, so
      // Angular tracks updates even when the first effect runs before mount.
      const state = this.state();
      this.engine?.updateConnected(state);
    });
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
      const data = keyboardDestination(s.scene, me, dx, dy);
      if (data) this.command.emit({ type: "move", data });
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
