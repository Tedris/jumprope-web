---
baseline_commit: cf324d93829bfebc1d40ffb8078b73b28e41388a
---
# Story 7.5: The gate sees the peel — meta-aware balance & prove

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the designer,
I want the summit-rate dial to stay honest under meta builds,
So that the peel cannot quietly break the balance.

7.5 is Epic 7's last story — the proof, not a feature. 7.4 shipped the trio (springsoles/luckyecho/longstride, upgrades.js:57-68), so a VETERAN player — one whose meta counters grew past the unlock thresholds — is dealt from a 15-card pool inside a run, while the fresh player's deal stays the v2 12-card pool (locked view = absence, the FR32 law). This story shows the NFR9 band (0.05, 0.20] survives both readings: AC1 CITES the meta-blindness decision S4, which was DECIDED 2026-11-10 pre-loop and RECORDED run-scoped in `architecture.md` (:168-172 + the :190-193 known-debt note; retro A3, epic-6-retro-2026-11-10.md:64) — the decision is an input here, not an open point (Decided D1). AC2 sweeps the gate with a trio-granting VETERAN build-space shape — measured in the create round at **0.175, in-band** (D3 evidence; epics.md:1101's exception lane stays open if the dev-round batch disagrees). AC3 lands the seed-honesty contract for batch-driven meta legs in a NEW `tests/metagate.test.js` (A2; donors: `tests/summitgate.test.js` :121-134) and keeps every bare dial bit-identical — 7.4's fresh-session threading (:95-97 the batch's creation site) already models the FRESH player exactly. The `And` clause disposes FR35's prestige clause by RECORDING the S1 default — no permanent climb power ships (D2) — and carries the A4 owned-cap decision-input pack (D4). Expected product diff: ZERO (D6). [epics.md:1087-1107; epics.md:77-81; epics.md:117-122]

## Acceptance Criteria

1. **The meta-blindness decision is ON RECORD before any balance-sensitive retune.** Given decision S4 (retro A3), when this story develops, then the band gate's run-scoped reading is CITABLE in `architecture.md` — which it already is: the "Band gate scope = run-scoped (S4, decided 2026-11-10 pre-Epic-7)" bullet (:168-172) and the (S4, 2026-11-10) known-debt note "Meta-blind summit gate — DECIDED run-scoped" (:190-193). This AC is satisfied by citing, per the 2026-11-10 pre-loop record (PRD META-01 row :135; memlog :11); the bot's build space is NOT widened with persisted meta state. [epics.md:1095-1097; architecture.md:168-172/:190-193; epic-6-retro-2026-11-10.md:64]
2. **Meta builds land in band — or the exception is named here with sweep evidence.** Given meta builds as of 7.4, when the summit-gate batch runs with the VETERAN shape (D1's trio-granting build), then summit rates stay in band (0.05, 0.20]. Create-round sweep (×2 identical node processes, D3 table below): veteran **0.175 in-band**; 4-shape aggregate **0.150 in-band**; the fresh 3-shape batch reproduces the recorded **0.14167** (bare 0.150 / ropeHeavy 0.150 / chargeHeavy 0.125). If the dev-round batch lands out of band, name the exception in this story's text with the sweep evidence (epics.md:1101; architecture.md:170-172 names meta shapes as the exception class) — a retune is NOT this story's lane (D6). [epics.md:1099-1101; epics.md:118]
3. **The bare (no-meta) build is unmoved, and the seed-honesty contract holds.** Given the bare build, when the gate re-runs, then bare-shape results are unchanged — the peel moves no bare dial — and the batch-driven meta legs hold the A2 seed-honesty contract: trio never enters the bare/fresh deal stream (locked view = absence, zero rng consumed by the lock read, upgrades.js:116-117), same-seed runs equal themselves, and NO current-build numerics live in test legs (FR10/FR11 protection). Lands as NEW `tests/metagate.test.js`; the cross-tree half of the bare-invariance proof is the 7.4 review's EXTERNAL witness — 274aac9-vs-HEAD same-seed streams byte-identical, MD5 70abd6d1… (7-4 story Debug Log :204) — the suite stays single-tree honest. [epics.md:1103-1105; epics.md:78; summitgate.test.js:16-18]
4. **The `And` clause is dispositioned by RECORD.** The FR35 prestige clause: S1 (2026-11-10 pre-loop) did NOT adopt prestige (no currency / no permanent climb power; PRD :135, memlog :11) — this story RECORDS the default: no permanent climb power ships, and none is added here. The A4 owned-cap decision-input pack rides this story's text (D4): the wall STANDS as-shipped; the decision stays PARKED post-v2 (retro A4, :65). Zero product change from either record. [epics.md:1107; epics.md:81; epic-6-retro-2026-11-10.md:65]

### Decided notes (kickoff decisions — RECORDED BEFORE implementation per the AC1/D-006 pattern; do not re-litigate)

1. **D1 — S4 is DECIDED (2026-11-10 pre-loop), run-scoped: cite, don't decide.** architecture.md:168-172 records the NFR9 band as defined for bare builds, the 6.1 bot's build space staying as shipped, and Epic 7 meta-shape rates reporting as named exceptions with sweep evidence; :190-193 keeps the reopening tripwire (meta shifting bare deal odds would reopen — FR32's zero-locks bit-identity is the tripwire). The nuance made EXPLICIT here: 7.4 made meta state change what a VETERAN player can be dealt inside a run (the unlock trio becomes dealable once the meta grew past the thresholds — shell.js:190's `lockedIdsFor(CARDS, meta)` at creation). The run-scoped reading means AC2's "meta builds" = build-space shapes that grant the trio AT RUN START (equivalently lockedIds `[]` = the 15-dealable pool) — NOT persisted-meta simulation, and NOT widening the bot with meta-aware picking. The gate's fresh-session threading (7.4 D6) models the FRESH player exactly; the VETERAN shape is the honest run-scoped reading of "meta builds as of 7.4". The trio-unlocked shape enters the sweep as a `shapes` OPTION at the call site — `summitGate({ shapes: { …, veteran: { lockedIds: [] } } })`: `summitGate` accepts an arbitrary shape map (summit-gate.js:151-153), the build spread at :99 lands AFTER the startRun fresh-view lockedIds at :97, and the sim's deal twins read `run.lockedIds ?? []` (game.js:203/:228), so ZERO support-file edits are needed. DEFAULT_SHAPES (:47-51) stays UNTOUCHED — `summitgate.test.js` already uses its own SHAPES literal (:28), so a new default would be a support diff buying nothing. Sweep = DEFAULT_SEEDS (:46, 40 seeds), the default band [0.05, 0.20] with the verdict law at :208 implementing exactly (0.05, 0.20] (rate = 0.20 reads `in`); pre-registered verdict wording — IN: "the meta-shape build lands in the NFR9 band; no exception named — the peel broke no dial"; OUT: "named exception: <shape> measures <rate> vs band (0.05, 0.20], sweep evidence in story text (retro §Epic 7 preview)" + STOP-and-ask before any retune (D6).
2. **D2 — FR35 prestige clause: the S1 default is RECORDED, no code surface exists to dispose.** S1 (PRD :135 "unlocks + outcome-counter gates (no currency, no prestige)"; memlog :11 "no currency/prestige") did not adopt prestige, so FR35's named-decision gate never fires: NOTHING permanent feeds climb power into run start — the trio are catalogue cards gated by counters, caps 4, effects live only inside a run (upgrades.js:57-68; effects rebuilt per run via freshEffects, game.js:117). This story ships no prestige surface, no permanent-multiplier, no run-start effect; the record above IS the disposition (epics.md:1107 first half). The CARD-09 back-door scan (epics.md:119) is discharged by AC2's sweep: offer cadence untouched (cadence byte-identical since 7.3), no offer-frequency escalation added.
3. **D3 — the sweep evidence (measured @ cf324d9, node, two independent processes with identical output; the dev round re-runs and appends its own rows to this table).** Recorded HERE per the A2 split — numerics live in story text, NEVER in test legs:
   - fresh 3-shape (DEFAULT shapes): aggregate **0.14167 in** — bare 0.150 / ropeHeavy 0.150 / chargeHeavy 0.125 — reproduces the 7.4 dev-round record (0.14167, 2060917) and 6.3's arm A (0.1417, sprint-status :100): the determinism witness for this story's baseline.
   - veteran `{ lockedIds: [] }`: rate **0.175 in** (7/40 summits); 4-shape batch aggregate **0.150 in**. The trio enters the veteran deal stream fully — all 15 CARDS ids appear in `offeredTally` AND `picksTally` (the trio is dealt AND picked, not merely present); `rngDraws` 2514 over 40 runs (seed-honesty per summitgate.test.js:126-134 — offers fire, seeds non-vacuous).
   - Reading: the meta layer pushes the dial UP (0.1417 → 0.150 aggregate; the veteran shape alone reads hottest at 0.175) but stays inside the band with headroom below 0.20. NO exception is named at these numbers; 0.175 → the dev round watches the veteran shape's distance to the ceiling in its re-run before writing "in" into the verdict wording.
4. **D4 — the A4 owned-cap decision-input pack (user-answered 2026-11-11, recommended option taken): the WALL STANDS as-shipped; the decision stays PARKED post-v2 (owner Ed, retro :65).** Record, zero product change here: owning at cap hides the card for the run's life (the owned arm precedes the `stateCap` arm — upgrades.js:98-102; architecture.md:177-184 w1) and a stripped/spent card can never re-expose (the documented re-spec hole stays as-built). Measured inputs (6.3 sweep, 6-3 story Debug Log create-round): extrarope picks 135 (A) / 142 (B) across 40 runs = **3.4–3.6 picks/run vs cap 4** — the wall brushes but rarely binds in bot builds; reinforce ≈ **1.05 vs cap 2**. Ledger lineage: deferred-work.md:153-157 (the class), :181 (Epic 3 close), :248 (Epic 5 close "wall stands until 6.x"), 6.3 Decided 6 (decision RE-POINTED post-v2). If a correct-course session ever lands, it owns the deal-site code and its tests — never this story.
5. **D5 — AC3's legs: a NEW `tests/metagate.test.js`, four structural legs; NO frozen leg re-contracted.** The literal cross-tree form ("bare outcomes equal across the 7.4 diff") needs two working trees — out of contract for a gate leg — so the suite pins the seed-honesty CONTRACT the way summitgate.test.js does, single-tree: (a) **batch trio-absence** — a reduced-seed bare-shapes batch (e.g. seeds [0,1,2,3] × horizon 14400, the :122 craft; shapes passed per-call, D1) reports NO `springsoles`/`luckyecho`/`longstride` key in ANY shape's `offeredTally`/`picksTally` (locked view = absence end-to-end through the batch's real `pickOffers` draws; unit-level twins live in locks.test.js — metagate owns the BATCH view); (b) **veteran-grant witness** — same batch + `veteran: { lockedIds: [] }`: all three trio ids appear in the veteran shape's `offeredTally` keys and `rngDraws > runs.length` (dealability observed, not assumed; the rngDraws law verbatim from :126-134); (c) **determinism twin** — same config twice, `deepEqual` (:121-124 idiom, fresh AND veteran configs); (d) **bare-invariance law** — `summitGate({shapes:{bare:{}}})` vs `summitGate({shapes:{bare:{}, veteran:{lockedIds:[]}}})`: the bare-shape reports `deepEqual` — adding a meta shape to a batch MUST not shift the bare dial one bit (per-(shape,seed) independence is what makes "the peel moves no bare dial" a MECHANISM, not a hope; runSeed carries no cross-shape state, :80-142). Cross-tree proof stays EXTERNAL: cite 7-4 story :204 (MD5 70abd6d1…, 274aac9-vs-HEAD same-seed byte-identity). Zero current-build numerics in any leg (rates/medians/tallies-values never asserted — keys and laws only; summitgate.test.js:16-18 discipline, A2). Budget: reduced-seed sub-batches, suite cost ≤ ~1 s; the FULL sweep runs OUTSIDE the suite (sandbox, 6.3 precedent) with the ×2 process witnesses into the Debug Log.
6. **D6 — zero product code is the expected shape of this story.** `js/game.js`, `js/upgrades.js`, `js/shell.js`, `js/areas.js` byte-identical vs baseline; `tests/support/*` byte-identical (the shapes option makes the sweep a pure call-site artifact — Main's design note, honored in D1). If the dev-round sweep breaks the band, the STOP-and-ask lane fires BEFORE any retune: a retune is a balance decision needing new evidence, and the CARD-09 constraint (epics.md:119) forbids buying band conformance with pacing escalation through the back door. Exceptions are NAMED (AC2), not tuned away.
7. **D7 — bookkeeping.** Census allow-appends ×2 for this story artifact (list-only, the c38070e create-round rule — same shape as the 7.4 create commit 5db26fb; the dev round adds `tests/metagate.test.js` as the C1 append). The two banked ledger notes ride UNTOUCHED and are NOT owned here: creation-site single-witness (deferred-work.md:293-298 — trigger is touching unlocks.test.js leg (b) or startFreshRun; this story touches neither, and metagate's legs are batch-view, not creation-site) and the L9 JIT tier note (:299-304). `index.html`/`package.json` untouched (epics.md:116); the by-tree censuses' porcelain arms are satisfied by this commit's allow-list appends.

**Questions:** none outstanding — AC1's decision predates this story (cited, D1); S1/S4 answered pre-loop 2026-11-10, A4 user-answered 2026-11-11; the v2-deploy UAT findings rider (retro :54 "if the deploy precedes the peel") does NOT ride — no evidence the v2 deploy preceded Epic 7 (retro :72 still frames the deploy as the open decision). The one STOP-and-ASK tripwire (D6, a band break needing retune) did not fire on the create-round sweep.

## Re-contract authorizations (written here, per the frozen-test discipline — AGENTS.md:52)

**NONE.** This story re-contracts zero frozen legs and touches zero frozen files except the two census allow-sets (this create commit: the story artifact, list-only; dev round C1: `tests/metagate.test.js`). PROOF OBLIGATIONS — untouched-green, deviation = a bug, not a contract change: `tests/summitgate.test.js` all legs green UNTOUCHED (its own SHAPES literal :28 makes the DEFAULT_SHAPES-free plan safe); `tests/balance.test.js` pins :410-411 green byte-identical; `tests/summitapproach.test.js` cadence witnesses green; `tests/locks.test.js` / `tests/unlocks.test.js` green UNTOUCHED (the trio laws unchanged — unlocks.test.js leg (b) stays the lone creation-site witness, ledger :293-298); `tests/offercadence.test.js` green (cadence untouched); `tests/boundary.test.js` green (zero sim import-graph change); the §6/§4.3 censuses green ONLY because of this commit's appends.

## Tasks / Subtasks

- [ ] Task 1 — cite-check the record (AC: 1; D1)
  - [ ] Re-verify the S4 rows read as cited (architecture.md:168-172, :190-193; PRD :135; memlog :11; retro :64) and note the citation lines in the Debug Log. Zero diff — AC1 is discharged by the record, not by code.
- [ ] Task 2 — the AC2 sweep + verdict (AC: 2; D1/D3)
  - [ ] Run the full DEFAULT_SEEDS batch TWO ways in-sandbox: fresh 3-shape (reproduce 0.14167) and the 4-shape batch with `veteran: { lockedIds: [] }` via the `shapes` option — call-site script, ZERO support-file edits (D1); ×2 identical-process witnesses; per-shape rates + aggregate appended to D3's table HERE.
  - [ ] Write the pre-registered verdict wording (D1) into this file. Out-of-band ⇒ name the exception with the evidence and STOP-and-ASK before proposing any retune (D6).
- [ ] Task 3 — `tests/metagate.test.js` (AC: 3; D5)
  - [ ] Four legs (a)-(d) exactly as D5 defines them; reduced-seed sub-batches passed per call (no DEFAULT_SHAPES edit, no memoized full batch); mechanism assertions only — ZERO current-build numerics (A2); ×2 determinism witness inside leg (c).
  - [ ] C1 census append: `tests/metagate.test.js` into BOTH allow-sets (list-only, the 7.3/7.4 wording) in the dev commit.
- [ ] Task 4 — diff-facts, records, green gate (AC: all; D2/D4/D6/D7)
  - [ ] Diff fact: `js/` and `tests/support/` byte-identical vs baseline (hash-diff log in the Debug Log); the D2 prestige record and D4 A4 pack need no code — they are text records discharged by existing in D2/D4.
  - [ ] `./run_tests.sh` green (baseline **602/602 @ 8.51 s** @ cf324d9, re-measured at create; expect 602 + the metagate legs; NFR4 < 10 s).

## Dev Notes

### Current state (verified 2026-11-11 @ cf324d9)

- Gate **602/602 @ 8.51 s** (re-run at create; 7.4 recorded 602/602 @ 8.599/8.542 s, 7-4 story :169). CARDS = 15 entries; the trio at upgrades.js:57-68 carries `unlock` metadata read by `lockedIdsFor` (:86-91); `lockedIdsFor(CARDS, undefined)` = `['springsoles','luckyecho','longstride']` (all three locked fresh). Deal twins `run.lockedIds ?? []` at game.js:203/:228; the 17th run-record key sanitized at createRun :116-117; the ONE shell creation site shell.js:190; the 7.4 ARM diff (announce-only) :753-761 — all untouched here.
- The batch: `summitGate` (summit-gate.js:149-216) — `seeds`/`shapes`/`band` options :151-154, per-shape `rate` :195, verdict law :208, report `{verdict, rate, band, tunables, shapes}` :209-215. `runSeed` (:80-142): fresh-view creation at :97, build spread lands last at :99 — the veteran-shape mechanism (D1). `DEFAULT_SEEDS` :46 (40); `DEFAULT_SHAPES` :47-51 (untouched, D1). Harness: `runBot` fresh view balance-harness.js:84, `cappedOwned` :58-60, AXIS incl. trio :17-39.
- Dial state: bare 0.150 / ropeHeavy 0.150 / chargeHeavy 0.125, aggregate 0.14167 (reproduced; 6.3 arm A 0.1417); balance enumeration pins 0.0707/0.2054 vs 0.07/0.21 ±0.01 (balance.test.js:396/:410-411; 7-4 :87) — both stay green UNTOUCHED. Cross-tree bare proof: 7-4 :204 (MD5 70abd6d1…).
- Census allow-sets end at ceilingbreak.test.js:741-742 and summitapproach.test.js:1030-1031 (the 7.4-era entries); this story's artifact is appended BY THIS CREATE COMMIT, list-only.

### Pitfalls

- **Never assert rates, medians, or tally VALUES in metagate legs** — keys, laws, and deepEqual twins only (A2; summitgate.test.js:16-18). Recorded numerics live in THIS file's D3 table, per the 6.3 precedent.
- **No support-file or DEFAULT_SHAPES edits** — the `shapes` call-site option is the whole mechanism (D1). A support diff here would re-open the 7.4 threading-comment surface for nothing.
- `{ lockedIds: [] }` belongs ONLY in the veteran shape. A bare shape carrying it would deal the fresh bot the trio and MOVE the bare dial by construction — the exact AC3 violation this story hunts.
- **Do not widen the bot** (meta-aware picks, meta-keyed policy): S4 rejected that 2026-11-10 (architecture.md:190-193). The competence model documented at summit-gate.js:6-19 stays as shipped.
- Band break ⇒ exception + STOP-and-ASK, never a retune (D6; CARD-09 constraint epics.md:119 — no escalation through the back door without new evidence).
- The suite budget: the FULL 120-run batch already runs once via summitgate.test.js's memoized `live()` (:30-36); metagate legs must use reduced-seed sub-batches so the gate stays < 10 s (NFR4). The full sweep lives in the sandbox, not the suite (6.3 precedent).
- `outcome` vs `won` (:75-79 comment): the report's rate counts EVALUATOR wins on the swept ladder — don't hand-roll a rate from `outcome` keys.
- The censuses' porcelain arms fail-close on untracked files: this commit's appends must land WITH the story file or the gate reads red (the known create-tripwire, 6.3 precedent).

### Precedents to follow

- 6.3's sandbox sweep + create/Debug-Log numeric tables + Decided-6 record style (the D3/D4 register).
- summitgate.test.js: memoized/shrunken batch idioms, the rngDraws seed-honesty law (:126-134), the determinism twin (:121-124), zero-value discipline (:16-18).
- 7.3/7.4 create commits (74daad9 / 5db26fb): the census append wording + the create-commit file set (story file, sprint-status, census ×2).

### AC → test mapping

- AC1 → no test (citation audit, Task 1; Debug Log note).
- AC2 → sandbox sweep (Task 2, numerics in D3 here) + metagate legs (b)/(c) as the in-suite structural shadow.
- AC3 → `tests/metagate.test.js` legs (a)(c)(d) + the untouched-green proof list + the external MD5 witness (7-4 :204).
- AC4 ("And") → text records D2 + D4 (no test surface by design).

### Project Structure Notes

- New file: `tests/metagate.test.js` (dev round). Modified in the dev round: nothing outside the two censuses (C1) and this story file's Debug Log. Create commit: this file, sprint-status.yaml, ceilingbreak.test.js, summitapproach.test.js (appends).
- Sandbox for the sweep: any /tmp path; script re-creatable from Task 2's text (D3 table is the reproduction target).

### References

- epics.md: Story 7.5 :1087-1107; FR31-35 :77-81; Epic 7 riders :117-122 (:117 riders, :118 band armor, :119 CARD-09, :120 shell-side meta).
- architecture.md :163-172 (batch + run-scoped band gate), :177-193 (w1 owned-cap wall; S4 note).
- epic-6-retro-2026-11-10.md :50-56 (Epic 7 preview riders :54-56), :64 (A3), :65 (A4).
- prd.md :135 (META-01 row — S1–S4 pre-loop record + 7.4 kickoff answers); memlog (`prds/prd-jumprope-web-2026-11-10/.memlog.md`) :11.
- deferred-work.md :153-157, :181, :248 (owned-cap class lineage), :293-298 and :299-304 (the two banked notes, ride untouched).
- Code/harness: summit-gate.js :44-51/:80-142/:149-216; balance-harness.js :17-39/:58-60/:69-150; upgrades.js :52-68/:86-91/:98-109/:116-133; game.js :108/:116-117/:203/:228; shell.js :184-192/:753-761; summitgate.test.js :16-18/:28-36/:109-134; balance.test.js :396/:404/:410-411; ceilingbreak.test.js :572-742; summitapproach.test.js :862-1032.
- Sibling stories: 7-1 (ledger), 7-2 (counters), 7-3 (locks, inert law), 7-4 (the flip; :87/:169/:204 cited); 6-1/6.2/6.3 (the instrument, tunables, sweep style).

### Deferred items (not this story)

- **A4 owned-cap decision execution** (buy-back vs lifetime-lock code + deal-site tests) — post-v2 correct-course, owner Ed (retro :65; D4 pack above). This story carries the PACK only.
- **Creation-site single-witness note** (deferred-work.md:293-298) — owner stays "any future story touching unlocks.test.js leg (b) or the creation site"; 7.5 touches neither. **L9 JIT note** (:299-304) — owner stays the first story whose L9 leg misfires. Both ride untouched (D7).
- **w2 seed-sensitivity surface** (architecture.md:185-186; re-owned at deferred-work.md:259 to any story instantiating new batch-driven legs) — metagate IS such a story; its seed-honesty legs ARE the standing mitigation, and the surface itself stays OPEN by design.
- D-N12 JUICE_TIERS/VISTAS feel retune + F1 hardware UAT — v2-deploy UAT/feel lane (retro :62); no game-feel surface here.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-11-11 (create round): story created from epics.md:1087-1107 + FR31-35 (:77-81) + Epic 7 riders (:117-122) + the S1–S4 pre-loop record (PRD :135, memlog :11) + retro A3/A4 (:64-65) and the §Epic 7 preview (:54-56). AC1 discharged by CITATION — S4 decided run-scoped 2026-11-10 (architecture.md:168-172/:190-193); veteran-shape reading of "meta builds" made explicit (D1); FR35 prestige recorded as the S1 default (D2); A4 owned-cap pack recorded with the 6.3 numbers (D4). Create-round sweep measured @ cf324d9 (×2 identical processes): fresh3 reproduces 0.14167; veteran `{ lockedIds: [] }` 0.175 IN, 4-shape aggregate 0.150 IN — no exception named; trio fully enters the veteran deal stream (15/15 ids), rngDraws 2514 @ 40 runs. New `tests/metagate.test.js` planned (4 legs, zero numerics, no frozen re-contract); zero product code expected (D6); census allow-appends ×2 list-only; sprint-status 7-5 backlog→ready-for-dev. Gate 602/602 @ 8.51 s.
