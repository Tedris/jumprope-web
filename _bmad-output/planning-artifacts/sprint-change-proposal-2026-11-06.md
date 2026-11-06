# Sprint Change Proposal — 2026-11-06

## 1. Issue Summary

**Trigger:** Not a story — two catalogue design rules adopted during review of the
Story 2.3 ceiling marker. While tracing what the marker's number means, it became
visible that (a) several upgrades sell the same effect axis twice, and (b) at
least one upgrade pays the player *out of* the score. The designer's framing:
"we shouldn't need to duplicate skills or have skills that take away from the
score."

**Adopted rules:**

1. **One axis, one card.** No two cards may sell the same effect axis at two
   strengths unless the weaker is an explicit cap-extension tier and reads as
   one.
2. **No upgrade reduces the score** — hard rule, all cards, implicit costs
   included. Since Story 2.1 `score += scoreMul` *is* altitude
   (`js/game.js:110-111`), a points cut is a climb cut and a slower rope is a
   slower climb.

**Problem type:** Balance/design-contract defect in shipped v1 data, inherited by
the v2 card plan. Rule 2's strict form was chosen over the weaker reading
(literal subtraction only), which would have let pace cards keep taxing the win
metric.

**Evidence** (all measured against the real modules, not estimated):

*Same-axis offer collisions* — 20k seeded draws through the real `pickOffers`:

| Pool | Pick of 2 | Pick of 3 |
|---|---|---|
| 8 cards (shipped) | 16.1% | 46.8% |
| 12 cards (post-Epic 3) | 18.6% | 46.2% |
| 12 cards, peak-height axis only | 16.3% | 39.2% |

*Per-card climb value* — headless sim, scripted policy bot (feet-window jump,
0.5 s hold), trip-free 10 s horizon, neutral baseline 16 u / 97.5 u peak:

| Card | Climb rate Δ (×1) | Climb rate Δ (cap) | Peak Δ |
|---|---|---|---|
| Golden Handle | **+100%** | +300% (cap 3) | — |
| Wind-Up Handle | +125% | +275% (cap 2; tripped in window) | — |
| Lucky Tally | +15% | +52% (cap 3) | — |
| Cloud Shoes | 0% | 0% | +15% / **+77%** |
| Featherweight | 0% | 0% | +5% / **+28%** |
| Wide Stance | 0% | 0% | — |
| Heavy Rope | **−13%** | −25% (cap 3) | — |
| Wide Brim | **−25%** | −50% (cap 2) | — |

*Why Wide Brim's penalty is no longer a fair tradeoff:* passes needed to break the
2,100 u summit ceiling go 1,050 → 1,400 on a bare build (+33%) but 263 → 280 on a
Golden Handle ×3 build (+6%). The card punishes players who cannot yet read the
tradeoff and costs experts almost nothing — the inverse of "score now, suffer
later".

## 2. Impact Analysis

### Epic impact

| Epic | State | Verdict |
|------|-------|---------|
| 1 Ropes as Health | done | Unaffected |
| 2 Altitude & the Win | in progress (2.4 review, 2.5 backlog) | **Story 2.5 extended** — it becomes the rule report, not just a tuning readout |
| 3 Rule-Changing Cards | backlog | ACs unchanged; **FR11's legacy-8 freeze is now conditional** (gate note on Story 3.1). Wide Brim / Heavy Rope re-cost belongs here |
| 4 Ascent Ladder | backlog | Unaffected |
| 5 Feel & Fidelity | backlog | Unaffected |
| 6 Balance & Prove | backlog | Consistent — 6.1/6.2 already own tunables; the rule report feeds them |

No epic is invalidated. Nothing shipped in Epics 1–2 changes behavior.

### Artifact conflicts

- **FR11 (`epics.md:42`, Story 3.1 AC)** — "the existing 8 multiplier cards keep
  their exact v1 effects, rarities, and caps" directly protects the two rule
  violations. Resolved by conditioning the freeze on the rule report rather than
  editing FR11's text now: a re-cost becomes a *sanctioned amendment* with its
  own story, not a silent regression.
- **GDD `gdd.md:313` / `:317-319`** — called Wide Brim "the designed trap pick"
  and listed it among the catalogue's "only negatives". Both lines rewritten to
  the adopted rules.
- **GDD metric `gdd.md:479`** (≥30% pick rate) — kept; it catches dead cards but
  not dominated ones or rate-negative ones, so two metrics were added.
- **Architecture / UX / PRD** — no conflict; the rules bind catalogue data only.

### Technical impact

No code or test change requested by this proposal. When the re-cost lands in
Epic 3:

- `js/upgrades.js` is the only file whose data changes; `tests/catalogue.test.js`
  and `tests/headless-sim.test.js:143-154` derive from the records/closures and
  adapt on their own.
- `tests/upgrades.test.js:11-14` pins Golden Handle's stack (`scoreMul` 2, then
  3) — frozen; only a change to `multi` would require re-authorization, and no
  rule requires one.
- **Hard constraint on any Wide Brim re-cost onto rope speed:** the cap-policy
  bound leg keeps every capped `ropeMul` inside [0.6, 1.5] and the worst-case
  product inside [0.6, 3] (`tests/headless-sim.test.js:143-154`, Pitfall 1 rope
  wrap). A `margin → ropeMul` swap must be checked against that bound, together
  with Heavy Rope ×3 and Wind-Up ×2.

## 3. Recommended Approach

**Option 1 — Measure, then re-cost.** Extend the already-planned Story 2.5
harness with a rule report; Epic 3 moves the card values with the report in
hand. Effort: **Low** (doc-only now; harness legs inside a story already
scheduled). Risk: **Low** — no in-flight story's AC changes, the FR11 freeze
stays intact until data justifies amending it.

- *Option 2 (re-cost from the desk today)* rejected: the numbers are already
  declared provisional ("numbers first-pass, to be balanced", `gdd.md:213`), and
  a re-cost chosen before the harness exists would be exactly the guessing the
  story exists to stop.
- *Option 3 (rely on the ≥30% pick-rate telemetry gate alone)* rejected: it
  measures player confusion, not design redundancy, and needs thousands of runs
  the project does not collect.

## 4. Detailed Change Proposals

### 4.1 GDD (`planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/`) — APPLIED 2026-11-06

- `gdd.md` — **ADDED** "Catalogue rules (adopted 2026-11-06)" block after the
  target card table, with the measured collision and climb-value tables.
- `gdd.md` — **CHANGED** synergy line: trap picks off-design.
- `gdd.md` — **CHANGED** "Curse/risk mechanics" → "Risk mechanics
  (re-costed 2026-11-06)": risk stays, the currency changes; Wind-Up keeps
  paying score *for* speed, Wide Brim's `−0.25 pt/pass` becomes a hang-time or
  rope-speed cost, Heavy Rope must buy forgiveness without losing climb rate.
- `gdd.md` — **ADDED** two Gameplay Metrics: no dominated duplicate, no
  score-negative pick.
- `decision-log.md` — **ADDED** Session 3 entry (three decisions + rejected
  weaker reading).

### 4.2 Epics (`planning-artifacts/epics.md`) — APPLIED 2026-11-06

- Additional Requirements — **ADDED** the two rules with their measurements.
- Story 2.5 — **ADDED** two AC legs: the per-card climb-value rule report
  (dominated + non-positive cards named) and the same-axis collision rate.
- Story 3.1 — **ADDED** gate note: FR11's freeze is conditioned on Story 2.5's
  report clearing or re-costing Wide Brim and Heavy Rope.
- Epic 3 summary — **CHANGED** "Legacy 8 cards are pinned unchanged" to carry
  the rule gate.
- No FR number was added, renamed, or retired.

### 4.3 Deferred work (`implementation-artifacts/deferred-work.md`) — APPLIED

New section "Deferred from: card-catalogue design review (2026-11-06)" carrying
the three findings with their claim homes.

### 4.4 sprint-status.yaml — NO HAND EDIT

Story 2.5 stays `backlog`; regenerate via `gds-sprint-planning` only if the
re-cost grows into its own story.

## 5. Implementation Handoff

**Scope: Minor** (doc-only; the work itself is already scheduled).

| Change | Route | Owner |
|--------|-------|-------|
| Rule report legs in the 2.5 harness | `gds-dev-story` for 2.5 | Amelia |
| Wide Brim / Heavy Rope re-cost + any Featherweight merge | Epic 3 story that touches the catalogue, with the 2.5 report attached | Amelia; FR11 amendment recorded in the story |
| Tunable values (ceilings, altitude-per-skip) | unchanged — Stories 6.1/6.2 | Amelia |

**Success criteria:** Story 2.5 runs and prints a per-card verdict naming every
dominated and score-negative card; the same-axis collision number is on the
report and trending to zero; no shipped card reduces measured climb rate after
Epic 3; `node --test tests/` green throughout with existing files untouched
except those the re-cost story is explicitly authorized to re-contract.

---
*Provenance: catalogue review conversation of 2026-11-06; measurements taken
against `js/upgrades.js`, `js/game.js`, `js/player.js` via headless probes
(20k seeded `pickOffers` draws; 1200-tick trip-free policy-bot window at
STEP = 1/120). Checklist executed per bmad-correct-course.*
