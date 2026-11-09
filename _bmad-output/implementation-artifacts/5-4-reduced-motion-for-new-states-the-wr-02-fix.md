---
baseline_commit: 052b652
---
# Story 5.4: Reduced motion for new states & the WR-02 fix

Status: done

Note: Ultimate context engine analysis completed — comprehensive developer guide created (2026-11-09).

Baseline: `052b652` (Story 5.3 done — ghost pool + i-frame blank read shipped, JUICE_TIERS at seven rows; gate **493/493 green**, tree clean, verified at authoring time 2026-11-09). Fourth story of Feel & Fidelity. This story **pays the WR-02 debt** (verbatim below) — the one real product delta is ONE line in `js/render3d.js` — and converts the Epic-4/5 additions (ascent palette flips, i-frame blank statics, ghosts, chargeUsed/win juice) from "believed reduced-motion-safe" into **leg-pinned** reduced-motion-safe, plus the two FR23 singleton/persistence laws (flag never persisted, `snapGridFor()` the only snap-grid authority).

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a motion-sensitive player,
I want every new effect to obey reduced-motion,
So that v2 added nothing that v1's accessibility promise breaks.

## Acceptance Criteria

(verbatim from `_bmad-output/planning-artifacts/epics.md:785-803` — FR23)

**Given** `prefers-reduced-motion` is set
**When** ascents, i-frames, rope-charge changes, and win presentation play
**Then** each dampens to static or minimal cosmetics while judgment, phase timing, and sim state stay byte-identical (FR23)

**Given** the reduced-motion flag
**When** the session runs
**Then** the flag is never persisted, and the shared `snapGridFor()` singleton remains the only snap-grid authority — new states reuse it (FR23)

**Given** `js/render3d.js`'s reduced-motion idle pose
**When** the fix lands
**Then** WR-02 is resolved: the idle pose no longer animates arms/scarf off wall-clock `beat` (one-line fix at the known site), pinned by a new test (debt closure)

### The WR-02 debt (quoted verbatim — the debt source)

`_bmad-output/planning-artifacts/epics.md:101`:

> Known debt WR-02 (reduced-motion idle pose animates off wall-clock `beat`, `js/render3d.js:387`) — one-line fix; decide whether folded into an Epic 5 story or housekeeping.

Same debt, architecture registry (`architecture.md:91-92`): "WR-02: reduced-motion idle pose still animates arms/scarf off wall-clock `beat` (`js/render3d.js:387`) — one-line fix." (The `:387` line reference is stale — the site is `js/render3d.js:567` at baseline, see Context. The archive lineage is `docs/archive/gsd/planning/STATE.md:113`.)

**Ledger truth (grep census at 052b652, so the audit layer does not re-miss it):** `deferred-work.md` contains **no WR-02 line** — `grep -n "WR-02\|reduced-motion\|reducedMotion" deferred-work.md` = zero matches. The debt was tracked in the planning registries only, and the fold-in decision the epics line asked for is this story. Therefore the PAID-stamp **creates a fresh closure entry in `deferred-work.md`** (Task 4) — `deferred-work.md` rides both diff-census allow-sets (it is the sanctioned artifact-write path); `epics.md` / `architecture.md` are **NOT** in either allow-set and MUST NOT be touched — their Known-Debt entries go stale and their refresh is the docs-provenance lane (Story 6.4 candidate), flagged not done (Decision D4).

### AC-to-verification map (decided — do not re-litigate)

| AC | How it is proven headlessly |
|---|---|
| AC1 (every effect dampens; sim byte-identical) | **Verify-and-pin, not re-implement.** Every Epic-5-added effect already holds static/minimal under `reducedMotion` except the WR-02 idle arms/scarf: the ascent palette flip is an instant per-area write ("No tween, no timer", `js/render3d.js:498-510`, already pinned `tests/areavistas.test.js:469-473`); the iBlank dim + ghost opacity pair shipped **static by design** (no blink, no timer — `js/render3d.js:36-38`, pinned "reducedMotion included" by `tests/iframesjuice.test.js:502` — that is 5.4's **inheritance premise**: the read has zero `view.now` term, so 5.4 restates it reduced-only and adds nothing); juice shake is zeroed at the single `juiceShake` source (`js/render3d.js:653`, generic precedent `tests/render3d.test.js:167-186`) — the NEW work is per-event re-proof for the 5.3 rows `chargeUsed`/`win`, particle-row proof on those seeds, the ghosts decision (D2: keep visible, static-dim — never wall-clock), and the sim-purity census + trace A/B. New suite `tests/reducedmotion.test.js` legs L4-L9 + L11. |
| AC2 (never persisted; `snapGridFor()` sole authority) | Source-census legs, no shell boots needed: `setItem(` appears EXACTLY twice in `js/` (`js/audio.js:36` → key `jumprope-audio`, keys `{muted, volume}` only, `js/audio.js:20-41`; `js/game.js:326` → `jumprope-best`) — there is no third persistence channel for a motion flag to leak into; `loadSettings` drops unknown keys (crafted-blob leg); the `'(prefers-reduced-motion: reduce)'` literal occurs exactly once in `js/` (`js/shell.js:169`, boot read + `change` listener, zero storage calls in that block `js/shell.js:164-173`). `snapGridFor` census: exactly 1 definition + 3 call sites, ALL in `js/render3d.js` (`:160`, `:167`, `:424`, `:485`) — verified at baseline that 5.1–5.3 added no second snap-grid site; the leg freezes that state. Legs L10-L11-law; see Tasks 1c. |
| AC3 (WR-02 resolved + new test) | One-line gate at the known site (`js/render3d.js:567`, Decision D1) pinned by NEW suite legs L1-L3 in `tests/reducedmotion.test.js` (Decision D3 — `tests/render3d.test.js` stays byte-identical, see Loop contract): L1 idle pose-vector staticity across `view.now` advances under reduced motion (kills the bug), L2 full-motion gate proof (the stillness is the branch, not dead code), L3 still-endpoint law (reduced pose === full-motion pose rendered at `now = 0`). Mutation battery M1-M4 (Tasks 5). |

### The reduced-motion decision table (effect × reduced behavior × pinning leg)

| # | Effect | Source | Reduced behavior | Pinned by |
|---|---|---|---|---|
| 1 | Idle breath bob | `render3d.js:564` | static endpoint 0 | **inherited** `render3d.test.js:281-287` |
| 2 | Idle twirl (pivot) | `render3d.js:565` | frozen rest pose 0 | **inherited** `render3d.test.js:282-287` |
| 3 | **Idle arms (WR-02)** | `render3d.js:567-569` | **static — both arms 0.0** (via the beat gate, D1) | **NEW L1 + L3** (fix); gate proof L2 |
| 4 | **Idle scarf (WR-02)** | `render3d.js:567` → `:613-615` | **static per-segment drape** `sin(-k·0.4)·0.5` | **NEW L1 + L3** |
| 5 | Trip-settle damped shake | `render3d.js:580-581` | holds exactly `-PI` | **inherited** `render3d.test.js:289-294` |
| 6 | Running pose + theta-driven arms/scarf/ghostGroup | `render3d.js:559, 596-604` | UNCHANGED — derives from the canonical rope clock (judgment), byte-identical under both flags | **inherited** `render3d.test.js:313-351` (`runningPose`) |
| 7 | Juice shake, ALL events incl. 5.2 `ropeLost` + 5.3 `chargeUsed`/`win` | `shell.js:15-22` → `view.juice` → `render3d.js:653`, decay `:692-693` | 0 at the single source → decay reads 0 → uShake still vector | **inherited** `render3d.test.js:167-186` (generic); **NEW L6** (per-event chargeUsed 1.6 / win 1.95 seeds + gate proof) |
| 8 | Juice particles on the new rows | `render3d.js:659-686` | spawn + opacity ramp + 0.45 s lifetime stay LIVE; flight positions pinned | **inherited** `render3d.test.js:209-232` (generic); **NEW L7** (11/15-particle seeds) |
| 9 | iBlank skipper dim + ghost opacity pair (5.3) | `render3d.js:536-541` | already a STATIC state pair — no blink, no timer ("5.4 inherits as-is", `render3d.js:36-38`) | **inherited** `iframesjuice.test.js:502`; **NEW L4** restates reduced-only |
| 10 | Held-rope ghosts (5.3) | `render3d.js:572, 587, 598-599` | **DECIDED: visible, moving with the CANONICAL rope clock — never hidden, never wall-clock** (D2) | **NEW L5** |
| 11 | Ascent palette flip (4.3) | `render3d.js:498-510` | instant flip per area — already static, no tween | **inherited** `areavistas.test.js:469-473` (FR23 base); **NEW L8** (frame-still after the flip) |
| 12 | Blocked-marker dim (4.5, HUD) | `css/style.css` `.hud-marker.blocked` `opacity: 0.35` | static dim — blink was FORBIDDEN at 4.5 (NFR8) | **inherited** `summitapproach.test.js` §3 (M6–M9 killed) — renderer-adjacent, listed for completeness |
| 13 | PS1 snap grid | `render3d.js:160-166, 424, 485` | `SNAP_OFF = 0.25` px static block | **inherited** `render3d.test.js:189-207`; **NEW L10** (sole-authority census, AC2) |
| 14 | Chest-jiggle gag (1.x) | `render3d.js:620-642` | zeroed at `:626-628` | source-verified only — predates Epic 5, has no reduced leg, OUT OF SCOPE here (do not touch, do not pin) |

### Loop contract (binding)

- Gate `./run_tests.sh` before any edit: **493/493** at `052b652` (verified at authoring). The creation commit alone turns BOTH diff-census legs red (new story artifact — **R1** is the sanctioned restore, same mechanism as 5.3 R3). After dev: 493 + 11 new legs in ONE new file ≈ 504, suite < 10 s (NFR4). Report ACTUAL counts from real run output; never claim green without a run.
- **Product code delta: exactly ONE line in `js/render3d.js`** — replace `beat = now / 1400;` at `:567` with the gated form `beat = reduced ? 0 : now / 1400;` and its Story-5.4/WR-02 attribution comment (Decision D1). NOTHING else in product code: NOT `js/shell.js` (the 5.3 statics and the JUICE rows stay byte-identical), NOT `js/audio.js`, `js/game.js`, `js/rope.js`, `js/player.js`, `js/interpolate.js`, `css/`, `index.html`, `package.json`. No new deps, no build step (NFR6), no new imports anywhere (`render3d.js` keeps EXACTLY the two specifiers `three` + `./interpolate.js`, fenced `ceilingbreak.test.js:520`; module stays timer-free and reads no wall clock outside `view.now`). The fix REMOVES computation under reduced motion — zero new hot-path work (NFR1).
- Existing test files are frozen **except R1** (the two diff-census appends, verbatim below). **`tests/render3d.test.js` is NOT in either allow-set and must stay byte-identical** — its idle/trip/particle/uShake/runningPose legs are this story's inherited premises; every new leg lands in `tests/reducedmotion.test.js` (Decision D3; AC3 says "a NEW test"). Any OTHER existing-file red = implementation wrong; diagnose the code, never the file.
- Freeze-conflict scan (reproduce-first, dev round): with ONLY the one-line gate landed on baseline, run the full gate — expected 493/493 green. Creation-time scan on this tree proves zero frozen legs can redden: the only legs that render `status: 'idle'` are `render3d.test.js:281/283/302/304` and they assert ONLY `rig.position.y` + `pivot.rotation.x` (`:284-287`, `:300-306`); `runningPose` (`:254-274`) reads arms/legs on RUNNING views only; grep census at baseline: **zero** test references to `scarf` or `armL/armR` pose channels; boot legs feed `reducedMotion: false` (matchMedia stubs `polish.test.js:152`, `v1parity.test.js:464`) where behavior is unchanged by construction. A dev-round red contradicts the scan = defect in the dev's diff, not a new conflict.
- Red-first, honest-red: legs **L1-L3** must go RED against the unpatched tree (that IS the WR-02 repro). Legs **L4-L11** are verify-and-pin legs that are GREEN from first write — that is their nature (they freeze inherited invariants); NEVER "fix" them to be red, and if one goes red AFTER the one-line gate, the gate broke something — stop and re-derive.
- No new timing or random surface: the new suite runs on crafted views + ≤2 booted A/B runs (iframesjuice `:652` shape); no `setTimeout` chains, no `Date`, no `Math.random` in product or suite.

### R1 — Sanctioned extension of the two diff-census tripwires (both files; written-authorization rule as in 5.1/5.2 R2 and 5.3 R3)

5.4's changed-vs-base set adds exactly TWO paths: the new suite and this story artifact (the product line's `js/render3d.js`, the ledger's `deferred-work.md`, and `sprint-status.yaml` already ride both sets). Both legs list paths only — **no frozen leg's behavior changes**. Authorized diff, in BOTH sets, insert verbatim after the 5.3 artifact entry, before the closing `]);`:

- `tests/ceilingbreak.test.js` (leg header :546, Set :566-593, tail entries :591-592): insert after `:592`

  ```js
  // Story 5.4 sanctioned re-contract R1 (2026-11-09): the WR-02 one-line beat
  // gate lands in js/render3d.js (in this set since 4.4); the new reduced-motion
  // suite and this story's artifact join here — zero other paths.
  'tests/reducedmotion.test.js',
  '_bmad-output/implementation-artifacts/5-4-reduced-motion-for-new-states-the-wr-02-fix.md',
  ```

- `tests/summitapproach.test.js` (leg header :827, Set :847-874, tail entries :872-873): insert after `:873`, same comment + two entries.

Zero other changes in either file. (Ledger `:173` records the census's known blind spots — owned by the harness chore, not here.)

### Scope boundary vs neighboring stories (explicit, to prevent collision)

- The ghost **area-tint** question (do ghosts take the per-area rope hex?) was deferred by the 5.3 review to **6.2/UAT** — NOT re-opened here; L5 pins behavior on the SHIPPED uniform PALE material only.
- `audio/track.ogg` content is 5.6; audio lifecycle is 5.5 (this story touches zero audio); the UAT-lane FPS claims (`deferred-work.md:155/:166`) stay UAT-owned — the headless mechanism here adds no per-frame work under reduced motion.
- Snap-grid behavior itself is v1-frozen (`render3d.test.js:189-207`); this story pins the SOLE-AUTHORITY census only.
- Planning-registry refresh of the stale WR-02 entries (`epics.md:101`, `architecture.md:91`): docs-provenance lane, Story 6.4 candidate (D4) — census-forbidden here.
- iBlank/ghost statics are 5.3-shipped: 5.4 inherits them as-is; the inheritance premise is `render3d.js:36-38` ("no blink, no timer, so Story 5.4's reduced-motion pass inherits it as-is") + `5-3-i-frame-trip-juice.md:119` (the read has zero `view.now` term).

## Context — shipped state (verified against the tree at 052b652)

1. **The WR-02 site** (`js/render3d.js`): `let beat = theta;` at `:559` drives arms + scarf; the idle branch reassigns `beat = now / 1400;` at `:567` — UNGUARDED — and `:568-569` write `armL/armR.rotation.x = ±Math.sin(beat)` with no `reduced` term; the scarf loop `:613-615` (`Math.sin(beat - k * 0.4) * 0.5`, 3 segments built at `:254-264`) sits OUTSIDE the status branches and consumes the same `beat`. The neighbors in the same block ARE guarded (`rig.position.y` `:564`, `ropePivot.rotation.x` `:565`) — which is exactly why the bug survived: the block LOOKS fully damped. Non-idle statuses keep `beat = theta` (state-derived, correct — table row 6).
2. **Flag plumbing**: `shell.js:169-173` reads `matchMedia('(prefers-reduced-motion: reduce)')` once at boot + live `change` listener — "no polling, no persistence, no in-game override" (`:164-167` comment); the flag reaches the renderer on exactly one path (`shell.js:714` view field). `render3d.js:482-485` stores it per-render and re-applies the snap grid; every reduced arm reads the local `reduced` (`:564, :565, :580, :626, :653, :675`).
3. **The two render-side juice sources**: `:653` `juiceShake = reduced ? 0 : Math.min(2, view.juice.shake ?? 0)` (single write site — covers ALL seven JUICE_TIERS rows, `shell.js:15-22`), decay `:692-693`; particle flight guarded `:675`, spawn/fade/lifetime unguarded ("events stay", pinned `render3d.test.js:209-232`).
4. **Ghosts** (`:367-379, 572, 587, 598-599`): 4 tube meshes, one shared `ghostMat` (`GHOST_OPACITY 0.35` / `GHOST_OPACITY_BLANK 0.85`, `:40-41`); visibility `k < ropes - 1`, sweep `ghostGroup.rotation.x = theta` — the SAME canonical clock as the held rope, zero wall-clock input.
5. **Palette flip** (`:498-510`): vista-cache apply writes background/fog/floor/rope hex + slab visibility — instant, "No tween, no timer (NFR8)".
6. **Persistence surface**: `setItem` twice in `js/` (`audio.js:36` SETTINGS_KEY `jumprope-audio`, keys exactly `{muted, volume}` — `audio.js:7, 20-41`; `game.js:326` `jumprope-best`). No settings writer touches any other key.
7. **Harness donors** for the new suite: the registering three-stub + `bootDampenScene`/`dampenView`/`rigAndPivot`/`runningPose`/`snapGridUniform` from `tests/render3d.test.js:23-97, 134-166, 236-274` — COPY into the new file (frozen suites cannot be imported; same doctrine as the 5.3 harness note); the NFR8 A/B boot shape from `tests/iframesjuice.test.js:652`; `post.children[0].material.uniforms.uShake` accessor `render3d.test.js:169`. Pose identification without names: arms are `torsoGroup.children[2] / [3]` (the shipped convention, `runningPose :266-267`); the scarf is the 3-link chain from `headGroup` (`:236, 255-264`). PREFER the whole-rig depth-first pose vector (Task 1a) — mutation-proof, name-free.

## Decisions (baked — `[DECIDED-BY-CREATE]`; do not re-litigate at dev time)

- **D1 — the fix is the beat-site gate**: `beat = reduced ? 0 : now / 1400;` at `:567`. Why not arm-level guards: the epics line says "one-line fix at the known site" (`epics.md:803`); the gate mirrors the `reduced ? 0 :` idiom two lines above (`:564-565`) — same block, same doctrine; `beat` is shared by arms AND the out-of-branch scarf loop, so per-arm guards would need a THIRD guard at `:614` (or the scarf keeps animating — the exact failure a future `beat` consumer would repeat); and gating at the source keeps the "reduced pose = the zero-clock pose" invariant exact (L3). Alternative rejected: zeroing `beat` unconditionally (kills the full-motion idle life — L2's gate proof reddens).
- **D2 — ghosts under reducedMotion: KEEP visible-and-dim (inherit), do NOT hide** `[DECIDED-BY-CREATE]`. Rationale: FR23 damps COSMETICS, and the ghosts' only motion is the CANONICAL rope clock (`:598`) — the same judgment-relevant sweep the held rope performs under both flags (`render3d.test.js:313-351` proves that channel byte-identical); there is no wall-clock term to damp. Hiding would DELETE state information (how many extra ropes you hold) — that is removal, not dampening — and contradicts the shipped "events stay" doctrine (`render3d.test.js:218`: the burst still spawns under reduced motion). The opacity pair is already static (row 9), so D2 = zero product delta, fenced by L5 (mutation M5 reddens it).
- **D3 — NEW suite `tests/reducedmotion.test.js`, not more legs in `render3d.test.js`**: `render3d.test.js` is untouched since both census bases and is NOT in either allow-set — editing it means touching a frozen file (a behavior re-contract, not just a census append), while a new file costs only the R1 path-append. AC3's "pinned by a NEW test" reads literally. Every story 4.4→5.3 followed this.
- **D4 — WR-02 closure lands ONLY in `deferred-work.md`** (fresh entry, Task 4): `epics.md`/`architecture.md` are in neither allow-set — editing either reddens both diff-census legs (verified: neither planning file appears in the sets at `ceilingbreak.test.js:566-593` / `summitapproach.test.js:847-874`). Their stale Known-Debt entries are named in the ledger entry so a ledger-first reader finds the closure.
- **D5 — still-endpoint law, pinned behaviorally**: the post-fix reduced idle pose must EQUAL the full-motion idle pose rendered at `now = 0` (gate ⇒ `beat = 0` ⇒ arms `sin(0) = 0`; scarf the fixed per-segment drape). Legs compare the two renders — they do NOT hard-pin float literals.

## Tasks / Subtasks

- [x] Task 1 — RED: write `tests/reducedmotion.test.js` (AC: all). Harness: copy the `render3d.test.js` stub+helpers donor (Context §7); direct `../js/game.js` import precedented (`ropelossthud.test.js:5`, `summitapproach.test.js:9`).
  - [x] 1a. Part A — WR-02 (L1-L3): whole-rig pose vector = depth-first walk of the rig Group (children order is deterministic) recording `rotation.x` per node. L1: idle views `{status:'idle', now: 1000}` then `now: 1400`, `reducedMotion: true` → vectors deepStrictEqual (kills M1/M3; asserts nothing about pivot/bob — inherited legs own those). L2 gate proof: same views, `reducedMotion: false` → arms AND at least one scarf node strictly differ between the two renders. L3 still endpoint (D5): reduced @ `now: 99999` === full-motion @ `now: 0`, fresh boots (kills M2).
  - [x] 1b. Part B — Epic-5 states (L4-L9): L4 blank-on `{ropes: 3, iFrames: 2}` @ `now: 1000` vs `9500` under reduced → `roseMat`/`limbMat` hex + `ghostMat.opacity` byte-equal and equal to the full-motion blank read (5.3 :502 law, reduced-only restatement; kill proof = a `view.now`-parity mutation would redden). L5 ghosts (D2): reduced vs full, same state → identical per-slot `visible` vector, identical `ghostMat.opacity`, and `ghostGroup.rotation.x === ropePivot.rotation.x` in BOTH scenes on running views. L6 per-event shake (donor `render3d.test.js:167-186`, but with the SHIPPED row numbers read from `shell.js` — derive-literals doctrine, do not re-type): juice `{at: 1000, shake: <chargeUsed row shake>, particles: <row particles>}` rendered under reduced @ `now` 1000/1030/1139 → `uShake.value.x + 0 === 0` and `.y + 0 === 0` at every sample; same-seed full-motion @ 1030 jitters (gate proof). Repeat for the `win` row. L7: those seeds under reduced → exactly `min(particles, PARTICLE_POOL)` visible at spawn, positions identical across `now` samples (no flight), `particleMat.opacity` strictly decreasing (ramp live — events stay). L8 palette (4.3): area 1→2 flip, then area-2 views @ `now` 5000/5040/9500 under reduced → fog/sky/floor/rope hexes + slab visibility identical across all three AND equal to the flip frame (no eased-in). L9 sim purity + A/B (FR23): source census — `reducedMotion` appears ONLY in `shell.js` (`:170, :172, :714`) and `render3d.js` across `js/`, zero matches in game/rope/player/interpolate/audio; plus ONE boot A/B: identical scripted 400-tick event stream (trip + charge + ascend), the two boots' views differ ONLY in the flag → phase + record traces byte-identical (donor `iframesjuice.test.js:652`).
  - [x] 1c. Part C — AC2 laws (L10-L11): L10 persistence: `setItem(` source census over `js/*.js` = EXACTLY the two documented sites; `saveSettings(fakeStorage, {...})` writes `jumprope-audio` whose parsed key set sorted === `['muted','volume']`; `loadSettings` on a crafted blob `{muted: true, volume: 0.5, reducedMotion: true, prefersReducedMotion: true}` returns EXACTLY `{muted: true, volume: 0.5}` (motion keys dropped by construction); the matchMedia literal occurs exactly once in `js/` and the shell boot block it lives in (`shell.js:164-173`) contains zero `storage`/`localStorage` calls. L11 snap-grid authority: `snapGridFor` occurrences = 4, all inside `render3d.js` (def :160 + calls :167/:424/:485), and both uniform writes use the `...snapGridFor(` spread (no raw `SNAP_` literal write elsewhere; `SNAP_S`/`SNAP_OFF` defined only in `render3d.js`).
- [x] Task 2 — RED confirmed / GREEN: run the gate. Expect EXACTLY L1 and L3 red (WR-02 repro; L2/L4-L11 green by construction — see Loop contract honest-red rule). Land the ONE-LINE gate at `js/render3d.js:567` + attribution comment (`// Story 5.4 / WR-02 (epics.md:101): the idle clock gates at the source — arms + scarf hold the zero-clock pose under reduced motion (Decision D1)`). L1/L3 green, 493+11 all green.
- [x] Task 3 — Neutral: land R1 (both allow-set appends verbatim — restores the legs the creation commit turned red).
- [x] Task 4 — Close-out artifacts: append the WR-02 closure entry to `deferred-work.md` (fresh section `## Epic 5 debt pass (Story 5.4, <date>)`; body: debt quote of `epics.md:101`, the grep truth that no ledger line pre-existed, **PAID**: gate at `js/render3d.js:567`, pinned `tests/reducedmotion.test.js` L1-L3 + mutation battery, and the note that `architecture.md:91` goes stale — docs-provenance lane 6.4, D4). Full gate green; by inspection confirm untouched-green: `render3d.test.js` legs (the premises), VOICES/boundary/particle censuses, both diff censuses.
- [x] Task 5 — Mutation battery on `/tmp` clones (every number in the Debug Log): M1 revert the gate → L1+L3 red; M2 `beat = reduced ? theta : now / 1400` → L3 red only (name it — L1 survives a static phase, the table says why); M3 gate the arms but leave `beat` wall-clock (scarf animates) → L1 red; M4 `beat = 0` unconditionally → L2 red (dead-code fence); M5 hide ghosts under reduced at `:599` → L5 red (D2 guard); M6 add a `reducedMotion` key to `saveSettings` → L10 red; M7 write `uSnapGrid.value.set` with a raw literal at `:485` → L11 red. All die, gold survives at 504±.
- [x] Task 6 — Dev Agent Record: actual gate counts, sha list, Debug Log; set status review.

## Dev Notes

### The one paragraph that prevents the top three disasters

The fix is ONE LINE at `js/render3d.js:567` — if your diff touches any other product-code character, you have misread this story (disaster 1: scope creep past the gate). The suite has TWO kinds of legs — L1 and L3 are the honest-red WR-02 repro (they MUST fail before the gate; L2 was written expecting red but shipped green-from-first-write because the `:502` reduced guard from Story 5.3 already covers its premise — it stands as a staticity pin, premise-corrected, see Dev Log), L4-L11 are verify-and-pin legs that are green on baseline BY DESIGN (disaster 2: "fixing" a green pin into a red strawman, e.g. making L5 assert ghosts-hidden — the decided answer is visible, D2, with the rationale in the table). And `tests/render3d.test.js` is sacred: its idle/snap/uShake/particle/runningPose legs are the inherited premises your new suite restates reduced-only — copying its stub/harness code into the new file is required, importing from it is forbidden, editing it reddens the censuses (disaster 3: "tidying" the donor into your new file and tripping both tripwires).

### What "static or minimal" means here (the doctrine in one line each)

- STATIC = value identical across `view.now` advances (L1/L4/L6/L8 comparisons are `now`-only deltas: same state, different clock).
- MINIMAL = the event keeps its state reads (spawn, ramp, lifetime, visibility) while the MOTION term is zeroed (rows 7-8; `render3d.test.js:218` "events stay").
- NEVER = judgment channels (rope phase, pivot theta, ghost sweep) — those are byte-identical in BOTH modes already (`render3d.test.js:313-351`); L9 freezes that the sim modules never even see the flag.

### Project Structure Notes

- New file `tests/reducedmotion.test.js` joins the flat `tests/` suite set; suite-name convention matches 4.3/5.3 usage (`reducedmotion` = the FR23 surface). No new dirs, no support-file extraction (the harness-fork ledger item `:51` owns shell-harness dedup only; renderer-stub copying is the ratified per-suite doctrine — say so in the file header, as 5.3's note does).
- `git diff --name-only` after dev must be: `js/render3d.js`, `tests/ceilingbreak.test.js`, `tests/summitapproach.test.js`, `tests/reducedmotion.test.js`, `deferred-work.md`, `sprint-status.yaml`, this artifact — nothing else (the two censuses' own tripwire, with R1's entries).

### Project Context Rules

- No `project-context.md` exists in this repo; the binding conventions live in `AGENTS.md` + the epics conventions block (`epics.md:96-103`): one shared handler per concern (`snapGridFor()` named there verbatim — AC2's law), tests via the one gate `./run_tests.sh`, named exports, POJOs, no `console.*` in pure modules, near-frozen `index.html`/`package.json`.

### References

- `epics.md:785-803` (this story), `:101` (debt), `:60`/`:138` (FR23), `:184/:721` (Epic 5 fold-in framing)
- `architecture.md:62` (singleton law), `:69` (cosmetics-only law), `:91-92` (WR-02 registry entry)
- `js/render3d.js:559-572, 613-615` (the site), `:482-485`, `:536-541`, `:36-42`, `:564-565, 580, 626, 653, 675` (the guarded siblings), `:498-510`, `:160-166, 424, 485`
- `js/shell.js:15-22` (JUICE rows), `:164-173` (matchMedia read-only block), `:714` (single view feed); `js/audio.js:7, 20-41`; `js/game.js:316-326`
- `tests/render3d.test.js:23-97, 134-166, 167-186, 189-207, 209-232, 236-274, 275-311, 313-351` (donors + premises); `tests/iframesjuice.test.js:502, :652`; `tests/areavistas.test.js:469-473`; `tests/ceilingmarker.test.js`/`summitapproach.test.js` §3 (row 12)
- `5-3-i-frame-trip-juice.md:119, :124` (inheritance premise + "WR-02 is 5.4's debt"); `1-5-input-hygiene-v1-parity-proof.md:102, :120` (the debt's Epic-5 routing); `4-4-the-ceiling-break-moment.md:61` ("WR-02 idle-pose beat fix … 5.4")

## Dev Agent Record

### Agent Model Used

qwen (lane-qwen38-ultra/qwen)

### Debug Log References

- **Baseline honesty (pre-edit, HEAD `73f7027`)**: `./run_tests.sh` → **491/493** — the two reds are exactly the creation-sanctioned diff-census legs (`ceilingbreak` §6, `summitapproach` §4.3), untouched until Task 3's R1; every other leg green. Site verified before editing: `js/render3d.js:567` = `beat = now / 1400;` unguarded (the `:564/:565` neighbors ARE guarded — the block LOOKS fully damped, exactly the Context §1 premise).
- **RED phase (Task 1, product tree UNPATCHED)**: solo `node --test --test-reporter=tap tests/reducedmotion.test.js` → **9 pass / 2 fail**, red = EXACTLY `L1 WR-02 repro: the whole-rig idle pose vector is static…` and `L3 still-endpoint law (D5)…` — the honest repro composition; L2 + L4-L11 green from first write (verify-and-pin, per the loop contract). Full-gate red phase reproduced on a one-revert `/tmp` clone: **502/504**, reds = `L1` + `L3` only (the clone commits R1's artifact path, so the two census legs stay green there — in the live working tree at this phase they are additionally red: 500/504 composition, not separately run).
- **Harness fixes during the red phase (test-side only, zero product deltas)**: (a) first suite write had an `await` inside a non-async `reduce` callback — a SyntaxError that reddened the WHOLE FILE as one unit (`not ok - tests/reducedmotion.test.js`, 491/494); caught because the red composition was wrong (file-level, not L1/L3), fixed with a sequential loop; (b) `shippedConst` widened to decimal constants (`GHOST_OPACITY*` are `0.35`/`0.85`, not hex) — L4/L5 had died on the missing-constant assert; (c) the `MeshBasicMaterial` stub clobbered its recording `Color` with the raw hex option (the option loop lacked the Lambert arm's `color` guard) → `ropeMat.color.set is not a function` on the vista apply path (L8); (d) L8's VISTAS parse dropped the constant-referencing tier-1 row (hex-only regex) shifting the row-vs-area index (expected `0x101a30` = tier 3, got tier 2) — parse now RESOLVES `SKY/FLOOR/PALE` names through `shippedConst` and pins five parsed rows; the `fog` channel maps to VISTAS sky per the D-06 pair; (e) L9 read `AREAS` off the shell module (undefined — shell exports no AREAS) — now a `fileHref('game.js')` dynamic import, the direct-import precedent, data-URL style, boundary graph unchanged; (f) one edit-range accident briefly deleted the harness's `sourceOf` line (all source-census legs red — composition anomaly caught it immediately), restored.
- **Fix flip (Task 2)**: after the one-line gate at `:567` — solo suite **11/11**; full gate **502/504** (remaining reds = the two creation census legs, exactly as the story predicted for pre-R1).
- **R1 (Task 3)**: both allow-set appends verbatim (`ceilingbreak` after :592, `summitapproach` after :873) → both creation legs restored; first full green **504/504** (`# duration_ms ~8500`, NFR4 < 10 s).
- **Mutation battery (Task 5, `/tmp` clones; gold clone solo 11/11 AND gold full gate 504/504)**: **M1** revert-the-gate → **L1+L3 red** (9/2) as prescribed; **M2** `reduced ? theta : now/1400` → **L3 ONLY** (10/1 — L1 survives a static phase: idle theta = PI holds a constant angle, per the story's table); **M3** arms gated, `beat` wall-clock → **L1+L3** (prescribed L1; the scarf ALSO dies the still-endpoint arm — a fence stronger than promised, recorded honest); **M4** `beat = 0` unconditionally → **L2 only** (dead-code fence); **M5** hide ghosts under reduced at `:599` → **L5 only** (D2 guard); **M6** `saveSettings` writes `reducedMotion` → **L10+L9** (prescribed L10; L9's purity census also catches the token landing in audio.js — stronger); **M7** raw literal at the `:485` uSnapGrid write → **L11 only**. 7/7 die, gold survives 504/504.
- **Final gate**: `./run_tests.sh` → **504/504 passed**, exit 0 (~8.5 s).

### Completion Notes List

- Product delta is EXACTLY one line — `js/render3d.js:567` `beat = now / 1400;` → `beat = reduced ? 0 : now / 1400;` with the Story-5.4/WR-02 attribution comment on the same line (git diff: one `-`/one `+`, no other product-code character touched; `js/shell.js`/`audio.js`/`game.js`/`rope.js`/`player.js`/`interpolate.js`/`css/`/`index.html` untouched; two-specifier law intact; the fix REMOVES computation under reduced — NFR1).
- `tests/reducedmotion.test.js`: 11 legs (Part A 1-3, Part B 4-9, Part C 10-11), TWO shell boots total (L9 A/B only — everything else crafted views), no `setTimeout` chains, no `Date`, no `Math.random`; harness fork doctrine stated in the file header (stub+helpers copied from `render3d.test.js`, color-recording extension per the 5.3 precedent, bootShell donor with the matchMedia arm parameterized).
- L1's whole-rig pose walk structurally spans arms AND the scarf chain (the L2 leg proves liveness: both arms + a scarf node strictly differ under full motion), so a future per-site refactor that re-animates ONE consumer reddens L1 — the requested cross-check is pinned in the suite.
- L5 pins D2 honestly: ghosts VISIBLE [true,true,false,false] under reduced (ropes 3), identical opacity/offset vectors, sweep === pivot on BOTH scenes, and `runningPose` byte-identical with the ghosts live (the inherited :313-351 law extended to the 5.3 channels).
- L9 stream fires ascend + chargeUsed + ropeLost×2 + trip in both boots (>400 sim ticks, `script.n` equal) with byte-identical phase + run-record traces; the flag is demonstrably on the views (`flagSeen`) and census-proven invisible to game/rope/player/interpolate/audio.
- Ledger: fresh `## Epic 5 debt pass (Story 5.4, 2026-11-09)` PAID section in `deferred-work.md` (grep census repeated before writing: zero WR-02 matches at HEAD — the story's ledger truth reproduced); `epics.md`/`architecture.md` NOT touched (D4; both diff censuses green with them unmodified).
- Premise audit: no story premise contradicted the tree. The two battery overshoots (M3→L3, M6→L9 additionally red) are fences stronger than the story predicted, not strawmen: no pin was "fixed" into a weaker shape, and no red pin was patched around. `tests/render3d.test.js` byte-identical (not in `git diff --name-only`).

### File List

- `js/render3d.js` — the WR-02 one-line beat gate at `:567` (+ attribution comment)
- `tests/reducedmotion.test.js` — NEW suite, legs L1-L11
- `tests/ceilingbreak.test.js` — R1 append to the §6 diff-census allow-set
- `tests/summitapproach.test.js` — R1 append to the §4.3 diff-census allow-set
- `_bmad-output/implementation-artifacts/deferred-work.md` — WR-02 PAID closure section (fresh entry)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 5.4 → review
- `_bmad-output/implementation-artifacts/5-4-reduced-motion-for-new-states-the-wr-02-fix.md` — this file

### Change Log

- 2026-11-09: Dev round complete — red-first L1-L3 (9/2 solo pre-fix), one-line gate landed and flipped, R1 restored both creation censuses, ledger PAID entry, M1-M7 battery 7/7 killed on `/tmp` clones (gold 504/504); status → review.
- 2026-11-09: Story 5.4 created — one-line beat-gate fix decided at `js/render3d.js:567` (D1), ghost keep-visible decision (D2), 11-leg verify-and-pin + honest-red suite spec, R1 both censuses, ledger truth recorded (no pre-existing WR-02 line; fresh PAID entry in dev Task 4, D4); all calls [DECIDED-BY-CREATE]; status ready-for-dev.
- 2026-11-09: Review round complete — verdict correct/PASS (two layers @ dea4409); 1 record patch (:142 red-first claim -> L1+L3 honest-red + L2 premise correction), 0 product patches, 0 defers (drift-guard observation recorded as considered/rejected at create); status done.

## Review (2026-11-09, two layers @ dea4409 — Blind mutation battery + contract audit)

- **Verdict:** `correct` (Blind, conf 0.88-0.90) + all ACs PASS, fences PASS, records PASS (Auditor). Product delta one line, zero patches needed.
- **Battery (Blind, independent of dev's M1-M7):** 8 mutants killed with full-gate numbers on `/tmp` clones (revert-gate; theta-as-gated-beat; arms-guarded-beat-live -> L1+L3 ONLY; `reduced ? theta`; ghosts-hidden-reduced -> L5 only; raw snap write bypassing `snapGridFor`; unconditionally-zero snap grid; wall-clock in idle branch); 8 weakened-suite probes — no accidental load-bearing. M4 (`beat = 0`) is the SOLE killer of L2: the full-motion gate leg alone detects a dead-code stillness (Blind's hardening note — accepted as-is, both fences fire only together on the M1 shape).
- **Record patch:** loop-contract red-first claim corrected in place (:142): L1+L3 are the honest-red pair; L2 shipped green-from-first-write (the `:502` reduced guard from Story 5.3 covers its premise) and stands as a staticity pin — matching the Dev Log's executed numbers. The auditor's three record asks (466/476 typo, clone-count parenthetical, R1 range) all resolved as misquotes: the strings do not exist at either generation, and the two fixes requested are literally already in :177; R1 phrasing is positional ("after :592") and correct against the hunk.
- **Finding closed as INVALID-TREE:** the blind layer's mid-round claim that `snapGridFor` is absent from `js/` was a corrupt-clone artifact — repo root @ dea4409: `grep -rn snapGridFor js/` hits `render3d.js:160/167/424/485` (+ :480 comment), which is exactly what L11 censuses; the M7 kill mechanism the layer itself walked through (raw write drops the 4-occurrence count and breaks the spread law) is sound on the real tree.
- **F1 disposition:** per-site `reduced ? 0 :` guards at the three consumer sites — considered and REJECTED at create (D1): the scarf loop (`:613-615`) reads `beat`, so arm-only guards leave it animating (WR-02 half-paid); the source gate zeroes rig+arms+scarf from one site, and dev battery M3 (arms-guarded/beat-live) is the executed proof the per-site shape dies at L1+L3.
- **Defers: 0 new.** The auditor's three named defers re-verified as already-owned ledger lanes (D-05 flake re-classified pre-6.6; census re-pin owned pre-6.6; 6.2/UAT lanes unchanged) — no new rows landed.

## Open notes (created at story creation; reported, not blocking)

- None. The two judgment calls the epic left open (fix shape; ghosts hide-vs-inherit) were decided at creation (D1/D2) with rationale and a mutation guard each. The 4.3/4.4-line UAT-lane FPS claims stay UAT-owned (`deferred-work.md:155/:166`); this story's headless mechanism adds zero per-frame work.
