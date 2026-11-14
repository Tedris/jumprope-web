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
overrun world; see "v3 Direction" below — candidate material; v3 planning
opened 2026-11-12.

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

## Current State — v2 complete; Epics 7–8 shipped (2026-11-12)

v1.0 shipped 2026-10-22 (details below, kept for provenance). v2 delta ran on
BMAD epics: **Epics 1–6 done** — every story shipped, gate-proven, frozen-test
discipline held throughout (6.1 summit gate **0.142 in band**; 6.2 real
tunables; 6.3 **CARD-09 CLOSED**; 6.4 docs & success-metrics pass).
**Epic 7 (The Peel, META-01) done 2026-11-11** — meta ledger, outcome
counters, catalogue locks, unlock cards + PS1-voice announce, meta-aware
balance prove (gate 566→606). **Epic 8 (Player Fuel) done 2026-11-12** —
skins-as-data seam, no-chrome equip surface (`?skin=`), JSON-manifest mods
(`?mods=`, cosmetic-only v1 schema), the `.glb` joint-name spike **ACCEPTED**
(contract published; feature shelved per FR38), and the zero-product-code
prove (gate 606→701). The **v2 deploy/UAT pass ran 2026-11-12**
(`docs/uat-v2-deploy-2026-11-12.md`): cut `master` @ `029ca8c`, sandbox lanes
green; hardware lanes L1–L3 **RUN 2026-11-12** (owner: Ed — desktop PC +
Pixel 7 Pro, owner-reported) with one named carry: the 2020-era
integrated-GPU class unverified (laptop check pending). Gate: **701/701 Node
tests @ ~8.5 s**. **v3 PLANNING OPENED 2026-11-12** (Ed) by recorded
override of the playtest gate — A5 unplayed, carried as a live risk; the
laptop check for the 2020-era iGPU class (A1 carry) stays open too.

## v3 Direction — The Training Saga (brainstormed 2026-11-10; CONSUMED by GDD v3 retarget 2026-11-12)

**Status (2026-11-12): CONSUMED — the GDD is retargeted to v3 design-intent**
(`gdds/gdd-jumprope-web-2026-10-27/gdd.md`, decision-log Session 5); epics
9–16 proposed there. Epic 7 shipped 2026-11-11 as the minimal Peel
(counter-gated unlocks, no currency); the saga below is now design intent,
with Session 5 refinements recorded at each divergence.
The playtest gate (A5) was **overridden by Ed 2026-11-12**: v3 design
proceeds unplayed; the fun-proof may still be collected mid-v3 and rides
as a live risk until it is.

Full session log: [`brainstorming-session-2026-11-10.md`](../brainstorming-session-2026-11-10.md).
Locked decisions as brainstormed — divergences (shadow re-cast law,
stations-by-threshold, dungeon-as-day-type) live in the GDD decision-log:

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
  grow — refined 2026-11-12: a corner may be re-cast with a newer day or
  retired; the shadow stays frozen at its latest casting). Sim-core purity
  holds — shadows are replays, not AI.
- **Interface stays three objects:** gym (progress as room-wear), diary
  (tutorial voice, later retinted into the System panel), TV (infomercials →
  news → the player's name). Re-semantization over new UI: nothing new,
  everything reinterpreted.
- **Architecture watch:** the day clock and world sim are meta-layer only —
  the rope phase stays the canonical sim clock (Non-Goals unchanged).

## v3 Candidate — Model Skins: Full-Body Player Fuel (decided 2026-11-12)

**Status (2026-11-12, Ed): candidate, in planning** — same override as the
Training Saga (A5 playtest unplayed; A1 RUN-with-carry). Closes the Epic 8
retro's A4
keep/retire question with disposition KEEP (Open Items row below). The 8.4
spike proved the joint-name contract; this candidate promotes the shelved
feature, reframed from recolor-overlay to full replacement:

- **Full model, not a recolor:** an external `.glb` replaces the skipper's
  meshes entirely. Palette skins (8.1–8.3) stay as shipped — a separate,
  shallower tier.
- **Same physics, guaranteed:** model skins are puppets on our bones — the
  bound model is posed by the phase-clock pipeline through the 17-name
  joint contract (epics.md:142 stays in force); zero sim-core delta.
  Arbitrary-skeleton retargeting is NOT in scope.
- **PS1-era detail:** polygon budget raised for model skins — order ~2k
  triangles ("Lara Croft detailed"); exact ceilings belong to the
  architecture/epics pass, asserted with the spike's both-sides-derived
  budget-leg pattern.
- **NFR10 restated, not repealed:** the shipped product remains zero-bitmap;
  mod-supplied models MAY embed small textures under hard caps
  (dimensions/size/count), nearest-sampled, no mipmaps — FR38's documented
  amendment path, paid by the 8.4 spike outcome.
- **Trivial from Blender:** native `.glb` only (Blender's built-in exporter,
  zero converters); the contract ships as an importable template (named
  empty hierarchy at the contract origins) so joint names/origins are never
  hand-authored.
- **Silent to players, loud to authors:** player-facing failures keep total
  silence (NFR16); authors get mod-apply console diagnostics (bound/unbound
  names, cap verdicts), no new UI. Console lane CONFIRMED by Ed
  2026-11-12 (ASSUMPTION retired).

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
| P2-EQUIP | Equip mechanism for skins/mods (FR39, Epic 8 Player Fuel) | **ANSWERED — 2026-11-12 (user, Story 8.2 kickoff, AC1):** URL query param — `?skin=<name>` read shell-side at boot against a shipped built-in skin table; unknown/garbage values play shipped defaults with total silence (NFR16/UX-DR2); **non-persisted** — persisting a choice needs its own STOP-AND-ASK (retro :58 fourth-key tripwire); zero new key bindings, zero extra requests (NFR14). Detail + reasons in `8-2-equip-without-a-menu-the-no-chrome-surface.md` |
| P1-MANIFEST | Manifest schema + patchable field-set (FR36, Epic 8 Player Fuel) | **ANSWERED — 2026-11-12 (user, Story 8.3 kickoff, AC1):** COSMETIC-ONLY field-set — schema v1 is exactly `{ v: 1 (required), name (string 1..64, the mod's display name — inert), skin? (the `{name, colors:{rose,prop,limb}}` record, colors integers 0..0xFFFFFF) }`; ANY gameplay-parameter key is a schema violation (band-gate rider untriggered — Story 8.5 cites the 7.5 record); ANY violation (unknown key, wrong type, out-of-range color, oversized payload >64 KiB, parse error) drops the WHOLE manifest to shipped defaults with total silence (NFR16/UX-DR2 — no half-applied cosmetics by construction); the loader resolves the `?mods=<path>` param ONLY under `mods/` (one file, one `JSON.parse`, shell-side — the data-only law: nothing fetched is ever evaluated or imported), zero requests with no param (NFR14). Detail + reasons in `8-3-mods-are-data-the-json-manifest-surface.md` |
| GLB-A4 | Keep-or-retire the shelved `.glb` model-skin feature (Epic 8 retro A4; FR38) | **RESOLVED — 2026-11-12 (Ed):** **KEEP** — promoted to the v3 candidate "Model Skins: Full-Body Player Fuel" (section above): full model replacement on the same physics, PS1-era detail budget, restated NFR10, trivial Blender import; in v3 planning (OPEN 2026-11-12 by recorded override). The 17-name joint contract stays in force meanwhile (epics.md:142) — rig renames remain breaking contract changes |

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
