# Sprint Change Proposal — 2026-11-05

## 1. Issue Summary

**Trigger:** Not a story — a strategic identity pivot adopted from the brainstorming
session of 2026-11-05 (`_bmad-output/brainstorming/brainstorm-mods-skins-engine-2026-11-05/`,
status: complete). The session resolved the project's open aim question:

> **Jumprope is an incremental in disguise.** It opens as a humble one-button
> rope-jump demake and escalates — upgrades, tech trees, more and more — until
> the player can't quite believe where the gameplay has gone. Surprise-by-
> escalation is the product; the demake is the disguise, not the genre.

**Problem type:** Strategic pivot. The PRD's Product Vision and Non-Goals
described a product whose escalation stops at the summit (between-run
progression "deferred", fidelity framing as end-state). The thesis makes
escalation the *product*, reclassifying deferrals as planned reveals.

**Evidence:** brainstorm memlog (27 entries, identity decision logged by user);
PRD internal conflict (META-01 "deferred" vs. the v2 candidate list pulling the
same feature forward); the un-gated mid-air jump (found during the session) as
live evidence that discovered depth is the felt product.

## 2. Impact Analysis

### Epic impact

| Epic | State | Verdict |
|------|-------|---------|
| 1 Ropes as Health | in flight/mostly done | Unaffected — first escalation beats already ship here |
| 2 Altitude & the Win | in flight | Unaffected — "the game becomes winnable" = escalation layer 1 |
| 3 Rule-Changing Cards | mid-flight (3.3/3.4 backlog) | Unchanged ACs; Story 3.4 re-framed as designed-surprise beat #1 (rationale note only) |
| 4 Ascent Ladder | backlog | Unaffected — layer of the disguise |
| 5 Feel & Fidelity | backlog | Unaffected |
| 6 Balance & Prove | backlog | Unaffected; Story 6.4 (docs & provenance) absorbs the PRD-change record |
| **7 The Peel (proposed)** | new candidate | META-01 between-run progression / tech tree as in-game fiction — the escalation layer after the summit; currently unplanned gap |
| **8 Player Fuel (proposed)** | new candidate | Skins/modding surface (data-mod JSON + palette skins first; `.glb` model skins later) — community-driven depth for the disguise |

No epic is invalidated. Sequencing unchanged for v2 (Epics 3–6 run as planned);
candidates 7–8 are post-v2 (v2.1+), gated by their own planning passes.

### Artifact conflicts

- **PRD** — resolved in-place before this proposal (see §4.1).
- **`epics.md:104`** — states "No standalone UX design document exists"; false:
  `ux-designs/ux-jumprope-web-2026-10-28/DESIGN.md` exists and is authoritative
  for HUD/prompt voice. Factual fix proposed (§4.3).
- **Architecture** — `loadBest`/localStorage persistence seam will grow an
  unlock schema when Epic 7 is planned; no edit now. Note added to Epic 7 stub.
- **UX** — Epic 7 introduces the first post-run screen in history; DESIGN.md
  voice rules (lowercase, PS1-plausible) extend to it at story time. No edit now.

### Technical impact

None immediate. No code, tests, or CI change is requested by this proposal.
One pending code fix is tracked separately and is thesis-independent: the
grounded-guard fix for the un-gated mid-air jump (`js/player.js`/`js/shell.js`).

## 3. Recommended Approach

**Option 1 — Direct Adjustment.** Modify upstream docs (PRD — already done),
add two clearly-labelled future-epic candidates to `epics.md`, correct one
false statement, and record provenance. Effort: **Low** (doc-only). Risk:
**Low** — zero in-flight story changes; candidates stay stubs until their own
`gds-create-epics-and-stories` pass. Morale/momentum: neutral-to-positive —
nothing in the sprint moves.

- *Option 2 (Rollback)* rejected: nothing shipped conflicts with the thesis;
  Epics 1–6 already read as the disguise's first act.
- *Option 3 (MVP review)* rejected: v2 scope is unchanged by the thesis; the
  peel lives after v2, not inside it.

## 4. Detailed Change Proposals

### 4.1 PRD (`planning-artifacts/prd.md`) — APPLIED 2026-11-05

Product Vision — ADDED:

> **Thesis (v2): an incremental in disguise.** Jumprope opens as a humble
> one-button rope-jump demake and escalates — upgrades, tech trees, more and
> more — until the player can't quite believe where the gameplay has gone.
> Surprise-by-escalation is the product; the demake is the disguise, not the
> genre. (Adopted 2026-11-05; source: brainstorming session log.)

Non-Goals — META-01 line CHANGED:

> OLD: - Between-run meta progression (unlocks, persistent currency) — deferred to v2 (META-01).
> NEW: - Between-run meta progression (unlocks, persistent currency) — v2 (META-01). Under the disguise thesis this is the *planned peel*: the mask lifts in designed beats, not a blanket deferral.

Fidelity non-goal ("spirit, not letter") intentionally unchanged — it is the
disguise's contract.

### 4.2 Epics (`planning-artifacts/epics.md`) — PENDING APPROVAL

Epic List — APPEND two candidate stubs after Epic 6:

> ### Epic 7 (candidate): The Peel
> The game admits what it is: between-run progression (META-01) as in-game
> fiction — the tech tree the disguise was hiding. Unlocks presented in the
> PS1 voice; persistence grows past best-score. Plotted post-v2; requires its
> own requirements pass before stories.
>
> ### Epic 8 (candidate): Player Fuel
> Depth from outside the roadmap: data-only mods (JSON manifests) and palette
> skins first; `.glb` model skins behind a spike. Serves surprise-by-
> escalation without touching the sim core's purity rules. Plotted post-v2;
> spike-gated.

Story 3.4 — ADD one rationale line (no AC change): "Under the thesis: the
first *designed* surprise beat — the easter-egg discovery the player didn't
know they had."

FR Coverage Map — add `FR: (META-01) → Epic 7 candidate`, `FR: (mods) → Epic 8 candidate`
only when those candidates get real FRs; no FR numbers invented here.

### 4.3 Epics UX-section factual fix — PENDING APPROVAL

`epics.md` "UX Design Requirements": replace "No standalone UX design document
exists" with a pointer to `ux-designs/ux-jumprope-web-2026-10-28/DESIGN.md`.

### 4.4 AGENTS.md — PENDING APPROVAL

Project §: one sentence added under Core Value recording the thesis, so agent
context files stop optimizing for "stay a humble demake" forever.

### 4.5 sprint-status.yaml — NO HAND EDIT

Regenerate via `gds-sprint-planning` only if/when Epic 7/8 are promoted from
candidates; no change now.

## 5. Implementation Handoff

**Scope: Minor→Moderate** (doc-only, but touches two planning artifacts).

| Change | Route | Owner |
|--------|-------|-------|
| PRD edits | applied | this workflow |
| epics.md Epic 7/8 stubs + 3.4 note + UX fix | PO decision → Developer agent | PO approves stubs; Amelia applies |
| AGENTS.md thesis line | user-approved | this workflow |
| Mid-air grounded-guard fix (independent) | Developer agent | separate change set, own test file |

**Success criteria:** Epics 3–6 proceed with zero changed acceptance
criteria; a reader of PRD + epics.md sees one coherent escalation story with
the post-summit gap explicitly labelled; no test, build, or deploy artifact
touched.

---
*Provenance: brainstorming session brainstorm-mods-skins-engine-2026-11-05
(status: complete); checklist executed per bmad-correct-course.*
