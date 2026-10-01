import test from "node:test";
import assert from "node:assert/strict";
import { diffState, applyStatePatch } from "../src/shared/state-patch.mjs";
test("snapshot deltas preserve state across movement, additions, privacy removals and home switches", () => {
  const states = [
    { room: null, homes: [] },
    {
      room: {
        id: "a",
        people: [
          { id: "a", x: 1 },
          { id: "b", x: 3 },
        ],
        messages: [],
      },
      homes: [{ id: "h", count: 2 }],
    },
    {
      room: {
        id: "a",
        people: [{ id: "a", x: 2 }],
        messages: [{ id: "m", body: "hello" }],
      },
      homes: [{ id: "h", count: 1 }],
    },
    { room: { id: "b", people: [], messages: [] }, homes: [] },
    { room: null },
  ];
  for (let i = 1; i < states.length; i++) {
    const before = structuredClone(states[i - 1]);
    assert.deepEqual(
      applyStatePatch(before, diffState(before, states[i])),
      states[i],
    );
    assert.deepEqual(before, states[i - 1]);
  }
});
test("small changes avoid resending large static state and reject prototype paths", () => {
  const a = {
      people: Array.from({ length: 100 }, (_, id) => ({
        id,
        x: 1,
        y: 2,
        name: "Member " + id,
      })),
    },
    b = structuredClone(a);
  b.people[50].x = 2;
  const patches = diffState(a, b);
  assert.ok(JSON.stringify(patches).length < 100);
  assert.throws(
    () =>
      applyStatePatch(a, [{ path: ["__proto__", "polluted"], value: true }]),
    /Invalid/,
  );
  assert.equal({}.polluted, undefined);
});
