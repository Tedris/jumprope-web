# Phase 05 — UI Review

**Audited:** 2026-10-22
**Baseline:** Abstract 6-pillar standards (no UI-SPEC.md exists for this phase; audited against 05-CONTEXT.md decisions D-01–D-12 and the four roadmap success criteria)
**Screenshots:** not captured — no dev server answered on ports 3000/5173/8080; code-only audit (all visual-pillar findings are code-derived and labeled as such)
**Interaction captures:** off (workflow.ui_interaction_capture is false) — interaction findings are code-derived

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Instructional copy is strong; paused prompt omits the Esc binding and game-over omits a retry affordance |
| 2. Visuals | 3/4 | Clear hierarchy and disciplined accent use; idle arms/scarf still oscillate under reduced motion (open WR-02) |
| 3. Color | 4/4 | Restrained neutral palette; the five role accents appear only on the highlighted card line — purposeful, contract-aligned |
| 4. Typography | 4/4 | Exactly 3 sizes (16/20/32 px), one weight, fixed per D-09 — no issues found |
| 5. Spacing | 3/4 | CSS spacing is minimal and consistent, but the viewport-anchored `#hud` does not follow the letterboxed canvas box at extreme portrait aspects |
| 6. Experience Design | 3/4 | Excellent state machinery (pause/reduced-motion/input-loss all covered, 130/0 suite); residual motion gap (WR-02), fully silent HUD for assistive tech (`aria-hidden`), fire-and-forget audio Promises (IN-02) |

**Overall: 20/24**

---

## Top 3 Priority Fixes

1. **Reduced-motion idle pose is not still (WR-02, open)** — under `prefers-reduced-motion: reduce`, `js/render3d.js:384-386` correctly stills the bob and twirl, but `beat = now / 1400` (line 387) still drives `armL/armR.rotation.x` (lines 388-389) and the scarf chain (lines 423-425) off the wall clock — the player's "everything stops" contract is visibly violated on the idle screen. Fix: in the idle branch set `beat = reduced ? 0 : now / 1400;` — one line; the scarf loop then holds a static trailing pose, and the running branch (beat = theta, judgment motion) is untouched per D-05.
2. **HUD floats over letterbox bars at extreme portrait aspects** — `css/style.css:11-18` anchors `#hud` to the viewport (`position: absolute; inset: 0; padding-top: 2.5rem`) while `applyWindowSize()` shrinks the canvas box to the clamp band. At e.g. 300×900 the canvas box is 300×400 centered (top at ~y=250) but the score/prompt render at ~y=40 — on the black bar, visually detached from the game frame (code-derived; no screenshots captured). Fix: have `applyWindowSize()` also mirror the box offset onto `#hud` (e.g. set its `top`/`left`/`height` to the canvas box rect), or wrap canvas + hud in a single sized container.
3. **Copy gaps on two prompts** — `js/shell.js:350` says "paused — press P to resume" but Esc is an equally bound toggle (`shell.js:218`, D-01); `shell.js:356` shows "Missed! Score N" with no indication that press/tap restarts (the release-restart path at `shell.js:293-297` is the only exit). Fix: "paused — press P or Esc to resume" and "Missed! Score N — press space / tap to retry".

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

Audit method: string-literal sweep of `js/shell.js` `updateHud()` (the only user-visible copy surface) and `js/audio.js`.

**Strengths:**
- No generic labels anywhere — no "Submit"/"OK"/"Error occurred" patterns; all copy is instructional and specific: `press space / tap to start` (shell.js:358), `press space / tap when the rope reaches your feet` (shell.js:363), `paused — press P to resume` (shell.js:350).
- Graceful degradation copy exists: `(audio off)` diagnostic is appended to the idle prompt when the audio module fails to load (`shell.js:68,125,359`) — silent failure made visible without alarming the player.
- The card-fill cue `[#####-]` (`shell.js:334`) communicates hold progress without a words.

**Findings:**
- **WARNING** — `shell.js:350`: the paused prompt names only P; the keydown branch binds `KeyP || Escape` identically (`shell.js:218`, decision D-01). Esc users get no affordance confirmation.
- **WARNING** — `shell.js:356`: the game-over prompt reports the score but never states how to restart; the restart path (release on `over`, `shell.js:293-297`) is discoverable only by trial. The idle screen right after boot DOES carry the affordance ("press space / tap to start") — inconsistent coverage of the same mechanic.
- The `Missed!` phrasing is consistent with the trip vocabulary used by the audio/juice layers — no change recommended.

### Pillar 2: Visuals (3/4)

Audit method: component-structure and hierarchy review of `css/style.css`, `index.html`, plus dampen-site review of `js/render3d.js`. No screenshots — visual judgments are code-derived.

**Strengths:**
- Clear focal point: centered canvas (body grid, style.css:5), 32 px score dominant over 20 px owned and 16 px prompt — hierarchy by size, no icon-only controls, no competing elements.
- Pause presentation matches D-02 exactly: freeze frame (accumulator gate `shell.js:376,384`) plus one text prompt — no shader dim, no idle animation fighting the freeze.
- Accent discipline: the five role colors (`style.css:30-34`) are applied only to the highlighted card line via `roleClass` (`shell.js:354,366`) — a single declared element class, per the phase's own CARD-02 rule.

**Findings:**
- **WARNING** — `js/render3d.js:387-389,423-425`: under reduced motion the idle character's arms and scarf keep oscillating off the wall clock (WR-02, already open in `05-REVIEW-DISPOSITION.md`). The 05-02 SUMMARY claims "idle bob/twirl at rest"; the pose is not fully at rest. Fix in Top-3 #1.
- **BLOCKER-adjacent check, passed**: the dampen sites that were claimed (SNAP_OFF grid `render3d.js:97-104,312,350-352`, shake at the single write site `:436`, particle position pin `:458`, trip settle exactly `-Math.PI` `:399`) are all present in shipped code and pinned by 6 passing render3d legs.
- **WARNING** — HUD-over-bars misanchoring at extreme portrait aspects (see Top-3 #2); also visible as a visual break (cream text on black bar with the game frame 200+ px below).

### Pillar 3: Color (4/4)

Audit method: CSS custom-property/hex sweep (`grep '#[0-9a-fA-F]{3,8}'` over css/ and js/).

- Palette: `#000` letterbox (style.css:4), `#2a3440` canvas ground (`:9`), `#f4f0d8` text (`:19`) — neutral ground dominates; the five role hexes (`:30-34`) are the entire accent set and appear only on the highlighted card line. Text-on-bar contrast (`#f4f0d8` on `#000`) exceeds 15:1; even the dimmest accent (`role-slate #9aa7b4`) clears ~8:1 on black.
- No `rgb()`, no inline color writes from JS; the 3D scene palette lives in `render3d.js` material hexes and the Bayer/quantize post-pass — unchanged by this phase (`git diff` clean per 05-03 purity gate). Caveat noted: the in-scene 60/30/10 distribution could not be visually verified without screenshots; the DOM-surface evidence is clean.

### Pillar 4: Typography (4/4)

- Exactly 3 sizes declared: 16 px base, 32 px `#hud-score`, 20 px `#hud-owned` (style.css:20,25,27); one weight (default normal, no `font-weight` anywhere). Well within the ≤4 sizes / ≤2 weights standard.
- `white-space: pre-line` (`:26`) correctly turns the `\n`-joined offer list into multiline text.
- D-09 honored: no window-size-driven text scaling — grep confirms no `vw`/`vh`/`clamp()` font sizing; the clamp band/letterbox carries small-window legibility as decided.
- No issues found.

### Pillar 5: Spacing (3/4)

- CSS spacing is minimal and consistent: `margin: 0`, `gap: 4px`, `padding-top: 2.5rem` — no arbitrary one-off values, no spacing drift between components.
- The letterbox box math is genuinely well-behaved: `applyWindowSize()` (`shell.js:41-49`) writes the CSS box and the backing buffer together (Pitfall 9 mitigation verified in code), the band is pinned `[3/4, 2]` (`:32-33`), garbage metrics are coerced via `Number(x) || 480/640` (`:25`) with a `Math.max(2, …)` floor (`:48`), and all four resize legs pass.
- **WARNING** — `css/style.css:11-18` + `js/shell.js:41-49`: the HUD overlay is positioned against the viewport while the canvas box is band-clamped, so vertical margins between frame and text vary with window aspect — the one place spacing degenerates (Top-3 #2). Also **INFO** (IN-03, disposition open): for sub-2 px windows the `Math.max(2, …)` floor desynchronizes `canvas.style` size from the buffer size — cosmetically irrelevant, but a box/buffer disagreement nonetheless.

### Pillar 6: Experience Design (3/4)

Audit method: state-coverage sweep across `js/shell.js` + cross-check against `05-REVIEW-DISPOSITION.md` and `05-UAT.md`.

**Strengths (verified in shipped code, all 130 suite legs pass / 0 fail — re-run confirmed at audit time):**
- Loading/degraded states: audio-import failure → visible `(audio off)` diagnostic; render exceptions caught per-frame (`shell.js:419-423`) so one bad frame never kills the loop; storage failures degrade to session-only best.
- Pause experience is thorough: manual + tab-hidden pause, audio suspend/resume symmetric pair (`audio.js:82-87`), lead-in re-entry with the D-07 lock, buffer clearing (D-12), CR-01 guard `audioReady && !paused` on both the visible leg (`shell.js:251`) and focus listener (`:256`) — the "no event resurrects a paused context" invariant holds in code.
- Input-loss hardening is exemplary: one shared `releaseEverything()` (`shell.js:150-164`) routes blur/pointercancel/hidden, fires the mid-charge jump with hold-so-far, cancels sub-confirm card holds cleanly, and cannot spoof a restart from the `over` screen (T-05-07 guard). All 5 real-browser UAT rows passed.

**Findings:**
- **WARNING** — reduced motion still leaves idle arms/scarf moving (WR-02, open; see Pillar 2 / Top-3 #1). The phase's headline accessibility promise is ~90% kept; the residue is on the idle screen where a motion-sensitive user first lands.
- **WARNING** — `index.html:19` `aria-hidden="true"` on `#hud`: assistive tech receives nothing — not the pause state, not game over, not the score. Canvas has no role/label/fallback text either. Screen-reader users cannot tell paused from running. Understandable for a rhythm game and outside UI-01–03's letter, but this phase is titled "Accessibility" — at minimum an `aria-live="polite"` region mirroring the prompt would close the gap.
- **INFO** — IN-02 (open): `ctx.suspend()`/`ctx.resume()` Promises are fire-and-forget (`audio.js:75,86`); a rejected promise surfaces as an unhandled rejection. One-line `.catch(() => {})` each.
- **INFO** — IN-01 (open): the `paused ||` disjunct in the in-loop drain gate (`shell.js:384`) is dead code — `acc` is already zeroed at `:376`, so the loop never enters. Harmless; remove or keep as defense-in-depth with an honest comment.
- **INFO** — a persistent render failure spams `console.error` at 60 Hz (`shell.js:422`) with no on-screen signal; consider one-shot reporting.

---

## Registry Safety

No `components.json` — shadcn not initialized, no third-party registries declared. Registry audit skipped by design. (Third-party surface is the pinned `three@0.186.1` jsdelivr importmap entry, `index.html:12` — untouched this phase.)

---

## Files Audited

- `js/shell.js` (full — pause gate, releaseEverything, applyWindowSize, matchMedia wiring, updateHud copy)
- `js/render3d.js` (render loop lines 340-487, dampen sites, snapGridFor region)
- `js/audio.js` (gesture/suspend lifecycle)
- `css/style.css`, `index.html` (full)
- `.planning/phases/05-accessibility-polish/` — 05-01…05-05 PLAN/SUMMARY, 05-CONTEXT.md, 05-REVIEW-DISPOSITION.md, 05-VERIFICATION.md, 05-UAT.md
- Test evidence: `node --test tests/` re-run at audit time — 130 pass / 0 fail
