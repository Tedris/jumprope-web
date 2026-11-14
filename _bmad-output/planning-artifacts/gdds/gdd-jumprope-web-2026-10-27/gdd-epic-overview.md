# Development Epics — Jumprope Web (v2: The Ascent — SHIPPED; v3: The Training Saga)

Detailed companion to the Epic Structure summary in `gdd.md`. Stories are
high-level; `gds-create-epics-and-stories` decomposes them into acceptance
criteria later.

## Sequencing

Epic 1 gates everything; 2 and 3 are then parallel (both need rope-HP state,
neither needs the other), and 4 needs 2. Epics 5–6 overlay/finish. A shippable
milestone exists after 1+2+3 (single-scene winnable game) — the ladder (4) is
what makes it "the ascent".

---

## Epic 1 — Ropes as HP

Multiple ropes as health; trip economy replaces instant death.

- **1.1** Sim: rope-count state (1–5), N ropes sweeping one phase clock at
  even phase offsets; every rope's feet-window pass scores a skip.
- **1.2** Trip resolution: buffer → strip one rope (fastest — decided
  default) → grant i-frames for 1 full revolution → death only at last rope.
- **1.3** i-frame semantics: duration one pass per rope held (constant real
  time across rope counts); during i-frames no rope scores and none can trip.
  A trip strips the fastest rope.
- **1.4** Renderer: N rope geometries (sag-baked, phase-posed), rope-count HUD
  pips, strip flash + i-frame visual.
- **1.5** Tests: trip matrix (rope count × buffer × i-frame), multi-pass
  scoring, determinism with injected rng.

## Epic 2 — Altitude & the Win

Height becomes the score's shadow and the win condition.

- **2.1** Sim: altitude accrual per cleared pass (as-built `2.5 u × pass
  score`),
  jump-peak tracking vs current area ceiling, ascend transition, summit win
  expressed as a distinct run outcome value (invalid/done states stay data).
- **2.2** Win/lose presentation: moon-jump beat (hitstop + stinger), win
  screen with run stats, best-altitude persistence.
- **2.3** HUD: altitude readout + ceiling marker ("next break at …").
- **2.4** Renderer: ascend palette/horizon flip (single-scene version — one
  ceiling, one break look).
- **2.5** Tests: peak-crossing math (hold length × floatMul → peak), win at
  summit vs ascend mid-run, persistence.

## Epic 3 — Rule-Changing Cards

The CARD-08 backlog, given the ladder's grammar.

- **3.1** Sim: Spare Rope (+1 rope, cap 4 offers, max 5 ropes), Steel Cord
  (charge state on one rope; trip consumes charge not rope), Second Wind
  (mid-air jump, resets on ground contact, cap 2), Launch Heels (launch ×1.1
  stack, cap 3).
- **3.2** Offer integration: rarities (uncommon/uncommon/uncommon/common per
  GDD tables), dead-pick filtering honors new caps, synergy watch-list
  (Wind-Up × rope count pass-frequency guardrail).
- **3.3** Pick UX: card text for state-changing effects, number-key picker
  (1/2/3) — shipped Story 3.5; GDD assumption #2 retired.
- **3.4** Renderer/HUD: rope-charge pip (Steel Cord), double-jump dust tell.
- **3.5** Tests: each card's state transition + cap edge, Second Wind reset
  semantics, Steel Cord vs last-rope death interaction ordering.

## Epic 4 — The Ascent Ladder

Five altitude tiers; the win becomes a place.

- **4.1** Data: area table (ceilings, palette, fog, rope-period multiplier
  ×1.00/.95/.88/.82/.76 — tuned by Story 6.2, `616eb6c`), area-enter state.
- **4.2** Sim: ascend routes to next area (period multiplier applies on the
  phase clock, never re-clocks it).
- **4.3** Renderer: per-area vistas from cheap primitives (silhouettes, fog,
  palette) — pillar-3 budget.
- **4.4** Win moved to summit ceiling (area 5) — area 1–4 breaks ascend only.
- **4.5** Tests: area transition matrix, period-multiplier effects on buffer
  decay windows.

## Epic 5 — Feel & Fidelity

New verbs get the feel-first treatment v1 gave the base loop.

- **5.1** Audio: ascent stinger, win fanfare (procedural), rope-strip thud,
  last-rope mix tension pass (character TBD — GDD NOTE #4).
- **5.2** Juice: i-frame significance pass, strip shake/hitstop scaled to
  rope count, last-rope vignette (cosmetics only). Extend, don't replace:
  new events (strip, ascend, win) join v1's existing hitstop/shake/particle
  significance tiers on the same scale.
- **5.3** Reduced-motion audit for all new states (i-frames, ascend flip,
  win sequence) — judgment untouched, cosmetics dampened.
- **5.4** Pause/visibility/blur lifecycle covers i-frames and win state
  (shared release/resume path extended, not duplicated).

## Epic 6 — Balance & Prove

- **6.1** Headless-sim balance gate v2: policy bot over the ascent economy;
  summit-reach band 5–20%; altitude-per-skip and ceiling ladder replaced with
  tuned values.
- **6.2** Offer pacing (CARD-09): offer cadence revisited under skip-keyed
  climb needs (folded in here per GDD).
- **6.3** Card pick-rate telemetry review (local-only) — no dead cards.
- **6.4** Docs/PRD update: win/loss, ropes-as-HP, areas promoted from this GDD
  into `prd.md`; WR-02 housekeeping lands opportunistically in render3d
  touches.

---

# v3 Development Epics — The Training Saga (added 2026-11-12)

Companion to the v3 Epic Structure in `gdd.md`. Epics 1–8 above are the
shipped baseline (7 The Peel and 8 Player Fuel shipped — details in
`../../epics.md`). Stories are high-level; `gds-create-epics-and-stories`
decomposes them into acceptance criteria later.

## v3 Sequencing

9 gates the saga; 10 builds on the day, 11 on stats; 12 (the world) opens
act two; 13 needs the board (12) and feeds 14, which also needs 10's
recordings; 15 is author-facing and independent; 16 finishes. Playable
milestones: after 9 (a rope day inside a day), after 11 (full act-one
mask), after 13 (the reveal and the first real danger), after 14 (the
poster-shot end-state = the completion statement).

## Epic 9 — The Day Skeleton

A day exists: rope-only, but it is born, lived, and composted.

- **9.1** Sim: day state machine (dawn → active → nightfall), stamina
  pool drained by rope beats, voluntary sleep transition; immutable
  transitions, injectable rng.
- **9.2** Sim: nightfall compost — ephemeral build + rope outcomes
  (skips/summit/trips) convert into the four-stat ledger under per-day
  caps; diary line; the VIT bump ("tomorrow the day was longer").
- **9.3** Persistence: stats/ceilings/diary/day-recording save model;
  mid-day resume across sessions; storage-unavailable degradation; the
  lossless law as a testable invariant (nothing ever shrinks the save).
- **9.4** UI: diary (page-turn = nightfall); sleep as a diegetic room
  action; zero stat panels (wear comes online in 10).
- **9.5** Tests: day-state matrix, compost math, persistence roundtrip,
  lossless-law legs.

## Epic 10 — Activities & Stats

Three new corners, one verb each, and a growth engine that needs failure.

- **10.1** Sim: running/lifting/reading activity models (beats cadenced
  on the phase clock per pillar 2; intensity classes; failure textures:
  stumble / failed rep / dozing).
- **10.2** Sim: feeds 1:1 + 15% bleed; per-day caps; `cappedToday`;
  fail-cap; supercompensation ceiling raise (125% gate-bound).
- **10.3** Day-cards: the 12-card vocabulary as ephemeral cards, fired
  every 20 total beats, composted at nightfall; catalogue rules enforced.
- **10.4** Renderer/UI: station corners + walkover tap; room-wear
  ledger; sore-walk animation; dotted diary prophecy.
- **10.5** Tests: beat/drain matrix per activity; cap/ceiling curves;
  cross-station cadence; bleed map; day-replay determinism.

## Epic 11 — Life Cards & Milestones

The permanent layer: a life that edits its own rules at event beats.

- **11.1** Sim: milestone event bus (first failure per stat, first
  dungeon clear, awakening, RANK debuts) — each fires exactly once.
- **11.2** Sim: life-cards — permanent, non-repeating, pick-two;
  choreographies, habits (dual-stream drain), stat emphases; auto-pick
  card defined late-gated.
- **11.3** Capability thresholds → station-arrival vignettes ("okay, I
  can also do this"); no new verbs.
- **11.4** Tests: milestone once-only; habit dual-drain; rule-change
  effects; a rule leg proving no life-card grants raw stat points.

## Epic 12 — The World Layer

The world arrives through three objects, never a menu.

- **12.1** Sim: gate generation + board lifecycle; hunter tick (~1
  off-screen clear/day, gate-bound); hidden RANK derivation; LEVEL store.
- **12.2** TV ladder: infomercials → weather/sports → the news interrupt
  (act-two opener) → chyron slots; TV audio channel; the joke-channel
  stop for the news.
- **12.3** In-world debuts: E-rank chyron, INT-scaled corkboard rows
  (comps/hidden rooms/rewards/tips), the "LV 1" hook at the door, and the
  **stat-panel rename** — the diary's mundane tallies (skips/km/kg/pages)
  re-title into System stat lines at the news.
- **12.4** Tests: board determinism under injected rng; tick legs; TV
  phase machine; INT monotonicity on board rows.

## Epic 13 — Dungeons & Tap-Fighting

The first thing that ever hurt — priced in time only.

- **13.1** Sim: dungeon day-type transition (commits the day);
  tap-fight model (HP, dodge timing off the rope grammar); eject as
  data-outcome; same-day gate lockout; LEVEL payout.
- **13.2** Renderer: the impossible door; stage reskin (palette-flip +
  fog); danger-bed audio variants; the eject beat.
- **13.3** Narrative dependency: first-fight emotion-targeting pass
  gates final HP/beat numbers.
- **13.4** Tests: eject/lockout matrix; loss touches no stat
  (lossless-law leg); day-commit transition.

## Epic 14 — Shadows & Automation

The past moves into the room and keeps training.

- **14.1** Sim: day recording (seed + inputs, bounded budget) +
  bit-exact replay engine; shadow ≡ replay purity leg.
- **14.2** Sim: the awakening; cast / re-cast / retire from diary days;
  SHADOWS knob; nightfall bank of frozen outputs.
- **14.3** Shadow posts: manual-first gates only; battle-shadows replay
  their fight-days; frozen-output invariance legs.
- **14.4** Renderer: desaturated mini-figures; montage LODs as the
  documented frame-budget exception (counts design-uncapped).
- **14.5** The late auto-pick life card (opt-in; the last verb automated).
- **14.6** Tests: replay bit-exactness; cast/recast/retire transitions;
  post legality; bank-at-nightfall math.

## Epic 15 — Model Skins

Full-body puppets for authors; silence for players.

- **15.1** Renderer: `.glb` load on the 17-joint contract; binding to
  the phase-posed rig; importable Blender template ships.
- **15.2** Caps: tri/texture ceilings + author console diagnostics; the
  NFR10 amendment legs.
- **15.3** Tests: contract conformance both-sides budget legs (8.4
  pattern); nothing-equipped byte-identical pin (FR37 extended).

## Epic 16 — Balance & Prove

- **16.1** Headless day-economy gate: day-length envelope (≈5 min day 1,
  10–15 steady), ceiling-growth curves, policy-bot day behavior.
- **16.2** Tune the gate-bound first-passes: bleed map, drain classes,
  ceiling step, hunter tick, RANK weights, cadence.
- **16.3** Success-metrics pass incl. the A5 fun-proof collection
  (live-risk closure).
- **16.4** Docs/PRD: saga facts promoted into `prd.md` current state.
