---
phase: 03-card-catalogue-realness
plan: 03
subsystem: testing
tags: [headless-sim, criterion-5, scripted-jumper, ropemul-cap-policy, node-test, determinism]

requires:
  - phase: 03-card-catalogue-realness
    plan: 03-01
    provides: "resumeRun/applyCard pure pick routing, leadIn() single ARCH-02 path, cap-filtered tickRun offer hook"
  - phase: 03-card-catalogue-realness
    plan: 03-02
    provides: "8-record CARDS roster with cap metadata, offerCount escalation — the catalogue the per-cap variants stack"
  - phase: 01-render-shell-foundation
    provides: "pure-core boundary fence, injected-rng DI, frozen test contracts"
provides:
  - "tests/headless-sim.test.js — 1000-tick scripted-card simulation gate (criterion 5): neutral + picks-land + one per-card-cap variant per CARDS record + metadata-derived ropeMul cap-policy bound"
  - "STATE.md rope-wrap blocker closed by construction: machine-enforced capped-ropeMul bound, zero rope.js change"
affects: [phase-4 audio-cues-on-pick, phase-5 hardening, any future ropeMul-touching card]

actuals:
  tokens: 1950
  tasks: 2
  commits: 2
  plan_head_before: eefcd577b0edac78233ca4c0922692869c654604
  plan_head_after: ece6ec6c01222ca57b4cdfcc5fa8588e0f58f2ea

tech-stack:
  added: []
  patterns:
    - "1000-tick scripted sim loop over pure exports only (namespace-import + counting-stub rng), per-tick finiteness/phase-bound invariants, wrap-count cycles, atFeet-rising-edge score counters"
    - "cadence seeding ({ ...run, skips: 9 }) inside the driver to reach a freeze inside the tick budget — the tests/startrun.test.js:20 idiom"
    - "metadata-derived cap bound: fold each card.apply over freshEffects() cap times, compare against 1 to detect ropeMul movers — no hand-maintained coefficient table"

key-files:
  created:
    - tests/headless-sim.test.js
  modified: []

key-decisions:
  - "Jump policy window tuned to phase [0.20, 0.35] with 0.5 s hold (v0=600): probe-verified trip-free for neutral and all eight single-card cap stacks; no physics change (flagged assumption resolved by tuning, as designed)"
  - "Cadence freeze reached via seedSkips=9 in the driver — neutral physics completes only 6.41 cycles (≤7 skips) in 1000 ticks, so an unseeded run can never reach the skip-10 freeze the acceptance criteria demand"
  - "Rope-wrap blocker resolved as cap policy + sim assertion: per-card capped ropeMul in [0.6, 1.5] (0.729 slowrope^3 / 1.2544 windup^2), worst-case product 0.9145 in [0.6, 3] — five-fold margin under the ~15.6 blackout onset; js/rope.js byte-identical"

patterns-established:
  - "Criterion-5 gate idiom: cycles = phase-wrap count, score events = atFeet rising edges; assert scoreEvents >= cycles per run — the stall detector no per-tick assertion can be"

requirements-completed: [CARD-04, CARD-07]

coverage:
  - id: D1
    description: "1000-tick neutral scripted-card sim: no NaN, phase in [0,1), no trip, 6-7 cycles, one score event per cycle"
    verification:
      - kind: unit
        ref: "tests/headless-sim.test.js#neutral 1000-tick scripted sim: no NaN, phase bounded, one score per cycle"
        status: pass
    human_judgment: false
  - id: D2
    description: "Scripted picks land through the real applyCard + resumeRun lead-in; freeze never stalls; offer equals the deterministic pickOffers replay"
    verification:
      - kind: unit
        ref: "tests/headless-sim.test.js#scripted picks land through applyCard + resumeRun and never stall"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every catalogue card stacked to its own cap runs the 1000-tick loop clean (no trip/stall/NaN/score-starvation)"
    requirement: CARD-07
    verification:
      - kind: unit
        ref: "tests/headless-sim.test.js#stacked cap variant: float at cap 4 runs clean for 1000 ticks"
        status: pass
      - kind: unit
        ref: "tests/headless-sim.test.js#stacked cap variant: windup at cap 2 runs clean for 1000 ticks"
        status: pass
    human_judgment: false
  - id: D4
    description: "Cap-policy ropeMul bound machine-enforced from the apply closures; rope.js untouched — the STATE.md wrap blocker closure"
    requirement: CARD-04
    verification:
      - kind: unit
        ref: "tests/headless-sim.test.js#cap policy bound: every capped ropeMul in [0.6, 1.5], worst-case product in [0.6, 3]"
        status: pass
      - kind: other
        ref: "git diff --quiet eefcd57 -- js/rope.js (byte-identical; frozen tests/rope.test.js float pin green in-suite)"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-10-17
status: complete
---

# Phase 3 Plan 03: Headless Simulation Gate Summary

**A deterministic 1000-tick scripted-card simulation proves criterion 5 across the whole catalogue — neutral, every single card stacked to its cap, and picks landing through the real resumeRun lead-in — and the STATE.md rope-wrap blocker is closed by a metadata-derived ropeMul cap-policy bound with zero rope.js change.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-10-17T16:41:24Z
- **Completed:** 2026-10-17T16:50:36Z
- **Tasks:** 2
- **Files modified:** 1 (created)

## Accomplishments
- `tests/headless-sim.test.js`: 11 tests — the phase's criterion-5 gate. A scripted jumper (hold 0.5 s when grounded inside the tuned phase window 0.20-0.35) drives the real pure sim for 1000 ticks at STEP 1/120 with a counting-stub rng; every tick asserts finite `score`/`player.y` and `phase ∈ [0, 1)`, cycles count as phase wraps, score events as atFeet rising-edges, with `scoreEvents ≥ cycles` as the Pitfall-1 blackout stall detector
- Neutral run lands exactly on the RESEARCH headline (6 wraps / 7 events in 1000 ticks at ropeMul 1); the picks-land run reaches a real cadence freeze and proves `run.owned` totals equal picks, status never leaves the machine, and the freeze offer replays the deterministic `pickOffers` draw
- One 1000-tick variant per CARDS record stacked to its own cap — all eight green, covering the reachable ropeMul range slowrope³ ≈ 0.729 to windup² ≈ 1.2544
- The cap-policy bound test folds each card's real `apply` closure over `freshEffects()` exactly `cap` times, asserts each capped ropeMul ∈ [0.6, 1.5] and the worst-case product (0.9145) ∈ [0.6, 3] — a five-fold margin under the ≈15.6 feet-window blackout onset; a future ropeMul-breaking card fails the build instead of shipping a blackout. **This is the STATE.md "rope-wrap fix must precede ropeMul-stacking cards" blocker resolved by construction; `js/rope.js` stayed byte-identical and the frozen float pin in tests/rope.test.js passed untouched.**

## Task Commits

1. **Task 1: Headless 1000-tick scripted-card simulation (criterion 5 gate)** — `60e854f` (test)
2. **Task 2: Per-card stacked-cap sim variants + ropeMul cap-policy bound** — `ece6ec6` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `tests/headless-sim.test.js` - new: scriptedRun driver + neutral / picks-land / 8 per-card-cap variants / cap-policy bound (11 tests). No production code touched; `js/rope.js` frozen and verified.

## Decisions Made
- Jump-policy window tuned from the plan's starting 0.15-0.40 to **0.20-0.35**: an offline probe sweep showed 0.15-0.40 stable except a marginal slowrope³ landing case, while 0.20-0.35 is trip-free across neutral and all eight cap stacks — policy tuning exactly as the plan's flagged assumption anticipated, physics untouched.
- Cadence seeding via `{ ...run, skips: 9 }` in the driver (test-2 leg only): the acceptance criterion demands a real freeze with skips past 10 inside 1000 ticks, but neutral physics completes at most 7 skips in 8.33 s; the seed mirrors the established `{ ...createRun(), skips: 9 }` idiom at `tests/startrun.test.js:20`.
- Bound derivation detects ropeMul movers by comparing the folded result against 1 rather than a hardcoded card list, so the test survives roster growth (per plan Task 2 wording).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Header comment contained the literal banned identifier**
- **Found during:** Task 1 (acceptance-criteria grep gate)
- **Issue:** the file's explanatory comment quoted `Math.random`, failing the criterion "contains no Math.random" under a naive grep even though no code referenced it
- **Fix:** reworded the comment to "No raw randomness, no browser IO"
- **Files modified:** tests/headless-sim.test.js
- **Verification:** `grep -c 'Math\.random'` → 0; tests still green
- **Committed in:** 60e854f (task 1 commit, amended before push — the grep gate ran pre-commit)

**2. [Rule 1 - Bug] Wrong ARCH tag in a driver comment**
- **Found during:** Task 2 (re-read of the task-1 file per read_first)
- **Issue:** the choose-branch comment cited "ARCH-06"; the single-lead-in rule is ARCH-02
- **Fix:** comment corrected to ARCH-02
- **Files modified:** tests/headless-sim.test.js
- **Committed in:** ece6ec6 (task 2 commit)

---

**Total deviations:** 2 auto-fixed (both comment-level, zero behavioral impact)
**Impact on plan:** None on behavior; the driver shipped exactly as planned apart from the pre-declared policy-window tuning.

## Issues Encountered
- Neutral 1000 ticks cannot reach the skip-10 cadence freeze (6.41 cycles < 10 skips) — resolved by the seedSkips driver parameter above rather than extending the tick budget, keeping the plan's literal "1000-tick" gate intact.
- Jump-policy sweep: landing-phase algebra predicted the risky (0.40, 0.45] landing zone; the empirical probe over all cap stacks confirmed the 0.20-0.35 window avoids it everywhere (worst case float⁴'s 1.17 s long hang included).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 3's automated gate is complete: `node --test tests/` → 66 pass / 0 fail; six frozen test files + js/rope.js byte-identical to plan start.
- Remaining phase closure: end-of-phase browser UAT (pick flow + HUD + PS1 scene smoke) via /gsd-verify-work, including 03-01's perceptual criterion-1 sign-off.
- The STATE.md rope-wrap blocker can be marked resolved: closure = cap policy + machine-enforced bound test + per-cycle score assertion, per RESEARCH Pitfall 1 / assumption A5.
- Any future card that touches ropeMul must keep its capped value in [0.6, 1.5] or headless-sim.test.js fails the build — the guard is self-maintaining.

---
*Phase: 03-card-catalogue-realness*
*Completed: 2026-10-17*

## Self-Check: PASSED
- tests/headless-sim.test.js present on disk; 11 tests green.
- Task commits `60e854f`, `ece6ec6` are ancestors of HEAD.
- Full suite 66 pass / 0 fail; js/rope.js and the six frozen test files byte-identical to plan start (eefcd57).
- Cap bound measured: per-card {0.729, 1.2544} ⊂ [0.6, 1.5]; product 0.9145 ⊂ [0.6, 3].
