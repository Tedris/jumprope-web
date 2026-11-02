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
