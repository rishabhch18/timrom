// Deltas operate only on a recipient's already-authorized snapshot. A new socket
// always receives a full snapshot; ordered WebSocket delivery supplies the base.
export function diffState(previous, next, path = [], output = []) {
  if (Object.is(previous, next)) return output;
  if (
    !previous ||
    !next ||
    typeof previous !== "object" ||
    typeof next !== "object" ||
    Array.isArray(previous) !== Array.isArray(next)
  ) {
    output.push({ path, value: next });
    return output;
  }
  if (Array.isArray(next)) {
    for (let i = 0; i < next.length; i++)
      diffState(previous[i], next[i], [...path, i], output);
    if (next.length < previous.length)
      output.push({ path: [...path, "length"], value: next.length });
  } else {
    for (const key of Object.keys(previous))
      if (!(key in next)) output.push({ path: [...path, key], remove: true });
    for (const key of Object.keys(next))
      diffState(previous[key], next[key], [...path, key], output);
  }
  return output;
}
export function applyStatePatch(state, patches) {
  let next = structuredClone(state);
  for (const patch of patches) {
    if (
      !Array.isArray(patch.path) ||
      patch.path.some((k) =>
        ["__proto__", "constructor", "prototype"].includes(k),
      )
    )
      throw Error("Invalid state update");
    if (!patch.path.length) {
      next = structuredClone(patch.value);
      continue;
    }
    let parent = next;
    for (const key of patch.path.slice(0, -1)) parent = parent[key];
    const key = patch.path.at(-1);
    if (patch.remove) delete parent[key];
    else parent[key] = structuredClone(patch.value);
  }
  return next;
}
