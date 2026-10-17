---
status: testing
phase: 03-card-catalogue-realness
source: [03-VERIFICATION.md]
started: 2026-10-17T17:25:00Z
updated: 2026-10-17T17:25:00Z
---

## Current Test

number: 1
name: Browser pick-gesture feel (end-of-phase UAT)
expected: |
  Cold-load the page, play to the skip-10 freeze, browse offers with presses, confirm with a ~0.8 s hold, re-enter the run. The freeze → browse → hold → single flash → lead-in re-entry rhythm reads as deliberate without a tutorial; a still-held confirm-release never launches an early jump; an early release cancels cleanly with the cursor staying put.
awaiting: user response

## Tests

### 1. Browser pick-gesture feel (end-of-phase UAT)
expected: Freeze → browse → hold → flash → lead-in re-entry reads as deliberate without a tutorial; held confirm-release never launches a jump; early release cancels cleanly with the cursor staying put.
result: issue
reported: "I don't see offers to browse through"
severity: major

### 2. HUD readability at window size
expected: During a freeze, every offer line is legible (cursor, icon, name, ×owned/cap readout, fill cue, role tint); the highlighted line's role color is obvious at a glance; the fill cue appears only on the active line; the owned-card icon strip tracks picks.
result: [pending]

### 3. PS1 scene smoke
expected: Short run through the Three.js shell renders at full window size, no first-frame shader freeze, the dithered PS1 look is unchanged by the #hud-owned addition.
result: [pending]

## Summary

total: 3
passed: 0
issues: 1
pending: 2
skipped: 0
blocked: 0

## Gaps

```yaml
- gap_id: G-03-1
  truth: "Freeze → browse → hold → flash → lead-in re-entry reads as deliberate without a tutorial; held confirm-release never launches a jump; early release cancels cleanly with the cursor staying put."
  status: failed
  reason: "User reported: I don't see offers to browse through"
  severity: major
  test: 1
  artifacts: []
  missing: []
```
