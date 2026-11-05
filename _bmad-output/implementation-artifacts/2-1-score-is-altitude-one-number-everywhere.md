---
baseline_commit: 1013543
---

# Story 2.1: Score is altitude — one number everywhere

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want my skips to visibly lift me upward as one unified number,
so that scoring and climbing are the same obvious thing — how high can I get?

## Acceptance Criteria

1. **Altitude accrues in the sim.** Given any scored pass (clean, near-miss, or mercy-saved), when the pass is tallied, then `altitude += ALT_PER_POINT × this pass's score` (placeholder `ALT_PER_POINT = 2` u/pt). The pass-score formula itself is UNCHANGED: `(1 + additive) × multiplier`, i.e. `run.score += effects.scoreMul` exactly as today. (AC from epics: FR5; FR21 protected)
2. **One primary number on the HUD.** Given the HUD during a run, when any frame renders, then exactly one primary number shows — **altitude** (`hud-score` slot) — replacing v1's score display; best line reads best-altitude. Inside the existing letterbox/DOM-overlay path, zero layout bypass. (FR5, NFR7)
3. **v1 best is adopted as initial best-altitude.** Given a device with a stored v1 best under the existing `jumprope-best` key, when the game loads, then best-altitude displays coherently (v1 best value adopted as the initial best-altitude — no migration code, no crash, no dual numbers), and thereafter only best-altitude is recorded. (FR24)
4. **Storage degradation unchanged.** Given storage throws (private mode), when a run records, then persistence degrades to session-only exactly as v1, no errors surfaced. (FR24, NFR11)
5. **Placeholder constant documented.** `ALT_PER_POINT = 2` is exported from `js/game.js` with a comment marking it a placeholder owned by Epic 6's balance pass. (FR7)
6. **Tests ship in the same change (NFR5).** New file `tests/altitude.test.js`, red-green legs first. Existing test files stay byte-identical **except** the sanctioned re-contract in `tests/uxpolish.test.js` (see Dev Notes — that file pins the exact HUD display this story replaces). Full suite `node --test tests/` green < 10 s; `tests/boundary.test.js` passes unmodified.

## Tasks / Subtasks

- [x] Task 1: `js/game.js` — altitude in the sim (AC: 1, 5)
  - [x] New exported constant beside `NEAR_MARGIN`/`MAX_ROPES` (~`js/game.js:14-21`): `export const ALT_PER_POINT = 2;` with a `PLACEHOLDER — Epic 6 balance pass owns this value (FR7)` comment.
  - [x] `createRun()` (`js/game.js:49`): add `altitude: 0` to the record.
  - [x] `tickRun()` (`js/game.js:52-162`): read `let altitude = run.altitude ?? 0;` (missing-field heal, same idiom as `run.ropes ?? MIN_ROPES` at `:77`). At the TWO scoring sites — cleared pass `js/game.js:88` and mercy pass `:118` — accumulate `altitude += ALT_PER_POINT * run.effects.scoreMul;` alongside the existing `score +=`. No other writer. i-frame crossings (`:83-86`) and trip branches score nothing, so they accrue nothing.
  - [x] `nextRun` spread (`js/game.js:153`): include `altitude`.
  - [x] Do NOT add a finite-clamp: the sim never produces an invalid altitude; treat like `score`, not like `ropes` (invalid-states-as-data applies to fields a code path can poison — none can here).
- [x] Task 2: `js/shell.js` — the one number (AC: 2, 3, 4)
  - [x] `updateHud()` `:477`: `hudScore.textContent = String(Math.round(run.altitude));` — record stays the exact float; only the display rounds (v1 float-tail precedent).
  - [x] `:478`: `hudBest.textContent = 'best ' + Math.round(Math.max(best, run.altitude));`
  - [x] Both best-save sites switch source score→altitude: `consumeIntents` over-restart `:338` and `frame()` tripped `:556` → `Math.max(best, Math.round(run.altitude))`. `saveBest`/`loadBest` (`js/game.js:178-192`) and key `'jumprope-best'` UNTOUCHED — adoption means the stored number's meaning changes, not its name (AC 3; degradation legs keep passing for free).
  - [x] Run-over prompt `:496`: `'Missed! Score ' + Math.round(run.altitude)` — v1 wording kept (DESIGN.md:45 carries it; Story 2.4 owns run-over copy rework). The number is now altitude.
  - [x] No new handlers, no payload change (`run` crosses whole at `:585`), no `applyWindowSize`/resize/`index.html`/`package.json` changes.
- [x] Task 3: `css/style.css` — tabular digits (AC: 2, one line)
  - [x] `#hud-score { ... }` (`css/style.css:25`): add `font-variant-numeric: tabular-nums;` — DESIGN.md Typography:68 mandates it for the altitude readout ("climbing digits don't jitter"); v1 never needed it because the number wasn't a climb.
- [x] Task 4: Tests (AC: 1-6) — red first, then implement
  - [x] New `tests/altitude.test.js` (legs below).
  - [x] Sanctioned re-contract in `tests/uxpolish.test.js` (see Dev Notes → Regression Map): the `tickRun` wrapper at `:124` must stamp `altitude` consistently with `forceScore` (`altitude: s.forceScore * real.ALT_PER_POINT`), and the leg at `:191-212` expectations become altitude-derived — derive numbers from `ALT_PER_POINT × forceScore`, never a hardcoded table (house rule).
  - [x] Mutation-check your legs (change `ALT_PER_POINT`, drop an accumulation site, point HUD back at `run.score` — each must turn a specific leg red).

- [x] Task 5: `js/shell.js` — bring `updateHud()` inside the frame try/catch (Epic 1 retro decision, 2026-11-05; closes deferred-work.md:19)
  - [x] Move the per-frame `updateHud()` call inside the existing `frame()` try block (the catch path must keep calling `requestAnimationFrame(frame)` so a HUD throw can no longer silently freeze the rAF loop). Call-site move only — no `updateHud` body restructure, no behavior change when nothing throws.

### Review Findings

- [x] [Review][Patch] `deferred-work.md:19` still describes the updateHud-outside-try hazard as open although Task 5 landed — CLOSED annotation added [deferred-work.md:19]
- [x] [Review][Patch] i-frame / trip "accrues nothing" legs seeded `altitude: 0` — both legs now seed `altitude: 7` and assert carry-without-increment [tests/altitude.test.js:66-77]
- [x] [Review][Defer] `hud-best` line width-jitters during record-setting runs (recomputes every scored pass with proportional digits) — story scope rule forbids `tabular-nums` on other slots; DESIGN.md:68 mandates it only for the primary readout [css/style.css:25, js/shell.js:478] — deferred, scope rule
- [x] [Review][Defer] duplicate best-save writers — trip site and over-restart site both `Math.max` + `saveBest` (second write dead, run frozen between) [js/shell.js:338, js/shell.js:556] — deferred, pre-existing v1 structure
- [x] [Review][Defer] 1000-tick invariant leg uses exact float equality, valid only while `ALT_PER_POINT` is a power of two — Epic 6's balance value will fail it with no product bug [tests/altitude.test.js:104] — deferred, Epic 6 owns the constant
- [x] [Review][Defer] shell test harness forked a third time (~90 lines of boot scaffolding repeated) — extraction touches frozen files; needs a dedicated chore [tests/altitude.test.js:115-203] — deferred, frozen-test discipline

## Dev Notes

### The Design (decided — do not re-litigate)

**`run.altitude` is a sim field, accumulated in `tickRun` — not a display-time `score × 2`.** The AC phrasing is accumulation-form; Story 2.2's ceiling check compares a jump peak against a global altitude ladder, Story 2.5's balance harness sweeps `ALT_PER_POINT` — both need altitude as sim truth. `run.score` stays exactly as-is (the pass-score accumulator; FR21 "formula protected") — it is pinned by ~14 frozen assertions (`tests/v1parity.test.js:146,168,202,262,277,751,847`, `tests/game.test.js:10,18,36`, `tests/headless-sim.test.js:61`) and remains the economy's root.

**Invariant `altitude === ALT_PER_POINT × score`** holds by construction (same increments at the same two sites; ×2 is exact in IEEE-754). Pin it in the 1000-tick headless leg. Altitude stays a float in the record; only display/persistence round (v1 precedent, `tests/uxpolish.test.js:199-200`).

**Storage adoption is do-nothing code.** `loadBest`/`saveBest` keep key `'jumprope-best'`; the stored value's meaning becomes best-altitude. AC 3's "adopted or seeded" → adopt: no migration, no second key, no dual numbers. The v1 number reads ~2× conservative as an altitude target — acceptable for a placeholder economy; Epic 6 owns balance.

**Prompt wording is deferred to 2.4.** `Missed! Score N` keeps its words, changes its source. Run-over presentation (win/loss, new-best indication) is Story 2.4 — do not build it here.

**`render3d.js` untouched.** Zero `score`/`best` references in the renderer (verified); the view payload (`js/shell.js:585`) carries `run` whole, so `run.altitude` crosses for free — renderer computes no gameplay truth (boundary fence).

### Files being modified — current state (read before editing)

- `js/game.js` (192 ln) — `tickRun` `:52-162`: per-rope rising-edge loop; scoring branch `:87-113` (`score += run.effects.scoreMul` at `:88`, offer check, `break` on offer), mercy branch `:114-122` (`:118`), strip branch `:123-142` (no score), death `:143-150` (no score); i-frames `continue` `:83-86`; `nextRun` spread `:153`. `createRun` `:49`. `loadBest` `:178` / `saveBest` `:186` — shape-pinned read `Number(...) || 0`, silent try/catch. Must preserve: all scoring/trip/offer/streak behavior, the 5-arg call surface (`tests/startrun.test.js:31`), rng-as-5th-arg.
- `js/shell.js` (596 ln) — four score consumers: `updateHud` `:477-478`, run-over prompt `:496`, best-save at restart `:338`, best-save at trip `:556`. `best` closure var `:108` seeded by `loadBest(localStorage)` — unchanged (that IS the adoption). Must preserve: pause freeze-frame HUD draw, shared `releaseEverything`/`resumeFromPause` paths (zero new input paths), `resetPips`/`rearmCalloutGate` at both `startRun()` sites, the letterbox path (`applyWindowSize` `:41-49`).
- `css/style.css` — `#hud-score` rule `:25`.
- `tests/uxpolish.test.js` (329 ln) — `bootUxShell` harness `:58-156` (data-URL shell rewrite; `gameWrapHref` tickRun wrapper `:116-131`); float-tail leg `:191-212` pins `hud-score` == round(score), `hud-best` == `'best N'`, `jumprope-best` storage text, `/^Missed! Score 5$/`.

### Regression Map — what must stay green

| Pin | Location | Why it survives |
|---|---|---|
| `run.score` trajectory | `v1parity:146,168,202,262,277,751,847`; `game:10,18,36`; `headless-sim:61` | score field semantics untouched |
| run-record divergence leg | `multirope.test.js:207` (`deepEqual(outA.run, {...outB.run, ropes:1})`) | altitude tracks score, so equal-score runs stay deep-equal |
| reduced-motion HUD byte-identity | `polish.test.js:545-577` (incl. `hud-score !== '0'` liveness) | both HUDs read the same new source; scored passes still non-zero |
| `tickRun` output keys `['events','player','rope','run','tripped']` | `feel:91`, `multirope:57`, `tripresolution:22` | output shape untouched |
| storage round-trip | `game.test.js:49`, uxpolish degradation paths | `loadBest`/`saveBest`/key unchanged |
| HUD DOM contract | `ropehud.test.js` (index.html/css greps, document order) | `index.html` untouched; only new CSS line is a font property |
| **CONFLICTS — sanctioned re-contract** | `uxpolish.test.js:124` (wrapper) + `:191-212` (leg) | This story's AC 2/3 deliberately replaces the pinned score-display behavior. Precedent: story 1.2 pre-authorized re-contract (deferred-work.md:14). Keep the leg's PURPOSE (integer-string display, float-tail guard, storage cleanliness) — re-express expectations in altitude terms. `2.2999… × 2 = 4.5999… → displays "5"` keeps the float-tail bite. |

`git diff tests/` at completion must show exactly one changed test file: `tests/uxpolish.test.js`.

### Testing Requirements

New `tests/altitude.test.js`, legs (derive expectations from `ALT_PER_POINT` + card records, not tables):
1. Contract: `createRun().altitude === 0`; `ALT_PER_POINT` exported, finite, > 0; record-key set of `createRun` (guards the factory contract — house rule for factories).
2. Sim legs (hand-built records + `atFeet` phase scripting, the `startrun.test.js:20-37` idiom — no harness needed): clean pass accrues `ALT × scoreMul`; near-miss pass accrues; mercy-saved pass accrues (arm via `press`); i-frame crossing accrues nothing AND scores nothing; trip accrues nothing; missing `altitude` field (`{...createRun(), altitude: undefined}` → `?? 0` heal) accrues from 0; effects-multiplier run (Golden Handle + Lucky Tally from `CARDS`) accrues `ALT × effects.scoreMul` exactly — ties FR21×FR5 composition.
3. Invariant: seeded 1000-tick headless run (reuse `tests/headless-sim.test.js` scripting technique): `altitude === ALT_PER_POINT * score` EVERY tick, `Number.isFinite` throughout.
4. Shell legs (copy `bootShell` pattern from `tests/shell.test.js:30-105`, hud maps gain nothing — same 4 ids work): during a scored run `hud-score` == `String(Math.round(altitude))`; `hud-best` == `'best ' + round(max(best, altitude))`; pause→resume keeps altitude (`resumeRun` spread carry — belt leg mirroring `v1parity:751`); restart-after-over shows `0`.
5. Persistence legs (the uxpolish `storageStub` Map technique, fresh boot per scenario): pre-seed `'jumprope-best': '77'` → idle HUD shows `best 77` immediately (v1 adoption, AC 3); trip ending at altitude 9.2 on empty storage → stored `'9'`, `hud-best 'best 9'`; pre-seeded `77` with a lower trip → storage keeps `'77'` (max rule); storage that THROWS on get/set → run plays, records, restarts, zero errors, best stays session-only (AC 4).
6. Red-green: run legs before Task 1-3, confirm right-reason failures, then implement. `node --test tests/` full suite green < 10 s (NFR4).

### Architecture Compliance (guardrails)

- Pure core: `game.js` gains no IO, no mutation (spread only), no `console.*`; boundary fence `tests/boundary.test.js` must pass UNMODIFIED (NFR, AGENTS.md).
- One-way payload: HUD reads the shell's `run` after the drain — never renderer→sim. NFR8: altitude is driven off scored crossings, not a second clock; no timers, no frame-rate coupling (NFR2).
- Cross-cutting singletons untouched: no new pause/resume/restart paths (FR22).
- `index.html` and `package.json` near-frozen — this story's diff is EMPTY for both (DOM ids reused). Justification for any temptation to change them: none exists.
- Static files, zero deps (NFR6); no `three` involvement.

### Project Structure Notes

- Files touched: `js/game.js`, `js/shell.js`, `css/style.css`, `tests/altitude.test.js` (new), `tests/uxpolish.test.js` (sanctioned re-contract only). Everything else, including `index.html` and `js/render3d.js`, is out of scope.
- Variance from epics-file hint: epics say "replacing v1's separate score/altitude bookkeeping" — there is no separate altitude in the CURRENT code; the replacement is score-display→altitude-display. Do not go hunting for a second bookkeeping system.
- Not this story (do not seed these): jump-peak/ceiling math + `status: 'won'` (2.2), ceiling marker HUD (2.3), win/loss presentation + new-best indication (2.4), tunable sweeps (2.5), the `tabular-nums` on any other slot.

### Previous Story Intelligence (Epic 1 — no epic-2 predecessor)

- From 1.3 (HUD): null-guard any NEW `getElementById` — the frozen Node harnesses answer from fixed 4-key hud maps. 2.1 needs no new id, so all harnesses link untouched; keep it that way. `updateHud()` runs outside the frame try/catch (`deferred-work.md:19`) — don't add throw-capable code to it.
- From 1.5: every leg derives from exports; proof legs get mutation-verified; `git diff tests/` discipline stated explicitly in the completion notes.
- From 1.2 (deferred-work.md:14): re-contracting a frozen file needs explicit pre-authorization IN THE STORY — granted above, Task 4.
- Pips/`ropesEver` pattern: shell-side display memory resets live at BOTH `startRun()` sites in `consumeIntents` — 2.1 adds nothing there (altitude lives in the sim record; `startRun`→`createRun` zeroes it for free — that IS the permadeath carry rule).

### Git Intelligence (recent work)

- `1013543` (latest): the uxpolish harness/wrapper + integer-display leg that this story re-contracts — know its shape before editing.
- `5f114e9` `tests/v1parity.test.js`: the score-trajectory proof to keep green; its shell harness boots the real sim (no forceScore) — altitude flows untouched.
- `28a27c1`/`b7b5fd1` (story 1.3): the HUD-change template — one-line DOM/CSS, contract leg greps `index.html`/`css` via `node:fs`, harness = source-rewritten data-URL shell + real modules via `file:` URLs, NO relative `js/` specifier may appear in a test file (boundary SPECIFIER_RE).

### Latest Tech Information

No new libraries; nothing version-sensitive. Three.js `0.186.1` importmap pin untouched (renderer unmodified). Node ≥ 18 built-in `node:test`/`assert/strict`. `font-variant-numeric: tabular-nums` is baseline-supported on all NFR11 evergreen targets. No web research deltas needed.

### Project Context Rules

No `project-context.md` exists; rules are from `AGENTS.md` + `architecture.md`:
- Named exports; relative imports with `.js`; POJOs, no classes; `update*` returns NEW state; predicates read as questions; `UPPER_SNAKE` module constants; 2-space indent; sparse comments (non-obvious fallbacks only).
- `localStorage`/DOM/`performance.now()` live only in the shell; storage objects injected (`loadBest(storage)`).
- Frozen-test discipline + red-green legs + factory contract test in the same change.
- Run `node --test tests/` before committing; full suite < 10 s.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1] — ACs verbatim; Epic 2 context `:305-406`
- [Source: _bmad-output/planning-artifacts/epics.md#FR5/FR7/FR21/FR24, Additional Requirements :85-100]
- [Source: _bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd.md#Height & ascent :175-186; Score :151-157]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-jumprope-web-2026-10-28/DESIGN.md#Components:84, Typography:68, Layout:72] · EXPERIENCE.md:24,52 — altitude is "the only number that counts", HUD slot 1, never animates
- [Source: _bmad-output/planning-artifacts/architecture.md#Key Abstractions :49-62, Invariants :64-76]
- [Source: _bmad-output/implementation-artifacts/1-3-rope-count-on-the-hud.md#The Design] — HUD-change pattern; [Source: deferred-work.md:14] — re-contract precedent
- Code state: `js/game.js:49-162,178-192`; `js/shell.js:108,338,477-478,496,556`; `tests/uxpolish.test.js:58-131,191-212`

## Dev Agent Record

### Agent Model Used

lane-qwen38-ultra/qwen (omp agent session, 2026-11-05)

### Debug Log References
- Red phase: 13/16 legs in `tests/altitude.test.js` failed for the right reason pre-implementation (undefined/NaN vs the score-derived expectation); the 3 early greens pin unchanged behavior (adoption, freeze-frame HUD).
- Mutation checks (post-green, then restored): `ALT_PER_POINT` 2→3 turns only the AC-5 placeholder pin red; deleting the cleared-pass `altitude +=` turns the 5 sim accrual/invariant legs + the real-play restart leg red; pointing `hud-score` back at `run.score` turns the altitude-HUD leg + the uxpolish re-contract leg red.
- Live-browser smoke (headless Chromium arm64 over CDP, 2026-11-05): boot `0` / `best 0`, computed `font-variant-numeric: tabular-nums`; pre-seeded `'jumprope-best': '42'` adopts as `best 42`; scripted-jump run climbed 2→14 in exact +2 steps; mid-arc 10-skip offer confirmed through the hold-pick path; run-over `Missed! Score 22` with storage `'22'` and `best 22`; restart climbs from a fresh altitude.
- Code review (2026-11-05, gds-code-review — Blind Hunter / Edge Case Hunter / Acceptance Auditor): 0 decisions, 2 patches applied (deferred-work.md:19 CLOSED annotation; i-frame/trip legs seed `altitude: 7` to pin carry-without-increment — suite stays 226/226 green), 4 deferred to `deferred-work.md`, 11 dismissed (spec-decided or verified false, e.g. `loadBest`'s `Number(...) || 0` sanitizes any poisoned stored value).

### Completion Notes List
- `run.altitude` accumulates in `tickRun` at the two scoring sites (`altitude += ALT_PER_POINT * run.effects.scoreMul`), `run.altitude ?? 0` heal; `createRun` carries `altitude: 0`; `nextRun` spread carries it; no finite-clamp (no poisonable path).
- HUD: `hud-score`, `hud-best`, the over-prompt, and both best-save sites now read `run.altitude` (rounded at display/save only). `loadBest`/`saveBest`/key `'jumprope-best'` untouched — v1 best adopts the altitude meaning with zero migration code (AC 3).
- `ALT_PER_POINT = 2` exported from `js/game.js` with the Epic 6 PLACEHOLDER comment (AC 5); pinned by the factory-contract leg.
- `css/style.css`: `font-variant-numeric: tabular-nums` on `#hud-score` (DESIGN.md Typography:68).
- Task 5: per-frame `updateHud()` moved inside the `frame()` try block — a HUD throw can no longer skip `requestAnimationFrame(frame)`; closes deferred-work.md:19.
- New `tests/altitude.test.js`: 16 legs — factory contract incl. AC-5 pin, six sim accrual legs (clean/near-miss/mercy/i-frame/trip/heal/cards), 1000-tick invariant leg, three shell legs, four persistence legs. Expectations derive from `ALT_PER_POINT` + card records, no tables.
- Sanctioned re-contract in `tests/uxpolish.test.js`: wrapper stamps `altitude = forceScore * real.ALT_PER_POINT`; float-tail leg re-expressed in altitude terms (`2.2999… × 2 = 4.5999… → "5"`, trip `4.6 → 9.2 → "9"`) — purpose kept. `git diff tests/` shows exactly this one changed test file.
- Full suite `node --test tests/`: 226/226 green in 8.5 s (< 10 s, NFR4); `tests/boundary.test.js` passed unmodified; `index.html`/`package.json` diffs empty; `js/render3d.js` untouched.

### File List

- js/game.js (modified — ALT_PER_POINT, altitude field/accumulation/spread)
- js/shell.js (modified — HUD/prompt/best-saves read altitude; updateHud inside frame try)
- css/style.css (modified — tabular-nums on #hud-score)
- tests/altitude.test.js (new — 16 legs)
- tests/uxpolish.test.js (sanctioned re-contract only: wrapper stamp + altitude-derived leg)
- _bmad-output/implementation-artifacts/sprint-status.yaml (status tracking)
- _bmad-output/implementation-artifacts/deferred-work.md (Task 5 close-out annotation; review defer items appended)

### Change Log

- 2026-11-05: Story 2.1 implemented — altitude sim field, one-number HUD, v1 best adoption (no migration), tabular digits, and Task 5 (updateHud inside the frame try/catch, closing deferred-work.md:19). Red-green with tests/altitude.test.js; sanctioned uxpolish re-contract; 226/226 green; live-browser smoke pass. Status → review.
- 2026-11-05: Code review complete — 2 patches applied (deferred-work close-out, carry-pinning leg seeds), 4 items deferred, 226/226 green. Status → done.
