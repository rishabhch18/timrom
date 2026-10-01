import { installDevices } from "./devices.mjs";
import { migrateCommunity, installCommunity } from "./community.mjs";
import { migrateBuilder, installBuilder } from "./builder.mjs";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { sessionDigest } from "./accounts.mjs";
import { installConnected, migrateConnected } from "./connected.mjs";
import { installSocial, migrateSocial } from "./social.mjs";
export const CATALOG = [
  {
    id: "bed",
    name: "Cloud bed",
    kind: "bed",
    price: 100,
    level: 5,
    color: "#c7c1df",
    description: "A quiet place to rest.",
  },
  {
    id: "counter",
    name: "Breakfast counter",
    kind: "counter",
    price: 20,
    level: 1,
    color: "#c8d7c4",
    description: "Share a meal and a moment.",
  },
  {
    id: "chair",
    name: "Everyday chair",
    kind: "chair",
    price: 20,
    level: 1,
    color: "#d4b7a0",
    description: "An extra seat for a new friend.",
  },
  {
    id: "desk",
    name: "Shared desk",
    kind: "desk",
    price: 20,
    level: 1,
    color: "#c39b72",
    description: "Room for ideas, books and coffee.",
  },
  {
    id: "plant",
    name: "Little monstera",
    kind: "plant",
    price: 20,
    level: 1,
    color: "#759371",
    description: "A little green goes a long way.",
  },
  {
    id: "sofa",
    name: "Cloud lounge",
    kind: "sofa",
    price: 100,
    level: 5,
    color: "#b8b6d4",
    description: "The best conversations take their time.",
  },
  {
    id: "lamp",
    name: "Golden hour lamp",
    kind: "lamp",
    price: 50,
    level: 3,
    color: "#efc278",
    description: "Warm light for your late-night ideas.",
  },
  {
    id: "sage",
    name: "Sage walls",
    kind: "theme",
    price: 20,
    level: 1,
    color: "#c8d7c4",
    description: "Buy once. Make every room a little calmer.",
  },
  {
    id: "rose",
    name: "Rose walls",
    kind: "theme",
    price: 50,
    level: 3,
    color: "#e8cdca",
    description: "A reusable warm finish for your spaces.",
  },
];
export const ACTIVITIES = [
  "Socializing",
  "Studying",
  "Working",
  "Gaming",
  "Eating",
  "Resting",
  "Sleeping",
  "Private break",
];
const interactive = new Set(["Socializing", "Studying", "Working", "Gaming"]);
const uid = () => randomUUID();
const assert = (v, m) => {
  if (!v) throw new Error(m);
};
const clean = (v, max = 80) =>
  String(v ?? "")
    .trim()
    .slice(0, max);
export class World {
  constructor(path = ":memory:", now = () => Date.now(), options = {}) {
    this.now = now;
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
    this.db
      .exec(`CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,token TEXT UNIQUE,name TEXT,band TEXT,color TEXT DEFAULT '#a99dcc',body TEXT DEFAULT 'miniature',seconds INTEGER DEFAULT 0,xp INTEGER DEFAULT 0,coins INTEGER DEFAULT 120,auto INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS homes(id TEXT PRIMARY KEY,name TEXT,owner TEXT,band TEXT,genre TEXT,country TEXT,state TEXT,city TEXT,language TEXT,public INTEGER DEFAULT 0,invite TEXT UNIQUE,description TEXT);
  CREATE TABLE IF NOT EXISTS members(home TEXT,user TEXT,PRIMARY KEY(home,user));
  CREATE TABLE IF NOT EXISTS rooms(id TEXT PRIMARY KEY,home TEXT,name TEXT,kind TEXT,capacity INTEGER DEFAULT 8,theme TEXT DEFAULT '#ded9cf');
  CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,room TEXT,user TEXT,body TEXT,time INTEGER,nonce TEXT,UNIQUE(user,nonce));
  CREATE TABLE IF NOT EXISTS activities(id TEXT PRIMARY KEY,user TEXT,kind TEXT,start INTEGER,end INTEGER,visibility TEXT DEFAULT 'private',automatic INTEGER DEFAULT 0);
  CREATE UNIQUE INDEX IF NOT EXISTS one_activity ON activities(user) WHERE end IS NULL;
  CREATE TABLE IF NOT EXISTS items(id TEXT PRIMARY KEY,asset TEXT,owner_type TEXT,owner TEXT,loan TEXT,room TEXT,x INTEGER,y INTEGER,rotation INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS ledger(id TEXT PRIMARY KEY,user TEXT,delta INTEGER,reason TEXT,time INTEGER);
  CREATE TABLE IF NOT EXISTS requests(user TEXT,id TEXT,PRIMARY KEY(user,id));
  CREATE TABLE IF NOT EXISTS friends(sender TEXT,recipient TEXT,status TEXT,PRIMARY KEY(sender,recipient));
  CREATE TABLE IF NOT EXISTS blocks(user TEXT,target TEXT,PRIMARY KEY(user,target));
  CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,user TEXT,target TEXT,body TEXT,time INTEGER);
  CREATE TABLE IF NOT EXISTS bans(home TEXT,user TEXT,PRIMARY KEY(home,user));`);
    migrateConnected(this);
    migrateSocial(this);
    migrateBuilder(this);
    migrateCommunity(this);
    // A restart ends presence, not the activity record; stale timers are closed at last persisted online tick.
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS runtime(key TEXT PRIMARY KEY,value INTEGER)",
    );
    const last =
      this.get("SELECT value FROM runtime WHERE key='last_tick'")?.value ??
      this.get("SELECT max(start) AS time FROM activities")?.time;
    if (last)
      this.run(
        "UPDATE activities SET end=max(start,?) WHERE end IS NULL AND automatic>0",
        last,
      );
    this.presence = new Map();
    this.rate = new Map();
    this.events = [];
    if (options.seed !== false && !this.get("SELECT id FROM homes LIMIT 1"))
      this.seed();
    // Add activity fixtures to the seeded showcase homes without moving existing furniture.
    for (const r of this.all(
      "SELECT r.* FROM rooms r JOIN homes h ON r.home=h.id WHERE h.owner='system' AND r.kind IN ('Resting','Sleeping','Eating')",
    )) {
      const asset = r.kind === "Eating" ? "counter" : "bed";
      if (
        !this.get(
          "SELECT 1 FROM items WHERE room=? AND asset=?",
          r.id,
          asset,
        ) &&
        !this.get("SELECT 1 FROM items WHERE room=? AND x=9 AND y=5", r.id)
      )
        this.run(
          "INSERT INTO items(id,asset,owner_type,owner,room,x,y) VALUES(?,?,?,?,?,9,5)",
          uid(),
          asset,
          "home",
          r.home,
          r.id,
        );
    }
  }
  statement(sql) {
    this.statements ??= new Map();
    if (!this.statements.has(sql))
      this.statements.set(sql, this.db.prepare(sql));
    return this.statements.get(sql);
  }
  run(sql, ...a) {
    this.readCache?.clear();
    return this.statement(sql).run(...a);
  }
  get(sql, ...a) {
    if (!this.readCache) return this.statement(sql).get(...a);
    const key = "get:" + sql + JSON.stringify(a);
    if (!this.readCache.has(key))
      this.readCache.set(key, this.statement(sql).get(...a));
    const row = this.readCache.get(key);
    return row ? { ...row } : row;
  }
  all(sql, ...a) {
    if (!this.readCache) return this.statement(sql).all(...a);
    const key = "all:" + sql + JSON.stringify(a);
    if (!this.readCache.has(key))
      this.readCache.set(key, this.statement(sql).all(...a));
    return this.readCache.get(key).map((row) => ({ ...row }));
  }
  tx(fn) {
    const before = this.presence ? structuredClone(this.presence) : null;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const r = fn();
      this.db.exec("COMMIT");
      return r;
    } catch (e) {
      this.db.exec("ROLLBACK");
      if (before) this.presence = before;
      throw e;
    }
  }
  seed() {
    for (const [id, name, band, genre, city, desc] of [
      [
        "common",
        "Common Ground",
        "adult",
        "Hangout",
        "Pune",
        "A familiar corner of the internet. Drop in, say hello, stay a while.",
      ],
      [
        "chapter",
        "The Quiet Chapter",
        "adult",
        "Study",
        "Bengaluru",
        "A little company for your next chapter. Focus together, take a break together.",
      ],
      [
        "play",
        "After Hours Arcade",
        "adult",
        "Gaming",
        "Mumbai",
        "Find your party. Bring your favorite external game.",
      ],
      [
        "teen",
        "After School Club",
        "teen",
        "Hangout",
        "Delhi",
        "A separate local space for teen demo accounts.",
      ],
    ]) {
      this.run(
        "INSERT INTO homes VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
        id,
        name,
        "system",
        band,
        genre,
        "India",
        city === "Pune" || city === "Mumbai"
          ? "Maharashtra"
          : city === "Bengaluru"
            ? "Karnataka"
            : "Delhi",
        city,
        "English · हिन्दी",
        1,
        id + "-invite",
        desc,
      );
      this.addRoom(id, "Living room", "Socializing", 8, true);
      this.addRoom(
        id,
        genre === "Gaming" ? "Party room" : "Focus nook",
        genre === "Gaming" ? "Gaming" : "Studying",
        4,
        true,
      );
      this.addRoom(id, "Kitchen", "Eating", 4, true);
      this.addRoom(id, "Rest room", "Resting", 2, true);
    }
  }
  addRoom(home, name, kind, cap, fixtures = false) {
    const id = uid();
    this.run(
      "INSERT INTO rooms(id,home,name,kind,capacity) VALUES(?,?,?,?,?)",
      id,
      home,
      name,
      kind,
      cap,
    );
    if (fixtures) {
      for (const [asset, x, y] of [
        ["sofa", 3, 3],
        ["sofa", 7, 3],
        ["desk", 5, 3],
        ["plant", 1, 1],
        ["plant", 10, 1],
        ["chair", 4, 6],
        ["chair", 7, 6],
      ])
        this.run(
          "INSERT INTO items(id,asset,owner_type,owner,room,x,y) VALUES(?,?,?,?,?,?,?)",
          uid(),
          asset,
          "home",
          home,
          id,
          x,
          y,
        );
    }
    return id;
  }
  login(name, band) {
    name = clean(name, 24);
    assert(name.length >= 2, "Use a name with at least 2 characters.");
    assert(["adult", "teen"].includes(band), "Choose a demo age group.");
    const id = uid(),
      token = uid() + uid();
    this.run(
      "INSERT INTO users(id,token,name,band) VALUES(?,?,?,?)",
      id,
      token,
      name,
      band,
    );
    this.run(
      "UPDATE users SET body=? WHERE id=?",
      band === "teen" ? "miniature" : "mature",
      id,
    );
    for (const asset of ["chair", "chair", "desk"])
      this.run(
        "INSERT INTO items(id,asset,owner_type,owner) VALUES(?,?,?,?)",
        uid(),
        asset,
        "user",
        id,
      );
    this.run(
      "INSERT INTO ledger VALUES(?,?,?,?,?)",
      uid(),
      id,
      120,
      "Local pilot welcome coins",
      this.now(),
    );
    return { token, user: this.user(id) };
  }
  auth(token) {
    if (typeof token !== "string") return null;
    if (
      this.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='auth_sessions'",
      )
    ) {
      const session = this.get(
        "SELECT user FROM auth_sessions WHERE digest=? AND expires>?",
        sessionDigest(token),
        this.now(),
      );
      if (session) return session.user;
    }
    return this.get("SELECT id FROM users WHERE token=?", token)?.id;
  }
  user(id) {
    const u = this.get(
      "SELECT id,name,band,color,body,seconds,xp,coins,auto,furniture_auto,voice_follow FROM users WHERE id=?",
      id,
    );
    assert(u, "Account not found.");
    const c = this.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='credentials'",
    )
      ? this.get("SELECT username FROM credentials WHERE user=?", id)
      : null;
    return {
      ...u,
      username: c?.username || null,
      level: 1 + Math.floor(u.xp / 10),
    };
  }
  home(id) {
    const h = this.get("SELECT * FROM homes WHERE id=?", id);
    assert(h, "Home not found.");
    return h;
  }
  canHome(user, h) {
    return (
      this.user(user).band === h.band &&
      !this.get("SELECT 1 FROM bans WHERE home=? AND user=?", h.id, user) &&
      (h.public ||
        h.owner === user ||
        this.get("SELECT 1 FROM members WHERE home=? AND user=?", h.id, user))
    );
  }
  room(user, id) {
    const r = this.get("SELECT * FROM rooms WHERE id=?", id);
    assert(
      r && this.canHome(user, this.home(r.home)),
      "You do not have access to this room.",
    );
    return r;
  }
  owner(user, home) {
    assert(this.home(home).owner === user, "Only the home owner can do this.");
  }
  connect(id) {
    const p = this.presence.get(id);
    if (p) {
      p.connections++;
      return;
    }
    this.presence.set(id, {
      connections: 1,
      room: null,
      x: 5,
      y: 7,
      path: [],
      seat: null,
      voice: false,
      voiceClient: null,
      video: false,
      muted: true,
      last: this.now(),
      remainder: 0,
      window: 0,
      engaged: 0,
      text: false,
    });
  }
  disconnect(id) {
    const p = this.presence.get(id);
    if (!p) return;
    if (--p.connections > 0) return;
    this.stopActivity(id);
    this.presence.delete(id);
  }
  count(room) {
    return [...this.presence.values()].filter((p) => p.room === room).length;
  }
  blocked(a, b) {
    return this.get(
      "SELECT 1 FROM blocks WHERE (user=? AND target=?) OR (user=? AND target=?)",
      a,
      b,
      b,
      a,
    );
  }
  footprint(item) {
    return [[item.x, item.y]];
  }
  path(room, x, y, tx, ty, ignoreSeat = false) {
    const occupied = this.all("SELECT * FROM items WHERE room=?", room);
    const blocked = new Set(
      occupied
        .filter((i) => !["chair", "sofa"].includes(i.asset))
        .flatMap((i) => this.footprint(i).map(([a, b]) => a + "," + b)),
    );
    for (const p of this.presence.values())
      if (p.room === room && p.seat && !ignoreSeat)
        blocked.add(p.x + "," + p.y);
    const dim = this.layout(
      this.get("SELECT home FROM rooms WHERE id=?", room).home,
    ).find((r) => r.id === room);
    const valid = (a, b) =>
      a >= 0 &&
      a < dim.width &&
      b >= 0 &&
      b < dim.height &&
      !blocked.has(a + "," + b);
    if (!valid(tx, ty)) return null;
    const q = [[x, y]],
      prev = new Map([[x + "," + y, null]]);
    while (q.length) {
      const [a, b] = q.shift();
      if (a === tx && b === ty) {
        const result = [];
        let k = a + "," + b;
        while (prev.get(k) !== null) {
          result.unshift(k.split(",").map(Number));
          k = prev.get(k);
        }
        return result;
      }
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const c = a + dx,
          d = b + dy,
          k = c + "," + d;
        if (valid(c, d) && !prev.has(k)) {
          prev.set(k, a + "," + b);
          q.push([c, d]);
        }
      }
    }
    return null;
  }
  join(id, room) {
    const p = this.presence.get(id);
    assert(p, "Connect first.");
    const r = this.room(id, room);
    if (p.room === room) return;
    assert(
      r.capacity === 0 || this.count(room) < r.capacity,
      "This room is full. Try another room.",
    );
    this.run("INSERT OR IGNORE INTO members VALUES(?,?)", r.home, id);
    Object.assign(p, {
      room,
      x: 5,
      y: 7,
      path: [],
      seat: null,
      voice: false,
      voiceClient: null,
      video: false,
      muted: true,
      text: false,
    });
    if (this.user(id).auto) this.startActivity(id, r.kind, true);
  }
  startActivity(id, kind, automatic = false, visibility = "private") {
    assert(ACTIVITIES.includes(kind), "Unknown activity.");
    assert(["private", "public"].includes(visibility), "Unknown visibility.");
    const current = this.get(
      "SELECT * FROM activities WHERE user=? AND end IS NULL",
      id,
    );
    if (automatic && current && !current.automatic) return;
    this.tx(() => {
      this.run(
        "UPDATE activities SET end=? WHERE user=? AND end IS NULL",
        this.now(),
        id,
      );
      this.run(
        "INSERT INTO activities(id,user,kind,start,visibility,automatic) VALUES(?,?,?,?,?,?)",
        uid(),
        id,
        kind,
        this.now(),
        visibility,
        Number(automatic),
      );
    });
  }
  stopActivity(id) {
    this.run(
      "UPDATE activities SET end=? WHERE user=? AND end IS NULL",
      this.now(),
      id,
    );
  }
  limit(id, key, max, ms) {
    const k = id + ":" + key,
      t = this.now();
    let r = this.rate.get(k);
    if (!r || t - r.start >= ms) r = { start: t, count: 0 };
    assert(++r.count <= max, "A little too fast. Please try again shortly.");
    this.rate.set(k, r);
  }
  handle(id, type, d = {}, clientId = null) {
    this.limit(id, "commands", 150, 1000);
    const p = this.presence.get(id);
    assert(p, "Connect first.");
    switch (type) {
      case "join":
        this.join(id, d.room);
        break;
      case "leave":
        p.room = null;
        p.seat = null;
        p.path = [];
        p.voice = false;
        p.voiceClient = null;
        p.video = false;
        if (
          this.get(
            "SELECT automatic FROM activities WHERE user=? AND end IS NULL",
            id,
          )?.automatic
        )
          this.stopActivity(id);
        break;
      case "move": {
        assert(p.room, "Join a room.");
        assert(
          Number.isInteger(d.x) && Number.isInteger(d.y),
          "Invalid destination.",
        );
        const path = this.path(p.room, p.x, p.y, d.x, d.y);
        assert(path, "That spot is blocked or occupied.");
        p.seat = null;
        p.path = path;
        break;
      }
      case "chat": {
        assert(p.room, "Join a room.");
        this.room(id, p.room);
        this.limit(id, "chat", 8, 10000);
        const body = clean(d.body, 1000);
        assert(body, "Write a message.");
        const nonce = clean(d.nonce, 80);
        assert(nonce, "Missing message ID.");
        if (
          this.get(
            "SELECT id FROM messages WHERE user=? AND nonce=?",
            id,
            nonce,
          )
        )
          break;
        const recent = this.get(
          "SELECT * FROM messages WHERE user=? ORDER BY time DESC LIMIT 1",
          id,
        );
        assert(
          !recent || recent.body !== body || this.now() - recent.time > 30000,
          "Give repeated messages a little space.",
        );
        this.run(
          "INSERT INTO messages VALUES(?,?,?,?,?,?)",
          uid(),
          p.room,
          id,
          body,
          this.now(),
          nonce,
        );
        if (
          [...this.presence.entries()].some(
            ([other, v]) =>
              other !== id && v.room === p.room && !this.blocked(id, other),
          )
        )
          p.text = true;
        break;
      }
      case "profile": {
        assert(
          ["miniature", "mature"].includes(d.body),
          "Choose a body style.",
        );
        assert(/^#[0-9a-f]{6}$/i.test(d.color), "Choose a valid color.");
        this.run(
          "UPDATE users SET color=?,body=? WHERE id=?",
          d.color,
          d.body,
          id,
        );
        break;
      }
      case "auto": {
        this.run("UPDATE users SET auto=? WHERE id=?", d.enabled ? 1 : 0, id);
        if (d.enabled && p.room)
          this.startActivity(id, this.room(id, p.room).kind, true);
        else if (
          !d.enabled &&
          this.get(
            "SELECT automatic FROM activities WHERE user=? AND end IS NULL",
            id,
          )?.automatic
        )
          this.stopActivity(id);
        break;
      }
      case "activity":
        this.startActivity(id, d.kind, false, d.visibility);
        break;
      case "activityStop":
        this.stopActivity(id);
        break;
      case "activityVisibility":
        assert(
          ["private", "public"].includes(d.visibility),
          "Invalid visibility.",
        );
        this.run(
          "UPDATE activities SET visibility=? WHERE id=? AND user=?",
          d.visibility,
          d.id,
          id,
        );
        break;
      case "activityDelete":
        this.run("DELETE FROM activities WHERE id=? AND user=?", d.id, id);
        break;
      case "voice": {
        assert(p.room, "Join a room.");
        if (d.join) {
          assert(
            !p.voiceClient || p.voiceClient === clientId,
            "A call is already open in another tab.",
          );
          assert(
            [...this.presence.values()].filter(
              (v) => v.room === p.room && v.voice,
            ).length < (this.mediaMode === "livekit" ? 100 : 6) || p.voice,
            this.mediaMode === "livekit"
              ? "Pilot voice capacity reached."
              : "This local call supports 6 people.",
          );
          assert(
            !d.video ||
              p.video ||
              [...this.presence.values()].filter((v) => v.video).length < 10,
            "The pilot supports 10 simultaneous cameras.",
          );
          p.voice = true;
          p.voiceClient = clientId;
          p.muted = Boolean(d.muted);
          p.video = Boolean(d.video);
        } else if (p.voiceClient === clientId) {
          p.voice = false;
          p.voiceClient = null;
          p.video = false;
        }
        break;
      }
      case "createHome": {
        this.limit(id, "homes", 5, 60000);
        const name = clean(d.name, 48);
        assert(name.length > 2, "Give your home a name.");
        const hid = uid();
        this.tx(() => {
          this.run(
            "INSERT INTO homes VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            hid,
            name,
            id,
            this.user(id).band,
            clean(d.genre, 30) || "Hangout",
            "India",
            clean(d.state, 40) || "Maharashtra",
            clean(d.city, 40) || "Pune",
            "English · हिन्दी",
            0,
            uid().slice(0, 8),
            clean(d.description, 200) || "A place for our people.",
          );
          this.run("INSERT INTO members VALUES(?,?)", hid, id);
          this.addRoom(hid, "Living room", "Socializing", 8, true);
          this.addRoom(hid, "Study corner", "Studying", 4, true);
        });
        this.join(id, this.get("SELECT id FROM rooms WHERE home=?", hid).id);
        break;
      }
      case "invite": {
        const h = this.get("SELECT * FROM homes WHERE invite=?", clean(d.code));
        assert(
          h && h.band === this.user(id).band,
          "Invite not found for your age group.",
        );
        assert(
          !this.get("SELECT 1 FROM bans WHERE home=? AND user=?", h.id, id),
          "You cannot enter this home.",
        );
        this.run("INSERT OR IGNORE INTO members VALUES(?,?)", h.id, id);
        this.join(id, this.get("SELECT id FROM rooms WHERE home=?", h.id).id);
        break;
      }
      case "capacity": {
        const r = this.room(id, d.room);
        this.owner(id, r.home, r.id);
        assert(
          Number.isInteger(d.capacity) &&
            d.capacity >= 0 &&
            d.capacity <= 10000,
          "Use 0 for unlimited, or a whole number up to 10,000.",
        );
        this.run("UPDATE rooms SET capacity=? WHERE id=?", d.capacity, r.id);
        break;
      }
      case "createRoom": {
        this.owner(id, d.home);
        assert(
          this.all("SELECT id FROM rooms WHERE home=?", d.home).length < 20,
          "Local pilot supports 20 rooms per home.",
        );
        assert(ACTIVITIES.includes(d.kind), "Unknown room activity.");
        assert(
          Number.isInteger(d.capacity) &&
            d.capacity >= 0 &&
            d.capacity <= 10000,
          "Invalid capacity.",
        );
        assert(clean(d.name).length > 1, "Name the room.");
        this.addRoom(d.home, clean(d.name, 40), d.kind, d.capacity, true);
        break;
      }
      case "buy": {
        const a = CATALOG.find((a) => a.id === d.asset);
        assert(a, "Unknown item.");
        const nonce = clean(d.nonce);
        assert(nonce, "Missing purchase ID.");
        this.tx(() => {
          if (
            this.get("SELECT 1 FROM requests WHERE user=? AND id=?", id, nonce)
          )
            return;
          const u = this.user(id);
          assert(
            u.level >= a.level,
            "Reach the required level first. Coins cannot bypass XP.",
          );
          assert(u.coins >= a.price, "Not enough coins yet.");
          if (a.kind === "theme")
            assert(
              !this.get(
                "SELECT 1 FROM items WHERE owner_type='user' AND owner=? AND asset=?",
                id,
                a.id,
              ),
              "You already own this reusable finish.",
            );
          assert(
            this.all(
              "SELECT id FROM items WHERE owner_type='user' AND owner=?",
              id,
            ).length < 200,
            "Local inventory limit reached.",
          );
          this.run("UPDATE users SET coins=coins-? WHERE id=?", a.price, id);
          this.run(
            "INSERT INTO items(id,asset,owner_type,owner) VALUES(?,?,?,?)",
            uid(),
            a.id,
            "user",
            id,
          );
          this.run(
            "INSERT INTO ledger VALUES(?,?,?,?,?)",
            uid(),
            id,
            -a.price,
            "Bought " + a.name,
            this.now(),
          );
          this.run("INSERT INTO requests VALUES(?,?)", id, nonce);
        });
        break;
      }
      case "shareItem": {
        assert(["donate", "lend"].includes(d.mode), "Choose donate or lend.");
        const h = this.home(d.home);
        assert(this.canHome(id, h), "Join this home first.");
        assert(
          h.owner !== "system",
          "Create a home to test sharing furniture.",
        );
        this.tx(() => {
          const item = this.get("SELECT * FROM items WHERE id=?", d.item);
          assert(
            item?.owner_type === "user" && item.owner === id && !item.loan,
            "You must own an available item.",
          );
          assert(
            CATALOG.find((a) => a.id === item.asset)?.kind !== "theme",
            "Finishes remain personal in this pilot.",
          );
          this.clearPlacement(item.id);
          if (d.mode === "donate")
            this.run(
              "UPDATE items SET owner_type='home',owner=?,loan=NULL WHERE id=?",
              h.id,
              item.id,
            );
          else this.run("UPDATE items SET loan=? WHERE id=?", h.id, item.id);
        });
        break;
      }
      case "returnItem": {
        const item = this.get("SELECT * FROM items WHERE id=?", d.item);
        assert(item && item.loan, "This item is not on loan.");
        assert(
          item.owner === id || this.home(item.loan).owner === id,
          "Only the lender or home owner can return this.",
        );
        this.tx(() => {
          this.clearPlacement(item.id);
          this.run("UPDATE items SET loan=NULL WHERE id=?", item.id);
        });
        break;
      }
      case "place": {
        const r = this.room(id, d.room);
        this.owner(id, r.home, r.id);
        const item = this.get("SELECT * FROM items WHERE id=?", d.item);
        assert(item, "Item not found.");
        assert(
          (item.owner_type === "home" && item.owner === r.home) ||
            (item.owner_type === "user" && item.owner === id && !item.loan) ||
            item.loan === r.home,
          "This item is not available to this home.",
        );
        const a = CATALOG.find((a) => a.id === item.asset);
        assert(a && a.kind !== "theme", "Use Apply for wall finishes.");
        assert(
          Number.isInteger(d.x) &&
            Number.isInteger(d.y) &&
            d.x >= 0 &&
            d.x < r.width &&
            d.y >= 0 &&
            d.y < r.height,
          "Choose a valid floor tile.",
        );
        assert(!(d.x === 5 && d.y === 7), "Keep the entrance clear.");
        assert(
          !this.get(
            "SELECT id FROM items WHERE room=? AND x=? AND y=? AND id<>?",
            r.id,
            d.x,
            d.y,
            item.id,
          ),
          "Another item is there.",
        );
        assert(
          ![...this.presence.values()].some(
            (v) => v.room === r.id && v.x === d.x && v.y === d.y,
          ),
          "Someone is standing there.",
        );
        this.tx(() => {
          this.clearPlacement(item.id);
          this.run(
            "UPDATE items SET room=?,x=?,y=?,rotation=? WHERE id=?",
            r.id,
            d.x,
            d.y,
            Number.isInteger(d.rotation) ? ((d.rotation % 4) + 4) % 4 : 0,
            item.id,
          );
          this.validateLayout(r.id);
          for (const v of this.presence.values())
            if (v.room === r.id)
              assert(
                this.path(r.id, v.x, v.y, 5, 7, true),
                "That placement blocks an occupant from the exit.",
              );
          for (const seat of this.all(
            "SELECT * FROM items WHERE room=? AND asset IN ('chair','sofa')",
            r.id,
          ))
            assert(
              this.path(r.id, 5, 7, seat.x, seat.y, true),
              "Keep every seat reachable.",
            );
        });
        break;
      }
      case "store": {
        const item = this.get("SELECT * FROM items WHERE id=?", d.item);
        assert(item, "Item not found.");
        assert(
          (item.owner_type === "user" && item.owner === id) ||
            (item.room &&
              ['owner','admin'].includes(this.role(id,
                this.get("SELECT home FROM rooms WHERE id=?", item.room).home,item.room))),
          "You cannot move this item.",
        );
        this.clearPlacement(item.id);
        break;
      }
      case "theme": {
        const r = this.room(id, d.room);
        this.owner(id, r.home, r.id);
        assert(
          this.get(
            "SELECT 1 FROM items WHERE owner_type='user' AND owner=? AND asset=?",
            id,
            d.asset,
          ),
          "Buy that finish first.",
        );
        const a = CATALOG.find((a) => a.id === d.asset && a.kind === "theme");
        assert(a, "Invalid finish.");
        this.run("UPDATE rooms SET theme=? WHERE id=?", a.color, r.id);
        break;
      }
      case "friend": {
        const other = this.user(d.user);
        assert(
          other.id !== id &&
            other.band === this.user(id).band &&
            !this.blocked(id, other.id),
          "Cannot add this person.",
        );
        if (
          this.get(
            "SELECT 1 FROM friends WHERE sender=? AND recipient=? AND status='pending'",
            other.id,
            id,
          )
        )
          this.run(
            "UPDATE friends SET status='accepted' WHERE sender=? AND recipient=?",
            other.id,
            id,
          );
        else
          this.run(
            "INSERT OR IGNORE INTO friends VALUES(?,?,'pending')",
            id,
            other.id,
          );
        break;
      }
      case "block":
        assert(d.user !== id, "Choose another user.");
        this.user(d.user);
        this.run("INSERT OR IGNORE INTO blocks VALUES(?,?)", id, d.user);
        break;
      case "report":
        assert(clean(d.body, 500).length > 4, "Describe what happened.");
        this.run(
          "INSERT INTO reports VALUES(?,?,?,?,?)",
          uid(),
          id,
          clean(d.user),
          clean(d.body, 500),
          this.now(),
        );
        break;
      case "ban": {
        this.owner(id, d.home);
        assert(d.user !== id, "You cannot ban yourself.");
        this.run("INSERT OR IGNORE INTO bans VALUES(?,?)", d.home, d.user);
        const target = this.presence.get(d.user);
        if (
          target?.room &&
          this.get("SELECT home FROM rooms WHERE id=?", target.room)?.home ===
            d.home
        ) {
          target.room = null;
          target.voice = false;
          target.voiceClient = null;
          target.video = false;
          target.path = [];
          target.seat = null;
          this.stopActivity(d.user);
        }
        for (const item of this.all(
          "SELECT * FROM items WHERE owner_type='user' AND owner=?",
          d.user,
        )) {
          if (item.loan === d.home) {
            this.clearPlacement(item.id);
            this.run("UPDATE items SET loan=NULL WHERE id=?", item.id);
          } else if (
            item.room &&
            this.get("SELECT home FROM rooms WHERE id=?", item.room)?.home ===
              d.home
          )
            this.clearPlacement(item.id);
        }
        break;
      }
      default:
        throw new Error("Unknown action.");
    }
    return true;
  }
  clearPlacement(id) {
    const item = this.get("SELECT * FROM items WHERE id=?", id);
    if (!item) return;
    for (const p of this.presence.values())
      if (p.seat === id) {
        p.seat = null;
        p.path = [];
        p.x = 5;
        p.y = 7;
      }
    this.run("UPDATE items SET room=NULL,x=NULL,y=NULL WHERE id=?", id);
  }
  tick() {
    const now = this.now();
    for (const [id, p] of this.presence) {
      const elapsed = Math.max(0, Math.min(5000, now - p.last));
      p.last = now;
      p.remainder += elapsed;
      p.window += elapsed;
      const sec = Math.floor(p.remainder / 1000);
      if (sec) {
        p.remainder -= sec * 1000;
        this.run(
          "UPDATE users SET seconds=seconds+?,xp=CAST((seconds+?)/60 AS INTEGER) WHERE id=?",
          sec,
          sec,
          id,
        );
      }
      const peers = [...this.presence.entries()].filter(
        ([other, v]) =>
          other !== id && v.room === p.room && !this.blocked(id, other),
      );
      const activity = this.get(
        "SELECT kind FROM activities WHERE user=? AND end IS NULL",
        id,
      );
      const sharedActivity =
        activity &&
        interactive.has(activity.kind) &&
        peers.some(
          ([other]) =>
            this.get(
              "SELECT kind FROM activities WHERE user=? AND end IS NULL",
              other,
            )?.kind === activity.kind,
        );
      if (
        p.room &&
        ((p.voice && peers.some(([, v]) => v.voice)) || sharedActivity)
      )
        p.engaged += elapsed;
      if (p.window >= 60000) {
        if (p.text || p.engaged >= 30000) {
          this.tx(() => {
            this.run("UPDATE users SET coins=coins+2 WHERE id=?", id);
            this.run(
              "INSERT INTO ledger VALUES(?,?,?,?,?)",
              uid(),
              id,
              2,
              "Interactive participation window",
              now,
            );
          });
        }
        p.window %= 60000;
        p.engaged = 0;
        p.text = false;
      }
    }
    this.run("INSERT OR REPLACE INTO runtime VALUES('last_tick',?)", now);
  }
  step() {
    for (const p of this.presence.values())
      if (p.path.length) {
        const [x, y] = p.path[0];
        if (
          this.get(
            "SELECT id FROM items WHERE room=? AND x=? AND y=? AND asset NOT IN ('chair','sofa')",
            p.room,
            x,
            y,
          )
        ) {
          p.path = [];
          continue;
        }
        const seat = this.get(
          "SELECT * FROM items WHERE room=? AND x=? AND y=? AND asset IN ('chair','sofa')",
          p.room,
          x,
          y,
        );
        if (
          seat &&
          [...this.presence.values()].some((v) => v !== p && v.seat === seat.id)
        ) {
          p.path = [];
          continue;
        }
        p.path.shift();
        p.x = x;
        p.y = y;
        if (!p.path.length) p.seat = seat?.id ?? null;
      }
  }
  snapshot(id) {
    const me = this.user(id),
      p = this.presence.get(id);
    const homes = this.all("SELECT * FROM homes")
      .filter((h) => this.canHome(id, h))
      .map((h) => ({
        ...h,
        invite: h.owner === id ? h.invite : undefined,
        online: [...this.presence.values()].filter(
          (v) =>
            v.room &&
            this.get("SELECT home FROM rooms WHERE id=?", v.room)?.home ===
              h.id,
        ).length,
        rooms: this.all("SELECT * FROM rooms WHERE home=?", h.id).map((r) => ({
          ...r,
          count: this.count(r.id),
        })),
      }));
    let room = null;
    if (p?.room) {
      const r = this.room(id, p.room);
      room = {
        ...r,
        items: this.all("SELECT * FROM items WHERE room=?", r.id),
        people: [...this.presence.entries()]
          .filter(([, v]) => v.room === r.id)
          .map(([user, v]) => {
            const u = this.user(user);
            const activity = this.get(
              "SELECT kind FROM activities WHERE user=? AND end IS NULL AND visibility='public'",
              user,
            );
            return {
              id: user,
              name: u.name,
              color: u.color,
              body: u.body,
              x: v.x,
              y: v.y,
              moving: v.path.length > 0,
              seat: v.seat,
              voice: v.voice,
              muted: v.muted,
              video: v.video,
              activity: activity?.kind ?? null,
              blocked: Boolean(this.blocked(id, user)),
            };
          }),
        messages: this.all(
          "SELECT m.*,u.name,u.color FROM messages m JOIN users u ON m.user=u.id WHERE room=? ORDER BY time DESC,m.rowid DESC LIMIT 100",
          r.id,
        )
          .filter((m) => !this.blocked(id, m.user))
          .reverse(),
      };
    }
    const ownedHomes = homes.filter((h) => h.owner === id).map((h) => h.id);
    const items = this.all("SELECT * FROM items").filter(
      (i) =>
        (i.owner_type === "user" && i.owner === id) ||
        (i.owner_type === "home" && ownedHomes.includes(i.owner)) ||
        (i.loan && ownedHomes.includes(i.loan)),
    );
    const friends = this.all(
      "SELECT * FROM friends WHERE sender=? OR recipient=?",
      id,
      id,
    )
      .filter(
        (f) => !this.blocked(id, f.sender === id ? f.recipient : f.sender),
      )
      .map((f) => ({
        ...f,
        user: this.user(f.sender === id ? f.recipient : f.sender).name,
        other: f.sender === id ? f.recipient : f.sender,
      }));
    return {
      me,
      homes,
      room,
      catalog: CATALOG,
      items,
      activities: this.all(
        "SELECT * FROM activities WHERE user=? ORDER BY start DESC LIMIT 100",
        id,
      ),
      ledger: this.all(
        "SELECT * FROM ledger WHERE user=? ORDER BY time DESC LIMIT 50",
        id,
      ),
      friends,
      serverTime: this.now(),
      online: [...this.presence.keys()].filter(
        (u) => this.user(u).band === me.band,
      ).length,
    };
  }
  close() {
    this.db.close();
  }
}

installConnected(World);

installSocial(World);

installBuilder(World);

installCommunity(World);

installDevices(World);
