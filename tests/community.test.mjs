import test from "node:test";
import assert from "node:assert/strict";
import { World } from "../server/engine.mjs";
function fixture(t) {
  let now = 1_000_000;
  const w = new World(":memory:", () => now, { seed: false });
  t.after(() => w.close());
  const user = (n, band = "adult") => {
    const id = w.login(n, band).user.id;
    w.connect(id);
    return id;
  };
  const a = user("Owner"),
    b = user("Member"),
    c = user("Visitor");
  w.handle(a, "createHome", { name: "Testing house" });
  const home = w.snapshot(a).homes[0];
  w.handle(b, "invite", { code: home.invite });
  return { w, a, b, c, home, user, advance: (ms) => (now += ms) };
}
test("draft geometry publication validates adjacency, occupancy, stale revisions and rolls back atomically", (t) => {
  const { w, a, b, home } = fixture(t);
  let rooms = w.layout(home.id),
    doors = w.portals(home.id);
  assert.throws(
    () =>
      w.handle(b, "publishLayout", {
        home: home.id,
        rooms,
        doors,
        revision: 0,
      }),
    /owner/,
  );
  const overlap = structuredClone(rooms);
  overlap[1].ox = 0;
  assert.throws(
    () =>
      w.handle(a, "publishLayout", {
        home: home.id,
        rooms: overlap,
        doors,
        revision: 0,
      }),
    /overlap/,
  );
  assert.equal(w.get("SELECT * FROM layouts WHERE home=?", home.id), undefined);
  w.handle(a, "publishLayout", { home: home.id, rooms, doors, revision: 0 });
  assert.throws(
    () =>
      w.handle(a, "publishLayout", {
        home: home.id,
        rooms,
        doors,
        revision: 0,
      }),
    /changed/,
  );
  assert.throws(
    () =>
      w.handle(a, "publishLayout", {
        home: home.id,
        rooms,
        doors: [],
        revision: 1,
      }),
    /connect/,
  );
  const move = rooms.map((r) => ({ ...r, ox: r.ox + 1 }));
  assert.throws(
    () =>
      w.handle(a, "publishLayout", {
        home: home.id,
        rooms: move,
        doors,
        revision: 1,
      }),
    /occupants/,
  );
  assert.equal(w.layout(home.id)[0].ox, 0);
  w.handle(a, "leave");
  w.handle(b, "leave");
  w.handle(a, "publishLayout", {
    home: home.id,
    rooms: move,
    doors,
    revision: 1,
  });
  assert.equal(w.layout(home.id)[0].ox, 1);
  w.join(a, rooms[0].id);
  w.handle(a, "move", { room: rooms[1].id, x: 5, y: 7 });
  for (let i = 0; i < 100; i++) w.step();
  assert.equal(w.presence.get(a).room, rooms[1].id);
});
test("new rooms remain connected after a custom layout has been published", (t) => {
  const { w, a, home } = fixture(t);
  w.handle(a, "publishLayout", {
    home: home.id,
    rooms: w.layout(home.id),
    doors: w.portals(home.id),
    revision: 0,
  });
  w.handle(a, "createRoom", {
    home: home.id,
    name: "Workshop",
    kind: "Working",
  });
  const r = w.get("SELECT id FROM rooms WHERE name='Workshop'");
  assert(w.portals(home.id).some((d) => d.a === r.id || d.b === r.id));
  assert(w.walkPath(a, r.id, 5, 7));
});
test("DMs require reciprocal acceptance and disappear from access after blocking", (t) => {
  const { w, a, b, user } = fixture(t);
  assert.throws(
    () => w.handle(a, "dm", { user: b, body: "hello", nonce: "1" }),
    /accepted/,
  );
  w.handle(a, "friend", { user: b });
  assert.throws(
    () => w.handle(a, "dm", { user: b, body: "hello", nonce: "1" }),
    /accepted/,
  );
  w.handle(b, "friend", { user: a });
  w.handle(a, "dm", { user: b, body: "hello", nonce: "1" });
  w.handle(a, "dm", { user: b, body: "hello", nonce: "1" });
  assert.equal(w.snapshot(b).directMessages.length, 1);
  const teen = user("Teen", "teen");
  assert.throws(
    () => w.handle(a, "dm", { user: teen, body: "no", nonce: "2" }),
    /accepted/,
  );
  w.handle(b, "block", { user: a });
  assert.equal(w.snapshot(b).directMessages.length, 0);
  assert.throws(
    () => w.handle(a, "dm", { user: b, body: "later", nonce: "2" }),
    /accepted/,
  );
});
test("message authorship, reply boundaries, reactions and deletion hold on server", (t) => {
  const { w, a, b, c, home } = fixture(t);
  w.handle(a, "chat", { body: "Hello room", nonce: "first" });
  const m = w.snapshot(a).room.messages[0];
  w.handle(b, "chat", { body: "Hello back", nonce: "reply", reply: m.id });
  assert.equal(w.snapshot(a).room.messages[1].replyPreview.body, "Hello room");
  assert.throws(
    () => w.handle(b, "editMessage", { message: m.id, body: "forged" }),
    /author/,
  );
  w.handle(b, "react", { message: m.id, emoji: "❤️" });
  assert.equal(w.snapshot(a).room.messages[0].reactions.length, 1);
  assert.throws(
    () => w.handle(c, "react", { message: m.id, emoji: "❤️" }),
    /access/,
  );
  w.handle(a, "editMessage", { message: m.id, body: "Updated" });
  assert.equal(w.snapshot(b).room.messages[0].body, "Updated");
  w.handle(a, "deleteMessage", { message: m.id });
  assert.equal(w.snapshot(b).room.messages[0].body, "");
  assert.equal(w.snapshot(b).room.messages[0].reactions.length, 0);
});
test("accepted gifts return on deletion and loans can be reclaimed without transferring ownership", (t) => {
  const { w, a, b, home } = fixture(t);
  const items = w.snapshot(b).items;
  w.handle(b, "shareItem", {
    item: items[0].id,
    home: home.id,
    mode: "donate",
  });
  assert.equal(
    w.get("SELECT owner FROM items WHERE id=?", items[0].id).owner,
    b,
  );
  let offer = w.get("SELECT id FROM item_offers WHERE item=?", items[0].id);
  assert.throws(
    () => w.handle(b, "offerDecision", { offer: offer.id, decision: "accept" }),
    /owner/,
  );
  w.handle(a, "offerDecision", { offer: offer.id, decision: "accept" });
  assert.equal(
    w.get("SELECT owner FROM items WHERE id=?", items[0].id).owner,
    home.id,
  );
  w.handle(b, "shareItem", { item: items[1].id, home: home.id, mode: "lend" });
  offer = w.get("SELECT id FROM item_offers WHERE item=?", items[1].id);
  w.handle(a, "offerDecision", { offer: offer.id, decision: "accept" });
  w.handle(b, "returnItem", { item: items[1].id });
  assert.equal(
    w.get("SELECT loan FROM items WHERE id=?", items[1].id).loan,
    null,
  );
  assert.throws(
    () => w.handle(a, "deleteHome", { home: home.id, confirm: "wrong" }),
    /Type/,
  );
  w.handle(a, "deleteHome", { home: home.id, confirm: home.name });
  assert.equal(
    w.get("SELECT owner FROM items WHERE id=?", items[0].id).owner,
    b,
  );
  assert.equal(w.get("SELECT id FROM homes WHERE id=?", home.id), undefined);
  assert.equal(w.snapshot(a).room, null);
});
test("ownership offers need recipient acceptance", (t) => {
  const { w, a, b, c, home } = fixture(t);
  w.handle(a, "transferHome", { home: home.id, user: b });
  assert.equal(w.home(home.id).owner, a);
  assert.throws(
    () => w.handle(c, "transferDecision", { home: home.id, accept: true }),
    /unavailable/,
  );
  w.handle(b, "transferDecision", { home: home.id, accept: true });
  assert.equal(w.home(home.id).owner, b);
  assert.throws(
    () => w.handle(a, "deleteHome", { home: home.id, confirm: home.name }),
    /Type/,
  );
});
test("activity backfill and audiences cannot manufacture rewards or expose private rooms", (t) => {
  const { w, a, b, home, advance } = fixture(t);
  w.handle(a, "activitySave", {
    kind: "Working",
    start: 100,
    end: 10000,
    visibility: "private",
  });
  assert.equal(w.user(a).xp, 0);
  assert.equal(w.user(a).coins, 120);
  assert.throws(
    () =>
      w.handle(a, "activitySave", {
        kind: "Working",
        start: 200,
        end: 5000,
        visibility: "private",
      }),
    /overlap/,
  );
  w.handle(a, "activity", { kind: "Studying", visibility: "friends" });
  assert.equal(
    w.snapshot(b).room.people.find((p) => p.id === a).activity,
    null,
  );
  w.handle(a, "friend", { user: b });
  w.handle(b, "friend", { user: a });
  assert.equal(
    w.snapshot(b).room.people.find((p) => p.id === a).activity,
    "Studying",
  );
  w.handle(a, "roomAccess", {
    room: home.rooms[0].id,
    access: "selected",
    users: [b],
  });
  assert.equal(
    w.snapshot(b).room.people.find((p) => p.id === a).activity,
    null,
  );
});
test("moderation timeouts enforce scope and kick removes call access", (t) => {
  const { w, a, b, home, advance } = fixture(t);
  const room = home.rooms[0].id;
  w.handle(a, "moderate", { room, user: b, action: "timeout", minutes: 1 });
  assert.throws(
    () => w.handle(b, "chat", { body: "blocked", nonce: "1" }),
    /timeout/,
  );
  advance(61000);
  w.handle(b, "chat", { body: "returned", nonce: "2" });
  w.handle(b, "voice", { join: true, muted: true }, "b");
  w.handle(a, "moderate", { room, user: b, action: "kick" });
  assert.equal(w.presence.get(b).voice, false);
  assert.throws(() => w.join(b, room), /removed|access/);
  assert.throws(
    () => w.handle(b, "moderate", { room, user: a, action: "ban" }),
    /removed|access|Moderator/,
  );
  assert(w.snapshot(a).audit.length);
});
test("only configured operators can publish a listing", (t) => {
  const { w, a, b, home } = fixture(t);
  w.handle(a, "requestListing", { home: home.id });
  assert.equal(w.home(home.id).public, 0);
  assert.throws(
    () => w.handle(b, "reviewListing", { home: home.id, decision: "approved" }),
    /reviewer/,
  );
  assert.equal(w.snapshot(b).listingQueue, undefined);
});
test("neighbour gate travel walks first and rechecks destination access", (t) => {
  const { w, a, home } = fixture(t);
  w.handle(a, "createHome", { name: "Second home" });
  const second = w.snapshot(a).room.home;
  w.join(a, home.rooms[0].id);
  w.handle(a, "travelNeighbour", { home: second, walk: true });
  assert.equal(w.presence.get(a).room, home.rooms[0].id);
  assert(w.presence.get(a).path.length > 0);
  for (let i = 0; i < 200; i++) w.step();
  assert.equal(
    w.get("SELECT home FROM rooms WHERE id=?", w.presence.get(a).room).home,
    second,
  );
});
test("reservation blocks newcomers for 30 seconds, restores the user, and never earns offline XP", (t) => {
  const { w, a, b, c, home, advance } = fixture(t);
  const rid = home.rooms[0].id;
  w.handle(a, "capacity", { room: rid, capacity: 2 });
  w.disconnect(b);
  assert.equal(w.count(rid), 2);
  assert.throws(() => w.handle(c, "invite", { code: home.invite }), /full/);
  advance(10000);
  w.tick();
  assert.equal(w.user(b).xp, 0);
  w.connect(b);
  assert.equal(w.presence.get(b).room, rid);
  w.disconnect(b);
  advance(30001);
  assert.equal(w.count(rid), 1);
  w.join(c, rid);
  w.connect(b);
  assert.equal(w.presence.get(b).room, null);
});
test("device takeover rejects stale-device movement and clears its microphone session", (t) => {
  const { w, a, home } = fixture(t);
  w.presence.get(a).worldClient = "first";
  w.attachDevice(a, "second");
  assert.throws(
    () => w.handle(a, "move", { room: home.rooms[0].id, x: 6, y: 7 }, "second"),
    /another device/,
  );
  w.handle(a, "voice", { join: true, muted: false }, "first");
  w.handle(a, "takeoverDevice", {}, "second");
  assert.equal(w.presence.get(a).voice, false);
  assert.throws(
    () => w.handle(a, "voice", { join: true }, "first"),
    /another device/,
  );
  w.handle(a, "move", { room: home.rooms[0].id, x: 6, y: 7 }, "second");
});
test("SFU camera admission is capped independently of unlimited room entry", (t) => {
  const { w, a, home, user } = fixture(t);
  w.mediaMode = "livekit";
  const r = home.rooms.find((r) => r.outdoor);
  w.join(a, r.id);
  for (let i = 0; i < 10; i++) {
    const u = user("Camera " + i);
    w.run("INSERT INTO members VALUES(?,?)", home.id, u);
    w.join(u, r.id);
    w.handle(u, "voice", { join: true, muted: true, video: true }, "c" + i);
  }
  assert.throws(
    () =>
      w.handle(a, "voice", { join: true, muted: true, video: true }, "owner"),
    /10 simultaneous/,
  );
  w.handle(a, "voice", { join: true, muted: true, video: false }, "owner");
  assert.equal(w.presence.get(a).voice, true);
});
test("avatars spawn on distinct tiles and cannot walk through an occupied floor tile", (t) => {
  const { w, a, b, home } = fixture(t);
  const pa = w.presence.get(a),
    pb = w.presence.get(b);
  assert.notDeepEqual([pa.x, pa.y], [pb.x, pb.y]);
  assert.throws(
    () => w.handle(a, "move", { room: pa.room, x: pb.x, y: pb.y }),
    /blocked/,
  );
});

test("activity summaries include older records beyond the history page and never grant rewards", (t) => {
  const { w, a, advance } = fixture(t);
  advance(86400000);
  const start = w.now() - 1200000,
    before = w.user(a).coins;
  for (let i = 0; i < 120; i++)
    w.run(
      "INSERT INTO activities(id,user,kind,start,end,visibility,automatic) VALUES(?,?,?,?,?,?,0)",
      "history-" + i,
      a,
      "Studying",
      start + i * 10000,
      start + (i + 1) * 10000,
      "private",
    );
  assert.deepEqual(
    w.handle(a, "activitySummary", { day: start, week: start }),
    [20, 20],
  );
  assert.equal(w.user(a).coins, before);
  assert.throws(
    () => w.handle(a, "activitySummary", { day: NaN, week: start }),
    /Invalid/,
  );
});
