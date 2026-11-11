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

**Direction update (2026-11-10):** the thesis is now concretized by a
brainstorming session — the disguise is a *training montage* for a portal-
overrun world; see "v3 Direction" below, input to Epic 7.

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

## Current State — v2 complete (2026-11-10, Story 6.4 closes it)

v1.0 shipped 2026-10-22 (details below, kept for provenance). v2 delta ran on
BMAD epics: **Epics 1–5 done** — every story shipped, gate-proven, frozen-test
discipline held throughout. **Epic 6: 6.1** the policy-bot summit gate landed —
summit rate **0.142 in band** aggregate (0.150/0.150/0.125 per shape); **6.2** real tunables
retired the placeholders (ALT 2.5, ceilings 250/600/900/1,350/2,100, periods
1.00/.95/.88/.82/.76 — every-shape medSum 290.8/279.9/297.2 s); **6.3** the
**CARD-09 CLOSED** verdict with two-arm sweep evidence; **6.4** is the
docs & provenance pass + success-metrics execution (evidence: that story file).
Gate: 566/566 Node tests @ ~8.5 s. Next milestone: **v2 deploy/UAT + Epic 7,
The Peel (META-01)** — pinned.

## v3 Direction (Epic 7 input) — The Peel Takes Shape (brainstormed 2026-11-10)

**Status (2026-11-10, Ed): ON HOLD.** The current loop's fun must be
proven first (v2 deploy/UAT + playtesting) before Epic 7 is re-scoped
around this material; capture stays, no planning proceeds on it.

Full session log: [`brainstorming-session-2026-11-10.md`](../brainstorming-session-2026-11-10.md).
Locked decisions the Peel milestone must honor; candidate until epics/stories
are cut from them:

- **Premise:** the character was training all along for a world that goes
  portal-overrun late (Solo Leveling flavor); the game is the montage before
  its own genre's chapter one. The reveal lands through the world (a gym TV
  news break), never through the UI.
- **The day is the run:** activities (rope, running, lifting, reading — one
  tap, different choreography) share a stamina-budget day; in-day cards stay
  ephemeral and compost at nightfall into permanent stats; permanent
  milestones get lifetime pick-two "life cards."
- **Lossless law, refined:** failure never shrinks the save, but growth
  cannot happen without it — failing an activity caps that stat's day and is
  the only way to raise its long-term ceiling (supercompensation). v1's
  rope-pace escalation becomes the meta-growth engine.
- **Danger gradient:** training can't hurt; danger is dungeon-only (browse
  gates; other hunters clear them too; losing = teleport-out + time cost
  only). Dungeon Break = story scenario, never ambient punishment.
- **Stats are the engine:** STR gate / VIT = day length / AGI throughput /
  INT gate-board intel; hidden RANK + LEVEL debut in-world before any panel.
- **Shadows are past days:** the split/automation power converts prior days
  into deterministic replay-shadows (failure-days work best; shadows never
  grow). Sim-core purity holds — shadows are replays, not AI.
- **Interface stays three objects:** gym (progress as room-wear), diary
  (tutorial voice, later retinted into the System panel), TV (infomercials →
  news → the player's name). Re-semantization over new UI: nothing new,
  everything reinterpreted.
- **Architecture watch:** the day clock and world sim are meta-layer only —
  the rope phase stays the canonical sim clock (Non-Goals unchanged).

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
| TRACK-1 | Looping music track file at `audio/track.ogg` | **CLOSED** — file shipped with Story 5.6 (2026-11-09; first committed binary; sha/LUFS in `deferred-work.md` ledger) |
| WR-02 | Reduced-motion idle pose still animates arms/scarf off wall-clock `beat` (`js/render3d.js:387`) | **CLOSED** — fixed in Story 5.4 (2026-11-09): the `beat` gate at source, `js/render3d.js:575`; retired by Story 6.4 (2026-11-10) |
| CARD-08 | Rules-beyond-multipliers cards | **Promoted** — shipping as Epic 3 (FR12 rule-changing cards) |
| CARD-09 | Escalating offer pacing | **CLOSED** — Story 6.3 verdict: rejected at the 6.2 tunables — escalated %6-after-skip-30 measured 0.0333 out-low, 39/40 trips per shape (116/120 aggregate; 39/39/38 bare/ropeHeavy/chargeHeavy), no dead-card/legibility gain (15→14 dead cards, threshold noise; coverage 12/12 and topPickShare 0.155 unchanged); v1 pacing stands (FR10) — see 6-3-offer-pacing-verdict-card-09.md (2026-11-10) |
| META-01 | Between-run meta progression | **Pinned** — Epic 7 (The Peel), the milestone after epics 3–6 (2026-11-07, D-004); design direction established by the 2026-11-10 brainstorm — see "v3 Direction" above. **S1–S4 decided 2026-11-10 pre-loop:** unlocks + outcome-counter gates (no currency, no prestige), counters mapped reach/summit/skips, catalogue-branch unlocks, run-scoped band gate — detail in epics.md Epic 7. **7.4 kickoff answers 2026-11-11 (AC1, user):** S2 = outcome counters are the ONLY unlock currency — thresholds `furthestArea ≥ 2` (reach) / `summits ≥ 1` (summit) / lifetime `skips ≥ 1000` (persistence), measured at the 6.2 tuning; S3 = catalogue branch — three new cards, exactly one per counter family, tier-paired under the one-axis law (float/feather precedent); the alternate-skipper / character-select revisit clause (gdd.md:350-351) considered and DECLINED. Detail in 7-4-the-peel-unlocks-as-fiction-in-the-ps1-voice.md |

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
