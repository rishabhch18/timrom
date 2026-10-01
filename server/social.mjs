import { randomUUID } from "node:crypto";
const check = (ok, message) => {
  if (!ok) throw Error(message);
};
export const TEMPLATES = {
  Hangout: "Socializing",
  Study: "Studying",
  Gaming: "Gaming",
  Work: "Working",
};
export function migrateSocial(w) {
  for (const [table, col, spec] of [
    ["users", "last_room", "TEXT"],
    ["rooms", "outdoor", "INTEGER DEFAULT 0"],
    ["rooms", "voice_mode", "TEXT DEFAULT 'open'"],
    ["rooms", "access", "TEXT DEFAULT 'members'"],
    ["items", "starter", "INTEGER DEFAULT 0"],
  ])
    if (!w.all(`PRAGMA table_info(${table})`).some((c) => c.name === col))
      w.db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${spec}`);
  w.db
    .exec(`CREATE TABLE IF NOT EXISTS roles(home TEXT,user TEXT,scope TEXT DEFAULT '',role TEXT,PRIMARY KEY(home,user,scope));
    CREATE TABLE IF NOT EXISTS room_access(room TEXT,user TEXT,PRIMARY KEY(room,user));
    CREATE TABLE IF NOT EXISTS moderation_log(id TEXT PRIMARY KEY,home TEXT,actor TEXT,target TEXT,action TEXT,time INTEGER);`);
}
export function installSocial(World) {
  const handle = World.prototype.handle,
    snapshot = World.prototype.snapshot,
    room = World.prototype.room,
    join = World.prototype.join,
    disconnect = World.prototype.disconnect,
    connect = World.prototype.connect,
    step = World.prototype.step;
  World.prototype.connect = function (id) {
    const existing = this.presence.has(id);
    connect.call(this, id);
    if (!existing) {
      const last = this.get(
        "SELECT last_room FROM users WHERE id=?",
        id,
      )?.last_room;
      if (last)
        try {
          this.join(id, last);
        } catch {
          this.presence.get(id).notice =
            "Your last room is unavailable. Choose a home.";
        }
    }
  };
  World.prototype.step = function () {
    step.call(this);
    for (const [id, p] of this.presence) {
      if (p.room) {
        this.run("UPDATE users SET last_room=? WHERE id=?", p.room, id);
        const r = this.get("SELECT * FROM rooms WHERE id=?", p.room);
        if (p.speakerRoom !== p.room) {
          p.speaker = false;
          p.hand = false;
          p.speakerRoom = p.room;
        }
        if (r?.voice_mode === "disabled") {
          p.voice = false;
          p.voiceClient = null;
          p.video = false;
        }
        if (
          r?.voice_mode === "moderated" &&
          !p.speaker &&
          !["owner", "admin", "moderator"].includes(this.role(id, r.home, r.id))
        )
          p.muted = true;
      }
    }
  };
  World.prototype.role = function (id, home, scope = "") {
    if (this.home(home).owner === id) return "owner";
    const roles = this.all(
      "SELECT role FROM roles WHERE home=? AND user=? AND (scope='' OR scope=?)",
      home,
      id,
      scope,
    ).map((r) => r.role);
    return roles.includes("admin")
      ? "admin"
      : roles.includes("moderator")
        ? "moderator"
        : "member";
  };
  World.prototype.owner = function (id, home, scope = "") {
    check(
      ["owner", "admin"].includes(this.role(id, home, scope)),
      "The owner or an authorized admin must do this.",
    );
  };
  World.prototype.room = function (id, rid) {
    const r = room.call(this, id, rid),
      h = this.home(r.home);
    if (h.owner === "system") return r; // Legacy showcase databases remain usable, never seeded for connected mode.
    if (!r.outdoor)
      check(
        h.owner === id ||
          this.get("SELECT 1 FROM members WHERE home=? AND user=?", h.id, id),
        "Join this home before entering its rooms.",
      );
    if (r.access === "selected")
      check(
        ["owner", "admin", "moderator"].includes(this.role(id, r.home, r.id)) ||
          this.get(
            "SELECT 1 FROM room_access WHERE room=? AND user=?",
            r.id,
            id,
          ),
        "This room is private.",
      );
    return r;
  };
  World.prototype.join = function (id, rid) {
    const r = this.room(id, rid),
      wasMember = this.get(
        "SELECT 1 FROM members WHERE home=? AND user=?",
        r.home,
        id,
      );
    join.call(this, id, rid);
    this.run("UPDATE users SET last_room=? WHERE id=?", rid, id);
    const p = this.presence.get(id);
    if (p.speakerRoom !== rid) {
      p.speaker = false;
      p.hand = false;
      p.speakerRoom = rid;
    }
    if (r.outdoor && !wasMember)
      this.run("DELETE FROM members WHERE home=? AND user=?", r.home, id);
  };
  World.prototype.disconnect = function (id) {
    const p = this.presence.get(id);
    if (p?.connections === 1) {
      // Manual routines deliberately continue as self-reported history; automatic sources stop.
      if (
        this.get(
          "SELECT automatic FROM activities WHERE user=? AND end IS NULL",
          id,
        )?.automatic
      )
        this.stopActivity(id);
      this.presence.delete(id);
      return;
    }
    disconnect.call(this, id);
  };
  World.prototype.handle = function (id, type, d = {}, client = null) {
    const p = this.presence.get(id);
    check(p, "Connect first.");
    if (
      [
        "createHome",
        "joinHome",
        "role",
        "roomAccess",
        "voiceMode",
        "speaker",
        "raiseHand",
      ].includes(type)
    )
      this.limit(id, "social", 30, 1000);
    if (type === "createHome") {
      this.limit(id, "homes", 5, 60000);
      const name = String(d.name || "")
          .trim()
          .slice(0, 48),
        template = d.template || d.genre || "Hangout";
      check(name.length > 2, "Give your home a name.");
      check(Object.hasOwn(TEMPLATES, template), "Choose a starter template.");
      const home = randomUUID();
      this.tx(() => {
        this.run(
          "INSERT INTO homes(id,name,owner,band,genre,country,state,city,language,public,invite,description) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
          home,
          name,
          id,
          this.user(id).band,
          template,
          String(d.country || "India").slice(0, 60),
          String(d.state || "").slice(0, 60),
          String(d.city || "").slice(0, 60),
          String(d.language || "English · हिन्दी").slice(0, 60),
          0,
          randomUUID().slice(0, 8),
          "A place for our people.",
        );
        this.run("INSERT INTO members VALUES(?,?)", home, id);
        this.addRoom(home, "Lounge", "Socializing", 8, true);
        this.addRoom(home, template + " room", TEMPLATES[template], 8, true);
        const kitchen = this.addRoom(home, "Kitchen", "Eating", 8, true);
        this.run(
          "INSERT INTO items(id,asset,owner_type,owner,room,x,y,starter) VALUES(?,?,?,?,?,?,?,1)",
          randomUUID(),
          "counter",
          "home",
          home,
          kitchen,
          9,
          5,
        );
        const rest = this.addRoom(home, "Rest room", "Sleeping", 8, false);
        this.run(
          "INSERT INTO items(id,asset,owner_type,owner,room,x,y,starter) VALUES(?,?,?,?,?,?,?,1)",
          randomUUID(),
          "bed",
          "home",
          home,
          rest,
          3,
          3,
        );
        const forum = this.addRoom(
          home,
          "Garden forum",
          "Socializing",
          0,
          false,
        );
        this.run(
          "UPDATE rooms SET outdoor=1,voice_mode='moderated' WHERE id=?",
          forum,
        );
        this.run(
          "UPDATE items SET starter=1 WHERE owner_type=? AND owner=?",
          "home",
          home,
        );
      });
      this.join(
        id,
        this.get(
          "SELECT id FROM rooms WHERE home=? ORDER BY rowid LIMIT 1",
          home,
        ).id,
      );
      return;
    }
    if (type === "joinHome") {
      const h = this.home(d.home);
      check(this.canHome(id, h), "Home access denied.");
      check(d.acceptRules === true, "Accept the home rules first.");
      this.run("INSERT OR IGNORE INTO members VALUES(?,?)", h.id, id);
      return;
    }
    if (type === "role") {
      check(
        this.home(d.home).owner === id,
        "Only the home owner assigns roles.",
      );
      check(
        this.get(
          "SELECT 1 FROM members WHERE home=? AND user=?",
          d.home,
          d.user,
        ),
        "Choose a home member.",
      );
      check(d.user !== id, "The owner role cannot be replaced.");
      check(["admin", "moderator", "member"].includes(d.role), "Invalid role.");
      const scope = d.room || "";
      if (scope)
        check(
          this.room(id, scope).home === d.home,
          "Room belongs to another home.",
        );
      this.run(
        "DELETE FROM roles WHERE home=? AND user=? AND scope=?",
        d.home,
        d.user,
        scope,
      );
      if (d.role !== "member")
        this.run(
          "INSERT INTO roles VALUES(?,?,?,?)",
          d.home,
          d.user,
          scope,
          d.role,
        );
      this.run(
        "INSERT INTO moderation_log VALUES(?,?,?,?,?,?)",
        randomUUID(),
        d.home,
        id,
        d.user,
        "role:" + d.role,
        this.now(),
      );
      return;
    }
    if (["capacity", "lock", "voiceMode", "roomAccess"].includes(type)) {
      const r = this.room(id, d.room);
      this.owner(id, r.home, r.id);
      if (type === "capacity") {
        check(
          Number.isInteger(d.capacity) &&
            d.capacity >= 0 &&
            d.capacity <= 10000,
          "Use 0 for unlimited or a whole number up to 10,000.",
        );
        check(
          !r.outdoor || d.capacity === 0,
          "Outdoor forums have unlimited entry.",
        );
        this.run("UPDATE rooms SET capacity=? WHERE id=?", d.capacity, r.id);
        return;
      }
      if (type === "lock") {
        this.run(
          "UPDATE rooms SET locked=? WHERE id=?",
          d.locked ? 1 : 0,
          r.id,
        );
        return;
      }
      if (type === "roomAccess") {
        check(
          ["members", "selected"].includes(d.access),
          "Invalid access mode.",
        );
        check(!r.outdoor, "Forum visibility follows the home.");
        this.tx(() => {
          this.run("UPDATE rooms SET access=? WHERE id=?", d.access, r.id);
          this.run("DELETE FROM room_access WHERE room=?", r.id);
          for (const user of new Set((d.users || []).slice(0, 1000))) {
            check(
              this.get(
                "SELECT 1 FROM members WHERE home=? AND user=?",
                r.home,
                user,
              ),
              "Select home members.",
            );
            this.run("INSERT INTO room_access VALUES(?,?)", r.id, user);
          }
        });
        for (const [uid, person] of this.presence)
          if (person.room === r.id) {
            try {
              this.room(uid, r.id);
            } catch {
              person.room = null;
              person.path = [];
              person.voice = false;
              person.voiceClient = null;
              this.endInteraction(uid, false);
            }
          }
        return;
      }
      check(
        ["open", "moderated", "disabled"].includes(d.mode),
        "Invalid voice mode.",
      );
      this.run("UPDATE rooms SET voice_mode=? WHERE id=?", d.mode, r.id);
      for (const [uid, person] of this.presence)
        if (person.room === r.id) {
          person.speaker = ["owner", "admin", "moderator"].includes(
            this.role(uid, r.home, r.id),
          );
          if (d.mode !== "open" && !person.speaker) person.muted = true;
          if (d.mode === "disabled") {
            person.voice = false;
            person.voiceClient = null;
            person.video = false;
          }
        }
      return;
    }
    if (type === "raiseHand") {
      check(p.room, "Enter a room.");
      p.hand = !!d.raised;
      return;
    }
    if (type === "speaker") {
      const r = this.room(id, p.room);
      check(
        ["owner", "admin", "moderator"].includes(this.role(id, r.home, r.id)),
        "Moderator permission required.",
      );
      const target = this.presence.get(d.user);
      check(target?.room === p.room, "User is not in this room.");
      target.speaker = !!d.allowed;
      target.hand = false;
      if (!d.allowed) target.muted = true;
      return;
    }
    if (type === "voice" && d.join) {
      const r = this.room(id, p.room);
      check(r.voice_mode !== "disabled", "Voice is disabled in this room.");
      if (
        r.voice_mode === "moderated" &&
        !p.speaker &&
        !["owner", "admin", "moderator"].includes(this.role(id, r.home, r.id))
      )
        d = { ...d, muted: true };
    }
    if (type === "createRoom" && d.capacity === undefined)
      d = { ...d, capacity: 8 };
    return handle.call(this, id, type, d, client);
  };
  World.prototype.snapshot = function (id) {
    const s = snapshot.call(this, id);
    for (const h of s.homes) {
      h.member = !!this.get(
        "SELECT 1 FROM members WHERE home=? AND user=?",
        h.id,
        id,
      );
      h.role = this.role(id, h.id);
      h.rooms = h.rooms.filter((r) => {
        try {
          this.room(id, r.id);
          return true;
        } catch {
          return false;
        }
      });
      if (["owner", "admin"].includes(h.role))
        h.members = this.all(
          "SELECT u.id,u.name FROM members m JOIN users u ON m.user=u.id WHERE m.home=?",
          h.id,
        );
    }
    if (s.room) {
      s.room.count = this.count(s.room.id);
      s.room.role = this.role(id, s.room.home, s.room.id);
      for (const person of s.room.people) {
        const p = this.presence.get(person.id);
        person.hand = !!p?.hand;
        person.speaker =
          s.room.voice_mode === "open" ||
          !!p?.speaker ||
          ["owner", "admin", "moderator"].includes(
            this.role(person.id, s.room.home, s.room.id),
          );
      }
    }
    if (s.scene) {
      s.scene.rooms = s.scene.rooms.filter((r) => {
        try {
          this.room(id, r.id);
          return true;
        } catch {
          return false;
        }
      });
      const visible = new Set(s.scene.rooms.map((r) => r.id));
      s.scene.people = s.scene.people.filter((p) => visible.has(p.room));
      s.scene.portals = s.scene.portals.filter(
        (p) => visible.has(p.a) && visible.has(p.b),
      );
    }
    s.capabilities = {
      media: "local-peer-mesh",
      localCallLimit: 6,
      productionMediaReady: false,
    };
    return s;
  };
}
