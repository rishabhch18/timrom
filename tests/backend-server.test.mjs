import { applyStatePatch } from "../src/shared/state-patch.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { WebSocket } from "ws";
import { startServer } from "../server/index.mjs";
async function client(port, name, band = "adult", patches = false) {
  const res = await fetch(`http://127.0.0.1:${port}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      band,
      username: name.toLowerCase(),
      kind: "email",
      contact: name.toLowerCase() + "@example.test",
      password: "test-password-only",
    }),
  });
  const challenge = await res.json();
  assert(res.ok);
  const verified = await fetch(`http://127.0.0.1:${port}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challenge: challenge.challenge,
      code: challenge.developmentCode,
    }),
  });
  const account = await verified.json();
  assert(verified.ok);
  const ws = new WebSocket(`ws://127.0.0.1:${port}/socket`);
  const queue = [],
    waiters = [];
  let state;
  ws.on("message", (data) => {
    let m = JSON.parse(data);
    if (m.type === "patch") {
      state = applyStatePatch(state, m.data);
      m = { type: "state", data: state, patched: true };
    } else if (m.type === "state") state = m.data;
    queue.push(m);
    for (const w of [...waiters])
      if (w.predicate(m)) {
        clearTimeout(w.timer);
        waiters.splice(waiters.indexOf(w), 1);
        w.resolve(m);
      }
  });
  await once(ws, "open");
  const wait = (predicate) => {
    const found = queue.find(predicate);
    if (found) return Promise.resolve(found);
    return new Promise((resolve, reject) => {
      const w = {
        predicate,
        resolve,
        timer: setTimeout(() => {
          waiters.splice(waiters.indexOf(w), 1);
          reject(Error("Timed out waiting for WebSocket event"));
        }, 3000),
      };
      waiters.push(w);
    });
  };
  ws.send(JSON.stringify({ type: "hello", token: account.token, patches }));
  await wait((m) => m.type === "state");
  let counter = 0;
  return {
    ws,
    account,
    wait,
    queue,
    send: async (type, data) => {
      const id = name + ++counter;
      ws.send(JSON.stringify({ id, type, data }));
      return wait(
        (m) => m.id === id && (m.type === "ack" || m.type === "error"),
      );
    },
  };
}
test("HTTP and real WebSocket clients share durable chat, full-room decisions, presence and scoped signaling", async (t) => {
  const app = startServer({ port: 0, dbPath: ":memory:" });
  await once(app.server, "listening");
  const port = app.server.address().port;
  let a, b, c;
  try {
    a = await client(port, "Alice");
    b = await client(port, "Blair");
    c = await client(port, "Casey", "teen");
    const home = app.world
        .snapshot(a.account.user.id)
        .homes.find((h) => h.id === "common"),
      room = home.rooms[0].id;
    assert.equal((await c.send("join", { room })).type, "error");
    await a.send("join", { room });
    await b.send("join", { room });
    await a.send("chat", { body: "A real socket message", nonce: "hello" });
    const received = await b.wait(
      (m) =>
        m.type === "state" &&
        m.data.room?.messages.some((m) => m.body === "A real socket message"),
    );
    assert.equal(received.data.room.people.length, 2);
    await a.send("chat", { body: "A real socket message", nonce: "hello" });
    assert.equal(app.world.all("SELECT * FROM messages").length, 1);
    const denied = await a.send("signal", {
      to: b.account.user.id,
      signal: { description: { type: "offer", sdp: "test" } },
    });
    assert.equal(denied.type, "error");
    await a.send("voice", { join: true, muted: true });
    await b.send("voice", { join: true, muted: true });
    a.ws.send(
      JSON.stringify({
        type: "signal",
        data: {
          to: b.account.user.id,
          signal: { candidate: { candidate: "test" } },
        },
      }),
    );
    const signal = await b.wait((m) => m.type === "signal");
    assert.equal(signal.from, a.account.user.id);
    await a.send("createHome", { name: "Socket Home" });
    const r = app.world.snapshot(a.account.user.id).room;
    await a.send("capacity", { room: r.id, capacity: 1 });
    const full = await b.send("invite", {
      code: app.world.home(r.home).invite,
    });
    assert.equal(full.type, "error");
    assert.match(full.message, /full/);
    assert.equal(app.world.count(r.id), 1);
    await a.send("capacity", { room: r.id, capacity: 0 });
    await b.send("join", { room: r.id });
    assert.equal(app.world.count(r.id), 2);
    a.ws.close();
    await once(a.ws, "close");
    await b.wait(
      (m) =>
        m.type === "state" &&
        m.data.room?.id === r.id &&
        m.data.room.people.length === 1,
    );
    assert.equal(app.world.count(r.id), 2); // One online occupant plus a 30-second reconnect reservation.
    assert.equal(app.world.reservationsFor(r.id).length, 1);
  } finally {
    for (const peer of [a, b, c]) peer?.ws.terminate();
    await app.close();
  }
});
test("foreign HTTP origin and untrusted WebSocket origin are refused", async () => {
  const app = startServer({ port: 0, dbPath: ":memory:" });
  await once(app.server, "listening");
  const port = app.server.address().port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/signup`, {
      method: "POST",
      headers: {
        Origin: "https://evil.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Nope", band: "adult" }),
    });
    assert.equal(res.status, 403);
    const ws = new WebSocket(`ws://127.0.0.1:${port}/socket`, {
      origin: "https://evil.example",
    });
    await once(ws, "close");
    assert.equal(app.world.all("SELECT * FROM users").length, 0);
  } finally {
    await app.close();
  }
});

test("negotiated WebSocket deltas retain complete client state after home creation and chat", async () => {
  const app = startServer({ port: 0, dbPath: ":memory:", seed: false });
  await once(app.server, "listening");
  let a;
  try {
    a = await client(app.server.address().port, "DeltaTester", "adult", true);
    await a.send("createHome", { name: "Delta home" });
    await a.wait((m) => m.type === "state" && m.data.room);
    await a.send("chat", {
      body: "Delta transport check",
      nonce: "delta-message",
    });
    const result = await a.wait(
      (m) =>
        m.type === "state" &&
        m.data.room?.messages.some((v) => v.body === "Delta transport check"),
    );
    assert.equal(result.patched, true);
    assert.equal(result.data.me.username, "deltatester");
    assert.equal(result.data.scene.home, result.data.room.home);
  } finally {
    a?.ws.terminate();
    await app.close();
  }
});
