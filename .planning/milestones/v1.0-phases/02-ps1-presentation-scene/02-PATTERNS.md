# Phase 2: PS1 Presentation & Scene — Pattern Map

**Mapped:** 2026-10-16
**Files analyzed:** 5 (1 new, 4 modified)
**Analogs found:** 5 / 5 (this repo is tiny — the strongest analog for each file is overwhelmingly the Phase-1 file itself; all analog paths verified git-tracked via `git ls-files`)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.planning/spikes/ps1-look.html` (exact name planner's choice; D-04) | spike/config (throwaway standalone page) | request-response (own rAF loop) | `index.html` (importmap block only, lines 9–15) | partial (only the CDN-pinning convention transfers) |
| `js/render3d.js` (rebuilt scene: RT pipeline, Bayer pass, vertex snap, rope arc, character rig, stage, precompile) | renderer / WebGL scene layer | transform (read-only view snapshot → GL draw; never feeds back) | `js/render3d.js` Phase-1 version, esp. `createScene` contract lines 12–49 | exact (contract/structure), new internals |
| `js/shell.js` (+ `view.now` cosmetic-clock field, + window-sized canvas buffer / resize wiring) | controller (impure runtime shell) | event-driven + fixed-timestep batch loop | `js/shell.js` itself — `frame()` lines 83–109, canvas set lines 11–12 | exact |
| `tests/render3d.test.js` (extend `THREE_STUB` for new scene surface — RESEARCH Pitfall 6) | test | n/a (stub-injection over source text) | `tests/render3d.test.js` itself — stub lines 20–42, loader lines 44–51 | exact |
| `css/style.css` (canvas sizing shift: fixed 480×640 + CSS upscale → window-sized buffer) | config | n/a | `css/style.css` itself, lines 3–10 | exact |

Unchanged by design (do not plan edits): `index.html` (importmap already pins what's needed — CONTEXT "untouched unless the spike changes importmap delivery (it should not)"), `tests/boundary.test.js` (fence must stay **green**, not be loosened), `js/game.js`, `js/rope.js`, `js/player.js`, `js/upgrades.js`, `js/interpolate.js`.

## Pattern Assignments

### `.planning/spikes/ps1-look.html` (spike, request-response)

**Analog for CDN pinning:** `index.html` lines 9–15 — the spike MUST reuse the exact pinned importmap entry (RESEARCH threat pattern: no second/unpinned CDN URL):

```html
<script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js"
    }
  }
</script>
```

Everything else in the spike is net-new GLSL/RT code — copy from **RESEARCH Patterns 1–3** (`02-RESEARCH.md` lines 170–265), not from the codebase (no RT/post-pass code exists yet). The spike's internal structure (create renderer → build RT → build post quad → rAF loop) is the same skeleton later ported into `createScene`, so organize it in that order for a clean port.

---

### `js/render3d.js` (WebGL renderer layer, transform/read-only)

**Analog:** `js/render3d.js` itself (Phase-1). Keep the shape, replace the guts.

**Keep-contract pattern** (lines 1–4, 12–14, 42–49) — imports, `WORLD_PER_PIXEL` mapping, factory signature, closure state, `{ render }` return:

```javascript
import * as THREE from 'three';
import { lerpPhase } from './interpolate.js';

const WORLD_PER_PIXEL = 0.01;

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(canvas.width, canvas.height, false);
  // ... scene-graph built once here (rig, rope arc, stage, RT, post quad) ...
  function render(view) {
    const phase = lerpPhase(view.prevPhase, view.rope.phase, view.alpha);
    // ... write rotations/positions/scales only; never mutate view ...
    renderer.render(scene, camera);
  }
  return { render };
}
```

Key facts the rebuild must preserve:

- `lerpPhase(view.prevPhase, view.rope.phase, view.alpha)` at line 43 is the **only** clock entry — rope arc `theta = phase * Math.PI * 2` and every character pose derives from it (D-08/D-14; feet-at-phase-0.5 pin: `js/rope.js:11-13` `atFeet` window 0.45–0.55).
- `view.player.y * WORLD_PER_PIXEL` at line 45 is the sim-pixel→world mapping — reuse for blob-shadow scale/opacity (RESEARCH Pattern 6) and leg tuck (`airborne = view.player.y > 0`).
- `view.player.squash` is already reachable via the `player` object passed at `js/shell.js:104` — no view-payload change needed for squash/stretch (`body.scale.set(1 / s, s, 1 / s)`, RESEARCH Pattern 4).
- **Delete** `worldX` / bar-obstacle code (lines 8–10, 35–40) — D-08 replaces it with the arc; RESEARCH anti-pattern list forbids keeping the 2D obstacle model in 3D.
- New GL surface (RT, `ShaderMaterial` quad, `Group`, lights, `Fog`, `onBeforeCompile` snap helper) comes from RESEARCH Patterns 1–3 — nothing in the codebase has it yet.

**Boundary constraints that bind this file** (from `tests/boundary.test.js`):

- Line 13: `BROWSER_IO_RE = /performance[.]now|Date[.]now|requestAnimationFrame|localStorage|\bdocument\b/` — **none of those tokens may appear anywhere in render3d.js** (test at lines 103–113 fails otherwise). Idle animation must read `view.now`, never call `performance.now()` itself; resize must be a passive `canvas.width/height` read inside `render()` or shell-driven — never `window.addEventListener('resize')` here.
- Only `js/shell.js` may hold those tokens; `render3d.js` is reachable in the graph only via shell's import at `js/shell.js:4`, and the `three` specifier is bare so ARCH-01 tolerates it (`tests/boundary.test.js:52-56` walks bare specifiers separately from the IO gate).

---

### `js/shell.js` (runtime shell controller, event-driven + fixed-step loop)

**Analog:** `js/shell.js` itself.

**View-payload pattern to extend** (line 104) — one-line addition of `now` (Pattern 5 in RESEARCH; the rAF timestamp arg already exists at line 83, zero new IO calls):

```javascript
  function frame(now) {
    // ...
    try {
      scene.render({ run, rope, player, prevPhase, alpha: acc / STEP, best });
    } catch (err) {
      console.error('render failed:', err);
    }
    requestAnimationFrame(frame);
  }
```

becomes `scene.render({ run, rope, player, prevPhase, alpha: acc / STEP, best, now })`. Note `now` is also consumed at lines 31/54 for hold timing (`performance.now()` used directly — same value domain as the rAF timestamp, so passing `now` is consistent).

**Canvas sizing pattern to replace** (lines 6–7, 11–12) — currently a fixed buffer; criterion 4 (full window size) wants window-sized buffer, shell-side:

```javascript
const W = 480;
const H = 640;
// ...
canvas.width = W;
canvas.height = H;
```

→ replace with `window.innerWidth/innerHeight`-style sizing set from within `startGame` (shell is the sole IO owner; `window.addEventListener('resize', ...)` belongs **here**, matching the existing listener-wiring style at lines 38–41). **No resize listener exists anywhere in the repo today** (verified: `grep -n resize js/` is empty) — this is genuinely new wiring, so copy the listener-registration idiom from lines 38–41.

**Also unchanged but load-bearing:** the `try { scene.render(...) } catch` wrapper (lines 103–107) keeps a shader/scene error from killing the rAF loop — do not remove while the new pipeline is in flight.

---

### `tests/render3d.test.js` (test, stub-injection)

**Analog:** `tests/render3d.test.js` itself.

**THREE_STUB surface to extend** (lines 20–42) — currently exactly: `Vec3`, `Node` (with `position`/`rotation`/`add`/`setSize`/`lookAt`/`translate`/`set`/`render` no-ops), `WebGLRenderer`, `Scene`, `Color`, `PerspectiveCamera`, `PlaneGeometry`, `BoxGeometry`, `MeshBasicMaterial`, `Mesh`. Every new THREE symbol used at scene-build time in `render3d.js` must be added here (RESEARCH Pitfall 6): at minimum `WebGLRenderTarget`, `ShaderMaterial`, `OrthographicCamera`, `Group`, `Vector2`, `TubeGeometry`, `CatmullRomCurve3`, `CylinderGeometry`, `SphereGeometry`, `CircleGeometry`, `DirectionalLight`, `Fog` — plus any method the render path calls (`setRenderTarget`, `setPixelRatio`, `updateProjectionMatrix`, `setSize` on RT, `setScalar` on scale, material `.onBeforeCompile` assignment is just a property write so it's stub-safe).

Keep the two invariants of this file:

1. **Stub-loader pattern** (lines 44–51) — source text rewrite, never a real `three` import:

```javascript
async function loadStubbedCreateScene() {
  const src = await readFile(render3dPath, 'utf8');
  const rewritten = src
    .replace(/from\s*['"]three['"]/, `from '${THREE_STUB_HREF}'`)
    .replace(/from\s*['"][^'"]*interpolate\.js['"]/, `from '${interpolateHref}'`);
  const mod = await import('data:text/javascript,' + encodeURIComponent(rewritten));
  return mod.createScene;
}
```

2. **Zero relative specifiers into `js/`** in this file (own comment lines 12–15) — otherwise the `tests/boundary.test.js` entry-point walk (lines 29–43) registers `render3d.js` as a sim-graph entry and the ARCH-01 fence goes red. The current file only touches `js/` via `readFile`/`pathToFileURL`, never `import '../js/...'` — keep it that way.

Contract pins to keep green (lines 55–80): `createScene` returns a plain object; `.render` is a function; `scene.render(sampleView)` doesn't throw. The sample view (lines 72–79) must gain `now` (and renderer code must coerce — `view.now ?? 0` — per the repo "coerce, don't reject" convention; also the sample lacks `player.squash`/`run.status`, so scene code must default those too or the pin must be updated deliberately).

---

### `css/style.css` (config)

**Analog:** `css/style.css` itself, lines 3–10:

```css
canvas {
  image-rendering: pixelated;
  background: #f7f3e8;
  max-height: 95vh;
  aspect-ratio: 3 / 4;
  width: auto;
  height: auto;
}
```

Changes implied by criterion 4 + RESEARCH open question 4: with a window-sized canvas buffer, drop the CSS upscale ratio (`aspect-ratio: 3 / 4`, `max-height: 95vh`) so the buffer is 1:1 with display size; `image-rendering: pixelated` (line 4) stays as belt-and-braces though the GL nearest-sampling path must not rely on it (RESEARCH Pitfall 2). `background: #f7f3e8` should shift to the moody palette (D-07) to avoid a bright flash under the canvas. HUD stays DOM (lines 11–24) — this is the standing answer to D-03's "how does snap avoid jittering UI": HUD text is never in GL. Note the new dim `background` also replaces `scene.background = '#f7f3e8'` in `js/render3d.js:17` (match sky/fog color per D-06/D-07).

## Shared Patterns

### Boundary fence (ARCH-01 / browser-IO gate)
**Source:** `tests/boundary.test.js` lines 12–13 (regexes), 52–56 (three fence), 103–113 (IO gate)
**Apply to:** every task touching `js/*.js`
```javascript
const SPECIFIER_RE = /(?:\bfrom\s*|\bimport\s*\(\s*)['"]([^'"]+)['"]/g;
const BROWSER_IO_RE = /performance[.]now|Date[.]now|requestAnimationFrame|localStorage|\bdocument\b/;
```
Consequences for this phase: `three` imported only in `js/render3d.js`; `performance.now()` only in `js/shell.js` (view.now field rides on the existing rAF timestamp at `js/shell.js:83`); no `resize` listener, no `document`, no clock inside `render3d.js`. Run `node --test tests/boundary.test.js` after every scene-work commit (suite is <1s).

### create\*-factory + named exports + closure state
**Source:** `js/render3d.js:12-49` (also `js/rope.js:1-3`, `js/player.js:1-3`)
**Apply to:** `js/render3d.js` rebuild, spike port
Factory `create*` returning a plain object of functions; all mutable scene/renderer state closed over; no classes; named exports only; 2-space indent; `import` specifiers always relative with `.js` for local modules.

### Canonical-clock interpolation
**Source:** `js/interpolate.js:1-7` (`lerpPhase`, wrap-safe), call site `js/render3d.js:43`, payload produced `js/shell.js:90/98` (`prevPhase`) + `:104` (`alpha: acc / STEP`)
**Apply to:** rope arc rotation, arm circles, scarf lag, idle-blend — every animated pose quantity. No `AnimationMixer`, no renderer-local `dt` accumulator (D-14/ARCH-02 — a second timing system is an explicit anti-pattern).

### Sim-pixel → world mapping
**Source:** `js/render3d.js:4` (`const WORLD_PER_PIXEL = 0.01`) + `:45` (`view.player.y * WORLD_PER_PIXEL`)
**Apply to:** blob shadow scale/opacity, character jump offset. Keep the constant; RESEARCH Pattern 6's shadow formulas use it verbatim.

### Coerce, don't reject (view-field robustness)
**Source:** repo convention (AGENTS.md / CONVENTIONS: `Number(...) || 0` at old `js/game.js:39`; RESEARCH Security table: "Renderer-side `view.now ?? 0`-style coercion")
**Apply to:** every new view field read in `render3d.js` (`view.now ?? 0`, `view.player.squash ?? 1`, `view.run.status ?? 'idle'`) — keeps the stub-test view (tests/render3d.test.js:72–79) passing without forced churn.

### Pinned-CDN reuse
**Source:** `index.html:9-15`
**Apply to:** `.planning/spikes/*.html` — byte-identical importmap block, same jsdelivr URL, no addons entry (RESEARCH threat pattern: importmap scope creep).

## No Analog Found

Aspects with no codebase precedent — planner must specify these from RESEARCH.md rather than an analog:

| Aspect | File | Reason / Source instead |
|------|------|-----------|
| Render-target + post-pass pipeline | `js/render3d.js` | No GL pipeline code exists; use RESEARCH Pattern 1 (lines 170–204) |
| Bayer/quantize/sRGB fragment shader | `js/render3d.js` | No shaders in repo; RESEARCH Pattern 3 (lines 247–267) |
| `onBeforeCompile` vertex snap | `js/render3d.js` | No shader injection in repo; RESEARCH Pattern 2 (lines 208–242), chunk anchor bundle-verified |
| Window resize wiring | `js/shell.js` | No resize listener anywhere in repo (verified empty grep); wire per RESEARCH "Code Examples → Render-target sizing at resize" (lines 378–385) using the listener idiom of `js/shell.js:38-41` |
| Lights / fog / non-basic materials | `js/render3d.js` | Phase-1 scene is `MeshBasicMaterial`-only; RESEARCH Pattern 6 + Pattern 1 for `MeshLambertMaterial({ flatShading: true })` + `DirectionalLight` + `THREE.Fog` |

## Metadata

**Analog search scope:** `js/`, `tests/`, `css/`, `index.html` (entire tracked source tree — 12 js/html/css files, all read or grepped)
**Files scanned:** 12 source files + 1 prior-phase pattern map
**Pattern extraction date:** 2026-10-16
**Tracked-source check:** all cited analog paths present in `git ls-files` output; no gitignored mirrors referenced.
