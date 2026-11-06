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
