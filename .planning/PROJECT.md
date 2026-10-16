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
- ✓ Draw-layer replacement: Canvas 2D shell swapped for a WebGL shell that reads the same immutable simulation state each frame — Phase 1 (`js/shell.js`, `js/render3d.js`)
- ✓ Simulation core preserved: pure functions, injectable randomness, Node-testable — no gameplay logic inside the render layer — Phase 1 (ARCH-01/02, boundary test in `tests/boundary.test.js`)

### Active

- [ ] PS1-style 3D presentation: Three.js (via CDN) rendering the simulation state at low internal resolution with vertex snapping, flat shading, and dithering
- [ ] Original low-poly character (skipping figure) and a small stylized stage — not a Scarlet lookalike
- [ ] Card catalogue: expand the upgrade set from 4 effect multipliers into a real catalogue with rarity, stacking rules, and clearer card identity
- [ ] SFX and a looping vibe track via WebAudio (no beat-lock; rope stays free-running)

### Out of Scope

- Between-run meta progression (unlocks, persistent currency) — deferred; in-run cards are enough for this cycle
- Beat-locked soundtrack / rhythm-synced rope phase — big design change, no beat-lock chosen for this cycle
- Multiplayer, leaderboards, accounts — web-static game, no server component
- Mobile app / native packaging — static web is the delivery target
- Faithful reproduction of Scarlet Skips' card list, story beats, or characters — spirit, not letter

## Context

- Brownfield: working prototype (~20 commits) with zero npm dependencies, pure functional core / imperative shell architecture (see `.planning/codebase/`).
- Reference game: *Scarlet Skips* — 1-button jump-rope roguelike, Steam, Sept 2026; research pulled from Steam/wiki/aggregator pages.
- The repo's zero-dependency rule is deliberately broken once: Three.js loaded via CDN (`import` from a pinned URL or vendored file). Simulation core must stay dependency-free.
- Known architecture notes from the codebase map: dual state-init paths in `js/game.js` (`phase: 0.33` duplication) and inline `Math.random` in `tickRun` are worth fixing when the shell is rewritten.

## Constraints

- **Tech stack**: Three.js via CDN for rendering only — keeps deployment static-file-only, no build step
- **Architecture**: simulation core stays pure and framework-free; WebGL layer never feeds back into game logic
- **Performance**: PS1 aesthetic is a feature — low internal render resolution, no post-processing beyond simple dithering
- **Delivery**: static files only (any static host; still no server component)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Demake the *spirit*, not the letter | Own the design; avoid cloning card lists/story | — Pending |
| Low-end 3D (PS1-style) over 2D | Player pull toward PS1 demake aesthetic; low-poly look is cheap to render | — Pending |
| Three.js via CDN | Pragmatic WebGL; breaks zero-dep rule once, contained to the render shell | ✓ Working — importmap-pinned `three@0.186.1`, full run playable through WebGL shell (Phase 1) |
| Deeper in-run cards, no meta progression | Roguelike depth without long-term balance burden this cycle | — Pending |
| SFX + music without beat-lock | Keep rope phase as free canonical clock; audio follows gameplay | — Pending |
| Original character/stage | Avoid Scarlet lookalike; demake of the idea, not the IP | — Pending |

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
*Last updated: 2026-10-16 after Phase 1*
