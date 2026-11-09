---
baseline_commit: 569f5ce
---
# Story 5.1: Ascent stinger & win fanfare

Status: ready-for-dev

Baseline: `569f5ce` (Epic 5 entry probe committed — boundary dispositions + D-006 music direction RESOLVED; gate **447/447 green @ ~8.5 s**, tree clean, verified at authoring time 2026-11-09). First story of Feel & Fidelity: the ceiling-break beat shipped visually in 4.4 with its audio half **explicitly deferred** — `js/audio.js` VOICES has no `ascend` voice, and both `'ascend'` and `'win'` already flow on the event channel **silent** (no VOICES key at `js/audio.js:178-184`). This story adds exactly two procedural voices; it is the smallest possible product delta: **one file** (`js/audio.js`).

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player breaking a ceiling or the summit,
I want new sounds that belong to those moments,
So that hearing them instantly means *I went up* or *I won*.

## Acceptance Criteria

(verbatim from `_bmad-output/planning-artifacts/epics.md:725-743` — FR28, FR27, NFR8, NFR5)

**Given** an ascent event on the shell's event channel
**When** `audio.js` handles it
**Then** a new procedural ascent stinger voice plays on the master bus — pitch/material may shift per area tier — with no timing dependency on, or influence over, the rope's phase clock (FR28, FR27, NFR8)

**Given** a summit win state
**When** it is presented
**Then** a new procedural win fanfare voice plays, distinct from every existing voice, once per run-end only (FR28)

**Given** audio context is not yet gesture-unlocked (fresh page, keyboard-only player)
**When** the first ascent occurs before any gesture
**Then** the AudioContext lifecycle guards hold — no error, no queued blast on unlock — with red-green test legs written when the guard code is written (NFR5)

### AC-to-verification map (decided — do not re-litigate)

| AC | How it is proven headlessly |
|---|---|
| AC1 | Part A module legs (stub-ctx: `handleEvent('ascend')` starts oscillators on the master bus after gesture, zero before). Tier half: **uniform voice, NO per-area pitch shift** — `[DECIDED-BY-CREATE]`, see Decisions. NFR8 half: zero `js/shell.js` delta (by construction, this story never edits it) + the audio-on vs audio-absent real-shell double boot with byte-identical phase+score timelines (feelcap.test.js:408-411 idiom). |
| AC2 | Part A distinctness legs via the **derived-signature-set oracle** (feelcap.test.js:130-145 idiom — read below, "Distinctness oracle"). "Once per run-end only" needs **NO dedupe state** — proven by the shipped event facts (see "Event channel facts"); the census pin + refire-absence pins (`tests/summitapproach.test.js:173-175, :211-215`, frozen) carry the invariant. |
| AC3 | Module-level red-green legs mirroring `tests/audio.test.js:105-115` (cold factory, `handleEvent('ascend')`/`('win')` before `gesture()` → `started === 0`, no throw, nothing queued — the drop is by construction via `play()`'s `if (!ctx \|\| !master) return` at `js/audio.js:174`). **Do NOT build a shell-level pre-gesture-ascent leg — unreachable without a new seam, and new seams are forbidden.** |

### Loop contract (binding)

- Gate `./run_tests.sh` before any edit: **447/447**. After: 447 + ~10–16 new legs in ONE new test file, suite < 10 s (NFR4). The rewritten frozen leg is 1-in/1-out — total count unchanged by it.
- **Product code delta: exactly `js/audio.js`** (VOICES literal gains `ascend` + `win`). NOT touched: `js/shell.js`, `js/game.js`, `js/areas.js`, `js/render3d.js`, `css/`, `index.html`, `package.json`. No new deps, no build step, no TypeScript (NFR6).
- Existing test files are frozen **except ONE sanctioned re-contract** (below, R1). Any OTHER existing-file red = implementation wrong; diagnose the code, never the file.
- `handleEvent(name)` keeps its **one-parameter signature**. Five frozen harness wrappers (`tests/v1parity.test.js:496`, `tests/polish.test.js:186-189`, `tests/secondwind.test.js:200-202`, plus the audio.test/feelcap harness copies) forward exactly one argument — a widened `(name, area)` would be **silently dropped to `undefined`** in every real-shell boot of those suites. Any per-tier data must never be needed (it isn't — see Decisions).
- No new timing surface anywhere: no `setTimeout`/`setInterval`/`Date`/wall-clock in `js/audio.js` (frozen: `tests/boundary.test.js:103-112`); no `Math.random` (frozen: `:67-80`). Schedule everything on `ctx.currentTime` + literal offsets, like every shipped voice.

### R1 — Sanctioned re-contract of `tests/ceilingbreak.test.js` §6 (MUST; frozen-test discipline requires it be written here)

The ledger deferred the audio half of the ceiling-break beat to this story, and 4.4 fenced the silence: `tests/ceilingbreak.test.js:511-518` asserts `!/\bascend\s*:/` against audio.js AND `deepEqual(names, ['jump','nearMiss','pick','skip','trip'])`. **Adding the `ascend`/`win` voices turns that leg red BY DESIGN** — this is the anticipated un-fencing, exactly like Story 4.5's sanctioned re-contract precedent (`deferred-work.md:150-151`, where 4.5's story text authorized the `ceilingmarker.test.js:362` comment change).

Authorized diff, the ONLY existing-test-file change allowed:

- Rewrite the leg at `tests/ceilingbreak.test.js:511-518`: keep the `sourceOf('audio.js')` + VOICES-literal regex extraction (`/const VOICES = \{([\s\S]*?)\n  \};/`) and the presence assert; **delete** the `!/\bascend\s*:/` assertion and the `ascend`-absent wording; **replace** the five-name census with the post-5.1 census: `assert.deepEqual(names, ['ascend', 'jump', 'nearMiss', 'pick', 'skip', 'trip', 'win'], ...)` and retitle the leg (e.g. "§6 js/audio.js VOICES census is EXACTLY the seven shipped voices — the deferred beat's audio half landed, census pinned (AC4 ledger fence, re-contracted by Story 5.1)"). The fence must keep fencing something true: **the exact-name-set pin replaces the absence pin.**
- Zero other changes in that file; the diff must show no other existing-file changes anywhere.

### Ledger carry-in (verbatim, `deferred-work.md:156`)

> "Audio half of the ceiling-break beat — the ascend stinger (`js/audio.js` VOICES gains its `ascend` voice there, never here) — this story ships the visual beat complete; the VOICES-miss silence is fenced by `tests/ceilingbreak.test.js` §6. — OWNER: Story 5.1"

## Context — shipped state (verified against the tree at 569f5ce)

**Audio (`js/audio.js`, 225 lines, leaf — zero imports):**
- `createAudio({ context, storage, fetchFn })` :48; `gesture(audioContext)` :62-80 — create-once master gain + `if (ctx.state === 'suspended') ctx.resume()` suspend-recovery arm (AUD-03); `suspend()` :85-87. `play(voice)` :173-176 — **the single voice-start funnel**: `if (!ctx || !master) return;` :174 (the AC3 guard: pre-gesture events are a silent no-op by state, no queue, no error), then `voice(ctx.currentTime || 0)`.
- Primitives to REUSE (do not add new synth machinery): `tone(type, freq, t0, dur, end?)` :139-151 — osc → gain env 0.25 → exponential ramp to 0.001 → master; `noiseHit(t0, dur, fromHz, toHz)` :153-169 (buffer-source noise; **shared `'noise'` signature — see oracle, avoid for the new voices**).
- `VOICES` :178-184 exactly: `jump` square 220 ramp 330 / `skip` triangle 660 / `nearMiss` two square 880 staggered +0.07 / `trip` noiseHit / `pick` triangle 523 + 659 staggered +0.07. Compound two-staggered-tones precedent: `nearMiss`/`pick` :181-183 — the new voices scale that pattern up (ascend: 2-3 notes; win: 3-4).
- `handleEvent(name)` :186-189: `const voice = VOICES[name]; if (voice) play(voice);` — today `'ascend'`/`'win'` hit the miss and are silent. THE ONLY PRODUCT EDIT: two VOICES entries.

**Event channel facts (both names exist TODAY and are silent):**
- Sim pushes `'ascend'` (`js/game.js:277`, non-summit ceiling arm) and `'win'` (`js/game.js:273`, summit arm, with the same-tick `'offer'` splice at `:271-272` — 2.4's fix: no phantom pick announcement on the win tick). `events` is const: splice/push in place.
- Shell routes EVERY event name to `audio.handleEvent` (`js/shell.js:673`, D-N02 single-channel rule — "sim events are audio's only feed"); events drain only while `run.status === 'running'` (`js/shell.js:666`).
- **`'win'` fires on exactly ONE transition tick** — status flips to `'over'` in the same arm (`js/game.js:265`), the drain gate blocks further ticks, and refire-absence is already pinned (`tests/summitapproach.test.js:129-175` win census exactly 1, `:211-215` quiet-after). ⇒ "once per run-end only" is a property of the CHANNEL, not of audio: **no dedupe/state may be added to audio.js for it** (D-N09: audio is read-only; a stateful voice is a boundary violation).
- Ascend-during-i-frames / double-ascend / ascend+win-never-same-tick are pinned frozen (`tests/summitapproach.test.js:177-217`).

**Juice/presentation:** the ascend beat already has hitstop/shake/particles (`js/shell.js` JUICE_TIERS ascend row — 4.4); the win presentation (`'Summit. Altitude N'`, amber) already renders. **Do NOT add any presentation-side audio hook** — the channel is the only feed (D-N02); `handleEvent('win')` arrives via the drain tick before status gates close.

**Sound identity (decided at Epic 5 entry, user-approved, `deferred-work.md:165` context):** PS1 lo-fi chiptune material. New voices stay **square/triangle chip timbres coherent with the five existing voices**; this story ships no music file (TRACK-1 is Story 5.6).

**Distinctness oracle (AC2's falsifiable check — the derived-signature-set idiom, `tests/feelcap.test.js:130-145`):** build a recording-stub AudioContext whose osc `start()` logs `osc:<type>:<f0>` (feelcap `makeRecordingContext` :82-97 shape); drive the REAL `createAudio` through it; per event name collect the Set of signatures started. **Fence: the `ascend` and `win` sets are pairwise disjoint with each other and with the five existing voices' derived sets.** Consequence to design against: existing signatures occupy square:220, triangle:660, square:880, triangle:523, triangle:659, and noise; a noiseHit-based new voice would share trip's `'noise'` and FAIL the oracle — **oscillator-only new voices** (any type, frequencies outside those exact (type,freq) pairs). Derive, never hard-code twice.

**Harness pattern for the new suite:** ONE new file `tests/ascentstinger.test.js`. Direct `../js/audio.js` import is allowed and precedented (leaf module, `tests/audio.test.js:9-11` rationale — boundary.test.js re-audits it for free). Part A: stub ctx copied from `tests/audio.test.js:24-88` (`makeAudioContext` — counts `started`/`gains`, tracks connect targets) plus the feelcap recording-ctx shape for the oracle legs. Part B (data-URL real-shell boot, `tests/audio.test.js:272-513` bootAudioShell precedent): one cheap plumbing leg proving a real drained event reaches `handleEvent` via the real shell, and the NFR8 double-boot (audio-on vs audio-absent, `delete globalThis.AudioContext` stub discipline per `tests/feelcap.test.js:203-213`, byte-identical phase+score timelines on the same scripted run). Do not attempt a real-shell full-ladder summit walk — the win's channel behavior is already pinned sim-side (summitapproach, frozen); Part B stays cheap (skip-counts in the single digits, feelcap T-4-10 budget discipline).

**NFR8 proof structure:** (1) `js/shell.js` is byte-identical after this story — the drain, the accumulator, and JUICE are untouched, so no audio change can re-clock the rope; (2) voices are pure `ctx.currentTime`-scheduled node churn; (3) the double-boot byte-identity leg (feelcap:408-411 precedent) fences it empirically.

## Decisions (baked — `[DECIDED-BY-CREATE]` marks calls made at authoring; do not re-litigate at dev time)

1. **[DECIDED-BY-CREATE] AC1 tier pitch-shift: UNIFORM stinger, no per-area variant.** The AC's "may shift" is permissive, and a tier variant needs the sim→audio area payload — a `handleEvent(name, area)` widening that five frozen harness wrappers would silently drop to `undefined` (evidence in Loop contract). A future tier variant is a legitimate but SEPARATE diff (signature widening + five wrapper re-contracts + shell call-site; data-only thereafter). Uniform ship.
2. **[DECIDED-BY-CREATE] AC3 shell-level pre-gesture-ascent leg: NOT built.** Without a new seam (forbidden) the real shell cannot produce an ascend before the first gesture; the module-level legs are the honest red-green fencing the AC's "written when the guard code is written" clause asks for, mirroring `tests/audio.test.js:105-115`.
3. **Voice material direction (dev may tune the numbers, must keep the fences):** ascend — short rising chip stinger, 2-3 staggered `tone()` notes (precedent: pick's stagger), square, frequencies outside the existing set, ~0.2-0.3 s total; win — the biggest musical moment of the five-plus-two voices, 3-4 staggered triangle/square notes, an ascending fanfare arpeggio, ~0.4-0.6 s scheduled ahead on `t0 + k*Δ` (future-scheduling is precedented by nearMiss/pick — no timers). Everything through `tone()`; env peak stays 0.25 by inheritance (mix coherence; do not touch `tone()` itself).

## Tasks / Subtasks

- [ ] Task 1 — Red: the new suite `tests/ascentstinger.test.js` (AC: 1,2,3). Run the gate; the new legs go red on the VOICES miss.
  - [ ] 1a. Part A census/lifecycle legs: `ascend` + `win` each start ≥1 (ascend) / ≥3 (win) oscillators post-gesture, connect through the master gain, and start ZERO pre-gesture (cold factory + `handleEvent` before `gesture()`, no throw, then gesture → still zero — "no queued blast on unlock").
  - [ ] 1b. Part A distinctness legs via the derived-signature-set oracle (feelcap:130-145 pattern): the two new names' signature sets are disjoint with each other and with all five existing names' sets — derived from the shipped module, never hard-coded twice.
  - [ ] 1c. Part A channel-truth legs (cheap, sim-derived): a crafted area-1 ceiling-straddle tick emits exactly `['ascend']`; the 4→5-then-win trace yields one tick `['ascend']` then a later tick whose events contain `'win'` and NOT `'offer'`/`'ascend'` (echoes frozen summitapproach §1.7 + game.js:271-272 splice; keep to ≤4 tickRun calls, rng stubbed).
  - [ ] 1d. Part B real-shell boot legs (bootAudioShell copy, audio.test.js:285-396 precedent): drain plumbing — a scripted run's real events reach the logged `handleEvent`; and the NFR8 double boot (audio-on vs `delete globalThis.AudioContext`) — identical scripted run, byte-identical phase+score timelines.
- [ ] Task 2 — Green: add the two VOICES entries to `js/audio.js:178-184` using `tone()` only, one-line-per-voice style, signatures disjoint per the oracle. Nothing else in the file changes (no state, no timers, no new helper unless a staggered-sequence helper keeps the table readable — if added, it must be pure scheduling over `tone()`).
- [ ] Task 3 — R1 re-contract: rewrite `tests/ceilingbreak.test.js:511-518` per the R1 spec (seven-name census replaces the absence pin; nothing else in the file changes).
- [ ] Task 4 — Verify: `./run_tests.sh` fully green; `git diff --stat` shows exactly THREE files: `js/audio.js`, `tests/ceilingbreak.test.js` (the one leg), new `tests/ascentstinger.test.js`. Confirm zero `js/shell.js` delta.
  - [ ] 4a. NFR5 red-green discipline recorded in the Dev Agent Record: quote the red run (Task 1) and the green run.

## Dev Notes

- **Do not reinvent:** the two primitives + the stagger precedent ARE the synth kit. No new AudioContext methods (no `createConstantSource`, no wavetables, no FM) — Baseline WebAudio `OscillatorNode`/`GainNode` envelopes are what everything else uses, and MDN current best practice (moderate peak gain, osc→gain→bus, schedule on currentTime) is already the house pattern. `exponentialRampToValueAtTime` must never target 0 — `tone()` already ramps to 0.001.
- **Boundary fences bind you** (`tests/boundary.test.js`, frozen): no wall-clock/DOM/storage tokens in `js/audio.js` (:103-112 scans every js/ file but shell.js), no `Math.random` in any form outside the tickRun default param (:67-80). Deterministic waveforms only — `ctx.currentTime` scheduling, fixed literals.
- **Regression surface to preserve (leave-working-end-to-end duty):** all five existing voices byte-identical in behavior (signature sets are consumed by the frozen feelcap canonicalVoices legs — if your new voice accidentally shares a (type,freq) with an existing one, feelcap won't break but THIS story's oracle will); the cold-factory no-op contract (`audio.test.js:105-115`); the gesture/suspend lifecycle (`:117-134`); the mute/volume master-gain path (new voices ride the same master gain — FR27 "respected exactly as v1 voices" holds by construction via `tone()`'s env→master wiring; verify with one muted-voice leg: `setMuted(true)` → `gainNodes[0].gain.value === 0` and an `ascend` still routes without error).
- **Testing standards:** `node:test` + `node:assert/strict`; deterministic (stub contexts, seeded rng where tickRun is driven); expectations derive from shipped module behavior (the oracle) not hardcoded tables; red-green legs written with the guard code, not at verification (architecture.md:74-76).
- **File List expectation:** `js/audio.js` (2 VOICES lines), `tests/ascentstinger.test.js` (new, ~10-16 legs), `tests/ceilingbreak.test.js` (one leg rewritten per R1), plus this story file + sprint-status in the creation commit's lineage.

### Project Structure Notes

- Paths conform: product in `js/`, one new suite in `tests/` (topic-name convention per ceilingbreak/feelcap/summitapproach precedent — module-mirroring is for module suites like audio.test.js). `[NEEDS-VERIFICATION]` none — all sites verified at authoring against 569f5ce.

### Project Context Rules

- No `project-context.md` exists in this repo; the equivalent is `AGENTS.md` (read at authoring): static files only, zero npm deps, no TypeScript, no build (NFR6); DI for all nondeterminism/IO; frozen-test discipline with the AGENTS.md:52 re-authorization exception — **this story's R1 is that written authorization**; commit full change set at story done.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md`:725-743 (story), :67-68 (FR27/FR28), :78 (NFR5), :81 (NFR8), :131 (FR16 seam — "Epic 5 adds its audio/juice layer")]
- [Source: `_bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd.md`:412-418 (audio direction: "ascent stinger (new), win fanfare (new, procedural)"), :104-108 (pillar 2: the rope is the clock)]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-jumprope-web-2026-10-28/EXPERIENCE.md`:48 (the fanfare does the celebrating — understated copy), :65 (Ascent state pattern), :67 (Win: amber + fanfare), :115 (Ana's climax — fanfare lands with `Summit.`)]
- [Source: `_bmad-output/planning-artifacts/architecture.md`:24-26, :47 (audio leaf), :54-56 (phase clock — nothing beat-locks), :71-76 (frozen-test discipline, red-green guards)]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md`:156 (the carry-in), :150-151 (re-contract precedent), :165 (Epic 5 dispositions — PS1 chiptune identity, land order 5.1→5.7)]
- [Source: `js/audio.js`:62-83, :139-169, :173-189 (all edit sites); `js/game.js`:263-279 (event arms); `js/shell.js`:666-673 (drain + D-N02)]
- [Source: `tests/ceilingbreak.test.js`:511-518 (R1 target); `tests/audio.test.js`:24-88, :105-115, :272-513 (harnesses); `tests/feelcap.test.js`:130-145 (oracle), :203-213 (stub discipline), :408-411 (NFR8 boot); `tests/summitapproach.test.js`:129-217 (channel pins); `tests/boundary.test.js`:67-80, :103-112 (fences)]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created (2026-11-09, create-story for 5.1; gate 447/447 at baseline 569f5ce, tree clean, all cited lines verified against the working tree).

### File List
