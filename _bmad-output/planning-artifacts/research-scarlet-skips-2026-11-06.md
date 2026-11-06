# Research: Scarlet Skips, and the extra-rope upgrade

Date: 2026-11-06 · Purpose: input to Epic 3 (`extrarope` / Spare Rope, FR12, Story 3.2)
and to the "homage, our own direction" posture.

## 1. What Scarlet Skips actually is

Primary source: Steam store page, app 4513480, Yerk Games (dev = publisher),
released **2026-09-03**, $4.99, "Mostly Positive" (79% of 1,543; 78% of 78
recent). Unreal Engine, single-player, Steam Achievements, Family Sharing.

Store copy, verbatim:

> Jump jump jump as much as you can in this silly 1-button Rogue-Like about
> skipping rope! Power up your jump ropes to help Scarlet jump higher, survive
> longer, and reach absurdly high scores!

> - Timing is key! … played entirely with press, hold, and release inputs of a
>   single button!
> - Level up and choose from 3 random power-ups in a completely original
>   Rogue-Like upgrade system…
> - **10 upgrade cards; Increase your jump height, add a jump-rope, set it on FIRE?!**
> - Upgrades can be stacked and combined into a virtually infinite number of
>   configurations!

User-defined tags include **Incremental** alongside Roguelike/Action Roguelike —
worth noting against our own disguise thesis (`prd.md` Product Vision).

**Published by the developer:** pool size (10), draw shape (3 offered, keep 1, on
level-up), three example effects, stack-don't-replace. **Not published:** card
names, per-card values, draw odds, rope cap. Any exact number quoted anywhere is
a player's guess.

## 2. Their "add a jump-rope", as far as anyone can tell

Below this line is **community material, not developer copy.** Fan-wiki effect
text traces to one Steam community guide ("Strategy to Get a High Score" by
TheWeirdNoob, 2026-09); fan wikis themselves label those claims single-source.

- Add a jump-rope puts another rope in play: more scoring chances per jump, and
  "more that can break". Footage shows two, then three ropes turning at once; one
  player mused five "might be insane".
- Reinforce Jump Rope exists as an alternative spend — the high-score route keeps
  "a small reinforced set instead of a large fragile one".
- The route deliberately **holds off on ropes early** (stay at 2–4) because
  unreinforced ropes multiply failure risk before upgrade income is fast enough
  to replace what you break; ropes come late, once luck + rocket boots deliver
  "multiple upgrades in one jump".
- Other axes: jump height (official), rope speed (timing tightener, "caps out"),
  luck (raises offer rate — the engine of the loop), rocket boots/fuel (mid-air
  climb; fuel reportedly refills on every upgrade → the "infinite height" loop),
  fire ropes (worth more score).
- Run termination, as players describe it: a rope catches Scarlet, score freezes,
  next attempt from zero. No endless mode, no meta-progression board, no story
  checkpoints documented. One achievement, *Off to a Great Start*, is earned by
  deliberately not jumping and eating the first rope (~75.7% of players hold it).
- Their ceiling is an accident: a comment reports score overflowing int32 at
  2,147,483,648 and counting negative; the route's author crashed at 200,000.

Sources: Steam store page; scarletskips.wiki/upgrades (source-graded, checked
2026-09-04); scarletskips.net/rules (same date); the Steam community guide above
and its comment thread. Several higher-ranking "Scarlet Skips play free" pages
are browser-game SEO clones — not used.

## 3. Where we already are a different game

| | Scarlet Skips | Jumprope |
|---|---|---|
| Rope count | extra scoring chances layered on a **one-life** run | **is the health bar** — a trip strips one, i-frames blank a revolution, last rope = death |
| Run shape | endless until the miss; int32 overflow as the real ceiling | altitude with a designed summit (2,100 u placeholder), one number everywhere |
| Upgrade income | level-keyed; "luck" raises offer rate → loop breaks the failure model | skip-keyed (every 10th skip), no luck card |
| Progression | none published | best altitude only; META-01 is the planned peel |

GDD's own summary of the fork: ropes are "health bar, multiplier, and difficulty
dial" (`gdd.md:172-173`). That is the homage's differentiator — their "add a
rope" buys *risk and score*; ours buys *survival and score* in one card.

## 4. Measured: what a +1 rope does in our sim

Climb rate scales **linearly with rope count** — each rope adds one scored
crossing per revolution (`js/game.js:100-113`). Headless, 45 s, scripted
policy bot, hang-time build (Cloud Shoes ×4):

| ropes | altitude/s | ratio | offers in 45 s |
|---|---|---|---|
| 1 | 1.69 | 1.00 | 3 |
| 2 | 3.33 | 1.97 | 7 |
| 3 | 4.93 | 2.92 | 11 |
| 4 | 6.49 | 3.84 | 14 |
| 5 | 8.00 | 4.73 | 17 |

Consequences, in order of how much they matter:

1. **Spare Rope is the strongest card on paper.** +1 rope is +100% climb at
   1 rope, +50% at 2, +33% at 3, +25% at 4 — and it is also the only HP gain.
   It strictly dominates Golden Handle (+100% per pick, cap 3, no HP) and is the
   mirror image of the Wide Brim finding logged today (`deferred-work.md:57-62`).
2. **It compounds its own supply.** Offers are skip-keyed; N ropes = N skips per
   revolution, so pick cadence scales with the pick itself (first offer ≈1.85
   revolutions at N=5 — `deferred-work.md:6`). The GDD's "offer frequency is the
   run's difficulty thermostat" (`gdd.md:223-225`) has no owner and no number
   until Story 6.3.
3. **The cost is timing load, not score** — N evenly spaced feet windows per
   revolution, and a miss costs a rope *and* a revolution of blank. That is the
   only counterweight under the no-score-regression rule, which makes "how good
   is the player at reading N windows" the de facto balance dial.
4. Cap interaction: `MAX_ROPES = 5` with card cap 4 means the 5th rope is
   reachable only at exactly 4 owned and none stripped — and stripping re-spaces
   the windows as `k/(N−1)` (`js/rope.js:15-18`), so a lost rope changes the
   rhythm, not just the health bar.

## 5. Implementation facts an Epic 3 story must reckon with

1. **The apply path cannot express it today.** `applyCard` calls
   `card.apply(run.effects)` (`js/game.js:218-225`) — a card cannot see
   `run.ropes`. ADR-2 already resolved the shape (whole-record
   `applyCard(run, card) → newRun`; multiplier cards are "the subset that touch
   only `run.effects`", `game-architecture.md:209,236-238,292`); the code
   migration is still owed. Spare Rope is the card that forces it.
2. **Story 3.2's AC text is stale and self-contradictory**: it names
   `applyUpgrade` (shipped path is `applyCard` + `resumeRun`, `js/shell.js:387-388`)
   and its closing "pure endofunctions over the effects record" line contradicts
   the +1-rope AC above it (`epics.md:494-506`).
3. **Frozen-leg landmine**: `tests/headless-sim.test.js:144-148` calls
   `card.apply(freshEffects())` for every card in `CARDS`. A run-shaped `apply`
   must stay shape-safe (`(run.ropes ?? MIN_ROPES) + 1` idiom) or it writes
   `ropes: undefined`-derived garbage that the leg's `ropeMul`-only assertion
   won't catch.
4. **Roles are frozen**: `tests/catalogue.test.js:39-40` deep-equals exactly
   `['foundation','margin','pace','risk','volume']`. The GDD's "HP"/"mobility"
   role labels cannot ship as `card.role` without re-contracting that file; and
   `card.color` must map to an existing `role-*` CSS class.
5. **State-aware filtering has no plumbing**: `isAvailable(card, owned)` and
   `pickOffers(pool, owned, count, rng)` see `owned` only (`js/upgrades.js:40-49`);
   the sim call site passes no run state (`js/game.js:128`). "Spare Rope hidden
   at 5 ropes held" (`epics.md:476`) needs a signature change that keeps two
   frozen callers link-compatible.
6. Write the **clamped** value (`clampRopes`, `js/game.js:33-39`) so invalid
   records keep healing; and remember a pick re-enters the lead-in (`resumeRun`
   snaps phase to `START_PHASE`), so the snap-drop set changes with the new N
   (`tests/v1parity.test.js:269-273`).
7. **It will be invisible in 3D until Story 5.3**: `js/render3d.js:267-294`
   builds one rope mesh and poses it off the single clock regardless of count;
   the HUD pip row grows for free (`1-3-rope-count-on-the-hud.md:34`).

## 6. Decisions taken (2026-11-06)

- **Rope count stays the climb-rate multiplier.** The linear N× coupling above
  is confirmed as the intended economy, not corrected away: Spare Rope is
  deliberately the loudest pick in the catalogue (HP and throttle in one card).
  Rejected alternatives: a per-rope scoring weight (needs a per-rope channel the
  model deliberately lacks — see Story 1.2's "no rope identity in the model"),
  and a rarity-only throttle (leaves the compounding offer loop intact).
- **Structural homage only.** The reference lives in the mechanics we share —
  one button, ropes as risk, pick-one-of-N, one climbing number — never in a
  quoted card name or effect wording. Card voice stays ours.
- Still open, and now explicitly Epic 6's: the offer-frequency thermostat has
  neither a number nor an owner (`gdd.md:229-231`, Story 6.3 / CARD-09), and the
  5–20% summit band must be measured on rope-heavy builds (Story 6.1).
  Tracked in `deferred-work.md`.

Recorded in: `gdds/gdd-jumprope-web-2026-10-27/decision-log.md` (Session 4),
`gdd.md` (Rope HP paragraph, homage posture), `epics.md` (Story 3.1/3.2 AC
fixes), `deferred-work.md`.
