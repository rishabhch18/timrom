import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
export function createModels(scene) {
  const mats = new Map();
  function material(color, rough = 0.85) {
    const key = color + "|" + rough;
    if (!mats.has(key))
      mats.set(
        key,
        new THREE.MeshStandardMaterial({
          color,
          roughness: rough,
          metalness: 0,
        }),
      );
    return mats.get(key);
  }
  function mesh(geometry, color, parent = scene) {
    const m = new THREE.Mesh(geometry, material(color));
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(w, h, d, color, x = 0, y = 0, z = 0, parent = scene, r = 0.08) {
    const m = mesh(
      new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 3, h / 3, d / 3)),
      color,
      parent,
    );
    m.position.set(x, y, z);
    return m;
  }
  function sphere(r, color, x, y, z, parent = scene, sx = 1, sy = 1, sz = 1) {
    const m = mesh(new THREE.SphereGeometry(r, 28, 20), color, parent);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  }
  function cylinder(top, bottom, h, color, x, y, z, parent = scene) {
    const m = mesh(
      new THREE.CylinderGeometry(top, bottom, h, 32),
      color,
      parent,
    );
    m.position.set(x, y, z);
    return m;
  }
  function curve(points, color, r, parent = scene) {
    const g = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    return mesh(new THREE.TubeGeometry(g, 16, r, 8, false), color, parent);
  }
  function character(color = "#a5a1c4", body = "mature") {
    const root = new THREE.Group(),
      rig = new THREE.Group();
    root.add(rig);
    scene.add(root);
    const skin = "#d7a477",
      shirt = color,
      pants = "#788986",
      hair = "#483c32";
    const torso = box(0.64, 0.73, 0.37, shirt, 0, 1.23, 0, rig, 0.15);
    box(0.31, 0.18, 0.055, "#9491b5", 0, 1.06, 0.196, rig, 0.035);
    cylinder(0.09, 0.11, 0.17, skin, 0, 1.66, 0, rig);
    const head = new THREE.Group();
    head.position.set(0, 1.96, 0);
    rig.add(head);
    sphere(0.33, skin, 0, 0, 0, head, 0.95, 1.13, 0.91);
    sphere(0.072, skin, -0.3, -0.02, 0, head, 0.75, 1, 0.6);
    sphere(0.072, skin, 0.3, -0.02, 0, head, 0.75, 1, 0.6);
    sphere(0.062, skin, 0, -0.035, 0.291, head, 0.75, 0.9, 1);
    sphere(0.325, hair, 0, 0.15, -0.055, head, 1.03, 0.83, 1.05);
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * 0.08;
      sphere(
        0.11,
        hair,
        x,
        0.28 + Math.sin(i * 1.7) * 0.03,
        0.17 - Math.abs(i - 3) * 0.023,
        head,
        1.2,
        0.88,
        0.85,
      );
    }
    const eyes = [];
    for (const x of [-0.113, 0.113]) {
      const eye = new THREE.Group();
      eye.position.set(x, 0.036, 0.284);
      head.add(eye);
      sphere(0.054, "#fff6e7", 0, 0, 0, eye, 0.9, 1.13, 0.43);
      sphere(0.028, "#322e2a", 0.004, -0.003, 0.023, eye, 0.8, 1, 0.48);
      sphere(0.008, "#fffdf3", 0.011, 0.011, 0.039, eye);
      eyes.push(eye);
      curve(
        [
          [x - 0.042, 0.113, 0.28],
          [x, 0.13, 0.292],
          [x + 0.04, 0.118, 0.28],
        ],
        hair,
        0.012,
        head,
      );
    }
    curve(
      [
        [-0.055, -0.136, 0.272],
        [0, -0.151, 0.285],
        [0.055, -0.133, 0.272],
      ],
      "#9c6249",
      0.008,
      head,
    );
    for (const x of [-0.09, 0.09]) {
      curve(
        [
          [x, 1.55, 0.21],
          [x * 0.8, 1.34, 0.23],
        ],
        "#e3ddd8",
        0.009,
        rig,
      );
      sphere(0.016, "#e3ddd8", x * 0.8, 1.34, 0.23, rig);
    }
    const arms = [],
      legs = [];
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.37, 1.51, 0);
      rig.add(shoulder);
      const sleeve = mesh(
        new THREE.CapsuleGeometry(0.105, 0.22, 6, 14),
        shirt,
        shoulder,
      );
      sleeve.position.y = -0.17;
      const elbow = new THREE.Group();
      elbow.position.y = -0.36;
      shoulder.add(elbow);
      const fore = mesh(
        new THREE.CapsuleGeometry(0.083, 0.22, 6, 14),
        shirt,
        elbow,
      );
      fore.position.y = -0.135;
      sphere(0.085, skin, 0, -0.33, 0, elbow, 0.8, 1.15, 0.8);
      arms.push({ shoulder, elbow });
      const hip = new THREE.Group();
      hip.position.set(side * 0.17, 0.87, 0);
      rig.add(hip);
      const thigh = mesh(
        new THREE.CapsuleGeometry(0.123, 0.24, 6, 16),
        pants,
        hip,
      );
      thigh.position.y = -0.15;
      const knee = new THREE.Group();
      knee.position.y = -0.35;
      hip.add(knee);
      const shin = mesh(
        new THREE.CapsuleGeometry(0.105, 0.27, 6, 16),
        pants,
        knee,
      );
      shin.position.y = -0.17;
      const ankle = new THREE.Group();
      ankle.position.y = -0.41;
      knee.add(ankle);
      box(0.25, 0.13, 0.42, "#f0e9da", 0, 0, 0.085, ankle, 0.055);
      box(0.255, 0.044, 0.43, "#ddd7ca", 0, -0.07, 0.085, ankle, 0.014);
      box(0.11, 0.035, 0.17, "#c4c3c0", 0, 0.065, 0.125, ankle, 0.01);
      legs.push({ hip, knee, ankle });
    }
    root.scale.setScalar(body === "miniature" ? 0.48 : 0.55);
    if (body === "miniature") head.scale.setScalar(1.1);
    return { root, rig, torso, head, eyes, arms, legs };
  }

  return { box, sphere, cylinder, mesh, material, character };
}
