# Verification — 30 September 2026

> **Integration update:** all R01–R24 recommendations are accepted and implementation has begun. The repository now contains a connected Angular UI and local backend; `/?preview=1` retains the separate visual demo. See [current integration status](INTEGRATION-STATUS.md) for completed behavior and remaining work. Earlier sections below describe the pre-integration baseline and are historical where superseded.


## Connected increment verification

`npm run check` passed **39 tests** and the production build after local integration. Production dependency audit reports zero known vulnerabilities. Browser verification and remaining limits are recorded in [INTEGRATION-STATUS.md](INTEGRATION-STATUS.md); evidence: [desktop](connected-desktop.png), [mobile](connected-mobile.png). Below are historical checks for the earlier visual-only migration.

## Automated checks

- `npm run check`: four tests passed and Angular production build succeeded.
- All 51 packed models are valid GLB v2 files, byte-identical to the original `models/` files. Character animation clips remain present.
- Engine lifetime test verifies pending timers/frames/intervals and global keyboard listeners stop on disposal, disposal is idempotent, and a subsequent lifetime does not duplicate listeners.
- Storage tests cover denied browser storage and recovery from incomplete older records.
- Sibling `../one-world/`: all 30 existing tests passed, including real HTTP/WebSocket clients, auth/contact privacy, connected-door capacity, ownership/lending/donation, economy and consent.
- Original `timrom.html`, model pack and model files have no Git differences from the cloned commit. Root README/ignore configuration were updated for Angular; the upstream README was preserved.

## Browser checks

The Angular dev preview at `http://127.0.0.1:4200/` was exercised in the Codex browser:

| Check | Observed result |
|---|---|
| Home startup | House/characters/furniture rendered; all 51 models loaded |
| Angular navigation | Home, Build & buy, Neighbourhood and Park commands changed the visible view |
| Activity menu | Study desk opened category/duration choices |
| Session persistence | Started and paused a timer; reload restored the paused 24:50 value |
| Early end | Ending under one logged minute did not change the sample balance |
| Local purchase | Floor lamp cost 120 sample coins, balance went 420 → 300, item became Placed |
| Purchase persistence | Floor lamp and balance survived the development reload |
| Settings/avatar | Settings and appearance editor opened with expected controls; cancelled appearance edit |
| Chat | Messages opened beside the desktop world; neighbours labelled simulated |
| Approved economy | A completed 15-minute accelerated study session logged minutes while balance stayed 300 |
| Checklist economy | Completing a sample task left balance at 300 and no longer advertised a coin reward |
| Mobile | Found and fixed inherited navigation overflow; document width equals viewport width at 390px |
| Runtime errors | No captured error-level console messages during the checked flows |

Screenshots: [desktop](angular-home-desktop.jpg), [mobile](angular-home-mobile.jpg). Browser test actions affected only the new Angular origin's local demo progress. No real accounts, external messages or payments were created. The sample profile retains the test lamp purchase and completed example routine/task for inspection.

The current One World backend was restarted and `/api/health` returned `{"ok":true,"mode":"local-pilot"}`. Its frontend is available at `http://127.0.0.1:5173/`. The two apps remain independent.

## Build and asset size

The checked production build reports approximately 170 kB of initial JS/CSS and an 884 kB lazy scene bundle (raw), plus the unchanged approximately 4.5 MB model pack. These are build outputs, not measured mobile transfer-time or frame-rate guarantees. Engine loading is deferred from the initial Angular bundle, but the scene immediately needs the model pack once opened.

## Known limits

- Some retained r147 GLTFLoader material warnings concern custom UV sets in `KHR_texture_transform`; model loading succeeds. Do not confuse no error-level logs with a warning-free renderer.
- Real-user backend integration, voice/video, paid coins, SMS/email delivery and production age assurance are not part of this Angular conversion.
- Dynamic internal panels remain imperative; Angular owns the application, host lifecycle, stable templates and navigation facade. Full template conversion remains explicit migration debt.
- Mobile is responsive web, not a native mobile app. The navigation strip scrolls horizontally within the page; household/music controls inherit the original small-screen hiding behavior. Full feature access on phones needs a separate UI pass.
- The inherited idle footer clock refreshes on panel/state rendering, while the world clock refreshes periodically; this minor consistency issue remains.
- Scene teardown helpers were unit tested, but a long-running GPU-memory soak test was not performed. Motion/contact fidelity, every catalog item, real audio output and every device/browser remain unverified.
- Temporary desktop/mobile viewport overrides were reset after verification. Development processes are local, not OS-startup services; use the README commands after a restart.
