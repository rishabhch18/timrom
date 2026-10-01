const check = (v, m) => {
  if (!v) throw Error(m);
};
export function installDevices(World) {
  const connect = World.prototype.connect,
    disconnect = World.prototype.disconnect,
    count = World.prototype.count,
    handle = World.prototype.handle;
  World.prototype.reservationsFor = function (room) {
    this.reservations ??= new Map();
    for (const [u, r] of this.reservations) {
      if (r.expires <= this.now()) this.reservations.delete(u);
      else
        try {
          this.room(u, r.room);
        } catch {
          this.reservations.delete(u);
        }
    }
    return [...this.reservations.values()].filter((r) => r.room === room);
  };
  World.prototype.count = function (room) {
    return count.call(this, room) + this.reservationsFor(room).length;
  };
  World.prototype.connect = function (id) {
    this.reservations ??= new Map();
    const reservation = this.reservations.get(id);
    this.reservations.delete(id);
    connect.call(this, id);
    if (reservation && reservation.expires > this.now()) {
      try {
        const r = this.room(id, reservation.room);
        check(!r.locked, "Locked");
        const p = this.presence.get(id);
        p.room = r.id;
        p.x = reservation.x;
        p.y = reservation.y;
        p.last = this.now();
        if (this.user(id).auto) this.startActivity(id, r.kind, 1);
      } catch {}
    }
  };
  World.prototype.disconnect = function (id) {
    const p = this.presence.get(id);
    if (p?.connections === 1 && p.room) {
      this.reservations ??= new Map();
      this.reservations.set(id, {
        room: p.room,
        x: p.x,
        y: p.y,
        expires: this.now() + 30000,
      });
    }
    disconnect.call(this, id);
  };
  World.prototype.attachDevice = function (id, client) {
    this.connect(id);
    const p = this.presence.get(id);
    p.worldClient ??= client;
  };
  World.prototype.detachDevice = function (id, client) {
    const p = this.presence.get(id);
    if (p?.worldClient === client) {
      p.worldClient = null;
      p.voice = false;
      p.voiceClient = null;
      p.video = false;
      if (p.connections > 1 && p.room) {
        this.reservations ??= new Map();
        this.reservations.set(id, {
          room: p.room,
          x: p.x,
          y: p.y,
          expires: this.now() + 30000,
        });
        this.endInteraction(id, false);
        p.room = null;
        p.path = [];
        const a = this.get(
          "SELECT automatic FROM activities WHERE user=? AND end IS NULL",
          id,
        );
        if (a?.automatic) this.stopActivity(id);
      }
    }
    this.disconnect(id);
  };
  World.prototype.handle = function (id, type, d = {}, client = null) {
    const p = this.presence.get(id);
    check(p, "Connect first.");
    if (type === "takeoverDevice") {
      check(client, "Device required.");
      p.worldClient = client;
      p.voice = false;
      p.voiceClient = null;
      p.video = false;
      p.muted = true;
      p.path = [];
      this.endInteraction(id);
      if (!p.room) {
        const last = this.get(
          "SELECT last_room FROM users WHERE id=?",
          id,
        )?.last_room;
        const reservation = this.reservations?.get(id);
        this.reservations?.delete(id);
        if (last)
          try {
            this.join(id, last);
          } catch {
            p.notice = "Previous room is unavailable.";
          }
      }
      return;
    }
    if (client && p.worldClient)
      check(
        p.worldClient === client,
        "This world is active on another device. Take over to continue.",
      );
    return handle.call(this, id, type, d, client);
  };
}
