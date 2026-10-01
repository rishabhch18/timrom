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
  port = Number(process.env.PORT) || 3011,
  dbPath = process.env.WORLD_DB || path.join(root, "data/world.sqlite"),
} = {}) {
  const world = new World(dbPath),
    clients = new Map();
  const accounts = new Accounts(world);
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
      const base = path.join(root, "dist");
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
  function broadcast() {
    for (const [ws, c] of clients)
      if (c.user)
        try {
          if (world.auth(c.token) !== c.user) {
            send(ws, { type: "authError" });
            ws.close();
            continue;
          }
          send(ws, { type: "state", data: world.snapshot(c.user) });
        } catch (e) {
          send(ws, { type: "error", message: e.message });
        }
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
    ws.on("message", (raw) => {
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
          clearTimeout(timeout);
          world.connect(id);
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
        world.handle(c.user, m.type, m.data, c.id);
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
        world.disconnect(c.user);
      }
      clients.delete(ws);
      broadcast();
    });
  });
  const tick = setInterval(() => {
      world.tick();
      broadcast();
    }, 1000),
    motion = setInterval(() => {
      if ([...world.presence.values()].some((p) => p.path.length)) {
        world.step();
        broadcast();
      }
    }, 1250),
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
  const app = startServer();
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => app.close().then(() => process.exit(0)));
  console.log(
    "One World server: http://127.0.0.1:" + (process.env.PORT || 3011),
  );
}
