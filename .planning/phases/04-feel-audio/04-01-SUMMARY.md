---
phase: 04-feel-audio
plan: 01
subsystem: simulation
tags: [input-buffer, forgiveness, events-channel, near-miss, streak, node-test]

requires:
  - phase: 01-render-shell-foundation
    provides: "pure tickRun contract, phase-clock scoring at the feet window, injected-rng DI the press param mirrors"
  - phase: 03-card-catalogue-realness
    provides: "windowMul upgrade band that the near-miss margin couples to"
provides:
  - "tickRun(..., rng = Math.random, press = null) — optional trailing press param (D-N01 DI shape), BUFFER_SEC ≈ 0.1 input buffer on the phase clock converting would-be trips into forgiven passes"
  - "events: [...] channel on tickRun's return ('jump' | 'skip' | 'nearMiss' | 'trip' | 'offer') alongside the backward-compatible tripped flag (D-N02)"
  - "near-miss predicate + run.streak bookkeeping: buffer-forgiven or tight-clearance (NEAR_MARGIN fraction of minHeight = 18 / windowMul) passes emit nearMiss, build streak; clean skip or trip resets it (D-N03)"
  - "tests/feel.test.js — 9 tests: press-offset matrix, float-boundary edge pin, D-N11 no-mutation pin, backward-compat pin, event alphabet, ten-pass streak sequence, windowMul band coupling"
affects: [phase-4-02-juice, phase-4-04-capstone, any future consumer of the events channel]

actuals:
  tokens: 2500
  tasks: 2
  commits: 1
  plan_head_before: 87696306d53e62a7e18a2fc5d2b3745d46e55b32
  plan_head_after: 44ea4f8784ac3ff738332f50f56131c041c983de

tech-stack:
  added: []
  patterns:
    - "optional trailing DI param on tickRun mirroring the rng seam — signature-line compatible with boundary.test.js's rng-line fence"
    - "events returned as a fresh array per tick, tripped flag preserved for positional destructuring"
    - "closed-form buffer decay on the phase clock (no timers, no wall-clock reads)"

key-files:
  created:
    - tests/feel.test.js
  modified:
    - js/game.js

key-decisions:
  - "Buffer lives in the sim (D-N01), forgiveness-only (D-N11): a delivered press never mutates player state — deep-equal pin at every pre-crossing step"
  - "Buffer boundary is inclusive at 0; the iterative phase-clock decay leaves ~2.4e-17 float residue at the exact 0.10 s offset, pinned by test name (12-tick edge forgives)"

patterns-established:
  - "Events channel is the single juice/audio/callout source — consumers never use timing side-channels (D-N02)"

requirements-completed: [FEEL-01, FEEL-03]

coverage:
  - id: D1
    description: "A press inside the 0.1 s forgiveness window before the feet-crossing resolves a would-be trip into a counted near-miss skip; outside it, the trip stands"
    requirement: "FEEL-01"
    verification:
      - kind: unit
        ref: "tests/feel.test.js#press 0.05 s before the crossing forgives the trip into a counted near-miss skip (FEEL-01)"
        status: pass
      - kind: unit
        ref: "tests/feel.test.js#press 0.15 s before the crossing has fully decayed — the crossing trips (D-N01 bound)"
        status: pass
      - kind: unit
        ref: "tests/feel.test.js#press exactly 0.10 s before (12 ticks): iterative phase-clock decay leaves a positive float residue (~2.4e-17) above the inclusive buffer === 0 boundary, so this edge forgives"
        status: pass
    human_judgment: true
    rationale: "Mechanics are machine-proven; whether the forgiveness FEELS right in live play is the phase's morning playtest (and FEEL-SWEEP) judgment, not a unit assertion."
  - id: D2
    description: "Near-miss is a registered event distinct from skip, with streak increment/reset across scripted passes; score/skips identical for near and clean crossings"
    requirement: "FEEL-03"
    verification:
      - kind: unit
        ref: "tests/feel.test.js#ten-pass scripted sequence: exact event stream and streak trajectory 0→1→2→0→1→2→3→0→1→0, score/skips identical for near-miss and clean passes"
        status: pass
      - kind: unit
        ref: "tests/feel.test.js#two tight crossings in a row build a streak-2 with both crossings emitting [skip, nearMiss] (D-N03)"
        status: pass
      - kind: unit
        ref: "tests/feel.test.js#windowMul coupling pin: at windowMul 1.25 the near-miss band scales to minHeight 14.4 (band 14.4–21.6) — y 18 tight, y 23.25 roomy"
        status: pass
    human_judgment: false
  - id: D3
    description: "Backward compatibility: the 5-arg tickRun contract and player state are byte-identical press-free; events is purely additive"
    requirement: "FEEL-01"
    verification:
      - kind: unit
        ref: "tests/feel.test.js#5-arg backward compat: press-free trip rig mirrors tests/game.test.js:22-28 and trips on the crossing step; return carries run/rope/player/tripped/events"
        status: pass
      - kind: unit
        ref: "tests/feel.test.js#D-N11 pin: a delivered press never mutates player state — pressed and un-pressed scripts are deep-equal on the player at every pre-crossing step"
        status: pass
      - kind: integration
        ref: "node --test tests/ (66 frozen tests green unedited)"
        status: pass
    human_judgment: false

duration: 13min
completed: 2026-10-22
status: complete
---

# Phase 4, Plan 01: Simulation Forgiveness & Events — Summary

**The simulation core gained its forgiveness and event vocabulary: a BUFFER_SEC ≈ 0.1 s input-buffer timer on the phase clock converts would-be trips into forgiven near-miss passes, a machine-checkable near-miss predicate with streak bookkeeping rides a new per-step events channel, and the 5-arg tickRun contract plus every frozen test stayed byte-identical.**

> **Provenance:** executed off-ledger by the night loop (item `GSD-04-01`, 2026-10-22 01:26–01:39, gate green on first attempt, commit `44ea4f8`). SUMMARY backfilled by the orchestrator during `/gsd-execute-phase 4` safe-resume close-out; all 9 feel tests + full suite re-verified green on the current tree before writing.

## Performance

- **Duration:** ~13 min wall-clock (night-loop iteration 1 → check)
- **Tasks:** 2 (buffer+events in js/game.js, tests/feel.test.js) — as planned
- **Commits:** 1 (`44ea4f8`)

## What Was Built

Per the plan's two tasks, verified against the shipped diff:

1. **`js/game.js`** (+48/−3): `run` gains `buffer` (seconds remaining, decayed by `dt` on the phase clock, consumed at feet-crossing); `tickRun` gains the optional trailing `press = null` param; `events` array on the return; `run.streak` with D-N03 increment/reset; exported `BUFFER_SEC`/`NEAR_MARGIN` constants. `js/shell.js` untouched — press delivery is plan 04-02's one-liner.
2. **`tests/feel.test.js`** (new, 9 tests): press-offset matrix −0.05 s forgiven / −0.15 s trip / −0.10 s forgives at the float-residue edge; D-N11 deep-equal player pin; jump-transition event; 5-arg backward-compat pin; ten-pass event/streak sequence (incl. the 10th-skip `offer`); streak-2 case; windowMul-1.25 band-coupling pin.

## Verification

- `node --test tests/` → 84/84 pass (re-run at close-out on the current tree); the 66 pre-existing tests green unedited.
- Sim purity intact: no new imports in the sim graph, no wall-clock or RNG references in the added code.

## Requirements Completed

**FEEL-01, FEEL-03** — live-play forgiveness *feel* carried to human UAT / the FEEL-SWEEP tuning table (coverage D1).

## Self-Check: PASSED
- js/game.js contains buffer/events/streak; tests/feel.test.js exists and green (9 tests).
- Commit 44ea4f8 reachable from HEAD.
