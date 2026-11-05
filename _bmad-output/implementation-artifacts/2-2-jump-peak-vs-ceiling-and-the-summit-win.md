---
baseline_commit: 643bd2c
---

# Story 2.2: Jump peak vs ceiling — and the summit win

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want my tallest jumps to threaten a ceiling,
so that the run has a finish line I can aim at.

## Acceptance Criteria

1. **Peak is computed in `tickRun`, on the one fixed-step sim.** Given the run's current area (starts area 1, base altitude 0), when a tick is processed, then the jump-peak altitude is `run.altitude + player.y` evaluated on the post-step state (`nextPlayer.y`) — no new clock, no separate altitude timeline, no second position field. (FR6; AC wording "area base altitude + jump height" resolves to this — see Dev Notes §The Design.)
2. **Ceiling crossing is data.** Given a peak strictly above the current area's ceiling on the ladder 250 / 600 / 1 000 / 1 500 / 2 100 u (placeholders, Epic 6 owns rebalance):
   - non-summit (areas 1–4): the run ascends — `area` +1, `baseAltitude` = the ceiling just broken, `status` stays `'running'`, an `'ascend'` event fires. Exactly one area increment per tick regardless of rope count (Story 4.1 interlock).
   - summit (area 5's 2 100 u ceiling): the run ends as **data**: `status: 'over'` + `outcome: 'summit'`, `tripped` flag false, `'win'` event fires, any same-tick pending `offer` is cleared to `null`. Never a thrown error, never a new status string. The sim's gameplay transitions stop for that run (the shell already gates `tickRun` on `status === 'running'` — no new gate). (FR6, FR26, FR7; encoding decision: `outcome` field, not a `'won'` status — see Dev Notes §The Design.)
3. **Ascent-ready contract, vista-free.** Given the epic ships pre-Epic 4, the crossing updates only `area` + `baseAltitude` (+ events) — no palette/vista/period behavior. Story 4.x consumes these exact fields without changing this contract. (FR6 groundwork)
4. **Loss stays verbatim.** Given a trip with exactly 1 rope, the run remains `status: 'over'` with `tripped: true` result data and final `run.altitude` as the final score; the death path now also stamps `outcome: 'tripped'` on the record (additive — architecture schema). (FR26)
5. **Precedence & exclusion (testable, decided):** same-tick conflicts resolve `over(trip) > summit win > choose(offer)`; a trip tick never also wins; summit never leaves `choose` alive; win implies `tripped: false` and no `'trip'` event. Peak exactly **equal** to a ceiling does **not** cross (GDD wording "exceeds" → strict `>`). Ceiling evaluation is **suppressed while i-frames remain** (Story 4.5's "ascent never fires during i-frames' blank passes" interlock).
6. **Tests ship in the same change (NFR5).** New file `tests/ascent.test.js` (architecture pre-named), red-green legs first, covering: peak computation at multiple rope counts and hold lengths, each of the five ceiling crossings, win-vs-loss exclusivity, i-frame suppression, single-ascend-per-tick idempotence. Existing test files stay byte-identical **except** the sanctioned re-contract of the `createRun` key-set leg in `tests/altitude.test.js` (see Tasks → Task 4). Full suite `node --test tests/` green < 10 s (NFR4); `tests/boundary.test.js` passes unmodified.

## Tasks / Subtasks

- [x] Task 1: `js/areas.js` — NEW, the frozen area ladder (AC: 2, 3)
  - [x] `export const AREAS = Object.freeze([...])` — five pure data rows exactly as the architecture table (`_bmad-output/game-architecture.md:610-616` + FR15), with `ceiling` = the ceiling that ENDS the area:
    `{ area: 1, name: 'alley', ceiling: 250, periodMul: 1.00, palette: 'alley', fog: 0x1a1a2e }`,
    `{ area: 2, name: 'rooftops', ceiling: 600, periodMul: 0.96, palette: 'rooftops', fog: 0x16213e }`,
    rows 3–5: `blimp 1000 / stratosphere 1500 / moon-approach 2100` (summit win ceiling), `periodMul` 0.92 / 0.88 / 0.85.
  - [x] `periodMul`/`palette`/`fog` are PLACEHOLDER data owned by Epic 4.2/4.3 and 6 — consumers wire them LATER. `js/areas.js` imports nothing and holds pure data only (architecture rule: never functions here — `crossesCeiling` lives in `game.js`). Row 3–5 `fog` values: dark placeholders, comment-marked `4.3 owns`.
  - [x] No `base` field: base altitude of area *n* = previous row's ceiling, area 1 = 0.
- [x] Task 2: `js/game.js` — peak, ladder, ascent, win (AC: 1-5)
  - [x] Import `{ AREAS }` from `'./areas.js'`. Module constant beside `ALT_PER_POINT` (`js/game.js:24`): `const SUMMIT_AREA = AREAS.length;` (export optional — tests derive from `AREAS`).
  - [x] New exported predicate (predicates read as questions): `export function crossesCeiling(peakAltitude, area) { return peakAltitude > AREAS[area - 1].ceiling; }` — strict `>` (AC 5).
  - [x] `createRun()` (`js/game.js:51-53`): add `area: 1, baseAltitude: 0, outcome: null`.
  - [x] `tickRun()` (`js/game.js:55-168`): locals `let area = run.area ?? 1; let baseAltitude = run.baseAltitude ?? 0; let outcome = run.outcome ?? null;` — the `??` heal idiom (hand-built frozen-harness records lack the fields; `tests/uxpolish.test.js:124` wrapper is exactly this consumer).
  - [x] Death branch (`js/game.js:149-157`): also `outcome = 'tripped';` — everything else verbatim.
  - [x] AFTER the crossings loop (`:158`) and BEFORE `nextRun` (`:159`), one evaluation per tick:
    `const peak = altitude + nextPlayer.y;` then one plain `if` (never `while`):
    `if ((status === 'running' || status === 'choose') && iframesLeft === 0 && crossesCeiling(peak, area))` → summit (`area === SUMMIT_AREA`): `status = 'over'; outcome = 'summit'; offer = null; events.push('win');` otherwise: `baseAltitude = AREAS[area - 1].ceiling; area += 1; events.push('ascend');`
    (Exact shape is the dev's call; the DECIDED semantics are: dead ticks never ascend or win; summit beats a same-tick offer and clears it; a same-tick offer otherwise coexists with ascent (`choose` stays, `area` lands — "marker swaps on the same tick"); no ascent while `iframesLeft > 0`; one increment per tick — a plain `if`, never a `while`; no re-clocking, no new player/rope state.)
  - [x] `nextRun` spread (`js/game.js:159`): carry `area, baseAltitude, outcome`. Output shape (`run/rope/player/tripped/events`) UNCHANGED.
  - [x] No `tickRun` entry guard for terminal runs (the shell gates; v1 doctrine). No clamp on `area` (only `+1`/`1..5` reachable by construction; 4.1 pins monotonicity later).
- [x] Task 3: `js/shell.js` — two one-line arms (AC: 2, 4)
  - [x] `frame()` best-save (`js/shell.js:555`): `if (out.tripped || run.outcome === 'summit') { … }` — records best-altitude on the win TICK, symmetric with the trip path (FR24). The restart-site writer (`js/shell.js:337-341`) already fires for `status === 'over'` — a summit run restarts through the EXISTING branch with zero new handlers (FR22); its `Math.max` save is idempotent with the win-tick write (known duplicate-writer debt, deferred-work.md:42, owned by 2.4 — do NOT consolidate here).
  - [x] `updateHud()` over-prompt (`js/shell.js:495`): `else if (run.status === 'over' && run.outcome !== 'summit') {` — a summit run must NOT read `Missed! Score N`. Interim: the `won` run shows an empty prompt; Story 2.4 owns win presentation (`Summit. Altitude N`, EXPERIENCE.md State Patterns). No other HUD change; the ceiling marker is Story 2.3.
  - [x] No payload change (`run` crosses whole at `js/shell.js:585` — `area`/`outcome`/`baseAltitude` flow free); `js/render3d.js` untouched (the trip-settle pose on a win is transitional, 2.4's domain).
- [x] Task 4: Tests (AC: 1-6) — red first, then implement
  - [x] New `tests/ascent.test.js`; ALL expectations derive from `AREAS` records + `ALT_PER_POINT` + card records — never a hardcoded ceiling/altitude table (house rule).
  - [x] Contract legs: `createRun` key set gains `area`/`baseAltitude`/`outcome` with values 1/0/null; `AREAS` shape (5 rows, strictly increasing ceilings ending at the summit row, `area` 1..5, frozen — derive `crossesCeiling` expectations from rows, including "base of area n = previous row's ceiling"); `crossesCeiling(ceiling, area) === false`, `crossesCeiling(ceiling + ε) === true` (strict `>`).
  - [x] Heal leg: record with `area/baseAltitude/outcome` `undefined` behaves as 1/0/null (the uxpolish-wrapper consumer).
  - [x] Sim peak/crossing matrix (hand-built records + phase scripting, `tests/startrun.test.js:20` idiom):
    - each of the four non-summit ceilings: seeded at `AREAS[a-1].ceiling − 30`, airborne `player.y = 40` over the feet window → `area` becomes `a+1`, `baseAltitude` = old ceiling, `status` still `'running'`, `'ascend'` in events;
    - summit row: → `status 'over'`, `outcome 'summit'`, `tripped === false`, `'win'` event, no `'trip'` event;
    - no-cross legs: below-ceiling peak, and peak EXACTLY at the ceiling (strictness pin);
    - rope-count invariance: the same rig at `ropes` 1..5 ascends identically (the check lives outside the rope loop);
    - hold-length physics legs via REAL physics (`jump(createPlayer(), hold)` then step): short hold (peak ≈ 34 u analytic — discrete Euler apex undershoots ~1.5 u, use ≥ 30 u margins or compute the apex by simulation) fails to cross a ceiling 45 u above; full hold (peak ≈ 100 u) crosses the same rig; hang-time composition: a Cloud Shoes (`floatMul`) run crosses a peak-margin rig the bare run does not (arc scales with effective gravity `1800 / floatMul` — free from using `nextPlayer.y`).
  - [x] Precedence/exclusion legs: trip tick with peak over the summit → `'over'` + `outcome: 'tripped'`, never `'summit'`; 10th-skip cleared crossing + non-summit peak → `status 'choose'` AND `area` incremented AND `baseAltitude` updated; 10th-skip + summit peak → `status 'over'`, `outcome 'summit'`, `offer === null`; 5-rope multi-pass tick straddling a ceiling → `area` incremented exactly once.
  - [x] i-frame suppression: peak over the current ceiling with `iFrames: 1` → no area change; next tick (`iFrames` back to 0, same position) → ascend fires. Pin the contract 4.5 inherits.
  - [x] 1000-tick drift gate (reuse `tests/headless-sim.test.js` scriptedRun technique): seeded run ends with `area === 1`, `baseAltitude === 0`, `outcome === null`, `status !== 'over'` — the new check perturbs nothing (also proves the frozen `altitude === ALT_PER_POINT × score` leg at `tests/altitude.test.js:104` is untouched).
  - [x] Shell legs (copy the `bootShell` data-URL pattern from `tests/altitude.test.js:115-203` — a FOURTH harness fork is sanctioned; extraction is a separate chore per deferred-work.md:44): tickRun-wrapper stamps `status:'over', outcome:'summit'` after N ticks → (a) storage holds `String(Math.round(altitude))` on the win tick, BEFORE any restart press; (b) `hud-prompt` does not contain `Missed`; (c) a press restarts a permadeath-clean run (`altitude 0`, `area 1`, `baseAltitude 0`, `outcome null`, `status running`).
  - [x] Sanctioned re-contract (pre-authorized BY THIS STORY per AGENTS.md exception): `tests/altitude.test.js:43-45` — the `createRun` record-key-set leg gains `'area'`, `'baseAltitude'`, `'outcome'` in the sorted list. NO other existing-file changes; `git diff tests/` must show exactly this one changed file plus the new `tests/ascent.test.js`.
  - [x] Mutation-check: bump a ladder ceiling, drop `baseAltitude` on ascend, use `>=`, delete the summit arm, remove the i-frame guard, remove the outcome stamp on death — each must turn a specific leg red.

### Review Findings

- [x] [Review][Patch] Fog-ownership comment marks row 3 only — Task 1 requires rows 3–5 `fog` values comment-marked `4.3 owns`; rows 4–5 carry the dark placeholders unmarked (`js/areas.js:10`) — FIXED in review: comment scoped "rows 3-5"
- [x] [Review][Defer] `crossesCeiling` has no domain guard for a crafted out-of-range/typed `area` (`js/game.js:41`) — deferred; spec-sanctioned by Task 2 ("No clamp on `area`", `??` heal covers missing-only, TypeError on `area: 0/6/NaN/fractional`, string-concat corruption on `area: '3'`; unreachable from production writers, which only produce 1..5) — Story 4.1 pins the area domain/monotonicity. Found by blind+edge+auditor.
- [x] [Review][Defer] Summit win clears the `offer` field but the already-pushed `'offer'` event rides the same tick (`js/game.js:183-187`) — deferred; AC2 decided field-clear semantics only, event-channel polish belongs to win presentation — Story 2.4 (with 5.1 for the cue). Found by blind+edge+auditor.
- [x] [Review][Defer] An i-frame-suppressed summit peak is never banked — re-fires only when the peak is re-presented (`js/game.js:182`) — deferred; level-triggered re-evaluation bounds it in live play (blank drains ≤ 1 revolution; `altitude` alone ≥ ceiling crosses on the first live tick), but the crafted crossing-starved record resolves forever — Story 4.5 must pin the deferral wording. Found by edge.
- [x] [Review][Defer] `bootAscentShell` captures `console.error` but no leg asserts the capture (`tests/ascent.test.js:486`) — deferred; same fourth-fork hygiene as the bootShell harness extraction chore (deferred-work.md:44). Found by blind.

## Dev Notes

### The Design (decided — do not re-litigate)

**Peak = `run.altitude + nextPlayer.y`, evaluated once per tick after the crossings loop.** `run.altitude` is the player's global altitude position (Story 2.1 shipped it as sim truth); `player.y` is the arc height above the local floor. Their sum at the arc apex IS the "jump peak = area base altitude + jump height" of the GDD: everything below the player (area floor + climb within it) is exactly `run.altitude`, and "jump height" is `player.y`. No analytic `v²/2g` anywhere — the position-based check samples the arc within ~0.02 u of the true apex at STEP=1/120, inherits hang-time cards for free, and adds zero state (AC 1's "no separate altitude timeline"). The AREAS ladder compares against this sum.

**The win is `status: 'over'` + `outcome: 'summit'` — NOT a `'won'` status.** The epics wording "`status: 'won'`-style" is indicative data-as-state phrasing (same hedge as "`tripped: true`-style"); the architecture's Decision 1 settles the encoding: "flat data encoding … the win is data, no new status" (`_bmad-output/game-architecture.md:216,226,323`). Consequences the dev must NOT re-engineer: every existing `status === 'over'` site (restart branch, pause gate, visibility, renderer trip-settle) treats a won run correctly with ZERO new paths (FR22); a sixth status would fork all of them. `outcome` values: `null` (live/idle) | `'tripped'` (stamped on the death path, AC 4 — additive, pinned safe: no frozen leg deep-equals the death record; `game.test.js:27`/`tripresolution.test.js:86,109` check `status` only) | `'summit'`. Loss stays exactly `status: 'over'` + returned `tripped: true` (AC 4 verbatim).

**Ascent writes `area` + `baseAltitude` and NOTHING else** (pre-Epic-4 groundwork, AC 3). `baseAltitude` is the broken ceiling (= `AREAS[oldArea-1].ceiling`); it is a record field, not a formula input (Epic 4's vistas/markers consume it). Areas never decrease; `area` tops out at 5 because crossing area 5's ceiling wins instead of incrementing (FR9).

**Tick ordering = the whole contract (AC 5).** The loop resolves passes/trips/offers exactly as shipped; THEN one ceiling evaluation. A tick that ended `'over'` (death) is excluded — the player hit the rope, the ceiling did not get broken by a clean arc. A tick that ended `'choose'` still ascends (data fields coexist with a pending offer — Story 4.1's "marker swaps the same tick"); but a summit peak on that tick WINS and clears `offer` (a run cannot be simultaneously awaiting a pick and terminally won — `resumeRun` from a pick would resurrect the dead run). i-frame ticks are excluded entirely (Story 4.5 pre-pins: "ascent never fires during i-frames' blank passes"; the blank is ≤1 revolution — a summit peak during a blank simply re-presents on the next live arc, no crossing is lost because the player must re-reach the altitude anyway). Strict `>`: touching the ceiling is not breaking it ("exceeds" — GDD Height & ascent).

**`'ascend'` and `'win'` events are fire-and-forget here.** `audio.handleEvent` ignores unknown VOICES (`js/audio.js:186-189` guard) and `JUICE_TIERS[name]` lookups are guarded (`js/shell.js:562-563`) — verified safe. Voices/stingers/juice belong to 4.4/5.1/5.2; 2.2 only puts the events on the D-N02 channel.

**What 2.2 is NOT:** ceiling marker HUD (2.3), win/loss screens and `Summit.` copy (2.4), balance harness (2.5), `periodMul` in a `ropeRate` chain (4.2 — `updateRope(dt * effects.ropeMul)` stays as-is), palettes/fog/vistas (4.3), break-moment juice (4.4), double-jump/high-jump peak interactions (Epic 3 — this contract absorbs them unchanged), `outcome`-aware renderer poses, storage-key changes (`'jumprope-best'` stays; do not "fix" it per the architecture's `jumprope-best-altitude` — Story 2.1 shipped adoption).

### Files being modified — current state (read before editing)

- `js/game.js` (198 ln) — `createRun` `:51-53` returns `{ status, score, altitude, skips, effects, offer, owned, buffer, streak, ropes, iFrames }`. `tickRun` `:55-168`: rope/player step `:56-57` (gravity `1800 / floatMul` — the arc peak scales with hang-time automatically), locals incl. `altitude ?? 0` heal `:59`, `iframesLeft` clamp `:73`, per-rope crossing loop `:82-158` (i-frame blank `:87-90`, cleared pass `:91-118` with `break` on offer, mercy `:119-128`, strip `:129-148` with `break`, death `:149-157` sets `status='over'`, `tripped=true` + `break`), `nextRun` spread `:159-160`, result `{ run, rope, player, tripped, events }` `:161-167`. Must preserve: 5-arg call surface (`tests/startrun.test.js:30-36`), rng-as-5th-arg, all scoring/trip/offer/streak behavior, the `??`-heal idiom for hand-built records.
- `js/shell.js` (596 ln) — `frame()` drain gates `tickRun` behind `run.status === 'running'` `:547` (a terminal run already stops ticking for free); trip best-save arm `:555-558`; over-restart route `:337-342` (release-driven, saves best, `startRun()` fresh record — this IS the won-run restart path, no new branch); `updateHud` over-prompt `:495-496`; payload `scene.render({ run, … })` `:585`. Must preserve: shared `releaseEverything`/`resumeFromPause` paths, pause/visibility gating (`enterPause` only from `'running'` `:202`), letterbox path.
- `js/player.js` (39 ln) — READ ONLY: `jumpVelocity = 350 + min(hold,0.5)×500` `:5-7`; `updatePlayer` Euler step `:13-35` — the discrete apex undershoots the analytic `v²/2g` by ≈ `v₀·dt/2` (~1.5 u); rigs must use margins or simulated apexes, never a hand-picked "peak" constant.
- `js/areas.js` — does not exist yet (grep-verified); 2.2 owns the filename + the frozen table shape.
- `tests/altitude.test.js` (326 ln) — the key-set leg `:41-45` (the ONE sanctioned edit), the 1000-tick invariant leg `~:104`, and the `bootShell` data-URL harness `:115-203` to copy for shell legs.

### Regression Map — what must stay green

| Pin | Location | Why it survives |
|---|---|---|
| `tickRun` output keys `['events','player','rope','run','tripped']` | feel:91, multirope:57, tripresolution:22 | result shape untouched; new data rides inside `run` |
| run-record divergence leg | `multirope.test.js:207` (`deepEqual(outA.run, { ...outB.run, ropes: 1 })`) | new keys are symmetric across both runs |
| 1000-tick altitude invariant (exact float equality) | `altitude.test.js:104` | ceiling check is read-only until it fires; 1000 ticks ≈ 13 u altitude ≪ 250 |
| death = `status 'over'` equality legs | `game.test.js:27`, `tripresolution.test.js:86,109` | death path unchanged; `outcome` is an added key, no full-record deepEqual on death records anywhere |
| v1 score trajectory / HUD byte-identity | `v1parity:146,168,202,262,277,751,847`; `polish.test.js:545-577` | no numerics touched; `outcome` null on every v1-parity run; prompt branch unchanged for `outcome !== 'summit'` |
| 4-arg / 5-arg `tickRun` surface | `startrun.test.js:30-36` | signature untouched |
| storage round-trip & degradation | `game.test.js:49`, uxpolish legs | persistence untouched |
| HUD DOM contract | `ropehud.test.js` (index.html/css greps) | zero DOM/CSS change |
| import-graph fence | `boundary.test.js` UNMODIFIED | `areas.js` is pure data, zero imports; sim gains no IO |
| **CONFLICTS — sanctioned re-contract** | `altitude.test.js:43-45` key set | factory contract legitimately gains `area`/`baseAltitude`/`outcome` — PRE-AUTHORIZED by this story (AGENTS.md interim-fence exception, Story 1.2 precedent; deferred-work.md:14/:36). Purpose kept: key set stays explicit. |

`git diff tests/` at completion must show exactly one changed existing file: `tests/altitude.test.js` (the key-set leg).

### Architecture Compliance (guardrails)

- Pure core: `game.js`/`areas.js` gain no IO/mutation/console; spread-only state; new fields ride the `nextRun` spread. Boundary fence must pass UNMODIFIED.
- Invalid states are data: win/loss/ascent are record fields, no throws, no entry guards on terminal records (`tickRun` on a won run behaves like on an over run — the shell gates).
- NFR8: no new clock anywhere; the ceiling test reads positions on the existing fixed step. `updateRope`/`atFeetOffset` untouched.
- NFR7/letterbox: no layout change at all. FR22: zero new input/pause/restart handlers — the win reuses the `'over'` branch.
- Frozen-test discipline + red-green legs + same-change contract tests (AGENTS.md); AREAS is a data-table contract → its shape leg ships in the same change (architecture "data tables" row).
- `index.html`/`package.json` diffs EMPTY; `js/render3d.js`, `js/audio.js`, `css/style.css` untouched. Three.js pin irrelevant (no render change).

### Project Structure Notes

- Files touched: `js/game.js`, `js/areas.js` (NEW), `js/shell.js` (two one-line arms), `tests/ascent.test.js` (NEW), `tests/altitude.test.js` (sanctioned key-set leg only).
- Variance from epics AC wording: "`status: 'won'`-style" → implemented as `outcome: 'summit'` on `'over'` (architecture Decision 1 wins over the indicative phrasing; the "terminal value alongside 'over'" intent is preserved exactly — a won run is terminal, data-shaped, and error-free).
- Variance from architecture doc: its `tickRun(run, input, dt, clock, rng) → [run, events]` sketch, `ropes: [{mul, charged}]` rows, `iFramesEndAt`, and `'strip'` event did NOT ship in Epic 1 — extend the SHIPPED encodings (`tickRun(run, rope, player, dt, rng, press) → { run, rope, player, tripped, events }`, `ropes` count, `iFrames` count, `'ropeLost'`). The `'ascend'`/`'win'` event names and the `AREAS`/`outcome`/`crossesCeiling`/`tests/ascent.test.js` names DO land as the doc specifies.
- `baseAltitude` duplicates `AREAS[area-1].ceiling`-adjacent data by intent (Story 4.1's "area index and base altitude update as data"); keep both the field and the table honest via the "base = previous row's ceiling" derivation leg.

### Previous Story Intelligence (Story 2.1, done 2026-11-05)

- `run.altitude` is THE position truth; `altitude === ALT_PER_POINT × score` by construction — the ceiling check must stay read-only wrt altitude (never fold altitude into base on ascent — that would double-count and break the pinned invariant).
- New `getElementById`: none needed (don't add — frozen harnesses answer from fixed 4-key hud maps).
- `updateHud()` now runs INSIDE `frame()`'s try (2.1 Task 5, closes deferred-work.md:19) — the outcome guard line is throw-free anyway.
- Re-contracting a frozen file needs written pre-authorization in the story — granted above (Task 4). State the `git diff tests/` result in the completion notes (1.5/2.1 pattern).
- 2.1's deferred tails are NOT yours: best-line `tabular-nums` (deferred-work.md:41), writer consolidation (deferred-work.md:42), invariant-leg tolerance (:43), harness extraction (:44).

### Git Intelligence (recent work)

- `643bd2c` (HEAD, story 2.1): the altitude field, HUD, storage adoption, updateHud-in-try — the exact substrate this story extends.
- `6a132a4`: AGENTS.md gained the re-contract exception + commit-on-done convention (commit code, tests, story/tracking artifacts, push when the story reaches done).
- `5f114e9`/`967bf62`: the v1parity proof style — derive expectations from exports; multi-rope callout coalescing (do not re-touch events for it).

### Latest Tech Information

No libraries, no version-sensitive surface. Node ≥ 18 `node:test`/`assert/strict`; `Object.freeze` baseline; no web-research deltas required. Three.js `0.186.1` importmap pin untouched.

### Project Context Rules

No `project-context.md` exists; binding rules come from `AGENTS.md` + `architecture.md` + `game-architecture.md`:
- Named exports; relative imports with `.js`; POJOs, no classes; `update*` returns NEW state; predicates read as questions; `UPPER_SNAKE` module constants; 2-space indent; sparse comments (non-obvious fallbacks/placeholders only); no `console.*` in pure modules.
- One shared handler per cross-cutting concern; rng injected as parameter; storage objects injected; DOM/`performance.now()`/storage live only in the shell.
- Frozen-test discipline (incl. the AGENTS.md interim-fence exception); red-green legs; new factory/data-table contracts get Node contract tests in the same change.
- `node --test tests/` before committing; full suite < 10 s; commit the full change set when the story reaches done.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2 :337-361] — ACs verbatim; Epic 2 context :305-335; FR6/FR7/FR9/FR26 :31-63
- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1 :549-569, Story 4.5 :635-653] — the one-per-tick + i-frame + monotonicity interlocks 2.2 must pre-honor
- [Source: _bmad-output/game-architecture.md#Data-Model :214-231, Data Patterns :605-617, Event System :369, Naming :467-471, Issues Resolved :657] — `outcome` encoding (Decision 1), AREAS rows/ceiling semantics, event names, `crossesCeiling`, `tests/ascent.test.js`
- [Source: _bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd.md#Height & ascent :175-186, #Win/Loss, #Level Design] — ladder placeholders, "exceeds" wording, base ladder 0/250/600/1000/1500, summit ≈ 120-180 skips
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-jumprope-web-2026-10-28/EXPERIENCE.md#State Patterns] — ascent swaps on the same tick; win/loss copy owned by 2.4 (interim: empty prompt)
- [Source: _bmad-output/implementation-artifacts/2-1-score-is-altitude-one-number-everywhere.md#The Design] — altitude as sim truth, invariant pin, adoption-not-migration
- Code state: `js/game.js:24,51-53,55-168`; `js/shell.js:202,337-342,495-496,547-561,585`; `js/audio.js:186-189`; `js/player.js:5-13`; `tests/altitude.test.js:41-45,104,115-203`; `tests/startrun.test.js:20-36`

## Dev Agent Record

### Agent Model Used

lane-qwen38-ultra/qwen (omp agent session, 2026-11-05)

### Debug Log References
- Red phase: `tests/ascent.test.js` failed to link pre-implementation (`js/areas.js` absent — the boundary entry-point walk flagged the same ENOENT); all other suites green (224 pass).
- One fix between red and green: the shell harness's summit stamp was sticky and re-fired on the restarted run's ticks — made one-shot (`s.done`) in the wrapper.
- Mutation matrix (throwaway copies of `js/`, TAP parse): ceiling-bump → ONLY the ladder contract leg (proving every rig derives from AREAS); drop-baseAltitude → 12 ascend/base legs; `>=` → both strictness legs; summit-arm removed → both summit legs; i-frame guard removed → the suppression leg; death-outcome removed → the trip-precedence leg. Repos untouched by the runs.
- Browser smoke: unavailable on this host (no Chromium arm64 binary; firefox only). Compensated by the sanctioned fourth bootShell fork, which boots the REAL `js/shell.js` for the win/prompt/restart legs, plus a static-serve check that every page import — including new `js/areas.js` — resolves 200 with page entry `js/shell.js`.

### Completion Notes List
- `js/areas.js` NEW: frozen `AREAS` ladder (array AND rows frozen), five rows, no `base` field; PLACEHOLDER ownership comments (`4.2/4.3/6`); zero imports.
- `js/game.js`: `SUMMIT_AREA = AREAS.length`; `crossesCeiling(peak, area)` strict `>`; `createRun` gains `area: 1, baseAltitude: 0, outcome: null`; `tickRun` `??`-heals them, stamps `outcome: 'tripped'` on the death path, and runs ONE plain-`if` ceiling evaluation after the crossings loop on `peak = altitude + nextPlayer.y` (post-step, no new clock): dead ticks excluded, i-frame ticks suppressed, non-summit → `baseAltitude` = broken ceiling + `area` +1 + `'ascend'`; summit → `status 'over'` + `outcome 'summit'` + `offer` cleared + `'win'`. `nextRun` spread carries the three fields; output shape unchanged.
- `js/shell.js`: two one-line arms — best-save `out.tripped || run.outcome === 'summit'` (win-tick save, FR24) and over-prompt `&& run.outcome !== 'summit'` (interim empty win prompt; 2.4 owns copy). Zero new handlers: summit restarts through the existing `'over'` release branch; the restart-site `Math.max` re-save is idempotent (duplicate-writer debt left at deferred-work.md:42 for 2.4).
- `tests/ascent.test.js` NEW, 24 legs: ladder/factory/strictness contracts, four rung ascents + summit, no-cross + exactly-at-ceiling, rope-count invariance 1..5 (single-increment pins), heal leg, real-physics hold-length and Cloud Shoes hang-time-composition legs (apexes computed by simulation, margin derived between apexes), trip>win>choose precedence and exclusion, i-frame suppression with same-position re-present, 1000-tick drift gate, and the shell fork (storage on the win tick before any press, no Missed prompt, permadeath-clean restart + idempotent re-save).
- Expectation discipline: every rig derives from `AREAS` + `ALT_PER_POINT` + the `float` card record; the ONLY literal table is the AREAS contract leg itself (the ALT_PER_POINT===2 precedent — a data table's own contract is pinned; Epic 6 re-contracts it). The mutation matrix's ceiling-bump reddening exactly that leg proves the derivation.
- Sanctioned re-contract: `tests/altitude.test.js:43-45` key-set gains `'area'`, `'baseAltitude'`, `'outcome'` (one line). `git diff tests/` = exactly this one changed file plus the new `tests/ascent.test.js` — verified.
- Full suite `node --test tests/`: 250/250 green in 8.4 s (< 10 s, NFR4); `tests/boundary.test.js` passed UNMODIFIED; `index.html`/`package.json`/`js/render3d.js`/`js/audio.js`/`css/style.css` diffs EMPTY; 2.1's deferred tails untouched.

### File List

- js/areas.js (new — frozen AREAS ladder, pure data)
- js/game.js (modified — SUMMIT_AREA, crossesCeiling, createRun fields, tickRun ascent/win/death-outcome, nextRun spread)
- js/shell.js (modified — win-tick best-save arm, outcome-gated over-prompt)
- tests/ascent.test.js (new — 24 legs incl. the sanctioned fourth bootShell fork)
- tests/altitude.test.js (sanctioned re-contract only: createRun key-set leg, one line)
- _bmad-output/implementation-artifacts/sprint-status.yaml (status tracking)

### Change Log

- 2026-11-05: Story 2.2 implemented — AREAS ladder data, jump-peak-vs-ceiling ascent and the summit win as `'over'` + `outcome` data (no new status, no new clock, zero new shell handlers), red-green with `tests/ascent.test.js` (24 legs), sanctioned altitude key-set re-contract, 6/6 mutation checks reddening specific legs, 250/250 green < 10 s. Status → review.
- 2026-11-05: Adversarial code review (blind/edge/auditor layers) — 17 raw findings → 1 patch applied (fog-ownership comment scoped to rows 3-5 in js/areas.js), 4 deferred (area domain → 4.1, stray offer event → 2.4, i-frame bank wording → 4.5, harness console.error → extraction chore), 12 dismissed with evidence. All ACs 1-6 verified met; suite 250/250 green < 9 s post-patch. Status → done.
