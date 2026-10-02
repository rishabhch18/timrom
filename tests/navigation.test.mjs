import test from "node:test";
import assert from "node:assert/strict";
import { keyboardDestination } from "../src/shared/navigation.mjs";
const scene = {
  rooms: [
    { id: "a", ox: 0, oy: 0, width: 12, height: 9 },
    { id: "b", ox: 12, oy: 0, width: 12, height: 9 },
  ],
  portals: [{ a: "a", ax: 11, ay: 4, b: "b", bx: 0, by: 4 }],
};
test("keyboard crosses real adjacent doorways in either direction, and stops at walls", () => {
  assert.deepEqual(
    keyboardDestination(scene, { room: "a", x: 11, y: 4 }, 1, 0),
    { room: "b", x: 0, y: 4 },
  );
  assert.deepEqual(
    keyboardDestination(scene, { room: "b", x: 0, y: 4 }, -1, 0),
    { room: "a", x: 11, y: 4 },
  );
  assert.equal(
    keyboardDestination(scene, { room: "a", x: 11, y: 3 }, 1, 0),
    null,
  );
  assert.equal(
    keyboardDestination(
      { ...scene, portals: [] },
      { room: "a", x: 11, y: 4 },
      1,
      0,
    ),
    null,
  );
  assert.deepEqual(
    keyboardDestination(scene, { room: "a", x: 9, y: 4 }, 1, 0),
    { room: "a", x: 10, y: 4 },
  );
});
