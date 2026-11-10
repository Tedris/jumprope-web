# Playtest Fix — ghost-spread: multi-rope read as a character outline

**Date:** 2026-11-10
**Source:** Ed's playtest (post-Epic-5, pre-Epic-6): acquiring a second rope drew what looked like an **outline of the character** instead of a second rope sweeping around it — not the Scarlet-Skips-style multi-rope read Story 5.3 intended.
**Status:** done — fixed, pinned by `tests/ghostspread.test.js`, gate green.

## Root cause (proven, not guessed)

Story 5.3's ghosts share the real rope's TubeGeometry and sit at even phase offsets `−k·2π/ropes` (frozen spacing law). All sweep radii are therefore **exactly equal** (repro: `/tmp/ghost-repro.mjs` — radii equal to 1e-12 at ropes 2/3/5). A half-turn about the X hands axis maps the hand-to-hand arc to its mirror on the SAME circle, so at ropes=2 the arcs tile one exact closed circle about the hands axis at **every** theta — a rotating silhouette ring hugging the body contour; for ropes≥3 even phases tile the full circle likewise. Mathematically-correct double-dutch, perceptually an outline.

## Fix (renderer-only, laws untouched)

`js/render3d.js`: each pool slot gets a **static radial shortening** at construction —
`ghost.scale.set(1, s_k, s_k)`, `s_k = GHOST_SHORT_BASE − GHOST_SHORT_STEP·k` (0.97/0.94/0.91/0.88).
Distinct radii ⇒ even-phase arcs never close into one curve again. Chosen so:

- `scale.x = 1` — rope ends stay on the handle line (a slightly-shorter rope, held the same way);
- every ghost apex clears the ~1.35 head (`0.7 + 0.75·s + 0.06·s² ≥ 1.406`);
- every ghost floor dip ≤ the shipped real rope's (−0.04 … 0.00 vs −0.11) — no new under-floor sweeps;
- written ONCE at construction — zero per-frame allocation, zero timing surface (NFR1/NFR8);
- geometry sharing, one shared material, the spacing law, the visibility census, and the trio/fingerprint laws are UNTOUCHED — `iframesjuice`, `reducedmotion`, `render3d`, `areavistas` all stayed green with **zero edits** (that's the proof).

## Verification

- `tests/ghostspread.test.js` (NEW, 4 legs): derived slot-law pins, the outline-breaker (radii <1 and pairwise distinct), write-once across 30 frames with ropes edges 1→2→5→2→3, and the source write-site census.
- Full gate: **548/548** (544 + 4 new legs), wall ~8.6 s.

- Mutation battery (`/tmp/gsb` clone, one mutant alone per run, gold before/after 4/4): **M1** scale write removed → L1+L2+L3+L4 red; **M2** shortening leaked to the real rope tube → L1 parity + L4 census red; **M3** scale write moved into `render()` → L3 write-once + L4 census red; **M4** `GHOST_SHORT_STEP = 0` (equal radii re-tiled) → L2 red, L1 green BY DESIGN (derive-literals — it re-derives from the constants); **M5** `GHOST_SHORT_BASE = 1` → L2 red.

## Artifact bookkeeping

This document is the written authorization for its own path and `tests/ghostspread.test.js` joining both diff-census allow-sets (`tests/ceilingbreak.test.js` §6, `tests/summitapproach.test.js` §4.3) — list-only appends; `js/render3d.js` was already in both sets by the 4.4 lineage.
