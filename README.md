# Timrom — Angular and local backend

The shared Angular repository now includes the server-authoritative local backend. The default app uses persisted accounts, template homes, connected-room movement, room chat, capacity/settings, activity tracking and inventory commands. **The full integrated milestone remains in progress:** see [implemented behavior, verification and remaining work](docs/INTEGRATION-STATUS.md).

The original HTML, 51 models and visual demo are retained as references. The connected dynamic room layout reuses those assets but has not yet reached full visual/motion parity.

## Run

Use Node **24.15+**:

```sh
nvm use
npm ci
npm run dev
```

- Connected app: **http://127.0.0.1:4200/**
- Original visual demo: **http://127.0.0.1:4200/?preview=1**
- Backend health: **http://127.0.0.1:3012/api/health**

Email/SMS verification uses clearly labelled local test codes. Media currently uses a six-person local peer mesh; the 100-voice/10-camera pilot target is not yet supported or verified.

```sh
npm run check   # tests and production build
npm run build  # dist/timrom/browser/
npm run server # serve backend + built app on :3012
```

`npm start` runs Angular alone and expects the backend on :3012. `npm run dev` supervises both and watches backend source changes. The connected database lives in ignored `data/world.sqlite`; do not commit or redistribute it. The sibling One World app/data remain separate and unchanged. Demo storage is never synchronized into authenticated accounts.

## Structure and decisions

| Path | Purpose |
|---|---|
| `src/app/social*`, `call.service.ts`, `connected-world.component.ts` | Angular connected UI, WebSocket/auth state and local media |
| `src/world/connected-scene.js` | Server-snapshot-driven scene using the preserved renderer/assets |
| `src/world/timrom-engine.js` | Original scene adapter with separate preview/connected lifecycles |
| `server/` | SQLite accounts, rooms, movement, social permissions and commands |
| `tests/` | Domain, HTTP/WebSocket, model and lifecycle verification |
| `references/` | Earlier prototype source, graphics exploration and product research |
| `timrom.html`, `models/`, `models.json`, `shots/` | Original visual references/assets |

[Approved requirements](docs/PRE-IMPLEMENTATION-DECISIONS.md) · [Comparison](docs/COMPARISON-AND-DECISIONS.md) · [Migration history](docs/ANGULAR-MIGRATION.md) · [Verification](docs/VERIFICATION.md) · [Upstream README](docs/UPSTREAM-README.md)

Upstream credits identify models as Kenney CC0 via Hidencod/tge-assets. Exact asset-license provenance remains to be verified before redistribution.

[Earlier prototypes and research](references/README.md) are archived alongside the active application so the complete project source remains available.
