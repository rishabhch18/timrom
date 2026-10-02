import { Component, inject, signal } from "@angular/core";
import { SocialService } from "./social.service";
import { UiTextPipe } from "./ui-text.pipe";
import { AvatarPortraitComponent } from "./avatar-portrait.component";
@Component({
  selector: "timrom-onboarding",
  imports: [UiTextPipe, AvatarPortraitComponent],
  template: ` <section class="welcome-profile" aria-labelledby="welcome-title">
    <timrom-avatar-portrait [look]="preview()" />
    <p class="eyebrow">{{ "Your space, your pace" | ui }}</p>
    <h1 id="welcome-title">{{ "Make yourself at home." | ui }}</h1>
    <p>
      {{ "Choose your language and avatar. You can change these later." | ui }}
    </p>
    <form (submit)="save($event)">
      <label
        >{{ "Language" | ui
        }}<select
          name="language"
          [value]="api.language()"
          (change)="api.setLanguage($any($event.target).value)"
        >
          <option value="en">English</option>
          <option value="hi">हिन्दी</option>
        </select></label
      >
      <fieldset class="avatar-styles">
        <legend>{{ "Body style" | ui }}</legend>
        <label
          ><input
            type="radio"
            name="body"
            value="miniature"
            [checked]="api.state()?.me?.body === 'miniature'"
          />{{ "Miniature" | ui }}</label
        >
        <label
          ><input
            type="radio"
            name="body"
            value="mature"
            [checked]="api.state()?.me?.body === 'mature'"
          />{{ "Mature" | ui }}</label
        >
      </fieldset>
      <div class="form-grid">
        @for (k of options; track k.key) {
          <label
            >{{ k.label | ui
            }}<select
              [name]="k.key"
              [value]="preview()[k.key] ?? 0"
              (change)="updatePreview(k.key, $any($event.target).value)"
            >
              @for (v of k.values; track $index) {
                <option [value]="$index">{{ v | ui }}</option>
              }
            </select></label
          >
        }
      </div>
      <p class="subtle">
        {{
          "Your appearance never changes your age-group access. Activities and contact details stay private by default."
            | ui
        }}
      </p>
      <button class="primary" [disabled]="busy()">
        {{ "Enter Timrom" | ui }} →
      </button>
    </form>
  </section>`,
})
export class OnboardingComponent {
  readonly api = inject(SocialService);
  readonly busy = signal(false);
  readonly preview = signal<Record<string, number>>({
    ...this.api.state()?.me.preferences,
  });
  updatePreview(key: string, value: string) {
    this.preview.set({ ...this.preview(), [key]: Number(value) });
  }
  readonly options = [
    {
      key: "skin",
      label: "Skin tone",
      values: ["Porcelain", "Peach", "Honey", "Warm brown", "Deep brown"],
    },
    {
      key: "hair",
      label: "Hair color",
      values: ["Ink", "Brown", "Chestnut", "Gold", "Lavender", "Rose"],
    },
    { key: "style", label: "Hair style", values: ["Short", "Long", "Bun"] },
    {
      key: "outfit",
      label: "Outfit",
      values: ["Lavender", "Peach", "Green", "Rose", "Amber", "Blue"],
    },
  ];
  async save(e: Event) {
    e.preventDefault();
    if (this.busy()) return;
    this.busy.set(true);
    const data = Object.fromEntries(new FormData(e.target as HTMLFormElement));
    try {
      await this.api.command("profile", {
        body: data["body"],
        color: this.api.state()?.me.color,
      });
      await this.api.command("preferences", {
        language: data["language"],
        ...Object.fromEntries(
          this.options.map((k) => [k.key, Number(data[k.key])]),
        ),
      });
      await this.api.command("finishOnboarding");
    } catch (e) {
      this.api.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
