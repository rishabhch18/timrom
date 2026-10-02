import test from "node:test";
import assert from "node:assert/strict";
import { World } from "../server/engine.mjs";
import {
  footprint,
  approach,
  dimensions,
  center,
} from "../src/shared/furniture.mjs";
test("rotated bed footprints and approach anchors remain outside occupied tiles", () => {
  for (let rotation = 0; rotation < 4; rotation++) {
    const item = { asset: "bed", x: 2, y: 2, rotation };
    assert.equal(footprint(item).length, 6);
    assert.deepEqual(dimensions(item), rotation % 2 ? [3, 2] : [2, 3]);
    assert(!footprint(item).some((p) => String(p) === String(approach(item))));
    assert.deepEqual(center(item), rotation % 2 ? [3, 2.5] : [2.5, 3]);
  }
});
test("server paths avoid the full furniture footprint and approach a rotated seat from its front", (t) => {
  const w = new World(":memory:");
  t.after(() => w.close());
  const id = w.login("Furniture tester", "adult").user.id;
  w.connect(id);
  const room = w.layout("common")[0];
  w.join(id, room.id);
  const sofa = w.get(
    "SELECT * FROM items WHERE room=? AND asset='sofa'",
    room.id,
  );
  const second = footprint(sofa)[1];
  assert.throws(
    () => w.handle(id, "move", { room: room.id, x: second[0], y: second[1] }),
    /blocked/,
  );
  const chair = w.get(
    "SELECT * FROM items WHERE room=? AND asset='chair'",
    room.id,
  );
  w.run("UPDATE items SET rotation=1 WHERE id=?", chair.id);
  w.handle(id, "interact", { item: chair.id, action: "sit" });
  for (let i = 0; i < 100 && w.presence.get(id).path.length; i++) w.step();
  const p = w.presence.get(id);
  assert.deepEqual([p.x, p.y], approach({ ...chair, rotation: 1 }));
  assert.equal(p.seat, chair.id);
});

test("cross-room paths use each room dimensions, including large-room doorway tiles", (t) => {
  const w = new World(":memory:");
  t.after(() => w.close());
  const id = w.login("Route tester", "adult").user.id;
  w.connect(id);
  const [large, small] = w.layout("common");
  w.run("UPDATE rooms SET width=16,height=12,ox=0,oy=0 WHERE id=?", large.id);
  w.run("UPDATE rooms SET ox=16,oy=7 WHERE id=?", small.id);
  w.run(
    "INSERT INTO layouts(home,revision,doors) VALUES(?,?,?)",
    "common",
    0,
    JSON.stringify([
      { a: large.id, ax: 15, ay: 10, b: small.id, bx: 0, by: 3 },
    ]),
  );
  w.join(id, large.id);
  Object.assign(w.presence.get(id), { x: 14, y: 10 });
  w.handle(id, "move", { room: small.id, x: 1, y: 3 });
  assert(
    w.presence
      .get(id)
      .path.some(([r, x, y]) => r === large.id && x === 15 && y === 10),
  );
  for (let n = 0; n < 100 && w.presence.get(id).path.length; n++) w.step();
  assert.equal(w.presence.get(id).room, small.id);
});
