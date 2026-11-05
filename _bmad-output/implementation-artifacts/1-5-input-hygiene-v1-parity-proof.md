---
baseline_commit: 967bf62
---

# Story 1.5: Input hygiene & v1 parity proof

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the project itself (and every future change),
I want the shipped v1 core feel proven unchanged by the rope-HP refactor,
so that the one non-negotiable — the jump-timing feel — stays proven with every new mechanic.

## Acceptance Criteria

1. **Shared handlers, proven at every reachable state.** Given any state reachable in a ropes-enabled run (running — including an active i-frame blank, choosing, paused), when focus loss, hidden tab, pointer-up, or pause occurs, input state is released through the single shared `releaseEverything()` handler and every resume path re-enters the canonical lead-in via `resumeRun()`/`startRun()` — the new states add no parallel implementations (FR22). *The tripped-recovery state is shell-invisible:* `run.iFrames` is read only inside `tickRun` (`js/game.js:69, :83-86`); no shell branch references it. Legs must PROVE that identity, not assume it (Task 2).
2. **`ropes: 1` behaves identically to the v1 contract.** Given a run with `ropes: 1`, deterministic seeded sim runs of jump physics, clearance checks, and mercy-buffer saves match v1: launch `350 + min(hold, 0.5 s) × 500` against gravity 1800 (`js/player.js:5-7, :13`), clearance threshold `18 / windowMul` u (`js/game.js:73`), `BUFFER_SEC = 0.10` s phase-clock-decaying buffer (`js/game.js:61-62`), no coyote time (`grounded` true exactly when `y === 0`, `js/player.js:17-27`) (FR17–FR19). `tests/multirope.test.js:194` already pins `ropes: 1 ≡ field-absent` for a scripted CROSSING sequence — this AC adds the JUMP-PHYSICS scripts (trajectories across varied holds) plus the analytic formula pins (Task 1).
3. **Rope count never touches the physics.** Given a rope-count change mid-run (trip strip today; future Spare Rope pick), a jump performed at any rope count produces identical physics and clearance judgment — difficulty changes come only from pass frequency and period multipliers (Task 1e).
4. **New test files pin all of the above at multiple rope counts; existing `tests/*.test.js` stay byte-identical (NFR5); reduced motion keeps damping cosmetics only, rope timing byte-identical (FR23 base contract).**

## The Design (decided — do not re-litigate)

**This is a proof story: expected delta = ONE new test file, zero production code.** The audit below already checked every path; the legs exist to make that audit durable. If a leg exposes a real leak, the fix lands in the SHARED handler (`releaseEverything`/`enterPause`/`resumeFromPause`) — never a per-state fork — and the Debug Log records what the leg caught.

**Handler → event → resume mapping (audited against 967bf62):**

| Trigger | Handler | Cleanup | Re-entry |
|---|---|---|---|
| canvas `pointercancel`, window `blur`, hidden-tab visibilitychange | `releaseEverything()` (`shell.js:169-183`) | mid-press → `holdFrom` (real hold preserved), arms `releaseIntent` running-only; `choose` cancels pick | — (steps via `consumeIntents`) |
| pointer-up / Space keyup | `release()` (`shell.js:153-156`) | normal release, arms `releaseIntent` | — |
| P/Esc, hidden+running | `enterPause()` (`shell.js:188-200`) | own clearing (`holdFrom`/`pressIntent`/`releaseIntent` = null/false, buffer zeroed via spread) — the v1 D-12 design: pause CLEARS, it does not fire | — |
| P/Esc while paused, visible+pausedByVis | `resumeFromPause()` (`shell.js:204-216`) | reentry lock, all intent vars cleared | `resumeRun()` @ `:208` |
| pick confirm (hold-fill) | `tickPick()` (`shell.js:326-344`) | cleared after | `resumeRun()` @ `:335` |
| press on idle / release on over | `consumeIntents()` (`shell.js:287, :317`) | `resetPips()` | `startRun()` — composes the SAME `leadIn()` (`game.js:40-42`) |

AC1's "pointer-up … released through the single shared `releaseEverything()`" reads as intent ("no per-state hygiene forks"): pointer-up is the NORMAL release channel (`release()`), blur/cancel/hide are the LOSS channel (`releaseEverything()`), pause clears. All three are cross-cutting singletons already (AGENTS.md rule); nothing in Stories 1.1–1.4 added a ropes-specific fork anywhere — grep-confirmed zero `iFrames` references in `shell.js`.

**Decision owned here — the lead-in snap grace (deferred-work.md:6, item (b)).** `leadIn()` snaps phase to `START_PHASE` 0.33 (`game.js:33-38`). At `ropes: 5` ONLY, rope k=1's window `(0.33 + 1/5) mod 1 = 0.53` is inside [0.45, 0.55] (`js/rope.js:16-19`), so the crossing engine's rising-edge test (`game.js:79`) drops that rope's first pass — no score, no trip, i-frames untouched (the `continue` at `:79` precedes the blank branch). **DECISION: pin as accepted lead-in grace, do NOT fix.** Rationale: v1 parity is untouched (N=1's window [0.45, 0.55] excludes 0.33); a fix needs either a first-tick flag (new state) or a phase offset (breaks the frozen `START_PHASE` start contract, `multirope.test.js:30`); the effect is safe-side grace, thematically the lead-in already is catch-up. Window counts derive from `atFeetOffset(START_PHASE, k, N)` — never a hardcoded "only N=5" table. Pin with legs (Task 1f).

**Reduced-motion parity (AC4 tail).** `reducedMotion` is a view-payload cosmetic flag only (`shell.js:125-130, :466`); the sim never receives it. One shell leg runs the identical scripted run twice — flag false vs true — and asserts the recorded score/skips/phase trajectories are deep-equal (polish.test.js:546 pins the HUD channel; this pins the SIM channel at ropes ≥ 2).

**No constant exports for this story.** `GRAVITY`/`MIN_HEIGHT` stay inline (`game.js:54, :73`); legs derive expectations from what IS exported (`jumpVelocity`, `BUFFER_SEC`, `START_PHASE`, `CARDS`, `MIN_ROPES`, `MAX_ROPES`, `NEAR_MARGIN`) and, per the nearmiss.test.js:23-33 precedent, rig-local literals ONLY for the two inline physics numbers — with the caveat already recorded in deferred-work (2026-11-04 review defer). Do NOT refactor player.js/game.js exports here; that is balance-pass (Epic 6) territory.

## Tasks / Subtasks

- [x] Task 1: Pure-sim parity legs — `tests/v1parity.test.js` sim section (AC: 2, 3, 4). Direct imports of `game.js`/`player.js`/`rope.js`/`upgrades.js` (rig idiom: `tests/feel.test.js:14-30` + `tests/multirope.test.js:11-16`; STEP 1/120; dt 1/60 rigs only where the feel.test pattern is copied). Injected rng stub everywhere (no offer legs needed; keep runs under the 10th skip or rng will fire them).
  - [x] a. Trajectory identity across rope counts (AC2+AC3): one scripted jump sequence (holds 0, 0.05, 0.25, 0.5, 1.0 s via explicit `jump(player, hold)` + ticked `tickRun`) run on records differing ONLY in `ropes`: field-absent, 1, 2, 3, 4, 5 → player states deep-equal every tick AND equal to the v1-shape (field-absent) reference. Inject the airborne/grounded player the way `multirope.test.js` rigs do so no trip/strip fires mid-script (or accept and compare pre-strip ticks only).
  - [x] b. Analytic pins (AC2): peak of a hold-h jump within the derived semi-implicit left-sum band `1 − g·dt/v ≤ peak/(v²/2·1800) ≤ 1` (the originally drafted [0.97, 1.0] band misses the short-hold end — 4.3% undershoot at hold 0 would red-flag the shipped v1 trajectory; corrected per Debug Log 2026-11-04; derive `jumpVelocity` from the import, gravity as rig-local literal with the caveat comment); `jumpVelocity` cap at hold > 0.5 (player.test.js:5-9 already pins three points — do not repeat verbatim, add the trajectory consequence, not another point table).
  - [x] c. Clearance (AC2): crossing decision boundary at `y` straddling `18 / windowMul`, at base effects and with `CARDS` Wide Stance `apply` applied (windowMul 1.1 → threshold 16.36 — the "≈16.4" of FR18; derive via `CARDS.find(c => c.id === 'window').apply(freshEffects()).windowMul`, never a literal).
  - [x] d. Mercy buffer (AC2): press 0.05 s before the crossing forgives; 0.15 s before trips; exactly `BUFFER_SEC` before forgives via the float-residue edge — the `feel.test.js:40-66` trio, re-pinned on EXPLICIT `ropes: 1` records (that explicit field IS the parity claim; the technique/derivation is feel.test's, the file is not touched). Decay scales with `ropeMul` (Wind-Up via CARDS apply) — phase-clock decay, `game.js:61`.
  - [x] e. Mid-run count change (AC3): record with `ropes: 2` strip-tripped to 1 (reuse `tripresolution.test.js` trip rig technique) → the next scripted jump's trajectory equals the same jump on a `ropes: 1` reference; clearance judgment at the k=0 window identical at N=1 and N=2 for the same y.
  - [x] f. Lead-in snap grace (Design Decision): for N = MIN_ROPES..MAX_ROPES, `resumeRun({ ropes: N, ... })` + crossing-resolution ticks → dropped first passes == count of k with `atFeetOffset(START_PHASE, k, N)`; assert a dropped pass leaves score/skips/ropes/iFrames UNTOUCHED and emits no events. N=1: zero drops (the v1 parity fact).
  - [x] g. No coyote time (AC2): scripted airborne record — `grounded === (y === 0)` every tick (`player.js:17-27`); no auto-launch: zero 'jump' events without a `jump()` in the script.
- [x] Task 2: Shell hygiene legs — same `tests/v1parity.test.js`, harness section (AC: 1, 4). Boot: copy `bootPolishShell` from `tests/polish.test.js:93-222` (it has the blur/pointercancel/visibilitychange dispatch surface — `env.handlers.window.blur()`, `env.document.hidden = true; env.handlers.window.visibilitychange()` per `:417-418`; the juice bootShell does NOT). Delta: wrap `from './game.js'` into a data: URL delegating `tickRun` that forces `run.ropes = s.ropes` (and optionally arms `run.iFrames = s.iFrames` ONCE, never re-forced) into the record — physics and phase stay REAL (unlike nearmiss's player-pinning wrapper). 1.4 review lessons bind: keep `tickRun`'s full arity `(run, rope, player, dt, rng, press)` (`startrun.test.js` freezes it); arm `restore` BEFORE the dynamic import; file:/data: URLs only (`boundary.test.js` walk).
  - [x] a. blur mid-charge at `ropes: 2` → jump fires with real hold-so-far; stale keyup adds no second jump (the polish:718 behavior, at N=2).
  - [x] b. Hidden tab during an active i-frame blank (arm `iFrames` once via wrapper after a scripted trip — or force the record) → enterPause clears all intent vars; resume enters `phase === START_PHASE` with the 0.1-hold airborne player; `ropes` and `iFrames` values survive in the view record (spread carry, `game.js:44-46`) — proves tripped-recovery adds zero shell-specific state. Sim-side belt: `resumeRun({ ...run, iFrames: 3 }).run.iFrames === 3`.
  - [x] c. pause→resume at `ropes: 2` (P key): score/skips/ropes/iFrames all intact in the post-resume view; no lead-in fast-forward (the polish:305/:351 claims at N=2).
  - [x] d. blur mid card-hold at `ropes: 2` → clean cancel, no pick, offer still listed, ropes unchanged (polish:784 at N=2).
  - [x] e. blur on the over screen with a `ropes`-bearing record restarts nothing (T-05-07 re-proven under the rope system).
  - [x] f. Reduced-motion sim parity (AC4 tail, Design): identical script run twice, `emitMq(env, true)` before boot of the second → score/skips/phase trajectories deep-equal.
- [x] Task 3: Confirmation (all ACs)
  - [x] `git diff --exit-code tests/` shows ONLY the new `tests/v1parity.test.js`; `git status js/` CLEAN — if an existing leg goes red, the implementation is wrong (suspects: wrapper broke lead-in phase snap; wrapper re-forced iFrames every tick and froze the drain; wrapper dropped the real player and the trajectory legs became tautologies).
  - [x] `node --test tests/` fully green < 10 s (baseline: 21 files, 187 legs at 967bf62).
  - [x] Live browser smoke (route-intercept idiom, story 1.4 Debug Log): real page, `js/game.js` served through the ropes-forcing wrapper — jump-hold, alt-tab mid-hold, P-pause during an i-frame blank, resume; confirm no phantom jump on return, lead-in catch-up plays, HUD/pips coherent. No js/ files edited.

### Expected outcome

Zero `js/` changes. Any production fix triggered by a leg MUST come with a red-green pair and stay in the shared handler — note it in the Change Log with the caught defect.

### Review Findings

- [x] [Review][Patch] 1f's iFrames belt is 0-vs-0 — unfalsifiable as written — `snap.run.iFrames === started.run.iFrames` and `run.iFrames === 0` compare against `createRun()`'s 0; a blank-decrement regression on dropped passes stays green. Seed iFrames>0 on a snap-tick-only record and pin the exact drain count (tests/v1parity.test.js:266-274,289; the spec's own tripped-recovery "prove, don't assume" mandate)
- [x] [Review][Patch] Per-tick ropes re-forcing heals mid-run strips in legs without `disarmOnStrip` — `runToChoose`'s never-died guard is unreachable (death needs ropeCount 1, the forced input is always 2) and any 2a/2d-strip + its blank is invisible (tests/v1parity.test.js:499-500,586-601; 2e shows the fix exists — enable it or document the healed window)
- [x] [Review][Patch] Harness dispatch can't see a forked handler: `blur(env)` uses `blur?.()` (missing handler = silent pass) and the window registry keeps one fn per type (a second registered blur would be invisible); header comment claims the legs "stayed single-handler" but they prove behavior, not singularity — harden `blur()` to a non-optional call and reword the header (tests/v1parity.test.js:449,566,17-18)
- [x] [Review][Patch] Five source-rewiring `String.replace` calls are unasserted — a drifted `import('./audio.js')` regex silently neuters 2d's `!voices.includes('pick')` (tests/v1parity.test.js:508-513,750; assert each replacement matched)
- [x] [Review][Patch] 2a's "with the hold so far" is unfalsifiable: real-clock hold is ≈0 across a synchronous pump and `vy > 200` passes for every hold value — reuse 2f's leg-local fake clock to press for a known 0.2 s and pin `vy ≈ jumpVelocity(0.2)`, or retitle to what is proven (tests/v1parity.test.js:621-622)
- [x] [Review][Patch] `cleanRope()` comment "138+ window-free ticks … at any rope count" is false for N≥2 (k=1 edge ≈61 ticks after phase 0.56) and contradicts 1a's own body comment — fix the comment (tests/v1parity.test.js:41-43 vs :63-67)
- [x] [Review][Patch] The exactly-BUFFER_SEC leg rides an unobserved float residue of fl(0.1) — inspect it: `assert.ok(edge.run.buffer > 0)` pins intent instead of luck (tests/v1parity.test.js:206-207)
- [x] [Review][Patch] 2c's fast-forward bound hardcodes period 1.3 although `ROPE_PERIOD` is exported (`game.js:11`) — derive it (tests/v1parity.test.js:720)
- [x] [Review][Patch] Wrapper doc comment omits the `disarmOnStrip` third forcing behavior — document it (tests/v1parity.test.js:320-327 vs :500,503)
- [x] [Review][Patch] 1a's `deepEqual(out.rope, ref.rope)` is structurally tautological — all six records share ONE rope input per tick, so the outputs are equal by construction; drop the line or justify it as a mutation guard (tests/v1parity.test.js:74,79)
- [x] [Review][Patch] Finiteness check `'NaN' in out.player` is a key-existence test that can never fire and only `y` is checked — assert every numeric player field `Number.isFinite` (tests/v1parity.test.js:80)
- [x] [Review][Patch] Stale spec citations: deferred-work item (b) lives at deferred-work.md:6 (not :5; offer-check gap is :5) and the mod-1 item is its own bullet at :7 (no "(c)" exists); polish hygiene-matrix range is :718-970 (this story's spec:41,90,102,128)
- [x] [Review][Patch] Spec Task 1b band [0.97,1.0] is arithmetically wrong (left-sum undershoot is 4.3% at hold 0) — the leg correctly implements the derived bound; amend the Task text to match what the leg proves (spec:51 vs tests/v1parity.test.js:93-112)
- [x] [Review][Defer] AC1's pointer-up/pointercancel cells at N≥2 have no legs of their own — normal-release channel is pinned at v1-shape in polish.test.js, the story's Design explicitly decided the "single shared handler, no per-state fork" reading, and shell.js registers one handler per event — deferred, coverage decision already owned by the spec
- [x] [Review][Defer] Live-browser route-intercept smoke (Task 3 bullet 3) not independently re-runnable in audit env — evidence stands in the story Debug Log, static counterparts pinned by legs 2a-2c — deferred, re-exercise on the next live pass

## Dev Notes

### Where everything lives (current state, verified 2026-11-04 against 967bf62)

| File | State today | This story |
|------|-------------|------------|
| `js/shell.js` | hygiene singletons: `releaseEverything` `:169-183`, `enterPause` `:188-200`, `resumeFromPause` `:204-216`, `rearmCalloutGate` `:110`; listeners `:218-275`; `consumeIntents` `:277-322`; `tickPick` confirm `:326-344`. No `iFrames` reference anywhere | UNTOUCHED unless a leg proves a leak |
| `js/game.js` | `leadIn`/`startRun`/`resumeRun` `:33-46`; `tickRun` `:52-162` — snap-skip `continue` `:79`, blank `:83-86`, strip `:123-142`, death `:143-151`; exports `START_PHASE`, `BUFFER_SEC`, `NEAR_MARGIN`, `MIN/MAX_ROPES`, `clampRopes` | UNTOUCHED |
| `js/player.js` | `jumpVelocity` `:5-7`, `updatePlayer` gravity `:13-16`, `clearsRope` `:37-39` | UNTOUCHED |
| `js/rope.js` | `atFeetOffset` windows [0.45,0.55] `:11-19`; wrap `:5-9` | UNTOUCHED |
| `js/upgrades.js` | `CARDS` `:1-28` — Wind-Up cap 2 ⇒ `ropeMul` ≤ 1.12² ≈ 1.2544 (`:20-24`); Wide Stance/Wide Brim drive `windowMul` | UNTOUCHED (read for derivations) |
| `js/render3d.js`, `js/audio.js` | v1/1.x state | DO NOT TOUCH — reduced-motion debt WR-02 (`render3d.js:387`) is Epic 5; audio lifecycle is Story 5.5 |
| `index.html`, `package.json` | near-frozen / frozen | UNTOUCHED |
| `tests/*.test.js` (21 existing) | 187 legs green | MUST stay byte-identical |

### Frozen-test landmines (verified against the tree)

- `tests/polish.test.js` — the ENTIRE v1 hygiene matrix (pause `:260-505`, release-everything `:718-970`): byte-identical; its boot harness is the copy source, not an edit target.
- `tests/multirope.test.js:194` — N=1 ≡ absent ≡ v1 crossing-sequence pin: complementary, do not re-derive it; our delta is the jump-physics scripts.
- `tests/feel.test.js:40-66` — the buffer trio at v1-shape records: copy the rig RATIONALE, never edit; new legs use explicit `ropes: 1`.
- `tests/startrun.test.js` — `tickRun` call-surface freeze: wrapper keeps full arity.
- `tests/tripresolution.test.js:94` — blank duration rope-count invariance: our lead-in-grace leg must not confuse dropped passes with blank passes (drops don't decrement `iFrames`; blanks do — `game.js:79` vs `:83-86`).
- `tests/boundary.test.js` — specifier walk: new test imports the pure sim directly + boots shell only through rewritten data:/file: URLs.
- Boot-hygiene precedent (1.4 review patch): `restore` defined and armed BEFORE the dynamic `import()`; a failed boot restores globals and rethrows.
- The polish 4-key `hud` map answers `hud-ropes` with undefined — shell's null guard (`shell.js:74-76`) handles it; add no new `getElementById`.

### Scope boundaries (do not drift)

- **In scope:** `tests/v1parity.test.js` (sim + shell-harness sections); conditional shared-handler fix IF a leg proves a leak.
- **Out of scope:** `atFeetOffset` mod-1 normalization (deferred-work.md:7 — "if this code is ever revisited"; tests don't revisit); physics-constant exports (see Design); WR-02 (`render3d.js:387`, Epic 5 fold-in); `ropeLost` cue wiring (Story 5.2); audio lifecycle sweep (5.5); the buffer-forgiven offer-check gap (deferred-work.md:5, v1-frozen); any retune of frozen constants.

### Testing standards

- `node --test tests/` (Node ≥ 18, `node:test` + `node:assert/strict`); deterministic — rng injected stub; expectations derive from exported records/constants, literals only for the two documented inline physics numbers; red-green first for any behavior leg that can go red (the snap-grace leg (1f) is expected GREEN immediately — it pins existing behavior; that is the story's nature: a proof, not a mechanic).
- Permanent legs must catch consumer-visible drift: wrong gravity, threshold moved by the refactor, a hygiene fork added per state, pause leaking armed intents at N≥2. No tautology legs (1.4 review lesson — a wrapper that forces the value it asserts proves nothing: force INPUT records, assert OUTPUT trajectories).

### Project Structure Notes

- New file `tests/v1parity.test.js` — thematic sibling of `multirope`/`tripresolution`/`nearmiss`; one file, both sections (`nearmiss.test.js` precedent).
- Conventions: 2-space indent, named imports, sparse comments (the snap-grace derivation and the rig-local gravity literal each earn one), no `console.*`.

### Project Context Rules

- No `project-context.md` exists; `AGENTS.md` is the rule source: pure core / imperative shell (legs cross the fence only via the rewritten boot, `boundary.test.js` keeps the walk), near-frozen `index.html`/`package.json`, frozen-test discipline, `node --test tests/` before committing, zero dependencies (none added).

### Web research note

- None required: no libraries, APIs, or versions change. Node test runner + the shipped, pinned constants are the baseline; Three.js untouched.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5] — ACs, FR17–FR20, FR22, NFR5 (`:283-303`, `:52-61`)
- [Source: _bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd.md#Core mechanics] — `:144-169` physics, clearance, mercy, trip waterfall, no coyote
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-jumprope-web-2026-10-28/EXPERIENCE.md] — `:70-87` interaction primitives, `:57` pause hygiene
- [Source: _bmad-output/game-architecture.md#Time & Counting Rule] — `:241-247`
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — `:6` snap-grace item (b) (owned/decided here), `:5` offer-check gap (out), 2026-11-04 defer entry (constant exports, out)
- [Source: _bmad-output/implementation-artifacts/1-4-near-miss-streak-under-multi-rope.md#Review Findings] — wrapper arity/ropeMul/restore-hygiene lessons
- [Source: js/shell.js:153-344] — every handler this story proves shared
- [Source: js/game.js:33-162] — leadIn/resumeRun spread carries and the crossing engine

## Dev Agent Record

### Agent Model Used

lane-qwen38-ultra/qwen (omp), 2026-11-04

### Debug Log References

- 2026-11-04 red-green pass 1 (15/17): leg 1a red — NO rope-count-independent "clean phase" window exists for N ≥ 2 (the feet windows ride the count: at N=5 a k=4 edge fires at tick 15 of the phase-0.56 script). Re-issued under the task's "accept and compare" clause as PHYSICS-only identity (player + rope deep-equal every tick, all six records, every hold) — events/status legitimately differ (N crossing sites; die-vs-strip is the health system, not the jump). Leg 2d red — the single polish cadence window never reached 'choose' at N=2: the k=1 edge (phase ≈0.95) trips, and each strip's blank eats the next k=0 scored pass, freezing skips ≈2. `runToChoose` widened to TWO jump windows ([0.20,0.28) + [0.72,0.80)) so both k edges are cleared airborne → 2 skips/revolution, offer ≈5 revolutions.
- Task 1b band correction (spec arithmetic, not design): the stated [0.97, 1.0] misses the short-hold end — semi-implicit left-sum undershoot is g·dt/v (4.3% at v 350), so hold 0 measures ratio 0.9575 and would red-flag the SHIPPED v1 trajectory. Pinned the derived bound 1 − g·dt/v ≤ peak/(v²/2·1800) ≤ 1 instead — strictly tighter and formula-based; shipped trajectory unchanged (proof story: legs pin behavior, this one now pins it correctly).
- Mutation verification (proof legs must be load-bearing): gravity 1800→1750 → 1b fails ✓; minHeight 18→18.5 → 1c×2 fail ✓; BUFFER_SEC 0.1→0.11 → 1d float-residue leg fails ✓; resumeRun zeroes iFrames → legs 2b+2c fail ✓; releaseEverything's choose-cancel removed → leg 2d fails ✓. Zero leaks found — no shared-handler fix was needed, js/ untouched as designed.
- Live browser smoke (route-intercept server, `/js/game.js` → data wrapper forcing ropes: 3 + exposing the tick record; real Three.js/WebGL page, Playwright Chromium): 16/16 PASS — pips 3, hold jump, blur mid-hold fires once with hold-so-far (stale keyup silent), trip→strip→blank under the rope system, P-pause DURING the blank, resume at START_PHASE with score/skips/iFrames intact and vy decaying monotonically (no phantom jump), hidden-tab freeze + lead-in auto-resume, coherent pips. Only network noise: 404 audio/track.ogg (absent in repo; graceful trackMissing path).

### Completion Notes List

- Zero production changes, as designed: the audit held — every reachable-state hygiene path (blur/cancel/hidden/pointer-up/pause/resume/confirm/restart) routes through the singletons; legs 2a–2e re-prove each at N=2, leg 2b's sim-side belt pins the `resumeRun` spread carry (`iFrames: 3` survives), and nothing in the shell references `iFrames`.
- 17 new legs, all derived from exports (`jumpVelocity`, `BUFFER_SEC`, `START_PHASE`, `atFeetOffset`, `CARDS…apply`); the only literals are the two documented inline physics numbers (GRAVITY 1800, MIN_HEIGHT 18) per the 2026-11-04 constant-exports defer.
- 1a implements the "accept and compare" option strictly beyond it: full real-physics trajectories compared tick-for-tick across all six records — not pre-strip ticks only.
- 1f pins the lead-in snap grace exactly as decided: drops derived from `atFeetOffset(START_PHASE, k, N)` (no table), silent at the snap tick, state-neutral (i-frames untouched), late-by-one-revolution count == drops; N=1 zero drops — the v1 parity fact. N=5 k=1 is the only snapped window in the legal band (derived, not hardcoded).
- 2f needed one harness-local delta: a leg-isolated fake `performance.now` for two sequential boots — boot-skew on the real clock would diverge dt sequences; every other leg keeps the real clock.
- Mutation checks (see Debug Log) prove the legs catch consumer-visible drift: gravity, threshold, buffer window, spread carry, and a choose-status hygiene fork each turn specific legs red.
- Frozen-test discipline held: `git diff tests/` empty; existing 21 files byte-identical; `js/`, `index.html`, `package.json` untouched.

### File List

- `tests/v1parity.test.js` (new) — 17 legs: Task 1 sim parity section + Task 2 shell-harness section
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story status tracking (artifact, not product)

## Change Log

- 2026-11-04: Story implemented — `tests/v1parity.test.js` (17 legs, sim + shell-harness), zero production changes; story 1b band corrected to the derived left-sum bound; mutation-verified; live-browser route-intercept smoke 16/16. Status → review.
- 2026-11-04: Adversarial code review (Blind Hunter / Edge Case Hunter / Acceptance Auditor) — 0 decision_needed, 13 patches applied, 2 deferred to deferred-work.md, 6 findings dismissed on verification (wrapper defaults apply, resume-snapshot assertions falsifiable, pump determinism, 2f wording forced, grounded-iff scoping, informational pass). Patches: seeded-iFrames snap belt (1f now falsifiable), `disarmOnStrip` armed on 2b/2d/2f (death guard reachable, heal documented in 2a), full-dispatch `fireWindow` + non-optional `blur` + array registries, rewire assertions on all five replacements, leg-local fake clock making 2a's partial-hold claim falsifiable, `enteringBuffer` residue inspection, `ROPE_PERIOD` derivation, finiteness over all numeric fields, tautology justified as mutation guard, comment fixes; stale spec citations and Task 1b band corrected. Suite 204/204 green (8.4 s); existing 21 test files byte-identical; `js/` untouched. Status → done.
