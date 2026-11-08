---
baseline_commit: 34df600
---
# Story 4.2: Area pressure — rope period per tier

Status: review

Baseline: `34df600` (Story 4.1 done — `clampArea` shipped, `tests/arealadder.test.js` frozen, gate **367/367 green @ ~8.5 s**, tree clean, verified at authoring time 2026-11-08). Second story of the Ascent Ladder epic; it wires the `periodMul` column Story 2.2 shipped as dead placeholder data.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player who's reached the upper areas,
I want the rope itself to get meaner the higher I climb,
So that late areas stay tense without changing my picks.

## Acceptance Criteria

(verbatim from `_bmad-output/planning-artifacts/epics.md` §Epic 4, Story 4.2 — FR15, NFR8, FR23 base contract)

1. **Given** an area's period multiplier (placeholders ×1.0 / 0.96 / 0.92 / 0.88 / 0.85, marked for Epic 6 tuning) **When** effective rope period is computed **Then** it composes as current-area multiplier × owned rope-speed effects within the existing effects-endofunction pattern, with the same wrap-bound guarantees as `ropeMul` caps (FR15, NFR8)

   > NOTE (dev): the five multipliers ALREADY EXIST as `periodMul` on the `js/areas.js` rows (2.2 shipped them; `ascent.test.js:42-46` freezes the exact values). This story WIRES them — it writes no new multiplier data. The GDD flags the numbers as an assistant proposal awaiting tuning (`gdd.md:283-286`, `[ASSUMPTION]`; also `gdd.md:521`); Epic 6 owns rebalancing — pin the mechanism, derive every expectation from `AREAS` records, never pin a literal multiplier in a leg's assertion.

2. **Given** an ascent occurs mid-swing **When** the phase clock continues **Then** the phase value is preserved across the area change — pressure changes pace, never teleports the rope (NFR8)

3. **Given** reduced motion or pause/resume around an ascent **When** the state resumes **Then** shared handlers leave timing byte-identical; multipliers are pure sim-side data (FR23 base contract)

## Context

**What this story actually is.** The phase clock already runs the whole game (GDD principle 2, `gdd.md:104-108`: "The rope is the clock… area tuning expressed as rope-period multipliers"). Story 2.2 shipped the `periodMul` data and the `AREAS` ladder; 4.1 shipped the domain-healed `area` read (`clampArea`). What remains is ONE composition point in `tickRun`: the phase increment must pick up the current area's multiplier, and the D-N01 buffer decay must track it. Everything else — phase, records, handlers, renderer — is untouched BY DESIGN; the ACs are mostly *non-regression* pins ("preserved", "byte-identical", "never teleports").

**Current code (verified at `34df600`, 367/367 green):**

- `js/areas.js` (14 ln) — `AREAS`: five frozen rows `{ area, name, ceiling, periodMul, palette, fog }`; `periodMul` 1.00 / 0.96 / 0.92 / 0.88 / 0.85; file comment `:3-5` names "periodMul … wired by Stories 4.2". Pure data, no functions (architecture rule). **Untouched by this story.**
- `js/rope.js` — `createRope(period = 0.9)`; `updateRope(rope, dt)` computes `inc = dt / rope.period` and advances `phase` with a single-subtract wrap (`phase >= 1 ? (rope.phase - 1) + inc : phase`) — sound while `inc < 1`. Feet window `atFeetOffset` spans phase `0.45–0.55` (0.1 wide, constants `FEET_MIN`/`FEET_MAX` are NOT exported). **Untouched.**
- `js/game.js` (316 ln):
  - `ROPE_PERIOD = 1.3` (`:15`); `leadIn()` (`:88-91`) returns rope `{ phase: START_PHASE 0.33, period: ROPE_PERIOD }` — the rope record's period is CONSTANT for the whole run; `startRun`/`resumeRun` compose `leadIn` (`:96`, `:100`).
  - The ONLY phase-advance site: `tickRun` `:108` — `const nextRope = updateRope(rope, dt * run.effects.ropeMul);` — the shipped idiom is TIME-SCALED dt: `ropeMul > 1` speeds the rope; effective period = `rope.period / ropeMul`. Per-tick increment today: `dt × ropeMul / ROPE_PERIOD`.
  - D-N01 buffer decay `:123` — `Math.max(0, (run.buffer ?? 0) - dt * (run.effects.ropeMul ?? 1))`, comment `:119-122`: "the forgiveness buffer decays on the phase clock, so a rope-speed upgrade shortens the real-time window exactly as it shortens the period."
  - `let area = clampArea(run.area);` (`:115`, exported, 4.1) — clamped 1..`SUMMIT_AREA`; the area read lives AFTER the `updateRope` call, so today's increment never consults area. `nextRun` (`:266`) writes `area` back.
  - The ceiling evaluation (`:248-265`): one plain `if`, ascend branch writes `baseAltitude = AREAS[area-1].ceiling; area += 1; events.push('ascend')`. Peak `altitude + nextPlayer.y`; jump physics use real `dt` and `floatMul` only (`:109`) — altitude economy is phase-independent per skip.
  - `run.effects` per `freshEffects()` (`upgrades.js:61`): `{ floatMul, ropeMul, scoreMul, windowMul, launchMul }` — all 1. Note the asymmetry: `:108` reads `run.effects.ropeMul` RAW (a crafted record without the field yields NaN phase — shipped behavior); `:123` uses `?? 1`.
- `js/upgrades.js` — `ropeMul` is owned by cards ONLY: `windup` (×1.12, **cap 2**, `:22-26` — comment "cap 2 holds stacked ropeMul to 1.12² ≈ 1.25, five-fold inside the ≈15.6 feet-window blackout bound") and `slowrope` (×0.9, cap 3, slows). No new card in this story.
- `js/shell.js` — fixed `STEP = 1/120` (`:6`) drives `tickRun(run, rope, player, STEP, rng, press)` (`:647`); `revCount` counts wraps (`:649`). `js/render3d.js` poses from `lerpPhase(view.prevPhase, view.rope.phase, alpha)` (`:406`) — it NEVER reads `rope.period`, so a faster phase is automatically the faster-looking rope; no payload change is needed. **Both untouched.**

**Formula (the whole story in one line).** Per-tick phase increment becomes

```
inc = dt × effects.ropeMul / (ROPE_PERIOD × AREAS[area−1].periodMul)
```

implemented in the shipped time-scaled idiom as `updateRope(rope, dt * run.effects.ropeMul / periodMul)` — GDD's "period multiplier" composes on the PERIOD side (`period_eff = ROPE_PERIOD × periodMul / ropeMul`; summit base 1.3×0.85 = 1.105 s, matching `gdd.md:284-285`'s "≈ 1.10 s"), while `ropeMul` keeps its shipped speed semantics. Area 1's `periodMul` is exactly 1.00, and IEEE division by 1.0 is exact, so **the alley formula is bit-identical to today's** — the entire frozen suite's phase arithmetic is unchanged by construction (see Regression watch).

## Design (decided — do not re-litigate)

**D-a — Compose at the `tickRun` call site via an exported `areaPeriodMul(area)` helper.** `js/game.js` gains, beside `clampArea`:

```js
export function areaPeriodMul(area) {
  // Story 4.2 (FR15): the current area's rope-period multiplier, read
  // through clampArea — crafted/missing areas are data (row 1's 1.00 for
  // garbage, row 5's 0.85 for +Infinity), never a lookup throw.
  return AREAS[clampArea(area) - 1].periodMul;
}
```

`tickRun` hoists the single canonical `let area = clampArea(run.area);` ABOVE the rope step (pure read — no behavior change) and `:108` becomes `const nextRope = updateRope(rope, dt * run.effects.ropeMul / areaPeriodMul(area));` — write it as `(dt * run.effects.ropeMul) / periodMul` (left-associative) so area 1 is byte-identical to the shipped expression. Rationale for dt-scaling over the alternative (rewriting `rope.period` into the record): the rope record is reset by `leadIn` on every resume/pick-confirm (`:90`) — a period carried in the record would have to be re-derived by every shared handler (fork risk, AC3 violation waiting to happen); a multiplier derived from `run.area` + frozen `AREAS` rows needs zero handler cooperation. It also keeps `js/rope.js`, the view payload, and `render3d.js` at zero delta. `areas.js` stays function-free (helper lives in `game.js`, which already imports `AREAS`).

**D-b — The ascent tick uses the OLD area's multiplier (tick-start read).** The increment is computed once from the area value read at the top of `tickRun`; the ascend branch (if it fires later in the tick) changes `area` for the NEXT tick only. Rationale: one multiplier per tick is what keeps phase continuous (AC2 — no mid-tick re-clocking, NFR8 "nothing may re-clock it") and is precisely what keeps every frozen single-tick ascent leg in `tests/ascent.test.js`/`tests/arealadder.test.js` on its baseline phase arithmetic. No averaging, no cross-tick interpolation — do not invent either.

**D-c — The D-N01 buffer decay scales by the SAME factor.** `:123` becomes `Math.max(0, (run.buffer ?? 0) - (dt * (run.effects.ropeMul ?? 1)) / periodMul)` (keep the `?? 1` fallback exactly as shipped). Rationale: GDD principle 2 mandates "phase-clock buffer decay", and the `:119-122` comment states the invariant — the real-time forgiveness window shrinks exactly as the period shrinks. Decay ∝ phase increment keeps the buffer's span CONSTANT in phase (0.1/1.3 of a revolution) in EVERY area: upper areas stay tense without silently granting relatively MORE grace. Leaving decay unscaled would convert the buffer into a second clock — forbidden ("nothing may re-clock it"). Both sites must read the SAME `periodMul` value (one scalar per tick — the shared-handler doctrine applied to a multiplier).

**D-d — No new state anywhere.** No new effect key (`effects` stays the 5-key record — `upgrades.test.js:7` is a frozen deepEqual), no new run field (`altitude.test.js:48` freezes the key list), no new rope field (`leadIn`/`createRope` records unchanged — `ascent.test.js`/`startrun.test.js` idioms depend on it), no card changes, no view-payload change, no shell/renderer delta. Multipliers are pure sim-side data: the multiplier is COMPUTED per tick from `run.area`, never stored, so resume/applyCard/spreads cannot desync it (AC3 falls out for free).

**D-e — Wrap-bound guarantee, stated as a derived numeric pin (AC1 tail).** Worst-case phase speed from records: `ropeMul` max = ∏(caps of cards with ropeMul-up applied to `freshEffects()`) = 1.12² ≈ 1.2544 (derive from `CARDS`, not the literal); `periodMul` min = `Math.min(...AREAS.map(r => r.periodMul))` = 0.85. Worst per-tick increment at the shell's `STEP = 1/120`: `STEP × 1.2544 / (1.3 × 0.85) ≈ 0.00946` vs the 0.1-wide feet window → ≈ 10.6× margin (baseline is ≈ 15.6× per `upgrades.js:22-23`; the area stack spends ≈ 1/3 of the margin — still "five-fold inside" blackout, same guarantee class as the ropeMul cap). Increment < 1 also holds at the shell's dt ceiling (0.25 accumulator clamp → 0.37), so `updateRope`'s single-subtract wrap stays sound, and the ledger :6 rising-edge blind spot (increment ≥ window width) stays unreachable. The leg asserts the bound DERIVED (window width probed through `atFeetOffset`, cap product through `CARDS`, minimum through `AREAS`) so Epic 6 retunes can't silently eat it without turning the leg red.

**D-f — Altitude/score/jump economy is untouched.** Player physics stay real-time (`:109`); a faster clock means more skips per wall-second in the upper areas — that IS the pressure (GDD:107 "area pressure"; `gdd.md:363` ceiling-break pressure band). No compensation factor, no altitude scaling. Epic 6 tunes the multipliers if the climb rate over-delivers; this story ships the placeholders.

**D-g — AC3 is a non-change: pin it, don't build it.** Reduced motion never enters the sim (cosmetics only — architecture guardrail); `resumeRun`/pick-confirm resume through the shared handlers UNEDITED; because the multiplier is computed from `run.area`, a resumed run's next tick is bit-identical to the uninterrupted continuation from the same record. Leg: same crafted area-4 record + leadIn rope → tick vs. identical direct-sim tick → deepEqual. The run output's key set is unchanged (spread at `:266` untouched).

**What 4.2 is NOT (later-story territory — do not build here):** palettes/fog/horizon vistas, any `render3d.js`/payload delta (**4.3**); the ceiling-break presentation beat — hitstop/palette-flip/juice on `'ascend'` (**4.4**; audio stinger Epic 5); the i-frame interlock/banking pin, marker blocked-at-ceiling arm, `ceilingmarker.test.js:362` comment re-contract, summit-approach HUD mode (**4.5**; deferred-work :53-54/:60-61 are NOT this story's); multiplier retuning / placeholder retirement (**Epic 6**, Story 6.2). `js/areas.js`, `js/rope.js`, `js/shell.js`, `js/render3d.js`, `js/audio.js`, `index.html`, `package.json`, `run_tests.sh`: **untouched.**

## Deferred obligations (embedded verbatim per loop mandate)

**NONE owned by Story 4.2.** `deferred-work.md` was grepped for this story (`4.2`, `4-2`, `period`, `pressure`) and its Epic 3-close dispositions read in full: every open item names a different owner — `:50-51` PAID by 4.1, `:53-54` (i-frame deferral pin) and `:140` (`ceilingmarker.test.js:362` comment) and `:60-61` (marker blocked-at-ceiling arm) owned by **4.5**, `:13-19` ropeLost cue owned by **5.2**, `:44-46`/`:56-57`/`:105-107` the test-harness+CI chore, `:76`/`:112-114` Epic 6 (6.1/6.3), `:90`/`:118` 6.4, `:128` 6.2/UAT. No PAID/disposition note is due from this story. One item was checked as adjacent and needs no action here: ledger `:6` (rising-edge crossing blind spots) — the new worst-case increment 0.00946 stays ≈ 10.6× below the 0.1 window width (D-e), so the blind spot does not widen.

## Tasks / Subtasks

- [x] Task 1 (AC: 1, 2, 3): `js/game.js` — the composition (the ONLY product-code change)
  - [x] Export `areaPeriodMul(area)` per D-a beside `clampArea`; clampArea-routed, never throws.
  - [x] `tickRun`: hoist `let area = clampArea(run.area);` (with its 4.1 comment) above the `updateRope` line; `:108` gains `/ areaPeriodMul(area)` — left-associative, per D-a; `:123` buffer decay gains `/ periodMul` on the same scalar per D-c. Touch nothing else: gate, branches, `nextRun`, leads untouched (D-d/D-f/D-g).
- [x] Task 2 (AC: 1, 2, 3): NEW `tests/areapressure.test.js` — the pressure suite (red first). Expectations derive from `AREAS`/`CARDS`/`ROPE_PERIOD` records, never literals (house rule; Epic 6 will retune). Idioms to reuse: `tests/arealadder.test.js` (frozen — namespace-import + clampArea + scriptedRun patterns), `tests/ascent.test.js` single-tick rig, `tests/support/balance-harness.js` `mulberry32`. Legs per Test Plan §1–§6.
- [x] Task 3 (AC: 1–3): verification & hygiene
  - [x] Gate `./run_tests.sh` green: 367 baseline + new legs, suite < 10 s (NFR4; 1000-tick legs ≤ 3).
  - [x] `git diff tests/` shows EXACTLY one new file. Every existing test file byte-identical — **this story authorizes ZERO re-contracts**; a red existing leg means the implementation broke the identity (Regression watch below), full stop.
  - [x] `tests/boundary.test.js` green unmodified (no new import edges — the helper imports nothing new).
  - [x] Mutation matrix (§M) each turns a specific leg red; `js/game.js` sha256-restored after each mutant.
  - [x] Story Change Log + sprint-status flip ride the commit; no deferred-work edit is due.

## Test Plan (`tests/areapressure.test.js`, mutation-proven)

1. **`areaPeriodMul` contract:** rows 1..5 return the derived `AREAS` values (assert `=== AREAS[i-1].periodMul`, never literals); garbage areas route through `clampArea` — `0`/`NaN`/`'3'`/`undefined` → row 1's value, `SUMMIT_AREA+1`/`+Infinity` → row 5's, `2.5` → row 2's (trunc); never throws on any crafted input.
2. **Composition arithmetic (AC1):** scripted single ticks at each area (rig from `createRun` spread with `area` set + `altitude` parked under that row's ceiling so nothing ascends): `nextRope.phase − rope.phase` (mod-1) `===` the derived `STEP × effects.ropeMul / (ROPE_PERIOD × AREAS[a−1].periodMul)`; same rig with a record-multiplied effects from `windup.apply` (derived, not 1.12 literal) — both multipliers multiply, order-free equality; the AREA-1 + ropeMul 1 case asserts BIT-IDENTITY with the baseline expression `(STEP × 1) / ROPE_PERIOD` and a full scripted 1000-tick alley trace whose every phase equals the baseline recurrence (the frozen-suite-identity microcosm).
3. **Phase preservation across ascent (AC2, NFR8):** live ascending tick (ceiling − 30 rig per `ascent.test.js` idiom): the increment on the ascent tick equals the OLD-area formula (D-b); the NEXT tick's increment equals the NEW-area formula; `rope.phase` is never rewritten by the ascend branch (output rope record = pure `updateRope` result); across the whole scripted climb, consecutive phases satisfy `Δ mod 1 < feet-window width` every tick — no teleport, single-wrap monotonicity holds.
4. **Wrap-bound guarantee (AC1 tail, D-e):** derived worst case: max ropeMul = product of capped ropeMul-up card applications from `CARDS`; min periodMul from `AREAS`; assert `STEP × worst / ROPE_PERIOD < windowWidth` where `windowWidth` is probed via `atFeetOffset` sampling, and worst increment `< 1` at the shell's 0.25 dt bound (wrap soundness). Mutation-bait leg: a mutant periodMul or an ungoverned speed card makes it red.
5. **Buffer phase-invariance (D-c):** press-armed record at area 1 vs area 5 (area seeded just under a ceiling, NO ascent during decay): ticks-to-zero buffer differ by exactly the `periodMul` ratio in REAL time, but the phase span traversed while armed is identical across areas (within one increment) — grace is a constant fraction of a revolution everywhere. If the decay is left unscaled this inflates by 1/0.85 → mutant M4 red.
6. **Shared-handler identity + record shape (AC3):** (a) resumed run in area 4 — `resumeRun(record)` + leadIn rope → tick, deepEqual to the direct sim tick from the same record+rope (timing byte-identical; no period data to restore, D-d); (b) `Object.keys(tickRun(...).run)` equals `Object.keys(startRun().run)` — no new fields; (c) an ascent mid-swing followed by resume: next-tick increment equals the new-area formula (multiplier survived via `run.area` alone).
7. **1000-tick pressure witness (seeded, non-vacuity):** scripted jumper (`headless-sim.test.js:16-21` policy) with `preApply` altitude seeded just under row 1's ceiling, seeded rng; assert per tick the increment-from-records identity (per-area multiplier correct at every tick, including ticks AFTER ascents — the only place where the multiplier changes mid-run), end `area ≥ 2` (climbed for real), `altitude === ALT_PER_POINT × score` throughout (the frozen invariant survives pace changes). Keep to ≤ 2 such loops for the time budget.

**Mutation matrix:** M1 drop the `/ periodMul` at `:108` (identity rope) → §2/§3/§7 red. M2 multiply by `periodMul` instead of divide (rope slows up high — direction error) → §2 red. M3 read `periodMul` from the post-ascend area (teleport-style pace step on the ascent tick, contradicts D-b) → §3 red. M4 drop the `/ periodMul` at the buffer decay `:123` → §5 red. M5 unclamped `AREAS[run.area − 1]` lookup → §1 crafted legs red (TypeError returns). M6 off-by-one row (`AREAS[area]`) → §2 area rows red (area 1 already ≠ 1.00 unless the rows are equal). All mutants die on dedicated legs; restore `js/game.js` byte-identical after each (diff-verify).

## Dev Notes

### Files being modified — current state (read before editing)

- `js/game.js` (316 ln) — read `:88-123` and `:248-266` first. **Must preserve:** the 6-arg `tickRun` surface and output shape `{ run, rope, player, tripped, events }`; the `'ascend'`/`'win'` events on the D-N02 channel (consumers 4.4/5.1); `clampArea` + the clamp family; the raw `run.effects.ropeMul` read at `:108` (NaN-for-garbage is shipped behavior) vs `?? 1` at `:123`; the `nextRun` spread with zero new keys. Deltas: hoisted `area` read, two `/ periodMul` factors, one new export.
- `js/areas.js`, `js/rope.js`, `js/shell.js`, `js/render3d.js` — **read-only references**; do not edit. The renderer already inherits pace from phase (`render3d.js:406`).

### Regression watch (frozen-suite exposure — analyzed at authoring)

- **Area-1 legs (≈ all timing legs):** `fly()`/PARKED/FEET_EDGE rigs, i-frame legs, headless-sim + balance-harness bots (≤ 45 s windows stay under row 1's 250 u ceiling), v1parity — multiplier 1.00 → the dt expression is bit-identical (D-a left-associativity). Green by construction.
- **`ascent.test.js` single-tick rigs at area 2–5 (`:97-107`, `:247-256`, trip-vs-win `:222-236`):** with DT = 1/60 and rope period 0.9, the new increments 0.0218/0.96…0.85 all keep `phase 0.44 → [0.45, 0.55]` — the same skip/offer events as baseline fire, and the ascent itself is altitude-driven. Verified numerically at authoring; the frozen legs stay green. If ANY red appears, it contradicts this analysis — stop and diagnose the implementation, do not touch the frozen file.
- **`arealadder.test.js` §4/§5 (frozen by 4.1):** all asserts are area/baseAltitude/invariant-shaped (phase-independent); faster increments only make ascents land EARLIER — non-vacuity (`area ≥ 2`) strengthens, never inverts.
- 1000-tick budget: this suite adds ≤ 2 seeded loops; the gate budget is the acceptance line.

### Prior-story intelligence

- **Story 4.1** (`4-1-the-area-ladder-five-tiers-one-way-up.md`, done @ `34df600`): `clampArea` is exported — `areaPeriodMul` consumes it rather than re-clamping (the D-a one-read rule). Its D-f keeps the i-frame ceiling gate frozen for 4.5 — this story's tick-start area read must not reorder the ceiling evaluation or touch `iframesLeft`. Its review codas to carry: derive literals from `AREAS`/`SUMMIT_AREA` (reviewers killed hardcoded literals twice), pin non-vacuity explicitly, and its mutation-proven suite (`tests/arealadder.test.js`) is now a frozen fence — import the idioms, never the file's behavior expectations.
- **Story 3.5 clamp-era lesson:** "pin the arms, don't infer them" — §1's crafted-domain legs mirror that discipline for `areaPeriodMul`.
- **Git intelligence (last commits):** bundles ship code + one new test file + story/sprint flips in ONE commit; messages lead with the story number, cite the gate (`367/367 green @ ~8.5s`) and the frozen-file diff claim; ledger dispositions are written in-story. Commit style: `34df600` / `9ce943a`.

### Repo guardrails (AGENTS.md — binding)

- Frozen-test discipline: existing test files byte-identical; new behavior pinned ONLY by the new file; expectations derive from records/metadata, not hardcoded tables (extra binding here: Epic 6 retunes `periodMul` — a literal-multiplying leg becomes a false alarm waiting to happen).
- The phase clock is singular (NFR8 / GDD principle 2): no new accumulator, no new clock, no period data stored anywhere; the renderer never feeds the sim; `js/areas.js` stays function-free; sim purity fenced by `tests/boundary.test.js`.
- State is data, never thrown errors (hence the clampArea routing in D-a); one shared handler per concern (hoist THE ONE area read; both multiplier consumers read the same value); `camelCase`, named exports, `.js` extensions, 2-space indent, no `console.*` in pure modules; `package.json`/`index.html` frozen.

### Existing wheels to REUSE, not fork

- `clampArea` / `SUMMIT_AREA` (`js/game.js`) — the domain heal under `areaPeriodMul`.
- `AREAS` rows (`js/areas.js`) — the multiplier data + test derivation source (frozen shape by `ascent.test.js:38-60`).
- `atFeetOffset` (`js/rope.js`) — probe the feet-window width for the §4 bound (constants aren't exported; sampling is the wheel).
- `CARDS` (`js/upgrades.js`) — derive the worst-case `ropeMul` product (§4/D-e); `updateRope`/`createRope` (`js/rope.js`) — untouched arithmetic.
- `tests/headless-sim.test.js:16-21` scripted-jumper policy + `tests/support/balance-harness.js` `mulberry32` — the §7 rig (assert through the raw sim; the ladder-evaluation harness stays 4.5/6.1's wheel).
- `tests/arealadder.test.js` — structural idiom donor (namespace import, preApply seeding); frozen, edit-forbidden.

### Questions surfaced: NONE

Open design space fully resolved from artifacts: composition direction/semantics pinned by GDD's "summit base period ≈ 1.10 s" (= 1.3 × 0.85, period-side); tick-start vs ascent-tick multiplier pinned by NFR8 + the frozen-leg identity analysis; buffer coupling pinned by the D-N01 comment's stated invariant; numbers pre-existing in `AREAS` with the GDD `[ASSUMPTION]`/Epic 6 ownership restated. Record any implementation-time deviations in the Dev Agent Record.

## Dev Agent Record

### Agent Model Used

qwen (lane-qwen38-ultra/qwen, via omp worker)

### Debug Log References
- RED (pre-wiring, `node --test tests/areapressure.test.js`): area-1/alley legs green by construction (the identity claim holds), every area-2+ leg red on the missing factor — e.g. §7 tick 12 actual `0.41333333333333305` vs expected `0.41360042735042707` (the 1/0.96). Exactly the failure signature the Regression watch predicted.
- GREEN: `tests/areapressure.test.js` 20/20 @ 45 ms.
- Gate: `./run_tests.sh` **387/387 @ 8.49 s wall** (367 baseline + 20 new; < 10 s NFR4; the two 1000-tick loops run inside the 45 ms isolated-file total).
- Mutation matrix (mutate → new suite → sha256-restore `js/game.js`; runner fail counts): M1 12 red (§2/§3/§5/§7), M2 12 red (§2 and onward — direction error propagates), M3 5 red (§3 all four rungs + §7 ascent tick), M4 1 red (§5), M5 1 red (§1 crafted), M6 17 red (§1/§2 — every rung incl. the alley). All six died on the dedicated legs; `js/game.js` restored byte-identical after each round.

### Completion Notes List
- Design D-a…D-g implemented verbatim; product delta is `js/game.js` +16/−5 only. AC1: one tick-start `periodMul` scalar composes into the phase step and the D-N01 decay; wrap bound pinned from `CARDS`/`AREAS` records (worst step 0.00946 ≪ probed 0.1 window; 0.284 < 1 at the shell's 0.25 dt cap). AC2: ascent tick clocks on the OLD multiplier, next tick on the NEW, asserted bit-wise per rung and per tick through a seeded 1000-tick climb. AC3: zero state added — resume ≡ direct-sim `deepEqual`, run key set unchanged.
- Zero re-contracts: `git diff tests/` empty of existing files; all 367 frozen legs green untouched.
- Friction (none blocking): (1) Test Plan §2's "order-free equality" is pinned as an ulp-level grouping-commutativity assertion plus a bit-exact assert in the shipped left-associative idiom — IEEE bit-equality across different groupings is not achievable, so a bit assert on both groupings would be a flake waiting to happen. (2) M1 also reddens §5 beyond the matrix's stated §2/§3/§7 — harmless overkill, the decay reads the same scalar. (3) §3's "whole scripted climb" no-teleport monotonicity rides the §7 loop (every tick asserts `inc < WINDOW_WIDTH`) to honor the ≤2 1000-tick-loop budget.

### File List
- `js/game.js` — modified: `areaPeriodMul` export + `tickRun` wiring (the only product-code change)
- `tests/areapressure.test.js` — new: 20-leg pressure suite (§1–§7, mutation-proven)
- `_bmad-output/implementation-artifacts/4-2-area-pressure-rope-period-per-tier.md` — this story file (records + status)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 4-2 ready-for-dev → in-progress → review

## Change Log

- 2026-11-08 — Story created (Epic 4 autopilot, `gds-create-story` at baseline `34df600`): ACs verbatim from epics.md §Story 4.2; ledger checked — no items owned by 4.2 (explicit in Deferred obligations); design decided D-a…D-g (dt-scaled composition, tick-start multiplier, phase-clock buffer coupling, derived wrap-bound pin); regression analysis of every area-2+ frozen leg. Ultimate context engine analysis completed - comprehensive developer guide created.
- 2026-11-08 — Implemented via `gds-dev-story` at baseline `34df600`: `areaPeriodMul` + tick-start `periodMul` wiring in `tickRun`, `tests/areapressure.test.js` (20 legs, red-green), mutation matrix M1–M6 all killed, gate 387/387 @ ~8.5 s. Zero existing files touched. Status → review.
