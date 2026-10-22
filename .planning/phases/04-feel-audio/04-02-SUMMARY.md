---
phase: 04-feel-audio
plan: 02
subsystem: feel-juice
tags: [hitstop, juice-tiers, shake, particles, near-miss-callout, press-delivery, uShake, particle-pool]
status: complete
requires:
  - "04-01 tickRun events/streak/buffer + optional press param (SHIPPED)"
  - "04-03 js/audio.js + shell wiring (SHIPPED — harness rewrites the dynamic audio import to a file: URL)"
provides:
  - "JUICE_TIERS exported single-source tier table in js/shell.js (D-N06/D-N12 seeds)"
  - "stopUntil deadline drain-gate hitstop in frame() (D-N05)"
  - "press delivery into tickRun's 6th argument (closes 04-01's null default, D-N01)"
  - "CLOSE! ×N near-miss callout on the flashName/flashUntil HUD channel (D-N04)"
  - "view.juice = { at, shake, particles } read-only WebGL signal"
  - "uShake UV jitter in BAYER_FRAG + 16-quad pooled particle bursts (D-N06 render half)"
  - "tests/juice.test.js (8 tests: tier pins, stall/conservation, callout, render-juice leg)"
affects: [js/shell.js, js/render3d.js, tests/juice.test.js]
tech-stack:
  added: []
  patterns:
    - "deadline-semantic freeze gate: stopUntil = Math.max(stopUntil, now + ms) — hits never queue (T-4-03)"
    - "closed-form impulse decay: exp(-t/50)·sin(t·0.55) gated to t < 140 ms, zero accumulators"
    - "pooled-quad spawn: golden-angle (2.399·k + 0.7·spawnCount) directions, positions via reused .set — zero per-frame allocation"
    - "test-local JUICE_TIERS A/B mutation (per-boot module instance, restore in finally)"
tech-stack-notes: "zero new dependencies; three@0.186.1 importmap untouched"
key-files:
  created: [tests/juice.test.js]
  modified: [js/shell.js, js/render3d.js]
decisions:
  - "Timeline stall/conservation proofs mutate JUICE_TIERS hitstop to 60 ms (juice) / 0 ms (control) test-locally — the shipped 8 ms skip seed is smaller than one STEP (8.33 ms), so its freeze window provably contains no control step at any frame quantum and an unmutated A/B is mathematically invisible (see Deviations)"
  - "The callout test drives frame() with the real performance.now() clock because updateHud's flash branch consults that clock directly; a drifting fake now silently defeats the FLASH_MS timeout (the failure class that killed night attempt 2)"
requires-coverage: [FEEL-02, FEEL-03]
metrics:
  duration: "~25 min"
  completed: 2026-10-22
  tasks: 2
  files: 3
  tests-added: 8
  suite: "92 pass / 0 fail (baseline 84)"
plan_head_before: 218966fc555957fbae37e1b8cc7c499dfd6be46e
plan_head_after: 06160f9
commits: 2
actuals:
  tokens: 7670
  tasks: 2
  commits: 2
---

# Phase 4 Plan 02: Feel Juice — Hitstop, Shake, Particles, Callout Summary

Events became felt: a deadline-gated accumulator freeze scaled by event significance (sim provably frozen-but-unmutated), UV-space shake inside the one Bayer post pass with the camera untouched, pooled closed-form particle quads, the CLOSE! ×N near-miss callout riding the proven HUD flash channel, and the shell→sim press delivery that makes plan 04-01's forgiveness buffer live in real gameplay.

## What Was Built

### Task 1 (tracer) — shell side (`js/shell.js`, commit `9d2fe11`)

- **`export const JUICE_TIERS`** at module scope — `{ skip: {8, 0.5, 4}, nearMiss: {40, 1.5, 10}, trip: {80, 2, 16} }`, the only place any juice magnitude is written (D-N06/D-N12); `'jump'` deliberately absent.
- **Hitstop drain gate (D-N05):** `if (now < stopUntil) break;` at the top of the `while (acc >= STEP)` body. The `acc +=` line and the 0.25 s clamp stay byte-identical; steps are delayed (drained on resume), never dropped. Removing the gate restores the plain drain exactly — nothing in run state records hitstop.
- **Press delivery (D-N01/D-N11):** the running-release branch sets `pressFired` beside the `jump()` call; the tickRun call passes `pressFired ? true : null` as the 6th argument, cleared after each call — same-STEP delivery.
- **Event consumption:** `for (const e of (out.events ?? (out.tripped ? ['trip'] : [])))` — deadline merge `stopUntil = Math.max(stopUntil, now + tier.hitstop)` (T-4-03: hits never queue), `juiceSig = { at, shake, particles }` for the WebGL layer, and for `nearMiss` the **CLOSE! ×N callout** through `flashName`/`flashUntil` only — no new DOM, streak count straight from `run.streak`.
- `scene.render` view gains `juice: juiceSig`; render still runs every frame (juice is visible while the sim freezes).

### Task 2 (auto) — render side (`js/render3d.js`, commit `06160f9`)

- **`uShake` in BAYER_FRAG:** the texture sample becomes `texture2D(tDiffuse, vUv + uShake)` while the Bayer cell index stays computed from the untouched `vUv` (Pitfall-3: the dither pattern never swims with the shake). Uniform value is a reused `Vector2` — zero per-frame allocation.
- **Closed-form impulse:** `k = shake · exp(-t/50) · sin(t·0.55)` for `0 ≤ t < 140 ms` else exactly 0; `Math.min(2, …)` caps at 2 post-pass px (D-N12), divided by `internalW`/`INTERNAL_H` into UV units.
- **Particle pool:** 16 `PlaneGeometry(0.07, 0.07)` quads, one shared transparent PALE basic material, snap-exempt, in a Group built ONCE, `visible = false`. Spawns set visibility + origin `(0, rig.y + 0.5, 0.1)` and golden-angle directions from spawn-counter + index only (zero `Math.random`); live quads advance `origin + dir·speed·t − 1.5t²` with opacity fade, hidden at `t > 0.45 s`.
- **Zero camera mutation:** the `camera.(position|rotation)` grep still matches exactly the one construction-block line; the `'over'`-status rope shake is untouched.
- `THREE_STUB_HREF` in `tests/render3d.test.js` needed **no edit** — Group/PlaneGeometry/MeshBasicMaterial/Vector2 were already present; the pool symbol surface is covered.

## Verification Coverage

| kind | ref | status |
| --- | --- | --- |
| automated | `node --test tests/juice.test.js` → fail 0 (8/8) | pass |
| automated | `node --test tests/` → 92 pass / 0 fail (floor ≥ 84) | pass |
| automated | `grep -c "hitstop:" js/shell.js` == 3 and zero in js/render3d.js (tier table is the single source) | pass |
| automated | `git diff --quiet HEAD --` game/audio/rope/player + frozen/other test files → clean (lane contract) | pass |
| automated | `git diff --quiet HEAD -- tests/shell.test.js tests/pickflow.test.js` → clean (frozen harnesses) | pass |
| automated | `grep -cE "camera[.](position\|rotation)" js/render3d.js` == 1 (camera invariant) | pass |
| automated | camera position/rotation bit-equality assertion across juiced/unjuiced frames (tests/juice.test.js) | pass |
| automated | conservation half: hitstop-0 control ≡ juice timeline outside the freeze window; totals equal by F+31 | pass |
| human_judgment | Browser smoke (end-of-phase UAT): skip tick / CLOSE! callout / near-miss vs trip weight visibly differ; morning playtest re-tunes JUICE_TIERS as a data-only diff (D-N12) | pending — this is the juice *feel* deliverable: timing taste is morning-playtest judgment, machine gates prove mechanics only |

`human_judgment: true` — the FEEL-02 "feels scaled by significance" quality is not machine-decidable; every mechanical precondition for it is pinned above.

## Deviations from Plan

### Test-design accommodations (no shipping-code deviation — shell/render diffs follow the plan's action text verbatim)

**1. [Rule 3 - Blocking] Timeline leg uses test-local hitstop mutation (60/0) instead of shipped 8 ms seeds**
- **Found during:** Task 1, informed by the night-loop log's probe (juice ≡ ctrl per-frame deltas despite a working gate)
- **Issue:** the shipped `skip.hitstop = 8` is smaller than one `STEP` (8.33 ms). The first control step after an event always lands at `T + (8.33 − residual)` with `residual <` frame quantum — at any fake cadence the freeze window `(T, T+8)` provably contains no control step, so an unmutated A/B timeline is byte-identical *even with the gate working*. The night attempt's stall test failed for exactly this reason, not a shell bug.
- **Fix:** juice leg freezes the whole tier table at 60 ms (a deterministic 14-frame frozen window), control leg at 0 — the plan's `flagged_assumptions` explicitly sanction "temporarily mutate captured JUICE_TIERS fields for A/B timelines (restore in finally)". Each boot owns its own JUICE_TIERS (unique data: URL ⇒ fresh module instance), so the mutation is perfectly isolated.
- **Files modified:** tests/juice.test.js only
- **Commit:** `9d2fe11`

**2. [Rule 3 - Blocking] Callout leg drives frame() with the real clock**
- **Found during:** Task 1 planning (night attempt 2's "callout must time out" failure)
- **Issue:** `updateHud`'s flash branch reads `performance.now()` directly; under a tight-loop fake clock the `now` passed to frame() outruns real time by seconds, so `flashUntil` (set from frame-`now`) never expires against `performance.now()` and the FLASH_MS revert is untestable/flaky.
- **Fix:** the callout test pumps `frame(performance.now())` — production-identical single clock; the scripted near-miss (grounded, phase ∈ [0.38, 0.41), press, 2 frames, release) is robust to frame-cadence jitter by construction: every release lands before the 0.45 crossing with the buffer alive and the pass under 27 px (near-miss by buffer or tight-clearance route).
- **Files modified:** tests/juice.test.js only
- **Commit:** `9d2fe11`

### Deferred (from the plan, unchanged)
- JUICE_TIERS seed tuning — morning playtest, data-only diff in the one table (D-N12).
- The vibe track's musical content — human-gated, out of this lane.

## Known Stubs

None. Every signal is wired end-to-end: sim `events` → JUICE_TIERS → `stopUntil`/`juiceSig` → `uShake`/pool; `run.streak` → CLOSE! ×N; release → `pressFired` → tickRun 6th arg.

## Threat Surface

No new trust boundaries beyond the plan's register: `juiceSig` is a plain `{ at, shake, particles }` snapshot crossing shell→WebGL read-only (T-4-03 mitigated by the max-deadline merge; T-4-04 accepted via the 16-quad clip — both pinned by tests). Zero new packages (T-4-SC holds). No threat flags.

## Self-Check Run

- Files: `js/shell.js`, `js/render3d.js`, `tests/juice.test.js` — present.
- Commits `9d2fe11`, `06160f9` — ancestors of HEAD.
- Full suite at `plan_head_after`: 92 pass / 0 fail.

## Self-Check: PASSED
