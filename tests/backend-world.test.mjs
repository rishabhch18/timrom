import test from "node:test";
import assert from "node:assert/strict";
import { World } from "../server/engine.mjs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
function fixture(t) {
  let clock = 1000000;
  const w = new World(":memory:", () => clock);
  t.after(() => w.close());
  const user = (name, band = "adult") => {
    const a = w.login(name, band).user;
    w.connect(a.id);
    return a.id;
  };
  const a = user("Alex"),
    b = user("Blair");
  const room = w.get("SELECT id FROM rooms WHERE home='common' LIMIT 1").id;
  const tick = (seconds) => {
    for (let i = 0; i < seconds; i++) {
      clock += 1000;
      w.tick();
    }
  };
  return { w, a, b, user, room, tick };
}
function own(w, a) {
  w.handle(a, "createHome", { name: "Test home", genre: "Study" });
  return w.snapshot(a).room;
}
test("age bands and private homes are enforced on the server", (t) => {
  const { w, a, b, user, room } = fixture(t);
  const teen = user("Teen", "teen");
  assert.throws(() => w.join(teen, room), /access/);
  const r = own(w, a);
  assert.throws(() => w.join(b, r.id), /access/);
  w.handle(b, "invite", { code: w.home(r.home).invite });
  assert.equal(w.presence.get(b).room, r.id);
  assert.throws(
    () => w.handle(teen, "invite", { code: w.home(r.home).invite }),
    /age group/,
  );
  assert.equal(
    w.snapshot(a).homes.some((h) => h.band === "teen"),
    false,
  );
});
test("last-slot admission is atomic; zero removes admission limit", (t) => {
  const { w, a, b, user } = fixture(t),
    r = own(w, a);
  w.handle(a, "capacity", { room: r.id, capacity: 1 });
  assert.throws(
    () => w.handle(b, "invite", { code: w.home(r.home).invite }),
    /full/,
  );
  assert.equal(w.count(r.id), 1);
  w.handle(a, "capacity", { room: r.id, capacity: 0 });
  w.join(b, r.id);
  const c = user("Casey");
  w.handle(c, "invite", { code: w.home(r.home).invite });
  assert.equal(w.count(r.id), 3);
  w.handle(a, "capacity", { room: r.id, capacity: 1 });
  assert.equal(w.count(r.id), 3);
  assert.throws(
    () => w.handle(b, "capacity", { room: r.id, capacity: 0 }),
    /owner/,
  );
});
test("room switches free capacity and clear voice; same room is idempotent", (t) => {
  const { w, a, room } = fixture(t);
  w.join(a, room);
  w.handle(a, "voice", { join: true, muted: true }, "tab-a");
  w.join(a, room);
  assert(w.presence.get(a).voice);
  const r = w.get(
    "SELECT id FROM rooms WHERE home='common' AND id<>? LIMIT 1",
    room,
  ).id;
  w.join(a, r);
  assert.equal(w.count(room), 0);
  assert.equal(w.presence.get(a).voice, false);
});
test("XP includes sleep and idle, counts once across tabs; offline stops it", (t) => {
  const { w, a, tick } = fixture(t);
  w.connect(a);
  w.handle(a, "activity", { kind: "Sleeping", visibility: "private" });
  tick(60);
  assert.equal(w.user(a).xp, 1);
  assert.equal(w.user(a).seconds, 60);
  assert.equal(w.user(a).coins, 120);
  w.disconnect(a);
  tick(60);
  assert.equal(w.user(a).xp, 2);
  w.disconnect(a);
  tick(60);
  assert.equal(w.user(a).xp, 2);
  assert.equal(w.snapshot(a).activities[0].end, null); // Manual sleep persists; XP already proved stopped.
});
test("passive activity earns no coins, shared interactive activity earns one window grant", (t) => {
  const { w, a, b, room, tick } = fixture(t);
  w.join(a, room);
  w.join(b, room);
  for (const id of [a, b])
    w.handle(id, "activity", { kind: "Sleeping", visibility: "private" });
  tick(60);
  assert.equal(w.user(a).coins, 120);
  for (const id of [a, b])
    w.handle(id, "activity", { kind: "Studying", visibility: "private" });
  tick(60);
  assert.equal(w.user(a).coins, 122);
  assert.equal(w.user(b).coins, 122);
  assert.equal(
    w.snapshot(b).room.people.find((p) => p.id === a).activity,
    null,
  );
});
test("chat participation is windowed, nonce replay does not duplicate, spam is rejected", (t) => {
  const { w, a, b, room, tick } = fixture(t);
  w.join(a, room);
  w.join(b, room);
  w.handle(a, "chat", { body: "Hello friend", nonce: "one" });
  w.handle(a, "chat", { body: "Hello friend", nonce: "one" });
  assert.throws(
    () => w.handle(a, "chat", { body: "Hello friend", nonce: "two" }),
    /repeated/,
  );
  w.handle(a, "chat", { body: "How is your day?", nonce: "three" });
  assert.equal(w.snapshot(a).room.messages.length, 2);
  assert.equal(w.user(a).coins, 120);
  tick(60);
  assert.equal(w.user(a).coins, 122);
  assert.equal(w.user(b).coins, 120);
  tick(60);
  assert.equal(w.user(a).coins, 122);
});
test("solo chat does not earn coins; blocking removes messages and prevents friendship", (t) => {
  const { w, a, b, room, tick } = fixture(t);
  w.join(a, room);
  w.handle(a, "chat", { body: "Solo", nonce: "one" });
  tick(60);
  assert.equal(w.user(a).coins, 120);
  w.join(b, room);
  w.handle(b, "block", { user: a });
  assert.equal(w.snapshot(b).room.messages.length, 0);
  assert.throws(() => w.handle(a, "friend", { user: b }), /Cannot/);
  w.handle(a, "chat", { body: "Blocked", nonce: "two" });
  tick(60);
  assert.equal(w.user(a).coins, 120);
});
test("activity opt-in, manual precedence, privacy and deletion", (t) => {
  const { w, a, b, room } = fixture(t);
  w.join(a, room);
  w.join(b, room);
  assert.equal(w.snapshot(a).activities.length, 0);
  w.handle(a, "auto", { enabled: true });
  assert.equal(w.snapshot(a).activities[0].kind, "Socializing");
  w.handle(a, "activity", { kind: "Working", visibility: "private" });
  const focus = w.get(
    "SELECT id FROM rooms WHERE home='common' AND kind='Studying'",
  ).id;
  w.join(a, focus);
  assert.equal(w.snapshot(a).activities.find((a) => !a.end).kind, "Working");
  w.join(a, room);
  const active = w.snapshot(a).activities.find((a) => !a.end);
  assert.equal(
    w.snapshot(b).room.people.find((p) => p.id === a).activity,
    null,
  );
  w.handle(a, "activityVisibility", { id: active.id, visibility: "public" });
  assert.equal(
    w.snapshot(b).room.people.find((p) => p.id === a).activity,
    "Working",
  );
  w.handle(b, "activityDelete", { id: active.id });
  assert(w.get("SELECT id FROM activities WHERE id=?", active.id));
  w.handle(a, "activityDelete", { id: active.id });
  assert.equal(
    w.get("SELECT id FROM activities WHERE id=?", active.id),
    undefined,
  );
});
test("purchases are atomic and replay-safe, spend coins without XP, never bypass a level", (t) => {
  const { w, a } = fixture(t);
  w.handle(a, "buy", { asset: "plant", nonce: "one" });
  w.handle(a, "buy", { asset: "plant", nonce: "one" });
  assert.equal(w.user(a).coins, 100);
  assert.equal(w.user(a).xp, 0);
  assert.equal(
    w.snapshot(a).items.filter((i) => i.asset === "plant").length,
    1,
  );
  assert.throws(
    () => w.handle(a, "buy", { asset: "lamp", nonce: "two" }),
    /level/,
  );
  w.run("UPDATE users SET xp=40 WHERE id=?", a); // Premium gate reached before testing insufficient coins.
  w.handle(a, "buy", { asset: "sofa", nonce: "three" });
  assert.throws(
    () => w.handle(a, "buy", { asset: "sofa", nonce: "four" }),
    /coins/,
  );
  assert.equal(w.user(a).coins, 0);
  assert.equal(w.all("SELECT * FROM requests WHERE user=?", a).length, 2);
});
test("finish is a reusable unlock, duplicate purchase is rejected", (t) => {
  const { w, a } = fixture(t);
  const r = own(w, a);
  w.handle(a, "buy", { asset: "sage", nonce: "theme" });
  w.handle(a, "theme", { room: r.id, asset: "sage" });
  w.handle(a, "theme", { room: r.id, asset: "sage" });
  assert.equal(w.room(a, r.id).theme, "#c8d7c4");
  assert.throws(
    () => w.handle(a, "buy", { asset: "sage", nonce: "theme-again" }),
    /already own/,
  );
  assert.equal(w.user(a).coins, 100);
});
test("lending preserves ownership, reclaim releases the occupied seat safely", (t) => {
  const { w, a, b } = fixture(t),
    r = own(w, a);
  w.handle(b, "invite", { code: w.home(r.home).invite });
  const item = w.snapshot(b).items.find((i) => i.asset === "chair");
  w.handle(b, "shareItem", { item: item.id, home: r.home, mode: "lend" });
  w.handle(a, "place", { item: item.id, room: r.id, x: 0, y: 0 });
  w.handle(a, "interact", {
    item: w.get("SELECT id FROM items WHERE room=? AND x=0 AND y=0", r.id).id,
    action: "sit",
  });
  for (let i = 0; i < 20; i++) w.step();
  assert.equal(w.presence.get(a).seat, item.id);
  w.handle(b, "returnItem", { item: item.id });
  const returned = w.get("SELECT * FROM items WHERE id=?", item.id);
  assert.equal(returned.owner, b);
  assert.equal(returned.loan, null);
  assert.equal(returned.room, null);
  assert.equal(w.presence.get(a).seat, null);
  assert.equal(w.presence.get(a).x, 0);
  assert.equal(w.presence.get(a).y, 1);
});
test("donation permanently transfers ownership and prevents reclaim or duplicate placement", (t) => {
  const { w, a, b } = fixture(t),
    r = own(w, a);
  w.handle(b, "invite", { code: w.home(r.home).invite });
  const item = w.snapshot(b).items[0];
  w.handle(b, "shareItem", { item: item.id, home: r.home, mode: "donate" });
  assert.equal(
    w.get("SELECT owner_type FROM items WHERE id=?", item.id).owner_type,
    "home",
  );
  assert.throws(
    () => w.handle(b, "returnItem", { item: item.id }),
    /not on loan/,
  );
  assert.throws(
    () => w.handle(b, "place", { item: item.id, room: r.id, x: 0, y: 0 }),
    /owner/,
  );
  w.handle(a, "place", { item: item.id, room: r.id, x: 0, y: 0 });
  const second = w.get(
    "SELECT id FROM rooms WHERE home=? AND id<>?",
    r.home,
    r.id,
  ).id;
  w.handle(a, "place", { item: item.id, room: second, x: 0, y: 0 });
  assert.equal(w.all("SELECT * FROM items WHERE id=?", item.id).length, 1);
  assert.equal(
    w.get("SELECT room FROM items WHERE id=?", item.id).room,
    second,
  );
});
test("builder protects entry, occupants, seat reachability and rollback", (t) => {
  const { w, a } = fixture(t),
    r = own(w, a);
  const desk = w
    .snapshot(a)
    .items.find((i) => i.asset === "desk" && i.owner_type === "user");
  assert.throws(
    () => w.handle(a, "place", { item: desk.id, room: r.id, x: 5, y: 7 }),
    /doorways/,
  );
  assert.throws(
    () => w.handle(a, "place", { item: desk.id, room: r.id, x: 3, y: 3 }),
    /Another item/,
  );
  const chair = w
    .snapshot(a)
    .items.find((i) => i.asset === "chair" && i.owner_type === "user");
  w.handle(a, "place", { item: chair.id, room: r.id, x: 0, y: 0 });
  w.handle(a, "interact", {
    item: w.get("SELECT id FROM items WHERE room=? AND x=0 AND y=0", r.id).id,
    action: "sit",
  });
  for (let i = 0; i < 20; i++) w.step();
  assert.equal(w.presence.get(a).seat, chair.id);
  const second = w.get(
    "SELECT id FROM rooms WHERE home=? AND id<>?",
    r.home,
    r.id,
  ).id;
  for (const [x, y] of [
    [0, 1],
    [1, 0],
  ])
    w.run(
      "INSERT INTO items(id,asset,owner_type,owner,room,x,y) VALUES(?, 'desk','home',?,?,?,?)",
      "block" + x + y,
      r.home,
      second,
      x,
      y,
    );
  assert.throws(
    () => w.handle(a, "place", { item: chair.id, room: second, x: 0, y: 0 }),
    /in use/,
  );
  assert.equal(w.presence.get(a).seat, chair.id);
  assert.equal(w.get("SELECT room FROM items WHERE id=?", chair.id).room, r.id);
});
test("two movers cannot reserve the same seat, and paths respect furniture", (t) => {
  const { w, a, b, room } = fixture(t);
  w.join(a, room);
  w.join(b, room);
  assert.throws(() => w.handle(a, "move", { x: 5, y: 3 }), /blocked/);
  const seat = w.get(
    "SELECT id FROM items WHERE room=? AND x=4 AND y=6",
    room,
  ).id;
  w.handle(a, "interact", { item: seat, action: "sit" });
  assert.throws(
    () => w.handle(b, "interact", { item: seat, action: "sit" }),
    /already using/,
  );
  for (let i = 0; i < 10; i++) w.step();
  assert.equal([...w.presence.values()].filter((p) => p.seat).length, 1);
});
test("home bans return loans and prevent rejoining", (t) => {
  const { w, a, b } = fixture(t),
    r = own(w, a);
  w.handle(b, "invite", { code: w.home(r.home).invite });
  const item = w.snapshot(b).items[0];
  w.handle(b, "shareItem", { item: item.id, home: r.home, mode: "lend" });
  w.handle(a, "ban", { home: r.home, user: b });
  assert.equal(w.presence.get(b).room, null);
  assert.equal(w.get("SELECT loan FROM items WHERE id=?", item.id).loan, null);
  assert.throws(
    () => w.handle(b, "invite", { code: w.home(r.home).invite }),
    /cannot enter/,
  );
});
test("call is explicit, client-owned and limited independently of room capacity", (t) => {
  const { w, a, user, room } = fixture(t);
  w.run("UPDATE rooms SET capacity=0 WHERE id=?", room);
  w.join(a, room);
  assert.equal(w.presence.get(a).voice, false);
  w.handle(a, "voice", { join: true, muted: true }, "tab1");
  assert.throws(
    () => w.handle(a, "voice", { join: true }, "tab2"),
    /another tab/,
  );
  w.handle(a, "voice", { join: false }, "tab2");
  assert.equal(w.presence.get(a).voice, true);
  for (let i = 0; i < 5; i++) {
    const id = user("Peer" + i);
    w.join(id, room);
    w.handle(id, "voice", { join: true }, id);
  }
  const last = user("Seventh");
  w.join(last, room);
  assert.throws(
    () => w.handle(last, "voice", { join: true }, last),
    /6 people/,
  );
  assert.equal(w.count(room), 7);
});
test("restart preserves accounts, chat, ownership, balance and manual routine history", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "one-world-"));
  try {
    const db = path.join(dir, "test.sqlite");
    let clock = 1000000;
    let w = new World(db, () => clock);
    const login = w.login("Persistent", "adult"),
      a = login.user.id;
    w.connect(a);
    const room = w.get("SELECT id FROM rooms WHERE home='common'").id;
    w.join(a, room);
    w.handle(a, "chat", { body: "Saved hello", nonce: "save" });
    w.handle(a, "buy", { asset: "plant", nonce: "plant" });
    w.handle(a, "activity", { kind: "Working", visibility: "private" });
    clock += 1000;
    w.tick();
    w.close();
    clock += 60000;
    w = new World(db, () => clock);
    assert.equal(w.auth(login.token), a);
    w.connect(a);
    w.join(a, room);
    const s = w.snapshot(a);
    assert.equal(s.room.messages[0].body, "Saved hello");
    assert.equal(s.me.coins, 100);
    assert(s.items.some((i) => i.asset === "plant"));
    assert.equal(s.activities[0].end, null); // Approved manual routines survive offline and restart.
    w.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
