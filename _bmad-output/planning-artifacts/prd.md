# PRD: Jumprope Web — PS1-Style Rope-Jump Roguelike Demake

> Carried forward from GSD planning (v1.0 milestone, shipped 2026-10-22).
> Raw GSD artifacts: [`docs/archive/gsd/planning/`](../../docs/archive/gsd/planning/)
> (PROJECT.md, ROADMAP.md, MILESTONES.md, RETROSPECTIVE.md, milestone details).

## Product Vision

A browser-based, one-button jump-rope roguelike in the spirit of *Scarlet Skips*
(Yerk Games, 2026) — a demake of the idea, not a clone. An original low-poly
character skips rope in a dithered, vertex-wobbling PS1-style 3D scene; runs are
punctuated by pick-two upgrade cards.

**Core value:** One button, one rope, one perfect rhythm loop — the jump-timing
feel must be joyful before anything else works.

## Goals

- One-button hold-to-jump with variable jump height, joyful timing feel.
- PS1-style low-end 3D presentation (low internal resolution, vertex snapping,
  flat shading, Bayer dithering) — the aesthetic is a feature, not a shortcut.
- In-run roguelike depth via a pick-two upgrade card catalogue.
- Instant play: static files only, no build step, no server, no accounts.

## Non-Goals

- Between-run meta progression (unlocks, persistent currency) — deferred to v2
  (META-01).
- Beat-locked soundtrack / rhythm-synced rope phase — the rope stays the free
  canonical clock.
- Multiplayer, leaderboards, accounts — static web delivery.
- Native/mobile packaging — static web is the delivery target.
- Faithful reproduction of Scarlet Skips' cards, story, or characters — spirit,
  not letter.

## Current State — v1.0 Shipped (2026-10-22)

5 phases / 18 plans / 42 tasks; 22/22 v1 requirements complete; 42+ Node tests;
~5,656 LOC. Delivered:

- **Simulation foundation:** pure sim core (`js/game.js`, `js/rope.js`,
  `js/player.js`, `js/upgrades.js`) — immutable state transitions, injectable
  rng, fixed timestep 1/120 s, Node-testable; run state machine
  idle → running ↔ choose → over with best-score persistence via localStorage.
- **Render-shell split:** three-file architecture — pure `game.js` / impure
  `shell.js` / sole-`three` renderer `render3d.js`; boundary enforced by the
  import-graph fence in `tests/boundary.test.js`. Three.js pinned via importmap
  (`three@0.186.1`), render shell only.
- **PS1 presentation:** 240-row Nearest render target, screen-space vertex
  snap, sRGB-then-Bayer/15-bit final pass; original low-poly chibi skipper rig
  (head/limbs/scarf chain) and sag-baked rotating rope posed purely from the
  phase clock.
- **Card catalogue:** 8 original cards / 5 roles with rarity, per-card stacking
  caps, dead-pick filtering, owned-card HUD, offer size 2→3 past skip 30,
  balance proven by a 1000-tick headless-sim gate.
- **Feel + audio:** ~0.1 s input buffer on the phase clock, near-miss callouts
  with streak bookkeeping, significance-scaled juice (hitstop/shake/particles);
  five procedural WebAudio SFX voices on a master bus, gesture-lifecycle
  AudioContext, persisted mute/volume, no beat-lock.
- **Accessibility & polish:** pause (P/Esc) and hidden-tab handling with one
  shared `releaseEverything()`/`resumeRun()` path, `prefers-reduced-motion`
  dampening cosmetics only (judgment unchanged), aspect-correct letterbox
  resize.

## Open Items (Active Backlog)

| ID | Item | Status |
|----|------|--------|
| TRACK-1 | Looping music track file at `audio/track.ogg` | Mechanism shipped and test-pinned (Phase 4); content deferred at UAT (backlog Phase 999.1) |
| WR-02 | Reduced-motion idle pose still animates arms/scarf off wall-clock `beat` (`js/render3d.js:387`) | Known debt — one-line fix |
| CARD-08 | Rules-beyond-multipliers cards | v2 candidate, spike-gated |
| CARD-09 | Escalating offer pacing | v2 candidate |
| META-01 | Between-run meta progression | v2 candidate |

## Constraints

- **Tech stack:** Three.js via CDN for rendering only; static-file deployment,
  zero npm dependencies, no build step.
- **Architecture:** simulation core stays pure and framework-free; the WebGL
  layer never feeds back into game logic (fence test enforces).
- **Performance:** low internal render resolution, no post-processing beyond
  simple dithering.
- **Testing:** deterministic, seeded-rng Node test suite (`node --test tests/`);
  frozen-test discipline — existing test files stay byte-identical, new
  behavior gets new test files.

## Key Decisions (carried from v1.0)

| Decision | Rationale |
|----------|-----------|
| Demake the spirit, not the letter | Own the design; avoid cloning card lists/story |
| Low-end 3D (PS1-style) over 2D | Player pull toward the demake aesthetic; cheap to render |
| Three.js via CDN, render shell only | Pragmatic WebGL; the one dependency break is fenced |
| In-run cards, no meta progression this cycle | Roguelike depth without long-term balance burden |
| Audio follows gameplay, no beat-lock | Rope phase stays the canonical free-running clock |
| One shared handler per cross-cutting concern | `releaseEverything` / `resumeRun` / `snapGridFor` instead of per-path duplication |

## Next-Milestone Questions (for PM/analyst agents)

- Which v2 candidates to promote (CARD-08/09, META-01), and in what order?
- Does TRACK-1 (music content) stay a backlog item or become a milestone task?
- Is WR-02 fixed as housekeeping or folded into the next touch of `render3d.js`?
