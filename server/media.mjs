import {
  AccessToken,
  RoomServiceClient,
  TrackSource,
} from "livekit-server-sdk";
export class MediaBridge {
  constructor(
    world,
    {
      url = process.env.LIVEKIT_URL,
      key = process.env.LIVEKIT_API_KEY,
      secret = process.env.LIVEKIT_API_SECRET,
    } = {},
  ) {
    this.w = world;
    this.url = url;
    this.key = key;
    this.secret = secret;
    this.enabled = !!(url && key && secret);
    this.running = null;
    if (this.enabled)
      this.service = new RoomServiceClient(
        url.replace(/^ws/, "http"),
        key,
        secret,
      );
  }
  permission(id) {
    const p = this.w.presence.get(id);
    if (!p?.voice || !p.room) return null;
    let r;
    try {
      r = this.w.room(id, p.room);
    } catch {
      return null;
    }
    if (r.voice_mode === "disabled") return null;
    const speaker =
      r.voice_mode === "open" ||
      p.speaker ||
      ["owner", "admin", "moderator"].includes(this.w.role(id, r.home, r.id));
    const sources = [];
    if (speaker && !p.muted) sources.push(TrackSource.MICROPHONE);
    if (p.video) sources.push(TrackSource.CAMERA);
    return {
      canSubscribe: true,
      canPublish: sources.length > 0,
      canPublishSources: sources,
      canPublishData: false,
      canUpdateOwnMetadata: false,
    };
  }
  async token(id, client) {
    const p = this.w.presence.get(id);
    if (!this.enabled) throw Error("SFU is not configured.");
    if (!p?.voice || p.voiceClient !== client || p.worldClient !== client)
      throw Error("Join voice on this device first.");
    const permission = this.permission(id);
    if (!permission) throw Error("Call access denied.");
    const room = p.room;
    const at = new AccessToken(this.key, this.secret, {
      identity: id + ":" + client,
      ttl: 60,
    });
    at.addGrant({ roomJoin: true, room, ...permission });
    const token = await at.toJwt();
    if (
      p.room !== room ||
      p.voiceClient !== client ||
      p.worldClient !== client ||
      !this.permission(id)
    )
      throw Error("Call changed while connecting. Try joining again.");
    return { url: this.url, token, room };
  }
  async reconcile() {
    if (!this.enabled) return;
    if (this.running) return this.running;
    this.running = this.sync().finally(() => (this.running = null));
    return this.running;
  }
  async sync() {
    // Reconcile actual participants, including reconnects with an already-issued token.
    const rooms = await this.service.listRooms();
    for (const r of rooms) {
      const participants = await this.service.listParticipants(r.name);
      for (const remote of participants) {
        const [id, client] = remote.identity.split(":");
        const p = this.w.presence.get(id),
          perm = this.permission(id);
        if (
          !perm ||
          p.room !== r.name ||
          p.voiceClient !== client ||
          p.worldClient !== client
        ) {
          await this.service.removeParticipant(r.name, remote.identity);
          continue;
        }
        const current = remote.permission;
        const same = current && ["canSubscribe", "canPublish", "canPublishData", "canUpdateOwnMetadata"]
          .every(key => !!current[key] === perm[key]) &&
          JSON.stringify([...(current.canPublishSources || [])].sort()) === JSON.stringify([...perm.canPublishSources].sort());
        if (!same) await this.service.updateParticipant(r.name, remote.identity, { permission: perm });
      }
    }
  }
}
