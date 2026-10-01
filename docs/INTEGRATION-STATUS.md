# Local integration status — 30 September 2026

All R01–R24 recommendations are accepted. The local requirements clarification gate is closed. This document distinguishes implemented behavior from the remaining integrated milestone; approval does not imply completion.

## Run and data boundary

`npm ci` then `npm run dev` under Node 24.15+ starts Angular at http://127.0.0.1:4200 and the watched server at http://127.0.0.1:3012. Angular proxies `/api/**` and `/socket`. `npm run server` runs the backend separately; `npm start` runs Angular separately. `npm run build` followed by `npm run server` serves the built Angular app directly from :3012.

The default route is the connected Angular app. `/?preview=1` retains the original visual demo and its local storage. The connected database is `data/world.sqlite` (ignored by Git). No sibling One World database, user contacts, sessions or preview records are copied. Existing One World remains available separately on :5173/:3011. The connected server starts with no seeded communities or people; QA created a synthetic local account and private QA Study House, not an automatically provisioned user home.

## Implemented in this increment

- Real persisted local accounts and email/password or mobile test-code authentication, private contacts and unique username. Development codes are explicitly labelled; no SMS/email is sent. Session-based WebSocket commands, acknowledgements, errors and reconnect handling.
- Optional creation of Hangout/Study/Gaming/Work homes, invite entry, explicit public-home membership, community age bands and no automatic personal house. Templates create lounge, purpose room, kitchen, rest room and an unlimited moderated garden forum. Geography is manually entered.
- Template starter items are home-owned. Existing object/cell placement validation and instance purchases are connected to Angular. Place/move/rotate/store controls and reusable finishes use server commands. Trial prices: chair/desk/plant/counter/sage 20 coins at level 1; lamp/rose 50 at level 3; sofa/bed 100 at level 5. Free starter fixtures bypass purchase gates.
- Connected scene reuses Timrom models and renderer/animation machinery; server-authoritative floor clicks traverse permitted doorways. Camera follow/overview, furniture action menus, filtered scene occupants, room chat on admission and miniature exterior previews for other joined homes. This dynamic grid is an integration layout, not a verified replica of the original furnished house composition.
- Room creation, default capacity 8 when omitted, explicit 0 unlimited, capacity reduction without ejecting occupants, owner/admin editing, delegated home/room roles, selected-member room access and authoritative locks. Private room data is filtered from scene snapshots and inaccessible routes stop safely.
- Persisted room text chat, room/furniture tracking opt-ins, manual routines that continue offline without offline rewards, online XP and participation coins. Last accessible room restores on reconnect; locked/inaccessible destinations fall back to discovery.
- Angular voice/video controls with saved auto-join consent, muted/camera-off fresh sessions, manual Leave pause, moderated speaker flags/raise-hand, room mode changes and quiet rooms. Peer connections are confined to authenticated co-present local callers; blocked and non-speaking audio is suppressed by the supported client.
- One shared repository contains frontend, server, tests and a watched development startup command. The inherited vulnerable ws 8.18 dependency was replaced by 8.22.0; audit reported zero known vulnerabilities afterward.

## Required before calling the integrated milestone complete

1. Full draft geometry editor: room resizing/movement, explicit door editing, undo and safe atomic publish. Current room addition uses fixed 12×9-cell rooms and generated adjacency. Do not present this as the approved complete builder.
2. Finish Timrom visual/motion parity for each approved template, item-specific body/furniture anchors, mature/miniature rig customization, realistic activity transitions, neighbour gate walking and polished exterior surroundings. Current model reuse is not full parity or verified physics. Original GLTF UV warnings still occur.
3. Complete public listing review/dashboard, searchable/filterable globe and favourites, home rules content, admin role UI scoping, social profile/avatar onboarding and actual language selection/Hindi translations.
4. Finish rich chat, accepted-friend DMs, reactions/replies/edit/delete, notifications, reporting/blocking/timeout/kick/ban UI and moderation audit workflows. Existing server primitives are not a completed end-to-end social UI.
5. Implement acceptance queues for lending/donation, deletion/succession and orphan retirement. Legacy server transfer primitives remain; they do not yet implement the newly approved complete lifecycle. Do not expose them as completed flows.
6. Implement activity audience choices, offline editing/backfill, daily/week totals, a 30-second reservation and explicit world-device takeover. Current reconnect rechecks admission immediately; no reservation guarantee yet.
7. Finish media device selection, low-bandwidth settings, 10-camera limits, robust permission/error/race tests and authoritative moderated media via an SFU. The retained local mesh has a visible six-person limit and no TURN. Server speaker flags plus client suppression are not SFU-level media enforcement. Do not claim 100 voice participants or cross-network reliability.
8. Contact recovery/linking UI, reauthentication controls, age transition/guardian flows, export/deletion and retention policy handling. Local age bands remain self-declared test fixtures.
9. Finish keyboard interaction and mobile expandable chat, perform real Android/iOS/laptop tests, run 100-user server/scene load tests and actual multi-device audio/video checks. Viewport checks are not physical-device or media-quality tests.

R24 launch deferrals still apply: provider/cost/hosting/age/guardian/operations decisions before a real pilot; paid purchases and payment policies afterward. No subscriptions, external messages, deployment or GitHub push were performed.

## Verification

The current suite covers the preserved model pack, lifecycle/storage, HTTP/WebSocket auth and durable chat, age/access, capacity races, consent, economy and ownership primitives, plus template/forum creation, delegated administration, private-interior filtering, moderated command eligibility, manual offline history, last-room recovery and access revocation during movement. Legacy React-only IK tests were not included: they would not verify the connected Timrom avatar rig.

Browser checks exercised synthetic-account sign-in, no-home onboarding, Study creation, visible connected rooms, server-backed text chat, walking from garden to kitchen, remembered muted auto-join without microphone permission, owner capacity update and return after frontend/server reload. Responsive checks at 390×844 found and fixed the unused full-height preview host and dark input contrast. No error-level console messages in those inspected flows. Microphone/camera capture, two-browser live media and physical devices were not verified.


Final increment checks: **39 tests passed**, Angular production build succeeded (approximately 218 kB initial, 889 kB lazy scene, plus the unchanged model pack), `git diff --check` passed, and the final production dependency audit reported zero known vulnerabilities. The original HTML, packed models, model files and reference shots have no tracked changes.

Browser evidence: [connected desktop](connected-desktop.png) and [390px mobile viewport](connected-mobile.png). Saved screenshots use the synthetic QA account and its private home. The app and backend remain running locally; microphone and camera permission were not requested during browser checks.
