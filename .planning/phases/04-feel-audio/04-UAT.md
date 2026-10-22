---
status: testing
phase: 04-feel-audio
source: [04-VERIFICATION.md]
started: 2026-10-22T14:40:00Z
updated: 2026-10-22T14:40:00Z
---

## Current Test

number: 1
name: Forgiveness feel in live play
expected: |
  Serve the repo and play. Presses deliberately a touch late at the rope land as
  forgiven skips (with a near-miss "CLOSE!" flash) instead of trips; grossly early/late
  presses still trip cleanly. The forgiveness feels generous, not cheating.
awaiting: user response

## Tests

### 1. Forgiveness feel in live play
expected: A slightly-late press at the feet window converts a would-be trip into a counted skip with near-miss feedback; clearly-missed presses still trip. Mechanics pinned by tests/feel.test.js + feelcap leg 1 — the deliverable is the feel.
result: [pending]

### 2. Juice weight scaling
expected: Skip / near-miss / trip juice visibly escalates in weight (hitstop, shake, particles) — skip subtle, trip heavy. If taste disagrees, JUICE_TIERS is a data-only re-tune (D-N12).
result: [pending]

### 3. Five-voice timbre distinctness
expected: jump / skip / nearMiss / trip / pick each sound distinct and short, chiptune-punchy, never overlapping into mush. Routing is machine-pinned; sound quality is the judgment.
result: [pending]

### 4. First-press audio matrix
expected: Cold load in Chrome, Firefox, and iOS Safari: the FIRST tap both starts the game and is audible; no silent broken state; console clean. (Criterion 4 is an explicit human gate.)
result: [pending]

### 5. Mute/volume across browser reload
expected: Toggle mute (Mute key), set volume (Minus/Equal), reload the page — settings persist and audio honors them immediately on the new boot.
result: [pending]

### 6. Track decision
expected: Either supply audio/track.ogg (loops under the rope, shares master bus, never steers timing) or explicitly accept silence — the mechanism is tested both ways; the content is the human-gated call (04-CONTEXT <deferred>).
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
