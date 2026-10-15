# Architecture Patterns

**Domain:** Browser 3D game — pure functional sim core + Three.js WebGL render shell, no build step
**Researched:** 2026-10-15
**Confidence:** HIGH on seams/loading/timestep (verified against official docs); MEDIUM on PS1 shader specifics (no search provider available this run — flagged for phase-level spike)

## Recommended Architecture

### System Overview

```text
┌──────────────────────────────────────────────────────────────────┐
│ index.html  — canvas + <script type="importmap"> (three pinned)  │
│               + <script type="module" src="js/main.js">          │
└───────────────────────────────┬──────────────────────────────────┘
                                │ browser-only entry
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│ js/main.js — Imperative Shell (NEVER imported by Node tests)     │
│  rAF loop · fixed-step accumulator (1/120, clamp 0.25s)           │
│  input (pointer/space → press/release) · localStorage best       │
│  holds: prevSim, currSim  ·  drains event queues after stepping  │
├──────────────┬───────────────────┬───────────────────────────────┤
│ import       │ import            │ import                        │
▼              ▼                   ▼                               │
js/rope.js    js/player.js        js/upgrades.js   (unchanged,     │
js/run.js     ← pure orchestration: tickRun returns               │
                { run, rope, player, events[] } — no side effects)  │
├──────────────────────────────────────────────────────────────────┤
│ js/view/ — PURE view-model layer (Node-testable, no three import)│
│  buildView(prevSim, currSim, alpha) → plain "frame descriptor"   │
├──────────────────────────────────────────────────────────────────┤
│ js/render3d/ — Three.js layer (browser-only, MAY import 'three') │
│  stage.js (persistent scene graph) · renderer.js (WebGLRenderer  │
│  + low-res target + composite pass) · ps1.js (snap+dither GLSL)  │
│  Renders ONLY the frame descriptor. Never imports sim logic.     │
├──────────────────────────────────────────────────────────────────┤
│ js/audio/ — WebAudio layer (browser-only)                        │
│  audio.js: AudioContext (lazy resume on gesture), eventNames     │
│  → synth SFX mapping; consumes drained event arrays only         │
└──────────────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `js/run.js` (from `game.js` lines 1–51) | `createRun`, `tickRun`, `applyUpgrade`, `resetRun`, `loadBest`/`saveBest`; emits event records in return value | rope/player/upgrades; shell |
| `js/rope.js`, `js/player.js`, `js/upgrades.js` | Unchanged pure physics/rules | run.js only |
| `js/view/model.js` | Pure interpolation of prev→curr sim into a render descriptor; phase-aware blending | shell (called per frame); unit tests |
| `js/render3d/stage.js` | Builds scene graph **once** (character rig, stage, rope mesh); exports `updateStage(view)` mutating transforms/visibility only | view model |
| `js/render3d/renderer.js` | WebGLRenderer (pixelRatio 1), low-res `WebGLRenderTarget`, upscale+dither composite, `renderFrame(view)` | stage.js, ps1.js |
| `js/render3d/ps1.js` | GLSL chunks: vertex snapping, Bayer dither, bit-crush; `flatShading` material factory | renderer.js |
| `js/audio/audio.js` | AudioContext singleton, gesture-resume, master gain, `handleEvent(evt)` → SFX; music loop scheduling | shell (event drain) |
| `js/main.js` | rAF + accumulator, input → press/release intents, event drain, best-score persistence, resize | all shell modules |

**Hard rules (the seams that make this work):**

1. **One-way data flow.** sim → view → render/audio. Nothing below the shell line ever imports `three`, touches DOM, `Date`, `Math.random`, or storage. `js/render3d/` and `js/audio/` never feed values back into game state.
2. **Events are return values, never dispatches.** `tickRun` returns `{ run, rope, player, events: [...] }`. The shell drains event arrays after its while-step loop and fans them out to audio + juice. Replaces today's boolean `tripped` flag (which is already a proto-event — migration is natural).
3. **Renderers read snapshots, never clocks.** The render layer receives the view descriptor; it must not call `performance.now()` or recompute physics (e.g., don't re-derive rope world position from `Date` — derive from `phase` given by the view).

## Recommended Project Structure

```
jumprope-web/
├── index.html              # importmap (pinned three) + <script type="module" src="js/main.js">
├── js/
│   ├── main.js             # NEW browser entry: rAF loop, input, event drain, storage
│   ├── run.js              # MOVED pure half of game.js (createRun/tickRun/applyUpgrade) + events
│   ├── rope.js             # unchanged
│   ├── player.js           # unchanged
│   ├── upgrades.js         # unchanged (card catalogue work happens here later, still pure)
│   ├── view/
│   │   └── model.js        # PURE buildView(prev, curr, alpha) → frame descriptor; Node-tested
│   ├── render3d/
│   │   ├── renderer.js     # WebGLRenderer setup, render targets, composite pass  [imports three]
│   │   ├── stage.js        # persistent scene graph, low-poly character rig, updateStage(view)  [imports three]
│   │   └── ps1.js          # GLSL string chunks: vertex snap / Bayer dither / bit crush  [imports three]
│   └── audio/
│       └── audio.js        # AudioContext, gesture gate, event→SFX table, music scheduler
├── tests/                  # existing tests; + model.test.js, run-events.test.js
├── css/style.css           # canvas now fullscreen-ish; kept minimal
└── docs/                   # unchanged
```

### Structure Rationale

- **`js/game.js` splits in two** along the seam that already exists in the file (pure exports at lines 1–51 vs `startGame` shell at 57–236): pure half → `run.js`, shell half → `main.js` (with `draw()` deleted as Three.js replaces it). `tests/game.test.js` → `tests/run.test.js` with imports renamed — minimal diff, tests otherwise untouched.
- **`js/view/` is pure but render-facing** — it lives in its own folder because it is the contract ("frame descriptor") between sim and Three.js, importable by both Node tests and browser shell. This is the "view model vs domain state" separation from *Fix Your Timestep*'s interpolation scheme.
- **`js/render3d/` and `js/audio/` are the only dirs allowed to import externals/browser APIs.** Enforce with one grep in CI/tests: no `from 'three'` and no `document|window|AudioContext` outside those dirs and `main.js`.
- **Root-level flat `js/` modules stay flat** — the project is 8 files; sub-folders only mark the browser/pure boundary, matching the existing one-concern-per-file convention (`create*`/`update*` naming carries over).

## Architectural Patterns

### Pattern 1: Fixed-timestep sim + interpolated view (the "120 Hz truth, 60 Hz paint" seam)

**What:** Simulation advances in exact `STEP = 1/120` chunks (already implemented). Add: keep `prevSim` alongside `sim`; each frame compute `alpha = acc / STEP` and build an interpolated view. The current code throws `alpha` away — with smooth 3D camera/mesh motion the stepper's temporal aliasing becomes visible, which Canvas line-art hid.
**When to use:** Always here — the render layer is new and smooth; a 120 Hz sim on a 60/144 Hz display needs it (Gaffer on Games, HIGH confidence).
**Trade-offs:** One extra immutable state object retained (cheap — the codebase already copies state every tick); interpolation code must handle non-linear values (below).

**Example:**
```js
// js/main.js (shell)
while (acc >= STEP) {
  prevSim = sim;
  const out = tickRun(sim.run, sim.rope, sim.player, STEP, rng);
  sim = { run: out.run, rope: out.rope, player: out.player };
  events.push(...out.events);
  acc -= STEP;
}
const view = buildView(prevSim, sim, acc / STEP); // pure, js/view/model.js
renderFrame(view);
```

### Pattern 2: Phase-aware interpolation (the project-specific interpolation trap)

**What:** Naive `lerp(a.phase, b.phase, alpha)` **fails at the wrap**: 0.99 → 0.01 lerps through 0.5 (rope teleports backwards once per rotation). Same trap for any cyclic or edge-triggered value.
**When to use:** Any interpolating field in `buildView`.
**Trade-offs:** Slightly more code than `lerp`; correct.

**Example:**
```js
// js/view/model.js — interpolate forward-delta, not endpoints
export function renderPhase(prev, curr, alpha) {
  const delta = ((curr - prev) + 1) % 1;          // forward advance this step
  return (curr - delta * (1 - alpha) + 1) % 1;    // walk back from current
}
// Discrete fields are NOT interpolated: run.status, run.score, offer, grounded
// → take curr values; interpolate only continuous fields: player.y, squash,
// rope phase, and pose angles derived from them.
```

### Pattern 3: Persistent scene graph, mutated per frame (never rebuilt)

**What:** Build the stage + low-poly character **once** at boot into `Object3D`/`Mesh` nodes; every frame only write `position/rotation/scale/visible` and material uniforms from the frame descriptor. Three.js recomputes world matrices automatically (`matrixAutoUpdate`); nothing is allocated or disposed in steady state (three.js scene-graph idiom, MEDIUM confidence — no search provider; contradicted by nothing, standard in all official examples).
**When to use:** One-character, one-stage game — the entire scene is well under a few thousand triangles.
**Trade-offs:** A little retained scene-graph state (fine — it's *render* state: mesh handles, not game logic; keep no gameplay fields on meshes).

**Example:**
```js
// js/render3d/stage.js
const charRoot = new THREE.Group();            // built once
export function updateStage(view) {
  charRoot.position.y = view.playerY;          // world units, not pixels
  charRoot.scale.y = view.squash;              // squash spring straight from sim
  ropeMesh.rotation.z = view.ropePhase * Math.PI * 2;
  charRoot.visible = view.status !== 'idle';   // discrete fields switch, not lerp
}
```
**Do not** call `geometry.dispose()` / rebuild meshes per frame; do not create materials inside the render loop.

### Pattern 4: Hand-rolled PS1 post pipeline (skip EffectComposer)

**What:** Two-stage, ~40 lines, no addons:
1. `renderer.setRenderTarget(lowResRT)` → render scene at fixed internal resolution (e.g. 320×256) into a `WebGLRenderTarget({ minFilter/magFilter: NearestFilter, format: RGBAFormat })`.
2. `renderer.setRenderTarget(null)` → draw a fullscreen triangle with a tiny `ShaderMaterial` that samples the target with nearest filtering and applies ordered 4×4 Bayer dither + optional 5-bit/channel quantization; vertex snapping lives in the *scene* vertex shader (`onBeforeCompile` patch on the shared material, or one custom `ShaderMaterial`), snapping clip-space `xy/w` to a virtual grid and multiplying `w` back.

**Why hand-rolled over `EffectComposer`** (composer API verified against source at master, HIGH):
- `EffectComposer` defaults to `HalfFloatType` ping-pong buffers at `renderer size × pixelRatio`, then resizes everything with `pixelRatio` math — exactly fighting the deliberate fixed low internal resolution; passing custom targets works but ends up more config than the hand-rolled version.
- One composite pass is the whole pipeline ("no post-processing beyond simple dithering" is a stated project constraint); the composer's `needsSwap`/mask machinery is dead weight for one pass.
- Avoids the `three/addons/` URL prefix and one more CDN surface — importmap needs only `"three"`.
**Trade-offs:** No free `OutputPass`/colorspace handling (set `renderer.outputColorSpace` explicitly, and either author shaders assuming sRGB or insert a manual conversion); fewer future pass options — revisit composer only if bloom/motion-blur ever enter scope.
**When to use:** This project as scoped. Flat shading + vertex colors + one directional light (avoids shadow-mapping pipeline entirely; blob shadow = one dark disc mesh, as today).

**Example:**
```js
// js/render3d/renderer.js
const rt = new THREE.WebGLRenderTarget(320, 256, {
  minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
});
const quad = new THREE.Mesh(quadGeo, new THREE.ShaderMaterial({
  uniforms: { map: { value: rt.texture }, uTime: { value: 0 } },
  vertexShader: UPSCALE_VERT, fragmentShader: DITHER_FRAG, // chunks in ps1.js
  depthTest: false, depthWrite: false,
}));
export function renderFrame(view) {
  updateStage(view);                       // mutate transforms from descriptor
  renderer.setRenderTarget(rt);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(quadScene, quadCamera);
}
```

### Pattern 5: Events returned from ticks, dispatched by the shell (event-queue pattern, functional)

**What:** Per *Game Programming Patterns* (Event Queue chapter, HIGH confidence), a queue's job is to decouple *when a thing happens* from *when something reacts*. A pure tick function **already is** the enqueue side — returning `events` *is* the queue; the shell's post-step drain is the dispatch side. No `EventEmitter`, no bus, no pub/sub library needed.
**When to use:** jump/land/skip/trip/card-picked/status-change → audio + screen-shake/juice.
**Trade-offs:** Events must capture their data at emit time (GPP's "state changes under you" warning — `{type:'skip', score, skips}` not a pointer to run); don't dispatch from inside handlers (feedback loops).

**Example:**
```js
// js/run.js — pure; rng injected per the codebase's own anti-pattern note
export function tickRun(run, rope, player, dt, rng = Math.random) {
  ...
  const events = [];
  if (!wasFeet && isFeet) {
    if (clearsRope(...)) { events.push({ type: 'skip', skips }); 
      if (shouldOfferUpgrade(skips)) { events.push({ type: 'offer', cards: offer }); }
    } else { events.push({ type: 'trip', score }); }
  }
  if (!player.grounded && wasGrounded) events.push({ type: 'jump' });
  if (player.grounded && !wasGrounded && landedHard) events.push({ type: 'land', vy });
  return { run: {...}, rope, player, events };
}
```
Keep `{ ...tripped }` derivable (`events.some(e => e.type === 'trip')`) during migration so `tests/game.test.js` keeps meaning.

### Pattern 6: Module loading without a build step (importmap + Node-test boundary)

**What:** `index.html` carries an import map pinning exact versions; Node resolution never sees it. Verified: import maps are Baseline-widely-available since March 2023 (MDN, HIGH); **Node.js has no import-map support** (zero mentions in Node's official ESM docs, HIGH); official three.js guidance is exactly the importmap+CDN pattern with `three` and `three/addons/` mappings, old `<script src=three.min.js>` pattern deprecated (threejs.org/docs/llms.txt, HIGH; current version **three@0.186.1**, npm registry).

**Example:**
```html
<script type="importmap">
{ "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js"
} }
</script>
<script type="module" src="js/main.js"></script>
```

**The rule that keeps `node --test tests/` working with zero config:**
- Sim + view modules (`run.js`, `rope.js`, `player.js`, `upgrades.js`, `view/model.js`) use **relative imports only** and never name `three` → Node resolves them natively; import maps are irrelevant to them.
- Browser-only modules (`render3d/*`, `audio/*`, `main.js`) may use the bare `'three'` specifier → Node is never pointed at them.
- **Move the `typeof document !== 'undefined'` side-effect out of library files:** `main.js` is the only module with an entry side-effect; pure modules export functions only. (Cleaner than the current auto-boot at `game.js:238` and removes the only import-time hazard in `tests/`.)

**CDN vs vendored:** recommend the pinned jsdelivr URL (per PROJECT.md both are acceptable; jsdelivr is what three's own docs show). Trade-off: CDN outage breaks the page; if that matters later, swap the map value to a vendored `vendor/three.module.js` (1.2 MB) — the map makes it a one-line change. Add `"integrity"` to the map or a `modulepreload`+SRI if supply-chain posture matters (MDN documents the `integrity` key).

## Data Flow

### Frame flow (steady state)

```
requestAnimationFrame(now)
    ↓
acc += min(dt, 0.25)                    ┌─ js/main.js (impure)
    ↓ while acc ≥ STEP:                 │
  prevSim = sim; sim = tickRun(...)     ├─ js/run.js   (pure rules)
  events.push(...out.events)            │
    ↓ alpha = acc/STEP                  │
  view = buildView(prevSim, sim, alpha) ├─ js/view/model.js (pure)
    ↓                                   │
  updateStage(view); renderFrame(view)  ├─ js/render3d/* (three.js, write-only)
    ↓                                   │
  events.drain → audio.handleEvent(e)   └─ js/audio/*    (WebAudio, write-only)
```

### Input / state-machine flow (unchanged shape)

`pointerdown/up` + `Space` → `press()/release()` intents → mutate `run/rope/player` **only** via pure transitions (`jump`, `applyUpgrade`, `resetRun`) → status transitions emit events consumed by audio/UI. `AudioContext` creation/resume is itself gated on this first gesture (autoplay policy, MDN).

### Event taxonomy (v1, minimal)

`jump {vy}` · `land {vy}` · `skip {skips}` · `trip {score}` · `offer {cards}` · `picked {card}` · `started` · `status {from,to}` — everything audio and juice needs, nothing more; grow only when a consumer needs it.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| One character, one stage (always) | Flat scene graph, ~10–30 draw calls; no batching, no LOD, no frustum tuning needed |
| Card catalogue grows (10s of cards) | Data stays in `upgrades.js`; per-card *visuals* map by `id` in `render3d/` — a lookup table, never `if (card.id===...)` in sim |
| Extra stages/props later | New `render3d/stages/*.js` builders swapping scene contents; sim state gains a `stage` field; seams unchanged |
| Performance floor | Internal-res is the knob (320×256 → 256×192), resolution-independent of sim; 120 Hz sim cost unchanged |

### Performance Priorities

1. **First bottleneck:** none expected (low-poly, no shadows, one RT). If it appears: internal resolution first, dither shader second.
2. **Silent killer:** per-frame allocations in render path (new `Vector3`s, string uniforms, cloned materials) — reuse module-level scratch objects in `render3d/`.

## Anti-Patterns

### Anti-Pattern 1: Game logic or state mutation inside the render layer

**What people do:** Compute jump arcs, obstacle positions, or scoring "conveniently" in `updateStage`/shader uniforms because the numbers are already on screen.
**Why it's wrong:** Kills Node testability and determinism; the WebGL layer must never feed back into game logic (explicit project constraint).
**Do this instead:** If a renderer needs a number, extend `tickRun`'s return or `buildView` — land the value in the frame descriptor via a pure function.

### Anti-Pattern 2: Dispatching events from inside sim functions

**What people do:** `audio.play('jump')` or an `emit()` call inside `tickRun`/`jump`.
**Why it's wrong:** Makes ticks impure (untestable side effects, nondeterministic replay, Node import crashes on `AudioContext`).
**Do this instead:** Return event records; the shell dispatches after stepping (Pattern 5).

### Anti-Pattern 3: Importing `three` (or using bare specifiers) in any module Node tests load

**What people do:** `import * as THREE from 'three'` at the top of `game.js` because "the entry file needs the canvas eventually".
**Why it's wrong:** `node --test` has no import-map resolution → `Cannot find package 'three'` on every test file importing it. Tests die silently at collection.
**Do this instead:** Bare `'three'` only inside `js/render3d/` and `js/audio/`; add a one-line boundary check test that greps for violations.

### Anti-Pattern 4: Rebuilding the scene graph or render targets per frame

**What people do:** Re-create meshes/materials/RTs in the render loop "so state stays in sync".
**Why it's wrong:** Per-frame GPU allocations and GC churn; stutters on low-end devices — the exact audience of the PS1 aesthetic.
**Do this instead:** Build once in `stage.js`, mutate transforms/uniforms (Pattern 3); resize RTs only on `resize` events.

### Anti-Pattern 5: Interpolating discrete/wrapping fields

**What people do:** Uniform `lerp(prev, curr, alpha)` over the whole state record.
**Why it's wrong:** Rope phase reverses once per rotation at the 0/1 wrap; status/score/offer flicker mid-transition.
**Do this instead:** Pattern 2's forward-delta phase; discrete fields snap from `curr` — document each view field as continuous or discrete.

### Anti-Pattern 6: Global event bus (EventEmitter/pubsub) as the wiring layer

**What people do:** Wire sim→render→audio through a central emitter for "flexibility".
**Why it's wrong:** GPP: central queues are global variables; ordering and lifetime bugs at this project's scale for zero benefit — the returned-events pattern already provides time-decoupling.
**Do this instead:** Function calls at the shell seam; one array. Revisit only if >1 consumer needs independent subscription per event.

### Anti-Pattern 7: Carrying the known existing-code smells into the rewrite

**What people do:** Rewrite `startGame` wholesale and re-duplicate the `phase: 0.33` init (currently in two reset paths, `game.js:74` and `:90–91`) and inline `Math.random` in `tickRun`.
**Why it's wrong:** PROJECT.md explicitly names these to fix "when the shell is rewritten" — the split is the moment.
**Do this instead:** `resetRun()` as the single init path; `tickRun(run, rope, player, dt, rng = Math.random)` threading the codebase's own injectable-rng convention.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Three.js (CDN) | importmap, exact version pin (`three@0.186.1`), single bare specifier `"three"` | No `three/addons/` mapping needed with hand-rolled postfx (Pattern 4); bump cadence manual |
| WebAudio | single `AudioContext({ latencyHint: 'interactive' })` in `audio.js` | Starts `suspended`; `resume()` on first gesture (autoplay policy); one context per tab, never per SFX (MDN) |
| localStorage | unchanged `loadBest/saveBest(storage)` pure-with-injection | Storage stays a shell concern |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| run.js → rope/player/upgrades | direct pure calls (existing DAG, keep acyclic) | add view/ + render3d/ + audio/ as new DAG leaves; nothing imports main.js |
| sim (run.js) → view (view/model.js) | immutable state args, plain-object return | the **only** place prev/curr states meet |
| view → render3d | frame descriptor (plain data) | render3d must be typeable from the descriptor alone — the seam that would let a Canvas fallback renderer coexist |
| shell → audio | drained event array, one `handleEvent` | fire-and-forget; audio must never delay the frame loop (schedule nodes, don't block) |

## Sources

- Gaffer on Games — *Fix Your Timestep!* (gafferongames.com/post/fix_your_timestep/) — accumulator + prev/curr interpolation, spiral-of-death clamp — **HIGH** (read in full)
- Game Programming Patterns — *Event Queue* (gameprogrammingpatterns.com/event-queue.html) — send/process time-decoupling, emit-time data capture, central-bus warning — **HIGH** (read in full)
- three.js official `docs/llms.txt` (threejs.org) — importmap CDN pattern, deprecated script-tag pattern, `three`/`three/addons` specifiers, WebGLRenderer vs WebGPU guidance — **HIGH** (fetched directly)
- npm registry `three@0.186.1` package manifest — version + `exports` map (`./addons/*` subpath) — **HIGH** (fetched directly)
- three.js source `examples/jsm/postprocessing/EffectComposer.js` @ master — HalfFloat default buffers, pixelRatio sizing, pass/swap machinery, custom-target constructor — **HIGH** (read in full)
- MDN — `<script type="importmap">` (Baseline 2023; `integrity` key) — **HIGH** (fetched directly)
- Node.js official ESM documentation (nodejs.org/api/esm.html) — **no** import-map support (verified by absence) — **HIGH** for the constraint it implies
- MDN — `AudioContext()` constructor (latencyHint, context limits) — **HIGH** (fetched directly); autoplay gesture-resume corroborated from MDN AudioContext state docs — **MEDIUM**
- Three.js persistent-scene-graph idiom + PS1 GLSL specifics (vertex-snap grid math, Bayer matrix, affine-texture necessity) — **MEDIUM** — no search provider was available this run (no Brave/Exa/Context7 configured); standard practice + official examples, but shader math should be validated in an early render-phase spike before the full PS1 pipeline is scheduled.

---
*Architecture research for: jumprope-web PS1-style milestone*
*Researched: 2026-10-15*
