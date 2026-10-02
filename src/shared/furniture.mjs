export const TILE_SIZE = 0.65;
export const FURNITURE = {
  chair: { model: "chair", width: 0.32, tiles: [1, 1], seat: 0.36 },
  sofa: { model: "loungesofa", width: 1.25, tiles: [2, 1], seat: 0.36 },
  desk: { model: "desk", width: 1.1, tiles: [2, 2], seat: 0.35 },
  bed: { model: "beddouble", width: 1.25, tiles: [2, 3], bed: 0.38 },
  counter: { model: "kitchencabinet", width: 0.62, tiles: [1, 1] },
  plant: { model: "pottedplant", width: 0.4, tiles: [1, 1] },
  lamp: { model: "lamproundfloor", width: 0.4, tiles: [1, 1] },
};
export function rotationOf(item) {
  return (((item.rotation || 0) % 4) + 4) % 4;
}
export function dimensions(item) {
  const [w, h] = (FURNITURE[item.asset] || FURNITURE.chair).tiles;
  return rotationOf(item) % 2 ? [h, w] : [w, h];
}
export function footprint(item) {
  const [w, h] = dimensions(item),
    out = [];
  for (let x = 0; x < w; x++)
    for (let y = 0; y < h; y++) out.push([item.x + x, item.y + y]);
  return out;
}
export function approach(item) {
  const [w, h] = dimensions(item);
  return [
    [item.x + Math.floor((w - 1) / 2), item.y + h],
    [item.x + w, item.y + Math.floor((h - 1) / 2)],
    [item.x + Math.floor((w - 1) / 2), item.y - 1],
    [item.x - 1, item.y + Math.floor((h - 1) / 2)],
  ][rotationOf(item)];
}
export function center(item) {
  const [w, h] = dimensions(item);
  return [item.x + (w - 1) / 2, item.y + (h - 1) / 2];
}
