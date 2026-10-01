import { once } from "node:events";
import { performance } from "node:perf_hooks";
import { WebSocket } from "ws";
import { startServer } from "../server/index.mjs";
const app = startServer({ port: 0, dbPath: ":memory:", seed: false });
await once(app.server, "listening");
const url = `ws://127.0.0.1:${app.server.address().port}/socket`;
const accounts = Array.from({ length: 100 }, (_, i) =>
  app.world.login("Load participant " + i, "adult"),
);
const owner = accounts[0].user.id;
app.world.connect(owner);
app.world.handle(owner, "createHome", { name: "Isolated load fixture" });
const h = app.world.snapshot(owner).homes[0],
  r = h.rooms.find((r) => r.outdoor);
for (const a of accounts)
  app.world.run("INSERT OR IGNORE INTO members VALUES(?,?)", h.id, a.user.id);
app.world.disconnect(owner);
const peers = [];
const start = performance.now();
let bytes = 0;
try {
  for (const a of accounts) {
    const ws = new WebSocket(url);
    await once(ws, "open");
    let wait;
    const ready = new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(Error("Connection timed out")), 30000);
      wait = (m) => {
        if (m.type === "state") {
          clearTimeout(t);
          resolve();
        }
      };
    });
    ws.on("message", (raw) => {
      bytes += raw.length;
      const m = JSON.parse(raw);
      wait?.(m);
    });
    ws.send(JSON.stringify({ type: "hello", token: a.token, patches: true }));
    await ready;
    app.world.join(a.user.id, r.id);
    peers.push(ws);
  }
  const joined = performance.now();
  const latencies = [];
  for (let i = 0; i < 10; i++) {
    const ws = peers[i];
    const begin = performance.now(),
      id = "load-" + i;
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(Error("Command timeout")), 30000);
      const onMessage = (raw) => {
        const m = JSON.parse(raw);
        if (m.id === id) {
          clearTimeout(t);
          ws.off("message", onMessage);
          m.type === "ack" ? resolve() : reject(Error(m.message));
        }
      };
      ws.on("message", onMessage);
      ws.send(
        JSON.stringify({
          id,
          type: "chat",
          data: { body: "Load fixture message " + i, nonce: id },
        }),
      );
    });
    latencies.push(performance.now() - begin);
  }
  latencies.sort((a, b) => a - b);
  console.log(
    JSON.stringify(
      {
        clients: peers.length,
        roomOccupants: app.world.snapshot(owner).room.people.length,
        connectMs: Math.round(joined - start),
        commandP50Ms: Math.round(latencies[5]),
        commandMaxMs: Math.round(latencies[9]),
        receivedMB: Math.round(bytes / 10485.76) / 100,
        scope:
          "Local control plane only; no media, browser rendering or physical-device certification",
      },
      null,
      2,
    ),
  );
} finally {
  peers.forEach((ws) => ws.terminate());
  await app.close();
}
