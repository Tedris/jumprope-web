# Phase 5: Accessibility & Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-22
**Phase:** 05-Accessibility & Polish
**Areas discussed:** Pause gesture & resume feel, Reduced-motion vocabulary, Resize & letterbox policy, Input-loss semantics

---

## Pause gesture & resume feel

### Q: How does the player pause on demand?

| Option | Description | Selected |
|--------|-------------|----------|
| P / Esc key only | Keyboard-only manual pause; touch users rely on visibilitychange auto-pause. Canvas gestures stay 100% jump-pure. | ✓ |
| P/Esc + long-press pause | Long pointer hold as touch path to pause; risks collision with jump-charge/confirm holds. | |
| Dedicated on-screen pause button | Small DOM/HUD corner button; new DOM surface breaks the one-render-path PS1 style. | |

**User's choice:** P / Esc key only
**Notes:** Consistent with the one-button design philosophy locked in Phase 3.

### Q: What does the game look like while paused (manual and tab-hidden alike)?

| Option | Description | Selected |
|--------|-------------|----------|
| Freeze frame + prompt | Sim stepping halts entirely (rope freezes mid-swing), audio suspends, HUD prompt shows paused state. | ✓ |
| Freeze sim, ambient idle anim | Scene keeps idle-style ambient animation so it doesn't look crashed; more shell work. | |
| Freeze + dim fade | Fade/darken via shader uniform with prompt on top. | |

**User's choice:** Freeze frame + prompt

### Q: How does resuming after a pause feel (also decides tab-return)?

| Option | Description | Selected |
|--------|-------------|----------|
| Lead-in re-entry | Same startRun lead-in as a card pick (~0.43 s to first feet window, input locked per D-07). | ✓ |
| Unfreeze in place | Resume exactly where the rope stopped; risks unfair trips after the player's rhythm is gone. | |

**User's choice:** Lead-in re-entry

### Q: When does pause apply?

| Option | Description | Selected |
|--------|-------------|----------|
| Active run only | P/Esc toggles pause only while a run is stepping; tab-hide on idle/offer/game-over just suspends audio (D-N08 path). | ✓ |
| Pause every state | Explicit paused status over every screen; more states to test. | |

**User's choice:** Active run only

---

## Reduced-motion vocabulary

### Q: Which motion effects get dampened under prefers-reduced-motion, and how far?

| Option | Description | Selected |
|--------|-------------|----------|
| Scene motion off, events stay | Vertex-snap wobble off/near-zero, UV shake zero, particles static/fade-only; rope/character/shadow/HUD untouched. | ✓ |
| Reduce everything, keep wobble faint | Keep signature wobble at reduced amplitude; reduced-motion purists expect the crawl gone. | |
| Maximum reduction | Also freeze idle bob/scarf sway and replace flashes with fades. | |

**User's choice:** Scene motion off, events stay

### Q: Should the preference react live to OS setting changes mid-session?

| Option | Description | Selected |
|--------|-------------|----------|
| Live-switching | matchMedia change-event subscription; OS toggles take effect immediately. | ✓ |
| Latch at load | Read once at startup; requires page reload. | |

**User's choice:** Live-switching

### Q: Any in-game override of the reduced-motion behavior?

| Option | Description | Selected |
|--------|-------------|----------|
| Automatic only | OS preference is the single source of truth; zero UI surface, zero persistence. | ✓ |
| Add in-game override | Shortcut cycling auto/reduced, persisted; adds a third state and a storage key. | |

**User's choice:** Automatic only

---

## Resize & letterbox policy

### Q: What should happen at extreme window shapes?

| Option | Description | Selected |
|--------|-------------|----------|
| Dynamic width + clamp band | Width follows aspect within ~3:4..~2:1; beyond the band, letterbox the 240-row buffer. Normal windows unchanged. | ✓ |
| Fixed aspect, letterbox always | One fixed aspect everywhere; big bars on ultrawide. | |
| Stay fully dynamic | No band or bars; composition stretches at silly aspects. | |

**User's choice:** Dynamic width + clamp band

### Q: Fractional fill or pixel-perfect integer scaling?

| Option | Description | Selected |
|--------|-------------|----------|
| Fractional fill (status quo) | Nearest-neighbor any-factor upscale, always fills the canvas; only the clamp band is new. | ✓ |
| Integer scale + margins | Crisp integer pixels with black margins at common sizes; changes today's full-fill look. | |

**User's choice:** Fractional fill (status quo)

### Q: How does HUD text stay legible in physically small windows?

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed buffer-space size | HUD text stays fixed size in the 240-row buffer; clamp band/letterbox handles tiny windows. | ✓ |
| Scale text by window size | Text grows on physically small windows; needs a HUD text-scale knob. | |

**User's choice:** Fixed buffer-space size

### Q: Special resize/orientation handling, or the existing resize path?

| Option | Description | Selected |
|--------|-------------|----------|
| Resize event only | Keep existing listener + passive poll; orientation changes fire resize on all target browsers. | ✓ |
| Add orientationchange too | Explicit phone-rotation listener; mostly redundant. | |

**User's choice:** Resize event only

---

## Input-loss semantics

### Q: Mid-hold when blur / pointercancel / tab-hide hits — what happens to the pending hold?

| Option | Description | Selected |
|--------|-------------|----------|
| Treat as release now | Release-everything path behaves as if the player released at that instant (jump fires with hold accumulated so far; sub-threshold card hold cancels). | ✓ |
| Discard the charge | Zero the charge, no jump; punishes players whose browser ate a pointercancel mid-jump. | |
| Preserve hold across blur | Hold timer keeps running across the blur; can launch a max jump at a random moment after return. | |

**User's choice:** Treat as release now

### Q: What happens to a press sitting in the D-N01 forgiveness buffer when a pause interrupts?

| Option | Description | Selected |
|--------|-------------|----------|
| Clear on pause | Pause clears the forgiveness buffer and pressIntent alongside the hold; first press after re-entry is a clean normal charge. | ✓ |
| Keep the buffer alive | Buffered press survives into the resumed run; buffer has decayed against wall-clock anyway. | |

**User's choice:** Clear on pause

### Q: Which events count as "input lost" and fire the release-everything handler?

| Option | Description | Selected |
|--------|-------------|----------|
| blur + hidden + cancel | window blur, visibilitychange→hidden, pointercancel — the real-world failure modes named in the roadmap. | ✓ |
| Add pointerleave too | Also pointer leaving the canvas; browsers already deliver pointerup outside the canvas — likely dead code. | |

**User's choice:** blur + hidden + cancel

---

## the agent's Discretion

- Exact clamp-band limits, letterbox bar color, paused-prompt wording, wobble "off vs near-zero" value, particle fade curve under reduced motion, hitstop behavior under reduced motion (default: keep).
- Pause state as shell-only flag vs `run.status` value — planner's call, respecting the purity invariant.

## Deferred Ideas

- On-screen/touch pause affordance — revisit only if visibilitychange-based auto-pause proves insufficient.
- In-game reduced-motion override toggle — rejected here (OS-only).
- Integer-scale "pixel-perfect" mode — rejected; revisit only if fractional-fill artifacts read as bugs.
- Phase-4 backlog: music track content at `audio/track.ogg` (Phase 999.1) — unchanged, human-gated.
