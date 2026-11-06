---
baseline_commit: ef4880a2e47d8f8273f8b42171db85d35dfeb2f5
---
# Story 2.3: The ceiling marker — telegraph the moon-jump

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want a ceiling marker on the HUD showing the next break height,
so that every big jump is a deliberate swing at a visible target.

## Acceptance Criteria

1. **Marker shows distance-to-ceiling while running.** Given a run in progress in any area (1..`SUMMIT_AREA`), when the HUD renders, then a marker line shows the current area's ceiling relative to the player's current global altitude (`AREAS[area-1].ceiling − (run.altitude + player.y)`, floored at 0) — inside the letterbox path (FR8, NFR7).
2. **Proximity readout is payload-only.** Given a jump whose peak approaches the ceiling, when frames render during the ascent, then the marker's number counts down purely from the one-way view payload (`run`, `player`) each frame — `render3d.js` computes no gameplay truth and the sim record gains no field (FR8).
3. **Summit reads as win target.** Given `run.area === SUMMIT_AREA` (area 5), when the HUD renders, then the marker presents distinctly: `summit <dist> ↑` instead of `ceiling <dist> ↑` (FR8; DESIGN.md marker spec).
4. **Frozen harnesses stay green.** Given the Node harnesses with fixed 4-key hud maps and/or no `createElement`, when they boot and tick, then the marker layer adds nothing (null-guarded / DOM-gated) and existing suites pass byte-identical (frozen-test discipline).

## Tasks / Subtasks

- [x] Task 1: `js/game.js` — re-export AREAS for the shell channel (AC: 1, 3)
  - [x] `export { AREAS } from './areas.js';` — one line, mirroring the `CARDS` re-export at `js/game.js:9` (harness spec-rewriting precedent: shell must NOT gain a direct `./areas.js` import).
- [x] Task 2: `js/shell.js` — marker element + per-frame write (AC: 1, 2, 3, 4)
  - [x] DOM-gated runtime element ONLY when `hudRoot` + `createElement` exist (the cards-layer precedent at `js/shell.js:84-85`) — a `<span class="hud-marker">` created via `document.createElement`, appended to `hudRoot`, styled by a `.hud-marker` rule in `css/style.css` (the `.hud-cards` precedent — styling layer is css/style.css; do NOT touch `index.html`, near-frozen).
  - [x] Local pure display helper `markerLine(run, player)` (the `offerLine` precedent at `js/shell.js:372`): returns `''` unless `run.status === 'running'`; otherwise `'ceiling ' + dist + ' ↑'` or `'summit ' + dist + ' ↑'` when `run.area === SUMMIT_AREA`. `dist = Math.max(0, Math.ceil(target − run.altitude − player.y))`; target from `AREAS[area-1].ceiling` with the `run.area ?? 1` heal (crafted-record hygiene, same as `tickRun`'s).
  - [x] `updateHud()` writes `markerLine` into the marker element each frame (only when the element exists). Prompt channel untouched.
- [x] Task 3: `tests/ceilingmarker.test.js` — NEW (AC: 1, 2, 3, 4)
  - [x] Harness-copy idiom from `tests/uxpolish.test.js` (createElement-capable DOM stub + bootShell); existing test files stay byte-identical (house rule).
  - [x] Legs derive from `AREAS` via `game.js` — NEVER a hardcoded ceiling table: loop areas 1..SUMMIT_AREA with injected run/player records → marker text equals `` `ceiling ${AREAS[a-1].ceiling - alt - y} ↑` `` (rig-altitude kept below each ceiling so `Math.max(0,…)` never masks a wrong target).
  - [x] Clamped-at-zero leg: peak record above the ceiling (mid-tick, pre-ascend) → `0`.
  - [x] Ascent-countdown leg: scripted airborne player ticked toward the ceiling → strictly non-increasing dist across ≥3 frames, then the ascend tick flips the target to the NEXT area's ceiling (derives from AREAS, one area step).
  - [x] Summit leg: `area = SUMMIT_AREA` → `summit …` prefix; area 4 → `ceiling …` prefix (contrast pair).
  - [x] Status legs: idle / choose / over records → marker text is `''`.
  - [x] Frozen-harness leg: boot under the 4-key fixed hud map WITHOUT createElement → no throw, no marker node (proved by this new file booting both variants).


### Review Findings

- [x] [Review][Patch] Marker lands in HUD slot 6, spec says slot 3 — appendChild puts it below hud-owned; DESIGN.md HUD order is altitude → pips → marker → owned. Fix: `hudRoot.insertBefore(el, document.getElementById('hud-owned'))` (insertBefore(el, null) ≡ appendChild in stubs; index.html untouched) [js/shell.js:89] — FIXED: insertBefore with capability probe (frozen stubs lack insertBefore → appendChild fallback); placement leg boots a seeded #hud and asserts pips < marker < owned.
- [x] [Review][Patch] Marker ships default bone color; DESIGN `marker` token #8fd3ff was assigned to this story by readiness item M-1 (Epic-5 deferral cited covers the break moment, not the HUD token) [css/style.css:.hud-marker] — FIXED: `color: #8fd3ff` on `.hud-marker`.
- [x] [Review][Patch] Marker creation skips the `typeof hudRoot.appendChild === 'function'` capability check that the cards idiom two lines above uses — hud-root-without-appendChild stub throws at module eval and kills boot [js/shell.js:87-95] — FIXED: gate mirrors the cards line.
- [x] [Review][Patch] `markerLine` throws on crafted out-of-domain `run.area` (0/2.5/6/NaN — `??` heals only nullish); throw inside updateHud precedes scene.render → 3D view freezes every frame. `?? 1` heal claim in Dev Notes is false as written. Fix: clamp-at-read like clampRopes [js/shell.js:488-493] — FIXED: round+clamp into 1..AREAS.length (NaN→1); new crafted-area leg (payload-side stamp; the SIM-side guard stays deferred to 4.1 per deferred-work).
- [x] [Review][Patch] Clamp leg is vacuous for its sim claim — harness stamps altitude on the OUTPUT after real tickRun judged the crossing on the INPUT (~40); sim never evaluates peak==ceiling. Fix: tick once more with forceScore live (grounded → stable pin) so the crossing check sees ceiling-altitude [tests/ceilingmarker.test.js clamp leg] — FIXED: two pinned ticks; tick 2's INPUT carries the ceiling altitude into the crossing check.
- [x] [Review][Patch] Countdown leg asserts strictly-decreasing dist where the task specifies non-increasing; near-apex <1u frames make d flat → red on any physics retune. Fix: non-increasing every frame + ≥1 strictly-dropped frame [tests/ceilingmarker.test.js AC2 leg] — FIXED, plus per-frame status 'running' guard.
- [x] [Review][Patch] Task 3's ascend-tick target flip is compositional (forceArea stamp + ascent.test.js), not end-to-end — no leg observes a sim ascend flipping the marker. Fix: physical leg — ground at ceiling−50 via score pin, repeat 0.5s-hold hops until area flips in the real output, assert marker reads AREAS[1] target [tests/ceilingmarker.test.js new leg] — FIXED differently: pinned a hair OVER the ceiling (altitude-only crossing, no hop-timing coupling — a scripted-hop variant can trip on grounded passes); area flips in the real sim output.
- [x] [Review][Patch] Idle-blank assertion is unfalsifiable — marker never had content in that env; prove non-empty while running first, then blank on choose [tests/ceilingmarker.test.js status leg] — FIXED.
- [x] [Review][Patch] landFirst comment misstates the first rope pass (~0.87 s is the phase-wrap; the rising edge is (0.45−0.33)×1.3 ≈ 0.156 s and it passes safely because the lead-in hop is airborne over it) [tests/ceilingmarker.test.js:158-160] — FIXED.
- [x] [Review][Patch] Countdown loop has no per-frame status precondition — a mid-loop trip surfaces as a formula-mismatch message; assert status 'running' each frame [tests/ceilingmarker.test.js AC2 leg] — FIXED.
- [x] [Review][Patch] Dangling DESIGN.md references: story References cites `_bmad-output/ux-designs/...`; real path is `_bmad-output/planning-artifacts/ux-designs/...` (epics.md:107 `../ux-designs/` link also resolves one level too high) [story References; epics.md:107] — FIXED both.
- [x] [Review][Defer] Marker pins `ceiling 0 ↑` while i-frames suppress the ascend (rope-stripped, ≥2 ropes: up to ~1.3 s per remaining i-frame of unkept telegraph) — sim-side deferral is intentional (Story 4.5 interlock); marker has no blocked-at-ceiling arm. Deferred to Epic 4/5 polish [js/shell.js:491 vs js/game.js:179-195]

## Dev Notes

### The Design (decided — do not re-litigate)

**Distance = `AREAS[area-1].ceiling − (run.altitude + player.y)`, ceil'd, floored at 0.** `run.altitude + player.y` is the exact peak quantity `tickRun` already uses for the crossing test (`js/game.js:181`) — reusing the same sum means what the player watches is precisely what the sim judges; the marker counts down THROUGH the jump arc (AC2), and the last frame before a break shows the smallest number. No new sim field, no renderer math, no second altitude path (NFR8: the phase clock stays the only clock; this adds no timing at all).

**Summit wording is a string branch, not a new state** — DESIGN.md (`ux-designs/ux-jumprope-web-2026-10-28/DESIGN.md:86`) specifies exactly `ceiling <n> ↑` / `summit <n> ↑`; lowercase PS1 voice. Color stays default (Epic 5 polishes the moon-jump moment — FR8 coverage note, `epics.md:120`).

**Marker lives in the shell's DOM layer, gated like the cards.** `index.html` is near-frozen and its hud span set is fixed (4 keys + `hud-ropes` null-guard precedent) — a runtime `createElement` span appended to `#hud` keeps every frozen Node harness byte-identical (they answer `getElementById` from fixed maps and lack `createElement`, so the whole layer self-disables there).

### Files being modified — current state (read before editing)

- `js/game.js` (~200 ln) — imports `AREAS` from `./areas.js` (`:4`), re-exports only `CARDS` (`:9`); `tickRun` ceiling eval `:181-193`; `SUMMIT_AREA = AREAS.length` `:28`. Story adds ONLY the AREAS re-export line.
- `js/shell.js` (596 ln) — `updateHud` `:476-530` (prompt ladder `:485-504`, pips `:510-526`); cards DOM-gating `:84-85`; `scene.render({run,…})` payload `:585`. Must preserve: prompt ladder byte-identical, pip logic, `releaseEverything`/`enterPause` paths, try/catch render guard.
- `js/areas.js` — frozen AREAS ladder (READ-ONLY here): ceilings 250/600/1000/1500/2100, PLACEHOLDER values, Epic 6 owns tuning.
- `index.html` — NOT touched (the boundary fence greps around it).

### Regression Map — what must stay green

| Pin | Location | Why it survives |
|---|---|---|
| Frozen hud-map harnesses | `tests/shell.test.js`, `tests/polish.test.js`, `tests/ropehud.test.js` | marker layer is `createElement`-gated + null-guarded; absent DOM → absent layer |
| Prompt ladder | `tests/polish.test.js` prompt legs | `markerLine` never writes `hudPrompt` |
| Ascent contracts | `tests/ascent.test.js` | `js/game.js` gains only a re-export; zero behavior change |
| Boundary fence | `tests/boundary.test.js` | no new import edges except shell→game.js specifier (existing); render3d untouched |
| 3D payload contract | `tests/render3d.js` legs | payload shape unchanged (AC2 is payload-ONLY) |

### Architecture Compliance (guardrails)

- Sim purity untouched: `tickRun`/`game.js` behavior byte-identical; display math lives in the shell — the one-way direction (sim→view) is preserved by construction.
- Invalid states are data: `run.area ?? 1` heal covers crafted records; no throws on terminal statuses (marker simply blanks).
- One shared write site: marker writes inside `updateHud` only — no per-path duplication (house rule).
- No `console.*`; sparse comments (the "same sum as the crossing check" note is the only load-bearing comment).

### Previous Story Intelligence (Story 2.2, done 2026-11-05)

- `run.altitude + nextPlayer.y` IS the peak truth (`js/game.js:181`) — the marker's distance formula mirrors it exactly; do not invent a third altitude expression.
- Records from pre-2.2 rigs may lack `area`/`baseAltitude`/`outcome` — the `??` heal at read is established hygiene (`js/game.js:72-74`).
- Summit restart already flows through the shared `'over'` release branch — nothing here touches it; `over` blanks the marker via the status branch.
- Deferred duplicate best-save writer (`deferred-work.md:42`) stays deferred — not this story.

### Git Intelligence (recent work)

- `ef4880a` (HEAD): docs-only disguise-thesis pass (PRD/epics/AGENTS + sprint-change-proposal 2026-11-05) — no code touched since 2.2's commit; the marker is the first code change of the ascent-surface work.
- Cards-layer commits: the runtime-createElement pattern is proven green against all frozen harnesses — copy its gating idiom exactly.

### Latest Tech Information

No libraries, no version-sensitive surface. Node ≥ 18 `node:test`/`assert/strict`. Three.js `0.186.1` importmap pin untouched (render3d has zero changes). No web-research deltas required.

### Project Context Rules

No `project-context.md` exists; binding rules come from `AGENTS.md` + `architecture.md` + `game-architecture.md`:
- Named exports; relative imports with `.js`; POJOs, no classes; predicates read as questions; `UPPER_SNAKE` module constants; 2-space indent; sparse comments; no `console.*` in pure modules.
- Shell owns DOM/`localStorage`/`performance.now()`; pure core never touches them.
- Frozen-test discipline: existing test files byte-identical; new behavior pinned by new files; expectations derive from records/metadata (AREAS), never hardcoded tables.
- `index.html`/`package.json` near-frozen — this story intentionally touches neither.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3 :384-403] — ACs verbatim
- [Source: _bmad-output/planning-artifacts/epics.md#FR8/NFR7 :36, :79] + FR Coverage Map :120 (Epic 5 polishes the moment)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-jumprope-web-2026-10-28/DESIGN.md#HUD :86] — marker line spec, lowercase voice, 20px, marker color token
- [Source: _bmad-output/planning-artifacts/architecture.md] + game-architecture.md:67 (ascent surfaces, one-way payload)
- [Source: js/areas.js, js/game.js:4-28, js/shell.js:84-85, :372-382, :476-530] — substrate as shipped

## Dev Agent Record

### Agent Model Used

lane-qwen38-ultra/qwen (omp agent session, 2026-11-05)

### Debug Log References
- Red phase: `tests/ceilingmarker.test.js` failed at link (AREAS absent from game.js exports), all other suites green (250 pass).
- Strict-number legs initially reddened +30u: diagnosis (instrumented wrapper in a scratch copy — repos untouched) proved `startRun()`/`leadIn()` ship a PRE-LAUNCHED hop (`player = jump(createPlayer(), 0.1)`, vy 400, peak ≈44u). Not a bug — shipped since the v1 lead-in; legs now land the hop first (`landFirst`). The clamp leg additionally forces at-ceiling altitude only AFTER landing, since an airborne peak above the ceiling would legitimately ascend.
- 7/7 marker legs green; full suite 257/257 in <9 s.
- Review round (three adversarial layers): clamp-leg vacuity traced to the wrapper stamping altitude on tickRun's OUTPUT; crafted-area leg reddened in the SIM (`crossesCeiling` reads `AREAS[area-1]` EVERY tick, not just on crossings — game.js:185) → leg stamps payload-only with a clamped stand-in into real tickRun; wrapper `forceArea` truthiness silently skipped 0/NaN stamps → `!== null`.

### Completion Notes List
- `js/game.js`: one-line `export { AREAS } from './areas.js';` re-export (CARDS-channel idiom); zero behavior change.
- `js/shell.js`: `AREAS`/`SUMMIT_AREA` added to the game.js import; `markerEl` runtime span on the cards-gating idiom; `markerLine(run, player)` local display helper — distance formula mirrors `tickRun`'s crossing sum exactly (`altitude + y` vs the area ceiling); `updateHud` writes it per frame. Prompt ladder, pips, pause/hygiene paths untouched.
- `css/style.css`: `.hud-marker { font-size: 20px; }` in-flow inside `#hud` (letterbox-safe, NFR7). `index.html` NOT touched.
- `tests/ceilingmarker.test.js` NEW, 7 legs; derivation-only expectations from AREAS; both harness shapes (DOM / DOM-less) booted.
- Ascent-flip coverage note: the target flip is pinned by the dedicated derivation leg (area field → next ladder row); the physical ascend tick itself stays pinned by the untouched `tests/ascent.test.js` — no duplication.
- Discovery logged for future stories: every run starts with the leadIn hop; shell-side tests asserting grounded player state must land it first.
- Review round: 11 patch findings fixed (HUD slot-3 placement via probed insertBefore, marker color token, capability gate, marker-side area clamp, three leg-strength fixes, comment arithmetic, doc paths); +3 legs (physical ascend, placement, crafted-area) → 10 legs, 260/260. 1 deferred (i-frame blocked-at-ceiling display → Epic 4/5, in deferred-work).

### File List

- js/game.js (modified — AREAS re-export only)
- js/shell.js (modified — import names, markerEl, markerLine, updateHud write)
- css/style.css (modified — .hud-marker rule)
- tests/ceilingmarker.test.js (new — 7 legs, dual-harness)

### Change Log

- 2026-11-05: Story 2.3 implemented — ceiling marker HUD line (distance-to-ceiling, summit-branded), red-green with `tests/ceilingmarker.test.js` (7 legs), leadIn start-hop discovery folded into leg design, 257/250→257/257 green. Status → review.
- 2026-11-05: Adversarial code review (blind/edge/auditor layers) — 12 findings: 11 patched (placement, color, hardening, leg strength, docs), 1 deferred; 260/260 green. Status → done.
