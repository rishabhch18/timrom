# Angular migration

> **Integration update:** all R01–R24 recommendations are accepted and implementation has begun. The repository now contains a connected Angular UI and local backend; `/?preview=1` retains the separate visual demo. See [current integration status](INTEGRATION-STATUS.md) for completed behavior and remaining work. Earlier sections below describe the pre-integration baseline and are historical where superseded.


## What is running

Angular 22.2 standalone application, TypeScript 6.0, RxJS 7.8, pinned Three.js 0.147 and GSAP 3.12.5. Use Node 24.15+. Dependencies are locked in `package-lock.json`; runtime CDN scripts have been replaced with npm imports. The original Google Fonts stylesheet remains an optional external request with system-font fallbacks.

`src/main.ts` bootstraps Angular. `AppComponent` owns mounting/error handling, `HeaderComponent` owns navigation events and selected-mode bindings, and `WorldComponent` owns the stable scene/side-panel/dock template. `WorldFacade` lazy-loads the scene and exposes typed navigation plus signal snapshots; `PreviewStorage` provides local persistence. `src/styles.css` preserves the upstream design.

`src/world/timrom-engine.js` is the original 3D/interaction logic extracted into an ES module with an explicit mount/destroy API. There is no iframe, runtime HTML-page injection, eval or external legacy script load. It preserves the original models, catalog, animations, procedural audio, timers, builder and sample-neighbour behavior. Timer/task coin awards were subsequently removed to honor the founder's confirmed economy. Header commands now cross an Angular facade; remaining dynamic side panels, modal content, timer controls and animated wallet text still use the preserved imperative DOM renderer.

**This is a functioning Angular migration with an isolated legacy interaction adapter, not a complete rewrite of every panel and business rule into Angular templates.** Converting those panels incrementally while introducing the real backend is the next step. Leaving Three.js rendering imperative is normal; retaining business/UI DOM generation is explicit migration debt.

## Lifecycle and storage

- Angular mounts after rendering and destroys the engine with its host. An import generation check prevents a late scene import from mounting after teardown.
- Timers, RAF and global keyboard listeners are tracked without patching browser globals; fetch is abortable; resize observers, controls, audio context, tweens and GPU resources are cleaned up on normal destruction.
- Async model results cannot mutate the removed host. Asset loading no longer temporarily disables global `createImageBitmap`.
- The `timrom.v1` local-storage format is retained. Invalid/incomplete records fall back to fresh demo state; valid-but-incomplete parsed records receive a recovery copy. Denied/quota-limited storage does not crash startup, but progress cannot be guaranteed when storage is unavailable.
- Each origin/port has separate local storage. The old One World database and accounts are unchanged. No demo data is imported into its backend.
- The preview is explicitly offline. The upstream hosting-specific `window.claude` discovery is disabled; ordinary browser sessions must not silently acquire shared-service identities. General chat is local and neighbour replies are clearly labelled simulated.

## Preserved versus pending

Preserved: visual house/furniture, all 51 model files and pack, home/build/neighbourhood/explore/park modes, local timer restoration, daily dashboard, pets, mailbox, memory book, household/appearance editor, theme/finish shop and generated music.

Pending: real authentication/UI binding, One World backend adapter, authoritative room mapping/admission, persistent real-user chat/DMs, voice/video, approved economy and instance ownership, full Angular panel templates, keyboard/focus accessibility, full Hindi translation and device performance testing.

After the founder reconfirmed the existing economy, timer/task coin payouts and Great Day multipliers were removed from the Angular preview. Sample spending balances and accelerated timers remain for visual testing; actual XP and interactive-coin earning await authenticated backend integration. Daily goals, streak visuals and pet growth remain preview features without coin bonuses. See [comparison and pending decisions](COMPARISON-AND-DECISIONS.md).

## Confirmed integration order — 30 September 2026

The first integrated release is community-home based, with optional Create home from templates, free movement around the current home's environment, and neighbouring destinations drawn from joined homes. No personal house is automatically created. The sample neighbours/home in this preview are not that implementation. Pets, NPC household, tasks, journal and music backends follow social homes/chat/calls; both gate walking and direct travel are now confirmed. Only the current home shows full detail; joined neighbours use small previews, swapping roles on a home switch. Each home has its own moderated outdoor forum, open to eligible visitors, with unlimited logical entry and its own text/voice conversation. Forum access does not grant private interior access or home membership. Ask once for voice auto-join, persist agreement, and join automatically on later entries even without a previously active call, preserving mic/camera state. Each room owner or authorized admin can choose open conversation or moderator-managed speakers, with listening/text chat for everyone. Auto-join does not bypass speaker permissions. The mode default and live-switch handling remain open. These behaviors await real backend integration. See decisions D2–D4 in the comparison document.

## Next milestone confirmed

Build the integrated local web app first, then an invite-only online pilot. The first version includes templates, room/door editing and furniture placement. Earned coins precede paid coin purchases. Remaining behavior is being clarified in [the decision sheet](PRE-IMPLEMENTATION-DECISIONS.md); no new application-code work starts until the milestone's requirements are settled or choices explicitly delegated.

## Fidelity and device target

The founder confirmed one shared Angular project, faithfully matching the retained HTML version's graphics, layout, movement and animations while keeping the approved product-rule changes. The first pilot targets 100 simultaneous online users, up to 100 voice participants and 10 cameras across the app on laptop, Android and iOS browsers; minimum device profiles remain open. These are test targets, not fixed room limits. Neither visual parity across every interaction nor 100-user performance has been certified. See the decision sheet's fidelity and test requirements before calling migration complete.

## Run and verify

```sh
nvm use
npm ci
npm start
# http://127.0.0.1:4200/

npm run check
```

`npm run build` emits `dist/timrom/browser/`. Serve that directory with an HTTP server and SPA fallback for future routes. The current application is a single route. `models.json` is copied to the build root; source GLBs remain in the repository as originals. No backend or paid infrastructure is required for this preview.

Validation notes are recorded in [verification](VERIFICATION.md). Re-run the build after source changes; the dev server does not update a previously built `dist/` directory.

## Compatibility constraints

Angular's supported version table is at https://angular.dev/reference/versions; the installed 22.2 compiler peer requirement is TypeScript >=6.0 <6.1. The selected Node 24.15 and TypeScript 6.0 satisfy those constraints. Do not install unconstrained latest TypeScript.

The preserved r147 loader logs unsupported custom UV-set warnings for some models. Models load, but material fidelity still needs review when changing the renderer. Upgrade Three.js separately from this migration, with screenshots, character-clip tests and texture comparison. The 4.5 MB base64 model pack also remains a mobile download/memory cost; replace with individual cacheable GLBs/LOD in a later performance pass.

Upstream credits remain in `docs/UPSTREAM-README.md`; asset license provenance has not been independently audited.
