---
created: 2026-10-16T22:13:43.841Z
title: Bring back a proper 3D jump rope to the WebGL scene
area: ui
severity: major
files:
  - js/render3d.js:8-10
  - js/render3d.js:35-44
  - js/rope.js:14-16
audit_acknowledged:
  milestone: v1.0
  at: 2026-10-22
---

## Problem

The Phase 1 placeholder scene never brought the rope itself into 3D: the only visual cue for the rope is a flat brown obstacle box sweeping horizontally via `worldX(phase)` (js/render3d.js:8-10), while the old Canvas 2D prototype drew an actual rope arc. The core-value promise — judging the jump purely from the rope's arrival — currently rides on a proxy box, and nothing rope-like renders at all.

## Solution

TBD — likely in Phase 2 (PS1 Presentation & Scene), whose success criterion 3 already requires "rope readable against the floor through the whole arc". Approach hints: draw a real swinging rope mesh (low-poly tube/segmented arc around the player) driven by the canonical `rope.phase` clock with the same prev/curr `lerpPhase` interpolation (js/interpolate.js) so visuals never drift from scoring; keep the obstacle/shadow as a depth cue rather than the primary timing signal. Sim stays pure — phase remains the single time source.
