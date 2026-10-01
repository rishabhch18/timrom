import test from "node:test";
import assert from "node:assert/strict";
import { World } from "../server/engine.mjs";
function fixture(t) {
  let time = 1000000;
  const w = new World(":memory:", () => time, { seed: false });
  t.after(() => w.close());
  const user = (name, band = "adult") => {
    const id = w.login(name, band).user.id;
    w.connect(id);
    return id;
  };
  const owner = user("Owner"),
    member = user("Member"),
    visitor = user("Visitor");
  w.handle(owner, "createHome", { name: "Our house", template: "Study" });
  const h = w.snapshot(owner).homes[0];
  return {
    w,
    owner,
    member,
    visitor,
    h,
    user,
    tick: (seconds) => {
      time += seconds * 1000;
      w.tick();
    },
  };
}
test("connected accounts start without seeded homes; templates create unlimited moderated forum and free fixtures", (t) => {
  const w = new World(":memory:", Date.now, { seed: false });
  t.after(() => w.close());
  const id = w.login("New member", "adult").user.id;
  w.connect(id);
  assert.equal(w.snapshot(id).homes.length, 0);
  w.handle(id, "createHome", { name: "First home", template: "Gaming" });
  const h = w.snapshot(id).homes[0];
  assert.equal(h.genre, "Gaming");
  assert.equal(h.rooms.length, 5);
  assert.equal(h.rooms.find((r) => r.outdoor).capacity, 0);
  assert.equal(h.rooms.find((r) => r.outdoor).voice_mode, "moderated");
  assert(h.rooms.some((r) => r.kind === "Gaming"));
  assert(
    w
      .all("SELECT starter FROM items WHERE owner=?", h.id)
      .every((i) => i.starter),
  );
});
test("capacity defaults to 8 and admin can lower it without ejecting members; ordinary members cannot", (t) => {
  const { w, owner, member, visitor, h } = fixture(t);
  w.handle(member, "invite", { code: h.invite });
  w.handle(visitor, "invite", { code: h.invite });
  const room = w.snapshot(owner).room.id;
  assert.throws(
    () => w.handle(member, "capacity", { room, capacity: 1 }),
    /owner/,
  );
  w.handle(owner, "role", { home: h.id, user: member, role: "admin" });
  w.handle(member, "capacity", { room, capacity: 1 });
  assert.equal(w.count(room), 3);
  w.handle(member, "createRoom", {
    home: h.id,
    name: "Another room",
    kind: "Working",
  });
  assert.equal(
    w.get("SELECT capacity FROM rooms WHERE name=?", "Another room").capacity,
    8,
  );
  assert.throws(
    () =>
      w.handle(member, "capacity", {
        room: h.rooms.find((r) => r.outdoor).id,
        capacity: 10,
      }),
    /unlimited/,
  );
});
test("public forum visitors do not become members or see private interiors; membership and age rules apply", (t) => {
  const { w, owner, visitor, h, user } = fixture(t);
  w.run("UPDATE homes SET public=1 WHERE id=?", h.id);
  const forum = h.rooms.find((r) => r.outdoor);
  w.join(visitor, forum.id);
  let s = w.snapshot(visitor);
  assert.equal(s.homes[0].member, false);
  assert(s.scene.rooms.every((r) => r.outdoor));
  assert.throws(() => w.join(visitor, h.rooms[0].id), /Join this home/);
  assert.throws(() => w.handle(visitor, "joinHome", { home: h.id }), /rules/);
  w.handle(visitor, "joinHome", { home: h.id, acceptRules: true });
  w.join(visitor, h.rooms[0].id);
  assert.equal(w.snapshot(visitor).homes[0].member, true);
  const teen = user("Teen", "teen");
  assert.throws(() => w.join(teen, forum.id), /access/);
  w.handle(owner, "roomAccess", {
    room: h.rooms[1].id,
    access: "selected",
    users: [],
  });
  assert(!w.snapshot(visitor).scene.rooms.some((r) => r.id === h.rooms[1].id));
  assert.throws(
    () => w.handle(visitor, "move", { room: h.rooms[1].id, x: 5, y: 7 }),
    /private/,
  );
});
test("moderated speaker eligibility and disabled calls are checked on commands", (t) => {
  const { w, owner, member, h } = fixture(t);
  w.handle(member, "invite", { code: h.invite });
  const room = w.snapshot(owner).room.id;
  w.handle(owner, "voiceMode", { room, mode: "moderated" });
  w.handle(member, "voice", { join: true, muted: false }, "member-client");
  assert.equal(w.presence.get(member).muted, true);
  assert.throws(
    () => w.handle(member, "speaker", { user: member, allowed: true }),
    /Moderator/,
  );
  w.handle(owner, "speaker", { user: member, allowed: true });
  w.handle(member, "voice", { join: true, muted: false }, "member-client");
  assert.equal(w.presence.get(member).muted, false);
  w.handle(owner, "voiceMode", { room, mode: "disabled" });
  assert.equal(w.presence.get(member).voice, false);
  assert.throws(
    () => w.handle(member, "voice", { join: true }, "member-client"),
    /disabled/,
  );
});
test("manual offline history continues without XP; automatic room tracking ends", (t) => {
  const { w, owner, member, h, tick } = fixture(t);
  w.handle(member, "invite", { code: h.invite });
  w.handle(owner, "activity", { kind: "Sleeping" });
  w.handle(member, "auto", { enabled: true });
  w.disconnect(owner);
  w.disconnect(member);
  tick(120);
  assert.equal(w.user(owner).xp, 0);
  assert.equal(
    w.get("SELECT end FROM activities WHERE user=?", owner).end,
    null,
  );
  assert.notEqual(
    w.get("SELECT end FROM activities WHERE user=?", member).end,
    null,
  );
});

test("reconnect restores the last permitted room and falls back when it is locked", (t) => {
  const { w, owner, h } = fixture(t);
  const last = h.rooms[1].id;
  w.join(owner, last);
  w.disconnect(owner);
  w.connect(owner);
  assert.equal(w.snapshot(owner).room.id, last);
  w.disconnect(owner);
  w.run("UPDATE rooms SET locked=1 WHERE id=?", last);
  w.connect(owner);
  assert.equal(w.snapshot(owner).room, null);
  assert.match(w.snapshot(owner).notice, /unavailable/);
});
test("revoking destination access cancels an in-flight path without crashing the movement loop", (t) => {
  const { w, owner, member, h } = fixture(t);
  w.handle(member, "invite", { code: h.invite });
  const destination = h.rooms[1].id;
  w.handle(member, "move", { room: destination, x: 5, y: 7 });
  assert(w.presence.get(member).path.length);
  w.handle(owner, "roomAccess", {
    room: destination,
    access: "selected",
    users: [],
  });
  for (let n = 0; n < 100; n++) w.step();
  assert.notEqual(w.presence.get(member).room, destination);
  assert.equal(w.presence.get(member).path.length, 0);
});
