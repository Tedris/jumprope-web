# Phase 5: Accessibility & Polish - Context

**Gathered:** 2026-10-22
**Status:** Ready for planning

<domain>
## Phase Boundary

The game respects system preferences and survives real-world browser behavior without breaking judgment or legibility: manual pause (P/Esc) plus tab-hidden auto-pause with audio suspending and resuming alongside it (UI-01); `prefers-reduced-motion` automatically dampens the PS1 motion layer — vertex wobble and shader shake — without touching anything legibility-critical (UI-02); the 240-row low-res render path stays correct and legible at any window size via an aspect clamp band with letterboxing (UI-03); and the input reducer loses no stuck state across blur / `pointercancel` / tab-hide — no phantom jumps, no frozen holds. No new gameplay, no new UI surfaces, no audio content work. Pause/reduced-motion/resize hardening was explicitly deferred here from Phases 2–4.

Requirements: UI-01, UI-02, UI-03 (+ roadmap success criterion 4: input-reducer hardening).

</domain>

<decisions>
## Implementation Decisions

### Pause & auto-pause (UI-01)
- **D-01:** Manual pause is **P / Esc keyboard only** — no canvas gesture, no on-screen button. Touch users rely on the browser firing `visibilitychange` when the app is backgrounded, which drives the same auto-pause path. The canvas gesture vocabulary stays 100% jump-pure (consistent with Phase-3 D-01's one-button input philosophy). Verifiable: shell tests dispatch the key event mid-run and assert stepping halts. — **Reversibility:** reversible — a pointer gesture can be added later without disturbing the pause state machine itself.
- **D-02:** Paused presentation is a **freeze frame + prompt**: `tickRun` stepping halts entirely (rope freezes mid-swing, frame clock gated like hitstop), audio suspends, and the existing HUD prompt channel shows the paused state ("paused — press P to resume" style). No ambient idle animation while paused, no shader dim/fade. Verifiable: stubbed-clock shell tests count zero sim steps while paused. (Per pattern in `js/shell.js` `frame()` accumulator gate as used by Phase-4 hitstop D-N05; prompt per `updateHud` channel.)
- **D-03:** Resume routes through the **same `startRun` lead-in re-entry as a card pick** (rope to `START_PHASE` 0.33, ~0.43 s to first feet window, input locked during the lead-in per Phase-3 D-07) instead of unfreezing mid-swing — tab-return and manual-resume both land the player in a known safe rhythm window. Single startRun path per ARCH-02. — **Reversibility:** costly — this is the player's post-pause timing contract, same class as Phase-3 D-06; in-place unfreeze would re-train muscle memory on every pause.
- **D-04:** Pause applies **only to an active stepping run**. `visibilitychange` while on idle/offer/game-over just does what it does today — audio gesture/suspend (Phase-4 D-N08 path) — with no "paused" state entered. Avoids paused-over-an-offer state combinations. Verifiable: Node shell tests assert no status change when tab-hiding outside an active run.

### Reduced motion (UI-02)
- **D-05:** Under `prefers-reduced-motion: reduce`, the dampening set is **scene motion off, events stay**: vertex-snap wobble goes off/near-zero, post-pass UV shake goes to zero (it is a single shader uniform), particles still spawn but static/fade-only. Rope, character, blob shadow, HUD, and all judgment-relevant motion remain untouched (gameplay readability is protected, per the success criterion wording).
- **D-06:** The preference is **live-switching**: `matchMedia('(prefers-reduced-motion: reduce)')` is read at load and its `change` event subscribed, so mid-session OS toggles take effect immediately. **No in-game override, no persistence** — the OS setting is the single source of truth (exactly UI-02's wording). Verifiable: stubbed matchMedia tests assert dampen/undampen on the change event.

### Resize & letterbox (UI-03)
- **D-07:** **Dynamic width + clamp band**: the buffer keeps ~240 rows with width following the window aspect (Phase-2 D-01 preserved) within a sane band (roughly 3:4 to 2:1 — exact limits planner's call); outside the band the buffer is letterboxed with black bars so framing never degenerates. Normal windows render exactly as today.
- **D-08:** Upscale stays **fractional nearest-neighbor fill** — no integer-scale snapping/margins. Only the clamp band and letterbox are new.
- **D-09:** HUD text keeps a **fixed buffer-space size** — no window-size-driven text scaling; the clamp band/letterbox already handles physically tiny windows.
- **D-10:** React via the **existing `resize` listener + passive poll** (`js/shell.js:113`, `js/render3d.js:334`): re-derive band/letterbox/buffer allocation on the next frame. No `orientationchange` listener (orientation changes fire `resize` on all target browsers).

### Input-loss hardening (criterion 4)
- **D-11:** `window blur`, `visibilitychange → hidden`, and `pointercancel` all route to **one shared "release-everything" handler** that behaves exactly as if the player released at that instant: an in-progress jump charge fires with the hold time accumulated so far, a sub-confirm-threshold card hold cancels cleanly. `pointerleave`/drag-out deliberately unhandled (browsers deliver `pointerup` outside the canvas anyway). Verifiable: synthetic-event shell tests assert no `holdFrom`/charge survives each event, mid-air and mid-hold. (Per state machine in `js/shell.js:58-143`.)
- **D-12:** Any pause (manual or tab-hide) **clears pending press state** — the D-N01 forgiveness buffer and `pressIntent` — alongside the hold, so a stale press can never leak into the post-resume rhythm; the first press after the lead-in re-entry charges a normal jump (extends Phase-3 D-07's re-entry lock to pauses).

### the agent's Discretion
- Exact clamp-band limits, letterbox bar color, paused-prompt wording, wobble "off vs near-zero" value, particle fade curve under reduced motion, and whether hitstop stays under reduced motion (it is stillness, not motion — default: keep).
- Whether the pause state lives as a shell-only flag vs a `run.status` value — planner's call, respecting the purity invariant (the sim must stay pause-agnostic if the shell gates stepping instead).

### Reviewed Todos (not folded)
- **"Bring back a proper 3D jump rope to the WebGL scene"** (`.planning/todos/pending/2026-10-16-bring-back-a-proper-3d-jump-rope-to-the-webgl-scene.md`) — keyword-matched this phase but already delivered in Phase 2 (D-08–D-12) and reviewed/closed in Phase 3. No Phase 5 work; todo can be closed.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project direction
- `.planning/PROJECT.md` — constraints (pure sim core, Three.js render-only, static delivery, no post beyond simple dithering)
- `.planning/REQUIREMENTS.md` — UI-01, UI-02, UI-03 definitions (this phase's requirements)
- `.planning/ROADMAP.md` §Phase 5 — the four success criteria, incl. the input-reducer-hardening criterion

### Prior phase context
- `.planning/phases/02-ps1-presentation-scene/02-CONTEXT.md` — D-01 (240-row res, "resize/letterbox polish is Phase 5"), D-03 (max-strength wobble, "reduced-motion wires up in Phase 5"), D-16 (zero camera motion, ever); §Deferred names this phase explicitly
- `.planning/phases/03-card-catalogue-realness/03-CONTEXT.md` — D-06/D-07 (lead-in re-entry + input lock: the exact pattern pause-resume reuses), deferred reduced-motion flash dampening
- `.planning/phases/04-feel-audio/04-CONTEXT.md` — D-N05 (accumulator gate pattern pause reuses), D-N06 (shake as post-pass uniform — dampening is a uniform write), D-N08 (audio resume on visibilitychange/focus — pause suspend extends this), D-N12 (juice tier table — particle dampening hooks here)
- `.planning/phases/01-render-shell-foundation/01-CONTEXT.md` — locked sim/shell split, ARCH-01 boundary test, injected-DI conventions

### Existing code to extend
- `js/shell.js` — frame accumulator/`frame()` loop (pause gate), input reducer state machine (`holdFrom`/`pressIntent`, lines ~58-143), `resize` listener (:113), `visibilitychange`/`focus` audio gestures (:116-117), HUD prompt channel (`updateHud`/flash)
- `js/render3d.js` — vertex-snap wobble, post-pass Bayer/shake shader (dampen knobs), passive resize poll (:334), buffer allocation / blit (letterbox site)
- `js/audio.js` — `gesture()`/suspend lifecycle (D-N08) that pause-audio rides on
- `js/game.js` — `startRun` lead-in semantics (D-03 resume path), `tickRun` press parameter (D-12 buffer clearing)
- `tests/shell.test.js`, `tests/audio.test.js`, `tests/boundary.test.js` — test patterns this phase extends (stubbed clock/events, stubbed AudioContext/matchMedia)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frame()` accumulator + hitstop gate (`js/shell.js`, Phase-4 D-N05) — pausing is the same accumulator gate held open; `STEP`/`dt`/sim functions stay byte-identical.
- `startRun()` lead-in (`js/game.js`) — already the single resume path for card picks (Phase-3 D-06); pause-resume routes through it unchanged.
- Post-pass shader uniforms (`js/render3d.js`) — shake dampening is a uniform write; vertex-snap is a shader knob — reduced-motion needs no new render path.
- Juice tier table (`js/render3d.js`/shell, Phase-4 D-N06/D-N12) — particle static/fade dampening is a data-level switch here.
- HUD prompt channel (`updateHud`/`flashName` in `js/shell.js`) — carries the "paused" and resume prompts, no new DOM surface.
- AudioContext lifecycle (`js/audio.js`, D-N08) — already resumes on `visibilitychange`/`focus`; pause adds a symmetric suspend call.

### Established Patterns
- Shell owns all browser events; sim never learns pause exists (ARCH-01/boundary test) — pause state is shell-side unless the planner rules otherwise.
- Input reducer is shell-local (`holdFrom`, `pressIntent`, `LEAD_IN_MS` lock) — the release-everything handler joins the existing `pointerup`/`keyup` release path, not a new one.
- Pure/Node-testable preference handling: stub `matchMedia` like tests stub `AudioContext`/storage; inject, don't feature-sniff inline.
- Named exports, zero npm deps, no new localStorage keys introduced by this phase.

### Integration Points
- `js/shell.js` — pause state + P/Esc listener, pause gate in `frame()`, release-everything handler bound to blur/visibilitychange/pointercancel, buffer/press clearing
- `js/render3d.js` — clamp band + letterbox in the blit/resize path, reduced-motion uniforms for wobble/shake/particles, matchMedia subscription (or shell-injected flag)
- `js/audio.js` — suspend/resume calls wired to the pause lifecycle
- `js/game.js` — nothing expected beyond possibly reusing `startRun` (already exported)

</code_context>

<specifics>
## Specific Ideas

- Resume should feel identical to a card pick landing: freeze → (prompt) → the familiar ~0.43 s cold-start lead-in carries you back in. Tab-return must never drop the player into a rope they've lost track of.
- "Reduced motion" here means the PS1 *crawl and shake* go away — the rope, character, and shadow stay exactly as legibility anchors. The look loses its signature wobble; that trade was chosen deliberately.
- Normal-sized windows must be pixel-identical to today after the resize work — the clamp band is a safety rail, not a redesign.

</specifics>

<deferred>
## Deferred Ideas

- On-screen/touch pause affordance — rejected for this phase; revisit only if visibilitychange-based auto-pause proves insufficient on a target platform.
- In-game reduced-motion override toggle — rejected here (OS-only); could return as a settings phase if ever needed.
- Integer-scale "pixel-perfect" mode — rejected; revisit only if fractional-fill artifacts ever read as bugs.
- Phase-4 backlog: music track content at `audio/track.ogg` (Phase 999.1) — unchanged, human-gated, unrelated to this phase.

</deferred>

---

*Phase: 05-accessibility-polish*
*Context gathered: 2026-10-22*
