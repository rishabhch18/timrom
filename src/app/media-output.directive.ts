import { Directive, ElementRef, effect, inject, input } from "@angular/core";
import { SocialService } from "./social.service";
@Directive({ selector: "video[mediaOutput],audio[mediaOutput]" })
export class MediaOutputDirective {
  readonly mediaOutput = input("");
  private element = inject(ElementRef<HTMLMediaElement>);
  private api = inject(SocialService);
  constructor() {
    effect(() => {
      const device = this.mediaOutput();
      const el = this.element.nativeElement;
      if (typeof el.setSinkId === "function")
        void el
          .setSinkId(device)
          .catch(() =>
            this.api.error.set(
              "Audio output unavailable. Choose the system default.",
            ),
          );
    });
  }
}
