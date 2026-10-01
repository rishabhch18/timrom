/** The connected scene consumes server snapshots only; it never writes preview storage. */
export function connectedScene({
  T,
  scene,
  camera,
  controls,
  canvas,
  B,
  fitModel,
  mkPerson,
  animPerson,
  onCommand,
  onItem,
  labelHost,
}) {
  const group = new T.Group();
  scene.add(group);
  let geometry = new T.Group();
  group.add(geometry);
  const people = new Map(),
    ray = new T.Raycaster(),
    mouse = new T.Vector2();
  let snapshot = null,
    key = "",
    home = "",
    follow = true,
    targets = [],
    floorTargets = [],
    labels = [];
  const unit = 0.65;
  const models = {
    chair: ["chair", 0.55],
    sofa: ["loungesofa", 1.25],
    desk: ["desk", 1.1],
    plant: ["pottedplant", 0.4],
    bed: ["beddouble", 1.25],
    counter: ["kitchencabinet", 0.75],
    lamp: ["lamproundfloor", 0.4],
  };
  function update(s, force = false) {
    snapshot = s;
    const changedHome = home !== s?.scene?.home;
    if (!s?.scene) {
      group.visible = false;
      return;
    }
    group.visible = true;
    const signature = JSON.stringify(
      [
        s.scene.rooms,
        s.scene.portals,
        s.homes.filter((h) => h.member).map((h) => [h.id, h.name]),
      ],
      (k, v) => (k === "count" ? undefined : v),
    );
    if (force || signature !== key) {
      key = signature;
      group.remove(geometry);
      geometry = new T.Group();
      group.add(geometry);
      targets = [];
      floorTargets = [];
      labels = [];
      labelHost?.replaceChildren();
      for (const r of s.scene.rooms) {
        const w = 12 * unit,
          h = 9 * unit,
          x = r.ox * unit,
          z = r.oy * unit;
        if (labelHost) {
          const el = document.createElement("span");
          el.textContent = r.name;
          labelHost.appendChild(el);
          labels.push({
            el,
            point: new T.Vector3(x + 2 * unit, 0.8, z + unit),
          });
        }
        const floor = B(
          geometry,
          w,
          0.16,
          h,
          x + w / 2 - unit / 2,
          -0.16,
          z + h / 2 - unit / 2,
          r.outdoor ? "#A6CB84" : "#DDB587",
          0.09,
        );
        floor.userData.room = r;
        floorTargets.push(floor);
        if (!r.outdoor) {
          const gaps = new Set();
          for (const p of s.scene.portals) {
            if (p.a === r.id) gaps.add(p.ax + "," + p.ay);
            if (p.b === r.id) gaps.add(p.bx + "," + p.by);
          }
          for (let a = 0; a < 12; a++)
            for (const b of [0, 8])
              if (!gaps.has(a + "," + b))
                B(
                  geometry,
                  unit,
                  0.7,
                  0.1,
                  x + a * unit,
                  0,
                  z + (b === 0 ? -0.5 : 8.5) * unit,
                  r.theme || "#F4EDE3",
                  0.035,
                );
          for (let b = 0; b < 9; b++)
            for (const a of [0, 11])
              if (!gaps.has(a + "," + b))
                B(
                  geometry,
                  0.1,
                  0.7,
                  unit,
                  x + (a === 0 ? -0.5 : 11.5) * unit,
                  0,
                  z + b * unit,
                  r.theme || "#F4EDE3",
                  0.035,
                );
        }
        for (const item of r.items) {
          const spec = models[item.asset] || models.chair;
          const obj = fitModel(spec[0], spec[1]) || new T.Group();
          obj.position.set(x + item.x * unit, 0, z + item.y * unit);
          obj.rotation.y = (item.rotation * Math.PI) / 2;
          obj.userData.item = item;
          geometry.add(obj);
          targets.push(obj);
        }
      }
      const maxX = Math.max(...s.scene.rooms.map((r) => r.ox + 12)) * unit,
        maxZ = Math.max(...s.scene.rooms.map((r) => r.oy + 9)) * unit;
      s.homes
        .filter((h) => h.member && h.id !== s.scene.home)
        .slice(0, 6)
        .forEach((h, i) => {
          const house =
            fitModel(
              ["building-type-a", "building-type-c", "building-type-e"][i % 3],
              2,
            ) || new T.Group();
          house.position.set(-4 - (i % 2) * 3, 0, i * 3);
          house.userData.home = h;
          geometry.add(house);
          targets.push(house);
        });
      if (home !== s.scene.home) {
        home = s.scene.home;
        controls.minDistance = 8;
        controls.maxDistance = 90;
        controls.target.set(maxX / 2, 0, maxZ / 2);
        camera.position.set(maxX / 2 + 18, 25, maxZ / 2 + 24);
        camera.lookAt(controls.target);
        follow = true;
      }
    }
    const present = new Set();
    for (const person of s.scene.people) {
      present.add(person.id);
      const room = s.scene.rooms.find((r) => r.id === person.room);
      if (!room) continue;
      let actor = people.get(person.id);
      if (!actor) {
        actor = mkPerson({
          skin: 1,
          hair: 0,
          style: 0,
          outfit: Math.abs(person.id.charCodeAt(0)) % 6,
        });
        actor.root.scale.setScalar(person.body === "miniature" ? 0.75 : 1);
        actor.target = new T.Vector3();
        group.add(actor.root);
        people.set(person.id, actor);
        actor.fresh = true;
      }
      actor.target.set(
        (room.ox + person.x) * unit,
        0,
        (room.oy + person.y) * unit,
      );
      actor.mode =
        person.action?.phase === "active" && person.action?.kind === "sleep"
          ? "sleep"
          : person.seat
            ? "sit"
            : "idle";
      if (actor.fresh || changedHome) {
        actor.root.position.copy(actor.target);
        actor.fresh = false;
      }
    }
    for (const [id, actor] of people)
      if (!present.has(id)) {
        group.remove(actor.root);
        actor.glb?.mixer.stopAllAction();
        people.delete(id);
      }
  }
  function frame(dt) {
    for (const l of labels) {
      const p = l.point.clone().project(camera);
      l.el.style.transform = `translate(${((p.x + 1) / 2) * canvas.clientWidth}px,${((1 - p.y) / 2) * canvas.clientHeight}px)`;
      l.el.hidden = p.z > 1;
    }
    for (const actor of people.values()) {
      const delta = actor.target.clone().sub(actor.root.position),
        distance = delta.length();
      actor.walking = distance > 0.025;
      actor.path = null;
      actor.v = Math.min(1.75, distance / Math.max(dt, 0.001));
      if (actor.walking) {
        actor.yaw = Math.atan2(delta.x, delta.z);
        actor.root.position.add(
          delta.multiplyScalar(Math.min(1, (1.75 * dt) / distance)),
        );
      }
      animPerson(actor, dt);
    }
    const me = people.get(snapshot?.me.id);
    if (me && follow) {
      const delta = me.root.position
        .clone()
        .sub(controls.target)
        .multiplyScalar(1 - Math.exp(-dt * 3));
      delta.y = 0;
      controls.target.add(delta);
      camera.position.add(delta);
    }
    controls.update();
  }
  function click(e) {
    if (!snapshot?.scene) return;
    const box = canvas.getBoundingClientRect();
    mouse.set(
      ((e.clientX - box.left) / box.width) * 2 - 1,
      (-(e.clientY - box.top) / box.height) * 2 + 1,
    );
    ray.setFromCamera(mouse, camera);
    const picked = ray.intersectObjects(targets, true)[0];
    if (picked) {
      let o = picked.object;
      while (o && !o.userData.item && !o.userData.home) o = o.parent;
      if (o?.userData.item) {
        onItem(o.userData.item);
        return;
      }
      if (o?.userData.home) {
        const h = o.userData.home;
        onCommand("join", { room: h.rooms[0]?.id });
        return;
      }
    }
    const hit = ray.intersectObjects(floorTargets, false)[0];
    if (hit) {
      const room = hit.object.userData.room;
      onCommand("move", {
        room: room.id,
        x: Math.max(0, Math.min(11, Math.round(hit.point.x / unit - room.ox))),
        y: Math.max(0, Math.min(8, Math.round(hit.point.z / unit - room.oy))),
      });
    }
  }
  return {
    update,
    frame,
    click,
    overview() {
      follow = false;
      const rooms = snapshot?.scene?.rooms;
      if (!rooms?.length) return;
      const x = (Math.max(...rooms.map((r) => r.ox + 12)) * unit) / 2,
        z = (Math.max(...rooms.map((r) => r.oy + 9)) * unit) / 2;
      controls.target.set(x, 0, z);
      camera.position.set(x + 22, 32, z + 32);
    },
    follow() {
      follow = true;
    },
    destroy() {
      scene.remove(group);
      for (const a of people.values()) a.glb?.mixer.stopAllAction();
      people.clear();
    },
  };
}
