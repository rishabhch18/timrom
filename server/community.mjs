import { randomUUID } from "node:crypto";
import { ACTIVITIES } from "./engine.mjs";
const check = (v, m) => {
  if (!v) throw Error(m);
};
const clean = (s, n = 1000) =>
  String(s ?? "")
    .trim()
    .slice(0, n);
const audiences = ["private", "friends", "home", "public"];
export function migrateCommunity(w) {
  w.db.exec(`
    CREATE TABLE IF NOT EXISTS report_reviews(report TEXT PRIMARY KEY,reviewer TEXT,resolution TEXT,time INTEGER);
    CREATE TABLE IF NOT EXISTS profiles(user TEXT PRIMARY KEY,prefs TEXT NOT NULL DEFAULT '{}');
    CREATE TABLE IF NOT EXISTS home_details(home TEXT PRIMARY KEY,rules TEXT DEFAULT 'Be kind. Respect privacy. Follow moderator guidance.',listing TEXT DEFAULT 'private',region TEXT DEFAULT 'Asia',latitude REAL,longitude REAL);
    CREATE TABLE IF NOT EXISTS message_details(message TEXT PRIMARY KEY,reply TEXT,edited INTEGER,deleted INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS reactions(message TEXT,user TEXT,emoji TEXT,PRIMARY KEY(message,user,emoji));
    CREATE TABLE IF NOT EXISTS direct_messages(id TEXT PRIMARY KEY,sender TEXT,recipient TEXT,body TEXT,time INTEGER,nonce TEXT,UNIQUE(sender,nonce));
    CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY,user TEXT,body TEXT,time INTEGER,seen INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS favourites(user TEXT,home TEXT,PRIMARY KEY(user,home));
    CREATE TABLE IF NOT EXISTS personal_mutes(user TEXT,target TEXT,PRIMARY KEY(user,target));
    CREATE TABLE IF NOT EXISTS restrictions(home TEXT,room TEXT,user TEXT,kind TEXT,until INTEGER,PRIMARY KEY(home,room,user,kind));
    CREATE TABLE IF NOT EXISTS item_offers(id TEXT PRIMARY KEY,item TEXT UNIQUE,sender TEXT,home TEXT,mode TEXT,time INTEGER);
    CREATE TABLE IF NOT EXISTS item_origins(item TEXT PRIMARY KEY,donor TEXT);
    CREATE TABLE IF NOT EXISTS succession(home TEXT PRIMARY KEY,sender TEXT,recipient TEXT);
  `);
}
export function installCommunity(World) {
  const handle = World.prototype.handle,
    snapshot = World.prototype.snapshot,
    canHome = World.prototype.canHome,
    room = World.prototype.room,
    startActivity = World.prototype.startActivity,
    step = World.prototype.step;
  World.prototype.step = function () {
    step.call(this);
    for (const [id, p] of this.presence)
      if (p.travel && !p.path.length) {
        const target = p.travel;
        p.travel = null;
        try {
          if (p.room !== target.garden || p.x !== 5 || p.y !== 7) continue;
          const dest = this.all(
            "SELECT * FROM rooms WHERE home=? ORDER BY outdoor DESC,rowid",
            target.home,
          )[0];
          check(dest, "Home unavailable.");
          this.join(id, dest.id);
        } catch (e) {
          p.notice = e.message;
        }
      }
  };
  World.prototype.prefs = function (id) {
    return JSON.parse(
      this.get("SELECT prefs FROM profiles WHERE user=?", id)?.prefs || "{}",
    );
  };
  World.prototype.acceptedFriend = function (a, b) {
    return (
      a !== b &&
      this.user(a).band === this.user(b).band &&
      !this.blocked(a, b) &&
      !!this.get(
        "SELECT 1 FROM friends WHERE status='accepted' AND ((sender=? AND recipient=?) OR (sender=? AND recipient=?))",
        a,
        b,
        b,
        a,
      )
    );
  };
  World.prototype.operator = function (id) {
    return (process.env.TIMROM_OPERATORS || "")
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
      .includes(this.user(id).username);
  };
  World.prototype.notify = function (id, body) {
    if (this.prefs(id).notifications === false) return;
    this.run(
      "INSERT INTO notifications VALUES(?,?,?,?,0)",
      randomUUID(),
      id,
      clean(body, 240),
      this.now(),
    );
    this.run(
      "DELETE FROM notifications WHERE user=? AND id NOT IN (SELECT id FROM notifications WHERE user=? ORDER BY time DESC LIMIT 100)",
      id,
      id,
    );
  };
  World.prototype.audit = function (home, actor, target, action) {
    this.run(
      "INSERT INTO moderation_log VALUES(?,?,?,?,?,?)",
      randomUUID(),
      home,
      actor,
      target,
      action,
      this.now(),
    );
  };
  World.prototype.canHome = function (id, h) {
    return (
      canHome.call(this, id, h) &&
      !this.get(
        "SELECT 1 FROM restrictions WHERE home=? AND user=? AND kind='kick' AND until>?",
        h.id,
        id,
        this.now(),
      )
    );
  };
  World.prototype.room = function (id, rid) {
    const r = room.call(this, id, rid);
    check(
      !this.get(
        "SELECT 1 FROM restrictions WHERE home=? AND room=? AND user=? AND kind='kick' AND until>?",
        r.home,
        r.id,
        id,
        this.now(),
      ),
      "You were removed from this room. Try again later.",
    );
    return r;
  };
  World.prototype.startActivity = function (
    id,
    kind,
    automatic = false,
    visibility = "private",
  ) {
    check(audiences.includes(visibility), "Choose an activity audience.");
    startActivity.call(this, id, kind, automatic, "private");
    if (!automatic)
      this.run(
        "UPDATE activities SET visibility=? WHERE user=? AND end IS NULL",
        visibility,
        id,
      );
  };
  World.prototype.retireHome = function (home) {
    for (const i of this.all(
      "SELECT * FROM items WHERE (owner_type='home' AND owner=?) OR loan=? OR room IN (SELECT id FROM rooms WHERE home=?)",
      home,
      home,
      home,
    )) {
      this.clearPlacement(i.id);
      if (i.loan === home)
        this.run("UPDATE items SET loan=NULL WHERE id=?", i.id);
      else if (i.owner_type === "home") {
        const donor = this.get(
          "SELECT donor FROM item_origins WHERE item=?",
          i.id,
        )?.donor;
        if (
          !i.starter &&
          donor &&
          this.get("SELECT 1 FROM users WHERE id=?", donor)
        )
          this.run(
            "UPDATE items SET owner_type='user',owner=? WHERE id=?",
            donor,
            i.id,
          );
        else this.run("DELETE FROM items WHERE id=?", i.id);
      }
    }
    for (const [u, p] of this.presence)
      if (
        p.room &&
        this.get("SELECT home FROM rooms WHERE id=?", p.room)?.home === home
      ) {
        this.endInteraction(u, false);
        Object.assign(p, {
          room: null,
          path: [],
          voice: false,
          voiceClient: null,
          video: false,
        });
      }
    this.run(
      "DELETE FROM reactions WHERE message IN (SELECT m.id FROM messages m JOIN rooms r ON m.room=r.id WHERE r.home=?)",
      home,
    );
    this.run(
      "DELETE FROM message_details WHERE message IN (SELECT m.id FROM messages m JOIN rooms r ON m.room=r.id WHERE r.home=?)",
      home,
    );
    this.run(
      "DELETE FROM messages WHERE room IN (SELECT id FROM rooms WHERE home=?)",
      home,
    );
    this.run(
      "DELETE FROM room_access WHERE room IN (SELECT id FROM rooms WHERE home=?)",
      home,
    );
    this.run(
      "UPDATE users SET last_room=NULL WHERE last_room IN (SELECT id FROM rooms WHERE home=?)",
      home,
    );
    for (const table of [
      "rooms",
      "members",
      "roles",
      "bans",
      "layouts",
      "home_details",
      "favourites",
      "restrictions",
      "item_offers",
      "succession",
      "moderation_log",
    ])
      this.run(`DELETE FROM ${table} WHERE home=?`, home);
    this.run("DELETE FROM homes WHERE id=?", home);
  };
  World.prototype.handle = function (id, type, d = {}, client = null) {
    const p = this.presence.get(id);
    check(p, "Connect first.");
    this.limit(id, "community", 150, 1000);
    const current = () => this.room(id, p.room);
    const message = () => {
      const m = this.get("SELECT * FROM messages WHERE id=?", d.message);
      check(m, "Message unavailable.");
      this.room(id, m.room);
      check(!this.blocked(id, m.user), "Message unavailable.");
      return m;
    };
    if (type === "activitySummary") {
      const since = [Number(d.day), Number(d.week)],
        now = this.now();
      check(
        since.every(
          (v) => Number.isSafeInteger(v) && v >= now - 8 * 86400000 && v <= now,
        ),
        "Invalid summary period.",
      );
      return since.map((start) =>
        Math.floor(
          this.get(
            "SELECT COALESCE(SUM(MAX(0,MIN(COALESCE(end,?),?)-MAX(start,?))),0) AS duration FROM activities WHERE user=? AND start<? AND COALESCE(end,?)>?",
            now,
            now,
            start,
            id,
            now,
            now,
            start,
          ).duration / 60000,
        ),
      );
    }
    if (type === "travelNeighbour") {
      check(
        this.get("SELECT 1 FROM members WHERE home=? AND user=?", d.home, id),
        "Join the neighbouring home first.",
      );
      check(this.canHome(id, this.home(d.home)), "Home access denied.");
      const destination = this.all(
        "SELECT * FROM rooms WHERE home=? ORDER BY outdoor DESC,rowid",
        d.home,
      )[0];
      check(destination, "Home unavailable.");
      if (!d.walk) {
        p.travel = null;
        this.join(id, destination.id);
      } else {
        const r = current(),
          garden = this.get(
            "SELECT id FROM rooms WHERE home=? AND outdoor=1",
            r.home,
          );
        check(garden, "This home has no garden gate.");
        handle.call(this, id, "move", { room: garden.id, x: 5, y: 7 }, client);
        p.travel = { garden: garden.id, home: d.home };
        if (!p.path.length) this.step();
      }
      return;
    }
    if (["move", "join", "leave", "interact"].includes(type)) p.travel = null;
    if (type === "wave") {
      p.gestureUntil = this.now() + 2500;
      return;
    }
    if (type === "reviewReport") {
      check(this.operator(id), "Platform reviewer permission required.");
      const report = this.get("SELECT * FROM reports WHERE id=?", d.report);
      check(report, "Report unavailable.");
      const resolution = clean(d.resolution, 500);
      check(resolution.length >= 5, "Record the review outcome.");
      this.run(
        "INSERT OR REPLACE INTO report_reviews VALUES(?,?,?,?)",
        report.id,
        id,
        resolution,
        this.now(),
      );
      this.notify(report.user, "Your report has been reviewed.");
      return;
    }
    if (type === "ban") {
      const h = this.home(d.home);
      check(d.user !== h.owner, "The home owner cannot be banned.");
      check(
        this.role(id, h.id) === "owner" ||
          (this.role(id, h.id) === "admin" &&
            this.role(d.user, h.id) === "member"),
        "You cannot ban an equal or higher role.",
      );
    }
    if (type === "preferences") {
      const old = this.prefs(id),
        next = { ...old };
      for (const k of ["reducedMotion", "notifications"])
        if (typeof d[k] === "boolean") next[k] = d[k];
      if (d.language !== undefined) {
        check(["en", "hi"].includes(d.language), "Choose English or Hindi.");
        next.language = d.language;
      }
      for (const [k, max] of [
        ["skin", 4],
        ["hair", 5],
        ["style", 2],
        ["outfit", 5],
      ])
        if (d[k] !== undefined) {
          check(
            Number.isInteger(d[k]) && d[k] >= 0 && d[k] <= max,
            "Choose a supported avatar option.",
          );
          next[k] = d[k];
        }
      this.run(
        "INSERT INTO profiles VALUES(?,?) ON CONFLICT(user) DO UPDATE SET prefs=excluded.prefs",
        id,
        JSON.stringify(next),
      );
      return;
    }
    if (type === "homeDetails") {
      this.owner(id, d.home);
      const rules = clean(d.rules, 2000);
      check(rules.length >= 5, "Write the home rules.");
      const lat =
          d.latitude === "" || d.latitude == null ? null : Number(d.latitude),
        lon =
          d.longitude === "" || d.longitude == null
            ? null
            : Number(d.longitude);
      check(
        (lat === null && lon === null) ||
          (Number.isFinite(lat) &&
            Math.abs(lat) <= 90 &&
            Number.isFinite(lon) &&
            Math.abs(lon) <= 180),
        "Choose valid community map coordinates.",
      );
      this.run(
        "INSERT INTO home_details(home,rules,region,latitude,longitude) VALUES(?,?,?,?,?) ON CONFLICT(home) DO UPDATE SET rules=excluded.rules,region=excluded.region,latitude=excluded.latitude,longitude=excluded.longitude",
        d.home,
        rules,
        clean(d.region, 40) || "Asia",
        lat,
        lon,
      );
      this.run(
        "UPDATE homes SET description=?,country=?,state=?,city=?,language=? WHERE id=?",
        clean(d.description, 200),
        clean(d.country, 60),
        clean(d.state, 60),
        clean(d.city, 60),
        clean(d.language, 60),
        d.home,
      );
      return;
    }
    if (type === "requestListing") {
      this.owner(id, d.home);
      this.run(
        "INSERT INTO home_details(home,listing) VALUES(?,'pending') ON CONFLICT(home) DO UPDATE SET listing='pending'",
        d.home,
      );
      this.audit(d.home, id, d.home, "listing requested");
      return;
    }
    if (type === "reviewListing") {
      check(this.operator(id), "Platform reviewer permission required.");
      this.home(d.home);
      check(
        ["approved", "rejected", "private"].includes(d.decision),
        "Choose a listing decision.",
      );
      this.tx(() => {
        this.run(
          "UPDATE homes SET public=? WHERE id=?",
          d.decision === "approved" ? 1 : 0,
          d.home,
        );
        this.run(
          "UPDATE home_details SET listing=? WHERE home=?",
          d.decision,
          d.home,
        );
        this.audit(d.home, id, d.home, "listing " + d.decision);
        this.notify(this.home(d.home).owner, "Listing review: " + d.decision);
      });
      return;
    }
    if (type === "favourite") {
      check(
        this.get("SELECT 1 FROM members WHERE home=? AND user=?", d.home, id),
        "Join the home first.",
      );
      if (d.enabled)
        this.run("INSERT OR IGNORE INTO favourites VALUES(?,?)", id, d.home);
      else
        this.run("DELETE FROM favourites WHERE user=? AND home=?", id, d.home);
      return;
    }
    if (type === "notificationsRead") {
      this.run("UPDATE notifications SET seen=1 WHERE user=?", id);
      return;
    }
    if (type === "unblock" || type === "personalMute") {
      this.user(d.user);
      if (type === "unblock")
        this.run("DELETE FROM blocks WHERE user=? AND target=?", id, d.user);
      else if (d.enabled)
        this.run(
          "INSERT OR IGNORE INTO personal_mutes VALUES(?,?)",
          id,
          d.user,
        );
      else
        this.run(
          "DELETE FROM personal_mutes WHERE user=? AND target=?",
          id,
          d.user,
        );
      return;
    }
    if (type === "unfriend") {
      this.run(
        "DELETE FROM friends WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)",
        id,
        d.user,
        d.user,
        id,
      );
      return;
    }
    if (type === "dm") {
      check(
        this.acceptedFriend(id, d.user),
        "Direct messages require an accepted friend in your age group.",
      );
      this.limit(id, "dm", 8, 10000);
      const body = clean(d.body),
        nonce = clean(d.nonce, 80);
      check(body && nonce, "Write a message.");
      if (
        this.get(
          "SELECT 1 FROM direct_messages WHERE sender=? AND nonce=?",
          id,
          nonce,
        )
      )
        return;
      const recent = this.get(
        "SELECT * FROM direct_messages WHERE sender=? ORDER BY time DESC LIMIT 1",
        id,
      );
      check(
        !recent || recent.body !== body || this.now() - recent.time > 30000,
        "Give repeated messages a little space.",
      );
      this.run(
        "INSERT INTO direct_messages VALUES(?,?,?,?,?,?)",
        randomUUID(),
        id,
        d.user,
        body,
        this.now(),
        nonce,
      );
      this.notify(d.user, this.user(id).name + " sent a direct message.");
      return;
    }
    if (type === "dmDelete") {
      this.run(
        "DELETE FROM direct_messages WHERE id=? AND sender=?",
        d.message,
        id,
      );
      return;
    }
    if (type === "editMessage" || type === "deleteMessage") {
      const m = message();
      check(m.user === id, "Only the author can edit or delete this message.");
      check(
        !this.get("SELECT deleted FROM message_details WHERE message=?", m.id)
          ?.deleted,
        "Message deleted.",
      );
      const body = type === "deleteMessage" ? "" : clean(d.body);
      check(type === "deleteMessage" || body, "Write a message.");
      this.tx(() => {
        this.run("UPDATE messages SET body=? WHERE id=?", body, m.id);
        this.run(
          "INSERT INTO message_details(message,edited,deleted) VALUES(?,?,?) ON CONFLICT(message) DO UPDATE SET edited=excluded.edited,deleted=excluded.deleted",
          m.id,
          this.now(),
          type === "deleteMessage" ? 1 : 0,
        );
        if (type === "deleteMessage")
          this.run("DELETE FROM reactions WHERE message=?", m.id);
      });
      return;
    }
    if (type === "react") {
      const m = message();
      check(
        !this.get("SELECT deleted FROM message_details WHERE message=?", m.id)
          ?.deleted,
        "Message deleted.",
      );
      check(
        ["❤️", "👍", "😂", "🎉", "👀", "🙏"].includes(d.emoji),
        "Choose a supported reaction.",
      );
      if (
        this.get(
          "SELECT 1 FROM reactions WHERE message=? AND user=? AND emoji=?",
          m.id,
          id,
          d.emoji,
        )
      )
        this.run(
          "DELETE FROM reactions WHERE message=? AND user=? AND emoji=?",
          m.id,
          id,
          d.emoji,
        );
      else this.run("INSERT INTO reactions VALUES(?,?,?)", m.id, id, d.emoji);
      return;
    }
    if (type === "chat") {
      const r = current();
      check(
        !this.get(
          "SELECT 1 FROM restrictions WHERE home=? AND (room='' OR room=?) AND user=? AND kind='timeout' AND until>?",
          r.home,
          r.id,
          id,
          this.now(),
        ),
        "You have a text timeout in this room.",
      );
      if (d.reply) {
        const m = this.get("SELECT * FROM messages WHERE id=?", d.reply);
        check(
          m?.room === r.id && !this.blocked(id, m.user),
          "Reply must refer to a visible message in this room.",
        );
      }
      const result = handle.call(this, id, type, d, client);
      const m = this.get(
        "SELECT id FROM messages WHERE user=? AND nonce=?",
        id,
        d.nonce,
      );
      if (d.reply && m)
        this.run(
          "INSERT OR IGNORE INTO message_details(message,reply) VALUES(?,?)",
          m.id,
          d.reply,
        );
      for (const name of new Set(
        clean(d.body).match(/@[a-z][a-z0-9_]{2,23}/gi) || [],
      )) {
        const u = this.get(
          "SELECT user FROM credentials WHERE username=?",
          name.slice(1).toLowerCase(),
        );
        if (u && u.user !== id && !this.blocked(id, u.user)) {
          try {
            this.room(u.user, r.id);
            this.notify(
              u.user,
              this.user(id).name + " mentioned you in " + r.name,
            );
          } catch {}
        }
      }
      return result;
    }
    if (type === "activityVisibility") {
      check(audiences.includes(d.visibility), "Choose an audience.");
      this.run(
        "UPDATE activities SET visibility=? WHERE user=? AND id=?",
        d.visibility,
        id,
        d.id,
      );
      return;
    }
    if (type === "activitySave") {
      check(
        ACTIVITIES.includes(d.kind) && audiences.includes(d.visibility),
        "Choose an activity and audience.",
      );
      const start = Number(d.start),
        end = Number(d.end);
      check(
        Number.isSafeInteger(start) &&
          Number.isSafeInteger(end) &&
          start >= 0 &&
          end > start &&
          end <= this.now(),
        "History must end after it starts, and cannot be in the future.",
      );
      if (d.id)
        check(
          this.get(
            "SELECT 1 FROM activities WHERE id=? AND user=? AND end IS NOT NULL",
            d.id,
            id,
          ),
          "Only your completed activity can be edited.",
        );
      check(
        !this.get(
          "SELECT 1 FROM activities WHERE user=? AND id<>? AND start<? AND COALESCE(end,?)>?",
          id,
          d.id || "",
          end,
          this.now(),
          start,
        ),
        "Activity periods cannot overlap.",
      );
      if (d.id)
        this.run(
          "UPDATE activities SET kind=?,start=?,end=?,visibility=?,automatic=0 WHERE id=?",
          d.kind,
          start,
          end,
          d.visibility,
          d.id,
        );
      else
        this.run(
          "INSERT INTO activities(id,user,kind,start,end,visibility,automatic) VALUES(?,?,?,?,?,?,0)",
          randomUUID(),
          id,
          d.kind,
          start,
          end,
          d.visibility,
        );
      return;
    }
    if (type === "moderate") {
      const r = this.room(id, d.room);
      const role = this.role(id, r.home, r.id);
      check(
        ["owner", "admin", "moderator"].includes(role),
        "Moderator permission required.",
      );
      const rank = { member: 0, moderator: 1, admin: 2, owner: 3 };
      check(
        d.user !== id && rank[role] > rank[this.role(d.user, r.home, r.id)],
        "You cannot moderate an equal or higher role.",
      );
      this.user(d.user);
      check(
        ["timeout", "kick", "ban", "mute", "unban"].includes(d.action),
        "Choose a moderation action.",
      );
      this.tx(() => {
        if (d.action === "unban")
          this.run("DELETE FROM bans WHERE home=? AND user=?", r.home, d.user);
        else if (d.action === "ban") {
          check(
            ["owner", "admin", "moderator"].includes(this.role(id, r.home)),
            "A room role cannot ban from the whole home.",
          );
          this.run("INSERT OR IGNORE INTO bans VALUES(?,?)", r.home, d.user);
        } else if (d.action === "timeout" || d.action === "kick") {
          const minutes = d.action === "kick" ? 1 : Number(d.minutes);
          check(
            Number.isInteger(minutes) && minutes >= 1 && minutes <= 1440,
            "Timeout must be 1–1440 minutes.",
          );
          this.run(
            "INSERT INTO restrictions VALUES(?,?,?,?,?) ON CONFLICT(home,room,user,kind) DO UPDATE SET until=excluded.until",
            r.home,
            r.id,
            d.user,
            d.action,
            this.now() + minutes * 60000,
          );
        }
        const target = this.presence.get(d.user);
        if (
          target?.room === r.id ||
          (d.action === "ban" &&
            this.get("SELECT home FROM rooms WHERE id=?", target?.room || "")
              ?.home === r.home)
        ) {
          if (d.action === "mute") {
            target.muted = true;
            target.speaker = false;
            target.moderatorMuted = true;
          }
          if (["kick", "ban"].includes(d.action)) {
            this.endInteraction(d.user, false);
            Object.assign(target, {
              room: null,
              path: [],
              voice: false,
              voiceClient: null,
              video: false,
            });
            const a = this.get(
              "SELECT automatic FROM activities WHERE user=? AND end IS NULL",
              d.user,
            );
            if (a?.automatic) this.stopActivity(d.user);
          }
        }
        this.audit(
          r.home,
          id,
          d.user,
          `${d.action} [${r.id}] ${clean(d.reason, 200)}`,
        );
        this.notify(
          d.user,
          "Moderation: " + d.action + " in " + this.home(r.home).name,
        );
      });
      return;
    }
    if (type === "shareItem") {
      check(["donate", "lend"].includes(d.mode), "Choose donate or lend.");
      const i = this.get("SELECT * FROM items WHERE id=?", d.item);
      check(
        i?.owner_type === "user" && i.owner === id && !i.loan && !i.starter,
        "Choose your available furniture.",
      );
      check(
        !["sage", "rose"].includes(i.asset),
        "Finishes are personal reusable unlocks.",
      );
      check(
        this.canHome(id, this.home(d.home)) &&
          this.get("SELECT 1 FROM members WHERE home=? AND user=?", d.home, id),
        "Join the receiving home first.",
      );
      check(
        !this.get("SELECT 1 FROM item_offers WHERE item=?", i.id),
        "This item already has an offer.",
      );
      this.run(
        "INSERT INTO item_offers VALUES(?,?,?,?,?,?)",
        randomUUID(),
        i.id,
        id,
        d.home,
        d.mode,
        this.now(),
      );
      this.notify(
        this.home(d.home).owner,
        "A furniture " + d.mode + " offer awaits review.",
      );
      return;
    }
    if (type === "offerDecision") {
      const o = this.get("SELECT * FROM item_offers WHERE id=?", d.offer);
      check(o, "Offer unavailable.");
      if (d.decision === "cancel")
        check(o.sender === id, "Only the sender can cancel.");
      else this.owner(id, o.home);
      check(
        ["accept", "reject", "cancel"].includes(d.decision),
        "Choose a decision.",
      );
      this.tx(() => {
        if (d.decision === "accept") {
          check(
            this.canHome(o.sender, this.home(o.home)) &&
              this.get(
                "SELECT 1 FROM members WHERE home=? AND user=?",
                o.home,
                o.sender,
              ),
            "The sender no longer has access to this home.",
          );
          const i = this.get("SELECT * FROM items WHERE id=?", o.item);
          check(
            i?.owner_type === "user" && i.owner === o.sender && !i.loan,
            "Item is no longer available.",
          );
          this.clearPlacement(i.id);
          if (o.mode === "lend")
            this.run("UPDATE items SET loan=? WHERE id=?", o.home, i.id);
          else {
            this.run(
              "UPDATE items SET owner_type='home',owner=?,loan=NULL WHERE id=?",
              o.home,
              i.id,
            );
            this.run(
              "INSERT OR REPLACE INTO item_origins VALUES(?,?)",
              i.id,
              o.sender,
            );
          }
        }
        this.run("DELETE FROM item_offers WHERE id=?", o.id);
        this.notify(o.sender, "Furniture offer: " + d.decision);
      });
      return;
    }
    if (type === "returnItem") {
      const i = this.get("SELECT * FROM items WHERE id=?", d.item);
      check(i?.loan, "Item is not on loan.");
      if (i.owner !== id) this.owner(id, i.loan);
      this.tx(() => {
        this.clearPlacement(i.id);
        this.run("UPDATE items SET loan=NULL WHERE id=?", i.id);
      });
      return;
    }
    if (type === "transferHome") {
      const h = this.home(d.home);
      check(h.owner === id, "Only the owner can transfer the home.");
      check(
        d.user !== id &&
          this.get(
            "SELECT 1 FROM members WHERE home=? AND user=?",
            h.id,
            d.user,
          ) &&
          this.user(d.user).band === h.band,
        "Choose an eligible member.",
      );
      this.run(
        "INSERT OR REPLACE INTO succession VALUES(?,?,?)",
        h.id,
        id,
        d.user,
      );
      this.notify(d.user, "A home ownership transfer awaits your acceptance.");
      return;
    }
    if (type === "transferDecision") {
      const t = this.get("SELECT * FROM succession WHERE home=?", d.home);
      check(
        t?.recipient === id && this.home(d.home).owner === t.sender,
        "Transfer unavailable.",
      );
      check(this.canHome(id, this.home(d.home)), "Home access denied.");
      this.tx(() => {
        if (d.accept)
          this.run("UPDATE homes SET owner=? WHERE id=?", id, d.home);
        this.run("DELETE FROM succession WHERE home=?", d.home);
        this.audit(
          d.home,
          id,
          t.sender,
          d.accept ? "ownership accepted" : "ownership declined",
        );
      });
      return;
    }
    if (type === "deleteHome") {
      const h = this.home(d.home);
      check(
        h.owner === id && d.confirm === h.name,
        "Type the home name to confirm permanent deletion.",
      );
      this.tx(() => this.retireHome(h.id));
      return;
    }
    const result = handle.call(this, id, type, d, client);
    if (type === "friend" && d.user)
      this.notify(d.user, this.user(id).name + " updated a friend request.");
    return result;
  };
  World.prototype.snapshot = function (id) {
    const s = snapshot.call(this, id),
      prefs = this.prefs(id);
    s.me.preferences = prefs;
    s.me.operator = this.operator(id);
    s.notifications = this.all(
      "SELECT * FROM notifications WHERE user=? ORDER BY time DESC LIMIT 100",
      id,
    );
    s.blocks = this.all(
      "SELECT b.target,u.name FROM blocks b JOIN users u ON b.target=u.id WHERE b.user=?",
      id,
    );
    const details = (h) =>
      this.get("SELECT * FROM home_details WHERE home=?", h.id) || {
        rules: "Be kind. Respect privacy. Follow moderator guidance.",
        listing: h.public ? "approved" : "private",
        region: "Asia",
      };
    for (const h of s.homes) {
      Object.assign(h, details(h));
      h.favourite = !!this.get(
        "SELECT 1 FROM favourites WHERE user=? AND home=?",
        id,
        h.id,
      );
    }
    s.homes.sort(
      (a, b) =>
        Number(b.favourite) - Number(a.favourite) ||
        Number(b.member) - Number(a.member),
    );
    const managed = s.homes
      .filter((h) => ["owner", "admin"].includes(h.role))
      .map((h) => h.id);
    s.items = this.all("SELECT * FROM items").filter(
      (i) =>
        (i.owner_type === "user" && i.owner === id) ||
        (i.owner_type === "home" && managed.includes(i.owner)) ||
        (i.loan && managed.includes(i.loan)),
    );
    s.offers = this.all(
      "SELECT o.*,i.asset,u.name FROM item_offers o JOIN items i ON o.item=i.id JOIN users u ON o.sender=u.id",
    ).filter((o) => o.sender === id || managed.includes(o.home));
    s.transfers = this.all(
      "SELECT * FROM succession WHERE sender=? OR recipient=?",
      id,
      id,
    );
    s.directMessages = this.all(
      "SELECT * FROM direct_messages WHERE sender=? OR recipient=? ORDER BY time DESC LIMIT 200",
      id,
      id,
    )
      .filter((m) =>
        this.acceptedFriend(id, m.sender === id ? m.recipient : m.sender),
      )
      .reverse();
    for (const f of s.friends) f.username = this.user(f.other).username;
    const room = s.room;
    if (room) {
      for (const m of room.messages) {
        Object.assign(
          m,
          this.get(
            "SELECT reply,edited,deleted FROM message_details WHERE message=?",
            m.id,
          ) || {},
        );
        m.reactions = this.all(
          "SELECT emoji,user FROM reactions WHERE message=?",
          m.id,
        ).filter((r) => !this.blocked(id, r.user));
        if (m.reply) {
          const reply = this.get(
            "SELECT m.body,m.user,u.name FROM messages m JOIN users u ON m.user=u.id WHERE m.id=? AND m.room=?",
            m.reply,
            room.id,
          );
          m.replyPreview =
            reply && !this.blocked(id, reply.user)
              ? { name: reply.name, body: reply.body.slice(0, 100) }
              : null;
        }
      }
      for (const person of room.people) {
        person.personalMuted = !!this.get(
          "SELECT 1 FROM personal_mutes WHERE user=? AND target=?",
          id,
          person.id,
        );
        person.role = this.role(person.id, room.home, room.id);
        person.username = this.user(person.id).username;
        const a = this.get(
          "SELECT * FROM activities WHERE user=? AND end IS NULL",
          person.id,
        );
        person.activity = null;
        if (
          a &&
          !this.blocked(id, person.id) &&
          room.access !== "selected" &&
          (person.id === id ||
            a.visibility === "public" ||
            (a.visibility === "friends" &&
              this.acceptedFriend(id, person.id)) ||
            (a.visibility === "home" &&
              this.get(
                "SELECT 1 FROM members WHERE home=? AND user=?",
                room.home,
                id,
              )))
        )
          person.activity = a.kind;
      }
      if (["owner", "admin", "moderator"].includes(room.role))
        s.audit = this.all(
          "SELECT * FROM moderation_log WHERE home=? ORDER BY time DESC LIMIT 100",
          room.home,
        ).filter(
          (a) =>
            ["owner", "admin", "moderator"].includes(
              this.role(id, room.home),
            ) || a.action.includes("[" + room.id + "]"),
        );
    }
    if (room && ["owner", "admin"].includes(room.role))
      room.selectedUsers = this.all(
        "SELECT user FROM room_access WHERE room=?",
        room.id,
      ).map((v) => v.user);
    if (s.scene)
      for (const person of s.scene.people) {
        person.avatar = this.prefs(person.id);
        person.gestureUntil = this.presence.get(person.id)?.gestureUntil || 0;
      }
    if (s.me.operator) {
      s.listingQueue = this.all(
        "SELECT h.*,d.rules,d.listing FROM homes h JOIN home_details d ON h.id=d.home WHERE d.listing='pending'",
      );
      s.reports = this.all(
        "SELECT r.*,v.resolution FROM reports r LEFT JOIN report_reviews v ON r.id=v.report ORDER BY r.time DESC LIMIT 100",
      );
    }
    return s;
  };
}
