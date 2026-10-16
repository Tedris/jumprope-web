# Phase 2: PS1 Presentation & Scene — Research

**Researched:** 2026-10-16
**Domain:** WebGL retro (PS1) rendering in three.js 0.186.1 (no-build, importmap CDN) + procedural low-poly character/rope animation
**Confidence:** HIGH (core rendering APIs verified verbatim against the exact pinned `three@0.186.1` bundle downloaded from the importmap URL)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### PS1 look pipeline
- **D-01:** Internal render resolution: lock ~240 rows, width follows window aspect; nearest-neighbor upscale to the canvas. No fixed 4:3 letterbox now (resize/letterbox polish is Phase 5). — **Reversibility:** costly — every later visual tune-up (UI legibility in Phase 5, prop placement) is calibrated against this internal resolution; changing it shifts the whole look.
- **D-02:** Dithering is a **single fullscreen post pass**: quantize to ~15-bit color + ordered Bayer 4×4. This is the only post-processing allowed (PROJECT.md: "no post-processing beyond simple dithering"). Rejected: per-material dither, quantize-only.
- **D-03:** Vertex-snap wobble: **full screen-space pixel-grid snap** on world geometry (signature PS1 crawl), not subtle and not scenery-only. How the snap avoids jittering UI/text overlays is planner's call.
- **D-04:** The look is **settled by a throwaway spike page** (standalone HTML, e.g. under `.planning/spikes/` or a scratch dir) proving low-res render target + Bayer pass + vertex snap work on the importmap-pinned `three@0.186.1` **before** touching `js/render3d.js`. Not prototyped in-scene.
- **D-05:** Shading model: **vertex-lit, one directional light**, flat-shaded facets — feeds real gradients into the dither pass. Keeps low-poly form readable at 240p.
- **D-06:** Simple distance **fog matched to sky color** — hides the world-edge boundary, classic PS1 pairing with dither.
- **D-07:** Palette: **moody PS1 tones** (dusty blues/greens, dim sky) — a deliberate move away from the bright cream/tan prototype palette. Consequence accepted: the rope and character need bright colors to stay readable (see D-09, D-13).

#### 3D rope geometry (folds pending todo)
- **D-08:** The rope is a **real rotating arc around the player** — a tube/line sweeping over the head and under the feet, driven by canonical `rope.phase` through the existing `lerpPhase` interpolation. The floating phase-aligned bar obstacle mesh is replaced entirely; hands hold handles at the arc pivot.
- **D-09:** Readability: **bright thin tube** (e.g. pale yellow/white) so the rope stands out against the moody floor/sky through the whole arc, at low res, without glow post-processing (PRES-03).
- **D-10:** Arc shape: **slight gravity sag** that whips with the rotation — organic, but the foot-window timing read stays phase-locked (no independent physics).
- **D-11:** Trip behavior: on `tripped`, the rope **settles to a rest position at the feet with a short shake** — present-tense fail feedback using the existing sim flag. Bigger trip juice stays Phase 4.
- **D-12:** **Visible handles**: small dark handle boxes in the character's hands, turning with the arc.

#### Character build & animation
- **D-13:** Built at runtime by **primitive assembly in code** (boxes/cylinders: big head, torso, limbs, parented like a PS1 rig) — no asset files, matches the no-build/no-asset repo style. Color: keep the prototype **rose accent** (`#c94f6d` family) so the jumper pops against the moody stage.
- **D-14:** Animation is **fully procedural from the rope-phase clock** (+ `player.y`/squash state): arm circles synced to the rope, leg tuck when airborne, squash/stretch on landing. No `AnimationMixer`/clips — no second timing system that could drift from scoring. — **Reversibility:** costly — clips would fork a parallel timeline that risks drifting from the canonical clock ARCH-02 protects.
- **D-15:** Personality cues (all three selected): **big-head/chibi proportions**, a **trailing scarf/ponytail** with a-behind-the-beat secondary motion from the same clock, and **idle-state animation** (small bob / rope twirl so the pre-run screen isn't frozen). Simple **dot-block eyes** on the big head.

#### Camera, stage & depth cues
- **D-16:** Fixed **side-on camera with a slight angle** — rope's over-head-to-feet arc reads cleanly in frame while keeping some 3D depth; no camera motion/follow. Rejected pure-profile (flat) and strong 3/4 (hurts low-res readability).
- **D-17:** Depth cue: **blob shadow disc** under the player that shrinks/fades with jump height — cheap, unambiguous through dither. No real-time shadow maps.
- **D-18:** Stage content: **sparse horizon silhouettes** (distant blocks/hills fading into fog) on a fog-faded floor plane — mood without visual noise near the judgment zone.

#### Researcher/planner domain (not user-decided)
- **Shader mechanics:** exact `three@0.186.1` wiring for the render-target pipeline, Bayer pass, and vertex snap (`onBeforeCompile` vs custom material) — the spike (D-04) settles these. (This research pre-resolves the API questions; the spike confirms the *look*.)
- **Precompile strategy** for criterion 4 (no first-frame shader freeze): compiling materials during the idle state before the first run — planner's call.
- **Rope tube construction/segment count and sag curve** — planner picks the simplest that reads well in the spike.

### the agent's Discretion
- Camera exact position/height/framing within the "side-on, slight angle, fixed" envelope; specific palette values (may be tuned during the spike); handle/scarf geometry details; scene-graph organization inside `js/render3d.js`.

### Deferred Ideas (OUT OF SCOPE)
- Trip *juice* beyond rope-settling (hitstop, particles, shake scale) — Phase 4.
- Letterbox/resize handling of the low-res framebuffer at odd window sizes — Phase 5.
- Reduced-motion dampening of the vertex wobble (D-03 is max-strength by default) — Phase 5 wires `prefers-reduced-motion`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRES-01 | PS1-style 3D scene — low internal resolution, nearest-neighbor upscale, ordered dithering, vertex-snap wobble | §Standard Stack + Pattern 1 (RT pipeline), Pattern 2 (vertex snap via `onBeforeCompile`, chunk anchor verified in 0.186.1), Pattern 3 (Bayer/quantize final pass), Pitfalls 1–4 |
| PRES-02 | Original low-poly character with personality, animated from rope-phase clock | Pattern 4 (primitive-assembly rig + phase-derived procedural animation), Pattern 5 (idle clock gap — view-payload extension needed), D-13–D-15 |
| PRES-03 | Rope arrival readable from frame: fixed camera, shadow depth cue, rope readable vs floor through whole arc | Pattern 6 (rope arc geometry from phase + blob shadow), D-08–D-12, D-16–D-18; scoring-window mapping from `js/rope.js:11-13` (`atFeet` 0.45–0.55) |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- **Three.js via CDN for rendering only** — keeps deployment static-file-only, no build step. `three` arrives only via the importmap; `package.json` stays dependency-free. [VERIFIED: AGENTS.md, index.html:9-15]
- **Simulation core stays pure and framework-free; the WebGL layer never feeds back into game logic.** Enforced by `tests/boundary.test.js` (ARCH-01 fence): no `three` reference in the test-reachable import graph, and wall-clock/DOM/storage references must stay inside `js/shell.js` only. [VERIFIED: .planning/phases/01-render-shell-foundation/01-VERIFICATION.md truths 2/9]
- **PS1 aesthetic is a feature:** low internal render resolution, no post-processing beyond simple dithering.
- **Static files only**, no server component.
- Conventions to honor: factory functions `create*` returning plain objects, named exports only, 2-space indent (note: stray 4-space indent exists in old game.js excerpts — do not propagate), no `console.log` in pure modules, immutable spread-copies in sim code.

## Summary

Everything Phase 2 needs is achievable with **three.js core APIs only** — no addons, no npm installs, no importmap changes. The three load-bearing mechanics (low-res `WebGLRenderTarget` + nearest upscale, fullscreen Bayer/quantize pass, screen-space vertex snap) map to APIs that were verified **verbatim in the pinned 0.186.1 bundle**: the `project_vertex` shader chunk exists with its classic `gl_Position = projectionMatrix * mvPosition;` ending (the `onBeforeCompile` injection anchor — this directly resolves the STATE.md blocker "onBeforeCompile chunk names unverified against three@0.186.1"), and both `renderer.compile(scene, camera, targetScene=null)` and `renderer.compileAsync(...)` exist for the precompile-during-idle criterion.

The one real engineering trap is **color management**: rendering into a normal render target writes *linear* values and skips tone mapping (verified in the bundle), and a raw final-pass `ShaderMaterial` performs **no automatic sRGB conversion** — so the dither pass must apply the sRGB transfer function itself *before* quantizing/dithering, or the frame renders visibly dark. The dither pattern must be indexed in **internal-resolution pixel space** (`vUv * internalRes`), not canvas-pixel `gl_FragCoord`, or nearest-neighbor upscale destroys the pattern.

The character and rope are pure scene-graph work inside `js/render3d.js`, driven entirely by `lerpPhase(prevPhase, rope.phase, alpha)` plus `player.y`/`squash` from the existing view payload. One genuine gap: **idle-state animation (D-15) has no data source** — `rope.phase` is frozen while `status === 'idle'` and `render3d.js` is fence-forbidden from calling `performance.now()` itself. The shell must add a cosmetic-time field to the view payload (one-way, render-only). The `createScene(canvas) → { render }` contract is extended, not reshaped; existing Node stub tests will need their THREE stub object extended to cover the new classes.

**Primary recommendation:** Build the pipeline exactly as Pattern 1–3 (core-only RT → snap-injected Lambert materials → single Bayer/quantize/sRGB final pass), validate it first in the mandated throwaway spike page (same pinned importmap URL), then port the identical recipe into `render3d.js`; budget the color-space ordering and idle-clock issues explicit plan tasks — they are the two ways this phase silently ships broken.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Low-res RT + Bayer/dither final pass | `js/render3d.js` (WebGL layer) | — | Sole `three` importer (ARCH-01 fence); all GL work lives here |
| Vertex-snap injection | `js/render3d.js` | — | `onBeforeCompile` on materials it owns |
| Rope arc / character rig pose derivation | `js/render3d.js` | `js/interpolate.js` (`lerpPhase`) | Renderer-internal pure math reading the view snapshot; never feeds back to sim |
| Canvas sizing / window resize | `js/shell.js` | `js/render3d.js` (reacts to canvas.width/height) | Shell owns all browser IO; fence test forbids DOM elsewhere |
| Idle cosmetic clock (view field) | `js/shell.js` (produces `performance.now()` value) | `js/render3d.js` (reads view field) | Only shell may touch wall clock; render-side use of a passed value is one-way and fence-legal |
| Shader precompile | `js/render3d.js` (inside `createScene`) | `js/shell.js` (optional idle-state trigger) | `renderer.compile` needs no IO; simplest is compile-at-build-time in the factory |
| Look-spike artifact | `.planning/spikes/` standalone HTML | — | Throwaway, outside shipping graph (D-04) |
| HUD text overlays | DOM (`index.html` + `css/style.css`) | `js/shell.js` updates it | Already DOM, not GL — unaffected by vertex snap (answers D-03's open "how does snap avoid jittering UI") |

## Standard Stack

No new packages. This phase installs **nothing**.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| three | 0.186.1 | Entire 3D + PS1 pipeline | Already pinned in importmap; exact jsdelivr URL in production use since Phase 1 [VERIFIED: index.html:12; npm registry: version 0.186.1, latest, published 2026-09-24] |

Verified bundle classes/APIs needed by this phase, all confirmed present in the pinned build:
`WebGLRenderTarget` [VERIFIED: three.core.js, `class WebGLRenderTarget` found], `NearestFilter = 1` [VERIFIED: three.core.js], `ShaderMaterial`, `MeshLambertMaterial` (with `flatShading`), `MeshBasicMaterial`, `TubeGeometry` [VERIFIED: three.core.js:37441], `BoxGeometry`, `CylinderGeometry`, `SphereGeometry`, `CircleGeometry`, `PlaneGeometry`, `Group`, `Fog` [VERIFIED: three.module.js:15126], `DirectionalLight` [VERIFIED: three.core.js:47835], `AmbientLight` [VERIFIED: three.core.js:47977], `OrthographicCamera`, `setRenderTarget()`, `material.onBeforeCompile` [VERIFIED: three.module.js:18285, called as `material.onBeforeCompile( parameters, _this )`], `customProgramCacheKey` [VERIFIED: three.module.js:7687], `renderer.compile` / `renderer.compileAsync` [VERIFIED: three.module.js:17433/:17552], `renderer.setPixelRatio` [VERIFIED: three.module.js:16677].

The jsdelivr URL for the pinned build resolves (HTTP 200 for both `three.module.js` and its imported `three.core.js`) — verified via `curl -sI` this session, so the spike page can reuse the exact production importmap entry.

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| three addons (`three/addons/…` TSL `retroPass`/`Bayer`, `FullScreenQuad`, `EffectComposer`) | 0.186.1 | Not recommended | Would need a second importmap entry (new CDN surface, addons import 'three' internally) and are heavier than the two-pass manual pipeline. Only relevant as the STATE.md-named fallback (`RetroPassNode`) if `onBeforeCompile` somehow fails — it exists in 0.186's TSL node layer [CITED: threejs.org docs API index, "RetroPassNode"/"Bayer" under TSL] but is Node-material-only, i.e. requires migrating the whole scene to node-based materials: strictly worse for this repo |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual RT + quad pass | `EffectComposer` + `ShaderPass` (addons) | Extra CDN import-map surface, adds `Pass` machinery for one pass; forbidden vibe (repo keeps three to core) |
| `onBeforeCompile` injection into `MeshLambertMaterial` | Full custom `ShaderMaterial` per object | Loses three's fog/lighting chunk plumbing; must re-declare uniforms; only worth it if chunk replacement proves fragile in the spike |
| Per-frame rope pivot rotation (build arc once) | Rebuild `TubeGeometry` per frame | Per-frame geometry rebuild = GC churn + re-upload each frame; rotation-only is free |
| Core GLSL1 `ShaderMaterial` final pass | `RawShaderMaterial` | Either works; `ShaderMaterial` gives free `position`/`uv` attributes for the fullscreen quad |

**Installation:** none — `node_modules` stays empty; nothing to add to `package.json`.

## Package Legitimacy Audit

No packages are installed by this phase. Re-audit of the already-pinned dependency:

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| three | npm | project 12+ yrs; pinned 0.186.1 published 2026-09-24 | ~21.4M/wk | github.com/mrdoob/three.js | [SUS] ("too-new" = version-freshness signal only) | Approved — canonical library; [VERIFIED: npm registry via legitimacy seam this session]. No new install occurs (already pinned in index.html since Phase 1; load-verified by Phase 1 human-smoke item). Spike MUST reuse the identical pinned URL, no new CDN origin |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `three` — false-positive on version recency; already in production pins with an existing human-load checkpoint from Phase 1. No new checkpoint needed beyond the existing browser smoke.

## Architecture Patterns

### System Architecture Diagram (per-frame render path)

```
 shell.js frame()                          [only owner of IO/clock]
   │  view = { run, rope, player, prevPhase, alpha, best, now }   ← 'now' = NEW cosmetic field
   ▼
 render3d.js render(view)
   │
   ├─ phase = lerpPhase(prevPhase, rope.phase, alpha)      (js/interpolate.js, wrap-safe)
   ├─ pose character group: arms/legs/scarf ← phase; squash/airborne ← player.y, player.squash
   ├─ pose rope pivot group: rotation = f(phase)           (arc built once at createScene)
   ├─ pose blob shadow: scale/opacity ← player.y
   │
   ├─ renderer.setRenderTarget(lowRT)      ── scene (Lambert+snap, fog) → 240-row RT, LINEAR
   ├─ renderer.setRenderTarget(null)
   └─ renderer.render(postScene, postCamera) ── fullscreen quad:
         sRGB-encode → Bayer 4×4 offset → 15-bit quantize → canvas
```

### Recommended Project Structure
```
js/
├── game.js         # unchanged — pure run orchestration
├── rope.js player.js upgrades.js interpolate.js   # unchanged — pure models
├── shell.js        # + canvas resize wiring, + view.now cosmetic field (both IO-owned)
└── render3d.js     # rebuilt scene: pipeline (RT/Bayer/snap), rope arc, character rig, stage, precompile
index.html          # untouched (importmap already pins the needed version)
css/style.css       # canvas sizing may shift from fixed 480×640 to window-sized buffer
.planning/spikes/   # NEW dir: look-spike HTML page (throwaway, D-04)
```

### Pattern 1: Low-res RT → final-pass pipeline (core-only)
**What:** Render the 3D scene into a small `WebGLRenderTarget`; blit it through one fullscreen `ShaderMaterial` quad.
**When to use:** Every frame; this replaces the current direct `renderer.render(scene, camera)` at `js/render3d.js:46`.
**Example (three core API shapes verified; exact look settled by spike):**
```javascript
// js/render3d.js — inside createScene(canvas)
const INTERNAL_H = 240;                       // D-01: ~240 rows; width = round(240 * canvas.width / canvas.height)
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1);                    // PS1 look: never multiply target sizes by devicePixelRatio
renderer.setSize(canvas.width, canvas.height, false);

const rt = new THREE.WebGLRenderTarget(320, INTERNAL_H, {
  minFilter: THREE.NearestFilter,
  magFilter: THREE.NearestFilter,             // nearest upscale happens implicitly when the RT is sampled
  generateMipmaps: false,
});

const postScene = new THREE.Scene();
const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const ditherMat = new THREE.ShaderMaterial({  // the ONE post pass (D-02)
  uniforms: { tDiffuse: { value: null }, uInternalRes: { value: new THREE.Vector2(320, INTERNAL_H) } },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }`,
  fragmentShader: BAYER_FRAG,                 // see Pattern 3
  depthTest: false, depthWrite: false,
});
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ditherMat));

function render(view) {
  // ...pose meshes from view (read-only)...
  renderer.setRenderTarget(rt);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  ditherMat.uniforms.tDiffuse.value = rt.texture;
  renderer.render(postScene, postCamera);
}
```
On canvas resize (window-size criterion 4): `rt.setSize(w', h')` with `h' = 240`, `w' = round(240 * canvas.width / canvas.height)`, update `uInternalRes`, `camera.aspect`, `camera.updateProjectionMatrix()`, `renderer.setSize(...)`. Whether render3d.js polls `canvas.width/height` per frame or shell calls a resize hook is a planner choice — polling inside `render()` is fence-legal (the canvas element is already a constructor arg), calling `window.addEventListener('resize')` from render3d.js is NOT.

### Pattern 2: Vertex-snap wobble via `onBeforeCompile`
**What:** Screen-space snap injected into built-in materials after the projection chunk. The STATE.md blocker ("`onBeforeCompile` chunk names unverified against three@0.186.1") is resolved: the chunk and its include anchor both exist in the pinned build.
The `project_vertex` chunk in three@0.186.1 reads verbatim [VERIFIED: build downloaded from the pinned jsdelivr URL this session, three.module.js:467]:
```glsl
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;
```
So code appended after `#include <project_vertex>` can snap the finished `gl_Position`:
```javascript
// One helper applied to every WORLD material (D-03: world geometry only)
function applyVertexSnap(material, snapUniform) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSnapGrid = snapUniform;   // shared { value: vec2 } — keep ref in material.userData
    shader.vertexShader = 'uniform vec2 uSnapGrid;\n' + shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      {
        vec4 ndc = gl_Position / gl_Position.w;
        ndc.xy = floor( ndc.xy * uSnapGrid + 0.5 ) / uSnapGrid;   // snap to internal-pixel grid
        gl_Position.xy = ndc.xy * gl_Position.w;                  // keep w — no divide by w twice
      }`
    );
    material.userData.shader = shader;
  };
  material.customProgramCacheKey = () => 'snap';   // distinguishes snapped programs in the cache
}
// uSnapGrid = internalRes/2/snapPixels — i.e. half-extent divided by desired snap block size
// e.g. snap to every 2 internal pixels: uSnapGrid = vec2(160/2, 120/2)… tune in spike ("authentic crawl")
```
Key facts: the callback signature is `onBeforeCompile(parameters, renderer)` [VERIFIED: three.module.js:18285 `material.onBeforeCompile( parameters, _this );`]; `customProgramCacheKey` exists [VERIFIED: three.module.js:7687] and is required so snapped/unsnapped variants of the same material don't collide in the program cache. HUD is DOM, so D-03's "how does snap avoid jittering UI/text overlays" is already answered by the existing architecture: GL-only snap never touches DOM overlays.

### Pattern 3: Bayer dither + quantize final pass (order of operations is the whole game)
```glsl
// BAYER_FRAG — ShaderMaterial fragment source (GLSL1 default)
uniform sampler2D tDiffuse;
uniform vec2 uInternalRes;      // e.g. vec2(320.0, 240.0)
varying vec2 vUv;

vec3 toSRGB( vec3 c ) {         // RT contents are LINEAR (see Pitfall 1) — encode first
  return mix( c * 12.92, pow( ( c + 0.055 ) / 1.055, vec3( 2.4 ) ) * 1.0, step( vec3( 0.0031308 ), c ) );
}
float bayer4( vec2 p ) {        // standard 4x4 ordered matrix [ASSUMED: universal constant]
  const mat4 m = mat4( vec4( 0.0, 12.0, 3.0, 15.0 ), vec4( 8.0, 4.0, 11.0, 7.0 ),
                       vec4( 2.0, 14.0, 1.0, 13.0 ), vec4( 10.0, 6.0, 9.0, 5.0 ) );
  int x = int( mod( p.x, 4.0 ) ); int y = int( mod( p.y, 4.0 ) );
  return m[y][x] / 16.0;        // threshold in [0,1)
}
void main() {
  vec3 c = toSRGB( texture2D( tDiffuse, vUv ).rgb );
  vec2 cell = floor( vUv * uInternalRes );     // pattern at INTERNAL pixel grid — NOT gl_FragCoord
  vec3 q = floor( c * 31.0 + bayer4( cell ) ) / 31.0;   // ~15-bit (5 b/ch) with ordered dither (D-02)
  gl_FragColor = vec4( q, 1.0 );
}
```
Dither/quantize happens in **display space** (after sRGB encode) because PS1 dithering operated on the indexed/display framebuffer [ASSUMED: hardware-history reasoning — the spike confirms visually].

### Pattern 4: Phase-driven procedural character (no mixer, D-14)
```javascript
// rope phase θ = lerpPhase(prevPhase, view.rope.phase, view.alpha) * Math.PI * 2
// Mapping to verify in spike: at rope.phase ≈ 0.5 the rope is at the feet
// (atFeet window 0.45–0.55 — [VERIFIED: js/rope.js:11-13] `rope.phase >= 0.45 && rope.phase <= 0.55`),
// so the arc pivot rotation should place the tube's low point at feet exactly at phase 0.5.
const theta = phase * Math.PI * 2;
ropePivot.rotation.z = -theta;                      // or axis matched to camera plane (D-16), spike call
armL.rotation.x = Math.sin(theta);  armR.rotation.x = Math.sin(theta);   // arms track the rope
const airborne = view.player.y > 0;
legL.rotation.x = airborne ? tuck : 0;              // tuck keyed off sim y, not its own timer
body.scale.set(1 / view.player.squash, view.player.squash, 1 / view.player.squash);
// scarf: 3–4 boxes, each segment driven by (theta - k * lag) — same clock, trailing beat (D-15)
```
Rig = nested `THREE.Group`s built once in `createScene` (pelvis→torso→head→arms/legs); `render()` only writes rotations/positions/scales. All state lives in the closure — consistent with the create*-factory convention at `js/render3d.js:12-49` [VERIFIED: js/render3d.js:12-49].

### Pattern 5: Idle-state animation needs a cosmetic clock (real gap)
`rope.phase` is static while `status === 'idle'` — the shell's `frame()` only advances sim in the `running` branch (`prevPhase = rope.phase` on the else path, `js/shell.js:97-99`) [VERIFIED: js/shell.js:87-99], and `render3d.js` may **not** call `performance.now()` itself (boundary fence truth 9: wall-clock outside shell.js fails the test) [VERIFIED: 01-VERIFICATION.md truth 9]. Fix: shell adds a render-only field to the existing view object:
```javascript
// js/shell.js frame(): one-line addition to the existing scene.render payload (js/shell.js:104)
scene.render({ run, rope, player, prevPhase, alpha: acc / STEP, best, now });
// render3d.js: idleBob = Math.sin(view.now / 400) * 0.05 — cosmetic only, never read by sim
```
This is one-way data flow (shell→render), so the "renderer never feeds back" prohibition holds, and the browser-IO gate stays green because the call site is in shell.js. Also feeds D-11's trip-shake decay timer (render-side `lastStatus` tracking + `view.now` delta).

### Pattern 6: Rope arc + blob shadow (PRES-03 readability)
- Arc: build **once** a `TubeGeometry` along a `CatmullRomCurve3` of ~16 sampled points — a circle of radius ≈ player height centered at handle height, biased downward-sag in the bottom quadrant (D-10 sag baked in) — parented to a pivot `Group` at handle height; `render()` sets `pivot.rotation.{axis} = -theta`. Bright `MeshBasicMaterial` (unlit so it stays max-bright through the moody lighting; e.g. `#f4f0d8`) or `MeshLambertMaterial` with high emissive, per D-09. Handles: two small dark boxes parented at the pivot ends (D-12).
- Blob shadow: `CircleGeometry` disc + `MeshBasicMaterial` (black, `transparent: true`), `rotation.x = -Math.PI/2`, slightly above floor to avoid z-fight with the wobble; `scale = 1 / (1 + player.y * k)`, `opacity = 0.45 / (1 + player.y * k/2)` — `player.y` is in sim pixels, mapped by the existing `WORLD_PER_PIXEL = 0.01` convention [VERIFIED: js/render3d.js:4,45].
- Fog + sky matched: `scene.fog = new THREE.Fog(skyColor, near, far)`; the built-in materials handle `USE_FOG` automatically; fragment tail order in Lambert sources is `tonemapping → colorspace → fog → premultiplied → dithering` [VERIFIED: lambert fragment shader tail quoted from three.module.js] — so fog blends in display space, giving the desired flat horizon fade.

### Anti-Patterns to Avoid
- **`window.addEventListener('resize')` / `performance.now()` inside `render3d.js`** — turns `tests/boundary.test.js` browser-IO gate red (truth 9). Resize detection must be shell-side or a passive `canvas.width` read.
- **A second timing system** (`AnimationMixer`, self-accumulated `dt` in the renderer) — violates the D-14/ARCH-02 canonical-clock principle.
- **Rebuilding geometry per frame** — rebuild rotation, not buffers.
- **Adding `three/addons/` to the importmap for one convenience pass** — expands the CDN supply-surface for a two-line manual pass.
- **Dithering on `gl_FragCoord` in the final canvas pass** — see Pitfall 3.
- **Keeping the 2D `worldX(phase)` obstacle model in 3D** — the bar obstacle at `js/render3d.js:8-10,35-40` is replaced entirely by the arc (D-08); `worldX`/`obstacleX` has no 3D meaning.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Framebuffer ping-pong / FBO plumbing | Raw WebGL framebuffer code | `renderer.setRenderTarget(rt)` + `render(postScene, postCamera)` | Three manages FBO binds; raw GL would duplicate renderer state tracking |
| Fullscreen quad helper (`FullScreenQuad` is addons-only) | Bundled `EffectComposer`/`ShaderPass` | 6-line core quad: `OrthographicCamera(-1,1,1,-1,0,1)` + `PlaneGeometry(2,2)` (Pattern 1) | Addons need importmap extension; quad is trivial core code |
| Lighting/fog/light-uniform GLSL for the world | Custom lit `ShaderMaterial` | `MeshLambertMaterial` + `flatShading: true` + one `DirectionalLight` + `scene.fog` (+ optional tiny `AmbientLight`) | Chunk plumbing (fog, shadow-free lambert) is battle-tested; injection only for the snap |
| Character timing | `AnimationMixer` + clips | Procedural pose from `lerpPhase` (D-14 locked) | Clip timeline drifts from scoring clock — explicitly rejected |
| Random for trip shake | `Math.random` in render path | Damped deterministic shake from `view.now` (cosmetic) | Keeps render reproducible; `Math.random` in render is fine for looks but adds nothing here |
| Asset loading pipeline | GLTF/ loaders, files | Constructor-built `BoxGeometry`/`CylinderGeometry` assembly (D-13) | No-build/no-asset repo invariant |

**Key insight:** three core already contains every primitive this phase needs; the "PS1 engine" is ~80 lines of shader glue (RT + one quad + one chunk replacement), and the failure modes are ordering/coord-space subtleties, not missing features.

## Common Pitfalls

### Pitfall 1: Dark/gamma-wrong frame — the linear render-target trap
**What goes wrong:** Scene renders ~2.2× too dark (or washed) once the RT pass is introduced.
**Why it happens:** Rendering into a non-XR render target writes the *working* color space (linear) and skips tone mapping — verbatim from the bundle [VERIFIED: three.module.js:7514 `outputColorSpace: ( currentRenderTarget === null ) ? renderer.outputColorSpace : ( currentRenderTarget.isXRRenderTarget === true ? currentRenderTarget.texture.colorSpace : ColorManagement.workingColorSpace ),`; :7482 `if ( currentRenderTarget === null || currentRenderTarget.isXRRenderTarget === true ) { toneMapping = renderer.toneMapping; }`]. Direct-to-canvas mode has always applied the sRGB encode automatically, which is why the current Phase-1 placeholder `js/render3d.js` looks correct today. And the final `ShaderMaterial` gets **no** automatic conversion (`renderer.outputColorSpace = SRGBColorSpace` default [VERIFIED: three.module.js:16349 `_outputColorSpace = SRGBColorSpace`] only feeds built-in shaders via `<colorspace_fragment>`; a raw ShaderMaterial must do `toSRGB()` itself — Pattern 3). Render-target texture colorSpace default is `NoColorSpace` [VERIFIED: three.core.js:7311, Texture ctor `colorSpace = NoColorSpace`] so sampling returns the stored (linear) values untouched.
**How to avoid:** sRGB-encode in the dither fragment before quantize (Pattern 3); keep `renderer.toneMapping = NoToneMapping` (default) and `THREE.ColorManagement.enabled` untouched.
**Warning signs:** First spike frame looks fine before the RT pass, dark after it.

### Pitfall 2: Blurry or shimmering upscale — filter defaults
**What goes wrong:** Nearest-neighbor upscale comes out blurry, or sparkles during vertex wobble.
**Why:** `RenderTarget`/Texture filters default to `LinearFilter`/`LinearMipmapLinearFilter` (doc comment [VERIFIED: three.core.js:7305-7311]) and mip chaining on a 240p target bleeds colors at odd canvas sizes.
**How to avoid:** Set `minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false` at RT construction (Pattern 1). Keep `renderer.setPixelRatio(1)` so HiDPI windows don't silently scale the math.
**Warning signs:** css `image-rendering: pixelated` (css/style.css) hides this when CSS scales, but the GL path must not rely on it.

### Pitfall 3: Dither pattern erased by nearest upscale
**What goes wrong:** Bayer pattern invisible or moiré-y on a 1080p window.
**Why:** If the pattern indexes `gl_FragCoord` (canvas pixels), a 240→1080 upscale (≈4.5×, non-integer) smears different pattern cells inside one internal-pixel block.
**How to avoid:** Index the matrix at `floor(vUv * uInternalRes)` so one dither cell == one internal framebuffer pixel (Pattern 3) — matches PS1 framebuffer semantics where dither happens at framebuffer resolution [ASSUMED A6].
**Warning signs:** Look passes at the spike's fixed small window but degrades on a large monitor — test the spike at both.

### Pitfall 4: `onBeforeCompile` edit silently not applied / stale programs
**What goes wrong:** Snap code never runs, or a toggle (snap on/off, grid size) doesn't take effect after first compile.
**Why:** The callback runs once per program cache key; editing the injected string without changing the cache key reuses the old program. Also, uniforms added inside the callback must be attached to `shader.uniforms` there (not on the material) and the `shader` object stored (`material.userData.shader`) for later updates.
**How to avoid:** Set `material.customProgramCacheKey = () => 'snap'` (exists in 0.186.1 [VERIFIED: three.module.js:7687]); set all snap parameters before first render so no runtime recompile is needed in production.
**Warning signs:** Geometry wobbles in the spike but not in-scene (or vice versa) — the spike is precisely where to burn this.

### Pitfall 5: First-frame shader stall at gameplay start (success criterion 4)
**What goes wrong:** Freeze/hitch on the first rendered frame or at first run.
**Why:** three compiles programs lazily on first draw.
**How to avoid:** After building the full scene in `createScene`, call `renderer.compile(scene, camera)` once — signature present verbatim [VERIFIED: three.module.js:17433 `this.compile = function ( scene, camera, targetScene = null ) {`; returns `Set<Material>`]. Add the post pass too: `renderer.compile(postScene, postCamera)`. Because the shell renders every frame from page load (idle included, `js/shell.js:83-109`), first-frame stall lands in idle time; `compile()` at build makes it deterministic. `renderer.compileAsync` [VERIFIED: three.module.js:17552] is the promise-based variant — unnecessary with zero textures, but it exists if compile itself shows a measurable hitch on weak GPUs.
**Warning signs:** The Phase-1 human-smoke already exercises "first WebGL frame survives" — criterion 4 is that check with timing eyes.

### Pitfall 6: Stub-test breakage when `render3d.js` grows new THREE surface
**What goes wrong:** `node --test tests/` goes red the moment render3d.js references `THREE.WebGLRenderTarget` etc.
**Why:** `tests/render3d.test.js` imports render3d.js source-rewritten against a hand-written THREE **stub** listing exactly 13 classes [VERIFIED: tests/render3d.test.js:20-42]. Every new THREE symbol used at module/scene-build time (`WebGLRenderTarget`, `ShaderMaterial`, `Group`, `OrthographicCamera`, `Vector2`, `CatmullRomCurve3`, …) must be added to that stub, and the stub's `render()`-path objects must survive `scene.render(sampleView)`.
**How to avoid:** Treat "extend THREE_STUB in tests/render3d.test.js for the new scene surface" as an explicit plan task; note the stub file must keep **zero relative specifiers into js/** (its own comment, lines 13-15, documents why the boundary walk must stay green).
**Warning signs:** First scene-work commit fails CI/tests with `SyntaxError`/`undefined` on a THREE symbol.

### Pitfall 7: Wobble turning the floor into soup
**Why:** Vertex snap wiggles *vertices*; a high-segment floor plane (the Phase-1 floor is `PlaneGeometry(40, 12)` — one quad, fine [VERIFIED: js/render3d.js:24]) becomes jelly if subdivided.
**How to avoid:** Keep few subdivisions on large geometry (1×1 floors, long thin silhouettes); reserve visible wobble for chunky character/prop forms. Tune snap grid in spike ("authentic crawl, not subtle jitter" is the user-set dial position, but the floor stays calm via low vertex density, not via weaker snap on everything).

## Runtime State Inventory

Not a rename/migration phase — section omitted (no stored-data, service-config, OS-registered, secret, or build-artifact state carries Phase-2 inputs; the only persisted value, `jumprope-best` localStorage key, is untouched by this phase).

## Code Examples

Verified pipeline-critical API facts (each quoted from the pinned 0.186.1 bundle this session):

### Precompile (criterion 4)
```javascript
// Source: three@0.186.1 bundle, three.module.js:17433 / :17552 [VERIFIED]
const scene = buildWorld();                 // all materials present now
renderer.compile(scene, camera);            // sync precompile
renderer.compile(postScene, postCamera);    // don't forget the dither pass quad
```

### Render-target sizing at resize (shell-owned trigger)
```javascript
// Source: Pattern 1; API surface [VERIFIED: setRenderTarget ×7 occurrences, setSize/setPixelRatio present]
function resizeRT(w, h) {                   // w,h = canvas buffer size
  const h2 = 240, w2 = Math.max(2, Math.round(240 * w / h));
  rt.setSize(w2, h2);
  ditherMat.uniforms.uInternalRes.value.set(w2, h2);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
```

### Blob shadow + arc angle from the canonical clock
```javascript
// Source: existing conventions [VERIFIED: js/render3d.js:43-45 (lerpPhase call, WORLD_PER_PIXEL), js/rope.js:11-13 (atFeet)]
const phase = lerpPhase(view.prevPhase, view.rope.phase, view.alpha);
const theta = phase * Math.PI * 2;          // define: theta = PI ⇔ rope at feet (atFeet 0.45–0.55)
shadow.scale.setScalar(1 / (1 + view.player.y * WORLD_PER_PIXEL * 0.8));
shadow.material.opacity = 0.45 / (1 + view.player.y * WORLD_PER_PIXEL * 0.8);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `MeshLambertMaterial` = vertex/Gouraud lighting | Lambert evaluates lighting **per-fragment** (chunk chain `lights_fragment_begin` in lambert frag source [VERIFIED: three.module.js lambert source chain quoted]) | years ago (pre-0.186; exact release [ASSUMED A2]) | D-05's "vertex-lit" feel = `flatShading: true` facets (+ flat vertex colors if desired); a real Gouraud path no longer exists in built-ins |
| `.sRGBEncoding` / `outputEncoding` | `renderer.outputColorSpace` + per-target `texture.colorSpace` | r152-era color-management overhaul | Encoded here against 0.186.1 defaults [VERIFIED: three.module.js:16349]; old API names absent — do not write `sRGBEncoding` anywhere |
| Postprocessing addons (`EffectComposer`) | Two-line core RT pass | always available | Repo chooses core-only; addons path now also carries TSL-only retro nodes (`retroPass`/`RetroPassNode`, `Bayer`) [CITED: threejs.org docs index] |

**Deprecated/outdated:**
- `WebGLMultisampleRenderTarget`, `sRGBEncoding`, `renderer.physicallyCorrectLights` — not in 0.186 API surface; ignore blog-era snippets. [ASSUMED: negative claim from bundle inspection of the two shipped files — spike will error out immediately if any such name is used.]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Standard 4×4 Bayer matrix constants (`0,12,3,15 / 8,4,11,7 / 2,14,1,13 / 10,6,9,5` ÷16) | Pattern 3 | Trivially visible in spike; 1-line fix |
| A2 | Built-in Lambert became per-fragment lighting in an r1xx release (exact release unverified this session) | State of the Art | None — current-state fact (per-fragment) was bundle-verified; only the historical date is soft |
| A3 | "≈240 rows, width follows aspect" ⇒ e.g. 320×240 at 4:3, ~426×240 at 16:9; exact target picked in spike | Patterns 1/3 | Cosmetic; spike tunes |
| A4 | Adding a `now` field to the view payload is the sanctioned way to feed idle animation (boundary fence keys on IO *calls*, not view fields) | Pattern 5 | If the fence flags it (it shouldn't — `performance.now()` stays in shell.js:28/31/54 usage pattern), alternative: shell accumulates a render-only frame counter |
| A5 | `renderer.compile` cost at `createScene` time is small enough to skip `compileAsync` | Pitfall 5 | Swap to verified `compileAsync` — same file, 1-line change |
| A6 | PS1 dithering pattern belongs at framebuffer (internal) resolution, not canvas resolution | Pitfall 3 | Visual style only; spike confirms |

## Open Questions

1. **Where does the idle-state animation clock come from?**
   - What we know: `rope.phase` frozen in idle [VERIFIED: js/shell.js:87-99]; wall-clock forbidden in render3d.js by fence truth 9.
   - What's unclear: whether the planner prefers a new `view.now` field vs. a shell-side frame counter.
   - Recommendation: `view.now = now` (the rAF timestamp argument already exists at `js/shell.js:83` — zero extra IO calls); render-side cosmetic use only.

2. **Does the precompile need to also cover the post-pass scene, and is one `compile()` call per scene enough?**
   - What we know: `compile(scene, camera)` compiles materials of the traversed scene [VERIFIED signature/behavioral contract: three.module.js:17433]; the dither quad lives in a separate `postScene`.
   - Recommendation: two explicit `compile()` calls; add an eyeball check "no hitch at first space-press" to the spike checklist.

3. **Is a tiny ambient fill allowed alongside D-05's "one directional light"?**
   - What we know: pure single-dir Lambert puts camera-facing faces near-black before dither — possibly the desired moody look (D-07), possibly unreadable at 240p.
   - Recommendation: settle in the spike; if needed, prefer raising directional intensity or flat vertex colors over adding `AmbientLight`, to keep D-05 literal.

4. **Canvas buffer strategy for criterion 4** — window-sized buffer (shell sets `canvas.width/height = window`, CSS stops scaling) vs. current fixed 480×640 + CSS upscale [VERIFIED: js/shell.js:6-7,11-12; css/style.css aspect-ratio/`image-rendering: pixelated`].
   - Recommendation: window-sized buffer + internal RT is the cleanest reading of "renders correctly at the browser's full window size"; letterbox polish stays Phase 5.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Browser with WebGL2 (human UAT + spike pages) | All rendering | ✗ (not in this headless session) | — | None — human-verify checkpoints required (already the Phase-1 pattern, human_verify_mode=end-of-phase) |
| Node.js (tests) | `node --test tests/` | ✓ | v26.8.1 | — |
| Static server (`python3 -m http.server` / `npx serve`) | spike + UAT | ✓ (python3 present in dev env per AGENTS.md; run at execution time) | — | any static server |
| CDN reachability (cdn.jsdelivr.net, pinned three) | spike + app | ✓ | HTTP 200 this session for 0.186.1 build files | Vendor `three.module.js`+`three.core.js` locally + repoint spike importmap only (do NOT change production importmap without a decision) |
| three npm package install | — not needed | n/a | importmap-only by design | — |

**Missing dependencies with no fallback:** browser WebGL → phase must carry `checkpoint:human-verify` tasks for the spike look-decision and the end-of-phase browser smoke.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (built-in) + node:assert/strict |
| Config file | none — convention: `tests/*.test.js` |
| Quick run command | `node --test tests/` |
| Full suite command | `node --test tests/` |

Baseline this session: **42/42 pass, 63ms** (ran `node --test tests/` on the clean tree).

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRES-01 | `createScene` still honors `{ render }` contract with the rebuilt scene | unit | `node --test tests/render3d.test.js` | ✅ exists — needs THREE_STUB extension (Pitfall 6) |
| PRES-01 | 240-row target-size math (`h fixed, w = f(aspect)`) if extracted as a pure fn | unit | `node --test tests/render3d.test.js` (stub-import pattern) | ❌ Wave 0 — optional, math is 2 lines |
| PRES-01 | Look: low-res + Bayer + wobble present | manual (browser) | spike checklist + end-of-phase UAT | n/a |
| PRES-02 | Arc angle ⇔ `atFeet(0.45–0.55)` alignment helper, if extracted | unit | `node --test tests/interpolate.test.js` (existing wrap pins must stay green) | ✅ wrap pins exist; angle-mapping pin ❌ Wave 0 optional |
| PRES-02 | Character visible, phase-animated, idle bob | manual (browser) | UAT | n/a |
| PRES-03 | Rope over-head→feet readable, blob shadow shrinks with `player.y` | manual (browser) | UAT (CPU-throttle pass too, Phase-1 precedent) | n/a |
| ARCH-01 (guard) | New scene code introduces no sim-graph `three` refs / no IO in render3d.js | unit | `node --test tests/boundary.test.js` | ✅ must stay green |
| Criterion 4 | No first-frame stall | manual (browser) | spike + smoke checklist | n/a |

### Sampling Rate
- **Per task commit:** `node --test tests/` (fast, <1s)
- **Per wave merge:** `node --test tests/` full suite (identical command — suite is the full suite)
- **Phase gate:** Full suite green + spike look signed off + browser UAT before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/render3d.test.js` — extend `THREE_STUB` for new scene surface (WebGLRenderTarget, ShaderMaterial, Group, OrthographicCamera, Vector2, curve/tube geometry, lights, Fog…) — required the moment scene work lands; keep zero relative js/ specifiers in the file
- [ ] Optional: stub-import-pinned test for any extracted look math (internal-res width formula / arc angle mapping) — only if the planner extracts such helpers; do not create churn otherwise
- No framework install needed.

## Security Domain

`security_enforcement: true`, ASVS L1 (`_planning/config.json`). Presentation-only phase — most ASVS categories are inert.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | minimal | Existing key/pointer handlers unchanged; spike pages must not add new DOM sinks (HUD continues `textContent`-only writes, js/shell.js:68-80) |
| V6 Cryptography | no | — |
| V14 Build/Config | yes | Zero new dependencies; `package.json` stays dependency-free |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| CDN supply-chain swap (three module tampered/slopsquatted mirror) | Tampering | Spike + production reuse the **exact same pinned immutable jsdelivr URL** already in `index.html:12` (SRI deliberately deferred in Phase 1, T-01-01 — do not introduce a second/unpinned URL in the spike) |
| Importmap scope creep (adding `three/addons/*` → new CDN path surface) | Tampering | Core-only mandate; if the spike proves addons are truly needed, treat as a decision checkpoint, not a convenience |
| Malformed view fields (e.g. `view.now` undefined in stub tests) | (robustness) | Renderer-side `view.now ?? 0`-style coercion per repo "coerce, don't reject" convention |

## Sources

### Primary (HIGH confidence)
- three@0.186.1 build files downloaded this session from the exact pinned importmap URLs (`cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js` + `three.core.js`) and grepped/read directly — all chunk names, signatures, and color-space logic quoted verbatim with file:line above. This also closes the STATE.md Phase-2 blocker ("`onBeforeCompile` chunk names unverified against three@0.186.1").
- npm registry: `three@0.186.1` version/latest/publish-date via `npm view` (2026-09-24).
- Repo sources read this session: `js/render3d.js`, `js/shell.js`, `js/interpolate.js`, `js/rope.js`, `js/player.js`, `js/game.js`, `index.html`, `css/style.css`, `tests/render3d.test.js`, `.planning/` (STATE, ROADMAP, REQUIREMENTS, phase 01 CONTEXT/VERIFICATION, config.json); `node --test tests/` run green (42/42).

### Secondary (MEDIUM confidence)
- threejs.org docs index (fetched) — confirmed existence of TSL `RetroPassNode`/`Bayer` and full API class inventory; used only to characterize the addons fallback.

### Tertiary (LOW confidence)
- PS1 hardware dithering-at-framebuffer-resolution reasoning (A6); Bayer constant matrix (A1); historical Gouraud removal date (A2) — all flagged in Assumptions Log, all spike-resolvable.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; pinned-build APIs quoted verbatim from the exact artifact the browser loads.
- Architecture: HIGH — every integration point read at source this session; two known seams (view extension, stub test) carry explicit patterns.
- Pitfalls: HIGH on mechanics (color space, filters, cache key — bundle-verified); MEDIUM on perceptual tuning (snap strength, dither scale, lighting mood) — that is precisely the spike's job.

**Research date:** 2026-10-16
**Valid until:** 2026-11-15 (three pin is version-locked; refresh only if the pin moves)
