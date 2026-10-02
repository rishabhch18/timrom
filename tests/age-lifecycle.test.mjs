import test from "node:test";
import assert from "node:assert/strict";
import { World } from "../server/engine.mjs";
import { ageFixture } from "../server/age.mjs";
test("local date fixtures reject impossible dates/under-13 and use the India birthday boundary", () => {
  const now = Date.parse("2026-10-02T18:29:59Z");
  assert.throws(() => ageFixture("2014-01-01", now), /13/);
  assert.throws(() => ageFixture("2008-02-30", now), /valid/);
  assert.equal(ageFixture("2008-10-03", now).band, "teen");
  assert.equal(ageFixture("2008-10-03", now + 1000).band, "adult");
});
test("turning 18 revokes teen access/calls/DMs, returns loans and pauses an owned home until accepted succession", (t) => {
  let now = Date.parse("2026-10-02T18:29:59Z");
  const w = new World(":memory:", () => now, { seed: false });
  t.after(() => w.close());
  const owner = w.login("Owner", "teen").user.id,
    member = w.login("Member", "teen").user.id;
  w.connect(owner);
  w.connect(member);
  w.handle(owner, "createHome", { name: "Teen community" });
  const h = w.snapshot(owner).homes[0];
  w.handle(member, "invite", { code: h.invite });
  w.handle(owner, "friend", { user: member });
  w.handle(member, "friend", { user: owner });
  w.startActivity(owner, "Studying", false);
  w.run(
    "INSERT INTO items(id,asset,owner_type,owner,loan) VALUES(?,?,?,?,?)",
    "loan-fixture",
    "chair",
    "user",
    owner,
    h.id,
  );
  const before = w.user(owner);
  const age = ageFixture("2008-10-03", now);
  w.run(
    "INSERT INTO age_profiles(user,birth_date,adult_at) VALUES(?,?,?)",
    owner,
    age.birthDate,
    age.adultAt,
  );
  w.presence.get(owner).voice = true;
  w.presence.get(member).voice = true;
  now += 1000;
  w.tick();
  assert.equal(w.user(owner).band, "adult");
  assert.equal(w.user(owner).coins, before.coins);
  assert.equal(
    w.get("SELECT loan FROM items WHERE id=?", "loan-fixture").loan,
    null,
  );
  assert.ok(w.get("SELECT 1 FROM activities WHERE user=?", owner));
  assert.equal(w.snapshot(owner).friends.length, 0);
  assert.equal(w.snapshot(owner).frozenHomes.length, 1);
  assert.equal(w.snapshot(member).room, null);
  assert.equal(w.presence.get(member).voice, false);
  assert.throws(() => w.join(owner, h.rooms[0].id), /access/);
  assert.throws(() => w.join(member, h.rooms[0].id), /access/);
  assert.throws(
    () =>
      w.handle(owner, "dm", {
        user: member,
        body: "No longer same age band",
        nonce: "age-dm",
      }),
    /friend/,
  );
  assert.throws(
    () => w.handle(owner, "capacity", { room: h.rooms[0].id, capacity: 20 }),
    /access|paused/,
  );
  w.handle(owner, "transferHome", { home: h.id, user: member });
  w.handle(member, "transferDecision", { home: h.id, accept: true });
  assert.equal(w.home(h.id).owner, member);
  assert.equal(w.snapshot(owner).frozenHomes.length, 0);
  w.join(member, h.rooms[0].id);
  assert.throws(() => w.join(owner, h.rooms[0].id), /access/);
});
test("onboarding requires an explicit language and persists completion", (t) => {
  const w = new World(":memory:", () => Date.now(), { seed: false });
  t.after(() => w.close());
  const id = w.login("Profile", "adult").user.id;
  w.connect(id);
  assert.throws(() => w.handle(id, "finishOnboarding"), /language/);
  w.handle(id, "preferences", { language: "hi", skin: 3 });
  w.handle(id, "finishOnboarding");
  assert.equal(w.snapshot(id).me.preferences.onboarded, true);
});
