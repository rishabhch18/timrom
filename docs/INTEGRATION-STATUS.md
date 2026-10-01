# Local integration status — 2 October 2026

All R01–R24 recommendations are approved. The shared Angular app and local backend now implement most social workflows, but **the complete product and online pilot are not finished**. In particular, the connected house has not achieved the approved visual/motion fidelity, real contact verification and age-transition workflows are incomplete, and actual multi-device media performance remains unverified.

## Implemented and available locally

| Area | Working implementation |
|---|---|
| Accounts | Email/password and mobile local-code sign-in; private contacts; unique username/display name; registered-contact reset; session-bound, expiring reauthentication; second-contact linking; own-data export and deletion with owned-home checks. Codes are explicitly local fixtures, not delivery or real contact verification. |
| Homes/discovery | Four optional free templates; real memberships/invites; eligible forum visitors; owner-entered community geography; globe pins for homes with coordinates, filters/list search, favourites and six small neighbour previews. Only the active home exposes full permitted details. Direct travel and server-controlled walking to the garden gateway recheck admission. |
| Builder | Single-floor draft SVG plan; add rooms, move/resize rooms, add/remove adjacent doors; undo/reload; revision checks and atomic publish. Reject overlapping/disconnected layouts, blocked routes and occupied-room geometry changes. Place/move/rotate/store furniture and reusable finishes. Basic starter fixtures stay with the home. |
| Social | Durable room messages; replies, reactions, own edits/deletion; friend requests, accepted same-band friend DMs; mention/DM/request notifications; blocks and personal mute. No synthetic social activity is promoted into accounts. |
| Roles/moderation | Home/room-scoped administration, selected-member access, locks, customizable capacity, unlimited forum entry, open/moderated/disabled voice; hands/speaker grants, timeout/kick/ban and audit; operator listing approvals and report outcomes. Operators must be configured explicitly by existing username. |
| Routine/economy | Separate room/furniture opt-ins; manual overrides and offline self-reported history; current-activity audiences; backfill/edit/delete; local-day/week totals query all relevant records, not just the displayed history page. Online XP and participation-window coins remain separate. Backfill/offline time never creates rewards. |
| Ownership | Personal furniture copies, reusable finishes, donation/loan offers requiring home acceptance, reclaimable loans, accepted ownership succession, and home-deletion returns/orphan retirement. |
| Devices/reconnect | One authoritative world device; explicit takeover; 30-second provisional disconnected seat reservations with access rechecks and no disconnected XP; account-wide rewards. |
| Calls | Optional LiveKit SFU, room/device-bound short-lived tokens, server publication permissions and participant reconciliation, 100 voice admission slots per room and 10 cameras app-wide. Device inputs, low-bandwidth capture, mute/deafen, remembered join consent and room switching. Local mesh remains an explicitly limited fallback when no SFU is configured. |
| UI | English/Hindi static core labels, self-hosted fonts, avatar controls, keyboard walking/wave, mobile expandable chat and panels, reduced-motion option. Some dynamic/admin strings and server errors remain English. |
| Transport | Coalesced broadcasts, cached prepared statements/reads, negotiated recipient-specific state deltas, full state on reconnect, slow-client backpressure. Authorization runs before diffing; deltas never bypass snapshot filtering. |

## Verification from this increment

- **61 automated tests passed**: prior auth/access/capacity/economy coverage plus draft geometry rollback, ownership lifecycle, DMs/audiences, moderation scope, reservations/takeover, camera admission, SFU grants/revocation, history summaries, delta transport and real WebSocket integration.
- **Angular production build passed**: about 317 kB initial JavaScript/CSS; lazy scene about 890 kB and lazy media client about 580 kB, before compression and excluding the model pack/fonts.
- Browser checked synthetic-account home creation, persistent chat, builder change/undo/publish, language selection, mobile expanded chat, backfill and correct week totals. A muted/camera-off browser participant reached LiveKit ACTIVE state with zero captured tracks. This verifies SFU signaling/transport, **not actual audio/video quality**.
- Isolated local **100-WebSocket-client** test admitted 100 forum occupants and sent 10 chat commands. The final measured run took 26.6 seconds for sequential client setup, with 14 ms maximum chat acknowledgement and about 8.03 MB received across all clients. Before deltas the comparable test transferred about 233 MB. These are synthetic control-plane measurements; they are not 100 live voice streams, camera load or phone rendering tests.
- Responsive evidence: [desktop builder in Hindi](builder-hindi-desktop.jpg), [390×844 expanded chat](local-mobile-hindi.jpg). Viewport testing is not Android/iOS hardware certification.
- Final production dependency audit: **0 known vulnerabilities**. `git diff --check` passed. Browser chat updated correctly through the final negotiated-delta build, with no error-level console messages in that check.
- Model loader still reports the inherited custom-UV extension warnings. Full original-scene parity and contact/pose correctness are not verified.

The build was verified from an isolated copy of the same source under `/tmp`, then its output copied to the project's ignored `dist/`. On this machine, filesystem calls to list the parent Documents directory stalled during esbuild's ancestor lookup; TypeScript compilation and direct project reads worked. Temporary dependency diagnostics were restored, and no dependency workaround is committed. This is a local environment issue, not a successful normal-workspace build claim.

## What remains before calling the local milestone complete

1. **Visual/motion fidelity:** match the retained Timrom HTML's house composition, furniture/avatar scale, surroundings and camera states for all four templates. Current connected rooms use a dynamic grid. Complete realistic furniture anchors, turning/sit/stand/lie/eat transitions, collision footprints, model UV compatibility and a visible polished neighbour gateway. The current asset reuse and simple action poses are insufficient to certify realistic physics.
2. **Complete UX:** finish translation of dynamic/admin/error strings; avatar/language-first onboarding; notification/unread/invitation affordances; geography/camera and crowded-scene usability; full contact-change workflow (adding a missing second contact works); audio-output selection where supported. Test these as end-to-end journeys, not just server commands.
3. **Age transitions:** actual age/guardian verification and date-driven transition/succession freeze are not implemented. Existing teen/adult separation uses self-declared local fixtures. Do not invite real minors on that basis.
4. **Media hardening and validation:** verify room-follow races, reconnect/background/resume, capture errors, moderation and blocking with multiple real devices and networks. Run 100 voice / 10 camera workloads with bandwidth/CPU measurements and configure TLS/TURN for a pilot.
5. **Security/operations:** review migrations/backups, abuse controls, evidence retention and account deletion against the chosen pilot policy. Self-hosted LiveKit removal does not immediately invalidate previously issued tokens: the present reconciliation loop can remove unauthorized reconnects, but has a transient authorization window and is not a completed production revocation solution.

## Separate online launch gates

R24 deferrals remain: real email/SMS providers; tested recovery; hosting/domain/media costs against the approximately ₹2,000/month target; actual test devices; moderation staffing; age/guardian and retention policy. Paid coin purchases, payment verification/refunds and later lifestyle backends remain deliberately deferred. No paid subscription, public deployment or external messaging was performed.

## Run and current local state

See the [README](../README.md). At handoff, the built application and its API run together at `http://127.0.0.1:4200/`, using the original ignored `data/world.sqlite`. Native LiveKit is loopback-only on 7880/7881/7882. This production-preview process does not hot-reload source changes. The normal development command still starts Angular :4200 and the backend :3012 when the local parent-directory problem is absent.

The original HTML, model pack, model files and reference shots remain unchanged. The original scene adapter has only a connected-avatar cleanup hook added; previous standalone visual/demo behavior remains separate. No sibling One World data is imported.
