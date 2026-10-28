# Phase 2: PS1 Presentation & Scene - Context

**Gathered:** 2026-10-16
**Status:** Ready for planning

<domain>
## Phase Boundary

The game looks authentically PS1 and reads purely from the frame: a low internal-resolution, nearest-neighbor-upscaled, Bayer-dithered, vertex-snapped 3D scene; an original low-poly skipping character animated from the rope-phase clock; a real rotating 3D rope (replacing the Phase 1 placeholder bar) whose arrival at the feet is judgeable from the frame alone via a fixed camera and blob-shadow depth cue; and correct rendering at full window size with no first-frame shader freeze (precompile during idle). No real cards, no audio, no pause/resize hardening — those are later phases.

Requirements: PRES-01 (PS1 scene pipeline), PRES-02 (original phase-animated character), PRES-03 (rope-arrival readability). Success criterion 1 notes the look is settled by a look-spike against `three@0.186.1` before full scene work.

</domain>

<decisions>
## Implementation Decisions

### PS1 look pipeline
- **D-01:** Internal render resolution: lock ~240 rows, width follows window aspect; nearest-neighbor upscale to the canvas. No fixed 4:3 letterbox now (resize/letterbox polish is Phase 5). — **Reversibility:** costly — every later visual tune-up (UI legibility in Phase 5, prop placement) is calibrated against this internal resolution; changing it shifts the whole look.
- **D-02:** Dithering is a **single fullscreen post pass**: quantize to ~15-bit color + ordered Bayer 4×4. This is the only post-processing allowed (PROJECT.md: "no post-processing beyond simple dithering"). Rejected: per-material dither, quantize-only.
- **D-03:** Vertex-snap wobble: **full screen-space pixel-grid snap** on world geometry (signature PS1 crawl), not subtle and not scenery-only. How the snap avoids jittering UI/text overlays is planner's call.
- **D-04:** The look is **settled by a throwaway spike page** (standalone HTML, e.g. under `.planning/spikes/` or a scratch dir) proving low-res render target + Bayer pass + vertex snap work on the importmap-pinned `three@0.186.1` **before** touching `js/render3d.js`. Not prototyped in-scene.
- **D-05:** Shading model: **vertex-lit, one directional light**, flat-shaded facets — feeds real gradients into the dither pass. Keeps low-poly form readable at 240p.
- **D-06:** Simple distance **fog matched to sky color** — hides the world-edge boundary, classic PS1 pairing with dither.
- **D-07:** Palette: **moody PS1 tones** (dusty blues/greens, dim sky) — a deliberate move away from the bright cream/tan prototype palette. Consequence accepted: the rope and character need bright colors to stay readable (see D-09, D-13).

### 3D rope geometry (folds pending todo)
- **D-08:** The rope is a **real rotating arc around the player** — a tube/line sweeping over the head and under the feet, driven by canonical `rope.phase` through the existing `lerpPhase` interpolation. The floating phase-aligned bar obstacle mesh is replaced entirely; hands hold handles at the arc pivot.
- **D-09:** Readability: **bright thin tube** (e.g. pale yellow/white) so the rope stands out against the moody floor/sky through the whole arc, at low res, without glow post-processing (PRES-03).
- **D-10:** Arc shape: **slight gravity sag** that whips with the rotation — organic, but the foot-window timing read stays phase-locked (no independent physics).
- **D-11:** Trip behavior: on `tripped`, the rope **settles to a rest position at the feet with a short shake** — present-tense fail feedback using the existing sim flag. Bigger trip juice stays Phase 4.
- **D-12:** **Visible handles**: small dark handle boxes in the character's hands, turning with the arc.

### Character build & animation
- **D-13:** Built at runtime by **primitive assembly in code** (boxes/cylinders: big head, torso, limbs, parented like a PS1 rig) — no asset files, matches the no-build/no-asset repo style. Color: keep the prototype **rose accent** (`#c94f6d` family) so the jumper pops against the moody stage.
- **D-14:** Animation is **fully procedural from the rope-phase clock** (+ `player.y`/squash state): arm circles synced to the rope, leg tuck when airborne, squash/stretch on landing. No `AnimationMixer`/clips — no second timing system that could drift from scoring. — **Reversibility:** costly — clips would fork a parallel timeline that risks drifting from the canonical clock ARCH-02 protects.
- **D-15:** Personality cues (all three selected): **big-head/chibi proportions**, a **trailing scarf/ponytail** with a-behind-the-beat secondary motion from the same clock, and **idle-state animation** (small bob / rope twirl so the pre-run screen isn't frozen). Simple **dot-block eyes** on the big head.

### Camera, stage & depth cues
- **D-16:** Fixed **side-on camera with a slight angle** — rope's over-head-to-feet arc reads cleanly in frame while keeping some 3D depth; no camera motion/follow. Rejected pure-profile (flat) and strong 3/4 (hurts low-res readability).
- **D-17:** Depth cue: **blob shadow disc** under the player that shrinks/fades with jump height — cheap, unambiguous through dither. No real-time shadow maps.
- **D-18:** Stage content: **sparse horizon silhouettes** (distant blocks/hills fading into fog) on a fog-faded floor plane — mood without visual noise near the judgment zone.

### Researcher/planner domain (not user-decided)
- **Shader mechanics:** exact `three@0.186.1` wiring for the render-target pipeline, Bayer pass, and vertex snap (`onBeforeCompile` vs custom material) — the spike (D-04) settles these.
- **Precompile strategy** for criterion 4 (no first-frame shader freeze): compiling materials during the idle state before the first run — planner's call.
- **Rope tube construction/segment count and sag curve** — planner picks the simplest that reads well in the spike.

### the agent's Discretion
- Camera exact position/height/framing within the "side-on, slight angle, fixed" envelope; specific palette values (may be tuned during the spike); handle/scarf geometry details; scene-graph organization inside `js/render3d.js`.

### Folded Todos
- **"Bring back a proper 3D jump rope to the WebGL scene"** (`.planning/todos/pending/2026-10-16-bring-back-a-proper-3d-jump-rope-to-the-webgl-scene.md`) — original problem: live scene has a phase-aligned bar + floating cube instead of a real rotating 3D rope; fits via D-08–D-12 (rope geometry replaces the placeholder bar).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project direction
- `.planning/PROJECT.md` — constraints (Three.js render-only, pure core, no post beyond simple dithering) and Key Decisions (original character/stage — avoid Scarlet lookalike)
- `.planning/REQUIREMENTS.md` — PRES-01, PRES-02, PRES-03 definitions (this phase's requirements)
- `.planning/ROADMAP.md` §Phase 2 — the four success criteria, incl. the look-spike mandate and precompile-during-idle criterion

### Prior phase context
- `.planning/phases/01-render-shell-foundation/01-CONTEXT.md` — locked split (D-01: `render3d.js` sole `three` importer), canonical-clock + prev/curr interpolation model, ARCH-01 boundary test
- `.planning/phases/01-render-shell-foundation/01-VERIFICATION.md` — what Phase 1 actually shipped/verified (incl. createScene return-contract fix)

### Existing code to extend
- `js/render3d.js` — current placeholder scene (floor, box player, bar obstacle, fixed camera) that this phase replaces; `createScene(canvas) → { render }` contract
- `js/interpolate.js` — `lerpPhase` prev/curr clock interpolation the rope/character animation must ride
- `js/shell.js` — frame loop feeding `render(view)`; idle state where shader precompile must happen

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lerpPhase(prevPhase, phase, alpha)` (`js/interpolate.js`) — already used at `js/render3d.js:43`; the rope arc and character animation derive phase from this same call.
- `createScene(canvas) → { render(view) }` contract (`js/render3d.js:12-49`) — extended, not reshaped; view carries prev/curr sim states + alpha.
- `view.player.y` + player squash-spring state (`js/player.js`) — feeds jump-height blob shadow and squash/stretch (D-14).
- Sim `tripped` flag / `status` fields — drive the rope-settles-at-feet behavior (D-11) with no sim changes.

### Established Patterns
- `render3d.js` is the **sole** `three` importer — the whole PS1 pipeline (RTs, Bayer shader, snap) must live inside it; `tests/boundary.test.js` enforces it (ARCH-01).
- Renderer reads sim state only, never feeds back — rope arc is a pure function of the interpolated phase, never a physics sim.
- Factory functions returning plain objects, named exports only, zero npm deps (three via importmap only).

### Integration Points
- `js/render3d.js` — scene rebuilt: pipeline (D-01–D-03, D-05, D-06), rope (D-08–D-12), character (D-13–D-15), camera/stage (D-16–D-18)
- `js/shell.js` — possible precompile hook during idle state (criterion 4); resize already delegated
- `index.html` — untouched unless the spike changes importmap delivery (it should not)

</code_context>

<specifics>
## Specific Ideas

- Look-spike before scene work is explicit in ROADMAP criterion 1 — treat the spike as a planned task with its own artifact, not a spike-style side quest.
- "Authentic crawl, not subtle jitter" — user chose maximum vertex snap and moody mood over safe readability-first compromises; readability is protected specifically via bright rope + rose character + blob shadow + side-on camera choices (D-09, D-13, D-17, D-16).
- Character keeps visual continuity with the 2D prototype via the rose accent.

</specifics>

<deferred>
## Deferred Ideas

- Trip *juice* beyond rope-settling (hitstop, particles, shake scale) — Phase 4.
- Letterbox/resize handling of the low-res framebuffer at odd window sizes — Phase 5.
- Reduced-motion dampening of the vertex wobble (D-03 is max-strength by default) — Phase 5 wires `prefers-reduced-motion`.

</deferred>

---

*Phase: 02-ps1-presentation-scene*
*Context gathered: 2026-10-16*
