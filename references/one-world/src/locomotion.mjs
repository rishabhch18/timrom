// Two-bone sagittal-plane IK. Angles use Three.js X rotation: +X sends a downward limb backward.
export function solveLeg(z, y, upper = 0.35, lower = 0.41) {
  const distance = Math.min(
    upper + lower - 1e-6,
    Math.max(Math.abs(upper - lower) + 1e-6, Math.hypot(z, y)),
  );
  const clamp = (n) => Math.max(-1, Math.min(1, n));
  const knee =
    Math.PI -
    Math.acos(
      clamp(
        (upper * upper + lower * lower - distance * distance) /
          (2 * upper * lower),
      ),
    );
  const hip =
    Math.atan2(-z, -y) -
    Math.acos(
      clamp(
        (upper * upper + distance * distance - lower * lower) /
          (2 * upper * distance),
      ),
    );
  return { hip, knee, ankle: -hip - knee };
}
export function walkingFoot(distance, side) {
  const cycle = (((distance / 1.3 + side * 0.5) % 1) + 1) % 1;
  if (cycle < 0.5) return { z: 0.325 - 1.3 * cycle, lift: 0 };
  const t = (cycle - 0.5) * 2,
    s = t * t * (3 - 2 * t);
  return { z: -0.325 + 0.65 * s, lift: 0.1 * Math.sin(Math.PI * t) };
}
