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

**Thesis (v2): an incremental in disguise.** Jumprope opens as a humble
one-button rope-jump demake and escalates — upgrades, tech trees, more and
more — until the player can't quite believe where the gameplay has gone.
Surprise-by-escalation is the product; the demake is the disguise, not the
genre. (Adopted 2026-11-05; source: brainstorming session log.)

## Goals

- One-button hold-to-jump with variable jump height, joyful timing feel.
- PS1-style low-end 3D presentation (low internal resolution, vertex snapping,
  flat shading, Bayer dithering) — the aesthetic is a feature, not a shortcut.
- In-run roguelike depth via a pick-two upgrade card catalogue.
- Instant play: static files only, no build step, no server, no accounts.

## Non-Goals

- **Between-run meta progression (unlocks, persistent currency)** — the
  planned peel under the disguise thesis, now **pinned as Epic 7 (The Peel),
  the milestone immediately after the v2 epics 3–6** (2026-11-07, readiness
  audit D-004; was META-01 "v2 candidate").
- Beat-locked soundtrack / rhythm-synced rope phase — the rope stays the free
  canonical clock.
- Multiplayer, leaderboards, accounts — static web delivery.
- Native/mobile packaging — static web is the delivery target.
- Faithful reproduction of Scarlet Skips' cards, story, or characters — spirit,
  not letter.

## Current State — v2 in progress (as of 2026-11-07)

v1.0 shipped 2026-10-22 (details below, kept for provenance). v2 delta runs on
BMAD epics: **Epic 1 (Ropes as HP) done, Epic 2 (Altitude & the Win) done
2026-11-06** (5/5 stories, incl. the 2.5 balance harness); **Epic 3 in
progress** — Story 3.1 at review, 3.2–3.5 backlog; Epics 4–6 backlog with the
Story 6.1 policy-bot summit gate as the v2 exit criterion. Gate: 303/303 Node
tests green (readiness audit 2026-11-07,
[`docs/kickoff/readiness-audit-2026-11-07/`](../../docs/kickoff/readiness-audit-2026-11-07/)).
Next milestone after epics 3–6: **Epic 7, The Peel (META-01)** — pinned.

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
| TRACK-1 | Looping music track file at `audio/track.ogg` | **Owned** — Story 5.6 (Epic 5); mechanism shipped, story ships the file (2026-11-07, D-002) |
| WR-02 | Reduced-motion idle pose still animates arms/scarf off wall-clock `beat` (`js/render3d.js:387`) | **Owned** — Story 5.4 (Epic 5), folded in as its named fix |
| CARD-08 | Rules-beyond-multipliers cards | **Promoted** — shipping as Epic 3 (FR12 rule-changing cards) |
| CARD-09 | Escalating offer pacing | Owned — Story 6.3 verdict inside Epic 6 |
| META-01 | Between-run meta progression | **Pinned** — Epic 7 (The Peel), the milestone after epics 3–6 (2026-11-07, D-004) |

## Next-Milestone Questions — answered 2026-11-07 (readiness audit)

- v2 candidate promotion: CARD-08 → Epic 3 (in flight); CARD-09 → Epic 6
  verdict story; META-01 → pinned as Epic 7, next milestone after the summit gate.
- TRACK-1 became a milestone task: Story 5.6.
- WR-02 is folded into Story 5.4, not standalone housekeeping.

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

Answered 2026-11-07 — see "Next-Milestone Questions — answered" above and
`docs/kickoff/readiness-audit-2026-11-07/decisions.md` (D-002…D-004).
