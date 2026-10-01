import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const shortlist = new Set(
  JSON.parse(localStorage.getItem("ow-art-shortlist") || "[]"),
);
function syncShortlist() {
  document.querySelectorAll("[data-art]").forEach((b) => {
    if (b.dataset.art === "A") {
      b.classList.add("selected");
      b.setAttribute("aria-pressed", "true");
      b.disabled = true;
      b.innerHTML = "Approved direction A <span>✓</span>";
      return;
    }
    const yes = shortlist.has(b.dataset.art);
    b.classList.toggle("selected", yes);
    b.setAttribute("aria-pressed", String(yes));
    b.innerHTML = `${yes ? "Shortlisted" : "Shortlist"} ${b.dataset.art} <span>${yes ? "♥" : "♡"}</span>`;
  });
  document.querySelector("#shortlist").textContent = shortlist.size
    ? "Approved: A · Soft sculpted. Alternative notes: " +
      [...shortlist].filter((x) => x !== "A").join(" + ")
    : "Approved: A · Soft sculpted. Realistic motion refinement next.";
  localStorage.setItem("ow-art-shortlist", JSON.stringify([...shortlist]));
}
document.querySelectorAll("[data-art]").forEach(
  (b) =>
    (b.onclick = () => {
      shortlist.has(b.dataset.art)
        ? shortlist.delete(b.dataset.art)
        : shortlist.add(b.dataset.art);
      syncShortlist();
    }),
);
document.querySelector("#clear").onclick = () => {
  shortlist.clear();
  syncShortlist();
};
syncShortlist();
const stage = document.querySelector("#stage"),
  canvas = stage.querySelector("canvas");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (e) {
  document.querySelector("#fallback").hidden = false;
  canvas.hidden = true;
  document.querySelector("#status").textContent = "WebGL unavailable";
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog("#e9e8de", 35, 85);
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 120);
camera.position.set(16, 17, 20);
const orbit = new OrbitControls(camera, canvas);
orbit.target.set(0, 0.3, 0);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
orbit.maxPolarAngle = Math.PI * 0.44;
orbit.minDistance = 4;
orbit.maxDistance = 39;
orbit.enablePan = true;
scene.add(new THREE.HemisphereLight("#fff8e9", "#8d9a86", 1.8));
const sun = new THREE.DirectionalLight("#fff5df", 3);
sun.position.set(-8, 16, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -14;
sun.shadow.camera.right = 14;
sun.shadow.camera.top = 14;
sun.shadow.camera.bottom = -14;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 45;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.035;
sun.shadow.radius = 4;
scene.add(sun);
const fill = new THREE.DirectionalLight("#dfe8ff", 1);
fill.position.set(7, 8, -9);
scene.add(fill);
const mats = new Map();
function material(color, rough = 0.85) {
  const key = color + "|" + rough;
  if (!mats.has(key))
    mats.set(
      key,
      new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 }),
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
  const m = mesh(new THREE.CylinderGeometry(top, bottom, h, 32), color, parent);
  m.position.set(x, y, z);
  return m;
}
function curve(points, color, r, parent = scene) {
  const g = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
  );
  return mesh(new THREE.TubeGeometry(g, 16, r, 8, false), color, parent);
}
const floor = box(15, 0.32, 9.6, "#c7b29a", 0, -0.21, 0, scene, 0.2);
box(7.3, 0.1, 9.2, "#e8d7bd", -3.7, -0.01, 0);
box(7.3, 0.1, 4.55, "#e8dccb", 3.7, -0.01, -2.32);
box(7.3, 0.1, 4.55, "#d5dcca", 3.7, -0.01, 2.32);
for (let i = 0; i < 23; i++) {
  box(0.012, 0.003, 9.1, "#cfc0a9", -7.1 + i * 0.63, 0.046, 0, scene, 0.001);
}
const ground = mesh(new THREE.PlaneGeometry(200, 200), "#e7e6dc");
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.41;
ground.castShadow = false;
// Cutaway walls retain real openings; the demo route uses these openings.
box(15, 2.7, 0.18, "#eee8dc", 0, 1.3, -4.65);
box(0.18, 2.7, 9.5, "#e2dccf", -7.42, 1.3, 0);
for (const [z, l] of [
  [-3.8, 1.7],
  [0, 2],
  [3.8, 1.7],
])
  box(0.18, 1.5, l, "#e4dfd1", 0, 0.75, z);
for (const z of [-3, -1, 1, 3]) box(0.21, 2.25, 0.16, "#ede7d8", 0, 1.1, z);
for (const z of [-2, 2]) box(0.24, 0.18, 2.2, "#ebe4d5", 0, 2.22, z);
box(4.7, 1.1, 0.18, "#e4dfd1", 5.05, 0.55, 0);
box(0.2, 2.25, 0.2, "#eee7d8", 2.65, 1.1, 0);
box(2.65, 0.16, 0.2, "#ede6d8", 1.325, 2.22, 0);
// Window and framed art.
box(2.9, 1.7, 0.07, "#faf9ee", -4.6, 1.55, -4.51);
box(2.65, 1.46, 0.075, "#ccdcca", -4.6, 1.55, -4.45);
box(0.055, 1.5, 0.08, "#fff7e5", -4.6, 1.55, -4.38);
box(2.65, 0.055, 0.08, "#fff7e5", -4.6, 1.55, -4.38);
box(1.1, 1.25, 0.08, "#c6aa83", 4.7, 1.65, -4.5);
box(0.94, 1.09, 0.09, "#f6ead4", 4.7, 1.65, -4.44);
sphere(0.3, "#96ad8b", 4.68, 1.75, -4.36, scene, 1, 1, 0.06);
box(0.66, 0.13, 0.03, "#bf9871", 4.72, 1.33, -4.31);
function sofa(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  box(3.1, 0.3, 1.18, "#a9adc3", 0, 0.29, 0, g, 0.13);
  box(3.12, 0.96, 0.3, "#acaec8", 0, 0.7, -0.45, g, 0.14);
  for (const xx of [-1.5, 1.5]) {
    box(0.3, 0.7, 1.4, "#b6b7ce", xx, 0.52, 0, g, 0.13);
    cylinder(0.07, 0.07, 0.3, "#aa8d6c", xx, 0.16, 0.34, g);
    cylinder(0.07, 0.07, 0.3, "#aa8d6c", xx, 0.16, -0.34, g);
  }
  for (const xx of [-0.96, 0, 0.96])
    box(0.9, 0.14, 1, "#c2c1d6", xx, 0.47, 0.08, g, 0.065);
  const cushion = box(0.62, 0.62, 0.19, "#d6bd9e", -1.05, 0.87, -0.18, g, 0.14);
  cushion.rotation.z = 0.2;
  const c2 = box(0.62, 0.62, 0.19, "#c4d0ad", 1.02, 0.87, -0.18, g, 0.14);
  c2.rotation.z = -0.15;
  return g;
}
sofa(-4.9, 2.1);
box(4.9, 0.022, 3.4, "#bdc7ad", -4.6, 0.065, 2.3, scene, 0.05);
// Rug stripes are raised a fraction, avoiding depth shimmer.
for (let i = 0; i < 3; i++)
  box(4.55, 0.01, 0.028, "#e7e3ce", -4.6, 0.081, 1.0 + i * 0.17, scene, 0.003);
function table(x, z, w = 1.5) {
  box(w, 0.13, 0.95, "#c9a57a", x, 0.68, z);
  for (const dx of [-w * 0.37, w * 0.37])
    for (const dz of [-0.32, 0.32])
      cylinder(0.055, 0.06, 0.63, "#b49472", x + dx, 0.32, z + dz);
}
table(-4.7, 4.1, 1.65);
box(0.42, 0.045, 0.3, "#f5ead1", -4.6, 0.77, 4.1);
box(0.38, 0.035, 0.27, "#96ab92", -4.55, 0.8, 4.1);
cylinder(0.12, 0.1, 0.19, "#ede1c9", -5.17, 0.84, 4.07);
function plant(x, z, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0.05, z);
  g.scale.setScalar(s);
  scene.add(g);
  cylinder(0.27, 0.19, 0.48, "#cfac88", 0, 0.24, 0, g);
  cylinder(0.24, 0.24, 0.035, "#715c42", 0, 0.49, 0, g);
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.4,
      yy = 0.6 + i * 0.11,
      xx = Math.sin(angle) * 0.27,
      zz = Math.cos(angle) * 0.23;
    curve(
      [
        [0, 0.46, 0],
        [xx * 0.4, yy * 0.8, zz * 0.4],
        [xx, yy, zz],
      ],
      "#6f8561",
      0.022,
      g,
    );
    const leaf = sphere(
      0.25,
      i % 2 ? "#6f916e" : "#8ba47d",
      xx,
      yy,
      zz,
      g,
      0.57,
      1.4,
      0.35,
    );
    leaf.rotation.z = Math.sin(angle) * 0.9;
    leaf.rotation.y = angle;
  }
  return g;
}
plant(-6.7, -3.65, 1.35);
plant(6.7, -3.7, 1.2);
plant(-1.2, 3.8, 0.9);
// Shared study area, keyboard and a warm desk lamp.
table(4.5, -3.6, 3.2);
box(0.85, 0.035, 0.62, "#777d7c", 4.5, 0.79, -3.47);
const laptop = box(0.85, 0.59, 0.045, "#686f72", 4.5, 1.08, -3.73);
laptop.rotation.x = -0.1;
box(0.75, 0.46, 0.05, "#c2d4cf", 4.5, 1.1, -3.69);
box(0.45, 0.04, 0.6, "#d9bf89", 5.56, 0.79, -3.52);
box(0.4, 0.03, 0.55, "#f5ecd7", 5.56, 0.825, -3.52);
cylinder(0.16, 0.16, 0.03, "#b7a184", 3.25, 0.78, -3.62);
cylinder(0.018, 0.018, 0.6, "#b7a184", 3.25, 1.07, -3.62);
cylinder(0.14, 0.24, 0.26, "#e9ca90", 3.25, 1.42, -3.62);
function chair(x, z) {
  for (const dx of [-0.28, 0.28])
    for (const dz of [-0.25, 0.25])
      cylinder(0.035, 0.04, 0.57, "#ba9974", x + dx, 0.32, z + dz);
  box(0.79, 0.15, 0.78, "#d0b38c", x, 0.65, z);
  box(0.79, 0.73, 0.11, "#d8bf9c", x, 1.02, z - 0.34);
}
chair(4.5, -2.65);
// Kitchen counter and cabinets.
for (let i = 0; i < 3; i++) {
  const z = 1.45 + i * 0.98;
  box(1.05, 0.95, 0.94, "#aabc9c", 6.55, 0.5, z);
  box(1.12, 0.13, 0.99, "#f0e7d5", 6.55, 1.01, z);
  box(0.035, 0.06, 0.3, "#9b8b69", 5.99, 0.72, z);
}
cylinder(0.23, 0.16, 0.32, "#d3b092", 6.52, 1.2, 2.45);
sphere(0.09, "#dba972", 6.48, 1.41, 2.45);
sphere(0.11, "#a5b88b", 6.67, 1.44, 2.45);
box(1.2, 2.1, 0.9, "#d8ddd0", 6.55, 1.09, 3.93);
box(0.035, 0.6, 0.05, "#9daba0", 5.93, 1.1, 4.13);
table(3.85, 3.3, 1.65);
chair(3.85, 4.1);

function character() {
  const root = new THREE.Group(),
    rig = new THREE.Group();
  root.add(rig);
  scene.add(root);
  const skin = "#d7a477",
    shirt = "#a5a1c4",
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
    box(0.25, 0.13, 0.42, "#f0e9da", 0, -0.41, 0.085, knee, 0.055);
    box(0.255, 0.044, 0.43, "#ddd7ca", 0, -0.48, 0.085, knee, 0.014);
    box(0.11, 0.035, 0.17, "#c4c3c0", 0, -0.345, 0.125, knee, 0.01);
    legs.push({ hip, knee });
  }
  return { root, rig, torso, head, eyes, arms, legs };
}
const avatar = character();
avatar.root.position.set(-2, 0, 0);
avatar.root.rotation.y = 0.45;
const ring = mesh(new THREE.RingGeometry(0.5, 0.53, 64), "#a0b385");
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.065;
ring.castShadow = false;
const labels = {
  idle: [
    "Breathe & blink",
    "A relaxed breathing cycle, soft blinking and gentle shifts of attention.",
  ],
  walk: [
    "Walk through connected rooms",
    "A continuous route through the lounge, study and kitchen. No room-navigation buttons or scene swaps.",
  ],
  sit: [
    "Sit & stand",
    "Slow down, bend the knees, settle onto the seat, then stand smoothly.",
  ],
  wave: [
    "Wave hello",
    "A raised arm, a loose wrist motion and a small head tilt. A gesture that feels welcoming.",
  ],
  rest: [
    "Rest & wake",
    "Ease into a reclined pose and return gently. This is an avatar pose, not automatic real-life activity tracking.",
  ],
};
let mode = "walk",
  elapsed = 0,
  paused = matchMedia("(prefers-reduced-motion: reduce)").matches,
  speed = 1,
  closeView = true,
  mini = false,
  routeIndex = 1;
const route = [
  [-3, 0],
  [-2, -2],
  [1.5, -2],
  [3, -2],
  [1.5, -2],
  [1.5, 2],
  [3, 2],
  [1.5, 2],
  [-2, 2],
  [-3, 0],
];
const lerp = THREE.MathUtils.lerp,
  clamp = THREE.MathUtils.clamp;
function smooth(v) {
  v = clamp(v, 0, 1);
  return v * v * (3 - 2 * v);
}
function setMode(m) {
  mode = m;
  elapsed = 0;
  routeIndex = 1;
  document.querySelectorAll("[data-motion]").forEach((b) => {
    b.classList.toggle("active", b.dataset.motion === m);
    b.setAttribute("aria-pressed", String(b.dataset.motion === m));
  });
  document.querySelector("#motion-title").textContent = labels[m][0];
  document.querySelector("#motion-description").textContent = labels[m][1];
  avatar.root.position.set(m === "walk" ? -3 : -2, 0, 0);
  avatar.root.rotation.set(0, 0.4, 0);
  avatar.rig.rotation.set(0, 0, 0);
  avatar.rig.position.set(0, 0, 0);
  updateCamera();
}
function updateCamera() {
  if (closeView) {
    orbit.target.copy(avatar.root.position).add(new THREE.Vector3(0, 1.1, 0));
    camera.position
      .copy(avatar.root.position)
      .add(new THREE.Vector3(4.8, 7, 6.8));
    orbit.minDistance = 3;
    orbit.maxDistance = 15;
  } else {
    orbit.target.set(0, 0.3, 0);
    camera.position.set(16, 17, 20);
    orbit.minDistance = 9;
    orbit.maxDistance = 39;
  }
  orbit.update();
}
document
  .querySelectorAll("[data-motion]")
  .forEach((b) => (b.onclick = () => setMode(b.dataset.motion)));
const pause = document.querySelector("#pause");
function syncPause() {
  pause.textContent = paused ? "▷" : "Ⅱ";
  pause.setAttribute(
    "aria-label",
    paused ? "Play animation" : "Pause animation",
  );
  document.querySelector("#status").textContent = paused
    ? "Paused · use Play to see movement"
    : "Playing · real-time 3D motion study";
}
pause.onclick = () => {
  paused = !paused;
  syncPause();
};
syncPause();
document.querySelector("#speed").oninput = (e) => {
  speed = Number(e.target.value);
  document.querySelector("#speed-label").textContent = speed + "×";
};
document.querySelector("#view").onclick = (e) => {
  closeView = !closeView;
  e.currentTarget.textContent = closeView ? "◎ Follow avatar" : "◎ Whole home";
  updateCamera();
};
document.querySelector("#body").onclick = (e) => {
  mini = !mini;
  e.currentTarget.textContent = mini ? "↕ Miniature" : "↕ Mature";
  avatar.root.scale.set(mini ? 0.82 : 1, mini ? 0.8 : 1, mini ? 0.82 : 1);
  avatar.head.scale.setScalar(mini ? 1.22 : 1);
};
function animatePose(dt) {
  elapsed += dt;
  const t = elapsed;
  avatar.rig.rotation.set(0, 0, 0);
  avatar.rig.position.y = 0;
  avatar.torso.scale.y = 1 + Math.sin(t * 2) * 0.014;
  avatar.head.rotation.set(0, Math.sin(t * 0.6) * 0.045, 0);
  for (const { shoulder, elbow } of avatar.arms) {
    shoulder.rotation.set(0, 0, 0);
    elbow.rotation.set(0, 0, 0);
  }
  for (const { hip, knee } of avatar.legs) {
    hip.rotation.set(0, 0, 0);
    knee.rotation.set(0, 0, 0);
  }
  const blink = t % 4.4;
  avatar.eyes.forEach(
    (e) =>
      (e.scale.y =
        blink > 4.12 ? Math.max(0.08, Math.abs((blink - 4.26) / 0.14)) : 1),
  );
  if (mode === "walk") {
    const dest = route[routeIndex],
      p = avatar.root.position,
      dx = dest[0] - p.x,
      dz = dest[1] - p.z,
      len = Math.hypot(dx, dz),
      step = dt * 1.15;
    if (len <= step) {
      p.x = dest[0];
      p.z = dest[1];
      routeIndex = (routeIndex + 1) % route.length;
    } else {
      p.x += (dx / len) * step;
      p.z += (dz / len) * step;
    }
    let target = Math.atan2(dx, dz),
      diff = Math.atan2(
        Math.sin(target - avatar.root.rotation.y),
        Math.cos(target - avatar.root.rotation.y),
      );
    avatar.root.rotation.y += diff * Math.min(1, dt * 8);
    const gait = t * 7;
    avatar.rig.position.y = Math.abs(Math.sin(gait)) * 0.032;
    avatar.legs.forEach(({ hip, knee }, i) => {
      hip.rotation.x = Math.sin(gait + i * Math.PI) * 0.47;
      knee.rotation.x = Math.max(0, -Math.sin(gait + i * Math.PI)) * 0.48;
    });
    avatar.arms.forEach(({ shoulder, elbow }, i) => {
      shoulder.rotation.x = -Math.sin(gait + i * Math.PI) * 0.36;
      elbow.rotation.x = -0.1;
    });
    avatar.head.rotation.y = 0;
  }
  if (mode === "idle") {
    avatar.root.position.set(-2, 0, 0);
    avatar.root.rotation.y = 0.4;
    avatar.rig.rotation.z = Math.sin(t * 0.65) * 0.013;
    avatar.arms.forEach(
      ({ shoulder }, i) =>
        (shoulder.rotation.z =
          (i === 0 ? 1 : -1) * (0.06 + Math.sin(t * 1.2) * 0.015)),
    );
  }
  if (mode === "wave") {
    avatar.root.position.set(-2, 0, 0);
    avatar.root.rotation.y = 0.4;
    const blend = smooth((t % 6) / 0.75) * (1 - smooth(((t % 6) - 4.8) / 0.9));
    avatar.arms[1].shoulder.rotation.z = -2.45 * blend;
    avatar.arms[1].shoulder.rotation.x = -0.15 * blend;
    avatar.arms[1].elbow.rotation.z = (0.35 + Math.sin(t * 8) * 0.22) * blend;
    avatar.head.rotation.z = -0.1 * blend;
    avatar.rig.rotation.y = Math.sin(t) * 0.025;
  }
  if (mode === "sit") {
    const phase = t % 10;
    const sit =
      phase < 2
        ? smooth(phase / 2)
        : phase < 7
          ? 1
          : 1 - smooth((phase - 7) / 2);
    avatar.root.position.set(-4.9, 0, lerp(3.13, 2.45, sit));
    avatar.root.rotation.y = 0;
    avatar.rig.position.y = -0.3 * sit;
    avatar.rig.rotation.x = 0.12 * Math.sin(sit * Math.PI);
    avatar.legs.forEach(({ hip, knee }) => {
      hip.rotation.x = -1.48 * sit;
      knee.rotation.x = 1.48 * sit;
    });
    avatar.arms.forEach(({ shoulder, elbow }, i) => {
      shoulder.rotation.x = -0.48 * sit;
      shoulder.rotation.z = (i === 0 ? 1 : -1) * 0.1;
      elbow.rotation.x = -0.42 * sit;
    });
  }
  if (mode === "rest") {
    const phase = t % 13;
    const rest =
      phase < 3
        ? smooth(phase / 3)
        : phase < 9
          ? 1
          : 1 - smooth((phase - 9) / 3);
    avatar.root.position.set(
      lerp(-4.9, -5.6, rest),
      lerp(0, 0.84, rest),
      lerp(3.13, 2.15, rest),
    );
    avatar.root.rotation.y = 0;
    avatar.rig.rotation.z = -Math.PI * 0.48 * rest;
    avatar.arms.forEach(({ shoulder, elbow }, i) => {
      shoulder.rotation.z = (i === 0 ? 1 : -1) * 0.17 * rest;
      shoulder.rotation.x = -0.25 * rest;
      elbow.rotation.x = -0.5 * rest;
    });
    avatar.legs.forEach(({ hip, knee }) => {
      hip.rotation.x = -0.15 * rest;
      knee.rotation.x = 0.25 * rest;
    });
    if (rest > 0.9) avatar.eyes.forEach((e) => (e.scale.y = 0.08));
  }
  ring.position.x = avatar.root.position.x;
  ring.position.z = avatar.root.position.z;
  ring.visible = mode !== "rest";
  if (closeView) {
    const target = avatar.root.position
      .clone()
      .add(new THREE.Vector3(0, 1.1, 0));
    const delta = target
      .clone()
      .sub(orbit.target)
      .multiplyScalar(Math.min(1, dt * 4));
    orbit.target.add(delta);
    camera.position.add(delta);
  }
}
const resize = new ResizeObserver(() => {
  const w = stage.clientWidth,
    h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});
resize.observe(stage);
setMode("walk");
let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.06) * speed;
  last = now;
  if (!paused) animatePose(dt);
  orbit.update();
  renderer.render(scene, camera);
});
