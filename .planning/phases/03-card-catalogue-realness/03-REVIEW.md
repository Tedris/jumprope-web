---
phase: 03-card-catalogue-realness
reviewed: 2026-10-17T12:00:00Z
depth: deep
files_reviewed: 9
files_reviewed_list:
  - js/upgrades.js
  - js/game.js
  - js/shell.js
  - index.html
  - css/style.css
  - tests/pickflow.test.js
  - tests/catalogue.test.js
  - tests/headless-sim.test.js
  - tests/shell.test.js
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-10-17
**Depth:** deep (per-file analysis plus cross-module state-machine tracing and empirical edge-case probes)
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Phase 03 diff (`e218dbb..HEAD`) expands the catalogue to 8 metadata-bearing cards, replaces the `run.offer[0]` auto-apply debt with a cycling-cursor + hold-confirm pick flow, and adds the pickflow / catalogue / headless-sim test gates. Full suite verified green (66 pass, 0 fail).

Positive checks that passed: the auto-apply debt is genuinely gone (zero `run.offer[0]` in `js/shell.js`); all HUD writes are `textContent`-only (T-3-01 holds); the `className` role tint is sourced only from the five catalogue color constants and pinned by the record-shape test (T-3-06 holds); no run key is ever constructed from external input (T-3-02 holds); the pure half of `game.js` and all of `upgrades.js` are free of `Math.random`/`performance`/`Date`/DOM (boundary fence green); `pickOffers` does not mutate its inputs and `resumeRun` shares the single `leadIn()` path (ARCH-02). The shell's D-07 input lock, confirm-release swallow (Pitfall 4), and empty-pool no-freeze rule (Pitfall 6) were traced through press/release interleavings and hold under the reachable paths.

No blocker-tier defects were found. The issues below are one latent logic defect in the weighted sampler's boundary handling, one unguarded dereference in a public sim export, one demonstrably-wrong counter in the criterion-5 test harness, and three hygiene items.

## Critical Issues

None.

## Warnings

### WR-01: `pickOffers` silently defaults to index 0 when `rng()` returns ≥ 1.0, bypassing the weighted draw

**File:** `js/upgrades.js:53-57`
**Issue:** The inverse-CDF loop only sets `idx` when the running remainder goes strictly negative, and `idx` is pre-initialized to `0`. If `rng()` returns exactly `1.0` (or more, from a permissive/misbehaving stub), `r` never falls below 0 after all weight subtractions, the loop exits without `break`, and the first surviving card is silently returned regardless of rarity weights. Empirically confirmed: `pickOffers(CARDS, {}, 1, () => 1.0)` returns `float` (pool index 0), and `() => 1.5` behaves the same. `Math.random` never returns 1.0, so production is safe today — but the sampler's documented contract ("inverse-CDF weighted draw") breaks on a boundary input, and the seeded-stub idiom is exactly where inclusive-1 stubs appear in this repo's own test culture.
**Fix:**
```js
for (let i = 0; i < remaining.length; i++) {
  r -= RARITY_WEIGHT[remaining[i].rarity] ?? 1;
  if (r < 0 || i === remaining.length - 1) { idx = i; break; }
}
```

### WR-02: `applyCard` throws a TypeError on a run without `owned`, while `tickRun` defends against the same shape

**File:** `js/game.js:71`
**Issue:** `owned: { ...run.owned, [card.id]: (run.owned[card.id] ?? 0) + 1 }` — the `?? 0` guards the *value* but the code still dereferences `run.owned` unconditionally; a run record lacking `owned` (legacy-shaped, hand-constructed in a future test, or any caller predating this phase's `createRun`) raises `TypeError: Cannot read properties of undefined`. Confirmed empirically with a `choose`-status run literal. `tickRun` (line 47) uses `run.owned ?? {}` for the identical access, and `shell.js` `offerLine`/`updateHud` also use `run.owned ?? {}` — the inconsistent defensiveness across the same field signals an unintentional gap, and `applyCard` is the least-guarded call site of the four.
**Fix:**
```js
export function applyCard(run, card) {
  const owned = run.owned ?? {};
  return {
    ...run,
    effects: card.apply(run.effects),
    owned: { ...owned, [card.id]: (owned[card.id] ?? 0) + 1 },
    offer: null,
  };
}
```

### WR-03: Headless-sim wrap detector counts every `resumeRun` lead-in reset as a rope cycle — the criterion-5 cycle counter is wrong on any run that handles a pick

**File:** `tests/headless-sim.test.js:65` (`if (rope.phase < prevPhase) stats.cycles += 1;`)
**Issue:** A cadence freeze is created on a tick whose rope phase is inside the feet window (≈0.45–0.55). The next iteration's `resumeRun` teleports the phase back to `START_PHASE` (0.33), and the tick's post-`tickRun` phase (~0.336) compares lower than the freeze tick's `prevPhase` (~0.50) — a phantom cycle with no real wrap. Reproduced empirically: freeze-tick phase 0.50 → post-resume phase 0.336 → detector fires. It is latent only by luck: test 2 (the pick-handling variant) is the one test that never asserts `stats.cycles`, and the neutral/capped variants never reach 10 skips in 1000 ticks, so no *currently-green* assertion observes the inflation. But `scoreEvents >= cycles` (criterion 5's "one score per cycle") would fail spuriously — or worse, a future variant that both picks and asserts cycles encodes the wrong number as expected behavior. The phase discontinuity is a lead-in re-entry, not a wrap.
**Fix:** Suppress wrap detection for the step following a resume, e.g. set a `justResumed = true` flag in the choose-handling block and `if (rope.phase < prevPhase && !justResumed) stats.cycles += 1; justResumed = false;` in the counter block.

## Info

### IN-01: `pickDone` leaks `true` out of confirm into subsequent choose states

**File:** `js/shell.js:118` (set) / `js/shell.js:86-88` (consumed)
**Issue:** Confirm sets `pickDone = true`; it is cleared only by a choose-status release or the next choose press. If the confirm-release arrives while status is already `running` (the common case in this implementation, since confirm fires while status transitions out of `choose` inside `tickPick`), the flag survives into the *next* freeze. A release arriving in that freeze before any first press is then swallowed as a phantom "confirm-release" instead of taking the cancel branch. The net effect is harmless today (the cancel branch would be a no-op — `pickPressedAt` is null in that window), but the reducer's state no longer reflects reality and the swallow/cancel branch selection is decided by a stale flag from a previous freeze.
**Fix:** Reset `pickDone = false` alongside `pickIdx = 0` wherever a *new* choose state is entered (e.g. when `tickRun` output transitions the run into `choose`), rather than relying on the confirm's own release to clear it.

### IN-02: Divergent duplicate `applyUpgrade` kept alive only by a frozen test

**File:** `js/game.js:62-64` vs `js/game.js:67-74`
**Issue:** `applyUpgrade` (sets `status: 'running'`, no `owned` tracking) and `applyCard` (leaves status, increments `owned`) now encode the same effect-application with two different contracts. No production code path calls `applyUpgrade` after this phase — the shell switched to `applyCard` + `resumeRun`. A future caller picking the wrong twin would silently skip owned accounting (breaking cap enforcement downstream of `isAvailable`) or set status out from under `resumeRun` (breaking the D-06 single-transition rule).
**Fix:** Keep the export (frozen test) but define it over the canonical path to eliminate drift: `return { ...applyCard(run, upgrade), status: 'running' };`.

### IN-03: Stale budget comment in the pickflow harness (60 s of sim, commented as ≈125 s)

**File:** `tests/pickflow.test.js:109` (comment) vs `tests/pickflow.test.js:115` (`budget > 1200`)
**Issue:** The harness comment promises a frame budget of "≈125 s of simulation"; the actual budget is 1200 iterations × ~50 ms = ~60 s of sim time. Reaching skip 10 needs ~13 s, so the headroom is ample and the failure message's claim ("within the frame budget") matches the code but not the comment — a future author tuning the budget against the wrong number may cut it too aggressively.
**Fix:** Correct the comment to `frame budget ≈ 60 s of simulation` (or raise the budget to match the comment).

---

_Reviewed: 2026-10-17_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
