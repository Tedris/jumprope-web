# Walking Skeleton — Jumprope Web

**Phase:** 1
**Generated:** 2026-10-15

## Capability Proven End-to-End

> One sentence: the smallest user-visible capability that exercises the full stack.

A player presses one button and plays a complete run (idle → running → choose → over) of the rope-jump game, rendered frame-by-frame by a WebGL placeholder scene that reads only immutable simulation state off a single canonical clock — with `node --test tests/` green and zero `three` references inside the sim graph.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Rendering | Three.js `three@0.186.1`, ESM via `<script type="importmap">` from `https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js` | The one sanctioned dependency (PROJECT.md); no build step, no npm install; URL liveness + immutable cache headers verified by HTTP probe (RESEARCH §Version verification). r186's ESM build is a 2-file closure (three.module.js → three.core.js) — matters only for a vendored fallback |
| Module layout | Three-way split: `js/game.js` (pure sim, Node-importable) / `js/shell.js` (impure browser shell) / `js/render3d.js` (sole `three` importer) | D-01 (user-locked, reversibility: costly). Tests import game.js unchanged; the boundary is enforceable because shell/render3d are unreachable from the test graph (D-03) |
| Clock | One fixed-timestep accumulator in shell.js (`STEP = 1/120`, 0.25 s clamp); render reads `prevPhase` + `alpha = acc/STEP`; visuals interpolate via wrap-aware `lerpPhase` | "Fix Your Timestep" canonical pattern; `rope.phase` is the master timeline (PROJECT.md decision); single time source kills the drift failure mode of ROADMAP SC-4 |
| Input | Pointer/keyboard handlers set intent flags consumed at step boundaries; `performance.now()` used only to measure physical press duration | Pitfall 5 — jump timing must not depend on frame load; shell is the only wall-clock toucher |
| Randomness | Optional 5th `rng` parameter on `tickRun`, shell always injects | Extends the proven `pickTwo(upgrades, rng)` DI precedent; 4-positional-arg test surface preserved (RESEARCH Pattern 6) |
| HUD text | DOM overlay `<div id="hud">`, shell writes `textContent` only | Browser chrome, not a second render path (RESEARCH Pattern 4a); keeps render3d.js uncontested; Phase 2 may migrate into the low-res pipeline |
| Persistence | `localStorage` key `jumprope-best` via injected `storage` parameter | Unchanged DI pattern; coerced numeric, cosmetic, no trust placed |
| Deployment target | Static files only (any static host; local dev `python3 -m http.server`) | Project constraint — still no server component |
| Directory layout | Flat `js/` modules + mirrored `tests/*.test.js`; `package.json` stays dependency-free | Existing brownfield convention (CONVENTIONS.md) |

## Stack Touched in Phase 1

- [x] Project scaffold — no scaffold exists by design: no build, no deps; the "scaffold" is the importmap in index.html and `node --test` convention
- [x] "Routing" — at least one real entry point: index.html → js/shell.js module graph boots the game
- [x] Data — at least one real read AND write: localStorage best-score load/save round-trip through the run lifecycle
- [x] UI — at least one interactive element: tap/space jumps, starts runs, picks offers; WebGL frame moves with sim state
- [x] Deployment — local full-stack run command proven: `python3 -m http.server` + browser plays one full run

## Out of Scope (Deferred to Later Slices)

- PS1 look: low-res render target, dithering, vertex wobble, real character, readable camera (Phase 2)
- Real card choices, rarity, stack caps, offer filtering, owned-card HUD (Phase 3)
- Input buffering forgiveness, juice, WebAudio SFX/loop, mute/volume persistence (Phase 4)
- Pause/tab-hidden handling, prefers-reduced-motion, resize/letterbox hardening (Phase 5)
- SRI integrity on the importmap URL (deliberate deferral, comment recorded in index.html — T-01-01)
- Vendored `vendor/three/` offline fallback (documented in RESEARCH; CDN is fine for v1)
- Seeded/replayable rng beyond the injection seam itself (Phase 3 replay work may want it)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: player reads rope arrival from an authentically PS1-styled 3D scene with an original low-poly character — render3d.js gets richer, sim untouched
- Phase 3: player makes real pick-two card decisions from a balanced original catalogue — sim gets offer intelligence, shell/HUD shows owned cards
- Phase 4: player feels and hears the rhythm loop — shell gains WebAudio + input buffer, sim stays pure and single-clocked
- Phase 5: game survives real browsers — pause/reduce/resize behaviors wired in shell, respecting system preferences

## Breaks-if-wrong (for later phases)

- The importmap must remain the ONLY `three` resolution path and stay declared before module scripts (Pitfall 2)
- `tests/boundary.test.js` is the tripwire for ARCH-01 — if Phase 2 tempts anyone to import `three` from a sim-adjacent module, that test says no first
- `rope.phase` stays the one clock: Phase 2 wobble/dither and Phase 4 audio must derive from it, never from their own timers
