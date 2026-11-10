---
baseline_commit: 3af769c3e03fe1cca9876387d2eba5ba3586cf72
---

# Story 6.2: Real tunables — retire the placeholders

Status: ready-for-dev

*Ultimate context engine analysis completed — comprehensive developer guide created (2026-11-10).*

## Story

As a player,
I want the ceiling ladder and climb rate tuned,
So that runs hit the 3–5 minute summit window instead of a placeholder's guess.

## Acceptance Criteria

1. **Tunables carry balanced values.** Given sweep results from Story 6.1, when tunables are replaced, then the ceiling ladder (was 250/600/1k/1.5k/2.1k), altitude-per-skip (was 2 u), and area period multipliers (was ×1.0/0.96/0.92/0.88/0.85) carry their balanced values, each constant annotated with the gate result that derived it (FR7, FR15). [epics.md:913-915]
2. **In-band result holds; invariants green.** Given the replaced values, when the summit gate re-runs, then the in-band result holds and all prior epic invariant tests (monotonic ascent, win-once, i-frame length) remain green **unchanged** (NFR4, NFR5). [epics.md:917-919]
3. **No test edited to pass.** And no test was edited to pass under the new values — expectations that depend on tunables derive from the records themselves (NFR5). [epics.md:921]

**And** — per the ledger (embedded verbatim below): the offer-cadence cluster lands here with its witness (:5-9); the nearmiss/v1parity physics-constant exports ride the retune (:26-27, :43-44); the ALT float-equality item closes by choice-of-value with its one self-announced leg re-contracted (:55-56); the D-N12 juice/vista seeds and the tier-variant ascend voice ride the 6.2/UAT **feel lane**, not this story's code (:180, :198-199); the seed-sensitivity flake rule stands (:230).

### Decided interpretations (do not re-litigate)

1. **Lanes and files.** Product code: `js/game.js` (`ALT_PER_POINT` :36; the forgiven-branch offer check ~:205-213; the physics literals via exports), `js/areas.js` (ceiling + periodMul ladder), `js/player.js` (physics-constant exports). Tests: ONE new file `tests/offercadence.test.js`; the four re-contract legs R1-R4 and the one-leg addition A1 below — nothing else in any existing test file changes. `tests/support/summit-gate.js` and `tests/support/balance-harness.js` stay **byte-identical** (live instrument consumers in 6.3; the gate needs no change — it reads tunables from the live records). No `index.html`/`package.json`/`.github`/`js/shell.js`/`js/render3d.js` touches. Sweeps run in **/tmp scratch copies** of `js/` + `tests/support/` — never in the repo tree.
2. **Target acceptance (what "balanced" means).** On the final values, `summitGate({})` (3 shapes × seeds 0..39 × 43,200 ticks) must show: (a) aggregate AND every-shape rate in [0.05, 0.20] (NFR9 band); (b) every-shape `medianSummitSecs` ≤ 300 s and ≥ 180 s. If the sweep finds no point satisfying both, the fallback is: ≥ 2 of 3 shapes ≤ 300 s, aggregate ≤ 300 s, every shape ≤ 315 s, and the miss is written up honestly in the Debug Log + story amendment (the bare-shape "competent build" read — School-B measurements leave bare 305-309 s; ropeHeavy/chargeHeavy land 296-301 s). The dev round owns the final values; the acceptance above is the definition of done. Trip counts roughly double at fast-period plateaus (≈33/40 vs 20-26 at base) — **accepted by design**: the period ladder IS the GDD-sanctioned difficulty thermostat ("difficulty is player-chosen … plus area pressure — each area applies an escalating rope period multiplier (placeholder … designer has not tuned it)", gdd.md Run Structure :277-290); faster rope = harder is the mechanism working, and the rate band + shape spread (frontier plateau spread 0.125-0.15) is the guard.
3. **School B is the design — summit-preserving retune.** Two schools were swept against the real instrument (19 candidates, 3×40×43,200, frontier table in Debug Log). School A (lower the summit ceiling to ~1750 + ALT 2.2 + fast periods) hits every-shape medSum ≤ 300 but is REJECTED: (a) ALT 2.2 = 11/5 is non-dyadic and breaks the frozen exactness fences (`seedAltitude % ALT_PER_POINT === 0` at `tests/summitapproach.test.js:320`, `tests/arealadder.test.js:218`) → 4-5 un-authorized frozen-leg re-contracts; (b) a summit below 2000 sends the near-summit rigs (`tests/balance.test.js:173/:178` altitude0 2000/1980, `tests/summitgate.test.js:201` altitude0 2000) into instant-win VACUITY (the retro-A1 trap) — rigs must re-derive from records, more frozen tails. **School B: `ALT_PER_POINT = 2.5`, summit ceiling stays 2100** (all near-summit rigs stay honest and non-vacuous), middle rungs MAY be trimmed (must stay multiples of 5, strictly increasing), and the **period-multiplier ladder is the length lever** — periods `×1.00 / 0.94 / 0.88 / 0.82 / 0.76` is the sweep starting point (measured: ALT 2.5 + these periods, ladder unchanged → rate 0.150 in, medRun 292/276/263 s, medSum 309/301/297 s; mid-rung trim `[250, 600, 950, 1400, 2100]` same periods → rate 0.142, medSum 308/299/301). Period-shortening costs trips (rate falls: base ladder + fast periods + ALT 2 → 0.033-0.050 out-low — reproduced in the create-round scratch sweep); the compensation is ALT up to 2.5 and/or middle-rung trims, NOT the summit row. Final call belongs to the dev round with the full gate.
4. **Retune domain (frozen-file law — derived from the rig fences, not taste).**
   - `ALT_PER_POINT` ∈ dyadic, and **2.5 is the only practical choice**: dyadic values (2, 2.5) keep every exact-equality fence bit-true — `altitude === ALT_PER_POINT × score` is a sum of small-denominator dyadic multiples, every catalogue `scoreMul` (1, 1.25, 1.5, 2) is dyadic, and the rig seeds `seed/ALT_PER_POINT` (ceiling−20/−30, 40, forceScore margins) divide exactly. Non-dyadic ALT (2.1/2.15/2.2/2.25) reddens the mod-guards in frozen `summitapproach.test.js:320` / `arealadder.test.js:218` with no authorized re-contract — off the table. ALT 3+ breaks the same fences (odd seeds) and blows the rate band (alt25-on-base already 0.208 out-high; alt3 0.47+).
   - **Ceilings: positive integers, strictly increasing, multiples of 5** (so ±20/±30 rig offsets stay 2.5-exact), row 5 = 2100 (Decided 3), spacings ≥ 250 u (the `ascentRig` ceiling−30 margin and the 40 u jump arc need each rung comfortably above the arc bookkeeping).
   - **`AREAS[0].periodMul === 1.00` exactly** — `tests/areapressure.test.js:143-167` pins the alley tick bit-identical to the pre-4.2 expression, and the v1-parity/1.x suites run at area 1. Row 1's ceiling keeps `ceiling % 5 === 0` (250 recommended unchanged — the §7 alley witness seeds ceiling−30 and the trace must stay under it: `areapressure.test.js` asserts `run.area === 1` "under 250 u" as a literal in its message only, the logic is derived).
   - **periodMul strictly decreasing** (`areapressure.test.js:251` area-vs-area increment legs + the buffer "summit window SHORTER in seconds" leg); `MIN_PERIOD_MUL ≥ ~0.74` floor: the blackout-bound legs (`areapressure.test.js:204-208`, worst-step and dt-cap formulas) hold with ~9× margin at 0.76 — going below buys little and erodes the fence. The summit buffer's real-time grace shrinks to 0.1×0.76 ≈ 0.076 s — intended pressure, note it for UAT.
5. **Instrument gotcha — sweeps MUST use live physics, not options.** `summitGate({altPerPoint, ladder})` steers ONLY the post-hoc evaluator (`summit-gate.js:79-123` wires both into `evaluateLadder`), NOT the simulation — period/ceiling physics, ascends, strips, and i-frame blanks stay the shipped ones. Option-passing is good for rate-screening altitude/ladder candidates (linear-exact for altitude); a retune sweep MUST patch `js/areas.js` + `js/game.js` in a **/tmp copy** (or pass nothing and retune the real files in place). Sandbox recipe (verified): `cp ~/jumprope-web/js/{areas,game}.js /tmp/e62/js/` then `node /tmp/e62/run.mjs '{"name":"x","ladder":[...],"periods":[...],"alt":2.5}'` — one process per candidate, fresh copies, ~1.5 s per 120-run batch. The FINAL re-gate always runs the repo copy after the real edits (default options — `tunables` then echo the live records).
6. **6.1's review law holds — verified, no summitgate re-contract needed.** Every `tests/summitgate.test.js` leg is law-form under School B: the live-batch legs assert structure + mechanism; `tunables deepEqual` is record-derived (`:109`); the crafted mid-climb leg (`:153-173`) derives `summit − 200` from AREAS and its `rate > 0` is implied by any in-band batch (winners ⊇ sim summits); the iFrames-parity craft ladders are absolute; the parity leg (`:195-205`, altitude0 2000) stays honest and non-vacuous ONLY because the summit stays 2100 (another School-A disqualifier). `tests/balance.test.js` needs nothing: the summitRate near-summit legs (`:171-188`) stay true-below-summit, the dial legs pass crafted ALT/ladder through the evaluator (ALT-independent), and the R1/R2/R3 legs derive their bands from records with thresholds (`climbDeltaPick > 0.5`) that ALT 2.5 moves in the safe direction. Dev MUST run the full gate to confirm; if any 6.1 leg reads red, STOP and report — do not self-authorize.
7. **Offer-cadence cluster: implement the check-gap, point the N-scaling at 6.3.** (a) The buffer-forgiven branch (`js/game.js:205-213`) increments `skips` with NO `shouldOfferUpgrade` check while the cleared path checks at `:192` — a forgiven 10th skip silently defers its offer to the 20th skip, violating the FR10 every-10th-skip law. LAND IT HERE (ledger :5-6: "Cadence move + witness land together in the balance pass"): mirror the cleared branch's block — check, state-aware `pickOffers`, non-empty guard (exhausted pool must NEVER freeze in choose), `break` on offer. The gate is UNAFFECTED (measured reasoning: the policy bot never presses, so `buffer` never arms in a batch — the fix cannot move a batch number; dev may confirm with one scratch batch diff). (b) The N-scaling half (first offer ≈ 1.85 revolutions at N=5; `CLOSE! ×N` callouts accumulate N×/revolution — ledger :8-9) is an offer-PACING verdict = CARD-09 = **Story 6.3** (its instrument ships in 6.1: `picksTally`/`terminalRopes`); 6.2's contribution is that the rope-heavy shape must stay in the band after the retune — acceptance (a) above already forces it. No cadence constant changes here; FR10's every-10th-skip law stays shipped (epics 6.3: "current v1 pacing remains the shipped behavior regardless").
8. **Physics-constant exports (ledger :26-27, :43-44).** Export from `js/player.js`: `GRAVITY = 1800` and `CLEAR_MIN_HEIGHT = 18` (module constants, UPPER_SNAKE per AGENTS.md). Replace the product literals THROUGH them: `js/player.js:13` `gravity = GRAVITY`, `:37` `minHeight = CLEAR_MIN_HEIGHT`, `js/game.js:120` `GRAVITY / run.effects.floatMul`, `js/game.js:141` `CLEAR_MIN_HEIGHT / run.effects.windowMul`. Values are identical, so every trace is byte-identical by construction. The rigs' duplicated literals die via re-contracts R3/R4 (the D-N12 pairing: the exports land with the balance retune, no standalone chore).
9. **Annotation format (AC1's "each constant annotated with the gate result").** One comment line per retuned constant, quoting the final Debug-Log batch: value + `gate: aggregate rate / per-shape rates / medSum` + date, e.g. `ceiling: 1400, // 6.2 retune: gate 0.14 in, shapes .14/.15/.13, medSum 308/299/301 s @ 2026-11-11`. Constants whose sweep evidence says "keep" carry the same evidence (`// 6.2 gate-confirmed unchanged: …`) — a validated value, not a placeholder. Update the `js/areas.js` header ("The numbers are PLACEHOLDERS — Epic 6 owns the balance pass") and the `js/game.js:36` placeholder comment to as-shipped prose.
10. **Seed-honesty and the flake surface (ledger :230).** New legs carry ZERO seed-specific current-build numerics — band/verdict LAW only, aggregate over the full 40-seed batch (granularity 2.5%); per-run outcomes are data, never assertions. The Debug Log records the batch run twice (deep-equal determinism witness) and the final per-shape table — that table IS the gate result every constant annotation cites.
11. **Budget.** Suite at baseline: **561/561 @ 8.70 s wall** (create-round `time node --test tests/` — measured this story). The in-band/clock assertions ride A1's leg appended to `tests/summitgate.test.js`, which reuses that file's ONE memoized lazy batch (`:30-34`) — **~0 s extra wall** (review-round append precedent). The new `tests/offercadence.test.js` is scripted-sim-only (~ms, its own process). Record the before/after `time node --test tests/` pair per 6.1's Decided-8 discipline; if the wall lands > ~9.5 s, name the seed-cut ladder: 40→30→20 FIRST, horizon last, shapes NEVER.

## Ledger items embedded (every 6.2 / "Epic 6 balance pass" / "6.2/UAT" owner, deferred-work.md line cites)

**1. Offer-cadence cluster — buffer-forgiven offer check + N-scaling (deferred-work.md:5-9) — DISPOSITION: implement the check (Decided 7a), point N-scaling at 6.3 (Decided 7b):**
> - **Buffer-forgiven pass bypasses the offer check** (`js/game.js` buffer branch) — a forgiven 10th skip increments `skips` with no `shouldOfferUpgrade` check, deferring the offer to skip 20 (`% 10 === 0`). … **OWNER Story 6.2 CONFIRMED** (2026-11-08): folded into the offer-cadence cluster (`:8`); still live (`skips += 1` at `js/game.js:211` has no check; the normal path checks at `:192`). Cadence move + witness land together in the balance pass, not mid-epic-gap.
> - **Offer cadence + streak escalation scale with rope count** — first offer ≈1.85 revolutions at N=5; `CLOSE! ×N` callouts accumulate N× per revolution. Assigned to Epic 6 (balance pass) by GDD §163-186.

**2. Nearmiss-rig physics constants + exports (deferred-work.md:26-27, restated :43-44) — DISPOSITION: implement (Decided 8 + R3/R4):**
> - **Near-miss rig duplicates physics constants; band guard self-referential** (`tests/nearmiss.test.js:23-33`) — `GRAVITY = 1800` / `MIN_HEIGHT = 18` inline literals duplicate non-exported sim constants … Fix requires exporting the physics constants from `game.js`/`player.js` … **CONFIRMED owner: Epic 6 balance pass** (2026-11-09): the physics-constant exports land with the balance retune (the :40 pairing).

**3. ALT float-equality invariant (deferred-work.md:55-56) — DISPOSITION: close by choice-of-value; the one self-announced leg re-contracts (R1); the exact legs stay byte-identical:**
> - **Invariant leg uses exact float equality** (`tests/altitude.test.js:104`) — `altitude === ALT_PER_POINT × score` is exact only because the placeholder `ALT_PER_POINT = 2` is a power of two; a non-power-of-two balance value will fail the leg with no product bug. … **OWNER Story 6.2 CONFIRMED**: the retune story carries the sanctioned re-contract of the exact-equality legs in its story text.
Exactness needs *dyadic*, not power-of-two: ALT 2.5 = 5/2 with the all-dyadic scoreMul catalogue keeps every leg bit-exact (Decided 4), so `altitude.test.js:95-104` needs NO tolerance rewrite — the ledger's "re-express with tolerance" is superseded by choice-of-value (write this citation in the story amendment). The ALT-pin leg (:34-35, "the Epic 6 balance pass re-contracts this leg when it lands real numbers") re-contracts as R1.

**4. D-N12 provisional seeds — JUICE_TIERS ascend row + VISTAS rope ladder (deferred-work.md:180) — DISPOSITION: record for the UAT feel lane (NOT this story's code):**
> - **Beat-feel retune: `ascend { hitstop: 60, shake: 1.75, particles: 12 }` + the VISTAS rope hex ladder are D-N12 provisional seeds** (`js/shell.js` JUICE_TIERS, `js/render3d.js` VISTAS) — retuning is a data-only diff in those two literal-blocks once landed. — **OWNER: Story 6.2/UAT balance pass**.
The retune here changes NUMBERS the gate measures; juice/palette retunes need EARS and eyes (playtest), not a batch — and no gate result derives them. The 0.76-period summit tempo makes the ascend beat land on a faster rope: flag the beat-feel retune as a concrete UAT item ("does the ceiling-break beat still land as a moment at the tuned tempo?"). The blocks are unchanged in this story.

**5. Tier-variant ascend voice (deferred-work.md:198-199) — DISPOSITION: record for the UAT feel lane; explicitly NOT bundled into this retune diff:**
> - **Tier-variant ascend voice is a legitimate but SEPARATE future diff** (Auditor F1) — `js/audio.js:189` ships uniform … the `handleEvent(name, area)` widening + the five frozen wrapper re-contracts … are 6.2's written-authorization work. … **OWNER CONFIRMED — Story 6.2/UAT feel lane**.
The owner stamp permits, it does not compel: epics.md:735's "may shift" is satisfied by the uniform ship, the signature work needs 5 frozen `handleEvent`-wrapper re-contracts (v1parity/polish/secondwind/audio-feelcap copies) with zero measurement driver, and AC3 ("no test edited to pass") is best served by the smallest honest diff. Decision taken and recorded: keep uniform; the item stays ledger-open for the UAT feel pass with this rationale.

**6. Rope-heavy / charge-heavy counterweight re-measure (deferred-work.md:92-95, the 6.1 PAID stamp's live half) — DISPOSITION: implement — the re-gate re-runs the three-shape batch under final values; every-shape band membership is acceptance (a).** The 6.1 strip law (Debug Log: beyond ≈2 ropes the hold-0.5 lead-in strips the gain — terminalRopes ≈ 1 in every shape) stands as context: counterweight rope-heavy via the BAND, never via strip mechanics.

**7. Seed-sensitivity flake surface (deferred-work.md:230) — DISPOSITION: implement the rule (Decided 10); the surface itself stays open for 6.3's sweeps.**

**8. Rising-edge crossing blind spots — conditional lane revisit (deferred-work.md:7-8, "revisit-if-touched" :166) — DISPOSITION: revisited; trigger NOT met; no change.** The blind spot needs a per-tick phase increment exceeding the 0.1-wide feet window; the retuned worst case is `(STEP × WORST_ROPEMUL)/(1.3 × 0.76) ≈ 0.0094` — 10× under. The conditional stays open per ledger wording.

**9. 6.1 handoff (story 6.1 Debug Log "Rope-strip law (handed to 6.2)" + the LIVE-BATCH sweep table) — DISPOSITION: consumed as the sweep substrate** (frontier base row = that table: rates 0.075/0.100/0.100, medRun 309-336 s, medSum 310-334 s — rate already in band, wall-clock OUT; length, not rate, is 6.2's work).

## Re-contract authorizations (written here, per the frozen-test discipline — AGENTS.md:52)

The retune reddens exactly FOUR legs through no product bug. Exactly these are authorized; every other line of every other existing test file stays byte-identical, and the diff must show no other existing-file change.

- **R1 — `tests/altitude.test.js:34-35`** (inside the factory-contract leg at `:30`). The leg itself announces this round ("the Epic 6 balance pass re-contracts this leg when it lands real numbers"). Authorized edit: the literal pin `assert.equal(game.ALT_PER_POINT, 2, …)` becomes the balanced literal — `assert.equal(game.ALT_PER_POINT, 2.5, 'the 6.2 balance retune pins the tuned value — annotate-change via the gate table')` — with the surrounding typeof/finite-positive assertions and everything else in the file byte-identical. (If the dev round lands ALT 2 unchanged — not the current evidence — the authorized form is the same literal with `2`.)
- **R2 — `tests/ascent.test.js:33-57` AREAS contract leg** (self-announced the same way). Authorized edit: replace the `LADDER` literal-table expectation with the LAWS the retune is bound by, record-derived where possible: five rows; names `['alley','rooftops','blimp','stratosphere','moon-approach']` in order; `ceiling` strictly increasing, all multiples of 5, row 5 = 2100; `periodMul` strictly decreasing with `AREAS[0].periodMul === 1.00`; rows deep-frozen. The leg title/comment updated to name Story 6.2's retune. No other line in the file changes (every other leg already derives).
- **R3 — `tests/nearmiss.test.js:23 + 26`** (ledger :26-27 authorization). Authorized edit: the two physics literals become imports from `../js/player.js` (`GRAVITY`, and `MIN_HEIGHT` bound to `CLEAR_MIN_HEIGHT` — keep the local names so all downstream references stay byte-identical); the import line may gain the specifier; the comment on :22-:26 may name the exports. Assertions untouched.
- **R4 — `tests/v1parity.test.js:31 + 33`** (ledger :43 — "nearmiss/**v1parity** rigs"). Authorized edit: same two literals bound to the `js/player.js` exports (values identical — the parity proof is unaffected), plus the one-line comment at `:22` that claims the numbers are rig-local inline literals. No script, cell, or assertion changes.

- **A1 — `tests/summitgate.test.js` ONE-LEG APPEND (not a re-contract; the review round's leg-append precedent):** AC2's "the in-band result holds" needs an ASSERTION, and it must ride the file's existing memoized lazy batch (`:30-34` `liveReport`) so it costs ~0 wall. Authorized: append exactly one leg — `report.verdict === 'in'`, every-shape `rate ∈ [0.05, 0.20]` vs the band the batch was constructed with, and every-shape `medianSummitSecs <= 300` (the NFR9 law, a spec constant — not a build-pinned number) — reading the SHARED `liveReport`, never constructing a second batch. Every existing line of the file stays byte-identical. **Explicitly NOT authorized:** any edit to existing `summitgate.test.js` legs (Decided 6 — all law-form; red = STOP-report), `tests/altitude.test.js:95-104` (exact legs stay exact by Decided 4's dyadic law), any `tests/support/` file, and every file not named above.

## Tasks

- [ ] Task 0: Kickoff — reproduce the baseline. Scratch batch on the repo copy: expect bare 0.0750 / ropeHeavy 0.1000 / chargeHeavy 0.1000, aggregate 0.0917, medSum 310-334 s (6.1 handoff). `time node --test tests/` → 561/561, ~8.7 s. Both into the Debug Log.
- [ ] Task 1: Cadence fix FIRST (before any sweep, so every measurement sees it): the forgiven-branch offer check in `js/game.js` (Decided 7a) + NEW `tests/offercadence.test.js` — red-green legs: (1) forgiven crossing at skips 9→10 (`buffer: BUFFER_SEC`, failing-clearance player) fires the offer (`status 'choose'`, offer non-empty, `'offer'` event) — red before the fix; (2) forgiven crossing at 8→9 fires NOTHING (cadence not shifted); (3) a clean 10th skip still yields exactly one `'offer'` event (no double-fire); (4) exhausted pool (`owned` at caps) → forgiven branch stays `running` (never freeze in choose). No seed numerics; stub rng.
- [ ] Task 2: Physics exports (Decided 8) + R3/R4 rig edits. Gate must be green before tuning starts (values unchanged — this isolates the cadence+exports delta from the retune delta).
- [ ] Task 3: Sweep in /tmp (Decided 5 mechanics). Start from `[250,600,1000,1500,2100]` / `[1.00,.94,.88,.82,.76]` / ALT 2.5; trim middle rungs (multiples of 5, summit fixed 2100) and nudge periods (floor 0.74) to land every-shape medSum ≤ 300 s with rates in band; verify the cadence fix moved no batch number (one diff vs Task 0's table — expected identical, Decided 7a reasoning). Record the candidate grid + results in the Debug Log.
- [ ] Task 4: Land the final values in `js/areas.js` + `js/game.js` with Decided 9 annotations; append the A1 leg to `tests/summitgate.test.js` (in-band + 300 s NFR9 law vs the shared lazy batch); run the FULL gate (`./run_tests.sh` — the one verification), including any red re-contract legs R1/R2 (and R3/R4 if not yet landed); `git diff --stat` shows ONLY: `js/game.js`, `js/areas.js`, `js/player.js`, `tests/offercadence.test.js` (NEW), the four R-leg edits, the A1 append, this story, `sprint-status.yaml`. Zero other existing-file diffs; zero `tests/support/`.
- [ ] Task 5: Final re-gate + record (Decided 10): batch ×2 (determinism deep-equal), final table (per-shape rate/verdict/outcomes T/H/S/medRun/medSum/rngDraws/terminalRopes), suite timing pair, wall-clock acceptance statement (incl. the fallback honest write-up if used), and every constant annotation cross-checked against the table. Update this story's Completion Notes + Change Log; ledger `deferred-work.md` gets the PAID/disposition stamps for items 1-8 above (this story's ledger lane: :5-9, :26-27/:43-44, :55-56; records-for-UAT: :180, :198-199).

## Dev Notes

### Current state (verified 2026-11-10 @ 3af769c)

- Suite **561/561 @ 8.70 s** (`time node --test tests/`, this story's create probe — measured, not quoted).
- Tunable sites: `js/game.js:36` `ALT_PER_POINT = 2` (consumed at `:176`/`:210`); `js/areas.js:8-17` the frozen AREAS rows (`ceiling` 250/600/1000/1500/2100, `periodMul` 1.00/0.96/0.92/0.88/0.85); `js/rope.js` carries only the feet-window + phase clock (no tunable changes there — the 0.9 default at `createRope` is superseded by `ROPE_PERIOD = 1.3` at every production site; DO NOT touch).
- Physics literals for Decided 8: `js/game.js:120` `1800 / floatMul`, `:141` `18 / windowMul`; `js/player.js:13` `gravity = 1800`, `:37` `minHeight = 18`. Rig duplicates: `tests/nearmiss.test.js:23/26`, `tests/v1parity.test.js:31/33`.
- Forgiven branch: `js/game.js:205-213` (`skips += 1` with no offer check); the cleared branch's pattern to mirror: `:186-204` (`shouldOfferUpgrade(skips)` → state-aware `pickOffers(CARDS, owned, offerCount(skips), rng, {ropes, charged})` → non-empty guard → choose/offer/`break`). `shouldOfferUpgrade`/`offerCount` come from `js/upgrades.js` (already imported in game.js).
- Frozen-leg map that matters here: `altitude.test.js:34` (ALT pin, self-announced), `ascent.test.js:33-57` (AREAS table, self-announced), `ascent.test.js:80-90` ascentRig ceiling−30 (derived, survives any rung ≥ 30+arc), `arealadder.test.js:214-245` ladderSim rig (`% ALT` guard + derived seeds), `areapressure.test.js:143-167` (row-1 bit identity), `:204-208` (blackout bound), `:242-255` (buffer phase-invariance — record-derived), `:285-310` (§7 alley witness ceiling−30 seed + ALT identity), `summitapproach.test.js:315-324` (`ceiling − 20` seed + `% ALT` guard), `:727` DISTANCE-cover `(C−200)/ALT`, `balance.test.js:171-188` (near-summit 2000/1980 rigs — honest iff summit = 2100), `summitgate.test.js:109/:153-173/:195-205` (law-form per Decided 6).
- 6.1 instrument: `tests/support/summit-gate.js` — batch runner (read the header: policy-bot rules verbatim); options are evaluator-only (Decided 5); `tunables`/`verdict` read live records by default; `gateFailureReport` names the producing values (a red re-gate is already the tuning report — read it, don't guess).

### Baseline measurements (create-round probes @ 3af769c — your kickoff numbers)

- Baseline batch REPRODUCED exactly: bare 0.0750 / ropeHeavy 0.1000 / chargeHeavy 0.1000, aggregate 0.0917 verdict `in`; medRun 335.5/331.9/308.7 s, medSum 334.0/309.6/314.0 s — **rate in band, wall-clock OUT** (> 300 s). Batch cost 1.42 s this box.
- Post-hoc option sweep (evaluator-only — Decided 5 warning applies): ALT 2.25 → 0.175 in (clocks ~330 s, useless); ALT 2.5 base → 0.208 out-high; ALT 3 → 0.47; ladder ×0.78 → 0.275; ladder ×0.70 → 0.48. Rate is hyper-sensitive to ALT/summit — the length lever MUST be periods.
- Live scratch sweep (repo-copy js/areas.js periodMuls, ALT 2): `[1.00,.94,.88,.82,.76]` → 0.0417 out-low; `[1.00,.92,.84,.76,.70]` → 0.0417 out-low; `[1.00,.95,.90,.85,.80]` → 0.050 in(edge) — confirms period-shortening costs trips; compensation is ALT 2.5 (+ rungs), per frontier.
- Frontier (parent sandbox, live physics, 19 candidates — the school table): base 0.0917; school-A plateau (summit 1750/ALT 2.2/periods .94-.76) 0.142 medSum 298/281/275 — REJECTED (Decided 3); **school-B plateau (ALT 2.5, ladder unchanged, periods .94-.76) 0.150 in, medRun 292/276/263, medSum 309/301/297; periods [1.00,.935,.87,.805,.74] → 0.133, medSum 305/299/299; mid-rung trim [250,600,950,1400,2100] + .94-.76 → 0.142, medSum 308/299/301**. Neighborhood robust: ALT ∈ {2, 2.5}, summit-fixed, periods bottom 0.76-0.78.

### Pitfalls

- NEVER trust `summitGate({altPerPoint, ladder})` for a physics sweep (Decided 5) — it is the exact trap this story's instrument-setting enables.
- Non-dyadic ALT (2.2 etc.) looks fine in the sandbox batch and reddens the FROZEN rig mod-guards (Decided 4) — the sandbox has no frozen tests.
- Do not "fix" summitRate/`altitude0: 2000` legs — they are honest iff the summit stays 2100 (Decided 3).
- AREAS is deep-frozen — copy values out for sweeps/reports; never write.
- The cadence fix must not move any batch number — if the Task 3 diff shows a change, the buffer is somehow live in batches; STOP and report (the bot passes no press; `buffer` stays 0).
- Never import any `tests/*.test.js`; sweeps live in /tmp; never accumulate traces; the suite stays < 10 s.
- The GDD's "summit base period ≈ 1.10 s" note (gdd Run Structure, flagged ASSUMPTION) becomes ≈ 0.99 s at periods bottom 0.76 — intended; quote the GDD's designer-has-not-tuned clause, and let 6.4's docs pass refresh the note (it rides the docs lane, not this story).

### Precedents to follow

- 6.1's story discipline: Decided-N with evidence, Debug-Log measurement table = the handoff, `time node --test` pair, diff census honesty (`git diff --stat` quoted in the story).
- Self-announced re-contract precedent (4.5 R1 comment-only, pre-66-polish R2 "one insert, oracles byte-identical"): R1-R4 follow the same surgical form.
- 2.5/6.1 budget-cut ladder and the "report the trip, never widen the window" reporting law (report medians from the real batch; never tune to one seed).

### AC → test mapping

| AC | Where |
|---|---|
| 1 values + annotations | `js/game.js`/`js/areas.js` diffs (annotated); R1/R2 re-contracted contract legs; Debug-Log final table |
| 2 in-band + invariants green unchanged | A1's appended leg (verdict/rate band + 300 s medSum law vs the shared live batch) + the 561+2-leg gate green (+ new offer-cadence legs) with ONLY the R1-R4 diffs; re-gate three-shape table; determinism double-run |
| 3 no test edited to pass | diff census = the four R-legs + new file; every R is ledger/self-announced-authorized |
| Ledger 1 (cadence) | `tests/offercadence.test.js` (red-green 1-4) |
| Ledger 2 (physics exports) | nearmiss/v1parity rigs read the exports (R3/R4); no behavior legs changed |
| Ledger 3 (ALT equality) | R1 + byte-identical exact legs |
| Ledger 4/5 (D-N12, ascend voice) | recorded-for-UAT dispositions above |
| Ledger 6 (shape band) | the re-gate three-shape table |

### Project Structure Notes / Context Rules

- Zero new paths beyond `tests/offercadence.test.js`; `run_tests.sh`, `package.json`, `index.html`, `.github/`, `tests/support/`, `js/shell.js`, `js/render3d.js`, `js/audio.js` untouched.
- AGENTS.md: pure sim core, inline constants, named exports, no `console.*` in pure modules, frozen-test discipline with the written re-contract exception (AGENTS.md:52), static-files-only, NFR4 < 10 s. Three.js/render surface: irrelevant (zero browser surface here).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.2 :905-921; Story 6.1 :885-903; Story 6.3 :923-939; NFRs :77-82]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md :5-9, :26-27, :43-44, :55-56, :92-95, :164, :180, :198-199, :230]
- [Source: _bmad-output/implementation-artifacts/6-1-policy-bot-summit-gate-the-balance-master-dial.md] — Debug-Log LIVE-BATCH table (the base row), strip law, Decided 2/6/7/8, review law (BH-F3)
- [Source: _bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd.md :275-290 (run structure + periodMul ASSUMPTION), :485-495 (calibration gate)]
- [Source: js/game.js:36,120,141,176,186-213; js/areas.js; js/player.js:13,37; tests/support/summit-gate.js] — the substrate
- [Source: /tmp/e62/frontier.md (parent sandbox sweep, 19 candidates) — school table distilled into Baseline measurements above]

## Debug Log

- 2026-11-10 (create round): Baseline reproduction on the repo copy — bare 0.0750 / ropeHeavy 0.1000 / chargeHeavy 0.1000, aggregate 0.0917 `in`; medRun 335.5/331.9/308.7 s; medSum 334.0/309.6/314.0 s; rngDraws 2745/2772/2642; batch 1424 ms. Matches 6.1's handoff table bit-for-bit.
- 2026-11-10 (create round): `time node --test tests/` → **561/561, real 8.701 s** (duration_ms 8648). NFR4 headroom ~1.3 s.
- 2026-11-10 (create round): Evaluator-option sweep (`/tmp/probe62b.mjs` — Decided-5 gotcha demonstrated): ALT-only and ladder-only moves go out-high fast (2.5 → 0.208; ladder ×0.70 → 0.483) while barely moving the death-dominated clocks.
- 2026-11-10 (create round): Live-period scratch sweep (`/tmp/scratch62/`, ALT 2, base ladder): period ladders alone collapse the rate out-low (0.0417/0.0417/0.0500) with medRun 256-312 s — the trip-cost that School B pays down with ALT 2.5. Corroborates the parent frontier's a2per76/a2per84 rows.
- 2026-11-10 (create round): Parent frontier probe (`/tmp/e62/frontier.md`, live-physics sandbox, 19 candidates) — school A rejected / school B plateau adopted (Decided 3). Rig-census brittle-spots map (near-summit rigs, mod guards, areapressure floors) folded into Decided 4/6.
- (dev round: Task 0 baseline pair, cadence-fix batch-diff, sweep grid, final table ×2, suite timing pair.)

## Completion Notes List

(to be written by the dev round)

## File List

- js/game.js (ALT_PER_POINT + annotation; forgiven-branch offer check; physics literals via exports)
- js/areas.js (ceiling/periodMul retune + annotations + header prose)
- js/player.js (GRAVITY / CLEAR_MIN_HEIGHT exports)
- tests/offercadence.test.js (NEW)
- tests/altitude.test.js (R1 leg only)
- tests/ascent.test.js (R2 leg only)
- tests/nearmiss.test.js (R3 rig lines only)
- tests/v1parity.test.js (R4 rig lines + :22 comment only)
- tests/summitgate.test.js (A1 one-leg append only)
- _bmad-output/implementation-artifacts/6-2-real-tunables-retire-the-placeholders.md
- _bmad-output/implementation-artifacts/deferred-work.md (disposition stamps)
- _bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-11-10: Story created — full-artifact analysis; School B (summit-preserving, ALT 2.5 dyadic law, period-ladder length lever) decided with the 19-candidate frontier + create-round sweeps embedded; offer-cadence check-gap implemented with a new witness suite, N-scaling pointed at 6.3; physics-constant exports land here (R3/R4); re-contract census = 4 legs (2 self-announced) + 1 law-form leg-append A1 (AC2's in-band assertion, ~0 wall via the shared memoized batch); D-N12 + ascend-voice items recorded for the UAT feel lane with rationale; rising-edge conditional re-checked (trigger not met).
