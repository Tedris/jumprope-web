---
baseline_commit: 2aac6df00de8d3b86e56fb9da207088d8a268729
---
# Story 3.1: Four new cards in the catalogue

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a builder,
I want rule-changing cards to appear in offers,
So that builds can diverge in kind, not just in degree.

## Acceptance Criteria

1. (AC1, gate-amended) The `UPGRADES`/`CARDS` catalogue (loads under Node import) contains **six legacy cards byte-identical** in effect/rarity/cap **plus two rule-authorized re-costs** (Wide Brim, Heavy Rope — see Task 2) **plus four new entries**: Spare Rope `extrarope` (+1 rope, max 5 total, uncommon, cap 4), Steel Cord `reinforce` (rope charge, uncommon, cap 2), Second Wind `doublejump` (1 mid-air jump per ground contact, uncommon, cap 2), Launch Heels `highjump` (launch velocity +10%, common, cap 3) (FR11 amended, FR12)
2. (AC2) Offer draws at any skip count use the 70/25/5 rarity weights, distinct per offer; the new cards participate with their rarities; dead-pick filtering excludes capped-out cards **and** state-aware caps: Spare Rope hidden at 5 ropes held, Steel Cord hidden when 2 ropes are charged (FR10)
3. (AC3) Seeded rng offer draws stay deterministic with the 12-card catalogue (NFR4)
4. (AC4) Catalogue metadata stays the single source of truth — test expectations derive from records, not hardcoded tables (NFR5)
5. (AC5, plumbing) State-aware filtering gets real plumbing: `isAvailable(card, owned)` (`js/upgrades.js:40-42`) and `pickOffers(pool, owned, count, rng)` (`js/upgrades.js:47-63`) currently see only `owned`; the sim call site (`js/game.js:128`) passes no run state. The **optional state argument** must keep `tests/headless-sim.test.js:113` (4-arg call) and the `pickTwo` shim (`js/upgrades.js:66-68`) link-compatible (FR10)
6. (AC6, gate) FR11's legacy-8 freeze is cleared: Story 2.5's rule report named `slowrope` and `widebrim` as climb-rate reducers (`reduceClimb`); this story ships their re-cost as the sanctioned FR11 amendment. Evidence: post-change rule report shows `reduceClimb: []`

## Tasks / Subtasks

- [x] Task 1: Catalogue data — four new cards (AC: 1, 4)
  - [x] Add the four records **exactly as pinned in Dev Notes §"Pinned card records"** to `js/upgrades.js` `CARDS` (append after `widebrim`). Effects-shape contract for 3.1: every new card's `apply` is the inert endofunction `s => ({ ...s })` — card *presence* is 3.1; card *effects* land in 3.2–3.4 (ADR-2 migration is owed to 3.2, deferred-work.md:67). The inert apply is REQUIRED by frozen legs: `tests/catalogue.test.js:31-33` (apply over only the 4 effect keys) and `tests/headless-sim.test.js:144-152` (`card.apply(freshEffects())` on every card).
  - [x] `stateCap` metadata on the two saturated cards: `extrarope` → `{ ropes: 5 }`, `reinforce` → `{ charged: 2 }` (plain data, not a predicate — NFR5). The 5 must equal `game.js:25 MAX_ROPES`; a new-test leg cross-checks (no circular import: upgrades.js NEVER imports game.js).
- [x] Task 2: FR11 amendment — re-cost Wide Brim and Heavy Rope (AC: 1, 6)
  - [x] Apply the pinned re-cost values (Dev Notes §"Re-cost"); record the FR11 amendment in the Dev Agent Record (handoff requirement, sprint-change-proposal-2026-11-06.md §5).
  - [x] Gate evidence: run `cardRuleReport({ ticks: 1200 })` from `tests/support/balance-harness.js` once in a throwaway Node script; paste output (must show `reduceClimb: []`) into the Debug Log.
  - [x] Mark the two catalog deferrals RESOLVED in `deferred-work.md` (:59 Wide Brim, :60 Heavy Rope) and note the AXIS-contract item (:74) as consumed by this story.
- [x] Task 3: State-aware offer filtering (AC: 2, 3, 5)
  - [x] `isAvailable(card, owned, state)` — optional 3rd arg: `cap` check AND NOT(`stateCap` present AND `state` present AND every threshold key met: `(state[k] ?? 0) >= v`). `state` omitted ⇒ behave exactly as today (link-compat for all 2-arg/4-arg frozen callers).
  - [x] `pickOffers(pool, owned, count, rng, state)` — state is the **trailing optional 5th arg** (NEVER before `rng`; determinism legs consume rng positionally). Passes through to `isAvailable` at `js/upgrades.js:48`.
  - [x] `js/game.js:128` passes state: `pickOffers(CARDS, run.owned ?? {}, offerCount(skips), rng, { ropes: ropeCount, charged: 0 })` — `ropeCount` is already computed at `js/game.js:99`; `charged: 0` is the honest current value (charge data arrives Story 3.3, which extends this object).
  - [x] `pickTwo` (`js/upgrades.js:66-68`) and `tests/headless-sim.test.js:113` stay untouched — 4-arg calls hit the state-omitted path.
- [x] Task 4: Authorized fence re-contracts + AXIS map (AC: 1, 6) — **exactly three edits in tests/, each commented with this story's name**
  - [x] `tests/support/balance-harness.js:17-26` — extend frozen `AXIS` map with the four sentinel axes: `extrarope: 'ropes'`, `reinforce: 'charged'`, `doublejump: 'airJumps'`, `highjump: 'launchMul'` (future-aligned field names from game-architecture.md:601 and the `*Mul` convention).
  - [x] `tests/balance.test.js:313-334` AXIS-guard leg — amend coverage semantics: every card must be mapped; a card whose `apply` **writes no effect field** (run-shaped/inert class) is exempt from the "axis is a field apply writes" and group co-write checks. Legacy cards keep the strict check. This permanently implements the deferred contract (deferred-work.md:74).
  - [x] `tests/balance.test.js:305-307` collision baselines — `pick2: 0.16 → 0.07`, `pick3: 0.46 → 0.21` (exact weighted enumeration of the 12-card/sentinel-axis pool, computed 7.07% / 20.54%; see Dev Notes). The ±0.015 empirical-vs-exact check above the baseline row self-adapts and stays.
  - [x] Everything else in `tests/` stays byte-identical; prove it with `git diff <baseline-sha> -- tests/` in the Debug Log.
- [x] Task 5: New tests (red-green, AC: all)
  - [x] `tests/rulecards.test.js` (new): the 4 new records' metadata pins (id/name/rarity/cap per FR12; role ∈ the five shipped strings; color ∈ the five defined colors; icon non-empty); inert-apply identity; FR11 pins — the six untouched legacy cards' effect/rarity/cap equal the v1 table, and the two re-costed cards equal their new pinned values; rule-2 invariant derived from records: every card's `apply`^1 and `apply`^cap product `ropeMul × scoreMul >= 1`.
  - [x] `tests/offerstate.test.js` (new): state-aware legs derived from `stateCap` records — `isAvailable` hidden/shown per threshold, visible with state omitted, absent state key counts as 0; `pickOffers` never draws `extrarope` at `{ropes: 5}` across 200 seeded draws but does at `{ropes: 3}`; **end-to-end witness** via `tickRun`: crafted `{ ...createRun(), ropes: 5, skips: 9 }` to skip-10 with a stub rng → `offer` excludes `extrarope`, while the same-seed state-less draw includes it (contrast pair, not a tautology); seeded-draw determinism over the 12-card pool; all four new ids appear ≥1 in 2000 seeded draws from `{}` (rarity wiring witness).
  - [x] Red-green protocol: every new leg observed RED (right reason) before implementation; mutation-check each leg once (retro A3 — no unfalsifiable legs).
- [x] Task 6: Verification and bookkeeping
  - [x] `node --test tests/` fully green; wall time **< 10 s** (baseline 8.39 s @ 288 tests; +4 headless-sim per-card legs and +8 harness bot runs expected ≈ +0.5–1 s — report if over, NEVER trim frozen legs).
  - [x] If `tests/balance.test.js:196-208` (measured-vs-analytic bands) goes RED on the re-costed cards, the re-cost VALUES are wrong (numbers are first-pass) — re-tune the factor so measured matches the closure, do not touch the leg. (Did not go RED — values held.)
  - [x] Static smoke: serve the folder, load a run, confirm the first offer renders with new cards possible and the HUD/offer DOM needs no change (it derives from `CARDS`, `js/shell.js:525-529` auto-covers new ids).
  - [x] File List includes `sprint-status.yaml` (Epic 1 retro Lesson 4).

### Review Findings

- [x] [Review][Patch] Empty `stateCap: {}` hides a card vacuously in stateful draws — `Object.entries({}).every()` is vacuously true, so a truthy-but-empty stateCap means "all thresholds met" for every state, while the `!state` short-circuit keeps it visible on stateless callers (test/live asymmetry). Guard `entries.length > 0` in `isAvailable` for fail-open parity with the absent-key rule (`js/upgrades.js:66-68`) — FIXED (`length === 0 ||` fail-open + pinned by a new synthetic-card leg; first cut of the guard landed inverted and the leg caught it red)
- [x] [Review][Patch] Metadata guard admits poison stateCap values: `min: 0`/negative passes `typeof/Number.isFinite` — `{ charged: 0 }` would hide its card on every live offer (`0 >= 0` with the key absent) while showing it state-omitted. Require non-empty and `min >= 1` in the guard loop (`tests/rulecards.test.js:56-63`) — FIXED
- [x] [Review][Patch] Witness leg can bless the wrong cause: if `createRun()` ever pre-owned `extrarope`, the live exclusion passes via the owned-cap arm, not the state plumbing. Add `assert.equal(out.run.owned.extrarope ?? 0, 0, ...)` to the leg (`tests/offerstate.test.js:98-116`) — FIXED
- [x] [Review][Patch] Misnamed counter `hidden` counts full-size offers (message is right, name is wrong); loop bound 200 duplicated as loop cap and expected count (`tests/offerstate.test.js:48-62`) — FIXED (`fullOffers` / `DRAWS`)
- [x] [Review][Patch] Dead initialization `let one = freshEffects()` overwritten before first read (`tests/rulecards.test.js:96,99`) — FIXED
- [x] [Review][Patch] AXIS comment cites the `*Mul` convention for sentinels that mostly don't follow it (`ropes`/`charged`/`airJumps`); reword to "future effect field names" (`tests/support/balance-harness.js:26-28`) — FIXED
- [x] [Review][Defer] Both live stateCap hide-paths are unreachable in 3.1 (ropes ≡ 1, `charged: 0` literal) and no fence catches Story 3.3 forgetting to replace the `charged: 0` constant with real charge data — suite stays green if missed (`js/game.js:131-132`) — deferred, Story 3.3 owns the wiring + its witness
- [x] [Review][Defer] Balance harness collision model draws state-less (`pickOffers(CARDS, {}, pick, rng)`) — correct while live state cannot saturate, but the gate will model a pool the game no longer deals once 3.2/3.3 make saturation reachable (`tests/support/balance-harness.js:293`) — deferred, 3.2/3.3 harness update interlock
- [x] [Review][Defer] AXIS-guard inert exemption is behavior-detected: `touchedFields` diffs only `freshEffects()` keys, so a 3.2 card writing `launchMul` before that key joins `freshEffects()` classifies as inert and skips the strict axis check (fenced today only by the frozen 4-key apply-shape legs in catalogue/headless-sim) (`tests/balance.test.js:322-331`) — deferred, Story 3.2 must land the fifth effect key and the AXIS tightening together

## Dev Notes

### Current state (verified 2026-11-06, all line cites re-checked)

- `js/upgrades.js` — 8 cards (lines 1-28), `UPGRADES` alias (31), `RARITY_WEIGHT` (34), `freshEffects` 4 keys (36-38), `isAvailable` 2-arg (40-42), `pickOffers` 4-arg (47-63), `pickTwo` shim (66-68), cadence (70-78).
- `js/game.js` — run record (65): `{ status, score, altitude, skips, effects, offer, owned: {}, buffer, streak, ropes: 1, iFrames, area, baseAltitude, outcome }`. **Ropes are a scalar count** (1-5, read-clamped via `clampRopes`, 33-39); `owned` is an `{id: count}` map. Offer call site 128; `applyCard` 218-225 calls `card.apply(run.effects)` — the run-shaped effects need the whole-record migration Story 3.2 pays. `MAX_ROPES = 5` exported at 25.
- No test asserts an exact card count anywhere; catalogue-wide legs loop `CARDS` and self-adapt (verified for catalogue/headless-sim/balance/boundary/pickflow suites).
- Frozen test suite today: **288 pass / 8.39 s** — keep green.

### Pinned card records (paste-ready; icon/glyph may be tuned if it tofus in the HUD font)

```js
{ id: 'extrarope', name: 'Spare Rope', desc: '+1 rope (max 5)', icon: '∥',
  role: 'foundation', color: 'amber', rarity: 'uncommon', cap: 4,
  stateCap: { ropes: 5 },        // 5 held = dead pick (equals game.js MAX_ROPES)
  apply: s => ({ ...s }) },      // run-shaped card — effect lands in Story 3.2 (ADR-2)
{ id: 'reinforce', name: 'Steel Cord', desc: 'a rope survives one trip', icon: '▣',
  role: 'risk', color: 'slate', rarity: 'uncommon', cap: 2,
  stateCap: { charged: 2 },      // FR12: up to 2 charged ropes (Story 3.3 wires the data)
  apply: s => ({ ...s }) },
{ id: 'doublejump', name: 'Second Wind', desc: 'extra jump in mid-air', icon: '⇈',
  role: 'foundation', color: 'sky', rarity: 'uncommon', cap: 2,
  apply: s => ({ ...s }) },      // mid-air jump lands in Story 3.4
{ id: 'highjump', name: 'Launch Heels', desc: '+10% launch velocity', icon: '△',
  role: 'foundation', color: 'sky', rarity: 'common', cap: 3,
  apply: s => ({ ...s }) },      // launch velocity lands in Story 3.2
```

Role/color choices are decisions (docs leave them open): GDD "HP/mobility" labels are prose, NOT role strings (`tests/catalogue.test.js:39-40` deep-equals exactly `['foundation','margin','pace','risk','volume']`); colors must stay in the five defined classes (`tests/catalogue.test.js:20,30`; `css/style.css:36-40` — adding a 6th needs CSS + a frozen-leg re-auth; Story 3.2 mentions "minting" a rope-card tint — deliberately NOT done here). Copy style per DESIGN.md:45/EXPERIENCE.md:48 — plain rule, ≤~40 chars, no selling.

### Re-cost (sanctioned FR11 amendment; currency decided by GDD gdd.md:329-333)

```js
// Heavy Rope — keep the slow pace, buy the climb rate back:
// 0.9 × 1.15 = 1.035 (×1), 0.729 × 1.521 = 1.109 (cap 3) — reduceClimb clear.
// Field-write ORDER matters: ropeMul FIRST (it is Heavy Rope's AXIS).
{ id: 'slowrope', name: 'Heavy Rope', desc: 'Slower pace, +15% score', icon: '⌛',
  role: 'pace', color: 'slate', rarity: 'common', cap: 3,
  apply: s => ({ ...s, ropeMul: s.ropeMul * 0.9, scoreMul: s.scoreMul * 1.15 }) },
// Wide Brim — score subtraction → hang-time currency (GDD: "hang-time or rope-speed";
// hang-time chosen: rope-speed would re-trigger rule 2 and entangle the ropeMul
// budget [0.6,1.5]/[0.6,3] shared with slowrope×3+windup×2). windowMul FIRST.
{ id: 'widebrim', name: 'Wide Brim', desc: '+20% forgiveness, −10% hang time', icon: '⌸',
  role: 'margin', color: 'mint', rarity: 'uncommon', cap: 2,
  apply: s => ({ ...s, windowMul: s.windowMul * 1.2, floatMul: s.floatMul * 0.9 }) },
```

Verified against frozen bounds: capped `ropeMul` 0.729 ∈ [0.6, 1.5], worst product 0.729 × 1.2544 ≈ 0.91 ∈ [0.6, 3] (`tests/headless-sim.test.js:149-154`); `multi` untouched so `tests/upgrades.test.js:11-14` stays untouched; `tests/v1parity.test.js:156,219` read only `window`/`windup` (untouched). The dominated verdicts (feather↘float, tally↘multi, widebrim↘window, slowrope↘windup) survive unchanged — rule 1 merges/retires are NOT this story's scope (report-driven, "trending to zero"; the collision half of rule 1 improves below).

### Collision math (drives Task 4's baseline values — recomputed, not copied from the proposal)

Exact weighted enumeration with 12 cards on sentinel axes (4 new cards are axis-singletons, so they can't collide): **pick-of-2 7.07%, pick-of-3 20.54%** (today: 16.25% / 46.20%). The proposal's 18.6/46.2 row assumed `highjump` lands on `floatMul`; that variant was rejected — it forces the guard exemption to lie about the closure (`highjump` writes no `floatMul` now, and its real effect will write `launchMul`). Sentinel `launchMul` keeps probe semantics honest and future-stable when 3.2 lands. Same-axis collisions dropping 16→7 / 46→21 is the rule-report's "trending to zero" outcome, stated in the re-contract comment.

### Landmines (DO-NOT list)

1. Do NOT give the new cards real effects, new effect keys, or run-touching `apply` — `tests/catalogue.test.js:31-33` and `tests/headless-sim.test.js:144-152` fail instantly; effects belong to 3.2-3.4.
2. Do NOT insert the `state` arg before `rng` in `pickOffers` — the inverse-CDF consumes rng positionally; every seeded leg (catalogue 43-51, 53-64, 66-77, headless-sim 113, boundary 83-100) depends on draw-sequence stability.
3. Do NOT touch `js/shell.js`, `css/style.css`, `js/render3d.js`, `index.html`, `package.json` — offer/HUD rendering derives from `CARDS` (`js/shell.js:405-414,448-485,525-529`).
4. Do NOT add a 6th role string or color, a new effect key, or imports from `game.js` into `upgrades.js` (cycle; the import fence `tests/boundary.test.js:29-43` + ARCH-02b ban `Math.random` inline — state filtering takes `state` as data).
5. Do NOT edit any `tests/*.test.js` beyond the two authorized `tests/balance.test.js` legs (Task 4). Stale assertion MESSAGES in `tests/catalogue.test.js:73,84` ("seven other cards") are cosmetic and stay — the assertions themselves self-adapt.
6. The `dominated` list self-adapts (`tests/balance.test.js:213+` derives analytically); if it shifts while implementing, your card data drifted from the pins — fix the data, not the leg.
7. `tests/pickflow.test.js:257` rotating-stub draws will surface different ids post-change — that is expected (derived legs); if an identity pin fails there, STOP and re-examine: none is known to exist.

### Previous story intelligence

- Story 2.5 (done, 288/288): rule report verdicts `dominated {feather,tally,widebrim,slowrope}`, `reduceClimb {slowrope,widebrim}` — the gate evidence; `AXIS` = "first effect field the apply closure writes" (Decided 3); `cappedOwned()` offer-suppression idiom; seeded collision draws via `mulberry32(seed + i)`. Its review deferred the AXIS-vs-prose contract to Epic 3 — Task 4 closes it.
- Story 2.4: frozen-discipline evidence pattern (`git diff -- tests/` clean-tree claim), value-exact re-contract rule (no loosened regexes/values in re-contracted legs), File List role-tags convention.
- Epic 1 retro: unfalsifiable-leg class (A3) — every leg gets a mutation check; contract tests land in the same change; deferrals need named landing stories (this story consumes deferred-work :59, :60, :74; :66–:68 stay owned by Epic 6 / 3.2 / 5.3).
- Interim state accepted: between this story and 3.2–3.4 the new cards are inert picks in live play; never ship mid-epic. Epic sequencing resolves it.

### Forward interlocks (later stories' problems — do NOT fix here)

- Story 3.2 pays the ADR-2 whole-record `applyCard` migration (`game-architecture.md:209,236-238,292` vs `js/game.js:218-225`) and adds `launchMul` — that re-auths `tests/catalogue.test.js:31-33` (fifth effect key) and must update `tests/support/balance-harness.js`'s `stackedEffects`/AXIS probes or the balance legs go red.
- Story 3.3 replaces the `charged: 0` constant in the game.js state object with real charge counts.
- Story 3.4: GDD "Second Wind ×2 is the ceiling-breaker answer" vs epics.md:550-552 "copies beyond 1 raise nothing" is an unresolved contradiction parked for 3.4.

### Project Structure Notes

- All changes in the existing `js/` tree; tests mirror module concerns in new files (`tests/rulecards.test.js`, `tests/offerstate.test.js`); POJOs/spread, named exports, `camelCase`, `*Mul` suffixes, no classes, 2-space indent, no `console.*` in `js/` (AGENTS.md conventions).
- No conflict with the frozen `index.html`/`package.json` rule — untouched by design.

### References

- `_bmad-output/planning-artifacts/epics.md` — :41-45 (FR10-14), :85-94 (catalogue rules), :462-486 (this story + gate), :488-558 (3.2-3.4 scope)
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-06.md` — rules, evidence tables, re-cost currency (§4.1), ropeMul budget constraint (§2)
- `_bmad-output/game-architecture.md` — :209, :236-240 (card contract), :292-294 (ADR-2), :600-603 (airJumps/owned example)
- `_bmad-output/implementation-artifacts/2-5-ascent-economy-balance-harness.md` — rule-report verdicts, harness API, Decided 3/8
- `_bmad-output/implementation-artifacts/deferred-work.md` — :57-68 (catalogue + extra-rope deferrals), :74 (AXIS contract)
- `_bmad-output/planning-artifacts/research-scarlet-skips-2026-11-06.md` — §5 implementation facts (12-card landmines), §4 rope economy
- `_bmad-output/planning-artifacts/ux-designs/ux-jumprope-web-2026-10-28/DESIGN.md:45,87` / `EXPERIENCE.md:48` — copy + glyph rules

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

- Baseline: `node --test tests/` 288/288 green, 8.39 s (2026-11-06).
- Required entries: red-green evidence, `cardRuleReport` output showing `reduceClimb: []`, `git diff <baseline> -- tests/` limited to the three authorized sites, suite wall-time.
- RED phase (pre-implementation): both new files landed first — all 11 legs RED for the right reasons (`extrarope is in the catalogue`; `slowrope at one-pick: ropeMul 0.9 x scoreMul 1 = 0.9 cuts climb rate (rule 2 violation)`; state-blind `isAvailable` returning `true` for saturated cards).
- GREEN phase: 11/11 green after Tasks 1–3; full-suite RED set reduced to exactly the two Task-4 fences (collision exact 0.1450 — unmapped new cards collide as `undefined`-axis until AXIS lands — and `extrarope must be mapped in AXIS`).
- Gate evidence — `cardRuleReport({ ticks: 1200 })` post-change: `reduceClimb: []`; `dominated: [slowrope↘windup, feather↘float, tally↘multi, widebrim↘window]` (verdicts unchanged); `neutralClimb: [float, window, feather, widebrim, extrarope, reinforce, doublejump, highjump]`.
- Fence proof — `git diff 2aac6df -- tests/` shows ONLY `tests/balance.test.js` (:305-307 baseline re-contract + :313-334 guard-leg amendment, both Story-3.1 commented) and `tests/support/balance-harness.js` (AXIS +4). All other `tests/*` byte-identical.
- Mutation checks (retro A3): A) `stateCap.ropes` 5→4, highjump `apply` writes `floatMul`, slowrope re-cost removed → killed stateCap-metadata, FR11-pins, rule-2, inert-contract, AXIS-guard; B) `?? 0`→`?? Infinity`, `>=`→`>`, `pickOffers` drops `state` → killed threshold, legacy-behaviour, pickOffers-filter, determinism, witness; C) `stateCap: {}` + rarity `mythic` → killed FR12-pins; D) doublejump record removed → killed rarity-wiring. All mutations reverted; suite re-greened.
- Suite: 303/303 green, 8.42 s wall (< 10 s budget; +11 new legs + 4 headless-sim per-card legs over the 288/8.39 s baseline, as forecast).
- Static smoke: folder served via `python3 -m http.server`, all referenced assets HTTP 200, changed modules parse. Visual limitation: no Chromium build exists for this linux/arm64 host (Firefox only), so a driven-browser offer check was impossible; the offer/HUD DOM derivation is instead proven green by the frozen `tests/uxpolish.test.js`/`tests/altitude.test.js` shell-harness legs running against the live 12-card `CARDS`.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created (2026-11-06).
- FR11 amendment record (mandatory): Wide Brim `scoreMul −0.25` → `floatMul ×0.9` cost; Heavy Rope adds `scoreMul ×1.15` — sanctioned by sprint-change-proposal-2026-11-06.md §5 / epics.md:486, recorded here per the handoff table.
- Implemented: catalogue 8→12 (Spare Rope / Steel Cord / Second Wind / Launch Heels, inert endofunction apply; `stateCap` `{ ropes: 5 }` cross-checked equal to `MAX_ROPES`, `{ charged: 2 }`); FR11 re-costs shipped with axis-first field write order (Heavy Rope climb 1.035/cap 1.109; Wide Brim pays in hang time); `isAvailable(card, owned, state)` 3rd optional arg + `pickOffers` trailing 5th `state` arg (rng position frozen); game.js offer site passes `{ ropes: ropeCount, charged: 0 }`.
- Tested: 11 new legs in `tests/rulecards.test.js` + `tests/offerstate.test.js`, every leg observed RED pre-implementation and mutation-killed post (A/B/C/D rounds, see Debug Log); `pickTwo` shim and `tests/headless-sim.test.js:113` untouched — state-omitted path proven identical by the determinism leg.

### File List

- `js/upgrades.js` — modified (4 records, 2 re-costs, `stateCap`, 3rd/5th state args)
- `js/game.js` — modified (offer call site :128 only)
- `tests/support/balance-harness.js` — modified (AXIS map +4, authorized)
- `tests/balance.test.js` — authorized fence re-contract at :305-307 and :313-334 ONLY
- `tests/rulecards.test.js` — new
- `tests/offerstate.test.js` — new
- `_bmad-output/implementation-artifacts/deferred-work.md` — modified (:59, :60 RESOLVED; :74 consumed)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — modified (story status)

## Change Log

- 2026-11-06 — Story 3.1 implemented: +4 catalogue records (inert apply, `stateCap` data), FR11 re-cost of Wide Brim + Heavy Rope (gate report `reduceClimb: []`), state-aware `isAvailable`/`pickOffers` + `js/game.js` offer call site, authorized fence re-contracts (AXIS +4, guard-leg inert exemption, collision baselines 0.07/0.21), 11 new test legs (red-green + mutation-checked). Suite 303/303 green @ 8.42 s. deferred-work :59/:60 RESOLVED, :74 CONSUMED. Status → review.
- 2026-11-07 — Story 3.1 code-review round: 3 adversarial layers (Blind Hunter / Edge Case Hunter / Acceptance Auditor) — 19 unique findings, 6 patches fixed (empty-`stateCap` fail-open guard + new fail-open leg, `min >= 1`/non-empty metadata guards, witness owned-arm assertion, `fullOffers`/`DRAWS` rename, dead-init removal, AXIS comment reword), 3 deferred to 3.2/3.3 (logged in deferred-work), 10 dismissed — save-drift, seeded-leg drift and the AC6 gate claim all empirically falsified here (suite 304/304 green; `cardRuleReport` re-run shows `reduceClimb: []`). Status → done.
