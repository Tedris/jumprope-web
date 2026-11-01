---
baseline_commit: 6739d59459d3e1e2130e3da6de9add514ff79e24
---

# Story 1.1: Multi-rope simulation core

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player chasing a taller build,
I want my run to track multiple ropes sweeping one shared clock,
so that added ropes mean more scored passes (and more risk) per revolution without changing how I play the button.

## Acceptance Criteria

1. **Run carries a rope count.** Given a fresh run created via `createRun`, when the run state is inspected, then it includes a rope-count field (`ropes`) initialized to `1`, with the existing start contract intact (1.3 s period, phase 0.33 lead-in, auto-launched 0.1 s-hold jump — FR25). And rope counts are valid on 1–5; any transition producing 0 or 6+ is invalid-state **data** (clamp/represent as data), never a thrown error.

2. **N ropes on one phase clock.** Given a running state with N ropes (N ≥ 2), when `tickRun` advances the phase clock, then each rope's feet-window occurs at evenly spaced phase offsets across 0–1 — **rope k crosses when `((phase + k/N) mod 1) ∈ [0.45, 0.55]`** — all derived from the one canonical 0→1 phase clock. No secondary timers, no per-rope phase accumulators (FR1, NFR8). And every rope crossing the feet window with clearance is scored as an independent pass using FR21's unchanged formula (`score += effects.scoreMul` per pass).

3. **Boundary fence holds.** Given the sim graph after this change, `tests/boundary.test.js` still passes — no `three` reference or browser IO enters the sim graph (NFR4).

4. **Contract + red-green tests ship in the same change.** A Node-side contract test for the extended `createRun`/`tickRun` return shape, plus red-green test legs for multi-rope scoring (test first → fail → implement → pass) (NFR5).

## Tasks / Subtasks

- [x] Task 1: Extend the run record with rope count (AC: 1)
  - [x] `createRun()` in `js/game.js` gains `ropes: 1` — one field addition, everything else byte-identical (`status`, `score`, `skips`, `effects`, `offer`, `owned`, `buffer`, `streak`)
  - [x] Constants `MIN_ROPES = 1` / `MAX_ROPES = 5` (module-level UPPER_SNAKE in `js/game.js`); out-of-range counts are clamped/represented as data, never thrown
  - [x] `tickRun` reads `run.ropes ?? 1` — a run record without the field (frozen tests hand-build view payloads) must behave exactly as 1 rope, same pattern as `run.buffer ?? 0`
- [x] Task 2: Multi-rope crossing detection in `tickRun` (AC: 2)
  - [x] Loop k = 0..N-1; rope k's derived phase is `((phase + k / N) % 1)`; rising-edge detection per rope using the existing `atFeet({ phase })` predicate on the **previous** and **next** rope phase (mirrors current `wasFeet`/`isFeet` lines)
  - [x] For N = 1 this must reduce byte-identically to current behavior (k = 0, offset 0) — the v1 frozen tests are the proof
  - [x] Each clearing crossing scores independently per pass; the near-miss band check (`NEAR_MARGIN`) applies per pass unchanged
  - [x] Process crossings in ascending k; on an offer trigger (`shouldOfferUpgrade(skips)` checked per pass increment, so a multi-pass tick can never step over a 10th-skip boundary), fire the offer once and stop resolving further crossings in that tick (consistent with "tickRun never runs in choose")
- [x] Task 3: Interim trip contract (AC: 2 — scope fence for Story 1.2)
  - [x] A crossing that fails clearance with no live buffer still ends the run (`status: 'over'`, `tripped: true`, `events: [..., 'trip']`) exactly as v1, for any N — rope-as-HP trip resolution (fastest-rope strip, i-frames) is **Story 1.2's job, not this story's**
  - [x] Buffer semantics per crossing unchanged from v1 (armed by press, decays on phase clock, consumed at a saved crossing); multi-crossing-per-tick buffer interactions get a documented test leg for current behavior, pinned for 1.2 to build on
- [x] Task 4: Tests (AC: 3, 4)
  - [x] New test file `tests/multirope.test.js` (suggested name; thematic naming is the established pattern — feel/startrun/pickflow/juice) with red-green legs: `createRun().ropes === 1`; contract shape of `tickRun` return (keys `run/rope/player/tripped/events` unchanged); N = 2..5 evenly spaced crossings each scored independently; per-pass scoring matches the unchanged formula; out-of-range rope counts stay data (no throw); parity leg proving N = 1 ≡ v1 for an identical scripted tick sequence
  - [x] Existing `tests/*.test.js` files remain **byte-identical** (frozen-test discipline, NFR5) — `git diff --stat tests/` must show only the new file
  - [x] Full suite green: `node --test tests/` in well under 10 s (NFR4)
- [x] Task 5: Boundary confirmation (AC: 3)
  - [x] `tests/boundary.test.js` passes unmodified (it's frozen) — do not touch it; the fence walks the graph derived from test imports, so the new test file automatically extends its coverage

## Dev Notes

### Where everything lives (current state, verified 2026-10-28)

| File | State today | This story |
|------|-------------|------------|
| `js/game.js` | `createRun()` returns `{ status, score, skips, effects, offer, owned, buffer, streak }`; `tickRun(run, rope, player, dt, rng = Math.random, press = null)` detects one rising edge into `atFeet` and scores/trips/offers there | UPDATE: add `ropes: 1` to `createRun`; per-rope crossing loop in `tickRun`. Signatures unchanged |
| `js/rope.js` | `createRope/updateRope/atFeet/obstacleX`; single `{ phase, period }` | UPDATE (optional): add a named predicate/export if it keeps `tickRun` readable (e.g. `atFeetOffset(phase, k, N)`); the four existing exports must behave identically — `tests/rope.test.js` is frozen |
| `js/player.js`, `js/upgrades.js`, `js/interpolate.js` | v1 as shipped | UNTOUCHED |
| `js/shell.js` | calls `tickRun(run, rope, player, STEP, rng, pressFired ? true : null)` at `shell.js:388`; single `rope` state object | UNTOUCHED — the call surface is unchanged; with in-game rope count stuck at 1 until Epic 3, no shell change is observable |
| `js/render3d.js` | poses one rope from `lerpPhase` theta of the view payload's `rope.phase` | UNTOUCHED — multi-rope *visuals* are not in this story; the view payload needs no new required field (run passes through as-is) |
| `index.html`, `package.json` | near-frozen | DO NOT TOUCH (boundary fence greps around them) |

### The architectural decision this story implements

- **One clock, derived offsets.** The rope phase stays THE canonical 0→1 clock (NFR8, [architecture.md#Key Abstractions]). Multi-rope is a **pure derivation inside `tickRun`**: rope k's window is `(phase + k/N) mod 1`. Explicitly **do not**: add a `ropes: []` array of rope objects, add per-rope timers, or touch the view payload's `rope` shape. The renderer, shell, and every frozen test consume a single `{ phase, period }` — changing that shape detonates the frozen suite and the one-way-payload rule.
- **Trip resolution is deliberately deferred.** v1's "failed crossing → game over" stays for all N. Story 1.2 replaces the else-branch with buffer → strip-fastest → last-rope-death and adds i-frames. Keep that branch isolated (one else-branch, comment-marked) so 1.2 can replace it surgically.
- **Invalid states are data.** `ropes` outside 1–5 clamps as data; `tickRun` must never throw on a weird count (`run.ropes ?? 1` fallback; treat 0/negative/6+ defensively via clamp at read).
- **Effects pattern untouched.** Scoring stays `score += run.effects.scoreMul` per pass; no new effect fields; `ropeMul` still scales the whole clock's advance via `updateRope(rope, dt * run.effects.ropeMul)` — speed cards speed *all* ropes by construction.

### Known frozen-test landmines (all verified — these must stay green, byte-identical)

- Every frozen test that reaches `tickRun` builds run via `{ ...createRun(), ... }` (game/startrun/catalogue/feel/headless-sim/pickflow/boundary) → adding `ropes: 1` flows through for free. The one hand-built run literal (`tests/juice.test.js:355`) is a **render view payload**, never passed to `tickRun` — that's why the `run.ropes ?? 1` fallback matters.
- `tests/startrun.test.js` freezes the 4-arg `tickRun` call surface and the injected-rng offer path — do not reorder or rename parameters.
- `tests/boundary.test.js:58` fails if the literal `phase: 0.33` reappears anywhere in `js/` — reuse `START_PHASE`/`leadIn()` ([game.js:21](../../../js/game.js)), never duplicate the constants.
- `tests/boundary.test.js:67` allows `Math.random` only on the `tickRun` default-parameter line — do not introduce new randomness (none is needed: offsets are deterministic).
- `tests/headless-sim.test.js` runs the 1000-tick scripted balance gate against the real sim — it must pass unmodified; it exercises the N=1 parity implicitly.

### Testing standards

- Node built-in runner only: `node --test tests/` (Node ≥ 18, `node:test` + `node:assert/strict`); deterministic via injected rng — no new rng use in this story.
- Red-green discipline is an AC: write the failing multi-rope legs first, watch them fail for the right reason, then implement.
- Contract test for the extended factory return ships in the same change (v1.0 retrospective rule).
- Test expectations derive from records/metadata, not hardcoded tables.

### Scope boundaries (do not drift)

- **In scope:** run record field, derived-offset crossing loop, per-pass scoring, contract + multi-rope tests.
- **Out of scope (later stories):** trip strips fastest rope + i-frames (1.2), rope-count HUD (1.3), near-miss per-revolution coalescing (1.4 — until then, multiple `nearMiss` events in one tick are acceptable sim behavior; unreachable at N=1 gameplay), v1 parity proof suite (1.5), Spare Rope card that raises N in gameplay (3.2), any renderer/audio/shell change.

### Project Structure Notes

- All changes inside the existing `js/` tree in place (v1.0 is the greenfield base — no starter template).
- Conventions: named exports, POJOs, no classes, spread-copy never mutate, 2-space indent, sparse comments (non-obvious fallbacks only), no `console.*` in pure modules, `UPPER_SNAKE` module constants, `*Mul` suffix convention (no new multipliers here).

### Project Context Rules

- No `project-context.md` exists in this repository; `AGENTS.md` is the project-rule source (pure core / imperative shell, frozen-test discipline, static-files-only, `node --test tests/` before committing) and is reflected in the notes above.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1] — AC text, FR1/FR21/FR25/NFR4/NFR5/NFR8 mapping
- [Source: _bmad-output/planning-artifacts/architecture.md#The One Rule That Matters] — purity + fence; [#Key Abstractions] — phase-as-clock, invalid-states-as-data
- [Source: _bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd.md#163-186] — Rope HP design intent: even phase offsets, N× passes per revolution, pacing note (skip-keyed gates advance N× faster — offer pacing rebalancing is Epic 6, not this story)
- [Source: _bmad-output/planning-artifacts/prd.md#Constraints] — frozen-test + static-file constraints
- [Source: js/game.js] — current `createRun`/`tickRun`/`leadIn` contract (all line references verified against the working tree)

## Dev Agent Record

### Agent Model Used

Qwen3.8-Flash (ultrafast/qwen)

### Debug Log References

- RED leg confirmed before implementation: `node --test tests/multirope.test.js` failed on the missing `MAX_ROPES` export (feature absent, right reason)
- GREEN: `node --test tests/multirope.test.js` → 13/13 pass; full suite `node --test tests/` → 143/143 pass in ~1.8 s
- `git diff --stat tests/` clean — existing test files byte-identical; only `tests/multirope.test.js` added
- `tests/boundary.test.js` passes unmodified (fence auto-covers the new test file's imports)

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- Task 1: `createRun()` gains `ropes: 1` (appended last; all v1 keys untouched). `MIN_ROPES = 1` / `MAX_ROPES = 5` exported from `js/game.js`; private `clampRopes()` clamps non-finteger/out-of-range counts as data — `tickRun` never throws (verified legs for 0, −3, 6, 99, NaN, undefined, null). `tickRun` reads `run.ropes ?? MIN_ROPES` so hand-built run records behave as 1 rope.
- Task 2: crossing detection is now a `for (let k = 0; k < ropeCount; k++)` rising-edge loop over `atFeetOffset(phase, k, ropeCount)` — new named predicate in `js/rope.js` (`atFeet()` is now `atFeetOffset(phase, 0, 1)`, behaviorally identical for the frozen `tests/rope.test.js`). One canonical clock, no per-rope state, view payload shape untouched. Ascending-k processing; offer checked per pass increment and `break`s resolution for the tick; trip branch also `break`s (run ends).
- Task 3: trip else-branch isolated and comment-marked for Story 1.2's surgical replacement. Buffer legs pinned per rope count 1–5 (armed → forgiven pass, consumed at crossing, `buffer: 0`).
- Task 4: `tests/multirope.test.js` — 13 legs: start contract + `ropes: 1`, constants band, `tickRun` return-shape contract, N = 2..5 evenly spaced crossings (gap = 60/N ticks ± 1, each scored independently), per-pass formula with `multi` card, offer-fires-once at the 10th-skip boundary, trip-for-any-N, buffer-for-any-N, out-of-range clamps, and the N = 1 parity leg (300-tick scripted sequence: `ropes: 1` ≡ field-absent, all outputs deep-equal).
- Note: at N ≤ 5 an evenly spaced pair of rising edges cannot land in the same sampled tick (offsets ≥ 0.2 apart vs 0.1 window width), so multi-pass-per-tick is defensively handled (offer/trip `break`) but structurally unreachable — pinned behavior for 1.2/1.4.
- streak accumulation switched from `(run.streak ?? 0) + 1` to `streak += 1` (identical at N = 1 since the local initializes from the same field; sequential-correct for multi-pass ticks).
- Shell, renderer, audio, `index.html`, `package.json` untouched; no new dependencies; no new randomness.

### File List

- `js/game.js` — modified (`ropes: 1` in `createRun`, `MIN_ROPES`/`MAX_ROPES`/`clampRopes`, per-rope crossing loop in `tickRun`)
- `js/rope.js` — modified (`atFeetOffset` derived-offset predicate; `atFeet` re-expressed over it, behavior unchanged)
- `tests/multirope.test.js` — added (13 contract/red-green/parity legs)

### Change Log

- 2026-10-29: Story implemented — multi-rope derived-offset crossing on the one phase clock, `ropes` run field, clamped-as-data counts, 13 new tests, full suite green (143/143). Status → review.
