---
title: 'Chest Jiggle Physics (renderer-only gag)'
type: 'feature'
created: '2026-11-01'
status: 'done'
baseline_commit: '5e4a9f8'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The demake has no physical-comedy wink to the Scarlet Skips original. Players who know the source deserve one knowing joke; nothing else about the game should change.

**Approach:** Two deliberately boxy prop boxes on the chest front, animated by a damped spring driven by the character's vertical velocity, so every launch and landing produces a cheeky wobble that reads as "someone bolted jiggle physics onto the engine" — not anatomy. Purely cosmetic, renderer-only.

## Boundaries & Constraints

**Always:**
- All changes confined to `js/render3d.js` (impure shell layer; sole `three` consumer).
- Spring driven by `view.player.vy` (sim px/s, already in the view payload) with per-frame integration on `view.now` deltas — the same clock channel the juice system uses. Clamp dt (e.g. ≤ 50 ms) so tab-refocus can't explode the spring.
- Both boxes parented to `torsoGroup`, rose material, same boxy style as the rest of the rig (D-13 chibi primitives).
- `view.reducedMotion` truthy → offsets held at exactly 0 (still endpoint; mirrors UI-02 pattern).
- Missing/non-finite `vy` treated as 0 — never produce NaN positions.
- One module-level kill-switch constant (e.g. `CHEST_JIGGLE = true`) disables the whole effect.

**Ask First:** Any change to `js/game.js`, `js/player.js`, `js/shell.js`, `index.html`, or the view contract; any addition of dependencies; any jiggle on body parts other than the two chest boxes.

**Never:** Sim-core changes (frozen tests pin `updatePlayer`'s return shape — a sim-side spring is forbidden); physics libraries; anatomical geometry/textures; per-frame allocation in `render()`; reading `performance.now()`/`Date` in the renderer; anything visible in HUD or audio.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Jump launch | `vy` steps 0 → ≈ +350–850 | Boxes lag downward, overshoot, settle ≈ 0.5–1 s | N/A |
| Landing | `vy` steps ≈ −500 → 0 | Opposite-direction overshoot, settles | N/A |
| Idle branch | `vy` = 0 sustained | Spring decays to rest; boxes flush with torso | N/A |
| Trip (`status: 'over'`) | `vy` = 0 after landing | Spring settles naturally into the freeze posture | N/A |
| Reduced motion | `reducedMotion: true`, any `vy` | Offsets pinned to 0 every frame | N/A |
| Hand-built view | `player.vy` undefined/NaN | Treated as 0; no NaN writes to positions | Defensive coercion |

</frozen-after-approval>

## Code Map

- `js/render3d.js` — sole edit target. Rig build: `torsoGroup` (~L159–165) is the mount parent; `torso` box front is at local z ≈ +0.12, center y ≈ 0.2. Animation write-site: `render()` (~L344+); `playerY`/squash handling (~L369–372) shows the established read pattern; juice section (~L435+) shows the `view.now`-delta closed-form precedent.
- `js/player.js` — reference only: `vy` semantics (jump sets vy 350–850; gravity 1800; landing zeroes it).
- `js/shell.js` — reference only: view payload construction (~L420) confirms `player` passes through whole.

## Tasks & Acceptance

**Execution:**
- [x] `js/render3d.js` -- add `CHEST_JIGGLE` constant, two chest-box meshes parented to `torsoGroup`, one shared spring state pair (offset, velocity) integrated in `render()` from `vy` deltas; write offsets to the box positions -- renderer-only cosmetic per boundaries.

**Acceptance Criteria:**
- Given a running game, when the player jumps or lands, then the two chest boxes visibly bounce and settle within ~1 s.
- Given the game idles for 2+ s, when observed, then the boxes are motionless and flush with the torso.
- Given reduced motion is on, when jumping, then the boxes never move.
- Given `CHEST_JIGGLE = false`, when the game runs, then no jiggle meshes exist or move.
- Full Node test suite passes byte-identical (frozen-test discipline); `git diff --name-only` shows only `js/render3d.js` (plus this spec) changed.

## Verification

**Commands:**
- `node --test tests/` -- expected: 143/143 pass, no test files modified.
- `git diff --stat` -- expected: only `js/render3d.js` modified.

**Manual checks:**
- `python3 -m http.server` → open game → jump repeatedly: wobble on launch + landing, settles; idle screen shows no motion; `?`-free URL unaffected. Toggle reduced motion: jiggle frozen.

## Suggested Review Order

**The gag itself**

- All five tuning knobs plus the kill switch, with the snap-quantum rationale that sized them.
  [`render3d.js:28`](../../js/render3d.js#L28)

- Two rose boxes on the chest front; appended LAST on `torsoGroup` so the frozen pose probes' child indices stay honest.
  [`render3d.js:232`](../../js/render3d.js#L232)

**The spring**

- Closure scalars — the sanctioned stateful exception to the juice closed-form rule.
  [`render3d.js:378`](../../js/render3d.js#L378)

- Integration block: outside the status branches so idle/trip decay; reduced-motion zeroes at the write site (UI-02 parity).
  [`render3d.js:470`](../../js/render3d.js#L470)

- The kick — opposite the vy delta: launch lags down, gravity drips hang-time lift, landing snaps back.
  [`render3d.js:482`](../../js/render3d.js#L482)

- The clamp review added: bounds `leadIn` vy teleports on resume/restart/pick.
  [`render3d.js:484`](../../js/render3d.js#L484)
