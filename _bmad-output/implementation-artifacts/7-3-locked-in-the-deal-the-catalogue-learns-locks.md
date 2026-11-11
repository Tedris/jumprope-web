---
baseline_commit: ecea324897014396ad8553fb75d057a90943d9ca
---
# Story 7.3: Locked in the deal — the catalogue learns locks

Status: ready-for-dev

*Ultimate context engine analysis completed — comprehensive developer guide created (2026-11-11).*

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want the catalogue to open gradually,
So that new cards feel earned, not listed.

7.3 is The Peel's first READER of meta state (epics.md:989-991: "locks become real in the deal"). Story 7.1 shipped the ledger with the run-creation parameter left VACUOUS on purpose — "the run-creation meta argument lands with its first consumer — Story 7.3's lock filter" (7-1 story D5, epics.md:1015) — and 7.2 made the counters live (shell.js:726-740). This story extends the ONE deal filter with a lock predicate, lands the run-creation `lockedIds` input, and ships completely INERT: zero cards locked, so the shipped deal stays the frozen suite's v2 deal bit-for-bit (FR32 regression pin, epics.md:78/:166). The locks themselves — which cards, which thresholds — are decision S2, a named kickoff decision at Story 7.4 (FR33 epics.md:79), and the dependency direction is one-way: 7.3 before 7.4, never after (epics.md:1059).

## Acceptance Criteria

1. **One filter point, one predicate.** Given a card flagged locked in catalogue metadata, when offers deal, then locked cards are filtered at exactly the same filter point as capped-owned (`pickOffers`) — one predicate extended, no second filtering path (FR32). [epics.md:1047-1049]
2. **Zero-locks bit-identity (regression pin).** Given zero locks — the state this story lands with — when the frozen suite runs, then every existing deal/balance leg passes byte-identically, AND the rng stream position for identical seeds is unchanged (FR32 regression pin, NFR5). [epics.md:1051-1053]
3. **CARD-09: no cadence back door.** Given the CARD-09 constraint (epics.md:119), when the deal changes at all, then offer frequency (every 10th skip, 2→3 after skip 30) is provably untouched — the `offercadence` instrument proves no offer-escalation back door. [epics.md:1055-1057]
4. **Inert ship.** The filter ships inert — no card is locked by this story; unlocks flip locks from Story 7.4 onward (FR33 dependency direction: 7.3 before 7.4, never after). [epics.md:1059]

### Decided notes (settled pre-loop 2026-11-11; do not re-litigate)

1. **D1 — the predicate extension is inside `isAvailable`, with an ordering landmine.** The AC's "exactly the same filter point as capped-owned" is `js/upgrades.js`: `isAvailable(card, owned, state)` :67-75 (owned-cap check :68, stateCap walk :69-74), reached from exactly ONE line — `pickOffers`' filter `pool.filter(c => isAvailable(c, owned, state))` at :83; `isAvailable` has no other production caller (grep: tests catalogue.test.js:78-79, offerstate.test.js:29-31 only). Extend to `isAvailable(card, owned, state, lockedIds)` — trailing optional, exactly the state-arg precedent (:64-66: "state omitted keeps the exact 2-arg contract for every frozen caller"; offerstate/catalogue legs stay green untouched). **LANDMINE:** the lock `if` must sit directly beside the cap check (:68) and ABOVE the stateCap early return `if (!cap || !state) return true;` (:70) — most cards carry no `stateCap`, so a lock check placed below :70 never runs for them and the AC1 predicate silently locks nothing. Form: `if (Array.isArray(lockedIds) && lockedIds.includes(card.id)) return false;` — the `Array.isArray` guard makes invalid data INERT instead of a substring match (`'float'.includes('float') === true` would lock a card from a crafted string; invalid states are data, epics.md:106).
2. **D2 — `pickOffers` gains a TRAILING optional 6th arg; the rng law is untouchable.** `pickOffers(pool, owned, count, rng, state, lockedIds)`; the filter line :83 threads it. The inverse-CDF consumes rng POSITIONALLY after filtering (:80-81 "the inverse-CDF consumes rng positionally, so rng must never shift"; consumption at :87, splice :94) — the lock check is a pure read that consumes no rng, and with zero/undefined `lockedIds` the filter output is the pool untouched, so every frozen deal/balance leg stays bit-identical AND the rng stream position for identical seeds is unchanged. Every existing caller keeps working untouched: `game.js:202/:227` (5-arg, gains the 6th at both sites — Task 2), `pickTwo` :101-103 (4-arg compat shim, NOT threaded — it has no run context and its distinct-pair pin at upgrades.test.js:17-24 is frozen), plus the frozen direct callers in catalogue/offerstate/upgrades tests. Do NOT pre-filter anywhere else: one predicate, one path (AC1).
3. **D3 — `lockedIds` rides the RUN RECORD, derived at run creation, frozen for the run's life.** `createRun(lockedIds)` / `startRun(lockedIds)` gain the trailing optional param (7.1 D5's designated landing: the run-creation input, "as an immutable input at run creation — like rng", epics.md:120 rider); the record gains a 17th key, sanitized like every other run field: `lockedIds: Array.isArray(lockedIds) ? lockedIds.filter(id => typeof id === 'string') : []` (game.js:116-118). `tickRun`'s signature stays EXACTLY as frozen; both deal sites (game.js:202-203 cleared path, :227-228 buffer-forgiven path — the Story 6.2 cadence twins) pass the identical trailing arg `run.lockedIds ?? []`, mirroring the `run.owned ?? {}` heal on the same lines. The record ride buys the freeze for free: `resumeRun`'s spread (game.js:112-114; shell.js:295/:465) preserves the run's lock set across pause/buffer paths, and only the next `startFreshRun` re-derives — mid-run meta accrual cannot re-lock or unlock a live deal, the same once-per-run-boundary law as rng. Consequence, authorized below: the createRun key-set leg `tests/altitude.test.js:42-44` re-contracts (the 3.3 `charged` / 3.4 `airJumps` precedent comments at :38-41 are the exact wording to mirror) and `architecture.md`'s run-record entry (:52-58, "16-key record") updates to 17 keys — both paths are already in both §6 allow-sets (ceilingbreak :576/:630/:678, summitapproach lineage), so NO census append is needed for them.
4. **D4 — locks are DERIVED, not persisted; the helper is pure and lives in `upgrades.js`.** `export function lockedIdsFor(pool, meta)` in js/upgrades.js, re-exported through game.js beside CARDS (:9 `export { CARDS } from './upgrades.js'` — the shell imports deal machinery via game.js, the existing pattern, shell.js:1). Semantics: a card is locked **iff it has `card.unlock` metadata AND the meta counters do NOT yet satisfy every threshold** — `card.unlock` entries mirror the S2 counter-map keys (`furthestArea`, `summits`, `skips` — game.js:365-379), read law-form `(meta?.[key] ?? 0) >= min` exactly like the stateCap walk at upgrades.js:74; absent `meta` reads as a fresh session (all counters 0 — the loadMeta degradation shape, game.js:367/:377). No `unlock` key → never locked; `unlock: {}` → UNLOCKED (vacuously satisfied — the polarity is the mirror of the :72-74 stateCap dead-pick guard, where vacuous `every` HIDES; locked = `!allMet` makes the empty case inert by construction, no guard needed). Returns pool-order card ids (deterministic, no rng, no storage). Shell: `js/shell.js:183`, the ONE run-creation handler (`startFreshRun`, "one write covers the cold-boot and death-restart callers" :184) — `startRun(lockedIdsFor(CARDS, meta))`, `meta` the existing shell-local (:156, whose boot comment already names 7.3 as the first reader). **This is derivation, not a fourth meta key:** `jumprope-meta` keeps its three-key shape (metalegger legs + runmark AC4 shape guard stay green UNTOUCHED — no re-contract, no migration, drift-free by construction), FR31's "no run record in meta" stays trivially true, the sim reads no storage (boundary.test.js byte-identical), and nothing else reads meta. If implementation discovers a soundness reason a PERSISTED lock set is actually required (there is none in any source), STOP and surface it as a Question — do not decide it in code.
5. **D5 — INERT is the ship state, and the frozen suite IS the proof.** Zero CARDS entries gain an `unlock` key in this story (diff fact: the CARDS array upgrades.js:1-52 stays byte-identical) → `lockedIdsFor(CARDS, anyMeta) ≡ []` → every deal identical, rng streams identical (AC2/AC4). 7.4 flips the first locks (epics.md:1059) — the new locks-leg INERT guard (Task 4 leg b) is a deliberate story-shape tripwire that 7.4 re-contracts when it adds real `unlock` metadata. CARD-09 (epics.md:119): `shouldOfferUpgrade`/`offerCount` (upgrades.js:105-113) stay byte-identical and the `offercadence` suite passes UNTOUCHED — its crafted records `{ ...createRun(), ... }` (:53/:64/:74/:94) inherit `lockedIds: []` through the spread and deal exactly as today. A4's owned-cap pack: N/A here (no cap change; the pack rides 7.5 per epics.md:117).
6. **D6 — new suite `tests/locks.test.js`, direct sim imports (catalogue.test.js / offerstate.test.js donors — the derivation and predicate are pure data, no shell harness needed).** Legs (a)-(g) per Task 4; seed-honesty A2 (epics.md:117): the bit-identity pins compare behavior against the SHIPPED behavior of the same build (same-seed deal equality and rng-call-count equality across the extended vs omitted arg), never recorded current-build numerics; any batch leg carries ×2 determinism witnesses. A3 meta-blindness: untouched — zero meta feeds the bot's build space this story (the ship is inert); the band gate stays run-scoped per architecture.md, and the named-exception sweep is 7.5's lane.

**Questions:** none outstanding — every AC, shape, and site above is settled by the cited sources at ecea324.

## Re-contract authorizations (written here, per the frozen-test discipline — AGENTS.md:52)

Exactly ONE existing test leg is re-authorized: `tests/altitude.test.js` factory-contract leg, the `Object.keys(run).sort()` deep-equal at :42-44 — expected list gains `'lockedIds'` (sorted position: between `'iFrames'` and `'offer'`), the message updated to name the key, and a comment line mirroring the :38-41 charged/airJumps precedent ("Story 7.3 authorized re-contract: lockedIds joins the createRun key set — the lock set is run-record data frozen at run creation (FR32)"). Everything else in altitude.test.js (its tickRun/trace legs included — `tickRun`'s signature does not change) and EVERY other existing test file stays BYTE-IDENTICAL: upgrades/catalogue/offerstate (trailing-optional callers), offercadence (CARD-09 proof), balance/summitgate (bit-identity), boundary (fence unchanged), metalegger/runmark (meta shape unchanged), pausemenu/winloss (persistence census — no new storage key this story; `lockedIds` never persists, it rides the run record, which is NEVER persisted — FR31/FR23). Bookkeeping (list-only, authorized by this story doc): the CREATE round (this commit) appends THIS story's path to the §6 diff-census allow-sets of `tests/ceilingbreak.test.js` (after `'tests/runmark.test.js',` :712) and `tests/summitapproach.test.js` (:999), mirroring the 7.1/7.2 create-round wording; the DEV round must append `'tests/locks.test.js'` AND `'js/upgrades.js'` to both (C1) — upgrades.js is a NEW member because it has not been touched since either census BASE era, so the tripwire will otherwise red-light this story's own predicate edit; altitude.test.js and architecture.md are already members (no append needed).

## Tasks / Subtasks

- [ ] Task 1 — the one predicate, at the one filter point (AC: 1; D1, D2)
  - [ ] `js/upgrades.js`: `isAvailable(card, owned, state, lockedIds)` — the lock `if` directly after the cap check (:68), ABOVE the stateCap early return (:70); `Array.isArray(lockedIds) && lockedIds.includes(card.id) → false`. `pickOffers(pool, owned, count, rng, state, lockedIds)` threads it at the filter line (:83) and nowhere else. Extend the :64-66 / :80-81 comments (one sentence each; the rng-never-shift law verbatim stays).
  - [ ] `pickTwo` (:101-103) untouched; `shouldOfferUpgrade`/`offerCount` untouched (CARD-09); no second filter path anywhere (grep check: no new `.filter` on CARDS/pool outside upgrades.js:83).
- [ ] Task 2 — the run-creation landing (AC: 1; D3)
  - [ ] `js/game.js:108-118`: `startRun(lockedIds)` passes through; `createRun(lockedIds)` gains the sanitized `lockedIds` key (17th; `Array.isArray(...) ? .filter(typeof string) : []`). No other field, no meta import, no storage touch.
  - [ ] `js/game.js:202-203` and `:227-228`: identical trailing arg `run.lockedIds ?? []` at BOTH deal sites (the 6.2 cadence twins — divergence re-opens the FR10 gap the offercadence witness closes). `tickRun` signature unchanged; cadence code paths byte-identical.
  - [ ] `tests/altitude.test.js:42-44`: the ONE authorized re-contract, exactly as written above.
  - [ ] `architecture.md` run-record entry: 16 → 17 keys with the lock-set ride (doc truth; in both allow-sets already).
- [ ] Task 3 — the derivation helper + the shell call site (AC: 1, 4; D4)
  - [ ] `js/upgrades.js`: `export function lockedIdsFor(pool, meta)` — pure; locked(card) = `card.unlock && !Object.entries(card.unlock).every(([k, min]) => (meta?.[k] ?? 0) >= min)`; no-`unlock` cards skipped; returns card ids in pool order. Comment names FR32 and the S2-mirror key set.
  - [ ] `js/game.js:9`: extend the re-export line to `export { CARDS, lockedIdsFor } from './upgrades.js'`.
  - [ ] `js/shell.js`: `startRun(lockedIdsFor(CARDS, meta))` at the ONE creation site :183; add `lockedIdsFor` to the existing game.js import line :1. No other meta reader, no second `startRun` call site, no loadMeta call moved, no persistence change (:726-740 accrual branch untouched — it feeds the NEXT run's derivation through the shell-local).
  - [ ] `tests/boundary.test.js` untouched-green: no storage/DOM token in game.js/upgrades.js (the derivation takes meta as DATA — exactly like rng takes a function).
- [ ] Task 4 — new contract suite `tests/locks.test.js` (AC: 1, 2, 3, 4; D6) — direct `node --test` imports of js/upgrades.js + js/game.js
  - [ ] (a) Derivation law: crafted pool (`unlock: { furthestArea: 3 }`, `{ summits: 1, skips: 100 }`, none, `{}`) against crafted counters — locked iff NOT every threshold met, `(meta?.[k] ?? 0)` missing-key reads 0, absent meta = fresh session (all unlocks above 0 lock), `{}` = unlocked (vacuity note, D4), no-`unlock` cards never lock under any meta.
  - [ ] (b) INERT guard (story-shape tripwire): `CARDS.every(c => !('unlock' in c))` and `lockedIdsFor(CARDS, meta)` deep-equals `[]` for every meta probe incl. `{ furthestArea: 9, summits: 9, skips: 9 }` — AC4's shipped proof; 7.4 re-contracts this leg when it adds real `unlock` metadata (say so in the leg comment).
  - [ ] (c) Filter point: `pickOffers` on a crafted locked pool with `lockedIds` hides the locked card across count 1..pool-size, never repeats, fewer-than-count on exhausted pool; the SAME pool without `unlock` metadata + any `lockedIds` returns identical deals at identical rng-call counts.
  - [ ] (d) rng-stream pin (AC2): scripted batch over seeded streams — for identical seeds, the deal-by-deal card-id sequence with `lockedIds: []` / omitted 6th arg equals the 5-arg shipped call, AND the counting-rng wrapper reports EQUAL call counts (the no-shift law directly observed); ×2 determinism witnesses (whole batch run twice, equal). No recorded numerics anywhere.
  - [ ] (e) Run-creation ride: `createRun()`/`startRun()` carry `lockedIds: []` (default contract); `startRun(['float','multi'])` carries it sanitized; sanitize legs — non-array arg → `[]`, mixed array → strings kept, non-strings dropped; `resumeRun` preserves the record's `lockedIds` across the spread; a tickRun deal on a crafted record MISSING the key heals via `?? []` and deals exactly like `[]` (the `run.owned ?? {}` twin heal).
  - [ ] (f) Frozen-mid-run witness: run A created with `lockedIds: ['float']` deals no float even when a later `lockedIdsFor` under grown counters returns `[]`; a run created with `[]` under shrunken counters still deals float. (Lock set = run data, derivation = creation-time only.)
  - [ ] (g) tickRun-level bit-identity: scripted rng-driven deal crossings (the offerstate/offercadence tick idiom) on a real-CARDS record with `lockedIds: []` vs one lacking the key — identical `events` sequences, identical offers, identical rng call counts (AC2 inside the shipped cadence; doubles as the CARD-09 witness beside the untouched offercadence suite).
  - [ ] C1 (dev round): append `'tests/locks.test.js'` AND `'js/upgrades.js'` to both §6 allow-sets, list-only comment (the 7.2 wording), tripwires stay armed — NOT part of this create round.
- [ ] Task 5 — inert-ship proof, gates, bookkeeping (AC: all)
  - [ ] `./run_tests.sh` green (baseline **581/581 @ ecea324**, ~8.6 s; expect 581 + the new locks legs; NFR4 < 10 s).
  - [ ] Green UNTOUCHED (the proof obligations): boundary, offercadence, balance, upgrades, catalogue, offerstate, summitgate, metalegger, runmark, pausemenu, winloss — only altitude.test.js:42-44 moves, per the authorization above; `git diff` proves the CARDS array and both cadence functions byte-identical (AC3/AC4 diff facts).
  - [ ] Dev round stamps `review`; final gate re-run; sprint-status per house style.

## Dev Notes

### Current state (verified 2026-11-11 @ ecea324)

- `js/upgrades.js`: CARDS 12 cards :1-52 — ZERO `unlock` keys (grep live: the word "locked" in js/ hits only render3d/shell comments, nothing catalogue-side); `RARITY_WEIGHT` :58; `isAvailable` :67-75 (cap :68 → early `return true` :70 → stateCap entries :71-74 with the dead-pick guard comment :72-74); `pickOffers` :82-97 (filter :83, weights :86-92, splice :94); state-arg + rng comments :64-66 / :77-81; `pickTwo` :101-103; `shouldOfferUpgrade` :105-107; `offerCount` :111-113.
- `js/game.js`: re-exports `CARDS` :9; `startRun` :108-110 (spread of `createRun()` + `status: 'running'`); `resumeRun` :112-114 (spread preserves record keys — D3's freeze ride); `createRun` :116-118 (16-key record); deal sites :202-203 (cleared crossing) and :227-228 (`buffer > 0` forgiven pass, Story 6.2 twin — both `pickOffers(CARDS, run.owned ?? {}, offerCount(skips), rng, { ropes: ropeCount, charged })`); ledger trio :360-394 (`clampCounter` :360-363, `loadMeta` :365-379 — the three-key shape a fourth key would violate, `saveMeta` :381-394).
- `js/shell.js`: import line :1 (already imports `startRun`, `CARDS`, `loadMeta`, `saveMeta` from game.js); `rng` :63 (the injection idiom this story mirrors); `meta` local :156 — boot comment :152-155 literally says "nothing reads it into gameplay yet (7.3)"; `startFreshRun` :178-184 — the ONE run-creation call `startRun()` at :183; `resumeRun` spreads :295/:465; run-end accrual branch :726-740 (meta reassign :734-737, `saveMeta` :738) — untouched, it feeds NEXT-run derivations via the shell-local.
- Frozen surfaces this story touches or leans on: `tests/altitude.test.js:30-45` (factory leg; key-set deep-equal :42-44, re-contract comments :38-41); `tests/catalogue.test.js:76-79` (2-arg `isAvailable`); `tests/offerstate.test.js:23-31` (3-arg, stateCap laws); `tests/upgrades.test.js:17-24` (pickTwo pin); `tests/offercadence.test.js` (createRun-spread records :53/:64/:74/:94 — inherit `lockedIds: []`, stay green untouched = AC3); `tests/balance.test.js:387-399` (catalogue enumeration — bit-identity stake).
- §6 census append points (create round, THIS commit): `tests/ceilingbreak.test.js` — after `'tests/runmark.test.js',` :712, array closes :713 (BASE `5659fd4`); `tests/summitapproach.test.js` — after :999, closes :1000 (BASE `2c3e693`). Both censuses include `git status --porcelain`, so the new story file is caught at create time — hence the appends ride this commit.
- Gate: **581/581 @ ecea324** (~8.6 s). 7.2's review closed with the clampArea doctrine note (deferred-work.md:287) — no bearing: this story reads no `run.area`.

### Pitfalls

- **The most likely disaster: shifting the rng stream.** Any rng consumption inside the predicate, a reordered/reimplemented filter, or a lock check that skips rng conditionally breaks EVERY frozen balance/determinism leg — the exact regression FR32 pins. The extension is one pure `if`; the filter line stays a single `.filter` before :87. Proven by legs (d)(g), not argued.
- **The ordering landmine (D1):** lock `if` below the stateCap early return (:70) = locks silently dead for the 9+ cards without `stateCap`. Leg (c) with a `stateCap`-free crafted pool falsifies exactly this.
- **Both deal sites, identically (Task 2).** One site threaded and the other not = a forgiven 10th skip deals from a different pool than a cleared 10th — the Story 6.2 FR10 gap reopened, and leg (g) reddens.
- **No cadence change** (CARD-09, epics.md:119): offerCount/shouldOfferUpgrade byte-identical; an offer-count or skip-gate "improvement" is out of scope and back-door territory without new evidence.
- **No fourth meta key, no `locked` field, no unlock read in `loadMeta`/`saveMeta`** (D4): metalegger legs and the runmark AC4 shape guard are the tripwires — their untouched-green IS the derivation-not-persistence proof. A drift bug here would make locks a persisted run-adjacent state and brush the FR31 permadeath contract.
- **No storage or meta access inside the sim** (epics.md:120, architecture §The One Rule): do not "helpfully" call `loadMeta` in `createRun`/`upgrades.js`; meta enters ONLY as the shell's data argument at run creation, like rng. `tests/boundary.test.js` is byte-identical.
- **No unlocking logic mid-run:** locks are re-derived only at `startFreshRun` (:183). A meta read or re-derivation inside `tickRun`/`pickOffers` breaks D3's freeze and the purity fence simultaneously.
- `tests/altitude.test.js`: edit ONLY the :42-44 region; its other legs pin tickRun traces against the (unchanged) signature — a `tickRun` signature change would be a second, UNAUTHORIZED re-contract.
- feelcap AUD-02 scans js/ comments for the `audio.js` token (7.1's red iteration) — phrase new comments without it. Never import one test file from another; the locks legs are bootless (catalogue/offerstate donors).
- Do not lock any card in 7.3 (AC4): an `unlock` key on a real CARDS entry shrinks the pool = deal change = frozen balance legs red — that is 7.4's S2 decision with its fiction, never a drive-by.

### Precedents to follow

- The state-arg extension (Story 3.1, upgrades.js:64-66) is the API shape verbatim; the 6.2 twin-site cadence rule is the call-site rule verbatim; the 7.1-D5 "first consumer" clause is the license for the run-creation param — this story is the named landing.
- altitude.test.js:38-41 charged/airJumps comments are the re-contract comment wording; the 7.1/7.2 create+dev census appends are the bookkeeping wording (this create commit mirrors 7-2's comment block exactly, list-only, tripwires armed).
- The 7.2 create→dev→review chain for structure: Decided notes embedding live cites, Re-contract authorizations as a standalone section, AC→test mapping.

### AC → test mapping

- AC1 → locks legs (a)(c)(e)(f) + altitude key-set leg (re-contracted) + `git diff` fact (no second filter path; `isAvailable` single caller line :83) + boundary green unchanged.
- AC2 → locks legs (b)(d)(g) + the entire frozen suite untouched (581 baseline legs are themselves the byte-identity proof; (d)(g) add the rng-stream-position pin FR32 names).
- AC3 → offercadence green UNTOUCHED + byte-identical `shouldOfferUpgrade`/`offerCount` diff fact + leg (g)'s identical-events-sequence witness inside the shipped cadence.
- AC4 → locks leg (b) (INERT guard, names 7.4 as its flipper) + CARDS-array byte-identical diff fact + metalegger/runmark shape guards untouched-green (derivation-not-persistence).

### Project Structure Notes

- Lanes: `js/upgrades.js` (predicate + filter thread + `lockedIdsFor`), `js/game.js` (createRun/startRun bodies, record key, both call-site args, re-export line), `js/shell.js` (ONE line at :183 + the import line), `tests/altitude.test.js` (authorized region), `tests/locks.test.js` NEW, `architecture.md` (run-record row). No new module, no import-graph delta, no `index.html`/`package.json` touch (near-frozen, epics.md:116), no `tests/boundary.test.js` touch.
- Variance: none — every site was pre-registered by 7.1 D5 / epics.md:120 / the FR32 trace row (epics.md:166).

### Project Context Rules

- No `project-context.md` exists; rules live in AGENTS.md: named exports, DI for anything impure (AGENTS.md:48 — here the meta DATA-injection is the pure-core twin of that rule), POJOs/spread only, `*Mul` suffix convention N/A, 2-space indent, sparse comments, no `console.*` in pure modules (AGENTS.md:50), frozen-test discipline with story-text re-contracts (AGENTS.md:52), one shared handler per concern (AGENTS.md:53 — `startFreshRun` is THE run-start handler; there is no second call site to update), `tests/` + `run_tests.sh` sacred (the altitude region above is the only authorized exception). NFR6: static files, zero dependencies. NFR12/13: zero new storage reads — derivation costs one `Object.entries` sweep per run start, negligible and parse-free.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#story-73] ACs :1039-1059 (filter point :1049, regression pin :1053, CARD-09 :1057, inert/dependency :1059) · FR32 :78/:166 · FR33 :79 (S2 at 7.4 kickoff) · Epic 7 vision :989-991 · riders :117 (A2), :119 (CARD-09), :120 (meta data-at-run-creation + fence) · conventions :99-116
- [Source: _bmad-output/planning-artifacts/architecture.md] §The One Rule :33-42 (pure core/shell, boundary fence) · layers table :46-49 · run record :52-58 (16 keys → 17, this story's doc row) · §Persistence :131-138 (jumprope-meta three-key, no run record persisted)
- [Source: js/upgrades.js] CARDS :1-52 · isAvailable :67-75 (cap :68, early return :70, stateCap law :71-74) · pickOffers :82-97 (filter :83, rng :87) · comments :64-66/:77-81 · pickTwo :101-103 · cadence :105-113
- [Source: js/game.js] re-export :9 · startRun :108-110 · resumeRun :112-114 · createRun :116-118 · deal sites :202-203/:227-228 · ledger :360-394 (loadMeta shape :365-379)
- [Source: js/shell.js] import :1 · rng :63 · meta :152-156 · startFreshRun :178-184 (:183 THE site) · resumeRun spreads :295/:465 · accrual branch :726-740
- [Source: tests/altitude.test.js] :30-45 factory leg; :42-44 THE re-contract region; :38-41 precedent comments
- [Source: tests/catalogue.test.js] :76-79 frozen 2-arg legs · [Source: tests/offerstate.test.js] :23-31 3-arg stateCap laws · [Source: tests/offercadence.test.js] :53/:64/:74/:94 spread records · [Source: tests/balance.test.js] :387-399 enumeration
- [Source: tests/ceilingbreak.test.js] §6 census :546-716 (BASE :550, porcelain arm :565-568, append point :712) · [Source: tests/summitapproach.test.js] :833-1003 (append point :999)
- [Source: _bmad-output/implementation-artifacts/7-1-meta-ledger-persistence-without-run-records.md] D5 + Deferred :117-122 (the run-creation parameter, owner 7.3) · [Source: _bmad-output/implementation-artifacts/7-2-every-run-leaves-a-mark-outcome-counters.md] D2 counter map (the S2 keys `lockedIdsFor` mirrors), Decided/re-contract structure precedent

### Deferred items (not this story)

- Flipping the first locks: which cards carry `unlock` metadata and which thresholds — decision S2 at Story 7.4 kickoff (FR33/FR34, epics.md:79; dependency direction epics.md:1059: 7.3 before 7.4, never after). 7.4 also re-contracts locks leg (b) and lands the PS1-voiced unlock fiction (any meta surface inside the NFR7 letterbox path).
- Meta-shape band sweeps, named exceptions, A3 build-space widening, A4 pack — owner Story 7.5 (epics.md:117-118, 1079: new-card conformance rides the 7.3 filter, one axis/one card + no score-reduction checked there).
- The FR35 prestige clause: untouched, direction only (epics.md:81); any climb-power input would be its own named decision.
- A per-run "what unlocked" HUD or title strip: no source asks for one in 7.3; fiction surface is 7.4's lane.

## Dev Agent Record

### Agent Model Used

_lane model name/version (dev session)_

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-11-11 (create round): story created from epics.md:1039-1059 + FR32/FR33 + Epic 7 riders (:117-122) + architecture §Persistence/§One Rule; live re-verification at ecea324 confirmed every cite (isAvailable :67-75, pickOffers filter :83, deal twins :202/:227, startFreshRun :183, meta local :156, altitude key-set :42-44, census append points). Decided D1-D6 embedded: predicate extends isAvailable beside the cap check ABOVE the stateCap early return (ordering landmine); pickOffers trailing 6th arg, rng law untouched; lockedIds rides the 17-key run record sanitized at creation (resumeRun spread freezes it for the run's life) — ONE authorized re-contract (altitude.test.js:42-44, the charged/airJumps precedent); locks DERIVED via pure lockedIdsFor(pool, meta) in upgrades.js called at the one shell creation site — no fourth meta key, no persistence change, STOP-and-ask escape if a persisted set ever proves required; ships INERT (zero unlock metadata, frozen suite = regression proof, new locks.test.js adds the rng-stream pins). Census allow-append (this artifact, list-only) ×2 — dev round must also append js/upgrades.js + tests/locks.test.js (upgrades.js is a new census member); sprint-status backlog→ready-for-dev; gate baseline 581/581 @ ecea324. Questions: none outstanding.
