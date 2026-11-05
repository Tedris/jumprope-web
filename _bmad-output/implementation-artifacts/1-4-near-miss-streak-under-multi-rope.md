---
baseline_commit: b7b5fd1
---

# Story 1.4: Near-miss & streak under multi-rope

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player in a dense multi-rope build,
I want near-miss feedback that stays legible when several ropes pass per revolution,
so that the tension readout still means something instead of becoming noise.

## Acceptance Criteria

1. **Per-pass streak bookkeeping under N ≥ 2, unchanged v1 rules.** Given a run with N ≥ 2 ropes, when passes clear at crossing height under 1.5 × the clearance threshold, or are saved by the mercy buffer, then each such pass counts as a near-miss with streak counts advancing per pass and a comfortable clear resetting the streak to 0 (FR20). *This is already true in the tree:* the crossing loop (`js/game.js:78-98`) checks every rope window's cleared pass against `minHeight * (1 + NEAR_MARGIN)` (`NEAR_MARGIN = 0.5`, `js/game.js:17`; `minHeight = 18 / windowMul`, `:73`) and the mercy branch (`:114-122`) counts +1. This AC ships as **test pins, not new code** — legs per Task 1.

2. **One callout per revolution.** Given multiple near-miss passes occur within one revolution, when callouts render, the display shows **at most one** `CLOSE!` callout per revolution — while `run.streak` keeps advancing exactly one per near-miss pass (never coalesced, never skipped). Juice (hitstop/shake/particles) and the nearMiss audio voice stay **per-event, unchanged** — this story gates only the callout flash (`js/shell.js:438-443`). The ×N-escalation *cadence* balance stays Epic 6 territory (`deferred-work.md:8`); do not retune constants.

3. **Streak policy under strip trips — decision owned here.** A strip trip (a failed crossing at 2+ ropes, `js/game.js:123-140`) resets `streak` to 0. This is the policy `js/game.js:132-133` explicitly delegates ("Story 1.4 owns streak policy under multi-rope"). Rationale in The Design §Policy. Pin with a new sim leg (Task 1d).

4. **1-rope behavior identical to the v1 baseline (AC regression-pinned).** Given a run at 1 rope, near-miss/streak/callout behavior is identical to v1: streak trajectory `0→+1 per tight-or-forgiven pass, 0 on comfortable clear, 0 on death` (the rules `tests/feel.test.js:130-160` already proves at ropes-field-absent); the `CLOSE!` flash still fires on **every** single-rope near-miss (the rev gate can never eat one — see The Design §Coalescing). Pinned by a **new** test file; all existing `tests/*.test.js` stay **byte-identical** (NFR5 — no interim legs need re-contracting here; none of them pin strip-streak or multi-rev callouts).

## The Design (decided — do not re-litigate)

**Coalescing lives in the shell, as a revolution gate on the flash.** The event system is "events as return values; the sim is truth" (`game-architecture.md#Event System`): audio and juice consume `nearMiss` per event and must keep doing so (Epic 5 owns the multi-rope audio mix; Epic 6 owns cadence balance). The *display* is the shell's own channel already — the `CLOSE! ×N` callout rides the card-name flash (D-N04, `js/shell.js:438-443`, drawn by `updateHud()`'s flash branch `js/shell.js:371-372`). So:

- **Count wraps of the one canonical clock.** The shell already snapshots `prevPhase` every sim step (`js/shell.js:81, :419, :446`); `updateRope` wraps as `phase >= 1 → (phase - 1) + inc` (`js/rope.js:5-9`), so *wrap ⟺ `rope.phase < prevPhase`* for every legal increment. Add two closure vars — `let revCount = 0; let calloutRev = -1;` — and in the drain, right after `({ run, rope, player } = out)` (`js/shell.js:422`): `if (rope.phase < prevPhase) revCount++;`. No new timer, no wall-clock — NFR8 holds (this counts the existing clock, like `iFrames` counts crossings).
- **Gate the flash write, nothing else.** The `if (e === 'nearMiss')` branch becomes `if (e === 'nearMiss' && calloutRev !== revCount) { calloutRev = revCount; flashName = ...; flashUntil = now + FLASH_MS; }`. Everything else in the fan-out loop (`stopUntil`, `juiceSig`, audio at `:424`) stays exactly as-is, per-event.
- **Why a wrap-gate can never break 1-rope parity:** at N = 1 there is exactly one feet window per revolution (`js/rope.js` k=0), hence at most one `nearMiss` event between wraps — `calloutRev !== revCount` is always true on it. Every v1 callout still flashes. (Frozen proof this must hold: `tests/juice.test.js:205-259` and `tests/feelcap.test.js:468-501` both script one single-rope near-miss and demand the flash — a first-ever callout always passes the gate since `calloutRev` starts at `-1`.)
- **Harmless edges:** start/resume compose `leadIn()`'s phase 0.33 (`js/game.js:31-38`), which can look like a wrap — the only effect is *re-arming* the gate (one more allowed callout, never one fewer). A near-miss crossing lands near phase ≈ 0.45 − k/N mod 1; a wrap lands at 1.0→0.0 — the same STEP never does both (increment ≤ ~0.0064 ≪ window width), so event-vs-wrap ordering inside the tick is a non-issue. Restarts keep counting; the counter is equality-compared, its absolute value never matters.
- **Known cosmetic:** when streak increments later in the same revolution, the shown `CLOSE! ×N` number reflects the streak *at first callout of that revolution* (stale by < 1 rev). AC2 requires the *count* exact per pass — `run.streak` is — not the mid-flash number refresh. Do not re-trigger the flash to update the number.

**Policy: a strip trip zeroes the streak** (AC3, the one sim behavior change). "Streak counts **consecutive** close calls" (GDD:188-193); a trip breaks the chain. Death already zeroes (`js/game.js:146`); i-frame blank passes touch nothing (`tests/tripresolution.test.js:43-71` pins that leg — it stays byte-identical and keeps passing: the gate is elsewhere). Implementation: add `streak = 0;` inside the strip branch (`js/game.js:123-140`, next to `events.push('ropeLost')`) and rewrite the comment at `:132-133` ("Streak is deliberately untouched… Story 1.4 owns streak policy") to state the decided policy. No frozen leg asserts streak across a strip (`tripresolution.test.js:25-38` checks skips/score/events only; the `:59` streak pin is *during the blank*, where streak genuinely stays). Rejected alternative: leaving streak untouched — it would show `CLOSE! ×9` seconds after losing a rope, reading as a lie.

## Tasks / Subtasks

- [x] Task 1: Sim legs — `tests/nearmiss.test.js` pure-sim section (AC: 1, 3, 4). Direct `node --test` imports of `game.js`/`rope.js`/`player.js` (no harness needed; the rig idiom is `tests/multirope.test.js:11-16` — period 1, dt 1/60, injected airborne/grounded player; band expectations **derive from `NEAR_MARGIN`/`MIN_ROPES`/`MAX_ROPES`**, never a hardcoded table — house rule).
  - [x] a. Multi-rope per-pass streak: N = 3 (loop 2..MAX where meaningful), player injected inside the near band (`y` just under `minHeight * (1 + NEAR_MARGIN)`) → every crossing emits `['skip','nearMiss']` and streak advances 1, 2, 3… across one revolution. Note: one rising edge per tick is pinned by `tests/multirope.test.js:142-154` (disjoint windows), so near-misses arrive one-per-tick, not batched.
  - [x] b. Decay under multi-rope: N = 2, one tight pass then one comfortable clear (y ≥ band) → streak 1 then 0, both scored.
  - [x] c. Mercy save at N ≥ 2 counts exactly one near-miss (extends `multirope.test.js:156-174`'s event pin to the streak number).
  - [x] d. Strip trip zeroes: build a record with `streak: 2, ropes: 2`, failing crossing, no buffer → `ropes: 1`, `ropeLost` event, **`streak: 0`** (this leg is RED until the game.js change lands — that's the red-green pair).
  - [x] e. N=1 parity (AC4, new file): scripted tight/clean/forgiven trajectory at explicit `ropes: 1` matches the v1 rules (`feel.test.js:110-128` `scriptedPass` technique is the reference; don't edit that file).
- [x] Task 2: Shell — the revolution gate (AC: 2). `js/shell.js` only; three touched spots, no new DOM/CSS/index.html change (the callout already rides the D-N04 prompt channel).
  - [x] a. Closure state beside `flashUntil`/`flashName` (`:92-93`): `revCount`, `calloutRev` — with a one-line comment (wrap ⟺ `phase < prevPhase`, per `rope.js:8`). Nothing to reset at `startRun` sites: the counter is relative by construction (`resetPips` is the pattern *if* a reset were needed — it isn't).
  - [x] b. Wrap detection in the drain after `({ run, rope, player } = out)` (`:422`): `if (rope.phase < prevPhase) revCount++;`.
  - [x] c. Gate the `nearMiss` flash branch (`:438-443`) per The Design — the `×N` line itself stays verbatim: `flashName = 'CLOSE! \u00d7' + (run.streak ?? 1);`. Do NOT touch `JUICE_TIERS`, the audio fan-out (`:424`), or `stopUntil`/`juiceSig` lines.
- [x] Task 3: Shell coalescing legs — same `tests/nearmiss.test.js`, harness section (AC: 2, 4). Boot pattern: copy `bootShell` from `tests/juice.test.js:30-105` (render3d stub, file: URLs); **delta:** wrap `from './game.js'` into a data: URL wrapper that delegates to the REAL `tickRun` and, on scripted ticks, appends `'nearMiss'` to `out.events` (and mirrors `streak + 1` in `out.run`) — phase advance stays real so wraps are real. Same no-relative-specifier trick as `tests/ropehud.test.js` keeps `boundary.test.js` green; keep the `tickRun(run, rope, player, dt, rng, press)` arity (`tests/startrun.test.js` freezes it).
  - [x] a. Coalesced: inject `nearMiss` at **two scripted crossings per revolution, spaced > 2 × FLASH_MS of real time apart** (e.g., sim steps whose phase ≈ 0.45 and ≈ 0.90 — mirrors two rope windows inside one revolution), for ≥ 2 revolutions → the HUD prompt shows exactly **one `CLOSE!` episode per revolution** (gated), not one per injection (ungated = 2 per rev). Pump frames, sample `hud-prompt.textContent` per frame, count false→true transitions of `/CLOSE!/`. The spacing is load-bearing: two injections within FLASH_MS would keep the ungated flash continuously re-armed and read as ONE episode — the discriminator only works when each ungated near-miss could time out and re-flash inside the same revolution (window pair ≈ 0.45 phase ≈ 0.58 s apart at period 1.3 ≫ FLASH_MS 150 ms).
  - [x] b. 1-rope gate-never-eats: single-rope script, one nearMiss per revolution (one per window per rev) → episode on *every* rev, first-ever fires immediately (`calloutRev = -1` boot state).
  - [x] c. Count-exact belt: during leg (a), the final `run.streak` in the last view equals the number of scripted near-miss passes (display coalesced, sim exact). — review patch: replaced by a flash-text `CLOSE! ×N` assertion (the belt was a wrapper tautology).
- [x] Task 4: Sim policy landing (AC: 3). `js/game.js`: `streak = 0;` in the strip branch + honest comment rewrite at `:132-133` (state: "a strip breaks the consecutive chain — zeroed here, decided by Story 1.4"; keep the "death zeroes it / blanks touch nothing" facts). Red from Task 1d first, then green.
- [x] Task 5: Confirmation (all ACs)
  - [x] `git diff --exit-code tests/` shows ONLY the new `tests/nearmiss.test.js` — every existing file byte-identical (if any goes red, the implementation is wrong; suspects in order: juice/audio got accidentally gated, the rev check landed inside the `if (run.status === 'running')` skip-wrong place, the strip `streak = 0` landed in the death branch).
  - [x] `node --test tests/` fully green < 10 s (last full-suite baseline: 169 legs).
  - [x] Manual browser smoke: temp-edit `createRun` `ropes: 1 → 3`, jump rhythmically with a few late presses, watch CLOSE! appear ≤ once per revolution while the game stays silent on `git status js/` after reverting. (No committed sim change — same revert discipline as 1.3's Task 5.) — superseded by a route-intercept smoke (see Debug Log): stronger proof, zero js/ edits.

### Review Findings

- [x] [Review][Decision] AC2 shell legs coalesce synthetic single-rope injections; a real multi-rope crossing never reaches the shell gate — the harness forces `player y: 40` (a comfortable clear — at `ropes: 1` the real crossing engine can never emit `nearMiss`; the "two crossings/rev" at phase 0.45/0.9 are event injections at non-crossings, `tests/nearmiss.test.js:246,249-253`). Task 3 decided this approach and the sim-side streak truth is pinned by the pure-sim legs, but the shipped `ropes ≥ 2` nearMiss→gate path has zero shell-level coverage. Options: (a) keep the spec-decided synthetic approach as-is; (b) strengthen the harness — force `run.ropes = 2` + in-band player so REAL crossings drive the gate; (c) record as a known verification gap for the Epic 1 retrospective. **RESOLVED 2026-11-04 (b):** real 2-rope crossings leg added (`ropes: 2` + near-band player, mirror bypassed).
- [x] [Review][Patch] Pause/card-pick resume never re-arms the callout gate — at N≥2 it eats the post-resume callout [js/shell.js:424-428] — `leadIn`'s phase snap happens in the keydown handler (`:203`/`:330`), and `prevPhase` is re-assigned to the already-snapped phase at `:424` before the wrap compare, so the snap never counts as a wrap. The Design's "harmless edges" claim ("the snap can look like a wrap — effect is re-arming, never one fewer") is false in the shipped code: if a callout already fired in the interrupted revolution, `calloutRev === revCount` survives resume and near-misses landing before the next wrap (phases `(0.45 − k/N) mod 1`) are silently gated. **FIXED 2026-11-04:** one shared `rearmCalloutGate` re-arms at all four lead-in entries (start/restart/resume/pick); red-green KeyP pause→resume leg added.
- [x] [Review][Patch] Vacuous streak belt in the coalescing leg [tests/nearmiss.test.js:353-354] — the wrapper force-seeds `streak: s.streak` every tick (`:245`) and overwrites `run.streak` on return (`:255`) while `s.streak`/`s.count` increment in the same branch (`:253`), so `v.run.streak === script.count` can never fail regardless of sim/shell code. Delete the tautology (the real claim is pinned by the AC1 sim legs) and replace it with an assertion on the flash TEXT (`CLOSE! ×<n>`, `shell.js:450`) captured at an episode edge — the ×N rendering is currently asserted nowhere in this file (only `/CLOSE!/` matches at `:339/:350`-region; the ×1 case lives in `juice.test.js:248`). **FIXED 2026-11-04:** tautology deleted; the leg now asserts the flash TEXT (sampler `epTexts`) — the ×N rendering is now pinned.
- [x] [Review][Patch] Harness wrapper's phase math ignores `effects.ropeMul` [tests/nearmiss.test.js:241] — wrapper predicts crossings with `inc = dt / rope.period` while real `tickRun` advances `updateRope(rope, dt * effects.ropeMul)` (`js/game.js:55`); latent false-green for any future leg owning a ropeMul card. One-liner: `dt * (run.effects?.ropeMul ?? 1) / rope.period`. **FIXED 2026-11-04:** wrapper inc scales by `run.effects.ropeMul ?? 1`.
- [x] [Review][Patch] Boot hygiene: `restore()` is armed only after a successful import and `console.error` is stubbed across the dynamic import [tests/nearmiss.test.js:222-267] — if the rewritten `shell.js` ever fails to evaluate, the global monkey-patches leak into every later leg in the file and diagnostics are silenced. Wrap the boot in try/catch that restores, or arm `restore` before the import. **FIXED 2026-11-04:** `restore` defined before the import; a failed boot restores globals and rethrows.
- [x] [Review][Patch] Stale red-green comment [tests/nearmiss.test.js:95] — "red until Task 4 lands" while Task 4 ships in this same diff. **FIXED 2026-11-04.**
- [x] [Review][Patch] Future-dated bookkeeping [sprint-status.yaml:38, Change Log] — `last_updated: 2026-11-05` and the Change Log entry are one day ahead of the actual work date (2026-11-04; the story's own Dev Notes say "verified 2026-11-04"). Align to 2026-11-04. **FIXED 2026-11-04.**
- [x] [Review][Patch] Story records: File List omits `sprint-status.yaml` (in the diff) [this file :151-155]; "19 files, 169 legs" undercounts — `tests/` held 20 pre-existing files (:79, :141). **FIXED 2026-11-04.**
- [x] [Review][Defer] Pure-sim rig duplicates physics constants, band guard self-referential [tests/nearmiss.test.js:23-33] — `GRAVITY = 1800` and `MIN_HEIGHT = 18` are inline literals (not exported by `game.js`/`player.js`), and the `landY` guard reuses the same duplicated `FALL_PER_TICK` that positions the injection, so a future gravity/threshold drift could misplace the band while guards still pass. Impact small (drift must exceed half the band); fix needs new test-facing exports. — deferred, pre-existing pattern

### Dev Notes First Read (the three things that bite)

1. **Gate the flash ONLY.** `nearMiss` has three consumers in the shell loop (juice `:432-437`, audio `:424`, callout `:438-443`) and AC2 is about the callout. Gating the audio fan-out or `stopUntil` breaks `tests/juice.test.js` / `tests/feelcap.test.js` legs (the 40 ms freeze timeline is pinned frame-by-frame at `feelcap.test.js:477-485`).
2. **The wrap test belongs in the drain, not `updateHud()`.** `frame()` can drain multiple sim steps per rAF frame; `prevPhase`/`rope.phase` are per-step values (`js/shell.js:419`). A frame-level check would miss wraps that happen mid-drain and (worse) could double-count.
3. **The strip-branch `streak = 0` must NOT touch the blank legs.** During i-frames the loop `continue`s before any streak write (`js/game.js:80-86`) — keep it that way; `tests/tripresolution.test.js:59` proves blanks stay inert. Put the zero inside the `else if (ropeCount > 1)` branch only.

## Dev Notes

### Where everything lives (current state, verified 2026-11-04 against b7b5fd1)

| File | State today | This story |
|------|-------------|------------|
| `js/game.js` | Crossing loop `:78-150`: near-miss per cleared pass `:93-98`, mercy `:114-122`, strip `:123-140` (streak untouched, comment delegates to 1.4), death zeroes `:146`; `NEAR_MARGIN = 0.5` `:17` | UPDATE: `streak = 0;` in the strip branch + comment rewrite `:132-133` |
| `js/shell.js` | `FLASH_MS = 150` `:9`; `prevPhase` `:81/:419/:446`; drain `:409-449`; event fan-out `:423-444`; nearMiss flash branch `:438-443`; updateHud flash draw `:371-372` | UPDATE: `revCount`/`calloutRev` closure state, wrap check after `:422`, gate at `:438` |
| `js/rope.js` | `atFeetOffset` k/N windows `:16-19`; wrap arithmetic `:5-9` (⟹ wrap ⟺ phase decreases) | UNTOUCHED |
| `js/player.js`, `js/upgrades.js`, `js/interpolate.js` | v1/1.1 state | UNTOUCHED |
| `js/render3d.js`, `js/audio.js` | v1 state | DO NOT TOUCH — audio mix under multi-rope is Epic 5 (FR28) |
| `index.html`, `css/style.css`, `package.json` | near-frozen / frozen | UNTOUCHED — zero new DOM; the callout reuses the existing prompt span |
| `tests/*.test.js` (all existing) | 20 files, 169 legs green | MUST stay byte-identical |

### Architectural decisions this story implements

- **Events are truth; display coalesces** (`game-architecture.md#Event System` + `#Time & Counting Rule`: "Passes count events; revolutions modulate pressure"). The revolution gate counts phase wraps — the canonical clock, not a second timer (NFR8). `game-architecture.md:371` ("Coalescing rules live in the doc — near-miss callouts: one per revolution") is discharged by this story's Design section.
- **Streak stays a pure sim field.** No display-side streak, no new run fields. `run.streak` remains the one truth (`js/game.js:63, :151`), read by both the callout (`shell.js:441`) and the harness legs.
- **Single handler rule (AGENTS.md):** the gate is one condition at the one existing callout site — no parallel flash path, no reset wiring at startRun sites (equality-compare makes resets unnecessary).

### Known frozen-test landmines (verified against the tree)

- `tests/juice.test.js:205-259` — single-rope CLOSE!×1 leg via scripted late press: must still flash + revert after FLASH_MS. Safe iff the gate only *suppresses repeats within a rev* — verify this leg stays green untouched.
- `tests/feelcap.test.js:457-501` — near-miss hitstop freeze pinned across nine frames, callout + voice together: keeps the per-event juice/audio path intact (bite #1).
- `tests/tripresolution.test.js:43-71` — `scriptBlank` asserts `o.run.streak === run.streak` and `events: []` during blanks: do not move streak writes into the i-frame branch.
- `tests/feel.test.js` — v1 near-miss/streak contracts (streak trajectory, `NEAR_MARGIN`, windowMul scaling): sim is behaviorally unchanged except the strip branch, so these stay green by non-interference; the 10-pass trajectory leg (`:130-147`) has no trips at N=1.
- `tests/startrun.test.js` — `tickRun` call-surface freeze: the Task 3 wrapper must keep full arity `(run, rope, player, dt, rng, press)`.
- `tests/boundary.test.js` — specifier walk from test files: new test uses file:/data: URLs only, imports stay within the pure sim graph.
- The six boot harnesses' 4-key `hud` maps (1.3 bite #1 precedent): this story adds **no** new `getElementById` — the prompt span already exists in every map, so no null-guard is needed.

### Scope boundaries (do not drift)

- **In scope:** strip-branch streak zero + comment (`js/game.js`); revolution gate + closure state (`js/shell.js`); `tests/nearmiss.test.js` (new, both harness and pure-sim legs).
- **Out of scope:** audio/juice coalescing or multi-rope mix (Epic 5, FR28); `NEAR_MARGIN`/band/cadence retunes (Epic 6 balance, `deferred-work.md:8`); the buffer-forgiven offer-check gap (`deferred-work.md:5`, left as decided in 1.2); `ropeLost` cue wiring (Story 5.2 owns it — do NOT add VOICES/JUICE_TIERS entries); any renderer/scene change; multi-rope *visual* legibility (5.3).

### Testing standards

- Node built-in runner, `node --test tests/`, Node ≥ 18, `node:test` + `node:assert/strict`; deterministic — seeded-rng machinery untouched (no new randomness).
- Red-green first (NFR5): the strip-zero leg (Task 1d) and the coalescing legs (Task 3a) must be observed failing for the right reason before Task 2/4 land; RED output goes in the Debug Log References (1.1–1.3 pattern).
- Expectations derive from records/constants (`MIN_ROPES`, `MAX_ROPES`, `NEAR_MARGIN`, `FLASH_MS` where importable), never hardcoded tables.
- Frozen-test discipline is STRICT: zero existing test edits. If an existing leg fails, fix the implementation — the landmine list above names the likeliest wrong-turns.

### Project Structure Notes

- New test `tests/nearmiss.test.js` — thematic like `multirope`/`tripresolution`/`ropehud`; one file holds both the pure-sim legs and the shell-harness legs (both target one mechanic; `tripresolution.test.js` is the precedent).
- Conventions: named exports, POJOs, 2-space indent, sparse comments (the wrap-equals-phase-decrease line and the strip-zero policy line each earn one), no `console.*` in pure modules, `'\u00d7'` escape style preserved at the flash line.

### Project Context Rules

- No `project-context.md` exists; `AGENTS.md` is the rule source: pure core / imperative shell (the rev-gate is shell-only, the policy zero is sim-only — each lands on its correct side of the `boundary.test.js` fence), near-frozen `index.html` + `package.json` (untouched here), frozen-test discipline, `node --test tests/` before committing, zero dependencies (none added).

### Web research note

- No external research required: no new libraries, APIs, or versions. `performance.now()`, DOM prompt text, and the phase clock are the shipped, pinned baseline (NFR11). Three.js untouched.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4] — ACs, FR20, NFR5 (`:263-281`, `:57`)
- [Source: _bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd.md#Near-miss & streak] — `:188-193` band, streak semantics, per-revolution coalescing
- [Source: _bmad-output/game-architecture.md#Event System / #Time & Counting Rule] — `:362-371`, `:241-247` events-as-returns, revolutions-modulate-pressure
- [Source: _bmad-output/implementation-artifacts/1-3-rope-count-on-the-hud.md#Dev Notes] — harness wrapper trick, frozen-harness landmines, review patches (commit b7b5fd1)
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — `:8` cadence→Epic 6, `:13/:18` ropeLost cue→5.2 (both OUT of this story)
- [Source: js/game.js:52-160] — the crossing loop this story pins + the one delegated policy line `:132-133`
- [Source: js/shell.js:401-457] — the drain + fan-out where the gate lands

## Dev Agent Record

### Agent Model Used

omp lane-qwen38-ultra/qwen (qwen38-ultra)

### Debug Log References

- **RED run** (`node --test tests/nearmiss.test.js`, pre-implementation): 16 legs — 11 pass / 5 fail. Strip-zero legs N=2..5: `2 !== 0` (strip branch left streak untouched); coalescing leg: `4 !== 2` episodes with the injections-delta pin at exactly 4 → discriminating for the right reason (ungated = 2 flashes/rev). The first RED additionally caught a rig bug in the decay leg (a `nearSeen` capture read the trailing `playerAt` arg, not what the second crossing judged) — capture removed; `crossings[1]`'s plain `['skip']` is the comfort proof. Re-run RED: exactly the 5 legitimate failures.
- **GREEN**: `tests/nearmiss.test.js` 16/16 (≈5.7 s wall — the two shell legs pump the real clock, per the juice.test callout-leg idiom). Full suite `node --test tests/`: 185/185 green, 5.7 s wall (< 10 s budget; 169 → 185 legs). `git diff --exit-code tests/` clean — all 20 existing test files byte-identical; no existing leg was re-contracted. Review patch later grew the file to 18 legs / 187 suite legs.
- **Live browser smoke**: real page + real shell/WebGL/audio loop, with `js/game.js` route-swapped at the network layer to the harness's tickRun wrapper — no js/ file touched, no server component. Result: 9 scripted near-misses (2/rev) → exactly 5 `CLOSE!` episodes at `×1/×3/×5/×7/×9`, gaps ≈ one revolution, final `streak == injections`, zero page errors; first-ever callout fired mid-revolution 0. (Two earlier attempts driving real jump physics failed to enter the near band — a driver limitation, not the gate; the route-intercept replaced them.)

### Completion Notes List

- Sim (AC3, the one behavior change): `streak = 0;` inside the `ropeCount > 1` strip branch only, next to `events.push('ropeLost')`; the delegated comment rewritten to the decided policy. Death-zero (`else` branch) and i-frame blank inertness untouched — `tripresolution.test.js` stayed green untouched.
- Shell (AC2): revolution gate — `revCount`/`calloutRev` closure state, wrap counted in the drain from the phase compare (`rope.phase < prevPhase`, the canonical clock, NFR8), gate applied to the `nearMiss` flash branch only. Audio fan-out, `JUICE_TIERS`, `stopUntil`/`juiceSig` untouched — `juice.test.js` and `feelcap.test.js` legs stayed green untouched.
- Pins (AC1/AC4): `tests/nearmiss.test.js` — per-pass streak N=2..5 with band membership derived from `NEAR_MARGIN`, decay under N=2, mercy-single-increment, strip-zero red-green pair, 1-rope `scriptedPass` parity incl. the death arm; shell legs: coalescing (2 injections → 1 episode/rev, flash-text `CLOSE! ×N` assertion), gate-never-eats (episodes == injections at 1 rope, first-ever before any wrap), pause→resume re-arm (red-green), real 2-rope crossings (REAL nearMiss events → 1 episode/rev, streak +2/rev).
- Known cosmetic kept per The Design: the `×N` number is the streak at the first callout of its revolution (live smoke: flashes ride ×1/×3/×5/×7/×9); the flash is not re-triggered to refresh it.

### File List

- `js/game.js` — modified (strip-branch `streak = 0` + comment rewrite)
- `js/shell.js` — modified (rev-gate closure state, drain wrap count, gated flash branch, shared `rearmCalloutGate` at the four lead-in entries)
- `tests/nearmiss.test.js` — new (18 legs: pure-sim + shell harness incl. pause-rearm and real 2-rope crossings)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story status + date bookkeeping

## Change Log

- 2026-11-04 — Story 1.4 implemented: strip trip zeroes the streak (sim policy, AC3); CLOSE! callout gated to ≤1 per revolution via the phase-clock wrap counter (shell, AC2); AC1/AC4 pinned by 16 new legs in `tests/nearmiss.test.js`; full suite 185/185 green, all pre-existing tests byte-identical, live browser smoke clean. Status → review.
- 2026-11-04 — Review patches: shared lead-in gate re-arm in shell (pause/pick no longer eats callouts at N≥2, red-green KeyP leg); harness strengthened (real 2-rope crossings leg, ×N flash-text pin replacing the vacuous streak belt, ropeMul-scaled wrapper inc, boot-hygiene restore); record dates/counts corrected. Suite 187/187 green. Status → done.
