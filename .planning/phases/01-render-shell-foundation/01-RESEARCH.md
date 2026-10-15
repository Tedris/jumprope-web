# Phase 1: Render-Shell Foundation - Research

**Researched:** 2026-10-15
**Domain:** Browser 3D render shell (Three.js via importmap, no build step) + pure-sim boundary refactor
**Confidence:** HIGH (stack verified against registry/CDN; codebase read in full); MEDIUM on interpolation necessity (UAT-gated per STATE.md)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Three-file split around the existing boundary: `js/game.js` keeps ONLY the pure run-orchestration exports (`createRun`, `tickRun`, `applyUpgrade`, `loadBest`, `saveBest`) so existing tests import it unchanged; new `js/shell.js` holds the impure browser shell (`startGame`, input wiring, rAF/accumulator loop, storage calls, browser bootstrap guard); new `js/render3d.js` holds the Three.js scene/renderer and is the **sole** module importing `three`. `index.html` loads `shell.js` instead of `game.js`. — **Reversibility:** costly — undoing re-tangles sim and render and would force test-import churn again.
- **D-02:** The Canvas 2D `draw()` implementation is **deleted**, not kept as a fallback. One render path only; old code lives in git history.
- **D-03:** The ARCH-01 boundary test is an **import-graph walk** in a new `tests/boundary.test.js`: starting from every test-imported entry point (`game.js`, `rope.js`, `player.js`, `upgrades.js`), transitively resolve relative imports and fail if any module in that graph references `three`. `shell.js`/`render3d.js` are outside the graph by construction. New test file allowed — existing test files stay untouched.

### Open technical decisions (researcher/planner domain — resolved or scoped in this doc)
- **Clock & interpolation model:** → §Pattern 2 (prev/curr + alpha, wrap-aware phase lerp). Note STATE.md concern: verify whether interpolation is actually needed (120→60 Hz stutter) during Phase 1 UAT.
- **Three.js delivery:** → §Standard Stack. Exact importmap + CDN URLs verified in this session by HTTP probe; vendored 2-file fallback documented.
- **Placeholder scene content & HUD text:** → §Pattern 4. Recommendation: DOM overlay for HUD text (not a competing render path); planner's call.

### the agent's Discretion
- Renderer API shape (factory `create*`/plain functions per repo conventions vs anything else), file naming within the split beyond `shell.js`/`render3d.js`, and exact test layout for the boundary test.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. (PS1 look → Phase 2; real card choice → Phase 3; audio → Phase 4; pause/resize → Phase 5.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ARCH-01 | Simulation core stays pure, framework-free, and Node-testable while the 3D shell owns the only `three` import | §Standard Stack (importmap delivery), §Pattern 1 (file split), §Pattern 3 + Wave 0 (import-graph-walk boundary test), §Pitfall 2 (`three` resolves to nothing in Node — hard failure enforces the boundary naturally) |
| ARCH-02 | Run state resets through a single code path and randomness is injected — dual `phase: 0.33` init and inline `Math.random` in `tickRun` are gone | §Pattern 5 (`startRun()` single path, verified equivalent to both current paths), §Pattern 6 (rng as optional 5th param of `tickRun`, test-signature constraint verified) |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Three.js via CDN **for rendering only**; WebGL layer never feeds back into game logic; simulation core stays pure and framework-free.
- Static files only, **no build step**, zero npm dependencies — `package.json` must stay dependency-free.
- Pure modules never touch DOM, `Date`, `Math.random` directly, or storage; randomness stays injectable (`pickTwo(upgrades, rng)` precedent); storage via parameter (`loadBest(storage)`).
- Naming: `create*` factories returning fresh plain objects, `update*` returning new state (never mutate), named exports only, relative imports with `.js` extension, 2-space indent, no `console.log` in pure modules.
- `typeof document !== 'undefined'` guard makes modules Node-importable — this guard **moves to `shell.js`** (per D-01), pure modules simply stop needing it.
- Do not propagate the stray 4-space indentation at `js/game.js:62-65, 70-78` [VERIFIED: js/game.js:62-65].

## Summary

This is a brownfield boundary refactor, not a greenfield build. The existing `js/game.js` already contains a fixed-timestep accumulator shell (0.25 s clamp) around pure `createRun`/`tickRun`/`applyUpgrade` exports; the phase splits that file three ways (D-01), swaps the Canvas 2D `draw()` for a Three.js placeholder scene, and locks the sim/render boundary with an import-graph test. All four success criteria are achievable with small, mechanical changes — the only genuinely new machinery is prev/curr state capture for render interpolation and the importmap-pinned `three@0.186.1` load.

The Three.js delivery question is fully settled: `three@0.186.1` is the current npm release (published 2026-09-24), and its jsdelivr ESM build serves 200 today with a 1-year immutable cache and `CORS: *`. One structural fact matters: **the ESM build is two files** — `three.module.js` has a top-level `import ... from './three.core.js'` — which is fine over a CDN (URL-relative resolution) but means a *vendored* fallback must copy both files.

The two debt fixes are mechanically constrained by the unchanged-test requirement: existing tests call `tickRun(run, rope, player, dt)` with exactly 4 positional args and expect offers to work [VERIFIED: tests/game.test.js], so `rng` must arrive as an **optional 5th parameter**; and the two reset sites (`js/game.js:74` idle-start, `js/game.js:90` restart) are provably equivalent enough to collapse into one `startRun()` factory (§Pattern 5).

**Primary recommendation:** Follow D-01's three-file split literally; `shell.js` owns time (accumulator + prev/curr snapshots), `render3d.js` owns a `createScene(canvas)`/`render(view)` pair that reads derived state only, and `three` enters the app through exactly one importmap-pinned jsdelivr URL — with a two-file `vendor/three/` fallback if offline play ever matters.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Game rules, physics, scoring | Simulation core (`js/*.js` pure modules) | — | Existing purity invariant; Node-testable, zero browser APIs |
| Time & stepping (accumulator, STEP, prev/curr capture) | Browser shell (`js/shell.js`) | — | Only place `performance.now()`/rAF live; sim consumes fixed `STEP`, never wall time |
| Input capture (pointer/key → press/release intents) | Browser shell | — | Events → queued intents applied inside the step loop (see Pitfall 5) |
| Scene construction & drawing | Render layer (`js/render3d.js`) | — | Sole `three` importer; reads derived display state, never writes sim state |
| HUD text (score/best/status/offer) | Browser shell (DOM overlay) | Render layer (Phase 2 option) | DOM text is chrome, not a second scene path; keeps `render3d.js` uncontested |
| Persistence (best score) | Browser shell | sim (`loadBest`/`saveBest` stay pure, take `storage`) | Existing DI pattern, unchanged |
| Module resolution for `three` | `index.html` importmap | — | Only build-adjacent config in a no-build project |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | 0.186.1 | WebGL renderer for the placeholder scene (sole dependency, render-only) | The one sanctioned dependency per PROJECT.md/STATE.md; current npm `latest` [VERIFIED: npm registry, 2026-10-15] |

There is nothing else. **No npm install happens at all** — `three` is fetched at runtime by the browser from a pinned URL; `package.json` keeps `{ "name": "jumprope-web", "private": true, "type": "module" }` shape with no dependencies (verify it stays that way).

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | | Node's built-in `node:test` + `node:assert/strict` + `node:fs` + `node:path` cover the boundary test | Already the project's whole test stack |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jsdelivr file URL | esm.sh (`https://esm.sh/three@0.186.1`) | esm.sh serves a tiny redirect/composition stub (131 B) instead of the module itself [VERIFIED: curl probe]; adds a second network hop and rewrites internals. Direct jsdelivr file URL is more transparent and cache-stable. |
| jsdelivr | unpkg (`https://unpkg.com/three@0.186.1/build/three.module.js`) | Serves the identical 662,772-byte file [VERIFIED: curl probe]; jsdelivr chosen for the explicitly immutable cache header and reliability track record — either is fine, pick one and never mix. |
| CDN importmap | Vendored `vendor/three/three.module.js` + `vendor/three/three.core.js` pointed at by the same importmap | Works fully offline and removes a runtime third-party dependency, but adds ~1 MB of build-artifact-looking files to a zero-dependency repo. **If vendoring: copy BOTH files** — `three.module.js` top-level-imports `./three.core.js`, and `three.core.js` has no further imports, so two files is the complete closure [VERIFIED: HTTP probe of both files]. |

**Installation:** none. The only file edits are to `index.html` (importmap + module src swap).

### Version verification (this session)
- `npm view three@0.186.1 version` → `0.186.1`; `dist-tags.latest` → `0.186.1`; last publish 2026-09-24 [VERIFIED: npm registry].
- `GET https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js` → 200, 662,772 B, `cache-control: public, max-age=31536000, s-maxage=31536000, immutable`, `access-control-allow-origin: *` [VERIFIED: curl probe].
- Package `exports` map: `"." → "./build/three.module.js"` (import), `"./addons/*" → "./examples/jsm/*"`, `"./webgpu" → "./build/three.webgpu.js"` [VERIFIED: package.json from jsdelivr].

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| three | npm (as CDN file URL) | project ~14 yrs; this patch 0.186.1 ≈ 3 weeks | ~21.4M/wk | github.com/mrdoob/three.js | [SUS: "too-new" signal] | Keep — false positive, see below |

**Why the [SUS] verdict is a false positive:** the seam's only reason is `too-new`, computed from the *patch release date* (2026-09-24), not package age. All other signals are clean: exists=true, 21.4M weekly downloads, official repo, no postinstall script, not deprecated [VERIFIED: package-legitimacy seam signals]. three.js is the canonical WebGL library and already a locked project decision (STATE.md: "Three.js r186 via pinned importmap is the one sanctioned dependency").
**Packages removed due to [SLOP]:** none.
**Packages flagged [SUS]:** `three` — planner may insert a cheap `checkpoint:human-verify` ("confirm the pinned three@0.186.1 URL loads and renders the placeholder scene") rather than an install gate, since nothing is installed.

## Architecture Patterns

### System Architecture Diagram

```
index.html
 ├─ <script type="importmap"> {"three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js"}
 │      └─ resolves bare "three" → CDN ──► three.module.js ──(relative import)──► three.core.js
 └─ <script type="module" src="js/shell.js">
        │
        ▼
js/shell.js  (impure: DOM, rAF, performance.now, localStorage, bootstrap guard)
  ├─ owns CLOCK: acc += frameTime (clamped 0.25); while acc>=STEP { prev=snapshot; step; acc-=STEP }
  ├─ owns INPUT: pointer/key → press/release intents applied at step boundaries
  ├─ imports ./game.js  (pure sim)          ── tickRun(run, rope, player, STEP, rng)
  └─ imports ./render3d.js (three layer)    ── render({ run, rope, player, prevPhase, alpha, best })
                                   │
js/game.js ──► js/rope.js, js/player.js, js/upgrades.js      ▼
   (pure graph — NEVER imports "three"; enforced by tests/boundary.test.js)
                                                        js/render3d.js  ── import * as THREE from 'three'  (sole importer)
                                                               └─► <canvas id="game">  (WebGL)
DOM overlay <div id="hud"> ◄── shell writes score/best/status text (chrome, not scene)
```

Data flows one way: **events → shell → sim state → render3d reads snapshot → pixels**. No arrow points from the right side back into sim state.

### Recommended Project Structure
```
js/
├── game.js        # pure: createRun, startRun (NEW), tickRun(+rng param), applyUpgrade, loadBest, saveBest
├── rope.js        # unchanged
├── player.js      # unchanged
├── upgrades.js    # unchanged
├── shell.js       # NEW impure shell: startGame, input, clock/accumulator, storage calls, bootstrap guard
└── render3d.js    # NEW: sole `three` importer, createScene(canvas) → { render, ... }
tests/
├── game.test.js   # UNCHANGED (defines the import-compatible API surface)
├── rope.test.js / player.test.js / upgrades.test.js   # UNCHANGED
└── boundary.test.js  # NEW: import-graph walk (ARCH-01) + debt greps (ARCH-02)
index.html         # importmap + src swap to js/shell.js (+ HUD overlay div if Pattern 4a chosen)
vendor/three/      # OPTIONAL offline fallback: three.module.js + three.core.js
```

### Pattern 1: The three-file split (D-01) — mechanical, with two subtleties

Move `startGame` + `W/H/STEP` + the `typeof document` bootstrap verbatim-ish into `shell.js`; delete `draw()` (D-02); `game.js` keeps lines 1–51 of the current file plus the ARCH-02 fixes. Subtleties:

1. **`three` is unresolvable in Node** (it's never in `node_modules`). If any sim-graph module ever grows `import ... from 'three'`, `node --test` fails with `ERR_MODULE_NOT_FOUND` even without the boundary test — the boundary test exists to give a *named, diagnosable* failure first. [VERIFIED: repo has zero deps in package.json; `three` known-undefined for Node resolution — [ASSUMED] for the exact error class, trivially observable.]
2. **One canvas, one context type.** `render3d.js` will call `canvas.getContext('webgl2')` (or let `WebGLRenderer` do it); `shell.js` must no longer call `canvas.getContext('2d')` anywhere (see Pitfall 4).

### Pattern 2: Single clock + prev/curr interpolation (canonical: "Fix Your Timestep")

The shell keeps the existing accumulator (`js/game.js:224-234` [VERIFIED: js/game.js:224-234]) and captures the previous rope phase per step:

```js
// Source: gafferongames.com/post/fix_your_timestep/ (canonical accumulator pattern)
// js/shell.js — inside startGame closure
const STEP = 1 / 120;
let rope = createRope(1.3);            // idle: phase 0, frozen (step() early-returns unless running)
let prevPhase = rope.phase;
let run = { ...createRun(), status: 'idle' };
let player = createPlayer();
let acc = 0, last = performance.now();

function frame(now) {
  acc += (now - last) / 1000;
  last = now;
  if (acc > 0.25) acc = 0.25;          // spiral-of-death clamp — KEEP (existing, js/game.js:227)
  while (acc >= STEP) {
    if (run.status === 'running') {
      prevPhase = rope.phase;          // capture BEFORE the step
      const out = tickRun(run, rope, player, STEP, rng);
      ({ run, rope, player } = out);
      if (out.tripped) { best = Math.max(best, run.score); saveBest(localStorage, best); }
    } else {
      prevPhase = rope.phase;          // frozen states: prev == curr, alpha harmless
    }
    acc -= STEP;
  }
  scene.render({ run, rope, player, prevPhase, alpha: acc / STEP, best });
}
```

**Wrap-aware phase interpolation — required, not optional.** `updateRope` wraps phase into [0,1) [VERIFIED: js/rope.js:5-9]:
```js
// js/rope.js (verbatim, lines 5-9)
export function updateRope(rope, dt) {
  const inc = dt / rope.period;
  const phase = rope.phase + inc;
  return { ...rope, phase: phase >= 1 ? (rope.phase - 1) + inc : phase };
}
```
A naive `prev + (curr - prev) * alpha` at the wrap (prev=0.995 → curr=0.005) sweeps the rope backwards across the whole arc. Since one step advances phase by `STEP/period = (1/120)/1.3 ≈ 0.0064 ≪ 0.5` [VERIFIED: js/rope.js:6 + js/game.js:55,62], a shortest-path delta is unambiguous:

```js
// js/render3d.js (or a tiny pure helper if it needs unit tests)
function lerpPhase(prev, curr, alpha) {
  let d = curr - prev;
  if (d > 0.5) d -= 1;                 // wrapped forward past 1.0
  if (d < -0.5) d += 1;                // (defensive; not produced by forward-only stepping)
  let p = prev + d * alpha;
  return ((p % 1) + 1) % 1;
}
```

**On the STATE.md "is interpolation even needed?" concern:** at exactly 60 Hz with STEP=1/120, every frame consumes exactly 2 steps and `alpha` stays ~0 — the lerp degenerates to identity and costs nothing. Interpolation earns its keep at odd refresh rates (59.94, 144 Hz) and after the accumulator clamp under load. Ship it (success criterion 4 names prev/curr explicitly), then confirm perceptually in UAT. [ASSUMED] for the refresh-rate arithmetic claim beyond the arithmetic itself.

**Input timing reconciliation:** `holdFrom = performance.now()` measures the *duration of a physical press*, not a simulation time source; converting it to `hold` seconds at release (existing code, `js/game.js:80-84`) does not create a second clock. Keep it in `shell.js`. What must change: apply press/release as **intents consumed at step boundaries** (Pitfall 5) so `tickRun` sees discrete events, not mid-frame races.

### Pattern 3: Boundary test via import-graph walk (D-03)

Textual walk, no dependencies — the repo's import style (always relative, always `.js` extension, named imports) makes a regex sufficient:

```js
// tests/boundary.test.js — sketch (planner refines; new file allowed by D-03)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const jsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'js');
const ENTRY_POINTS = ['game.js', 'rope.js', 'player.js', 'upgrades.js'];
// catches static imports AND dynamic import() — dynamic form matters because
// `await import('three')` would otherwise slip past an import-from-only regex
const SPECIFIER_RE = /(?:\bfrom\s*|\bimport\s*\(\s*)['"]([^'"]+)['"]/g;

async function walk(spec, fromFile, seen) {
  if (!spec.startsWith('.')) { seen.add(`${spec} (imported by ${fromFile})`); return; }
  const file = resolve(dirname(fromFile), spec);
  if (seen.has(file)) return;
  seen.add(file);
  const src = await readFile(file, 'utf8');
  for (const m of src.matchAll(SPECIFIER_RE)) await walk(m[1], file, seen);
}

test('no module in the sim/test import graph references three', async () => {
  const seen = new Set();
  for (const entry of ENTRY_POINTS) await walk('./' + entry, resolve(jsDir, entry), seen);
  const offenders = [...seen].filter(n => n.split(/[:\s]/)[0].startsWith('three'));
  assert.deepEqual(offenders, []);
});
```

Note the entry-point list mirrors what `tests/*.test.js` import today — game/rope/player/upgrades [VERIFIED: tests/game.test.js:3-7]. `shell.js` and `render3d.js` are unreachable from those entries by construction once D-01's split lands (`game.js` imports nothing that touches `three`).

### Pattern 4: Placeholder scene + HUD (planner's call — recommendation given)

**4a (recommended): DOM overlay for text.** `<div id="hud">` absolutely positioned over the canvas; `shell.js` sets `textContent` on score/status elements. This is browser chrome, not a scene render path — it does not compete with `render3d.js` (the stated constraint). Zero three.js text machinery; Phase 2's look spike can migrate HUD into the low-res pipeline later if desired. The offer card can be a styled div with "tap / space to pick" (current draw() shows offer[0] + pick prompt, `js/game.js:202-209` [VERIFIED: js/game.js:202-209]).

**4b (alternative): in-scene text via CanvasTexture sprite** — coherent PS1 look sooner, but more moving parts for a placeholder phase; [ASSUMED] API pattern, not needed now.

Placeholder flat-box scene (flat shading, no textures — "placeholder flat-box scene is fine" per ROADMAP): floor plane, player box whose y mirrors `player.y`, obstacle box at a world-x derived from `rope.phase` (mirror of `obstacleX` semantics [VERIFIED: js/rope.js:15-17]: phase 0 → far edge, 0.5 → center), fixed camera. `WebGLRenderer`, `Scene`, `PerspectiveCamera`, `BoxGeometry`, `Mesh`, `MeshLambertMaterial` are all confirmed exported by the r186 build header [VERIFIED: jsdelivr three.module.js header probe]; constructor usage is standard three.js [ASSUMED — stable API, verify in browser during execution].

```js
// js/render3d.js — API shape per repo factory convention (discretion area)
import * as THREE from 'three';   // sole `three` import in the project

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(canvas.width, canvas.height, false);   // canvas stays 480x640 backing store; CSS letterboxes (css/style.css aspect-ratio 3/4)
  // ... floor, playerBox, obstacleBox, camera at fixed position ...
  return function render(view) {
    const phase = lerpPhase(view.prevPhase, view.rope.phase, view.alpha);
    obstacle.position.x = worldX(phase);                  // READ-ONLY derived from canonical clock
    player.position.y = view.player.y * WORLD_PER_PIXEL;
    renderer.render(scene, camera);
  };
}
```

Renderer is **read-only** over `view` — never `run = ...`, never calls sim functions. That's the PROJECT.md constraint expressed in code shape.

### Pattern 5: Single run start/reset path (ARCH-02a)

Both current init sites are equivalent to one factory [VERIFIED: js/game.js:70-94]:
- idle-start (line 74-76): `rope = { phase: 0.33, period: 1.3 }; player = jump(player, 0.1); status → 'running'` — during idle nothing mutates `player` (step() early-returns), so `jump(player, 0.1)` ≡ `jump(createPlayer(), 0.1)`.
- restart (line 90-92): `rope = { phase: 0.33, period: 1.3 }; player = jump(createPlayer(), 0.1); run = createRun()`.

```js
// js/game.js — NEW pure export; the ONLY place 0.33/1.3-lead-in lives
import { jump } from './player.js';
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
`shell.js` calls `startRun()` on both idle-press and over-release. The `0.1` hold-jump is a lead-in convenience (gets the player airborne at start); if the planner prefers the player to start grounded, that's a gameplay tweak to make once, in this one function — no test pins 0.33 or the 0.1 hold (grep of `tests/` shows no assertion references either [VERIFIED: tests/*.test.js read this session]). **Keep the 0.33 lead-in**: it gives the player ~0.43 s (0.33 × 1.3 s) before the feet window at phase 0.45 [VERIFIED: js/rope.js:11-13] — the same timing players have today.

Note: current idle rope is `createRope(1.3)` = phase 0, frozen (never stepped while idle). The renderer will show a static rope in idle — fine for a placeholder; the scene may gently bob the rope at phase 0.

### Pattern 6: rng injection without breaking test signatures (ARCH-02b)

Hard constraint: existing tests call `tickRun(run, rope, player, 1/60)` with 4 args and the offer path must still produce `[a, b]` [VERIFIED: tests/game.test.js:41-48]. Therefore:

```js
// js/game.js
export function tickRun(run, rope, player, dt, rng = Math.random) {
  // ... line 23 becomes:
  offer = pickTwo(UPGRADES, rng);
```
`shell.js` passes its own `rng` (today `Math.random`, later a seeded/replaceable one for tests and Phase 3 replay work). The ARCH-02 smell that dies is **inline `Math.random` at the call site inside `tickRun`'s scoring branch** [VERIFIED: js/game.js:23 — `offer = pickTwo(UPGRADES, Math.random);`]; after the change the *only* `Math.random` reference in sim code is a default parameter that the shell always overrides. If the planner wants zero `Math.random` text in `game.js`, alternatives are: default to a module-level `const defaultRng = Math.random` (cosmetic) or require 5 args with existing tests updated — **not allowed** (tests unchanged). Flag: whether the default-param form satisfies ARCH-02's letter is a judgment call → Assumptions A1.

### Anti-Patterns to Avoid
- **Renderer computing game state** (e.g., its own phase accumulator or `performance.now()`-based rope animation) — that is the exact drift failure criterion 4 forbids. Renderer derives *display* values from `(prevPhase, phase, alpha)` only.
- **Two time sources:** anything in `render3d.js`/`game.js` calling `performance.now()`/`Date.now()`. Only `shell.js` touches the clock.
- **Keeping `draw()` behind a flag** — D-02 says delete; a fallback canvas-2d path doubles the surface and violates "one render path".
- **Importing `three/addons/...` for the placeholder** (OrbitControls etc.) — nothing needed; each addon pulls more of the map. If ever needed, add `"three/addons/": ".../examples/jsm/"` to the importmap [VERIFIED: package exports map above + MDN prefix rule].
- **`es-module-shims` polyfill** — unnecessary; importmaps are Baseline widely-available since March 2023 [CITED: developer.mozilla.org importmap page].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bare-specifier resolution in a no-build app | Custom loader / `import()` URL juggling | `<script type="importmap">` | Browser-native, Baseline 2023 [CITED: MDN] |
| Render/sim clock smoothing | Per-object easing, spring smoothing, or a second timer | prev/curr + `alpha` lerp (Fix Your Timestep) | Canonical, two numbers per value, deterministic |
| Phase interpolation across 1.0 | Frame-tweening the rope mesh rotation separately | wrap-aware `lerpPhase` (§Pattern 2) | Rope mesh must not have independent smoothing — it's the scoring reference |
| "Is this module impure?" checking | Runtime context-detection hacks | static import-graph walk in `tests/boundary.test.js` | Textual check is deterministic and gives named failures |
| RNG injection | Global monkeypatching `Math.random` | optional 5th param on `tickRun` + DI already proven by `pickTwo` | Repo's established DI pattern [VERIFIED: js/upgrades.js:16] |

**Key insight:** every hard part of this phase is a *constraint-satisfaction* problem with an existing canonical answer — do not invent mechanisms; the value is in placing the seams correctly.

## Runtime State Inventory

This is a file-split refactor phase — checked all five categories:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | localStorage key `jumprope-best` (string, coerced `Number(...) || 0`) [VERIFIED: js/game.js:37-51] | None — key and format unchanged by the split |
| Live service config | None — static site, no server, no external services [VERIFIED: AGENTS.md/ARCHITECTURE constraints] | None |
| OS-registered state | None — browser app, no installers/daemons | None |
| Secrets/env vars | None — "No environment variables; no `.env` files present" (AGENTS.md Technology section) | None |
| Build artifacts | None — zero-dependency, no build step; nothing to rebuild after the split. `node_modules` absent and must stay absent | None |

**The canonical question:** after all files are updated, what still carries the old layout? Answer: nothing outside git. The only external-persisted state is the unchanged `jumprope-best` key.

## Common Pitfalls

### Pitfall 1: Vendoring only `three.module.js`
**What goes wrong:** offline fallback throws `Failed to resolve module specifier './three.core.js'` (or 404s on the sibling).
**Why it happens:** r186's ESM build is split — `three.module.js` has a top-level `import ... from './three.core.js'`; even `three.module.min.js` still imports `./three.core.js` [VERIFIED: HTTP probe of both files]. `three.core.js` itself has no further imports — two files is the complete closure.
**How to avoid:** if vendoring, copy `build/three.module.js` AND `build/three.core.js` side by side.
**Warning signs:** browser console module-resolution error immediately on load.

### Pitfall 2: Importmap declared after module scripts (or a second map added later)
**What goes wrong:** `TypeError: Failed to resolve module specifier "three"` even though the map exists.
**Why it happens:** the import map "must be declared and processed before any `<script>` elements that import modules using specifiers declared in the map" [CITED: MDN importmap page]. Also: later maps merging silently drops already-resolved specifiers.
**How to avoid:** importmap `<script>` in `<head>`, before `<script type="module" src="js/shell.js">`, exactly one map.
**Warning signs:** resolution error only on first load; works after adding a manual `<link rel="modulepreload">`.

### Pitfall 3: Naive lerp across the rope-phase wrap
**What goes wrong:** once per rope revolution (when a render frame straddles the phase 1.0→0.0 boundary), the drawn rope sweeps backwards through the whole arc — the single most visible possible bug given criterion 4.
**Why it happens:** `rope.phase` wraps into [0,1) [VERIFIED: js/rope.js:8]; `lerp(0.995, 0.005, α)` goes the long way around.
**How to avoid:** wrap-aware `lerpPhase` (§Pattern 2); safe because per-step delta ≈ 0.0064 ≪ 0.5.
**Warning signs:** visual "snap-back" at exactly one frame per jump cycle; more frequent under load (clamped accumulator → multi-step frames).

### Pitfall 4: Requesting a 2D context on the WebGL canvas
**What goes wrong:** `canvas.getContext('2d')` returning `null` after `WebGLRenderer` claimed the canvas (or vice versa) → TypeError in leftover code.
**Why it happens:** one canvas supports one context type; any surviving line of the deleted `draw()` (D-02) that re-acquires `'2d'` breaks.
**How to avoid:** delete `draw()` and the `getContext('2d')` call entirely (D-02); grep for `getContext` after refactor — must appear only inside `render3d.js`/`WebGLRenderer`.
**Warning signs:** console error at scene-construction time.

### Pitfall 5: Mutating player/rope inside event handlers (mid-frame races)
**What goes wrong:** a release landing between accumulator steps applies `jump()` at nondeterministic points; under load, multiple steps run with stale input, and jump timing feels load-dependent — the "visuals drift from scoring" failure in reverse.
**Why it happens:** current code calls `jump(player, hold)` directly from `pointerup`/`keyup` handlers [VERIFIED: js/game.js:80-94].
**How to avoid:** handlers set intent flags (`pressedAt`/`releasedThisFrame`); the step loop consumes and clears them. Single-clocked discipline (ARCH-02 spirit).
**Warning signs:** rhythm-feel complaints that correlate with machine load, not position.

### Pitfall 6: Boundary test entry list drifting from reality
**What goes wrong:** test passes while `game.js` secretly grows a dependency outside the walk.
**Why it happens:** hand-maintained entry list; someone adds `js/newthing.js` imported by `game.js` — that's fine (walk is transitive), but someone adding `shell.js` to `game.js`'s graph would be caught only because shell imports `three`-using `render3d.js` — good — unless `shell.js` itself never imports `three` directly; it imports `render3d.js` which does — still caught. Residual gap: a test file importing a NEW js module not in `ENTRY_POINTS`.
**How to avoid:** the walk can derive entries from the `tests/*.test.js` files' own relative imports instead of hardcoding (both are acceptable to D-03: "starting from every test-imported entry point").
**Warning signs:** none until it matters — prefer the derived-entry variant.

### Pitfall 7: `node --test` accidentally loading the browser bootstrap
**What goes wrong:** `ReferenceError: document is not defined` (or `performance`-related surprises) when a test imports a module that auto-invokes bootstrapping.
**Why it happens:** `js/game.js:238-240` guards with `typeof document !== 'undefined'` [VERIFIED: js/game.js:238-240]; per D-01 the bootstrap must live only in `shell.js` — if it stays duplicated in `game.js`, a future Node-side import of a shell-adjacent path breaks.
**How to avoid:** exactly one bootstrap call site, in `shell.js`; `game.js` ends at its pure exports.

### Pitfall 8: Losing the letterbox / resolution contract
**What goes wrong:** `renderer.setSize(w, h)` overwriting `canvas.width/height` and letting CSS stretch a full-window WebGL canvas — blurry or stretched scene, and Phase 2's low-res pipeline gets a moving baseline.
**Why it happens:** three's `setSize` changes the backing store and writes inline CSS styles.
**How to avoid:** construct the renderer against the existing canvas and keep the backing store fixed (`renderer.setSize(W, H, false)` — `updateStyle=false`), letting `css/style.css` (`aspect-ratio: 3/4`, `image-rendering: pixelated`) own display size [VERIFIED: css/style.css read this session]. Resize handling is Phase 5 (UI-03) — don't solve it now.

## Code Examples

### index.html target shape (canonical for this phase)
```html
<!-- Source: MDN importmap syntax + verified jsdelivr URL shape -->
<script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js"
    }
  }
</script>
<canvas id="game"></canvas>
<div id="hud" aria-hidden="true"><!-- score/best/status spans, shell updates textContent --></div>
<script type="module" src="js/shell.js"></script>
```
Importmap **before** the module script [CITED: MDN]. URL shape verified live this session: `https://cdn.jsdelivr.net/npm/three@{version}/build/three.module.js` [VERIFIED: curl probe]. `three/addons/` prefix entry: add only when first addon appears.

### shell.js skeleton (integration points only)
```js
// js/shell.js
import { createRun, startRun, tickRun, applyUpgrade, loadBest, saveBest } from './game.js';
import { createRope, createPlayer, jump } from '...';   // as needed for idle state; prefer startRun() for run init
import { createScene } from './render3d.js';

export function startGame(canvas) {
  const rng = Math.random;                 // single injection seam — sim never sees a clock or DOM
  const scene = createScene(canvas);
  let rope = createRope(ROPE_PERIOD), player = createPlayer();
  let run = { ...createRun(), status: 'idle' };
  let prevPhase = rope.phase;
  let best = loadBest(localStorage);
  // ... press/release → intent flags; frame() per Pattern 2 ...
}
if (typeof document !== 'undefined') {     // bootstrap guard MOVES HERE (from game.js:238)
  startGame(document.getElementById('game'));
}
```

### Existing debt anchors being removed (verbatim, for plan diffs)
```js
// js/game.js:23  [VERIFIED] — ARCH-02b target
offer = pickTwo(UPGRADES, Math.random);
// js/game.js:74 and :90  [VERIFIED] — ARCH-02a targets (dual init)
rope = { phase: 0.33, period: 1.3 };
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bundler or `three.min.js` global-script tag | ESM + importmap + versioned CDN file URL | importmaps Baseline, Mar 2023 [CITED: MDN] | Zero-build pinned loading — this phase's delivery model |
| Single `three.module.js` monolith file | `three.module.js` + `three.core.js` split build | r16x-era split (exact minor not verified) — **verify both files when vendoring** | Vendoring fallback must carry 2 files |
| `THREE.sRGBEncoding` / legacy color flags | r186 `ColorManagement` + `SRGBColorSpace` (exported in build header) | r152 color-management overhaul [ASSUMED on the r152 date] | For flat `MeshBasicMaterial`/`MeshLambertMaterial` placeholder: no action needed; Phase 2 dithering will touch output color space |

**Deprecated/outdated:**
- `examples/js/` non-module scripts: long gone; current path is `examples/jsm/` (= `"three/addons/*"` in exports [VERIFIED: package exports]).
- `es-module-shims` polyfill for importmaps: unnecessary for evergreen browsers [CITED: MDN].

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Default param `rng = Math.random` in `tickRun` satisfies ARCH-02's "inline Math.random is gone" (the smell was the inline call-site use; injection always overrides it) | Pattern 6 | Reviewer disputes; fallback = module-level `defaultRng` alias — same behavior, cleaner grep |
| A2 | Prev/curr interpolation is imperceptibly-different at steady 60 Hz but required by criterion 4 wording; necessity confirmed in UAT (STATE.md open item) | Pattern 2 | Low — implementing it is cheap regardless |
| A3 | Standard three.js constructor usage (`new THREE.WebGLRenderer({ canvas })`, `setSize(w,h,false)`) as written; class *exports* verified, exact call semantics not runtime-tested here | Pattern 4 | Low — caught in first browser run of the plan's smoke task |
| A4 | 0.33-phase / 0.1-hold-jump start semantics preserved verbatim in `startRun()` is the desired gameplay (no test pins it) | Pattern 5 | Gameplay feel shift — one-line constant change if so |
| A5 | DOM-overlay HUD is acceptable as "not a second render path" under CONTEXT.md's wording | Pattern 4 | If rejected, switch to CanvasTexture-sprite HUD (4b) — contained in shell, no sim impact |

## Open Questions

1. **Does Phase 1 need ANY scene lighting beyond flat boxes?**
   - What we know: placeholder flat-box scene explicitly acceptable; `MeshBasicMaterial` needs no lights (three.js convention).
   - What's unclear: whether a directional light + `MeshLambertMaterial` is worth it already for silhouette readability.
   - Recommendation: start unlit `MeshBasicMaterial` (zero lighting code); add one light only if the flat scene is unreadable during smoke test.
2. **Idle-state rope: frozen (current behavior) or gently animated?**
   - What we know: `step()` early-returns unless running [VERIFIED: js/game.js:101-102]; today's idle rope is static.
   - What's unclear: whether a static rope reads as "broken WebGL" in UAT.
   - Recommendation: keep frozen (zero code); the HUD "press space / tap to start" carries the idle affordance (mirror existing copy from `js/game.js:215-221`).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js ≥ 18 (test runner) | all tests | ✓ | v26.8.1 | — |
| `node --test tests/` green today | baseline | ✓ (verified this session: 0 fail) | — | — |
| Network → cdn.jsdelivr.net | browser load of three | ✓ (200, verified this session) | — | Vendored `vendor/three/` (2 files) |
| Static HTTP server | dev/UAT | ✓ python3 present (`python3 -m http.server`) | 3.x | `npx serve .` |
| Browser with WebGL2 + importmap support | UAT/smoke | ✗ not verifiable headlessly here | — | None needed if evergreen-browser assumption holds; flag as UAT precondition |
| npm registry | one-time version verification | ✓ | — | — |

**Blocking:** none for planning. **UAT precondition:** the smoke check ("full run renders through WebGL shell") requires a real browser session — plan the verification task as human/interactive, not headless-only.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node built-in `node:test` + `node:assert/strict` (no installed framework) |
| Config file | none — convention: `tests/*.test.js` |
| Quick run command | `node --test tests/` |
| Full suite command | `node --test tests/` (identical; suite is the full suite) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARCH-01 | No sim-graph module references `three` | unit (static graph walk) | `node --test tests/boundary.test.js` | ❌ Wave 0 |
| ARCH-01 | Existing behavior unchanged post-split | unit | `node --test tests/` (game/rope/player/upgrades, files unchanged) | ✅ |
| ARCH-02 | `startRun()` is the single init; no `phase: 0.33` literal outside game.js constant | unit grep assertion | `node --test tests/boundary.test.js` (extend with source greps) | ❌ Wave 0 |
| ARCH-02 | rng injected: `tickRun(...,rng)` deterministic offer | unit | extend `tests/boundary.test.js` or small new `tests/run-init.test.js` (new files allowed; existing untouched) | ❌ Wave 0 |
| SC-1 (full-run render) | idle→running→choose→over through WebGL | manual/interactive UAT | browser smoke task | manual — schedule as verification checkpoint |
| SC-4 (clock drift) | rope visual vs scoring under load | manual UAT (throttle CPU via devtools) | browser task | manual |

### Sampling Rate
- **Per task commit:** `node --test tests/`
- **Per wave merge:** `node --test tests/` (full suite is fast, ~70 ms)
- **Phase gate:** Full suite green + browser smoke of the 4 run states green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/boundary.test.js` — import-graph walk (ARCH-01) + debt greps (ARCH-02)
- [ ] Optional: `tests/run-init.test.js` — `startRun()` shape + injected-rng determinism (or fold into boundary test; planner discretion per D-03)
- Framework install: **not needed** — `node:test` built-in.

## Security Domain (ASVS L1)

Static-file, no-auth, no-server, no-user-accounts app. Applicable categories are narrow.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2/V3/V4 (auth/session/access) | no | Nothing to authenticate; nothing to authorize |
| V5 Input Validation | yes (minimal) | `localStorage` value coerced `Number(...) || 0` [VERIFIED: js/game.js:39]; keep as-is. `localStorage` itself is same-origin/untrusted-in-shared-PC only — best score is cosmetic, no trust placed in it |
| V6 Cryptography | no | none used |
| V14 Build/Deploy (supply chain) | yes | Exact-version-pinned immutable CDN URL (no floating major/latest); `package.json` stays dependency-free so npm supply chain is out of the runtime path |

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| CDN dependency substitution/compromise serves tampered `three` | Tampering | Pin exact version (done via importmap); note: SRI (`integrity` key in importmap [CITED: MDN]) is the escalation if this ever matters — costs re-hash per version bump; defer with a one-line comment in the importmap recording the deliberate tradeoff |
| Module confusion (bare vs relative specifiers) | Spoofing | Boundary test (ARCH-01) doubles as integrity check for the sim graph |
| DOM sink injection via HUD textContent | Tampering | Use `textContent`, never `innerHTML`, for score/offer-name strings (offer names are static catalogue data today [VERIFIED: js/upgrades.js:1-10], keep it defensive) |

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view three@0.186.1`) — version existence, dist-tags, publish date.
- HTTP probes: `cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js` (+ `.min.js`, `three.core.js`, `package.json`), unpkg, esm.sh — availability, sizes, headers, exports map, two-file import closure.
- `js/game.js`, `js/rope.js`, `js/player.js`, `js/upgrades.js`, `tests/*.test.js`, `index.html`, `css/style.css`, `package.json`, `.planning/config.json` — all read in full this session.
- package-legitimacy seam verdict for `three` (signals block quoted in audit).

### Secondary (MEDIUM confidence)
- [CITED: developer.mozilla.org — `<script type="importmap">`] — syntax, ordering constraint ("map before dependent module scripts"), prefix-mapping trailing-slash rule, integrity key, Baseline-since-March-2023.
- [CITED: gafferongames.com/post/fix_your_timestep/] — accumulator + prev/curr/alpha interpolation; 0.25 s clamp provenance.

### Tertiary (LOW confidence — tagged [ASSUMED] above)
- three.js constructor call semantics (exports verified; usage standard training knowledge).
- Color-management date attribution (r152) — immaterial to Phase 1.

## Metadata

**Confidence breakdown:**
- Standard Stack / delivery: HIGH — registry + live HTTP verification, this session.
- Architecture / split / boundary enforcement: HIGH — direct source reads; decisions D-01..D-03 are user-locked and mechanically checked against the test surface.
- Clock & interpolation: HIGH on mechanics (Gaffer pattern + verified rope wrap math), MEDIUM on perceptual necessity (explicit UAT gate, STATE.md).
- rng-injection signature fit: HIGH on the constraint (4-arg test calls verified), MEDIUM on whether default-param satisfies the requirement's letter (A1).

**Research date:** 2026-10-15
**Valid until:** 2026-11-14 (stack stable; re-probe CDN URL liveness if execution slips past early November)
