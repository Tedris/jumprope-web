# Phase 02 — UI Review

**Audited:** 2026-10-16
**Baseline:** `02-UI-SPEC.md` design contract (approved values from the 02-01 look sign-off)
**Screenshots:** NOT captured — no dev server answered on ports 3000/5173/8080 and no browser capture capability in this environment. **This is a code-only static audit against the contract; every perceptual judgment below is made from source, not pixels.** This compounds the coverage gaps already flagged in the SUMMARYs (all `manual_procedural` checks carry `status: unknown`, deferred to end-of-phase UAT).

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All four contract strings present verbatim in `js/shell.js:77-83`; zero generic labels |
| 2. Visuals | 3/4 | Scene contract substantially met in code; the theta⇔feet beat-coincidence and spike brightness parity have never been eyeballed (all human-checks `unknown`) |
| 3. Color | 2/4 | `css/style.css:18` still `color: #222` — the exact defect the UI-SPEC named as a must-not-silently-pass (≈1.2:1 contrast, score readout effectively invisible over sky `#2a3440`); off-palette page background `#1a1a2e` (`css/style.css:1`) |
| 4. Typography | 3/4 | Two sizes / one weight contract exactly met; but the section's explicit **legibility requirement fails** via the `#222` text color |
| 5. Spacing | 3/4 | Both CSS tokens exact (4px gap, 2.5rem pad); silhouette positions drift from the spec's "at x ±14" wording (keep-out rule itself is respected) |
| 6. Experience Design | 3/4 | Precompile, coerce-don't-reject, render-isolation all present; `#hud` is `aria-hidden="true"` (score invisible to AT) and the trip-release race can skip the game-over screen |

**Overall: 18/24**

**Findings classification:** 1 BLOCKER-adjacent contract violation (HUD legibility — named in the spec itself), 5 WARNINGs, several informational.

---

## Top 3 Priority Fixes

1. **`#hud { color: #222 }` over dark sky — the score readout is invisible** (`css/style.css:18`). The UI-SPEC Typography §Legibility calls this out verbatim: "measures ≈ 1.2:1 … **Contract value: `#hud { color: #f4f0d8 }`** … treat this as a documented, visible defect rather than a silent pass — it is a one-line change and the score is a core readout." Fix: change `#222` → `#f4f0d8` (already in palette for the rope; no new hue enters). This is the single highest-value pixel change in the phase.
2. **Page background `#1a1a2e` is off-palette** (`css/style.css:1`). The contract's canvas rule rationale is "canvas background = sky hex `#2a3440` so the pre-first-frame page never flashes a foreign color" — but the `html/body` background behind the canvas is `#1a1a2e`, a color that appears nowhere in the signed-off palette, and it can flash before first paint / during resize gaps. Fix: `html, body { background: #2a3440 }`.
3. **Run the owed end-of-phase visual UAT before closing the phase.** Every perceptual gate — theta⇔feet beat coincidence (02-03 D1, called out as "the phase's worst failure mode"), rope readability top-to-bottom through the dither (D2), spike brightness parity / sRGB path correctness (02-02 D3), idle life and trip settle (D3) — has `status: unknown`. Automated gates prove wiring, not the frame. No screenshots exist for this audit either. Serve the directory (`python3 -m http.server 8080`) and walk the four deferred human-checks against `.planning/spikes/ps1-look.html`.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

All Copywriting Contract strings verified against `js/shell.js updateHud`:

| Contract element | Contract copy | Actual | Verdict |
|---|---|---|---|
| Idle CTA | "press space / tap to start" | `js/shell.js:81` — verbatim | ✅ |
| Running prompt | "press space / tap when the rope reaches your feet" | `js/shell.js:83` — **the required "box→rope" fix shipped** (02-03 deviation #1, commit e4f329d) | ✅ |
| Game-over | "Missed! Score {N}" | `js/shell.js:79` — verbatim, no retry label | ✅ |
| Choose | "{name} — {desc} — tap / space to pick" | `js/shell.js:77` — verbatim placeholder cadence | ✅ |
| Score readout | number + "best {N}", `best = max(storedBest, run.score)` | `js/shell.js:73-74` — `Math.max(best, run.score)` exact | ✅ |
| Destructive confirmation | none | none | ✅ |

Generic-label greps (`Submit|Click Here|No data|No results|went wrong|try again`) return zero hits.

**Minor notes (not scored down):** the running prompt is gated on `run.skips === 0` (`shell.js:82`) — it disappears after the first skip; the spec table doesn't condition it, but as a one-time teaching string this reads as intentional. Choose-state picks `offer[0]` only (`shell.js:62`) — placeholder cadence, documented as Phase 3 scope.

### Pillar 2: Visuals (3/4)

Rendered Scene Contract checked line-by-line against `js/render3d.js`:

- **Camera (D-16):** `(2.6, 2.2, 8.6)` → `lookAt(0, 1, 0)` exact (`render3d.js:245-246`). Grep confirms **zero camera position/lookAt mutation in `render()`** — only `aspect` updates on resize (`render3d.js:270-271`), which is framing maintenance, not motion. FOV 50→40 is a documented discretion call (subject frame-fraction parity with the spike); acceptable within the D-16 envelope but **unverified on screen** — the summary itself says "re-tune at the UAT if the frame reads wrong."
- **Pipeline contract:** 240 rows / `Math.max(2,…)` clamp (`:73-74`), NearestFilter + no mipmaps + pixelRatio 1 (`:70-78`), snap after `#include <project_vertex>` with w preserved (`:56-61`), `customProgramCacheKey = 'ps1-snap'` (`:65`), sRGB-then-Bayer-then-31-level single pass indexed at `floor(vUv * uInternalRes)` (`:41-46`), fog 7/22 sky-matched (`:92`), one 2.4-intensity white directional at (−4,7,3) with no ambient (`:21,237-239`). All exact.
- **Character (D-13/14/15):** 0.55 head cube (`:148`), dot-block eyes ×2 (`:154-160`), limb groups, 3-segment scarf chain with `beat − k*0.4` lag (`:164-175, :350-352`). All pose quantities derive from `theta = phase × 2π` + `player.y`/`squash`; zero `new THREE` inside `render()`; no mixer/clips; no RNG (`Math.random` grep clean). ✅
- **Rope (D-08–D-12):** sag-baked 16-pt `CatmullRomCurve3` → one `TubeGeometry(…, 0.05)` (`:207-226`), unlit pale `MeshBasicMaterial({ fog: false })`, snap-exempt, two dark handles at pivot rim (`:229-235`). Trip: pivot frozen at −π with `sin(Δ*42) * exp(−Δ/200)` on `view.now` deltas, closed-form, no accumulators (`:330-331`). ✅
- **Depth cue (D-17):** r 0.55 / opacity 0.45 disc, MeshBasic (snap-exempt), `scale = opacity/0.45 = 1/(1 + y·0.01·0.8)` formulas verbatim (`:122-128, :355-356`). ✅

**Deductions:**
1. **Zero perceptual verification exists.** All `human_judgment: true` coverage rows across the three SUMMARYs are `status: unknown`. The theta⇔feet mapping — the phase's own named "worst failure mode" — is pinned only analytically + by comment (`:338-341`). If the sign or offset is wrong, the rope visibly misses the feet at the score tick and no test catches it.
2. **Cap coloring deviates from the spec's letter:** contract says rose on "torso + head cap"; implementation puts rose on the head with a **prop-dark cap** (`:151`), an acknowledged interpretation (02-03 discretion #3). The accent-reservation rule still holds (rose only on torso/head/scarf), so this is wording drift, not palette drift.
3. Eyes face +Z while the camera sits mostly side-on (`x 2.6, z 8.6` is actually mostly frontal — fine) — no finding, verified.

### Pillar 3: Color (2/4)

Palette constants in `render3d.js:12-16` are the five contract hexes exactly; scene usage matches reservations:
- Rose: torso, head, scarf only (`:96,140,148,169`) ✅ — not the rope, not the stage.
- Pale: rope tube only in-scene (`:225`) ✅ — but the **HUD half of the pale reservation is broken** (see below).
- Prop dark: cap, eyes, handles, silhouettes ✅. Shadow black @ 0.45 ✅ (spec-sanctioned). Light white ✅.

**Failures:**
1. **`css/style.css:18` — `color: #222`.** The UI-SPEC's Color table reserves `#f4f0d8` for "the rope tube **and HUD text color**. Nothing else," and the Typography section explicitly pre-empts waiving this. As shipped, all three HUD readouts (score, best, prompt) sit over `#2a3440` at ≈1.2–1.3:1 — WCAG needs 4.5:1; this is not a preference, it is an invisible core readout. **WARNING (borderline BLOCKER — the score is the game's only persistent state display).**
2. **`css/style.css:1` — `background: #1a1a2e` on `html, body`.** Not in the palette; contradicts the canvas rule's stated no-foreign-flash intent. Visible during pre-first-frame paint and any resize gap before the canvas covers the page. WARNING (minor).

60/30/10 distribution itself is respected in-scene (sky/fog dominant, floor/props secondary, accent strictly identity-bound).

### Pillar 4: Typography (3/4)

- Sizes: exactly 16px (body, `css/style.css:19`) and 32px (`#hud-score`, `:24`). Weights: single 400 (font shorthand, no weight overrides anywhere). Line height: normal. The "two sizes, one weight — do not add more" rule is **exactly met** across the whole codebase (grep finds no other font declarations).
- Scene renders no text (D-03 guarantee holds — all text is DOM). ✅
- **Deduction:** the section's **Legibility requirement fails** — the declared legibility mechanism (pale text over dark sky) is not implemented; see Pillar 3 finding 1. A typography contract with an unreadable primary readout cannot score 4.

### Pillar 5: Spacing (3/4)

- `#hud` tokens exact: `gap: 4px` (`style.css:16` = xs) and `padding-top: 2.5rem` = 40px (`:17` = lg). No other box-model surface exists, correctly. ✅
- Canvas: `100vw/100vh` + `image-rendering: pixelated` ✅ (`:3-8`); no `aspect-ratio`/`max-height` anywhere ✅.
- Judgment-zone keep-out (D-18): silhouettes at x = −14, −9, 7.5, 11, 14 (`render3d.js:107-113`); nearest slab inner edge ≈ x 6.5 — **nothing tall within 6 world units of x=0** ✅.
- **Deduction:** the spec wording places the 4–6 slabs "at x ±14"; three of five (−9, 7.5, 11) sit mid-field. The binding keep-out is honored and z = −8 is behind the floor (floor spans z ±6) ✅, but the placement drifts from the contract's literal composition. Verify at UAT that mid-field slabs don't pull the eye near the judgment zone through the fog.

### Pillar 6: Experience Design (3/4)

State coverage vs the spec's resolved table:

| State | Contract | Evidence | Verdict |
|---|---|---|---|
| Loading | precompile both scenes | `renderer.compile(scene, camera)` + `(postScene, postCamera)` at `render3d.js:277-278` | ✅ |
| Empty/idle | animated, never frozen | bob `sin(now/400)*0.05` + twirl `now/1400` (`:318-319`) | ✅ |
| Error | coerce at every field read; render throw caught, rAF re-arms | `view.alpha ?? 0`, `player.y ?? 0`, `run.status ?? 'idle'`, `now ?? 0`; `shell.js:108-113` try/catch with rAF continuing | ✅ |
| Overflow | window-tracking buffer, RT clamp, passive poll | `shell.js:11-13,46`; `render3d.js:265-273,291-295` | ✅ |
| Destructive confirm | none needed | none present | ✅ |

**Findings:**
1. **`index.html:19` — `#hud aria-hidden="true"`.** The score/best/prompt — the game's only textual state — are hidden from assistive tech, while the canvas has no accessible alternative. The spec keeps text "DOM for snap-jitter reasons"; hiding it from AT is not required by any decision. WARNING (a11y).
2. **Trip-release race:** if the player is **holding** the button when the trip occurs, the eventual release hits the `status === 'over'` branch (`shell.js:63-66`) and restarts immediately — the "Missed! Score {N}" screen can flash for a single frame or be skipped entirely. Contract-compliant ("over: any press/release starts a run") but abrupt; consider swallowing the release that was in-flight at trip time.
3. `console.error('render failed:', …)` (`shell.js:111`) — render failures are invisible to the player (black-ish canvas, silent loop). Within the Phase-1 T-01-08 design, but note it.
4. Reduced-motion: wobble runs max-strength with no `prefers-reduced-motion` query anywhere — **documented Phase-5 deferral** (D-03 by decision), informational only.

---

## Registry Safety

Not a shadcn project (`components.json` absent). No third-party registries declared in the UI-SPEC. CDN origin check: exactly one external origin — `https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js` (`index.html:12`), exact-version-pinned, sole origin, `three/addons` absent, SRI deferral documented with mitigation (T-01-01). **Registry audit: 0 third-party blocks, no flags.**

---

## Files Audited

- `index.html`
- `css/style.css`
- `js/render3d.js` (366 lines, full read)
- `js/shell.js` (120 lines, full read)
- `02-UI-SPEC.md`, `02-CONTEXT.md`, `02-01/02-02/02-03-SUMMARY.md`
- Gates run: `node --test tests/` (0 failures), CDN-origin grep, generic-copy grep, `new THREE`-in-render grep, camera-mutation grep, hardcoded-color grep, `Math.random` scan, aria grep

## Verdict

The engineering discipline is excellent — every pipeline knob, scene-contract formula, and copy string is verifiably at contract value in source. But the audit could not see a single pixel, the phase's own perceptual checks are all still `unknown`, and the one contract item that *was* explicitly checkable from source — HUD text legibility — is **failing exactly as the spec predicted it might**. Fix the two CSS lines, then run the owed UAT before this phase is called done.
