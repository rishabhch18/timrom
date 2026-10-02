// Resolve keyboard steps through the same adjacent portals used by click-to-walk.
// The server still decides admission, capacity and collision rules.
export function keyboardDestination(scene, person, dx, dy) {
  const room = scene.rooms.find((r) => r.id === person.room);
  const x = person.x + dx,
    y = person.y + dy;
  if (!room) return null;
  if (x >= 0 && y >= 0 && x < room.width && y < room.height)
    return { room: room.id, x, y };
  for (const door of scene.portals) {
    const sides = [
      [door.a, door.ax, door.ay, door.b, door.bx, door.by],
      [door.b, door.bx, door.by, door.a, door.ax, door.ay],
    ];
    for (const [from, fx, fy, to, tx, ty] of sides) {
      const next = scene.rooms.find((r) => r.id === to);
      if (
        from === room.id &&
        fx === person.x &&
        fy === person.y &&
        next &&
        next.ox + tx === room.ox + x &&
        next.oy + ty === room.oy + y
      )
        return { room: to, x: tx, y: ty };
    }
  }
  return null;
}
