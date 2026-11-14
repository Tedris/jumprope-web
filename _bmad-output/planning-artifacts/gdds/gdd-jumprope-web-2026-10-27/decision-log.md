# Decision Log — Jumprope Web GDD

## Session 1 — 2026-10-27 (Create mode)

- Workspace created at `_bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/`.
- Inputs on hand: `prd.md` (v1.0 shipped state + v2 candidates), `architecture.md`. No game brief or GDD predates this.
- Game type candidate: **Roguelike** (signals: run-based structure, permadeath runs, in-run upgrade cards, procedural offers). Competing match: **Rhythm** (timing-based gameplay) — noted tension: the PRD explicitly keeps the rope a free-running clock with no beat-lock, so rhythm is a *feel* signal, not the genre spine.
- Open framing question: does this GDD document v1.0 as-built (canonical reference) and scope v2, or focus forward on v2 only?
- **DECISION — Game type: Roguelike.** User confirmed ("jump-rope roguelike"), explicitly set aside the Incremental read. Genre guide: `roguelike.md` (high complexity).
- Motivation captured: capability-proof demake — "saw Scarlet Skips, wanted to see if I could make one myself, at least a simple version." Goals/metrics framed as feel + craft, not market.
- **DECISION — Framing:** v1.0 as-built as canonical design; v2 candidates (CARD-08/09, META-01) parked in Out of Scope/Next.
- Working mode: Express (default — user non-responsive to choice, shipped game + PRD give most facts).
- **DECISION — No beat-locked soundtrack, reaffirmed** with grounded rationale: syncing the rope to music would make the demake "too close" to Scarlet Skips. Demake-ethics constraint now explicit; supports Pillar "the rope is the clock."
- v2 design intent surfaced (session 2): rule-beyond-multiplier upgrade cards — more jumps, higher jumps, **more ropes**, **reinforced ropes** (trip immunity); loss condition becomes "trip while down to a single rope"; win condition "jump to a certain height" (à la Scarlet Skips). Pending clarification — may reframe the GDD from pure as-built to forward design intent.
- Art direction idea: blocky boob-physics jiggle for laughs, or explore cel-shading direction. Logged as art candidate.

## Session 2 — 2026-10-28 (drafting)

- **DECISION — Framing = (A) design-intent GDD:** documents the target game; v1.0 described as implementation state with v1/target deltas.
- **DECISION — Ropes as HP confirmed:** 1–5 ropes on one phase clock, each pass scores + threatens; trip strips a rope (fastest, default pending); i-frames 1 revolution; last-rope trip = death.
- **DECISION — Win structure = (a) Ascent ladder:** altitude per skip, jump-peak breaks area ceilings, 5 areas, summit ceiling break = run win. (User chose "A"; assumed = ladder with hard summit win — endless-after-summit left open.)
- **DRAFTED:** `gdd.md` full draft; `epics.md` 6-epic breakdown. Placeholder tunables: ceilings 250/600/1k/1.5k/2.1k, altitude 2 u/skip, area period multipliers.
- v1 facts extracted from code (exact numbers in GDD Mechanics + card tables).

## Session 2 — finalize passes

- **Validator pass:** no criticals; majors fixed in-place —
  score formula pinned (base 1 pt/pass, `(1 + additive) × multiplier`);
  altitude contract = `2 × pass score` (score *is* altitude; best-altitude
  subsumes best-score); trip strips fastest rope + i-frames = 1 pass per rope
  held, no scoring/trips during i-frames; Steel Cord cap = charges on up to 2
  ropes; engine-identifier leakage stripped from design prose (mapping note
  deferred to architecture.md); wall-clock vs skip-count pacing tension made
  explicit; near-miss callouts coalesce per revolution.
- **PRD reconciliation pass:** gaps closed — owned-card HUD persistence,
  aspect-correct letterbox resize in new HUD/vista work, "extend don't
  replace" for v1 juice tiers, near-miss callout display named.
- No narrative-workflow flag (roguelike guide carries none). No external
  handoffs configured. Doc-standards polish: none configured.
- **FINALIZED 2026-10-28.** Artifacts: `gdd.md`, `epics.md`. Next skill:
  `gds-game-architecture`.

## Session 3 — 2026-11-06 (catalogue rules)

- Prompt: reviewing the Story 2.3 ceiling marker surfaced two catalogue smells —
  upgrades that duplicate an axis, and upgrades that pay in score.
- **DECISION — One axis, one card.** No two cards sell the same axis at two
  strengths unless the weaker is an explicit cap-extension tier. Evidence:
  same-axis pairs land in one offer on 16% of pick-of-2 / 47% of pick-of-3
  draws; Featherweight tops out at +28% peak where Cloud Shoes reaches +77%;
  Lucky Tally buys +15% climb rate per pick where Golden Handle buys +100%.
- **DECISION — No upgrade reduces the score** (hard rule, all cards, implicit
  costs included). Score *is* altitude since FR5, so a rate loss is a score
  loss. Consequence: Wide Brim's `−0.25 pt/pass` (−25% measured climb rate) and
  Heavy Rope's `ropeMul ×0.9` (−13%) are violations to fix, not tradeoffs to
  defend. The weaker reading (literal subtraction only) was rejected — it would
  let pace cards keep taxing the win metric.
- **DECISION — Measure first.** Re-cost values come from the Story 2.5 harness
  (climb value at 1 pick and at cap, peak delta, collision rate), not a desk
  re-cost. Epic 3 moves the cards once that report lands; Story 3.1's FR11
  freeze is gated on it.
- Docs touched: `gdd.md` (Catalogue rules block, synergy/risk bullets, gameplay
  metrics), `epics.md` (Additional Requirements, Story 2.5 ACs, Story 3.1 gate
  note), `deferred-work.md`; proposal `sprint-change-proposal-2026-11-06.md`.
  No code or test change.

## Session 4 — 2026-11-06 (extra rope, and the homage's posture)

- Prompt: look into the "add one more rope" upgrade (FR12 `extrarope`, Story
  3.2) with a research pass on Scarlet Skips (Steam app 4513480, Yerk Games,
  2026-09-03). Notes: `../../research-scarlet-skips-2026-11-06.md`.
- **DECISION — Rope count stays the climb-rate multiplier** (confirmed, not
  changed): +1 rope = +1 scored crossing per revolution, measured
  1.00 / 1.97 / 2.92 / 3.84 / 4.73 × at N = 1…5. Spare Rope is therefore the
  loudest card in the catalogue — HP and throttle in one pick — braked by
  timing load and the offer-frequency thermostat, never by a score penalty
  (Session 3 rules). Rejected: a per-rope score weight (needs a per-rope
  channel the model deliberately does not have) and a rarity-only throttle
  (leaves the compounding offer loop intact).
- **DECISION — Structural homage only.** One button, ropes as risk,
  pick-one-of-N, one climbing number — never a quoted card name or effect
  wording from Scarlet Skips; card voice stays ours. Sits beside the existing
  no-beat-lock demake-ethics line.
- Research facts worth keeping: their *published* record is one line — 10 cards,
  3 offered per level-up, "increase your jump height, add a jump-rope, set it on
  FIRE" — no names, values, or odds; all effect detail circulating traces to one
  Steam guide. Their high-score route deliberately **delays** extra ropes (stay
  at 2–4 early) because there extra ropes are pure risk with no HP meaning —
  precisely the fork our ropes-as-health design exploits. Their ceiling is an
  int32 overflow at 2,147,483,648; ours is a designed summit.
- Docs touched: `gdd.md` (rope-HP paragraph, homage-posture paragraph),
  `epics.md` (Story 3.1 filter-plumbing AC; Story 3.2 apply-path and role/color
  ACs), `deferred-work.md`. No code change.

## Session 5 — 2026-11-12 (v3 retarget begins)

- Prompt: "v3 start" (Ed). Change signals: PRD updated 2026-11-12 —
  v2 complete (Epics 7–8 shipped, gate 701/701); **v3 PLANNING OPENED
  2026-11-12** by recorded override of the A5 playtest gate (live risk);
  two v3 candidates in planning: **The Training Saga** (brainstormed
  2026-11-10, log `_bmad-output/brainstorming-session-2026-11-10.md`)
  and **Model Skins** (decided 2026-11-12, PRD section).
- **DECISION — Frame = Retarget (A):** this GDD becomes the **v3
  design-intent** document in place; v2 (Epics 1–8) becomes the as-built
  baseline described in deltas. Same-file precedent: Session 2's v1→v2
  retarget. New workspace declined despite the loop-level change.
- **DECISION — Scope:** Training Saga **and** Model Skins both enter this
  GDD.
- **DECISION — Working mode = Facilitative:** walk pillars, core loop,
  mechanics, genre section before drafting; the saga's numbers are thin.
- Source of truth for saga detail: brainstorm log (extract via subagent);
  PRD v3 sections as locked-decision digest.
- **DECISION — Game type stands: Roguelike** (Ed, 2026-11-12). Days are the
  runs; incremental/automation mechanics documented as genre-hybrid garnish;
  roguelike guide subsections stay the scaffold.
- **DECISION — Pillars (v3):** the three v2 pillars stand, #2 **re-anchored to
  layered clocks** — rope phase remains canonical inside every activity; the
  day/world clocks are meta-layer and may never re-clock the rope — and a
  fourth pillar added: **lossless growth** (failure is the only fertilizer;
  the save never shrinks).
- Brainstorm log extracted via subagent (full read, 359 lines). Locked there:
  day-is-the-run, lossless law + time-cost danger, no-fail training,
  Dungeon Break = story-only, Forks A/B/C (stats visibility, VIT = the day,
  INT = intel), fail = capped, supercompensation (B), shadows-as-days
  (deterministic replays), meta-law manual→automatic, Universal Tap.
  Numbers absent by design — the walk's job. Naming note: the log labels
  this wave "v2"; project versioning calls it v3.
- **needs_narrative flag SET** — diary voice, reveal mechanics, first-fight
  texture, parody-vs-homage stance all need a dedicated pass; offered at
  Finalize.
- **DECISION — Day pacing:** session-scale days. Day 1 ≈ 5 min real time (a
  few activities' stamina); days stretch toward 10–15 min as VIT grows;
  2–3 days per sitting. Wall-clock envelope replaces v2's NFR9 role for
  balance gates; VIT stays a stamina budget, never a clock.
- **DECISION — Completion statement = the act arc** (Ed): the game's
  completion is the reveal arc's end-state (player's name on the chyron; the
  poster-shot gym running live); after it, a *designed* endless montage.
  Rope summit **demoted** from run-win to a recurring in-day beat — the
  moon-jump moment lands on rope days. No other win state; no loss state
  (lossless law).
- **DECISION — Mid-day persistence:** the day survives a tab close —
  stamina ledger, day state, capped flags save to localStorage; reopen
  resumes the same day. Nightfall remains the only in-design reset.
- **DECISION — Sleep is voluntary:** the day ends at empty stamina OR on the
  player's choice to sleep; ending early is strategy (freeze income where
  the caps sit; time the compost). Nightfall still reads as biology.
- **DECISION — Day-card cadence:** every **20 activity beats total** across
  all activities (first-pass number, bound to the balance gate). Cross-
  station counting makes switching part of the build game. Pick-of-2,
  pick-of-3 after the lifetime-beat threshold (mirrors v2 grammar).
- **DECISION — Life-card milestones = earned events** (first failure per
  stat, first dungeon clear, the awakening, each RANK debut…), not day
  numbers. Every life card lands as a story beat.
- **DECISION — Stat feed keeps the bleed:** 1:1 primary + ~15% to one fixed
  neighbor (rope→AGI, running→VIT, lifting→STR, reading→INT; neighbor
  mapping first-pass). Sharpest FOMO stays readable; traps softened.
- **DECISION — Dungeons are a day type:** entering a gate commits the rest of
  the day; win or eject, nightfall follows. Dungeon days are the non-training
  days — and the days shadows remember.
- **DECISION — Loss time-cost = same-day gate lockout:** an ejection locks
  that gate until tomorrow; the board and the hunter economy keep moving
  meanwhile. No global cooldowns.
- **DECISION — Shadow deployment is manual-first:** a gate must be cleared
  by hand before shadows can be posted to it — the manual→automatic meta-law
  holds per gate.
- **DECISION — Shadow payout banks at nightfall:** frozen outputs accrue
  with the day's compost, like a day completing in the corner. Zero trickle
  state; keeps shadows pure deterministic replays.
- First-pass numbers bound to the balance gate (no designer input needed):
  day-1 stamina pool 100 SU, drain by intensity class (hot 2/beat, cool
  1/beat), ceiling raise per failure = 125% of the failing day's realized
  growth, hunter economy ≈ 1 off-screen gate clear per game day, dungeon
  fight HP texture TBD by the narrative/emotion pass.
- **DECISION — Genre posture confirmed:** roguelike subsections re-mapped to
  the day (Run Structure→Day; permadeath deliberately inverted — nightfall
  is the only reset, the save never shrinks); catalogue rule 2 restated for
  the lossless law: **no card may ever reduce a permanent stat or its
  ceiling** — risk pays in stamina, time, cap exposure. Rule 1 (one axis,
  one card) stands unchanged.
- **DECISION — Determinism contract (design-level):** shadows are
  bit-exact replays — every recorded day stores seed + inputs; replay is
  the mechanism, never per-shadow AI (sim purity holds, boundary fence
  intact). Player-facing seeds: still out of scope.
- **DECISION — Stations arrive by stat thresholds only** (vignette +
  "okay, I can also do this"); station-as-life-card dropped.
- **DECISION — Day 1 = rope alone** (plus diary/TV): pure v1 onboarding;
  other stations arrive as capability milestones.
- **DECISION — Dungeon screen = stage reskin:** the impossible door opens
  onto a palette-flipped, fogged mirror of the gym's own space — one scene
  class, PS1 truth; the wrongness is the dungeon. (Brainstorm's "combat
  on-screen?" resolves YES, on the stage.)
- **DECISION — RANK = weighted sum of visible stats + LEVEL** (weights
  first-pass, gate-bound): everything feeds the number the news quotes.
- **DECISION — ASSUMPTION #1 RETIRED — audience confirmed with extension:**
  browser feel-seekers + run-chasers + idle/progression-fantasy players who
  came for a joke and stayed for the montage.
- **DECISION — Mod diagnostics = console lane** (Ed confirms the PRD's open
  ASSUMPTION): author-side console diagnostics on mod apply; players keep
  total silence (NFR16 holds).
- **DECISION — Shadows are visible mini-replays:** desaturated figures
  replaying the activity in gym corners (poster-shot material).
- **DECISION — No cap on shadow count:** the montage stays uncapped; if the
  frame budget breaks with many shadows, pillar 3 grows a *documented
  exception* (lower-res shadows), not a design cap. Frame target stays
  60 FPS @ 240-row with the player jumping.
- **DECISION — Shadow re-casting (REVISES brainstorm lock "shadows never
  grow", Ed override 2026-11-12):** a shadow holds one recorded day; feeding
  it a newer day re-casts it — output follows the latest casting, still
  frozen between re-casts, still pure replay. "Never grows" survives only
  between castings.
- **DECISION — Picks automate last, via a late opt-in life card:** the
  manual→automatic law covers the card pick too, but only as a late-game
  choice the player buys — agency is surrendered deliberately, matching the
  reveal arc's completion beat.
- **DECISION — v3 epic grouping approved:** 9 Day Skeleton, 10 Activities &
  Stats, 11 Life Cards & Milestones, 12 World Layer, 13 Dungeons & Tap-
  Fighting, 14 Shadows & Automation, 15 Model Skins, 16 Balance & Prove.
- **DECISION — Shadow growth law, precise form (supersedes same-session
  "re-casting" phrasing):** frozen output + re-castable corners. A shadow IS
  the bit-exact replay of exactly one recorded day; never XP-fed, never
  self-improving. A corner may be **re-cast** with a newer day — "the corner
  gets a new past", the shadow never grows — and **retired** (day returns to
  the diary, corner freed). The endgame room is curated, not accumulated.
  Brainstorm's open item (retire/feed, log :235) CLOSED.
- **DRAFTED 2026-11-12:** `gdd.md` fully retargeted to v3 (front matter,
  posture, concept, audience, USPs 5–6, goals, background, pillars 2&4,
  three-cycle loop, completion/loss, v3 mechanics overlay + determinism
  contract, roguelike re-map, progression/curve/economy, gym-as-level, art
  re-semantization, audio additions, tech (shadow budget exception,
  recording budget, Model Skins), epics 9–16, v3 metrics, out-of-scope,
  assumption/note indices v3). `gdd-epic-overview.md` appended with the
  v3 breakdown. v2 sections retained as as-built baseline throughout.
- Finalize passes running: PRD reconciliation, brainstorm reconciliation,
  discipline validator.
- Brainstorm reconciliation pass (subagent) returned; fixes applied to
  `gdd.md`: (1) diary-tallies→stat-panel rename added as the panel's reveal
  mechanism (was silently dropped); (2) melancholy-comic declared as global
  tone register in Art Style; (3) "memory sim" named as the shadow thread's
  last mask layer in the act curve; (4) zero-tutorial-UI-copy elevated to a
  global rule (was scoped to supercompensation only). No contradictions
  found; all Session-5 divergences confirmed logged; News Clock substance
  confirmed distributed (hunter tick + lockout + TV-tone dread).
- Panel-rename beat also wired into `gdd-epic-overview.md` Story 12.3
  (delivers with the news interrupt) so the reveal ships, not just docs.
- PRD reconciliation pass (subagent) returned. GDD fixes applied: A1
  hardware risk (2020-era iGPU laptop check) added to the design-posture
  risk block; NOTE #7 now names the PRD's "Solo Leveling-style System
  framing" flavor anchor so the narrative pass inherits it by decision.
  Verdict: GDD substantively faithful to the PRD; no conflicts — two
  PRD-side staleness items + one retirement are PRD updates, NOT GDD
  fixes: (a) PRD shadow bullet still says "shadows never grow" without the
  re-cast refinement; (b) PRD "unconsumed candidate" status lines are now
  consumed by this GDD; (c) PRD's console-diagnostics [ASSUMPTION pending
  Ed] can be retired (confirmed 2026-11-12). Surfaced to Ed at finalize.
- Discipline validator pass (subagent, checklist + genre CSVs): genre
  checks PASS (roguelike, hybrid garnish OK, conventions documented incl.
  determinism contract). 7 findings, ALL FIXED in-session:
  1. (major) rope-day offer cadence double-specified → scoping note now
     states day-card cadence SUBSUMES the v2 every-10th-skip rule; the
     skip clock survives as pacing measure only.
  2. (major) hunter-tick clock undefined → tick = per player-slept day;
     board frozen while the game is closed.
  3. Shadows act tag → "awakening, act two→three".
  4. USP 2 stale "win condition" → marked v2-baseline, in-day peak noted.
  5. Day-length metric labeled as acceptance band around the ≈5/10–15
     design targets.
  6. gdd-epic-overview stale baseline markers (strip decision, 2.5 u,
     number-key picker) refreshed to shipped state.
  7. "area pressure multipliers" → canonical "area rope-period
     multipliers".
  Traceability chain verified intact; no engine-leakage; assumption
  discipline holds.

## Session 5 — FINALIZED 2026-11-12

- Artifacts: `gdd.md` (v3 design-intent; v2 as-built baseline),
  `gdd-epic-overview.md` (v2 baseline + v3 epics 9–16), this log.
- Decision-log audit: two reconciliation passes verified every Session-5
  entry lands in gdd/epics or set-aside (break-defense & overtime riffs →
  Out of Scope). Validator: 7/7 findings fixed. Open items: none
  phase-blocking; narrative lane (NOTE 5–8) and tuning lane (ASSUMPTION 2,
  Epic 16) documented.
- PRD-side updates APPLIED (Ed-approved): v3 Direction status → CONSUMED
  by GDD retarget; shadow bullet carries the re-cast refinement; console-
  diagnostics ASSUMPTION retired.
- Narrative handoff: Ed chose **gds-create-narrative as the immediate
  next step** (reveal beats, diary voice, first-fight texture, parody-
  vs-homage stance). Next after narrative: `gds-game-architecture` →
  `gds-create-epics-and-stories`.

## Session 6 - 2026-11-12 (v3 design pass: narrative + architecture)

- GDD retargeted to v3 design-intent ("The Training Saga") per Session 5 framing;
  epics 9-16 proposed sequence stands as the planning spine.
- **Narrative design created** (`_bmad-output/narrative-design.md`, Heavy):
  premise locked from brainstorming (the montage was preparation; coincidence
  cosmology chosen over bureaucracy/mystery for *why the System prepared him*);
  3-act mask-peel structure; 16 beats with triggers decided — Interrupt fires
  day ~15-20 (deterministic, balance-bound), Awakening gated by first dungeon
  clear, climax = state (census-RANK-S chyron; no mandatory combat capstone);
  cast: 1 protagonist (diegetic naming via day-1 diary) + 0 antagonists
  (counterforce: world indifference), diary voice resolved NOTE 5 as
  prose-as-stat (writing quality tracks stats), System banter = present/
  reactive; ~18k words, data tables only, English-only, zero VO; diary→chyron
  loop closes the arc.
- **Architecture retargeted** (`_bmad-output/game-architecture.md` v2.0 doc /
  game-v3 scope, validated 2026-11-12): engine stack revalidated (Three r187
  exists, pin held); spine = one state tree {meta,life,day,world}, one
  settlement transaction (compost; world.advance inside it only — Date banned
  sim-side), rng sub-stream registry (deriveStream(seed,domain,ordinal)),
  input-event-segment replay (Shadow-on-Rails; budget set ≤4 KB/day soft,
  8 KB hard — the number the GDD deferred to architecture), monotone ledger
  (lossless law as executable fence), rankOf(life) derived (census can't lie),
  persistence v3 envelope + prev-key + v2→v3 total migration (Epic 7 counters
  → milestone sub-cases). Epics 9-16 mapped to files/patterns/tests.
- Docs touched: `narrative-design.md` (new), `game-architecture.md`
  (retarget), this log. No code, no test change.
- Next per user: gds-create-epics-and-stories for v3 epics 9-16.

## Session 7 - 2026-11-13 (readiness patches applied)

Implementation-readiness report 2026-11-12 findings patched into the artifacts (Ed: "apply all patches"):

- **Persistence keys corrected** (ARCH-1, MAJOR): `game-architecture.md` §Persistence + Save-migration row and Story 9.2's AC now name the shipped v2 keys — `jumprope-best` holds best-altitude, `jumprope-meta` the Epic 7 counters, `jumprope-audio` settings (`js/game.js:339,347`). The never-shipped `jumprope-best-altitude` reference removed before migration code could target a phantom key.
- **Architecture constants refreshed** (ARCH-2): `altitude += ALT_PER_POINT × scoreMul` (as-built 2.5), the AREAS example replaced with the as-built Story 6.2 rows, and First Steps names `game-architecture.md` v2.0 the authoritative spine.
- **Day-1 name prompt landed** (GAP-1 / UX-DR6): Story 9.5 gains the name-prompt AC — one keystroke via the card-pick lane, set once, staying unnamed legal. No new mechanics; no invented fallback display.
- **Choreographies disposition** (GAP-2): recorded OPEN as Epic 11 decision C1 — ship the third life-card vocabulary in 11.2 or retire it with a named decision at story creation. No-invention rule held; nothing drafted.
- **Auto-pick row minted** (GAP-3): Story 11.2 defines the auto-pick life-card on the `rankDebut[S]` milestone offer — matching the reveal arc's completion beat (Session 5's decision); 14.6 keeps the owned behavior. FR58 coverage row and Epic 11's FR row updated.
- **Recorder seam ordered** (Q-1): Story 13.2's AC restated — 13.2 ships the kernel row + `day.gate` keying (the shape); Story 14.1 ships the recording mechanism. No forward dependency either way.
- **Page-turn stinger landed** (GAP-4): Story 9.4 gains the nightfall voice AC (audio leaf; no beat-lock) plus its audio-guard leg.
- **Reduced-motion parity** (GAP-5): Story 16.3's technical pass now names the v3 cosmetic surfaces explicitly — the 5.4 audit pattern extended.
- **Doc hygiene** (MINOR): FR35 coverage row marked retired-for-v3; EXPERIENCE.md pause line corrected for the shipped Story 5.7 audio-config row; Epic 9 gained the settleFeeds end-state note (Q-2).

Open after the pass: finding #7 — the optional v3 UX pass (a workflow decision, not a doc patch; still recommended before Epic 9–10 pickup).
