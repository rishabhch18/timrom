import { SfuTransport } from "./sfu-transport";
import { Injectable, effect, inject, signal, untracked } from "@angular/core";
import { SocialService } from "./social.service";
interface Peer {
  pc: RTCPeerConnection;
  making: boolean;
  ignore: boolean;
  polite: boolean;
  queue: RTCIceCandidateInit[];
}
@Injectable({ providedIn: "root" })
export class CallService {
  readonly api = inject(SocialService);
  readonly joined = signal(false);
  readonly busy = signal(false);
  readonly muted = signal(true);
  readonly camera = signal(false);
  readonly deafened = signal(false);
  readonly local = signal<MediaStream | null>(null);
  readonly remotes = signal<{ id: string; stream: MediaStream }[]>([]);
  readonly devices = signal<MediaDeviceInfo[]>([]);
  readonly microphone = signal("");
  readonly cameraDevice = signal("");
  readonly lowBandwidth = signal(false);
  readonly outputDevice = signal("");
  readonly supportsOutput = typeof HTMLMediaElement !== "undefined" && typeof HTMLMediaElement.prototype.setSinkId === "function";
  private sfu?: SfuTransport;
  private sfuRoom = "";
  private sfuBusy = false;
  private sfuAgain = false;
  isSfu() {
    return this.api.state()?.capabilities.media === "livekit";
  }
  async refreshDevices() {
    try {
      this.devices.set(await navigator.mediaDevices.enumerateDevices());
    } catch (e) {
      this.fail(e);
    }
  }
  async chooseDevice(kind: "audio" | "video", id: string) {
    if (kind === "audio") this.microphone.set(id);
    else this.cameraDevice.set(id);
    if (kind === "audio" && !this.muted()) {
      await this.toggleMic();
      this.local()
        ?.getAudioTracks()
        .forEach((t) => {
          t.stop();
          this.local()?.removeTrack(t);
        });
      await this.toggleMic();
    }
    if (kind === "video" && this.camera()) {
      await this.toggleCamera();
      await this.toggleCamera();
    }
  }
  private async syncSfu() {
    if (!this.isSfu() || !this.joined()) return;
    if (this.sfuBusy) {
      this.sfuAgain = true;
      return;
    }
    const room = this.api.state()?.room?.id;
    if (!room) return;
    this.sfuBusy = true;
    const version = this.version;
    try {
      if (this.sfuRoom !== room) {
        const data = await this.api.command("mediaToken");
        if (version !== this.version) return;
        this.sfu ??= new SfuTransport(
          (id, stream) => {
            if (!id) {
              this.remotes.set([]);
              return;
            }
            this.remotes.update((rs) => [
              ...rs.filter((r) => r.id !== id),
              ...(stream ? [{ id, stream }] : []),
            ]);
          },
          (e) => {
            this.fail(e);
            this.stop();
            void this.api.command("voice", { join: false }).catch(() => {});
          },
        );
        await this.sfu.connect(data.url, data.token);
        if (version !== this.version) return;
        this.sfuRoom = room;
      }
      await this.sfu?.update(this.local(), this.muted(), this.camera());
    } catch (e) {
      if (version === this.version) {
        this.fail(e);
        this.stop();
        void this.api.command("voice", { join: false }).catch(() => {});
      }
    } finally {
      this.sfuBusy = false;
      if (this.sfuAgain) {
        this.sfuAgain = false;
        void this.syncSfu();
      }
    }
  }
  private peers = new Map<string, Peer>();
  private room = "";
  private paused = false;
  private attempted = "";
  private version = 0;
  constructor() {
    this.api.signalHandler = (from, data) =>
      void this.receive(
        from,
        data as {
          description?: RTCSessionDescriptionInit;
          candidate?: RTCIceCandidateInit;
        },
      );
    effect(() => {
      const s = this.api.state(),
        status = this.api.status();
      untracked(() => {
        if (!s || s.deviceActive === false || status !== "Connected") {
          this.stop();
          return;
        }
        const r = s.room;
        if (!r) {
          this.stop();
          return;
        }
        if (this.room !== r.id) {
          this.version++;
          this.sfu?.disconnect();
          this.sfuRoom = "";
          this.remotes.set([]);
          this.closePeers();
          this.room = r.id;
          this.attempted = "";
        }
        const me = r.people.find((p) => p.id === s.me.id);
        if (r.voice_mode === "disabled") {
          this.stop();
          return;
        }
        if (this.joined() && me?.voice) {
          if ((!me.speaker || me.muted) && !this.muted()) {
            this.local()
              ?.getAudioTracks()
              .forEach((t) => (t.enabled = false));
            this.muted.set(true);
          }
          const ids = r.people
            .filter((p) => p.id !== s.me.id && p.voice && !p.blocked)
            .map((p) => p.id);
          for (const id of this.peers.keys())
            if (!ids.includes(id)) this.closePeer(id);
          if (this.isSfu()) void this.syncSfu();
          else ids.forEach((id) => this.ensure(id));
        } else if (this.joined() && !me?.voice && !this.busy()) {
          this.stop();
        }
        if (
          s.me.voice_follow &&
          !this.paused &&
          !this.joined() &&
          !this.busy() &&
          this.attempted !== r.id
        ) {
          this.attempted = r.id;
          void this.join();
        }
      });
    });
  }
  private closePeer(id: string) {
    this.peers.get(id)?.pc.close();
    this.peers.delete(id);
    this.remotes.update((r) => r.filter((p) => p.id !== id));
  }
  private closePeers() {
    for (const id of this.peers.keys()) this.closePeer(id);
  }
  private stop() {
    this.version++;
    this.sfu?.disconnect();
    this.sfuRoom = "";
    this.remotes.set([]);
    this.local()
      ?.getTracks()
      .forEach((t) => t.stop());
    this.local.set(null);
    this.joined.set(false);
    this.camera.set(false);
    this.muted.set(true);
    this.closePeers();
  }
  private ensure(id: string) {
    let peer = this.peers.get(id);
    if (peer) return peer;
    const pc = new RTCPeerConnection({ iceServers: [] });
    peer = {
      pc,
      making: false,
      ignore: false,
      polite: (this.api.state()?.me.id || "") > id,
      queue: [],
    };
    const p = peer;
    this.peers.set(id, p);
    for (const kind of ["audio", "video"]) {
      const track = this.local()
        ?.getTracks()
        .find((t) => t.kind === kind);
      if (track) pc.addTrack(track, this.local()!);
      else pc.addTransceiver(kind, { direction: "sendrecv" });
    }
    pc.onicecandidate = (e) => {
      if (e.candidate) this.api.signal(id, { candidate: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => {
      const stream =
        this.remotes().find((remote) => remote.id === id)?.stream ||
        new MediaStream();
      if (!stream.getTracks().includes(e.track)) stream.addTrack(e.track);
      this.remotes.update((r) => [
        ...r.filter((p) => p.id !== id),
        { id, stream },
      ]);
    };
    pc.onnegotiationneeded = async () => {
      try {
        p.making = true;
        await pc.setLocalDescription();
        this.api.signal(id, { description: pc.localDescription });
      } catch (e) {
        if (pc.signalingState !== "closed") this.fail(e);
      } finally {
        p.making = false;
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed")
        this.api.error.set(
          "Local call could not connect. Cross-network calls need the planned relay/SFU service.",
        );
    };
    return p;
  }
  private async receive(
    from: string,
    data: {
      description?: RTCSessionDescriptionInit;
      candidate?: RTCIceCandidateInit;
    },
  ) {
    try {
      if (
        !this.joined() ||
        !this.api
          .state()
          ?.room?.people.some((p) => p.id === from && p.voice && !p.blocked)
      )
        return;
      const p = this.ensure(from),
        pc = p.pc;
      if (data.description) {
        const collision =
          data.description.type === "offer" &&
          (p.making || pc.signalingState !== "stable");
        p.ignore = !p.polite && collision;
        if (p.ignore) return;
        await pc.setRemoteDescription(data.description);
        for (const c of p.queue.splice(0)) await pc.addIceCandidate(c);
        if (data.description.type === "offer") {
          await pc.setLocalDescription();
          this.api.signal(from, { description: pc.localDescription });
        }
      } else if (data.candidate && !p.ignore) {
        if (pc.remoteDescription) await pc.addIceCandidate(data.candidate);
        else if (p.queue.length < 100) p.queue.push(data.candidate);
      }
    } catch (e) {
      this.fail(e);
    }
  }
  private fail(e: unknown) {
    this.api.error.set(e instanceof Error ? e.message : "Call failed.");
  }
  async join() {
    if (this.busy() || this.joined()) return;
    this.paused = false;
    this.busy.set(true);
    const version = this.version;
    try {
      await this.api.command("voice", {
        join: true,
        muted: true,
        video: false,
      });
      if (version !== this.version) return;
      this.local.set(new MediaStream());
      this.joined.set(true);
      this.muted.set(true);
      await this.syncSfu();
    } catch (e) {
      this.fail(e);
    } finally {
      this.busy.set(false);
    }
  }
  async leave() {
    this.paused = true;
    this.stop();
    await this.api.run("voice", { join: false });
  }
  async toggleDeafen() {
    if (this.busy()) return;
    const next = !this.deafened();
    if (next && !this.muted()) await this.toggleMic();
    this.deafened.set(next);
  }
  async toggleMic() {
    if (!this.joined() || this.busy()) return;
    const s = this.api.state(),
      me = s?.room?.people.find((p) => p.id === s.me.id);
    if (this.muted() && !me?.speaker) {
      this.api.error.set(
        "Raise your hand; a moderator can grant speaking permission.",
      );
      return;
    }
    this.busy.set(true);
    const version = this.version;
    try {
      const next = !this.muted();
      if (!next && !this.local()?.getAudioTracks().length) {
        const acquired = await navigator.mediaDevices.getUserMedia({
          audio: this.microphone()
            ? { deviceId: { exact: this.microphone() } }
            : true,
          video: false,
        });
        if (version !== this.version) {
          acquired.getTracks().forEach((t) => t.stop());
          return;
        }
        for (const track of acquired.getAudioTracks()) {
          track.enabled = false;
          this.local()!.addTrack(track);
          for (const { pc } of this.peers.values()) {
            const sender = pc
              .getTransceivers()
              .find((t) => t.receiver.track.kind === "audio")?.sender;
            if (sender) await sender.replaceTrack(track);
          }
        }
      }
      await this.api.command("voice", {
        join: true,
        muted: next,
        video: this.camera(),
      });
      if (version !== this.version) return;
      this.local()
        ?.getAudioTracks()
        .forEach((t) => (t.enabled = !next));
      this.muted.set(next);
      if (!next) this.deafened.set(false);
      await this.syncSfu();
    } catch (e) {
      this.local()
        ?.getAudioTracks()
        .forEach((t) => (t.enabled = false));
      this.muted.set(true);
      this.fail(e);
    } finally {
      this.busy.set(false);
    }
  }
  async toggleCamera() {
    if (!this.joined() || this.busy()) return;
    this.busy.set(true);
    const version = this.version;
    try {
      const next = !this.camera();
      if (next) {
        const acquired = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            width: this.lowBandwidth() ? 320 : 640,
            height: this.lowBandwidth() ? 180 : 360,
            frameRate: this.lowBandwidth() ? 12 : 24,
            ...(this.cameraDevice()
              ? { deviceId: { exact: this.cameraDevice() } }
              : {}),
          },
        });
        if (version !== this.version) {
          acquired.getTracks().forEach((t) => t.stop());
          return;
        }
        const track = acquired.getVideoTracks()[0];
        track.enabled = false;
        this.local()!.addTrack(track);
        await this.api.command("voice", {
          join: true,
          muted: this.muted(),
          video: true,
        });
        if (version !== this.version) {
          track.stop();
          return;
        }
        for (const { pc } of this.peers.values()) {
          const sender = pc
            .getTransceivers()
            .find((t) => t.receiver.track.kind === "video")?.sender;
          if (sender) await sender.replaceTrack(track);
        }
        track.enabled = true;
      } else {
        this.local()
          ?.getVideoTracks()
          .forEach((t) => {
            t.stop();
            this.local()!.removeTrack(t);
          });
        for (const { pc } of this.peers.values()) {
          const sender = pc
            .getTransceivers()
            .find((t) => t.receiver.track.kind === "video")?.sender;
          if (sender) await sender.replaceTrack(null);
        }
        await this.api.command("voice", {
          join: true,
          muted: this.muted(),
          video: false,
        });
      }
      this.camera.set(next);
      await this.syncSfu();
    } catch (e) {
      this.local()
        ?.getVideoTracks()
        .forEach((t) => {
          t.stop();
          this.local()!.removeTrack(t);
        });
      this.camera.set(false);
      this.fail(e);
    } finally {
      this.busy.set(false);
    }
  }
}
