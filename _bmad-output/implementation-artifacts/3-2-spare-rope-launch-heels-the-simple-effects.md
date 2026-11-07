---
baseline_commit: 7759ddfe58733a4924209ef377a23f13c2fdecb3
---
# Story 3.2: Spare Rope & Launch Heels — the simple effects

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a builder,
I want picks that directly raise rope count or launch power,
So that HP and climb builds have their foundational picks.

## Acceptance Criteria

1. (AC1) **Spare Rope pick → rope count +1 immediately.** `applyCard` resolves as a whole-record patch (ADR-2, `game-architecture.md:209,236-238,292` — the migration `deferred-work.md:70` says this story pays). The **clamped** value is written via `clampRopes` (`js/game.js:33-39`); the new rope is live from the next phase tick because the crossings loop derives rope k's window from the count each tick (`js/game.js:99-101`, even `k/N` offsets, `js/rope.js:16-19`). A pick at 4 owned/4 ropes lands at exactly 5 (research §4.4) (FR12).
2. (AC2) **Defensive clamp is data, not error.** Applying Spare Rope to a crafted record already at 5 (or with `ropes: Infinity` — the `clampRopes` Infinity arm, `js/game.js:36-37`) clamps to 5: no crash, no sixth rope.
3. (AC3) **Launch Heels multiply launch velocity ×1.10 per owned copy (cap 3)** — a new `launchMul` effect field, stacking multiplicatively with `floatMul`: measured apex `$\propto jv(h)^2 \cdot launchMul^2 \cdot floatMul$`. The jump *timing* contract is untouched (FR17 protected): no coyote time (`grounded ⟺ y === 0`), instant-grounded landing, phase clock unbothered (NFR8).
4. (AC4) **Two apply shapes coexist by ADR-2** (epics.md:531): multiplier-shaped cards stay pure endofunctions over the effects record (`*Mul` convention); run-shaped cards patch the whole record. `freshEffects()` gains the fifth key `launchMul: 1`. Every card's `apply(freshEffects())` stays shape-safe — `tests/headless-sim.test.js:144-154` runs it on every card and **stays untouched**.
5. (AC5) **Re-contracts are exactly the ledger in Task 5** — every other existing test file byte-identical, proven with `git diff <baseline> -- tests/` in the Debug Log (NFR5).
6. (AC6) **Interlocks land:** the AXIS inert-exemption becomes marker-driven (`deferred-work.md:85` — fifth effect key and AXIS tightening in the SAME change); the balance harness's scripted jumper honors `launchMul` (`deferred-work.md:84`); `tests/rulecards.test.js` FR12-pins keep passing (metadata unchanged except extrarope's color, see Task 4). Suite green < 10 s wall (baseline 308/308 @ ~8.5 s).

## Tasks / Subtasks

- [x] Task 1: `launchMul` — the effects-shape half (AC: 3, 4)
  - [x] `js/upgrades.js:57-59` — `freshEffects()` returns the fifth key `{ floatMul: 1, ropeMul: 1, scoreMul: 1, windowMul: 1, launchMul: 1 }`.
  - [x] `js/upgrades.js:46-48` — `highjump.apply: s => ({ ...s, launchMul: s.launchMul * 1.1 })` (bare field read, matching every other card's style — all effects records derive from `freshEffects()`; see Landmine 6). Update the record's trailing comment (`launch velocity lands in Story 3.2` → remove).
  - [x] `js/player.js:9-11` — `jump(player, holdSeconds, launchMul = 1)` → `vy: jumpVelocity(holdSeconds) * launchMul`. `jumpVelocity` (`js/player.js:5-7`) and `updatePlayer` stay EXACTLY as-is — FR17's formula is the hold-height contract; the multiplier lands at launch only. Optional trailing arg keeps every frozen 2-arg caller (`leadIn`, all test rigs) byte-compatible.
  - [x] `js/shell.js:354` — pass the live multiplier: `player = jump(player, (performance.now() - holdFrom) / 1000, run.effects.launchMul ?? 1);`. The `?? 1` matches the module's `??`-heal idiom for hand-built harness records.
- [x] Task 2: ADR-2 migration — `applyCard` becomes a whole-record patcher (AC: 1, 2, 4)
  - [x] `js/game.js` — add a module-local shared helper (house-rule: one handler, `applyUpgrade` and `applyCard` both route through it, no duplication):
    ```js
    // ADR-2 (game-architecture.md:236): every card is a whole-record patch.
    // Effects-shape cards are the subset whose apply is an endofunction over
    // run.effects; run-shaped cards (card.shape === 'run') patch the record.
    function patchedRun(run, card) {
      if (card.shape === 'run') {
        const patched = card.apply(run);
        return { ...patched, ropes: clampRopes(patched.ropes ?? MIN_ROPES) };
      }
      return { ...run, effects: card.apply(run.effects) };
    }
    ```
    `applyUpgrade` (`js/game.js:217-219`) becomes `{ ...patchedRun(run, upgrade), offer: null, status: 'running' }`; `applyCard` (`js/game.js:222-229`) becomes `{ ...patchedRun(run, card), owned: {...}, offer: null }` (status untouched — D-06). The uniform `clampRopes` write inside the run-shaped arm is the "clamped value is written" clause and keeps healing out-of-range records by construction (deferred-work :9 doctrine).
  - [x] `js/upgrades.js:35-38` — Spare Rope record: add `shape: 'run',` and `apply: (run) => ({ ...run, ropes: (run.ropes ?? 1) + 1 })`. NO import of `game.js` (cycle + boundary fence — the clamp lives in `game.js`; literal 1 is the `?? MIN_ROPES` defensive arm, the 5-ceiling is enforced solely by `stateCap { ropes: 5 }` + `clampRopes`, cross-checked by the frozen `tests/rulecards.test.js:52-53`). Shape-safety: called with `freshEffects()` it returns the frozen keys + `ropes: 2` — finite `ropeMul`, which is all the frozen `headless-sim:144-148` leg asserts.
  - [x] `applyUpgrade` stays exported with its exact name — `tests/feelcap.test.js:675` names it in the D-N09 fence text.
- [x] Task 3: Lead-in decision — Launch Heels do NOT amplify the lead-in hop (AC: 3)
  - [x] `leadIn()` (`js/game.js:49-54`) and `resumeRun` stay EXACTLY as-is: the canonical pair remains `jump(createPlayer(), 0.1)` at launchMul 1. Rationale (record in Dev Agent Record): ARCH-02's "exact pair" wording, `tests/v1parity.test.js:704` pins `resumed.player.vy === jumpVelocity(0.1)` ("the one leadIn hold — no other launch path exists"), and `tests/pickflow.test.js:236-238` pins `vy <= 400` post-pick. The FR25 lead-in is a run-start grace beat (no cards owned at start); the first PLAYER-timed press after resume already gets the multiplier. Accepted asymmetry: a Heels pick re-enters on the standard 400 hop.
  - [x] Pin the decision with a pure-seam leg in the new test file (Task 6, leg 9) — NOT by touching either frozen file.
- [x] Task 4: Spare Rope reads mint, per the shipped UX assumption (AC: 4)
  - [x] `js/upgrades.js:36` — extrarope `color: 'amber'` → `'mint'`. `DESIGN.md:57` [ASSUMPTION: Spare Rope/Steel Cord read mint]; epics.md:533 says the rope card is mint per the UX assumption, and Story 3.1 deliberately deferred it (`3-1-...md:94`). Test-legal: no leg pins extrarope's color VALUE — only membership in the defined five (`tests/rulecards.test.js:33`, `tests/catalogue.test.js:30`). `reinforce`'s mint stays Story 3.3's.
- [x] Task 5: Authorized fence re-contracts — EXACTLY these legs, each commented with this story's name (AC: 5)
  - [x] `tests/upgrades.test.js:6` — add `launchMul: 1` to the exact `freshEffects()` deep-equal literal (value-exact, literal stays literal).
  - [x] `tests/catalogue.test.js:19,31-33` — title wording "five frozen effect keys"; expected keys literal `['floatMul','launchMul','ropeMul','scoreMul','windowMul']`; add the shape dispatch: `card.shape === 'run'` ⇒ assert the five keys are all PRESENT (the whole-record patch preserves them and may add run fields); else the exact 5-key `deepEqual` stays.
  - [x] `tests/rulecards.test.js:42-49` — the inert-apply leg narrows to `['reinforce','doublejump']` (the still-unlanded cards); extrarope/highjump effects are pinned by the new file. Title/comment updated.
  - [x] `tests/pickflow.test.js:146,221-224` — `NEUTRAL_EFFECTS` literal gains `launchMul: 1` (parity with `upgrades.test.js:6`); the confirm-leg loop iterates `Object.keys(NEUTRAL_EFFECTS)` instead of `Object.entries(want)`. REQUIRED, not cosmetic: with a rotating first offer the current `Object.entries(want)` form hits `ropes` for an `extrarope` pick (NaN → flaky RED) and silently skips `launchMul` for a `highjump` pick. Value-exactness kept: all five effect fields are compared, now including launchMul.
  - [x] `tests/balance.test.js:202` — analytic `peakFactor` becomes `fx.floatMul * fx.launchMul ** 2` (peak = v²/2g, g = 1800/floatMul). Band logic `:203-208` untouched; this is the formula fix the harness jumper change (Task 6 harness item) makes mandatory.
  - [x] `tests/balance.test.js:322-344` — AXIS guard: exemption becomes MARKER-driven, not behavior-detected (`deferred-work.md:85` consumed): run-shaped (`card.shape === 'run'`) ⇒ assert its apply touches NO effect field, then exempt; every other card keeps the strict Decided-3 check AND must now write ≥1 effect field (an inert effects-shape card fails loudly). `highjump`'s strict check passes via axis `launchMul` ∈ written fields.
  - [x] Everything else in `tests/` byte-identical — including `tests/headless-sim.test.js`, `tests/multirope.test.js:46`, `tests/v1parity.test.js`, `tests/winloss.test.js:190`, `tests/feelcap.test.js` (verified green-by-derivation in Dev Notes).
  - [x] `tests/support/balance-harness.js:92-93` (support file, not a fence) — jumper becomes `player = jump(player, policy.hold, run.effects.launchMul ?? 1);`. NOTE for the File List: runBot's *offer* honesty needs no change — its picks come through `tickRun`'s own state-aware draw (`js/game.js:131-132`), so once `ropes` varies live, the bot's pool is automatically the real one. `collisionReport:294` stays stateless — its exact-enumeration twin (`tests/balance.test.js:284-297`) is the state-less reference the 3.1 baselines were pinned against; narrowing that item is a 6.1/6.3 decision (record in deferred-work).
- [x] Task 6: New tests — `tests/simpleeffects.test.js` (red-green, AC: all)
  - [x] RED first: all legs observed failing for the right reasons before implementation; mutation-check every leg once (Epic 1 retro A3 — no unfalsifiable legs).
  - [x] Leg 1 — highjump closure pins (derived from records): `apply`^1 launchMul = 1.1; `apply`^cap = 1.1³; the frozen four fields unchanged by its apply.
  - [x] Leg 2 — Spare Rope through the REAL pick path: `applyCard` n = 1..4 onto `startRun().run` → ropes 2,3,4,5 immediately, `owned.extrarope` tallies, `offer` null, `effects` deep-equals `freshEffects()` (no effect keys touched).
  - [x] Leg 3 — `applyUpgrade` parity: the v1 shim on `{ ...createRun(), ropes: 2 }` gives ropes 3 (shared-helper equivalence, AC1).
  - [x] Leg 4 — defensive: crafted `{ ...createRun(), ropes: 5 }` and `ropes: Infinity` pick → ropes 5, status untouched, no throw (AC2).
  - [x] Leg 5 — live-from-next-tick: after one Spare Rope pick + `resumeRun`, one scripted revolution of the headless jumper rig scores exactly 2 cleared passes (was 1); windows derived from `atFeetOffset(k, N)`, never hardcoded (NFR5).
  - [x] Leg 6 — hide-path witness: 4 real `applyCard` picks (no crafted count) → ropes 5; craft `skips: 9` and tick to the 10th with a seeded rng → the offer EXCLUDES `extrarope`, while the same-seed state-less draw includes it (contrast pair; completes the live half of `deferred-work.md:83` — `charged` stays 3.3's).
  - [x] Leg 7 — composition: measured apex under (launchMul, floatMul) within the semi-implicit-Euler band of `jv(0.5)² × launchMul² × floatMul / (2 × 1800)` (v1parity's undershoot band `[0.97, 1.0]` scale); launchMul-only peak ratio = launchMul² within band.
  - [x] Leg 8 — rig-clear witness (mirrors frozen `tests/ascent.test.js:209-219` for launchMul): a peak-margin ceiling rig the bare run cannot cross is crossed by Heels ×1 — through `tickRun` + `jump`, pure seam, no shell harness.
  - [x] Leg 9 — timing contract at cap: launchMul 1.1³ run, no scripted jump — `grounded === (y === 0)` every tick, zero `jump` events (FR17 mirror); plus `resumeRun(applyCard(runWithHeels3, card)).player.vy === jumpVelocity(0.1)` (the lead-in decision, Task 3).
  - [x] Leg 10 — determinism: seeded 200-draw replay over the unchanged pool (launchMul changed no draw math) + a scripted 1000-tick run owning Heels ×3 + Spare Rope ×1 completes or dies by trip/win, never stalls (the per-card stacked cap legs in `headless-sim:126-136` extend this for free via `applyCard`).
- [x] Task 7: Verification and bookkeeping
  - [x] `./run_tests.sh` (the one gate) fully green; wall time < 10 s; report the delta over 308/308 @ 8.5 s.
  - [x] If `tests/balance.test.js:192-211` goes RED for a NON-highjump card, your harness jumper change broke baseline honesty — fix the harness, not the leg. If highjump bands RED, your launch wiring is wrong (peak must be velocity²).
  - [x] `git diff 7759ddf -- tests/` in the Debug Log shows ONLY the Task 5 sites + the new file + the harness jumper line.
  - [x] `cardRuleReport({ ticks: 1200 })` in a throwaway script → paste: `reduceClimb: []` must still hold (highjump touches neither ropeMul nor scoreMul); highjump `peakDeltaCap` ≈ +0.77; extrarope reports effects-only (measured delta ≈ 0) — EXPECTED blind spot, rope-heavy builds are 6.1's (`deferred-work.md:69`); restate the ownership line in deferred-work.
  - [x] Static smoke: serve the folder, load a run, pick Spare Rope if offered — HUD rope pips (1.3) grow with no DOM change; note the known limitation that extra ropes stay INVISIBLE in 3D until Story 5.3 (`deferred-work.md:71`) and no Chromium exists for linux/arm64 here (3.1's Debug Log precedent) — the shell seam is covered by the frozen bootShell harness legs; a live-browser pass is Epic 5's.
  - [x] `deferred-work.md`: :70 RESOLVED (ADR-2 paid); :83 PARTIAL (ropes arm live + witnessed here; `charged` arm stays 3.3's); :84 narrowed (runBot honest via tickRun; collision-model statelessness → 6.1/6.3); :85 CONSUMED (marker-driven AXIS tightening + fifth key landed together).
  - [x] File List includes `sprint-status.yaml` (Epic 1 retro Lesson 4).

## Dev Notes

### Current state (verified 2026-11-07, every cite re-checked against HEAD 7759ddf)

- `js/upgrades.js` — 12 cards; the four FR12 records at :34-48 with inert `apply: s => ({ ...s })`; `stateCap` data :37,:41; `freshEffects` 4 keys :57-59; `isAvailable(card, owned, state)` :64-72 (state-aware with fail-open guard); `pickOffers` trailing-`state` :79-94; `pickTwo` shim untouched; extrarope color `amber` :36.
- `js/game.js` — run record :65 (`ropes` scalar 1-5, read-clamped `:99`; NO ordered rope-list — that game-architecture.md:221 fantasy was NOT shipped; the shipped model is the scalar, keep it). `clampRopes` :33-39 (Infinity arm); `leadIn` :49-54 (`jump(createPlayer(), 0.1)`); `applyUpgrade` :217-219 and `applyCard` :222-229 both call `card.apply(run.effects)` — the exact ADR-2 debt (`deferred-work.md:70`); crossings loop `for k < ropeCount` :100-101 with `atFeetOffset(phase, k, ropeCount)` — Spare Rope becomes live-by-derivation once `run.ropes` moves; offer site :131-132 ALREADY passes `{ ropes: ropeCount, charged: 0 }` — no edit here (3.3 replaces the literal).
- `js/player.js` — `jumpVelocity` 350+min(h,0.5)×500 (FR17 formula); `jump(player, hold)` 2-arg; `updatePlayer` gravity `1800 / floatMul` fed from `tickRun:70`. Launch happens ONLY at `js/shell.js:354` (press release) and `leadIn` — `tickRun`'s `press` never fires a jump (D-N11, `js/game.js:81-84`).
- `js/shell.js` — pick path `run = applyCard(run, picked)` + `rearmCalloutGate(resumeRun(run))` :387-390; jump call :354; role class from `card.color` :451 (`.role-mint` exists, `css/style.css:39` — no CSS change).
- **Frozen legs that BREAK today under this story's change** (the re-contract ledger, Task 5): `upgrades.test.js:6` (exact freshEffects literal), `catalogue.test.js:31-33` (exact 4-key output literal), `rulecards.test.js:42-49` (inert-apply × 4 new ids), `pickflow.test.js:221-224` (flaky-on-extrarope / blind-on-highjump), `balance.test.js:202` (peakFactor missing launchMul²), `balance.test.js:322-344` (behavior-detected exemption would still classify extrarope correctly but cannot catch an inert effects-shape card — deferred-work:85 mandates the tightening).
- **Frozen legs verified GREEN with zero changes**: `headless-sim.test.js:126-136` (extrarope^4 via `applyCard` → ropes 5, runs clean; 5 windows/rev, period unchanged) and `:143-154` (extrarope.apply(freshEffects())^4 → finite ropeMul 1 — shape-safety leg, DO NOT TOUCH); `multirope.test.js:46` (lead-in vy = `jumpVelocity(0.1)` — Task 3 keeps it); `v1parity.test.js:704` (same, fresh effects → ×1); `pickflow.test.js:238` (`vy <= 400` — lead-in never multiplied, Task 3 keeps it); `pickflow.test.js:266-268` (per-index confirms use default offers — effects-shape picks unaffected by the dispatch); `catalogue.test.js:66-91` (availability/pool legs never call `apply`); `rulecards.test.js:84-105` (EFFECT_PINS loop iterates `Object.keys(freshEffects())` — launchMul absent from pins ⇒ expects 1.0, self-adapts); `rulecards.test.js:107-118` (rule-2: launchMul ∉ ropeMul×scoreMul product); `winloss.test.js:190`, `multirope.test.js:37` (deep-equal `createRun().effects` vs `freshEffects()` — both gain the key); `feelcap.test.js:674-675`, `boundary.test.js` (upgrades.js gains NO imports — the marker is data; game.js gains nothing); `hygiene.test.js` (3.0 fences, unrelated paths).
- Baseline: **308 tests green, ~8.5 s** (3.0 review head, commit 7759ddf).

### Design decisions (do not relitigate mid-implementation; Dev Agent Record must echo)

- **D-a — dispatch by plain-data marker `shape: 'run'`**, checked in the `patchedRun` helper. ADR-2's two shapes must coexist (epics.md:531); arity sniffing fails (`(run) =>` and `(s) =>` are both arity 1; a 2-arg form breaks the frozen 1-arg `card.apply(freshEffects())` safety legs); a patch-DSL was explicitly rejected (ADR-2). `stateCap` is the precedent: record fields are plain data, tests derive from them (NFR5). Only `extrarope` gets the marker in this story; `reinforce`/`doublejump` records gain theirs in 3.3/3.4.
- **D-b — clamp lives in the dispatch arm** (`patchedRun`), not in the card's closure: `clampRopes` lives in `game.js` and `upgrades.js` must never import `game.js` (cycle; boundary fence; the existing cross-check leg `rulecards.test.js:52-53` is the drift guard). AC2's clamped-write lands here.
- **D-c — lead-in stays 400** (Task 3). The Heels multiplier is a property of the PLAYER's timed jump, not the canonical grace hop.
- **D-d — `jumpVelocity` signature frozen**; the multiplier lands in `jump(..., launchMul = 1)`. v1parity derives every expectation from `jumpVelocity(h)` bare — keeping the physics formula untouched keeps the proof suite honest and unedited.
- **D-e — collision model stays state-less** for this story (Task 5 harness note); runBot honesty comes free via `tickRun`'s draw. Redefining the collision baselines is a 6.1/6.3 balance call, not an Epic 3 side effect.

### Landmines (DO-NOT list)

1. Do NOT touch `tests/headless-sim.test.js` — its :144-148 shape-safety legs and :126-136 cap legs pass unmodified BY DESIGN (AC4). If they go red, your extrarope `apply` is not a plain record spread — fix the card, not the leg.
2. Do NOT pass `state` or new args BEFORE `rng` anywhere in the draw path, and do NOT change `pickOffers`/`isAvailable` at all — 3.1's plumbing is complete; the rng position is frozen by every determinism leg.
3. Do NOT import `game.js` from `upgrades.js`, add a 6th role/color, add CSS, or add a sixth effect key — `launchMul` is the only new field and mint already ships (`css/style.css:39`).
4. Do NOT multiply the lead-in hop (`leadIn`/`resumeRun`) — three frozen legs pin it (Task 3).
5. Do NOT touch `js/render3d.js`, `index.html`, `package.json`, `js/rope.js`, `js/areas.js`. Extra ropes stay 3D-invisible until 5.3; that is owned elsewhere.
6. `highjump.apply` reads `s.launchMul` bare — any rig-local effects record MUST be `{ ...freshEffects(), ... }`, never a hand-typed 4-key literal (the one shipped literal is `pickflow.test.js:146`, re-contracted in Task 5).
7. Spare Rope dominance is EXPECTED (climb ≈ +1 rope's worth; `deferred-work.md:69`, research §5.1) — counterweight is 6.1's summit band. If a balance leg starts flagging `extrarope` as reduceClimb/dominated, your data drifted, not the rule.
8. `applyUpgrade` must keep its name/export — `tests/feelcap.test.js:675` greps it in the D-N09 fence.
9. No `console.*` in `js/` pure modules; no mutation anywhere; spreads only (AGENTS.md conventions).

### Previous story intelligence

- **Story 3.1 (done, review-hardened):** shipped the 12-card catalogue with inert applies and the `stateCap` data — this story converts two of them into real effects; the review's three deferrals name this story twice: `deferred-work.md:84` (harness) and `:85` (AXIS tightening — a MUST in the same change as the fifth key). Its review also verified `charged: 0` stays honest until 3.3 (`:83`). Re-contract evidence pattern: `git diff <baseline> -- tests/` clean-tree claim in the Debug Log; value-exact re-contract rule (no loosened regexes/values — every Task 5 edit keeps or TIGHTENS the assertion).
- **Story 3.0 (done):** the gate is `./run_tests.sh` (TAP parse + N/M line + CI oracle); hygiene fence legs run in the same suite — a red `run_tests.sh` self-check now fails the suite, so never leave the script edited.
- **Story 2.5:** harness API (`runBot`/`cardRuleReport`/`collisionReport`/`summitRate`), AXIS = first effect field the apply writes (Decided 3 — Task 5 tightens its guard per Decided-3's own intent), `cappedOwned()` offer suppression, `mulberry32(seed + i)` seeded draws.
- **Story 2.2:** apex rig idiom (`simApex`/`fly`, frozen at `tests/ascent.test.js:172-190`) — mirror it in the new file, never import the frozen file.
- **Epic 1 retro:** every leg gets a mutation kill-check; contract tests land in the same change; File List role-tags convention.

### Git intelligence (last 5 commits @ baseline 7759ddf)

- `7759ddf`/`ccd4c46` (Story 3.0): touched docs/CI/tests-hygiene — zero overlap with this story's `js/` files; confirms `run_tests.sh` is the oracle and GitHub Actions runs the same gate on push.
- `23756d0` (Story 3.1): `js/upgrades.js` record-block style (inline comment per rule-changer), `stateCap` idiom, three-site authorized fence edits with story-named comments — replicate that commenting style in all Task 5 edits.
- `2aac6df` (planning write-back): epics 3.x amendments — the story text above already carries them.

### Latest tech information

- Zero dependencies; the stack pins are frozen by NFR6 — `three@0.186.1` (importmap, render-only, NOT touched by this story), Node ≥ 18 built-in `node:test`/`node:assert/strict`. No library research applies: every API this story uses is project-local ES2020 (object spread, `**`, optional coalescing — all already in the tree).

### Project Context Rules

- No `project-context.md` exists in this repo; the authoritative conventions are `AGENTS.md` + `architecture.md`: named exports; `create*`/`update*` factories; POJOs, no classes; `*Mul` suffix (`launchMul` complies); 2-space indent; sparse comments for non-obvious fallbacks only; frozen-test discipline with the sanctioned re-contract exception (interim fences re-authorized IN THIS STORY TEXT — the Task 5 list IS the authorization; the diff must show no other existing-file changes); every new factory contract gets its Node-side contract test in the same change; one shared handler per cross-cutting concern (`patchedRun` is that rule applied to pick resolution).

### Project Structure Notes

- All changes land in the existing `js/` tree in place; the one new test file is `tests/simpleeffects.test.js` (mirrors story scope; 3.3/3.4 get their own files — frozen discipline).
- `index.html`/`package.json` untouched — the near-frozen rule holds trivially.

### References

- `_bmad-output/planning-artifacts/epics.md` — :511-533 (this story), :39-45 (FR10-14), :52-63 (FR17/FR25 protected), :86-103 (additional requirements)
- `_bmad-output/game-architecture.md` — :209, :236-239 (card contract), :292-294 (ADR-2), :595-603 (state patterns — the whole-record apply example; note :221-230's ordered-rope-list schema was NOT the shipped shape)
- `_bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd.md` — :176-185 (rope-HP economy), :227-237 (card table), :239-257 (catalogue rules)
- `_bmad-output/planning-artifacts/research-scarlet-skips-2026-11-06.md` — §4 (rope-count measurements table), §5 (implementation facts 1-7: apply path, stale AC wording, frozen-leg landmine, roles frozen, clamped write, snap-drop note, 3D invisibility)
- `_bmad-output/implementation-artifacts/3-1-four-new-cards-in-the-catalogue.md` — pinned records :77-92, forward interlocks :136-140, landmines :119-127
- `_bmad-output/implementation-artifacts/deferred-work.md` — :70, :83, :84, :85 (this story's ledger), :69 (Epic 6's)
- `_bmad-output/planning-artifacts/ux-designs/ux-jumprope-web-2026-10-28/DESIGN.md` — :57 (mint for rope cards), :87 (owned-line state glyphs → FR14/3.5)

## Dev Agent Record

### Agent Model Used

lane-qwen38-ultra/qwen (omp, 2026-11-07)

### Debug Log References

- Required entries: red-green evidence per Task 6; `git diff 7759ddf -- tests/` fence proof (ONLY Task 5 sites + new file + harness jumper); `cardRuleReport` output (Task 7); mutation-check matrix; suite wall time.
- RED (pre-implementation, `node --test tests/simpleeffects.test.js`): legs 1–8 fail for the right reasons (`launchMul` undefined, `run.ropes` never grows, clamp inert, apex ratios flat); legs 9–10 are guard legs — green-by-design (they pin what must NOT change; falsified by mutations M7–M9).
- GREEN after Tasks 1–4: 10/10 legs pass; full gate 318/318 @ 8.47 s wall (baseline 308/308 @ ~8.5 s — +10 legs, zero wall-time growth; NFR: <10 s holds).
- Mutation matrix (throwaway harness; exact-byte restore in finally; sha256 integrity CLEAN): M1 highjump 1.15 → kills L1 · M2 dispatch marker blind → L2,L3,L4,L5,L6 · M3 clamp dropped → L4 · M4 rope count not live in tick → L5 · M5 stateCap ignored → L6 · M6 launchMul dropped at jump → L7,L8 · M7 coyote time `grounded = y < 4` → L9 · M8 lead-in multiplied → L9 · M9 resume keeps choose → L10. First-round notes: M7 at band `y < 0.5` SURVIVED (landing grid step ≈ 3.3 u/tick skips the band — leg fixed to ride the lead-in arc so small-positive-y ticks exist, band widened to a plausible coyote height); M9 pattern needed the `leadIn()` wrapper. All 10 legs falsifiable.
- Fence proof `git diff 7759ddf -- tests/` (U0): ONLY balance.test.js@202 + @322-344 · catalogue.test.js@19 + @31-33 · pickflow.test.js@146 + @221-224 · rulecards.test.js@42-45 · upgrades.test.js@6 · support/balance-harness.js@93 (jumper) + @292 (D-e comment); untracked NEW `tests/simpleeffects.test.js`. Every other file under `tests/` byte-identical (clean-tree proof: the diff above is exhaustive against baseline 7759ddf).
- `cardRuleReport({ ticks: 1200 })` (throwaway): `reduceClimb: []` holds; `dominated: [slowrope≺windup, feather≺float, tally≺multi, widebrim≺window]` — unchanged from 3.1, no new dominance; highjump `peakDeltaPick +0.2128 / peakDeltaCap +0.7830` (analytic 0.21/0.7716, inside the 0.05 velocity²-band — the velocity² wiring is proven by the band, not a table); extrarope deltas all 0.0000 — effects-only report, EXPECTED blind spot per :69.
- Balance honesty check (Task 7 item 2): with the harness jumper change, every NON-highjump band stayed green (baseline honesty intact); highjump bands green via velocity² — no wiring smell.
- Static smoke: `python3 -m http.server` — `index.html` 200, `js/shell.js` 200, `js/upgrades.js` serves with `launchMul` ×3. No Chromium for linux/arm64 here (3.1 Debug-Log precedent): the shell seam is covered by the frozen bootShell harness legs (pickflow green); a live-browser pass is Epic 5's, and extra ropes stay 3D-invisible until 5.3 (`deferred-work.md:71`).

### Completion Notes List
- `freshEffects()` gains `launchMul: 1`; `highjump.apply` multiplies it ×1.1/copy; `jump(player, hold, launchMul = 1)` lands the multiplier at launch only — `jumpVelocity`/`updatePlayer` byte-identical (FR17, D-d).
- ADR-2 paid via the module-local `patchedRun` (one shared handler — house rule); run-shaped arm writes the `clampRopes`ed count, so AC2's over-cap records heal as data (D-b). `applyUpgrade`/`applyCard` both route through it; the D-N09 name fence (`feelcap.test.js:675`) holds.
- Design decisions D-a…D-e executed as written. One interpretation recorded (do not relitigate): the AXIS leg's "every other card must write ≥1 effect field" is enforced for cards whose AXIS names a live effect field; sentinel-axis cards without a marker (the unlanded 3.3/3.4 records, inert per the rulecards narrowing and D-a's "only extrarope gets the marker") stay exempt — the literal every-card reading contradicts D-a and would fail the suite; the inert-effects-shape hole deferred-work :85 named is closed (mutation M5 kills).
- Lead-in stays 400 (Task 3/D-c): `leadIn`/`resumeRun` untouched; frozen `v1parity:704`, `multirope:46`, `pickflow:238` green unedited; pinned by leg 9.
- Leg-6 deviation (spec-bug found during dev): the literal contrast — "same-seed state-less draw includes extrarope" — is impossible at `owned.extrarope = 4` because the CAP alone excludes it there. The live half (4 real picks → ropes 5 → offer excludes it) ships as written; the contrast pair moves to the pure seam at `owned = {extrarope: 3}`, which isolates the stateCap arm (falsified by mutation M5).
- extrarope reads mint (Task 4) — `.role-mint` already ships, zero CSS change; `reinforce`'s mint stays 3.3's.
- deferred-work ledger updated: :70 RESOLVED, :83 PARTIAL, :84 NARROWED, :85 CONSUMED, :69 ownership restated.
- No new dependencies; `render3d.js`, `audio.js`, `rope.js`, `areas.js`, `index.html`, `package.json` untouched; no `console.*`, no mutation, spreads only.

### File List

- `js/upgrades.js` — modified (extrarope shape/apply/color, highjump apply, freshEffects 5th key)
- `js/game.js` — modified (`patchedRun` helper; `applyUpgrade`/`applyCard` dispatch + clamp)
- `js/player.js` — modified (`jump` optional `launchMul` arg)
- `js/shell.js` — modified (`:354` passes `run.effects.launchMul ?? 1`)
- `tests/simpleeffects.test.js` — new
- `tests/upgrades.test.js` — authorized re-contract at :6 ONLY
- `tests/catalogue.test.js` — authorized re-contract at :19,31-33 ONLY
- `tests/rulecards.test.js` — authorized re-contract at :42-49 ONLY
- `tests/pickflow.test.js` — authorized re-contract at :146,221-224 ONLY
- `tests/balance.test.js` — authorized re-contract at :202 and :322-344 ONLY
- `tests/support/balance-harness.js` — jumper launchMul + collision-model comment
- `_bmad-output/implementation-artifacts/deferred-work.md` — ledger updates (Task 7)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — modified (story status)

## Change Log

- 2026-11-07 — Story 3.2 created by ultimate context engine analysis: artifacts reconciled (epics 3.2 text was stale per research §5.2 — `applyUpgrade` naming corrected to the shipped `applyCard`+`resumeRun` path; the "pure endofunction" clause scoped to the multiplier subset per epics.md:531). Full frozen-leg blast radius mapped (6 re-contract sites, 12 verified-green files); ADR-2 dispatch decided (`shape: 'run'` marker, clamp in game.js dispatch arm); lead-in non-amplification decision pinned; balance-harness + AXIS interlocks from the 3.1 review folded into tasks.
- 2026-11-07 — Story 3.2 implemented: ADR-2 whole-record pick path (`patchedRun` in game.js), fifth effect key `launchMul` (freshEffects/highjump/jump/shell), Spare Rope run-shaped apply with clamped write + mint read, harness jumper launchMul honesty, marker-driven AXIS tightening, 6 authorized fence re-contracts, new `tests/simpleeffects.test.js` (10 mutation-proven legs). Suite 318/318 @ 8.47 s.
