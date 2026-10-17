# Phase 3: Card Catalogue Realness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-17
**Phase:** 03-Card Catalogue Realness
**Areas discussed:** Card picking input (only area selected; Rarity & offer economy, Stacks & owned HUD, and Catalogue roster & extra ropes were offered but not selected)

---

## Todo match (cross_reference_todos)

| Option | Description | Selected |
|--------|-------------|----------|
| Reviewed — already done | Note as reviewed; shipped in Phase 2 (rope arc D-08–D-12) | ✓ |
| Fold into Phase 3 | Treat 3D rope as still needing work | |

**User's choice:** Reviewed — already done.

---

## Card picking input

### Q1: How does the player choose 1 of 2–3 cards with one-button input?

| Option | Description | Selected |
|--------|-------------|----------|
| Cycling cursor | Cards cycle/highlight in order; one press picks the highlighted card | ✓ |
| Beat-synced auto-cycle | Presses advance a shared timer; pick whatever is active | |
| Cursor + arrow keys | Add left/right + select keys for keyboard players | |

**User's choice:** Cycling cursor.

### Q2: What does a press vs. hold do?

| Option | Description | Selected |
|--------|-------------|----------|
| Press=cycle, hold=confirm | Each press moves highlight; hold confirms. No hidden timer | ✓ |
| Auto-cycle, press=confirm | Highlight auto-cycles on a timer; press picks | |
| Press cycles, double-press confirms | Distinct confirm gesture | |

**User's choice:** Press=cycle, hold=confirm.

### Q3: After confirming, how does the run resume?

| Option | Description | Selected |
|--------|-------------|----------|
| Freeze, resume in-place | Continue from exact frozen state; risk of landing on mid-swing rope | |
| Lead-in re-entry | Replay the cold-start lead-in (START_PHASE, lead-in jump) into a safe window | ✓ |
| Resume + grace window | In-place but brief no-trip grace | |

**User's choice:** Lead-in re-entry.

### Q4: How are offers and the cursor displayed?

| Option | Description | Selected |
|--------|-------------|----------|
| In-scene 3D card plaques | Low-poly plaques, raised/lit highlight; 240p legibility risk | |
| Low-res HUD text list | Existing text-prompt channel, one line per offer + cursor marker | ✓ |
| DOM overlay cards | Crispest text; breaks one-render-path/PS1 consistency | |

**User's choice:** Low-res HUD text list.

### Continuation rounds (user chose "More questions on picking" twice)

| Question | Options | Selected |
|----------|---------|----------|
| Confirm hold duration/mechanics | Reuse jump hold curve (~0.5 s) / Dedicated ~0.8 s with fill cue / Short ~0.3 s | Dedicated ~0.8 s hold with visible fill cue |
| Cycle wrap behavior | Wrap around / Stop at last card | Wrap around |
| Input during post-pick re-entry | Lock input / Presses charge jumps immediately | Lock input during re-entry |
| Confirm feedback | Flash + re-entry / Picked-card banner / Instant, no flourish | Flash + re-entry |

**Notes:** User ended discussion with "I'm ready for context" after the second continuation round.

---

## the agent's Discretion

- Flash duration, cursor glyph, fill-cue mechanics, offer cycle order, exact hold threshold around 0.8 s.
- Rarity weights, cap values, owned-card model, HUD icon strip presentation, catalogue roster, extra-ropes spike-or-defer call (offered as discussion areas but user declined; left to researcher/planner).

## Deferred Ideas

- Card-pick SFX — Phase 4 (AUD-01).
- Rarity pacing (CARD-09) / extra ropes (CARD-08) — v2 per REQUIREMENTS.md.
- Reduced-motion dampening of the confirm flash — Phase 5.
