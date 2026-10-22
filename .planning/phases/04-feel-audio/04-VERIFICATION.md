---
phase: 04-feel-audio
verified: 2026-10-22T10:45:00Z
status: human_needed
score: 15/15 must-haves verified
covered_files:
  - ".planning/phases/04-feel-audio/04-01-PLAN.md"
  - ".planning/phases/04-feel-audio/04-01-SUMMARY.md"
  - ".planning/phases/04-feel-audio/04-02-PLAN.md"
  - ".planning/phases/04-feel-audio/04-02-SUMMARY.md"
  - ".planning/phases/04-feel-audio/04-03-PLAN.md"
  - ".planning/phases/04-feel-audio/04-03-SUMMARY.md"
  - ".planning/phases/04-feel-audio/04-04-PLAN.md"
  - ".planning/phases/04-feel-audio/04-04-SUMMARY.md"
  - "js/audio.js"
  - "js/game.js"
  - "js/render3d.js"
  - "js/shell.js"
  - "tests/audio.test.js"
  - "tests/feel.test.js"
  - "tests/feelcap.test.js"
  - "tests/juice.test.js"
covered_digest: "v3:sha256:024b8751fc7b38d1e6f9779d2f08cbf512fa330a4b47526909ec222826447a7c"
behavior_unverified: 0
overrides_applied: 0
deferred:
  - truth: "Player hears a looping vibe track (audio/track.ogg content)"
    addressed_in: "Human-gated delivery — no roadmap phase claims the file"
    evidence: "04-CONTEXT.md <deferred>: content is the user's call; delivery mechanism (D-N09) is shipped and mechanically proven for both present and absent file. No plan in the repo may require the file."
advisory: []
human_verification:
  - test: "Live forgiveness feel — start a run, deliberately press ~60-90 ms too late at the feet window several times"
    expected: "Near-miss crossings count as skips with a CLOSE! callout instead of tripping; presses clearly mistimed (>0.15 s) still trip — forgiveness reads as generous, not omniscient"
    why_human: "The buffer mechanics are machine-pinned (feel.test.js matrix + feelcap end-to-end), but whether the window FEELS joyful is the phase's own playtest judgment (coverage D1 human_judgment)"
  - test: "Juice weight scaling — play until a skip, a near-miss, and a trip each land"
    expected: "Skip gets a barely-perceptible tick, near-miss a noticeable freeze+shake+burst, trip the heaviest stop; nothing stutters or overloads; if weights feel wrong, re-tune JUICE_TIERS as a data-only diff (D-N12)"
    why_human: "Tier table order and magnitudes are pinned as data invariants; perceptual scaling is timing taste (04-02 coverage row: human_judgment)"
  - test: "Five-voice distinctness — with sound on, produce jump, skip, near-miss, trip, and card-pick in one run"
    expected: "Each moment has a short, punchy, clearly distinguishable chiptune voice; no voice masks another; nearMiss double-tick and trip noise are identifiable without looking"
    why_human: "Tests pin one-voice-per-event routing and pairwise-distinct (type, f0) signatures, not timbre (04-03 coverage D2 human_judgment)"
  - test: "First-press matrix — cold-load index.html in Chrome, Firefox, and iOS Safari (fresh profile, no prior gesture); press Space / tap once"
    expected: "The very first press produces audible SFX in all three browsers; no silent broken state; tab-away and return keeps audio alive"
    why_human: "Autoplay-policy behavior is real-browser-specific and cannot be exercised headlessly (roadmap criterion 4 is an explicit human UAT gate)"
  - test: "Mute/volume across reload — press Mute (and Minus once), reload the page, press to start"
    expected: "Game stays muted at the persisted volume (storage key 'jumprope-audio'); un-muting restores the persisted level"
    why_human: "The cross-boot round-trip is pinned mechanically in feelcap test 4 over two headless boots; the browser reload path is the same code but deserves a 20-second sanity confirmation"
  - test: "Track decision — provide audio/track.ogg (or accept silence for this milestone)"
    expected: "With a file present, one looping track shares the bus with SFX and volume/mute steer it; with none, the game plays silently-backed and never errors"
    why_human: "Human-gated content deferred by the user in 04-CONTEXT.md <deferred>; the mechanism is tested for both states, the musical content is a person's call"
---

# Phase 4: Feel & Audio Verification Report

**Phase Goal:** The core-value loop feels joyful and sounds alive — presses are forgiven, moments get juice, and audio just works from the first tap
**Verified:** 2026-10-22T10:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

> Mode note: ROADMAP marks Phase 4 `mode: mvp` but the goal is a declarative statement, not the
> `As a…, I want…, so that…` user-story form (`user-story.validate` → `false`). Verification proceeded
> goal-backward against the five roadmap success criteria, which decompose the goal cleanly. No scope
> was reduced by this.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A press within BUFFER_SEC (0.1 s) before the feet-crossing forgives a would-be trip; the buffer decays on the phase clock (`dt * ropeMul`) | ✓ VERIFIED | `js/game.js:49-50,84-92`; feel.test.js offset matrix (−0.05 forgives, −0.10 float-residue edge, −0.15 trips) + feelcap test 1 proves it end-to-end on the REAL `frame()` loop — both suites green on this tree |
| 2 | Forgiveness is bounded: a press beyond BUFFER_SEC leaves the trip intact (status 'over', tripped true, 'trip' event) | ✓ VERIFIED | `js/game.js:88-93`; feel.test.js "press 0.15 s before … trips" passes; feelcap control leg trips at the same crossing the forgiven leg survives |
| 3 | Forgiveness-only (D-N11): a delivered press never mutates player y/vy/grounded | ✓ VERIFIED | Deep-equal pin passes: "D-N11 pin: a delivered press never mutates player state"; `tickRun` never calls `jump()` |
| 4 | `tickRun` returns `events` (alphabet jump/skip/nearMiss/trip/offer) alongside the untouched `tripped` flag; per-call, never accumulated; events are the only juice/audio feed | ✓ VERIFIED | `js/game.js:52-101` (`const events = []` per call); shell consumes `out.events` only (`js/shell.js:245,252`, WR-02 guard present); alphabet test passes; SECURITY T-4-02 closed |
| 5 | Near-miss is a distinct registered event; buffer-forgiven or tight-clearance (< NEAR_MARGIN × minHeight above threshold) passes emit nearMiss and build `run.streak`; clean/trip reset it | ✓ VERIFIED | `js/game.js:64-69,86`; ten-pass streak-trajectory test, streak-2 test, and windowMul-1.25 band-coupling pin all pass |
| 6 | Backward compat: 5-arg `tickRun` behaves byte-identically press-free; all pre-existing tests green unedited | ✓ VERIFIED | 5-arg compat pin test passes; `node --test tests/` = **100 pass / 0 fail** re-run independently at verification (66 baseline + 9 feel + 8 juice + 11 audio + 6 feelcap); frozen files git-clean |
| 7 | Hitstop pauses sim stepping for the tier's ms via a drain gate; steps are delayed, never dropped; sim state untouched | ✓ VERIFIED | `js/shell.js:237` gate inside unchanged while-drain; juice stall/conservation test and feelcap's 9 zero-delta frames at the 40 ms tier both pass — behavioral evidence for the state-transition truth |
| 8 | One exported `JUICE_TIERS` table is the sole juice-magnitude source (skip < nearMiss < trip) | ✓ VERIFIED | `js/shell.js:15-19`; `grep -c "hitstop:"` = 3 in shell.js, 0 in render3d.js/game.js; tier-data-pin test passes |
| 9 | Near-miss renders "CLOSE! ×N" through the existing flashName/flashUntil HUD channel — no new DOM | ✓ VERIFIED | `js/shell.js:259-264`; juice callout test (flashes, times out after FLASH_MS) and feelcap's CLOSE!×1 frame attribution pass |
| 10 | Shell delivers the press: tickRun's 6th arg is `true` on the STEP that fired the jump, else null | ✓ VERIFIED | `js/shell.js:145` (`pressFired = true` beside `jump()`), `:241` (`pressFired ? true : null`, cleared after); feelcap end-to-end forgiveness could not pass otherwise |
| 11 | Shake is post-pass UV jitter (Bayer cell on unjittered vUv); camera never mutated outside construction; particles are 16 pooled quads, zero Math.random, closed-form decay | ✓ VERIFIED | `js/render3d.js:41,54,257-267,450`; camera grep = 1 match (construction line); juice tests pin uShake decay to exactly 0 by 140 ms, pool clip at 16 (T-4-04), and bit-identical camera across juiced frames |
| 12 | Five procedurally-synthesized voices (jump/skip/nearMiss/trip/pick), one per event, zero assets/deps, pairwise-distinct at the shell seam | ✓ VERIFIED | `js/audio.js:171-177`; audio voice-map + shell-seam tests and feelcap's real-loop pairwise-distinct signatures pass. **Timbre aesthetics → human item 3** |
| 13 | AudioContext created lazily on first gesture only, resumed on every later gesture/visibility return; zero contexts at load | ✓ VERIFIED | `js/audio.js:62-80`, creation site is shell `press()` (`js/shell.js:82-91`); cold-import inertness, create-once/resume-only, and shell-seam zero-contexts-cold tests all pass. **Real-browser autoplay matrix → human item 4** |
| 14 | Track mechanism: one `AudioBufferSourceNode {loop:true}` on the shared master bus; absent file = flag + silence + zero throws; the rope provably never locks to audio | ✓ VERIFIED | `js/audio.js:85-115` (synchronous `trackPending` re-entry guard = WR-04 fix); feelcap test 1: byte-identical phase+score timelines audio-on vs clean audio-off; test 5: exactly one loop:true source or clean-missing state. `audio/track.ogg` absent by design → deferred |
| 15 | Mute/volume persist under one key `jumprope-audio` via the injectable-storage seam; a second boot honors them at construction (volume 0 survives — CR-02 fix) | ✓ VERIFIED | `js/audio.js:20-43,185-199` with finite-check `clampVolume` (CR-02); feelcap test 4 cross-boot master-gain-0 + audio settings/round-trip/coercion tests pass; `e.repeat` guards on Mute/Minus/Equal present (WR-03) |

**Score:** 15/15 truths verified (0 present, behavior-unverified)

Every behavior-dependent truth (forgiveness transition, hitstop freeze/conservation, audio-free determinism, cross-boot persistence) has a passing behavioral test on the real headless shell — no truth rests on symbol presence alone.

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Track musical content (`audio/track.ogg`) | Human-gated — no roadmap phase claims it | 04-CONTEXT.md `<deferred>`: "content is the user's call… must FAIL FAST if the file is absent — do not improvise content." Mechanism shipped and tested both ways |
| 2 | JUICE_TIERS seed tuning | Post-playtest data-only diff (D-N12) | 04-CONTEXT.md `<deferred>`; table marked PROVISIONAL at `js/shell.js:11-14` |

### Advisory (New Scope, Unevidenced)

None — initial verification; no carried-forward gaps.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `js/game.js` | BUFFER_SEC/NEAR_MARGIN exports, run.buffer/streak, press param, events channel, near-miss + streak rule | ✓ VERIFIED | All present; sim purity intact (no wall-clock/DOM/audio refs — grep 0) |
| `js/shell.js` | JUICE_TIERS, stopUntil gate, press delivery, events consumption, CLOSE! callout, audio wiring | ✓ VERIFIED | Includes all 5 review fixes (CR-01/02, WR-02/03/04) |
| `js/render3d.js` | uShake uniform, pooled particle quads, camera invariant | ✓ VERIFIED | Jitter on sample UV only; pool built once |
| `js/audio.js` | Leaf voice factory: gesture/handleEvent/playTrack/settings seam | ✓ VERIFIED | Zero imports, zero browser-IO literals (grep clean), 217 substantive lines |
| `tests/feel.test.js` | 9 tests: offset matrix, D-N11 pin, alphabet, streak, compat | ✓ VERIFIED | 9/9 pass |
| `tests/juice.test.js` | 8 tests: tier pins, stall/conservation, callout, render juice | ✓ VERIFIED | 8/8 pass |
| `tests/audio.test.js` | Lifecycle, voice map, track degrade, settings, shell seams | ✓ VERIFIED | 11/11 pass (9 planned + 2 review-fix regression tests) |
| `tests/feelcap.test.js` | ≥6 end-to-end capstone + graph audit | ✓ VERIFIED | 6/6 pass |

Night-loop SUMMARYs (04-01/04-03) were checked against code, not narration: all claims match the shipped `js/game.js`/`js/audio.js` line-for-line, and commits `44ea4f8`/`28e4d91` verified reachable from HEAD (8/8 SUMMARY commits valid).

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| tickRun events | frame() juice/audio loop | `out.events` iteration (`js/shell.js:245,252`) | ✓ WIRED | feelcap test 2 moves hitstop + callout + voice from ONE event |
| run.streak | CLOSE! ×N flash | `flashName`/`flashUntil` (`js/shell.js:262-263`) | ✓ WIRED | HUD textContent asserted in juice + feelcap tests |
| release/jump | tickRun 6th arg | `pressFired` flag same-STEP (`js/shell.js:145→241`) | ✓ WIRED | Control-vs-forgiven scripted legs |
| shell press() | AudioContext creation | sole `new AudioContext` site (`js/shell.js:84`) | ✓ WIRED | Cold-boot tests assert zero constructors until first tap |
| storage map | master GainNode | loadSettings at factory → gain at ctx creation (`js/audio.js:53,69`) | ✓ WIRED | Two-boot persistence asserted headlessly (browser reload = human item 5) |
| view.juice | uShake/particles | read-only `at !== lastJuiceAt` impulse detection | ✓ WIRED | Bit-identical-camera test proves no write-back |
| js/audio.js containment | sim graph | leaf module, single importer | ✓ WIRED | Graph-audit test + independent grep: 0 audio refs in the four sim files, exactly one importer (shell.js) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| shell juice loop | `out.events` | tickRun transition checks | Yes — per-step state machine | ✓ FLOWING |
| HUD callout | `run.streak` | sim streak rule | Yes | ✓ FLOWING |
| render3d shake | `view.juice` | JUICE_TIERS lookup on real events | Yes | ✓ FLOWING |
| audio voices | event name | tickRun channel + shell 'pick' | Yes | ✓ FLOWING |
| master gain | settings | localStorage JSON via seam | Yes (persisted round-trip tested) | ✓ FLOWING |
| track source | `fetch(TRACK_URL)` | same-origin file (absent by design) | Graceful-static by design; tested both branches | ✓ (by-design) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite | `node --test tests/` | 100 pass / 0 fail | ✓ PASS |
| Buffer forgiveness end-to-end | `node --test tests/feelcap.test.js` | 6/6, incl. forgiven-vs-trip leg | ✓ PASS |
| Hitstop stall + conservation | `node --test tests/juice.test.js` | 8/8 | ✓ PASS |
| Audio lifecycle/settings | `node --test tests/audio.test.js` | 11/11 | ✓ PASS |
| Sim purity matrix | `node --test tests/feel.test.js` | 9/9 | ✓ PASS |
| Audio containment | grep audio refs in 4 sim files | 0 matches; 1 importer | ✓ PASS |
| Camera invariant | grep `camera.(position\|rotation)` render3d.js | 1 match (construction) | ✓ PASS |

No probe scripts declared or discovered (`scripts/*/tests/probe-*.sh` empty) — Phase 7c: N/A; the headless suites are this project's probes.

### Requirements Coverage

Requirement IDs from PLAN frontmatter: 04-01 → FEEL-01, FEEL-03 · 04-02 → FEEL-02, FEEL-03 · 04-03 → AUD-01..04 · 04-04 → FEEL-01, FEEL-02, AUD-02, AUD-04. Union = {FEEL-01..03, AUD-01..04} — exact match to REQUIREMENTS.md's Phase-4 mapping. **No orphans; no unclaimed IDs.**

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FEEL-01 | 04-01, 04-04 | ~0.1 s input buffer forgives late/early presses | ✓ SATISFIED | Truths 1-2, 6, 10 |
| FEEL-02 | 04-02, 04-04 | Juice scaled by significance | ✓ SATISFIED (mechanical) | Truths 7-9, 11; feel-weight → human item 2 |
| FEEL-03 | 04-01, 04-02 | Near-miss distinct event + callout + streak | ✓ SATISFIED | Truths 5, 9 |
| AUD-01 | 04-03, 04-04 | Distinct SFX for five moments | ✓ SATISFIED (mechanical) | Truth 12; timbre taste → human item 3 |
| AUD-02 | 04-03, 04-04 | Looping track; rope never locks to it | ✓ SATISFIED (mechanism) | Truth 14; content deferred (user-gated) |
| AUD-03 | 04-03 | Audio just works, no silent broken state | ✓ SATISFIED (headless) | Truth 13; browser matrix → human item 4 |
| AUD-04 | 04-03, 04-04 | Mute/volume persisted | ✓ SATISFIED | Truth 15; browser reload → human item 5 |

REQUIREMENTS.md still lists all seven as `[ ] Pending` — the orchestrator may tick them once UAT closes.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No TBD/FIXME/XXX/TODO/placeholder markers in any phase-touched file | ℹ️ Info | Clean scan |
| js/game.js | 53 | Unreachable `'jump'` detector flagged by review WR-01 | ℹ️ Info | Accepted in 04-REVIEW-DISPOSITION.md with rationale (dead code; real jump audio rides the shell) |

Review posture: 5 fixed (both criticals with regression tests), 5 accepted with written rationale; security register threats_open: 0. Consistent with the tree.

### Human Verification Required

1. **Live forgiveness feel** — Press deliberately ~60-90 ms late at the feet window several times.
   Expected: forgiven skips with CLOSE! callouts; gross mistimings (>0.15 s) still trip. *Feel is the deliverable; mechanics are pinned.*
2. **Juice weight scaling** — Land a skip, a near-miss, and a trip. Expected: visibly escalating hitstop/shake/particles, nothing stuttery; re-tune `JUICE_TIERS` as a data-only diff if taste says otherwise (D-N12).
3. **Five-voice distinctness** — Produce jump/skip/near-miss/trip/pick with sound on. Expected: short punchy, distinguishable chiptune voices. *Routing is pinned; timbre is judgment.*
4. **First-press browser matrix (criterion 4)** — Cold-load in Chrome, Firefox, iOS Safari; first Space/tap must produce sound with no silent broken state. *Autoplay policy is real-browser behavior headless tests cannot reach.*
5. **Mute/volume across reload** — Mute + lower volume, reload, start; stays silent at persisted volume, un-mute restores it. *Cross-boot logic pinned headlessly; 20-second browser confirmation.*
6. **Track decision** — Supply `audio/track.ogg` or explicitly accept silence; with a file present it loops under the same master bus. *Human-gated content per 04-CONTEXT `<deferred>`.*

### Gaps Summary

No gaps. All 15 mechanical must-haves are verified in code with passing behavioral evidence (100/100 headless, independently re-run); the six open items are exactly the phase's declared human gates (feel/timbre judgment, real-browser autoplay matrix, user-supplied track content) plus one 20-second sanity check. Phase advances to the next stage on completion of the browser UAT session above.

---

_Verified: 2026-10-22T10:45:00Z_
_Verifier: the agent (gsd-verifier)_
