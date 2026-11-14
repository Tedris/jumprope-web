---
title: 'EXPERIENCE.md — Jumprope Web (PS1-Style Rope-Jump Roguelike)'
status: final
created: 2026-10-28
updated: 2026-11-13
sources:
  - ../../../gdds/gdd-jumprope-web-2026-10-27/gdd.md
  - ../../../prd.md
  - ../../../epics.md
form_factor: Web browser — desktop + mobile, equal parity
---

# EXPERIENCE.md — Jumprope Web

## Foundation

Browser-only, static files, zero install; desktop and mobile are first-class equal surfaces (decision 2026-10-28). Input: keyboard (Space/Enter, arrows, P/Esc, 1/2/3, Mute/−/=) and pointer/touch anywhere. No engine UI system — the DOM overlay *is* the UI toolkit, and it is deliberately tiny.

Two layers of contract. **The view payload is one-way:** the shell reads sim state and writes text and classes; the renderer draws the world; neither owns the other, and nothing in the DOM can reach back into the sim (`tests/boundary.test.js`). **The letterbox band is the layout contract:** every surface scales inside it on every device.

v3 stacks a day around the rope run without touching either contract: the rope phase stays the canonical clock inside every activity, the day and world clocks are meta-layer only, and the new surfaces are **objects in the room**, not new DOM. Visual identity: see DESIGN.md. Four key screens illustrate this contract — [`mockups/gym-poster.html`](mockups/gym-poster.html) (the room and its corners), [`mockups/corkboard.html`](mockups/corkboard.html) (slip anatomy), [`mockups/diary-page.html`](mockups/diary-page.html) (the reader, the prophecy notch, the rename), [`mockups/mobile-portrait.html`](mockups/mobile-portrait.html) (phone portrait). They illustrate; **the spines win on conflict**.

## Information Architecture

There is deliberately almost no navigation — the game is a loop inside a day inside a life, never a menu tree:

- **Boot → idle** — the scene loads on the idle pose with `press space / tap to start`; one press starts the day's first activity through the shared lead-in. There is still no title screen and no start button. (Session 1's "auto-launch" assumption is retired: boot is idle-gated, `js/shell.js:301`.)
- **The day** — one room, four corners. One tap means the current station's beat (jump / stride / rep / page); tapping a corner walks the skipper there and swaps the station at arrival. A fifth corner — the bed — ends the day on purpose.
- **In-activity HUD** (non-interactive overlay, the six-slot stack): altitude → best → rope pips → prompt → ceiling marker → owned line. The stack is **constant across stations** (decision 2026-11-13): at the sprint wall, the rack and the nook the same six lines stay put and the rope-owned slots (pips, marker) hold the rope activity's last values — muscle memory beats cleverness, and a moving HUD is a second contract nobody asked for. The stack is the rope activity's instrument panel; elsewhere it reads as a held-over dashboard, which is the honest state of a day that isn't skipping.
- **Offer freeze** (every 20 activity beats, counted across the whole day): the frame freezes, the card strip appears, pick by tap / swipe / arrows / 1–3 / hold-to-confirm; the run resumes through the shared lead-in. Day-cards die at nightfall; life-cards use the same strip and never die.
- **Nightfall** — one beat, not a screen: page-turn stinger, one diary line, the room wears a little more, the day counter moves.
- **Pause** — freeze-frame plus the audio row (Resume / −·readout·+ / Sound on-off); P/Esc or tab-hide toggle it. Still nothing deeper than that row.
- **Session end inside a day** — a last-rope trip ends the *rope session*, not the game. The run record nests verbatim as `day.station` (Story 9.1, FR40), so `run.status === 'over'` with `run.outcome` `tripped` / `summit` **survives v2 unchanged** — what retires is the meaning, not the state: the line reads in the prompt slot, the day carries on with that stat's income capped, and nothing rolls back. `Missed! Altitude N` and `Summit. Altitude N` stay as in-day copy; the summit's status as the game's win moves to the reveal arc (GDD §Completion and Loss), where the chyron replaces it.
- **Completion** — a state, not a screen: the derived census enters S and the chyron says the player's name. The room keeps playing.

Depth budget: nothing is more than one interaction from play, and the deepest surface in the game is a scrollable page in a book that exists in the room.

## Surface Inventory (IA closure map)

| Need | Surface | Journey |
|---|---|---|
| Rope count (FR4) | Rope pips, HUD slot 3 | Ana step 5 |
| Altitude = score (FR5) | Altitude + best lines, HUD slots 1–2 | Ana step 1, Devon step 5 |
| Ceiling target (FR8) | Ceiling marker, HUD slot 5 | Ana step 3 |
| Area identity (FR15) | Scene vista (renderer, not HUD) | Ana step 4 |
| Card pick (FR10/13/48) | Card strip + 1/2/3 + swipe + hold | Ana step 3, Devon step 2 |
| Build state (FR14) | Owned line, HUD slot 6 | Ana step 2 |
| Session end / no loss (FR40, FR42) | In-day prompt lines; the day keeps running | Ana step 5, Devon step 5 |
| Activity failure texture (FR42) | The body: trip / stumble / failed rep / falling asleep, then the income line flattens | Ana step 5, Devon step 4 |
| Audio control (FR27/30) | Mute/−/= keys + pause row, persisted | Kenji step 1 |
| Unlocks earned across runs (FR33/34) | `unlocked: NAME` on the over/idle prompt | Ana step 6 |
| Equip a skin / load a mod (FR37–39) | URL query (`?skin=`, `?mods=`) — zero surface | Kenji step 5 |
| Skin/mod failure (NFR16, NFR22) | Total silence (shipped defaults) + author-side console | Kenji step 5 |
| Stamina budget (FR43) | Diegetic body language: posture, breathing, sore-walk | Ana step 1, Devon step 3 |
| Voluntary sleep (FR43) | The bed corner | Devon step 3 |
| Day persistence (FR44) | No surface — reopening lands the day exactly where it was | Devon step 1 |
| Day identity & count (FR44/51) | Diary page; the room's wear | Ana step 6 |
| Stat growth & ceilings (FR45/46) | Room wear → diary tallies → the renamed stat panel | Ana step 6, Kenji step 3 |
| Ceiling teaching (FR47) | Dotted prophecy line in tomorrow's diary; sore-walk footfalls | Ana step 6 |
| Day-cards (FR48) | Card strip (shared with v2 offers) | Devon step 2 |
| Life-cards (FR49/50) | Same strip, milestone-framed copy, permanent | Ana steps 6–8 |
| Name yourself (UX-DR6) | Diary first page, one keystroke | Ana step 0 (day 1, before this flow) |
| The world's gates (FR52/53) | Corkboard slips; blanked rows for unread ones | Devon step 1 |
| The world's news (FR54) | TV caption + murmur; the Interrupt push-in | Kenji step 2 |
| RANK / LEVEL (FR55) | Chyron and board debuts, in-world, before any panel | Kenji step 3 |
| A dungeon day (FR56) | The door mesh + its prompt line; the flipped, fogged stage | Devon step 4 |
| Shadows: cast / re-cast / retire (FR57) | Corner prompts; desaturated replay figures | Ana step 7 |
| Automation (FR58) | Owned line, like any other card; the room runs without her thumb | Ana step 8 |
| Completion (FR59) | The chyron, carrying the saved name | Kenji step 4 |
| Save migration v2→v3 (FR60) | No surface — the first boot after upgrade is simply the same save, older | — (deliberately no beat: a migration that needs a journey is a migration bug) |

Every stated need has a surface; every surface appears in a journey. Closure holds — with two deliberate exceptions above (persistence and migration), which are contracts the player should never have to visit.

## Voice and Tone

Dry, terse, lowercase-leaning arcade signage: facts, not exclamation. Copy budget — prompt lines ≤ ~40 chars, chyron ≤ ~64; never explain a mechanic the room just demonstrated. Card blurbs state the rule plainly (`+1 rope (max 5)`), never sell it. Win and loss copy stays understated on purpose; the fanfare does the celebrating.

v3 adds one register, not three: **melancholy-comic**. The room remembers you fondly and slightly sadly. The diary speaks in the first person, one sentence (three at most), and it is the game's only tutorial voice — which later reads as the System panel saying the same words in a flat voice, and that is the whole horror of the reveal. The TV speaks in boilerplate: jingles, then weather, then a bulletin that uses the player's name. A mechanic that needs a text box is a design gap, not a copy gap (FR47), so voice carries *flavor*, objects carry *instruction*.

## Component Patterns

- **Altitude** — updates on every scored pass in `{typography.hud-primary}`; the only number that counts; never animates the font itself.
- **Best line** — recomputed every scored pass beside the altitude; the only other always-on number; says nothing about rank or stats, which arrive in-world instead.
- **Rope pips** — track rope count live; a trip blanks the fastest rope's pip; ghosts hold the max-ever count so loss is readable. Never interactive.
- **Ceiling marker** — distance to the current ceiling; near zero the renderer owns the drama, and while an i-frame blank is gating the break off the line dims to 0.35 rather than lying.
- **Prompt line** — the single channel for every one-shot string, including the once-per-unlock `unlocked: NAME`, which is spent on the first over/idle render and can never fire mid-run.
- **Owned line** — derived entirely from the view payload; state suffixes update the frame after charge/rope/jump changes, so a spent charge reads the same tick it is spent.
- **Offer freeze** — the freeze happens sim-side (status `choose`); the card strip is the only pointer-live layer; every gesture and key funnels through the same pick vars, so pause/blur/tab hygiene has one handler. Pick → shared `resumeRun()` lead-in, never a hard restart.
- **Card strip** — hover-equivalent is *selected*, and selection is shared by cursor cycle, swipe, arrows and digit keys. A hold charges the fill bar to confirm; releasing early clears it; a swipe cycles and clears it. Nothing confirms on a bare tap-and-lift. Day-cards and life-cards use the identical strip; only the copy and what survives nightfall differ.
- **Card fill bar** — the 6px meter doubles as the hold-to-confirm gauge and mirrors as `[###--]` in the text channel, so the confirm state reads on a DOM-less harness and on a screen magnifier alike.
- **Pause menu** — freeze-frame; inputs held across the pause are released by the shared hygiene handler; resume replays the catchable lead-in. Buttons are inert unless the panel is showing, and the readout reports `audio off` rather than a healthy percentage when audio never booted.
- **Corner target** — deliberately unstyled: the affordance is the object. A generous, always-hittable region; the tap *routes* the character, it never acts on the world directly. Station swap, sleep, gate entry, diary open and shadow curation are the same primitive answering different corners.
- **Diary page** — scroll only; every string is a state-keyed selector, so the same state reads the same forever, including in a shadow's replay of the day. Its first page takes the player's name in one keystroke, and after the Interrupt its tally labels are the stat panel's labels — see [`mockups/diary-page.html`](mockups/diary-page.html), where the two variants differ in exactly four rows.
- **Corkboard** — rows are state fields, indexed not inferred; empty world = bare cork; unreadable rows render as blank cells in `{colors.rope-lost}`, never hidden rows — see [`mockups/corkboard.html`](mockups/corkboard.html) for the slip's four rows and both refusal wordings.
- **TV / chyron** — one `{colors.bone}` line, one read of state; RANK, LEVEL, the ladder and the player's name all arrive this way, which is why no stat panel is ever shipped.
- **Door** — one mesh, one prompt line; a locked gate is refused as data — the wording changes and no state moves. Entering commits the rest of the day.
- **Shadow figure** — a posted day loops at its own tempo, never syncing to the player and never growing; curation (cast / re-cast / retire) happens by tapping the corner and answering its prompt, never in a menu.
- **Skins and mods** — resolved at boot from the URL; a miss falls through to shipped defaults with no message at all (player-silent, author-loud on the console).

## State Patterns

- **Idle (boot / after a day)** — scene at rest, `press space / tap to start`; pending unlock lines surface here.
- **Running** — HUD full opacity, no prompts, chrome gone.
- **Choose (offer)** — frame frozen sim-side (status `choose`); the strip is live; keys outside the pick set are inert; the hitstop deadline (`stopUntil`) blocks both sim stepping and digit confirms, so a pick can never land inside the freeze of the skip that caused it.
- **Paused** — freeze-frame + `paused — press P to resume`; tab-hide auto-pauses and auto-resumes; manual pause waits for the player.
- **I-frames** — HUD unchanged (the blank is felt in the scene juice and in the dimmed marker); no separate overlay.
- **Ascent** — vista/palette beat in-scene; marker text swaps to the new ceiling on the same tick.
- **In-day session end** — rope session over, day continues; the AGI line caps and the diary will say so tonight.
- **Capped** — beats keep playing with zero income: full animation, no ledger write, one `cap` event; tomorrow's diary line carries a dotted notch.
- **Nightfall** — one settlement transaction: day-cards dissolve, feed and caps settle, shadow outputs bank, one diary line is written, the room wears, the world ticks exactly once.
- **Nightfall (forced)** — the pool empties mid-beat: the identical nightfall path runs, and the two differ only in who clicked. Resting a day on purpose and burning out are the same transaction.
- **Cold load / reopen** — the day resumes exactly as left (pool, beats, caps, station, recordings); the world is untouched, because nothing but compost ticks it. No "continue?" screen: there is nothing to continue from.
- **Locked gate** — the door's prompt reads locked and no state moves; refusal is data, not an error.
- **Bare cork** — an empty world renders cork with no slips; emptiness is a look, not a placeholder.
- **Diary at day 0** — the first page is the name prompt; staying unnamed is legal and the page simply re-offers.
- **Dungeon day** — the rest of the day is committed: corners stop routing, the stage flips its palette and thickens its fog; ejection locks that gate for the day and costs nothing else.
- **Shadow posted** — a desaturated replay running in a corner, frozen at its casting day's ceilings; empty corner when retired or when its recording fails its checksum (silent for players, loud on the author console).
- **The Interrupt** — once per save: a weather bulletin gives way to the news, the camera drifts toward the TV — the game's only automatic camera move, control never lost — and gates start existing.
- **Completion** — the census enters S, the chyron carries the saved name and later quotes the player's own diary lines; designed endless continues after.
- **Storage unavailable** — silent session-only degradation. **Corrupt v3 save** — two-step degrade (checksum → prev-key → fresh with a flag), never a silent rollback.

## Interaction Primitives

- **Press/hold anywhere** — the one gameplay verb: start, jump (hold = height), stride, rep, page, dodge. Identical on key and touch.
- **Tap a corner** — the one navigation verb: station switch, sleep, gate entry, diary open, shadow curation. It routes the character; it never acts. No keys are added for it (decision 2026-11-13) — accessibility is carried by generous targets, not accelerators.
- **Offer gestures** — tap a **card**: select it and arm the hold; tap the **canvas**: cycle and arm the hold; **hold ≥800ms**: confirm, metered by the 6px bar and the `[###--]` text channel; release early: clear the fill, select nothing; swipe ≥28px: cycle and clear; arrows: cycle; 1/2/3: confirm instantly. Every one of them writes the same pick vars, so there is one hygiene path.
- **P / Esc** — pause toggle; **tab hide/return** — automatic pause/resume pair.
- **Mute key / − / =** — audio bus, desktop-only, repeat-guarded; mobile relies on the OS mixer, plus the pause row on both.
- No hover semantics; no drag; no gesture recognizers beyond pointer-down and a horizontal swipe.

## HUD & Diegetic UI

Two instruments, cleanly split. The **DOM HUD** is non-diegetic, aria-hidden, pointer-transparent, six lines on one axis, and it belongs to the *rope* activity: altitude (critical, largest) → best (reference) → pips (critical, shape-coded) → prompt (transient) → marker (tension) → owned (reference). Nothing hides during play and nothing appears that isn't one of the six.

Everything the *day* needs to say is **diegetic**: stamina lives in the body (posture, breathing, the sore-walk after a growth day), not in a bar; station identity lives in the corner you're standing in; progress lives in the room's wear (the groove, the bent bar, the diary towers, the scuffed wall); the world map is cork and paper; the news is a television; ranks and the player's name are a chyron; automation is a person in the corner repeating their best day. The rule from the GDD holds as a UX rule: **nothing new, everything reinterpreted** — the stat panel is never shipped because the diary tallies were always the stat panel.

The v2 mechanisms stay exactly where they were: rope count is *also* literally true on-screen (N ropes sweep the skipper), area changes are announced by vista and palette, and i-frames are played by ropes passing through the body.

## Input Schemes

- **Keyboard (desktop)** — Space/Enter for the universal tap; arrows cycle the offer cursor; 1/2/3 (Digit and Numpad) confirm instantly; P/Esc pause; Mute/−/= audio. All single-press, no chords, no key outside this set is required.
- **Touch (mobile browser)** — pointerdown anywhere = the tap; corner taps navigate; card tap + hold-to-confirm replaces every keyboard accelerator. No on-screen buttons at all (chrome-free rule); touchstart/pointer double-fire hygiene carries from v1. Corner geometry and thumb arcs at 390×844 are in [`mockups/mobile-portrait.html`](mockups/mobile-portrait.html).
- **Pointer (desktop mouse)** — same semantics as touch, plus arrows for the cursor.
- Form-factor parity rule: every keyboard affordance except 1/2/3 and the audio keys has a pointer equivalent; 1/2/3 is an accelerator, never the only path. Corner navigation is the mirror case — pointer-first, one-button-safe, keyboard-neutral (decision 2026-11-13: no corner-cycle key ships) — so a keyboard-only player never needs a mouse to move through the room, since the character walks to whatever corner was last targeted and the tap-anywhere verb keeps the day playable one-handed. [NOTE FOR UX: if a keyboard-only accessibility report lands, the corner-cycle key is the line to revisit.]

## Game Feel & Juice

UI juice = one significance ladder, `JUICE_TIERS` in the shell, extended not replaced — the numbers that shipped with Epic 6:

| Event | hitstop (ms) | shake | particles |
|---|---|---|---|
| skip | 8 | 0.5 | 4 |
| nearMiss | 40 | 1.5 | 10 |
| chargeUsed | 50 | 1.6 | 11 |
| ascend | 60 | 1.75 | 12 |
| ropeLost | 65 | 1.9 | 14 |
| win | **0** | 1.95 | 15 |
| trip | 80 | 2.0 | 16 |

The ordering rule the UX owns: shake and particles climb monotonically with significance, and **hitstop is the column that lies on purpose** — the win tier carries zero hitstop by design, because freezing the tick that ends a run would stutter the moment it celebrates. Hitstop is a deadline, not a queue: a fresh hit never waits behind an older one. Audio follows gameplay; nothing beat-locks.

v3 adds four felt channels, all diegetic, all dampable: **nightfall** gets a page-turn stinger and a page turn — the day ends with a sound, not a dialog; **the TV** murmur-drives its own channel (jingles → bulletins → the news's first silence) as a fourth audio layer; **the sore-walk** certifies a growth day in the character's legs with matching footfalls, and a flat day produces no stiffness at all; **the Interrupt** gets the game's one camera drift. **Shadows** are felt as calm — a posted day loops contentedly at the same tempo forever, never syncing to the player. Dungeon days trade the whole juice register for a danger bed and flinch. Reduced motion: cosmetics damp, judgment stays byte-identical — the ascent beat degrades to a static palette flip, the camera drift to a cut, pips and marker never animate.

## Accessibility Floor

Hobby-scope floor, no extra cost:

- Contrast: every text token ≥ 4.5:1 on every surface it ships on (computed values in DESIGN.md Colors); `hairline` edges carry no meaning alone.
- Shape-reinforced state: pips read solid/ghost, capped-vs-earning reads through animation and tomorrow's page, blanked board cells are a shape, never a dimmed color.
- `prefers-reduced-motion` respected for every effect including the camera drift; zero timing impact.
- Full one-switch playability: the game is playable with a single key or a single touch point by definition — one verb for the day, one verb for the room.
- Pause/resume and input-loss hygiene are automatic — no player task required.
- Legibility at phone distance for the diary, board slips and chyron, which are the v3 surfaces most likely to be sized by the artist rather than the stylesheet.
- aria-hidden overlay text means assistive tech sees a canvas; acceptable for hobby scope, and v3's diegetic surfaces move meaning *into* the scene, which costs a blind player legibility that the DOM HUD never had [NOTE FOR UX: if the audience widens, the chyron and diary lines are the two strings that deserve a live region].

## Inspiration & Anti-patterns

Carried: *Scarlet Skips* (one button, one rope, rhythm as identity); Solo-Leveling-flavored premises told through a room and a television; incremental games that hide their math in objects.

Anti-patterns this UX refuses: quest markers, arrows, or objective text (the board is the only pointer and it is made of cork); tutorial copy (FR47's zero-UI law — the room teaches); a stat panel, a map screen, a codex, or a settings page; radial menus or context buttons on objects (the tap routes, it never acts); unlock notifications mid-run; error dialogs for failed mods; any camera move that isn't the one drift; any second verb.

## Key Flows

### Ana lands the summit swing on her fifth desktop run

Ana, a roguelike regular, is on the 4th-floor laptop with headphones.

**Day 1, before any of this:** the diary's first page offered *name yourself*, and she typed `ana` — one keystroke, asked once, never rewritten.

1. She taps once at boot — the idle line goes away and the rope starts its lead-in. The altitude number (32px, center) ticks up 2 points per pass; her breath and posture say how far into the day she is long before any number would.
2. The owned line reads `Heavy Rope ×2 · Spare Rope · Second Wind ⟳1` — her build in one glance, in role colors.
3. At skip 120 the marker reads `ceiling 214 ↑`. She holds a full charge jump — misses by 30. The offer strip slides in; she holds on Launch Heels until the little bar fills and it's hers.
4. Blimp Deck → Stratosphere: the vista flips, the palette cools, the rope tightens — she *feels* the area change before she reads the new marker line.
5. A trip. One pip goes ghost. Three ropes pass through her while the scene blanks past — the i-frames read as protection, not a stall, and the marker dims for exactly as long as the blank lasts. The last rope gives out: a session-end line, not a death — the day goes on and tomorrow's diary page will have a dotted notch on the AGI line.
6. She taps the reading nook, banks the rest of the stamina on pages, then the bed corner. Page-turn stinger, one sentence, the barbell sits a degree lower. `unlocked: STEEL CORD` rides the nightfall line in the prompt slot, once. The first-failure milestone offer arrives with the same nightfall — a life-card, permanent, pick-two, and the only card of the night that survives the morning.
7. **Climax:** in the corner she re-casts the worst day she's ever had — the one that capped AGI hardest — and the room starts paying for a yesterday she'd rather forget. Two corners later she's watching three versions of her own history skipping in unison, and her own character is the only thing in the room that's still growing.
8. Much later a life-card offer arrives on an RANK debut: let the days pick for themselves. She holds to confirm, and the room stops waiting for her thumb — the last verb automated, the automation bought rather than granted, and her own character still the only thing in the room that grows.

### Devon's phone run in a bus window

Devon, on a Pixel, portrait, one thumb, mid-stand.

1. He closed the tab mid-sprint on the way home; the day is waiting exactly where he left it, and behind him the world has not aged a tick — nothing but sleep moves the board. Bus-window leg: he taps the door corner. Its prompt line reads locked — nothing happens, nothing is explained; the slip on the corkboard says why.
2. Sprint wall instead. One tap = one stride; the day-card strip appears twice before his stop, and he picks with a thumb-hold while the bus takes a corner.
3. Stamina low, so he taps the bed and banks the day early — sleeping early is a decision, not a loss.
4. Next ride, the door is alive. He goes in: the same gym, palette flipped, fog on the far wall, and the tap is now a dodge. A hit takes his health and a second takes the fight — **climax:** the ejection yanks him out and the door's prompt says *not until tomorrow*. Nothing else was taken; his stats, his shadows, his cards are exactly where he left them. He's annoyed in the correct amount.
5. A trip on the next rope day ends the session, not the save: `Missed! Altitude 588`, best shown. Tap. Nightfall, then a new day, new cards. Total friction: thumbs, zero taps outside the canvas.

### Kenji plays where nobody can hear the game

Kenji, office laptop, muted by habit, three tabs deep.

1. Volume is at 40% and the rope's tick is the only rhythm in the room; the music track never once agrees with it, which is the point.
2. His TV sits in the corner of the scene, so the world arrives as a caption he can read with the sound off — infomercials for weeks, then weather. One ordinary day the bulletin cuts in mid-forecast, the camera drifts toward the set while his hands never leave the controls, and the corkboard suddenly has gates on it. The joke channel stops for the news, and even muted he feels the room change register.
3. A chyron line appears under the weather report: `E`. Then, stepping through a cleared gate, `LV 1`. He never opened a panel to find either.
4. **Climax:** much later, the census finishes and the caption reads his own name, then a sentence he wrote in the diary six days ago. He unmutes to hear the room, and it's already playing without him — a montage of his own yesterdays, running in the corners.
5. A friend sends `?skin=mint&mods=packs/rust.json` — Kenji pastes it, and if the manifest is malformed, the game simply looks like the game. Nothing is installed, nothing is said.
