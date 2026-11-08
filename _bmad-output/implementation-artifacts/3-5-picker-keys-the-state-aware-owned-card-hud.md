# Story 3.5: Picker keys & the state-aware owned-card HUD

**Status:** review

**Baseline:** `5325d0d` (Story 3.4 landed — code delta included — in the commit that ships this file; 338/338 green @ ~8.5 s).

## Story

As a picker,
I want to choose cards with 1/2/3 keys and see my build's *state* at a glance,
So that the freeze-between-offers stays snappy and my build reads in one sentence.

**Acceptance Criteria:**

1. **Given** an offer on screen **When** the player presses 1, 2, or 3 **Then** the corresponding card is picked as if clicked, and the run resumes through the shared `resumeRun()` path with full input-release hygiene (FR13)
2. **Given** the offer renders **When** the frame draws **Then** cards remain pointer/tap-pickable and number hints match rendered card order (FR13)
3. **Given** a run with state-changing cards owned **When** the owned-card HUD renders **Then** it surfaces live state — rope count, cord charges per rope, double-jump availability — alongside the multiplier stack, fed only by the one-way view payload, inside the letterbox path (FR14, NFR7)
4. **Given** a trip consumes a rope or charge mid-frame-batch **When** the HUD next renders **Then** charge/rope indicators reflect the new state with no stale display (FR14)

## Context

Second story of the "polish the menu" tail: 3.4 shipped the last state-changing card; this story surfaces their state and makes choosing them keyboard-fast. FR13/FR14 close here (epics.md:44-45; FR map :128-129 — both explicitly Epic 3). UX promises the keys already: EXPERIENCE.md:17 (input line lists 1/2/3), :25 ("pointer/tap or 1/2/3 picks"), :62 ("choose — keys 1/2/3 live; everything else inert"), :84 (keyboard map), :87 (form-factor parity rule: 1/2/3 is an accelerator, never the only path). The shipped code never built them — the ASSUMPTION at epics.md:44 is right, and `tests/secondwind.test.js:503-513` (leg 11, landed in the 3.4 review) pins the keyboard map as the frozen 8-code set. This story is the first authorized extension of that list.

### Current code (verified at `5325d0d`, 338/338 green)

- `js/shell.js:269-298` — keydown map: `Mute`/`Minus`/`Equal` (audio short-circuits, :274-276), `KeyP`/`Escape` (pause, :282-286), `Space` (press reducer, :287), and one choose-status branch: `ArrowLeft`/`ArrowRight` cycles `pickIdx` and (re)arms the hold-confirm (:289-297). No `Digit*` code exists anywhere. keyup: Space only (:299).
- `js/shell.js:395-414` (`tickPick`) — the hold-confirm completion block (:400-413): `picked = run.offer[pickIdx]`, name flash + `audio.handleEvent('pick')`, `run = applyCard(run, picked)`, `({rope, player, run} = rearmCalloutGate(resumeRun(run)))`, `reentryAt = performance.now()`, `holdFrom = null`, `pickIdx = 0`, `pickFill = 0`, `pickDone = true`. This is THE pick-confirmation path — cards, Space-hold, and pointer all flow through it.
- `js/shell.js:466-500` (`makeCard`) — one `.hud-card` per offer entry, children `[icon, name, desc, read, fill]`; `pointerdown` selects (`pickIdx = i`, arms `pickPressedAt`), `pointerup` → `release()`. Children texts are read by `tests/uxpolish.test.js:224-238` via `JSON.stringify(children.map(c => c.textContent))` with `includes`-style asserts.
- `js/shell.js:536-543` (`updateHud`) — the owned line is `CARDS.filter(owned>0).map(c => c.icon.repeat(owned[c.id])).join(' ')` — icon repeat only, NO state. `index.html:24` already ships `#hud-owned` (no near-frozen diff needed); the DOM-less harness stubs answer `getElementById('hud-owned')` from fixed maps (`tests/pickflow.test.js:28`, `tests/ropehud.test.js:30`, `tests/shell.test.js:37`, `tests/uxpolish.test.js:65`), and `pickflow.test.js:164/:250` pin empty-when-nothing and icon-includes — both stay green under suffixes.
- `js/game.js:114-115,257` — `airJumps` 0..1 policy written inline three times (the third at `js/shell.js:362`); the ledger entry "airJumps 0..1 policy is open-coded three times" (deferred-work.md:114) names **this story** as the owner to extract `clampAirJumps`/`MAX_AIRJUMPS = 1`, mirroring `clampCharged` (`js/game.js:46-52`, which includes the `Math.trunc` arm). The HUD will read the field a fourth time — do the extraction in the same change.
- Live state fields: `run.ropes` (1..5, pip-visible already), `run.charged` (0..2, clamped live), `run.airJumps` (0..1, refreshed on ground contact, `js/game.js:115`). All ride the one-way view payload untouched — no new payload plumbing needed (NFR7 holds by construction).

### Design decisions (authoritative for this story)

- **D-a — Digit keys CONFIRM instantly, not "arm the hold".** AC1's "picked as if clicked, and the run resumes" + the story's snappy-freeze motivation + EXPERIENCE.md:25 ("1/2/3 picks") settle it: `Digit1`/`Digit2`/`Digit3` at `status === 'choose' && run.offer` route through the SHARED confirmation block (extracted as `confirmPick()` — house rule, one handler per cross-cutting concern) with `pickIdx` set first. "As if clicked" means the same state writes and hygiene, not the same hold-fill timing — the hold-confirm stays the pointer/Space path's semantics (D-05 untouched). Digit press while Space is held must leave no jump: `confirmPick` clears `holdFrom` exactly like the fill-completion path does (:408), and the `pickDone` latch blocks a same-freeze second confirm.
- **D-b — Range and inertness.** Valid codes: `Digit1`–`Digit3` only, and only while `run.status === 'choose' && run.offer`; `k > offer.length`, `Digit0`, `Digit4+`, digits outside choose: fully inert — no `preventDefault`, no state touched (EXPERIENCE.md:62 "everything else inert"). `!e.repeat` guard like every other branch (Pitfall 11). Branch placement: after the arrow-picker branch, same choose guard.
- **D-c — Number hints live in a new `card-hint` child, DOM channel only.** `makeCard` gains a first child `div.card-hint` with `textContent = String(i + 1)` — a new child is additive to the uxpolish `includes`-style leg; equality-pinned children arrays would force a re-contract, so the leg-6 probe (below) runs first. The text-prompt channel (`offerLine`, :419-429) is NOT re-prefixed: `pickflow.test.js` pins its lines structurally and DOM-less environments have no card order to match — record as designed-not-built in the ledger if any probe disagrees. Pointer/tap stays byte-identical (AC2's first clause is a do-no-harm clause — do not touch pointerdown/up).
- **D-d — Owned-line state suffixes follow DESIGN.md:87's glyph set** (`×N` counts, `⟳N` charges, `↑N` double-jump): entry = `icon.repeat(owned)` as today, PLUS for state cards: Spare Rope `∥×<run.ropes>` (rope count, the AC's phrase), Steel Cord `▣⟳<charged>`, Second Wind `⇈↑<airJumps>`. Multiplier cards unchanged. Values read ONLY `run.ropes`/`clampCharged(run.charged)`/`clampAirJumps(run.airJumps)` in `updateHud` — display-side healing, never writes (NFR7). AC4 is then true by construction (`updateHud` runs every rendered frame) and pinned by legs.
- **D-e — `clampAirJumps` extraction pays the ledger nit.** `js/game.js` exports `MAX_AIRJUMPS = 1` + `clampAirJumps(v)` mirroring `clampCharged`'s arms (`Number.isFinite ? min(max(trunc)) : 0`); replace the inline arms at `js/game.js:114,257` and `js/shell.js:362`. The trunc arm is behavior-identical on every reachable value (Story 3.4 Edge layer proved no fractional writer exists and no leg pins fractions). The shell's consumption write becomes `Math.max(0, run.airJumps - 1)` — unchanged, reads via the same clamp at the gate.

### Mechanism

1. `js/game.js` — add `export const MAX_AIRJUMPS = 1;` + `export function clampAirJumps(v)` next to `clampCharged` (:46-52 pattern); use at :114 and :257.
2. `js/shell.js` —
   - extract the tickPick confirm block into `function confirmPick()` (same closure: `run`, `rope`, `player`, pick vars, `reentryAt`, `holdFrom`); `tickPick` calls it when the fill completes;
   - new keydown branch after :297 per D-b → sets `pickIdx`, calls `confirmPick()`;
   - `makeCard` gains the `card-hint` child per D-c (hint text is `String(i + 1)`, role-neutral class `card-hint`);
   - `updateHud` owned-line builder per D-d (`clampCharged`/`clampAirJumps` imported from game.js).
3. No new DOM ids (index.html untouched); no CSS work beyond a `.card-hint` rule if `index.html`'s inline `<style>` needs it — it does NOT: cards are styled by class only where needed and the hint inherits `.hud-card` layout (probe leg 6 asserts text, not style; if a style rule is unavoidable, index.html change needs the story's explicit justification — expected: none, the div renders unstyled like `card-fill`'s wrapper).

### Files

- `js/game.js` — modify (clampAirJumps export + two use sites)
- `js/shell.js` — modify (confirmPick extraction, digit branch, card-hint, owned-line builder, third clamp use site)
- `tests/pickerhud.test.js` — create (~9 legs; harness idiom from pickflow.test.js DOM-less map, DOM legs from uxpolish.test.js data-URL boot)
- `tests/secondwind.test.js` — **authorized re-contract, leg 11 ONLY** (:503-513): the frozen key list gains `'Digit1', 'Digit2', 'Digit3'`. The leg's intent survives — it guards against drift; FR13 authorizes exactly this extension. The diff must show no other existing-file changes.
- story/sprint-status/deferred-work files

### Test plan (`tests/pickerhud.test.js`, mutation-proven)

1. `Digit2` at choose picks `offer[1]`: `owned[picked] === 1`, `offer === null`, `status === 'running'` (harness). Mutant: branch picks `pickIdx` (not k) → red.
2. Out-of-range (`Digit3` vs 2-card offer) and `Digit0`: status still `choose`, offer intact, `owned` untouched. Mutant: clamp-to-last → red.
3. Digits while `status === 'running'`: fully inert — no pick, no jump voice, no `holdFrom` arm (vy unchanged next frames). Mutant: digit charged as a press → red.
4. Space held across a digit confirm: confirm fires, then keyup → NO jump (`vy ≤ 400` idiom from pickflow:242). Mutant: drop `holdFrom = null` from `confirmPick` → red.
5. `e.repeat: true` digit: single confirm (second call no-ops — `pickDone` latch / status left choose). Mutant: no repeat guard + re-entering confirm → red or equivalent-status assertion.
6. DOM harness (uxpolish boot): cards render a `card-hint` child with `1`/`2` in order, tap-pick still applies (`JSON.stringify` includes idiom). Mutant: hint from `pickIdx` not `i` → red on swap offer.
7. Owned line after picking Spare Rope + Steel Cord + Second Wind via the harness: `'∥×2 ▣⟳1 ⇈↑1'` — CARDS order, suffixes live. (Fixture order fixed by catalogue ids, not a hardcoded table beyond the format string.)
8. AC4 no-stale: trip a reinforced rope (charged 1→0) — the rendered frame's owned line reads `⟳0` and the pips drop; land → `↑1`. Same-tick freshness asserted from the same frame's hud map snapshot. Mutants: dropped charged read / cached suffix → red.
9. `clampAirJumps` contract (Node-side): `NaN`/`'x'`/`null`/`±Infinity` → 0 (the 3.4 heal — NO Infinity arm, pinned by the frozen `secondwind.test.js:37`; unlike `clampCharged`), `5 → 1`, `-3 → 0`, `1.7 → 1`, `0.9 → 0` (trunc arm pinned — new behavior, this file's to pin).
10. Second-wind leg 11 re-contract check is implicit — the suite's own green proves the fence was widened exactly to the FR13 set.

### Risks & notes

- **FR17 parity:** nothing in the release/press reducer moves; the digit branch lives in keydown only. If any v1-parity leg fails, the extraction changed control flow — extract verbatim, no refactoring while there (Blind-Hunter precedent from 3.3/3.4: the confirm block's statement ORDER is load-bearing: applyCard BEFORE reentryAt).
- **pickflow:250 icon-includes** passes under suffixes by construction (`includes`); if a leg equality-pins a whole owned-line string, that leg's file is NOT authorized — HALT and re-plan, do not edit.
- **uxpolish children-array leg:** probe FIRST (mechanism step 2 order). If it counts children, the hint must ride inside `card-name`'s textContent prefix instead — pick ONE at probe time, document which in the story's Change Log; the ledger's "keep DOM shape" bias prefers the additive child.
- **Second Wind `↑0` reading:** "no charge available right now" is the honest display (airJumps is per-contact state; grounded refresh restores within one landed tick). No glyph promises an unowned card — filter stays `owned > 0` first.
- **Balance:** none. No sim behavior changes; `confirmPick` is a rename-extraction of shipped code.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- D-a…D-e implemented as authored; one deviation caught by the gate: `clampAirJumps` must NOT carry `clampCharged`'s Infinity arm — the frozen `secondwind.test.js:37` pins `Infinity → 0` (the 3.4 heal). The story's D-e already specified `Number.isFinite ? … : 0`; the first implementation drifted, the leg caught it. Test-plan leg 9 reworded accordingly.
- D-c probe outcome: `uxpolish.test.js:230-236` is `includes`-style → the additive `card-hint` child went in; no `card-name` prefix fallback needed. Text channel (`offerLine`) untouched, as decided.
- Mutation matrix executed at `348/348`: M1 → 4 legs red (1/4 + neighbors), M2 → 1, M3 → 2, M4 → 1, M5 → 1, M6 → 1, M7 → 1; shell restored byte-identical after each (diff-verified). Correction: the story's claim "the frozen pickflow legs kill the holdFrom-drop mutant" is FALSE — in those flows the press arms only the pick hold, never `holdFrom`. The dedicated held-from-running leg added (press consumed while running → held across the freeze → digit pick → release after the 450 ms lock); it alone kills M4.
- Digit keys CONFIRM instantly (D-a) — the hold-confirm remains the pointer/Space path's semantics; all pickups share `confirmPick()` verbatim.
- 348/348 @ ~8.5 s; the only two existing-file reds during development were the pre-authorized leg 11 re-contract and the clamp-heal catch — no other existing-file movement.

### File List

- `js/game.js` — modify (`MAX_AIRJUMPS` + `clampAirJumps` exports; tickRun read + patchedRun use sites)
- `js/shell.js` — modify (`confirmPick()` extraction; digit keydown branch; `card-hint` child; state-aware owned line; clamp imports on :1)
- `tests/pickerhud.test.js` — create (10 legs, 7-mutant matrix)
- `tests/secondwind.test.js` — leg 11 re-contract ONLY (authorized; key list + comment + message)
- `index.html` — UNTOUCHED (`#hud-owned` already ships at :24; `card-hint` inherits layout, no CSS diff needed)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status transitions

## Change Log

- 2026-11-08 — Dev round (baseline `5325d0d`): digit picker via shared `confirmPick`, `card-hint` overlays, state-aware owned line (`×`/`⟳`/`↑`), `clampAirJumps` extraction (ledger nit paid), leg 11 re-contract (authorized), 10 mutation-proven legs; gate 348/348; status review.

