---
baseline_commit: 783dc1084430f773f33b430ada588543f1b4221e
---
# Story 7.2: Every run leaves a mark — outcome counters

Status: review

*Ultimate context engine analysis completed — comprehensive developer guide created (2026-11-11).*

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want completed runs to count — furthest area, summits, lifetime skips,
so that the game has an honest basis for what I've earned.

7.2 is The Peel's first heartbeat (epics.md:989-991): Story 7.1 shipped the meta ledger `loadMeta`/`saveMeta` with the write lane DORMANT (7-1 story D2 + Deferred items), and **this story is the designated FIRST RUNTIME CALLER of `saveMeta`** (deferred-work.md:282). The three S2 counters accrue at run end, on the SAME persistence path that already saves best altitude — one shared write lane, no second path — and are recorded and used by NOTHING: the deal and the sim stay untouched; consumption (locks, unlock fiction) is 7.3/7.4's lane, and the unlock-currency decision S2 itself is a named 7.4-kickoff decision point (epics.md:1037, FR33 epics.md:79).

## Acceptance Criteria

1. **Accrual rides the one write lane.** Given a run ends (`outcome 'tripped' | 'summit'`), when the shell records the result, then the outcome counters accrue in meta state through the SAME persistence path as `saveBest` — one shared write lane, no second path (FR33; shared-handler rule). [epics.md:1025-1027]
2. **Exactly once per run.** Given pause, tab-hide, or restart paths, when the run-end event fires, then counters accrue exactly once per run — release/resume paths cannot double-count (FR22 handler hygiene). [epics.md:1029-1031]
3. **Seed-honesty for batch legs.** Given any batch-driven test legs for accrual, when they are written, then they follow the seed-honesty contract: law-form legs, no current-build numerics, ×2 determinism witnesses (retro A2, epics.md:117 rider). [epics.md:1033]
4. **Records, uses none.** This story records all three counters and USES none — the deal and the sim are untouched; the unlock currency itself is decision S2, a named decision point at Story 7.4 kickoff. [epics.md:1037]

### Decided notes (settled pre-loop 2026-11-11; do not re-litigate)

1. **D1 — the accrual site is the existing run-end branch in `js/shell.js`, beside `saveBest`.** `js/shell.js:726-728`: `if (out.tripped || run.outcome === 'summit') { best = Math.max(best, Math.round(run.altitude)); saveBest(localStorage, best); }` — inside the `run.status === 'running'` drain branch (`:717`, `tickRun` at `:719`). `saveMeta` rides THIS branch (reassign the shell-local `meta`, then `saveMeta(localStorage, meta)`): the AC1 "SAME persistence path as saveBest, one shared write lane" reading is literally this branch — same predicate, same tick, same seam, no second hook. The branch is STRUCTURALLY once-per-run: the same tick flips `run.status` to `'over'` (game.js:269 trip / :286 summit), and the branch only fires from a `running`-drain tick, so pause (acc drain held, shell.js:708/:715), resume, restart, and tab-hide can never re-enter it with a finished run — AC2 is pinned by the branch itself, witnessed by shell-harness tick legs, NOT by new bookkeeping. Do NOT wire accrual into `resumeRun`, restart, or any new run-end event.
2. **D2 — the counter mapping (S2, DECIDED pre-loop, epics.md:79 candidates):** `furthestArea = Math.max(meta.furthestArea, run.area)` — `run.area` is 1-based (`startRun` :117 `area: 1`; `clampArea` 1..`SUMMIT_AREA` = `AREAS.length` = 5, game.js:45/:75/:77-84) and monotone within a run (Story 4.1 one-way ladder: ascent only `area += 1`, game.js:297) — MAX, never assignment: the ledger never regresses. `summits += 1` iff `run.outcome === 'summit'` (game.js:287; a tripped run never increments summits). `skips += run.skips` — `run.skips` is the RUN-LOCAL skip counter (game.js:117/:183/:218), so `+=` accumulates lifetime skips and includes buffer-forgiven skips (the `buffer > 0` converts a would-be trip into a scored skip AND counts it, game.js:211-218). BOTH endings accrue all applicable counters — the AC's Given is `outcome 'tripped' | 'summit'` (game.js:270/:287 set exactly these values), and a tripped run still reached areas and skipped ropes. No fourth counter, no run record fields, no consumption anywhere (AC4).
3. **D3 — the ledger obligation lands here: hoist `saveMeta`'s three `clampCounter` reads ABOVE the `try`** (deferred-work.md:281-282, deferred from the 7.1 review, Blind F5). Today (game.js:381-390) the field reads sit inside the `try`, so a nullish `meta` argument is a TypeError that dies by the storage-unavailable catch — a lost shell-local becomes a SILENT persistence stop at this story's first runtime caller. Fix: compute `furthestArea`/`summits`/`skips` via `clampCounter` (game.js:360-363) before the `try`, then `setItem('jumprope-meta', JSON.stringify({ furthestArea, summits, skips }))` inside it — post-sanitize values cannot throw in `stringify`, so blocked storage stays SILENT (catch keeps its only meaning) while caller bugs go LOUD. Red-green with the accrual legs (a nullish-meta-throws-on-healthy-storage leg + the blocked-storage-silent leg re-proved). Do NOT re-shape `saveBest`/`saveSettings` — same latent scope there, explicitly out of this pass (deferred-work.md:281).
4. **D4 — frozen-leg re-contract: EXACTLY ONE leg, `tests/pausemenu.test.js` L2 (:431-432).** The post-trip runtime census deep-equals `[...env.map.keys()].sort()` to `['jumprope-audio', 'jumprope-best']` at :431 (message :432 "(audio.js:7 + game.js:318)") after a real scripted trip (:428 confirms `'over'`). 7.2's first runtime meta write lands `jumprope-meta` in that map — the leg reddens through no product bug. **This story authorizes THIS leg only:** expected array → `['jumprope-audio', 'jumprope-best', 'jumprope-meta']` (sorted: audio < best < meta), and the message updated to name the three keys + the game.js `saveMeta` site; SEMANTICS unchanged — still a "no second persistence path" census (the meta write rides the same game.js seam). Touch NOTHING else in the file. In particular **:424 (mid-walk census `['jumprope-audio']`) STAYS BYTE-IDENTICAL AND GREEN — the proof obligation**: no meta write happens before run end (accrual rides the run-end branch and nothing else); if :424 goes red, the implementation writes meta mid-run (e.g. per-tick) and that is the bug, mirroring 7.1's dormancy-proof discipline in reverse (7-1 story D3). `tests/reducedmotion.test.js` L10(a) needs NOTHING — the three-site `setItem(` census already counts game.js's `jumprope-meta` site (reducedmotion.test.js:649-659, 7.1's re-contract); the D3 hoist adds no setItem site.
5. **D5 — the census sweep found NO second collision; `tests/winloss.test.js` is green-by-construction and MUST NOT be touched.** Its permadeath census (`assertPermadeathBaseline`, winloss.test.js:186-197, census at :196) derives the expected set from `bootKeys = baselineKeys(env)` captured at :252/:268 — AFTER the run-end writes — and adds only `'jumprope-best'` through a dynamic `Set`; with 7.2, `jumprope-meta` is already in `bootKeys` at capture, so the deep-equal absorbs the new key automatically (a restart cannot end a second run before the `'running'`-status assert at :256/:272). Verified across every runtime key census in the suite (`.keys()` deep-equals): pausemenu :424/:431 (D4), winloss :196 (absorbed), metalegger :38 (local fake, direct-call), reducedmotion :671 (saveSettings-only local store) — no other file censuses storage keys at runtime. **`tests/winloss.test.js` is in NEITHER §6 allow-set: any diff there trips both tripwires — hands off.**
6. **D6 — new suite `tests/runmark.test.js`, scripted-run legs preferred.** Pattern donors: `tests/support/shell-harness.js` `mapStorage` (:121) + the full-shell env walk idiom of `tests/pausemenu.test.js` (`bootMenuShell({ storageMap })` :116/:261, virtual-clock `tick(env, st)` :144, tick-to-trip walk :426-428). Legs run scripted shell ticks to a real trip / a scripted summit and read `jumprope-meta` from the Map — DIRECT accrual witnesses, no batch machinery, so AC3's seed-honesty clause stays vacuous by construction; if a summit-batch leg is nonetheless added, A2 applies in full (law-form, no current-build numerics, ×2 determinism witnesses). The exactly-once witness: after a run ends, extra idle + pause/resume + restart ticks leave the meta VALUE unchanged (a counting-storage write tally or a deep-equal re-read) — accrual cannot re-fire (AC2, structural per D1).
7. **The boot-site fence stays green by construction:** the shell boot loads meta EXACTLY once (metalegger.test.js:52-57 fences `loadMeta(localStorage)` in shell.js) — accrual reassigns the shell-local `meta` (js/shell.js:155) and persists it; do NOT add a second `loadMeta` call (no mid-run reload — the shell-local is the single source of truth).

## Re-contract authorizations (written here, per the frozen-test discipline — AGENTS.md:52)

Exactly ONE existing test leg is re-authorized: `tests/pausemenu.test.js` L2, the census array at :431 and its message string at :432 (D4). Everything else — pausemenu :424-425, :428, :433-434 and all other legs, and every other existing test file, most of all `tests/winloss.test.js` (D5: green by construction, not an allow-set member) and `tests/reducedmotion.test.js` (already three-site) — stays BYTE-IDENTICAL. Bookkeeping (list-only, authorized by this story doc): the create round appends THIS story's path to the §6 diff-census allow-sets of `tests/ceilingbreak.test.js` and `tests/summitapproach.test.js` (the c38070e precedent); the DEV round must append `tests/runmark.test.js` to both (C1). `tests/pausemenu.test.js` is already a member of both allow-sets (ceilingbreak.test.js:619, summitapproach.test.js:906), so its L2 edit needs no new entry.

## Tasks / Subtasks

- [x] Task 1 — the run-end accrual branch (AC: 1, 2; D1, D2)
  - [x] `js/shell.js:726-728`: inside the existing `if (out.tripped || run.outcome === 'summit')` branch, after the `saveBest` line, reassign the shell-local `meta` (declared :155) — `furthestArea: Math.max(meta.furthestArea, run.area)`, `summits: meta.summits + (run.outcome === 'summit' ? 1 : 0)`, `skips: meta.skips + run.skips` — and call `saveMeta(localStorage, meta)`. Add `saveMeta` to the existing `game.js` import line (named import, beside `loadMeta`).
  - [x] One hook only: no other run-end call site; `resumeRun`/restart/pause paths untouched; no new loadMeta call anywhere (boot fence, Decided 7).
  - [x] No sim changes: zero diff in `tickRun`/`startRun`/`applyCard`/`resumeRun`/deal paths; nothing READS meta this story (AC4 — 7.3 consumes).
- [x] Task 2 — the `saveMeta` try-hoist (AC: 1; D3, ledger deferred-work.md:281-282)
  - [x] `js/game.js:381-390`: hoist the three `clampCounter(meta.*)` reads above the `try`; the `try` wraps only `setItem` + `JSON.stringify` of the pre-sanitized `{ furthestArea, summits, skips }` (key set and shape-pinned semantics unchanged — the metalegger legs stay green untouched).
  - [x] Update the comment if it misdescribes the try scope; blocked storage stays silent; nullish `meta` now throws (caller bug, loud). Do NOT touch `saveBest`/`saveSettings`.
- [x] Task 3 — the frozen-leg re-contract (AC: 1; D4)
  - [x] `tests/pausemenu.test.js` L2 :431: expected array → `['jumprope-audio', 'jumprope-best', 'jumprope-meta']`; :432 message names the three keys and the game.js `saveMeta` site. Nothing else in the file; :424 byte-identical — its green is the no-write-before-run-end proof.
- [x] Task 4 — the new contract suite (AC: 1, 2, 3, 4; D6)
  - [x] `tests/runmark.test.js` NEW: scripted shell-harness legs — (a) tick-to-trip: `jumprope-meta` written once with `furthestArea = max(0, area reached)`, `summits` unchanged, `skips = run.skips`; (b) scripted summit: `summits + 1`, `furthestArea` reaches 5; (c) exactly-once: post-end ticks (idle, pause/resume, restart-to-running) leave the persisted value byte-identical; (d) ledger monotonicity: pre-seeded `meta` with a higher `furthestArea` is never lowered (MAX, D2); (e) lifetime accumulation: pre-seeded `skips`/`summits` grow by exactly the finished run's delta; (f) the try-hoist red-green pair: nullish meta on healthy storage THROWS; blocked storage with a POJO meta stays silent (direct Node legs, `saveMeta` import); (g) AC4 guard: after accrual, the written meta JSON keys are EXACTLY the three counters — no run record rides along (permadeath).
  - [x] C1: append `tests/runmark.test.js` to BOTH §6 allow-sets, list-only comment, tripwires stay armed (this file's precedent rule; NOT part of the create round).
- [x] Task 5 — gates and bookkeeping (AC: all)
  - [x] `./run_tests.sh` green (baseline 574/574 @ 783dc10, ~8.5 s; expect 574 + new runmark legs; NFR4 < 10 s).
  - [x] `tests/boundary.test.js` green unchanged (no `localStorage` literal in game.js — `saveMeta(localStorage, …)` lives in shell.js only); metalegger suite green UNTOUCHED (the hoist must keep all 7+ legs green without an edit — that is the D3 proof that storage degradation is untouched); summit-gate/balance suites green unchanged (sim bit-identical; band gate is run-scoped, architecture.md:163-167 — zero meta feeds a sim build).
  - [x] Story Status → done (dev round stamps `review` per the loop contract); File List + Debug Log filled; sprint-status stamp per house style.

## Dev Notes

### Current state (verified 2026-11-11 @ 783dc10)

- `js/shell.js:151` `let best = loadBest(localStorage);`, `:155` `let meta = loadMeta(localStorage);` — the meta local exists UNCONSUMED (grep: no other `meta` reference in shell.js); 7.2 is its first consumer. `:701-728` the `frame()` drain: `paused` holds acc (:708) and the loop gate (:715); `:717` `run.status === 'running'` guards every `tickRun` (:719); `:726-728` THE accrual branch — `out.tripped || run.outcome === 'summit'` → `saveBest` (also the juice/HUD tripped fallback lane below it, storage-irrelevant).
- `js/game.js`: `:117` the run record (`area: 1`, `skips: 0`, `outcome: null`, …); `:183` + `:218` the only two `skips += 1` sites (`:211` `buffer > 0` branch = the forgiven skip, D-N01/D-N11 — it COUNTS); `:269-270` trip → `status 'over'`, `outcome 'tripped'`; `:286-287` summit → `status 'over'`, `outcome 'summit'`; `:297` ascend → `area += 1` only (one-way ladder, 4.1); `:45` `SUMMIT_AREA = AREAS.length` (5), `:75/:77-84` `MIN_AREA`/`clampArea` (1..5). `:353-359` the ledger header comment, `:360-363` `clampCounter` (finite/non-negative/`Math.trunc`), `:365-379` `loadMeta`, `:381-390` `saveMeta` (D3 target: three `clampCounter` reads inside the `try`).
- Persisted key set at runtime today: `jumprope-audio`, `jumprope-best` — plus `jumprope-meta` from 7.2's first run end. Static censuses: reducedmotion L10(a) already three sites (:649-659); pausemenu L2 runtime census (:431) is the frozen spot (D4).
- `tests/winloss.test.js:186-197` `assertPermadeathBaseline` — dynamic `bootKeys` Set, captured at :252/:268 AFTER run end → absorbs `jumprope-meta`; DO NOT TOUCH (D5, not in either allow-set).
- §6 diff census: ceilingbreak.test.js append point after `'tests/metalegger.test.js',` (:703, array closes :704, BASE `5659fd4`); summitapproach.test.js append point after :990 (array closes :991, BASE `2c3e693`) — this story's path appended by THIS create commit.
- Gate: 574/574 @ 783dc10 (~8.5 s). 7.1 shipped `loadMeta`/`saveMeta` DORMANT (zero runtime meta writes; the pausemenu censuses pass byte-identical proving it).

### Pitfalls

- **The single most likely disaster: writing meta OUTSIDE the run-end branch** (per-tick, at pause, or on the `choose`-status resume). :424 (pausemenu mid-walk) goes red instantly — that is the intended tripwire, not a leg to re-contract (D4).
- Accrue with MAX/+=, never assignment (D2): `furthestArea` never regresses across runs; `skips` uses `+= run.skips` (run-local delta), NOT `= run.skips` (would clobber lifetime count). `summits` moves ONLY on `outcome === 'summit'`.
- No fourth key, no nesting, no `metaVersion`, no run record in meta (7.1 D1 shape; AC4 guard leg (g)). The deal/sim read nothing — an accidental `meta` read in a sim signature or the deal filter is scope creep into 7.3.
- `tests/pausemenu.test.js`: edit ONLY :431-432. `tests/winloss.test.js`, `tests/metalegger.test.js`, `tests/reducedmotion.test.js`: byte-identical, full stop (D4/D5; winloss trips §6 anyway).
- The D3 hoist must not remove the `try` around `setItem`, must not change the serialized key set, and must not touch `saveBest`/`saveSettings`.
- feelcap AUD-02 scans `js/` for the token `audio.js` — comments included (7.1's red iteration): phrase any new game.js/shell.js comment without that token.
- Never import a `tests/*.test.js` from another test; copy the fake/harness idiom (pausemenu.test.js:116-146 donor).
- No current-build numerics in batch legs if written; prefer scripted shell legs (D6 — then AC3 is vacuous and honest).

### Precedents to follow

- The 7.1 create→dev→review chain: dormancy proof (7.1) now flips to the mid-walk-stays-green proof (D4); C1 census appends with list-only comments (c38070e; 7.1's create+dev appends are the exact wording to mirror).
- The `saveBest` line at shell.js:728 is the literal neighbour every accrual line mirrors (shape, injection style, silence contract).

### AC → test mapping

- AC1 → runmark legs (a)(d)(e) (runtime accrual values through the Map-backed storage) + pausemenu L2 re-contract (runtime three-key census) + runmark leg (f) blocked-storage-silent half.
- AC2 → runmark leg (c) (exactly-once under idle/pause-resume/restart ticks; structural argument D1) — the branch is inside the `running` drain, so re-entry is structurally impossible.
- AC3 → vacuous if only scripted legs ship (D6); otherwise law-form + ×2 witnesses in the same file.
- AC4 → runmark leg (g) (three keys exactly, run record rejected) + `git diff` proves zero sim/deal changes + boundary.test.js and the metalegger suite unchanged-green.

### Project Structure Notes

- Changes land in the existing lanes: `js/shell.js` (accrual branch + import), `js/game.js` (saveMeta body only), `tests/pausemenu.test.js` (authorized region), `tests/runmark.test.js` NEW; no new module, no import-graph delta, no `index.html`/`package.json` touch (near-frozen, epics.md:116).
- Variance: none — the accrual is the 7.1 ledger's pre-registered landing site.

### Project Context Rules

- No `project-context.md` exists; project rules live in AGENTS.md: named exports, DI for storage (AGENTS.md:48), POJOs/spread, 2-space indent, sparse comments, no `console.*` in pure modules (AGENTS.md:50), frozen-test discipline with story-text re-contracts (AGENTS.md:52), one shared handler per concern (AGENTS.md:53 — the AC1 "shared-handler rule" referent), `tests/` + `run_tests.sh` sacred (edits here are the story-authorized exceptions above). NFR6: static files, zero dependencies.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#story-72] ACs :1025-1037 · Epic 7 vision :989-991 · FR31-FR35 Peel delta :75-81 · NFR12/13 :96-97 · Epic 7 riders :117 · conventions block :99-116
- [Source: _bmad-output/planning-artifacts/architecture.md#persistence-as-built] :131-137 (jumprope-meta bare key, dormant-lane note — this story wakes it; "no run record is ever persisted") · :163-167 (S4 run-scoped band gate)
- [Source: js/shell.js] :151/:155 boot loads · :708/:715 pause gates · :717/:719 running drain + tickRun · :726-728 THE accrual branch (saveBest neighbour)
- [Source: js/game.js] :45/:75/:77-84 SUMMIT_AREA/MIN_AREA/clampArea · :117 run record · :183/:218 skips += 1 (:211 buffer-forgiven arm) · :269-270/:286-287/:297 the three endings/ascend writes · :353-390 clampCounter/loadMeta/saveMeta (D3 target :381-390)
- [Source: js/audio.js] :7 SETTINGS_KEY · :33-43 shape-pinned write precedent (untouched this story)
- [Source: tests/pausemenu.test.js] :399 L2 title · :424-425 mid-walk census (byte-identical, proof obligation) · :431-432 THE re-contract region · :433-434 audio shape (untouched) · :116/:144/:261 harness idiom donors
- [Source: tests/winloss.test.js] :184/:186-197/:252/:257/:268/:273 the absorbed permadeath census (D5 — hands off)
- [Source: tests/metalegger.test.js] :38-41 local-map key census · :52-57 boot-site fence (stays green per Decided 7) · :89-107 blocked/shape legs the D3 hoist must keep green untouched
- [Source: tests/reducedmotion.test.js] :649-659 L10(a) three-site census (needs NOTHING)
- [Source: tests/support/shell-harness.js] :121 mapStorage (D6 donor)
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] :279-282 the 7.1-review defer, OWNER Story 7.2 (D3)
- [Source: _bmad-output/implementation-artifacts/7-1-meta-ledger-persistence-without-run-records.md] D1/D2/D3/D6 + Deferred items :117-122 (structure + doctrine precedent)

### Deferred items (not this story)

- Consuming the counters anywhere (lock filter, offer-generator predicate, run-creation meta parameter) — owner Story 7.3 (FR32; 7.1 D5: the parameter lands with its first consumer).
- The unlock set/conditions/thresholds (decision S2) and the unlock presentation fiction — owner Story 7.4 kickoff (FR33/FR34; epics.md:79/:1037); any meta surface takes the NFR7 letterbox rule there.
- Meta-shape band sweeps with named exceptions / A3 build-space widening — settled run-scoped (architecture.md:163-167); the bare-build bit-identity evidence rides 7.5.
- `saveBest`/`saveSettings` try-scope: same latent shape as D3, explicitly NOT re-shaped here (deferred-work.md:281) — a future chore's call, not a 7.2 leftover.

## Dev Agent Record

### Agent Model Used

lane-qwen38-ultra/qwen (omp worker session Dev72)

### Debug Log References

- Baseline gate (pre-edit, this round): **574/574 @ 8.69 s** wall (time builtin; HEAD 6ff8c60 = the create commit, story baseline 783dc10 verified via git log).
- RED phase: `tests/runmark.test.js` alone **0/7 pass** — every leg red for the right reason: scripted legs died at `JSON.parse(env.map.get('jumprope-meta'))` = "undefined" (no runtime meta write existed), leg f red at `Missing expected exception (TypeError)` (the 7.1 try-scope swallowing the caller bug). The harness itself was proven alive inside the red: legs reached real trips through the shipped death arm and `pumpSkips` scored its skips.
- GREEN phase: first full gate **581/581 @ 8.56 s** wall (TAP duration_ms 8499; 8.5–8.7 s across runs — NFR4 < 10 s held; the 7 runmark legs cost ~88 ms suite-wide, individual legs 0.3–16.9 ms). Zero red iterations: first implementation run went green in one pass.
- Diff shape audit (`git diff -U0` hunks): js/game.js changes sit ENTIRELY inside `saveMeta` (:381-394, try-hoist); js/shell.js deltas are exactly the import line + 11 accrual lines at the run-end branch (:726-740). Zero diff in `tickRun`/`startRun`/`applyCard`/`resumeRun`/deal — AC4's "sim untouched" is a diff fact, not an argument.
- Frozen-leg audit: `git diff tests/` — pausemenu touched ONLY :431-432 (the authorized region); its :424 mid-walk census `['jumprope-audio']` passed byte-identical = the no-write-before-run-end proof held at runtime; winloss/metalegger/reducedmotion byte-identical (metalegger green UNTOUCHED against the hoist = D3's storage-degradation proof); both §6 census tripwires green with the C1 appends live.
- AC2 witnesses: counting storage tallied EXACTLY ONE `jumprope-meta` setItem per run end in every scripted leg (0 mid-walk, 1 at the branch); leg (c) re-reads the raw JSON byte-identical after idle/pause-resume/tab-hide/restart-to-running walks.
- Summit leg mechanics: the wrapper seeds a domain-legal near-summit startRun state (area 5, one skip below the row-5 ceiling, row-4 ceiling as base) and revives trips so only the REAL summit branch can end the walk — the summit write itself is shipped code (`runmark.test.js` wrapper comment states this).

### Completion Notes List

- Accrual landed exactly on D1/D2: the shell-local `meta` reassigns with `furthestArea: Math.max(meta.furthestArea, run.area)`, `summits: meta.summits + (run.outcome === 'summit' ? 1 : 0)`, `skips: meta.skips + run.skips`, then `saveMeta(localStorage, meta)` — the ONLY new runtime write, riding the same predicate/tick/seam as `saveBest` (shell.js:726-740). `saveMeta` joined the existing game.js import line; no second hook, no loadMeta reload (boot fence green untouched).
- Task 2 (7.1-F5 defer, deferred-work.md:281-282): the three `clampCounter` reads hoisted above the `try`; `setItem` + `JSON.stringify` of the pre-sanitized trio stay inside — blocked storage silent (leg f silent arm + the untouched metalegger blocked-legs), nullish meta now a loud TypeError (leg f throws arms, red-green witnessed). `saveBest`/`saveSettings` untouched per scope; deferred-work.md carries the RESOLVED note.
- `tests/runmark.test.js` NEW — 7 legs (a-g) as scripted shell-harness boots (6 boots: a,b,c,d,e,g) + 1 bootless direct pair (f): real-trip accrual + mid-walk zero-write witness + write tally; scripted summit (seeded position, shipped summit branch); exactly-once under idle/P-pause-resume/tab-hide/restart; MAX monotonicity (seed 4 > reached 1); lifetime += (seed 7/2 + live delta, non-vacuous delta asserted); the try-hoist pair; the AC4 closed-shape guard. No batch machinery → AC3 seed-honesty vacuous by construction; every assertion reads the live run's own fields (law-form).
- Task 3 executed to the letter: pausemenu L2 census → `['jumprope-audio', 'jumprope-best', 'jumprope-meta']`, message names the three keys + the game.js saveMeta site; the census SEMANTICS unchanged (still the no-second-persistence-path witness); :424 and everything else byte-identical. winloss untouched per D5 (green-by-construction verified — full suite green).
- C1 bookkeeping: `tests/runmark.test.js` appended to both §6 diff-census allow-sets, list-only comments mirroring the 7.1 wording, tripwires stay armed.
- Nothing READS meta (AC4): no sim/deal/offer path changed (diff fact above); consumption stays 7.3's lane, S2 fiction stays 7.4-kickoff. Dev round stamps `review` (loop contract); `done` belongs to the review round.

### File List

- js/shell.js (import saveMeta; accrual in the run-end branch)
- js/game.js (saveMeta try-hoist — body only)
- tests/pausemenu.test.js (L2 :431-432 re-contract only — authorized, D4)
- tests/runmark.test.js (NEW — 7 contract legs)
- tests/ceilingbreak.test.js (census allow-set append only — C1)
- tests/summitapproach.test.js (census allow-set append only — C1)
- _bmad-output/implementation-artifacts/7-2-every-run-leaves-a-mark-outcome-counters.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/deferred-work.md (7.1-F5 defer RESOLVED note)

## Change Log

- 2026-11-11 (create round): story created from epics.md:1017-1037 + Epic 7 riders + architecture §Persistence; live re-verification at 783dc10 confirmed every cite (accrual branch shifted :724→:726-728 by 7.1's boot comment). Decided D1-D6 embedded: accrual rides the run-end branch beside saveBest (structurally once-per-run), S2 counter map (max-area / summit-only / +=-skips incl. forgiven), the 7.1-review try-hoist lands here, ONE frozen-leg re-contract (pausemenu L2 :431-432; :424 byte-identical proof obligation; winloss :196 verified green-by-construction via its dynamic bootKeys Set — discovered in the live sweep, hands off), new tests/runmark.test.js scripted legs (A2 vacuous by construction). Census allow-append (this artifact, list-only) x2; sprint-status ready-for-dev; gate baseline 574/574 @ 783dc10.
- 2026-11-11 (dev round): implemented per D1-D6 — accrual branch in js/shell.js run-end site (meta reassign + saveMeta beside saveBest, structurally once-per-run), saveMeta try-hoist in js/game.js (7.1-F5 closed: caller bugs loud, blocked storage silent), ONE authorized re-contract pausemenu L2 :431-432 to the three-key census (:424 + winloss + reducedmotion green untouched = the D4/D5 proof obligations held), tests/runmark.test.js NEW (7 scripted legs, 0→7 red-green; law-form, no batch machinery), C1 census appends x2, deferred-work RESOLVED note. Gate 581/581 @ 8.6 s (was 574/574); zero red iterations; status review.
