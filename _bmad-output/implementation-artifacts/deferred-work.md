# Deferred Work

## Deferred from: code review of story 1-1-multi-rope-simulation-core (2026-11-01)

- **Buffer-forgiven pass bypasses the offer check** (`js/game.js` buffer branch) — a forgiven 10th skip increments `skips` with no `shouldOfferUpgrade` check, deferring the offer to skip 20 (`% 10 === 0`). Byte-identical to v1; Story 1.2 rewrites the adjacent trip branch — decide there whether to add the check.
- **Rising-edge crossing blind spots** (`js/rope.js` / `js/game.js` crossing loop) — (a) a tick whose phase increment exceeds the 0.1-wide window silently drops the crossing (no score, no trip); (b) resuming with a rope's window already active grants that rope one non-lethal revolution — at `ropes: 5` the canonical `leadIn` phase 0.33 lands inside rope 1's window. Unreachable at shell step sizes with one rope; multi-rope widens the phase coverage to N×0.1 of the circle. Relevant to Stories 1.2 (trip resolution) and 1.5 (input-hygiene parity proof).
- **`atFeet`/`atFeetOffset` mod-1 domain change** — derived phase now uses `% 1`, so out-of-domain inputs (`phase ≥ 1` after a pathological `updateRope` wrap, or negative phase) report window membership where v1 returned false. Normalize with `((x % 1) + 1) % 1` if this code is ever revisited.
- **Offer cadence + streak escalation scale with rope count** — first offer ≈1.85 revolutions at N=5; `CLOSE! ×N` callouts accumulate N× per revolution. Assigned to Epic 6 (balance pass) by GDD §163-186.
- **`run.ropes` clamp is at-read only** — invalid values are never normalized into the record; Story 1.3's HUD must re-apply `clampRopes` rather than render the raw field.

## Deferred from: code review of story 1-2-trip-resolution-lose-the-fastest-rope-ride-the-i-frames (2026-11-02)

- **`ropeLost` event cue wiring has no explicit owner** (`js/audio.js` VOICES, `js/shell.js` JUICE_TIERS, renderer rope-count visuals) — a strip trip is currently audio-visually silent. The pieces are split across 1.3 (rope-count HUD), 5.2 (rope-loss thud), 5.3 (i-frame juice), but no story lists the event→cue wiring itself; claim it in whichever of 1.3/5.2 lands first.
- **AGENTS.md frozen-test rule lacks the sanctioned re-contract exception** — Story 1.2 pre-authorized re-contracting two interim legs in `tests/multirope.test.js`, which AGENTS.md's "existing test files stay byte-identical" wording does not describe. Amend the Conventions block when convenient (or confirm the wording is deliberately absolute and interim-fence edits need a different home).

## Deferred from: code review of story 1-3-rope-count-on-the-hud (2026-11-04)

- **`ropeLost` still has no juice/audio consumer** (`js/shell.js` JUICE_TIERS, `js/audio.js` VOICES) — confirmed silent in 1.3's review; same item as the 1.2-review entry above. Story 1.3 deliberately claimed only the visual-state cue (ghost pip); 5.2 owns the thud and any cue-tier wiring.
- **`updateHud()` runs outside the frame try/catch and now calls `replaceChildren`** (`js/shell.js:393` vs the try at `:451-456`) — a throw in the new pip block skips `requestAnimationFrame(frame)` and silently freezes the rAF loop; `replaceChildren` (Safari ≥ 14 / Chrome ≥ 86) is the first modern-only DOM API in the per-frame path. Spec sanctions the API via NFR11 evergreen targets and updateHud's position outside the try is pre-existing structure; if a defensive pass ever touches `frame()`, bring `updateHud()` inside the safety net.

## Deferred from: code review of story 1-4-near-miss-streak-under-multi-rope (2026-11-04)

- **Near-miss rig duplicates physics constants; band guard self-referential** (`tests/nearmiss.test.js:23-33`) — `GRAVITY = 1800` / `MIN_HEIGHT = 18` inline literals duplicate non-exported sim constants, and the in-band guard validates against the same duplicated `FALL_PER_TICK` that positions the injection. A future gravity/threshold drift could silently move the injected "near band" while every guard still passes. Fix requires exporting the physics constants from `game.js`/`player.js`; consequence bounded (drift must exceed half the band to flip a result).


## Deferred from: code review of story 1-5-input-hygiene-v1-parity-proof (2026-11-04)

- **AC1 pointer-up/pointercancel cells at N≥2 unlegged** (`tests/v1parity.test.js` shell section) — the normal-release (`release()`) and canvas `pointercancel` channels are pinned only at ropes-absent (`tests/polish.test.js:749`); the story's Design already owns the "shared handler, no per-state fork" reading and shell registers one handler per event, so no new coverage was required here. Revisit if a fork ever appears in `releaseEverything`/`release`.
- **Live-browser smoke evidence is Debug-Log-only** (story 1.5 Debug Log, 2026-11-04) — the 16/16 route-intercept Playwright pass cannot be re-run headlessly without adding a dependency (forbidden); static counterparts are pinned by legs 2a-2c. Re-exercise on the next live-browser pass (e.g. Epic 5 audio lifecycle sweep).

