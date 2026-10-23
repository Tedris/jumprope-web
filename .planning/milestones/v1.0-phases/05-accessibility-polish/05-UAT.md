---
status: complete
phase: 05-accessibility-polish
source: [05-VERIFICATION.md]
started: "2026-10-22T20:30:00Z"
updated: 2026-10-22T21:02:40.642Z
---

## Current Test

[testing complete]

## Tests

### 1. Real browser: press P mid-run, switch tabs, switch back
expected: Audio silent the whole time behind the frozen "paused — press P to resume" frame; return does not un-suspend the context
result: pass

### 2. OS reduced-motion toggle while the game runs, both directions
expected: Wobble/shake vanish live on the next frame both ways; rope judgment unchanged; 0.25 px grid reads crawl-free
result: pass

### 3. Drag browser window to ~1000×300, then to a normal size
expected: Vertical black letterbox bars, undistorted frame; normal-size window pixel-identical to pre-phase
result: pass

### 4. Alt-tab mid-hold on a real browser, then return
expected: Jump fires with the hold-so-far or cancels cleanly — never a frozen hold on return
result: pass

### 5. Background the tab during a sub-confirm card hold on a platform that delivers visibilitychange without blur (mobile/Safari path)
expected: The hold cancels — status stays 'choose', fill cue gone, nothing auto-confirms on return
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

None — all automated checks pass (4/4 must-haves verified, suite 130/0). These five rows are the human-side edges the Node harness cannot observe (real rAF throttling, OS media-query round-trip, real compositor letterboxing, window-manager blur/visibility interleaving, real-clock hold timing on blur-less platforms).
