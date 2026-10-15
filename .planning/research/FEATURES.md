# Feature Landscape

**Domain:** One-button rhythm-jump roguelike (browser, PS1-style 3D demake)
**Researched:** 2026-10-15

## Reference-Game Grounding (Scarlet Skips)

Confidence: MEDIUM for official facts (Steam store page), LOW-MEDIUM for community-reported card details (fan wikis read from gameplay footage; no official card names published).

Officially confirmed by Yerk Games (Steam, appid 4513480, released 2026-09-03):

- **10 upgrade cards total**, pick **1 of 3** offered at each level-up; level-ups arrive via successful skips.
- Example effects published: "increase jump height," "add a jump-rope," "set it on fire."

Community-identified catalogue (from run footage — treat as design inspiration, not spec):

| Card | Role | Notable mechanic |
|------|------|------------------|
| Increase Jump Height (blue, feet icon) | Safety margin | More clearance/airtime; changes landing rhythm |
| Add Jump Rope | Score volume | More rope passes per jump; multiplicative with height |
| Ignite Jump Rope (red) | Risk/reward | Flame multiplier climbs with stacks; "open flames" upkeep |
| Reinforce Jump Rope (red, heart) | Maintenance | **Stops being offered once every rope is reinforced** — dead-pick avoidance built into the offer filter |
| Upgrade Rocket Fuel (purple, shoe+flame) | Foundation | Hold-to-float airtime; stacked early by experts |
| Increase Jump Rope Speed (green) | Pace | Punished early ("blundering"), saved for last |
| Increase Luck (green, clover) | Safe filler | "LUCKY" banner; effect undocumented; always worth taking |
| Unnamed extinguish card | Trap-ish | Referenced but buggy when taken accidentally |

Design DNA worth stealing (in spirit, not literally): cards have **color+icon identity by role**, cards **stack multiplicatively** (ropes × height × flame), synergies have **upkeep costs** (fire+reinforce), and the **offer generator filters cards that would be dead picks** given current run state.

## Table Stakes

Features users expect. Missing = product feels incomplete.

### GAME- (core loop)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Player can press/hold/release one button to jump with variable height | The whole genre; already validated in prototype | Done | `js/player.js` |
| Player can read exactly when the rope will reach their feet | Timing-game contract: the judgment moment must be telegraphed visually (rope shadow/outline at the feet plane) | Med | In 3D this needs deliberate camera framing — the rope must stay visible against the floor throughout its arc |
| Player can start a run and restart after a trip in one press | Jam-scale endless convention; already exists | Done | `release()` on `over` |
| Player can see current score and best score during/after a run | Endless-game baseline; already exists | Done | localStorage `jumprope-best` |
| Player can trip on the rope and see clearly *why* (rope hits feet, hitstop, death feedback) | Failure must be legible or it reads as a bug | Low | `tripped` flag exists; needs 3D juice |

### CARD- (in-run catalogue — the big expansion this milestone)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Player can choose one card from an offer that pauses the game | Roguelite pick-two already exists; keep the pause-and-choose rhythm | Done | Extend `pickTwo` |
| Player can see card identity at a glance (name, icon, color-coded by role) | 4 plain text multipliers read as a placeholder; Scarlet fans expect color+icon per role (safety/risk/foundation/pace) | Med | Data-driven: cards stay POJOs with `color`/`icon`/`rarity` fields |
| Player can see card rarity (common/uncommon/rare) affecting drop odds | Universally understood vocabulary (StS/VS); signals "special moment" when a rare appears | Low | Add `rarity` field + weighted rng draw (rng stays injectable) |
| Player can stack the same card repeatedly with visible diminishing/capped effect | Stacking is the genre engine; caps prevent absurdity (Scarlet's reinforce cap pattern) | Med | Effects record already supports multipliers; add per-card `maxStacks` |
| The offer generator never presents a dead pick | Biggest catalogue-quality issue: a card that does nothing given current effects enrages players | Med | Filter by `available(runState)` predicate before drawing — mirrors Scarlet's reinforce rule |
| Player can see which cards they own during a run (miniature icon strip) | Build legibility: "what is my build right now?" is a roguelite basic | Low | Icon row on HUD |

### FEEL- (game feel / juice)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Player's late or slightly-early press near the ground is forgiven (coyote time / input buffer, ~0.1 s) | Modern platformer standard; without it a timing game feels "unfair" | Low | Buffer press input against the rope-phase clock, not a grounded state — keeps sim pure (a timer field on state) |
| Player gets hitstop + screenshake + particles on skips, near-misses, and trips, scaled by event significance | Vlambeer-standard juice is the genre's feedback language; a silent clean skip feels flat | Med | Render-layer only (shell-side effects read from sim events; sim core stays pure) |
| Player can perceive a near-miss as a distinct event (rope whistles past within a tight window) | The dopamine spike of one-button games; requires a second, tighter window than "clear" | Low | Compare rope phase to feet window at event time; emit `nearMiss` flag from `tickRun` |
| Jump arc reads clearly in 3D (squash/stretch, shadow under player, consistent camera) | 3D destroys 2D's inherent readability; player must judge rope-vs-feet depth from one fixed camera | Med | Fixed follow camera, player anchored low-center; shadow blob is the depth cue |

### AUDIO-

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Player can hear distinct SFX for jump, skip, near-miss, trip, card-pick | WebAudio one-shot SFX are the audio equivalent of hitstop; cheap and high-impact | Low | Synthesized SFX (oscillator/noise) keeps zero-asset static delivery |
| Player can hear a looping music track that does not lock the rope | Project decision: audio follows gameplay, rope phase stays canonical clock | Med | Looping buffer or procedural; no phase coupling |
| Audio respects browser autoplay policy (no silent broken audio; context resumes on first input) | #1 web-audio bug: AudioContext starts suspended; players blame the game | Low | `ctx.resume()` inside the first `press()` |

### UI- (shell / accessibility table stakes)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Player can mute and set volume, persisted across sessions | Expected of any web game with music; localStorage alongside best score | Low | |
| Player can pause/resume, and the game self-pauses when the tab is hidden (no spiral-of-death on return) | rAF + accumulator survives it, but audio/timers don't; visibilitychange handling is table stakes | Low | Existing 0.25 s accumulator clamp helps |
| Player can reduce motion (screenshake/vertex-wobble dampened; respects `prefers-reduced-motion`) | WCAG 2.3.3 + vestibular safety; PS1 wobble is motion simulation | Low | Render-shell flag only — gameplay windows untouched |
| Player's low-res UI stays legible (score, offers) at all window sizes | Static-file game runs on random browsers/monitors; canvas letterbox/resize is expected | Med | Also a PS1-authenticity feature: UI rendered low-res like the scene |

## Differentiators

Features that set the product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| PS1 demake presentation: low internal res + nearest-neighbor upscale, vertex snapping wobble, ordered dithering, fog, janky-but-readable camera | The milestone's headline pull; demake fans audit exactly these touches (each missing one reads as "fake PS1") | High | Copetti's PS1 architecture analysis is the checklist; keep to "no post-processing beyond simple dithering" constraint — vertex snap + dither + low-res carry 90% of the look |
| Original low-poly skipping character with personality (bob, sway, rope-spin idle animation) | Charm is the difference between a tech demo and a game people share | Med | Animation can be driven purely from rope phase — no new sim state |
| Cards with rules beyond multipliers: extra ropes, conditional/synergy cards, an airtime/float card | Turns "4 sliders" into a build space worth talking about; the Scarlet reference proves one number (phase) × rope-count multiplicity creates emergent chaos | Med-High | Extra ropes = multiple phase-offset scoring windows; biggest sim-core change — design carefully, keep pure |
| Offer pacing that escalates: early common picks, rare moments land-rarely-shine | Cadence is drama; a rare every-10-skips feels like nothing | Low | Weight rarity by skip count |
| Near-miss callout with escalating combo feedback (pitch-rising skip sounds, streak label) | Turns a clean mechanic into a highlight-reel generator | Low | Pairs with FEEL- near-miss window |
| Score multiplier identity à la Scarlet's flame counter — one big on-screen number that compounds build choices | Score-chasing games need a single obsessable number beyond raw skips | Low | Score HUD element driven from effects |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Beat-locked soundtrack / rhythm-synced rope phase | Project decision: rope phase is the canonical clock; audio coupling would fracture the pure phase model | Audio follows gameplay events only |
| Between-run meta progression (unlocks, currency) | Deferred by project scope; in-run cards carry the roguelike loop | Rich in-run catalogue depth |
| 1:1 reproduction of Scarlet Skips' card list, names, story | Demake the spirit; cloning the list is IP-risky and creatively hollow | Original cards filling the same design roles (margin/volume/risk/foundation/pace/luck) |
| Post-processing stack (bloom, motion blur, CRT curvature shaders) | Violates "no post-processing beyond simple dithering"; also kills low-res crispness | Vertex snapping + dither + low-res upscale |
| Camera that dramatically follows/free-looks or heavy camera shake | Moves the timing reference; players cannot judge rope arrival if the frame drifts | Fixed rig; shake only on trip, never during judgment |
| "Trap" cards offered as gotchas (Scarlet's buggy extinguish card) | Community experience shows mis-picks read as bugs, not depth | Offer filtering: never show a card that hurts or does nothing in current state |
| Procedurally generated audio music engine | Music is "one looping vibe track" by scope; a procedural engine is a milestone of its own | Single loop + SFX one-shots |
| Touch controls beyond full-canvas press/hold | Whole canvas is already the button; mobile is out of scope as a target but canvas press works free | Keep pointerdown/up on canvas |

## Feature Dependencies

```
Rope-phase readability in 3D (FEEL-) → everything juice-related (a skip event nobody could predict isn't satisfying)
Draw-layer swap to WebGL shell (UI-) → PS1 presentation features (differentiators)
Near-miss detection in sim (FEEL-) → near-miss juice + combo audio + streak UI
Card data-model upgrade: rarity/icon/stack-cap/availability predicate (CARD-) →
    weighted offers, dead-pick filtering, owned-cards HUD, offer-escalation cadence
Extra-ropes card (CARD-) → multi-window scoring in sim core (the only invasive sim change)
WebAudio context wiring (AUDIO-) → mute/volume UI, autoplay-policy resume
Input buffering on phase clock (FEEL-) → independent of all above; do early
```

## MVP Recommendation

Sequence by dependency (maps to phase order):

1. **Draw-layer swap + PS1 presentation** (UI-/differentiator) — the milestone headline; keeps sim untouched.
2. **Card data model + catalogue expansion** (CARD-) — rarity, icons, stack caps, availability filtering; add 6–10 original cards across the roles (margin, volume, risk, foundation, pace, luck). Hold "extra ropes" back unless the multi-window scoring spike proves cheap.
3. **Feel + audio pass** (FEEL-/AUDIO-) — input buffer, near-miss window, hitstop/shake/particles, SFX + loop, mute UI.
4. **Accessibility polish** (UI-) — reduced-motion, visibility pause, resize/legibility.

Defer: extra-ropes multiplicity (high sim risk for this cycle), luck mechanic (Scarlet itself doesn't document what it does — invent only if catalogue feels thin).

## Sources

- Scarlet Skips fan-guide upgrade catalogue (scarletskips.net/upgrades) — distinguishes Steam-confirmed facts from community footage reports — MEDIUM (curated claims) / LOW (footage-derived card names)
- Scarlet Skips Fandom wiki (scarlet-skips.fandom.com) — confirms release facts, 12-page wiki, soundtrack track names — LOW
- Coyote time / input buffering primers (rozgames.com, gamedevchronicles.com, gamineai.com, r/gamedesign) — converging on 3–8 frame coyote, ~0.1 s buffer — LOW individually, consistent across sources
- PS1 technique explainers: danielilett.com (affine mapping), pixelwolf.net (vertex snapping readability, citing Copetti's PS1 architecture analysis), scolastico/psx_visuals_gd4 (feature checklist: snap+affine+fog+dither) — LOW-MEDIUM, corroborated across independent sources
- Vlambeer "Art of Screenshake" (canonical juice reference, prior knowledge, not re-fetched) — MEDIUM
- Web Audio autoplay policy + prefers-reduced-motion / WCAG 2.3.3 / gameaccessibilityguidelines.com (standards docs, prior knowledge) — HIGH for the standards themselves
- Existing prototype (`js/*.js`, `.planning/codebase/ARCHITECTURE.md`) — HIGH for current-state baseline
