---
baseline_commit: a770a2d
---
# Story 4.1: The area ladder — five tiers, one-way up

Status: review
Baseline: `a770a2d` (Epic 4 entry probe — epics 1–3 done, gate **349/349 green @ ~8.5 s**, tree clean, verified at authoring time 2026-11-08). First story of the Ascent Ladder epic; it formalizes and hardens the ascent machinery Story 2.2 already shipped.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a climber,
I want the run to be structured as five distinct altitudes I punch through,
So that the ascent has geography and pacing, not just a number.

## Acceptance Criteria

(verbatim from `_bmad-output/planning-artifacts/epics.md` §Epic 4, Story 4.1 — FR6, FR9, NFR4, NFR5)

1. **Given** the area table (Alley 0 → Rooftops 250 → Blimp Deck 600 → Stratosphere 1,000 → Moon Approach 1,500; summit ceiling 2,100 — placeholder tunables owned by Epic 6) **When** `tickRun` processes a peak crossing per Story 2.2 **Then** the run ascends exactly one area per crossing, area index and base altitude update as data, and ascent is strictly one-way with a run visiting at most 5 areas (FR6, FR9)

   > NOTE (dev): the list above names BASE altitudes (Alley base 0, Rooftops base 250, …) while `js/areas.js` rows store each area's ENDING `ceiling` (row n's `ceiling` = row n+1's base; row 5's ceiling 2,100 = the summit win ceiling). Both describe the same ladder; `AREAS` records are the authority and all test expectations derive from them, never this prose.

2. **Given** a multi-rope run whose simultaneous peaks straddle a ceiling in one tick **When** ascent resolves **Then** the run ascends once, not twice — ascent is idempotent within a tick regardless of rope count (FR9)

3. **Given** any sequence of sim transitions **When** area index is inspected **Then** it never decreases and never exceeds the summit tier — out-of-range values are invalid-state data (FR9)

4. **And** seeded headless runs assert the area monotonicity invariant across the 1000-tick gate (NFR4, NFR5)

## Context

**What this story actually is.** Story 2.2 shipped the *mechanism* (peak check, `AREAS`, `crossesCeiling`, the ascent branch that writes `area`/`baseAltitude` + `'ascend'`, the summit-win branch) and explicitly deferred the *invariant* to 4.1: "No clamp on `area` (only `+1`/`1..5` reachable by construction; **4.1 pins monotonicity later**)" (2-2 story file, Task 2; the Review Findings defer at its line 73 names this story as owner). The deferred-work ledger (:50-51, embedded verbatim below) adds the second half: the **domain heal** — crafted out-of-range/typed `area` values must become valid data instead of throwing. So 4.1's sim delta is ONE small hardening change (`clampArea` at the record read site); the substance is the invariant-pin test suite that makes one-way ascent falsifiable forever. The epics' groundwork clause (epics.md:381) demands 4.1 NOT change 2.2's shipped contract.

**Current code (verified at `a770a2d`, 349/349 green):**

- `js/areas.js` (14 ln) — `AREAS`: five frozen rows `{ area, name, ceiling, periodMul, palette, fog }`, ceilings 250/600/1000/1500/2100. Pure data, imports nothing, NO functions (architecture rule; the file's own comment header says so). `periodMul`/`palette`/`fog` are unwired placeholders owned by 4.2/4.3/6. **This story does not touch it.**
- `js/game.js` (301 ln) — the sim core:
  - `SUMMIT_AREA = AREAS.length` (`:39`); clamp family `clampRopes` `:41-47`, `clampCharged` `:49-56`, `clampAirJumps` `:58-64`.
  - `crossesCeiling(peakAltitude, area)` (`:68-70`) — `return peakAltitude > AREAS[area - 1].ceiling;` strict `>` (2.2 AC5). **Unguarded**: on `area: 0 / 6 / NaN / fractional` the `AREAS[...]` lookup yields `undefined` and `.ceiling` throws TypeError; on `area: '3'`, `area - 1` coerces (works once) then `area += 1` string-concats to `'31'` and the NEXT tick throws. Verified by reading `:68-70` + the branch at `:234-249` — matches the ledger entry below (whose `js/game.js:41` cite has drifted; the predicate now lives at `:68`).
  - `createRun()` (`:89-91`) — carries `area: 1, baseAltitude: 0, outcome: null`. Unchanged by this story (frozen leg `tests/ascent.test.js:64`).
  - `tickRun()` (`:93-260`) — the area read/heal is `let area = run.area ?? 1;` (`:100`, the `??` idiom covers MISSING keys only — that's the ledger gap); `baseAltitude`/`outcome` heals `:101-102`; i-frames `:117`; crossings loop `:136-226`; the ONE ceiling evaluation `:227-250`: `const peak = altitude + nextPlayer.y;` then one plain `if` (comment `:229`: "never a `while` (Story 4.1's one-ascend interlock)") gated `(running || choose) && iframesLeft === 0 && crossesCeiling(peak, area)` → summit branch (`area === SUMMIT_AREA`: over + outcome 'summit', offer splice, 'win' event) else ascend branch (`baseAltitude = AREAS[area - 1].ceiling; area += 1; events.push('ascend')`). `nextRun` spread `:251` writes `area` back.
  - The gate `&&` short-circuits, so a crafted `area: 0` throws only on a live, non-i-frame tick whose evaluation is reached — production runs are unreachable-from-production (only 1..5 are ever written: `createRun` and `+= 1` from a clamped-started ladder).
- `js/shell.js` `markerLine` (`:551-558`) — the DISPLAY-side mirror: clamps `run.area` at read (`Math.min(Math.max(Math.round(...), 1), AREAS.length)`) with the comment "crafted out-of-domain areas are data, clamped at read like clampRopes". It already assumes the doctrine this story adds sim-side. **Untouched** (pinned by `tests/ceilingmarker.test.js`).

## Design (decided — do not re-litigate)

**D-a — `clampArea`, exported, applied at the tickRun read site.** `js/game.js` gains, next to the clamp family:

```js
export const MIN_AREA = 1;

export function clampArea(area) {
  // The clampRopes/clampCharged arms mirrored: +Infinity is "the top of the
  // ladder" -> the summit tier; NaN/nullish/strings -> the alley. Fractions
  // truncate like every sibling clamp.
  const n = Number.isFinite(area) ? Math.trunc(area)
    : area === Infinity ? SUMMIT_AREA : MIN_AREA;
  return Math.min(SUMMIT_AREA, Math.max(MIN_AREA, n));
}
```

and `tickRun`'s `let area = run.area ?? 1;` (`:100`) becomes `let area = clampArea(run.area);` — `clampArea(undefined/nullish)` lands on `MIN_AREA = 1`, so the hand-built-record heal (`tests/uxpolish.test.js` wrapper, `tests/ascent.test.js:159`) survives with zero behavior change. Cap reuses `SUMMIT_AREA` (`= AREAS.length`, derived — no second hardcoded 5). Writing the clamped local back through `nextRun` heals crafted records by construction, exactly like the trip path's rope-count write (`:199-211` doctrine). `crossesCeiling` then only ever receives 1..5 from the sim — and the predicate ITSELF stays unguarded (decision: guarding the predicate too is redundant; the module heals RECORDS at tick boundaries, public predicates stay pure and simple; the frozen `tests/ascent.test.js:71` legs call it with valid rows only).

**D-b — Edge semantics are DECIDED and pinned (3.5's lesson: an Infinity arm is a per-clamp decision, never inherited).** `clampArea` carries the `+Infinity → SUMMIT_AREA` arm (mirrors `clampRopes`/`clampCharged` counters, where the cap is meaningful — unlike `clampAirJumps`, whose no-arm choice is frozen by `secondwind.test.js:37`). Consequences, each pinned by legs: `6`/`AREAS.length+1`/`+Infinity` → 5 (a crafted top-of-ladder record then behaves as a summit-tier run — wins past 2 100 u instead of throwing); `-Infinity`/`0`/`-3`/`NaN`/`null`/`undefined` → 1; strings (`'3'`) → 1 (garbage, not parseable data — same choice as `clampRopes('3') → MIN_ROPES`; this is what kills the string-concat corruption class); fractions truncate (`3.7 → 3`, `5.9 → 5`, `0.4 → 1`).

**D-c — Never-throw is the contract.** AC3's "invalid-state data" plus AGENTS.md's "state is data, never thrown errors": a `tickRun` on ANY crafted record returns a valid record — no TypeError escapes, on live ticks and on ticks where the gate short-circuits alike. The `??`-heal-repairs-missing-only gap the ledger names is exactly what this pays.

**D-d — Idempotency & the one-per-tick ceiling.** The shipped plain `if` outside the crossings loop (`:234`) already makes ascent idempotent per tick regardless of rope count (AC2: N simultaneous straddling peaks = ONE `+1`) — this story PINS it with legs; code untouched. One plain `if`, NEVER a `while`, is a HARD constraint: with it, even a crafted record whose peak straddles TWO ceilings in one tick ("staircase": seeded `altitude` past row 2's ceiling while `area: 1`) ascends exactly one area per tick and staircases up over subsequent ticks — non-decreasing, one step at a time. 4.5's adversarial matrix re-pins the richer cases (i-frame ascents, mercy-decay ascents); 4.1 owns the ≤1-increment-per-tick and monotonicity pins.

**D-e — Monotonicity is structural + pinned.** Production writers of `area`: `createRun` (1), the tickRun read (clamped), the summit branch (leaves it 5), and `+ 1` (guarded by the `area === SUMMIT_AREA` win branch). Hence: integer, 1..`SUMMIT_AREA`, never decreases; "a run visits at most 5 areas" means `area` ∈ 1..5 forever — the 5th ceiling BREAK WINS (`outcome: 'summit'`) instead of incrementing to a 6th area, so the terminal record of a won run is `area: 5, status: 'over'`. `baseAltitude` is never clamped (it is never READ by sim logic — derived on ascend from valid rows; clamping it would be invented scope; record field semantics belong to the 2.2 contract). A crafted value SURVIVES `applyCard`/`resumeRun` (pure spreads) and is healed at the next `tickRun` — pin that, don't "fix" it.

**D-f — The i-frame gate stays EXACTLY as shipped.** `iframesLeft === 0` on the ceiling check (2.2, `:234`) and the level-triggered re-fire semantics are 4.5's interlock territory (deferred-work.md:53-54 banks THAT deferral for 4.5, verbatim — not this story's to embed or change). No banking, no queueing, no gate edits.

**What 4.1 is NOT (later-story territory — do not build here):** area pressure / `periodMul` in any rope-rate chain and phase preservation across ascent (**4.2**); palettes/fog/horizon vistas in `render3d.js` + view payload (**4.3**); the ceiling-break presentation beat — hitstop/palette-flip/juice (**4.4**; its audio stinger is Epic 5); summit-approach marker win-mode, the i-frame interlock/banking pin, and the marker blocked-at-ceiling arm deferred-work.md:60-61 (**4.5**); ladder numbers / period multipliers rebalance (**Epic 6**). `index.html`, `package.json`, `run_tests.sh`, view payload shape, `js/shell.js`, `js/render3d.js`, `js/areas.js`, `js/audio.js`: **untouched.**

## Deferred obligations (embedded verbatim per loop mandate)

From `_bmad-output/implementation-artifacts/deferred-work.md:50-51` (code review of Story 2.2; **OWNER CONFIRMED at Epic 3 close**) — quoted verbatim:

> - **`crossesCeiling` has no domain guard for a crafted out-of-range/typed `area`** (`js/game.js:41`) — `AREAS[area - 1].ceiling` throws TypeError on `area: 0/6/NaN/fractional` and string-concat-corrupts on `area: '3'`; the `??` heal repairs only missing keys. Diverges from the module's own hardening doctrine (`clampRopes`, the i-frames non-finite arm). Spec-sanctioned (story Task 2: "No clamp on `area`") and unreachable from production writers (only 1..5 are ever written). Story 4.1's monotonicity pin should also pin the domain — or add the clamp there.
>   - **OWNER CONFIRMED at Epic 3 close** (2026-11-08): Story 4.1's create-story MUST embed this item verbatim (monotonicity pin + domain pin/clamp).

**Disposition: Story 4.1 resolves this item.** Chosen branch of the "pin or clamp" fork: the **clamp** (D-a) at the record read site, plus the monotonicity pins (Task 2/3 legs) — doctrine-consistent ("invalid states are data"), it makes the ledger's throw/corruption class impossible rather than merely unreached. Line-cite drift verified at authoring: the ledger's `js/game.js:41` points at today's `clampRopes`; `crossesCeiling` is at `js/game.js:68` and the heal site at `:100`. Dev note: mark this ledger entry PAID in the change set (same pattern as 3.5's `clampAirJumps` PAID note).

## Tasks / Subtasks

- [x] Task 1 (AC: 1, 3): `js/game.js` — the domain heal (the ONLY product-code change)
  - [x] Export `MIN_AREA = 1` + `clampArea` beside the clamp family (`:41-64` block), per D-a/D-b — cap is `SUMMIT_AREA` (`:39`, already exported), arms mirrored from `clampRopes` incl. the `+Infinity` arm; comment cites the doctrine.
  - [x] `tickRun` `:100`: `let area = clampArea(run.area);` — replaces the `?? 1` (which D-a proves subsumed). Leave `baseAltitude`/`outcome` heals, `crossesCeiling`, the gate, both branches, `nextRun`, and the summit branch EXACTLY as-is (D-c/D-f).
  - [x] Add `clampArea` to `js/game.js`'s exports; nothing else imports it (shell/renderer stay out — D-f scope fence).
- [x] Task 2 (AC: 1, 2, 3): NEW `tests/arealadder.test.js` — the invariant suite (red first). All expectations derive from `AREAS` records + `SUMMIT_AREA`/`ALT_PER_POINT` — never a hardcoded ladder table (house rule). Rig idioms: `tests/startrun.test.js:20` (seeded `createRun` spread), `tests/ascent.test.js` hand-built records + phase scripting, namespace-import idiom (`tests/headless-sim.test.js:9`). Legs per Test Plan §1–§4.
- [x] Task 3 (AC: 4): seeded 1000-tick monotonicity legs (same file, §5) — `scriptedRun` technique with `preApply` altitude seeded just under a derived ceiling so ascents actually occur inside the window; seeded rng injected (NFR4 determinism; never the default `Math.random`).
- [x] Task 4 (AC: 1–4): verification & hygiene
  - [x] `./run_tests.sh` green: 349 + new legs, suite < 10 s (NFR4; budget the tick loops — keep 1000-tick legs ≤ 3).
  - [x] `git diff tests/` shows EXACTLY one new file: `tests/arealadder.test.js`. Every existing test file byte-identical — NO re-contract is authorized by this story. `tests/boundary.test.js` passes unmodified (no new imports enter the sim graph).
  - [x] Mutation matrix (§M) each turns a specific leg red; restore `js/game.js` byte-identical after each mutant.
  - [x] Mark the deferred-work.md:50-51 entry PAID (disposition note); story Change Log + sprint-status flips ride the commit.

## Test Plan (`tests/arealadder.test.js`, mutation-proven)

1. **`clampArea` contract (Node-side):** identity on 1..`AREAS.length`; `0 / -3 / NaN / null / undefined / '3' / 'x' / -Infinity` → `MIN_AREA`; `6 / AREAS.length + 1 / +Infinity` → `AREAS.length` (assert `=== SUMMIT_AREA`); `3.7 → 3`, `5.9 → 5`, `0.4 → 1` (trunc + min-clamp arms). Mutants: M2 (drop Infinity arm) and M3 (drop `Math.trunc`) kill specific legs here.
2. **Domain heal through `tickRun` (never-throw, AC3):** for each crafted `area` in {`0`, `AREAS.length + 1`, `NaN`, `2.5`, `'3'`, `undefined`}: a scripted LIVE crossing tick `assert.doesNotThrow`s and the returned record has an integer `area` in [1, `AREAS.length`] — `'3'` lands on 1 (garbage→alley, D-b) and `'31'`-corruption is impossible; `{ area: AREAS.length + 1 }` with a peak past the summit ceiling WINS (valid summit-tier data, D-b) rather than throwing; same crafted set on gate-short-circuit ticks (dead / i-framed) also returns cleanly.
3. **Write-back heal + spread-survival (AC3):** crafted record → one live tick → `nextRun.area` clamped; crafted `area: 6` record through `applyCard` + `resumeRun` keeps 6 (pure spreads, D-e), then the next `tickRun` heals to 5 — pin both halves.
4. **Idempotency & one-per-tick (AC1, AC2):** 5-rope simultaneous-peak rig straddling a derived ceiling in one tick → `area` +1 exactly, ONE `'ascend'` event, `baseAltitude === AREAS[old-1].ceiling` (extends 2.2's rope-count rig with the event-count pin); staircase rig (crafted `altitude = AREAS[1].ceiling − 20` with `area: 1`, airborne over a feet window) → exactly ONE increment that tick (2→ not 3; `baseAltitude` = row 1's ceiling), then staircases one step/tick while the peak straddles — monotone throughout. Mutant M4 (`while` instead of `if`) dies here.
5. **Seeded 1000-tick monotonicity (AC4):** scripted jumper (window 0.2–0.35, hold 0.5 — the `headless-sim.test.js:16-21` policy) with `preApply` seeding `altitude` just below `AREAS[0].ceiling` (and a variant below row 2's, for multi-crossing coverage) and seeded rng (`mulberry32` from `tests/support/balance-harness.js` or the `() => 0.5` stub — deterministic either way). Per tick assert: `Number.isInteger(run.area)`, `1 ≤ run.area ≤ SUMMIT_AREA`, `run.area ∈ {prev, prev + 1}` (one-way + one-per-tick), `run.baseAltitude === (run.area === 1 ? 0 : AREAS[run.area - 2].ceiling)`; end: `ascendCount === run.area − 1` AND `run.area ≥ 2` (non-vacuity — the run REALLY climbed). Keep the frozen `altitude === ALT_PER_POINT × score` invariant (`tests/altitude.test.js:104` idiom) unasserted-here — that file owns it.
6. **`createRun`/`startRun` untouched:** no leg needed — the frozen `ascent.test.js:64` key-set leg is the fence; the suite's own green proves it.

**Mutation matrix:** M1 remove the `clampArea` call → §2/§5 TypeError legs red. M2 drop the `+Infinity` arm → §1 red (`Infinity → 1` ≠ 5). M3 replace `Math.trunc` with identity/`round` → §1 fraction legs red (and §2's `2.5` integer pin). M4 `while` instead of `if` → §4 staircase red. M5 cap off-by-one (`AREAS.length + 1`) → §1/§2 crafted-6 legs red (throw returns). M6 floor at `MIN_AREA`→`0` (clamp lower arm) → §1 + §5 integer-domain legs red. Restore `js/game.js` byte-identical after each (diff-verify).

## Dev Notes

### Files being modified — current state (read before editing)

- `js/game.js` (301 ln) — read the whole map in Context above. **Must preserve:** the 5-arg `tickRun` call surface (`run, rope, player, dt, rng, press`) and every scoring/trip/offer/streak behavior; the output shape `{ run, rope, player, tripped, events }`; the `'ascend'`/`'win'` events on the D-N02 channel (consumers 4.4/5.1); the summit branch incl. the `'offer'` event splice (`:242-243`, 2.4's fix); `SUMMIT_AREA` derivation. Only `:100` moves plus the new exports.
- `js/areas.js`, `js/shell.js`, `js/render3d.js` — **read-only references here**; do not edit (markerLine's display clamp and the whole-row passthrough at `js/shell.js:585` already carry `area` to the view layer).

### Prior-story intelligence

- **Story 2.2** (this ladder's contract, `2-2-jump-peak-vs-ceiling-and-the-summit-win.md`): peak = `altitude + nextPlayer.y` post-step, one evaluation after the crossings loop, strict `>`, plain `if` never `while`, `outcome: 'summit'` data-not-status, i-frame suppression legs (`ascent.test.js:256`) — its Review Finding at story-file line 73 explicitly assigns THIS story the area-domain pin. Its test legs stay green BY CONSTRUCTION if D-a holds (production values unchanged).
- **Stories 3.4/3.5** (clamp-family doctrine): the `clampCharged`/`clampAirJumps` extractions are the pattern D-a copies; 3.5's completion note is the warning behind D-b — the first `clampAirJumps` implementation drifted on the Infinity arm and only an explicit leg caught it. Pin the arms, don't infer them.
- **Git intelligence (last 8 commits):** story bundles ship code + tests + story/sprint/ledger flips in one commit; messages lead with the story number, cite the gate (`348/348 green @ ~8.5s`) and the frozen-file diff claim ("only tests/X moved"); ledger entries get PAID notes in-story; re-contracts are named and authorized in story text — **this story authorizes NONE**, so any existing-test red means the implementation is wrong, full stop.

### Repo guardrails (AGENTS.md — binding)

- Frozen-test discipline: existing test files byte-identical; new behavior pinned ONLY by the new file; expectations derive from records/metadata, not hardcoded tables.
- `js/areas.js` stays pure data (no functions); sim core purity is fenced by `tests/boundary.test.js` (no new import edges); functional core / imperative shell — the heal lives in the core, display-side clamps are not "unified" across the seam.
- State is data, never thrown errors; `package.json`/`index.html` near-frozen; one shared handler per cross-cutting concern (the clamp family IS the shared handler — join it, don't fork it); `camelCase`, named exports, `.js` extensions, 2-space indent, no `console.*` in pure modules.

### References

- `_bmad-output/planning-artifacts/epics.md:613-633` (Story 4.1 source), `:124/:130` (FR9/FR15 map), `:379-381` (2.2 groundwork clause)
- GDD: `gdds/gdd-jumprope-web-2026-10-27/gdd.md:187-198` (Height & ascent, ladder placeholders), `:277-288` (difficulty via area pressure — 4.2), `decision-log.md:21-22` (ascent-ladder decision)
- `deferred-work.md:50-51` (the obligation above), `:53-54` (4.5's i-frame banking — NOT here), `:60-61` (4.5's marker arm — NOT here)
- Test assets to REUSE, not fork: `tests/ascent.test.js` (rig idioms), `tests/headless-sim.test.js:23-84` (`scriptedRun`), `tests/support/balance-harness.js` (`mulberry32`, `runBot`, `evaluateLadder` — the 2.5 ladder-evaluation wheel; this story asserts through the raw sim, the harness stays for 4.5/6.1), `tests/startrun.test.js:20` (seeding idiom), `tests/ceilingmarker.test.js` (display-side clamp fence)
- Gate: `./run_tests.sh` (`node --test tests/`, prints `N/N passed`) — 349/349 at `a770a2d`.

## Dev Agent Record

### Agent Model Used

qwen (lane-qwen38-ultra/qwen), worker agent in the Epic 4 autopilot loop.

### Debug Log References

- Baseline gate (`a770a2d`, before any edit): **349/349 green @ 8.4 s** — matches the story's stated entry state.
- RED phase: new file only (`node --test tests/arealadder.test.js`) — 18 legs, **4 pass / 14 fail** before implementation (missing-export + TypeError legs red; the §4 idempotency/staircase pins pass at baseline BY DESIGN — they pin shipped behavior, and the §4 staircase leg turns red under M4).
- GREEN: new file 18/18; full gate **367/367 green @ ~8.5 s** (349 baseline + 18 new; suite < 10 s ✓; two 1000-tick legs, budget ≤ 3 ✓).
- Hygiene: `git diff tests/` empty except new untracked `tests/arealadder.test.js` — every existing test file byte-identical, zero re-contracts. `tests/boundary.test.js` green unmodified.
- Mutation matrix (each: mutate → run new file → restore; `js/game.js` sha256-verified byte-identical after every mutant): M1 drop `clampArea` call → 7 red (§2 live-crafted TypeError legs + §3 spread-heal/two-tick legs); M2 drop `+Infinity` arm → 1 red (§1 summit-tier clamp leg, `Infinity → 1 ≠ 5`); M3 `trunc`→`round` → 2 red (§1 fraction legs + §2 `2.5` landing pin); M4 `while` instead of `if` → 1 red (§4 staircase: tick 1 lands area 3 not 2); M5 cap off-by-one → 7 red (§1 cap legs + §2/§3 crafted-6 throw returns); M6 floor arm dropped → 6 red (§1 garbage legs + §2/§3 `area: 0` throw returns). Every mutant killed by specific legs, per §M.
- `js/game.js` delta: +18/−3 lines (exports + read-site swap); line count 301 → 316.

### Completion Notes List

- Task 1 (D-a) shipped exactly as decided: `MIN_AREA = 1` + `clampArea` exported beside the clamp family (arms mirrored from `clampRopes` incl. the `+Infinity → SUMMIT_AREA` arm), applied ONLY at `tickRun`'s record read site; `crossesCeiling` stays unguarded (D-a decision), the i-frame gate untouched (D-f). Production behavior unchanged — the 349 baseline legs are green unmodified.
- Task 2/3: `tests/arealadder.test.js`, 18 legs covering Test Plan §1–§5; §6 has no legs by design (frozen `ascent.test.js:64` key-set fence). All ladder expectations derive from `AREAS` rows + `SUMMIT_AREA`/`MIN_AREA`/`ALT_PER_POINT`; §5 seeds `altitude` AND `score` together (`score = altitude / ALT_PER_POINT`) so the frozen `altitude === ALT_PER_POINT × score` invariant holds from tick 0, with `mulberry32`-seeded rng. Non-vacuity holds: the row-1-seeded run ends `area: 2` (1 ascent), the row-2-seeded run ends `area: 3` (2 ascents, staircase coverage), each with `ascendCount === area − 1`.
- Mutation-matrix nuance (design friction, honest note): §M predicts M1/M6 kill "§5 TypeError/integer-domain legs"; measured, they kill §2/§3 legs and leave §5 green — a production-seeded run can never leave the domain (that IS D-e's structural claim), so §5's per-tick asserts cannot observe clamp regressions by construction. All mutants still die, on their dedicated §1–§3 legs.
- `deferred-work.md` 2-2-review entry (`crossesCeiling` domain guard): PAID via the clamp branch of the pin-or-clamp fork (clamp at the read site + monotonicity pins), per this story's disposition.
- No new imports entered the sim graph (`tests/support/balance-harness.js` was already a test-side import); `js/areas.js`, `js/shell.js`, `js/render3d.js`, `index.html`, `package.json`, `run_tests.sh` untouched.

### File List

- `js/game.js` — modified: `MIN_AREA`/`clampArea` exports + `tickRun` read-site swap (+18/−3).
- `tests/arealadder.test.js` — NEW: 18 invariant legs (mutation-proven M1–M6).
- `_bmad-output/implementation-artifacts/4-1-the-area-ladder-five-tiers-one-way-up.md` — this story file (Status, tasks, record, change log).
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 4-1 → review.
- `_bmad-output/implementation-artifacts/deferred-work.md` — crossesCeiling-guard entry marked PAID.

## Change Log

- 2026-11-08 — Story created (Epic 4 autopilot, `gds-create-story` at baseline `a770a2d`): ACs verbatim from epics.md §Story 4.1; deferred-work.md:50-51 embedded verbatim with resolution disposition; clampArea design decided (D-a…D-f); zero questions outstanding. Ultimate context engine analysis completed - comprehensive developer guide created.
- 2026-11-08 — Story implemented (`gds-dev-story`): `clampArea`/`MIN_AREA` domain heal at the `tickRun` read site (D-a/D-b/D-c, pays the 2.2-review ledger item — PAID) + NEW `tests/arealadder.test.js` (18 legs: clamp contract, never-throw domain heal, write-back/spread-survival, idempotency & one-per-tick staircase, seeded 1000-tick monotonicity ×2). Gate 367/367 green @ ~8.5 s; mutation matrix M1–M6 all killed; zero existing tests touched. Status → review.
