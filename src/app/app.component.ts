import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';
import { HeaderComponent } from './header.component';
import { WorldComponent } from './world.component';
import { WorldFacade } from './world.facade';

@Component({
  selector: 'timrom-app',
  imports: [HeaderComponent, WorldComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly world = inject(WorldFacade);
  readonly error = signal('');
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      void this.world.mount(this.host.nativeElement, error => {
        console.error('Timrom scene failed', error);
        this.error.set('Check that WebGL is enabled, then reload. Your saved local progress is kept.');
      });
    });
    this.destroyRef.onDestroy(() => this.world.destroy());
  }

  reload() { location.reload(); }
}
