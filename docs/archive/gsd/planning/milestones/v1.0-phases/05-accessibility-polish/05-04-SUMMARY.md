---
phase: 05-accessibility-polish
plan: 04
subsystem: ui
tags: [input-hardening, blur, pointercancel, visibilitychange, release-everything, shell, ui-01]

requires:
  - phase: 05-accessibility-polish (plan 01)
    provides: the enterPause/resumeFromPause lifecycle + the polish.test.js bootShell-copy harness (document.hidden, canvas.style, audio log) this plan's loss legs extend
  - phase: 01-render-shell-foundation
    provides: the data-URL source-rewriting boot that keeps shell exercises inside the ARCH-01 fence
  - phase: 03-card-catalogue-realness
    provides: the choose-status pick-hold vocabulary (pickPressedAt/pickFill) the clean-cancel branch clears

provides:
  - releaseEverything() in js/shell.js — ONE shared input-loss handler: window blur, canvas pointercancel, and the visibilitychange hidden+running leg all route through it, joining the existing pressIntent/releaseIntent reducer vocabulary with no second cleanup channel (D-11)
  - fire-with-hold-so-far semantics: pressIntent converts to holdFrom BEFORE arming releaseIntent, holdFrom is left for consumeIntents to fire-and-clear (Pitfall 6), and a stale keyup after the loss event can never double-fire
  - spoofing guards pinned by tests: 'over' status never arms the release-restart branch (T-05-07); the hidden leg routes releaseEverything BEFORE enterPause so D-12 clearing supersedes any armed release (T-05-08)
  - criterion-4 synthetic-event legs in tests/polish.test.js (blur/pointercancel/hidden × mid-charge/mid-hold/choose/over/paused) closing the phase's fourth success criterion

affects: [accessibility-polish, input-hardening]

actuals:
  tokens: 3305
  tasks: 2
  commits: 3
  plan_head_before: e45bcb952fe5f2f64fa564776557c9340706a468
  plan_head_after: 9694db6f28480938a01de2b5671c52ff7a5ffe63

tech-stack:
  added: []
  patterns:
    - "focus/pointer loss routes through ONE shared release handler that reuses the existing intent vocabulary — no per-event cleanup forks (D-11)"
    - "fire-and-clear delegation: an interruption handler arms intents and lets consumeIntents fire-and-clear state, never zeroing holdFrom itself (Pitfall 6)"
    - "state-spoofing guard shape: externally-timed events arm state-restart branches only when a live hold is in flight"

key-files:
  created:
    - .planning/tdd-red-evidence-05-04.json
  modified:
    - js/shell.js
    - tests/polish.test.js

key-decisions:
  - "releaseEverything arms releaseIntent ONLY when status 'running' with a live hold — blur/pointercancel on 'over' or the idle prompt is a silent no-op (T-05-07)"
  - "holdFrom precedence: pressIntent is converted to holdFrom BEFORE arming releaseIntent; holdFrom is never zeroed inside releaseEverything (Pitfall 6 — consumeIntents fires the partial-hold jump and clears it)"
  - "visibilitychange hidden+running routes releaseEverything() BEFORE enterPause(true) — D-12 clearing supersedes the armed release, so armed state never survives into the lead-in"
  - "pointerleave/drag-out deliberately unbound (D-11) — browsers deliver pointerup outside the canvas anyway"

patterns-established:
  - "optional-call handler dispatch (`env.handlers.window.blur?.()`) in loss legs keeps RED failing on behavior assertions instead of TypeErrors while an event is unrouted"

requirements-completed: [UI-01]

coverage:
  - id: D1
    description: "Focus/pointer loss mid-charge fires the jump with the accumulated hold time through consumeIntents, and the stale keyup adds no second jump (D-11, Pitfall 6)"
    requirement: UI-01
    verification:
      - kind: integration
        ref: "tests/polish.test.js#mid-charge blur fires the jump with the hold so far; stale keyup adds no second jump (D-11, Pitfall 6)"
        status: pass
      - kind: integration
        ref: "tests/polish.test.js#mid-hold pointercancel launches and leaves no hold behind (D-11)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A blur mid card-hold (sub-confirm) cancels cleanly: pickFill reset, offer still listed, no pick in the audio log (D-11)"
    requirement: UI-01
    verification:
      - kind: integration
        ref: "tests/polish.test.js#blur mid card-hold cancels cleanly — no pick, offer prompt still listed (D-11)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Focus loss can never spoof state: 'over' never arms the release-restart branch; hidden+running stays cleared (D-12 fire-superseded-by-clear); blur while paused is a no-op"
    requirement: UI-01
    verification:
      - kind: integration
        ref: "tests/polish.test.js#blur on the game-over screen restarts nothing — over never arms the release branch (T-05-07)"
        status: pass
      - kind: integration
        ref: "tests/polish.test.js#hidden mid-hold pauses and stays cleared — the post-resume crossing trips (D-12 fire-superseded-by-clear)"
        status: pass
      - kind: integration
        ref: "tests/polish.test.js#blur while paused is a no-op — nothing airborne, nothing armed for the lead-in (D-12 matrix)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Real-browser interruption behavior: alt-tab/OS app-switch mid-hold fires or cancels cleanly with no frozen hold on return"
    verification: []
    human_judgment: true
    rationale: "Real window blur / OS pointercancel semantics (rAF throttling, browser gesture ordering) are not observable in the Node harnesses — pinned to the end-of-phase manual UAT checklist"

duration: 10min
completed: 2026-10-22
status: complete
---

# Phase 5 Plan 04: Input-Loss Hardening Summary

**One shared `releaseEverything()` handler routes window blur, canvas pointercancel, and the hidden+running visibility leg into the existing pressIntent/releaseIntent reducer — a mid-charge loss fires the jump with the hold-so-far through consumeIntents, a card-hold cancels cleanly, and no loss event can spoof a run restart or leave armed state across a pause.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-10-22T18:17:40Z
- **Completed:** 2026-10-22T18:27:42Z
- **Tasks:** 2
- **Files modified:** 2 (+1 evidence artifact)

## Accomplishments

- **Task 1 (TDD):** five criterion-4 synthetic-event legs in `tests/polish.test.js` (mid-charge blur, mid-hold pointercancel, choose-status clean cancel, over-status no-restart guard, hidden+pause fire-superseded-by-clear) written RED first — classifier `RED_EVIDENCE_OK` (3 target legs failing on their planned assertions, 2 guard legs green) — then GREEN via `releaseEverything()` in `js/shell.js` (Pattern 4 ordering: pressIntent→holdFrom conversion before arming, fire-and-clear delegated to `consumeIntents`, never armed in `'over'`), the two new bindings (`window blur`, canvas `pointercancel`), and the `visibilitychange` hidden+running leg routed `releaseEverything(); enterPause(true)`.
- **Task 2:** the combined "pause mid-run then blur" interaction leg (blur behind the freeze frame is a no-op: frozen stepping, no airborne state, untouched post-resume crossing trips — extends the D-12 matrix). Phase integration gate: **123 pass / 0 fail** (≥ 112 gate; baseline was 117), purity fence clean — `js/rope.js`, `js/player.js`, `js/upgrades.js`, `js/game.js` and all six frozen test files byte-identical.

## End-of-Phase Manual UAT Checklist (deferred per VALIDATION.md manual-only rows)

1. Real tab-switch mid-run while holding Space — audio silent while hidden, return lands in lead-in.
2. OS reduced-motion toggle — wobble/shake vanish live, rope judgment unchanged.
3. Drag window to ~1000×300 — black bars, no squash (Pitfall 9).
4. Alt-tab mid-hold on a real browser — jump fires or cancels cleanly, no frozen hold on return.

## Task Commits

Each task was committed atomically:

1. **Task 1: releaseEverything() joined to blur/pointercancel/hidden (RED)** — `6029f75` (test) — failing legs first, classifier `RED_EVIDENCE_OK` (target test failed on the planned assertion, 3/5 legs red by design)
2. **Task 1: releaseEverything() joined to blur/pointercancel/hidden (GREEN)** — `d618519` (feat)
3. **Task 2: phase integration gate** — `9694db6` (test)

**Plan metadata:** committed with this SUMMARY (docs commit)

## Files Created/Modified

- `js/shell.js` — `releaseEverything()` closure function (Pattern 4 ordering); `pointercancel` on the canvas + `blur` on the window bound to it; `visibilitychange` hidden+running leg calls `releaseEverything()` before `enterPause(true)`
- `tests/polish.test.js` — criterion-4 section: `blur`/`pointercancel` optional-call dispatch helpers, `waitGrounded`/`runToChoose` harness helpers (pickflow `driveToChoose` idiom), six new legs (five Task-1 + one Task-2 interaction leg)

## Decisions Made

- `releaseEverything` arms `releaseIntent` only for a live hold while running — a blur on the game-over screen or idle prompt is a silent no-op, closing T-05-07 without touching the release-restart branch itself.
- No `holdFrom = null` inside `releaseEverything` (Pitfall 6): the partial-hold jump must actually launch, so fire-and-clear stays delegated to the `consumeIntents` release branch — asserted via airborne-and-strict-vy-decay legs, not merely state-clearing checks.
- The hidden+running leg calls `releaseEverything()` before `enterPause(true)` per the RESEARCH diagram; `enterPause` already cleared all three intent vars (plan 01) — no extra clear was needed.
- `pointerleave`/drag-out deliberately unbound (D-11).

## Deviations from Plan

None — plan executed exactly as written. (Operational notes, not deviations: the five legs dispatch loss handlers via optional calls `handlers.window.blur?.()` so the RED state fails on the planned behavior assertions rather than TypeErrors while the events are unrouted — identical semantics once bound; and a listener comment was worded to avoid the literal token `pointerleave` so the AC-4 grep proof stays clean, the listener itself was never added.)

## Issues Encountered

None. One design read confirmed before GREEN: `enterPause` already cleared `holdFrom`/`pressIntent`/`holdFrom`-adjacent `releaseIntent` (plan 01's `releaseIntent = false` present at shell.js:148), so the "add the releaseIntent clear too if missing" contingency in the plan did not fire.

## Verification Summary

| Gate | Result |
|------|--------|
| polish.test.js ≥ 18 (task 1) | 18 pass / 0 fail (19 with the task-2 leg) |
| Full suite `fail 0` | pass |
| Full suite pass ≥ 112 | 123 pass / 0 fail |
| Purity fence (frozen sim-core + frozen tests) | clean (`git diff --quiet` rc 0) |
| `function releaseEverything` + exactly two new listeners + hidden-leg call | pass |
| No `holdFrom = null` inside releaseEverything | pass (0 occurrences) |
| No `pointerleave` listener in js/shell.js | pass |
| TDD gate: `test(05-04)` RED before `feat(05-04)` | satisfied (`6029f75` → `d618519`) |
| RED evidence classifier | `RED_EVIDENCE_OK` (`.planning/tdd-red-evidence-05-04.json`) |

## Known Stubs

None — no placeholder values or unwired paths introduced.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 5's four success criteria each carry pinned Node legs (plans 01/02/03/04) plus the four-item manual UAT checklist above, deferred to end-of-phase verification per `human_verify_mode: end-of-phase`.
- UI-01 shared-ID gate (#2388): both declaring plans (05-01, 05-04) now have SUMMARYs — REQUIREMENTS.md UI-01 marks complete with this plan.
- No blockers; whole-phase gate green (123/0, purity intact).

---

## Self-Check: PASSED

- Files on disk: `js/shell.js`, `tests/polish.test.js`, `.planning/tdd-red-evidence-05-04.json` — all FOUND
- Commits ancestors of HEAD: `6029f75`, `d618519`, `9694db6` — all FOUND
- Measured commit count from ledger `e45bcb9..HEAD`: 3

---
*Phase: 05-accessibility-polish*
*Completed: 2026-10-22*
