# Phase 1: Render-Shell Foundation - Pattern Map

**Mapped:** 2026-10-15
**Files analyzed:** 7 (2 new js, 2 new/optional tests, 3 modified)
**Analogs found:** 6 / 7 (render3d.js has no same-technology analog — this is expected for a first WebGL layer)

All analog paths below are git-tracked source (`git ls-files` verified).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `js/shell.js` (new) | shell / runtime bootstrap (impure) | event-driven + fixed-timestep batch | `js/game.js` lines 53–240 (`startGame` — the code literally moves here) | exact |
| `js/render3d.js` (new) | renderer / view layer | transform (state snapshot → pixels, read-only) | `js/game.js` lines 113–222 (`draw()` — same role, Canvas2D tech being deleted per D-02) + `js/rope.js:15-17` (`obstacleX` mapping semantics) | role-match, different tech |
| `js/game.js` (modified) | model / simulation orchestration (pure) | CRUD-ish state transitions | Itself lines 1–51 (kept verbatim) + `js/upgrades.js:16` (`pickTwo` DI precedent) for the `rng` param | exact (it's a subtraction + 2 small additions) |
| `tests/boundary.test.js` (new) | test | static file I/O / transform | `tests/game.test.js` lines 1–12 (test skeleton) | exact (test conventions), no analog for the fs-graph-walk mechanics → use RESEARCH.md §Pattern 3 sketch |
| `tests/run-init.test.js` (optional, planner discretion) | test | unit | `tests/game.test.js` | exact |
| `index.html` (modified) | config / entry point | n/a | Itself (13 lines) + RESEARCH.md §Code Examples "index.html target shape" | role-match; importmap is new to repo |
| `css/style.css` (modified, only if HUD overlay chosen) | config / style | n/a | Itself (10 lines) | exact |

Unchanged by design: `js/rope.js`, `js/player.js`, `js/upgrades.js`, all four existing `tests/*.test.js` (API-surface contract).

## Pattern Assignments

### `js/shell.js` (shell, event-driven + fixed-timestep)

**Analog:** `js/game.js` lines 53–240 — this file IS the destination of that code. Copy almost verbatim, with the five deltas below.

**Imports + bootstrap pattern** (from `js/game.js:1-3, 238-240`; guard MOVES here per D-01/Pitfall 7):
```js
// js/shell.js
import { createRun, startRun, tickRun, applyUpgrade, loadBest, saveBest, ROPE_PERIOD } from './game.js';
import { createRope, createPlayer } from './rope.js'; // createRope from rope.js, createPlayer from player.js
import { createScene } from './render3d.js';

if (typeof document !== 'undefined') {
  startGame(document.getElementById('game'));
}
```
(Named exports only, relative imports with `.js` extension — repo-wide convention.)

**Closure state + constants pattern** (`js/game.js:53-55, 59-68` — keep `W=480, H=640, STEP=1/120`; set `canvas.width/height` stays here, NOT in render3d per Pitfall 8):
```js
const W = 480;
const H = 640;
const STEP = 1 / 120;

export function startGame(canvas) {
  canvas.width = W;
  canvas.height = H;
  const rng = Math.random;               // NEW: single injection seam (ARCH-02b)
  const scene = createScene(canvas);     // NEW: replaces ctx = canvas.getContext('2d')
  let rope = createRope(ROPE_PERIOD);
  let player = createPlayer();
  let run = { ...createRun(), status: 'idle' };
  let prevPhase = rope.phase;            // NEW: prev/curr capture (criterion 4)
  let best = loadBest(localStorage);
  let acc = 0;
  let last = performance.now();
```

**Input wiring pattern** (`js/game.js:96-99` — keep listener registration verbatim; internal behavior changes per Pitfall 5: handlers set intent flags, the step loop consumes them; `performance.now()` for hold duration at `js/game.js:72, 82` stays — it measures physical press duration, not a sim clock):
```js
  canvas.addEventListener('pointerdown', press);
  canvas.addEventListener('pointerup', release);
  window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) press(); } });
  window.addEventListener('keyup', e => { if (e.code === 'Space') release(); });
```

**Accumulator/frame pattern** (`js/game.js:224-235` — KEEP clamp and structure; deltas: capture `prevPhase` before each step, pass `rng` to `tickRun`, call `scene.render({...})` instead of `draw()`, compute `alpha = acc / STEP`):
```js
  function frame(now) {
    acc += (now - last) / 1000;
    last = now;
    if (acc > 0.25) acc = 0.25;          // spiral-of-death clamp — verified existing at js/game.js:227
    while (acc >= STEP) {
      // consume input intents here (Pitfall 5)
      if (run.status === 'running') {
        prevPhase = rope.phase;          // capture BEFORE the step
        const out = tickRun(run, rope, player, STEP, rng);
        ({ run, rope, player } = out);
        if (out.tripped) { best = Math.max(best, run.score); saveBest(localStorage, best); }
      } else {
        prevPhase = rope.phase;          // frozen states: prev === curr
      }
      acc -= STEP;
    }
    scene.render({ run, rope, player, prevPhase, alpha: acc / STEP, best });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
```

**Delta — both reset sites collapse** (`js/game.js:74-76` and `90-92`): replace the inline `rope = { phase: 0.33, period: 1.3 }; ...` with one call to the new pure `startRun()` from `game.js` (see Pattern 5 of RESEARCH.md):
```js
  // press() when idle, and release() when over:
  ({ rope, player, run } = startRun());
```

**Delta — delete:** `const ctx = canvas.getContext('2d')` (line 58) and the entire `draw()` (lines 113–222) per D-02. Post-refactor, `grep -rn getContext js/` must show `'2d'` nowhere (`'webgl2'` only inside `render3d.js`/WebGLRenderer).

**Delta — HUD writes (if Pattern 4a DOM overlay chosen):** `shell.js` sets `element.textContent` only (never `innerHTML` — security table in RESEARCH.md). Mirror the status copy currently at `js/game.js:202-221` ("press space / tap to start", offer name + "tap / space to pick", "Missed! Score N", "best N").

**Do NOT propagate:** the stray 4-space indentation at `js/game.js:62-65, 70-78` [verified] — use 2 spaces throughout.

---

### `js/render3d.js` (renderer, read-only state transform)

**Analog:** none same-tech. Two partial sources:
- `js/game.js:113-222` (`draw()`) — the *semantics* to preserve (what maps to what), not the code (deleted per D-02).
- `js/rope.js:15-17` (`obstacleX`) — the phase→position mapping to mirror in world units.

**Factory API shape** (repo convention: `create*` factory returning fresh object/function — `js/game.js:5-7`, `js/rope.js:1-3`):
```js
// js/render3d.js — SOLE `three` importer in the project (ARCH-01)
import * as THREE from 'three';   // bare specifier → importmap in index.html

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(W, H, false);  // updateStyle=false — backing store fixed 480x640; css/style.css owns display size (Pitfall 8)
  // floor plane, playerBox, obstacleBox, PerspectiveCamera at fixed position
  return function render(view) { /* READ-ONLY over view */ };
}
```

**Phase→world-x mapping** — mirror `obstacleX` semantics (phase 0 → far edge, 0.5 → center) [verified `js/rope.js:15-17`]:
```js
function worldX(phase) { return CENTER + (EDGE - CENTER) * (1 - 2 * phase); }
```

**Wrap-aware interpolation** (REQUIRED — Pitfall 3; naive lerp sweeps the rope backwards once per revolution, `updateRope` wraps phase into [0,1) verified `js/rope.js:5-9`):
```js
function lerpPhase(prev, curr, alpha) {
  let d = curr - prev;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  let p = prev + d * alpha;
  return ((p % 1) + 1) % 1;
}
```
Safe because per-step delta = `(1/120)/1.3 ≈ 0.0064 ≪ 0.5`.

**Display-value derivations to carry from `draw()`** (state→visual relationships the WebGL scene should reproduce): rope angle `theta = phase * Math.PI * 2`, bob `sin(theta) * 2`, sway `sin(theta) * 5` (`js/game.js:142-143, 161`); obstacle at `rope.phase`-driven x (`js/game.js:187`); player height `player.y` (`js/game.js:139`); squash `player.squash` (`js/game.js:135-138`) — last one optional for flat boxes.

**Discipline:** renderer never assigns to sim state, never calls sim functions, never touches `performance.now()`/`Date.now()`/own accumulator (Anti-Patterns §in RESEARCH.md). `MeshBasicMaterial` unlit is the recommended start (Open Question 1). No `three/addons/...` imports.

---

### `js/game.js` (model, pure state transitions) — MODIFIED

**Analog:** itself. Lines 1–51 (`createRun`, `tickRun`, `applyUpgrade`, `loadBest`, `saveBest`) stay **byte-compatible** — `tests/game.test.js:3` imports exactly `{ createRun, tickRun, applyUpgrade, loadBest, saveBest }` from `../js/game.js` and calls `tickRun` with 4 positional args (`tests/game.test.js:17, 25, 35, 44`) [verified].

**Delta 1 — ARCH-02b: rng as optional 5th param** (mirrors the DI pattern at `js/upgrades.js:16`, `pickTwo(upgrades, rng)`):
```js
// js/game.js — signature change at line 9; body change at line 23
export function tickRun(run, rope, player, dt, rng = Math.random) {
  // ...
  offer = pickTwo(UPGRADES, rng);   // was: pickTwo(UPGRADES, Math.random)
```
The only remaining `Math.random` reference in sim code is the default parameter the shell always overrides (Assumption A1 — module-level `defaultRng` alias is the cosmetic fallback).

**Delta 2 — ARCH-02a: single `startRun()` factory** — collapses the dual `phase: 0.33` init (`js/game.js:74` idle-start ≡ `js/game.js:90` restart, equivalence verified in RESEARCH.md §Pattern 5). The `0.33`/`1.3` literals currently live ONLY at those two shell lines; after the change they live only here:
```js
// js/game.js — NEW pure export; needs `jump` added to the player.js import on line 2
export const START_PHASE = 0.33;
export const ROPE_PERIOD = 1.3;
export function startRun() {
  return {
    rope: { phase: START_PHASE, period: ROPE_PERIOD },
    player: jump(createPlayer(), 0.1),
    run: { ...createRun(), status: 'running' },
  };
}
```
No test pins 0.33 or the 0.1 hold [verified — RESEARCH.md §Pattern 5]; keep the lead-in (~0.43 s before the feet window at phase 0.45, `js/rope.js:11-13`).

**Delta 3 — delete lines 53–240** (constants, `startGame`, `draw()`, bootstrap guard) → moved to `shell.js`. File ends at pure exports (Pitfall 7: exactly one bootstrap site, in `shell.js`). `createRope` import on line 1 may become unused inside `game.js` — remove if so.

---

### `tests/boundary.test.js` (test, static file I/O)

**Analog for skeleton:** `tests/game.test.js:1-12` — `node:test` + `node:assert/strict`, top-level `test('name', () => {...})`, no framework config.

**Test skeleton pattern** (from `tests/game.test.js:1-2`):
```js
import test from 'node:test';
import assert from 'node:assert/strict';
```

**New mechanics (no repo analog — use RESEARCH.md §Pattern 3 sketch):** `node:fs/promises.readFile` + `node:path.resolve` + `node:url.fileURLToPath`; regex `/(?:\bfrom\s*|\bimport\s*\(\s*)['"]([^'"]+)['"]/g` catches static AND dynamic imports; entry list must mirror what `tests/*.test.js` import (`game.js`, `rope.js`, `player.js`, `upgrades.js` — verified `tests/game.test.js:3-7`); prefer deriving entries from the test files' own imports (Pitfall 6).

**Extend with ARCH-02 greps** (same file or `tests/run-init.test.js`, planner discretion per D-03):
- no `phase: 0.33` literal in any `js/*.js` outside the `START_PHASE` constant in `game.js` (current debt anchors to vanish: `js/game.js:74, 90` [verified]);
- no inline `Math.random` call site in the sim graph outside a default parameter (current anchor: `js/game.js:23` [verified]);
- `tickRun(..., fixedRng)` determinism check using the `pickTwo` stub-rng style from `tests/upgrades.test.js`.

---

### `index.html` (config / entry point) — MODIFIED

**Analog:** itself (13 lines) for document structure; RESEARCH.md §Code Examples for the importmap (no repo analog — new build-adjacent config).

**Current relevant line** (`index.html:11` [verified]): `<script type="module" src="js/game.js"></script>` → swap src to `js/shell.js`, add importmap + HUD div:
```html
<head>
  <script type="importmap">
    { "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js" } }
  </script>
  <!-- importmap MUST be declared before any module script using bare specifiers (Pitfall 2) — put it in <head>, exactly one map -->
</head>
<body>
  <canvas id="game"></canvas>
  <div id="hud" aria-hidden="true"><!-- spans shell fills via textContent --></div>
  <script type="module" src="js/shell.js"></script>
</body>
```
URL liveness verified this session (200, immutable cache, CORS `*` — RESEARCH.md §Version verification). No `es-module-shims`. Add `"three/addons/"` prefix entry only if/when the first addon appears (none needed this phase).

---

### `css/style.css` (style) — MODIFIED (only for HUD overlay 4a)

**Analog:** itself. Keep the existing canvas contract untouched — `aspect-ratio: 3/4` + `image-rendering: pixelated` + `max-height: 95vh` (`css/style.css:3-9` [verified]) is the letterbox/resize baseline Pitfall 8 depends on; resize handling is Phase 5, do not solve now. Add `#hud { position: absolute; ... }` overlay rules only.

## Shared Patterns

### DI for external nondeterminism
**Source:** `js/upgrades.js:16` (`pickTwo(upgrades, rng)`) and `js/game.js:37-51` (`loadBest(storage)`/`saveBest(storage, score)`)
**Apply to:** `tickRun` 5th param (game.js), all storage calls (shell.js carries `loadBest(localStorage)`/`saveBest(localStorage, best)` verbatim from `js/game.js:66, 89, 109`). try/catch + silent degradation in the pure functions stays as-is.

### Immutable state via spread, never mutate
**Source:** `js/game.js:30` (`{ ...run, score, skips, status, offer }`), `js/rope.js:8`, `js/player.js:10`
**Apply to:** `startRun()` (`{ ...createRun(), status: 'running' }`), shell's `run = { ...run, status: 'running' }` patterns. The `scene.render({...})` view object is a fresh literal each frame.

### Named exports only; relative imports with `.js` extension
**Source:** every file in `js/` (no default exports anywhere — verified all `^export` lines).
**Apply to:** `shell.js`, `render3d.js`, `boundary.test.js`. Only exception in the project: the bare `three` specifier in `render3d.js`, resolved by the importmap.

### Bootstrap guard
**Source:** `js/game.js:238-240` (`if (typeof document !== 'undefined') { startGame(document.getElementById('game')); }`)
**Apply to:** `js/shell.js` only — moved, not duplicated (Pitfall 7). `game.js` becomes Node-importable without the guard because it ends at pure exports.

### 2-space indent, no section-divider comments, no console.log in sim modules
**Source:** AGENTS.md Conventions + `js/*.js` body style.
**Apply to:** all new files. Explicitly fix the pre-existing 4-space anomalies at `js/game.js:62-65, 70-78` when the code lands in `shell.js`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `js/render3d.js` (three.js scene construction: `WebGLRenderer`, `Scene`, `PerspectiveCamera`, `BoxGeometry`, `MeshLambertMaterial`/`MeshBasicMaterial`) | renderer | transform | Repo has never used WebGL/three; closest semantics are the deleted `draw()` + `obstacleX`. Use RESEARCH.md §Pattern 4 code shape; constructor call semantics flagged [ASSUMED] A3 — confirm in first browser smoke run. |
| `tests/boundary.test.js` fs/regex mechanics | test | file I/O | Repo tests are pure in-memory; use RESEARCH.md §Pattern 3 sketch (Node built-ins only, no new deps). |

## Metadata

**Analog search scope:** `js/`, `tests/`, `css/`, `index.html`, `package.json` (whole repo — read in full; 7 source files, 4 test files, 1 html, 1 css)
**Files scanned:** 13 tracked files
**Pattern extraction date:** 2026-10-15
**Notes:** All analogs git-tracked (verified `git ls-files`). Baseline `node --test tests/` green per RESEARCH.md environment inventory.
