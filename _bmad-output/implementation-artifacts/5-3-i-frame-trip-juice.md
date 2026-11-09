---
baseline_commit: 8c4f02c
---
# Story 5.3: i-frame & trip juice

Status: ready-for-dev

Baseline: `8c4f02c` (Story 5.2 done — rope-loss thud + last-rope tension shipped, JUICE_TIERS at five rows, R1–R4 re-contracts landed; gate **476/476 green @ ~8.5 s**, tree clean, verified at authoring time 2026-11-09). Third story of Feel & Fidelity. This story **pays the extra-rope ledger debt** (below): 3D still draws ONE rope no matter how many are held, and the two events the sim has always emitted but juice never voiced — `chargeUsed` (`js/game.js:223`) and `win` (`js/game.js:273`) — get their JUICE_TIERS rows here.

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player who just tripped,
I want the i-frame blank to look and read intentional,
So that losing a rope feels like a protected recovery, not dropped frames.

## Acceptance Criteria

(verbatim from `_bmad-output/planning-artifacts/epics.md:765-783` — FR3, FR16, NFR8, NFR1)

**Given** i-frames active in the view payload
**When** frames render during the blank
**Then** a cosmetic read of invulnerability is visible (e.g. rope ghosts through, skipper dim) derived purely from state — the renderer computes no gameplay truth, and the sim timing is byte-identical with and without the juice (FR3, NFR8)

**Given** trip and ascent events at any significance
**When** juice plays
**Then** hitstop/shake/particle intensity follows v1's significance-scaled tiers, extended — not replaced — for the new event types (FR16 seam)

**Given** the busiest case (trip during multi-rope play with streak callouts active)
**When** juice plays
**Then** 60 FPS holds at the 240-row target (NFR1)

### AC-to-verification map (decided — do not re-litigate)

| AC | How it is proven headlessly |
|---|---|
| AC1 | New suite Part A (module-level render boots, crafted views — the `render3d.test.js`/`areavistas.test.js` donor pattern): a pooled **ghost-rope group** (4 meshes, built ONCE, hidden at boot) becomes visible per the clamped `view.run.ropes − 1`, and the **i-frame cosmetic read** (skipper dim + ghosts lifted to full alpha) switches on the boolean `Number.isFinite(view.run.iFrames) && view.run.iFrames > 0` — pure state, zero `view.now`/timer input (proven by a same-state/advancing-`now` byte-equality leg + a source-census leg). The renderer computes no gameplay truth: clamp arms mirrored INLINE (the `vistaFor`/`clampArea` precedent, `js/render3d.js:48,:83`), never imported. NFR8: sim-timing A/B (ropelossthud :549 idiom) with the new rows parked hitstop↔0 — byte-identical phase timelines; `js/game.js`/`js/rope.js` carry ZERO delta so `tests/boundary.test.js` stays green untouched. |
| AC2 | JUICE_TIERS gains EXACTLY two rows — `chargeUsed` and `win` — via written re-contract **R1** (both JUICE census/ladder legs, verbatim below). The five shipped rows stay byte-identical (the "extend, not replace" fence is the legs' own verbatim pins). `offer`/`pick` stay juice-silent — the exact-name JUICE census going 5→7 is EXHAUSTIVE, so nothing else can join. VOICES stays the shipped EIGHT names byte-identically (`js/audio.js` zero delta; `chargeUsed` stays audio-silent, `win`'s voice is 5.1's, untouched) — the ceilingbreak §6 eight-name census is the fence and must not be edited. |
| AC3 | Mechanism-census proof, the 4.4/5.1 style: registration-stub boots (the `__juiceReg` pattern, `tests/juice.test.js:273-328`, COPIED into the new file — do not import from the frozen suite) show ghosts + i-frame read add **zero** per-frame allocation: register arrays unchanged across 60 ghost-live frames with bursts; no new render pass; particle pool stays the shipped 16; ≤4 ghost visibility writes per frame. |

### Loop contract (binding)

- Gate `./run_tests.sh` before any edit: **476/476**. The creation commit alone turns BOTH diff-census legs red (new story artifact — R3 is the sanctioned restore, same mechanism 5.2 R2 documented). After dev: 476 + ~15 new legs in ONE new test file + R1/R2 1-in/1-out rewrites + R3 appends — total ≈ 491, suite < 10 s (NFR4). Report ACTUAL counts from real run output; never claim green without a run.
- **Product code delta: exactly `js/render3d.js`** (ghost pool + ghostGroup, i-frame cosmetic read, inline clamp arms) **and `js/shell.js`** (JUICE_TIERS gains TWO rows — comments and rows only, no logic: the drain at `js/shell.js:688-694` is already table-driven; the shipped `stopUntil` write sites stay the four they are — declaration :153, resets :242/:259, the one table write :692 — and the drain-gate phrase `now < stopUntil` stays exactly 1 in the shell source, frozen at `tests/ceilingbreak.test.js:535`). NOT touched: `js/game.js`, `js/rope.js`, `js/player.js`, `js/audio.js`, `js/interpolate.js`, `css/`, `index.html`, `package.json`. No new deps, no build step (NFR6). No new imports ANYWHERE: `js/render3d.js` imports EXACTLY two specifiers (`three`, `./interpolate.js`) — read `view.run.ropes`/`view.run.iFrames` and clamp INLINE; importing `clampRopes` from `game.js` would break the two-boundary law (`tests/boundary.test.js` + the shell-specifier leg quoted below).
- Existing test files are frozen **except the three sanctioned re-contracts R1/R2/R3** below. Any OTHER existing-file red = implementation wrong; diagnose the code, never the file. The freeze-conflict scan (next section) is the pre-baked answer to "but my leg went red on a frozen frame": with the seeds this story ships, ZERO frozen legs redden — proven empirically at baseline; if a dev-round red contradicts the scan, it is a defect in the dev's diff, not a new conflict to route around.
- No new timing or random surface: no `setTimeout`/`setInterval`/`Date`/wall-clock/`Math.random` in `js/render3d.js` (the module is timer-free TODAY — verified zero matches at `8c4f02c` — and stays that way; the i-frame read must be pure state, NFR8). Ghost phase offsets derive from `theta` and the clamped rope count, nothing else.
- The five shipped JUICE rows stay byte-identical (v1parity + FEEL-02 "extend, never replace"). D-N02 (events are audio's only feed, `js/shell.js:681`) and D-N09 untouched.

### R1 — Sanctioned re-contract of the JUICE_TIERS census legs (`tests/juice.test.js:153` + `tests/ceilingbreak.test.js` §1 :326 + :341)

Adding the `chargeUsed` and `win` rows turns both exact-key JUICE censuses red BY DESIGN — the same anticipated-un-fencing pattern as 5.2 R3.

Authorized diff, the ONLY edits allowed in those legs (1-in/1-out, leg counts unchanged):

- `tests/juice.test.js:153`: `assert.deepEqual(Object.keys(t).sort(), ['ascend', 'nearMiss', 'ropeLost', 'skip', 'trip'])` → **seven-name** census `['ascend', 'chargeUsed', 'nearMiss', 'ropeLost', 'skip', 'trip', 'win']`, wording retitled to name Story 5.3 (FR16 seam: the still-silent event names get their rows); keep the verbatim row-pins and the band loop (:154-165) untouched — both new rows pass the shipped bands (`shake ≤ 2`, `1 ≤ particles ≤ 24`) on their own numbers, and the :159 `skip≤16 ∧ nearMiss=40 ∧ trip=80` invariant and the :164 chain still hold unchanged.
- `tests/ceilingbreak.test.js:326`: the five-name census → the same SEVEN-name sorted list as the juice.test.js leg, wording names Story 5.3.
- `tests/ceilingbreak.test.js:341`: the significance ladder pairs go from
  `[['skip', 'nearMiss'], ['nearMiss', 'ascend'], ['ascend', 'ropeLost'], ['ropeLost', 'trip']]` to
  `[['skip', 'nearMiss'], ['nearMiss', 'chargeUsed'], ['chargeUsed', 'ascend'], ['ascend', 'ropeLost'], ['ropeLost', 'trip'], ['win', 'trip']]`
  — the chain grows one rung (an absorbed hit out-juices a close call, a ceiling break out-juices an absorbed hit); `win` joins as a leaf fenced STRICTLY BELOW `trip` on all three axes (0<80, 1.95<2, 15<16) — **death stays the loudest event**, the :340 comment's law survives the extension verbatim.
Zero other changes in either file.

### R2 — Sanctioned re-contract of the tube-mesh census (`tests/areavistas.test.js` §2 :258-281, bite at :262) — the review-4.4-Blind-F1 self-describing fence

`areavistas.test.js:261-262` censuses `reg.meshes.filter(m => m.geometry?.constructor.name === 'TubeGeometry')` and asserts **exactly ONE tube mesh at boot** — the rope. Ghost ropes ARE tube-geometry meshes built at boot, so this leg goes red BY DESIGN the moment the pool lands. The leg's own comment prescribes the sanctioned route: *"Identity-keyed (review 4.4, Blind F1): a NEW tube mesh must be added to the census here, not silently covered by a geometry-class exemption."*

Authorized diff (identity append, the loop body :266-280 stays BYTE-IDENTICAL):

- `:262` becomes a two-part census: tube meshes = exactly **one rope + exactly four ghosts** (5 total); the ROPE stays keyed by identity — `ropeTube` remains the FIRST-registered tube mesh (construction order: rope at `js/render3d.js:328-331` precedes the ghost pool — pin the order in the leg), so `ropeMeshes[0]` at :276 keeps its exact current meaning with ZERO diff. The four ghost identities are enumerated (`const ghostMeshes = tubeMeshes.filter(m => m !== ropeMeshes[0])`, assert 4) purely to assert they are **not** silently swept: they PASS the loop untouched because their material is birth-static — one shared `ghostMat`, never written by any vista arm (`m.color.hex === m.birthHex` holds by construction, and `!slabMats.has(ghostMat)` holds — it is a new material, shared only among ghosts).
- Wording names Story 5.3. Nothing else in the file changes; leg count unchanged.

**Consequences of R2's shape (fences the product must honor):** the ghost pool is EXACTLY 4 meshes (`MAX_ROPES − 1 = 5 − 1`, `js/game.js:25`) — never 3: a 3-children material-bearing Group at scene root would collide with the `rigAndPivot` TRIO fingerprint (`tests/render3d.test.js:242-246` asserts exactly one material-bearing trio = ropePivot; the horizon group's ">3 children" safety leg at `tests/areavistas.test.js:304-307` is the precedent this count must satisfy, and the new suite re-asserts it for the ghostGroup). Ghosts are NEVER children of `ropePivot` — ropePivot keeps exactly `[ropeTube, handleL, handleR]` (`js/render3d.js:332,:337,:340`; the probe fingerprints it as THE unique all-material trio and any fourth child reddens `runningPose` channel indices too). Ghosts are NEVER `PlaneGeometry` — the particle pool census filters planes and pins 16 (`tests/juice.test.js:350,:63`-style legs); a plane ghost would contaminate it (mutation-prove this, Task 6).

### R3 — Sanctioned extension of the two diff-census tripwires (both files; same written-authorization rule as 5.1/5.2 R2)

The frozen diff censuses — `tests/ceilingbreak.test.js` §6 (`const allowed = new Set([` at :566, list :567-588, assert :589, pinned base `5659fd4`) and `tests/summitapproach.test.js` §4.3 (`const allowed = new Set([` at :847, list :848-866, assert :867, pinned base `2c3e693`) — diff the worktree against Epic-4 bases, so every new/changed path needs an allow-set line or goes red. Already allowed by both: `js/shell.js`, `js/audio.js`, `tests/juice.test.js`, `deferred-work.md`, `sprint-status.yaml`, `tests/ceilingbreak.test.js`, `tests/summitapproach.test.js`. `js/render3d.js` is allowed by the ceilingbreak set (:567) but **NOT by the summitapproach set** — 4.5's base postdates the last render3d edit, so THIS story must add it there (verified asymmetry at `8c4f02c`).

Authorized diff (appends + attribution comments only; base shas, git plumbing, fallback arms, assertion shape untouched):

- Append to `tests/ceilingbreak.test.js` §6 (:566-588): `'tests/iframesjuice.test.js'`, `'_bmad-output/implementation-artifacts/5-3-i-frame-trip-juice.md'` — comment attributing Story 5.3. (`tests/areavistas.test.js` — the R2 file — is ALREADY in this set from 4.4 (:568).)
- Append to `tests/summitapproach.test.js` §4.3 (:848-866): the SAME two paths **plus `'js/render3d.js'` plus `'tests/areavistas.test.js'`** — comment attributing Story 5.3 and naming the render3d edit (ghost pool + i-frame read) and the R2 tube-census rewrite as the two reasons those paths join this census's changed set.

At creation time this fence already bites: the creation commit alone turns both legs red (new story artifact). That is the mechanism, not a defect; Task 3 restores green.

### Freeze-conflict scan (5.2 R4 class — scanned empirically at baseline, NOT re-derived from memory)

The class: any JUICE row with `hitstop > 0` freezes ≥1 frame at the event tick (`stopUntil` drain gate, `js/shell.js:672`); frozen frames legitimately re-present the LAST STEPPED view/DOM, which reddens any boot leg that asserts presentation on EVERY pumped frame. The story's scan method: `/tmp` clone of `8c4f02c`, candidate rows + the R1 censuses applied (so any red is a freeze-conflict, not a census), full gate per variant:

| Variant | Gate result | Reading |
|---|---|---|
| **A** = `chargeUsed {50, 1.6, 11}` + `win {0, 1.95, 15}` + R1 census rewrite | **476/476 GREEN** | The shipped seeds create ZERO frozen-frame conflicts. |
| **B** = A but `win.hitstop: 70` (hitstop>0 win probe) | **476/476 GREEN** | Even a freezing `win` row touches no exposed leg today — the post-win presentation legs are predicate-pumped or module-level. The hitstop-0 win seed below is therefore a DESIGN choice (no freeze at the moment the run visibly ends + the simplest NFR8 A/B), not a conflict-avoidance necessity. Scan-table duty discharged honestly: no seed choice reddens anything. |
| **M** = A minus the `['win','trip']` pair | **476/476 GREEN** | The win pair is currently a DATA fence (no runtime leg produces win-juice yet) — kill-surface for the win/chargeUsed rows is the verbatim pins + the new suite's runtime legs (Task 6 enumerates the mutation battery). |

Why the class has no live surface (cited, verified): the only stepped-gate that exists is summitapproach §3.4's blank-phase loop (`tests/summitapproach.test.js:760-762`, the `s.steps` wrapper idiom at :490-491) — added by 5.2 R4, still there, immune. The pip/juice-capable boot harnesses are all PUMP-PAST-FREEZE by construction: `tests/ropehud.test.js:263` explicitly pumps past the trip's ~80 ms freeze; `tests/nearmiss.test.js` (:303-312) and `tests/juice.test.js:205-262` poll predicates with budgets, never assert-every-frame; summitapproach's other booted loops run shell-free module legs or the gated loop. **CONCLUSION: zero stepped-gate re-contracts for 5.3.** If a dev-round red in a frozen boot leg contradicts this table, it is a defect introduced by this story's diff (e.g. an accidental `stopUntil` write outside the table) — fix the code, reproduce-or-drop per the scan method, never silently re-gate a frozen leg.

### Ledger carry-in (verbatim, `deferred-work.md:89` — extra-rope research)

> ":89 — **Extra ropes stay invisible in 3D until Story 5.3** (`js/render3d.js:267-294,454` poses one rope off the single clock) — HUD pips grow for free (`1-3-rope-count-on-the-hud.md:34`), so an added rope reads as health but not as N ropes sweeping the skipper. Any playtest before 5.3 will report 'I didn't see anything change'."

← this paragraph is that ownership: 5.3 builds the held-rope ghosts (AC1's "rope ghosts through" read during the blank rides the SAME meshes — one pool, two states), and Task 6 PAID-stamps the ledger line.

### Event-channel facts (verified against `js/game.js` at 8c4f02c — the AC2 truth)

- `'chargeUsed'` (`js/game.js:223`) — the Steel Cord charge eats the hit; `iframesLeft = ropeCount` (:221) so a blank follows, exactly the state the AC1 cosmetic read must light in. Juice: NEW row here. Audio: **stays silent** — no VOICES key (the eight-name census at `tests/ceilingbreak.test.js` §6 is the fence and gets ZERO edits).
- `'win'` (`js/game.js:273`, after the `'offer'` splice at :271-272) — summit reached. Audio: 5.1's `win` fanfare voice, untouched (VOICES byte-identical). Juice: NEW row here. The win tick ALSO ends the run (`outcome: 'summit'`, status not 'running'), so the juice burst rides the last live frame.
- `'ascend'`, `'nearMiss'`, `'skip'`, `'ropeLost'`, `'trip'` — rows shipped, VERBATIM frozen. `'offer'`/`'pick'` — no row, no juice (UI voices own them; the seven-name JUICE census fences the boundary).
- All names reach the drain via the D-N02 channel (`js/shell.js:688`) — no presentation-side hook, ever.

### AC1 mechanism — the i-frame read and the ghost pool (the verified gap, and the ratified route)

**The view payload already carries everything** (`js/shell.js:712`): `scene.render({ run, rope, player, prevPhase, alpha, best, now, juice, reducedMotion })` — `run.ropes` (integer ≥1 post-clamp in the sim; crafted hostile views must survive) and `run.iFrames` (step-count integer; the sim's own arm treats non-finite as inactive, `js/game.js:146`). `js/render3d.js` reads NEITHER today (verified: zero `ropes`/`iFrames` matches in the module at `8c4f02c`) — that read IS this story's renderer delta.

1. **Clamp arms mirrored INLINE** (the `clampArea` mirror law, `js/render3d.js:48,:83` — "inline by law, not taste; a third import breaks the boot wheel"): `const ropes = Number.isFinite(n) ? Math.trunc(n) : n === Infinity ? 5 : 1; Math.min(5, Math.max(1, ropes))` — exact mirror of `clampRopes` (`js/game.js:41-46`), literal 5/1 with a comment naming the mirrored function and file:line (NEVER `import`). `const iBlank = Number.isFinite(i) && i > 0` mirrors the game-side active test (`js/game.js:146,:170`).
2. **Ghost pool built ONCE at boot**: `ghostGeo` = ONE shared geometry object + ONE `ghostMat` (`MeshBasicMaterial`, `fog: false`, `transparent: true`, opacity = the DIM constant below) + **4** Meshes in a fresh `ghostGroup` (`THREE.Group`) added to the scene — children 4 ≠ trio (fingerprint law, R2). Follows the particle-pool precedent (`js/render3d.js:342-355`: built once, spawn toggles `visible`). The ghost geometry SHARES `ropeTube.geometry` (zero new geometry — NFR10/NFR1; the tube census counts Meshes, which R2 re-contracts).
3. **Per-frame writes are visibility + rotation only**: `ghostGroup.rotation.x = theta` (one write, sibling of the ropePivot write at :524 — ghosts sweep on the canonical clock, NFR8); ghost k `rotation.x = −k * (2π / ropes)` as a static phase offset set ONCE per ropes-change EDGE (cache `lastGhostRopes`, the `appliedVista`/`lastStatus` cache-and-apply idiom, :460-471/:483-487), `visible = k < ropes − 1` (≤4 boolean writes, `ropes ≤ 5`, N ≤ 5 law). Idle/over states: ghosts hidden (they belong to a run, the same arms that freeze the rope pivot at :495/:509). Even-spacing is the SIM-faithful read: N ropes score N evenly distributed passes per revolution (FR3 "one pass per rope held", epics.md:28).
4. **The blank read, `iBlank` edge (cache `lastIBlank`, one write per edge, NOTHING else per frame)**: ghosts `ghostMat.opacity = 0.85` (visible-through: the held extras read as passing THROUGH the dimmed skipper) + skipper dim = the two body materials `roseMat`/`limbMat` (`.color.set(0x5a5a66)` seed hex) ; on the OFF edge restore `roseMat`/`limbMat` to their construction hexes (constants, no capture logic) and ghost opacity to `0.35` (the dim-but-present default for extras outside a blank). NEVER touched by this block: `ropeMat.color` (the vista arm's fifth write, `js/render3d.js:466` — a second writer would break the FR16 rope-column ladder census), `particleMat`, the shadow, the rig transforms, `ditherMat` uniforms. The body-material dim is a COLOR write, not opacity — the blob shadow must stay "the only Mesh whose material opacity render() animates" *on the pose channels the `runningPose` probe fingerprints* (`tests/render3d.test.js:251-253`); the shadow carries an opacity and its own `rotation.x = −π/2` identity, ghosts sit inside a Group (no `.material` on the Group) so the probe's scene-root finder (:257-259) stays shadow-only by two independent facts — pin that in a leg anyway (Task 1 leg 4).
5. **Byte-identical when never tripped**: `iBlank === false` forever (every single-rope run, every crafted test view without `iFrames`) → zero writes, zero allocation, and `ropes ≡ 1` → zero ghosts visible, so all frozen render3d/areavistas/juice pose legs see a byte-identical world. That is also the reduced-motion story's inheritance guarantee (5.4): the read is a STATIC state pair — no oscillation, no timer, no `view.now` term — 5.4 inherits it as-is and only adds WR-02 next door.
6. **v1-parity immunity**: the parity/polish/feelcap boots stub or wrap `render3d` at the module boundary; the renderer delta cannot reach their timelines, and the shell delta is TWO data rows. `tests/boundary.test.js` (import graph) and the shell-specifier leg (`tests/summitapproach.test.js:823-826`: `['./game.js','./player.js','./render3d.js','./rope.js']`) stay green BY CONSTRUCTION — do not add imports and do not edit those legs.

### Scope boundary vs neighboring stories (explicit, to prevent collision)

Ghost geometry gets NO jiggle/spring (the `spec-chest-jiggle` spec is chest-only); the vista columns and `tierSlabs` are untouched; reduced-motion dampening POLICY for the new reads is 5.4's lane (this story only guarantees the read is static/state-derived so 5.4 inherits free); `chargeUsed`/`win` AUDIO changes are NOT here (audio lane delta = zero; 5.5 sweeps the lifecycle); WR-02 is 5.4's debt. The `markerBlocked` HUD arm (`js/shell.js:576`) and its CSS are v1-shipped — 5.3's read is the 3D counterpart, no HUD delta.

## Context — shipped state (verified against the tree at 8c4f02c)

**Renderer (`js/render3d.js`, 630 lines, TWO imports: `three`, `./interpolate.js`):** rope curve :313-322 (`ropeCurve`, 9 points); `ropePivot` Group :323-325 (`position.y = HANDLE_HEIGHT`), children exactly `[ropeTube :328-332, handleL :335-337, handleR :338-340]`; `ropeMat` :327 (vista's fifth write, :466); particle pool :342-355 (PARTICLE_POOL 16, built once, one `particleMat`); `render(view)` :434; `reduced` flag :440-444; vista cache-and-apply :454-471 (the idiom to mirror); status edges :483-487; pose arms idle :490-501 / over :502-515 / running :516-531 (`ropePivot.rotation.x = theta` :524 — the sibling write ghosts copy); juice consumption :579-590 (shake clamp + pool spawn from `view.juice`); shake envelope :619-620 (closed-form in `view.now` deltas — the only cosmetic clock, never for state reads); body materials `roseMat` :171 / `limbMat` :172 / `propMat` :173 via `worldMaterial()` :159-160 (Lambert, flatShading — `color.set(hex)` is the vista-floor write precedent :465).

**Shell (`js/shell.js`, 723 lines):** JUICE_TIERS :15-21 (five rows — skip 8/0.5/4, nearMiss 40/1.5/10, ascend 60/1.75/12, ropeLost 65/1.9/14, trip 80/2/16; the two new rows join as seven); drain + table-driven juice write :665-709 (`stopUntil` gate :672; tier read :689-693 — `win`'s `hitstop: 0` writes `max(stopUntil, now + 0)`, provably no freeze window); view write :712; markerBlocked :576 (the state-only i-frame predicate precedent). `stopUntil` write sites stay four (:153/:242/:259/:692); the drain-gate phrase census `now < stopUntil` stays **1** (frozen: `tests/ceilingbreak.test.js:535`).

**Sim (`js/game.js` — READ ONLY):** `MIN_ROPES = 1`, `MAX_ROPES = 5` :24-25; `clampRopes` :41-46 (trunc/Infinity/nullish arms — mirror verbatim); `iFrames` arm :146 (`Number.isFinite ? min(MAX_ROPES, max(0, n)) : 0`), tick-down :170-171 (blank = one pass per rope held, clock keeps sweeping, no score/no trip :167-169); charge trip :217-224 (`chargeUsed`, blank = `ropeCount`); strip :226-244 (`ropeLost`, blank = `strippedTo`); win :263-273 (`offer` spliced, `win` pushed).

**Fences this story must leave GREEN untouched:** ceilingbreak §6 VOICES eight-name census (zero edits — audio delta is zero); `tests/render3d.test.js` `rigAndPivot` trio probe :238-248 and `runningPose` :254-273; particle-pool legs (`tests/juice.test.js:350` + pool census); areavistas §3 :304-313 fingerprint-safety pattern; `tests/boundary.test.js` (specifiers + timing surfaces); summitapproach §4.2 shell-specifier leg :815-826.

**New suite harness:** ONE new file `tests/iframesjuice.test.js`. Render-module legs: the REGISTERING three-stub boot (copy the `tests/juice.test.js:273-328` `__juiceReg` pattern into THIS file — do not import from frozen suites; extend its `Group` handling so `children` arrays are real arrays and `TubeGeometry`/`Mesh` register). Crafted-view donors: `tests/render3d.test.js` `dampenView` style + `tests/areavistas.test.js` `vistaView` (never hard-code view shapes not present in the donors). Bootted legs (≤4 boots, NFR4): the `tests/juice.test.js` `bootShell`/`recordTimeline` donors (:30-147 — per-boot-mutable JUICE_TIERS via the unique-data-URL trick) + the game-wrap run-stamp idiom (ceilingbreak/summitapproach donor) to force ONE real multi-rope trip tick (`ropes: 3` stamped) and ONE summit tick; the NFR8 A/B follows `tests/ropelossthud.test.js:28,:549-562` verbatim in shape (new rows parked hitstop↔0 per boot).

## Decisions (baked — `[DECIDED-BY-CREATE]` marks calls made at authoring; do not re-litigate at dev time)

1. **[DECIDED-BY-CREATE] Seeds: `chargeUsed: { hitstop: 50, shake: 1.6, particles: 11 }`, `win: { hitstop: 0, shake: 1.95, particles: 15 }`** — `chargeUsed` slots STRICT between `nearMiss` and `ascend` on all three axes (an absorbed hit is a bigger moment than a close call, smaller than a ceiling break); `win` is a leaf strictly below `trip` on all three axes (death stays the loudest — the :340 law). Both rows inside the frozen bands. `win.hitstop = 0` rationale: a freeze at the tick that ENDS the run would stall the permadeath presentation change for a frame; the scan table shows even hitstop 70 is conflict-free today, so 0 is the conservative design call, and the A/B legs stay one-line trivial on the win path. D-N12 provisional — 6.2 retunes as a data-only diff here and nowhere else; put the attribution comment on both rows in the ascend/ropeLost wording lane (`js/shell.js:18-19`).
2. **[DECIDED-BY-CREATE] Ghosts are tube-geometry Meshes sharing `ropeTube.geometry`, pool EXACTLY 4, inside ONE `ghostGroup` Group at scene root** — visual parity with the rope (an extra rope is a rope), zero new geometry, and the 4-children count keeps every trio-fingerprint law satisfied by arithmetic (`MAX_ROPES − 1` with a named constant + a leg asserting the pool is NOT a trio). Rejected: a 3-mesh pool (fingerprint collision), PlaneGeometry quads (particle-census contamination), parenting to `ropePivot` (breaks the ropePivot children fence + `runningPose` indices), per-frame `new THREE.*` (NFR1).
3. **[DECIDED-BY-CREATE] i-frame read = static state pair, edges-only writes**: skipper dim = COLOR writes on `roseMat`/`limbMat`; ghosts lift 0.35→0.85 opacity on the SAME `ghostMat` (one write). No ghost during a blank is invisible-to-full swap on separate materials; no `view.now`, no timers, no opacity on shadow/rig/rope (fences above). A single-rope blank = dim only (AC1's "e.g." examples are alternatives, not a conjunction — 1 rope = 0 extras, honesty over fakery).
4. **Phase offsets even-spaced `−k·2π/ropes`, written on ropes-change edges** — the sim-faithful visual for N passes per revolution (FR3); re-deriving on `ropes` edges only keeps the per-frame write budget at `1 rotation + ≤4 visibility booleans`.
5. **`win` particles 15 (≤ pool 16)** — the whole pool minus one; a 16+ seed would silently clip in the shipped spawn (`js/render3d.js:585`) and make the row's number a lie. Dev may retune the seeds ONLY inside: chain strictness (R1 pairs), bands, pool cap, and the scan-table invariants.

## Tasks / Subtasks

- [ ] Task 1 — RED: write `tests/iframesjuice.test.js` (AC: 1,2,3). All legs before any product code; run the gate — the new legs go red against the shipped tree (ghosts absent, rows absent).
  - [ ] 1a. Ghost pool census (AC3 mechanism): boot registers tube meshes = 1 rope + 4 ghosts; ghostGroup at scene root, children 4, all `visible === false`, one shared material, NOT a trio; `rigAndPivot`'s exact-two-trios still hold (mirror `tests/render3d.test.js:242-246` locally); then 60 ghost-live crafted frames + 2 bursts: register arrays (`meshes/geometries/materials/cameras`) grow by ZERO, camera/pass counts unchanged (NFR1).
  - [ ] 1b. Clamp-mirror table (AC1 "no gameplay truth"): `ropes ∈ {1,2,3,5,Infinity,NaN,'x',-1,2.9}` → visible ghosts `{0,1,2,4,4,0,0,0,1}` (the `clampRopes` arms `js/game.js:41-46` mirrored — the 2.9→trunc→2 case pins Math.trunc, not round); `iFrames ∈ {0,NaN,-3,2,Infinity}` → dim `{off,off,off,on,on}` (the `js/game.js:146` active-arm mirror; Infinity = finite-check FALSE → off — the arms are NOT the same law, the leg names both).
  - [ ] 1c. Blank-read legs (AC1): on-edge writes exactly {`roseMat.color`, `limbMat.color`, ghost opacity}; OFF edge restores construction hexes exactly; SAME state at `now = 1000` vs `now = 9500` renders byte-equal snapshots of the cosmetic channels (no timers, NFR8) — and identical under `reducedMotion: true` (5.4 inherits the static read verbatim); `ropePivot` children identities stay `[tube,handleL,handleR]` across blanks; the shadow-finder leg: the probe's opacity-and-rotation finder (render3d.test.js:257-259 shape) still matches EXACTLY the blob shadow with ghosts live; source leg: zero `/setTimeout|setInterval|Date\.now|performance\.now/` in `js/render3d.js`.
  - [ ] 1d. Data pins (AC2): seven-name census + `chargeUsed`/`win` VERBATIM seed rows + `win.hitstop === 0` + band loop over all seven (the R1 legs pin the table's SHAPE; these pin the NUMBERS — the mutation kill-surface per scan-table M).
  - [ ] 1e. Channel truth (≤4 `tickRun` calls, rng stubs, donors `tests/steelcord.test.js:208,:215` + the win-path craft): charge tick emits exactly `['chargeUsed']` (no `trip`/`ropeLost`); summit tick pushes `['win']`, `offer` spliced (game.js:269-273); VOICES-source regex leg: audio's voice-name list sorted = the shipped EIGHT — `chargeUsed` absent (audio-silent, fenced), `win` present (5.1's voice, this story adds NO audio material).
  - [ ] 1f. Booted legs (≤4 boots): (i) NFR8 A/B — scripted trip at stamped `ropes: 3` with streak-callout active (AC3's busiest case): full table vs per-boot-parked `trip.hitstop = 0` → identical phase sequence, conserved total steps, freeze window present ONLY with the row (`ropelossthud.test.js:549` shape, `juice.test.js:123-147` harness); (ii) the win tick advances the drain with ZERO frozen frames (win row live, `hitstop 0`): phase delta at the summit tick matches an unparked neighbor; `view.juice` on the win frame equals the seed shake/particles; (iii) one blank render-through boot leg: during the strip's blank, recorded `view.run.iFrames > 0` frames are a contiguous suffix of the strip tick — the RENDERER's inputs prove the read is derivable from state alone (the renderer-side half of AC1 lives in 1b/1c).
- [ ] Task 2 — GREEN shell: `js/shell.js` — the two JUICE rows with attribution comments (Decision #1; Decision #5 caps win at ≤16 particles). R1 legs + 1d/1f go green. Verify the `now < stopUntil` census stays 1 (`ceilingbreak.test.js:535`) and nothing else in shell changed.
- [ ] Task 3 — Neutral: land R3 (both diff-census allow-set appends with attribution comments — restores the two legs the creation commit turned red).
- [ ] Task 4 — GREEN renderer: `js/render3d.js` — ghost pool + `ghostGroup` (Decision #2), the inline clamp mirrors (Context §1), the cache-and-apply edge blocks (Decision #3/#4). R2 + 1a/1b/1c go green. R2's areavistas rewrite lands HERE (identity append at :262, loop body byte-identical).
- [ ] Task 5 — Cross-fence sweep: full gate green; confirm untouched-green by inspection the VOICES census, boundary legs, particle census, `runningPose` legs (if any of these are red, the product diff violated a fence — the scan table guarantees no frozen-leg red is legit here).
- [ ] Task 6 — Close-out: mutation battery on `/tmp` clones, every number in the Debug Log — (a) ghosts visible at `ropes: 1` → 1b red; (b) Infinity arm dropped from the mirror → 1b red; (c) dim gated on a `view.now` parity/oscillation term → 1c byte-equality leg red; (d) ghost added to `ropePivot` → 1a trio probe + R2 red; (e) ghost built PlaneGeometry → juice pool census red (proves the plane fence bites); (f) pool size 3 → R2/render3d probe red (fingerprint law); (g) `win.particles` 25 → band/pin legs + clip leg red; (h) `chargeUsed.shake` 2.5 → band loop red; (i) restore the five v1 rows after mutating one → verbatim pins red. Then **PAID-stamp `deferred-work.md:89`**: "PAID by Story 5.3 (date, sha): held-rope ghost pool (4, tube-class, built once) + state-derived blank read shipped — extra ropes are now visible in 3D (N ropes sweep evenly-spaced on the one clock; during a blank the extras read visible-through the dimmed skipper). `run.ropes` drives the pool from the VIEW; the renderer still computes no gameplay truth." Full `./run_tests.sh` green; flip checkboxes; this story → review.

## Dev Notes

### The one paragraph that prevents the top three disasters

The renderer is FINGERPRINTED, not merely tested: `tests/render3d.test.js:242-246` identifies the rig and ropePivot as the scene's two 3-children Groups (rig = all-children-without-material; pivot = all-children-with-material) and asserts each count is exactly 1; `tests/areavistas.test.js:261-262` counts TubeGeometry meshes and asserts exactly 1. So: the ghost group is a FOUR-children Group added to the scene root (four ≠ three — arithmetic as law), the ghosts are NEVER added to `ropePivot`, NEVER PlaneGeometry, and the areavistas census gets the R2 identity-append (which its own comment demands). Miss any of these and you get a red in a file the loop contract forbids editing, and the story fails review the way 4.4's Blind F1 nearly did.

### What "cosmetic read derived purely from state" means in code

Two cache-and-apply edge blocks in `render()`, mirror of the vista block's shape (`js/render3d.js:460-471`): read `ropes`/`iBlank` through the inline mirrors; if changed since last frame, write the small fixed set; touch NOTHING per frame otherwise. Zero numbers from `view.now` enter these blocks (the shake envelope at :619-620 is the module's only cosmetic clock and stays exactly that). The i-frame dim is STATIC because 5.4 inherits statics; a blink or pulse would make 5.4's reduced-motion pass impossible without a rewrite (and blink needs a timer — forbidden NFR8, the ledger's own 4.5 precedent, `deferred-work.md:70`).

### Project Structure Notes

- Product: `js/render3d.js` (UPDATE — ghost pool after the particle-pool block ~:355, edge blocks inside `render()` after the vista block, mirrors near the top of `render()`); `js/shell.js` (UPDATE — JUICE_TIERS :15-21 only).
- Tests: `tests/iframesjuice.test.js` (NEW); re-contracts: `tests/juice.test.js` (:153), `tests/ceilingbreak.test.js` (:326, :341, :566-588 append), `tests/areavistas.test.js` (:262), `tests/summitapproach.test.js` (:848-866 append).
- Docs: `deferred-work.md` :89 PAID-stamp (ledger-owned file, both censuses already allow it).

### Project Context Rules

No `project-context.md` exists in-tree (verified) — conventions carry in AGENTS-level practice: data-URL module boots, donor-copy harnesses (never import from frozen suites), commit shape `Story 5.3 <verb>: …`, gate as the only oracle.

### References

- `epics.md:765-783` (ACs), `:28` (FR3), `:50` (FR16), `:74` (NFR1), `:81` (NFR8); `gdd.md` juice/i-frame sections (`gdds/gdd-jumprope-web-2026-10-27/gdd.md:135,:174-176`); `deferred-work.md:89` (the ledger line this story pays).
- Pattern donors: `tests/juice.test.js` (harness + A/B), `tests/ropelossthud.test.js:549` (NFR8 A/B shape), `tests/areavistas.test.js:258-281,:304-313` (census + fingerprint-safety), `tests/render3d.test.js:238-273` (probe), `js/render3d.js:342-355,:460-471` (pool + cache-and-apply idioms).

## Dev Agent Record

### Agent Model Used

_(dev round fills)_

### Debug Log References

- Creation-time scan (this story's freeze-conflict table): `/tmp` clone of `8c4f02c` + candidate rows + R1 censuses — variant A **476/476 green**; variant B (`win.hitstop: 70`) **476/476 green**; variant M (win pair removed) **476/476 green**. Method reproducible from the scan section.
- Dev round: paste the mutation-battery red/green lines (Task 6 a–i) and the final gate count/timing HERE at close-out.

### Completion Notes List

- _(dev round fills)_

### File List

- `js/render3d.js` — ghost pool + i-frame edge blocks + inline clamp mirrors
- `js/shell.js` — JUICE_TIERS `chargeUsed` + `win` rows (data only)
- `tests/iframesjuice.test.js` — NEW suite
- `tests/juice.test.js` — R1 (:153 census)
- `tests/ceilingbreak.test.js` — R1 (:326 census, :341 ladder) + R3 append
- `tests/areavistas.test.js` — R2 (:262 tube census identity-append)
- `tests/summitapproach.test.js` — R3 append (+ `js/render3d.js`, + `tests/areavistas.test.js`)
- `_bmad-output/implementation-artifacts/5-3-i-frame-trip-juice.md` — this file
- `_bmad-output/implementation-artifacts/deferred-work.md` — :89 PAID-stamp
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status flips

### Change Log

- 2026-11-09: Story created from `8c4f02c` (gate 476/476 verified). Creation commit turns the two diff-census legs red by design (new artifact path) — R3/Task 3 restores them; all other existing legs green. Status ready-for-dev.

## Open notes (created at story creation; one question, reported not blocking)

1. **Q for review (don't block dev):** R2 appends to the areavistas tube census identity-style — the leg's 4.4-Blind-F1 comment says "a NEW tube mesh must be added to the census here," but 4.4's author may have envisioned enumerating each identity explicitly rather than the rope-identity + count-of-rest form written here. Dev: implement R2 exactly as written; reviewer: if the enumeration shape is preferred, it's a 2-line diff to :262-264 with identical kill-power. Everything else in this file was `[DECIDED-BY-CREATE]` with evidence.
