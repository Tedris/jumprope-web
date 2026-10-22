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
  info: 3
  total: 6
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-10-22 (deep — cross-file trace of shell.js ↔ audio.js ↔ render3d.js ↔ game.js call chains)
**Depth:** deep
**Files Reviewed:** 4 source files (+ tests/polish.test.js, tests/render3d.test.js read for pin coverage only)
**Status:** issues_found

## Summary

Reviewed the four Phase-05 changed source files (`git diff a1fae8c..HEAD -- js/ css/`) against the four PLAN/SUMMARY artifacts and AGENTS.md conventions. Full suite (`node --test tests/`) passes: 0 failures. The pause gate, letterbox band math, snap-grid shared helper, and release-hardening design are mostly sound: `enterPause`/`resumeFromPause` correctly route through `resumeRun` (score/effects/owned survive), the paused-frame `acc = 0` drain prevents Pitfall-1 fast-forward, the `Math.max(2, dw)` buffer floor and `Number(x) || fallback` NaN guard hold, the aspect passthrough for the 480×640 harness is exact, and no injection surface or unguarded storage write was introduced (`localStorage` access remains the pre-existing guarded `loadBest`/`saveBest`/audio-settings pattern; `three@0.186.1` importmap pin intact; render3d gains no `window`/`matchMedia` reference, so the one-way-view-payload ARCH fence holds).

One blocker slipped through anyway: the visibilitychange **visible** branch calls `audio.gesture()` without the `!paused` guard that the phase's own threat model (05-01-PLAN.md T-05-01) explicitly required on it, letting background music resume behind a manual-pause freeze frame. Existing test legs pin the *focus* listener (`polish.test.js:431`) but never walk the manual-pause → hide → reveal sequence, so the suite is green over the defect.

## Critical Issues

### CR-01: Visible-tab `audio.gesture()` lacks the `!paused` guard — music resumes behind a manual-pause freeze frame

**File:** `js/shell.js:243-245`
**Issue:** Reproduce: mid-run press `P` (manual pause → `paused = true`, `pausedByVis = false`, `audio.suspend()`), switch tabs (hidden leg: `enterPause` early-returns at line 170 because `paused` is already true, so `pausedByVis` stays `false` and the context stays suspended), then return to the tab. The visible branch takes `else if (audioReady) audio.gesture()` — and `gesture()`'s recovery arm (`js/audio.js:77-78`: `else if (ctx.state === 'suspended') ctx.resume()`) un-suspends the AudioContext while the game is still paused. The looping background track plays against a frozen frame and the "paused — press P to resume" prompt. This is exactly the state-spoofing threat 05-01-PLAN.md T-05-01 mitigates — "Pitfall 4: focus must never un-suspend a context the game itself paused" — whose pinned mitigation covers "the focus listener **and the visible-branch gesture**". Only the focus listener (line 249) got the guard; the plan's Task 2 action text ("visible otherwise → unchanged `audio.gesture()`") under-specified it and the implementation followed the action text instead of the threat model. No test leg walks manual-pause → hidden → visible, which is why the suite is green.
**Fix:**
```js
// js/shell.js, visibilitychange visible branch
if (pausedByVis) resumeFromPause();          // tab-return auto-resume through the lead-in
else if (audioReady && !paused) audio.gesture(); // D-N08 recovery, but never past a manual pause
```
Add a polish.test.js leg: manual-pause, fire hidden, fire visible, assert `ctx.state === 'suspended'` and `log.gestures` unchanged — the same pin style as the existing focus leg at `tests/polish.test.js:431`.

## Warnings

### WR-01: Hidden `visibilitychange` only routes `releaseEverything()` for the `running` status — a `choose`-status hold can auto-confirm on tab return

**File:** `js/shell.js:235-242`
**Issue:** `pickPressedAt` is wall-clock-based (`tickPick`, line 300). On blur, `releaseEverything` cleanly cancels an armed sub-confirm hold (lines 160-163), but the hidden leg calls it only under `run.status === 'running'` (line 241). Desktop browsers fire `blur` alongside `visibilitychange` on a tab switch, so the blur handler normally covers the `choose` status — but platforms that deliver `visibilitychange` without a reliable `blur` (mobile app-switch, screen lock, some Safari paths) leave the hold armed while the tab is backgrounded; on the first pumped frame after return, `(now - pickPressedAt) >= PICK_HOLD_MS` is already satisfied and `tickPick` confirms the card with no user action — a state change caused by focus loss, contrary to the D-11 "one shared release for every focus/pointer loss" intent stated at lines 139-141.
**Fix:**
```js
if (hidden) {
  releaseEverything(); // cancel any armed hold for every status (no-ops idle/over)
  if (run.status === 'running') enterPause(true);
  else if (audioReady) audio.gesture();
}
```
(`releaseEverything` is already a safe no-op for `idle`/`over`: it clears `pressIntent` and never arms `releaseIntent` outside `running`.)

### WR-02: Reduced-motion "frozen pose" during idle is not frozen — arms and scarf keep oscillating off the wall clock

**File:** `js/render3d.js:387-389, 423-425`
**Issue:** The line-385 comment claims the reduced-idle branch yields a "frozen pose", and `rig.position.y` / `ropePivot.rotation.x` do go still. But `beat = now / 1400` still drives `armL/armR.rotation.x = ±Math.sin(beat)` (±1.0 rad amplitude) and the scarf loop (line 424: `Math.sin(beat - k * 0.4) * 0.5`, ±0.5 rad) — perpetual, purely cosmetic idle life (D-15) that never stops under `prefers-reduced-motion`. The 05-02 plan's "arms/legs byte-identical" pin is justified for the *running* branch (judgment legibility, D-05); the idle arm sway is not judgment-relevant — nothing is airborne or scoring — so it falls on the dampen-to-still side of the same Open-Q3 resolution, and at minimum the code comment overstates what the branch does.
**Fix:**
```js
beat = now / 1400;
armL.rotation.x = reduced ? 0 : Math.sin(beat);
armR.rotation.x = reduced ? 0 : -Math.sin(beat);
// and in the shared scarf loop:
scarf[k].rotation.x = reduced && status === 'idle' ? 0 : Math.sin(beat - k * 0.4) * 0.5;
```
(or freeze the idle `beat` to a constant when reduced; if the team decides to keep the sway per the pinned byte-identical reading, correct the "frozen pose" comment so the claim matches the behavior.)

## Info

### IN-01: Dead `paused` disjunct in the drain gate

**File:** `js/shell.js:369, 377`
**Issue:** `if (paused) acc = 0;` at line 369 guarantees `while (acc >= STEP)` never executes while paused, so the `paused ||` inside the gate at line 377 can never be the deciding term. Harmless belt-and-braces, but two guards for one invariant invite drift if one is later "cleaned up."
**Fix:** Keep the in-gate guard and drop the pre-loop `acc = 0` (or vice versa), plus a one-line comment naming the survivor.

### IN-02: Fire-and-forget `ctx.suspend()` / `ctx.resume()` Promises can surface as unhandled rejections

**File:** `js/audio.js:86` (new `suspend()`; same pattern at pre-existing lines 75, 78)
**Issue:** `suspend()` calls `ctx.suspend()` and discards the returned Promise. A rejection (e.g. `InvalidStateError` if the UA races its own autoplay-driven suspend/resume) becomes an unhandled promise rejection in the console. The `resume()` sites set the precedent, but the new call widens the surface, and a rejection between `enterPause` and a fast `resumeFromPause` is exactly the interleaving where it can fire.
**Fix:** `if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});` — and the same `.catch(() => {})` on the two `resume()` sites for consistency.

### IN-03: Sub-2px windows desynchronize the CSS box from the backing buffer

**File:** `js/shell.js:46-48`
**Issue:** The CSS box gets `dw + 'px'` while the buffer floor is `Math.max(2, dw)`; for a hypothetical `dw` or `dh` of 1 px the two differ (1 px vs 2 px), and render3d's passive poll then re-derives the aspect from the floored buffer, not the CSS box. Invisible in practice (no realistic window is 1 px), noted for completeness of the Pitfall-9 "both channels, always" rule the function otherwise enforces.
**Fix:** Floor once and use the floored value in both writes: `const bw = Math.max(2, dw); canvas.style.width = bw + 'px'; canvas.width = bw;`

---

## Security notes (no findings)

- **Event-handler hardening:** `releaseEverything` (shell.js:150-164) correctly cannot arm `releaseIntent` outside `running` status, so blur/pointercancel can never trigger the `over`-status release-restart path (T-05-07 holds); the double-release race (blur-fires-jump then a still-delivered `keyup`) is correctly defused by the `holdFrom !== null` check in `consumeIntents:271`.
- **localStorage:** unchanged guarded patterns only (`loadBest`/`saveBest` try/catch; audio settings shape-pinned read, `clampVolume` finiteness check — no `||` coalescing of a legitimate 0). No new storage writes this phase.
- **Injection surfaces:** none added — no `innerHTML`, no URL/query construction from user data, `roleClass` concatenation remains bounded by the fixed card-colour catalogue, and the `matchMedia` change handler stores only a coerced boolean.

---

_Reviewed: 2026-10-22_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
