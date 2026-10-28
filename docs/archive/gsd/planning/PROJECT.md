# Jumprope Web — PS1-Style Rope-Jump Roguelike Demake

## What This Is

A browser-based, one-button jump-rope roguelike in the spirit of *Scarlet Skips* (Yerk Games, 2026) — a demake, not a clone. The existing vanilla-JS Canvas prototype (`js/game.js` and friends) is evolved into a low-end 3D PS1-style game: an original low-poly character skipping rope in a dithered, vertex-wobbling scene, with runs punctuated by pick-two upgrade cards.

## Core Value

One button, one rope, one perfect rhythm loop — the jump-timing feel must be joyful before anything else works.

## Requirements

### Validated

- ✓ One-button hold-to-jump mechanics with variable jump height — existing (`js/player.js`)
- ✓ Phase-driven rope model with feet-window scoring — existing (`js/rope.js`)
- ✓ Fixed-timestep pure simulation core, testable in Node — existing (`js/game.js`, `tests/`)
- ✓ Pick-two upgrade offers every 10 skips with effect multipliers — existing (`js/upgrades.js`)
- ✓ Run state machine (idle → running → choose → over) with best-score persistence — existing (`js/game.js`)
- ✓ Draw-layer replacement: Canvas 2D shell swapped for a WebGL shell that reads the same immutable simulation state each frame — v1.0 Phase 1 (`js/shell.js`, `js/render3d.js`)
- ✓ Simulation core preserved: pure functions, injectable randomness, Node-testable — no gameplay logic inside the render layer — v1.0 Phase 1 (ARCH-01/02, boundary test in `tests/boundary.test.js`)
- ✓ PS1-style 3D presentation: Three.js (via CDN) rendering the simulation state at low internal resolution with vertex snapping, flat shading, and dithering — v1.0 Phase 2 (PRES-01, `js/render3d.js`)
- ✓ Original low-poly character (skipping figure) and a small stylized stage — not a Scarlet lookalike — v1.0 Phase 2 (PRES-02/03, `js/render3d.js`)
- ✓ Card catalogue: 8 original cards / 5 roles with rarity, stacking caps, dead-pick filtering, owned-card HUD, headless-sim balance gate — v1.0 Phase 3 (CARD-01..07, `js/upgrades.js`)
- ✓ Feel layer: forgiving input buffer on the phase clock, near-miss callouts, significance-scaled juice (hitstop/shake/particles) — v1.0 Phase 4 (FEEL-01..03, `js/game.js`, `js/shell.js`, `js/render3d.js`)
- ✓ SFX via WebAudio: five procedural voices, gesture-lifecycle, master bus, persisted mute/volume, no beat-lock (rope stays free-running) — v1.0 Phase 4 (AUD-01..04, `js/audio.js`)
- ✓ Accessibility & polish: pause/hidden-tab state+audio handling (P key, visibilitychange/blur/focus guards), OS reduced-motion support (wobble/shake dampened, judgment unchanged), aspect-correct letterbox resize keeping the low-res UI legible — v1.0 Phase 5 (UI-01..03, `js/shell.js`, `js/render3d.js`, `css/style.css`)

### Active

- [ ] Looping vibe track file at `audio/track.ogg` — mechanism shipped and test-pinned in Phase 4; content deferred to backlog Phase 999.1 during Phase 4 UAT
- [ ] v2 candidates surfaced during v1.0: rules-beyond-multipliers cards (CARD-08, spike-gated), escalating offer pacing (CARD-09), between-run meta progression (META-01) — see archived REQUIREMENTS v2 list

### Out of Scope

- Between-run meta progression (unlocks, persistent currency) — deferred; in-run cards are enough for this cycle
- Beat-locked soundtrack / rhythm-synced rope phase — big design change, no beat-lock chosen for this cycle
- Multiplayer, leaderboards, accounts — web-static game, no server component
- Mobile app / native packaging — static web is the delivery target
- Faithful reproduction of Scarlet Skips' card list, story beats, or characters — spirit, not letter

## Context

- **Shipped v1.0** (2026-10-22): 5 phases, 18 plans, 42 tasks; ~5,656 LOC across `js/` + `tests/` (ES modules, zero npm deps besides CDN-pinned `three@0.186.1`). Archive: `.planning/milestones/v1.0-ROADMAP.md`.
- Architecture today: pure sim core (`js/game.js`, `js/rope.js`, `js/player.js`, `js/upgrades.js`) + impure shell (`js/shell.js`) + sole-`three` renderer (`js/render3d.js`) + `js/audio.js`; boundary enforced by `tests/boundary.test.js` import-graph walk.
- Test suite: 42+ Node tests, deterministic (seeded rng injection), incl. 1000-tick headless-sim balance gate.
- Known debt / open items: Phase 5 WR-02 (reduced-motion idle pose still animates arms/scarf off wall-clock `beat`, `js/render3d.js:387` — one-line fix); backlog Phase 999.1 (music track file `audio/track.ogg`); `audio/track.ogg` mechanism shipped, content missing.
- Reference game: *Scarlet Skips* — demake of the spirit, original character/cards/stage.

## Constraints

- **Tech stack**: Three.js via CDN for rendering only — keeps deployment static-file-only, no build step
- **Architecture**: simulation core stays pure and framework-free; WebGL layer never feeds back into game logic
- **Performance**: PS1 aesthetic is a feature — low internal render resolution, no post-processing beyond simple dithering
- **Delivery**: static files only (any static host; still no server component)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Demake the *spirit*, not the letter | Own the design; avoid cloning card lists/story | ✓ Working — original character/stage/8-card catalogue shipped (v1.0) |
| Low-end 3D (PS1-style) over 2D | Player pull toward PS1 demake aesthetic; low-poly look is cheap to render | ✓ Working — signed-off PS1 pipeline shipped (Phase 2) |
| Three.js via CDN | Pragmatic WebGL; breaks zero-dep rule once, contained to the render shell | ✓ Working — importmap-pinned `three@0.186.1`, full run playable through WebGL shell (Phase 1) |
| Deeper in-run cards, no meta progression | Roguelike depth without long-term balance burden this cycle | ✓ Working — 8-card catalogue proven balanced; META-01 deferred to v2 |
| SFX + music without beat-lock | Keep rope phase as free canonical clock; audio follows gameplay | ✓ Working — procedural SFX + free-running rope; track file deferred (Phase 999.1) |
| Original character/stage | Avoid Scarlet lookalike; demake of the idea, not the IP | ✓ Working — low-poly skipper + stage shipped (Phase 2) |
| `pickOffers` canonical; `pickTwo` shim | Keep frozen distinct-pair test green while the offer generator grows past pairs | ✓ Working (Phase 3) |
| Offer size 3 beyond skip 30, 2 before | Escalating variety late-run without diluting the first offer's read | ✓ Working (Phase 3) |
| ropeMul capped per-card, never per-frame | Stacked speed cards stay inside the ~15.6s rope-wrap blackout bound by construction; `js/rope.js` untouched | ✓ Verified by sim gate (Phase 3) |
| One shared releaseEverything() for all interruption paths | blur/pointercancel/hidden-leg share one release; arms releaseIntent only when 'running' with a live hold — no phantom jumps, no silent restarts from 'over' | ✓ Pinned by tests (Phase 5) |
| Audio resumes only on player-initiated routes | `audioReady && !paused` guards on focus/visible-branch gestures; a browser event never un-suspends a player-paused context | ✓ Pinned red-green (Phase 5, CR-01) |
| Reduced motion dampens cosmetics, never judgment | snap grid via ONE shared snapGridFor() helper; wobble/shake stilled, rope timing identical; flag never persisted (D-06) | ✓ Verified (Phase 5) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-22 after v1.0 milestone*
