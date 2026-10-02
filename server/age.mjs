// Local age fixtures only. This enforces lifecycle rules, not identity/guardian verification.
const check = (v, m) => {
  if (!v) throw Error(m);
};
export function ageFixture(birthDate, now) {
  check(
    typeof birthDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(birthDate),
    "Enter your date of birth.",
  );
  const date = new Date(birthDate + "T00:00:00Z");
  check(
    Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === birthDate,
    "Enter a valid date of birth.",
  );
  const [y, m, d] = birthDate.split("-").map(Number);
  const anniversary = (n) => Date.UTC(y + n, m - 1, d) - 330 * 60000; // India local fixture boundary.
  check(
    anniversary(13) <= now && y >= 1900,
    "Accounts are available from age 13.",
  );
  return {
    birthDate,
    adultAt: anniversary(18),
    band: anniversary(18) <= now ? "adult" : "teen",
  };
}
export function migrateAge(w) {
  w.db
    .exec(`CREATE TABLE IF NOT EXISTS age_profiles(user TEXT PRIMARY KEY,birth_date TEXT,adult_at INTEGER,mode TEXT DEFAULT 'local-test');
CREATE TABLE IF NOT EXISTS frozen_homes(home TEXT PRIMARY KEY,reason TEXT,time INTEGER);`);
}
export function installAge(World) {
  const connect = World.prototype.connect,
    tick = World.prototype.tick,
    handle = World.prototype.handle,
    snapshot = World.prototype.snapshot,
    canHome = World.prototype.canHome,
    owner = World.prototype.owner;
  World.prototype.applyAgeTransitions = function () {
    if (this.applyingAges) return;
    this.applyingAges = true;
    try {
      for (const u of this.all(
        "SELECT u.id FROM users u JOIN age_profiles a ON a.user=u.id WHERE u.band='teen' AND a.adult_at<=?",
        this.now(),
      )) {
        const frozen = this.all(
          "SELECT id FROM homes WHERE owner=? AND band='teen'",
          u.id,
        ).map((h) => h.id);
        this.tx(() => {
          this.run(
            "UPDATE users SET band='adult',last_room=NULL WHERE id=?",
            u.id,
          );
          this.run(
            "DELETE FROM members WHERE user=? AND home IN (SELECT id FROM homes WHERE band='teen')",
            u.id,
          );
          this.run(
            "DELETE FROM roles WHERE user=? AND home IN (SELECT id FROM homes WHERE band='teen')",
            u.id,
          );
          this.run(
            "DELETE FROM room_access WHERE user=? AND room IN (SELECT r.id FROM rooms r JOIN homes h ON r.home=h.id WHERE h.band='teen')",
            u.id,
          );
          this.run(
            "DELETE FROM friends WHERE (sender=? AND recipient IN (SELECT id FROM users WHERE band='teen')) OR (recipient=? AND sender IN (SELECT id FROM users WHERE band='teen'))",
            u.id,
            u.id,
          );
          this.run("DELETE FROM succession WHERE recipient=?", u.id);
          this.run(
            "DELETE FROM item_offers WHERE sender=? AND home IN (SELECT id FROM homes WHERE band='teen')",
            u.id,
          );
          for (const i of this.all(
            "SELECT i.id FROM items i LEFT JOIN rooms r ON r.id=i.room LEFT JOIN homes h ON h.id=r.home LEFT JOIN homes l ON l.id=i.loan WHERE i.owner_type='user' AND i.owner=? AND (h.band='teen' OR l.band='teen')",
            u.id,
          )) {
            this.clearPlacement(i.id);
            this.run("UPDATE items SET loan=NULL WHERE id=?", i.id);
          }
          for (const home of frozen)
            this.run(
              "INSERT OR REPLACE INTO frozen_homes VALUES(?,?,?)",
              home,
              "Owner age transition; an eligible successor must accept.",
              this.now(),
            );
        });
        for (const [id, p] of this.presence) {
          const h =
            p.room &&
            this.get("SELECT home FROM rooms WHERE id=?", p.room)?.home;
          if (id === u.id || frozen.includes(h)) {
            this.endInteraction(id, false);
            if (
              this.get(
                "SELECT automatic FROM activities WHERE user=? AND end IS NULL",
                id,
              )?.automatic
            )
              this.stopActivity(id);
            Object.assign(p, {
              room: null,
              path: [],
              voice: false,
              voiceClient: null,
              video: false,
              muted: true,
              travel: null,
              notice:
                id === u.id
                  ? "Your account now uses adult spaces. Personal inventory and history are preserved."
                  : "This home is paused until an eligible successor accepts.",
            });
            this.run("UPDATE users SET last_room=NULL WHERE id=?", id);
            this.reservations?.delete(id);
          }
        }
        for (const [id, r] of this.reservations || [])
          if (
            id === u.id ||
            frozen.includes(
              this.get("SELECT home FROM rooms WHERE id=?", r.room)?.home,
            )
          )
            this.reservations.delete(id);
        this.notify(
          u.id,
          "Your account now uses adult spaces. Resolve any paused home ownership in Discover.",
        );
      }
    } finally {
      this.applyingAges = false;
    }
  };
  World.prototype.canHome = function (id, h) {
    return (
      !this.get("SELECT 1 FROM frozen_homes WHERE home=?", h.id) &&
      canHome.call(this, id, h)
    );
  };
  World.prototype.owner = function (id, home, scope = "") {
    check(
      !this.get("SELECT 1 FROM frozen_homes WHERE home=?", home),
      "This home is paused until an eligible successor accepts.",
    );
    return owner.call(this, id, home, scope);
  };
  World.prototype.connect = function (id) {
    this.applyAgeTransitions();
    return connect.call(this, id);
  };
  World.prototype.tick = function () {
    this.applyAgeTransitions();
    return tick.call(this);
  };
  World.prototype.handle = function (id, type, d = {}, client = null) {
    this.applyAgeTransitions();
    const p = this.presence.get(id);
    check(p, "Connect first.");
    if (client && p.worldClient && type !== "takeoverDevice")
      check(
        p.worldClient === client,
        "This world is active on another device. Take over to continue.",
      );
    if (type === "finishOnboarding") {
      const prefs = this.prefs(id);
      check(
        ["en", "hi"].includes(prefs.language),
        "Choose your language first.",
      );
      check(
        ["miniature", "mature"].includes(this.user(id).body),
        "Choose an avatar first.",
      );
      this.run(
        "INSERT INTO profiles VALUES(?,?) ON CONFLICT(user) DO UPDATE SET prefs=excluded.prefs",
        id,
        JSON.stringify({ ...prefs, onboarded: true }),
      );
      return;
    }
    if (type === "transferHome" && d.username) {
      const name = String(d.username).replace(/^@/, "").toLowerCase();
      d = {
        ...d,
        user: this.get("SELECT user FROM credentials WHERE username=?", name)
          ?.user,
      };
      check(d.user, "Choose an eligible member by username.");
    }
    const frozen =
      d.home && this.get("SELECT 1 FROM frozen_homes WHERE home=?", d.home);
    if (frozen && type === "transferDecision") {
      const h = this.home(d.home),
        t = this.get("SELECT * FROM succession WHERE home=?", h.id);
      check(
        t?.recipient === id &&
          t.sender === h.owner &&
          this.user(id).band === h.band &&
          this.get("SELECT 1 FROM members WHERE home=? AND user=?", h.id, id) &&
          !this.get("SELECT 1 FROM bans WHERE home=? AND user=?", h.id, id),
        "Transfer unavailable.",
      );
      this.tx(() => {
        if (d.accept) {
          this.run("UPDATE homes SET owner=? WHERE id=?", id, h.id);
          this.run("DELETE FROM frozen_homes WHERE home=?", h.id);
        }
        this.run("DELETE FROM succession WHERE home=?", h.id);
        this.audit(
          h.id,
          id,
          t.sender,
          d.accept ? "age succession accepted" : "age succession declined",
        );
      });
      return;
    }
    if (frozen)
      check(
        ["transferHome", "deleteHome"].includes(type),
        "This home is paused until an eligible successor accepts.",
      );
    const result = handle.call(this, id, type, d, client);
    if (type === "deleteHome")
      this.run("DELETE FROM frozen_homes WHERE home=?", d.home);
    return result;
  };
  World.prototype.snapshot = function (id) {
    this.applyAgeTransitions();
    const s = snapshot.call(this, id);
    s.frozenHomes = this.all(
      "SELECT h.id,h.name,h.owner,f.reason FROM frozen_homes f JOIN homes h ON h.id=f.home WHERE h.owner=? OR (h.band=? AND EXISTS(SELECT 1 FROM members m WHERE m.home=h.id AND m.user=?))",
      id,
      s.me.band,
      id,
    );
    return s;
  };
}
