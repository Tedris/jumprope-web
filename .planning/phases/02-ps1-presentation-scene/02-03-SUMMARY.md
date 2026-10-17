---
phase: 02-ps1-presentation-scene
plan: 03
subsystem: ui
tags: [threejs, character-rig, rope-arc, blob-shadow, procedural-animation, ps1-scene]

requires:
  - phase: 02-ps1-presentation-scene
    provides: "02-02 PS1 pipeline (RT + snap + Bayer post, precompile, passive poll), the extended THREE stub, and view.now on the render payload"
  - phase: 01-render-shell-foundation
    provides: "lerpPhase interpolation, createScene(canvas) -> { render } contract, ARCH-01/02 boundary fence, shell frame() loop"
provides:
  - "js/render3d.js final scene: phase-driven chibi rig (head/cap/eyes/limbs/scarf chain), sag-baked rotating rope arc with handles at a handle-height pivot, blob-shadow disc, fog-faded horizon silhouettes, fixed D-16 camera"
  - "Pinned convention: theta = lerpPhase(...) * 2*PI with theta = PI <=> tube low point at the feet (atFeet 0.45–0.55, js/rope.js:11-13) — code-commented at the pivot rotation line"
  - "Idle life (bob sin((view.now ?? 0)/400)*0.05 + twirl (view.now ?? 0)/1400) and trip settle (pivot frozen at -PI + sin(Δ*42)*exp(-Δ/200) shake), both status-gated; the running-pose path never reads view.now"
  - "HUD running prompt says 'rope reaches your feet' (UI-SPEC copy fix shipped with the box removal)"
affects: [phase-03-rope-speed-regression-check, phase-04-trip-juice, phase-5-reduced-motion]

actuals:
  tokens: 6300
  tasks: 3
  commits: 3
  plan_head_before: caaadcbfded47b4bbfad249904723bb174c5f0da
  plan_head_after: 9994cf81c881fd04b248f8ebffa497c098f06948

tech-stack:
  added: []
  patterns:
    - "Rig = nested Groups built once in createScene (root -> torsoGroup -> headGroup + scarf chain; legs on root); render() writes rotations/positions/scales only"
    - "Rope arc: 16-point CatmullRomCurve3 with the bottom-quadrant sag baked radially (dip^2 * 0.1), one TubeGeometry(32, 0.05, 6), unlit pale MeshBasicMaterial({ fog: false }) — geometry never touched in render()"
    - "Status-branch pose: idle/over branches read view.now cosmetically; running branch derives everything from theta + player.y/squash (T-02-08 boundary)"

key-files:
  created: []
  modified:
    - js/render3d.js
    - js/shell.js
    - tests/render3d.test.js

key-decisions:
  - "Camera FOV 50 -> 40 with the UI-SPEC's (2.6, 2.2, 8.6) framing: keeps the subject's frame fraction equal to the signed-off spike's 6.5-distance 50° frame; fov is outside the binding position constraint"
  - "theta⇔feet convention pinned analytically and in a code comment: curve bulge at local +Y, ropePivot.rotation.z = -theta, so theta = PI rotates the sagged low point to world-down at the feet (y ≈ -0.05 at phase 0.5); browser confirmation deferred to end-of-phase UAT"
  - "Trip shake implemented verbatim from the plan/UI-SPEC formula sin(Δ*42) * exp(-Δ/200) on millisecond deltas — a fast per-frame jitter inside the 200 ms decay envelope; zero RNG, zero accumulators"
  - "Shared scene materials (roseMat/limbMat/propMat) built once instead of per-mesh worldMaterial calls — same 'ps1-snap' program cache key, fewer programs"

patterns-established:
  - "Scene population without stub churn: new THREE symbols are added to tests/render3d.test.js ONE line at a time, only when the build/render path actually touches them (Vector3, Mesh.material), keeping the data:-URL invariants intact"

requirements-completed: [PRES-02, PRES-03]

coverage:
  - id: D1
    description: "Original phase-animated chibi character assembled from primitives at runtime; every animated pose quantity derives from lerpPhase theta + player.y/squash — no mixer, no clips, no renderer-side accumulator (PRES-02, D-13/D-14/D-15)"
    requirement: PRES-02
    verification:
      - kind: unit
        ref: "tests/render3d.test.js 3 contract pins green against the stub (42/42 suite); render() contains zero `new THREE` constructions (awk-window grep)"
        status: pass
      - kind: other
        ref: "bash: ! git grep AnimationMixer|GLTFLoader + single TubeGeometry site gate — green"
        status: pass
      - kind: manual_procedural
        ref: "Task 1 <human-check> (feet-arrival vs score tick, arms track, legs tuck, camera still) — deferred to end-of-phase UAT per human_verify_mode=end-of-phase"
        status: unknown
    human_judgment: true
    rationale: "The theta⇔feet bridge is the phase's worst failure mode and the plan explicitly assigns it to the Task-1 human eyeball; automated gates prove the wiring, not the on-screen coincidence."
  - id: D2
    description: "Stage depth cues: Pattern-6 blob shadow formulas verbatim on the snap-exempt transparent disc; floor stays a 1x1 quad; 5 static fog-covered silhouette slabs at x ±14/z -8 outside the ±6 judgment-zone keep-out (PRES-03 support, D-17/D-18)"
    requirement: PRES-03
    verification:
      - kind: unit
        ref: "grep gate: shadow.scale.setScalar + opacity = 0.45 / (1 + literals present; suite green"
        status: pass
      - kind: manual_procedural
        ref: "Task 2 <human-check> (silhouettes fade, shadow continuous through a jump, rope readable top-to-bottom) — deferred to end-of-phase UAT"
        status: unknown
    human_judgment: true
    rationale: "Readability of rope vs floor through the dither at both arc extremes is a perceptual judgment."
  - id: D3
    description: "Personality + trip: scarf lags theta - k*0.4; idle bob/twirl from view.now gated to status idle; over-branch freezes the pivot at -PI with the closed-form damped shake; running-pose path reads no view.now; zero RNG in js/render3d.js (D-11/D-15, T-02-09)"
    requirement: PRES-02
    verification:
      - kind: unit
        ref: "view.now ?? 0 grep + suite green + boundary fence green + Math.random scan on render3d.js clean + 0.33 dual-init literal still unique to js/game.js"
        status: pass
      - kind: manual_procedural
        ref: "Task 3 <human-check> (idle screen breathes, scarf trails a beat, trip drops rope + short shake then stillness, scores unchanged vs Phase 1) — deferred to end-of-phase UAT"
        status: unknown
    human_judgment: true
    rationale: "Personality sync ('scarf/limbs never desync from the beat') and trip legibility are experiential checks."

duration: ~7min
completed: 2026-10-17
status: complete
---

# Phase 02 Plan 03: Scene Population — Character, Rope, Stage Summary

**The placeholder box is gone: `createScene` now builds a chibi rig (big rose head, dot eyes, limb groups, 3-segment scarf chain) and a sag-baked rotating rope arc with handles on a handle-height pivot, all posed exclusively from `lerpPhase` theta — with the theta = PI ⇔ feet-at-rest mapping code-pinned against `atFeet`'s 0.45–0.55 window. Idle breathes, trips shake-then-settle off `view.now` deltas alone, and the blob shadow + fog-faded slabs frame the judgment zone. 42/42 tests, boundary fence, and every plan gate green.**

## Performance

- **Duration:** ~7 min (02:40:15Z → 02:46:58Z)
- **Tasks:** 3
- **Files modified:** 3

## Task Commits

Each task was committed atomically:

1. **Task 1: Character rig + rotating rope arc + readable camera** — `e4f329d` (feat)
2. **Task 2: Stage, fog-faded horizon, and blob-shadow depth cue** — `6e94e45` (feat)
3. **Task 3: Personality, idle life, and trip settle (scarf, bob, shake)** — `9994cf8` (feat)

**Plan metadata:** (this plan's docs commit, following)

## Files Created/Modified

- `js/render3d.js` — rig Group tree + scarf chain, sag-baked curve + single TubeGeometry + pivot + handles, blob-shadow disc (Pattern-6 formulas), 5 horizon silhouette slabs, fixed camera `(2.6, 2.2, 8.6)` → `lookAt(0, 1, 0)` fov 40, status-gated pose logic with the pinned theta convention comment; placeholder `playerBox` deleted
- `js/shell.js` — running prompt copy: "…when the rope reaches your feet" (UI-SPEC Copywriting Contract required fix, shipped with the box's removal)
- `tests/render3d.test.js` — two plan-permitted stub lines: `Vector3` export (rope-curve points at build time) and `Mesh` retaining its constructor material (shadow opacity write)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Spec compliance] HUD running prompt said "the box" after the box was deleted**
- **Found during:** Task 1 (placeholder-box removal)
- **Issue:** 02-UI-SPEC Copywriting Contract: `js/shell.js:83` "press space / tap when the box reaches you" must change with or before the plan that deletes the bar/box (D-08) — this plan; `js/shell.js` was not in the plan's `files_modified` list
- **Fix:** string replaced with the contract verbatim "press space / tap when the rope reaches your feet"; `tests/shell.test.js` asserts only that the idle prompt gives way, so no test edit was needed
- **Files modified:** js/shell.js
- **Commit:** e4f329d

**2. [Rule 3 - Blocking] Two stub-surface additions the plan's own read_first pre-authorized**
- **Found during:** Tasks 1 and 2
- **Issue:** the extended THREE_STUB omitted `Vector3` (the curve samples points at build time — Pitfall 6's exactly-predicted failure) and its `Mesh` dropped the constructor material (the Pattern-6 opacity write would throw on the stub render path)
- **Fix:** `Vector3 extends Vec3` export added; `Mesh` now keeps `(geometry, material)`. Boundary-graph invariants of the test file unchanged (still zero relative specifiers into js/)
- **Files modified:** tests/render3d.test.js
- **Commits:** e4f329d, 6e94e45

### Discretion calls (within the plan's envelope)

- **Camera FOV 50 → 40:** the UI-SPEC binds the camera *position*; keeping the old fov at the farther D-16 vantage would shrink the jumper to ~27% frame height. 40° at ≈9 units ≈ the signed-off spike's subject size. Re-tune at the UAT if the frame reads wrong.
- **Shared materials (roseMat/limbMat/propMat)** instead of per-mesh `worldMaterial()` — identical appearance under the shared 'ps1-snap' cache key.
- **Head reads as rose + dark cap + dot eyes** — "rose family on torso/head-cap, neutral limbs" interpreted as rose head with a prop-dark cap; accent-reservation rule (rose only on torso/cap/scarf) holds.

## Issues Encountered

- None beyond the above. `git diff caaadcb..HEAD --stat`: exactly the three planned files, +219/−12; `index.html`, `package.json`, `js/interpolate.js`, `js/rope.js`, `js/player.js` and all four frozen test files byte-untouched.

## Known Stubs

None — no placeholder data paths; every scene quantity is wired to the view payload.

## Deferred / carried notes

- **Phase 3 regression check (from plan's unclassified probe row):** rope-arc readability at `ropeMul`-modified speeds is unverifiable this phase — default-period only.
- **Phase 4:** trip juice beyond settle (no particles/hitstop added here).
- **End-of-phase UAT owes** the four deferred human-checks (Tasks 1–3 checks + 02-02's D3), including the CPU-throttle pass precedent and the theta⇔feet beat-coincidence eyeball.

## Next Phase Readiness

- Scene is content-complete: `js/render3d.js` exports only `createScene`; all new symbols are module-private per the plan's artifact contract. The file remains the sole `three` importer (fence green).
- If reviewers want a Node pin for the arc-angle mapping, the flagged-assumptions row's remedy stands: extract a pure arc-angle helper in a follow-up (not done here — plan marked the unit pin optional).

---
*Phase: 02-ps1-presentation-scene*
*Completed: 2026-10-17*

## Self-Check: PASSED

- Modified files exist on disk: js/render3d.js, js/shell.js, tests/render3d.test.js
- Commits e4f329d, 6e94e45, 9994cf8 confirmed ancestors of HEAD
- render() window contains zero `new THREE` constructions; suite 42/42
