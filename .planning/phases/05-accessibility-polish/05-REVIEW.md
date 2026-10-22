---
phase: 05-accessibility-polish
reviewed: 2026-10-22T00:00:00Z
depth: deep
files_reviewed: 4
files_reviewed_list:
  - js/shell.js
  - js/audio.js
  - js/render3d.js
  - css/style.css
findings:
  critical: 1
  warning: 2
  info: 4
  total: 7
status: issues_found
---

# Phase 05: Code Review Report (refreshed after 05-05 gap closure)

**Reviewed:** 2026-10-22 (deep — cross-file trace of shell.js ↔ audio.js ↔ render3d.js; 05-05 fix commit f6f35fc re-verified line by line)
**Depth:** deep
**Files Reviewed:** 4 source files (+ tests/polish.test.js read for pin coverage)
**Status:** issues_found — the two blocking findings from the prior pass are **fixed and verified**; WR-02/IN-01/IN-02/IN-03 remain open exactly as recorded; one new Info-level observation (IN-04) emerged from the fix's asymmetry. Full suite green: 130 pass / 0 fail.

## Summary

Second-pass review after the 05-05 gap closure. Scope: verify the CR-01/WR-01 fixes in the `visibilitychange` handler, then hunt for regressions in the pause/resume/visibility state machine and the resize path introduced by the phase.

**CR-01 — FIXED, verified complete.** Every route that can reach `audio.gesture()`'s resume arm (`audio.js:77-78`) was enumerated and traced against the manual-pause state: `press()` is gated at entry (`shell.js:115`); `resumeFromPause()` only runs as part of leaving the paused state; the visible-branch gesture now carries the `!paused` guard (`shell.js:251`); the focus listener carries it too (`shell.js:256`). The hidden-branch `else if (audioReady) audio.gesture()` (`shell.js:246`) is the one sibling without the guard, but it is unreachable while paused: every status transition (`tickRun` choose/over edges, `tickPick` confirm, `startRun` restart) executes inside the STEP drain, which the pause gate (`shell.js:384`) holds shut — so `paused ⟹ run.status === 'running'` and the running branch (`enterPause`, which early-returns and leaves `pausedByVis` at `false`) always wins. No remaining route un-suspends a player-paused context. The new leg at `tests/polish.test.js:902-932` pins the manual-pause → hide → reveal sequence on all three channels (ctx.state, gesture log, resume count) plus phase-frozen stepping.

**WR-01 — FIXED, verified correct.** `releaseEverything()` is hoisted unconditional in the hidden leg (`shell.js:244`), so platforms delivering `visibilitychange` without `blur` still cancel a `choose`-status sub-confirm hold (`pickPressedAt`/`pickFill` cleared at `shell.js:160-163`). Ordering is sound: for `running` the hoisted call may arm `releaseIntent`, but `enterPause(true)` immediately after clears `holdFrom`/`releaseIntent` — a hidden run clears holds rather than firing them, as the comment states. No status exists where a backgrounded hold can auto-confirm: `over` arms nothing (T-05-07 preserved — the `else` leg only nulls `pressIntent`), `idle` is a pure no-op, and `tickPick` can never fire because `pickPressedAt` is null. Pinned at `tests/polish.test.js:941-970` (hidden-without-blur platform).

**Regression sweep (clean):** the 05-05 diff (`git show f6f35fc`) is surgical — 11 insertions, all in the visibilitychange handler and comments. The resize path is untouched by 05-05; `applyWindowSize` writes both CSS box and buffer channels per frame-event, render3d's passive poll re-derives RT/aspect/snap-grid, and a resize during `pausedByVis` (rAF halted) lands correctly on the first post-return frame via that poll. The reduced-motion snap-grid refactor has both write sites routed through the one `snapGridFor` helper (`render3d.js:312,352`), closing Pitfall 12. Sim purity holds: `git diff a1fae8c..HEAD` against `rope.js`/`player.js`/`upgrades.js`/`game.js`/`interpolate.js` is empty. No secrets, injection surfaces, or debug artifacts introduced; `localStorage` writes remain the guarded pattern.

## Findings by disposition

| ID | Severity | Status | Note |
|----|----------|--------|------|
| CR-01 | critical | **fixed — verified** | `!paused` guard on visible-branch gesture; all resume routes closed |
| WR-01 | warning | **fixed — verified** | unconditional `releaseEverything()` in hidden leg; ordering with `enterPause` correct |
| WR-02 | warning | open, unchanged | `render3d.js:387-389,424` — reduced-idle arms/scarf still oscillate off the wall clock; "frozen pose" comment still overstates. Not worse; not re-litigated |
| IN-01 | info | open, unchanged | `shell.js:376,384` — dual pause guards (`acc = 0` pre-loop + in-gate `paused \|\|`) still both present |
| IN-02 | info | open, unchanged | `audio.js:75,78,86` — fire-and-forget `resume()`/`suspend()` Promises still lack `.catch(() => {})` |
| IN-03 | info | open, unchanged | `shell.js:46-48` — CSS box vs floored buffer can differ sub-2px |
| IN-04 | info | **new** | see below |

### IN-04: Hidden-branch gesture lacks the `!paused` guard its three siblings now carry

**File:** `js/shell.js:246`
**Issue:** After 05-05, the `press()`, visible-branch, and `focus` gesture sites are all locally guarded against un-suspending a player-paused context, but the hidden leg's `else if (audioReady) audio.gesture()` relies on a *global* invariant — `paused ⟹ status === 'running'` (true today, because every status transition lives behind the pause-gated drain) — to keep the branch unreachable during a pause. That invariant is correct but implicit; if a future phase ever permits pausing from `choose` or lets a status edge run while paused, this line silently reopens the exact CR-01 hole on the hidden edge. Not a current defect — a robustness/locality note in the spirit of T-05-01's "the mitigation covers both sites" phrasing.
**Fix:**
```js
releaseEverything();
if (run.status === 'running') enterPause(true);
else if (audioReady && !paused) audio.gesture(); // symmetric guard; unreachable today, drift-proof tomorrow
```

---

## Security notes (no findings)

- **Event-handler hardening:** `releaseEverything` still cannot arm `releaseIntent` outside `running`, so blur/pointercancel/hidden can never trigger the `over`-status release-restart path (T-05-07 holds under the hoisted call — the hoist only *added* the `choose`-cancel leg, which nulls timers and arms nothing).
- **localStorage / injection:** unchanged guarded patterns only; no new writes, no `innerHTML`, no URL construction from user data this phase.

---

_Reviewed: 2026-10-22_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
