---
phase: 02-ps1-presentation-scene
plan: 02
subsystem: ui
tags: [threejs, ps1-shader, bayer-dither, vertex-snap, render-target, canvas-resize, tracer]

requires:
  - phase: 02-ps1-presentation-scene
    provides: "02-01 spike ## Look Decisions — the canonical tuning table ported verbatim; proven onBeforeCompile snap injection on pinned three@0.186.1"
  - phase: 01-render-shell-foundation
    provides: "createScene(canvas) -> { render } contract, ARCH-01 boundary fence, lerpPhase interpolation, shell frame() loop"
provides:
  - "js/render3d.js shipping PS1 pipeline: 240-row Nearest RT -> snap-injected flat-Lambert world -> single sRGB-then-Bayer/15-bit post quad; dual renderer.compile precompile; passive canvas-size poll"
  - "tests/render3d.test.js THREE_STUB covering the whole Phase-2 scene surface (Plan 03 needs no stub edits) + now: 0 in the contract-pin view"
  - "js/shell.js: window-sized coerced canvas buffer, resize listener, view.now render-only field on the payload"
  - "css/style.css: full-viewport canvas rule, sky-hex background (#2a3440)"
affects: [02-ps1-presentation-scene scene content (Plan 03), later visual tuning phases]

actuals:
  tokens: 3500
  tasks: 2
  commits: 2
  plan_head_before: 5fdb83b0bb835e728e9cdc8e0d5830e1a1a871f3
  plan_head_after: b786bab6cb571b1f64df515be41a40eb6310269b

tech-stack:
  added: []
  patterns:
    - "Two-pass render inside createScene: setRenderTarget(rt) -> render(scene, camera) -> setRenderTarget(null) -> tDiffuse=rt.texture -> render(postScene, postCamera)"
    - "Passive resize poll inside render(): canvas.width/height property read is the fence-legal size channel; shell owns the resize listener, render3d owns the re-size math (one-way seam)"
    - "Coerce-don't-reject at every view field read (view.alpha ?? 0, view.player.y ?? 0) keeps stub views valid"

key-files:
  created: []
  modified:
    - js/render3d.js
    - tests/render3d.test.js
    - js/shell.js
    - css/style.css

key-decisions:
  - "All Look Decisions knobs ported verbatim as named constants (INTERNAL_H=240, SNAP_S=2, 31-level Bayer, sky/floor/rose hexes, fog 7/22, light 2.4 at (-4,7,3))"
  - "Spike camera framing (pos 0,1.5,6.5 / lookAt 0,1.2,0 / far 80) ported verbatim: with fog near=7 the old Phase-1 z=9 camera would sink the subject into the fog falloff and break the signed-off brightness"
  - "windowSize() helper shared by boot sizing and the resize listener — single coerce site; Node stub environments (no innerWidth) fall back to 480x640 and stay green"
  - "lerpPhase call kept as the single clock entry even though nothing consumes the value yet — Plan 03's rope arc and rig pose from it (commented in code)"

patterns-established:
  - "Shipping-tracer pattern: the signed-off spike recipe ports into createScene before scene content exists, so later plans populate a proven pipeline"

requirements-completed: [PRES-01]

coverage:
  - id: D1
    description: "PS1 pipeline (240-row Nearest RT -> onBeforeCompile snap -> sRGB-then-Bayer/15-bit single pass) lives in the shipping js/render3d.js, pinned by the stub contract tests and the ARCH-01/IO boundary fence"
    requirement: PRES-01
    verification:
      - kind: unit
        ref: "tests/render3d.test.js (3 contract pins against the extended stub) — node --test tests/ 42/42 pass"
        status: pass
      - kind: other
        ref: "bash: setRenderTarget-in-render3d gate + IO-token grep gate + !git grep three/addons + git diff --quiet index.html + node --test tests/boundary.test.js 5/5"
        status: pass
    human_judgment: false
  - id: D2
    description: "Shell renders the canvas buffer at full window size with a live resize listener and the render-only view.now field; sim behavior unchanged"
    requirement: PRES-01
    verification:
      - kind: unit
        ref: "tests/shell.test.js (3) + tests/boundary.test.js (5) green with zero test edits; grep gate: now present in the scene.render payload, no 480/640 constants in shell.js"
        status: pass
      - kind: other
        ref: "bash: ! grep -nE 'aspect-ratio|max-height' css/style.css"
        status: pass
    human_judgment: false
  - id: D3
    description: "Served-browser look parity: rose box + floor through the pipeline at correct brightness (not the dark linear-RT frame), crawl/dither matching the signed-off spike; full-window frame correct at small and large window sizes and through live resize; no hitch at load or first space-press"
    requirement: PRES-01
    verification:
      - kind: manual_procedural
        ref: "Task 1/Task 2 <human-check> — deferred to end-of-phase UAT per human_verify_mode=end-of-phase"
        status: unknown
    human_judgment: true
    rationale: "Pixel-level parity with the signed-off spike, brightness correctness through the sRGB path, and hitch-free first frames are perceptual/timing judgments; automated gates prove the pipeline is wired, not that the frame reads identical."

duration: ~7min
completed: 2026-10-17
status: complete
---

# Phase 02 Plan 02: PS1 Pipeline Port (Shipping Tracer) Summary

**The signed-off spike recipe now runs in the shipping renderer: `createScene` owns a 240-row Nearest render target, `onBeforeCompile` NDC-snap on flat-Lambert world materials, and one sRGB-then-Bayer/15-bit post quad with dual precompile — while the shell drives a window-sized canvas buffer and passes the cosmetic `view.now` clock. 42/42 tests and the ARCH-01/IO fence green; `index.html` and `package.json` byte-untouched.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-10-17T02:19:10Z
- **Completed:** 2026-10-17T02:26:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `js/render3d.js` rebuilt: RT + vertex-snap + Bayer/quantize/sRGB post pass ported 1:1 from `.planning/spikes/ps1-look.html` with every `## Look Decisions` value as a named constant; the 2D bar model (`worldX`/`CENTER`/`EDGE`/obstacle mesh) deleted (D-08); floor + rose box ride the new pipeline (D-05/D-06/D-07)
- Precompile of both scenes inside `createScene` (criterion 4 / T-02-12); pixel-ratio locked to 1 and `Math.max(2, …)` RT clamp against degenerate sizes (T-02-05); no new CDN surface (T-02-06 gate green)
- `tests/render3d.test.js`: THREE_STUB extended for the whole Phase-2 surface (RT, ShaderMaterial, Ortho cam, Group, Vector2, Lambert, light, fog + Plan 03's curve/tube/cylinder/sphere/circle), `scale` with `setScalar` on Node, `now: 0` in the contract-pin view (T-02-07) — all stub-loader invariants unchanged
- `js/shell.js` + `css/style.css`: window-sized coerced buffer, resize listener in the existing idiom, `now` on the render payload (render-only), full-viewport canvas CSS with the sky-hex background

## Task Commits

Each task was committed atomically:

1. **Task 1: Port the PS1 pipeline into createScene and extend the THREE stub** — `512bea7` (feat)
2. **Task 2: Window-sized canvas buffer + view.now field in the shell** — `b786bab` (feat)

**Plan metadata:** (this plan's docs commit, following)

## Files Created/Modified
- `js/render3d.js` - rebuilt `createScene`: renderer/RT/snap/post-quad/poll/precompile; obstacle model deleted
- `tests/render3d.test.js` - extended THREE_STUB + `now: 0` in the sample view
- `js/shell.js` - windowSize() helper, resize listener, `view.now` payload field; try/catch render isolation untouched
- `css/style.css` - canvas rule: block/100vw/100vh, background #2a3440; `#hud` untouched

## Decisions Made
- Every tuning knob copied verbatim from the spike's `## Look Decisions` (no browser-driven tuning; the 02-01 sign-off is the numeric contract)
- Spike camera framing ported verbatim (pos (0, 1.5, 6.5), lookAt (0, 1.2, 0), far 80): the plan's "not the dark linear-RT frame / matches the signed-off spike" check would fail under the old z=9 camera because fog near=7 would fog the whole subject; Plan 03 refines framing per D-16
- `windowSize()` helper instead of duplicating the coerced `Number(window.innerWidth) || 480` expression at two sites (boot + resize)
- `lerpPhase(view.prevPhase, view.rope.phase, view.alpha ?? 0)` retained as the single clock entry with an in-code comment that Plan 03's rig consumes it (currently the only non-y view read)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Correctness] Ported the spike camera framing with the pipeline**
- **Found during:** Task 1 (pipeline port)
- **Issue:** the plan added sky-matched fog (near 7) but kept no camera guidance; the Phase-1 camera at z=9 puts the subject ~9.5 units out — past the fog near plane — producing a murkier, darker frame than the signed-off spike the Task-1 human-check compares against
- **Fix:** camera position/lookAt/far taken verbatim from the spike (lines 123–125), the other half of "the shipped frame matches the signed-off spike recipe"
- **Files modified:** js/render3d.js
- **Verification:** stub contract tests green; geometry/framing parity with the spike by construction
- **Committed in:** 512bea7 (part of task commit)

**2. [Rule 3 - Blocking] Added the `NearestFilter` constant export to the THREE stub**
- **Found during:** Task 1 (stub extension)
- **Issue:** the plan's stub-symbol list enumerated classes but omitted the `NearestFilter` constant that `WebGLRenderTarget` options read at scene-build time
- **Fix:** `export const NearestFilter = 1003;` added to THREE_STUB (a namespace miss would be silently `undefined` in the stub path — added for fidelity)
- **Files modified:** tests/render3d.test.js
- **Verification:** `node --test tests/` 42/42 green
- **Committed in:** 512bea7 (part of task commit)

---

**Total deviations:** 2 auto-fixed (1 correctness, 1 blocking-plumbing)
**Impact on plan:** Both keep the plan's own acceptance truths (spike-parity frame; stub exercises the real build-time surface). No scope creep.

## Issues Encountered
- None beyond the deviations above. `node --test tests/` 42/42 before and after; `git diff 5fdb83b..HEAD --stat` confirms only the four planned files touched, `index.html`/`package.json` untouched.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 03 has a proven two-pass pipeline to populate: stub already covers TubeGeometry/CatmullRomCurve3/CylinderGeometry/SphereGeometry/CircleGeometry/Group; `view.now` is already on the payload for the idle bob (Pattern 5); `phase` is computed and awaiting the rope-arc/rig readers
- End-of-phase UAT owes the deferred browser checks (D3): served page at one small + one large window against the spike's signed-off look, live resize during play, and no hitch at load / first space-press (criterion 4 screens T-02-12)
- HUD text is now over the dark sky (background swap); its color polish is Phase 5 per the CONTEXT deferred list — D-03's snap-never-jitters-UI guarantee holds since HUD remains DOM

---
*Phase: 02-ps1-presentation-scene*
*Completed: 2026-10-17*

## Self-Check: PASSED

- All four modified files exist on disk
- Commits 512bea7, b786bab confirmed ancestors of HEAD
- Zero occurrences of `worldX`/`obstacle` in js/render3d.js
