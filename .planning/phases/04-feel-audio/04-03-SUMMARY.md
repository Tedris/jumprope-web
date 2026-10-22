---
phase: 04-feel-audio
plan: 03
subsystem: audio
tags: [webaudio, procedural-sfx, audiocontext-lifecycle, storage-seam, master-bus]

requires:
  - phase: 01-render-shell-foundation
    provides: "pure-core boundary fence (D-01), injected-storage seam (loadBest/saveBest pattern), shell frame loop the audio seam wires into"
provides:
  - "js/audio.js — leaf audio module: create-on-first-gesture AudioContext lifecycle, five procedural SFX voices (jump/skip/nearMiss/trip/pick) through one envelope→master funnel, looping track source on the shared master bus with graceful absence, write-through { muted, volume } persistence under key 'jumprope-audio'"
  - "shell audio seam: gesture-driven lifecycle wiring in js/shell.js; sim import graph gains zero audio references (D-N09 boundary holds)"
  - "tests/audio.test.js — 9 tests: lifecycle inertness, create-once/resume-only, voice map, track degrade, settings coercion, one-bus routing, three shell-seam end-to-end tests on stubbed AudioContext + storage"
affects: [phase-4-04-capstone, phase-5-polish, any future audio content or mixer work]

actuals:
  tokens: 7300
  tasks: 2
  commits: 1
  plan_head_before: de46879cb3518a588bea706734ce459f01d42d16
  plan_head_after: 28e4d910aa93a0c2f8949fdd2820d9a7b008f56c

tech-stack:
  added: []
  patterns:
    - "leaf-module audio containment: js/audio.js imports nothing, imported only by js/shell.js — the Phase-1 `three` containment trick reused for WebAudio (D-N07)"
    - "create-on-gesture / resume-on-every-gesture context lifecycle, never constructed at load (D-N08)"
    - "shape-pinned storage read (muted === true, Number() + clamp) under one key, try/catch → defaults (T-4-06)"

key-files:
  created:
    - js/audio.js
    - tests/audio.test.js
  modified:
    - js/shell.js

key-decisions:
  - "All five SFX procedurally synthesized (zero binary assets, zero npm deps); track is the only audio file and degrades to silence + trackMissing flag when absent (D-N09)"
  - "Settings persisted under single key 'jumprope-audio' via the injected-storage seam — escalated and user-approved (D-N10)"
  - "Voice timbre parameters are implementer's choice within 'distinct, <300 ms, chiptune-ish'; tests assert mapping and routing, not sound (morning-UAT subjectivity line kept)"

patterns-established:
  - "Audio-free determinism: audio layer reads events only, never writes sim state — the rope never locks to music (AUD-02)"

requirements-completed: [AUD-01, AUD-02, AUD-03, AUD-04]

coverage:
  - id: D1
    description: "AudioContext never exists until the first tap; created once, resumed on every later gesture/visibility return"
    requirement: "AUD-03"
    verification:
      - kind: unit
        ref: "tests/audio.test.js#cold import + factory create nothing; audio is inert pre-gesture (D-N08)"
        status: pass
      - kind: unit
        ref: "tests/audio.test.js#gesture is the only lifecycle site: create-once, resume-on-gesture (D-N08/AUD-03)"
        status: pass
      - kind: integration
        ref: "tests/audio.test.js#shell seam: zero contexts cold, one on first tap, resume-only after (AUD-03 end-to-end)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each gameplay event (jump/skip/nearMiss/trip/pick) triggers exactly one distinct voice; unknown events stay silent"
    requirement: "AUD-01"
    verification:
      - kind: unit
        ref: "tests/audio.test.js#voice map: one voice per event, unknown names and offer silent (AUD-01)"
        status: pass
      - kind: integration
        ref: "tests/audio.test.js#shell seam: real channel drives jump/skip/trip voices and exactly one pick"
        status: pass
    human_judgment: true
    rationale: "Tests pin one-voice-per-event routing, not timbre — whether the five voices sound distinct and right is morning-playtest judgment (plan 04-03 subjectivity line)."
  - id: D3
    description: "One background track loops through the shared master bus when audio/track.ogg exists; absent file degrades to silence with a flag, never an error"
    requirement: "AUD-02"
    verification:
      - kind: unit
        ref: "tests/audio.test.js#track: absent file = flag + silence, present file = one looping source on the bus (D-N09)"
        status: pass
      - kind: unit
        ref: "tests/audio.test.js#one bus: volume changes land on the SAME master gain the voices chain into (D-N09)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Mute/volume persist across reloads through the injected-storage seam; junk stored data coerces to defaults"
    requirement: "AUD-04"
    verification:
      - kind: unit
        ref: "tests/audio.test.js#settings: single-key round-trip, write-through, coercion, graceful degradation (AUD-04/T-4-06)"
        status: pass
      - kind: integration
        ref: "tests/audio.test.js#shell seam: Minus/Mute adjust + persist without touching the reducer; mute survives reload (AUD-04)"
        status: pass
    human_judgment: false

duration: 24min
completed: 2026-10-22
status: complete
---

# Phase 4, Plan 03: Audio System — Summary

**One new leaf module (js/audio.js) gives the game its voice: five procedurally-synthesized SFX ride the shell's event channel through a single master bus, the AudioContext wakes on the first tap and only the first tap, the (not-yet-delivered) vibe track loops or degrades to silence, and mute/volume survive reloads through the established storage seam — while the sim import graph gains zero audio references.**

> **Provenance:** executed off-ledger by the night loop (item `GSD-04-03`, 2026-10-22 02:41–03:05, gate green on attempt iter 4, commit `28e4d91`). SUMMARY backfilled by the orchestrator during `/gsd-execute-phase 4` safe-resume close-out; all 9 tests re-verified green on the current tree before writing.

## Performance

- **Duration:** ~24 min wall-clock (night-loop iteration 4 → check)
- **Tasks:** 2 (audio module + shell seam) — as planned
- **Commits:** 1 (`28e4d91`)

## What Was Built

Per the plan's two tasks, verified against the shipped diff:

1. **`js/audio.js`** (leaf — zero imports, zero browser-IO/`Math.random` literals): `loadSettings`/`saveSettings` under the single key `jumprope-audio` via the injected-storage seam (D-N10, shape-pinned read per T-4-06); `createAudio({ context, storage, fetchFn })` with create-once/resume-on-gesture lifecycle (D-N08); five procedural voices (square blip jump, triangle tick skip, double-tick nearMiss, LCG-noise + lowpass-sweep trip, two-note arpeggio pick — each ≤300 ms through one envelope→master funnel); `playTrack('audio/track.ogg')` looping an `AudioBufferSourceNode` on the shared master bus, degrading to `trackMissing` + silence when the file is absent (D-N09); write-through `setMuted`/`setVolume`/`toggleMute` (AUD-04).
2. **`js/shell.js` wiring** (+50 lines): gesture → lifecycle, event channel → voices, Minus/Mute keys → settings; `grep -rin audio js/` outside shell/audio confirms the containment; boundary ARCH-02 green.
3. **`tests/audio.test.js`** — 9 tests, all green; suite grew 75 → 84.

## Deviation from Plan (recorded by the night loop)

- Boundary ARCH-02 initially flagged a literal inside an audio.js **comment**; fixed by rewording — no contract change.

## Verification

- `node --test tests/` → 84/84 pass (re-run at close-out on the current tree).
- Audio-free determinism holds structurally: `js/audio.js` imports nothing; only `js/shell.js` imports it (checked at close-out).

## Requirements Completed

**AUD-01, AUD-02, AUD-03, AUD-04** — timbre distinctness carried to human UAT (coverage D2).

## Note for the Capstone (04-04)

Plan 04-04's threat register was renumbered T-4-06/07 → T-4-09/10 during this run's #4683 duplicate gate; its audio assertions reference this plan's module, not its threat IDs.

## Self-Check: PASSED
- js/audio.js exists; js/shell.js audio wiring exists; tests/audio.test.js exists and green (9 tests).
- Commits 28e4d91 reachable from HEAD.
