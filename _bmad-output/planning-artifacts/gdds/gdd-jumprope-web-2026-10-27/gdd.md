---
title: Jumprope Web — PS1-Style Rope-Jump Roguelike Demake
game_type: roguelike
platforms:
  - Web browser (desktop + mobile browsers, static files)
created: 2026-10-27
updated: 2026-11-12
---

# Jumprope Web - Game Design Document

**Author:** Ed
**Game Type:** Roguelike
**Target Platform(s):** Web browser (static files, no install, no server)

> **Design posture:** This GDD states **design intent for v3 — The Training
> Saga**. Shipped **v2 (Epics 1–8, complete 2026-11-12)** is the current
> implementation state and the as-built baseline; *v1.0/v2 today* deltas
> carry exact numbers from the simulation code. v3 planning opened
> 2026-11-12 by recorded override of the playtest gate — A5 (fun-proof)
> rides as a live risk until collected mid-v3.
> Carried hardware risk likewise rides: the 2020-era integrated-GPU class
> is unverified (A1 RUN-with-carry, laptop check — owner: Ed).

---

## Executive Summary

### Core Concept

A one-button browser game that starts as a rope-jump demake and refuses to
stay one. The player trains — rope days (v2's ascent grammar, intact), then
running, lifting, reading: the same tap in different choreographies. **The
day replaces the run** as the unit of play: a stamina budget spent across
the corners of one PS1 gym, day-cards cadenced across all activities, and
at nightfall the day's ephemeral build **composts into permanent stats**.
Failure is the engine: failing an activity caps that stat's day and is the
**only** way to raise its long-term ceiling — safe play plateaus forever.
Then the world goes portal-overrun on the evening news and the montage
turns out to be chapter one's tutorial: dungeon days where losing only
costs time, and **shadows** — past days converted to replay themselves
forever. The save never shrinks; an incremental in disguise.

It is a demake in the spirit of *Scarlet Skips* (Yerk Games, 2026) — the
mechanical idea, re-derived, never a copy of its cards, story, or characters.

### Target Audience

Browser dwellers who like instant, in-the-pocket games: roguelike
run-chasers, rhythm/arcade feel-seekers, and — with v3 — idle/progression-
fantasy players who came for a joke and stayed for the montage. Zero
install is part of the promise to all three. [CONFIRMED 2026-11-12;
ASSUMPTION retired.]

### Unique Selling Points (USPs)

1. **One button, N ropes.** Single-input purity stretched across a
   rope-count health economy — the simplest possible control with real
   build tension behind it.
2. **Height is the map.** Score, progression, upgrade strategy, and level
   structure are one number: how high can you get (v2-baseline; v3 adds
   the day's stat ledger beside it — the summit became an in-day peak).
3. **PS1 as truth, not filter.** The low-end look (240-row render, vertex
   snap, Bayer dithering, flat shading) is the game's body — cheap to run,
   instantly evocative, and the aesthetic *is* the pitch.
4. **Instant play.** Static files only. No build step, no account, no server.
5. **One verb, four genres.** Rope game → life sim → raising sim → hero
   sim; the same tap plays all four. The game changes genres without ever
   changing controls.
6. **Failure is the only fertilizer.** A save that never shrinks but cannot
   grow without failure — supercompensation as the economy. The past runs in
   the corners of the room; only the player grows.

---

## Goals and Context

### Project Goals

- Make the jump-timing feel joyful before anything else works (v1-proven;
  keep it proven with every new mechanic).
- Land the escalation thesis: a rope-jump demake that escalates into an
  incremental in disguise — surprise-by-escalation is the product
  (adopted 2026-11-05).
- Deliver the Training Saga — days, stats, failure-as-fertilizer, the
  reveal arc, dungeons, shadows — without ever changing the verb.
- Keep the shipped v2 game playable *as act one*: the saga builds on the
  ascent grammar; it never replaces the rope.
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
Core Gameplay). All three of v1.0's open v2 candidates (CARD-08, CARD-09,
META-01) shipped with epics 1–8. v3's origin is different in kind: the
2026-11-10 brainstorming session concretized the "incremental in disguise"
thesis into **The Training Saga**, and v3 planning opened 2026-11-12 by
recorded override of the playtest gate — design proceeds unplayed, with
the fun-proof riding as a live risk until collected.

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
2. **The rope is the clock — layered, never re-clocked.** The rope's 0→1
   phase stays the canonical time for scoring, forgiveness windows, pose,
   and audio inside every activity beat. v3 adds day and world clocks
   (stamina, nightfall, gate ticks) as **meta-layer only**: they budget and
   schedule; they never re-clock the rope. Decides: the no-music-sync line,
   phase-clock buffer decay, area rope-period multipliers — and the rule
   that the day clock may end a day but never touch a beat.
3. **PS1 as truth.** If a feature can't be rendered in the low-end aesthetic,
   the feature is wrong or the aesthetic grows a documented exception.
   Decides: blocky physics gags over cloth sim; baked rope sag; strict
   palette/dither consistency; area vistas as cheap geometry + palette shifts.
4. **Lossless growth.** Failure is the only fertilizer: the save never
   shrinks, and it cannot grow without failure. Decides: no-fail training
   with caps instead of loss, dungeon loss = time cost only, shadows frozen
   at their casting day, and any mechanic that would shrink the save
   rejected on sight.

Traceability: every mechanic below serves the loop *and* at least one pillar;
anything that can't cite one is scope creep and gets cut.

### Core Gameplay Loop

**Moment (1–3 s):** one tap on the current activity's beat — skip, stride,
rep, page turn. Success scores and feeds the activity's stat; the rope
inevitably outruns the player, so trips are **scheduled by design**, and a
trip **caps** that stat's day — the productive failure that, and only that,
raises the stat's long-term ceiling.

**Day (session-scale: ≈5 min at day 1, stretching toward 10–15 min as VIT
grows; 2–3 days per sitting):** wander the gym's corners, spend the stamina
budget, take **day-cards** every 20 activity beats across all activities
(pick-of-2; pick-of-3 past the lifetime-beat threshold) → voluntary sleep
or empty pool → **nightfall compost**: the ephemeral build converts into
permanent stats, the diary gains a line, "tomorrow the day was longer."

**Life (indefinite):** earned milestones fire **life cards** (permanent
pick-two); dungeon days spend gates and pay LEVEL plus manual-first shadow
posts under time-cost-only loss; the awakening converts past days into
**shadows** banking frozen output at nightfall; the TV ladder advances the
world from infomercials to the player's own name.

Why the hundredth day still plays: ceilings move only through failure,
automation widens verb by verb (manual→automatic), the world marches on
the diary/TV/board. The Success Metrics section makes this testable.

### Completion and Loss

- **Loss: none, by law** (pillar 4). Training failure caps the day's income
  line; it never rolls anything back. Dungeon loss ejects the player
  (the gates' emergency-extract fiction) and locks that gate for the day —
  time is the only currency ever spent.
- **Completion statement:** the reveal arc's end-state — the player's name
  on the news chyron, the poster-shot gym running its full montage. After
  it, a **designed endless**: room, shadows, and board keep playing.
- The rope's **summit ceiling break survives as an in-day beat** — the
  moon-jump moment lands on rope days; v2's run-win retires under the
  day-is-the-run law.

---

## Game Mechanics

### Primary Mechanics

**v3 scoping note.** Everything under this heading stays as written — the
v1/v2 rope grammar is now the *interior of the rope activity* inside a day.
A rope day plays exactly like a v2 run (ropes, ceilings, the moon-jump
moment); its outcome — skips, summit, trips — is what the rope activity
feeds to the stats. Inside a day, the day-card cadence (20 total beats;
lifetime pick-of-3 threshold) **subsumes** v2's every-10th-skip offer
rule — the skip-keyed clock survives only as the pacing measure. The v3
overlay stacks on top of, never inside, this machine.

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
→ dead if last rope (v1/v2 as-built baseline). In v3 this reads as
session-end: the rope activity caps its AGI day and the day continues —
i-frames last **one pass per rope held** (N passes = a
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
   **v3 restatement (lossless law):** the currency changes, the rule does
   not — no day- or life-card may ever reduce a *permanent stat or its
   ceiling*. Risk pays in stamina, time, and cap exposure.

**Activities & Universal Tap (NEW — v3 core).** One tap = the current
station's beat. Stations and their failure textures: **rope** — the skip
(trip), v1 grammar intact; **running** — stride cadence (stumble);
**lifting** — the press rep (failed rep); **reading** — page-turn timing
(falling asleep mid-page). Hot/cool alternation: rope and running drain
hard, reading is the cooldown pace. Fighting (act two onward) is
tap-fighting — dodge timing against monsters, the rope becomes the whip;
monsters stay out of the game until several activities exist (danger
gradient). Station switching = tap a corner of the room; the character
walks over. No second verb, ever (pillar 1). The 12-card physics
vocabulary (hang/pace/score/forgiveness/launch) survives verbatim as the
day-card vocabulary.

**Stamina & the Day (NEW — v3 core).** One pool = **VIT** (first-pass day-1
size 100 SU; VIT only ever grows, so days never shorten). Activity beats
drain by intensity class — hot 2 SU/beat, cool 1 SU/beat (first-pass,
gate-bound). No in-day recovery; **voluntary sleep** ends the day anytime.
Habit life-cards chaining two activities drain both streams at once. The
day is a stamina budget, never a clock (pillar 2). Day state — pool, caps,
recordings — persists across sessions; nightfall is the only in-design
reset.

**Stats & the Feed (NEW — v3 core).** Permanent stats: **STR** (lifting —
capability gates: gear, which doors you can push), **VIT** (running — the
day's length; a trainable daily limit, the energy-system inversion),
**AGI** (rope — skip/combo ceiling, the big-number stat), **INT** (reading
— information: how many rows the gate board renders — comps, hidden rooms,
reward tables, "unstable, don't wake it" tips — plus System-banter
quality), and **SHADOWS** after the awakening (automation throughput:
corners, split speed, clone strength). Feeds: each activity's beat pays
1:1 to its primary stat, ~15% bleed to one fixed neighbour (first-pass:
rope→AGI→INT, running→VIT→STR, lifting→STR→VIT, reading→INT→AGI).
**RANK** = hidden weighted sum of visible stats + LEVEL (weights
gate-bound) — the number the news and boards quote. **LEVEL** is earned
from dungeons only. RANK/LEVEL debut **in the world, not on a panel**:
first an "E-rank" chyron, a "LV 1" stepping through a gate; panel second —
"hidden" means *not yet explained in the fiction*, never hidden forever.

**Caps & Supercompensation (NEW — v3 core).** Every stat has a per-day
income **ceiling**; beats past it play for joy at zero income. Failing an
activity caps that stat's day at its realized value — and the *only* route
to raise a stat's long-term ceiling is to hit that failure: the ceiling
moves to **125% of the failing day's realized growth** (first-pass,
gate-bound; deeper attempts before the failure raise the cap position).
Safe play plateaus permanently; rope-pace escalation schedules the trips
for the cautious too. Taught without UI: the dotted diary prophecy
(tomorrow's line one notch above *if today failed*), the sore-walk
animation certifying growth, flat days producing no stiffness. Neglect is
visible, never punished: no reading → INT ceilings flat → the gate board
literally goes blank.

**Day-cards.** An offer fires every **20 activity beats total** across all
stations (first-pass, gate-bound) — pick-of-2; pick-of-3 past the
lifetime-beat threshold (first-pass 400 beats, gate-bound). Rarity weights
carry over (70/25/5); capped and dead-pick cards filtered. Day-cards are
ephemeral: they compost at nightfall (Catalogue rules bind them unchanged).

**Life-cards.** Permanent, fired by **earned events** — first failure per
stat, first dungeon clear, the awakening, each RANK debut — each a
pick-two of permanent cards. Vocabularies: choreographies, **habits**
(chained activities — "jump rope while reading", foreshadowing shadows),
stat emphases, and one late-game **auto-pick** card (the final verb to
automate, bought and optional). Life-cards never grant stat points — they
change growth *rules*.

**Nightfall compost.** Sleep — chosen or forced by the empty pool — ends
the day: the day-card build dissolves, its value converts into permanent
stats through the feed inside per-day caps, shadow outputs bank, and the
diary gains a first-person line ("day 9: failed on the rope. legs feel
stupid. tomorrow more."). The room wears: AGI grooves, a bent barbell,
diary towers, a scuffed sprint-wall — the stat panel before the panel.
"Tomorrow the day was longer."

**Gates, Dungeons & the Hunter Economy (NEW — v3, act two+).** A physical
corkboard in the gym is the world map and the clock: gates persist until
someone clears them, and the off-screen hunter economy clears roughly
**1 random gate per game day** (first-pass, gate-bound) — the board and
the news are two views of one sim, so every gate has a shelf life (farm a
gate until someone else takes it). **Tick calendar: the hunter economy
advances one tick per day the player sleeps; the board is frozen while the
game is closed** — the world ages only when tomorrows are lived, never
offline. A **dungeon is a day type**: entering
the gym's impossible door commits the rest of the day; tap-fighting with
HP, flinch, and a danger bed — the first real hurt after hours of safety,
on purpose. Losing **ejects** the player (emergency-extract fiction),
locks that gate for the day, and costs nothing else — present-tense
danger, meta-level time cost. The look: the same stage, palette-flipped
and fogged — the wrongness *is* the dungeon. A gate's first hand-clear
pays LEVEL and arms its shadow-post (manual-first, per gate). Dungeon
Breaks are story scenarios on the TV, never ambient mechanics.

**Shadows (NEW — v3, awakening, act two→three).** After the awakening, past days convert
into shadows: deterministic replays (seed + day state; sim-pure, zero AI)
of that day's training, running in gym corners as desaturated mini-figures
that repeat their day contentedly, never knowing it's a loop. A shadow's
output is **frozen at its casting day's ceilings** — shadows never grow —
and a failure-day casts the hardest-working shadow. A corner can be
**re-cast** with a newer day (the corner gets a new past; the shadow
still never grows) or **retired** (the day returns to the diary, the
corner stands empty) — the endgame room is curated, not accumulated.
Shadow output banks at nightfall with the compost. Battle-shadows replay
their fight-days at posted gates. Shadow count = SHADOWS. Poster shot:
the whole room is your life's montage, running live.

**Determinism contract (v3 design requirement).** Every recorded day
stores seed + inputs sufficient for bit-exact replay — shadows are
replays, never AI; nothing in the day/world sim may introduce
player-visible nondeterminism. This is what keeps the sim/render boundary
pure while the gym fills with ghosts. Player-facing seeds stay out of
scope.

**Controls and Input.**

- **Tap (the only gameplay input):** Space / Enter / pointer-down
  anywhere. On the rope it is the jump — hold for height; at other
  stations the same tap is stride / rep / page. Tapping a corner sends
  the character to that station. *One verb, four genres.*
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

(v3 re-map: the day is the run. Subsections follow the roguelike guide,
each answered for the saga. Incremental/automation material is documented
genre-hybrid garnish on a roguelike spine, not a re-type.)

### Run Structure → Day Structure

- **Run length:** day 1 ≈ 5 min real time (a few activities' stamina),
  stretching toward 10–15 min as VIT grows; 2–3 days per sitting. Rope
  days are internally v2 runs — 3–5 min, skip-count pacing clock intact
  inside the rope grammar.
- **Starting conditions:** day 1 = rope alone (plus diary/TV), stats at
  zero, 1 rope, 1.3 s rope period, phase 0.33 lead-in with an auto-launched
  0.1 s-hold jump so the first pass is catchable — pure v1 onboarding;
  other stations arrive as capability milestones.
- **Difficulty scaling:** still never automatic. In-run: rope-pace
  escalation (scheduled trips) + area rope-period multipliers (as-built
  ×1.00 / 0.95 / 0.88 / 0.82 / 0.76, `js/areas.js:16-32`). Across days:
  supercompensation makes failure the growth door, and the gate board's
  shelf life prices every farm.
- **Victory:** no run-level win state; completion = the reveal arc (see
  Completion and Loss). v2's summit-as-win survives as the in-day
  moon-jump beat.

### Procedural Generation

- **What is random:** day-card draws (rarity-weighted, distinct-per-offer);
  life-card offers (milestone-filtered pick-two draws); gate-board
  composition (spawn, tier, reward rolls); the hunter tick (which gate the
  off-screen economy clears).
- **What is deterministic:** rope path, area geometry, ceiling ladder
  (as-built) — **and every recorded day**: shadow replays are bit-exact
  (Determinism contract, §Primary Mechanics). The board is a stage, the
  cards remain the system (v2's NOTE holds one layer up).
- **Seed system:** none player-facing — unchanged; rng injectable,
  deterministic under test. Shadow replay *promotes* determinism from
  test-side hygiene to a product requirement (seed + inputs stored per
  day). Daily/replay seeds stay out of scope.
- **No biomes-as-levels, no ambient enemies.** Monsters live behind gates
  only; the gym is one room; the dungeon is that room, wrong.

### Permadeath and Progression → Losslessness and Persistence

- **Permadeath: deliberately inverted** (pillar 4). The roguelike's wipe
  survives only inside a rope day — last-rope trips end the rope session,
  not the day, not the game; they cap the day's AGI income and nothing
  else. Nothing rolls back a save, ever.
- **What persists: everything, always growing** — stats + long-term
  ceilings, diary (day lines), life-cards, shadow recordings (seed + day
  state), LEVEL, the hidden RANK inputs, unlocked catalogue branches, the
  Epic 7 outcome counters (kept as sub-cases of the stat ledger),
  best-altitude, audio settings. On-device storage, degrading to
  session-only when unavailable. Recordings are the new size risk —
  budgeted in Technical Specifications.
- **Meta-progression:** v2's counter-gated unlocks (shipped Epic 7) are a
  special case inside milestone unlocks. No currency, no prestige reset —
  this incremental grows *forward*; v2's "prestige clause" is retired in
  favor of ceiling growth.

### Item and Upgrade System

- **Types:** day-cards (ephemeral, in-day, every 20 activity beats) and
  life-cards (permanent, milestone-fired). All passive; no actives or
  consumables (the auto-pick card is a rule, not a button).
- **Rarity:** 70/25/5 carries into day-cards with caps as build
  boundaries; life-card offers draw milestone-filtered pools, rarity-less
  and never-repeating.
- **Synergies (balance watch):** habits chain two stations (dual-stream
  drain — the day economy's own rope-HP); v2's rope × rope-speed "panic"
  build survives inside rope days; shadow count × casting-day ceilings is
  the late-game idle engine; INT × board rows prices gate choice.
- **Build variety goal:** "what kind of day was that?" stays a one-sentence
  legibility test; life-cards extend it to "what kind of life was that?"
  Dead-pick filtering keeps both offer types meaningful.
- **Risk mechanics:** v2's no-score-penalty rule stands, restated for the
  lossless law — no card reduces a permanent stat or its ceiling. Risk
  pays in stamina timing, gate shelf life, and cap exposure.

### Character Selection

- **One skipper, deliberately** — now with an authoring story: expression
  ships as **model skins** (full-body `.glb` replacement on the same
  17-joint pose contract and same physics; §Asset Requirements), not as
  unlockable characters or stat variants. The stat build, the life-card
  build, and the skin you author *are* the character.

### Difficulty Modifiers

- **None.** No tiers, no curse runs, no achievements — difficulty is how
  deep you go before the failure, which gate you race the hunter economy
  for, and how much you trust your own automation. The save is the brag
  surface; RANK is the number that gets quoted.

---

## Progression and Balance

### Player Progression

Three layers feeding one loop: day-cards (ephemeral power for today),
stats + long-term ceilings (the permanent engine — VIT lengthens the day,
AGI lifts rope throughput, STR opens doors, INT thickens the gate board:
every layer changes how tomorrow's moments play), and life-cards +
shadows (lifetime rule and throughput changes). Player skill (timing)
stays the root lever: the machine never outgrows the player who schedules
the failures. Progression that only raises a number is off-design; each
layer must change the loop or it doesn't ship.

### Difficulty Curve

- **Acts:** I *quiet training* — safe by design, many hours, the montage
  as gameplay → II *the News & the awakening* — portals on TV, dungeons,
  the first real hurt (priced in time only), first shadows → III *hero
  sim* — board management, a running room, the player's name on the
  chyron. The genre mask peels in order: rhythm → life sim → raising sim
  → hero sim; the shadow thread adds the mask's last layer — **memory
  sim**: a room where the past keeps moving, repeating its days
  contentedly, never knowing it's a loop.
- **In a day:** first activity teaches the beat; the first cap teaches
  restraint; mid-day cards force the allocation call; the last beats are
  "one more rep?" — the 3-second decision, once per activity per day.
- **In a life:** plateaus are the pressure — ceilings flatline until the
  player seeks the productive failure; board scarcity adds a soft deadline
  watched, never punished (endgame dread: spawn vs clear rate, told
  entirely as TV tone).
- Calibration gate: the headless-sim technique carries over; the master
  dials are now the **day-length envelope** (≈5 → 10–15 min) and the
  **ceiling-growth curve**; summit reach rate survives as a rope-day
  sub-metric (policy-bot band inherited).

### Economy and Resources

No currency — time is the native currency (lossless law). The machine:
**stamina → activity beats → stat income (to caps) → nightfall compost →
permanent growth → longer tomorrows**, plus the dungeon ledger (**gates →
dungeon days → LEVEL + shadow posts**) and shadow outputs banking into
each compost. Master tunables: day-1 VIT pool + drain classes (day
length), the 125% ceiling step (growth rate), the ~1/day hunter tick
(scarcity). v2's altitude-per-skip (**2.5 u**, as-built, `js/game.js:42`)
stays exactly where it was — inside rope grammar.

---

## Level Design Framework

### Level Types

**The gym is the level**, and its progression axis is the room's state,
not new spaces: (1) one room, corners (rope groove, sprint wall, barbell,
reading nook) gathering wear; (2) rooms added — study, weights bay, and
the door-that-shouldn't-exist in a gym, which becomes the dungeon portal
as architecture, not menu; (3) the poster-shot endgame: one room, your
life's montage running live in its corners. The **gate board** (a physical
corkboard) is the world map; the **TV** is the world's window; a
**dungeon** is the palette-flipped, fogged gym — one scene class, the
wrongness is the content. v2's altitude tiers ship intact as the rope
activity's internal geography: **Alley** (0) → **Rooftops** (250) →
**Blimp Deck** (600) → **Stratosphere** (900) → **Moon Approach** (1,350)
→ summit 2,100 (`js/areas.js:16-32`); same stage, same rope grammar.

### Level Progression

Gym evolution is permanent (the save grows); areas are one-way inside a
rope day only (as-built, unchanged). No backtracking. A dungeon entry
commits the day (win or eject → nightfall). The board's gates circulate
without the player (hunter economy); the player's room never does.

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

**v3 art direction — re-semantization (2026-11-12):** *nothing new,
everything reinterpreted.* Three objects carry the saga: the **gym** shows
progress as room-wear (AGI groove, bent barbell, diary towers, scuffed
sprint-wall — the stat panel before the panel; room growth per Level
Design); the **diary** is the only UI (page-turn = nightfall; its
first-person tutorial voice later retints into the System panel — same
voice, unsettling on purpose); the **TV** is the only window out, its
content ladder infomercials ("PROGRAM SEVEN: TO FAILURE!") →
weather/sports → the impossible news interrupt → the player's name on a
chyron; **the joke channel stops for the news** — the mask-slip beat.
**Shadows** render as desaturated mini-figures replaying their day in
corners — no new scene classes (pillar 3); the dungeon is the gym's
palette flipped + fogged. **The System is never a new interface:** the HUD
and pick-two cards *were* System windows all along — and the stat panel's
arrival has the same mechanism: the diary keeps mundane tallies (skips,
km, kg, pages) through act one, and after the News those *same numbers*
re-name themselves into the stat panel. The three channels (room, diary,
TV) carry every lesson: **zero tutorial UI copy** — a mechanic that needs
a text box is a design gap, not a copy gap. **Global tone register:
melancholy-comic** — the room remembers you fondly and slightly sadly.
As-built held verbatim: the PS1 pipeline, chest-jiggle (G12), area
silhouettes.

### Audio and Music

Procedural WebAudio voices on a master bus, gesture-gated AudioContext,
persisted mute/volume. **Audio follows gameplay; the rope is never beat-locked**
(pillar 2 + demake-ethics line). Skip ticks, near-miss stingers, rope-loss thud,
ascent stinger (new), win fanfare (new, procedural). Music track
(`audio/track.ogg`, TRACK-1) **SHIPPED** (Story 5.6): Ogg/Vorbis mono, 79.18 s
seamless loop, 97 BPM, zero rhythmic relation to the rope — pillar 2 intact;
nothing clocks the rope.

**v3 audio additions:** the TV audio channel (jingles → bulletins → the
joke channel's first silence for the news) as the fourth voice layer; the
nightfall page-turn stinger; a dungeon danger bed with tension variants —
present-tense danger scoring for the first fight is composed *after* the
emotion-targeting pass, not before (narrative dependency). Rope voices
unchanged; the rope is never beat-locked (pillar 2 unchanged).

---

## Technical Specifications

### Performance Requirements

60 FPS sustained on low-end/integrated GPUs at the 240-line internal render
target; simulation timing stays frame-rate independent (exact step lives in
`architecture.md`); page-load to first jump under 2 s on broadband (static
files + one CDN module pin). New HUD/vista layers must land inside the
existing aspect-correct letterbox resize path — no layout bypass.

**v3 additions:** the same 60 FPS @ 240-line contract holds with the gym
full of ghosts — shadow count is design-uncapped; where the frame budget
breaks, pillar 3's *documented exception* applies (far shadows render
cheaper), never a gameplay cap. Deterministic replays must fit the
fixed-step sim budget: a shadow is replayed sim state, never an extra
world simulation. Mid-day persistence must not add page-load cost.

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

**v3 recording budget:** recorded days (seed + inputs, bit-exact replay
material) are gameplay content with a bounded per-day storage cost —
order-kilobytes per day so a hundred-day save stays sane under
localStorage realities; exact caps belong to architecture.

Player Fuel (Epic 8): mods and palette skins are DATA, not code — JSON manifests under `mods/` and three-material color records recolor the skipper with no geometry change and no new asset class (Stories 8.1–8.3, FR36/FR37); with nothing equipped the render is byte-identical to the Epic 7 state (FR37 regression pin, Story 8.5). `.glb` model skins: contract PROVEN, NOT wired — Story 8.4's spike verdict ACCEPTED (17 joint names, pose identity, probe 32 tris vs the shipped rig's 192, browser FPS median 16.7 ms) puts the feature on the shelf with NFR10's zero-bitmap rule NOT amended; any wiring ships only under its own authorized story (FR38).

**v3 — Model Skins: full-body Player Fuel (promoted from the shelf
2026-11-12):** an external `.glb` replaces the skipper's meshes entirely —
a puppet on our bones: the bound model is posed by the phase-clock
pipeline through the 17-name joint contract (the 8.4 spike proved it),
zero sim-core delta; arbitrary-skeleton retargeting is NOT in scope.
PS1-era detail budget: order **2k triangles** ("Lara Croft detailed"),
exact ceilings set by the architecture/epics pass with the spike's
both-sides budget-leg pattern. **NFR10 restated, not repealed:** shipped
product stays zero-bitmap; mod-supplied models MAY embed small textures
under hard caps (dimensions/size/count), nearest-sampled, no mipmaps.
Blender-native only (built-in `.glb` exporter, zero converters); the
contract ships as an importable template — named empty hierarchy at the
contract origins — so joint names/origins are never hand-authored.
Palette skins stay as shipped, a separate shallower tier. Authors get
mod-apply console diagnostics (bound/unbound joints, cap verdicts);
players keep total silence (NFR16; diagnostics lane CONFIRMED 2026-11-12).

---

## Development Epics

### Epic Structure

**Shipped (as-built baseline):** epics 1–8 — 1 Ropes as HP · 2 Altitude &
the Win · 3 Rule-Changing Cards · 4 The Ascent Ladder · 5 Feel & Fidelity ·
6 Balance & Prove · 7 The Peel (meta ledger) · 8 Player Fuel (skins as
data) — all closed, gate-proven 2026-11-12.

**v3 (proposed sequence, continuing the numbering):**

| # | Epic | Delivers | Depends |
|---|------|----------|---------|
| 9 | The Day Skeleton | Stamina pool, voluntary sleep, nightfall compost, diary + room-wear; rope-only days playable start to finish | 1–8 |
| 10 | Activities & Stats | Running/lifting/reading stations, feed + bleed, caps + supercompensation + sore-walk teaching, day-cards on total beats | 9 |
| 11 | Life Cards & Milestones | Earned-event milestones, permanent pick-two, habits/choreographies/emphases, capability-threshold station arrivals with vignettes | 10 |
| 12 | The World Layer | TV ladder + audio channel, gate board + hunter tick, RANK/LEVEL in-world debuts, the news interrupt (act two opens) | 11 |
| 13 | Dungeons & Tap-Fighting | The impossible door, dungeon day-type, HP/dodge tap-fight on the reskinned stage, eject + same-day lockout, LEVEL | 12 |
| 14 | Shadows & Automation | The awakening; day recording + bit-exact replay engine; cast / re-cast / retire; manual-first posts; nightfall bank; auto-pick card | 10, 13 |
| 15 | Model Skins | Full-body `.glb` replacement on the joint contract, texture caps, Blender template, author console diagnostics | 8 |
| 16 | Balance & Prove | Day-economy gate (day-length envelope, ceiling curves, hunter tick, bleed), success-metrics pass, docs | 9–15 |

Detailed breakdown: [`gdd-epic-overview.md`](gdd-epic-overview.md);
dev-level stories: [`../../epics.md`](../../epics.md). Sequencing note:
9–11 make act one (the life-sim mask) playable end to end; 12–13 land the
reveal and the game's first real danger; 14 completes the mask march and
the poster shot; 15 is author-facing and independent — it can land
alongside any of them; 16 could not be skipped per project history
(feel-first pillar, frozen-test discipline, gate-proven tuning).

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
server; anything stored stays in the browser). The v2 legs survive as
rope-day sub-metrics — feel gate, moon-jump moments, build legibility,
policy-bot summit band, no dead/dominated/score-negative picks (now
checked on day-cards). v3 additions, each tied to a pillar:

- **Fun-proof (A5, live risk):** players smile at their own timing in the
  first 30 s — the v1 non-negotiable gate, still unproven for the saga;
  collected mid-v3, not at the end (pillars 1–2).
- **The day lands:** first session reaches nightfall and the player can
  say what the day *did* in one stat sentence. (pillar 4)
- **Failure sought, not feared:** from day ~3, players push past comfort
  on purpose at least once a day; nobody calls a cap "punishment".
  (pillar 4)
- **Automation delights and aches:** the first shadow earns a spoken
  reaction in the melancholy-comic register; corners get re-cast/retired
  deliberately — the room is being curated.
- **The reveal lands through the world:** testers notice the news
  interrupt unprompted; nobody suspects UI is teaching the plot.
- **The hundred-day question:** third-sitting returners come back to see
  a named thing ("whether my reading paid off") — evidence the loop, not
  novelty, carries the game.
- Day-length envelope: acceptance band medians 3.5–7 min real time (day 1)
  and 8–18 min (steady state) in playtests, around the design targets of
  ≈5 / 10–15 min — the balance gate's twin dials.

---

## Out of Scope

- **Beat-locked music / rhythm-synced rope** — rejected on demake ethics
  (pillar 2). Immovable across versions.
- **Currency, prestige, any save-shrinking reset** — this incremental
  grows forward (lossless law). v2's prestige clause is retired:
  permanent power lives in stats and ceilings, never in resets.
- **XP-fed shadow growth, per-shadow AI, arbitrary-skeleton retargeting**
  — shadows are cast replays; the corner gets a new past, the shadow
  never grows.
- **Multiplayer, leaderboards, accounts, native packaging** — static
  delivery.
- **Faithful reproduction** of Scarlet Skips' cards, story, or characters.
- **Procedural levels, biomes, ambient enemies, character select,
  difficulty modes, achievements** — declared absent in the genre
  re-map; monsters live only behind gates.
- **Endless-after-summit as a mode** — v2's open note RESOLVED by the act
  arc: completion is the reveal end-state, after which the endless is
  *designed*; the summit survives as the in-day moon-jump beat, not a
  mode.
- **Seeded/daily runs** — still deferred. Determinism is now product-side
  (shadow replays), but no player-facing seeds.
- **Auto-pick by default** — the pick automates only as a late, bought,
  opt-in life card; never baseline.
- **Break-defense wave mode** (the overnight-shadow-army riff) — lost its
  mechanic hook when Dungeon Break went story-only; retired unless a
  named decision revives it.
- **Overtime** (pre-capped day bank-at-nightfall sketch) — superseded by
  caps; may return later as a card.

---

## Assumptions and Dependencies

**[ASSUMPTION] index (v3):**
1. ~~Target audience inferred (not stated by designer).~~ — RETIRED
   2026-11-12: confirmed, extended to include idle/progression players.
2. First-pass tunables (day-1 VIT pool 100 SU; hot/cool drains 2/1; bleed
   map; ceiling step 125%; cadence 20 beats; pick-of-3 near 400 lifetime
   beats; hunter tick ~1/day; RANK weights) — assistant-proposed per the
   v2 placeholder convention, all bound to the Epic 16 gate. — tuning lane.
3. Dungeon-fight HP/beat texture — awaits the first-fight emotion-
   targeting pass. — narrative dependency.
4. Shadow figure LOD/detail levels — tuned to the frame gate, design-
   uncapped counts held.

**[NOTE FOR DESIGNER] items (v3):**
1. Endless-after-summit — RESOLVED 2026-11-12 (act arc; designed endless).
2. Art gag — RESOLVED (blocky jiggle shipped as-built, G12).
3. ~~Ceiling-ladder / altitude-per-skip placeholders~~ — RETIRED
   (gate-proven as-built).
4. Last-rope audio mix — closed-by-implementation (Story 5.2); designer
   override lane stays open (D-N12, carried unchanged into v3).
5. Diary voice (funny? flat? funnier as stats rise?) — deferred to the
   narrative pass; an INT-linked voice is the standing candidate.
6. On-screen shape of fights/ejection, and what a battle-shadow's defeat
   looks like at home — deferred to the narrative/emotion pass.
7. Parody-vs-homage stance on the System trope — narrative pass; the
   PRD's named flavor anchor is "Solo Leveling-style System framing"
   (prd.md, v3 Direction) — a tone anchor to inherit *by decision*, and
   squarely under the homage posture (spirit, not letter).
8. Diary→chyron endgame content loop — narrative pass.

**Dependencies:** the v1/v2 sim core (pure, injectable rng) extends
cleanly — day/state transitions stay pure, shadows are replays; the
recording/replay engine is the one new sim-side capability, and the
`.glb` loader the one new render-side one. Three.js CDN pin unchanged;
frozen-test discipline applies — new mechanics get new test files; the
balance gate reuses the headless-sim technique with the day-economy dials.
The 17-name joint contract (epics.md:142) stays in force; rig renames
remain breaking contract changes. Backlog IDs (CARD-08/09, META-01,
TRACK-1, WR-02, FR38) refer to the `prd.md` Open Items table.
