import { useState, useRef, useEffect } from "react";
// Small local mesh. Public deployment must replace this with an SFU and TURN.
export function useCall(world) {
  const { state, command, signal, sendSignal, setError, status } = world;
  const [stream, setStream] = useState(null),
    [remotes, setRemotes] = useState({}),
    [muted, setMuted] = useState(true),
    [video, setVideo] = useState(false),
    [busy, setBusy] = useState(false);
  const local = useRef(null),
    peers = useRef(new Map()),
    room = useRef(null),
    latest = useRef(state);
  latest.current = state;
  function closePeer(id) {
    const p = peers.current.get(id);
    if (p) {
      p.pc.close();
      peers.current.delete(id);
    }
    setRemotes((r) => {
      const n = { ...r };
      delete n[id];
      return n;
    });
  }
  function stop() {
    for (const t of local.current?.getTracks() || []) t.stop();
    local.current = null;
    setStream(null);
    setVideo(false);
    setMuted(true);
    for (const id of [...peers.current.keys()]) closePeer(id);
    room.current = null;
  }
  function ensure(id) {
    if (peers.current.has(id)) return peers.current.get(id);
    const pc = new RTCPeerConnection({ iceServers: [] });
    const p = {
      pc,
      making: false,
      ignore: false,
      queue: [],
      polite: latest.current.me.id > id,
    };
    peers.current.set(id, p);
    for (const t of local.current.getTracks()) pc.addTrack(t, local.current);
    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal(id, { candidate: e.candidate });
    };
    pc.ontrack = (e) => setRemotes((r) => ({ ...r, [id]: e.streams[0] }));
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed")
        setError(
          "A peer could not connect. This local pilot has no TURN relay; try browsers on this computer.",
        );
    };
    pc.onnegotiationneeded = async () => {
      try {
        p.making = true;
        await pc.setLocalDescription();
        sendSignal(id, { description: pc.localDescription });
      } catch (e) {
        setError(e.message);
      } finally {
        p.making = false;
      }
    };
    return p;
  }
  signal.current = async (m) => {
    try {
      if (
        !local.current ||
        !latest.current?.room?.people.some(
          (p) => p.id === m.from && p.voice && !p.blocked,
        )
      )
        return;
      const p = ensure(m.from),
        { pc } = p,
        s = m.data;
      if (s.description) {
        const collision =
          s.description.type === "offer" &&
          (p.making || pc.signalingState !== "stable");
        p.ignore = !p.polite && collision;
        if (p.ignore) return;
        await pc.setRemoteDescription(s.description);
        for (const c of p.queue.splice(0)) await pc.addIceCandidate(c);
        if (s.description.type === "offer") {
          await pc.setLocalDescription();
          sendSignal(m.from, { description: pc.localDescription });
        }
      } else if (s.candidate) {
        if (p.ignore) return;
        if (pc.remoteDescription) await pc.addIceCandidate(s.candidate);
        else p.queue.push(s.candidate);
      }
    } catch (e) {
      setError("Call: " + e.message);
    }
  };
  useEffect(() => {
    if (!local.current) return;
    if (
      status !== "connected" ||
      !state.room.people.find((p) => p.id === state.me.id)?.voice
    ) {
      stop();
      return;
    }
    if (state.room.id !== room.current) {
      for (const id of [...peers.current.keys()]) closePeer(id);
      room.current = state.room.id;
    }
    const ids = state.room.people
      .filter((p) => p.id !== state.me.id && p.voice && !p.blocked)
      .map((p) => p.id);
    for (const id of peers.current.keys()) if (!ids.includes(id)) closePeer(id);
    for (const id of ids) ensure(id);
  }, [state, status]);
  useEffect(
    () => () => {
      for (const t of local.current?.getTracks() || []) t.stop();
      for (const p of peers.current.values()) p.pc.close();
    },
    [],
  );
  async function join() {
    if (busy || local.current) return;
    setBusy(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      s.getAudioTracks().forEach((t) => (t.enabled = false));
      local.current = s;
      room.current = latest.current.room.id;
      await command("voice", { join: true, muted: true, video: false });
      setStream(s);
      setMuted(true);
    } catch (e) {
      stop();
      setError(
        e.name === "NotAllowedError"
          ? "Microphone permission was not granted. Text chat is still available."
          : e.message,
      );
    } finally {
      setBusy(false);
    }
  }
  async function leave() {
    try {
      await command("voice", { join: false });
    } catch (e) {
      setError(e.message);
    } finally {
      stop();
    }
  }
  async function toggleMute() {
    const next = !muted;
    local.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
    try {
      await command("voice", { join: true, muted: next, video });
    } catch (e) {
      setError(e.message);
    }
  }
  async function toggleVideo() {
    try {
      if (video) {
        for (const t of local.current.getVideoTracks()) {
          t.stop();
          local.current.removeTrack(t);
          for (const { pc } of peers.current.values()) {
            const sender = pc.getSenders().find((s) => s.track === t);
            if (sender) pc.removeTrack(sender);
          }
        }
        setVideo(false);
      } else {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 360 },
          audio: false,
        });
        const t = s.getVideoTracks()[0];
        local.current.addTrack(t);
        for (const { pc } of peers.current.values())
          pc.addTrack(t, local.current);
        setVideo(true);
      }
      await command("voice", { join: true, muted, video: !video });
    } catch (e) {
      setError("Camera: " + e.message);
    }
  }
  return {
    stream,
    remotes,
    muted,
    video,
    busy,
    join,
    leave,
    toggleMute,
    toggleVideo,
  };
}
