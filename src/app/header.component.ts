import { Component, input, output } from '@angular/core';
import type { Navigation, WorldMode } from './world.facade';

@Component({ selector: 'timrom-header', templateUrl: './header.component.html' })
export class HeaderComponent {
  readonly mode = input<WorldMode>('home');
  readonly spawn = input('gate');
  readonly ready = input(false);
  readonly navigate = output<Navigation>();
  readonly messages = output<void>();
  readonly settings = output<void>();

  selected(mode: WorldMode, spawn: string) {
    return this.mode() === mode && (!spawn || spawn === this.spawn());
  }
}
