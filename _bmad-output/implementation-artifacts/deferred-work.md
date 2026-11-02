# Deferred Work

## Deferred from: code review of story 1-1-multi-rope-simulation-core (2026-11-01)

- **Buffer-forgiven pass bypasses the offer check** (`js/game.js` buffer branch) — a forgiven 10th skip increments `skips` with no `shouldOfferUpgrade` check, deferring the offer to skip 20 (`% 10 === 0`). Byte-identical to v1; Story 1.2 rewrites the adjacent trip branch — decide there whether to add the check.
- **Rising-edge crossing blind spots** (`js/rope.js` / `js/game.js` crossing loop) — (a) a tick whose phase increment exceeds the 0.1-wide window silently drops the crossing (no score, no trip); (b) resuming with a rope's window already active grants that rope one non-lethal revolution — at `ropes: 5` the canonical `leadIn` phase 0.33 lands inside rope 1's window. Unreachable at shell step sizes with one rope; multi-rope widens the phase coverage to N×0.1 of the circle. Relevant to Stories 1.2 (trip resolution) and 1.5 (input-hygiene parity proof).
- **`atFeet`/`atFeetOffset` mod-1 domain change** — derived phase now uses `% 1`, so out-of-domain inputs (`phase ≥ 1` after a pathological `updateRope` wrap, or negative phase) report window membership where v1 returned false. Normalize with `((x % 1) + 1) % 1` if this code is ever revisited.
- **Offer cadence + streak escalation scale with rope count** — first offer ≈1.85 revolutions at N=5; `CLOSE! ×N` callouts accumulate N× per revolution. Assigned to Epic 6 (balance pass) by GDD §163-186.
- **`run.ropes` clamp is at-read only** — invalid values are never normalized into the record; Story 1.3's HUD must re-apply `clampRopes` rather than render the raw field.
