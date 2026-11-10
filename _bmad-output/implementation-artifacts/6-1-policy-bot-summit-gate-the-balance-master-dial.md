---
baseline_commit: a40458b17d5f302cb06b45bd2fcc5e42381b77ab
---

# Story 6.1: Policy-bot summit gate — the balance master-dial

Status: ready-for-dev

*Ultimate context engine analysis completed — comprehensive developer guide created (2026-11-10).*

## Story

As the designer,
I want one deterministic number that says whether the game is winnable at the right pace,
so that every tuning debate ends with a measurement.

## Acceptance Criteria

1. **Policy-bot gate reports the dial.** Given the Story 2.5 harness extended with a defined policy bot (documented jump/hold/heuristic rules — see Decided 2), when the gate runs its seeded batch (Decided 7), then it reports summit reach rate (target band: 5–20%) and wall-clock run length (3–5 min summit target on a competent build) (NFR9). [epics.md:891-895]
2. **Deterministic and cheap.** Given the gate in `node --test tests/`, when the suite runs, then it is deterministic under seeded rng and the full suite stays green in under 10 s (NFR4). [epics.md:897-899]
3. **A failing gate is a tuning report.** Given an out-of-band result (e.g. 45% or 1% summit rate), when the gate fails, then the failure output identifies the measured rate and the tunable set that produced it — not just a red X. [epics.md:901-903]

**And** — per the ledger (embedded verbatim below): the gate's traces must be honest before the gate is a dial (evaluator iFrames parity, :104-105); the effects-records fold lands here (:134-136); the summit band is measured on rope-heavy AND charge-heavy builds (:92-94); determinism holds under the documented seed-sensitivity flake surface (:168-169).

### Decided interpretations (do not re-litigate)

1. **Zero production changes; the lane is `tests/support/`.** No `js/` edits — the sim is exactly what gets measured (`js/game.js:114` tickRun, `js/upgrades.js` CARDS, `js/areas.js` AREAS). Files: `tests/support/balance-harness.js` (UPDATE — a support module, not a fence: 3.2 precedent "support file, not a fence"), `tests/support/summit-gate.js` (NEW — the batch runner), `tests/summitgate.test.js` (NEW legs), plus the two sanctioned re-contracts R1/R2 in `tests/balance.test.js` (see Re-contract authorizations — nothing else in any existing file may change). No new exports from `balance-harness.js`: `tests/balance.test.js:49-52` pins its exact export list — if `summit-gate.js` were folded in there, that frozen leg reddens. Boundary fence: `tests/boundary.test.js` walks only `.test.js` entry points; support modules stay fence-invisible (2.5 precedent).
2. **The policy bot is defined here — this is the AC1 "documented jump/hold/heuristic rules".**
   - **Jump rule (N-rope generalization of the proven 2.5/1.x scripted jumper):** grounded && ∃ k ∈ 0..clampRopes(`run.ropes`)−1 with d_k = ((0.45 + k/N − phase) mod 1 + 1) mod 1 ∈ [0.45 − hi, 0.45 − lo], defaults lo = 0.20, hi = 0.35, hold = 0.5 s full-hold, honoring `effects.launchMul ?? 1` (the Story 3.2 idiom, `balance-harness.js` runBot loop). At N = 1 this predicate is EXACTLY `phase ∈ [0.20, 0.35]` — the existing scripted jumper, so every frozen leg's trace stays byte-identical. Prove equivalence in a leg (R-free): a test-local mirror loop with the legacy predicate → identical trace (see Tasks).
   - **Pick heuristic (defines "competent build"):** take `extrarope` when offered and live `run.ropes` < 3; otherwise the FIRST card of the offer (offer order comes from the real seeded `pickOffers` draw — deterministic, no peeking). Documented in `summit-gate.js` header; the heuristic is the ONLY competence assumption in the gate.
   - Resolution is always `applyCard` + `resumeRun` (ARCH-02, never `startRun` after a pick) — runBot already does this.
3. **runBot gains record-level state seeding + the N-window jump rule; both are default no-ops.** New config key `build = {}` applied as `run = { ...run, effects, owned, altitude: altitude0, ...build }` after `startRun()`: run-shaped state (ropes/charged/airJumps) lands on the RECORD where `tickRun` reads it (`game.js:146-164`), never in `run.effects`. The jump predicate reads `run.ropes` each tick through the same clamp the sim uses. Default `{}` + single rope = byte-identical to today (the existing runBot/config legs stay green; trace key set is pinned and must not change).
4. **iFrames parity fix (ledger :104-105).** `evaluateLadder`'s ascend gate currently reads `e.iFrames !== 0` — a non-finite `iFrames` (crafted trace) is treated as gate-CLOSED while `tickRun` (`game.js:140-146` FR3 block: `Number.isFinite(run.iFrames) ? Math.min(MAX_ROPES, Math.max(0, run.iFrames)) : 0`) treats it as gate-OPEN. Mirror the sim's read in the evaluator: closed iff the clamped finite read is > 0; non-finite → open. Finite behavior is byte-identical (all frozen parity legs are finite-only). Repro at baseline: `evaluateLadder([{tick:0, score:1, altitude:300, y:0, phase:0, status:'running', iFrames: Infinity}], { ladder:[10,20,40,80,100] })` → `winTick: null` TODAY; must become `0`. This matters now because the gate's rope-heavy traces go through real i-frames and crafted adversarial traces are a first-class evaluator input.
5. **The effects-records fold (ledger :134-136).** `cardRuleReport` currently composes every variant via `stackedEffects` (`balance-harness.js:218-222`) — for run-shaped cards (`card.shape === 'run'`: extrarope/reinforce/doublejump) `apply(effects)` leaks run fields into the effects record and the sim ignores them (measured deltas ≈ 0 — the documented 3.2/3.3 blind spot). Fold: for run-shaped cards compose against a fresh run record instead — `stackedRun(card, times)` = `card.apply` × times on a `startRun().run` record (record endofunction), installed through the new `build` seeding (extrarope: `{ ropes: clampRopes(1+times) }`, reinforce: `{ charged: times }`, doublejump: `{ airJumps: min(1, times) }` — mirror `patchedRun`'s clamps, `game.js:294-301`). Effects-shape cards keep the exact `stackedEffects` path (byte-identical numbers). The product-side `apply(freshEffects())` leak stays as-is — `tests/headless-sim.test.js:144-152` pins its shape-safety; the fold fixes the harness's USE of the idiom, not upgrades.js. Report key sets are unchanged.
6. **The live batch is a REPORT, not a band verdict — yet.** At the current PLACEHOLDER tunables the competent bot measures OUT of band (probe below: ≈ 38% > 20%). Asserting in-bandness today would redden the suite and violate AC2's "stays green"; Story 6.2 AC2 owns the in-band assertion ("the in-band result holds" after the retune). So: every gate leg asserts report STRUCTURE, determinism, verdict MECHANICS (verdict equals the in-test band comparison of the report's own rate), and the failure-report formatter on crafted out-of-band configs. ZERO literal current-build numbers anywhere in the new legs — no rate values, no win ticks — so the 6.2 retune never reddens a 6.1 leg (NFR5; the exact-equality trap deferred-work:55 warns about is the anti-pattern). The measured live-batch numbers go in the Debug Log as the sweep result Story 6.2 consumes.
7. **Batch definition (AC1's "seeded batch"):** shapes `bare {}`, `ropeHeavy { ropes: 5 }`, `chargeHeavy { charged: 2 }` (the extrarope/reinforce cap shapes per ledger :92-94) × seeds 0..39 (40 → rate granularity 2.5%) × horizon 43,200 ticks (360 s ≥ the 5-min wall-clock target + slack), `owned: {}` + pickStrategy = the Decided-2 heuristic (offers must FIRE — with `cappedOwned()` the rng never draws and seeds are vacuous: that is exactly the ledger :168 trap). Per shape the report carries: `runs[{seed, outcome: 'summit'|'tripped'|'horizon', endTick, seconds, picks}]`, `rate`, `medianRunSecs`, `medianSummitSecs`, `rngDraws`, `picksTally` (per card id), `terminalRopes` histogram — the pick/build-shape counters are the instrument 6.3 reuses without rework (its ACs ask for offer-frequency/pick-rate/build-shape instrumentation). `verdict` = `'in' | 'out-low' | 'out-high'` vs band [0.05, 0.20]; `tunables` echo pulled LIVE from records (`ALT_PER_POINT`, `AREAS.map(a => a.ceiling)`) — table-free.
8. **Budget.** Suite measured 548/548 at **8.61 s wall** at baseline → ~1.3 s headroom to NFR4's 10 s. Probe cost: a 43,200-tick run ≈ 5–30 ms (early terminal ends dominate); 24 long runs = 116 ms → the full 120-run batch ≈ 0.6 s projected. Gate leg budget ≤ 0.8 s. Measure `time node --test tests/` and record before/after in the Debug Log. If over budget: cut seeds 40 → 30 → 20 FIRST, horizon last, shapes NEVER (granularity is dial quality; coverage is ledger-mandated). Never accumulate traces across runs (120 traces ≈ 600 MB) — evaluate-then-drop each run.
9. **Owned-cap lifetime lock (:137-140) is measured, not changed, here.** The bot plays under shipped `isAvailable` semantics (a stripped build can be locked out of re-buying Spare Rope once `owned` hits cap). `picksTally` + `terminalRopes` make the lockout visible in the report; recovery-via-repurchase vs cap-as-lifetime-purchases stays the joint 6.1/6.3 decision it is stamped as ("wall accepted until 6.x") — no product change in this story; if the rope-heavy numbers show pathology, the verdict rides 6.3's verdict pattern with this report as evidence.
10. **`summitRate` stays untouched** (its frozen leg at `balance.test.js:171-188` pins its exact shape; it carries neither `build` nor run-length fields). The gate batch composes `runBot` + `evaluateLadder` directly in `summit-gate.js`.

## Ledger items embedded verbatim (the four confirmed 6.1 owners, deferred-work.md line cites)

**1. Evaluator iFrames parity (deferred-work.md:104-105) — fixed by Decided 4:**
> - **Evaluator iFrames parity is vacuous for crafted/multi-rope traces** (`tests/support/balance-harness.js` evaluateLadder vs `js/game.js:92`) — the sim clamps non-finite `iFrames` to "gate open", the evaluator skips the tick; unreachable from `runBot` (single rope, startRun records only). Revisit when a harness sweeps multi-rope traces.
>   - **OWNER: Story 6.1 CONFIRMED** (2026-11-10, per the pre-Epic-6 boundary check, user answer): the parity fix rides the policy-bot story (same `tests/support/balance-harness.js` lane as the effects-leak fold; the gate's traces must be honest before the gate is a dial).

**2. Run-shaped apply leaks run fields into the effects record (deferred-work.md:134-136) — folded by Decided 5:**
> - **Run-shaped apply leaks run fields into the effects record via the composition idiom** (`tests/support/balance-harness.js:218-222`, `stackedEffects`) — `extrarope.apply(effects)` yields `{…five keys, ropes: n+1}` installed as `run.effects`. Inert today: no consumer enumerates `run.effects` keys and `catalogue.test.js:31-33` deliberately skips run-shaped output. All three rule-changers now ride the same idiom (`charged` landed 3.3, `airJumps` landed 3.4 — `doublejump.apply(freshEffects())` adds the field, pinned by the rulecards.test.js run-shape leg); the pattern bit once already (`tests/pickflow.test.js:221-224`). Fold into the state-aware-composition decision when 6.1/6.3 revisits the harness.
>   - **OWNER: Story 6.1 CONFIRMED** (2026-11-10, per the pre-Epic-6 boundary check, user answer): SUPERSEDES the consolidation-chore assignment — that chore shipped (19a32ee) without carrying this item (its story bundle omitted it; recorded as a boundary triage miss, not a code defect). The effects-records fold lands in 6.1's create-story: the policy-bot gate is the first consumer that cannot tolerate skewed `cardRuleReport` numbers.

**3. extrarope dominance / rope-heavy + charge-heavy band (deferred-work.md:92-94) — measured by Decided 7's shapes:**
> - **`extrarope` is dominant by construction** (FR12 `epics.md:43`; the scored crossing loop `js/game.js:100-113`) — +1 rope adds a scored pass per revolution: measured 1.00 / 1.97 / 2.92 / 3.84 / 4.73 × climb rate at N = 1…5 and 3 → 17 offers per 45 s, so it is HP *and* the largest climb lever in the game, and it accelerates its own availability through the skip-keyed offer gate (first offer ≈ 1.85 revolutions at N = 5, :6). Confirmed intended 2026-11-06, so the counterweight is now explicitly Epic 6's: Story 6.1's summit band must be measured on rope-heavy builds, and the GDD's "offer frequency is the difficulty thermostat" (`gdd.md:229-231`) still has **no number and no owner**.
>   - Restated (Story 3.2, 2026-11-07): with `ropes` live, `cardRuleReport` still measures effects-injected runs, so `extrarope` reports effects-only (measured deltas ≈ 0 at pick and cap) — the report blind spot stands, and rope-heavy-build counterweighting remains owned by Story 6.1's summit band.
>   - Restated (Story 3.3, 2026-11-08): with `charged` live as well, `cardRuleReport` still measures effects-injected runs — run-shaped `reinforce` reports neutral (axis `charged`, `climbDelta` 0/0 at pick and cap, `trips: false`) — the report blind spot stands, and charge-heavy-build counterweighting is likewise owned by Story 6.1's summit band.

(The offer-frequency thermostat half of :92 is CARD-09 — owner Story 6.3. The GDD's "no number and no owner" stays true after this story; 6.1 ships the measurement instrument 6.3 points at.)

**4. Seed-sensitivity flake surface (deferred-work.md:168-169) — honored by Decided 8 + AC2 legs:**
> - **§5 ladderSim's seeded rng never actually draws** (`tests/arealadder.test.js` ladderSim, review 4.1 Edge LOW) — the scripted run covers ~9 skips in 1000 ticks (< the `% 10` offer gate, `js/upgrades.js:106`), so `pickOffers` is never reached and the `mulberry32` stream provably never advances: the legs pass identically under `Math.random`. Determinism itself holds (the sim is exact IEEE-754 arithmetic with no clock/rng reads outside `pickOffers` — Edge layer verified), so this is vacuous-coverage, not flake. Making it non-vacuous inside 4.1 means seeding `skips: 9` (or a longer window), which puts card draws and their pace effects INSIDE the invariant legs — balance-sensitive surface Epic 6 will re-tune, wrongly owned by a 4.1 gate leg. Story 4.5's seeded adversarial matrix owns the decision: seed near the cadence (accepting seed-sensitivity documented as a 6.x flake surface) or record the vacuity in-run.
>   - **DISPOSITIONED by Story 4.5 — both ways** (2026-11-08, `2c3e693`+): the new suite seeds near the cadence (`skips: 9`, offer gate fires INSIDE the invariant legs, rng draw counted — `tests/summitapproach.test.js` §2.2; seed-sensitivity rides to Epic 6 as the documented 6.x flake surface) AND the 4.1 vacuity is recorded in-run (that suite's header note; `tests/arealadder.test.js` byte-identical).

Consequence for this story: the batch's rng MUST draw (Decided 7: `owned: {}` + real offers — a `rngDraws > 0` leg makes seed-honesty structural), and no leg pins any outcome that a 6.2 constants retune can move (Decided 6's zero-literals rule). Seed-sensitivity is therefore admissible as data but never load-bearing as an assertion.

## Re-contract authorizations (written here, per the frozen-test discipline — AGENTS.md:52)

The fold (Decided 5) changes `cardRuleReport`'s run-shaped entries' measured numbers. THREE legs of `tests/balance.test.js` derive run-shaped expectations from the OLD effects-only convention and go red through no product bug (R1/R2 above, R3 below). Exactly these three legs are re-authorized; everything else in the file — including the export-surface leg, the `dominated` expectation block, and all other files — stays byte-identical, and the diff must show no other change.

- **R1 — `test('per-card climb and peak deltas land in the analytic band of the real closures', …)` (`balance.test.js:192-211`).** Authorized edit: the per-entry expectation computation branches on the `card.shape` marker. Effects-shape branch keeps the current `ropeMul × scoreMul` / `floatMul × launchMul²` analytic band VERBATIM. Run-shaped branch (marker-driven exemption, same declaration-driven idiom as the AXIS-guard leg's amendment at `:317-321`): `peakDelta` expected 0 ± 0.02 at both strengths (their apply writes no float/launch field — derived from the records' effect-field census), and `climbDeltaPick > 0.5` for `extrarope` at pick **and `climbDeltaCap > 0`** — the cap advantage stays strictly positive but is NOT ordered against the pick advantage: at cap (`ropes: 5`) the N-window bot is STRIPPED within the 1200-tick rule-report horizon (≈3 `ropeLost` events, finalRopes ≈ 2 — the dev round's measured read: pick ratio 2.0000×, cap ratio 1.2500×), so a `climbDeltaCap ≥ climbDeltaPick` monotone clause is false by shipped rope-economy physics (amended 2026-11-10, see Change Log); the strip law is recorded in the Debug Log and handed to 6.2's rope-economy retune, never asserted in the leg's ordering; `climbDelta` within ± 0.02 of 0 for `reinforce`/`doublejump` (their record fields change no climb axis and the 1200-tick horizon is trip-free — probe-verified); the `trips` flag stays surfaced as-is. No other line of this leg may change.
- **R2 — `test('dominated / reduceClimb / neutralClimb equal the analytic derivations', …)` (`balance.test.js:213-252`).** Authorized edits: the `neutralClimb` and `reduceClimb` EXPECTATION derivations branch on `card.shape`: for effects-shape cards the current analytic derivation is kept verbatim; for run-shaped cards the expectation is record-derived — neutral iff the apply touches no climb-axis effect field AND its record field ≠ `ropes` (⇒ predict neutral: reinforce/charged, doublejump/airJumps — trip-free horizons make charge/air value invisible), `extrarope` predicted NOT neutral (its field raises passes/revolution); reduceClimb predicted empty ∩ {reinforce, doublejump}, and for `extrarope` the leg asserts the consistency law `report.reduceClimb.includes('extrarope') === (report entry climbDeltaCap < 0)` instead of an analytic prediction. The `dominated` expectation block is NOT re-authorized and stays byte-identical (its verdicts are provably unchanged: the run-shaped axes `ropes`/`charged`/`airJumps` are axis singletons — no pair gains a comparator). Record in the Debug Log that `dominated` equals the pre-change set (`feather→float, tally→multi, widebrim→window, slowrope→windup`) both before and after the fold.
- **R3 — `test('trip honesty: tripped entries use their trip tick, never the full horizon (Decided 7)', …)` (`balance.test.js:325-341`).** This leg recomposes every report entry via the OLD `stackedEffects` idiom and asserts STRICT equality against it; for `extrarope` the honest fold reports `climbDeltaPick 1.0 / climbDeltaCap 0.25` while the effects-only recomposition yields `0/0` — red by the fold's own design (amended 2026-11-10, see Change Log; the STOP-2 dev-round finding). Authorized edit — the SAME surgical idiom as the pre-66-polish chore's R2 precedent (one `card.shape === 'run'` branch, oracles byte-identical): in the recomposition, branch on the `card.shape` marker so run-shaped variants recompose through record-side build seeding (a test-local mirror of the harness's `stackedRun`→`patchedRun` clamps — apply `card.apply` × n on a `startRun().run` record, clamp `ropes`/`charged`/`airJumps`, pass as `build`), while effects-shape cards keep the `stackedEffects` path VERBATIM. The leg's trip-tick/`elapsed` oracle (`run.altitude / elapsed / baseRate - 1`), the `trips` flag assertion, and every other line stay byte-identical.

## Tasks / Subtasks

- [ ] Task 1: `tests/support/balance-harness.js` — honest traces + fold (AC: 1, 2; ledger items 1-3)
  - [ ] `runBot`: add `build = {}` record seed (Decided 3) and the N-window jump predicate (Decided 2) reading `run.ropes` per tick; N=1 + empty build must keep every existing trace byte-identical. No new exports, trace/result key sets pinned.
  - [ ] `evaluateLadder`: iFrames gate mirrors tickRun's read (Decided 4). Baseline repro to beat: crafted `iFrames: Infinity` crossing trace currently `winTick: null`.
  - [ ] `cardRuleReport`: run-shaped variants via `stackedRun` + `build` seeding (Decided 5); effects path untouched; key sets pinned.
- [ ] Task 2: `tests/support/summit-gate.js` — NEW batch runner (AC: 1, 3)
  - [ ] `summitGate({ seeds = [0..39], horizon = 43200, shapes = { bare:{}, ropeHeavy:{ropes:5}, chargeHeavy:{charged:2} }, band = [0.05, 0.20] })` → per-shape reports per Decided 7 + `band`, `tunables` (live `ALT_PER_POINT` / `AREAS` ceilings). Pure Node; imports ONLY relative `../../js/*.js` + `./balance-harness.js`; seeded `mulberry32` only; POJO returns; no `console.*`.
  - [ ] Policy bot lives here (jump predicate + pick heuristic), composed through harness primitives; `rngDraws` counted via a counting rng wrapper (same wrapper idiom `headless-sim.test.js:99-104` uses for its rng-invoked leg).
  - [ ] `verdict` + `gateFailureReport(report)` → string naming measured rate %, band, and the producing `tunables` (AC3's tuning report; format is asserted by legs, never printed).
  - [ ] Evaluate-then-drop each trace (Decided 8 memory rule).
- [ ] Task 3: `tests/summitgate.test.js` — NEW legs (AC: 1, 2, 3)
  - [ ] Contract leg: `summit-gate.js` export surface + every report key set (`deepEqual` sorted keys) — factory contract, same change (AGENTS.md).
  - [ ] Live-batch legs: rate ∈ [0,1] and equals `summits/seeds`; every run outcome ∈ {summit, tripped, horizon}; `seconds === endTick × 1/120`; `verdict` equals an IN-TEST band comparison of `report.rate` (mechanism, not value); `tunables` deepEqual the live records; all three shapes present (ledger :92-94); `terminalRopes`/`picksTally` finite.
  - [ ] Determinism legs (AC2 + ledger :168): identical-config `summitGate` twice → `deepEqual`; per-run `rngDraws > 0` (seed-honesty — the batch is never the vacuous cappedOwned draw); seeds are literals in the test, rng never `Math.random`.
  - [ ] Out-of-band mechanism legs (AC3): crafted unreachable-ladder batch → rate 0.0 verdict `'out-low'`; crafted tiny-ladder near-summit batch → rate 1.0 `'out-high'`; `gateFailureReport` string contains the rate and the exact `altPerPoint`/ladder values that produced it; in-band crafted config (tiny ladder + near-summit start where the bot's physics wins on part of the seed set) → `'in'`.
  - [ ] Parity legs (ledger item 1): crafted `iFrames: Infinity` and `NaN` gate-open; crafted `iFrames: 2` still blank-blocked; multi-rope live parity: `runBot({ build: { ropes: 3 }, … })` trace vs a test-local raw-sim mirror loop recording the sim's OWN ascend ticks (copy `balance.test.js:28-44` `simAscentTicks` idiom — NEVER import a `.test.js`) → identical crossTicks at shipped tunables.
  - [ ] Fold legs (ledger item 2): `cardRuleReport` `extrarope` entries nonzero-climb / `reinforce`,`doublejump` neutral (mirrors R1's law); effects-shape entries unchanged bands (they're already pinned by the frozen leg — just confirm green).
  - [ ] Rope-window equivalence leg (Decided 2 safety): test-local mirror loop with the legacy `phase ∈ [0.20, 0.35]` predicate at ropes 1 → trace `deepEqual` runBot's.
- [ ] Task 4: Re-contracts R1/R2 in `tests/balance.test.js` EXACTLY as authorized; then verification (AC: 2)
  - [ ] `time node --test tests/` before/after — record both plus the live-batch measurement table (per-shape rate, medians) in the Debug Log: that table IS the sweep result Story 6.2 consumes (epics.md:913).
  - [ ] `git diff --stat` shows ONLY: `tests/support/balance-harness.js`, `tests/support/summit-gate.js` (NEW), `tests/summitgate.test.js` (NEW), `tests/balance.test.js` (R1/R2 legs only), this story, `sprint-status.yaml`. Zero `js/`, zero `index.html`/`package.json`/`.github/`.

## Dev Notes

### Current state (verified 2026-11-10 @ a40458b)

- Suite **548/548, 8.61 s wall** (`./run_tests.sh` = `node --test tests/`) — the <10 s budget is real headroom ~1.3 s.
- `tests/support/balance-harness.js`: `runBot` (:63-128) installs `effects/owned/altitude0` only; `evaluateLadder` (:145-201) gate `!alive || e.iFrames !== 0` (:156); `stackedEffects` (:218-222); `cardRuleReport` (:241-289); `summitRate` (:309-330, leave alone). `STEP = 1/120`.
- `js/game.js`: i-frames read at :140-146 (the parity reference); crossing loop `ropes` per k :164-173; ascend gate :263 (`status ∈ {running, choose} && iframesLeft === 0`, strict `>`); offer cadence + state-aware filter :192-204 (empty pool → stays 'running'); `patchedRun` :294-301 (the clamps `stackedRun` must mirror); `clampRopes/clampCharged/clampAirJumps` exported (:41-64).
- `js/upgrades.js`: run-shaped trio carry `shape: 'run'` (:37-49, caps 4/2/2); `isAvailable` owned-arm-before-stateCap wall (:66-71, ledger item :137-140 — measure, don't change); `pickOffers` sequential weighted draw.
- `tests/balance.test.js` frozen map: export list :49-52; runBot result/trace keysets :53-58; rule-report legs :192-252; summitRate leg :171-188; `simAscentTicks` mirror idiom :28-44; exact-enumeration twin :284-297.
- `tests/headless-sim.test.js`: the 1000-tick gate to mirror, never import; rng-counting idiom :99-104.

### Baseline measurements (story-creation probes @ a40458b — your kickoff numbers)

- Policy bot (Decided 2 rules), horizon 43,200 ticks, seeds 0..7, shapes bare/{ropes:5}/{charged:2}: **3/8 (38%) each shape** — all shapes OUT of band (HIGH) at placeholder tunables; run lengths 107–360 s; summit winTicks ≈ 34.0k (bare/rope-heavy), ≈ 28.3–33.0k (charge-heavy); 63 rng draws / 22 picks on seed 0 (seeds honest). Re-measure at 40 seeds in the Debug Log.
- Neutral offer-suppressed bot (2.5 default): no summit in 6 min, ETA 1251.6 s, reaches area 3 — the bare-economy dial reads ~21 min at tunables (2 u/pt × ladder 250…2100).
- Rope climb ratios at 1200 ticks, cardless build: N=2 → 2.000× trip-free; N=5 → 1.625× (the hold-0.5 bot gets stripped — the honest rope-heavy read, NOT the research ladder 3.84×; the GDD's 1.00/1.97/2.92/3.84/4.73 ladder was measured differently — quote the measured number, don't chase the ladder).
- Crafted Infinity-iFrames trace: `evaluateLadder` → `winTick: null` today (the parity bug to fix).

### Pitfalls

- `runBot` **breaks out of the loop at a `choose` without `pickStrategy`** (`:78-80`). A batch with `owned: {}` MUST pass the heuristic pickStrategy or every run freezes at the first offer — and with `cappedOwned()` the rng never draws at all (Decided 7's vacuity trap, ledger :168).
- Post-hoc ladder/ALT evaluation is linear-exact for altitude, but since Story 4.2 the AREA PERIOD feeds physics (`tickRun` :121-126 reads `run.area`'s `periodMul`): a swept ladder is post-hoc on traces whose area-pressure came from the SHIPPED ladder. At shipped tunables (this story) traces are fully honest; note it for 6.2 (after it edits `js/areas.js`, the batch re-run tracks the new ladder automatically — no harness plumbing).
- Don't "fix" the N-window rule into runBot's `policy` object as new keys on the frozen default — read `run.ropes` in the predicate; defaults stay `{ lo: 0.2, hi: 0.35, hold: 0.5 }`.
- `AREAS` is deep-frozen — copy values out for reports; never write during sweeps.
- Never import any `tests/*.test.js` (registers its tests); copy the `simAscentTicks`/rng-count idioms.
- Trace memory: report-per-run, drop the trace (Decided 8).
- Rope-heavy shapes trip — `trips`/i-frame blanks are the measurement (Decided 7 of 2.5 stands: report the trip, never widen the window to dodge it).

### Precedents to follow

- 2.5 story file: "Decided interpretations" style, `time node --test` Debug-Log discipline, budget-cut ladder.
- balance.test.js AXIS-guard amendment (:317-321): the marker-driven run-shaped exemption R1/R2 mirror.
- Chore pre-66-polish R2: re-contract wording "one insert, oracles byte-identical" — same surgical discipline, plus the diff-census habit (the census allow-set lives in `tests/harness.test.js` — check whether its fork-census/source-fence legs need the two new `tests/support/` paths appended; the porcelain arm is already live — if a census leg flags the new files, that's expected red to fix via the story-sanctioned allow-set append, written here: **appending `tests/support/summit-gate.js` and `tests/summitgate.test.js` paths where a census leg enumerates support/suite files is authorized**).
- 3.2/3.3 Task-check "throwaway script → paste" pattern for the rule-report numbers.

### AC → test mapping

| AC | Where |
|---|---|
| 1 report rate + wall-clock, policy bot defined | `summit-gate.js` batch + `summitgate.test.js` contract + live-batch + rope-window-equivalence + shape legs; Debug-Log measurement table |
| 2 determinism < 10 s, seeded | determinism + `rngDraws` legs; Debug-Log timing pair |
| 3 failing gate = tuning report | out-of-band mechanism legs + `gateFailureReport` content asserts |
| Ledger 1 (iFrames parity) | parity legs (crafted + multi-rope live crossTicks) |
| Ledger 2 (effects fold) | fold legs + R1/R2 re-contracted rule-report legs stay green |
| Ledger 3 (rope-heavy/charge-heavy band) | the three-shape batch + shape-presence legs |
| Ledger 4 (seed flake surface) | `rngDraws` seed-honesty leg + zero-literals rule (R-decisions Decided 6/8) |

### Project Structure Notes

- `tests/support/summit-gate.js` joins `balance-harness.js` as the second support module — same purity contract (Node-only, relative `../../js/` imports, POJOs, no IO). `tests/summitgate.test.js` mirrors module naming per AGENTS.md.
- No path collisions; `run_tests.sh`, CI, `package.json`, `index.html` untouched.

### Project Context Rules

- No project-context.md exists; binding rules from AGENTS.md + architecture.md: pure sim core untouched, rng injected (never `Math.random` — `boundary.test.js`/ARCH-02 greps for it), invalid states as data, frozen-test discipline with record-derived expectations (no hardcoded tables), zero new dependencies (NFR6), static-files-only, `node --test tests/` < 10 s (NFR4).
- Three.js/render surface: irrelevant here (zero browser surface).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.1 :885-903; Story 2.5 :433-457; Story 6.2 :905-921; Story 6.3 :923-939]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md :92-94, :104-105, :134-140, :161, :168-169, :221]
- [Source: _bmad-output/implementation-artifacts/2-5-ascent-economy-balance-harness.md] — Decided 1-9, the reuse seam, budget idiom
- [Source: _bmad-output/implementation-artifacts/3-2-…:62,79,114,124 and 3-3-…:77,79,144] — the blind-spot restatements this story pays
- [Source: tests/support/balance-harness.js, tests/balance.test.js, tests/headless-sim.test.js] — the seams being extended
- [Source: js/game.js:140-204, 263-301; js/upgrades.js:37-71; js/areas.js] — measured substrate
- [Source: _bmad-output/planning-artifacts/gdds/…/gdd.md :350-375, :171-198, :277-288] — calibration gate, rope-HP, run-length targets
- [Source: AGENTS.md Conventions] — frozen-test discipline + re-contract exception

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

- tests/support/balance-harness.js (UPDATE)
- tests/support/summit-gate.js (NEW)
- tests/summitgate.test.js (NEW)
- tests/balance.test.js (re-contracts R1/R2 only)
- _bmad-output/implementation-artifacts/6-1-policy-bot-summit-gate-the-balance-master-dial.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- tests/ceilingbreak.test.js (census allow-set append only — see Change Log)
- tests/summitapproach.test.js (census allow-set append only — see Change Log)

## Change Log

- 2026-11-10: Story created — full-artifact analysis, policy-bot design decided (N-window jump rule + documented heuristic), four CONFIRMED ledger owners embedded (iFrames parity, effects fold, rope/charge-heavy band, seed-honesty), fold re-contracts R1/R2 authorized, baseline probes recorded for the 6.2 handoff.
- 2026-11-10 (create round): Census allow-set appends AUTHORIZED in the create commit — this story's artifact path joins the `ceilingbreak.test.js` §6 and `summitapproach.test.js` §4.3 diff-census sets, list-only (the 71e03d5 retro precedent), because the porcelain arm flags new files at CREATE time (ledger :200-201, "red at CREATE"). No other existing-file change in this commit; every dev-round re-contract above stays the story's own work.
- 2026-11-10 (story-text amendment, pre-dev): R1's `extrarope` clause amended from `climbDeltaCap ≥ climbDeltaPick` to `climbDeltaCap > 0` + the recorded strip law — dev-round STOP evidence: at `ropes: 5` the hold-0.5 N-window bot strips itself to ≈2 ropes inside the 1200-tick horizon (measured pick +1.0000 vs cap +0.2500), so the monotone ordering is false under shipped sim physics; the honest-positive form keeps the leg non-vacuous and hands the strip law to 6.2. Decided 5's fold stands unchanged (the fold's whole purpose is the honest read). All other sections byte-identical.
- 2026-11-10 (story-text amendment 2, dev round): R3 authorized — the trip-honesty recomposition leg (`balance.test.js:325-341`) branches on `card.shape` (record-side build seeding for run-shaped cards, effects path verbatim otherwise), the third leg the fold reddens; the re-contract census (line 66) corrected from "two legs" to three. STOP-2 evidence: report `extrarope` pick 1.0/cap 0.25 vs effects-recomposition 0/0 → strict-equality red, unimplementable green without the branch; matches the pre-66-polish R2 one-insert/byte-identical-oracles precedent.
