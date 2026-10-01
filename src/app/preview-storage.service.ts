import { Injectable } from '@angular/core';
import { createPreviewStorage } from '../world/preview-storage.js';

@Injectable({ providedIn: 'root' })
export class PreviewStorage {
  // Resolve lazily: some browsers deny localStorage access even before getItem.
  private readonly adapter = createPreviewStorage(() => window.localStorage);
  load = this.adapter.load;
  save = this.adapter.save;
  clear = this.adapter.clear;
}
