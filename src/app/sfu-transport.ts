import type { Room as MediaRoom } from "livekit-client";
export class SfuTransport {
  private room?: MediaRoom;
  private generation = 0;
  private tracks = new Map<string, MediaStreamTrack>();
  constructor(
    private remote: (id: string, stream: MediaStream | null) => void,
    private fail: (e: unknown) => void,
  ) {}
  async connect(url: string, token: string) {
    const n = ++this.generation;
    await this.room?.disconnect(false);
    this.tracks.clear();
    const { Room, RoomEvent } = await import("livekit-client");
    if (n !== this.generation) return;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    this.room = room;
    room.on(RoomEvent.TrackSubscribed, (_track, _publication, participant) =>
      this.collect(participant.identity),
    );
    room.on(RoomEvent.TrackUnsubscribed, (_track, _publication, participant) =>
      this.collect(participant.identity),
    );
    room.on(RoomEvent.ParticipantDisconnected, (p) =>
      this.remote(p.identity.split(":")[0], null),
    );
    room.on(RoomEvent.Disconnected, () => {
      if (n === this.generation) {
        this.remote("", null);
        this.fail(new Error("Voice connection ended. Join again when ready."));
      }
    });
    await room.connect(url, token);
    if (n !== this.generation) await room.disconnect(false);
  }
  private collect(identity: string) {
    const p = this.room?.remoteParticipants.get(identity);
    if (!p) return;
    const tracks = [...p.trackPublications.values()]
      .map((p) => p.track?.mediaStreamTrack)
      .filter((t): t is MediaStreamTrack => !!t);
    this.remote(identity.split(":")[0], new MediaStream(tracks));
  }
  async update(stream: MediaStream | null, muted: boolean, camera: boolean) {
    const room = this.room;
    if (!room) return;
    const { Track } = await import("livekit-client");
    for (const kind of ["audio", "video"]) {
      const next = stream
        ?.getTracks()
        .find(
          (t) =>
            t.kind === kind &&
            t.readyState === "live" &&
            (kind === "audio" ? !muted : camera),
        );
      const old = this.tracks.get(kind);
      if (old && old !== next) {
        await room.localParticipant.unpublishTrack(old, false);
        this.tracks.delete(kind);
      }
      if (next && old !== next) {
        await room.localParticipant.publishTrack(next, {
          source:
            kind === "audio" ? Track.Source.Microphone : Track.Source.Camera,
          simulcast: true,
          videoEncoding: { maxBitrate: 500_000, maxFramerate: 24 },
        });
        this.tracks.set(kind, next);
      }
    }
  }
  disconnect() {
    this.generation++;
    void this.room?.disconnect(false);
    this.room = undefined;
    this.tracks.clear();
  }
}
