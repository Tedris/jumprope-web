---
phase: 04-feel-audio
plan: 04
subsystem: feel-audio-capstone
tags: [capstone, headless-shell, determinism, event-plumbing, graph-audit, audio-containment]
status: complete
requires:
  - "04-01 tickRun events/buffer/streak + press param (SHIPPED)"
  - "04-02 JUICE_TIERS/stopUntil/press-delivery/CLOSE! callout (SHIPPED — 9d2fe11, 06160f9)"
  - "04-03 js/audio.js + shell wiring (SHIPPED)"
provides:
  - "tests/feelcap.test.js — 6 permanent end-to-end capstone tests: the phase's regression floor for criteria 1, 2, 3 and 5 plus the AUD-02 structural audit"
  - "bootCap harness: single-fake-clock shell boot (performance stubbed to the frame counter) — the proven composition of shell.test.js's bootShell + juice.test.js's polling idiom + audio.test.js's stub-context discipline"
  - "Deterministic audio-on vs clean-audio-off byte-identical timeline comparison (the 'rope never locks to music' machine pin)"
  - "Seeded-graph-walk audit of js/audio.js (leaf, zero sim audio refs, single importer) — self-extending via directory walk"
affects: [tests/feelcap.test.js]
tech-stack:
  added: []
  patterns:
    - "single-clock stub: globalThis.performance -> harness counter for the whole boot window, so frame(now), press/hold bookkeeping and FLASH_MS/PICK_HOLD_MS comparisons share one exact 4 ms virtual timeline (supersedes the night draft's accumulator-priming workaround for the boot-to-script desync)"
    - "canonical-voice derivation: signatures come from driving the real createAudio through a recording context — never hard-coded twice"
    - "per-boot unique data: URL slots (__capViews_<id>) so two boots can never cross-contaminate view logs"
    - "per-frame voice-cursor recording -> exact frame-attribution of every voice start"
tech-stack-notes: "zero new dependencies (T-4-SC: the audit test itself proves audio.js pulled none in)"
key-files:
  created: [tests/feelcap.test.js]
  modified: []
decisions:
  - "Clock model replaces real-clock pumping entirely: performance.now() is stubbed to the harness counter for the boot window, eliminating the boot-to-script wall-clock gap by construction and making the audio-on/off timeline A/B bit-deterministic"
  - "Control leg = the late press OMITTED (cycle 2 carries NO input, not a clean press) — the two scripts differ by exactly the one press that the buffer forgives"
  - "Voice/moment cross-checks read signatures derived from the shipped js/audio.js behavior (recording context drive) instead of the plan's literal 'triangle/880' text — the shipped nearMiss voice is square/880"
  - "Math.random is test-local-stubbed with a seeded LCG inside the boot window as a determinism guarantee; the compared timelines never actually consume rng (both legs end before the tenth skip)"
requires-coverage: [FEEL-01, FEEL-02, AUD-02, AUD-04]
metrics:
  duration: "~50 min"
  completed: 2026-10-22
  tasks: 2
  files: 1
  tests-added: 6
  suite: "98 pass / 0 fail (baseline 92)"
plan_head_before: 605ac6ca0d9e452ccaad244b02627dbaf54a7bbe
plan_head_after: f061323
commits: 2
actuals:
  tokens: 8294
  tasks: 2
  commits: 2
---

# Phase 4 Plan 04: Feel & Audio Capstone Summary

The whole phase replayed by one headless file: a scripted press ~40 ms late is proven forgiven on the real frame loop while the identical script with that press omitted trips at the same crossing; one near-miss event is proven to move the 40 ms hitstop stall, the CLOSE! ×1 HUD callout, and the nearMiss voice together; five pairwise-distinct voices ride the loop across jump/skip/near-miss/pick/trip while the audio-on and clean audio-off boots produce byte-identical phase+score timelines; mute/volume survive a reload through a shared storage map; and the audio containment boundary is pinned by a self-extending graph audit. Zero source diffs — `tests/feelcap.test.js` is the only artifact.

## What Was Built

### Task 1 (tracer) — `tests/feelcap.test.js` harness + 5 end-to-end tests (commit `5cda3d8`)

**bootCap harness**: copy of shell.test.js's `bootShell` source-rewrite boot — `./render3d.js` → per-boot recording view stub (unique `__capViews_<id>` global slot), `./game.js` / `./rope.js` / `./player.js` → file: URLs, the dynamic `import('./audio.js')` → file: URL (or the instrumented wrapper from the audio.test.js precedent), unique data: URL per boot. New for the capstone: `globalThis.performance` is stubbed to the harness counter for the whole boot window (single virtual clock), Map-backed `localStorage`, seeded `Math.random`, and EITHER the recording `AudioContext` stub + rejecting/resolve `fetch` (audio-ready boot) OR nothing audio-related (T-4-09's clean 'unsupported' boot). Stubs install before the import and revert in `restore()`.

**Scripted-jumper machine** (exact 4 ms strides, hard frame budgets everywhere — T-4-10): lead-in crossing (no input) → clean press (poll grounded, phase ∈ [0.245, 0.255) → release ~0.26, y ≈ 30 px at the crossing: clears 18, under the 27 near-miss ceiling) → late press (poll grounded, phase ∈ [0.40, 0.41), 1-frame hold, release lands ≈ 0.425 before the 0.45 crossing at y ≈ 15 px → clearance fails, delivered press keeps the buffer alive → forgiven near-miss) → clean presses past it; per-frame capture of phase, score, HUD prompt, view.juice.at and the audio voice cursor; with `endSkips: Infinity` it also rides the tenth-skip card offer, the cycle+hold-confirm and a post-resume stand-and-trip.

| Test | Proves |
| --- | --- |
| 1 | Criterion 1 + 3-structural: forgiven vs control-trip at the SAME crossing; audio-on vs clean audio-off phase+score timelines byte-identical, hitstop stall frames included |
| 2 | Criterion 2: 9 zero-delta frames after the near-miss crossing (40 ms tier under the 4 ms clock) releasing at the deadline; `CLOSE! ×1` on the HUD prompt at the crossing frame, up at F+20, gone at F+40; canonical nearMiss signatures within one frame — one events channel, three consumers |
| 3 | Criterion 3-mechanical: jump/skip/nearMiss/trip/pick each start ≥1 voice inside their moment's frames, five representative signatures pairwise distinct (window attribution via the per-frame voice cursor) |
| 4 | Criterion 5: Mute/Minus write `{muted,volume}` to the storage map write-through; second boot on the SAME map constructs the master gain at 0 and un-mutes to the persisted 0.9; pristine-boot check that control keys never construct a context nor start a run |
| 5 | AUD-02 track mechanism: rejecting fetch = flag + silence + zero sources + zero unhandled rejections + no retry; resolving fetch = exactly one `loop: true` source on the SAME master GainNode the voice envelopes chain into |

### Task 2 (auto) — graph audit test (commit `f061323`)

boundary.test.js's SPECIFIER_RE + a local walkFile clone, seeded at `js/audio.js`: resolved graph must be exactly {audio.js} (zero sim files reached, zero bare specifiers, zero import/export-from statements in the file); a directory-walked case-insensitive `audio` word-scan of `js/` (excluding audio.js itself and shell.js) must be empty, with violating `file:line` pairs in the message; exactly one js/ file may name the `./audio.js` specifier and it must be shell.js (decided with the specifier-regex loop, which sees both `from` and dynamic `import(` forms).

## Verification Coverage

| kind | ref | status |
| --- | --- | --- |
| automated | `node --test tests/feelcap.test.js` → fail 0, pass 6 (≥ 6 floor) | pass |
| automated | `node --test tests/` → fail 0, pass 98 (floor ≥ 96) | pass |
| automated | feelcap stability: 5 consecutive full runs, 6/6 every time (fake-clock determinism) | pass |
| automated | `git diff --quiet HEAD -- js/ tests/{shell,pickflow,game,boundary,feel,juice,audio}.test.js` → clean (lane contract: this plan's diff is tests/feelcap.test.js only) | pass |
| automated | `js/audio.js` has zero import/export-from lines; zero `audio` mentions in the four sim modules; exactly one importer (shell.js) | pass |
| automated | audio-on vs audio-off phase+score timelines byte-identical over the full scripted run (in-test assertion) | pass |
| note | No `audio/` directory or `.ogg` file appears at any commit; no test requires one (T-4-SC: zero installs; the audit proves audio.js imported none) | pass |
| human_judgment | Criterion 4 (Chrome/Firefox/iOS-Safari first-press matrix) and the track's musical content remain human UAT gates (04-CONTEXT deferred list) — everything headless about them is asserted here | pending by design |

## Deviations from Plan

### Plan-text drift — shipped code is authoritative, semantics asserted (zero source diffs, none needed)

**1. nearMiss voice is square/880, not the plan's literal "triangle/880-Hz"**
- **Found during:** Task 1 harness design — `js/audio.js` VOICES: `nearMiss: tone('square', 880, …)` (triangle/660 is the skip voice).
- **Fix:** the plan's own rule resolved it — signatures are DERIVED from the shipped module (driving the real `createAudio` through a recording context in `canonicalVoices()`), so the test reads the truth and the literal text in the plan never needed to be right. (Commit `5cda3d8`)

**2. Settings defaults/keys: volume default 1 (plan said 0.8), Minus steps to 0.9 (plan said Comma → 0.7)**
- **Found during:** Task 1 test 4 — shipped shell routes `Mute`/`Minus`/`Equal`; `loadSettings` defaults `{muted:false, volume:1}`; audio.test.js already pins the 0.9 step.
- **Fix:** asserted the shipped semantics (write-through `{muted:true, volume:1}` → Minus → `0.9` → cross-boot master-gain 0 → un-mute → 0.9). (Commit `5cda3d8`)

**3. Task 2's literal verify grep `from … ./audio.js` cannot match shell.js's dynamic `import('./audio.js')` form**
- **Fix:** the audit test decides containment with boundary.test.js's SPECIFIER_RE loop, which covers both forms; the verify's intent (exactly one importer) was run with a both-forms pattern → 1 (shell.js). (Commit `f061323`)

### Test-design accommodations

**4. [Rule 3 - Blocking] Single-fake-clock model instead of accumulator priming**
- **Issue:** the night draft hit the boot-to-script wall-clock desync and worked around it by priming the accumulator with one oversized frame. The draft also needed real-clock pumping for FLASH_MS/PICK_HOLD_MS — which re-opened flake surface.
- **Fix:** stub `globalThis.performance` to the harness counter for the boot window; frame(now) and the shell's wall-clock comparisons share one exact 4 ms timeline, so the gap cannot exist and the FLASH_MS/PICK_HOLD_MS branches become frame-countable and deterministic. The plan's "no wall-clock dependence" prohibition is honored more strictly than its own recipe. (Commit `5cda3d8`)

**5. Test-local seeded `Math.random` inside the boot window (determinism guarantee)**
- Restored in `restore()`; the compared timelines never consume rng (both legs end before the tenth skip), so this is belt-and-braces for the pickOffers path in longer legs. Test-harness only. (Commit `5cda3d8`)

**6. Task-1 commit carries 5 tests; the ≥6 floor holds for the finished file after Task 2** (the audit test is one of the six the floor counts).

## Known Stubs

None. Every channel the file asserts is wired end-to-end in shipped code (events → juice/callout/SFX, storage → master gain, fetch → looping source); the tests add no placeholders.

## Threat Surface

T-4-09 mitigated as designed: stubs live only inside bootCap's import window; the determinism boot runs with a clean (audio-free) globalThis and is itself the proof. T-4-10: every poll loop carries a hard frame budget with a diagnostic message — five stability runs confirmed no hang paths. T-4-SC: zero packages; the audit test enforces audio.js's leaf status mechanically. No threat flags — no new source surface, one new test file.

## Self-Check Run

- File: `tests/feelcap.test.js` — present.
- Commits `5cda3d8`, `f061323` — ancestors of HEAD (`f061323`).
- Full suite at `plan_head_after`: 98 pass / 0 fail; `git status` clean for js/ and all pre-existing tests.

## Self-Check: PASSED
