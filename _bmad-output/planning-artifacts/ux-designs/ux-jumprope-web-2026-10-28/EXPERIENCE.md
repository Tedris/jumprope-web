---
title: 'EXPERIENCE.md — Jumprope Web (PS1-Style Rope-Jump Roguelike)'
status: final
created: 2026-10-28
updated: 2026-10-28
sources:
  - ../../../gdds/gdd-jumprope-web-2026-10-27/gdd.md
  - ../../../prd.md
  - ../../../epics.md
form_factor: Web browser — desktop + mobile, equal parity
---

# EXPERIENCE.md — Jumprope Web

## Foundation

Browser-only, static files, zero install; desktop and mobile are first-class equal surfaces (decision 2026-10-28). Input: keyboard (Space/Enter, P/Esc, 1/2/3, Mute/−/=) and pointer/touch anywhere. All HUD rendering is a transparent DOM overlay driven by the shell's one-way view payload — the renderer draws the world, the overlay reports numbers, and neither owns the other. Visual identity: see DESIGN.md. The letterbox band is the layout contract: every surface scales inside it on every device.

## Information Architecture

There is deliberately almost no navigation — the game is a loop, not a menu tree:

- **Load → first jump** (≤2 s, no title screen, no start button; the run auto-launches its lead-in). [ASSUMPTION: v1's auto-start lead-in carries into v2 unchanged.]
- **In-run HUD** (non-interactive overlay, one center stack): altitude → rope pips → ceiling marker → owned/build state.
- **Offer freeze** (every 10th skip): frame freezes, prompt shows the pick; pointer/tap or 1/2/3 picks; run resumes through the shared lead-in.
- **Pause** = freeze-frame with a tiny prompt; P/Esc or tab-hide toggle it. No pause *menu*. Options live inline: Mute key, −/= volume. [ASSUMPTION: v2 adds no settings screen; persisted mute/volume are key-driven only.]
- **Run over** = copy line in the prompt slot (loss `bone` / win `win`); any press restarts.

Depth budget: nothing is more than one interaction from play. There are no screens deeper than the prompt line.

## Surface Inventory (IA closure map)

| Need (from epics) | Surface | Journey |
|---|---|---|
| Rope count (FR4) | Rope pips, HUD slot 2 | Ana's last-rope climb |
| Altitude = score (FR5) | Altitude number, HUD slot 1 | both |
| Ceiling target (FR8) | Ceiling marker, HUD slot 3 | Ana's summit swing |
| Area identity (FR15) | Scene vista (renderer, not HUD) | Ana step 4 |
| Card pick (FR10/13) | Offer prompt + 1/2/3 + tap | Devon's phone run |
| Build state (FR14) | Owned/build line, HUD slot 4 | Ana step 2 |
| Win / loss (FR26) | Run-over line in prompt slot | Ana climax / Devon's trip |
| Audio control (FR27) | Mute/−/= keys, persisted | Kenji's quiet office |

Every stated need has a surface; every surface appears in a journey. Closure holds.

## Voice and Tone

Dry, terse, lowercase-leaning arcade signage inherited from v1's `Missed! Score N`: facts, not exclamation. Copy budget: prompts ≤ ~40 chars; never explain a mechanic the HUD just demonstrated. Card blurbs state the rule plainly (`+1 rope (max 5)`), never sell it. Win copy is understated on purpose — the fanfare does the celebrating. [ASSUMPTION: English-only copy, no i18n surface for hobby scope.]

## Component Patterns

- **Altitude** — updates on every scored pass; the *only* number that counts; never animates the font itself.
- **Rope pips** — track rope count live; a trip blanks the fastest rope's pip; ghosts hold the max-ever count so loss is readable. Never interactive.
- **Ceiling marker** — shows distance to the current ceiling; when the marker approaches zero the renderer owns the drama. Summit area: marker switches to the win-target phrasing.
- **Offer prompt** — freeze happens sim-side (status `choose`); highlighted card tints via `role-*` classes; 1/2/3 and tap pick the same card. Pick → shared `resumeRun()` lead-in, never a hard restart.
- **Owned/build line** — derived entirely from the view payload; state suffixes update the frame after charge/rope/jump changes.
- **Pause** — freeze-frame, inputs held across the pause are released by the shared hygiene handler; resume replays the catchable lead-in.

## State Patterns

- **Running** — HUD full opacity, no prompts.
- **Choose (offer)** — frame frozen; prompt colored; keys 1/2/3 live; everything else inert.
- **Paused** — freeze-frame + `paused — P` style hint; tab-hide auto-pauses and auto-resumes; manual pause waits for the player. [ASSUMPTION: hint copy format.]
- **I-frames** — HUD unchanged (the blank is felt in the scene juice); no separate overlay. [ASSUMPTION: no i-frame HUD indicator; juice carries it — revisit if playtests can't read it.]
- **Ascent** — vista/palette beat in-scene; marker text swaps to the new ceiling on the same tick.
- **Loss** — `Missed! Altitude N` (+ `best N` when new); any press restarts fresh (permadeath contract).
- **Win** — `Summit. Altitude N` in `win` amber + fanfare; any press restarts. [ASSUMPTION: win copy wording.]
- **Storage unavailable** — silent session-only degradation; the best slot just never upgrades.

## Interaction Primitives

- **Press/hold anywhere** — the one gameplay verb: start, jump (hold = height), restart. Identical on key and touch.
- **Tap card / 1-2-3** — the only other live inputs, only during `choose`.
- **P / Esc** — pause toggle; **tab hide/return** — automatic pause/resume pair.
- **Mute key / − / =** — audio bus; desktop-only, repeat-guarded; mobile relies on the OS mixer. [ASSUMPTION: no on-screen volume widget — OS mixers cover mobile, keeping the no-chrome rule.]
- No hover semantics; no drag; no gesture recognizers beyond pointer-down.

## HUD & Diegetic UI

The HUD is entirely **non-diegetic** DOM overlay (aria-hidden, pointer-events-none), and deliberately stays minimal — four lines on one axis. The **diegetic layer is the scene itself**: rope count is *also* literally true on-screen (N ropes sweep the skipper), the ceiling is announced by vista/palette flips, and the "i-frame" state is played by ropes passing through the character. Hierarchy: altitude (critical, largest) → pips (critical, shape-coded) → marker (tension, medium) → owned line (reference, small). Nothing hides during play; nothing appears that isn't one of the four.

## Input Schemes

- **Keyboard (desktop)** — Space/Enter jump; 1/2/3 pick; P/Esc pause; Mute/−/= audio. All single-press, no chords, no key required outside this set.
- **Touch (mobile browser)** — pointerdown anywhere = press; card taps; no on-screen buttons at all (chrome-free rule); touchstart-jump must not double-fire with pointer events (v1 hygiene carries).
- **Pointer (desktop mouse)** — same semantics as touch.
- Form-factor parity rule: every keyboard affordance except 1/2/3 and audio keys has a pointer equivalent; 1/2/3 is an accelerator, never the only path.

## Game Feel & Juice

UI juice = the v1 significance tiers, extended not replaced: `nearMiss {hitstop 40, shake 1.5, particles 10}`; trip, charge-pop, ascent, and win each claim the next rung up [ASSUMPTION: exact tier numbers are an Epic 5 design decision; UX only fixes the *ordering* and that win > ascent > trip > nearMiss]. Audio follows gameplay; nothing beat-locks. Reduced-motion: cosmetics damp, judgment byte-identical (v1 contract); the ascent beat degrades to a static palette flip; pips/marker never animate.

## Accessibility Floor

Hobby-scope floor, no extra cost:

- Contrast: all HUD tokens ≥ 4.5:1 on both ink and scrim (verified values in DESIGN.md Colors).
- Shape-reinforced state: rope pips read solid/ghost, never color-only.
- `prefers-reduced-motion` respected for every new effect; zero timing impact.
- Full one-switch playability: the game is playable with a single key or single touch point by definition.
- Pause/resume and input-loss hygiene are automatic — no player task required.
- aria-hidden overlay text means assistive tech sees a canvas; acceptable for hobby scope [NOTE FOR UX: if this ever ships wider, the run-over line deserves a live-region announcement].

## Key Flows

### Ana lands the summit swing on her fifth desktop run

Ana, a roguelike regular, is on the 4th-floor laptop with headphones.

1. She skips; the altitude number (32px, center) ticks up 2 points per pass — she knows it's height because it *is* height.
2. The owned line reads `Heavy Rope ×2 · Spare Rope · Second Wind ⟳1` — her build in one glance, in role colors.
3. At skip 120 the marker reads `ceiling 214 ↑`. She holds a full charge jump — misses by 30. Next offer: Launch Heels. She taps it.
4. Blimp Deck → Stratosphere: the vista flips, palette cools, the rope tightens — she *feels* the area change before she reads the new marker line.
5. A trip. One pip goes ghost. The scene blanks past her while three ropes pass through — she reads the i-frames as protection, not a stall.
6. **Climax:** summit attempt — the marker says `summit 612 ↑`, she splits a Second Wind at apex, the ceiling breaks, amber `Summit.` lands with the fanfare, altitude freezes at 2,147. She didn't open a menu once; the whole run was one key.
7. Press. Lead-in. A new build starts.

### Devon's phone run in a bus window

Devon, casual, portrait-mode browser on the bus.

1. Tap to jump — the page never scrolls, zooms, or shows buttons; the game fit the phone on load through the letterbox band.
2. An offer freezes the frame: two card names in role colors. He taps the left one; run resumes with the catchable lead-in.
3. He trips down to one rope — four ghost pips make the loss obvious at a glance even one-handed.
4. Last-rope: the mix goes thin and beat-forward; his thumb gets careful.
5. A trip ends it: `Missed! Altitude 588`. Best shown. Tap. Next try, new cards. Total friction: thumbs, zero taps outside the canvas.
