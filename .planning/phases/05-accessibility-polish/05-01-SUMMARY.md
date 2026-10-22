---
phase: 05-accessibility-polish
plan: 01
subsystem: ui
tags: [pause, visibilitychange, audio-suspend, accumulator-gate, shell, ui-01]

requires:
  - phase: 01-render-shell-foundation
    provides: shell/sim split with the data-URL bootShell harness and ARCH-01/02 boundary fences
  - phase: 03-card-catalogue-realness
    provides: resumeRun lead-in re-entry + the D-07 re-entry input lock that pause-resume reuses
  - phase: 04-feel-audio
    provides: hitstop accumulator gate (pause mirrors it), D-N08 gesture lifecycle, FEEL-01 buffer

provides:
  - manual P/Esc pause (freeze frame + HUD prompt + audio suspend) across all four run statuses
  - tab-hidden auto-pause with the D-04 status gate and tab-return auto-resume through the lead-in
  - js/audio.js suspend() on the factory surface (state-guarded counterpart of gesture())
  - tests/polish.test.js bootShell-copy harness (document.hidden, canvas.style, audio suspend/gesture log) that the remaining Phase-5 plans extend

affects: [accessibility-polish, input-hardening, resize-letterbox, reduced-motion]

actuals:
  tokens: 6100
  tasks: 3
  commits: 4
  plan_head_before: 0fb0896e6e5f5f7853d04e301bdbb99c297338e2
  plan_head_after: f3e8f29d68fd8a3175bd25a4c241bc01999a4c76

tech-stack:
  added: []
  patterns:
    - "pause gate = hitstop accumulator gate held open, with acc zeroed every paused frame (Pitfall 1)"
    - "lead-in re-entry via resumeRun({...run, buffer: 0}) + reentryAt lock — never startRun (Pitfall 3)"
    - "synchronous transition in the event listener; frame() only enforces the gate (Pitfall 10)"

key-files:
  created:
    - tests/polish.test.js
  modified:
    - js/shell.js
    - js/audio.js
    - tests/audio.test.js

key-decisions:
  - "Pause state is shell-local booleans (paused/pausedByVis) — no new run.status value, no new localStorage key; sim stays pause-agnostic (ARCH-01)"
  - "Resume always routes resumeRun({ ...run, buffer: 0 }) with reentryAt = performance.now() — the one lead-in path, score/effects/owned preserved (D-03, Pitfall 2/3)"
  - "Tab-return AUTO-RESUMES through the lead-in without a keypress — pinned resolution of RESEARCH Open Q1/A1 by an explicit test leg"

patterns-established:
  - "polish.test.js harness: bootAudioShell copy with document.hidden, canvas.style, and an audio-wrapper gesture/suspend call log"

requirements-completed: [UI-01]

coverage:
  - id: D1
    description: "Manual P/Esc pause: zero sim steps while paused, audio suspended once, HUD shows the paused prompt (D-01/D-02)"
    requirement: UI-01
    verification:
      - kind: integration
        ref: "tests/polish.test.js#manual pause freezes stepping, suspends audio once, and holds the prompt (D-01/D-02)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Resume re-enters the START_PHASE lead-in with score/effects/owned intact, D-07 lock drops a locked-window press, 5 s pause never fast-forwards (D-03, Pitfall 1)"
    requirement: UI-01
    verification:
      - kind: integration
        ref: "tests/polish.test.js#resume re-enters the lead-in with the run intact; a press in the lock window is dropped (D-03/D-07)"
        status: pass
      - kind: integration
        ref: "tests/polish.test.js#a 5 s paused clock never fast-forwards the lead-in (Pitfall 1)"
        status: pass
      - kind: integration
        ref: "tests/polish.test.js#pause clears run.buffer — the post-resume crossing trips, never forgives (D-12, Pitfall 2)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Tab-hidden auto-pause (running only, D-04) and tab-return auto-resume through the lead-in; focus never un-suspends a paused context"
    requirement: UI-01
    verification:
      - kind: integration
        ref: "tests/polish.test.js#tab hidden mid-run auto-pauses with suspend; focus never un-suspends (D-04/T-05-01)"
        status: pass
      - kind: integration
        ref: "tests/polish.test.js#tab hidden during game-over stays the D-N08 gesture path — no paused state (D-04)"
        status: pass
      - kind: integration
        ref: "tests/polish.test.js#hidden-on-idle no-ops; tab-return while pausedByVis auto-resumes through the lead-in (A1)"
        status: pass
    human_judgment: true
    rationale: "Plan verification lists a manual spot leg — real tab-switch mid-run must silence audio while the OTHER tab is shown (Pitfall 10); no Node harness can observe real rAF throttling or the browser's own suspend policy"
  - id: D4
    description: "Audio suspend/resume round-trip pinned on the module surface (state-guarded suspend beside gesture)"
    requirement: UI-01
    verification:
      - kind: unit
        ref: "tests/audio.test.js#suspend/resume round-trip: the pause lifecycle rides the state-guarded pair (UI-01)"
        status: pass
    human_judgment: false

duration: 13min
completed: 2026-10-22
status: complete
---

# Phase 5 Plan 01: Pause & Tab-Hidden Auto-Pause Summary

**Manual P/Esc and tab-hidden pause wired end-to-end: the hitstop accumulator gate held open by a shell-local `paused` flag, freeze-frame + HUD prompt, audio parked via a new state-guarded `audio.suspend()`, and every resume path routed through the one `resumeRun({...run, buffer: 0})` lead-in with the D-07 input lock.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-10-22T17:24:05Z
- **Completed:** 2026-10-22T17:37:40Z
- **Tasks:** 3 (1 tracer + 2 auto)
- **Files modified:** 4 (1 created)

## Accomplishments

- **Task 1 (tracer, TDD):** new `tests/polish.test.js` harness (bootAudioShell copy + `document.hidden`, `canvas.style`, audio-wrapper gesture/suspend log) and the four UI-01 legs; RED captured with `RED_EVIDENCE_OK` classifier verdict, then GREEN via the pause gate in `frame()`, `enterPause()`/`resumeFromPause()`, the `!e.repeat`-guarded KeyP/Escape branch, the paused HUD prompt, press/release early-returns, and `suspend()` on the `js/audio.js` surface. Tracer feedback gate re-run: both automated verifies green → expanded.
- **Task 2:** `visibilitychange` rewritten to read `document.hidden` for direction — hidden+running → `enterPause(true)`, hidden otherwise → today's D-N08 gesture only (D-04), visible+pausedByVis → lead-in auto-resume (pinned A1); `focus` gained the `!paused` guard (Pitfall 4 / T-05-01). Three D-04/auto-resume legs added.
- **Task 3:** `tests/audio.test.js` ctx stub gained the symmetric `suspend` leg; one Part-A round-trip leg asserts `suspends` and `resumes` both increment through gesture/suspend/gesture. Full suite **108 pass / 0 fail** (baseline 100); purity fence: all frozen sim-core and frozen test files byte-identical.

## Task Commits

Each task was committed atomically:

1. **Task 1: Manual pause → freeze → lead-in resume (RED)** — `0366e2c` (test) — failing legs first, classifier `RED_EVIDENCE_OK` (target test failed on the planned assertions, 4/4)
2. **Task 1: Manual pause → freeze → lead-in resume (GREEN)** — `7b1c1d9` (feat)
3. **Task 2: Tab-hidden auto-pause + auto-resume** — `e37cf4e` (feat)
4. **Task 3: audio.test.js suspend coverage** — `f3e8f29` (test)

**Plan metadata:** committed with this SUMMARY (docs commit)

## Files Created/Modified

- `tests/polish.test.js` — NEW: bootShell-copy harness + 7 UI-01 legs (manual pause, lead-in resume, 5 s pause, buffer clear, hide/show lifecycle, focus guard)
- `js/shell.js` — `paused`/`pausedByVis` closure flags; `enterPause()`/`resumeFromPause()`; pause gate in `frame()` (`if (paused) acc = 0;` + extended in-loop break); KeyP/Escape keydown branch; rewritten visibilitychange + guarded focus listener; paused prompt in `updateHud()`
- `js/audio.js` — `suspend()` on the returned factory surface, guarded `if (ctx && ctx.state === 'running') ctx.suspend();`
- `tests/audio.test.js` — ctx stub suspend leg + suspend/resume round-trip test

## Decisions Made

- **Shell-local pause flags, no new `run.status`** — per RESEARCH recommendation; every `run.status ===` branch stays untouched and the sim stays pause-agnostic (ARCH-01 boundary stays green without edits).
- **`resumeRun({ ...run, buffer: 0 })`, never `startRun()`** — score/effects/owned survive (Pitfall 3); buffer cleared on BOTH transitions (D-12, Pitfall 2).
- **Tab-return auto-resumes through the lead-in** (flagged assumption surfaced by the plan; RESEARCH A1 recommendation) — pinned by the `hidden-on-idle no-ops; tab-return ... auto-resumes` leg. If UAT prefers press-to-resume it is the one-line `else`-branch change documented in RESEARCH Pattern 1.
- **Zero-delta frame pumping as the post-transition snapshot** — a frame dispatched at an unchanged stub timestamp performs no drain but still renders, so `rope.phase === START_PHASE` pins exactly (no tolerance slack).

## Deviations from Plan

None — plan executed exactly as written. (Operational note, not a deviation: the plan's `bash -c "... awk '/ pass /{p=$3} ...'"` acceptance commands were executed with `\$3` escaped so the outer shell does not eat the awk field reference; semantics unchanged.)

## Issues Encountered

None. One design-time observation resolved before writing tests: a leaked `run.buffer` could not change any post-resume trip outcome at shell level (the first post-resume crossing is the airborne lead-in skip; by the grounded crossing the buffer has decayed), so the D-12 leg pins the observable directly (`view.run.buffer === 0` at the resume instant) plus the end-to-end trip walk — exactly the plan's wording.

## Verification Summary

| Gate | Result |
|------|--------|
| polish.test.js ≥ 4 (task 1) / ≥ 7 (task 2) | 7 pass / 0 fail |
| Full suite ≥ 102 with fail 0 | 108 pass / 0 fail |
| audio.test.js `fail 0` | pass |
| `if (paused) acc = 0;` before drain, no `phase: 0.33` in shell.js | pass (ARCH-02 grep clean) |
| Purity fence on frozen files | clean (`git diff --quiet` rc 0) |
| TDD gate: `test(05-01)` RED before `feat(05-01)` | satisfied (`0366e2c` → `7b1c1d9`) |
| RED evidence classifier | `RED_EVIDENCE_OK` (`.planning/tdd-red-evidence-05-01.json`) |

## Known Stubs

None — no placeholder values or unwired paths introduced.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plans 05-02/05-03/05-04 build on this pause lifecycle; the polish.test.js harness already carries `style: {}` and `document.hidden` stubs their legs will need.
- UI-01 stays unchecked in REQUIREMENTS.md under the shared-ID gate (#2388): 05-04 also declares UI-01; it marks complete when the last declaring plan's SUMMARY lands.
- End-of-phase UAT item: real tab-switch mid-run must silence audio while the other tab is shown (Pitfall 10 spot leg, coverage D3).

## Self-Check: PASSED

- Files on disk: `tests/polish.test.js`, `js/shell.js`, `js/audio.js`, `tests/audio.test.js` — all FOUND
- Commits ancestors of HEAD: `0366e2c`, `7b1c1d9`, `e37cf4e`, `f3e8f29` — all FOUND
- Measured commit count from ledger `0fb0896..HEAD`: 4

---
*Phase: 05-accessibility-polish*
*Completed: 2026-10-22*
