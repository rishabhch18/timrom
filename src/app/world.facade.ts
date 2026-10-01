import { Injectable, NgZone, inject, signal } from '@angular/core';
import { PreviewStorage } from './preview-storage.service';

export type WorldMode = 'home' | 'build' | 'hood' | 'park';
export interface Navigation { mode: WorldMode; spawn?: string }
export interface WorldSnapshot {
  mode: WorldMode; spawn: string; ready: boolean; coins: number; streak: number; models: number;
}
interface Engine {
  navigate(value: Navigation): void;
  toggleChat(): void;
  openSettings(): void;
  destroy(): void;
}
const initialSnapshot: WorldSnapshot = { mode: 'home', spawn: 'gate', ready: false, coins: 0, streak: 0, models: 0 };

@Injectable({ providedIn: 'root' })
export class WorldFacade {
  readonly snapshot = signal<WorldSnapshot>(initialSnapshot);
  private readonly storage = inject(PreviewStorage);
  private readonly zone = inject(NgZone);
  private engine?: Engine;
  private generation = 0;

  async mount(host: HTMLElement, onError: (error: unknown) => void) {
    this.destroy();
    const generation = this.generation;
    try {
      const { mountTimrom } = await import('../world/timrom-engine.js');
      if (generation !== this.generation) return;
      this.zone.runOutsideAngular(() => {
        this.engine = mountTimrom(host, {
          storage: this.storage,
          onSnapshot: (value: WorldSnapshot) => this.snapshot.set(value),
          onError,
        });
      });
    } catch (error) { if (generation === this.generation) onError(error); }
  }

  navigate(value: Navigation) { this.engine?.navigate(value); }
  toggleChat() { this.engine?.toggleChat(); }
  openSettings() { this.engine?.openSettings(); }
  destroy() {
    this.generation++;
    this.engine?.destroy();
    this.engine = undefined;
    this.snapshot.set(initialSnapshot);
  }
}
