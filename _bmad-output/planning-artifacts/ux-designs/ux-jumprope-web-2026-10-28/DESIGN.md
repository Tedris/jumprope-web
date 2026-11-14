---
name: Jumprope Web
description: PS1-era lo-fi identity — a dithered diorama with one bone-white type axis, chrome only in the offer and pause moments, and every day-world surface rendered as an object in the room.
title: 'DESIGN.md — Jumprope Web (PS1-Style Rope-Jump Roguelike)'
status: final
created: 2026-10-28
updated: 2026-11-13
sources:
  - ../../../gdds/gdd-jumprope-web-2026-10-27/gdd.md
  - ../../../prd.md
  - ../../../epics.md
colors:
  ink: '#000000'
  scrim: '#2a3440'
  bone: '#f4f0d8'
  bone-dim: '#b8b4a0'
  role-sky: '#8fd3ff'
  role-slate: '#9aa7b4'
  role-amber: '#ffcf6e'
  role-mint: '#9fe8c0'
  role-ember: '#ff8f5e'
  rope: '#f4f0d8'
  rope-lost: '#4d4a3e'
  marker: '#8fd3ff'
  win: '#ffcf6e'
typography:
  base:
    fontFamily: 'sans-serif (system stack, no webfont)'
    fontSize: '16px'
    fontWeight: '400'
  hud-primary:
    fontFamily: 'sans-serif'
    fontSize: '32px'
    fontWeight: '400'
  hud-secondary:
    fontFamily: 'sans-serif'
    fontSize: '20px'
    fontWeight: '400'
  prompt:
    fontFamily: 'sans-serif'
    fontSize: '16px'
    fontWeight: '400'
  card-body:
    fontFamily: 'sans-serif'
    fontSize: '12px'
    fontWeight: '400'
  card-name:
    fontFamily: 'sans-serif'
    fontSize: '14px'
    fontWeight: '700'
  card-note:
    fontFamily: 'sans-serif'
    fontSize: '11px'
    fontWeight: '400'
  card-glyph:
    fontFamily: 'sans-serif'
    fontSize: '22px'
    fontWeight: '400'
  diary:
    fontFamily: 'cursive (system stack, zero download) [ASSUMPTION: falls back to base]'
    fontSize: '16px'
    fontWeight: '400'
rounded:
  DEFAULT: '0'
spacing:
  hud-gap: '4px'
  row-gap: '10px'
  top-inset: '2.5rem'
  card-pad: '10px 12px 8px'
  strip-inset: '12% from the bottom'
  menu-inset: '40% from the top'
components:
  altitude:
    color: '{colors.bone}'
    typography: '{typography.hud-primary}'
    note: 'tabular-nums; the one number (score IS altitude)'
  best-line:
    color: '{colors.bone}'
    typography: '{typography.base}'
    note: 'tabular-nums; `best N`'
  rope-pips:
    color: '{colors.rope}'
    color-lost: '{colors.rope-lost}'
    typography: '{typography.hud-secondary}'
    note: '█ held / ▒ ghost, 2px tracking, max-ever count held'
  ceiling-marker:
    color: '{colors.marker}'
    typography: '{typography.hud-secondary}'
    note: '`ceiling N ↑` / `summit N ↑`; opacity .35 while an i-frame gates the break'
  prompt:
    color: '{colors.bone}'
    role-colors: '{colors.role-sky} {colors.role-slate} {colors.role-amber} {colors.role-mint} {colors.role-ember}'
    typography: '{typography.prompt}'
    note: 'every one-shot string rides this one line'
  owned-line:
    color: '{colors.bone}'
    typography: '{typography.hud-secondary}'
    note: 'card glyphs repeated per copy + ×/⟳/↑ state suffixes'
  card-strip:
    fill: '{colors.ink} @ 55%'
    fill-selected: '{colors.scrim} @ 85%'
    border: '2px {colors.rope-lost}; bone when selected'
    min-target: '44px'
    note: 'the only pointer-interactive layer; shown only at the offer'
  card-fill-bar:
    track: '{colors.rope-lost}'
    fill: '{colors.rope}'
    note: '6px; doubles as the hold-to-confirm meter, mirrored as `[###--]` in text'
  pause-menu:
    fill: '{colors.ink} @ 55%'
    border: '2px {colors.rope-lost}'
    typography: '{typography.card-name}'
    note: 'three buttons + a readout; same tokens as the strip; shown only when paused'
  diary-page:
    color: '{colors.bone}'
    typography: '{typography.diary}'
    note: 'first-person day lines, scroll only, no panel chrome'
  board-slip:
    color: '{colors.bone}'
    typography: '{typography.base}'
    note: 'in-world cork rows; unread rows are blanked cells, never hidden rows'
  chyron:
    color: '{colors.bone}'
    typography: '{typography.hud-secondary}'
    note: 'one caption line in the TV region, ≤64 chars'
  door-prompt:
    color: '{colors.bone}'
    typography: '{typography.prompt}'
    note: 'one mesh, one line — the locked/alive wording is the whole day-type UI'
  shadow-figure:
    treatment: 'existing palette desaturated toward the area fog'
    note: 'no outline, no glow, no nameplate, no new hue'
---

# DESIGN.md — Jumprope Web (PS1-Style Rope-Jump Roguelike, Web Browser)

## Brand & Style

Deliberately lo-fi: a black-boxed pixel diorama with a whisper of type over it. The identity rule is *period-plausible* — if an element couldn't survive on a 1998 memory-card box, it doesn't go in. Personality is dry arcade signage: terse, lowercase-leaning, facts not exclamation marks; the scene emotes so the type doesn't have to.

The rule that shipped is narrower than the rule written in 2026-10-28. **Chrome is moment-bound**: the diorama stays chrome-free during play, and the two moments that have to be operated with a thumb — the offer and the pause — may carry real panels (hairline border from `{colors.rope-lost}`, translucent fill, glyph, name, blurb). No other moment gets chrome, and no moment gets a screen.

v3 adds nothing to the DOM vocabulary at all. The room, the diary, the corkboard, the TV, the chyron and the door are the same identity rendered *in the scene* instead of over it — re-semantization: nothing new, everything reinterpreted.

## Colors

| Role | Token | Hex | Use |
|---|---|---|---|
| Page / letterbox | `{colors.ink}` | `#000000` | Page background; the letterbox bars; panel fills at 55% |
| Canvas scrim | `{colors.scrim}` | `#2a3440` | Canvas fallback fill; the selected panel fill at 85% |
| Text | `{colors.bone}` | `#f4f0d8` | All primary HUD type, run lines, slip and chyron text |
| Text, secondary | `{colors.bone-dim}` | `#b8b4a0` | Card blurbs — the quietest copy that still has to be readable |
| Role — sky | `{colors.role-sky}` | `#8fd3ff` | Pace/margin role accents |
| Role — slate | `{colors.role-slate}` | `#9aa7b4` | Foundation role accents; picker-key hints |
| Role — amber | `{colors.role-amber}` | `#ffcf6e` | Volume role accents |
| Role — mint | `{colors.role-mint}` | `#9fe8c0` | HP role accents (Spare Rope, Steel Cord) |
| Role — ember | `{colors.role-ember}` | `#ff8f5e` | Risk role accents (Wind-Up, Wide Brim) |
| Rope pip | `{colors.rope}` | `#f4f0d8` | Held-rope pips; the fill bar |
| Rope lost | `{colors.rope-lost}` | `#4d4a3e` | Spent-rope ghosts; the panel hairline |
| Marker | `{colors.marker}` | `#8fd3ff` | Ceiling-marker line |
| Win | `{colors.win}` | `#ffcf6e` | Summit and milestone copy |

The five role hues are the whole accent set: an HP card reads mint, a risk card reads ember — the mapping is catalogued metadata (`card.color` → `role-*` class), not a per-card choice. There is no fourteenth color and no sixth hue: v3 adds none. Shadows desaturate toward the area's fog, the dungeon flips an existing area palette and thickens its fog, and the room's wear is geometry — NFR10 keeps the shipped product zero-bitmap, so mod-supplied textures are the only pixels anyone else can bring, and they never enter the DOM.

Panel fills are alphas of existing tokens, never new colors: resting `{colors.ink}` at 55%, selected `{colors.scrim}` at 85%.

Contrast, computed from the shipped values (correcting Session 1's estimates of 17.9 and 9.6): `{colors.bone}` on `{colors.ink}` **18.3:1**, on `{colors.scrim}` **11.0:1**, on a resting panel **15.7:1**; `{colors.bone-dim}` 10.1 / 6.1 / 8.6; `{colors.role-slate}` 7.3 on a panel; the role hues land 5.6–14.8 (`role-ember` lowest at 5.6 on `{colors.scrim}`). Every text token clears 4.5:1 on every surface it ships on. Role hues re-check against the Stratosphere and Moon palettes when a vista lands. v3's diegetic surfaces carry the same bone-on-dark values in-world, so a cork slip or a chyron line inherits the ladder rather than inventing one.

`{colors.rope-lost}` as a hairline is 2.4:1 on `{colors.ink}` — it is an **edge, never a text carrier**. A control that must be findable by contrast alone gets a `{colors.bone}` selected state, not a brighter border.

## Typography

One system sans, no webfont (page-load budget), at the shipped ladder **11 / 12 / 14 / 16 / 20 / 22 / 32**. `{typography.hud-primary}` is the altitude and nothing else; `{typography.hud-secondary}` is the marker, the pips and the owned line; `{typography.base}` is copy and prompts; 12/14/11 belong to the card strip and the pause menu — the card name is the only bold in the product; `{typography.card-glyph}` is the one Unicode mark per card. Digits are proportional as shipped, with `font-variant-numeric: tabular-nums` on the altitude and best lines so a climbing number doesn't jitter. Hierarchy is size and color, almost never weight.

The one exception is the diary: its day lines carry a handwriting treatment through `{typography.diary}` — the system cursive generic family, still zero bytes downloaded. After the Interrupt the same tallies re-name themselves into the stat panel by changing the *label rows*: diary handwriting into System sans is a copy change, not a stylesheet.

## Layout & Spacing

Everything sits on the canvas's vertical centerline inside the letterbox band: `{spacing.top-inset}` from the top, `{spacing.hud-gap}` column gaps. The `#hud` column order, as built:

**altitude → best → rope pips → prompt → ceiling marker → owned line**

Two absolutely-positioned layers share the same viewport overlay: the **card strip** at `{spacing.strip-inset}` (`{spacing.row-gap}` gaps, 12px side padding, 108–168px cards) and the **pause menu** at `{spacing.menu-inset}`. The HUD scales with the letterbox band, never around it, so desktop and mobile see identical relative layout (NFR7). v3's surfaces live in the scene and are framed by the same band: four corners of one room, a corkboard wall, a television in view, a door that shouldn't exist — the composition is drawn in [`mockups/gym-poster.html`](mockups/gym-poster.html), and the phone-portrait reading of the same band is in [`mockups/mobile-portrait.html`](mockups/mobile-portrait.html). Mocks illustrate; **the spines win on conflict** — a mock that disagrees with a token table or a component row is a bug in the mock.

## Elevation & Depth

Three layers, and that's all there is: the WebGL scene; the transparent text overlay; the moment chrome (translucent panels) that exists only at the offer and at pause. Nothing stacks — pause replaces the offer, the offer replaces play. No modals, no toasts, no scrims over scrims.

Depth inside the scene is fog and silhouette, never shadow maps or bloom: a posted shadow reads as *past* by desaturation and distance, a dungeon reads as *wrong* by palette flip and fog density, the moon-jump moment reads by horizon and scale. The one automatic camera move in the game (the Interrupt push-in) is depth as storytelling, and it damps to a cut under reduced motion.

## Shapes

Zero radius, zero gradients, zero bevels — `{rounded.DEFAULT}` everywhere. The shape vocabulary is: the **pip** (`█` held, `▒` ghost — solid vs. dithered, so loss never depends on hue); the **card glyph** (one Unicode mark per card — ☁ ⌛ ✦ ◇ ✽ ♣ ⚙ ⌸ ∥ ▣ ⇈ △); the **fill bar** (6px track, `{colors.rope-lost}` under `{colors.rope}`, doubling as the hold-to-confirm meter); the **`[###--]` text meter** (the same meter on the DOM-less text channel); and, in v3, the **slip** (a rectangle of paper in the scene, bone text, blanked cells for rows the player can't read yet). Anything round, glossy or beveled is out of identity.

## Components

- **Altitude** — `{typography.hud-primary}` `{colors.bone}`, tabular; the one number that counts.
- **Best line** — `{typography.base}` `{colors.bone}`, `best N`, tabular; the only other always-on number.
- **Rope pips** — up to 5 glyphs, `{colors.rope}` held / `{colors.rope-lost}` ghosts, max-ever held so a loss reads as a segment that went dark rather than a segment that vanished.
- **Ceiling marker** — `{typography.hud-secondary}` in `{colors.marker}`, `ceiling N ↑`, reading `summit N ↑` in the summit area; drops to 0.35 opacity while a live i-frame blank is gating the break off, so the line never promises what the sim refuses.
- **Prompt line** — `{typography.prompt}` in `{colors.bone}`, tinted by the highlighted card's role class; the shared channel for every one-shot string, including the once-per-unlock `unlocked: NAME`, which is spent on the first over/idle render and can never fire mid-run.
- **Owned line** — `{typography.hud-secondary}`, card glyphs repeated per copy, state cards reading live: `∥×3`, `▣⟳2`, `⇈↑1`.
- **Card strip** — the only pointer-interactive layer: resting fill `{colors.ink}` @ 55%, `2px` border `{colors.rope-lost}`, selected = `{colors.bone}` border + `{colors.scrim}` @ 85%; `{typography.card-glyph}` icon, `{typography.card-name}` name, `{typography.card-note}` blurb in `{colors.bone-dim}` with the picker digit in `{colors.role-slate}`; ≥44px targets; the 6px fill bar under the copy.
- **Card fill bar** — a 6px track in `{colors.rope-lost}` with a `{colors.rope}` fill, `{spacing.hud-gap}` under the copy; the same value is spelled `[###--]` in the prompt channel so the confirm state survives without a DOM.
- **Pause menu** — three buttons (Resume / −·readout·+ / Sound on-off) in the strip's tokens with `{typography.card-name}` labels, `44px` minimum targets; the readout says `audio off` when audio never booted.
- **Diary page** — `{typography.diary}` `{colors.bone}`, day lines, scroll only; the first page is also where the player names themselves, one keystroke.
- **Corkboard** — the world map made of cork: one slip per alive gate (tier, party, reward, shelf life), rows beyond the player's INT as blanked cells in `{colors.rope-lost}`.
- **TV / chyron** — one `{colors.bone}` caption line in the lower third of the set; the ladder moves infomercial → weather/sports → news; the chyron is where RANK, LEVEL and eventually the player's name appear.
- **Door** — one mesh, one `{typography.prompt}` line; locked/alive wording is the only UI the day-type switch gets.
- **Corner target** — deliberately unstyled: the corner *is* the affordance (a groove, a wall, a bar, a nook, a bed, a door). No highlight, no outline, no cursor change; its legibility is the object's, and its hit area is generous.
- **Shadow figure** — the existing character palette desaturated toward the area fog, rendered at distance; no outline, glow, nameplate or new hue.
- **Skins and mods** — no visual surface at all: resolved from the URL at boot, a miss falls through to shipped defaults in total silence (authors get console verdicts).

## Do's and Don'ts

- Do keep the HUD on one center axis in the shipped order; muscle memory is the contract.
- Do carry every color from the five-role set before inventing a sixth — and don't invent the sixth anyway.
- Do confine chrome to the offer and the pause, token-bound, and strip it the moment play resumes.
- Do let the scene own spectacle: palette flips, wear, fog, vista swaps. The HUD reports; the room explains.
- Do render v3's day, world and shadow information as objects in the room, never as a panel class.
- Do pair any meaning with shape or copy — a hairline, an icon or a desaturation is never the only carrier.
- Don't add panels, borders, radius, gradients, webfonts or overlays anywhere else: no chrome on the diorama.
- Don't size for desktop-only — if it's unreadable on a phone at arm's length, it's wrong.
- Don't let the HUD narrate the moment the renderer is already announcing (the ascent beat is the vista's job; the marker just says the number).
