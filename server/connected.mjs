const check = (ok, message) => {
  if (!ok) throw Error(message);
};
export const ACTIONS = {
  chair: ["sit"],
  sofa: ["sit", "rest"],
  bed: ["rest", "sleep"],
  desk: ["study", "work"],
  counter: ["eat"],
};
export function migrateConnected(w) {
  for (const [table, column, def] of [
    ["users", "furniture_auto", "INTEGER DEFAULT 0"],
    ["users", "voice_follow", "INTEGER DEFAULT 0"],
    ["rooms", "locked", "INTEGER DEFAULT 0"],
  ])
    if (!w.all(`PRAGMA table_info(${table})`).some((c) => c.name === column))
      w.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
}
export function installConnected(World) {
  const baseJoin = World.prototype.join;
  World.prototype.join = function (id, room) {
    check(!this.room(id, room).locked, "This room is locked.");
    const p = this.presence.get(id),
      r = this.room(id, room);
    check(
      p?.room === room || !r.capacity || this.count(room) < r.capacity,
      "This room is full. Try another room.",
    );
    if (p?.room !== room) this.endInteraction(id, false);
    return baseJoin.call(this, id, room);
  };
  const baseHandle = World.prototype.handle,
    baseStep = World.prototype.step,
    baseSnapshot = World.prototype.snapshot,
    baseClear = World.prototype.clearPlacement;
  World.prototype.layout = function (home) {
    return this.all(
      "SELECT * FROM rooms WHERE home=? ORDER BY rowid",
      home,
    ).map((r, i) => ({
      ...r,
      ox: (i % 2) * 12,
      oy: Math.floor(i / 2) * 9,
      index: i,
    }));
  };
  World.prototype.portals = function (home) {
    const rooms = this.layout(home),
      links = [];
    for (const r of rooms) {
      const right = rooms.find((v) => v.ox === r.ox + 12 && v.oy === r.oy),
        down = rooms.find((v) => v.ox === r.ox && v.oy === r.oy + 9);
      if (right)
        links.push({ a: r.id, ax: 11, ay: 4, b: right.id, bx: 0, by: 4 });
      if (down) links.push({ a: r.id, ax: 5, ay: 8, b: down.id, bx: 5, by: 0 });
    }
    return links;
  };
  World.prototype.walkPath = function (id, room, x, y) {
    const p = this.presence.get(id),
      target = this.room(id, room),
      start = this.room(id, p.room);
    check(
      start.home === target.home,
      "Use the globe or an invitation to visit another home.",
    );
    check(
      Number.isInteger(x) &&
        Number.isInteger(y) &&
        x >= 0 &&
        x < target.width &&
        y >= 0 &&
        y < target.height,
      "Choose a floor tile.",
    );
    const rooms = this.layout(start.home),
      portals = this.portals(start.home),
      key = (r, x, y) => `${r}:${x}:${y}`;
    const obstacles = new Set(
      this.all(
        "SELECT i.* FROM items i JOIN rooms r ON i.room=r.id WHERE r.home=?",
        start.home,
      ).map((i) => key(i.room, i.x, i.y)),
    );
    for (const [u, v] of this.presence)
      if (u !== id && v.room) obstacles.add(key(v.room, v.x, v.y));
    const canEnter = (r) => {
      try {
        this.room(id, r.id);
        return true;
      } catch {
        return false;
      }
    };
    const allowed = new Set(
      rooms
        .filter(
          (r) =>
            r.id === p.room ||
            (canEnter(r) &&
              !r.locked &&
              (r.capacity === 0 || this.count(r.id) < r.capacity)),
        )
        .map((r) => r.id),
    );
    const entry = key(p.room, p.x, p.y),
      finish = key(room, x, y),
      prev = new Map([[entry, null]]),
      nodes = new Map([[entry, [p.room, p.x, p.y]]]),
      q = [entry];
    for (let cursor = 0; cursor < q.length; cursor++) {
      const k = q[cursor],
        [r, a, b] = nodes.get(k);
      if (k === finish) {
        const path = [];
        let current = k;
        while (prev.get(current) !== null) {
          path.unshift(nodes.get(current));
          current = prev.get(current);
        }
        return path;
      }
      const next = [
        [r, a + 1, b],
        [r, a - 1, b],
        [r, a, b + 1],
        [r, a, b - 1],
      ];
      for (const d of portals) {
        if (d.a === r && d.ax === a && d.ay === b) next.push([d.b, d.bx, d.by]);
        if (d.b === r && d.bx === a && d.by === b) next.push([d.a, d.ax, d.ay]);
      }
      for (const n of next) {
        const [nr, nx, ny] = n,
          nk = key(...n);
        if (
          nx >= 0 &&
          nx < rooms.find((v) => v.id === nr).width &&
          ny >= 0 &&
          ny < rooms.find((v) => v.id === nr).height &&
          allowed.has(nr) &&
          !obstacles.has(nk) &&
          !prev.has(nk)
        ) {
          prev.set(nk, k);
          nodes.set(nk, n);
          q.push(nk);
        }
      }
    }
    return null;
  };
  World.prototype.endInteraction = function (id, resume = true) {
    const p = this.presence.get(id);
    if (!p) return;
    p.action = null;
    p.seat = null;
    if (
      this.get(
        "SELECT automatic FROM activities WHERE user=? AND end IS NULL",
        id,
      )?.automatic === 2
    ) {
      this.stopActivity(id);
      if (resume && this.user(id).auto && p.room)
        this.startActivity(id, this.room(id, p.room).kind, 1);
    }
  };
  World.prototype.finishInteraction = function (id) {
    const p = this.presence.get(id),
      a = p.action;
    if (!a) return;
    const item = this.get("SELECT * FROM items WHERE id=?", a.item);
    if (
      !item ||
      item.room !== p.room ||
      [...this.presence.entries()].some(
        ([u, v]) =>
          u !== id && v.action?.item === a.item && v.action.phase === "active",
      )
    ) {
      this.endInteraction(id);
      return;
    }
    a.phase = "active";
    p.seat = item.id;
    if (this.user(id).furniture_auto) {
      const kind = {
        sit: "Resting",
        rest: "Resting",
        sleep: "Sleeping",
        study: "Studying",
        work: "Working",
        eat: "Eating",
      }[a.kind];
      this.startActivity(id, kind, 2);
    }
  };
  World.prototype.validateLayout = function (room) {
    const items = this.all("SELECT * FROM items WHERE room=?", room),
      blocked = new Set(items.map((i) => i.x + "," + i.y));
    const visited = new Set(["5,7"]),
      queue = [[5, 7]];
    for (let k = 0; k < queue.length; k++) {
      const [x, y] = queue[k];
      for (const [nx, ny] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ]) {
        const key = nx + "," + ny;
        if (
          nx >= 0 &&
          nx < rooms.find((v) => v.id === nr).width &&
          ny >= 0 &&
          ny < rooms.find((v) => v.id === nr).height &&
          !blocked.has(key) &&
          !visited.has(key)
        ) {
          visited.add(key);
          queue.push([nx, ny]);
        }
      }
    }
    for (const [x, y] of [
      [0, 4],
      [11, 4],
      [5, 0],
      [5, 8],
    ])
      check(visited.has(x + "," + y), "Keep every doorway reachable.");
    for (const item of items)
      if (ACTIONS[item.asset])
        check(
          visited.has(item.x + "," + (item.y + 1)),
          "Keep every furniture approach reachable.",
        );
    for (const p of this.presence.values())
      if (p.room === room)
        check(
          visited.has(p.x + "," + p.y),
          "That placement blocks an occupant from the exit.",
        );
  };
  World.prototype.handle = function (id, type, d = {}, client = null) {
    const p = this.presence.get(id);
    check(p, "Connect first.");
    if (
      [
        "move",
        "interact",
        "stand",
        "furnitureAuto",
        "voiceFollow",
        "lock",
      ].includes(type)
    )
      this.limit(id, "connected", 60, 1000);
    if (type === "furnitureAuto" || type === "voiceFollow") {
      const col = type === "furnitureAuto" ? "furniture_auto" : "voice_follow";
      this.run(`UPDATE users SET ${col}=? WHERE id=?`, d.enabled ? 1 : 0, id);
      if (
        type === "furnitureAuto" &&
        !d.enabled &&
        this.get(
          "SELECT automatic FROM activities WHERE user=? AND end IS NULL",
          id,
        )?.automatic === 2
      ) {
        this.stopActivity(id);
        if (this.user(id).auto && p.room)
          this.startActivity(id, this.room(id, p.room).kind, 1);
      }
      return true;
    }
    if (type === "lock") {
      const r = this.room(id, d.room);
      this.owner(id, r.home);
      this.run("UPDATE rooms SET locked=? WHERE id=?", d.locked ? 1 : 0, r.id);
      return true;
    }
    if (type === "friendByUsername") {
      this.limit(id, "friend-lookup", 10, 60000);
      const name = String(d.username || "")
        .replace(/^@/, "")
        .toLowerCase();
      const other = this.get(
        "SELECT user FROM credentials WHERE username=?",
        name,
      );
      check(
        other &&
          other.user !== id &&
          this.user(other.user).band === this.user(id).band &&
          !this.blocked(id, other.user),
        "No available account with that username in your age group.",
      );
      return baseHandle.call(this, id, "friend", { user: other.user }, client);
    }
    if (type === "stand") {
      this.endInteraction(id);
      p.path = [];
      return true;
    }
    if (type === "move" || type === "interact") {
      check(p.room, "Enter a home first.");
      let room = d.room || p.room,
        x = d.x,
        y = d.y,
        item;
      if (type === "interact") {
        item = this.get("SELECT * FROM items WHERE id=?", d.item);
        check(
          item?.room && ACTIONS[item.asset]?.includes(d.action),
          "That action is not available.",
        );
        check(
          ![...this.presence.entries()].some(
            ([u, v]) => u !== id && v.action?.item === item.id,
          ),
          "Someone is already using or approaching this object.",
        );
        room = item.room;
        x = item.x;
        y = item.y + 1;
        check(
          y < this.room(id, room).height,
          "Leave one free tile in front of usable furniture.",
        );
      }
      const path = this.walkPath(id, room, x, y);
      check(
        path,
        "No open route. A room may be full, locked, or the path blocked.",
      );
      this.endInteraction(id);
      p.notice = null;
      p.path = path;
      if (item) {
        p.action = { item: item.id, kind: d.action, phase: "approach" };
        if (!path.length) this.finishInteraction(id);
      }
      return true;
    }
    if (
      type === "join" &&
      p.room &&
      this.room(id, p.room).home === this.room(id, d.room).home &&
      p.room !== d.room
    )
      return this.handle(id, "move", { room: d.room, x: 5, y: 7 }, client);
    if (type === "join")
      check(!this.room(id, d.room).locked, "This room is locked.");
    if (type === "place") {
      const r = this.room(id, d.room),
        item = this.get("SELECT * FROM items WHERE id=?", d.item);
      check(
        ![...this.presence.values()].some((v) => v.action?.item === d.item),
        "Wait until this furniture is no longer in use.",
      );
      // Reserve every possible doorway, including openings needed by rooms added later.
      check(
        ![
          [0, 4],
          [11, 4],
          [5, 0],
          [5, 8],
          [1, 4],
          [10, 4],
          [5, 1],
          [5, 7],
        ].some(([x, y]) => x === d.x && y === d.y),
        "Keep doorways and their approaches clear.",
      );
      if (ACTIONS[item?.asset])
        check(
          d.y < r.height - 1,
          "Usable furniture needs a free approach tile.",
        );
      const future = this.all(
        "SELECT * FROM items WHERE room=? AND id<>?",
        r.id,
        d.item,
      ).concat({ ...item, x: d.x, y: d.y });
      for (const i of future)
        if (ACTIONS[i.asset])
          check(
            !future.some(
              (j) => j.id !== i.id && j.x === i.x && j.y === i.y + 1,
            ),
            "Keep furniture approach tiles clear.",
          );
    }
    if (
      type === "auto" &&
      this.get(
        "SELECT automatic FROM activities WHERE user=? AND end IS NULL",
        id,
      )?.automatic === 2
    ) {
      this.run("UPDATE users SET auto=? WHERE id=?", d.enabled ? 1 : 0, id);
      return true;
    }
    if (type === "leave") this.endInteraction(id, false);
    return baseHandle.call(this, id, type, d, client);
  };
  World.prototype.step = function () {
    // New movement carries room IDs; legacy paths remain usable by saved test fixtures.
    const legacy = [];
    for (const [id, p] of this.presence) {
      if (!p.path.length) continue;
      if (p.path[0].length === 2) {
        legacy.push([p, p.path]);
        continue;
      }
      const [r, x, y] = p.path[0],
        target = this.get("SELECT * FROM rooms WHERE id=?", r);
      try {
        this.room(id, r);
      } catch {
        p.path = [];
        this.endInteraction(id);
        p.notice = "Access changed; choose another destination.";
        continue;
      }
      if (
        [...this.presence.entries()].some(
          ([u, v]) => u !== id && v.room === r && v.x === x && v.y === y,
        ) ||
        this.get("SELECT 1 FROM items WHERE room=? AND x=? AND y=?", r, x, y) ||
        (r !== p.room &&
          (target.locked ||
            (target.capacity > 0 && this.count(r) >= target.capacity)))
      ) {
        p.path = [];
        this.endInteraction(id);
        p.notice =
          "The route changed. Entry is blocked; choose another destination.";
        continue;
      }
      if (r !== p.room) {
        const follow = p.voice && this.user(id).voice_follow;
        const canCall =
          [...this.presence.values()].filter((v) => v.room === r && v.voice)
            .length < (this.mediaMode === "livekit" ? 100 : 6);
        if (!follow || !canCall) {
          p.voice = false;
          p.voiceClient = null;
          p.video = false;
          p.muted = true;
          if (follow && !canCall)
            p.notice =
              "This room’s call is full. You entered with voice disconnected.";
        }
        p.room = r;
        p.text = false;
        p.engaged = 0;
        if (this.user(id).auto) this.startActivity(id, target.kind, 1);
      }
      p.path.shift();
      p.x = x;
      p.y = y;
      if (!p.path.length && p.action) this.finishInteraction(id);
    }
    if (legacy.length) {
      const modern = [...this.presence.values()]
        .filter((p) => p.path[0]?.length === 3)
        .map((p) => [p, p.path]);
      for (const [p] of modern) p.path = [];
      baseStep.call(this);
      for (const [p, path] of modern) p.path = path;
    }
  };
  World.prototype.clearPlacement = function (item) {
    for (const [id, p] of this.presence)
      if (p.action?.item === item) {
        this.endInteraction(id);
        p.path = [];
      }
    return baseClear.call(this, item);
  };
  World.prototype.snapshot = function (id) {
    const s = baseSnapshot.call(this, id),
      p = this.presence.get(id);
    s.notice = p?.notice || null;
    const c = this.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='credentials'",
    )
      ? this.get(
          "SELECT username,email,phone,verification_mode FROM credentials WHERE user=?",
          id,
        )
      : null;
    s.me.account = c
      ? {
          username: c.username,
          email: c.email,
          phone: c.phone,
          verificationMode: c.verification_mode,
        }
      : null;
    if (s.room) {
      s.scene = {
        home: s.room.home,
        rooms: this.layout(s.room.home).map((r) => ({
          ...r,
          count: this.count(r.id),
          items: this.all("SELECT * FROM items WHERE room=?", r.id),
        })),
        portals: this.portals(s.room.home),
        people: [],
      };
      for (const [u, v] of this.presence)
        if (
          s.scene.rooms.some((r) => r.id === v.room) &&
          !this.blocked(id, u)
        ) {
          const user = this.user(u);
          s.scene.people.push({
            id: u,
            name: user.name,
            username: user.username,
            color: user.color,
            body: user.body,
            room: v.room,
            x: v.x,
            y: v.y,
            moving: !!v.path.length,
            action: v.action || null,
            seat: v.seat,
          });
        }
    }
    return s;
  };
}
