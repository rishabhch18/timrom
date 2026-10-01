import test from "node:test";
import assert from "node:assert/strict";
import { World } from "../server/engine.mjs";
import { Accounts } from "../server/accounts.mjs";
function fixture(t) {
  let now = 1000000;
  const w = new World(":memory:", () => now);
  t.after(() => w.close());
  const a = w.login("Walker", "adult").user.id,
    b = w.login("Friend", "adult").user.id;
  w.connect(a);
  w.connect(b);
  const rooms = w.layout("common");
  w.join(a, rooms[0].id);
  return { w, a, b, rooms, advance: (ms) => (now += ms) };
}
function finish(w) {
  for (
    let i = 0;
    i < 250 && [...w.presence.values()].some((p) => p.path.length);
    i++
  )
    w.step();
}
test("home routes cross adjacent doorway tiles rather than teleporting; room text follows admission", (t) => {
  const { w, a, rooms } = fixture(t);
  const p = w.presence.get(a);
  w.handle(a, "move", { room: rooms[3].id, x: 6, y: 7 });
  assert.equal(p.room, rooms[0].id);
  let last = { ...p };
  let crosses = 0;
  while (p.path.length) {
    w.step();
    if (p.room !== last.room) {
      crosses++;
      const from = rooms.find((r) => r.id === last.room),
        to = rooms.find((r) => r.id === p.room);
      assert.equal(
        Math.abs(from.ox + last.x - to.ox - p.x) +
          Math.abs(from.oy + last.y - to.oy - p.y),
        1,
      );
    }
    last = { ...p };
  }
  assert.equal(p.room, rooms[3].id);
  assert.equal(crosses, 2);
  assert.equal(w.snapshot(a).room.id, rooms[3].id);
});
test("last doorway slot is rechecked after a route begins; zero permits entry; locked rooms reject walking", (t) => {
  const { w, a, b, rooms } = fixture(t);
  const next = rooms[1];
  w.run("UPDATE rooms SET capacity=1 WHERE id=?", next.id);
  w.handle(a, "move", { room: next.id, x: 5, y: 7 });
  w.join(b, next.id);
  finish(w);
  assert.equal(w.presence.get(a).room, rooms[0].id);
  assert.match(w.snapshot(a).notice, /blocked/);
  w.run("UPDATE rooms SET capacity=0 WHERE id=?", next.id);
  w.handle(a, "move", { room: next.id, x: 5, y: 7 });
  finish(w);
  assert.equal(w.count(next.id), 2);
  w.run("UPDATE rooms SET locked=1 WHERE id=?", rooms[0].id);
  assert.throws(
    () => w.handle(a, "move", { room: rooms[0].id, x: 5, y: 7 }),
    /locked/,
  );
});
test("furniture actions stay visual without separate consent, use private source timers with consent, and protect manual timers", (t) => {
  const { w, a, rooms } = fixture(t);
  const chair = w.get(
    "SELECT * FROM items WHERE room=? AND asset='chair'",
    rooms[0].id,
  );
  w.handle(a, "interact", { item: chair.id, action: "sit" });
  finish(w);
  assert.equal(w.snapshot(a).activities.length, 0);
  w.handle(a, "stand");
  w.handle(a, "furnitureAuto", { enabled: true });
  w.handle(a, "interact", { item: chair.id, action: "sit" });
  finish(w);
  let current = w.snapshot(a).activities.find((a) => !a.end);
  assert.equal(current.automatic, 2);
  assert.equal(current.visibility, "private");
  w.handle(a, "stand");
  assert(!w.snapshot(a).activities.some((a) => !a.end));
  w.handle(a, "activity", { kind: "Working", visibility: "private" });
  w.handle(a, "interact", { item: chair.id, action: "sit" });
  finish(w);
  current = w.snapshot(a).activities.find((a) => !a.end);
  assert.equal(current.automatic, 0);
  assert.equal(current.kind, "Working");
  w.handle(a, "furnitureAuto", { enabled: false });
  assert.equal(w.snapshot(a).activities.find((a) => !a.end).kind, "Working");
});
test("voice-follow preserves existing mute/video state but never starts a call; room capacity and call capacity are distinct", (t) => {
  const { w, a, rooms } = fixture(t);
  w.handle(a, "voiceFollow", { enabled: true });
  w.handle(a, "move", { room: rooms[1].id, x: 5, y: 7 });
  finish(w);
  assert.equal(w.presence.get(a).voice, false);
  w.handle(a, "voice", { join: true, muted: true, video: false }, "clientA");
  w.handle(a, "move", { room: rooms[0].id, x: 5, y: 7 });
  finish(w);
  assert.equal(w.presence.get(a).voice, true);
  assert.equal(w.presence.get(a).voiceClient, "clientA");
  assert.equal(w.presence.get(a).muted, true);
  assert.equal(w.presence.get(a).video, false);
  w.handle(a, "voiceFollow", { enabled: false });
  w.handle(a, "move", { room: rooms[1].id, x: 5, y: 7 });
  finish(w);
  assert.equal(w.presence.get(a).voice, false);
});
test("private contacts do not appear on other avatars, people or friends", async (t) => {
  const { w, a, rooms } = fixture(t),
    accounts = new Accounts(w);
  const q = await accounts.handle(
    "signup",
    {
      name: "Person",
      username: "person",
      band: "adult",
      kind: "email",
      contact: "private@example.test",
      password: "correct-horse-local",
    },
    "test",
  );
  const session = await accounts.handle(
    "verify",
    { challenge: q.challenge, code: q.developmentCode },
    "test",
  );
  w.connect(session.user.id);
  w.join(session.user.id, rooms[0].id);
  assert(!JSON.stringify(w.snapshot(a)).includes("private@example.test"));
  assert.equal(
    w.snapshot(session.user.id).me.account.email,
    "private@example.test",
  );
});
test("password login, one-use codes, bounded attempts, expiration and session revocation", async (t) => {
  const { w, advance } = fixture(t),
    accounts = new Accounts(w);
  const data = {
    name: "Tester",
    username: "tester",
    band: "adult",
    kind: "email",
    contact: "tester@example.test",
    password: "correct-horse-local",
  };
  const q = await accounts.handle("signup", data, "test");
  await assert.rejects(
    accounts.handle(
      "verify",
      { challenge: q.challenge, code: "000000" },
      "test",
    ),
    /Incorrect/,
  );
  const session = await accounts.handle(
    "verify",
    { challenge: q.challenge, code: q.developmentCode },
    "test",
  );
  assert.equal(w.auth(session.token), session.user.id);
  await assert.rejects(
    accounts.handle(
      "verify",
      { challenge: q.challenge, code: q.developmentCode },
      "test",
    ),
    /expired/,
  );
  await assert.rejects(
    accounts.handle(
      "login",
      { contact: data.contact, password: "incorrect-password" },
      "test",
    ),
    /incorrect/,
  );
  const login = await accounts.handle(
    "login",
    { contact: data.contact, password: data.password },
    "test",
  );
  assert.equal(login.user.id, session.user.id);
  await accounts.handle("logout", {}, "test", login.token);
  assert.equal(w.auth(login.token), undefined);
  const q2 = await accounts.handle(
    "signup",
    { ...data, username: "second", contact: "second@example.test" },
    "test",
  );
  advance(300001);
  await assert.rejects(
    accounts.handle(
      "verify",
      { challenge: q2.challenge, code: q2.developmentCode },
      "test",
    ),
    /expired/,
  );
  const q3 = await accounts.handle(
    "signup",
    { ...data, username: "third", contact: "third@example.test" },
    "test",
  );
  for (let i = 0; i < 5; i++)
    await assert.rejects(
      accounts.handle(
        "verify",
        { challenge: q3.challenge, code: "000000" },
        "test",
      ),
      /Incorrect/,
    );
  await assert.rejects(
    accounts.handle(
      "verify",
      { challenge: q3.challenge, code: q3.developmentCode },
      "test",
    ),
    /unavailable/,
  );
});
test("mobile OTP sign-in and linking second contact preserve identity and ownership; production has no dev-code fallback", async (t) => {
  const { w } = fixture(t),
    accounts = new Accounts(w);
  const q = await accounts.handle(
    "signup",
    {
      name: "Mobile user",
      username: "mobile_user",
      band: "teen",
      kind: "phone",
      contact: "+919000000001",
    },
    "test",
  );
  const session = await accounts.handle(
    "verify",
    { challenge: q.challenge, code: q.developmentCode },
    "test",
  );
  const link = await accounts.handle(
    "link",
    {
      kind: "email",
      contact: "mobile@example.test",
      password: "test-link-password",
    },
    "test",
    session.token,
  );
  await assert.rejects(
    accounts.handle(
      "verify",
      { challenge: link.challenge, code: link.developmentCode },
      "test",
      "wrong",
    ),
    /Sign in/,
  );
  await accounts.handle(
    "verify",
    { challenge: link.challenge, code: link.developmentCode },
    "test",
    session.token,
  );
  const login = await accounts.handle(
    "mobile",
    { contact: "+919000000001" },
    "test",
  );
  const again = await accounts.handle(
    "verify",
    { challenge: login.challenge, code: login.developmentCode },
    "test",
  );
  assert.equal(again.user.id, session.user.id);
  assert.equal(
    w.all("SELECT * FROM items WHERE owner=?", session.user.id).length,
    3,
  );
  const prod = new Accounts(w, { development: false });
  await assert.rejects(
    prod.handle("mobile", { contact: "+919000000001" }, "other"),
    /not configured/,
  );
});

test("a full destination call disconnects voice without blocking unlimited room entry", (t) => {
  const { w, a, rooms } = fixture(t);
  w.run("UPDATE rooms SET capacity=0 WHERE id=?", rooms[1].id);
  for (let i = 0; i < 6; i++) {
    const u = w.login("Caller " + i, "adult").user.id;
    w.connect(u);
    w.join(u, rooms[1].id);
    w.handle(u, "voice", { join: true, muted: true }, "peer" + i);
  }
  w.handle(a, "voice", { join: true, muted: false, video: true }, "caller");
  w.handle(a, "voiceFollow", { enabled: true });
  w.handle(a, "move", { room: rooms[1].id, x: 5, y: 7 });
  finish(w);
  const p = w.presence.get(a);
  assert.equal(p.room, rooms[1].id);
  assert.equal(p.voice, false);
  assert.equal(p.muted, true);
  assert.equal(p.video, false);
  assert.match(p.notice, /call is full/);
  assert.equal(w.count(rooms[1].id), 7);
});
test("a placement that seals a doorway rolls back without losing furniture or moving occupants", (t) => {
  const { w, a } = fixture(t);
  w.handle(a, "createHome", { name: "Doorway test" });
  const r = w.snapshot(a).room;
  for (let y = 0; y < 9; y++)
    if (y !== 4)
      w.run(
        "INSERT INTO items(id,asset,owner_type,owner,room,x,y) VALUES(?,'plant','home',?,?,2,?)",
        "wall" + y,
        r.home,
        r.id,
        y,
      );
  w.handle(a, "buy", { asset: "plant", nonce: "route-test-plant" });
  const item = w.get("SELECT * FROM items WHERE owner=? AND asset='plant'", a);
  const before = structuredClone(w.presence.get(a));
  assert.throws(
    () => w.handle(a, "place", { item: item.id, room: r.id, x: 2, y: 4 }),
    /doorway reachable/,
  );
  assert.equal(w.get("SELECT room FROM items WHERE id=?", item.id).room, null);
  assert.deepEqual(w.presence.get(a), before);
});
