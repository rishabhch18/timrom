import { Component, input } from "@angular/core";

// Uses the palette and portrait shapes from Timrom's retained HTML avatar editor.
@Component({
  selector: "timrom-avatar-portrait",
  template: `<svg
    viewBox="0 0 64 64"
    role="img"
    aria-label="Avatar color preview"
  >
    <rect width="64" height="64" rx="16" fill="#ede9f7" />
    @if (look()["style"] === 1) {
      <path d="M16 26c-2 10-1 22 4 26h24c5-4 6-16 4-26z" [attr.fill]="hair()" />
    }
    <path d="M12 64c1-11 9-17 20-17s19 6 20 17z" [attr.fill]="shirt()" />
    @if (look()["style"] === 2) {
      <circle cx="32" cy="13" r="10" [attr.fill]="hair()" />
    }
    <circle cx="32" cy="29" r="14" [attr.fill]="skin()" />
    <path
      d="M17.5 28c0-9 6.5-14.5 14.5-14.5S46.5 19 46.5 28c-3-4-8-6.5-14.5-6.5S20.5 24 17.5 28z"
      [attr.fill]="hair()"
    />
    <circle cx="27" cy="30" r="1.6" fill="#2e2945" />
    <circle cx="37" cy="30" r="1.6" fill="#2e2945" />
    <circle cx="24" cy="34" r="2.2" fill="#f2a7a0" opacity=".6" />
    <circle cx="40" cy="34" r="2.2" fill="#f2a7a0" opacity=".6" />
  </svg>`,
  styles: [
    ":host{display:block;width:88px;margin:0 auto}svg{display:block;width:100%;border-radius:24px}",
  ],
})
export class AvatarPortraitComponent {
  readonly look = input<Record<string, number>>({});
  skin() {
    return ["#F7DCC9", "#EDC3A2", "#D49E76", "#A8724F", "#7A4F35"][
      this.look()["skin"] ?? 0
    ];
  }
  hair() {
    return ["#3A2A27", "#6E4731", "#C98B4E", "#E7C47C", "#9B93CC", "#D8786F"][
      this.look()["hair"] ?? 0
    ];
  }
  shirt() {
    return ["#8E8BD8", "#E9A27C", "#7FB59A", "#E48FA8", "#EFC35E", "#6FA7D1"][
      this.look()["outfit"] ?? 0
    ];
  }
}
