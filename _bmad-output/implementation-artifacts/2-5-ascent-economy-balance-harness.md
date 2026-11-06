---
baseline_commit: 4d5f480f1c044c27c1b2a88e56bffce743ca5f95
---

# Story 2.5: Ascent economy balance harness

Status: done

*Ultimate context engine analysis completed — comprehensive developer guide created (2026-11-06).*

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the designer,
I want the headless-sim harness to report the ascent economy,
so that every tuning decision from here on is measured, not guessed.

## Acceptance Criteria

1. **Ascent report.** Given the headless-sim technique (`tests/headless-sim.test.js` scripted jumper) driving the real sim with a policy bot (grounded + rope phase in `[0.20, 0.35]` → `jump(0.5)`), when the harness runs, then it reports altitude-per-skip, the tick indices of ceiling crossings, and an estimated summit ETA for a given tunable set (NFR9 seed).
2. **Tunables sweep + budget.** Given altitude-per-skip, ceiling ladder, and rope periods injected as *harness* parameters (never production seams), when the harness sweeps values, then results are deterministic under seeded rng, and `node --test tests/` stays green in under 10 s with the new legs included (NFR4). The suite measured **8.45 s wall on 2026-11-06** — this story's total added runtime must stay under ~1 s; re-measure and record in the Debug Log.
3. **Rule report over the real `CARDS`.** Given the policy bot against the shipped catalogue, when the harness reports per-card climb value (altitude rate over a fixed trip-free horizon, at 1 pick and at cap, offer-suppressed — see Decided 4) plus peak-height delta, then it names every card dominated by another card on the same axis and every card whose climb value is at or below the no-pick baseline — a rule report, not just numbers. This report is the gate evidence for FR11's legacy-8 freeze (Story 3.1 gate note; the two catalogue rules, `epics.md:93-94`).
4. **Same-axis collision rate.** Given seeded offer draws through the real `pickOffers`, when the harness counts offers containing two cards from one axis, then it reports the pool collision rate — baseline to reproduce: **≈16% pick-of-2, ≈47% pick-of-3** (`sprint-change-proposal-2026-11-06.md:33`, measured 16.1%/46.8% at 20k draws). A future duplicate-axis fix is verified by this number falling.
5. **Epic 6 reuse seam.** The harness exposes a multi-seed runner (seeds × tunables × pick-strategy → summit-reach rate and win ticks) so Story 6.1's balance master-dial (5–20% summit band, NFR9) reuses it without rework.

### Decided interpretations (do not re-litigate)

1. **Zero production changes.** No tunable parameters are added to `js/game.js`/`js/areas.js`/`js/upgrades.js`, no exports, no `js/` edits at all. Everything lands in `tests/support/balance-harness.js` (NEW library) + `tests/balance.test.js` (NEW legs). The `tests/support/` location is the direction deferred-work.md:44 already blessed (first properly shared harness module; the shell-harness extraction remains a separate chore — do not fold it in).
2. **How sweepable tunables work without touching the sim.** `tickRun` accrues `altitude += ALT_PER_POINT × scoreMul` (`js/game.js:111`, `:141`) — linear in altitude-per-skip — and the ladder never feeds back into physics: an ascent only writes `area`/`baseAltitude`/`outcome`; the peak is `altitude + player.y` (`js/game.js:170-172`). So **altPerPoint and the ladder are evaluated post-hoc** on the logged trace: `sweptAlt(t) = loggedAltitude(t) + (K − ALT_PER_POINT) × loggedScore(t)`, crossings recomputed with tickRun's own gate (`status ∈ {running, choose} && run.iFrames === 0`, strict `>` ceiling, at most one ascend per tick). **Rope period changes are re-simulated** per value (period drives the phase clock; it is not post-hoc-exact) by overriding `rope.period` after `game.startRun()`. A correctness leg must show the post-hoc evaluator at default `K`/ladder reproduces the sim's own `'ascend'`/`'win'` ticks on a crafted high-altitude trace.
3. **Axis = primary effect field, defined as harness data.** The catalogue has no `axis` field; `role` is flavor and does not group the pairs. Use a harness-local `AXIS` map from each card to the *first* effect field its `apply` closure writes: `float/feather → floatMul` (hang/peak), `multi/tally → scoreMul`, `window/widebrim → windowMul`, `slowrope/windup → ropeMul` (windup's apply writes `ropeMul` first — `js/upgrades.js:22-24`; this grouping is what reproduces the proposal's 16.1/46.8 baseline — role-grouping gives 15.4/43.6 and is WRONG). Anchor it with a metadata-derived guard leg: cards mapped to one axis must share at least one effect field their closures actually touch (probe `card.apply(freshEffects())` and diff against baseline), and every `CARDS` id must be in the map — so a re-effect card fails loudly instead of silently changing the collision number.
4. **Offer-free measurement horizon.** Every measurement run starts with `owned` set to every `CARDS` id at its cap (idiom: `tests/catalogue.test.js:86-88`). Then the 10th-skip `pickOffers` returns `[]` and Pitfall 6's path keeps `status: 'running'` (`js/game.js:130-137`) — no choose freeze, no rng, no pick contamination. Pass an explicit rng stub anyway; never rely on `tickRun`'s `Math.random` default.
5. **Policy bot = the proven scripted jumper verbatim**: grounded && `phase ∈ [0.20, 0.35]` → `jump(player, 0.5)` (`tests/headless-sim.test.js:16-21`). The hold heuristic is full 0.5 s hold. Window bounds and hold are harness parameters, but if a variant trips, widen the window in the sweep or report the trip — NEVER patch physics or skip the variant (same rule as headless-sim's flagged assumption).
6. **Horizon: 1200 ticks (10 s at STEP = 1/120)** for the card rule report — that is the proposal's measurement window (`sprint-change-proposal-2026-11-06.md:175`); the gate-parity leg uses 1000 ticks to match the existing gate. Baseline expectations from that probe: neutral ≈ 8 skips / 16 u / ~99 u peak; Golden Handle +100%/+300%, Wind-Up +125%/+275% (probe predicted a trip in-window at cap — see 7 — but the shipped measurement is **trip-free** on the offer-suppressed horizon, reported `trips: false` per Decided 7; the proposal's trip came from choose freeze/lead-ins that Decided 4 removes), Lucky Tally +15%/+52%, Cloud Shoes 0%/0% peak +15%/+77%, Featherweight 0%/0% peak +5%/+28%, Wide Stance 0%, Heavy Rope −13%/−25%, Wide Brim −25%/−50%.
7. **Trip honesty.** `climbDelta = (altitude/elapsed)_variant ÷ (altitude/elapsed)_baseline − 1` where `elapsed` is the horizon OR the trip tick if the run died first. Any entry whose run tripped carries `trips: true` and its measured tick count = trip tick. Wind-Up at cap is expected to trip the fixed-hold policy inside 1200 ticks (proposal:43) — report it flagged, do not hide it or force it trip-free.
8. **Dominance rule (implements "one axis, one card"):** B dominates A iff same AXIS, and at BOTH 1-pick and cap: `climbDelta_B ≥ climbDelta_A` and `peakDelta_B ≥ peakDelta_A`, strict `>` on at least one component. Expected names in the report, derived from the analytic factors of the closures in the test (see Testing): **feather** (by float), **tally** (by multi), **widebrim** (by window), **slowrope** (by windup). `reduceClimb` (rule 2 violators, factor < 1): **slowrope, widebrim** — the two cards Story 3.x must re-cost. `neutralClimb` (= 0 trip-free, survival value only): float, feather, window — listed, NOT violations.
9. **Determinism**: seeded rng is `mulberry32(seed)` implemented in the harness (~5 lines, no deps). Collision draws: draw *i* uses its own `mulberry32(seed + i)` stream, so changing the draw count does not shift existing draws.

## Tasks / Subtasks

- [x] Task 1: `tests/support/balance-harness.js` — NEW harness library (AC: 1-5)
  - [x] Pure Node, imports ONLY relative `../../js/*.js`; named exports; no `console.*`; POJO returns; 2-space indent. It must not match `*.test.js` (the runner never executes it; boundary.test.js's entryPoints scan at :29-43 only walks `.test.js` in `tests/` and js/ targets, so a support dir is fence-invisible).
  - [x] `mulberry32(seed)` → rng function.
  - [x] `runBot({ ticks = 1200, period = ROPE_PERIOD, effects = freshEffects(), altitude0 = 0, owned = cappedOwned(), policy = { lo: 0.20, hi: 0.35, hold: 0.5 }, pickStrategy = null, rng = () => 0.5 })` → `{ trace, elapsedTicks, trips, tripTick, winTick, skips, altitude, maxPeak, invalidPhaseStep }`. `trace` is a per-tick array of `{ tick, score, altitude, y, phase, status, iFrames }` (post-tick values — `status`/`iFrames` are exactly the fields tickRun's ascend condition consumes at `js/game.js:172`; `phase` serves the cycles count and the blackout guard). Loop = scriptedRun idiom (`tests/headless-sim.test.js:39-59`): on `choose`, only when `pickStrategy` is given, `applyCard` + `resumeRun` (ARCH-02 — never `startRun`; note `resumeRun` re-launches `leadIn` phase 0.33, only reachable on the pick path); jump policy per Decided 5; halt on `status === 'over'` recording trip (any non-`'summit'` outcome) or win (`outcome 'summit'`, `winTick`).
  - [x] Guard: if `STEP × ropeMul / period ≥ 0.1` the feet window can be skipped whole in one tick (deferred-work.md:6 blackout) — mark the run `invalidPhaseStep: true`, do not report its numbers as clean.
  - [x] `evaluateLadder(trace, { altPerPoint = ALT_PER_POINT, ladder = AREAS.map(a => a.ceiling) })` → `{ crossTicks, winTick, summitEta, reachedArea, climbRate }` per Decided 2. `summitEta`: exact `winTick × STEP` when the swept ladder wins inside the trace; else extrapolate `(ladderTop − maxPeakEnd) / (altPerPoint × skipsPerSec)` added to elapsed, `Infinity` if rate ≤ 0.
  - [x] `ascentReport(config)` → `{ altitudePerSkip, crossTicks, summitEta }` (AC1; `altitudePerSkip = altitude / skips`, skips > 0).
  - [x] `cardRuleReport({ ticks = 1200 })` → `{ baseline: {...}, cards: [{ id, name, axis, climbDeltaPick, climbDeltaCap, peakDeltaPick, peakDeltaCap, trips }], dominated: [...], reduceClimb: [...], neutralClimb: [...] }` — baseline + per-card runs at effects composed via `card.apply` ×n (stackedToCap idiom, `tests/headless-sim.test.js:120-124`).
  - [x] `collisionReport({ draws = 20000, pick, seed = 0 })` → `{ rate, draws }` — `pickOffers(CARDS, {}, pick, mulberry32(seed + i))`, count offers with ≥2 same-AXIS cards.
  - [x] Export `AXIS` (frozen map, Decided 3).
- [x] Task 2: `tests/balance.test.js` — contract + ascent legs (AC: 1, 2, 5)
  - [x] Contract leg: harness export surface + every report's key set (`deepEqual` on sorted keys) — factory-contract test per AGENTS.md, in the same change.
  - [x] Determinism legs: same-config `runBot` traces `deepEqual`; `cardRuleReport` twice deepEqual; `collisionReport` with equal seed equal.
  - [x] Gate-parity leg: neutral 1000-tick bot — never trips, phase wraps (cycles) in `[6, 7]` (headless-sim's pinned band, :90-92), `altitude === ALT_PER_POINT × score` within float tolerance every tick (deferred-work.md:43 — the existing exact-equality pin is a power-of-two artifact; use tolerance here).
  - [x] Evaluator-parity leg: `altitude0 = AREAS[0].ceiling + 2` run → the sim's own tick-0 `'ascend'` equals the post-hoc `crossTicks` at default tunables (Decided 2's justification made executable).
  - [x] Sweep legs: scale invariance (`(K, ladder)` ≡ `(2K, 2×ladder)` → identical crossTicks — table-free); monotone ETA: lowering the ladder strictly shortens `summitEta` on the same trace; period sweep reports per-period climbRate and flags short periods where `invalidPhaseStep` would bite.
  - [x] `summitRate` leg: 3 seeds, same config run twice → identical results; shape pinned.
- [x] Task 3: rule-report + collision legs (AC: 3, 4)
  - [x] Per-card expected factors derived IN the test from the real `apply` closures (compose ×n over `freshEffects`, factor = `ropeMul × scoreMul`; peak factor = `floatMul^n`) — metadata, never a table (AGENTS.md). Assert measured climb within `|m − (factor − 1)| ≤ 0.05 + factor / baselineSkips` (count-quantization band: baseline is ~8 skips; this is what turns analytic +15% into measured ≈ −13% for Heavy Rope — expect quantization, not error) and peak within ±0.05 (float family) / ±0.02 (others, expected 0).
  - [x] `dominated` / `reduceClimb` / `neutralClimb` sets equal the sets computed in-test from the analytic factors + AXIS map (expected membership per Decided 8 — via derivation, not literals).
  - [x] Trip-honesty leg (Decided 7): every `trips: true` entry's tick count equals its run's trip tick; `cardRuleReport` entries carry the flag.
  - [x] Collision legs: harness empirical (20k, seeded, both picks) within ±0.015 of the EXACT rate computed in-test by enumerating ordered weighted draws (weights from `RARITY_WEIGHT`, recursion over `CARDS` — ~56 + 336 paths, ms); exact value must land ≈ 0.16/0.46 so the AC baseline is verified from primary math.
  - [x] AXIS-guard leg (Decided 3): every CARDS id mapped; same-axis cards share a touched effect field via the `apply`-diff probe.
- [x] Task 4: verification (AC: 2)
  - [x] `time node --test tests/` — green, < 10 s; record both numbers in the Debug Log. If added runtime exceeds ~1 s, cut sweep sizes (they are parameters) before touching anything else.
  - [x] Confirm `git diff --stat` touches ONLY the two new files + this story + sprint-status.

### Review Findings

Code review 2026-11-06 (Blind Hunter + Edge Case Hunter + Acceptance Auditor, all layers live; probes reproduced every claim below against the worktree).

- [x] [Review][Patch] `summitEta` extrapolation deviates from Decided 2's formula — numerator uses instantaneous `end.y` instead of the max swept peak (ETA shifts ~8 s per horizon-truncation tick), and the denominator `sweptAlt(end)/elapsed` folds seeded `altitude0` into the climb rate (probe: `altitude0: 100` → ETA 181 s vs documented-formula 1189 s, 6.6× optimistic). Fix: implement the documented formula verbatim — numerator `ladderTop − maxPeakEnd`, rate the score-delta velocity — applied, review round 2026-11-06 [tests/support/balance-harness.js:158-163]
- [x] [Review][Patch] `summitEta` is trip-unaware — a trace ending in a non-summit `'over'` still extrapolates a finite ETA for a dead run; now returns `Infinity` when the terminal tick is a trip (status visible in the trace, both accepted channels) — applied, review round 2026-11-06 [tests/support/balance-harness.js:158-166]
- [x] [Review][Patch] `evaluateLadder`/`ascentReport` threw TypeError on an empty trace (`ticks: 0`) — now the empty-view POJO (`crossTicks: []`, `winTick: null`, `summitEta: Infinity`, `climbRate: 0`, `reachedArea: 1`), invalid states as data — applied, review round 2026-11-06 [tests/support/balance-harness.js:136,155-156]
- [x] [Review][Patch] Silent NaN degenerate reports — contract leg now probes `cardRuleReport` at `ticks: 40` (≥1 skip, deltas finite), a horizon comment pins the ≥1-skip requirement, and `collisionReport` guards `draws: 0` → `rate: 0` (summitRate symmetry) — applied, review round 2026-11-06 [tests/support/balance-harness.js:209-212,267-277; tests/balance.test.js:48-77]
- [x] [Review][Patch] Trip-honesty tautology deleted; new red-green leg pins Decided 7 on a genuinely tripping config (`policy { lo: 2, hi: 2 }` never-jump bot → trips at tick 174, altitude > 0, no extrapolated ETA) — applied, review round 2026-11-06 [tests/balance.test.js:237-254]
- [x] [Review][Patch] AC5 seam now accepts `altPerPoint`/`ladder` on `summitRate`, routing per-seed win ticks through `evaluateLadder` (post-hoc-exact per Decided 2); dial-sweep leg proves winTicks move with K (174 → 170 at K 2 → 4 on `[10,20,40,80,100]`) — applied, review round 2026-11-06 [tests/support/balance-harness.js:282-295]
- [x] [Review][Patch] `terminalAlive` tightened to `winTick != null` — hand-assembled `{ trace }` objects no longer grant the terminal trip-tick ascend credit — applied, review round 2026-11-06 [tests/support/balance-harness.js:134]
- [x] [Review][Patch] `ascentReport` behavioral leg added: AC1 triad pinned at a real 1000-tick horizon (`altitudePerSkip === ALT_PER_POINT` exact, crossTicks/summitEta parity with evaluateLadder) — applied, review round 2026-11-06 [tests/balance.test.js]
- [x] [Review][Patch] Story-doc text fixed: Task 1 return-keys now list `invalidPhaseStep`; Decided 6 annotates the Wind-Up trip expectation with the offer-suppression resolution — applied, review round 2026-11-06 [this file:34,44]
- [x] [Review][Defer] Working tree bundles the planning-pass docs (`epics.md`, `gdd.md`, `decision-log.md`, `deferred-work.md`, research + change-proposal new files) with the story change set — Task 4's "touches ONLY" claim is true of the story's own set only; split the planning commit from the story commit at land time [_bmad-output/**] — deferred, pre-existing planning-pass changes
- [x] [Review][Defer] Evaluator iFrames parity is vacuous for crafted/multi-rope traces — the sim clamps non-finite iFrames to "gate open", the evaluator skips the tick; unreachable from `runBot` (single rope, startRun records only) [tests/support/balance-harness.js:134-141] — deferred, harness is single-rope by design
- [x] [Review][Defer] GDD/research wording: "rope count … measured linear at 1.00 / 1.97 / …" is sub-linear, and "highjump joins the peak axis" prose conflicts with the harness AXIS = first-effect-field contract — a launch-velocity card not writing `floatMul` breaks the AXIS-guard leg in Epic 3 [gdd.md, research-scarlet-skips-2026-11-06.md] — deferred to the Epic 3 axis work
- [x] [Review][Defer] `epics.md` AC quotes "47% at pick-of-3"; exact enumeration is 46.20% (test pins 0.46 ± 0.01, proposal's 46.8 was Monte-Carlo) — correct the AC number in the 6.4 docs-provenance pass [_bmad-output/planning-artifacts/epics.md:451] — deferred, provenance pass owns it

## Dev Notes

### The Design (decided — do not re-litigate)

- This is a measurement instrument, not a feature: no DOM, no shell, no render3d, no `index.html`/`package.json`/`js/*` change, no new deps. Node-only, `node:test` + `node:assert/strict`.
- The harness is the system's first `tests/support/` module and the Epic 6 reuse point (GDD:366-368 calibration gate; NFR9 master-dial). Favor an honest, complete API surface over cleverness — Stories 6.1/6.2 will call these functions unchanged.
- Post-hoc ladder/ALT evaluation is sound ONLY because ladder state never feeds physics (verified against `js/game.js:95-196`: the crossing loop reads `effects`, `buffer`, `iFrames`, `ropes`, `altitude`; the ascend block writes `area`/`baseAltitude`/`outcome` only). Rope period is the opposite — phase-coupled — re-simulate per value.
- The report is data. If a human-readable dump is wanted later, format from the returned objects; do not print in tests.

### Current state (verified 2026-11-06)

- `js/game.js`: `ALT_PER_POINT = 2` placeholder (:28), `AREAS` from `js/areas.js` (250/600/1000/1500/2100 placeholders), `leadIn()` :49-54 (phase 0.33, auto `jump(0.1)` — tick 0 is airborne, first pass ≈ 0.156 s; never assert grounded at t=0), ascend gate :170-196, offer cadence :129-137 with Pitfall 6 empty-pool path, `resumeRun` :60-62.
- `js/upgrades.js`: `CARDS` :1-28 (windup apply writes `ropeMul` then `scoreMul` :24; widebrim `windowMul` then `scoreMul` :27), `RARITY_WEIGHT` :34, `pickOffers` :47-62 = sequential weighted draw without replacement — the test's exact-enumeration relies on that equivalence.
- `tests/headless-sim.test.js`: the gate to mirror, DO NOT import from it (importing a `.test.js` registers its tests); copy the loop idiom :39-59, window :20-21, stackedToCap :120-124. Its cycles band [6,7] pins neutral physics; the cap-bound leg :143-154 keeps every capped ropeMul in [0.6, 1.5].
- Prior probes already ran this experiment ad hoc (`sprint-change-proposal-2026-11-06.md:173-176`): 20k seeded pickOffers + 1200-tick policy-bot window — this story industrializes those probes and retires them.
- Suite baseline: 271/271 green, 8.45 s wall (`node --test tests/`, 2026-11-06).

### Pitfalls

- Do not import anything from `tests/*.test.js`; do not edit any existing test file — frozen discipline, no authorized fences in this story (the diff must show zero existing-file changes).
- `tickRun`'s rng default parameter is `Math.random` and ARCH-02 greps js/ for it (tests/boundary.test.js:67) — always pass an explicit rng so the harness is deterministic by construction, and never need the Math.random arm.
- The trace gate fields are POST-tick `run.status`/`run.iFrames` — exactly the values tickRun's ascend condition saw (they equal its locals `status`/`iframesLeft`); using PRE-tick values silently diverges on strip ticks (i-frames arm) and offer ticks (`choose`).
- i-frame ticks score nothing but DO move the clock; the post-hoc evaluator consumes logged score, so it inherits this for free — do not "optimize" by replaying physics.
- `AREAS` is deep-frozen — copy ladder values out; never `AREAS[i].ceiling = ...` while sweeping.
- Quantization is the enemy of "expected = analytic": the change-proposal's ±13% Heavy Rope number is 7 passes vs 8, not −10%. Derive expectations with the quantization band (Task 3) or a non-power-of-two sweep will fail legs with no product bug (deferred-work.md:43).
- Wind-Up cap trips the fixed-hold bot (proposal:43). Widening the window to dodge it changes the measurement — report the trip instead (Decided 7).
- A crafted `area` outside 1..5 crashes the sim (`crossesCeiling` domain, deferred-work.md:48) — the harness only ever uses `startRun()` records; keep it that way.

### Project Structure Notes

- `tests/support/balance-harness.js` is the only new directory; it follows deferred-work.md:44's stated extraction direction. Test discovery (`node --test tests/`, Node ≥ 18) matches `*.test.js` only — verify the harness never appears as a test file in the runner output.
- Naming stays house-style: camelCase functions, `create*`-free (these are report factories returning fresh POJOs), UPPER_SNAKE constants (`AXIS`).

### Project Context Rules

- No project-context.md exists; binding rules come from AGENTS.md + architecture.md: pure-functional core untouched, rng injected as parameter, invalid states as data, frozen-test discipline with metadata-derived expectations, no npm deps, no build step, `node --test tests/` in under 10 s (NFR4).
- Three.js is irrelevant here — zero browser surface in this story.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.5 :430-454] — ACs verbatim; catalogue rules :93-94; NFR9 :81; NFR4 :76; technique :99
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-11-06.md :29-49, :105, :156-170] — the measured baselines this harness must reproduce; handoff success criteria
- [Source: _bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd.md#Progression and Balance :358-375] — calibration gate, altitude-per-skip as master economy knob
- [Source: js/game.js:95-196, :28, :49-66; js/areas.js; js/upgrades.js:1-62] — the substrate being measured
- [Source: tests/headless-sim.test.js:16-21, :39-84, :90-92, :120-124, :143-154] — technique, bands, cap idiom
- [Source: tests/catalogue.test.js:86-88] — owned-at-cap offer suppression idiom
- [Source: _bmad-output/implementation-artifacts/deferred-work.md :6, :43, :44] — blackout guard, float-equality artifact, tests/support direction
- [Source: _bmad-output/implementation-artifacts/2-4-win-loss-presentation-with-true-permadeath.md#Dev Notes] — house conventions, lead-in hop, wrapper pitfalls (background; this story uses no shell harness)

## Dev Agent Record

### Agent Model Used

lane-qwen38-ultra/qwen (omp agent session, 2026-11-06 — story creation and dev run)

### Debug Log References

- `time node --test tests/` 2026-11-06: **286/286 pass, 8.46 s wall** (baseline 271/271, 8.45 s — the 15 new legs add ~0 s, well under the ~1 s budget; `tests/balance.test.js` alone: 117 ms).
- Measured baselines (1200 ticks, STEP 1/120): neutral 8 skips / 16 u altitude / 113.5 u maxPeak / 6 phase wraps per 1000 ticks; per-card deltas match the proposal table (multi +100/+300, tally +15/+52, windup +125/+275, slowrope −12.5/−25, widebrim −25/−50, float peak +15.4/+76.8, feather peak +5.1/+28.3).
- Collision rates: exact weighted enumeration 16.25% (pick-of-2) / 46.20% (pick-of-3); seeded 20k empirical 16.5% / 46.4% — reproduces the proposal baseline 16.1/46.8 within the sampling band.
- Wind-Up at cap is **trip-free** on the offer-suppressed horizon (Decided 4): 10 skips, no trip inside 1200 ticks. The proposal's "tripped in window" (:43) came from choose freeze/lead-ins, which offer suppression removes. Reported `trips: false` per Decided 7 honesty; the trip-honesty leg stays parametric so a future trip is flagged automatically.
- Evaluator parity verified against live sim events: crafted `altitude0 = 252` → sim ascends {0} ≡ post-hoc crossTicks {0}; near-summit `altitude0 = 2000` → ascends {0,1,2,3} + win 174 ≡ post-hoc {0,1,2,3} + winTick 174.
- `git status`/`git diff --stat`: my change set = tests/support/balance-harness.js + tests/balance.test.js (both NEW) + this story + sprint-status.yaml. The M entries on deferred-work.md/epics.md/gdd.md/decision-log.md predate this run (the change-proposal pass); zero existing test files or `js/` files touched.
- Review round 2026-11-06 (three-layer code review): 9 patches applied — ETA extrapolation now Decided-2-verbatim (neutral ETA 1252 s = (2100 − 113.5)/1.6; the old level-rate formula was 6.6× optimistic at `altitude0: 100`), tripped traces extrapolate no ETA, empty-trace and zero-draw guards in, `summitRate` accepts the master dial (`altPerPoint`/`ladder`, routed post-hoc through `evaluateLadder`; dial-sweep leg winTicks 174 → 170 at K 2 → 4), trip-honesty tautology replaced by a red-green never-jump leg (trips at tick 174), ascentReport behavioral leg in. Suite **288/288 pass, 8.40 s wall**.

### Completion Notes List

- Harness lands entirely in `tests/support/`; production untouched, zero seams — altPerPoint/ladder evaluated post-hoc on the logged trace, rope period re-simulated per value (also after each `resumeRun` lead-in).
- `evaluateLadder` accepts a trace array or a runBot result; a terminal `'over'` tick is ascend-eligible only when the result's `winTick` proves that tick was the summit (mirrors the sim's trip > win exclusion at `js/game.js:185`).
- `cardRuleReport` peakDelta is the max-player-height ratio (the proposal's peak columns measure jump height; `maxPeak` in runBot results stays the ceiling quantity `altitude + y` used by ladder crossings).
- Rule report verdicts (measured = analytic derivation): dominated {feather→float, tally→multi, widebrim→window, slowrope→windup}; reduceClimb {slowrope, widebrim} — the two cards Story 3.x re-costs; neutralClimb {float, feather, window} listed, not violations. Gate evidence for FR11's legacy-8 freeze is this report.
- `summitRate({ seeds, ticks, altitude0, owned, pickStrategy, altPerPoint, ladder, ... })` is the Epic 6 seam — win ticks evaluated post-hoc, so one seeded run answers any (K, ladder) sweep: seeds [0,1,2] at {altitude0: 1980, ticks: 3000, cursor picks} → winTicks [1617, 1591, 1591], identical across repeats; Story 6.1 loops seeds/tunables over it unchanged (review-round fix: the dial knobs were previously accepted nowhere on this path).
- deferred-work.md:43 honored — the altitude-track leg asserts with tolerance, not the power-of-two exact equality.
- `tests/support/balance-harness.js` never appears in runner output (discovery matches `*.test.js`; suite count 271 → 286 = exactly the new legs).

### File List

- tests/support/balance-harness.js (NEW)
- tests/balance.test.js (NEW)
- _bmad-output/implementation-artifacts/2-5-ascent-economy-balance-harness.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-11-06: Implemented Story 2.5 — balance harness library + 15 balance legs; suite 286/286 green at 8.46 s; status ready-for-dev → review.
- 2026-11-06: Code review round (Blind Hunter + Edge Case Hunter + Acceptance Auditor): 0 decisions, 9 patches applied (ETA formula/trip-awareness/guards, summitRate dial seam, trip-honesty + ascentReport legs, doc text), 4 deferred, 7 dismissed — 288/288 green at 8.40 s; status review → done.
