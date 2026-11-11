---
baseline_commit: 0c5185f6f8df93cf69c67528c5be073a8a041e81
---
# Story 7.1: Meta ledger — persistence without run records

Status: ready-for-dev

*Ultimate context engine analysis completed — comprehensive developer guide created (2026-11-11).*

## Story

As a player returning to the tab tomorrow,
I want the game to remember what my runs did,
so that progress can accumulate between runs and the peel can begin.

Epic 7 opens The Peel (epics.md:989-993): between-run progression as in-game fiction. 7.1 is the substrate — a meta ledger that persists across runs through the existing storage seam, with the permadeath contract intact: **no run record is ever persisted** (architecture.md:131-135). The ledger is written-but-unconsumed in this story: 7.2 accrues the counters, 7.3 is the first reader.

## Acceptance Criteria

1. **Meta loads at boot through the one seam.** Given storage available at boot, when the shell starts, then meta state loads through the existing storage seam under new `jumprope-*` keys beside `jumprope-best`, the boot read adds nothing measurable to the first-jump budget (FR31, NFR12), and no new storage lane appears — one seam, one pattern (FR24 lineage). [epics.md:1002-1005]
2. **Degradation is data, not errors.** Given storage unavailable, or a meta key missing or corrupt, when the game boots, then fresh default meta state is used, play is unimpacted, writes degrade to session-only, and nothing throws (FR31, NFR13). [epics.md:1006-1009]
3. **The persisted key set is pinned; no run record ever.** Given any run at any point, when persistence writes happen, then only meta state, best altitude, and audio settings are ever persisted — no run record is ever written; the permadeath contract stays true, pinned by a new test file enumerating the persisted key set (FR31; architecture §Persistence). [epics.md:1010-1013]
4. **Shell-side state; sim untouched; contract test same change.** Meta state lives shell-side and enters the sim only as an immutable parameter at run creation — the rng-injection pattern again; `tests/boundary.test.js` stays green, the new factory contract gets its Node-side contract test in the same change (NFR5, NFR6). [epics.md:1015] — see Decided 5: in 7.1 the run-creation parameter is vacuous by design; the sim receives nothing yet.

### Decided interpretations (do not re-litigate; decided at the 2026-11-11 entry-probe batch, user-answered)

1. **D1 — one bare key, three counters.** Meta state persists under exactly ONE new bare, unversioned key `jumprope-meta`, value a plain JSON-encoded object of the three S2 counters: `{ furthestArea, summits, skips }`. Fresh default: `{ furthestArea: 0, summits: 0, skips: 0 }`. Naming doctrine is bare/unversioned — `jumprope-best` is the as-built bare v1 key and the versioned variant was never shipped (architecture.md:131-133; the key-drift ledger row deferred-work.md:162-165 is CLOSED/PAID — accepted as shipped, no migration, new keys follow the same naming per the epic riders epics.md:117-118). Do NOT introduce a `jumprope-meta-v1` style key, do NOT split into three keys, do NOT nest per-area structure — the value is exactly the flat three-counter object.
2. **D2 — the write lane ships here, but stays DORMANT.** Story 7.1 SHIPS `loadMeta`/`saveMeta`; `saveMeta` has **no runtime caller** in 7.1 — Story 7.2 wires run-end accrual (its AC names the same write lane as `saveBest`, epics.md:1029-1031). 7.1 proves the write lane via direct Node contract legs — `tests/metalegger.test.js` calls `saveMeta` directly against fake storage — NOT via runtime writes. A runtime `saveMeta` call in shell.js this round is OUT of scope and would collide with 7.2's accrual-once design (FR22 handler hygiene, epics.md:1033-1035).
3. **D3 — the ONE frozen-leg re-contract: `tests/reducedmotion.test.js` L10(a).** The L10 leg's part (a) (reducedmotion.test.js:649-657) censuses literal `setItem(` occurrences across `js/` deep-equal to `['audio.js', 'game.js']` (:657). Adding `saveMeta` to `js/game.js` creates a THIRD occurrence, so the leg reddens through no product bug. **This story explicitly re-authorizes THIS leg only** (per the frozen-test discipline, AGENTS.md:52): the census becomes `['audio.js', 'game.js', 'game.js']` (audio.js `jumprope-audio` + game.js `jumprope-best` + game.js `jumprope-meta`), the message string ("EXACTLY twice") and the test title's "two setItem sites" updated to match, the comment updated. The leg's SEMANTICS are unchanged — it is still exactly a persistence-surface census; the reduced-motion flag itself stays unpersisted. Parts (b)+ of L10 and all other legs in the file stay BYTE-IDENTICAL.
   **Proof obligation — what is NOT re-contracted:** `tests/pausemenu.test.js` :424 and :431-432 (runtime storage-key censuses over the harness's written-keys map: `['jumprope-audio']` mid-walk, `['jumprope-audio','jumprope-best']` post-run) stay BYTE-IDENTICAL and PASS, precisely because no runtime meta write exists in 7.1 (D2's dormant `saveMeta`): `loadMeta` only READS (`getItem` never adds map keys), and `setItem` is never called with `jumprope-meta` at runtime. If those legs go red, the implementation has a runtime meta write — that is a bug in this story, not a re-contract. The diff census must show pausemenu.test.js untouched.
4. **D4 — helper home: `js/game.js`, beside `loadBest`/`saveBest`.** Both helpers live in `js/game.js` next to the existing best-score seam (game.js:337-351 — same try/catch, injected-storage-parameter, silent-degradation shape). Storage arrives as a parameter, so the `tests/boundary.test.js` IO fence (boundary.test.js:12 `BROWSER_IO_RE`, :103-113 "wall-clock, DOM, and storage references live only in js/shell.js") is structurally unaffected — no `localStorage` literal appears in game.js, exactly as loadBest/saveBest already prove. NO new js/ module, NO dynamic import, no export-barrel — pure additive exports below `saveBest`.
5. **D5 — NO new sim parameter in 7.1.** Nothing consumes meta state yet, so AC4's "enters the sim as an immutable parameter at run creation" clause is satisfied VACUOUSLY and MUST be left vacuous: the shell owns meta state (a boot-loaded shell-local), the sim reads no storage (boundary fence stays green and unchanged), and no `startRun`/`tickRun`/`createRun` signature changes in this story. The run-creation meta argument lands with its first consumer — Story 7.3's lock filter (epics.md:1041+, FR32). Do NOT add an unused `meta` parameter "for the future": an unconsumed parameter is a frozen-contract change for zero behavior, and the frozen suite's envelope pins (e.g. the tickRun trace key-set legs) would pay for it. State this explicitly in any PR text.
6. **D6 — contract test: NEW file `tests/metalegger.test.js`.** One new Node-side suite (the house rule: every new factory contract gets its Node-side contract test in the same change — epics.md:1015, AGENTS.md conventions) carrying: (a) load/save round-trip through an injected Map-backed fake — pattern `tests/game.test.js:49-61`; (b) corrupt JSON → fresh default, missing key → fresh default, blocked storage (throws on getItem/setItem) → default read / silent session-only write, nothing thrown — pattern `tests/game.test.js:57-61` and `tests/audio.test.js:216-247` (`'not json'` degrades, hostile values clamp, blocked-storage legs); (c) SHAPE-PINNED write: `saveMeta` serializes EXACTLY the three keys `{furthestArea, summits, skips}` — unknown/hostile input fields never ride along — mirror of the shape-pinned-write leg at `tests/audio.test.js:237-239` and `audio.js:33-43`; (d) the AC3 persisted-key-set census: a literal-key enumeration across `js/` (the `setItem('jumprope-…` sites, same readdir idiom as reducedmotion L10(a) :650-655) equals the set {jumprope-audio, jumprope-best, jumprope-meta} EXACTLY, and no site stringifies a run record — the permadeath pin, new test file per AC3's "pinned by a new test file enumerating the persisted key set". Law-form legs only — no current-build numerics (seed-honesty/A2 is vacuous here: no rng involved).

## Re-contract authorizations (written here, per the frozen-test discipline — AGENTS.md:52)

Exactly ONE existing test leg is re-authorized: `tests/reducedmotion.test.js` L10 **part (a)** (reducedmotion.test.js:649-657 — the title word, the (a) comment, the expected array `['audio.js','game.js']` → `['audio.js','game.js','game.js']` at :657, and the message string's count word). Everything else in that file — parts (b)+ (from :659), every other leg — and every other existing test file stay BYTE-IDENTICAL; in particular `tests/pausemenu.test.js` :424/:431-432 pass untouched by the D2 dormancy proof (D3). Bookkeeping (list-only, authorized by this story doc): the create round appended THIS story's path to the §6 diff-census allow-sets of `tests/ceilingbreak.test.js` and `tests/summitapproach.test.js`; the DEV round must append `tests/metalegger.test.js` to BOTH allow-sets in the same change as the new file (C1, same list-only pattern — both files' sets already authorize `js/game.js`, `js/shell.js`, `tests/reducedmotion.test.js`, and `sprint-status.yaml` from prior stories).

## Tasks / Subtasks

- [ ] Task 1 — meta helpers in the sim module's seam (AC: 1, 2)
  - [ ] `js/game.js`: export `loadMeta(storage)` — try `JSON.parse(storage.getItem('jumprope-meta'))`; on missing/corrupt/non-object → `{ furthestArea: 0, summits: 0, skips: 0 }`; sanitize each counter to a finite non-negative number, else 0 (invalid values are data — mirror the `clampVolume`-style finiteness guard, `js/audio.js:12-16`, not a `||` coalesce); catch → same fresh default (shape: `loadBest` game.js:337-343, `loadSettings` audio.js:20-31).
  - [ ] `js/game.js`: export `saveMeta(storage, meta)` — try `storage.setItem('jumprope-meta', JSON.stringify({ furthestArea, summits, skips }))` — EXACTLY those three keys, each sanitized on the write side too (shape-pinned write, `audio.js:33-43` precedent); catch → silent session-only (shape: `saveBest` game.js:345-351). Named exports, POJO in/out, 2-space indent, camelCase, no `console.*` (AGENTS.md:46-51).
  - [ ] No changes to any sim function, constant, or the tickRun/startRun/applyCard/resumeRun bodies — the addition sits below `saveBest` and is never called by the sim.
- [ ] Task 2 — boot wiring in the shell (AC: 1)
  - [ ] `js/shell.js`: load meta once at boot beside the existing `loadBest(localStorage)` (:151) into a shell-local (`meta`); nothing consumes it in 7.1 (D2/D5) — exactly one `getItem`, one `JSON.parse`, no retry/loop (NFR12, epics.md:96).
  - [ ] NO `saveMeta` call anywhere in `js/` (D2 — dormant write lane; a runtime write reddens the pausemenu census legs, D3).
- [ ] Task 3 — the frozen-leg re-contract (AC: 3; D3)
  - [ ] `tests/reducedmotion.test.js` L10: update title "two setItem sites" → "three", the (a) census comment, the expected array at :657 → `['audio.js', 'game.js', 'game.js']`, the message string's count word; list the three sites (jumprope-audio + jumprope-best + jumprope-meta) in the message. Touch NOTHING else in the file.
- [ ] Task 4 — the new contract suite (AC: 2, 3, 4; D6)
  - [ ] `tests/metalegger.test.js` NEW: round-trip, missing/corrupt/blocked-storage legs (data not errors), shape-pinned write (three keys exactly), and the persisted-key-set census ({jumprope-audio, jumprope-best, jumprope-meta} exactly; no run-record write site anywhere in js/). Patterns: game.test.js:49-61, audio.test.js:216-247. Import ONLY `../js/game.js` (static) — never a `tests/*.test.js`.
  - [ ] C1: append `tests/metalegger.test.js` to BOTH §6 allow-sets (`tests/ceilingbreak.test.js`, `tests/summitapproach.test.js`), list-only comment, tripwire stays armed.
- [ ] Task 5 — gates and bookkeeping (AC: all)
  - [ ] `./run_tests.sh` green (baseline 566/566 @ ~8.5 s; expect 566 + new metalegger legs; budget NFR4 < 10 s — these legs are microseconds).
  - [ ] `tests/boundary.test.js` green unchanged (D4); summit-gate/balance suites green unchanged (D5 — sim behavior bit-identical, helpers uncalled).
  - [ ] Story Status → done; File List + Debug Log filled; sprint-status stamp per house style.

## Dev Notes

### Current state (verified 2026-11-11 @ 0c5185f)

- `js/game.js:337-343` `loadBest(storage)` and `:345-351` `saveBest(storage, score)` — the injected-storage seam: try/catch, bare key `jumprope-best`, silent degradation. This is THE pattern to mirror; nothing else in js/ touches storage.
- `js/audio.js:7` `SETTINGS_KEY = 'jumprope-audio'`; `:20-31` shape-pinned load (junk → defaults); `:33-43` shape-pinned write (writes ONLY `{muted, volume}`); `:36` is one of the two literal `setItem(` sites in js/ (the other: game.js:347) — the exact census reducedmotion L10(a) pins.
- `js/shell.js:63` `const rng = Math.random;` (injection idiom D5 will mirror in 7.3); `:151` `let best = loadBest(localStorage);` — the boot seam where meta loads join; `:715` the `tickRun(run, rope, player, STEP, rng, …)` call — rng as positional param; `:724` `saveBest(localStorage, best)` at run end — where 7.2's accrual will join, NOT this story.
- Persisted key set today: exactly {`jumprope-best`, `jumprope-audio`} (pausemenu.test.js:431-432 runtime census; reducedmotion L10(a) static census).
- `tests/boundary.test.js:12` `BROWSER_IO_RE` (matches `localStorage` literal); `:103-113` the IO fence test — green as long as game.js keeps storage behind the param (D4).
- Frozen legs in the blast radius: reducedmotion.test.js:649-657 (RE-AUTHORIZED, D3); pausemenu.test.js:424, :431-432 (must stay byte-identical, passes by D2 dormancy).
- §6 diff census: ceilingbreak.test.js:546+ (BASE `5659fd4`, allow-set :572-695) and summitapproach.test.js:837+ (BASE `2c3e693`, allow-set :859-982) — this story's path already appended by the create commit; dev round appends metalegger.test.js (C1).
- S4 (band-gate scope) is already decided — run-scoped, `architecture.md:161-165`; 7.1 has zero balance surface (no sim change at all), so nothing in the band lane to re-measure or except.

### Pitfalls

- **Do not wire `saveMeta` into the shell.** The single most likely disaster: "finish the feature" by persisting at run end. That is 7.2's lane; here it breaks the byte-identical pausemenu runtime census (D3) and pre-empts 7.2's accrue-once design.
- Do not version or rename the key (D1); do not put meta in the run record or any sim module; do not pass meta into `startRun`/`tickRun` (D5).
- The L10(a) census counts literal `setItem(` occurrences per file — writing saveMeta with an aliased/dynamic call shape to "avoid" the third occurrence defeats the census and violates its semantics; write it plainly like `saveBest`.
- `JSON.parse` of `'"junk"'`-style valid-JSON-non-object payloads must degrade too (typeof check after parse, not just try/catch); a bare `{}` payload degrades per-field to 0 (D6-b).
- The `||`-coalesce trap on counters: `skips: 0` is legitimate — guard finiteness, never coalesce (audio.js:10-16 doctrine).
- Never import a `tests/*.test.js` from another test (registers its tests); copy the fake-storage idiom instead (game.test.js:49-61).

### Precedents to follow

- 6.1's create→dev round shape: re-contract written verbatim in story text before dev touches it; C1 census appends with list-only comments (c38070e, 6.3/6.4 appends).
- The `loadBest`/`saveBest` pair is the named lineage for every line of the new helpers (FR24 lineage, epics.md:1005).

### AC → test mapping

- AC1 → shell boot leg rides existing harness coverage; the one-getItem budget is a code-law (NFR12) — metalegger round-trip leg proves the read shape; no numerics asserted.
- AC2 → `tests/metalegger.test.js` corrupt/missing/blocked legs (pure Node, no DOM).
- AC3 → `tests/metalegger.test.js` key-set census (static, three keys exactly) + re-authorized reducedmotion L10(a) (occurrence census) + untouched pausemenu runtime censuses (dormancy proof).
- AC4 → boundary.test.js unchanged-green + metalegger.test.js shipping in the same change; `git diff` proves no sim signature moved.

### Project Structure Notes

- All changes inside the existing `js/game.js` + `js/shell.js` lanes and two `tests/` files — no new paths beyond `tests/metalegger.test.js`; no new module, no import-graph delta (boundary DAG unchanged).
- Variance: none — the ledger helpers match the FR24 seam pattern exactly.

### Project Context Rules

- No `project-context.md` exists in this repo; the project-wide rules live in AGENTS.md: camelCase named exports, `create*`/`update*` factories returning fresh POJOs, 2-space indent, sparse comments (non-obvious fallbacks only), no `console.*` in pure modules (AGENTS.md:46-51); frozen-test discipline — existing files byte-identical, new behavior gets new files, re-contracts written in story text (AGENTS.md:52); `tests/`, `run_tests.sh`, `.github/` are sacred paths — this story's edits are the story-authorized exceptions above; NFR6: static files only, no dependencies (epics.md:82-95 conventions block via Additional Requirements, epics.md:99-121).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#story-71] (ACs, :995-1015) · Epic 7 vision :989-993 · Peel delta FR31-FR35 :75-80 · NFR12/NFR13 :96-97 · Additional Requirements & Epic 7 riders :99-121
- [Source: _bmad-output/planning-artifacts/architecture.md#persistence-as-built] :131-135 (bare key doctrine; "no run record is ever persisted") · :161-165 (S4 run-scoped band gate)
- [Source: js/game.js] :337-351 loadBest/saveBest seam · :347 the jumprope-best setItem literal
- [Source: js/audio.js] :7 SETTINGS_KEY · :12-16 finiteness-not-coalesce guard · :20-31 shape-pinned load · :33-43 shape-pinned write · :36 second setItem literal
- [Source: js/shell.js] :63 rng injection · :151 boot loadBest seam (meta joins here) · :715 tickRun rng param · :724 saveBest run-end write (7.2's future join, NOT 7.1)
- [Source: tests/reducedmotion.test.js] :649-657 L10(a) occurrence census (RE-AUTHORIZED)
- [Source: tests/pausemenu.test.js] :424 mid-walk key census, :431-432 shipped-key-set runtime census (byte-identical, dormancy proof)
- [Source: tests/boundary.test.js] :12 BROWSER_IO_RE · :103-113 shell-only IO fence
- [Source: tests/game.test.js] :49-61 fake-storage round-trip + blocked-storage pattern
- [Source: tests/audio.test.js] :216-247 corrupt/junk/clamp/blocked + shape-pinned-write pattern
- [Source: tests/ceilingbreak.test.js] :546 BASE · :572-695 §6 allow-set · [Source: tests/summitapproach.test.js] :837 BASE · :859-982 §6 allow-set
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] :160-165 key-drift row CLOSED — bare-key naming settled
- [Source: _bmad-output/implementation-artifacts/6-1-policy-bot-summit-gate-the-balance-master-dial.md] create-round/structure precedent; c38070e census-append precedent

### Deferred items (not this story)

- Runtime run-end accrual via `saveMeta` — owner Story 7.2 (with the accrue-once / release-resume hygiene and the A2 seed-honesty contract for its batch legs).
- The run-creation meta parameter and the offer-generator lock filter — owner Story 7.3 (first consumer; D5).
- Meta-aware band sweeps / A3 bot build-space widening — settled run-scoped (architecture.md:161-165); meta-shape sweeps with named exceptions ride 7.5.
- Any meta UI (title strip / unlock card / meta screen surfaces) — 7.4+; NFR7 letterbox rule rides there.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-11-11 (create round): story created from epics.md:995-1015 + Epic 7 delta/riders + architecture §Persistence; Decided D1-D6 (entry-probe batch) embedded; single frozen-leg re-contract L10(a) authorized with the pausemenu dormancy proof; census allow-append (this artifact, list-only) x2; sprint-status ready-for-dev, epic-7 in-progress; gate baseline 566/566 @ 0c5185f.
