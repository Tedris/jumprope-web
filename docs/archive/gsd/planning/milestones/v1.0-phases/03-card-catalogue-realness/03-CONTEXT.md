# Phase 3: Card Catalogue Realness - Context

**Gathered:** 2026-10-17
**Status:** Ready for planning

<domain>
## Phase Boundary

The pick-two moment becomes a real decision: an expanded (6–10+ cards), balanced original catalogue with at-a-glance card identity (name/icon/role color) and rarity that affects drop odds; per-card stack caps with dead-pick-free offers; a working choose-1-of-2–3 input flow in this one-button game; and an owned-cards icon strip HUD during the run. Verified by a 1000-tick headless scripted-card simulation (no NaN, rope phase in safe wrap bounds, one score event per cycle). No audio/juice (Phase 4), no pause/resize hardening (Phase 5).

Requirements: CARD-01 … CARD-07.

</domain>

<decisions>
## Implementation Decisions

### Card picking input (discussed in depth)
- **D-01:** Picking uses a **cycling cursor** over the 2–3 offered cards — the only scheme that stays true to the one-button design on both keyboard (space) and touch (pointer). — **Reversibility:** costly — the input reducer, choose-state UX, and HUD all shape themselves around this gesture; swapping to arrow-key selection later touches all three.
- **D-02:** **Press = cycle** to the next card (wraps around past the last card, uniform behavior); **hold = confirm** the highlighted card. No auto-cycle timer — picking is deliberate, never timing-pressure.
- **D-03:** Confirm hold is a **dedicated ~0.8 s hold**, deliberately distinct from the jump-charge hold curve, with a **visible fill/progress cue** on the highlighted card so the gesture reads as "committing" without a tutorial.
- **D-04:** Offers display via the **existing low-res HUD text channel** (shell prompt text through the PS1 buffer): one line per offer, cursor marker on the active card, hold-fill cue on it. Rejected: in-scene 3D plaques (240p text legibility risk) and DOM overlay cards (breaks one-render-path/PS1-pixel consistency).
- **D-05:** Confirm feedback: the highlighted line **flashes once**, then the run re-enters via the lead-in — the re-entry itself reads as "picked, here we go". No picked-card banner, no added delay.
- **D-06:** On confirm, the run resumes through the **same lead-in re-entry as a cold start** (`startRun` semantics: rope back to `START_PHASE` 0.33 with the 0.1-hold lead-in jump, ~0.43 s to the feet window) instead of unfreezing mid-swing — every card pick lands into a known safe rhythm window. — **Reversibility:** costly — this is the player's post-pick timing contract; an in-place resume would change the feel of every pick and re-train muscle memory.
- **D-07:** **Input is locked during the post-pick lead-in re-entry** — a stray confirm-hold must never leak into an early jump charge; the first press after re-entry completes charges a normal jump.

### Researcher/planner domain (not user-decided)
- **Rarity model & offer economy:** exact common/uncommon/rare weights, filtering when stack caps shrink the pool below the offer count, offer size (2 vs 3) policy — researcher/planner's call within CARD-03/05.
- **Stack-cap values, owned-card tracking model, icon strip presentation** — planner's call; must stay pure/Node-testable and follow the `*Mul` effects convention or document new effect fields.
- **Catalogue roster (6–10+ cards, margin/volume/risk/foundation/pace roles)** and the STATE.md flag: the rope-phase **wrap fix must precede any ropeMul-stacking card**; the "extra ropes" multi-window card is **spike-or-defer** inside this phase (CARD-08 is v2 — likely defer, but the wrap-bound safety in criterion 5 is not optional).
- **Where the pick state machine lives** (sim `status: 'choose'` extended vs shell-only reducer) — planner's call, respecting the purity invariant.

### the agent's Discretion
- Exact flash duration, cursor marker glyph, fill-cue rendering mechanics, cycle order of offers, hold-threshold tuning within ~0.8 s ± feel.

### Reviewed Todos (not folded)
- **"Bring back a proper 3D jump rope to the WebGL scene"** (`.planning/todos/pending/2026-10-16-bring-back-a-proper-3d-jump-rope-to-the-webgl-scene.md`) — reviewed; already delivered in Phase 2 via D-08–D-12 (rotating rope arc). No Phase 3 work needed; todo can be closed.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project direction
- `.planning/PROJECT.md` — constraints (pure core, Three.js render-only, static delivery) and Key Decisions (original cards, demake-the-spirit)
- `.planning/REQUIREMENTS.md` — CARD-01 … CARD-07 (this phase's requirements); CARD-08/09/10 are explicitly v2/deferred
- `.planning/ROADMAP.md` §Phase 3 — the five success criteria, incl. the 1000-tick headless scripted-card sim gate
- `.planning/STATE.md` §Blockers/Concerns — rope-wrap fix must precede ropeMul-stacking cards; extra-ropes spike-or-defer decision

### Prior phase context
- `.planning/phases/01-render-shell-foundation/01-CONTEXT.md` — locked sim/shell split, injected-rng DI, single startRun path
- `.planning/phases/02-ps1-presentation-scene/02-CONTEXT.md` — PS1 look decisions (240p internal res, dither, moody palette) that constrain HUD legibility; D-13 no-asset procedural visuals

### Existing code to extend
- `js/upgrades.js` — current 4-card catalogue, `pickTwo(upgrades, rng)`, `shouldOfferUpgrade(skips)` cadence — the core to generalize (rarity, caps, filtering)
- `js/game.js` — `startRun`/`createRun`/`tickRun`/`applyUpgrade`; `run.offer`, `run.effects`; the lead-in re-entry (D-06) maps onto `startRun` semantics (`START_PHASE = 0.33`, `jump(createPlayer(), 0.1)`)
- `js/shell.js` — choose-state handling (`js/shell.js:61-77` currently auto-applies `offer[0]` — the "never silently offer[0]" debt), input reducer, HUD prompt text
- `tests/upgrades.test.js`, `tests/game.test.js` — API surface that existing tests pin; new tests allowed, existing behavior contracts respected

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pickTwo(upgrades, rng)` (`js/upgrades.js:16`) — DI-for-randomness already established; generalize to rarity-weighted, cap-filtered `pickOffers(pool, rng)` in the same style.
- `startRun()` (`js/game.js:8`) — the exact lead-in re-entry sequence D-06 requires; post-pick resume should route through this same code path (ARCH-02 single-path rule).
- `run.effects` multiplier record + `apply: s => ({...s, ...})` endofunctions (`js/upgrades.js`) — extend with per-card `cap`/`rarity`/`role`/`color`/`icon` metadata fields.
- Shell HUD prompt channel (`js/shell.js:76-77` → `render3d` text) — the display surface D-04 extends with per-offer lines, cursor, and fill cue.

### Established Patterns
- Pure `create*`/`update*`/predicate modules returning new state; all randomness via injected `rng` — offer generation must be deterministic under a seeded stub in tests (boundary.test.js greps the sim graph for `Math.random`).
- `status: 'choose'` freeze already exists in the run state machine; the pick state machine extends it rather than bypassing it.
- `*Mul` effect-field naming convention (CONVENTIONS); named exports only; no new npm deps.
- `render3d.js` sole `three` importer — HUD stays in the existing low-res text path, not new 3D geometry.

### Integration Points
- `js/upgrades.js` — catalogue expansion + rarity/cap metadata + offer filtering
- `js/game.js` — choose-state transitions, lead-in re-entry after pick, owned-cards record on `run`
- `js/shell.js` — pick-mode input (press=cycle / hold=confirm / re-entry lock) replacing the `offer[0]` auto-apply, offer HUD lines
- `js/render3d.js` — only if the flash/fill cue needs render-side support beyond the prompt string

</code_context>

<specifics>
## Specific Ideas

- The pick flow should feel like an intentional breath in the rhythm: freeze → browse with the cursor → commit hold with fill → flash → the familiar cold-start lead-in carries you back in. Same ~0.43 s to first feet-window as a fresh run.
- Wrap-around cycling keeps every press meaningful (never a dead press at the end of the list).

</specifics>

<deferred>
## Deferred Ideas

- Card-pick SFX for the confirm gesture — Phase 4 (AUD-01).
- Rarity-weight shift with skip count (CARD-09) and extra-ropes multi-window cards (CARD-08) — v2 per REQUIREMENTS.md.
- Pick-screen accessibility beyond the low-res text channel (reduced-motion flash dampening) — Phase 5.

### Reviewed Todos (not folded)
- "Bring back a proper 3D jump rope to the WebGL scene" — delivered in Phase 2; reviewed and closed here, not re-opened.

</deferred>

---

*Phase: 03-card-catalogue-realness*
*Context gathered: 2026-10-17*
