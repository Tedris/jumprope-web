---
phase: 01-render-shell-foundation
plan: 01
subsystem: render-shell
tags: [three.js, importmap, webgl, walking-skeleton, rng-injection, tdd]

requires:
  - phase: 01-render-shell-foundation
    provides: "01-RESEARCH.md patterns (importmap, prev/curr lerp, startRun equivalence proof)"
provides:
  - "js/shell.js — sole owner of document/performance.now/rAF/localStorage + bootstrap guard"
  - "js/render3d.js — sole `three` importer, createScene(canvas) -> read-only render(view)"
  - "js/interpolate.js — pure wrap-aware lerpPhase(prev, curr, alpha)"
  - "js/game.js — pure sim only: startRun(), START_PHASE=0.33, ROPE_PERIOD=1.3, tickRun(+rng 5th param)"
  - "index.html importmap pinning three@0.186.1 (jsdelivr, SRI deferral noted); entry js/shell.js; HUD overlay"
  - "tests/startrun.test.js — startRun semantics + injected-rng determinism pins"
affects: [render-pipeline, upgrade-cards, audio, replay]

actuals:
  tokens: 4045
  tasks: 2
  commits: 3
  plan_head_before: f5502dd5cc09144769b59923397a1355353b022d
  plan_head_after: a91a6e6

tech-stack:
  added:
    - "three@0.186.1 via CDN importmap (no npm dependency; package.json stays empty)"
  patterns:
    - "Three-file split: pure sim (game.js) / impure shell (shell.js) / sole WebGL layer (render3d.js)"
    - "Intent-flag input consumption at step boundaries; rng injected from shell as tickRun's 5th arg"
    - "prev/curr phase capture + alpha = acc/STEP consumed via lerpPhase in the renderer only"

key-files:
  created:
    - js/shell.js
    - js/render3d.js
    - js/interpolate.js
    - tests/startrun.test.js
  modified:
    - js/game.js
    - index.html
    - css/style.css

key-decisions:
  - "startRun() preserves the 0.33-phase / 0.1-hold-jump lead-in verbatim (~0.43 s before feet window; RESEARCH A4)"
  - "rng arrives as tickRun's optional 5th default parameter (rng = Math.random); shell always overrides it (RESEARCH A1)"
  - "three pinned to exact jsdelivr URL with deliberate SRI deferral recorded inline (T-01-01)"
  - "TDD RED carried by a NEW test file (tests/startrun.test.js) — the four frozen test files stay byte-identical"

requirements-completed: [ARCH-01, ARCH-02]

coverage:
  - id: D1
    description: "Full-run browser play through the WebGL placeholder shell with three loaded only via the importmap-pinned URL (ROADMAP SC-1)"
    requirement: ARCH-01
    verification:
      - kind: automated_ui
        ref: "node --test tests/ (26 pass) + sole-three-importer + browser-IO ownership greps"
        status: pass
      - kind: manual_procedural
        ref: "browser smoke: idle -> running -> choose -> over, CDN 200s in devtools"
        status: unknown
    human_judgment: true
    rationale: "Full-run perceptual smoke (SC-1) deferred to scheduled end-of-phase UAT; the tracer checkpoint was approved on that basis"
  - id: D2
    description: "Exactly one render path: Canvas 2D draw() deleted; render3d.js sole WebGLRenderer/three importer; only shell.js touches DOM/clock/storage"
    requirement: ARCH-01
    verification:
      - kind: other
        ref: "bash greps: getContext absent; WebGLRenderer only in js/render3d.js; browser-API references only in js/shell.js"
        status: pass
    human_judgment: false
  - id: D3
    description: "Visuals driven solely by lerpPhase(prevPhase, rope.phase, alpha) — rope never visibly drifts from scoring, incl. CPU throttle (ROADMAP SC-4)"
    verification:
      - kind: manual_procedural
        ref: "end-of-phase UAT: obstacle-sweep sync, with devtools CPU throttling"
        status: unknown
    human_judgment: true
    rationale: "INTERPOLATION-NOT-PROVEN flag (STATE.md blocker, RESEARCH A2): wrap math is only unit-pinned in plan 01-02; perceptual smoothness has no headless proof"
  - id: D4
    description: "One startRun() code path for start and restart; all sim randomness injectable via tickRun's 5th rng param (ARCH-02)"
    requirement: ARCH-02
    verification:
      - kind: unit
        ref: "tests/startrun.test.js#startRun returns running run with lead-in rope and airborne player"
        status: pass
      - kind: unit
        ref: "tests/startrun.test.js#tickRun routes offers through an injected rng (deterministic)"
        status: pass
      - kind: other
        ref: "git grep -c '0[.]33' -- js/ == js/game.js:1; Math.random only as tickRun default param"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-10-15
status: complete
---

# Phase 01 Plan 01: Render-Shell Foundation Walking Skeleton Summary

**Three-file split (pure game.js / impure shell.js / sole-three render3d.js) with an importmap-pinned three@0.186.1 WebGL placeholder scene, prev/curr phase interpolation, one startRun() reset path, and rng injected as tickRun's 5th parameter — suite green at 26/26 with the four frozen test files byte-identical.**

## Performance

- **Duration:** ~15 min active (Task 1 ~11 min; Task 2 ~4 min; checkpoint wait excluded)
- **Started:** 2026-10-15T19:54Z (planning commit f5502dd) — Task 1 committed 20:05Z, Task 2 committed 20:20Z
- **Completed:** 2026-10-15T20:20:51Z
- **Tasks:** 2
- **Files modified:** 7 (4 created, 3 modified)

## Accomplishments

- Walking skeleton shipped: browser page renders a full idle → running → choose → over run through one WebGL path (three@0.186.1 resolved ONLY via the index.html importmap; Canvas 2D `draw()` deleted outright per D-02)
- Boundary held mechanically: `js/render3d.js` is the only `three`/WebGLRenderer reference in `js/`; `js/shell.js` is the only file touching `document`/`performance.now`/`requestAnimationFrame`/`localStorage`; the bootstrap guard moved to shell.js
- Renderer derives obstacle/player display positions exclusively from `lerpPhase(view.prevPhase, view.rope.phase, view.alpha)` + `view.player.y` — no independent animation clock (SC-4 mechanism)
- ARCH-02 debt paid: `startRun()` is the single start/reset factory (`START_PHASE = 0.33` and `ROPE_PERIOD = 1.3` exist nowhere else in `js/`); `tickRun(run, rope, player, dt, rng = Math.random)` draws offers through the parameter; shell injects its own `rng` seam
- TDD discipline: RED (`test(01-01)`, classifier verdict `RED_EVIDENCE_OK`, target test failed on the planned assertion) → GREEN (`feat(01-01)`); 26/26 pass; four pre-existing test files byte-for-byte unchanged; `package.json` untouched and dependency-free

## Task Commits

Each task was committed atomically:

1. **Task 1: Walking Skeleton (tracer)** — `a447ef3` (feat) — three-file split, importmap, WebGL placeholder, HUD overlay
2. **Task 2: Collapse run init to startRun() + inject rng (tdd)** — RED `1a36d27` (test) → GREEN `a91a6e6` (feat); no REFACTOR needed (diff already in RESEARCH Pattern 5/6 shape)

TDD gate compliance: RED `1a36d27` precedes GREEN `a91a6e6` — PASS. RED evidence: `node --test --test-reporter=tap tests/` exit 1, target test `startRun returns running run with lead-in rope and airborne player` failed on `typeof game.startRun` (undefined vs function); classifier `RED_EVIDENCE_OK` (`target_test_failed`), semantic assessment confirmed assertion-level failure, no load/syntax errors.

## Files Created/Modified

- `js/shell.js` (new) — impure browser shell: canvas sizing (W/H/STEP), scene creation, intent-flag input, accumulator loop with prevPhase capture + spiral clamp, HUD textContent writes, storage calls, rng seam, bootstrap guard
- `js/render3d.js` (new) — sole `three` importer; `createScene(canvas) -> render(view)`; read-only over view
- `js/interpolate.js` (new) — pure wrap-aware `lerpPhase(prev, curr, alpha)`
- `tests/startrun.test.js` (new) — startRun semantics + injected-rng determinism + 4-arg surface pin (TDD RED carrier)
- `js/game.js` — reduced to pure exports; gained `startRun`/`START_PHASE`/`ROPE_PERIOD`; `tickRun` 5-param signature
- `index.html` — one importmap (three@0.186.1 jsdelivr, before module script; SRI deferral comment), entry → js/shell.js, `#hud` overlay div
- `css/style.css` — `#hud` overlay rules only (canvas aspect-ratio/pixelated rules untouched)

## Decisions Made

- `startRun()` keeps the 0.33-phase lead-in and 0.1-hold jump exactly as the two legacy sites behaved (RESEARCH Pattern 5 equivalence proof; A4 — no test pins either constant)
- Default-parameter rng injection (`rng = Math.random`) retained over a `defaultRng` alias — flagged assumption A1; the verify gate accepts only the paren-free default-param form, and shell always overrides at runtime
- Placeholder flat-box scene is the *intended deliverable* of Phase 1 (ROADMAP SC-1 wording), not a stub to be wired later
- TDD RED required a test file; the four frozen files could not change, so the RED lives in new `tests/startrun.test.js` (namespace import so the RED fails on an assertion, not a module link error)

## Deviations from Plan

**1. [Rule 3 - Blocking] Added a new test file to carry the TDD RED commit**
- **Found during:** Task 2 (TDD execution)
- **Issue:** The plan requires a RED commit before GREEN (task `tdd="true"`) but prohibits touching the four existing test files, and a non-test RED would be INVALID_RED (no target assertion failure)
- **Fix:** New `tests/startrun.test.js` pinning exactly the task's `<behavior>` block, asserted against the exported constants (no numeric literal pinning, per the task's own note); frozen-file blob check still exits 0
- **Verification:** RED run fails deterministically on both target assertions (classifier `RED_EVIDENCE_OK`); GREEN 26/26; blob-hash check PASS
- **Committed in:** `1a36d27` (RED), `a91a6e6` (GREEN)

**2. [Process note] Task 1 tracer checkpoint deferred visual smoke to end-of-phase UAT**
- **Found during:** Task 1 tracer feedback gate (previous session)
- **Resolution:** User approved deferral of the browser smoke to scheduled end-of-phase UAT, as `human_verify_mode=end-of-phase` and the plan's `<human-check>` permit; all Task 1 automated gates re-verified green in this continuation before Task 2 began

---

**Total deviations:** 1 auto-fixed (1 blocking), 1 process deferral approved by user
**Impact on plan:** No scope creep; the new test file shrinks plan 01-02's boundary-test surface only by the determinism case it now already covers.

## Issues Encountered

- Determinism RED test initially flaky (~8% chance two `Math.random` draws coincide → false GREEN in RED phase); strengthened with a counting stub asserting the injected rng is actually invoked — RED then failed deterministically before commit
- None of the plan's automated gates regressed between Tasks 1 and 2 (all Task 1 fences re-run green at continuation)

## Authentication Gates

None.

## Known Stubs

None. The flat-box placeholder scene is the plan's named deliverable, not an unwired stub; HUD strings are all fed from live sim state.

## Threat Flags

None new — Task 2 added no network, DOM, storage, or schema surface; Task 1's register (T-01-01…T-01-SC) covered every surface introduced.

## Manual-Only Verifications Outstanding (for end-of-phase UAT)

- Serve repo; devtools Network shows `three.module.js` AND `three.core.js` 200 from cdn.jsdelivr.net
- Play one full run idle → running → choose → over; obstacle sweeps in sync with scoring; jump clears rope; HUD text correct
- With devtools CPU throttling, rope never visibly drifts from scoring (SC-4; INTERPOLATION-NOT-PROVEN flag)

## Next Phase Readiness

- Sim/render seam proven; plan 01-02 can now add the permanent mechanical fences (boundary import-graph walk, debt greps, `lerpPhase` unit tests) on top of a green tree
- Reminder for plan 01-02: `tests/startrun.test.js` already pins injected-rng determinism and startRun semantics — its boundary test should not duplicate the determinism case
- No blockers; phase 2's look-spike concern (STATE.md) is unaffected by this plan

---
*Phase: 01-render-shell-foundation*
*Completed: 2026-10-15*

## Self-Check: PASSED

- All 7 key files verified present on disk
- All 3 plan commits verified as ancestors of HEAD (`a447ef3`, `1a36d27`, `a91a6e6`)
