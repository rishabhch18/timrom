# Timrom — Angular social homes

One shared Angular frontend and SQLite/WebSocket backend for connected homes, room chat, activity tracking, inventory and moderation. The integrated local app is usable, but the full product is **still in progress**, especially visual/motion fidelity, real verification providers and real-device media validation. See [implemented features, test evidence and remaining gaps](docs/INTEGRATION-STATUS.md).

## Run locally

Use Node **24.15+**:

```sh
nvm use
npm ci
npm run dev
```

- Connected app: http://127.0.0.1:4200/
- Original visual reference: http://127.0.0.1:4200/?preview=1
- Development backend health: http://127.0.0.1:3012/api/health

Email/SMS use clearly labelled **local test codes**. Without SFU configuration, calls use the limited local mesh adapter.

### Local SFU

On macOS, install the official Homebrew `livekit` formula once, then:

```sh
npm run media:native  # keep this terminal running
npm run dev:media    # run in another terminal
```

Alternatively, `npm run media:up` starts the pinned Docker service; `npm run media:down` stops it. The Docker path was supplied but could not be runtime-verified on this host; native LiveKit 1.13.7 was verified. Both configurations are only local development examples. The public credentials in `.env.example` and `infra/` must never be used for a public deployment.

Muted browser SFU connection was verified. 100 live voice participants, 10 real cameras, TURN and cross-network calling have **not** been validated.

### Verify and preview

```sh
npm run check        # automated tests + production build
npm run test:load    # isolated 100-client control-plane smoke test
npm run build
npm run preview:media # serve built app/API on :3012 with the local SFU config
```

Set `PORT=4200` to run the built preview at the usual frontend address instead. Stop a development server using that port first. The preview has no hot reload. `npm run server` serves the built app without automatically loading `.env.example`; real deployment configuration is intentionally not supplied.

The connected database is ignored `data/world.sqlite`. Run `npm run db:backup` before migrations; it creates an integrity-checked snapshot in ignored `data/backups/`, including committed WAL data, without stopping the server or overwriting earlier backups. Run `npm run db:check -- path/to/backup.sqlite` to check a snapshot. Backups contain private data and sessions: keep them out of Git and shared folders. See [recovery instructions](docs/LOCAL-ARCHITECTURE.md#backup-and-recovery). No demo or sibling One World data is imported. Tests use synthetic in-memory or temporary databases.

For the operator dashboard, configure `TIMROM_OPERATORS` with comma-separated **existing usernames** in your local process environment. A home owner is not automatically a platform operator. See [local architecture and operations](docs/LOCAL-ARCHITECTURE.md).

## Structure

| Path | Purpose |
|---|---|
| `src/app/` | Angular UI, account state, builder, community panels and calls |
| `src/shared/` | Ordered snapshot deltas, furniture footprints/anchors and keyboard portal resolution |
| `src/world/connected-scene.js` | Authorized snapshots rendered with the original Timrom assets |
| `src/world/timrom-engine.js` | Preserved visual-demo scene adapter and asset/animation helpers |
| `server/` | Accounts, geometry, social permissions, economy, devices and media adapter |
| `infra/`, `compose.yaml` | Loopback-only SFU examples |
| `tests/`, `scripts/load-smoke.mjs` | Domain, API, transport, model/lifecycle and load checks |
| `references/` | Earlier prototype source and research |
| `timrom.html`, `models/`, `models.json`, `shots/` | Original visual references/assets |

[Approved requirements](docs/PRE-IMPLEMENTATION-DECISIONS.md) · [Current status](docs/INTEGRATION-STATUS.md) · [Project comparison](docs/COMPARISON-AND-DECISIONS.md) · [Migration history](docs/ANGULAR-MIGRATION.md) · [Upstream README](docs/UPSTREAM-README.md)

Upstream credits identify the models as Kenney CC0 via Hidencod/tge-assets. Exact asset-license provenance remains to be verified before redistribution. Earlier research/prototypes are archived under [references](references/README.md).
