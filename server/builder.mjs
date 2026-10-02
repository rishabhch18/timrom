import { approach } from "../src/shared/furniture.mjs";
import { randomUUID } from "node:crypto";
import { ACTIONS } from "./connected.mjs";
const check = (v, m) => {
  if (!v) throw Error(m);
};
export function migrateBuilder(w) {
  for (const [col, spec] of [
    ["ox", "INTEGER"],
    ["oy", "INTEGER"],
    ["width", "INTEGER DEFAULT 12"],
    ["height", "INTEGER DEFAULT 9"],
  ])
    if (!w.all("PRAGMA table_info(rooms)").some((c) => c.name === col))
      w.db.exec(`ALTER TABLE rooms ADD COLUMN ${col} ${spec}`);
  w.db.exec(
    `CREATE TABLE IF NOT EXISTS layouts(home TEXT PRIMARY KEY,revision INTEGER DEFAULT 0,doors TEXT NOT NULL);`,
  );
}
export function installBuilder(World) {
  const handle = World.prototype.handle,
    snapshot = World.prototype.snapshot,
    join = World.prototype.join;
  World.prototype.join = function (id, rid) {
    const previous = this.presence.get(id)?.room;
    join.call(this, id, rid);
    if (previous === rid) return;
    const p = this.presence.get(id),
      r = this.room(id, rid);
    const blocked = new Set(
      this.all("SELECT * FROM items WHERE room=?", rid).flatMap((i) =>
        this.footprint(i).map(([x, y]) => `${x},${y}`),
      ),
    );
    for (const [u, v] of this.presence)
      if (u !== id && v.room === rid) blocked.add(`${v.x},${v.y}`);
    const candidates = [];
    for (let y = 0; y < r.height; y++)
      for (let x = 0; x < r.width; x++)
        if (!blocked.has(`${x},${y}`)) candidates.push([x, y]);
    candidates.sort(
      (a, b) =>
        Math.abs(a[0] - 5) +
        Math.abs(a[1] - 7) -
        Math.abs(b[0] - 5) -
        Math.abs(b[1] - 7),
    );
    if (candidates.length) [p.x, p.y] = candidates[0];
  };
  World.prototype.layout = function (home) {
    return this.all(
      "SELECT * FROM rooms WHERE home=? ORDER BY rowid",
      home,
    ).map((r, i) => ({
      ...r,
      ox: r.ox ?? (i % 2) * 12,
      oy: r.oy ?? Math.floor(i / 2) * 9,
      index: i,
    }));
  };
  World.prototype.portals = function (home) {
    const saved = this.get("SELECT doors FROM layouts WHERE home=?", home);
    if (saved) return JSON.parse(saved.doors);
    return adjacentDoors(this.layout(home));
  };
  World.prototype.validateLayout = function (rid) {
    const row = this.get("SELECT home FROM rooms WHERE id=?", rid);
    const r = this.layout(row.home).find((r) => r.id === rid),
      items = this.all("SELECT * FROM items WHERE room=?", rid);
    const blocked = new Set();
    for (const item of items)
      for (const [x, y] of this.footprint(item)) {
        check(
          x >= 0 && x < r.width && y >= 0 && y < r.height,
          "Store furniture outside the proposed room first.",
        );
        check(!blocked.has(`${x},${y}`), "Furniture footprints overlap.");
        blocked.add(`${x},${y}`);
      }
    const valid = (x, y) =>
      x >= 0 &&
      x < r.width &&
      y >= 0 &&
      y < r.height &&
      !blocked.has(`${x},${y}`);
    check(valid(5, 7), "Keep the entrance clear.");
    const q = [[5, 7]],
      seen = new Set(["5,7"]);
    for (let n = 0; n < q.length; n++) {
      const [x, y] = q[n];
      for (const [a, b] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ])
        if (valid(a, b) && !seen.has(`${a},${b}`)) {
          seen.add(`${a},${b}`);
          q.push([a, b]);
        }
    }
    const reachable = (x, y) => seen.has(`${x},${y}`);
    for (const i of items) {
      check(
        Number.isInteger(i.x) &&
          Number.isInteger(i.y) &&
          i.x >= 0 &&
          i.x < r.width &&
          i.y >= 0 &&
          i.y < r.height,
        "Store furniture outside the proposed room first.",
      );
      if (ACTIONS[i.asset])
        check(
          reachable(...approach(i)),
          "Keep every furniture approach reachable.",
        );
    }
    if (!this.get("SELECT 1 FROM layouts WHERE home=?", row.home))
      for (const [x, y] of [
        [0, 4],
        [11, 4],
        [5, 0],
        [5, 8],
      ])
        check(reachable(x, y), "Keep every doorway reachable.");
    for (const d of this.portals(row.home)) {
      if (d.a === rid)
        check(reachable(d.ax, d.ay), "Keep every doorway reachable.");
      if (d.b === rid)
        check(reachable(d.bx, d.by), "Keep every doorway reachable.");
    }
    for (const p of this.presence.values())
      if (p.room === rid)
        check(reachable(p.x, p.y), "That change would trap an occupant.");
  };
  World.prototype.handle = function (id, type, d = {}, client = null) {
    if (type === "publishLayout") {
      this.limit(id, "builder", 10, 60000);
      this.owner(id, d.home);
      const existing = this.layout(d.home),
        saved = this.get("SELECT revision FROM layouts WHERE home=?", d.home);
      check(
        d.revision === (saved?.revision ?? 0),
        "The home changed. Reload the draft before publishing.",
      );
      check(
        Array.isArray(d.rooms) && d.rooms.length === existing.length,
        "Add rooms before opening the draft.",
      );
      check(
        new Set(d.rooms.map((r) => r.id)).size === existing.length,
        "Each room must appear once.",
      );
      const rooms = d.rooms.map((v) => {
        const old = existing.find((r) => r.id === v.id);
        check(old, "Unknown room.");
        for (const k of ["ox", "oy", "width", "height"])
          check(Number.isInteger(v[k]), "Room geometry must use whole tiles.");
        check(
          v.ox >= 0 &&
            v.oy >= 0 &&
            v.ox <= 120 &&
            v.oy <= 120 &&
            v.width >= 8 &&
            v.width <= 24 &&
            v.height >= 9 &&
            v.height <= 24,
          "Rooms need 8–24 columns and 9–24 rows within the 120-tile site.",
        );
        return { ...old, ox: v.ox, oy: v.oy, width: v.width, height: v.height };
      });
      for (let i = 0; i < rooms.length; i++)
        for (let j = i + 1; j < rooms.length; j++) {
          const a = rooms[i],
            b = rooms[j];
          check(
            a.ox + a.width <= b.ox ||
              b.ox + b.width <= a.ox ||
              a.oy + a.height <= b.oy ||
              b.oy + b.height <= a.oy,
            "Rooms cannot overlap.",
          );
        }
      check(
        Array.isArray(d.doors) && d.doors.length <= 80,
        "Too many doorways.",
      );
      const doors = d.doors.map((v) => {
        const a = rooms.find((r) => r.id === v.a),
          b = rooms.find((r) => r.id === v.b);
        check(a && b && a !== b, "Connect two different rooms.");
        for (const k of ["ax", "ay", "bx", "by"])
          check(Number.isInteger(v[k]), "Door positions must use whole tiles.");
        check(
          v.ax >= 0 &&
            v.ax < a.width &&
            v.ay >= 0 &&
            v.ay < a.height &&
            v.bx >= 0 &&
            v.bx < b.width &&
            v.by >= 0 &&
            v.by < b.height,
          "Door outside room.",
        );
        check(
          Math.abs(a.ox + v.ax - b.ox - v.bx) +
            Math.abs(a.oy + v.ay - b.oy - v.by) ===
            1,
          "Doors must connect touching tiles on adjacent rooms.",
        );
        return { a: v.a, b: v.b, ax: v.ax, ay: v.ay, bx: v.bx, by: v.by };
      });
      const connected = new Set([rooms[0].id]);
      for (let n = 0; n < rooms.length; n++)
        for (const d of doors) {
          if (connected.has(d.a)) connected.add(d.b);
          if (connected.has(d.b)) connected.add(d.a);
        }
      check(
        connected.size === rooms.length,
        "Every room must connect to the home.",
      );
      this.tx(() => {
        for (const r of rooms) {
          const old = existing.find((v) => v.id === r.id);
          if (["ox", "oy", "width", "height"].some((k) => r[k] !== old[k]))
            check(
              ![...this.presence.values()].some((p) => p.room === r.id),
              "Ask occupants to leave a room before moving or resizing it.",
            );
          this.run(
            "UPDATE rooms SET ox=?,oy=?,width=?,height=? WHERE id=?",
            r.ox,
            r.oy,
            r.width,
            r.height,
            r.id,
          );
        }
        this.run(
          "INSERT INTO layouts VALUES(?,?,?) ON CONFLICT(home) DO UPDATE SET revision=excluded.revision,doors=excluded.doors",
          d.home,
          (saved?.revision ?? 0) + 1,
          JSON.stringify(doors),
        );
        for (const r of rooms) this.validateLayout(r.id);
        for (const [u, p] of this.presence)
          if (rooms.some((r) => r.id === p.room)) {
            p.path = [];
            if (p.action?.phase === "approach") this.endInteraction(u);
          }
      });
      return;
    }
    if (
      type === "createRoom" &&
      this.get("SELECT 1 FROM layouts WHERE home=?", d.home)
    ) {
      this.owner(id, d.home);
      const before = this.layout(d.home);
      // New rooms are attached to the rightmost room; publishing can rearrange them afterward.
      const anchor = before.reduce((a, b) =>
        a.ox + a.width > b.ox + b.width ? a : b,
      );
      this.tx(() => {
        handle.call(this, id, type, d, client);
        const added = this.layout(d.home).find(
          (r) => !before.some((v) => v.id === r.id),
        );
        this.run(
          "UPDATE rooms SET ox=?,oy=? WHERE id=?",
          anchor.ox + anchor.width,
          anchor.oy,
          added.id,
        );
        const doors = this.portals(d.home);
        doors.push({
          a: anchor.id,
          ax: anchor.width - 1,
          ay: 4,
          b: added.id,
          bx: 0,
          by: 4,
        });
        this.run(
          "UPDATE layouts SET revision=revision+1,doors=? WHERE home=?",
          JSON.stringify(doors),
          d.home,
        );
        this.validateLayout(anchor.id);
        this.validateLayout(added.id);
      });
      return;
    }
    return handle.call(this, id, type, d, client);
  };
  World.prototype.snapshot = function (id) {
    const s = snapshot.call(this, id);
    if (s.scene)
      s.scene.revision =
        this.get("SELECT revision FROM layouts WHERE home=?", s.scene.home)
          ?.revision ?? 0;
    return s;
  };
}
export function adjacentDoors(rooms) {
  const out = [];
  for (let i = 0; i < rooms.length; i++)
    for (let j = i + 1; j < rooms.length; j++) {
      let a = rooms[i],
        b = rooms[j];
      if (a.ox > b.ox) [a, b] = [b, a];
      const lo = Math.max(a.oy, b.oy),
        hi = Math.min(a.oy + a.height, b.oy + b.height);
      if (a.ox + a.width === b.ox && hi > lo) {
        const y = Math.floor((lo + hi - 1) / 2);
        out.push({
          a: a.id,
          ax: a.width - 1,
          ay: y - a.oy,
          b: b.id,
          bx: 0,
          by: y - b.oy,
        });
      }
      a = rooms[i];
      b = rooms[j];
      if (a.oy > b.oy) [a, b] = [b, a];
      const left = Math.max(a.ox, b.ox),
        right = Math.min(a.ox + a.width, b.ox + b.width);
      if (a.oy + a.height === b.oy && right > left) {
        const x = Math.floor((left + right - 1) / 2);
        out.push({
          a: a.id,
          ax: x - a.ox,
          ay: a.height - 1,
          b: b.id,
          bx: x - b.ox,
          by: 0,
        });
      }
    }
  return out;
}
