# One World — art and motion review

Open **http://127.0.0.1:8766/** while its local server is running.

Three generated art concepts: [A](A-soft-sculpted.png), [B](B-living-miniature.png), [C](C-illustrated-neighbourhood.png). Click the cards to see each full-size. The same board contains five genuine browser-rendered 3D motion studies with pause, speed, body proportions and camera controls.

These are exploratory samples. The live 3D rig is separate and simpler than the generated art. The still images are not animation clips or production-ready game assets. **Soft sculpted (A) is now approved.** The general motion style is accepted subject to realistic posture, contact, collision and activity transitions. See [motion acceptance criteria](motion-requirements.md).

[Confirmed requirements and unresolved choices](decisions.md) · [Image prompts and generation method](prompts.md)

## Run again

```sh
cd references/visual-review
npm ci
python3 -m http.server 8766 --bind 127.0.0.1
```

Three.js is installed locally and pinned to 0.180.0; no account/key or paid service is needed. WebGL hardware acceleration is required for the 3D preview. Fonts have a system fallback when offline. The original app runs separately on port 5173.

## Review controls

- Five sample buttons: Breathe & blink; Walk through doors; Sit & stand; Wave hello; Rest & wake.
- Follow-avatar/whole-home camera toggle. Drag to orbit; scroll/pinch to zoom.
- Mature/miniature proportions; pause/play; 0.25×–1.5× speed.
- Reduced-motion preference pauses playback initially.
- A is marked as the confirmed direction. B/C can be retained as local alternative references; clearing alternatives does not undo the recorded user approval.

## Verification and limits

JavaScript syntax checked. Browser rendered the 3D scene without console errors during inspection. Mode switching, camera and proportion controls, pause/play and the connected walking route were checked visually. No production performance budget or mobile GPU benchmark is claimed. Meshes, rig, preset paths, furniture scale and lighting are study material rather than a finished asset pipeline. The rest study is an avatar pose and does not start a real-life activity record.

References: [Three.js documentation](https://threejs.org/docs/), [OrbitControls](https://threejs.org/docs/#examples/en/controls/OrbitControls). The generated art used the built-in image-generation tool; no external CLI/API key was used.
