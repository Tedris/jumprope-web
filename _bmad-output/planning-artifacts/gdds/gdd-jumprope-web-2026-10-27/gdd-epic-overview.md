# Development Epics — Jumprope Web (v2: The Ascent)

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
- **1.2** Trip resolution: buffer → strip one rope (fastest, pending design
  decision) → grant i-frames for 1 full revolution → death only at last rope.
- **1.3** i-frame semantics: duration one pass per rope held (constant real
  time across rope counts); during i-frames no rope scores and none can trip.
  A trip strips the fastest rope.
- **1.4** Renderer: N rope geometries (sag-baked, phase-posed), rope-count HUD
  pips, strip flash + i-frame visual.
- **1.5** Tests: trip matrix (rope count × buffer × i-frame), multi-pass
  scoring, determinism with injected rng.

## Epic 2 — Altitude & the Win

Height becomes the score's shadow and the win condition.

- **2.1** Sim: altitude accrual per cleared pass (`2 × pass score`, tunable),
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
  (1/2/3) — assumption #2 in GDD.
- **3.4** Renderer/HUD: rope-charge pip (Steel Cord), double-jump dust tell.
- **3.5** Tests: each card's state transition + cap edge, Second Wind reset
  semantics, Steel Cord vs last-rope death interaction ordering.

## Epic 4 — The Ascent Ladder

Five altitude tiers; the win becomes a place.

- **4.1** Data: area table (ceilings, palette, fog, rope-period multiplier
  ×1.0/0.96/0.92/0.88/0.85 — tuning-owned), area-enter state.
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
