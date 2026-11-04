---
baseline_commit: 140ac14
---

# Story 1.3: Rope count on the HUD

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player managing risk,
I want to see how many ropes I'm holding at a glance,
so that I always know how much health — and how much scoring throughput — I have left.

## Acceptance Criteria

1. **Rope count always visible, one-way only.** Given a run in progress with any rope count, when the shell renders a frame, then the rope count is visible on the HUD (FR4). The display is driven exclusively by the shell's `run` record — the same immutable object that rides the one-way view payload into `scene.render(...)` (`js/shell.js:420`). The renderer computes no gameplay truth and nothing writes back to sim state (`js/render3d.js` is NOT touched by this story).

2. **Same-frame-batch freshness.** Given a trip strips a rope (or any state change alters the count), when the next frame renders, the pip row reflects the new count. Guaranteed by construction: `updateHud()` (`js/shell.js:418`) runs once per rAF frame *after* the sim drain, reading the same closure `run` the payload carries. Pin with a driven-frame test, not by argument.

3. **Letterbox path, no layout bypass (NFR7).** Given any window size or aspect ratio, the rope indicator lands inside the existing `#hud` flex column (DOM overlay over the letterboxed canvas). Concretely: one new `<span id="hud-ropes">` inside `<div id="hud">` in `index.html` + a CSS rule in `css/style.css`. No JS computes HUD coordinates, no new `window`/`innerWidth`/`canvas.style` reads or writes outside the existing `applyWindowSize()` (`js/shell.js:41-49`).

4. **Pause / hidden-tab hygiene unchanged (FR22).** P/Esc pause and visibility handling keep working with the new HUD state through the shared `releaseEverything()`/`resumeFromPause()` paths — this story adds **zero** new input or resume paths; `updateHud()` keeps drawing during the freeze-frame exactly as it does for score/best today.

5. **Tests ship in the same change (NFR5).** New file `tests/ropehud.test.js` with red-green legs (below). All existing `tests/*.test.js` files stay **byte-identical** (no re-contract needed — this story touches no sim behavior); `tests/boundary.test.js` passes unmodified; full suite green < 10 s.

## The Design (decided — do not re-litigate)

**Surface: DOM pips in the HUD flex column.** The HUD is a transparent DOM overlay (`index.html:19-24`, written by `updateHud()` in `js/shell.js:339-367`) — a canvas-drawn HUD is architecturally banned (`tests/shell.test.js:147-159` D-02 forbids Canvas-2D APIs anywhere in `js/`), and drawing N rope meshes in the renderer is Story 5.3's/Epic 5's juice territory (and would collide with `tests/render3d.test.js:241-248`, which fingerprints "exactly one ropePivot Group"). Per UX: pip row in HUD slot 2, order-stable fill (`DESIGN.md` Layout/Components, `EXPERIENCE.md` Component Patterns).

- **Pips, not a number.** Row of `ropesEver` slots (max ever held this run): held ropes = solid glyph `█` (`\u2588`, bone `#f4f0d8`), lost = ghost glyph `▒` (`\u2592`, ropeLost `#4d4a3e`). "Max ever held stays visible so the bar reads loss" (`DESIGN.md:85`, `EXPERIENCE.md:53/124`). Shape-reinforced (different glyphs) — never color-only (`DESIGN.md:64`). Zero radius/borders/animation — pips never animate, even without reduced-motion (`EXPERIENCE.md:91`), so this story needs no reduced-motion branch.
- **`ropesEver` is shell-side display memory** (like `best` at `js/shell.js:91` — a display value, not gameplay truth). Reset at the two `startRun()` call sites in `consumeIntents` (idle-start `js/shell.js:267`, over-restart `js/shell.js:296`) so a new run starts with a single solid pip. Spare Rope (Story 3.2) will grow the row for free.
- **Clamp on display**: `clampRopes(run.ropes ?? MIN_ROPES)` — the deferred-work rule "`run.ropes` clamp is at-read only; Story 1.3's HUD must re-apply `clampRopes` rather than render the raw field" (`deferred-work.md:9`). **Export `clampRopes` from `js/game.js`** (currently private, `js/game.js:23`; `MIN_ROPES`/`MAX_ROPES` are already exported at `:20-21`). Shell imports it from `game.js` — the shell must never import `upgrades.js`/`rope.js`-adjacent new modules directly beyond the existing four (`js/game.js:5-8` comment; harnesses rewrite only game/rope/player/render3d specifiers).
- **Build pips as DOM children, not one textContent string** — a single string can't carry both color tokens. On signature change only (dirty-check a held/ghost signature string), replace the span's children with per-pip `<span class="pip-held">`/`<span class="pip-ghost">`. Use `document.createElement` + `replaceChildren` (no `innerHTML`).

## Tasks / Subtasks

- [x] Task 1: `index.html` + CSS — the pip slot (AC: 3)
  - [x] `<span id="hud-ropes"></span>` inside `<div id="hud">`, after `hud-best`, before `hud-prompt` — closest fit to the UX order *altitude → pips → marker → owned* given today's stack (numbers, prompt, owned). Document order = visual order (flex column).
  - [x] `index.html` is near-frozen (AGENTS.md Housekeeping): the justification is FR4 — a HUD surface is required and DOM-span is the only architecturally allowed path (canvas HUD fails the D-02 fence; renderer changes are out of scope). One added line, nothing else touched. `package.json` untouched.
  - [x] `css/style.css`: `#hud-ropes { font-size: 20px; letter-spacing: 2px; }` plus `.pip-held { color: #f4f0d8; }` and `.pip-ghost { color: #4d4a3e; }` (both hexes verbatim from `DESIGN.md` Colors — rope / ropeLost tokens). No position/size in JS.
- [x] Task 2: `js/game.js` — export the existing clamp (AC: 1)
  - [x] `export function clampRopes(...)` — make the existing private function (`js/game.js:23`) an export. **Zero behavior change** to the function body; it is already the invalid-states-as-data read clamp (`Infinity → MAX`, NaN/nullish → MIN). Do not re-implement a clamp in the shell.
- [x] Task 3: `js/shell.js` — draw the pips (AC: 1, 2, 3, 4)
  - [x] Import `clampRopes` and `MIN_ROPES` from `./game.js` (add to the existing import at `js/shell.js:1`). Safe: all frozen boot harnesses load the **real** `game.js` via file: URL (verified: shell/polish/pickflow/juice/audio/feelcap all use `fileHref('game.js')`), so a new import name links fine everywhere.
  - [x] Grab the span beside the others (`js/shell.js:70-73`): `const hudRopes = document.getElementById('hud-ropes');` — **it will be `undefined` in every frozen harness** (their `hud` maps carry only the 4 original ids, `tests/shell.test.js:33-38/59`). Every read/write of `hudRopes` must be null-guarded (`if (hudRopes) ...`) so frozen suites boot untouched. Belt leg in Task 4 pins this.
  - [x] Closure state: `let ropesEver = MIN_ROPES;` and a pips signature cache (`let pipsShown = '';`). Reset `ropesEver = MIN_ROPES` (and clear `pipsShown`) at both `startRun()` sites in `consumeIntents` (idle `:267`, over-restart `:296`) — NOT in `resumeRun()` paths (a card pick keeps the run's row).
  - [x] In `updateHud()`: `const held = clampRopes(run.ropes ?? MIN_ROPES); ropesEver = Math.max(ropesEver, held);` then build the signature `'h'.repeat(held) + 'g'.repeat(ropesEver - held)`; on change only, rebuild the span's children via `createElement`/`replaceChildren` (`pip-held` → `'\u2588'`, `pip-ghost` → `'\u2592'`, matching the `'\u00d7'` escape style at `js/shell.js:409`). Draw in every status, same as score/best (including paused freeze-frame and over).
  - [x] No other shell changes: no new handlers, no payload change (`run` already crosses whole), no `JUICE_TIERS`/`VOICES` entry for `ropeLost` — Epic 5 owns cue tiers (`EXPERIENCE.md:91`); Story 5.2 owns the thud.
- [x] Task 4: Tests — new file `tests/ropehud.test.js` (AC: 5), red-green legs first
  - [x] Harness: copy the `bootShell` pattern from `tests/shell.test.js:30-105` (source-rewritten data: URL shell, render3d stub, file: URLs for game/rope/player). **Two deltas:** (a) the `hud` map gains `'hud-ropes': { textContent: '', replaceChildren: (…kids) => { span.kids = kids } }`; (b) rewrite `from './game.js'` to a data: URL **wrapper** — `export * from '<game.js file href>'; export const tickRun = (run, ...r) => realTickRun({ ...run, ropes: scripted }, ...r)` (import realTickRun explicitly) — so the count is scriptable while all real behavior stays real. No relative `js/` specifier appears in the test file, keeping the `boundary.test.js` SPECIFIER_RE walk green (same trick as the frozen harnesses).
  - [x] Legs:
    - contract: `index.html` (read via `node:fs`) contains `id="hud-ropes"` between `hud-best` and `hud-prompt` inside `#hud`; `css/style.css` contains both pip colors with the DESIGN.md hexes.
    - render counts: scripted held 1..5 → `held` solid children in order, `ropesEver-1 = 0` ghosts on a fresh run.
    - clamp-as-displayed: scripted `ropes: 9` → 5 solids; `ropes: 0` / `NaN` / field-absent → 1 solid (mirrors `clampRopes` arms — derive expectations from `MIN_ROPES`/`MAX_ROPES`, not a hardcoded table).
    - ghosts + same-frame: fresh run scripted 3 ropes, then strip leg drops to 2 → after that same driven frame, children = 2 solid + 1 ghost; ghosts never shrink while the run lives.
    - restart resets: reach `over`, press to restart → 1 solid, 0 ghosts (permadeath-clean row).
    - null-guard belt: boot with the *frozen-style* 4-span hud map (no `hud-ropes`) → shell boots, frames run, `errors` empty.
    - pause/visibility unchanged: pips live, fire the P pause toggle + hidden-tab visibility legs exactly as `tests/polish.test.js:284-299` does, assert `hud-prompt` still reads `paused — press P to resume` and no errors.
  - [x] Red first: run before implementing, observe right-reason failures (span undefined / no children), then implement.
- [x] Task 5: Suite confirmation (AC: 5)
  - [x] `git diff --exit-code tests/` shows ONLY the new `tests/ropehud.test.js` — zero changes to existing test files (no interim legs to re-contract this time).
  - [x] `node --test tests/` fully green < 10 s; boundary fence green; manual browser check: trip at 2+ ropes (temporarily hand-edit `createRun`'s `ropes: 1` → `ropes: 3`, verify two solids + ghost after a trip, **then revert** — do not commit any sim change).

### Dev Notes First Read (the three things that bite)

1. **`getElementById('hud-ropes')` is `undefined` in every frozen harness.** Their `hud` maps are fixed 4-key literals and you cannot edit them. An unguarded `hudRopes.textContent`/`replaceChildren` throws a TypeError inside the frozen boot legs — instant regression-suite breaker. Null-guard everything shell-side; add the belt leg (Task 4, null-guard).
2. **`clampRopes` is private today** (`js/game.js:23`). Export it — do NOT duplicate the clamp in the shell (single-source rule, and the deferred-work note explicitly assigns the re-clamp to this story). Export is additive: no test pins the export set of `game.js`.
3. **Today's build can only ever show ONE solid pip.** Nothing raises rope count until Spare Rope (3.2), and tripping at 1 rope is death — so a live v2-tree run draws a single `█` forever. That is *correct*, not a bug: the machinery (N slots, clamp, ghosts, ever-max) is what 1.3 ships, and the test legs script counts via the wrapped `tickRun`. Do not "fix" this by touching the sim.

## Dev Notes

### Where everything lives (current state, verified 2026-11-02)

| File | State today | This story |
|------|-------------|------------|
| `index.html` | `#hud` div with 4 spans (score/best/prompt/owned) — near-frozen | UPDATE: one span `hud-ropes` after `hud-best` (justify per Task 1) |
| `css/style.css` | `#hud` flex column, `#hud-owned` 20px, role colors | UPDATE: `#hud-ropes` + `.pip-held`/`.pip-ghost` rules |
| `js/shell.js` | `updateHud()` at :339-367 writes 4 spans per frame after the drain (:418); payload at :420 passes whole `run` | UPDATE: guarded `hudRopes` handle, `ropesEver`/`pipsShown` closure state, pip draw in `updateHud`, `ropesEver` reset at 2 startRun sites |
| `js/game.js` | `clampRopes` private (:23); `ropes: 1` in `createRun`; strip writes `ropes` (:151) | UPDATE: `export` keyword on `clampRopes` only |
| `js/rope.js`, `js/player.js`, `js/upgrades.js`, `js/interpolate.js` | 1.1/1.2 state | UNTOUCHED |
| `js/render3d.js` | draws ONE rope mesh, never reads `run.ropes` | DO NOT TOUCH — multi-rope visuals are Epic 5 (5.3) |
| `js/audio.js` | `VOICES` ignores unknown events | UNTOUCHED — thud is 5.2 |
| `package.json` | frozen | DO NOT TOUCH |

### The architectural decisions this story implements

- **HUD = DOM overlay, and only DOM.** EXPERIENCE.md Foundation: "All HUD rendering is a transparent DOM overlay driven by the shell's one-way view payload." The pip row is written by the shell from the same `run` object the payload carries — AC1's "fed only by the one-way immutable view payload" holds by identity: there is literally one `run` reference (`js/shell.js:420`).
- **Pips are state-driven, not event-driven.** The `ropeLost` event needs no wiring here: the pip row re-derives from `run.ropes` every frame, which IS the event's visible cue (deferred-work:13 says claim the cue in "whichever of 1.3/5.2 lands first" — 1.3 claims the *visual state* cue; 5.2 still owns the audio thud and any JUICE_TIERS entry). Do not add `ropeLost` to `JUICE_TIERS` or `VOICES`.
- **`ropesEver` lives in the shell closure, like `best`.** It's display bookkeeping, not sim truth — no run-record field, no new sim state (invalid-states-are-data stays a sim concept; the HUD just clamps what it renders). Story 3.2's Spare Rope grows the row automatically via `Math.max`.
- **Same frame batch is structural, and must stay structural.** Do not debounce, cache across frames, or draw pips in an event callback — write from `updateHud()` and AC2 is free; any other path would need tests it doesn't deserve.
- **Letterbox honesty for a DOM element = staying in the flex column.** NFR7's "resize path" for the DOM overlay is the existing `#hud { position: absolute; inset: 0 }` + the canvas letterbox; a new span needs no resize code at all. Adding any `resize` listener or viewport read for the HUD is the failure mode NFR7 names.

### Known frozen-test landmines (verified against the tree)

- Frozen shell harnesses (`tests/shell.test.js:59`, and the same id-map shape in polish :96-101, pickflow :24-28, juice :33-37, audio :294-298, feelcap :160-164): `getElementById` answers from a 4-key `hud` map → new id = `undefined`. Null-guard (bite #1).
- All six boot harnesses rewrite `from './game.js'` to `fileHref('game.js')` — the REAL module. A new *export* links everywhere; a new *relative specifier* in shell.js would not (bite #2's cousin).
- `tests/shell.test.js:147-159` (D-02): no `getContext`/`CanvasGradient`/`createLinearGradient` anywhere in `js/` — rules out any canvas HUD idea.
- `tests/boundary.test.js:103-113`: `document`/`performance.now`/etc. may appear ONLY in `js/shell.js` — pip DOM code belongs in shell, never a new module.
- `tests/boundary.test.js:103` walks specifiers from test files: the new test file must use absolute (file:/data:) URLs for js modules like every existing harness — a bare `from '../js/game.js'` in a *test* file is fine only if the module stays pure (game.js does), but the harness trick already requires data: URLs anyway.
- `tests/polish.test.js:506-544` pins payload keys via `'reducedMotion' in view` style checks — payload shape must NOT change (it doesn't; whole `run` already flows).
- `tests/startrun.test.js` freezes the 4-arg `tickRun` call surface — the Task 4 test wrapper must keep `tickRun(run, rope, player, dt, rng, press)` arity.
- `tests/render3d.test.js:241-248` asserts exactly one ropePivot Group — reinforces keeping the renderer untouched.
- No test reads `index.html` or `css/` (verified by grep) — but Task 4's contract legs start pinning `index.html` structure, which is the intended new guard.

### Testing standards

- Node built-in runner only: `node --test tests/` (Node ≥ 18, `node:test` + `node:assert/strict`); deterministic — this story adds no randomness and no sim change, so seeded-rng machinery is untouched.
- Red-green legs written first, observed failing for the right reason (NFR5), Debug Log the RED output in the Dev Agent Record (1.1/1.2 pattern).
- Expectations derive from records/exports (`MIN_ROPES`, `MAX_ROPES`), not hardcoded tables (house rule).
- Frozen-test discipline is STRICT this story: no existing test file changes. If any existing leg goes red, the implementation is wrong (most likely suspect: the un-guarded span write, bite #1).

### Scope boundaries (do not drift)

- **In scope:** pip span + CSS, `clampRopes` export, shell `updateHud` pip draw + ever-max/reset, new test file.
- **Out of scope:** multi-rope 3D rendering and i-frame juice (5.3); rope-loss thud + `ropeLost` cue tiers (5.2); Spare Rope growing counts in gameplay (3.2); owned-card HUD state glyphs (3.5); altitude/prompt copy changes (Epic 2); any `render3d.js`/`audio.js`/`rope.js`/`player.js`/`upgrades.js` change; any payload or sim-shape change.

### Project Structure Notes

- New test mirrors module semantics with a thematic name: `tests/ropehud.test.js` (fits multirope/tripresolution naming).
- Conventions: named exports, POJOs, 2-space indent, sparse comments (the null-guard and the ever-max reset each earn one), no `console.*` in pure modules (`game.js` gains only a keyword), glyph escapes `\u2588`/`\u2592` in JS per the `shell.js:409` precedent.

### Project Context Rules

- No `project-context.md` exists in this repository; `AGENTS.md` is the project-rule source — pure core / imperative shell, near-frozen `index.html` + `package.json` (justification required — provided in Task 1), frozen-test discipline, `node --test tests/` before committing, static-files-only (no deps — this story adds none).

### Web research note

- No external research required: the stack is fully pinned by AGENTS.md/architecture (vanilla ES modules, DOM/CSS baseline APIs — `replaceChildren` is in every WebGL-era evergreen target per NFR11). Three.js untouched. Zero npm dependencies (NFR6).

## Dev Agent Record

### Agent Model Used

Qwen3.8-Flash (ultrafast/qwen)

### Debug Log References

- RED run (pre-implementation, `node --test tests/ropehud.test.js`): 6 failing / 1 passing — contract leg: `id="hud-ropes"` absent from `#hud`; render/clamp/ghosts/restart/pause legs: "the pip row must be built" (no `replaceChildren` ever called); null-guard belt passed vacuously (no pip code yet). Right-reason failures confirmed.
- First GREEN pass: 6/7 — restart leg failed `'over' !== 'running'`: the trip's juice freeze (`stopUntil = now + 80ms`) held the drain gate for one 50 ms frame. Test fixed to pump past the freeze (test-side only, implementation untouched).
- Final: `node --test tests/ropehud.test.js` 7/7 green; full suite `node --test tests/` **169 pass / 0 fail in 1.8 s**.
- Real-sim display check (no file edits, REPL-only): scripted 3-rope run trip → `ropeLost` at tick 10, `run.ropes = 2`, `iFrames = 2` → display reads 2 solid + 1 ghost; `clampRopes`: 9→5, 0→1, NaN→1, Infinity→5.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- Task 1: one span added to `#hud` (FR4 justification per Housekeeping) + three CSS rules with verbatim DESIGN.md tokens; `package.json` untouched.
- Task 2: `clampRopes` gained the `export` keyword only; single-source clamp honored (deferred-work:10 re-clamp rule).
- Task 3: pips re-derived from `run.ropes` inside `updateHud()` every frame (same-frame-batch by construction, no event wiring); `ropesEver`/`pipsShown` closure state reset at both `startRun()` sites only — `resumeRun()` paths untouched so a card pick keeps the row.
- Task 4: `tests/ropehud.test.js` with the scripted-`tickRun` game wrapper as designed; expectations derive from `MIN_ROPES`/`MAX_ROPES` exports; dirty-check pinned (`replaceChildren` call-count asserted on signature-unchanged frames).
- Task 5: no existing test file changed by this story. Depends on Story 1.2's sanctioned `tests/multirope.test.js` re-contract landing first (commit `7353f92`, 2026-11-04); against that baseline `git status tests/` shows this story adds only `tests/ropehud.test.js` and `git diff --exit-code tests/` is otherwise clean.
- Belt leg verified bite #1: booting with the frozen 4-span hud map runs 10 frames with zero console errors.
- Known v2-tree behavior (Dev Notes bite #3): live gameplay draws one solid pip until Spare Rope (3.2) grows counts — machinery ships now, counts follow.

### File List

- `index.html` (UPDATE: `<span id="hud-ropes">` inside `#hud`)
- `css/style.css` (UPDATE: `#hud-ropes`, `.pip-held`, `.pip-ghost` rules)
- `js/game.js` (UPDATE: `export` keyword on `clampRopes`)
- `js/shell.js` (UPDATE: guarded `hudRopes` handle, `ropesEver`/`pipsShown` closure state + resets, pip draw in `updateHud()`)
- `tests/ropehud.test.js` (NEW: 7 legs — contract, render counts, clamp, ghosts/same-frame, restart reset, null-guard belt, pause/visibility)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE: story status)

### Change Log

- 2026-11-02: Story implemented — DOM pip row in the HUD (`#hud-ropes`, solid `█` / ghost `▒`), `clampRopes` exported and re-applied at display read, `ropesEver` ever-max display memory with resets at both `startRun()` sites. Red-green per Task 4; full suite 169/169 green. Status → review.
- 2026-11-04: Adversarial code review (Blind/Edge/Auditor). Story 1.2 residue committed first as `7353f92` per review decision D1; this story follows as its own commit.

### Review Findings

<!-- Adversarial code review 2026-11-04 — Blind Hunter / Edge Case Hunter / Acceptance Auditor (diff vs baseline 140ac14). -->

- [x] [Review][Decision] Story 1.2's uncommitted work entangles 1.3's clean-tree evidence — RESOLVED 2026-11-04: option (a). Story 1.2's residue (js/game.js iFrames/strip hunks, tests/multirope.test.js re-contract, tests/tripresolution.test.js, its story file, its deferred-work section, sprint-status) landed in commit `7353f92`; story 1.3 follows as its own commit. Completion-note claim corrected below.
- [ ] [Review][Patch] i-frames coercion comment misdescribes the code (`js/game.js:65-68`) — comment says "Capped like clampRopes" but the code differs: `Infinity → 0` (clampRopes maps it to MAX), no `Math.trunc` (clampRopes truncs), and the cap `Math.min(MAX_ROPES, …)` admits 5 although the comment's own invariant is `MAX_ROPES - 1`. Gameplay writers only produce integers 0–4 and `tests/tripresolution.test.js` pins the current crafted-record semantics, so the honest fix is a comment rewrite, not a behavior change.
- [ ] [Review][Patch] CSS contract leg greps hexes unscoped (`tests/ropehud.test.js:175-176`) — `assert.match(css, /#f4f0d8/)` passes if the hex lands on any selector; the leg never asserts the `.pip-held`/`.pip-ghost` rules (or the `#hud-ropes` rule) exist. Tighten to selector-scoped matches so the DESIGN.md-token guarantee is actually pinned.
- [ ] [Review][Patch] Test harness hygiene (`tests/ropehud.test.js`) — `restore()` never deletes `globalThis.__ropehudScript` / `__shellTestViews` (latent cross-harness contaminator if process isolation ever changes); `env.views.at(-1)` throws TypeError instead of a clean assertion failure if the shell rendered zero frames (`startRunning`, :144).
- [ ] [Review][Patch] Pip reset duplicated at both startRun sites (`js/shell.js:274-275`, `:305-306`) — `ropesEver = MIN_ROPES; pipsShown = '';` copy-pasted verbatim; AGENTS.md convention ("one shared handler per cross-cutting concern — no per-path duplication") calls for a tiny shared `resetPips()` closure called at both sites (spec's "reset at both startRun sites" is honored either way).
- [x] [Review][Defer] `ropeLost` emits into a void — no JUICE_TIERS/VOICES entry, so a strip trip is audio-visually silent (`js/shell.js` JUICE_TIERS, `js/audio.js`) — deferred, pre-existing; already tracked in deferred-work.md (story 1.2 review); Epic 5 / Story 5.2 owns the cue.
- [x] [Review][Defer] `updateHud()` sits outside the frame try/catch and now calls `replaceChildren` (`js/shell.js:393` vs `:451-456`) — a throw in the pip block would skip `requestAnimationFrame(frame)` and silently freeze the loop on pre-2020 browsers. Spec sanctions `replaceChildren` via NFR11 evergreen targets, and updateHud's position outside the try is pre-existing structure. Deferred, pre-existing.
