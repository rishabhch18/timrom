import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createModels } from "./models";
import { solveLeg, walkingFoot } from "./locomotion.mjs";
const ACTIONABLE = new Set(["chair", "sofa", "bed", "desk", "counter"]);
export default function ConnectedScene(props) {
  const host = useRef(),
    live = useRef(props),
    controller = useRef(),
    [overview, setOverview] = useState(false),
    [failed, setFailed] = useState(false);
  live.current = props;
  useEffect(() => {
    controller.current?.update(props.scene);
  }, [props.scene]);
  useEffect(() => {
    const el = host.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.domElement.setAttribute(
      "aria-label",
      "Connected house. Click floors to walk, furniture for actions. Arrow keys walk; Home toggles overview.",
    );
    renderer.domElement.tabIndex = 0;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e8e9df");
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 250),
      target = new THREE.Vector3(5, 0.2, 4);
    camera.position.set(11, 12, 16);
    scene.add(new THREE.HemisphereLight("#fff8e9", "#9daea1", 2.2));
    const sun = new THREE.DirectionalLight("#fff4da", 3);
    sun.position.set(-10, 22, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -35;
    sun.shadow.camera.right = 35;
    sun.shadow.camera.top = 35;
    sun.shadow.camera.bottom = -35;
    sun.shadow.camera.far = 100;
    sun.shadow.normalBias = 0.03;
    scene.add(sun);
    const fill = new THREE.DirectionalLight("#e0e7ff", 1.1);
    fill.position.set(14, 8, -10);
    scene.add(fill);
    const models = createModels(scene),
      { box, sphere, cylinder, character } = models,
      world = new THREE.Group();
    scene.add(world);
    const people = new Map(),
      pickables = [],
      ray = new THREE.Raycaster(),
      pointer = new THREE.Vector2();
    let signature = "",
      data = live.current.scene,
      whole = overview,
      zoom = 1,
      frame,
      last = performance.now(),
      roomLabels = [];
    const disposeGroup = (g) => {
      g.traverse((o) => {
        o.geometry?.dispose();
        if (o.material?.map) {
          o.material.map.dispose();
          o.material.dispose();
        }
      });
      g.removeFromParent();
    };
    function textSprite(text, x, y, z, parent, color = "#40584b") {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 80;
      const ctx = canvas.getContext("2d");
      ctx.font = "600 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = color;
      ctx.fillText(text, 256, 48);
      const texture = new THREE.CanvasTexture(canvas),
        mat = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthTest: false,
        });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(x, y, z);
      sprite.scale.set(4.1, 0.64, 1);
      sprite.renderOrder = 10;
      parent.add(sprite);
      return sprite;
    }
    function furniture(item, parent) {
      const group = new THREE.Group();
      group.position.set(item.x, 0, item.y);
      parent.add(group);
      const asset = item.asset,
        c = asset === "sofa" ? "#b8b6d4" : "#d1b395";
      if (asset === "chair" || asset === "sofa") {
        const w = asset === "sofa" ? 0.94 : 0.64;
        box(w, 0.15, 0.7, c, 0, 0.16, 0, group, 0.06);
        box(w, 0.49, 0.16, c, 0, 0.43, -0.3, group, 0.05);
        box(w - 0.12, 0.1, 0.53, "#ddd0c6", 0, 0.23, 0.035, group, 0.06);
        for (const x of [-w * 0.38, w * 0.38])
          for (const z of [-0.23, 0.23])
            cylinder(0.026, 0.03, 0.2, "#937b62", x, 0.1, z, group);
        box(.46,.055,.24,"#bda98d",0,.045,.33,group,.02);
        if (asset === "sofa")
          for (const x of [-0.41, 0.41])
            box(0.12, 0.3, 0.65, c, x, 0.37, 0, group);
      } else if (asset === "bed") {
        box(0.93, 0.22, 0.94, "#b9a68d", 0, 0.12, 0, group);
        box(0.9, 0.14, 0.9, "#eee9e1", 0, 0.29, 0, group, 0.07);
        box(0.9, 0.06, 0.66, "#bfc5d9", 0, 0.39, 0.1, group, 0.025);
        box(0.74, 0.12, 0.23, "#f6eee1", 0, 0.39, -0.31, group);
      } else if (asset === "desk" || asset === "counter") {
        box(0.94, 0.09, 0.68, "#c7aa82", 0, 0.64, -0.06, group);
        for (const x of [-0.37, 0.37])
          for (const z of [-0.3, 0.18])
            box(0.045, 0.6, 0.045, "#a39379", x, 0.3, z, group);
        if (asset === "desk") {
          box(0.32, 0.24, 0.026, "#5f7972", 0, 0.8, -0.22, group, 0.014);
          box(0.34, 0.025, 0.2, "#728b80", 0, 0.7, -0.13, group);
          box(0.2, 0.025, 0.24, "#f6ecd6", 0.29, 0.7, 0.0, group);
        } else {
          cylinder(0.15, 0.15, 0.025, "#f4f1e6", 0, 0.71, -0.02, group);
          sphere(0.06, "#cb8159", 0, 0.76, -0.02, group);
        }
      } else if (asset === "plant") {
        cylinder(0.15, 0.11, 0.3, "#d5ad8d", 0, 0.15, 0, group);
        cylinder(0.025, 0.025, 0.5, "#658168", 0, 0.45, 0, group);
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          sphere(
            0.17,
            i % 2 ? "#84a183" : "#607f65",
            Math.cos(a) * 0.16,
            0.4 + i * 0.065,
            Math.sin(a) * 0.16,
            group,
            1,
            0.5,
            0.7,
          );
        }
      } else if (asset === "lamp") {
        cylinder(0.18, 0.18, 0.04, "#bdb098", 0, 0.03, 0, group);
        cylinder(0.025, 0.025, 0.9, "#c0a272", 0, 0.47, 0, group);
        cylinder(0.2, 0.28, 0.3, "#f3d49b", 0, 1, 0, group);
      }
      group.traverse((o) => {
        if (o.isMesh) {
          o.userData = { item };
          pickables.push(o);
        }
      });
    }
    function rebuild(next) {
      for (const child of [...world.children]) disposeGroup(child);
      pickables.length = 0;
      roomLabels = [];
      for (const r of next.rooms) {
        const g = new THREE.Group();
        g.position.set(r.ox, 0, r.oy);
        world.add(g);
        const floor = box(
          12,
          0.16,
          9,
          r.index % 3 === 0
            ? "#e9d6b9"
            : r.index % 3 === 1
              ? "#e1ddcf"
              : "#d6dfcb",
          5.5,
          -0.1,
          4,
          g,
          0.04,
        );
        floor.userData = { room: r };
        pickables.push(floor);
        for (let x = 0; x < 12; x++)
          box(0.012, 0.008, 8.95, "#c7bbaa", x - 0.5, -0.014, 4, g, 0.003);
        // Cutaway wall segments leave genuine one-tile door openings.
        const sides = [
          ["left", -0.5, 4, 0, 1, 9],
          ["right", 11.5, 4, 0, 1, 9],
          ["top", 5.5, -0.5, 1, 0, 12],
          ["bottom", 5.5, 8.5, 1, 0, 12],
        ];
        for (const [side, cx, cz, dx, dz, len] of sides) {
          const connected = next.portals.some(
            (p) =>
              (p.a === r.id &&
                ((side === "right" && p.ax === 11) ||
                  (side === "bottom" && p.ay === 8))) ||
              (p.b === r.id &&
                ((side === "left" && p.bx === 0) ||
                  (side === "top" && p.by === 0))),
          );
          const fullHeight = side === "top" || side === "left",
            h = fullHeight ? 0.75 : 0.2;
          // A reserved door is centered on tile 5 (horizontal) or 4 (vertical).
          if (connected) {
            const center = dx ? 5 : 4,
              start = -0.5,
              end = len - 0.5;
            for (const [a, b] of [
              [start, center - 0.58],
              [center + 0.58, end],
            ])
              box(
                dx ? b - a : 0.12,
                h,
                dz ? b - a : 0.12,
                r.theme,
                dx ? (a + b) / 2 : cx,
                h / 2,
                dz ? (a + b) / 2 : cz,
                g,
                0.02,
              );
            box(
              dx ? 1.14 : 0.11,
              0.03,
              dz ? 1.14 : 0.11,
              "#b8ad8d",
              dx ? center : cx,
              0.01,
              dz ? center : cz,
              g,
              0.015,
            );
          } else
            box(
              dx ? len : 0.12,
              h,
              dz ? len : 0.12,
              r.theme,
              cx,
              h / 2,
              cz,
              g,
              0.025,
            );
        }
        // Rugs are decorative surfaces, with no physical obstruction.
        box(
          3,
          0.01,
          2.3,
          r.kind === "Studying" ? "#c4ccba" : "#d3c9c2",
          5.4,
          -0.006,
          4.4,
          g,
          0.12,
        );
        for (const item of r.items) furniture(item, g);
        const label = textSprite(r.name, r.ox + 5.5, 1.15, r.oy + 0.5, world);
        roomLabels.push({ label, room: r.id });
      }
    }
    function update(next) {
      if (!next) return;
      data = next;
      const sig = JSON.stringify(
        next.rooms.map((r) => [r.id, r.theme, r.locked, r.items]),
      );
      if (sig !== signature) {
        signature = sig;
        rebuild(next);
      }
      for (const p of next.people) {
        const r = next.rooms.find((r) => r.id === p.room);
        if (!r) continue;
        let a = people.get(p.id);
        if (a && (a.color !== p.color || a.body !== p.body)) {
          disposeGroup(a.root);
          people.delete(p.id);
          a = null;
        }
        if (!a) {
          a = character(p.color, p.body);
          a.color = p.color;
          a.body = p.body;
          a.root.position.set(r.ox + p.x, 0, r.oy + p.y);
          a.queue = [];
          a.phase = 0;
          a.blend = 0;
          a.distance = 0;
          a.root.traverse((o) => {
            if (o.isMesh) o.userData = { person: p.id };
          });
          a.label = textSprite(p.name, 0, 3, 0, a.root);
          a.label.scale.set(3, 0.55, 1);
          people.set(p.id, a);
        }
        const dest = new THREE.Vector3(r.ox + p.x, 0, r.oy + p.y),
          last = a.queue.at(-1) || a.lastTarget;
        if (!last || last.distanceTo(dest) > 0.01) {
          a.queue.push(dest);
          a.lastTarget = dest.clone();
        }
        if (
          a.person?.action?.phase === "active" &&
          p.action?.phase !== "active" &&
          !a.queue.length
        )
          a.queue.push(dest);
        a.person = p;
      }
      for (const [id, a] of people)
        if (!next.people.some((p) => p.id === id)) {
          disposeGroup(a.root);
          people.delete(id);
        }
    }
    controller.current = {
      update,
      overview(value) {
        whole = value;
        zoom = 1;
      },
    };
    update(data);
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.19, 0.23, 40),
      new THREE.MeshBasicMaterial({ color: "#6e8f75", side: THREE.DoubleSide }),
    );
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    scene.add(marker);
    let markerUntil = 0;
    function click(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
      const meshes = [...pickables];
      for (const a of people.values())
        a.root.traverse((o) => {
          if (o.isMesh) meshes.push(o);
        });
      const hit = ray.intersectObjects(meshes, false)[0];
      if (!hit) return;
      if (hit.object.userData.person) {
        const p = data.people.find((p) => p.id === hit.object.userData.person);
        live.current.onPerson(p);
        return;
      }
      if (hit.object.userData.item && !live.current.builder) {
        live.current.onObject(hit.object.userData.item);
        return;
      }
      let r = hit.object.userData.room;
      if (!r)
        r = data.rooms.find((r) => r.id === hit.object.userData.item?.room);
      if (r) {
        const x = Math.round(hit.point.x - r.ox),
          y = Math.round(hit.point.z - r.oy);
        if (x < 0 || x > 11 || y < 0 || y > 8) return;
        live.current.onTile(r.id, x, y);
        marker.position.set(r.ox + x, 0.018, r.oy + y);
        marker.visible = true;
        markerUntil = performance.now() + 1700;
      }
    }
    const wheel = (e) => {
      e.preventDefault();
      zoom = THREE.MathUtils.clamp(zoom + e.deltaY * 0.001, 0.55, 2);
    };
    const key = (e) => {
      const p = data.people.find((p) => p.id === live.current.me.id);
      if (!p) return;
      const dirs = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      if (dirs[e.key]) {
        e.preventDefault();
        const [dx, dy] = dirs[e.key];
        let room = p.room,
          x = p.x + dx,
          y = p.y + dy;
        for (const d of data.portals) {
          if (
            d.a === room &&
            d.ax === p.x &&
            d.ay === p.y &&
            (x > 11 || y > 8)
          ) {
            room = d.b;
            x = d.bx;
            y = d.by;
            break;
          }
          if (
            d.b === room &&
            d.bx === p.x &&
            d.by === p.y &&
            (x < 0 || y < 0)
          ) {
            room = d.a;
            x = d.ax;
            y = d.ay;
            break;
          }
        }
        live.current.onTile(room, x, y);
      }
      if (e.key === "Home") {
        whole = !whole;
        setOverview(whole);
      }
    };
    renderer.domElement.addEventListener("click", click);
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });
    renderer.domElement.addEventListener("keydown", key);
    const resize = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    resize.observe(el);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function animate(now) {
      frame = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (const a of people.values()) {
        const p = a.person;
        let moved = 0;
        if (a.queue.length) {
          const dest = a.queue[0],
            delta = dest.clone().sub(a.root.position);
          delta.y = 0;
          const distance = delta.length();
          if (distance < 0.02) a.queue.shift();
          else {
            const step = Math.min(distance, dt * 0.84);
            a.root.position.addScaledVector(delta.normalize(), step);
            moved = step;
            const yaw = Math.atan2(delta.x, delta.z);
            a.root.rotation.y +=
              Math.atan2(
                Math.sin(yaw - a.root.rotation.y),
                Math.cos(yaw - a.root.rotation.y),
              ) * Math.min(1, dt * 14);
          }
        }
        a.distance += moved;
        a.phase = (a.distance / a.root.scale.x / 1.3) * Math.PI * 2;
        const active = p.action?.phase === "active" && !a.queue.length;
        a.blend = THREE.MathUtils.damp(a.blend, active ? 1 : 0, 7, dt);
        if (active) a.poseKind = p.action.kind;
        const b = a.blend,
          rest = ["rest", "sleep"].includes(a.poseKind) && b > 0.01,
          use = ["study", "work", "eat"].includes(a.poseKind) && b > 0.01;
        a.walk = THREE.MathUtils.damp(a.walk || 0, moved ? 1 : 0, 12, dt);
        const seated=use||rest?0:b;
        a.rig.position.set(0,-.1*a.walk*(1-seated)+(.07/a.root.scale.x+.502-.87)*seated,0);
        a.rig.rotation.set(0, 0, 0);
        a.head.rotation.set(0, 0, 0);
        for (let i = 0; i < 2; i++) {
          const swing = Math.sin(a.phase + i * Math.PI) * (moved ? 0.58 : 0);
          const foot = walkingFoot(a.distance / a.root.scale.x, i),
            angles = solveLeg(
              foot.z * a.walk,
              -0.78 + 0.1 * a.walk + foot.lift * a.walk,
            );
          a.legs[i].hip.rotation.x = angles.hip * (1 - seated) - (Math.PI / 2) * seated;
          a.legs[i].knee.rotation.x = angles.knee * (1 - seated) + (Math.PI / 2) * seated;
          a.legs[i].ankle.rotation.x = angles.ankle * (1 - seated);
          a.arms[i].shoulder.rotation.set(
            -swing * 0.5 * (1 - b) - (use ? 1.05 : 0.3) * b,
            0,
            0,
          );
          a.arms[i].elbow.rotation.x = -(use ? 0.5 : 0.2) * b;
        }
        if (active) {
          const r = data.rooms.find((r) => r.id === p.room),
            item = r?.items.find((i) => i.id === p.action.item);
          if (item) {
            a.restSurface=item.asset==="bed"?.42:.28;
            a.root.rotation.y = use ? Math.PI : 0;
            const targetX = r.ox + item.x,
              targetZ = r.oy + item.y + (use ? 0.57 : 0.04);
            a.root.position.x = THREE.MathUtils.damp(
              a.root.position.x,
              targetX,
              8,
              dt,
            );
            a.root.position.z = THREE.MathUtils.damp(
              a.root.position.z,
              targetZ,
              8,
              dt,
            );
          }
        }
        if (rest) {
          a.root.rotation.y = Math.PI / 2;
          a.rig.rotation.z = (-Math.PI / 2) * b;
          a.rig.position.set(-0.95 * b, ((a.restSurface||.28)/a.root.scale.x+.34)*b, 0);
          for (const l of a.legs) {
            l.hip.rotation.x = THREE.MathUtils.lerp(l.hip.rotation.x, 0.06, b);
            l.knee.rotation.x = THREE.MathUtils.lerp(
              l.knee.rotation.x,
              0.12,
              b,
            );
            l.ankle.rotation.x = THREE.MathUtils.lerp(
              l.ankle.rotation.x,
              -0.18,
              b,
            );
          }
          a.head.rotation.z = -0.1 * b;
        }
        if (!moved && !active && !reduced) {
          a.torso.scale.y = 1 + Math.sin(now * 0.0015) * 0.008;
          a.head.rotation.y = Math.sin(now * 0.0004) * 0.06;
        }
        for (const eye of a.eyes)
          eye.scale.y =
            p.action?.kind === "sleep" && active
              ? 0.08
              : Math.sin(now * 0.0008 + a.root.position.x) > 0.996
                ? 0.15
                : 1;
        a.label.visible = whole || a.person.id === live.current.me.id;
      }
      const self = people.get(live.current.me.id);
      if (data && self) {
        const width = Math.max(...data.rooms.map((r) => r.ox)) + 12,
          depth = Math.max(...data.rooms.map((r) => r.oy)) + 9;
        const destination = whole
          ? new THREE.Vector3((width - 1) / 2, 0.2, (depth - 1) / 2)
          : self.root.position.clone().add(new THREE.Vector3(0, 0.3, 0));
        target.lerp(destination, reduced ? 1 : 1 - Math.exp(-dt * 5));
        const extent = whole
          ? Math.max(depth, width / camera.aspect) * 0.95
          : 6;
        const offset = new THREE.Vector3(
          extent * 0.56,
          extent * 1.12,
          extent * 1.12,
        ).multiplyScalar(zoom);
        camera.position.lerp(
          target.clone().add(offset),
          reduced ? 1 : 1 - Math.exp(-dt * 4),
        );
        camera.lookAt(target);
      }
      if (now > markerUntil) marker.visible = false;
      renderer.render(scene, camera);
    }
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      controller.current = null;
      renderer.domElement.removeEventListener("click", click);
      renderer.domElement.removeEventListener("wheel", wheel);
      renderer.domElement.removeEventListener("keydown", key);
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) {
          o.material.map?.dispose();
          o.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [props.scene?.home]);
  return (
    <div className="connected-scene">
      <div ref={host} className="world-canvas" />
      {failed && (
        <div className="webgl-fallback">
          This 3D house needs WebGL. Try another browser or enable graphics
          acceleration.
        </div>
      )}
      <div className="scene-toolbar">
        <span>Click to walk · Scroll to zoom</span>
        <button
          aria-label={overview ? "Follow avatar" : "Show whole home"}
          onClick={() => {
            controller.current?.overview(!overview);
            setOverview(!overview);
          }}
        >
          {overview ? "◎ Follow me" : "⌂ Whole home"}
        </button>
      </div>
      <div className="scene-caption">
        <i /> {props.me.name}
        <small>
          {props.builder ? "Decorating" : "Your shared little world"}
        </small>
      </div>
    </div>
  );
}
