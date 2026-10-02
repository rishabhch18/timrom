import { UiTextPipe } from "./ui-text.pipe";
import {
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { SocialService } from "./social.service";
@Component({
  selector: "timrom-community-panel",
  imports: [UiTextPipe, DatePipe],
  template: `
    @if (api.state(); as s) {
      @switch (panel()) {
        @case ("account") {
          <h2>{{ "Account & privacy" | ui }}</h2>
          <p>
            {{
              "Contact details stay private. Local test codes do not send email or SMS."
                | ui
            }}
          </p>
          @if (contactInfo(); as c) {
            <div class="contact-details">
              <p>{{ "Email" | ui }}: {{ c["email"] || ("Not linked" | ui) }}</p>
              <p>
                {{ "Mobile" | ui }}: {{ c["phone"] || ("Not linked" | ui) }}
              </p>
            </div>
          }
          @if (!reauth()) {
            <form (submit)="accountAction($event, 'reauth')">
              <label
                >{{ "Confirm identity" | ui
                }}<select name="method">
                  <option value="password">
                    {{ "Existing password" | ui }}
                  </option>
                  <option value="code">
                    {{ "Registered-contact test code" | ui }}
                  </option>
                </select></label
              ><label
                >{{ "Password" | ui
                }}<input
                  name="password"
                  type="password"
                  autocomplete="current-password" /></label
              ><button>{{ "Confirm identity" | ui }}</button>
            </form>
          } @else {
            <p>{{ "Identity confirmed for five minutes." | ui }}</p>
            <form (submit)="accountAction($event, contactMode())">
              <label
                >{{ "Contact change" | ui
                }}<select
                  [value]="contactMode()"
                  (change)="contactMode.set($any($event.target).value)"
                >
                  <option value="link">{{ "Add second contact" | ui }}</option>
                  <option value="changeContact">
                    {{ "Replace existing contact" | ui }}
                  </option>
                </select></label
              >
              <label
                >{{ "Contact type" | ui
                }}<select name="kind">
                  <option value="email">{{ "Email" | ui }}</option>
                  <option value="phone">{{ "Mobile" | ui }}</option>
                </select></label
              ><label
                >{{ "Contact" | ui }}<input name="contact" required /></label
              ><label
                >{{ "Password (only when adding your first email)" | ui
                }}<input
                  name="password"
                  type="password"
                  minlength="10" /></label
              ><button>{{ "Verify new contact" | ui }}</button>
            </form>
            <button (click)="exportAccount()">
              {{ "Download my data" | ui }}
            </button>
            <details>
              <summary>{{ "Delete account permanently" | ui }}</summary>
              <p>
                {{
                  "Transfer or delete owned homes first. Your messages, contacts, history and inventory will be removed."
                    | ui
                }}
              </p>
              <form (submit)="accountAction($event, 'delete')">
                <label
                  >{{ "Type your username" | ui
                  }}<input name="confirm" required /></label
                ><button>{{ "Delete my account" | ui }}</button>
              </form>
            </details>
          }
          @if (authChallenge()) {
            <form (submit)="accountAction($event, 'verify')">
              <p class="test-notice">Local test code: {{ authCode() }}</p>
              <label
                >{{ "Code" | ui
                }}<input
                  name="code"
                  required
                  inputmode="numeric"
                  maxlength="6" /></label
              ><button>{{ "Verify code" | ui }}</button>
            </form>
          }
          @if (accountNotice()) {
            <p role="status">{{ accountNotice() }}</p>
          }
        }
        @case ("friends") {
          <h2>{{ "People & messages" | ui }}</h2>
          <form (submit)="submit($event, 'friendByUsername')">
            <label
              >{{ "Find by username" | ui
              }}<input
                name="username"
                required
                placeholder="@username" /></label
            ><button>{{ "Add friend" | ui }}</button>
          </form>
          @for (f of s.friends; track f.other) {
            <article>
              <b>{{ f.user }}</b> <small>{{ f.status }}</small>
              <div>
                @if (f.status === "pending" && f.sender !== s.me.id) {
                  <button (click)="api.run('friend', { user: f.other })">
                    {{ "Accept" | ui }}
                  </button>
                }
                @if (f.status === "accepted") {
                  <button (click)="recipient.set(f.other)">
                    {{ "Message" | ui }}
                  </button>
                }
                <button (click)="api.run('unfriend', { user: f.other })">
                  {{
                    f.status === "accepted"
                      ? "Remove friend"
                      : "Dismiss request"
                  }}
                </button>
              </div>
            </article>
          }
          @if (recipient(); as r) {
            <h3>{{ "Direct conversation" | ui }}</h3>
            <div class="dm-history">
              @for (m of s.directMessages; track m.id) {
                @if (m.sender === r || m.recipient === r) {
                  <article>
                    <small
                      >{{ m.sender === s.me.id ? "You" : friendName(r) }} ·
                      {{ m.time | date: "shortTime" }}</small
                    >
                    <p>{{ m.body }}</p>
                    @if (m.sender === s.me.id) {
                      <button
                        (click)="api.run('dmDelete', { message: m.id })"
                        aria-label="Delete direct message"
                      >
                        ×
                      </button>
                    }
                  </article>
                }
              }
            </div>
            <form (submit)="submit($event, 'dm', { user: r, nonce: nonce() })">
              <input
                name="body"
                required
                maxlength="1000"
                aria-label="Direct message"
              /><button>{{ "Send" | ui }}</button>
            </form>
          }
        }
        @case ("profile") {
          <h2>{{ "Your avatar" | ui }}</h2>
          <form (submit)="profile($event)">
            <label
              >{{ "Body style" | ui
              }}<select name="body" [value]="s.me.body">
                <option value="miniature">{{ "Miniature" | ui }}</option>
                <option value="mature">{{ "Mature" | ui }}</option>
              </select></label
            ><input type="hidden" name="color" [value]="s.me.color" />
            @for (k of appearance; track k.key) {
              <label
                >{{ k.label
                }}<select [name]="k.key" [value]="s.me.preferences[k.key] ?? 0">
                  @for (v of k.options; track $index) {
                    <option [value]="$index">{{ v }}</option>
                  }
                </select></label
              >
            }
            <button class="primary">{{ "Save avatar" | ui }}</button>
          </form>
          <label
            >{{ "Language" | ui
            }}<select
              [value]="s.me.preferences['language'] || 'en'"
              (change)="
                api.run('preferences', { language: $any($event.target).value })
              "
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
            </select></label
          >
          <label class="check"
            ><input
              type="checkbox"
              [checked]="s.me.preferences['reducedMotion']"
              (change)="
                api.run('preferences', {
                  reducedMotion: $any($event.target).checked,
                })
              "
            />{{ "Reduce decorative motion" | ui }}</label
          >
          <label class="check"
            ><input
              type="checkbox"
              [checked]="s.me.preferences['notifications'] !== false"
              (change)="
                api.run('preferences', {
                  notifications: $any($event.target).checked,
                })
              "
            />{{ "In-app notifications" | ui }}</label
          >
          <h3>{{ "Blocked accounts" | ui }}</h3>
          @for (b of s.blocks; track b.target) {
            <p>
              {{ b.name }}
              <button (click)="api.run('unblock', { user: b.target })">
                {{ "Unblock" | ui }}
              </button>
            </p>
          }
        }
        @case ("notifications") {
          <h2>{{ "Notifications" | ui }}</h2>
          <button (click)="api.run('notificationsRead')">
            {{ "Mark all read" | ui }}
          </button>
          @for (n of s.notifications; track n.id) {
            <article [class.unread]="!n.seen">
              <p>{{ n.body }}</p>
              <small>{{ n.time | date: "short" }}</small>
            </article>
          } @empty {
            <p>{{ "You’re all caught up." | ui }}</p>
          }
        }
        @case ("people") {
          <h2>{{ "In this room" | ui }}</h2>
          @for (p of s.room?.people; track p.id) {
            <article>
              <b>{{ p.name }}</b
              ><small> {{ p.activity || p.role }}</small>
              @if (p.id !== s.me.id) {
                <div>
                  <button (click)="api.run('friend', { user: p.id })">
                    {{ "Add friend" | ui }}</button
                  ><button (click)="api.run('block', { user: p.id })">
                    {{ "Block" | ui }}</button
                  ><button
                    (click)="
                      api.run('personalMute', {
                        user: p.id,
                        enabled: !p.personalMuted,
                      })
                    "
                  >
                    {{
                      p.personalMuted ? "Unmute for me" : "Mute for me"
                    }}</button
                  ><button (click)="reportTarget.set(p.id)">
                    {{ "Report" | ui }}
                  </button>
                </div>
                @if (moderator()) {
                  <div>
                    <button
                      (click)="
                        api.run('speaker', { user: p.id, allowed: !p.speaker })
                      "
                    >
                      {{
                        p.speaker ? "Revoke speaker" : "Allow speaker"
                      }}</button
                    ><button
                      (click)="
                        api.run('moderate', {
                          room: s.room!.id,
                          user: p.id,
                          action: 'mute',
                        })
                      "
                    >
                      {{ "Mute" | ui }}</button
                    ><button
                      (click)="
                        api.run('moderate', {
                          room: s.room!.id,
                          user: p.id,
                          action: 'timeout',
                          minutes: 10,
                        })
                      "
                    >
                      {{ "10 min timeout" | ui }}</button
                    ><button
                      (click)="
                        api.run('moderate', {
                          room: s.room!.id,
                          user: p.id,
                          action: 'kick',
                        })
                      "
                    >
                      {{ "Kick" | ui }}</button
                    ><button (click)="banTarget.set(p.id)">
                      {{ "Ban…" | ui }}
                    </button>
                  </div>
                }
              }
            </article>
          }
          @if (banTarget()) {
            <form
              (submit)="
                submit($event, 'moderate', {
                  room: s.room!.id,
                  user: banTarget(),
                  action: 'ban',
                });
                banTarget.set('')
              "
            >
              <p>{{ "Ban this person from the home?" | ui }}</p>
              <label>{{ "Reason" | ui }}<input name="reason" required /></label
              ><button>{{ "Confirm ban" | ui }}</button
              ><button type="button" (click)="banTarget.set('')">
                {{ "Cancel" | ui }}
              </button>
            </form>
          }
          @if (reportTarget()) {
            <form
              (submit)="
                submit($event, 'report', { user: reportTarget() });
                reportTarget.set('')
              "
            >
              <label
                >{{ "What happened?" | ui
                }}<textarea
                  name="body"
                  required
                  minlength="5"
                  maxlength="500"
                ></textarea></label
              ><button>{{ "Submit report" | ui }}</button>
            </form>
          }
          @if (moderator()) {
            <h3>{{ "Moderation history" | ui }}</h3>
            @for (a of s.audit; track a.id) {
              <article>
                <p>{{ a.action }}</p>
                <small>{{ a.time | date: "short" }}</small>
              </article>
            }
          }
        }
        @case ("sharing") {
          <h2>{{ "Furniture sharing" | ui }}</h2>
          <p>
            {{
              "Gifts transfer ownership after the home accepts. Loans remain yours and can be reclaimed."
                | ui
            }}
          </p>
          <form (submit)="submit($event, 'shareItem')">
            <label
              >{{ "Furniture" | ui
              }}<select name="item">
                @for (i of s.items; track i.id) {
                  @if (
                    i.owner_type === "user" && i.owner === s.me.id && !i.loan
                  ) {
                    <option [value]="i.id">{{ i.asset }}</option>
                  }
                }
              </select></label
            ><label
              >{{ "Receiving home" | ui
              }}<select name="home">
                @for (h of s.homes; track h.id) {
                  @if (h.member) {
                    <option [value]="h.id">{{ h.name }}</option>
                  }
                }
              </select></label
            ><label
              >{{ "Offer" | ui
              }}<select name="mode">
                <option value="lend">{{ "Lend — reclaimable" | ui }}</option>
                <option value="donate">
                  {{ "Donate — permanent while home exists" | ui }}
                </option>
              </select></label
            ><button>Send offer</button>
          </form>
          <h3>{{ "Pending offers" | ui }}</h3>
          @for (o of s.offers; track o.id) {
            <article>
              <b>{{ o.asset }}</b> · {{ o.mode }} · {{ o.name }}
              <div>
                @if (o.sender === s.me.id) {
                  <button
                    (click)="
                      api.run('offerDecision', {
                        offer: o.id,
                        decision: 'cancel',
                      })
                    "
                  >
                    {{ "Cancel" | ui }}
                  </button>
                }
                @if (canManage(o.home)) {
                  <button
                    (click)="
                      api.run('offerDecision', {
                        offer: o.id,
                        decision: 'accept',
                      })
                    "
                  >
                    {{ "Accept" | ui }}</button
                  ><button
                    (click)="
                      api.run('offerDecision', {
                        offer: o.id,
                        decision: 'reject',
                      })
                    "
                  >
                    {{ "Decline" | ui }}
                  </button>
                }
              </div>
            </article>
          }
          <h3>{{ "Loans" | ui }}</h3>
          @for (i of s.items; track i.id) {
            @if (i.loan) {
              <article>
                {{ i.asset }}
                <button (click)="api.run('returnItem', { item: i.id })">
                  {{ i.owner === s.me.id ? "Reclaim" : "Return to owner" }}
                </button>
              </article>
            }
          }
        }
        @case ("homeAdmin") {
          @if (home(); as h) {
            <h2>{{ h.name }}</h2>
            @if (canManage(h.id)) {
              <h3>Rooms</h3>
              @for (r of h.rooms; track r.id) {
                <article>
                  <b>{{ r.name }}</b
                  ><label class="check"
                    ><input
                      type="checkbox"
                      [checked]="r.locked"
                      (change)="
                        api.run('lock', {
                          room: r.id,
                          locked: $any($event.target).checked,
                        })
                      "
                    />Lock new entry</label
                  >
                  <form (submit)="capacity($event, r.id)">
                    <label
                      >Capacity · 0 = unlimited<input
                        name="capacity"
                        type="number"
                        min="0"
                        max="10000"
                        [value]="r.capacity"
                        [disabled]="!!r.outdoor" /></label
                    ><button [disabled]="!!r.outdoor">Save capacity</button>
                  </form>
                </article>
              }
              @if (h.role === "owner") {
                <h3>Delegate permissions</h3>
                @for (m of h.members; track m.id) {
                  @if (m.id !== s.me.id) {
                    <form
                      (submit)="
                        submit($event, 'role', { home: h.id, user: m.id })
                      "
                    >
                      <b>{{ m.name }}</b
                      ><label
                        >Scope<select name="room">
                          <option value="">Whole home</option>
                          @for (r of h.rooms; track r.id) {
                            <option [value]="r.id">{{ r.name }}</option>
                          }
                        </select></label
                      ><label
                        >Role<select name="role">
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          <option value="moderator">Moderator</option>
                        </select></label
                      ><button>Apply role</button>
                    </form>
                  }
                }
              }

              <form (submit)="submit($event, 'homeDetails', { home: h.id })">
                <label
                  >{{ "Home rules" | ui
                  }}<textarea
                    name="rules"
                    required
                    minlength="5"
                    maxlength="2000"
                    [value]="h.rules"
                  ></textarea></label
                ><label
                  >{{ "Description" | ui
                  }}<input name="description" [value]="h.description" /></label
                ><label
                  >{{ "Region" | ui
                  }}<select name="region" [value]="h.region">
                    @for (r of regions; track r) {
                      <option>{{ r }}</option>
                    }
                  </select></label
                >
                <div class="form-grid">
                  @for (
                    k of ["country", "state", "city", "language"];
                    track k
                  ) {
                    <label
                      >{{ k }}<input [name]="k" [value]="$any(h)[k]"
                    /></label>
                  }
                  <label
                    >{{ "Community latitude" | ui
                    }}<input
                      name="latitude"
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      [value]="h.latitude ?? ''" /></label
                  ><label
                    >{{ "Community longitude" | ui
                    }}<input
                      name="longitude"
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      [value]="h.longitude ?? ''"
                  /></label>
                </div>
                <small>{{
                  "Optional community affiliation, never a member’s address."
                    | ui
                }}</small
                ><button>{{ "Save details" | ui }}</button>
              </form>
              <p>Listing: {{ h.listing }}</p>
              <button (click)="api.run('requestListing', { home: h.id })">
                {{ "Request public listing review" | ui }}
              </button>
              @if (s.room && !s.room.outdoor) {
                <h3>{{ "Room access" | ui }}</h3>
                <form (submit)="access($event)">
                  <label
                    >{{ "Who can enter" | ui
                    }}<select name="access" [value]="s.room.access">
                      <option value="members">{{ "All members" | ui }}</option>
                      <option value="selected">
                        {{ "Selected members and moderators" | ui }}
                      </option>
                    </select></label
                  >
                  @for (m of h.members; track m.id) {
                    <label class="check"
                      ><input
                        name="users"
                        type="checkbox"
                        [value]="m.id"
                        [checked]="s.room.selectedUsers?.includes(m.id)"
                      />{{ m.name }}</label
                    >
                  }
                  <button>{{ "Save room access" | ui }}</button>
                </form>
              }
              @if (h.role === "owner") {
                <h3>{{ "Ownership" | ui }}</h3>
                <form (submit)="submit($event, 'transferHome', { home: h.id })">
                  <label
                    >{{ "Offer ownership to" | ui
                    }}<select name="user">
                      @for (m of h.members; track m.id) {
                        @if (m.id !== s.me.id) {
                          <option [value]="m.id">{{ m.name }}</option>
                        }
                      }
                    </select></label
                  ><button>{{ "Send transfer request" | ui }}</button>
                </form>
                <details>
                  <summary>{{ "Delete home" | ui }}</summary>
                  <p>
                    {{
                      "Returns loans and surviving donations to their original owners. This permanently removes rooms and chat."
                        | ui
                    }}
                  </p>
                  <form (submit)="submit($event, 'deleteHome', { home: h.id })">
                    <label
                      >Type {{ h.name }}<input name="confirm" required /></label
                    ><button>{{ "Delete permanently" | ui }}</button>
                  </form>
                </details>
              }
            }
          }
          @for (t of s.transfers; track t.home) {
            @if (t.recipient === s.me.id) {
              <article>
                Ownership of {{ homeName(t.home)
                }}<button
                  (click)="
                    api.run('transferDecision', { home: t.home, accept: true })
                  "
                >
                  {{ "Accept" | ui }}</button
                ><button
                  (click)="
                    api.run('transferDecision', { home: t.home, accept: false })
                  "
                >
                  {{ "Decline" | ui }}
                </button>
              </article>
            }
          }
        }
        @case ("platform") {
          <h2>{{ "Platform review" | ui }}</h2>
          @if (s.me.operator) {
            @for (h of s.listingQueue; track h.id) {
              <article>
                <b>{{ h.name }}</b>
                <p>{{ h.rules }}</p>
                <button
                  (click)="
                    api.run('reviewListing', {
                      home: h.id,
                      decision: 'approved',
                    })
                  "
                >
                  {{ "Approve" | ui }}</button
                ><button
                  (click)="
                    api.run('reviewListing', {
                      home: h.id,
                      decision: 'rejected',
                    })
                  "
                >
                  {{ "Reject" | ui }}
                </button>
              </article>
            }
            <h3>{{ "Reports" | ui }}</h3>
            @for (r of s.reports; track r.id) {
              <article>
                <p>{{ r.body }}</p>
                <p>{{ r.resolution || "Awaiting review" }}</p>
                <form
                  (submit)="submit($event, 'reviewReport', { report: r.id })"
                >
                  <input
                    name="resolution"
                    placeholder="Review outcome"
                    required
                    minlength="5"
                    maxlength="500"
                  /><button>Record outcome</button>
                </form>
                <small>Reporter {{ r.user }} · Target {{ r.target }}</small>
              </article>
            }
          } @else {
            <p>Platform review is available to configured operators.</p>
          }
        }
        @case ("history") {
          <h2>{{ "Activity history" | ui }}</h2>
          @if (editingActivity()) {
            <p>
              Editing an existing entry
              <button (click)="editingActivity.set('')">Cancel edit</button>
            </p>
          }
          <p>
            Today: {{ totals()[0] }} min · Last 7 days: {{ totals()[1] }} min
          </p>
          <p>
            {{
              "History is self-reported. Edits and offline time never earn rewards."
                | ui
            }}
          </p>
          <form (submit)="activity($event)">
            <label
              >{{ "Activity" | ui
              }}<select
                name="kind"
                [value]="editedActivity()?.kind || 'Socializing'"
              >
                @for (k of kinds; track k) {
                  <option>{{ k }}</option>
                }
              </select></label
            ><label
              >{{ "Started" | ui
              }}<input
                type="datetime-local"
                name="start"
                [value]="activityDate('start')"
                required /></label
            ><label
              >{{ "Ended" | ui
              }}<input
                type="datetime-local"
                name="end"
                [value]="activityDate('end')"
                required /></label
            ><label
              >{{ "Audience" | ui
              }}<select
                name="visibility"
                [value]="editedActivity()?.visibility || 'private'"
              >
                @for (a of audiences; track a) {
                  <option>{{ a }}</option>
                }
              </select></label
            ><button>
              {{
                (editingActivity() ? "Save changes" : "Add past activity") | ui
              }}
            </button>
          </form>
          @for (a of s.activities; track a.id) {
            <article>
              <b>{{ a.kind }}</b>
              <p>
                {{ a.start | date: "short" }} –
                {{ a.end ? (a.end | date: "short") : "In progress" }}
              </p>
              <label
                >{{ "Audience" | ui
                }}<select
                  [value]="a.visibility"
                  (change)="
                    api.run('activityVisibility', {
                      id: a.id,
                      visibility: $any($event.target).value,
                    })
                  "
                >
                  @for (v of audiences; track v) {
                    <option>{{ v }}</option>
                  }
                </select></label
              >
              @if (a.end) {
                <button (click)="editingActivity.set(a.id)">
                  Edit times above
                </button>
              }
              <button (click)="api.run('activityDelete', { id: a.id })">
                {{ "Delete" | ui }}
              </button>
            </article>
          }
        }
      }
    }
  `,
})
export class CommunityPanelComponent {
  readonly api = inject(SocialService);
  readonly panel = input.required<string>();
  readonly targetHome = input("");
  readonly editingActivity = signal("");
  readonly totals = signal([0, 0]);
  constructor() {
    effect(() => {
      const state = this.api.state(),
        panel = this.panel();
      if (state && panel === "account" && this.contactOwner !== state.me.id) {
        this.contactOwner = state.me.id;
        untracked(() => void this.loadContacts());
      }
      if (!state || panel !== "history") return;
      untracked(() => {
        const day = new Date(state.serverTime);
        day.setHours(0, 0, 0, 0);
        const week = new Date(day);
        week.setDate(week.getDate() - 6);
        void this.api
          .command("activitySummary", {
            day: day.getTime(),
            week: week.getTime(),
          })
          .then((values) => this.totals.set(values))
          .catch(() => {});
      });
    });
  }
  private contactOwner = "";
  readonly contactInfo = signal<Record<string, string | null> | null>(null);
  readonly contactMode = signal("link");
  async loadContacts() {
    try {
      const r = await this.api.auth("details", {});
      this.contactInfo.set(r["contacts"]);
    } catch {}
  }
  readonly recipient = signal("");
  readonly reportTarget = signal("");
  readonly banTarget = signal("");
  readonly reauth = signal("");
  readonly authChallenge = signal("");
  readonly authCode = signal("");
  readonly accountNotice = signal("");
  readonly regions = [
    "Asia",
    "Africa",
    "Europe",
    "North America",
    "South America",
    "Oceania",
    "Antarctica",
  ];
  readonly audiences = ["private", "friends", "home", "public"];
  readonly kinds = [
    "Socializing",
    "Studying",
    "Working",
    "Gaming",
    "Eating",
    "Resting",
    "Sleeping",
  ];
  readonly appearance = [
    {
      key: "skin",
      label: "Skin tone",
      options: ["Porcelain", "Peach", "Honey", "Warm brown", "Deep brown"],
    },
    {
      key: "hair",
      label: "Hair color",
      options: ["Ink", "Brown", "Chestnut", "Gold", "Silver", "Rose"],
    },
    { key: "style", label: "Hair style", options: ["Short", "Long", "Bun"] },
    {
      key: "outfit",
      label: "Outfit",
      options: ["Lavender", "Blue", "Green", "Rose", "Amber", "Slate"],
    },
  ];
  async accountAction(e: Event, action: string) {
    e.preventDefault();
    try {
      const result = await this.api.auth(action, {
        ...Object.fromEntries(new FormData(e.target as HTMLFormElement)),
        reauth: this.reauth(),
        challenge: this.authChallenge(),
      });
      if (result["challenge"]) {
        this.authChallenge.set(result["challenge"]);
        this.authCode.set(result["developmentCode"]);
      } else {
        this.authChallenge.set("");
        this.authCode.set("");
        if (result["reauth"]) this.reauth.set(result["reauth"]);
        if (result["changed"]) this.reauth.set("");
        if (result["linked"] || result["changed"]) await this.loadContacts();
        this.accountNotice.set(
          result["changed"]
            ? "Contact changed. Other sessions were signed out."
            : result["linked"]
              ? "Contact linked."
              : "Identity confirmed.",
        );
      }
    } catch (e) {
      if ((e as Error).message.includes("Confirm your identity"))
        this.reauth.set("");
    }
  }
  async exportAccount() {
    try {
      const r = await this.api.auth("export", { reauth: this.reauth() });
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(r["export"], null, 2)], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "timrom-account.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {}
  }
  nonce() {
    return crypto.randomUUID();
  }
  home() {
    const s = this.api.state();
    return s?.homes.find((h) => h.id === (this.targetHome() || s.room?.home));
  }
  homeName(id: string) {
    return this.api.state()?.homes.find((h) => h.id === id)?.name;
  }
  canManage(id: string) {
    return ["owner", "admin"].includes(
      this.api.state()?.homes.find((h) => h.id === id)?.role || "",
    );
  }
  moderator() {
    return ["owner", "admin", "moderator"].includes(
      this.api.state()?.room?.role || "",
    );
  }
  friendName(id: string) {
    return this.api.state()?.friends.find((f) => f.other === id)?.user;
  }
  async submit(e: Event, type: string, extra: Record<string, unknown> = {}) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    try {
      await this.api.command(type, {
        ...Object.fromEntries(new FormData(form)),
        ...extra,
      });
      if (["dm", "report"].includes(type)) form.reset();
    } catch (e) {
      this.api.error.set((e as Error).message);
    }
  }
  async profile(e: Event) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target as HTMLFormElement));
    try {
      await this.api.command("profile", {
        body: data["body"],
        color: data["color"],
      });
      await this.api.command(
        "preferences",
        Object.fromEntries(
          ["skin", "hair", "style", "outfit"].map((k) => [k, Number(data[k])]),
        ),
      );
    } catch (e) {
      this.api.error.set((e as Error).message);
    }
  }
  access(e: Event) {
    e.preventDefault();
    const d = new FormData(e.target as HTMLFormElement);
    void this.api.run("roomAccess", {
      room: this.api.state()?.room?.id,
      access: d.get("access"),
      users: d.getAll("users"),
    });
  }
  capacity(e: Event, room: string) {
    e.preventDefault();
    const d = new FormData(e.target as HTMLFormElement);
    void this.api.run("capacity", {
      room,
      capacity: Number(d.get("capacity")),
    });
  }
  editedActivity() {
    return this.api
      .state()
      ?.activities.find((a) => a.id === this.editingActivity());
  }
  activityDate(key: "start" | "end") {
    const a = this.api
      .state()
      ?.activities.find((a) => a.id === this.editingActivity());
    if (!a?.[key]) return "";
    const d = new Date(a[key]!);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }
  activity(e: Event) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target as HTMLFormElement));
    void this.api.run("activitySave", {
      id: this.editingActivity() || undefined,
      ...d,
      start: new Date(String(d["start"])).getTime(),
      end: new Date(String(d["end"])).getTime(),
    });
  }
}
