# Deferred Work

## Deferred from: code review of story 1-1-multi-rope-simulation-core (2026-11-01)

- **Buffer-forgiven pass bypasses the offer check** (`js/game.js` buffer branch) — a forgiven 10th skip increments `skips` with no `shouldOfferUpgrade` check, deferring the offer to skip 20 (`% 10 === 0`). Byte-identical to v1; Story 1.2 rewrites the adjacent trip branch — decide there whether to add the check.
- **Rising-edge crossing blind spots** (`js/rope.js` / `js/game.js` crossing loop) — (a) a tick whose phase increment exceeds the 0.1-wide window silently drops the crossing (no score, no trip); (b) resuming with a rope's window already active grants that rope one non-lethal revolution — at `ropes: 5` the canonical `leadIn` phase 0.33 lands inside rope 1's window. Unreachable at shell step sizes with one rope; multi-rope widens the phase coverage to N×0.1 of the circle. Relevant to Stories 1.2 (trip resolution) and 1.5 (input-hygiene parity proof).
- **`atFeet`/`atFeetOffset` mod-1 domain change** — derived phase now uses `% 1`, so out-of-domain inputs (`phase ≥ 1` after a pathological `updateRope` wrap, or negative phase) report window membership where v1 returned false. Normalize with `((x % 1) + 1) % 1` if this code is ever revisited.
- **Offer cadence + streak escalation scale with rope count** — first offer ≈1.85 revolutions at N=5; `CLOSE! ×N` callouts accumulate N× per revolution. Assigned to Epic 6 (balance pass) by GDD §163-186.
- **`run.ropes` clamp is at-read only** — invalid values are never normalized into the record; Story 1.3's HUD must re-apply `clampRopes` rather than render the raw field.

## Deferred from: code review of story 1-2-trip-resolution-lose-the-fastest-rope-ride-the-i-frames (2026-11-02)

- **`ropeLost` event cue wiring has no explicit owner** (`js/audio.js` VOICES, `js/shell.js` JUICE_TIERS, renderer rope-count visuals) — a strip trip is currently audio-visually silent. The pieces are split across 1.3 (rope-count HUD), 5.2 (rope-loss thud), 5.3 (i-frame juice), but no story lists the event→cue wiring itself; claim it in whichever of 1.3/5.2 lands first. — **RETRO 2026-11-05: owned by 5.2** (1.3 landed its visual-state cue; audio/juice wiring goes to 5.2's story text).
- **AGENTS.md frozen-test rule lacks the sanctioned re-contract exception** — Story 1.2 pre-authorized re-contracting two interim legs in `tests/multirope.test.js`, which AGENTS.md's "existing test files stay byte-identical" wording does not describe. Amend the Conventions block when convenient (or confirm the wording is deliberately absolute and interim-fence edits need a different home).

## Deferred from: code review of story 1-3-rope-count-on-the-hud (2026-11-04)

- **`ropeLost` still has no juice/audio consumer** (`js/shell.js` JUICE_TIERS, `js/audio.js` VOICES) — confirmed silent in 1.3's review; same item as the 1.2-review entry above. Story 1.3 deliberately claimed only the visual-state cue (ghost pip); 5.2 owns the thud and any cue-tier wiring. — **RETRO 2026-11-05: ownership fixed to 5.2**, see assignment pass below.
- **`updateHud()` runs outside the frame try/catch and now calls `replaceChildren`** (`js/shell.js:393` vs the try at `:451-456`) — a throw in the new pip block skips `requestAnimationFrame(frame)` and silently freezes the rAF loop; `replaceChildren` (Safari ≥ 14 / Chrome ≥ 86) is the first modern-only DOM API in the per-frame path. Spec sanctions the API via NFR11 evergreen targets and updateHud's position outside the try is pre-existing structure; if a defensive pass ever touches `frame()`, bring `updateHud()` inside the safety net. — **CLAIMED by Story 2.1 Task 5** (retro 2026-11-05; 2.1 edits `updateHud()` anyway). — **CLOSED by Story 2.1 Task 5 (2026-11-05)**: `updateHud()` now runs inside `frame()`'s try and the catch path keeps scheduling `requestAnimationFrame(frame)` (`js/shell.js:583-589`).

## Deferred from: code review of story 1-4-near-miss-streak-under-multi-rope (2026-11-04)

- **Near-miss rig duplicates physics constants; band guard self-referential** (`tests/nearmiss.test.js:23-33`) — `GRAVITY = 1800` / `MIN_HEIGHT = 18` inline literals duplicate non-exported sim constants, and the in-band guard validates against the same duplicated `FALL_PER_TICK` that positions the injection. A future gravity/threshold drift could silently move the injected "near band" while every guard still passes. Fix requires exporting the physics constants from `game.js`/`player.js`; consequence bounded (drift must exceed half the band to flip a result).

## Deferred from: code review of story 1-5-input-hygiene-v1-parity-proof (2026-11-04)

- **AC1 pointer-up/pointercancel cells at N≥2 unlegged** (`tests/v1parity.test.js` shell section) — the normal-release (`release()`) and canvas `pointercancel` channels are pinned only at ropes-absent (`tests/polish.test.js:749`); the story's Design already owns the "shared handler, no per-state fork" reading and shell registers one handler per event, so no new coverage was required here. Revisit if a fork ever appears in `releaseEverything`/`release`.
- **Live-browser smoke evidence is Debug-Log-only** (story 1.5 Debug Log, 2026-11-04) — the 16/16 route-intercept Playwright pass cannot be re-run headlessly without adding a dependency (forbidden); static counterparts are pinned by legs 2a-2c. Re-exercise on the next live-browser pass (e.g. Epic 5 audio lifecycle sweep).


## Retro assignment pass (Epic 1 retrospective, 2026-11-05)

- **`ropeLost` event→cue wiring (items at :13 and :18)** — OWNED by Story 5.2 per Epic 1 retro: 1.3 shipped the visual-state cue (ghost pip), so the remaining audio thud + JUICE_TIERS/VOICES wiring claims whichever of the two lands first = 5.2. Write it into 5.2's story text at creation.
- **`updateHud()` outside the frame try/catch (item at :19)** — CLAIMED by Story 2.1, Task 5 (added to the story file 2026-11-05). Closes at 2.1.
- **Physics-constant exports for `nearmiss`/`v1parity` rigs (item at :23)** — confirmed Epic 6 balance-pass territory; no change.
- **AGENTS.md re-contract exception (item at :14)** — RESOLVED 2026-11-05: Conventions block amended (interim-fence exception, citing Story 1.2).


## Deferred from: code review of story 2-1-score-is-altitude-one-number-everywhere (2026-11-05)

- **`hud-best` climbs with proportional digits** (`js/shell.js:478`, no `#hud-best` rule in `css/style.css`) — during record-setting runs the best line recomputes every scored pass and width-jitters, the same defect the `#hud-score` `tabular-nums` line just fixed. Story 2.1's scope rule forbids `tabular-nums` on other slots; claim it in whichever polish story next touches the HUD row.
- **Two writers to the same persisted best** (`js/shell.js:338` over-restart + `:556` trip) — v1 structure; the restart write is dead weight (the run record is frozen between the sites). Consolidate into one shared save path when Story 2.4 reworks run-over persistence, per the FR22 shared-handler rule.
- **Invariant leg uses exact float equality** (`tests/altitude.test.js:104`) — `altitude === ALT_PER_POINT × score` is exact only because the placeholder `ALT_PER_POINT = 2` is a power of two; a non-power-of-two balance value will fail the leg with no product bug. Re-express with tolerance in Epic 6's balance pass.
- **Shell test harness forked a third time** (`tests/altitude.test.js:115-203` vs `uxpolish.test.js:58-156`, `shell.test.js:30-105`) — ~90 lines of data-URL boot scaffolding repeated; extracting `tests/support/shell-harness.js` touches frozen files, so it needs a dedicated chore, not a story-sized change.

## Deferred from: code review of story 2-2-jump-peak-vs-ceiling-and-the-summit-win (2026-11-05)

- **`crossesCeiling` has no domain guard for a crafted out-of-range/typed `area`** (`js/game.js:41`) — `AREAS[area - 1].ceiling` throws TypeError on `area: 0/6/NaN/fractional` and string-concat-corrupts on `area: '3'`; the `??` heal repairs only missing keys. Diverges from the module's own hardening doctrine (`clampRopes`, the i-frames non-finite arm). Spec-sanctioned (story Task 2: "No clamp on `area`") and unreachable from production writers (only 1..5 are ever written). Story 4.1's monotonicity pin should also pin the domain — or add the clamp there.
- **Summit win leaves the same-tick `'offer'` event on the D-N02 channel** (`js/game.js` summit branch vs the crossings-loop push) — the offer FIELD is cleared to null as decided, but a `'win'` tick that also crossed the 10th skip still pushes `'offer'`, so audio announces an offer that is never presented (probe: `events ['skip','offer','win']`). Claim it in Story 2.4's win-presentation work (suppress or gate the cue; 5.1 owns the fanfare itself).
- **i-frame-suppressed summit peak is not banked** (`js/game.js` ceiling-check gate `iframesLeft === 0`) — the check is level-triggered, so the win re-fires on a later live tick; live play is bounded (the blank drains ≤ 1 revolution and `altitude` alone crossing re-fires regardless of arc), but a crafted crossing-starved record with `iFrames: 1` resolves forever. Story 4.5 must pin the deferral semantics in its i-frame interlock text.
- **Fourth bootShell fork captures `console.error` without asserting it** (`tests/ascent.test.js` `bootAscentShell`) — the `errors` array is collected and discarded, so any render-path `console.error` on the summit legs passes unnoticed; same ~90-line harness duplication as the extraction chore at :44 — fold the assertion in when the shared `tests/support/shell-harness.js` lands.

## Deferred from: code review of story 2-3-the-ceiling-marker-telegraph-the-moon-jump (2026-11-05)

- **Marker pins `ceiling 0 ↑` while i-frames suppress the ascend** (`js/shell.js` markerLine vs `js/game.js` ceiling-check gate) — during a rope-stripped blank with ≥2 ropes, the telegraph promises the ceiling for up to ~1.3 s per remaining i-frame and the sim refuses to break it; the suppression is intentional (Story 4.5 interlock), so the fix is a marker-side blocked-at-ceiling arm (dim/blink the line while `iframesLeft > 0` and dist is 0). Claim in Epic 4/5's ascent-polish pass alongside the 4.5 deferral pin.

