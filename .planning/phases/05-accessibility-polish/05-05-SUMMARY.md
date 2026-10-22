---
phase: 05-accessibility-polish
plan: 05
subsystem: a11y
tags: [pause, audio, visibilitychange, regression-test, gap-closure]

requires:
  - phase: 05-accessibility-polish
    provides: "05-01 pause lifecycle (enterPause/resumeFromPause, visibilitychange handler, T-05-01 focus pin) and 05-04 releaseEverything shared-release routing"
provides:
  - "visibilitychange VISIBLE branch gestures only when audioReady && !paused — a manual pause is never un-suspended by tab-return (CR-01 closed, T-05-01 fully enforced)"
  - "visibilitychange HIDDEN branch runs releaseEverything() for every status — choose-status card holds cancel on platforms that deliver visibilitychange without blur (WR-01 closed, D-11 one-shared-release complete)"
  - "two red-green pin legs in tests/polish.test.js (24 polish legs, 130 suite tests total)"
affects: [phase-05-verification, pause, audio, input-hardening]

actuals:
  tokens: 1822
  tasks: 3
  commits: 3
  plan_head_before: ebffd4a818316caba26a97221afb6869d8bb1543
  plan_head_after: b2c9daa44a758551b0f3bda6a47dac520c7c6640

tech-stack:
  added: []
  patterns:
    - "Red-green pin legs for review-gap closures: the failing leg is committed first (test(05-05)), the behavioral guard second (fix(05-05))"

key-files:
  created:
    - ".planning/phases/05-accessibility-polish/05-05-red-evidence-A.json"
    - ".planning/phases/05-accessibility-polish/05-05-red-evidence-B.json"
  modified:
    - "js/shell.js"
    - "tests/polish.test.js"
    - ".planning/phases/05-accessibility-polish/05-REVIEW-DISPOSITION.md"

key-decisions:
  - "GREEN commit typed fix(05-05) (plan-mandated) instead of the TDD reference's feat(...) — the change is a two-guard defect fix, not a new feature; RED→GREEN ordering intact"
  - "releaseEverything() hoisted above the run.status check so the hidden leg releases for idle/choose/over too; enterPause(true) and the non-running audio.gesture() else-branch kept verbatim (D-04 gesture path preserved)"
  - "WR-02/IN-01/IN-02/IN-03 deliberately left open for the next review re-triage — this closure does not expand scope into cosmetic/info findings"

patterns-established:
  - "CR-01 invariant: no focus or visibility event may un-suspend an AudioContext the game itself paused — now enforced at both listeners and pinned by a leg"

requirements-completed: [UI-01]

coverage:
  - id: D1
    description: "Manual-pause -> hide -> reveal keeps the AudioContext suspended and the frozen frame silent (CR-01/T-05-01 guard + pin leg)"
    requirement: "UI-01"
    verification:
      - kind: unit
        ref: "tests/polish.test.js#manual-pause -> hide -> reveal never un-suspends the paused context (CR-01/T-05-01)"
        status: pass
      - kind: other
        ref: "node /tmp/opencode/cr01-repro.mjs (verifier's repro script, now exit 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Tab-hidden during a sub-confirm card hold cancels the hold for every status — no confirm caused by focus loss (WR-01/D-11 guard + pin leg)"
    requirement: "UI-01"
    verification:
      - kind: unit
        ref: "tests/polish.test.js#tab hidden during a sub-confirm card hold cancels — no auto-confirm on return (WR-01/D-11)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Real-browser residual: audio silence through a real P-then-tab-switch round-trip, and hold-cancellation on a platform that delivers visibilitychange without blur (tickPick times the hold on the real performance.now, which the Node harness does not stub)"
    requirement: "UI-01"
    verification: []
    human_judgment: true
    rationale: "Real rAF throttling and autoplay/gesture policy are not observable in Node; carried on 05-VERIFICATION manual UAT rows 1 and 5 (the plan's flagged assumption for UI-01)"

duration: 5min
started: 2026-10-22T20:00:09Z
completed: 2026-10-22T20:05:05Z
status: complete
---

# Phase 5 Plan 05: CR-01/WR-01 Gap Closure Summary

**Two one-line guards in the visibilitychange handler — the visible-branch gesture now carries `!paused` and the hidden-branch release is hoisted to run for every status — each pinned by a red-green test leg, closing the pause-audio state-spoofing gap (CR-01) and the choose-status hidden-hold gap (WR-01).**

## Performance

- **Duration:** 5 min
- **Started:** 2026-10-22T20:00:09Z
- **Completed:** 2026-10-22T20:05:05Z
- **Tasks:** 3
- **Files modified:** 3 (js/shell.js, tests/polish.test.js, 05-REVIEW-DISPOSITION.md)

## Accomplishments

- CR-01 closed: `js/shell.js` visibilitychange VISIBLE branch now reads `else if (audioReady && !paused) audio.gesture()` — manual-pause → hide tab → show tab keeps the AudioContext suspended and the "paused — press P to resume" frame silent (T-05-01's visible-branch arm, previously only half-implemented).
- WR-01 closed: the HIDDEN branch calls `releaseEverything()` unconditionally as its first statement (no-op idle/over, cancels choose-status `pickPressedAt`/`pickFill`); `enterPause(true)` stays gated on `run.status === 'running'` and the non-running `audio.gesture()` else-branch is verbatim (D-04).
- Two new red-green pin legs in `tests/polish.test.js` (22 → 24 legs): Leg A asserts ctx.state stays 'suspended' + `log.gestures`/`ctx.resumes` unchanged + phase frozen across the manual-pause round-trip; Leg B asserts the fill cue is gone, status stays 'choose', and no 'pick' voice fires after a hidden event without blur.
- RED evidence machine-verified: TAP reruns of both target legs returned `RED_EVIDENCE_OK` (`reason: target_test_failed`, records at `05-05-red-evidence-{A,B}.json`); both legs failed on their planned behavioral assertions, all 22 pre-existing legs green.
- GREEN gates: polish 24/24, full suite **130 pass / 0 fail** (128 baseline + 2), ARCH-01 purity fence against `a1fae8c` empty for rope/player/upgrades/game, and the verifier's own `/tmp/opencode/cr01-repro.mjs` corroborates at exit 0 (0 visible-leg gestures, context suspended).
- `05-REVIEW-DISPOSITION.md` flipped CR-01/WR-01 to `fixed` (Source: "05-05 gap closure", open 6→4); WR-02/IN-01/IN-02/IN-03 untouched at open per the plan's scope fence.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the two red pin legs** — `7e9dbeb` (test) — RED commit, touches only tests/polish.test.js
2. **Task 2: Apply the two guards to the visibilitychange handler** — `f6f35fc` (fix) — GREEN commit, diff confined to the listener block + comments
3. **Task 3: Integration gate + disposition bookkeeping** — `b2c9daa` (fix) — suite gate, purity fence, repro corroboration, disposition rows flipped

**Plan metadata:** (this commit) (docs: complete plan)

## Files Created/Modified

- `js/shell.js` — visibilitychange handler: visible-branch gesture guarded with `!paused`; hidden-branch `releaseEverything()` hoisted out of the running check; both comments extended to name CR-01/WR-01
- `tests/polish.test.js` — two new legs: "manual-pause -> hide -> reveal never un-suspends the paused context (CR-01/T-05-01)" and "tab hidden during a sub-confirm card hold cancels — no auto-confirm on return (WR-01/D-11)"
- `.planning/phases/05-accessibility-polish/05-REVIEW-DISPOSITION.md` — CR-01/WR-01 disposition fixed, Source "05-05 gap closure", open count 6→4
- `.planning/phases/05-accessibility-polish/05-05-red-evidence-{A,B}.json` — persisted RED evidence records (classifier verdicts RED_EVIDENCE_OK)

## Decisions Made

- Kept the plan-mandated commit types (`test` RED, `fix` GREEN/gate) — see TDD Gate Compliance below for the feat-vs-fix note.
- Hoisted `releaseEverything()` exactly per the 05-REVIEW WR-01 fix block, preserving the else-branch gesture for non-running statuses so the D-N08/D-04 gesture legs (`hidden during game-over`, `hidden-on-idle`) stay byte-identical in behavior.
- Left WR-02/IN-01/IN-02/IN-03 open — the plan explicitly fences scope out of them; the next review run re-triages.

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- **RED:** `test(05-05)` commit `7e9dbeb` precedes the production commit; both target legs failed on their planned behavioral assertions (Leg A: `ctx.state === 'running'` where 'suspended' pinned; Leg B: fill cue persists via surviving `pickPressedAt`), classifier `RED_EVIDENCE_OK` for both. Compliant.
- **GREEN:** the production commit is `fix(05-05)` per the plan's mandated message, not the TDD reference's `feat(05-05)` — a mechanical `grep '^feat\((5)-(5)\)'` finds nothing, but the RED→GREEN behavioral contract (target tests fail pre-implementation, pass post, in that commit order) is fully satisfied. The gap-closure plan authored the `fix` type deliberately: this is a defect guard, not a new feature.

## Issues Encountered

None.

## Known Stubs

None — no placeholder or stub patterns introduced; both legs assert against the real shipped `js/shell.js` through the boot harness.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 05 can be re-verified: the single blocking gap (CR-01) is fixed and pinned; VERIFICATION's provisional UI-01 tick can be lifted at re-verification.
- Manual UAT rows 1 (real tab-switch mid-run while holding Space) and 5 (background mid-hold on a platform without blur) in 05-VERIFICATION remain the human-side residual for the real-clock audio/confirm edges (harness cannot observe them by construction).
- Flagged assumptions from the plan stand as recorded: UI-01 residual edge rests on the manual UAT; UI-02/UI-03 unchanged and already VERIFIED.

---
*Phase: 05-accessibility-polish*
*Completed: 2026-10-22*

## Self-Check: PASSED

All key files present on disk; all three task commits (`7e9dbeb`, `f6f35fc`, `b2c9daa`) are ancestors of HEAD.
