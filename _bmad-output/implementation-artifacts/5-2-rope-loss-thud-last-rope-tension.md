---
baseline_commit: 7a87ccb
---
# Story 5.2: Rope-loss thud & last-rope tension

Status: done

Baseline: `7a87ccb` (Story 5.1 done — ascend stinger + win fanfare shipped, ceilingbreak §6 census re-contracted to seven names; gate **460/460 green @ ~8.5 s**, tree clean, verified at authoring time 2026-11-09). Second story of Feel & Fidelity. This story **pays the Epic-1 ledger debt** (below): a strip trip is audio-visually silent today, and `js/audio.js` has **no rope-count surface at all** — the last-rope tension treatment needs a shell→audio state seam, and it is the ONLY new seam this story may open.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player down to my last rope,
I want the mix itself to tell me I'm one trip from death,
So that the tension is felt in my hands, not just read on the HUD.

## Acceptance Criteria

(verbatim from `_bmad-output/planning-artifacts/epics.md:745-763` — FR28, FR27)

**Given** a trip strips a rope (not a charge, not a mercy save)
**When** the event plays
**Then** the rope-loss thud fires, adapted so losing the *last* rope (run over) is the distinct terminal variant (FR28)

**Given** rope count == 1 during play
**When** the mix renders
**Then** the last-rope treatment applies — the GDD's open audio question is decided here (working default: thinner mix with the rope's own tick brought forward; designer may override at review) — and it reverses cleanly if ropes are regained via Spare Rope (FR28)

**Given** mute or persisted volume state
**When** any of these voices trigger
**Then** the master bus and persisted settings are respected exactly as v1 voices (FR27)

### AC-to-verification map (decided — do not re-litigate)

| AC | How it is proven headlessly |
|---|---|
| AC1 | New suite Part A: the `ropeLost` voice starts post-gesture through the master bus, is signature-**disjoint with all seven shipped voices** (derived-signature oracle, below), sits in the sub-bass register (every f0 below the shipped mix's lowest pitch), and is disjoint **with `trip` specifically** — that disjointness leg IS the "distinct terminal variant" fence. The terminal split is a channel fact, not new audio state (see "Event-channel facts"; Decisions #2). "Not a charge, not a mercy save" is pinned by channel-truth legs (steelcord :88 / nearmiss :103 donor patterns) — no new event names, no `js/game.js` diff. |
| AC2 | Module legs: `audio.setRopes(1)` arms the tension variant (`skip` plays its taut double-tick), any other count disarms it — a **state-guarded no-op pre-init**, the `play()` :174 idiom applied to a setter (Decisions #3). One booted-shell leg proves the seam: the updateHud signature-change path calls `setRopes(held)` exactly once per held-count change across a scripted strip cascade, and a ropes-regained stamp re-fires it (Spare Rope semantics themselves are frozen at `tests/simpleeffects.test.js:54`). "Thinner mix" realization is Decisions #4 `[DECIDED-BY-CREATE]` — designer may override at review (GDD open item #4, `gdd.md:530`). |
| AC3 | Mute leg per `tests/ascentstinger.test.js:259-269` precedent: `setMuted(true)` zeroes the master gain, the thud still schedules, routing stays on the ONE master. Volume/persistence rides the shipped `setVolume`/`loadSettings` machinery untouched (`js/audio.js:205-209`, audio.test.js legs). The tension variant is a material choice inside VOICES, not a gain layer — so AC3 is respected by construction (Decisions #4). |

### Loop contract (binding)

- Gate `./run_tests.sh` before any edit: **460/460**. After: 460 + ~15 new legs in ONE new test file + 1-in/1-out rewrites (R1/R3) — total ≈ 475, suite < 10 s (NFR4). Report ACTUAL counts from real output; never claim green without a run.
- **Product code delta: exactly `js/audio.js`** (VOICES gains `ropeLost`; tension state + `setRopes` on the returned object; the tension-aware `skip` variant) **and `js/shell.js`** (JUICE_TIERS gains the `ropeLost` row; ONE `audio?.setRopes?.(held)` call in `updateHud`). NOT touched: `js/game.js`, `js/rope.js`, `js/player.js`, `js/render3d.js`, `css/`, `index.html`, `package.json`. No new deps, no build step (NFR6).
- Existing test files are frozen **except the THREE sanctioned re-contracts below (R1, R2, R3)**. Any OTHER existing-file red = implementation wrong; diagnose the code, never the file. In particular `tests/ascentstinger.test.js` gets **zero edits — no authorization exists**; its seven-name oracle loop (:199) stays honest but incomplete, and THIS story's suite must derive **all eight names** from the shipped module (see "Distinctness oracle").
- No new timing or random surface anywhere: no `setTimeout`/`setInterval`/`Date`/wall-clock/`Math.random` in `js/audio.js` (frozen: `tests/boundary.test.js:103-112`, `:67-80`). `setRopes` is **state-only** — it must not touch `ctx`/nodes (that is what makes it no-op-safe pre-init). The shell's `stopUntil` write census stays exactly 4 (frozen: `tests/ceilingbreak.test.js:533`) — the new juice row rides the EXISTING table-driven write at `js/shell.js:684`; add NO timing code to shell.
- The `trip` voice and the `trip` JUICE row stay **byte-identical** (v1parity). The tension seam adds no event names; D-N02 (events are audio's only feed, `js/shell.js:673`) and D-N09 (audio reads, never writes) are untouched constraints.

### R1 — Sanctioned re-contract of the VOICES census (`tests/ceilingbreak.test.js` §6 :511-518) — the eight-voice tripwire

Story 5.1's R1 replaced 4.4's absence-pin with an **exact seven-name census**: `assert.deepEqual(names, ['ascend', 'jump', 'nearMiss', 'pick', 'skip', 'trip', 'win'])`. **Adding `ropeLost` to VOICES turns that leg red BY DESIGN** — the anticipated un-fencing, same pattern as 5.1's R1 (`js/audio.js:178-191` ships 7 voices today) and the written re-contract trail (`deferred-work.md:149-151`; R1 section of the 5-1 story file).

Authorized diff, the ONLY rewrite allowed in that leg: keep the `sourceOf('audio.js')` + VOICES-literal regex and the presence assert; replace the seven-name list with the exact post-5.2 census `['ascend', 'jump', 'nearMiss', 'pick', 'ropeLost', 'skip', 'trip', 'win']` (sorted), retitle to name Story 5.2, and keep the wording that the **exact-name-set pin** fences "nothing else may join the table". **No tension voice name joins VOICES** — tension is a variant of `skip` gated by state, not an eighth-and-a-half event name; the census stays EXACTLY eight.

### R2 — Sanctioned extension of the two diff-census tripwires (both files; same written-authorization rule)

The frozen diff-census legs — `tests/ceilingbreak.test.js:546-585` (§6, pinned base `5659fd4`) and `tests/summitapproach.test.js:813-843` (§4.3, pinned base `2c3e693`) — diff the worktree against Epic-4 bases, so every new path needs its allow-set line or goes red. `js/shell.js`, `js/audio.js`, `deferred-work.md`, `sprint-status.yaml` are **already allowed by both** (5.1 added audio.js; 5.1's R2 line covers both).

Authorized diff (appends + attribution comments only; base shas, git plumbing, fallback arms and assertion shape untouched):

- Append to the `allowed` set in `tests/ceilingbreak.test.js` §6 (`:566-585`): `'tests/ropelossthud.test.js'`, `'_bmad-output/implementation-artifacts/5-2-rope-loss-thud-last-rope-tension.md'` — comment attributing Story 5.2. (`tests/juice.test.js` is already in THIS set from 4.4.)
- Append to the `allowed` set in `tests/summitapproach.test.js` §4.3 (`:833-840`): the SAME two paths **plus `'tests/juice.test.js'`** — that file joins the tree's changed set only because of R3 below, and this census does NOT already allow it (the ceilingbreak one does — asymmetry verified at `7a87ccb`).

At creation time this fence already bites: the creation commit alone turns both legs red (new story artifact). That is the mechanism, not a defect; Task 3 restores green.

### R3 — Sanctioned re-contract of the JUICE_TIERS census legs (`tests/juice.test.js` :149-168 + `tests/ceilingbreak.test.js` §1 :322-345)

Per the ledger carry-in, **Story 5.2 owns the JUICE_TIERS wiring for `ropeLost`** (the strip's cue-tier half of the event→cue debt — 1.3 claimed only the ghost pip). Adding the row turns the two exact-key censuses red BY DESIGN:

- `tests/juice.test.js:153`: `assert.deepEqual(Object.keys(t).sort(), ['ascend','nearMiss','skip','trip'])` → five-name census with `'ropeLost'` added (sorted: `['ascend','nearMiss','ropeLost','skip','trip']`); keep every verbatim row-pin and band loop (:154-165) untouched — the new row must pass the shipped bands (`shake ≤ 2`, `1 ≤ particles ≤ 24`) on its own numbers.
- `tests/ceilingbreak.test.js:326`: same four-name → five-name census (same sorted list), wording names Story 5.2.
- `tests/ceilingbreak.test.js:341`: extend the significance ladder pairs from `[['skip','nearMiss'],['nearMiss','ascend'],['ascend','trip']]` to `[['skip','nearMiss'],['nearMiss','ascend'],['ascend','ropeLost'],['ropeLost','trip']]` — the fence keeps fencing: losing a rope out-juices a ceiling break, death stays loudest.
Zero other changes in either file; the 1-in/1-out rule keeps the leg counts unchanged.

### R4 — Sanctioned re-contract of `tests/summitapproach.test.js` §3.4 blank-phase loop (parent-approved mid-round, 2026-11-09)

The ledger-mandated `ropeLost` tier row (hitstop 65, R3's ladder pins it strictly in (60,80)) freezes ≥1 of §3.4's 50 ms frame strides after the strip tick (`stopUntil` holds the drain gate, `js/shell.js:664`). §3.4's blank-phase loop asserts the marker text on EVERY `iFrames > 0` frame — on a frozen frame the view/DOM legitimately re-present the last STEPPED state (`ceiling 200 ↑`, the strip tick's altitude) so the assert reads red with zero product defect. Provably no value in the R3 ladder avoids this; the fix is a stepped-frame gate, approved by the epic parent as an AC-preserving re-contract (the leg's semantics — "the sim refuses the break while the line promises it; the dim lifts on the blank-end tick" — speak about SIM truth, and frozen frames carry no new sim truth by design).

Authorized diff (exact shape):

- In `bootSummitShell`'s game-wrapper data-URL source (:487-504): count steps — first line of the wrapper body: `s.steps = (s.steps || 0) + 1;` (the `__saScript` object is the natural carrier; `script` is exposed on `env`).
- In §3.4's THIRD loop (the blank-phase loop, `:749-762`): capture `const n0 = env.script.steps || 0;` before `tick(env)` and `const stepped = (env.script.steps || 0) > n0;` after; gate the four asserts inside the `if (run.iFrames > 0)` branch (status/area/outcome/marker-text, plus the dim className assert) AND the `else`-branch ended-asserts behind `if (stepped)`. Loop-exit conditions and the liveness assert (`ended`) unchanged — the blank-end tick IS stepped (a 65 ms freeze cannot outlast two 50 ms strides), so `ended` stays reachable and the leg stays non-vacuous: a mutant that never lifts the dim still dies on the first stepped post-blank frame.
- Zero other changes in the file; bases/censuses/other legs untouched.

Precedent: this is the same "re-contract the fence the plan already predicted" pattern as R1-R3; the conflict proof (deterministic 3/3 red, root-caused to the hitstop × stride interplay) is in the story's Debug Log.

### Ledger carry-in (verbatim, `deferred-work.md:13-15`, `:18-21`, `:35-37` — Epic-1 retro mandate)

> ":13 — **`ropeLost` event→cue wiring has no explicit owner** (`js/audio.js` VOICES, `js/shell.js` JUICE_TIERS, renderer rope-count visuals) — a strip trip is currently audio-visually silent. The pieces are split across 1.3 (rope-count HUD), 5.2 (rope-loss thud), 5.3 (i-frame juice), but no story lists the event→cue wiring itself … — **RETRO 2026-11-05: owned by 5.2**"
> ":18 — Story 1.3 deliberately claimed only the visual-state cue (ghost pip); **5.2 owns the thud and any cue-tier wiring**."
> ":35-37 — **OWNED by Story 5.2 per Epic 1 retro: 1.3 landed its visual-state cue; audio/juice wiring goes to 5.2's story text.** Write it into 5.2's story text at creation." ← this paragraph is that writing; Task 6 PAID-stamps all three entries.

### Event-channel facts (verified against `js/game.js` at 7a87ccb — the AC1 truth)

- `'ropeLost'` — strip trip, `ropeCount > 1`, **non-terminal** (`js/game.js:243`). Silent today: no VOICES key, no JUICE row (sim legs only: `tests/multirope.test.js:122`, `tests/nearmiss.test.js:103`).
- `'trip'` — **the LAST rope** (`js/game.js:252`, status→'over'). THE terminal variant, already owned by the shipped `trip` voice (noiseHit). AC1's "distinct terminal variant" is realized by the **event-name split** (strip → `ropeLost` thud; last rope → `trip` crash): the two variants are two disjoint material sets on two events the sim ALREADY distinguishes. NO fake terminal-`ropeLost` state may be invented; the `trip` voice stays byte-identical (v1parity).
- `'chargeUsed'` (`js/game.js:223`) — armor eats the hit; **AC1 says NOT a thud** → gets NO VOICES entry here, stays silent, fenced by the eight-name census (R1).
- Buffer mercy-save pushes ONLY `'skip'` + `'nearMiss'` (`js/game.js:205-214`) — already silently correct, **no thud, zero code needed**; pin it with one channel-truth leg so a future refactor can't leak `ropeLost` onto the mercy path.
- All names reach `audio.handleEvent` via the D-N02 drain (`js/shell.js:673`) — no presentation-side hook, ever.

### AC2 mechanism — the tension seam (the verified gap, and the ratified route)

`js/audio.js` has **zero rope-count surface today** — grep `ropes|setRopes|ropeCount` over the module: no matches at 7a87ccb. The ratified route (decided here; do not open a different seam):

1. **`audio.setRopes(held)`** — new method on the `createAudio` return object (`js/audio.js:215-231`): stores ONE closure boolean `tension = (held === 1)`; **touches no nodes, no ctx** → correct by state pre-gesture (the `play()` :174 idiom applied to a setter). Precedents for shell→audio STATE seams: `setVolume`/`toggleMute` (:205-213). Do NOT add sim events for rope count — D-N02 keeps SIM→audio events-only, `js/game.js` stays untouched.
2. **ONE call site, the signature-change idiom**: in `updateHud`'s pip block (`js/shell.js:629-646`), immediately after the `pipsShown` flip (`:633-634` — the 1.3 precedent), call `audio?.setRopes?.(held)` with the CLAMPED `held` (:630). Any held change always changes the `'h'/'g'` signature, so the fire happens exactly once per change; `resetPips()` (`:135`) clears `pipsShown`, so every new run re-fires automatically. House rule: one shared call site, no per-path duplication; the optional-chained call no-ops safely when audio is absent or an old-shape stub.
3. **Harness pass-through (verified at 7a87ccb)**: every frozen boot harness wraps the REAL module — `tests/polish.test.js:186-193` and `tests/v1parity.test.js:492-497` via `Object.assign({}, a, {overrides})`, `tests/feelcap.test.js:234-248` by returning the instance — so a NEW METHOD passes through automatically; NO wrapper edits needed (and none authorized). DOM-less harnesses answer `getElementById` from a fixed 4-key map (no `hud-ropes`), so the pip block — and thus `setRopes` — never executes there: the tension variant is unreachable-by-construction in every v1-parity boot, which is exactly why v1parity cannot regress.

### Distinctness oracle — and the eight-voice noise trap (MUST read before writing material)

Recording-stub signature tagging (`tests/ascentstinger.test.js:150-164`): oscillators log `osc:<type>:<f0>`; buffer-source starts log the SINGLE tag `'noise'` for EVERY noiseHit voice. `trip` uses noiseHit — **a noise-based thud would FAIL a naive disjointness oracle against trip** (shared `'noise'` signature), and widening the tagging lives in ascentstinger.test.js, which this story may not edit. Ratified decision (Decisions #1): **oscillator-only thud** — the oracle stays non-vacuous with zero frozen-file surgery. The 5.2 suite's mutation proof: on a `/tmp` clone, copy `trip`'s noiseHit body into `ropeLost` → the disjointness leg MUST go red; copy `jump`'s `square 220` → red; raise the thud above the register ceiling → register leg red.

This suite also stands on its own vs the 5.1 oracle: `voiceSignatureSets()` (:194-205) loops a FIXED seven-name list, so growing VOICES leaves 5.1's legs honest but incomplete. The 5.2 suite derives **all eight names from the shipped module** (source-literal regex, the ceilingbreak §6 :512-515 idiom) and fences the new voice + the tension variant disjoint against every other.

### Scope boundary vs Story 5.3 (explicit, to prevent collision)

Story 5.2 touches JUICE_TIERS with **exactly one row (`ropeLost`)** and the renderer with **zero delta**. The i-frame visual juice (ghost-rope read during the blank) and the tier rows for the OTHER new events (`chargeUsed`, `win`) are **owned by Story 5.3** — do not land them here. Likewise untouched lanes: reduced-motion for new states (5.4), audio lifecycle sweep (5.5), track content (5.6), pause-menu audio config (5.7 — it consumes the `setVolume`/`toggleMute` seams; `setRopes` is none of its business).

## Context — shipped state (verified against the tree at 7a87ccb)

**Audio (`js/audio.js`, 232 lines, leaf, zero imports):** `createAudio` :48; `play(voice)` :173-176 state guard `if (!ctx || !master) return`; `tone(type, freq, t0, dur, end?)` :139-151 (osc → env 0.25 → exponential to 0.001 → **master** :148) — REUSE, do not add synth machinery; `noiseHit` :153-169 (the `'noise'`-tagged one — stay away); `VOICES` :178-191 exactly seven (`jump` square 220→330, `skip` triangle 660, `nearMiss` square 880 ×2, `trip` noiseHit, `pick` triangle 523+659, `ascend` square 330/440/587, `win` triangle 196/392/494/784); `handleEvent(name)` :193-196 **one-parameter, stays one-parameter**; setters :199-213; return object :215-231 gains `setRopes`. Taken signatures (for disjointness): square 220, triangle 660, square 880, triangle 523/659/330/440/587, triangle 196/392/494/784, `noise`. Lowest shipped pitch: **196** (`win`'s first note) — the thud's register ceiling.

**Shell (`js/shell.js`, 715 lines):** `JUICE_TIERS` :15-20 (skip 8/0.5/4, nearMiss 40/1.5/10, ascend 60/1.75/12, trip 80/2/16 — the `ropeLost` row joins as the fifth); audio boot :58-70 (`audio` may stay null on import rejection — the `?.` guard covers it); pip signature block :629-646 (`held` clamped :630, sig :632, flip :633-634); `resetPips` :135; the drain's table-driven juice write :680-686 (`stopUntil` code-writes stay at 4 total); `updateHud()` called once per frame :703 inside `frame()`'s try (2.1's fix).

**Sim (`js/game.js` — READ ONLY):** branch census buffer :205-214 → `skip`+`nearMiss`; charge :215-224 → `chargeUsed`; strip :225-244 → `ropeLost` (`strippedTo = ropeCount - 1` :240); last rope :245-253 → `trip` + `status='over'`. `Spare Rope` grows `run.ropes` via `applyCard` (frozen: `tests/simpleeffects.test.js:54`) — the tension reversal path needs no code here: new held → updateHud sig → `setRopes(2)` → variant OFF.

**New suite harness:** ONE new file `tests/ropelossthud.test.js`. Module legs: direct `../js/audio.js` import (precedent `tests/audio.test.js:9-11`) + the `makeRecordingContext` shape (ascentstinger :110-188 — copy it into THIS file; do not import from the frozen suite). Booted legs: donor `tests/polish.test.js` boot harness + an audio wrapper that also logs `setRopes` (`Object.assign({}, a, { setRopes(h) { log.ropes.push(h); return a.setRopes(h); }, ... })`) and the game-wrap run-stamp donor (ceilingmarker/ceilingbreak idiom) to force ONE real strip tick with `ropes: 2, buffer: 0, charged: 0` stamped into the INPUT run. ≤3 boots total (NFR4).

**NFR8 proof structure:** (1) zero `js/game.js`/`js/rope.js` delta — the phase clock is untouched by construction; (2) the `ropeLost` juice row rides the EXISTING table-driven hitstop mechanism (delays, never drops — the property `tests/juice.test.js:123-147` already proves for shipped tiers; add one ropeLost-specific A/B leg parking its hitstop 65↔0 and asserting total-step conservation + a freeze window); (3) `setRopes` is pure closure state — provably zero node churn at call time (recording-ctx leg: `setRopes` alone starts nothing, pre- or post-gesture).

## Decisions (baked — `[DECIDED-BY-CREATE]` marks calls made at authoring; do not re-litigate at dev time)

1. **[DECIDED-BY-CREATE] Thud material: oscillator-only low square sub-bass** — `tone('square', 110, t, 0.2, 55)` as the seed (one note, down-ramp, 0.2 s; env peak 0.25 by inheritance, master bus by construction). Evidence: the `'noise'`-tag collision (oracle section — a noiseHit thud is oracle-poisoned and the tagging file is unauthorized to edit); PS1 lo-fi chiptune identity (user-approved at Epic 5 entry) — square sub-bass sits under the chip mix coherently; register fence: every thud f0 **< 196** (below `win`'s 196, the shipped mix's lowest pitch). Dev may tune the numbers (110/55/0.2 are seeds) but must keep: square, one oscillator, register leg green, disjointness green.
2. **[DECIDED-BY-CREATE] Terminal variant = the `trip` event + shipped voice, unchanged.** The sim already splits strip (`ropeLost` :243) from last-rope death (`trip` :252); VOICES is the variant mechanism. Any "terminal thud" state in audio.js would be D-N09 statefulness invented to duplicate a channel fact — forbidden. AC1's distinctness is fenced by the ropeLost∩trip disjoint leg.
3. **[DECIDED-BY-CREATE] Tension seam = `audio.setRopes(held)` state setter, one call site in `updateHud`** (mechanism + full evidence above). Rejected: new sim events (`js/game.js` frozen lane, D-N02 event channel is for gameplay moments, not telemetry); a `handleEvent('tensionOn')` pseudo-event (invents channel traffic the parity/hygiene fences would rightly punish); reading the DOM from audio (leaf-module violation).
4. **Tension treatment (working default per epics AC2, GDD open item #4 `gdd.md:530`; designer may override at review): the rope's own tick brought forward.** `skip` IS the tick (triangle 660). Under `tension === true`: `tone('triangle', 660, t, 0.04); tone('triangle', 1320, t + 0.05, 0.04)` — a taut double-tick (harmonic 1320 is free material; stagger precedent `nearMiss`/`pick`). "Thinner mix" is realized by material emphasis ONLY — **no per-voice gain layer** (gain games would tangle with mute/volume state and AC3's "exactly as v1" fence). Reversal is automatic: any held ≠ 1 → baseline single 660 tick.
5. **JUICE_TIERS seed: `ropeLost: { hitstop: 65, shake: 1.9, particles: 14 }`** — strictly between `ascend` and `trip` on all three axes (losing a rope out-juices a ceiling break; death stays loudest), inside the frozen bands (≤2 shake, ≤24 particles). D-N12 provisional seed, 6.2 retunes as a data-only diff — attribution comment on the row, same wording lane as the ascend row's `js/shell.js:18` comment.
6. **Eight names after this story — no more, no less.** Census (R1), VOICES-miss silence for `chargeUsed`, and the R3 five-row JUICE_TIERS are the fences. A tension-specific VOICES entry would be dead weight (variant dispatch is state, not naming).

## Tasks / Subtasks

- [x] Task 1 — RED: write `tests/ropelossthud.test.js` (AC: 1,2,3). All legs land before any product code; run the gate — the new legs go red against the shipped tree.
  - [x] 1a. Part A material legs: `ropeLost` post-gesture starts EXACTLY 1 oscillator on the master bus (bounded count — a bloated or swapped voice reds); every env `connectedTo` the master; pre-gesture: `handleEvent('ropeLost')` → zero starts, no throw, gesture → still zero (no queued blast; 5.1's leg shape).
  - [x] 1b. Part A oracle legs (derived, never hard-coded twice): derive the eight names from the VOICES source literal; the `ropeLost` signature set is disjoint with all seven other sets **and with `trip`** (the terminal-variant leg); register leg — every `ropeLost` f0 < 196; baseline `skip` set is exactly `{osc:triangle:660}` while tension is unarmed (the default state).
  - [x] 1c. Part A channel-truth legs (≤4 `tickRun` calls, rng stubbed, donors: `tests/nearmiss.test.js:103`, `tests/steelcord.test.js:88`): a strip tick emits exactly `['ropeLost']`; a charged tick emits `['chargeUsed']` and NO `ropeLost`/`trip`; a buffer-mercy tick emits exactly `['skip','nearMiss']`; a last-rope tick emits `['trip']` + `status: 'over'` (the AC1 "not a charge, not a mercy save" + terminal-split proof, on the channel).
  - [x] 1d. Part A mute leg (AC3): `setMuted(true)` → master gain 0; `handleEvent('ropeLost')` still schedules ≥1 voice, routing intact (ascentstinger :259-269 precedent).
  - [x] 1e. Part B tension state legs: `setRopes(1)` → `handleEvent('skip')` starts the variant ({660,1320}, staggered t) and its set stays disjoint with the other seven voices' baseline sets (1320 shared with nothing); `setRopes(2)`/`setRopes(5)` after 1 → baseline single tick (the Spare-Rope reverse leg); `setRopes(1)` pre-gesture then `gesture()` → nothing starts until an event (state-guarded no-op); `setRopes` alone starts zero nodes in any state.
  - [x] 1f. Part B booted-shell legs (≤3 boots, polish wrapper donor + setRopes logging): scripted strip cascade (stamp `ropes: 2, buffer: 0, charged: 0` into the 5th tickRun's INPUT run; a no-press crossing fires the REAL strip arm) → the wrapper log shows `ropeLost` reaching `handleEvent` AND `setRopes` logging `[…, 2, 1]` (held-drop; the R3 `ropeLost` JUICE row read from `env.mod.JUICE_TIERS` deepEquals the seed row); a follow-up stamp to `ropes: 2` re-fires `setRopes(2)` (reverse at the seam). One juice-conservation A/B (JUICE_TIERS per-boot-mutable, juice.test.js :123-147 idiom): ropeLost hitstop 65 vs 0 — identical phase sequence + conserved total steps, freeze window present only with the row.
- [x] Task 2 — RED (by design): land R1 (ceilingbreak §6 :511-518 eight-name census) and R3 (juice.test.js :153 five-name census; ceilingbreak §1 :326 census + :341 ladder extension) exactly as authorized above. 1-in/1-out; leg counts unchanged.
- [x] Task 3 — Neutral: land R2 (the two diff-census allow-set appends with attribution comments, + `tests/juice.test.js` in summitapproach §4.3). This restores the two legs the creation commit turned red.
- [x] Task 4 — GREEN Part A: `js/audio.js` — `ropeLost` VOICES entry (Decision #1 seed, 5.1-style attribution comment :184-188 lane); tension closure var + `setRopes` on the return object (state-only); `skip` entry becomes the tension-dispatching voice (baseline byte-identical when unarmed). R1 + 1a/1b/1c/1d/1e go green.
- [x] Task 5 — GREEN Part B: `js/shell.js` — JUICE_TIERS `ropeLost` row (Decision #5, attribution comment) + the ONE `audio?.setRopes?.(held)` call in `updateHud`'s sig-change block after the `pipsShown` flip. R3 + 1f go green. Verify `stopUntil` code-write census stays 4 (`tests/ceilingbreak.test.js:533`).
- [x] Task 6 — Close-out: mutation-proof on `/tmp` clones (noise-copy of trip into `ropeLost` → oracle red; `jump` material copy → red; register raise → red; tension always-on mutant → the reverse + baseline-skip legs red), paste every number in the Debug Log; **PAID-stamp the ledger** (`deferred-work.md` :13-15, :18-21, :35-37 — "PAID by Story 5.2: thud + JUICE_TIERS ropeLost row + audio thud wiring shipped; 5.3 retains the i-frame visual + other events' tier rows"); full `./run_tests.sh` green; flip this story's checkboxes.

## Dev Notes

- **Files touched and NOTHING else:** `js/audio.js` (3 localized edits: VOICES, one closure setter + return line, `skip` variant), `js/shell.js` (2 edits: one table row, one guarded call), new `tests/ropelossthud.test.js`, R1/R3 rewrites in `tests/ceilingbreak.test.js` + `tests/juice.test.js`, R2 lines in `tests/ceilingbreak.test.js` + `tests/summitapproach.test.js`, this story file, `sprint-status.yaml`, `deferred-work.md` PAID stamps.
- **What must be preserved:** `updateHud`'s pip rendering byte-behavior (ropehud suite freezes it — the new call must not reorder DOM writes); the `skip` voice's baseline material exactly as shipped (every v1 boot path never arms tension by construction — see harness pass-through; if a parity-adjacent leg goes red, the call site is wrong, not the fence); `handleEvent`'s one-parameter signature; `tone()`/`noiseHit`/`play()` untouched; the `trip` voice + trip juice row untouched (terminal variant = channel split, Decision #2).
- **Regression hotspots to respect, not touch:** `tests/steelcord.test.js:88/:163-167` (charge/strip channel truth — frozen, already right), `tests/ascentstinger.test.js` (seven-name oracle stays green unedited — verify, don't edit), the D-N02/D-N05 drain structure (`js/shell.js:657-696`).
- **If in doubt:** the two sanctioned tripwires (R1/R3 censuses) going red is FORESONE by this text; everything else going red is a bug in this story's code.

### Project Structure Notes

- Pure vanilla ES modules, zero-dep, `node --test` TAP gate (`run_tests.sh`); tests flat in `tests/`, one new file per story (house rule). No conflicts with the plan above; the only new cross-module surface (`setRopes`) follows the shipped setter precedent lane.

### Project Context Rules

- No `project-context.md` exists in this repo; binding conventions are `AGENTS.md`: frozen-test discipline with the written re-contract exception (`AGENTS.md:52` — R1/R3 exist under it, R2 is the census bookkeeping the same rule requires), shared-handler house rule (one `setRopes` call site), audio-follows-gameplay pillar (architecture.md:55 — nothing clocked the rope: this story adds zero timing).

### References

- `_bmad-output/planning-artifacts/epics.md:745-763` (story), `:67-68` (FR27/FR28), `:142-143` (traceability)
- `_bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd.md:412-418` (audio direction — "rope-loss thud" named; "the rope is never beat-locked"), `:486` (last-rope tension is a measured goal), `:530` (open item #4 — decided by AC2, Decision #4)
- `_bmad-output/planning-artifacts/architecture.md:24/:47/:55` (audio leaf + follows-gameplay rule), `:75` (red-green legs when guard code lands)
- `_bmad-output/implementation-artifacts/deferred-work.md:13-15/:18-21/:35-37` (ledger debt — paid here), `:149-151` + `5-1-ascent-stinger-win-fanfare.md` R1/R2 sections (re-contract precedent trail)
- `js/audio.js`, `js/shell.js`, `js/game.js`, `tests/{ascentstinger,ceilingbreak,juice,steelcord,nearmiss,polish,feelcap,v1parity,simpleeffects}.test.js` — every line cite in this file was verified at `7a87ccb`.

## Dev Agent Record

### Agent Model Used

qwen (lane-qwen38-ultra/qwen)

### Debug Log References

- **Baseline gate @ `2b8cf9c`: 458/460** — the two reds are the R2 diff-census legs (creation artifact vs pinned bases `5659fd4`/`2c3e693`), green-restored by Task 3.
- **Task 1 RED (new suite against shipped tree): gate 464/476.** ropelossthud reds = legs 1, 3, 4, 10, 11, 12, 13, 14, 15, 16 (10 of 16 — material, oracle, mute, all four tension-state, both boot legs); green-by-guard from the start: pre-gesture drop (2), baseline-skip identity (5), the four channel-truth legs (6-9) + the 2 standing census reds.
- **Tasks 2-3:** R1/R3 censuses flipped red BY DESIGN (4 legs); R2 appends restored the two creation-red census legs.
- **Tasks 4-5 GREEN:** product delta landed; mid-round gate 473/476 with exactly three reds — my two boot legs (own-harness bugs: missing `document.createElement` in the pip-capable stub made updateHud throw inside `frame()`'s try → stale views; the honest once-per-change log is `[1,1,2,1]` incl. the sanctioned resetPips run-start re-fire; the reversal pump had to outlast the strip's own 65 ms freeze) and **`summitapproach` §3.4** — a genuine AC conflict, not a code bug: the row (ladder-pinned hitstop ∈ (60,80)) freezes ≥1 of the leg's 50 ms strides after the strip tick; any such value reds it. Conflict proof: 3/3 deterministic red with the row, green with the row deleted; no authorized code satisfies both. Escalated; parent approved **R4** (stepped-frame gate on the blank-phase loop, `s.steps` wrapper counter); landed exactly as authorized.
- **Task 6 mutation-proof (4/4 red on `/tmp` clones):** M1 trip-noiseHit body copied into `ropeLost` → legs 3+4 red (the `'noise'`-tag trap armed, terminal-variant fence bites); M2 `jump` material copy (`square 220`) → 3+4 red; M3 register raise (`square 300`) → leg 4 red; M4 tension always-on (`let tension = true` **plus** a never-disarm `setRopes` body — review-fixed attribution, Blind+Edge both reproduced: the initial-`true` constant alone reddens leg 5 only, leg 13's `setRopes(2)` legitimately disarms it) → baseline-skip leg 5 + Spare-Rope-reversal leg 13 red; the disarm-class mutant alone → leg 13 red. Coverage intact for both classes; only the original attribution was wrong.
- **Final gate: `./run_tests.sh` 476/476 passed, duration_ms ≈ 8500** (460 baseline + 16 new; R1/R3 1-in/1-out; NFR4 < 10 s).

### Completion Notes List

- AC1: `ropeLost` ships as ONE oscillator-only square sub-bass voice (`tone('square', 110, t, 0.2, 55)`) on the master bus — disjoint with all seven shipped voices INCLUDING `trip` (the disjointness-with-trip leg IS the distinct-terminal-variant fence; the terminal split itself is the shipped `ropeLost`/`trip` channel fact, `trip` byte-identical), register-fenced < 196 Hz, and the four channel-truth legs pin "not a charge, not a mercy save" on the event channel with ZERO `js/game.js` delta.
- AC2: the tension seam is `audio.setRopes(held)` — pure closure state (zero node churn pre-/post-gesture, nothing queues) — with the ONE call site in `updateHud`'s pip-signature flip: fired exactly once per held change across a scripted boot strip-cascade (`[1,1,2,1]` incl. the sanctioned resetPips run-start re-fire) and reversed to 2 by a Spare-Rope-style stamp. The taut double-tick (`660`+`1320` staggered) never arms in DOM-less parity harnesses by construction; the A/B boot pair proves the juice row delays-never-drops (identical post-catch-up phase sequence, conserved total advance, freeze window only with the row).
- AC3: mute zeroes the master and the thud still schedules through the ONE bus; volume/persistence untouched; the variant is material, not a gain layer.
- Ledger carry-in PAID-stamped at `deferred-work.md` :15/:21/:37 (1.2-review, 1.3-review, retro-assignment entries).
- R1/R2/R3 landed exactly as authorized (1-in/1-out; census-leg counts unchanged); R4 (parent-approved mid-round) added `s.steps` to the §3.4 harness wrapper + stepped-gates in that loop — no other change in the file; `stopUntil` write census stays 4; no timers/random/clock surface added anywhere (`setRopes` is state-only).

### File List

- `js/audio.js` (modified — VOICES `ropeLost` + tension dispatching `skip`; tension closure + `setRopes`; return-object line)
- `js/shell.js` (modified — JUICE_TIERS `ropeLost` row; one `audio?.setRopes?.(held)` in `updateHud`)
- `tests/ropelossthud.test.js` (new — 16 legs)
- `tests/ceilingbreak.test.js` (modified — R1 eight-name census, R3 §1 census + ladder, R2 allow-set)
- `tests/summitapproach.test.js` (modified — R2 allow-set, R4 §3.4 stepped-frame gate + `s.steps` counter)
- `tests/juice.test.js` (modified — R3 five-name census)
- `_bmad-output/implementation-artifacts/5-2-rope-loss-thud-last-rope-tension.md` (this file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (ready-for-dev → review)
- `_bmad-output/implementation-artifacts/deferred-work.md` (three PAID stamps)

## Change Log

- 2026-11-09: Story 5.2 implemented — rope-loss thud voice + last-rope tension variant on the new `setRopes` state seam + JUICE_TIERS `ropeLost` row; R1-R4 re-contracts; 16-leg suite; ledger PAID-stamped; gate 476/476.

## Open notes (created at story creation; all settled in-file — nothing blocks dev)

1. **[DECIDED-BY-CREATE] Thud = oscillator-only square sub-bass (110→55 seed)** — forced by the `'noise'`-tag collision (oracle section); tunable within the register/disjointness fences.
2. **[DECIDED-BY-CREATE] Terminal variant realized by the `ropeLost`/`trip` channel split; `trip` voice byte-identical** — the honest mechanism given `js/game.js:243` vs `:252`; no invented audio state.
3. **[DECIDED-BY-CREATE] Seam = `audio.setRopes(held)` from `updateHud`'s signature-change block** (harness pass-through verified; DOM-less harnesses can't reach tension — by construction, not by omission).
4. **[DECIDED-BY-CREATE] Tension treatment = taut double-tick skip variant (660+1320), no gain layer** — the epics-sanctioned "working default" for the GDD's open mix question (`gdd.md:530`); **designer may override at review** (material-only change; the reverse/disjointness legs keep any override honest).
5. **[DECIDED-BY-CREATE] JUICE_TIERS `ropeLost` seed 65/1.9/14, D-N12-provisional** — 6.2 retunes; ladder placement fenced by R3.
6. Boundary stated in-file: `chargeUsed`/`win` tier rows + i-frame visuals are Story 5.3's; this story's JUICE delta is one row, its renderer delta is zero.

## Review (2026-11-09, three layers @ 5744803)

- **Blind (mutations):** 12 full-gate mutant runs — zero product defects; tension machine strict-equality fail-safe, lifecycle-clean; ropeLost voice mutants all die (noise-tag trap bites exactly); R4 gate still lethal on both original mutants (latching-dim and no-refuse reds proven); parity green in all 12. F1(P3, record): M4 kill-set attribution overstated — **APPLIED** (Debug Log reworded; coverage itself intact).
- **Edge (adversarial):** every cell fenced or proven unreachable — setRopes surface idempotent/garbage-safe/suspend-safe; second strip inside a blank proven impossible (game.js:170-173); §3.4 is the ONLY frozen leg driving a real strip through a pumped per-frame loop (9 stepped frames assert, 1 frozen conflict frame is the real 3/3 red, blank-end stepped — R4 empirically AC-preserving and falsifiable); win has no tier row; ladder transitivity + pools clean; census liveness proven. F1 = same M4 record slip — merged with Blind's. 0 product defects.
- **Auditor (AC/frozen):** AC-map complete with falsifying legs named per AC; R1-R4 hunk-by-hunk = exactly the four authorizations; R4 AC-preservation independently re-derived (blank-end frame necessarily stepped); D-N02/D-N09 clean, game.js byte-identical; ledger stamps truthful, 5.3 lanes byte-intact. F1(P3, docs): the AC2 tension-mix default + override lane invisible to a ledger-first reader — **APPLIED** (deferred-work :37 stamp extended).

- **Defers:** none new (D-05 flake + census blind spot already ledger-owned pre-6.6). **Dismissals:** none. Designer override on Open note 4 (tension mix): NOT exercised — working default stands; retune lane recorded in ledger.
- 2026-11-09: Story 5.2 review landed — 2 record/doc patches (M4 attribution; ledger override-lane line), 0 product patches, 0 defers, 0 dismissals; status done.
