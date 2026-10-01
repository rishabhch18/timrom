import { diffState } from "../src/shared/state-patch.mjs";
import { MediaBridge } from "./media.mjs";
import http from "node:http";
import { WebSocketServer } from "ws";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Accounts } from "./accounts.mjs";
import { World } from "./engine.mjs";
import { randomUUID } from "node:crypto";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(path.join(root, "data"), { recursive: true });
export function startServer({
  port = Number(process.env.PORT) || 3012,
  seed = true,
  dbPath = process.env.WORLD_DB || path.join(root, "data/world.sqlite"),
} = {}) {
  const world = new World(dbPath, () => Date.now(), { seed }),
    clients = new Map();
  const accounts = new Accounts(world);
  const media = new MediaBridge(world);
  world.mediaMode = media.enabled ? "livekit" : "local-peer-mesh";
  const send = (ws, o) => {
    if (ws.readyState === 1) ws.send(JSON.stringify(o));
  };
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (req.method === "POST" && url.pathname.startsWith("/api/auth/")) {
        const origin = req.headers.origin;
        if (
          origin &&
          !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)
        ) {
          res.writeHead(403);
          return res.end();
        }
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 4096) throw new Error("Request too large");
        }
        const d = JSON.parse(body);
        const session = await accounts.handle(
          url.pathname.slice(10),
          d,
          req.socket.remoteAddress,
          req.headers.authorization?.replace(/^Bearer /, ""),
        );
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        return res.end(JSON.stringify(session));
      }
      if (url.pathname.startsWith("/api/") && url.pathname !== "/api/health") {
        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Unknown API route." }));
      }
      if (url.pathname === "/api/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ ok: true, mode: "local-pilot" }));
      }
      const base = path.join(root, "dist/timrom/browser");
      let file = path.resolve(base, "." + decodeURIComponent(url.pathname));
      if (!file.startsWith(base + path.sep))
        file = path.join(base, "index.html");
      if (!existsSync(file) || path.extname(file) === "")
        file = path.join(base, "index.html");
      if (!existsSync(file)) {
        res.writeHead(404);
        return res.end("Run npm run build or use the Vite development URL.");
      }
      const mime =
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".svg": "image/svg+xml",
        }[path.extname(file)] || "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": mime,
        "X-Content-Type-Options": "nosniff",
      });
      res.end(readFileSync(file));
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
  const wss = new WebSocketServer({ server, maxPayload: 20000 });
  let broadcastTimer;
  function broadcast() {
    if (!broadcastTimer)
      broadcastTimer = setTimeout(() => {
        broadcastTimer = null;
        broadcastNow();
      }, 16);
  }
  function broadcastNow() {
    world.readCache = new Map();
    for (const [ws, c] of clients)
      if (c.user)
        try {
          if (world.auth(c.token) !== c.user) {
            send(ws, { type: "authError" });
            ws.close();
            continue;
          }
          const data = {
            ...world.snapshot(c.user),
            deviceActive: world.presence.get(c.user)?.worldClient === c.id,
          };
          delete data.me.seconds;
          const signature = JSON.stringify({
            ...data,
            serverTime: Math.floor(data.serverTime / 60000),
          });
          if (signature !== c.lastSnapshot) {
            c.lastSnapshot = signature;
            if (ws.bufferedAmount > 2 * 1024 * 1024) {
              ws.close(1013, "Reconnect to refresh world state");
              continue;
            }
            const full = JSON.stringify({ type: "state", data });
            const patch =
              c.patches && c.lastState
                ? JSON.stringify({
                    type: "patch",
                    data: diffState(c.lastState, data),
                  })
                : null;
            if (ws.readyState === 1)
              ws.send(patch && patch.length < full.length ? patch : full);
            c.lastState = JSON.parse(full).data;
          }
        } catch (e) {
          send(ws, { type: "error", message: e.message });
        }
    world.readCache = null;
  }
  wss.on("connection", (ws, req) => {
    const origin = req.headers.origin;
    if (origin && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      ws.close();
      return;
    }
    const c = { id: randomUUID(), user: null, alive: true };
    clients.set(ws, c);
    const timeout = setTimeout(() => {
      if (!c.user) ws.close();
    }, 5000);
    ws.on("pong", () => (c.alive = true));
    ws.on("message", async (raw) => {
      let m;
      try {
        m = JSON.parse(raw);
        if (m.type === "hello") {
          if (c.user) return;
          const id = world.auth(m.token);
          if (!id) {
            send(ws, { type: "authError" });
            ws.close();
            return;
          }
          c.user = id;
          c.token = m.token;
          c.patches = m.patches === true;
          clearTimeout(timeout);
          world.attachDevice(id, c.id);
          broadcast();
          return;
        }
        if (!c.user || world.auth(c.token) !== c.user)
          throw new Error("Sign in first.");
        if (m.type === "signal") {
          world.limit(c.user, "signals", 100, 1000);
          const p = world.presence.get(c.user),
            other = world.presence.get(m.data.to);
          if (
            !p?.voice ||
            p.voiceClient !== c.id ||
            !other?.voice ||
            p.room !== other.room ||
            world.blocked(c.user, m.data.to)
          )
            throw new Error("Call access denied.");
          for (const [target, tc] of clients)
            if (tc.id === other.voiceClient)
              send(target, {
                type: "signal",
                from: c.user,
                data: m.data.signal,
              });
          return;
        }
        if (m.type === "mediaToken") {
          const data = await media.token(c.user, c.id);
          if (world.auth(c.token) !== c.user) throw Error("Session ended.");
          send(ws, { type: "ack", id: m.id, data });
          return;
        }
        const result = world.handle(c.user, m.type, m.data, c.id);
        if (m.type === "activitySummary") {
          send(ws, { type: "ack", id: m.id, data: result });
          return;
        }
        if (media.enabled) {
          if (m.type === "voice")
            try {
              await media.reconcile();
            } catch {
              const p = world.presence.get(c.user);
              if (p) {
                p.voice = false;
                p.voiceClient = null;
                p.video = false;
                p.muted = true;
              }
              throw Error(
                "The media service is unavailable. Text chat remains available.",
              );
            }
          else void media.reconcile().catch(() => {});
        }
        send(ws, { type: "ack", id: m.id });
        broadcast();
      } catch (e) {
        send(ws, { type: "error", id: m?.id, message: e.message });
      }
    });
    ws.on("close", () => {
      clearTimeout(timeout);
      if (c.user) {
        const p = world.presence.get(c.user);
        if (p?.voiceClient === c.id) {
          p.voice = false;
          p.voiceClient = null;
          p.video = false;
        }
        world.detachDevice(c.user, c.id);
      }
      clients.delete(ws);
      broadcast();
    });
  });
  const tick = setInterval(() => {
      world.tick();
      if (media.enabled) void media.reconcile().catch(() => {});
      broadcast();
    }, 1000),
    motion = setInterval(() => {
      if ([...world.presence.values()].some((p) => p.path.length)) {
        world.step();
        broadcast();
      }
    }, 375),
    ping = setInterval(() => {
      for (const [ws, c] of clients) {
        if (!c.alive) {
          ws.terminate();
          continue;
        }
        c.alive = false;
        ws.ping();
      }
    }, 10000);
  server.listen(port, "127.0.0.1");
  return {
    server,
    world,
    wss,
    close: async () => {
      clearTimeout(broadcastTimer);
      clearInterval(tick);
      clearInterval(motion);
      clearInterval(ping);
      const socketsClosed = new Promise((resolve) => wss.close(resolve));
      for (const ws of clients.keys()) ws.terminate();
      await Promise.all([
        socketsClosed,
        new Promise((resolve) => server.close(resolve)),
      ]);
      world.close();
    },
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = startServer({ seed: false });
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => app.close().then(() => process.exit(0)));
  console.log("Timrom server: http://127.0.0.1:" + (process.env.PORT || 3012));
}
