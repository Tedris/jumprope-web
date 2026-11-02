---
title: 'DESIGN.md — Jumprope Web (PS1-Style Rope-Jump Roguelike)'
status: final
created: 2026-10-28
updated: 2026-10-28
sources:
  - ../../../gdds/gdd-jumprope-web-2026-10-27/gdd.md
  - ../../../prd.md
  - ../../../epics.md
colors:
  ink: '#000000'
  scrim: '#2a3440'
  bone: '#f4f0d8'
  roleSky: '#8fd3ff'
  roleSlate: '#9aa7b4'
  roleAmber: '#ffcf6e'
  roleMint: '#9fe8c0'
  roleEmber: '#ff8f5e'
  rope: '#f4f0d8'
  ropeLost: '#4d4a3e'
  marker: '#8fd3ff'
  win: '#ffcf6e'
typography:
  font: '16px sans-serif (system stack)'
  hudPrimary: '32px sans-serif, bone'
  hudSecondary: '20px sans-serif, bone'
  scale: '16 base / 20 / 32 — legacy ladder, held for v2 [ASSUMPTION: no new sizes introduced]'
  weights: 'normal throughout [ASSUMPTION: no bold introduced; PS1-flat voice]'
rounded: 'none — zero radius anywhere; the DOM overlay mirrors the pixel-flat scene'
spacing: '4px flex gaps; 2.5rem top inset; everything centered on one vertical axis'
components:
  hudStack: 'top-center flex column, pointer-events none, aria-hidden, one axis only'
  altitude: '32px bone, single primary number (score IS altitude)'
  ropePips: '1–5 block pips, rope fill / ropeLost dark, order-stable'
  ceilingMarker: '20px line, marker color, distance-to-ceiling readout'
  prompt: 'centered line under HUD; role-* color keyed to highlighted card'
  ownedLine: '20px bone + role colors; v2 adds state glyphs (ropes, charges, jumps)'
  runOver: 'run-over copy line in the same stack; win in win color, loss in bone'
---

# DESIGN.md — Jumprope Web (PS1-Style Rope-Jump Roguelike, Web Browser)

## Brand & Style

Deliberately lo-fi: a black-boxed pixel diorama with a whisper of DOM text over it. The UI never outshines the scene — one bone-white type stack on transparency, no panels, no chrome, no borders. The PS1-identity rule applies to the HUD too: if a UI element can't be imagined on a 1998 memory card box, it doesn't go in. Personality is dry arcade signage — terse caps-free copy, no exclamation, let the scene emote. [ASSUMPTION: voice carries from v1's "Missed! Score N" — sparse, flat-fact delivery.]

## Colors

| Role | Token | Hex | Use |
|---|---|---|---|
| Page / letterbox | `ink` | `#000000` | Page background; the letterbox bars |
| Canvas scrim | `scrim` | `#2a3440` | Canvas fallback fill |
| Text | `bone` | `#f4f0d8` | All primary HUD type, run-over copy |
| Role — sky | `roleSky` | `#8fd3ff` | Pace/margin role accents, ceiling marker |
| Role — slate | `roleSlate` | `#9aa7b4` | Foundation role accents |
| Role — amber | `roleAmber` | `#ffcf6e` | Volume role accents; win copy |
| Role — mint | `roleMint` | `#9fe8c0` | HP role accents [ASSUMPTION: Spare Rope/Steel Cord read mint] |
| Role — ember | `roleEmber` | `#ff8f5e` | Risk role accents (Wind-Up, Wide Brim) |
| Rope pip | `rope` | `#f4f0d8` | Held-rope pips |
| Rope lost | `ropeLost` | `#4d4a3e` | Spent-rope pip ghosts |
| Marker | `marker` | `#8fd3ff` | Ceiling-marker line |
| Win | `win` | `#ffcf6e` | Summit win copy |

Contrast: bone on ink 17.9:1; bone on scrim 9.6:1; marker/pips ≥ 4.5:1 over the darkest scene palettes — re-check against Stratosphere/Moon palettes when Epic 4 vistas land. Rope pips are shape-reinforced (solid vs. ghost), never hue-alone.

## Typography

One system sans at three sizes — the shipped v1 ladder: 16px body/prompt, 20px owned + marker lines, 32px altitude. No webfont (page-load budget); digits are proportional as shipped — use `font-variant-numeric: tabular-nums` on the altitude readout so climbing digits don't jitter [ASSUMPTION: tabular-nums added, zero-dependency]. No bold; hierarchy is size + color only.

## Layout & Spacing

Everything lives on the canvas's vertical centerline inside the letterbox band: `padding-top: 2.5rem`, 4px column gaps. Order, top to bottom: **altitude → rope pips → ceiling marker → owned/build state**. Prompts (offer, run-over, start) render below the stack. The whole HUD scales with the letterbox band, never around it — desktop and mobile see identical relative layout. [ASSUMPTION: 2.5rem inset holds on short viewports; revisit if mobile landscape crowds the play area.]

## Elevation & Depth

Two layers only: the WebGL scene; the transparent DOM overlay above it. No scrims, no modals, no panels — the offer "screen" is text over the frozen frame. Pause is a freeze-frame, not an overlay. [ASSUMPTION: v2 keeps zero overlays; win/lose states are copy lines, not screens.]

## Shapes

Zero radius, zero borders. The only "shape" vocabulary is the rope pip: 3-square solid block (held) vs. dim ghost block (lost). Anything round or beveled is out of identity.

## Components

- **Altitude** — 32px `bone`, the one number; tabular figures.
- **Rope pips** — row of up to 5 blocks; held = `rope`, lost = `ropeLost` ghosts (max ever held stays visible so the bar reads loss, like a segmented health bar).
- **Ceiling marker** — 20px `marker` line, e.g. `ceiling 412 ↑`; in the summit area it reads as the win target `summit 612 ↑` [ASSUMPTION: lowercase distance+arrow format matches v1 prompt voice].
- **Owned/build line** — 20px, card names in their role colors; state suffixes `×2`, `⟳1`, `↑2` for charges/double-jump counts [ASSUMPTION: ASCII-ish glyph set stays PS1-plausible].
- **Prompt** — centered line, `role-*` color keyed to the highlighted card (v1 mechanism, unchanged).
- **Run-over line** — same slot as prompt; loss `bone`, win `win` amber.

## Do's and Don'ts

- Do keep the whole HUD on one center axis; muscle memory is the contract (v1's stack, v2's stack, same stack).
- Do carry every color from the five-role palette before inventing a sixth.
- Do let the scene own spectacle (palette flips, vista swaps); the HUD only reports.
- Don't add panels, borders, radius, gradients, or webfonts — no chrome on the diorama.
- Don't size for desktop-only: if it's unreadable on a phone at arm's length, it's wrong.
- Don't let the HUD narrate the moment the renderer is already announcing (the ascent *beat* is the vista's job; the marker just says the number).
