---
baseline_commit: d4c19136533410b1624b34ce1b7c313d5f96aa43
---

# Story 2.4: Win & loss presentation with true permadeath

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player finishing a run,
I want an unmistakable win or loss screen with my altitude and best,
So that the run's ending lands as an event and I know exactly what to beat next time.

## Acceptance Criteria

1. **Win presentation.** Given a run that reached the summit ceiling (`status 'over'`, `outcome 'summit'`), when the run-over view renders, then a win line appears, distinct from loss: `Summit. Altitude <N> best <B>` in the `win` amber (`role-amber`, #ffcf6e), with final altitude N and best-altitude B (FR26, FR24).
2. **Loss presentation.** Given a run ended by last-rope trip (`outcome 'tripped'`), when the run-over view renders, then the loss line reads `Missed! Altitude <N>` (bone, no role class), plus a ` best <N>` tail when the run beat its start-of-run best (FR26, FR24). Final altitude is the final score; best-altitude also stays visible on the persistent `hud-best` line.
3. **Permadeath contract.** Given either end state, when the player restarts, the new run starts from the full baseline — ropes 1, `owned {}`, baseline effects, `area 1`, `baseAltitude 0`, `altitude 0`, `score 0`, `offer null` — nothing carries between runs except best-altitude and audio settings in storage (FR26).
4. **Restart hygiene.** Given the win/lose view, when input arrives, hygiene holds via the shared press/release paths: a jump key HELD ACROSS the death must NOT start the new run when released; a fresh press (then release) DOES restart — the frozen restart legs' keydown-then-keyup sequence still restarts (FR22).

### Decided interpretations (do not re-litigate)

- **Copy is the UX spine's** (`Missed! Altitude N`, `Summit. Altitude N`), authority per readiness report. Note the loss copy CHANGES from shipped `Missed! Score N` (js/shell.js:526). Prefix legs (tests/polish.test.js:455, :825; tests/v1parity.test.js:814) stay green; `tests/uxpolish.test.js:216` pins the FULL old string `^Missed! Score N$` and is an authorized re-contract in Task 4 (this story ships the replacement copy).
- **"Showing best-altitude" (AC1/AC2)** = persistent `hud-best` line (updateHud writes it in every status, js/shell.js:507) PLUS the in-line tails above. Win always carries a ` best N` tail (AC1 names it); loss tail appears only when the run beat its start-of-run best (EXPERIENCE.md copy: "+ best N when new").
- **AC4 semantics** (pinned by frozen tests): restart fires on the RELEASE of a press that BEGAN in the over state. Frozen legs press before releasing (tests/altitude.test.js:262-264, tests/ascent.test.js:408-410 — keydown THEN keyup), so press-arming keeps them green; a key pressed pre-death and released post-death arms `releaseIntent` but never saw an over-status press, so it cannot restart.
- **Fanfare is NOT this story** — the `win` sim event currently reaches audio as a no-op; Story 5.1 owns the sound. Do not touch js/audio.js.

## Tasks / Subtasks

- [x] Task 1: `js/game.js` — summit tick strips the `'offer'` event (AC: 1) — CLAIM from deferred-work.md ("Summit win leaves the same-tick 'offer' event")
  - [x] In the summit branch (js/game.js:186-190) remove `'offer'` from the tick's events IN PLACE: `const oi = events.indexOf('offer'); if (oi !== -1) events.splice(oi, 1);` — `events` is a `const` array (js/game.js:93), so never reassign it. Rationale: the win already nulls the offer FIELD; `'offer'` is voice-less today (tests/audio.test.js:164 pins silence for unknown events) — this is events-channel hygiene so Story 5.1's new voices cannot inherit a false cue on the win tick. Add a pointer comment to the summit branch.
- [x] Task 2: `js/shell.js` — run-end presentation + press-armed restart (AC: 1, 2, 3, 4)
  - [x] `startFreshRun()` helper: captures `bestAtStart = best`, calls `resetPips()`, assigns `({ rope, player, run } = rearmCalloutGate(startRun()))`. Use at BOTH start sites: the idle-press branch (js/shell.js:325-327) and the over-restart branch (js/shell.js:353-358). `bestAtStart` initializes to the boot-loaded `best`.
  - [x] Press-armed restart: in `consumeIntents` pressIntent chain add `else if (run.status === 'over') { restartArmed = true; }`; the over branch under `releaseIntent` restarts ONLY when `restartArmed` (then clears it). Keep the existing `best = Math.max(...)` + `saveBest` lines in that branch. No new event listeners (FR22: shared handlers only).
  - [x] Prompt ladder (js/shell.js:515-534): split the over branch — `run.outcome === 'summit'` → `'Summit. Altitude ' + N + ' best ' + best` with `roleClass = 'role-amber'`; other over → `'Missed! Altitude ' + N` + tail `' best ' + N` when `Math.round(run.altitude) > bestAtStart`. Loss keeps `roleClass ''`.
- [x] Task 3: `tests/winloss.test.js` — NEW (AC: 1, 2, 3, 4)
  - [x] Harness copy idiom (ceilingmarker/uxpolish: createElement-capable DOM stub, bootShell via data-URL, game.js wrapper with `forceArea`/`forceScore`/`forceOwned`/`chooseOffer` stamps). Add `forceOwned` (output-side `owned` stamp) for the permadeath leg. Remember: stamps land on the OUTPUT — the sim's INPUT only carries them from the NEXT tick; wrapper conditionals must use `!== null`/`!== undefined`, never truthiness.
  - [x] Loss leg: trip to death grounded → prompt `Missed! Altitude N` exact-form, no role class, `hud-best` shows round(max(best, N)).
  - [x] New-best leg: pre-seed `localStorage` best BELOW the run's altitude → loss line ends with ` best N`; control sub-case with best ABOVE → no tail.
  - [x] Win leg: `forceArea = SUMMIT_AREA` + `forceScore = (AREAS[4].ceiling + 2) / ALT_PER_POINT` after landing the lead-in hop → over/summit → `Summit. Altitude N best B`, `hud-prompt` className `role-amber`.
  - [x] Permadeath legs: stamp owned cards via `forceOwned`, trip to death, restart via keydown+keyup+tick → assert every baseline field (`ropes === 1`, `owned` deep-equals `{}`, `effects` deep-equals `freshEffects()` from `../js/upgrades.js`, `area === 1`, `baseAltitude === 0`, `altitude === 0`, `score === 0`, `offer === null`) AND storage keys unchanged (best persisted, no run-state keys written). Repeat the full assertion set after a WIN-path restart (reuse the win leg's boot) — AC3 says "either end state".
  - [x] Hygiene legs: (a) keydown during running, trip the run WHILE HELD (no keyup), then keyup → status stays `over`, no restart; (b) fresh keydown+keyup over the over screen → running again (single restart; the trailing release does not re-fire); (c) blur on the over screen restarts nothing; (d) POINTER mirror of (a): canvas `pointerdown` held across the trip, then `pointerup` → no restart (same gated paths via js/shell.js:247-248 — pin it, don't assume it).
  - [x] Sim event leg (Node-side, no shell): craft a tick that crosses the 10th skip AND breaks the summit ceiling together (run `{ area: 5, altitude: AREAS[4].ceiling + 2, skips: 9, status: 'running', ... }`, rope crafted to cross on this tick — copy phase-craft from tests/ascent.test.js / tests/altitude.test.js) → events include `'win'`, do NOT include `'offer'`.
- [x] Task 4: `tests/ascent.test.js` — re-contract the interim fence (AC: 1)
  - [x] AUTHORIZED FENCE EDITS (both legs are interim fences this story replaces): (1) tests/ascent.test.js:405-406 asserts `''` with the comment "interim: empty win prompt — story 2.4 owns the Summit. copy" → replace exactly those two lines to assert `/^Summit\. Altitude \d+ best \d+$/`. (2) tests/uxpolish.test.js:216 pins `^Missed! Score N$` — the copy this story replaces → change that one assertion to `/^Missed! Altitude \d+( best \d+)?$/`. No other change to these frozen files may appear in the diff.

### Review Findings

- [x] [Review][Patch] FIXED — Stale jump-hold survives the restart — phantom full-power jump on the next focus loss [js/shell.js:141-145] — `startFreshRun` doesn't clear `holdFrom`/`pressIntent`: die with the key held → press+release restart → `blur()` fires `jump()` from the pre-death hold (probe: vy 220→510, altitude still 0). Leaks state across the run boundary, against the AC3 contract; predates this story (repro's on d4c1913 too) but the fix is one line in this story's own helper + a regression leg in tests/winloss.test.js.
- [x] [Review][Patch] FIXED — Loss-copy fence no longer pins the altitude value [tests/uxpolish.test.js:216] — the re-contracted `/^Missed! Altitude \d+( best \d+)?$/` matches any integer; the leg's stated contract is "fractional altitude renders as an integer in the missed line". Tightened to the value-exact tolerant form (`Math.round(altOver)` interpolated).
- [x] [Review][Patch] FIXED — "restarts exactly once" leg cannot detect a double `startRun` [tests/winloss.test.js:436-451] — now witnessed by the lead-in hop's strictly falling vy across the post-restart window: a silent second start re-fires it to 400.
- [x] [Review][Patch] FIXED — Dead harness snapshot key [tests/winloss.test.js:215] — dropped `saved.__wlScript`; `restore()` deletes the global directly.

## Dev Notes

### The Design (decided — do not re-litigate)

- Death/win presentation is ONE prompt-ladder branch pair — no overlays, no new DOM, no `index.html` change (it is near-frozen; the fence tests grep around it). `role-amber` already exists in css/style.css:38 and equals the DESIGN `win` token #ffcf6e — zero CSS changes needed.
- `bestAtStart`/`restartArmed` are shell-local `let`s beside `best` — never in the run record (the sim has no notion of restart intent; invalid states stay data).
- The over-restart branch stays where it is (shared handlers, FR22 "zero new handlers" — exercised by, not asserted by, the restart legs at tests/ascent.test.js:408-412; nothing counts listeners, so honor it by discipline). Only the arming condition changes.
- `startRun()` (js/game.js:56-58 → createRun at :63-66) already produces the full permadeath baseline — Task 2 must CALL it, never re-derive a clean record by spreading the dead one (`resumeRun`'s spread at js/game.js:61 is the anti-pattern to avoid).

### Current state (verified 2026-11-05)

- `js/shell.js:526` loss line `Missed! Score N`; summit over falls through to EMPTY prompt (js/shell.js:525 excludes it). `updateHud` writes `hud-best = 'best ' + max(best, run.altitude)` every frame in every status (js/shell.js:507).
- End-of-run save: frame loop saves best on the trip/win tick (js/shell.js:585-587); the restart branch re-saves idempotently (js/shell.js:354-355) — keep both, both are pinned.
- `release()` (js/shell.js:182-185) arms `releaseIntent` unthrottled by status; `releaseEverything` arms it ONLY while running (js/shell.js:203) — that asymmetry is what AC4(a) pins: post-death raw keyup currently DOES restart. The `restartArmed` gate fixes exactly this.
- Frozen behavior pins: tests/altitude.test.js:251-268 (restart via keydown+keyup, best idempotence), tests/ascent.test.js:390-418 (win saves on win tick; interim empty-prompt fence at :405-406; restart cleanliness fields), tests/polish.test.js:455, :810-825 (`/^Missed!/` prefix; blur-on-over never restarts — T-05-07), tests/uxpolish.test.js:216 (full old loss string — authorized re-contract). These files stay byte-identical EXCEPT the two authorized fence edits in Task 4.
- `js/game.js:186-196`: summit branch nulls the offer FIELD and pushes `'win'`, but a same-tick 10th-skip `'offer'` push (js/game.js:133) survives in the events channel (probe dump: `['skip','offer','win']`) — deferred-work.md claims the channel cleanup for 2.4. No audio cue exists for `offer` today; the fix is channel hygiene ahead of Story 5.1.

### Pitfalls (from Epic 2 reviews — repeat offenders)

- Harness stamps land on tickRun's OUTPUT; the sim only sees them in the INPUT from the next tick. Wrapper flags need `!== null` checks (truthiness silently skips 0/NaN).
- `tickRun` runs 6× per simulated frame (50ms/STEP) and evaluates `crossesCeiling` EVERY tick — crafted out-of-domain `area` crashes the SIM (`AREAS[area-1]` at game.js:44); the sim-side clamp stays deferred to Story 4.1, so craft records with VALID areas and stamp payloads instead.
- Every run begins with `leadIn()`'s pre-launched hop — land it (`landFirst` idiom) before grounded assertions; the first rope pass (~0.156 s of sim time) is survived airborne.
- `run.altitude` on over frames: use `Math.round(run.altitude)` for N everywhere (HUD convention); storage stores rounded.

### Project Context Rules

- Vanilla ES modules, no deps, no build; pure sim core (js/game.js) must stay Node-importable and throw-free — presentation truth lives in the shell (boundary fence tests enforce one-way flow).
- Frozen-test discipline: existing test files byte-identical except legs explicitly re-authorized above; new behavior pinned by the new test file; expectations derive from AREAS/records, never hardcoded tables.
- No `console.*` in pure modules; POJOs; 2-space indent; named exports; `.js` extensions in imports.
- `index.html`/`package.json` near-frozen — untouched by this story.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4 :404-426] — ACs verbatim; FR26 :63, FR24 :61, FR22 :59
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-jumprope-web-2026-10-28/EXPERIENCE.md#State-Patterns :65-67] — loss/win copy, permadeath contract
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-jumprope-web-2026-10-28/DESIGN.md#:38,:53,:89] — run-over line spec, win/bone colors
- [Source: _bmad-output/implementation-artifacts/deferred-work.md :49] — the win-tick 'offer' claim
- [Source: _bmad-output/implementation-artifacts/2-3-the-ceiling-marker-telegraph-the-moon-jump.md#Dev-Agent-Record] — harness/wrapper mechanics, leadIn hop discovery
- [Source: js/shell.js:156-383, :495-558; js/game.js:56-66, :96-196; js/areas.js] — substrate as shipped

## Dev Agent Record

### Agent Model Used

lane-qwen38-ultra/qwen (omp agent session, 2026-11-05)

### Debug Log References
- Red phase: 9/10 winloss legs red pre-implementation (blur pin green by design); green at 10/10 after Task 1+2.
- Test-side timing discovery: the trip's 80 ms hitstop defers the drain, so the post-restart window accumulates ~150 ms of acc — a restarted run is ~180 ms old by the first post-restart frame, past its ~156 ms lead-in pass. The "restarts exactly once" leg asserts presentation-state, not skip-count (skip-count on that window is timing-dependent).
- Leg authoring traps hit and fixed: wrapper OUTPUT stamps (forceOwned/forceScore/forceArea) must be CLEARED before restart assertions or they restamp the fresh record; the crafted win-tick player must be airborne (y=20) or trip-beats-win turns the leg into a loss.

### Completion Notes List
- `js/shell.js`: `bestAtStart`/`restartArmed` locals; `startFreshRun()` at both start sites; over press branch arms restart, release branch gated; prompt ladder split into summit (amber, always best tail) vs loss (bone, new-best tail only).
- `js/game.js`: summit tick splices the ghost `'offer'` cue out of the const events array (deferred-work claim, closed).
- `tests/winloss.test.js` NEW: 11 legs — copy pair, new-best control, permadeath via loss AND win, keyboard/pointer/blur hygiene, phantom-jump hold-leak regression, sim-channel pin. 271/271 full suite.
- Frozen discipline held: only the two AUTHORIZED fence legs touched (verified via `git diff d4c1913 -- tests/`); no CSS/index.html/audio changes.
- Deferred-work.md: the win-tick 'offer' claim is now FIXED — strike it on the next docs touch.

### File List

- js/game.js (modified — summit-tick offer-event splice + comment)
- js/shell.js (modified — bestAtStart/restartArmed, startFreshRun, press-armed restart, win/loss prompt ladder)
- tests/winloss.test.js (new — 11 legs, dual-shape harness)
- tests/ascent.test.js (authorized fence re-contract at :405-406 ONLY)
- tests/uxpolish.test.js (authorized fence re-contract at :216 ONLY)

### Change Log

- 2026-11-05: Story 2.4 implemented — win/loss presentation (Summit./Missed! Altitude copy, amber win, new-best tail), press-armed permadeath restart, ghost-offer channel claim closed; 10 new legs + 2 authorized re-contracts, 270/270 green. Status → review.
- 2026-11-06: Code review (3 adversarial layers): 4 patches applied — phantom-jump hold leak cleared in startFreshRun (+1 regression leg, red-green proven), uxpolish loss fence made value-exact, restart-once leg given a vy-monotonic witness, dead harness key dropped. 2 dismissed (auto-repeat filtered at js/shell.js:281; harness idiom copy per Task 3). 271/271 green. Status → done.
