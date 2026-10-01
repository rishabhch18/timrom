import test from "node:test";
import assert from "node:assert/strict";
import { MediaBridge } from "../server/media.mjs";
import { TokenVerifier, TrackSource } from "livekit-server-sdk";

function fixture() {
  const p = {
    room: "room-a",
    voice: true,
    muted: true,
    video: false,
    speaker: false,
    worldClient: "device-a",
    voiceClient: "device-a",
  };
  const room = { id: "room-a", home: "home-a", voice_mode: "moderated" };
  const w = {
    presence: new Map([["member", p]]),
    room: () => room,
    role: () => "member",
  };
  const bridge = new MediaBridge(w, {
    url: "ws://127.0.0.1:7880",
    key: "test-key",
    secret: "test-only-media-secret-with-no-live-access",
  });
  return { p, room, w, bridge };
}
test("media grants are room/device bound and listeners cannot publish audio or data", async () => {
  const { bridge, p } = fixture();
  const ticket = await bridge.token("member", "device-a");
  const claims = await new TokenVerifier(bridge.key, bridge.secret).verify(
    ticket.token,
  );
  assert.equal(claims.sub, "member:device-a");
  assert.equal(claims.video.room, "room-a");
  assert.equal(claims.video.canPublish, false);
  assert.equal(claims.video.canPublishData, false);
  assert.ok(claims.exp - claims.nbf <= 60);
  await assert.rejects(bridge.token("member", "device-b"), /device/);
  p.speaker = true;
  p.muted = false;
  assert.deepEqual(bridge.permission("member").canPublishSources, [
    TrackSource.MICROPHONE,
  ]);
  p.video = true;
  assert.deepEqual(bridge.permission("member").canPublishSources, [
    TrackSource.MICROPHONE,
    TrackSource.CAMERA,
  ]);
  p.voice = false;
  await assert.rejects(bridge.token("member", "device-a"), /Join voice/);
});
test("SFU reconciliation removes stale room/device participants and applies moderator revocation", async () => {
  const { bridge, p } = fixture(),
    removed = [],
    updated = [];
  bridge.service = {
    listRooms: async () => [{ name: "room-a" }, { name: "old-room" }],
    listParticipants: async () => [
      { identity: "member:device-a" },
      { identity: "member:stale-device" },
    ],
    removeParticipant: async (room, id) => removed.push([room, id]),
    updateParticipant: async (room, id, options) =>
      updated.push([room, id, options.permission]),
  };
  await bridge.reconcile();
  assert.equal(removed.length, 3);
  assert.equal(updated.length, 1);
  assert.equal(updated[0][2].canPublish, false);
  p.worldClient = "device-b";
  removed.length = 0;
  updated.length = 0;
  await bridge.reconcile();
  assert.equal(removed.length, 4);
  assert.equal(updated.length, 0);
});
test("access loss and unavailable media service fail closed", async () => {
  const { bridge, w } = fixture();
  w.room = () => {
    throw Error("banned");
  };
  await assert.rejects(bridge.token("member", "device-a"), /denied/);
  bridge.service = {
    listRooms: async () => {
      throw Error("unavailable");
    },
  };
  await assert.rejects(bridge.reconcile(), /unavailable/);
  assert.equal(bridge.running, null);
});
