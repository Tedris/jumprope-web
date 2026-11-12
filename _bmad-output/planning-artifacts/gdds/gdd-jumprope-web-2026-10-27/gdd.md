---
title: Jumprope Web — PS1-Style Rope-Jump Roguelike Demake
game_type: roguelike
platforms:
  - Web browser (desktop + mobile browsers, static files)
created: 2026-10-27
updated: 2026-10-28
---

# Jumprope Web - Game Design Document

**Author:** Ed
**Game Type:** Roguelike
**Target Platform(s):** Web browser (static files, no install, no server)

> **Design posture:** This GDD states **design intent** for the game as it is
> being evolved. Shipped **v1.0 (2026-10-22)** is the current implementation
> state; deltas from it are marked *v1.0 today* vs *target design*. v1 facts
> carry exact numbers from the simulation code.

---

## Executive Summary

### Core Concept

A one-button, browser-playable rope-jump roguelike. The player skips rope in a
dithered, vertex-wobbling PS1-style scene; every jump-timing is a life-or-death
beat on the rope's clock. Upgrades add **ropes** (which double as health),
**jump power**, and **scoring multipliers**. Skips convert into **altitude**;
punching a jump through an area's ceiling ascends the player to the next area.
Breaking the summit ceiling of the fifth area wins the run. Tripping while down
to a single rope ends it.

It is a demake in the spirit of *Scarlet Skips* (Yerk Games, 2026) — the
mechanical idea, re-derived, never a copy of its cards, story, or characters.

### Target Audience

Browser dwellers who like instant, in-the-pocket games: roguelike run-chasers
and rhythm/arcade feel-seekers who will tolerate a page-load in exchange for
zero install. [ASSUMPTION: not directly specified by the designer; inferred
from delivery model and design lineage.]

### Unique Selling Points (USPs)

1. **One button, N ropes.** Single-input purity stretched across a
   rope-count health economy — the simplest possible control with real
   build tension behind it.
2. **Height is the map.** Score, progression, upgrade strategy, win condition,
   and level structure are one number: how high can you get.
3. **PS1 as truth, not filter.** The low-end look (240-row render, vertex
   snap, Bayer dithering, flat shading) is the game's body — cheap to run,
   instantly evocative, and the aesthetic *is* the pitch.
4. **Instant play.** Static files only. No build step, no account, no server.

---

## Goals and Context

### Project Goals

- Make the jump-timing feel joyful before anything else works (v1-proven;
  keep it proven with every new mechanic).
- Evolve the loop from endless-best-score into a **winnable vertical
  roguelike**: rope-as-HP, area ascent, summit win.
- Deepen the card catalogue from pure multipliers to **rule-changing cards**
  (extra rope, double jump, reinforced rope) — the CARD-08 backlog item, now
  given a spine.
- Stay a capability-proof demake that owns its design: *spirit, not letter*.

### Background and Rationale

The designer played Scarlet Skips and asked a simple question: *could I make
that, at least a simple version?* That curiosity — not a market gap — is the
project's root. v1.0 shipped as an as-faithful-to-the-feel-as-a-static-web-page
allows: one-button physics, an 8-card multiplier catalogue, procedural WebAudio
SFX, and a PS1 shader pipeline, all behind a pure, deterministic sim core.

A deliberate demake-ethics line emerged in v2 planning: **no beat-locked
soundtrack**, because syncing the rope to music would track too closely to
Scarlet Skips. The rope stays a free-running clock (also a pillar — see
Core Gameplay). v1.0's open v2 candidates (CARD-08 rule-changing cards, CARD-09
offer pacing, META-01 meta progression) remain, but this GDD gives them a
direction: the ascent ladder.

Homage posture (**adopted 2026-11-06**): the reference stays **structural** —
one button, ropes as risk, pick-one-of-N, one climbing number — and never a
quoted card name, card text, or copied effect wording from Scarlet Skips. Our
cards keep their own voice (`Spare Rope`, `Steel Cord`, `Second Wind`); their
published wording ("add a jump-rope") is research input, not copy to reuse.
Same principle as the no-beat-lock line above: spirit, not letter.

---

## Core Gameplay

### Game Pillars

1. **One button, one rhythm.** Every mechanic must be playable with a single
   button. Depth comes from *when* you press, never from *which* key.
   Decides: no double-input combos; extra jumps are timing skills, not new
   keys.
2. **The rope is the clock.** The rope's 0→1 phase is the canonical time for
   scoring, forgiveness windows, pose, and audio. Nothing may re-clock it —
   no beat-lock, no scripted cut-away. Decides: the no-music-sync line,
   phase-clock buffer decay, and area tuning expressed as rope-period
   multipliers.
3. **PS1 as truth.** If a feature can't be rendered in the low-end aesthetic,
   the feature is wrong or the aesthetic grows a documented exception.
   Decides: blocky physics gags over cloth sim; baked rope sag; strict
   palette/dither consistency; area vistas as cheap geometry + palette shifts.

Traceability: every mechanic below serves the loop *and* at least one pillar;
anything that can't cite one is scope creep and gets cut.

### Core Gameplay Loop

**Moment-to-moment (1.3 s):** rope sweeps → jump over the feet-window or spend
a rope → cleared skip adds score → score converts to altitude.

**Run (3–5 min):** start with 1 rope → every 10th skip, freeze and pick one
upgrade card → build toward both a taller jump (to break ceilings) and enough
altitude (to reach them) → ropes are lost to trips; the last rope makes every
pass sudden death → break the summit ceiling → win.

**Meta (indefinite):** die, keep best score/altitude plus the outcome counters
(furthest area, summits, lifetime skips), retry with a different build.
(Between-run *progression* — META-01 — shipped as Epic 7: the counters gate
catalogue-branch unlocks; see Persistence and Out of Scope.)

### Win/Loss Conditions

- **Loss:** a trip (feet below clearance with no forgiveness buffer available)
  while holding exactly **1 rope**. With ≥2 ropes, a trip costs one rope and
  grants **i-frames for one pass per rope held** — the swings pass through you
  (see Rope HP). [Decision recorded: a trip strips the fastest rope; default
  stands unless overturned in tuning.]
- **Win:** a jump whose peak altitude exceeds the ceiling of the current area
  when the current area is the **summit** (area 5). Mid-run ceiling breaks
  ascend to the next area, they don't win.
- No other endings. No "you win the game" outside a run; the summit is the
  game's completion statement.

---

## Game Mechanics

### Primary Mechanics

**Jump (v1.0 today, unchanged at target).** Fixed sim step 1/120 s. Launch
velocity `350 + min(hold, 0.5 s) × 500` (350–600 u/s) against gravity 1800 u/s²
reduced proportionally by hang-time cards. Tap peak ≈ 34 u / 0.39 s airtime;
full-hold peak ≈ 100 u / 0.67 s. No coyote time; landing is instant-grounded.
Clearance: at the rising edge into the feet window (phase 0.45–0.55), height
must be ≥ the **clearance threshold** — 18 u, lowered by clearance-window
cards (to ≈ 16.4 u at their best).

**Score (exact; the economy's root).** Each cleared pass earns
`(1 + additive bonuses) × score-multiplier` points: base 1 pt/pass; Golden
Handle adds +1 additive per copy; Lucky Tally ×1.15, Wide Brim −0.25, and
Wind-Up +1 are the multiplier-side modifiers. Near-miss and mercy-saved passes
score the same as clean passes. **v2 unification: score *is* altitude** — one
number on the HUD, one number recorded (see Height & ascent); this replaces
v1's separate score/altitude bookkeeping.

**Mercy buffer (v1.0 today, unchanged at target).** A jump press arms a
0.10 s buffer; a would-be trip with a live buffer becomes a scored near-miss.
The buffer decays on the rope's phase clock, so faster rope = smaller real-time
window. One shared mercy; rope-HP does not replace it.

**Rope HP (NEW — v2 core).** The player holds 1–5 ropes. All ropes sweep the
same phase clock at even phase offsets, so with N ropes the feet-window occurs
N times per revolution: **each pass is a scored skip** (climb faster) and
**a fresh trip risk**. Trip resolution: buffer → ropes (lose 1, then i-frames)
→ dead if last rope. i-frames last **one pass per rope held** (N passes = a
constant blank in real time regardless of rope count). During i-frames no rope
scores and none can trip — a true blank on the clock. A trip strips the
**fastest** rope (decided default: preserves the gentlest remaining state).
Ropes are simultaneously the health bar, the multiplier, and the difficulty
dial — **confirmed 2026-11-06:** rope count *is* the climb-rate multiplier,
measured **sub-linear** at 1.00 / 1.97 / 2.92 / 3.84 / 4.73 × the one-rope rate for
N = 1…5. `extrarope` therefore buys survival and throttle in a single pick and
is deliberately the loudest card in the catalogue; its brakes are timing load
(N windows per revolution, a miss costing a rope *and* a blank revolution) and
the offer frequency — a trip lever, not a difficulty dial (§Economy, Story 6.3)
— never a score penalty (Catalogue rules 2).

**Height & ascent (NEW — v2 core).** Altitude **is** score, at **2.5 u** per
point: `altitude += 2.5 × scoreMul` (as-built, `js/game.js:42,182`) — point-generating
multipliers compound into the climb, and the run records one number
(best-altitude subsumes v1's best-score). Jump peak = area base altitude + jump
height; peak crossing a ceiling **ascends** (visual: rope, palette, and horizon
change). Area ceilings (as-built ladder, Story 6.2 sweep-derived): **250 / 600 /
900 / 1,350 / 2,100** u (`js/areas.js:16-32`). As-built pacing: at 2.5 u/pt the
bare base to the 2,100 u summit is 840 points (`altitude += 2.5 × scoreMul` per
pass); score-adding stacks lower the pass count — the **binding** pacing
constraint is the wall-clock gate (NFR9), measured medSum 290.8/279.9/297.2 s
(Story 6.2 batch). Pacing note: with N ropes, passes accrue N× per revolution,
so skip-keyed
gates (offers, ladder) advance N× faster in revolutions — multi-rope builds
compress *wall-clock* run time; the 3–5 min target is wall-clock and is the
balance gate's constraint. Every area break is a *moon-jump moment*, telegraphed
by the HUD ceiling marker.

**Near-miss & streak (v1.0 today).** A cleared skip with crossing height under
`1.5 × clearance threshold` (base band 18–27 u), or any mercy-buffer save, is
a near-miss; streak counts consecutive close calls and decays on a comfortable
clear. The near-miss callout display persists; with N ropes passing per
revolution, callouts coalesce to one per revolution (no spam). Purely
expressive in v1 — kept as the tension readout for last-rope play.

**Cards (v1.0 today = 8 multiplier cards; target adds 4 rule-changing cards).**
Offers fire on every 10th skip; pick **one of 2** (one of 3 after skip 30);
draws are rarity-weighted (70/25/5 common/uncommon/rare), distinct per offer,
capped cards filtered out. The owned-card HUD (shipped in v1) persists and
must surface state-changing cards — rope count, cord charges, double-jump
state — alongside the multiplier stack. v1 catalogue (exact):

| ID | Name | Role | Effect (multiplicative unless noted) | Rarity | Cap |
|---|---|---|---|---|---|
| `float` | Cloud Shoes | foundation | hang time ×1.15 | common | 4 |
| `slowrope` | Heavy Rope | pace | rope speed ×0.9 | common | 3 |
| `feather` | Featherweight | foundation | hang time ×1.05 | common | 5 |
| `multi` | Golden Handle | volume | +1 pt/pass (additive) | uncommon | 3 |
| `window` | Wide Stance | margin | clearance threshold −9% (18 → 16.4 u) | uncommon | 3 |
| `tally` | Lucky Tally | volume | pass score ×1.15 | uncommon | 3 |
| `widebrim` | Wide Brim | margin | clearance threshold −17%, −0.25 pt/pass | uncommon | 2 |
| `windup` | Wind-Up Handle | risk | rope speed ×1.12, +1 pt/pass | rare | 2 |

Target additions (rule-beyond-multiplier; numbers first-pass, to be balanced):

| ID | Name | Role | Effect | Rarity | Cap |
|---|---|---|---|---|---|
| `extrarope` | Spare Rope | HP | +1 rope (max 5 total) | uncommon | 4 |
| `reinforce` | Steel Cord | HP | one rope gains a charge: survives one trip (up to 2 charged ropes at once) | uncommon | 2 |
| `doublejump` | Second Wind | mobility | 1 mid-air jump per ground contact | uncommon | 2 |
| `highjump` | Launch Heels | mobility | jump launch velocity +10% | common | 3 |

*Why these numbers exist:* Second Wind ×2 is the ceiling-breaker answer for
players farming peak height; Spare Rope is the only direct HP gain, and its offer
frequency is a **trip lever, not a difficulty dial** — faster offers land
`extrarope` earlier → past-2-ropes strip → MORE deaths, LOWER summit rate
(non-monotone; the 6.3 escalated-%6-after-30 check measured 0.0333, out-low —
shipped pacing untouched, `js/upgrades.js:105-112`); Wind-Up remains the risk
rare, now deadlier *and* more rewarding under multi-rope.

**Catalogue rules (adopted 2026-11-06).** These bind every row above and every
row added later:

1. **One axis, one card.** No two cards may sell the same axis at two strengths
   unless the weaker is an explicit cap-extension tier and reads as one. The v1
   table breaks this on three axes — hang time (`float`/`feather`), pass score
   (`multi`/`tally`), forgiveness (`window`/`widebrim`) — which lands two
   same-axis cards in one offer on 16.25% of pick-of-2 draws and 46.20% of
   pick-of-3 draws (exact weighted enumeration on the 8-card v1 pool). Launch Heels
   joins the hang/peak axis, predicted to take pick-of-3 to 39% — the widening
   never materialized: the shipped 12-card pool (post-3.1, rule-changers as
   axis-singletons) measures **7.07% / 20.54%** — collisions DROPPED
   (`tests/balance.test.js:387-399`).
2. **No upgrade reduces the score.** Hard rule, implicit costs included — score
   *is* altitude (FR5), so a points cut and a slower rope are both climb cuts.
   Measured over a trip-free 10 s headless window, policy bot, neutral baseline
   16 u: Golden Handle +100%, Wind-Up +125%, Lucky Tally +15%, Heavy Rope −13%,
   **Wide Brim −25%**; Cloud Shoes (+15% peak), Featherweight (+5% peak) and
   Wide Stance move climb *rate* not at all — they buy ceiling headroom and
   clearance. Two cards violate the rule today: `widebrim` (literal subtraction)
   and `slowrope` (rate loss). Re-cost in Epic 3, numbers set by the Story 2.5
   harness.

**Controls and Input.**

- **Jump:** Space / Enter / pointer-down anywhere. Hold for height. *The only
  gameplay input.*
- **Card pick:** pointer/tap on a card, or 1/2/3 keys — `Digit1/2/3` confirm
  offers (shipped, Story 3.5; `js/shell.js:344`; ASSUMPTION retired).
- **Pause:** P or Esc (with full input-release hygiene; shared
  release/resume path).
- **Mute/volume:** key-driven — `Mute` / `−` / `=` — plus the pause-menu sound
  button + volume readout (Story 5.7), persisted (`js/shell.js:314-316,787-790`).
- Accessibility: `prefers-reduced-motion` damps cosmetics only — judgment and
  timing are never altered.

---

## Roguelike Specific Design

### Run Structure

- **Run length:** 3–5 min to summit on a competent build; 1–3 min typical
  death. Skip count is the pacing clock (offers, escalation, ceiling ladder).
- **Starting conditions:** 1 rope, 1.3 s rope period, phase 0.33 lead-in with
  an auto-launched 0.1 s-hold jump so the first pass is catchable; no cards.
- **Difficulty scaling:** never automatic in v1 — *target design keeps the
  engine hands-off*: difficulty is **player-chosen** (rope-speed cards,
  added ropes) plus **area pressure** — each area applies an escalating rope
  period multiplier (as-built: ×1.00 / 0.95 / 0.88 / 0.82 / 0.76 — summit base
  period 1.3 × 0.76 ≈ **0.99 s**, `js/areas.js:16-32`; tuned via the Story 6.2
  sweep — ASSUMPTION retired: the designer tuned it through the gate; the old
  ≈ 1.10 s note was the ×0.85 placeholder's math).
- **Victory:** summit ceiling break (see Win/Loss). Runs are winnable; that is
  the v2 correction to endless v1.

### Procedural Generation

- **What is random:** card offers only — weighted, distinct-per-offer,
  availability-filtered draws. The rope path, area geometry, and ceiling
  ladder are fully deterministic and identical every run. [NOTE FOR DESIGNER:
  deliberately not procedural *levels*; the arena is a stage, the cards are
  the system.]
- **Seed system:** none at gameplay level. Randomness is injectable and
  deterministic under test; a player-facing daily-seed or replay-seed is a
  later candidate, not v2.
- **No enemies, no biomes-as-levels.** The rope is the only hazard; areas are
  altitude tiers, not generated spaces.

### Permadeath and Progression

- **Permadeath:** trip with one rope = run over; all cards, ropes, effects,
  streak reset. Final altitude is the final score (one number).
- **What persists:** best altitude (subsumes v1's best score), audio
  settings, and the meta ledger — outcome counters `{furthestArea, summits,
  skips}` (Epic 7) — in on-device storage that degrades to session-only when
  unavailable. That is the entire persistence surface.
- **Meta-progression:** **shipped as Epic 7 (META-01)** — unlocks gated by the
  outcome counters; no currency, no prestige. Unlock conditions: a zero
  counter (fresh) session locks exactly the three catalogue-branch cards —
  the v2 catalogue, whole from first load; they unlock at furthestArea ≥ 2
  (reach), summits ≥ 1 (summit), lifetime skips ≥ 1000 (persistence).

### Item and Upgrade System

- **Types:** all passive, in-run, instantly applied on pick. No actives, no
  consumables (Steel Cord's charge is a state, not a button).
- **Rarity:** common 70 / uncommon 25 / rare 5 weights; caps enforce build
  boundaries (see card tables).
- **Synergies (load-bearing, for balance watch):** ropes × rope-speed
  (exponential pass frequency — Wind-Up + 5 ropes is the "panic" build);
  jump/float stack → ceiling-break pacing; High Jump × Second Wind → max peak.
  Trap picks are off-design (Catalogue rules 2): no card pays in score.
- **Build variety goal:** every run's build is legible in one sentence ("I was
  fast-rope/low-rope", "I was climb build"). Dead-pick filtering keeps offers
  always meaningful.
- **Risk mechanics (re-costed 2026-11-06):** risk stays, the currency changes —
  nothing pays in score. Wind-Up Handle keeps paying score *for* speed (its cost
  is tripping); Wide Brim swaps `−0.25 pt/pass` for a hang-time or rope-speed
  cost; Heavy Rope must buy its forgiveness without losing climb rate. Story 2.5
  measures the neutral baseline the re-cost must clear. multi-rope still converts
  the late game into risk-management.

### Character Selection

- **One skipper, deliberately.** No unlockables, no stat differences; the card
  build *is* the character. Revisit only if META-01 promotes unlocks.

### Difficulty Modifiers

- **None.** No difficulty tiers, no curse/modifier runs, no challenge-mode
  achievements in scope. Difficulty emerges from picks × area pressure ×
  personal rope management. Achievement conditions: none in scope; best-score
  / best-altitude are the entire brag surface.

---

## Progression and Balance

### Player Progression

In-run only: skip count gates offers; offers mutate the run's rules; altitude
gates areas. Player skill (timing) and build (cards) are the two levers, and
both are needed for the summit — timing alone can't reach a 100-unit peak.

### Difficulty Curve

- Skips 0–30: single rope, gentle, teaching the near-miss language.
- Skips 30–60: first ropes gained; pass density climbs; player learns the
  i-frame rhythm.
- Skips 60–120: ceiling-break pressure — builds must commit (climb vs
  survive); area transitions land here.
- Skips 120–180: summit push, likely last-rope tense.
- Calibration gate: headless-sim balance runs (v1-proven technique, 1000-tick
  gate) re-run per tuning pass; summit reach rate for a "reasonable" policy
  bot is the balance master-dial.

### Economy and Resources

No currency. The economy is: **skips → altitude** and **trips → ropes**, with
cards as the exchange rate between them. The single most important tunable in
the game is altitude-per-skip (**2.5 u**, as-built — Story 6.2, `js/game.js:42`);
it sets run length against the ceiling ladder.

---

## Level Design Framework

### Level Types

Areas are altitude tiers of one continuous vertical space, not separate
levels: **Alley** (0) → **Rooftops** (250) → **Blimp Deck** (600) →
**Stratosphere** (900) → **Moon Approach** (1,350) → summit ceiling 2,100
(as-built ladder, `js/areas.js:16-32`). Each tier = palette + horizon geometry
+ rope-period multiplier; same stage, same rope grammar. Tier names SHIPPED AS
DRAFTED (code ids `alley/rooftops/blimp/stratosphere/moon-approach`); the
themepark never ran — flavor remains a designer candidate, not a rename.

### Level Progression

Strictly upward, one-way; ascent is a win-adjacent beat (stinger, hitstop,
palette flip). No backtracking, no side paths. A run visits at most 5 areas.

---

## Art and Audio Direction

### Art Style

PS1-truth: 240-row nearest-filter render target, screen-space vertex snap,
flat shading, sRGB→Bayer/15-bit dither pass; low-poly chibi skipper (head,
limbs, scarf chain) posed purely from the phase clock; rope geometry sag-baked.
Areas differentiate by palette, fog color, and silhouette geometry, not new
asset classes. **Art gag — RESOLVED (as-built):** the blocky spring-rigged
chest-jiggle **SHIPPED** — renderer-only boxy prop boxes on a damped spring,
behind the `CHEST_JIGGLE` switch (`js/render3d.js:22-32`; the cel-shading
alternative is retired; spec-chest-jiggle-physics, status done). The
*deliberately* lo-fi tone holds.

### Audio and Music

Procedural WebAudio voices on a master bus, gesture-gated AudioContext,
persisted mute/volume. **Audio follows gameplay; the rope is never beat-locked**
(pillar 2 + demake-ethics line). Skip ticks, near-miss stingers, rope-loss thud,
ascent stinger (new), win fanfare (new, procedural). Music track
(`audio/track.ogg`, TRACK-1) **SHIPPED** (Story 5.6): Ogg/Vorbis mono, 79.18 s
seamless loop, 97 BPM, zero rhythmic relation to the rope — pillar 2 intact;
nothing clocks the rope.

---

## Technical Specifications

### Performance Requirements

60 FPS sustained on low-end/integrated GPUs at the 240-line internal render
target; simulation timing stays frame-rate independent (exact step lives in
`architecture.md`); page-load to first jump under 2 s on broadband (static
files + one CDN module pin). New HUD/vista layers must land inside the
existing aspect-correct letterbox resize path — no layout bypass.

### Platform-Specific Details

Modern evergreen browsers (desktop + mobile) with WebGL; ES modules;
on-device storage that degrades to session-only when unavailable. No server
component ever. Code-level naming, state-machine encoding, and the
identifier↔design-term mapping (e.g. "hang-time multiplier" ↔ the code's
effect-field names) live in `architecture.md`, not here.

### Asset Requirements

All geometry procedural/inline; zero bitmap texture budget beyond palette
LUTs; audio voices procedural + one committed music loop (`audio/track.ogg`,
Story 5.6). Character rig stays a few hundred triangles (the jiggle shipped as
two prop boxes).

Player Fuel (Epic 8): mods and palette skins are DATA, not code — JSON manifests under `mods/` and three-material color records recolor the skipper with no geometry change and no new asset class (Stories 8.1–8.3, FR36/FR37); with nothing equipped the render is byte-identical to the Epic 7 state (FR37 regression pin, Story 8.5). `.glb` model skins: contract PROVEN, NOT wired — Story 8.4's spike verdict ACCEPTED (17 joint names, pose identity, probe 32 tris vs the shipped rig's 192, browser FPS median 16.7 ms) puts the feature on the shelf with NFR10's zero-bitmap rule NOT amended; any wiring ships only under its own authorized story (FR38).

---

## Development Epics

### Epic Structure

| # | Epic | Delivers | Depends |
|---|------|----------|---------|
| 1 | Ropes as HP | Multi-rope sim, trip-strips-rope, i-frames, last-rope death, rope HUD | v1.0 |
| 2 | Altitude & the Win | Altitude accrual, jump-peak vs ceiling, summit win state | 1 |
| 3 | Rule-Changing Cards | Spare Rope, Steel Cord, Second Wind, Launch Heels + offer/pick UX | 1 |
| 4 | The Ascent Ladder | 5 areas, ceiling-break transitions, area tuning multipliers, vistas | 2 |
| 5 | Feel & Fidelity | Ascent/win audio, i-frame juice, last-rope tension pass, reduced-motion for new states | 1–4 |
| 6 | Balance & Prove | Headless-sim balance gate for ascent economy, offer pacing (CARD-09 folded), docs | 1–5 |

Detailed breakdown and story-level decomposition: [`gdd-epic-overview.md`](gdd-epic-overview.md); dev-level stories: [`../../epics.md`](../../epics.md).
Sequencing note: epics 1–3 make a winnable, tense single-scene game on their
own; epic 4 (ladder) lands the full stated vision; 5–6 could not be skipped
per project history (feel-first pillar, frozen-test discipline).

---

## Success Metrics

### Technical Metrics

- 60 FPS at 240-row internal res on a 2020-era integrated-GPU laptop (human
  check + frame-timing capture).
- Full deterministic automated test suite green in under 10 s, with the
  sim/render boundary fence holding (no new mechanic may leak into the
  presentation layer's authority over game state).
- New mechanics ship with red-green test legs per project convention.

### Gameplay Metrics

Measured by playtest sessions and local-only run telemetry at most (no
server; anything stored stays in the browser):

- **The feel question:** do players smile at their own timing in the first
  30 s? (Non-negotiable gate inherited from v1.)
- Last-rope segments produce audible tension (observed, not inferred).
- Ceiling breaks land as *moments* — players describe the moon-jump unprompted.
- Build legibility: players can narrate their build in one sentence post-run.
- Summit reach: skilled-but-not-perfect testers reach the summit within ~5
  runs once epics 4–6 land; policy-bot summit rate in the 5–20% band.
- Card pick rates show no dead card (every card picked ≥30% when offered).
- No dominated duplicate: no card is strictly beaten by another card on the
  same axis (Story 2.5 climb-value report; same-axis offer collisions trending
  toward zero).
- No score-negative pick: every card's measured climb rate clears the no-pick
  baseline — literal subtractions and slower-rope rate losses alike.

---

## Out of Scope

- **Beat-locked music / rhythm-synced rope** — explicitly rejected: drifts the
  demake too close to Scarlet Skips (demake-ethics line), violates pillar 2.
- **Meta progression / unlocks / currency (META-01)** — unlocks SHIPPED as
  Epic 7 (outcome-counter gates; no currency). The *prestige* clause —
  permanent climb power — stays direction only: anything feeding climb power
  into run start enters as a named story decision with summit-gate evidence,
  catalogue-rule conformance, and the CARD-09 constraint (FR35).
- **Multiplayer, leaderboards, accounts, native packaging** — static delivery.
- **Faithful reproduction** of Scarlet Skips' cards, story, or characters.
- **Procedural levels, enemies, character select, difficulty modes** — declared
  in the genre sections above as deliberately absent.
- **Endless-after-summit mode** — plausible post-v2 (best-height chasing);
  undecided, logged below.
- Seeded/daily runs — deferred; rng determinism stays test-side only.

---

## Assumptions and Dependencies

**[ASSUMPTION] index (as-built, Story 6.4):**
1. Target audience inferred (not stated by designer). — standing designer lane.
2. ~~Number-key card picker assumed for target UX (not in v1.0).~~ — RETIRED:
   shipped Story 3.5 (`js/shell.js:344`).
3. ~~Per-area rope-pressure multipliers are an assistant proposal awaiting
   designer tuning.~~ — RETIRED: tuned via the Story 6.2 gate (`js/areas.js`).
4. Area names/themes (Alley→Moon Approach) shipped as drafted; themepark
   optional (`js/areas.js` ids).

**[NOTE FOR DESIGNER] items (as-built, Story 6.4):**
1. Endless-after-summit: yes/no/later. — genuinely open; standing designer lane.
2. Art gag — RESOLVED: blocky jiggle shipped (Art Style section, G12).
3. ~~Ceiling-ladder and altitude-per-skip placeholders (250/600/1k/1.5k/2.1k,
   2 u/pt) — first balance pass must replace.~~ — RETIRED: balance pass done,
   Story 6.2/6.3 gate-proven (as-built 250/600/900/1,350/2,100 @ 2.5 u/pt).
4. Last-rope audio mix — **closed-by-implementation (Story 5.2)**: taut
   double-tick 660+1320 Hz on the tension variant, material-only
   (`js/audio.js:191`); designer override lane stays open (D-N12).

**Dependencies:** v1.0 sim core (pure, injectable rng) extends cleanly;
Three.js CDN pin unchanged; frozen-test discipline applies — new mechanics get
new test files; balance gate reuses v1's headless-sim technique. Backlog IDs
(CARD-08/09, META-01, TRACK-1, WR-02) refer to the `prd.md` Open Items table.
