# Phase 3: Card Catalogue Realness - Research

**Researched:** 2026-10-17
**Domain:** Vanilla-JS game systems — card catalogue data model, weighted offer generation, one-button input state machine, headless simulation testing
**Confidence:** HIGH (nearly all findings grounded in this repo's source, read directly this session)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Picking uses a **cycling cursor** over the 2–3 offered cards — the only scheme that stays true to the one-button design on both keyboard (space) and touch (pointer). *(Reversibility: costly)*
- **D-02:** **Press = cycle** to the next card (wraps around past the last card, uniform behavior); **hold = confirm** the highlighted card. No auto-cycle timer — picking is deliberate, never timing-pressure.
- **D-03:** Confirm hold is a **dedicated ~0.8 s hold**, deliberately distinct from the jump-charge hold curve, with a **visible fill/progress cue** on the highlighted card so the gesture reads as "committing" without a tutorial.
- **D-04:** Offers display via the **existing low-res HUD text channel** (shell prompt text through the PS1 buffer): one line per offer, cursor marker on the active card, hold-fill cue on it. Rejected: in-scene 3D plaques (240p text legibility risk) and DOM overlay cards (breaks one-render-path/PS1-pixel consistency).
- **D-05:** Confirm feedback: the highlighted line **flashes once**, then the run re-enters via the lead-in — the re-entry itself reads as "picked, here we go". No picked-card banner, no added delay.
- **D-06:** On confirm, the run resumes through the **same lead-in re-entry as a cold start** (`startRun` semantics: rope back to `START_PHASE` 0.33 with the 0.1-hold lead-in jump, ~0.43 s to the feet window) instead of unfreezing mid-swing. *(Reversibility: costly)*
- **D-07:** **Input is locked during the post-pick lead-in re-entry** — a stray confirm-hold must never leak into an early jump charge; the first press after re-entry completes charges a normal jump.

### Researcher/planner domain (not user-decided)
- **Rarity model & offer economy:** exact common/uncommon/rare weights, filtering when stack caps shrink the pool below the offer count, offer size (2 vs 3) policy — researcher/planner's call within CARD-03/05.
- **Stack-cap values, owned-card tracking model, icon strip presentation** — planner's call; must stay pure/Node-testable and follow the `*Mul` effects convention or document new effect fields.
- **Catalogue roster (6–10+ cards, margin/volume/risk/foundation/pace roles)** and the STATE.md flag: the rope-phase **wrap fix must precede any ropeMul-stacking card**; the "extra ropes" multi-window card is **spike-or-defer** inside this phase (CARD-08 is v2 — likely defer, but the wrap-bound safety in criterion 5 is not optional).
- **Where the pick state machine lives** (sim `status: 'choose'` extended vs shell-only reducer) — planner's call, respecting the purity invariant.

### the agent's Discretion
- Exact flash duration, cursor marker glyph, fill-cue rendering mechanics, cycle order of offers, hold-threshold tuning within ~0.8 s ± feel.

### Deferred Ideas (OUT OF SCOPE)
- Card-pick SFX for the confirm gesture — Phase 4 (AUD-01).
- Rarity-weight shift with skip count (CARD-09) and extra-ropes multi-window cards (CARD-08) — v2 per REQUIREMENTS.md.
- Pick-screen accessibility beyond the low-res text channel (reduced-motion flash dampening) — Phase 5.
- "Bring back a proper 3D jump rope to the WebGL scene" todo — delivered in Phase 2; closed, not re-opened.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CARD-01 | Player chooses 1 of 2–3 offered cards at cadence pauses, applied instantly | Current debt: `js/shell.js:61-62` auto-applies `run.offer[0]` on release. Pick reducer goes in shell (see Pattern 3); instant application already works via `applyUpgrade`-style effect endofunctions (`js/game.js:44-46`) |
| CARD-02 | Cards have name, icon, role color | Catalogue record extension (Pattern 1); icons as Unicode glyphs in metadata (no-assets rule D-13); note: prompt channel is DOM text, not the PS1 buffer — see Pitfall 8 |
| CARD-03 | Rarity (common/uncommon/rare) affecting drop odds | Weighted sampling without replacement (Pattern 2, CDF method [CITED: en.wikipedia.org/wiki/Roulette_wheel_selection]); weights are planner's call |
| CARD-04 | Cards stack with visible per-card stack caps | `run.owned` counts record + `avail: (state) => count < cap` predicate per card (Pattern 1); caps double as the ropeMul safety bound (Pitfall 1) |
| CARD-05 | Offers never contain dead picks | Availability filter before draw + pool-shrink policy (Pattern 2); empty-pool case must skip the freeze, not hang (Pitfall 6) |
| CARD-06 | Owned cards as icon strip during run | Pure `run.owned` on run state; DOM render in `updateHud()` via a new `#hud-owned` span + textContent (Pattern 4); extend bootShell hud stub map (Pitfall 7) |
| CARD-07 | 6–10+ original cards across margin/volume/risk/foundation/pace roles | Roster sketch in §Catalogue Roster Sketch; new effect fields need the lazy `?? 1` pattern to avoid breaking `freshEffects()` deepEqual pin (Pitfall 3) |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Three.js via CDN for **rendering only**; simulation core stays pure, framework-free, Node-testable; WebGL layer never feeds back into game logic.
- No build step; plain ES modules; `package.json` stays dependency-free (`{ "name": "jumprope-web", "private": true, "type": "module" }`).
- Pure `create*`/`update*` factories returning **new** objects (no mutation, no classes); predicates read as questions; named exports only.
- Randomness injected (`rng` DI, default param at the `tickRun` boundary); storage injected (`loadBest`/`saveBest(storage, …)`).
- `*Mul` suffix convention for effect multiplier fields.
- 2-space indent; no `console.log` in pure modules; browser I/O (`performance.now`, `Date.now`, `requestAnimationFrame`, `localStorage`, `document`) lives only in `js/shell.js` — mechanically enforced by `tests/boundary.test.js:103-112`.
- Tests run with `node --test tests/` (Node built-in runner, `node:assert/strict`).

## Summary

Everything this phase needs already exists in embryonic form: a 4-card catalogue of pure effect endofunctions (`js/upgrades.js`), an offer cadence hook in `tickRun` (`js/game.js:32-35`), a frozen `status: 'choose'` state that the shell currently resolves by silently applying `offer[0]` (`js/shell.js:61-62`), and a single canonical lead-in (`startRun`, `js/game.js:8-14`). The work is (1) generalizing the catalogue record with metadata (icon/role/color/rarity/cap) plus owned-count tracking and availability filtering, (2) replacing the auto-apply with a shell-side cycling-cursor / hold-to-confirm input reducer with a post-pick lead-in re-entry routed through the existing `startRun` code path, and (3) proving the whole thing with a headless 1000-tick scripted-card simulation test.

The STATE.md blocker — "rope-wrap fix must precede any ropeMul-stacking card" — resolves to **no code fix being required** for realistic caps: the current wrap arithmetic is exact for single wraps (`js/rope.js:5-9`, verified algebraically and by probe), and the only real ropeMul hazard is feet-window sampling blackout, which our probe puts at `ropeMul ≥ 15.6` with default period — orders of magnitude above any sane card cap. The correct mitigation is a documented cap policy plus the 1000-tick sim's wrap-bound assertion (criterion 5), not a rope.js rewrite; a naive `% 1` rewrite would actually **break the frozen wrap test** (Pitfall 1).

The hardest correctness constraints are the pinned test contracts: `freshEffects()` deep-equals exactly 4 keys, first offer length is exactly 2, `pickTwo` must stay exported with the distinct-pair property, and the ARCH-02 greps forbid the `phase: 0.33` literal and stray `Math.random`. All are satisfiable with the patterns below.

**Primary recommendation:** Extend the catalogue record + owned-counts model in pure sim code (`js/upgrades.js` / `js/game.js`), put the choose-state pick reducer and hold timer in `js/shell.js` (the only sanctioned home for `performance.now`), route post-pick re-entry through a `resumeRun(run)` built on the same constants as `startRun()`, and gate the phase with a new headless `tests/` file running 1000 scripted ticks.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Card catalogue data + metadata | Sim core (`js/upgrades.js`) | — | Pure data + endofunctions; Node-testable; no browser APIs |
| Offer generation (rarity, caps, filtering) | Sim core (`js/upgrades.js` via `tickRun`'s injected `rng`) | — | Must be deterministic under seeded rng; boundary fence forbids `Math.random` here |
| Owned-card record | Sim core (`run.owned` in `js/game.js`) | — | Part of run state; read by HUD each frame |
| Choose-state input reducer (cycle/confirm/lock) | Shell (`js/shell.js`) | Sim core for status transitions | `performance.now()` (hold timer) is shell-only per boundary test; `status: 'choose'` stays the sim's state-machine flag |
| Lead-in re-entry after pick | Sim core (pure `resumeRun`-style helper in `js/game.js`) | Shell calls it | Same lead-in constants as `startRun`; ARCH-02 single-path rule |
| Offer lines / cursor / fill cue / flash | Shell HUD (`updateHud` → `hud-prompt` DOM text) | `js/render3d.js` only if flash needs render support | D-04 locks the text channel; render3d stays render-only (ARCH-01) |
| Owned-cards icon strip | Shell HUD (new `#hud-owned` span) | — | DOM text; `render3d.js` has no text rendering path |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none new) | — | This phase adds **zero** dependencies | Repo rule: dependency-free; `three@0.186.1` importmap pin unchanged and untouched [VERIFIED: index.html:12] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:test` + `node:assert/strict` | bundled with Node v26.8.1 (probe: `node --version` → v26.8.1) | All new tests incl. the 1000-tick sim | Existing pattern in every `tests/*.test.js` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CDF inverse-transform weighted draw | Rejection/alias method | Catalogue ≤ ~12 items — linear scan is trivially fast and simpler; alias method only matters at scale |
| Shell-only pick reducer (`consumeIntents` extension) | New sim-level `choose` status with timers | Sim-level needs a pure dt-timer to avoid the browser-IO fence; only worth it if the planner wants the pick flow unit-testable without the bootShell harness — see Pattern 3 for both shapes |
| New effect fields written eagerly into `freshEffects()` | Lazy `(s.newMul ?? 1)` in `apply` closures | Eager breaks the frozen deepEqual pin (Pitfall 3); lazy keeps `freshEffects()` at 4 keys |

**Installation:** none — no packages to install.

## Package Legitimacy Audit

Not applicable — this phase installs **no external packages**. The single sanctioned dependency remains `three@0.186.1` pinned via importmap, unchanged since Phase 1 [VERIFIED: index.html:12 `"three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js"`]. **Packages removed due to [SLOP]:** none. **Flagged [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
                       ┌──────────────────────────────────────────────┐
                       │  SIM CORE (pure)  js/game.js ← upgrades.js   │
  startRun()/resumeRun │  ┌──────────┐   tickRun(run,rope,player,dt,rng)
  ────────────────────►│  │ run state│──► feet-window edge? ──yes──► score/skip
  (rope.phase=0.33,    │  │ status:  │        │                └─no─► trip → 'over'
   jump 0.1 hold)      │  │ idle/run/│        └─ skips%10==0 → status='choose'
                       │  │ choose/  │              │ available = catalogue.filter(cap)
                       │  │ over     │              ▼
                       │  └──────────┘        pickOffers(available, rng)   ── weighted, no dead picks
                       └───────────▲──────────────────────┬───────────────┘
                                   │ run.offer, run.owned │
        ┌──────────────────────────┴──────────────────────▼───────────────┐
        │  SHELL (impure) js/shell.js — only place with DOM/performance.now│
        │  consumeIntents(): press/release reducer by run.status           │
        │    choose: press→cycle cursor │ hold≥0.8s→confirm │ lock re-entry │
        │  updateHud(): prompt lines + cursor + fill cue + icon strip       │
        │  frame(): fixed STEP accumulator; tick ONLY when 'running'       │
        └──────────────────────────────┬───────────────────────────────────┘
                                       ▼ view={run,rope,player,prevPhase,alpha,best,now}
                        js/render3d.js (sole three importer — unchanged)
```

Data flow for a pick: cadence freeze (sim) → offers in `run.offer` (state) → shell cursor input → confirm → apply card to `run.effects`/`run.owned` (pure) → `resumeRun`-style lead-in (pure) → shell input lock until re-entry completes → prompt HUD cleared.

### Recommended Project Structure
```
js/
├── upgrades.js      # catalogue records (metadata + apply endofunctions), pickOffers, cadence
├── game.js          # run record (+ owned), tickRun, applyCard, startRun/resumeRun lead-in
├── shell.js         # input reducer (running + choose branches), lead-in lock, HUD (prompt + icon strip)
├── rope.js          # unchanged (wrap arithmetic already correct)
├── player.js        # unchanged
└── render3d.js      # unchanged unless flash cue needs render-side support (prefer not)
tests/
├── catalogue.test.js   # Wave 0 — rarity draw, caps, filtering, roster shape/roles
├── pickflow.test.js    # Wave 0 — choose reducer via bootShell-style harness
└── headless-sim.test.js# Wave 0 — 1000-tick scripted-card sim gate (criterion 5)
```

### Pattern 1: Catalogue record with metadata + owned counts (CARD-02/04/07)

Current record [VERIFIED: js/upgrades.js:1-10]:
```js
export const UPGRADES = [
  { id: 'float', name: 'Cloud Shoes', desc: '+15% hang time',
    apply: s => ({ ...s, floatMul: s.floatMul * 1.15 }) },
```

Extend each record with plain metadata; add per-card `cap` and keep `apply` a pure endofunction over the effects record:

```js
// js/upgrades.js — proposed record shape (illustrative values, planner's call)
export const CARDS = [
  { id: 'float', name: 'Cloud Shoes', desc: '+15% hang time', icon: '☁',
    role: 'foundation', color: 'sky', rarity: 'common', cap: 4,
    apply: s => ({ ...s, floatMul: s.floatMul * 1.15 }) },        // verbatim from js/upgrades.js:3
  { id: 'windup', name: 'Wind-Up Handle', desc: '+12% rope speed, +score', icon: '⟳',
    role: 'pace', color: 'amber', rarity: 'rare', cap: 2,
    apply: s => ({ ...s, ropeMul: s.ropeMul * 1.12, scoreMul: s.scoreMul + 1 }) },
];
export const RARITY_WEIGHT = { common: 70, uncommon: 25, rare: 5 };  // [ASSUMED] balancing knob
```

Owned-card tracking lives on `run` (game.test.js only pins `score`/`status` on `createRun()` [VERIFIED: tests/game.test.js:8-12], so a new field is contract-safe):

```js
// js/game.js — createRun gains: owned: {} (id -> stacks taken)
// applyCard(run, card) → { ...run, effects: card.apply(run.effects),
//   owned: { ...run.owned, [card.id]: (run.owned[card.id] ?? 0) + 1 }, offer: null };
```

Availability predicate: `isAvailable(card, owned) => (owned[card.id] ?? 0) < card.cap` — pure, drives both the filter (CARD-05) and the HUD cap readout (CARD-04).

### Pattern 2: Rarity-weighted offers without dead picks (CARD-01/03/05)

Roulette-wheel / inverse-CDF draw with sequential removal [CITED: en.wikipedia.org/wiki/Roulette_wheel_selection]:

```js
// js/upgrades.js — pickOffers(pool, owned, count, rng)
// pool: CARDS; owned: run.owned; rng: injected (never Math.random — boundary fence js rule)
export function pickOffers(pool, owned, count, rng) {
  const avail = pool.filter(c => (owned[c.id] ?? 0) < c.cap);   // CARD-05: no dead picks
  const out = [];
  const remaining = [...avail];
  while (out.length < count && remaining.length > 0) {
    const total = remaining.reduce((t, c) => t + RARITY_WEIGHT[c.rarity], 0);
    let r = rng() * total;                                      // CDF walk
    let idx = 0;
    for (let i = 0; i < remaining.length; i++) {
      r -= RARITY_WEIGHT[remaining[i].rarity];
      if (r < 0) { idx = i; break; }
    }
    out.push(remaining[idx]);
    remaining.splice(idx, 1);                                   // distinct without replacement
  }
  return out;                                                   // may be shorter than count — never repeats
}
```

Keep `pickTwo(upgrades, rng)` exported with its current 2-arg signature and distinct-pair property — the frozen test imports and exercises it directly [VERIFIED: tests/upgrades.test.js:3 `import { UPGRADES, freshEffects, pickTwo, shouldOfferUpgrade } from '../js/upgrades.js';` and :17-24 the distinct-for-any-seed loop]. A compatibility shim (`pickTwo = (ups, rng) => pickOffers(ups, {}, 2, rng)` with `cap: Infinity` fallback for metadata-less records) satisfies it; deleting or renaming the export breaks a frozen file.

**Offer-size policy (planner's call, one hard constraint):** the first cadence offer (skips 9→10) must have length exactly 2 — pinned twice: [VERIFIED: tests/game.test.js:46] `assert.equal(run.offer.length, 2);` and [VERIFIED: tests/startrun.test.js:36] `assert.equal(out.run.offer.length, 2);`. Recommend: size 2 through skip 30, size 3 beyond — keeps "1 of 2–3" true while honoring the pins.

### Pattern 3: Choose-state pick reducer — cycling cursor + hold-confirm (D-01…D-03, CARD-01)

The hold timer needs wall-clock reads, and `performance.now` is mechanically confined to `js/shell.js` [VERIFIED: tests/boundary.test.js:13 `const BROWSER_IO_RE = /performance[.]now|Date[.]now|requestAnimationFrame|localStorage|\bdocument\b/;` and :103-112 shell.js-only assertion]. Two viable homes:

**(a) Shell-only reducer (recommended, minimal):** extend `consumeIntents()` in `js/shell.js` — replacing today's debt [VERIFIED: js/shell.js:61-62]:
```js
      } else if (run.status === 'choose' && run.offer) {
        run = applyUpgrade(run, run.offer[0]);
```

```js
// js/shell.js — closed-over pick state: pickIdx = 0, pickPressedAt = null, pickDone = false
// press while 'choose':  if (pickPressedAt === null) { pickPressedAt = performance.now(); pickIdx = (pickIdx + 1) % run.offer.length; }
// frame tick while 'choose' and pickPressedAt !== null:
//   pickFill = Math.min(1, (performance.now() - pickPressedAt) / 800);      // D-03 fill cue driver
//   if (pickFill >= 1 && !pickDone) { confirm(); pickDone = true; }          // fires while still held
// release while 'choose':  if (pickDone) { pickDone = false; }               // swallow — no jump charge
//                          else { pickPressedAt = null; }                    // early release = cancel, no penalty
// confirm(): run = applyCard(run, run.offer[pickIdx]); ({ rope, player, run } = resumeRun(run)); reentryAt = performance.now();
```
Note `frame()` only advances the sim when `run.status === 'running'` [VERIFIED: js/game.js tick call sits behind that check at js/shell.js:94], so the fill cue must be evaluated in `consumeIntents()`/`frame()` from wall-clock, independent of `tickRun` — this works because `consumeIntents()` runs every STEP regardless of status [VERIFIED: js/shell.js:92-93 `while (acc >= STEP) { consumeIntents();`].

**(b) Sim-side timer:** model the hold as a dt-integrated `offer.holdT` advanced by a pure `updateChoose(chooseState, dt)` fed by the shell's STEP loop — cleaner unit-testability, no `performance.now`, but extends run state; pick only if the planner wants the pick flow tested without the DOM harness. Either satisfies D-02's "no auto-cycle timer" (fill advances only while held).

**D-06 lead-in re-entry via the single canonical path (ARCH-02):** factor `startRun` so post-pick re-entry reuses the exact same constants [VERIFIED: js/game.js:8-14]:
```js
export function startRun() {
  return {
    rope: { phase: START_PHASE, period: ROPE_PERIOD },
    player: jump(createPlayer(), 0.1),
    run: { ...createRun(), status: 'running' },
  };
}
```
```js
// js/game.js — proposed
export function leadIn() {
  return { rope: { phase: START_PHASE, period: ROPE_PERIOD }, player: jump(createPlayer(), 0.1) };
}
export function startRun() { const { rope, player } = leadIn(); return { rope, player, run: { ...createRun(), status: 'running' } }; }
export function resumeRun(run) { const { rope, player } = leadIn(); return { rope, player, run: { ...run, status: 'running', offer: null } }; }
```
Never write the literal `phase: 0.33` — the ARCH-02 grep flags `/phase:\s*0[.]33/` in **every** js/ file [VERIFIED: tests/boundary.test.js:61-62]. `applyUpgrade` must keep returning a plain run record (frozen usage [VERIFIED: tests/game.test.js:32] `let run = applyUpgrade(createRun(), multi);`) — put the rope/player re-entry in `resumeRun`, not in `applyUpgrade`.

**D-07 re-entry lock:** while `performance.now() - reentryAt < LEAD_IN_MS` (~0.45 s, or until the lead-in jump's first feet window), `consumeIntents()` ignores press/release in `'running'`. Arithmetic for the constant: with `START_PHASE = 0.33`, `ROPE_PERIOD = 1.3`, gravity 1800, 0.1-hold jump gives v₀ = 350 + 0.1·500 = 400 (`jumpVelocity` [VERIFIED: js/player.js:5-7]); the player stays above the 18-px clear threshold from ≈0.05 s to ≈0.39 s after re-entry (computed this session from js/player.js:5-7,13-16 + js/game.js:22,28). The STATE.md "~0.43 s to feet window" figure [CITED: .planning/STATE.md:67] is the same order; exact constant is the agent's discretion.

### Pattern 4: HUD presentation (CARD-02/06; D-04/D-05)

The "existing HUD text channel" is a DOM overlay, not the WebGL buffer: `index.html:19-23` defines `#hud` with three spans; `js/shell.js:72-86` (`updateHud`) writes `hudScore/hudBest/hudPrompt.textContent`; `css/style.css:10-24` styles it as centered 16px sans-serif with `pointer-events: none`. `js/render3d.js` contains **no text rendering at all** (only `texture2D` sampling — grep confirmed). D-04's intent reads as: compose everything into the existing single prompt string — no per-card DOM elements, no 3D geometry. That yields, e.g.:

```
> Cloud Shoes  ☁×2 [####-]     ← active: cursor glyph + owned stacks + fill cue
  Heavy Rope   ⟳
```
built as one `hudPrompt.textContent` multi-line string (`white-space: pre-line` or `<br>`-free \n with CSS). The flash (D-05) = one frame-toggled variant of the active line (e.g., `*` prefix or uppercase) for a fixed ~0.1 s. The icon strip (CARD-06) needs one new span (`#hud-owned`) in index.html + `updateHud` line: `(run.owned[card.id] ?? 0)` repetitions of `card.icon` joined by spaces — `textContent` only, never `innerHTML`. If the planner adds any new `getElementById` HUD id, the bootShell harness stub map in tests/shell.test.js:33-37 must gain the key or every existing shell test crashes on `undefined.textContent` (see Pitfall 7).

### Anti-Patterns to Avoid
- **Applying `offer[0]` on any release** — today's debt at js/shell.js:61-62, named verbatim by success criterion 1.
- **Reaching for `Math.random` in offer generation** — only the `rng = Math.random` default-parameter line is grep-legal [VERIFIED: tests/boundary.test.js:75 `if (/Math[.]random/.test(line) && !/rng\s*=\s*Math[.]random/.test(line))`].
- **Rendering cards as DOM/3D objects** — explicitly rejected by D-04.
- **Resetting `run` on pick confirm** — D-06 re-entry preserves score/effects; only rope+player reset.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Weighted rarity draws | Ad-hoc `if (rng() < 0.1) rare` cascades | Inverse-CDF walk over `RARITY_WEIGHT` (Pattern 2) | Cascades silently misweight when pool shrinks after cap filtering; CDF renormalizes for free via the `total` sum |
| Distinct multi-draw | Retry-until-different loops | Sequential removal (`splice`) | `pickTwo`'s `if (b === a) b = (b + 1) % len` bias [VERIFIED: js/upgrades.js:18-19] doesn't generalize to k>2 and skews under weights |
| Seeded test randomness | Global monkeypatch of Math.random | Existing injected-stub rng (`() => 0.5` style) | Already the house DI pattern [VERIFIED: tests/startrun.test.js:92-93 stub `() => { calls += 1; return 0.5; }`]; keeps boundary fence green |
| Rope wrap safety | `% 1` rewrite of updateRope | Cap policy + headless phase assertion (Pitfall 1) | `% 1` breaks the frozen float-equality test; current arithmetic is already exact for single wraps |
| Hold-duration timer | New time source | `performance.now()` deltas in shell only | Boundary fence already assigns `performance.now` to shell.js exclusively |

**Key insight:** the repo already solved every hard problem this phase touches (rng DI, single lead-in path, state-machine freeze, HUD channel); the phase is composition and generalization, not new machinery.

## Common Pitfalls

### Pitfall 1: "Fixing" the rope wrap breaks the frozen float pin (and isn't needed)
**What goes wrong:** STATE.md flags a needed "rope-wrap fix before ropeMul-stacking cards" [CITED: .planning/STATE.md:92]. The current code [VERIFIED: js/rope.js:5-9] is:
```js
export function updateRope(rope, dt) {
  const inc = dt / rope.period;
  const phase = rope.phase + inc;
  return { ...rope, phase: phase >= 1 ? (rope.phase - 1) + inc : phase };
}
```
`(rope.phase - 1) + inc` is algebraically `phase - 1` — correct for any single wrap (`inc < 1`). A "cleaner" `(rope.phase + inc) % 1` is **not** bit-identical: probe this session — `phase: 0.9, dt: 0.3, period: 1` yields `0.19999999999999996` with `% 1`, failing the frozen `assert.equal(r.phase, 0.2)` [VERIFIED: tests/rope.test.js:9-12].
**Real hazard:** feet-window sampling. Window width is 0.1 [VERIFIED: js/rope.js:11-13 `rope.phase >= 0.45 && rope.phase <= 0.55`]; per-tick increment is `STEP * ropeMul / ROPE_PERIOD = ropeMul / 156`. If `inc ≥ 0.1` (`ropeMul ≥ 15.6` at period 1.3), some cycles sample zero ticks inside the window → no score, no trip → progression stall. Headless sweep this session (1000 ticks each): ropeMul 1→10 hit the window 103-112 ticks (~1-2 per cycle, all cycles hit); ropeMul 15.7+ dropped hits below cycle count (~20% of cycles blacked out at 20); phase stayed in [0,1) in all trials; ropeMul 156 freezes phase entirely.
**How to avoid:** No rope.js change. Policy: keep effective `ropeMul ≤ ~3` via caps (≥5× safety margin), and have the 1000-tick sim assert `0 ≤ phase < 1` every tick and ≥1 score event per cycle (criterion 5) — this *is* the "wrap fix precedes ropeMul cards" gate, satisfied by construction.
**Warning signs:** a scripted sim where skips stop advancing while status stays `'running'`.

### Pitfall 2: Editing/relying on the frozen-file contract casually
**What goes wrong:** Phase 1 locked four original test files byte-identical [CITED: .planning/STATE.md:70]; Phase 3 CONTEXT: "new tests allowed, existing behavior contracts respected". Live pins that constrain the design:
- `freshEffects()` **deep-equals exactly** `{ floatMul: 1, ropeMul: 1, scoreMul: 1, windowMul: 1 }` [VERIFIED: tests/upgrades.test.js:5-7] → see Pitfall 3.
- `pickTwo` + `UPGRADES` + `shouldOfferUpgrade` named exports and the distinct-pair-for-any-seed property [VERIFIED: tests/upgrades.test.js:17-24] → keep the export working (Pattern 2).
- First offer at skips 9→10 has length exactly 2 [VERIFIED: tests/game.test.js:45-46, tests/startrun.test.js:35-36].
- 4-arg `tickRun` call surface works (rng defaults to Math.random) [VERIFIED: tests/startrun.test.js:34].
- `scoreMul` additive stacking via the `multi` card (2, then 3) [VERIFIED: tests/upgrades.test.js:9-15] → Golden Handle keeps `scoreMul: s.scoreMul + 1`.
**Warning signs:** `node --test` RED on files no plan touched — treat as a broken contract, not flake.

### Pitfall 3: New effect fields in `freshEffects()` break the deepEqual — use lazy fields
**What goes wrong:** A risk/pace card wanting a new knob (e.g. `inputBufferMul`) adds it to `freshEffects()` → upgrades.test.js:6 deepEqual fails.
**How to avoid:** keep `freshEffects()` at exactly 4 keys; write lazily in `apply` and read defensively: `apply: s => ({ ...s, riskMul: (s.riskMul ?? 1) * 1.1 })`, read as `run.effects.riskMul ?? 1` in tickRun. Prefer staying within the existing four `*Mul` fields where the design allows (CONTEXT explicitly allows documenting new fields — this is the sanctioned route).
**Warning signs:** deepEqual failure listing extra keys.

### Pitfall 4: The confirm-hold's release leaks into a jump charge (D-07 violation)
**What goes wrong:** Confirm fires at 0.8 s **while the finger/key is still down**; the later release then routes to the `'running'` branch — today that branch jump-charges [VERIFIED: js/shell.js:57-60 `if (run.status === 'running' && holdFrom !== null) { player = jump(player, (performance.now() - holdFrom) / 1000); }`]. Since post-confirm status is already `'running'` (resumeRun), a naive reducer fires an instant max-charge jump.
**How to avoid:** the re-entry lock (Pattern 3) swallowing press/release until `reentryAt + LEAD_IN_MS`, plus consuming `releaseIntent` in the choose branch when `pickDone`. `pressIntent` was already consumed by the cycling press (press sets it, consume clears it) — keep that single-consumption property.
**Warning signs:** the picked run "launches" the character ~0.43 s before the first rope arrival.

### Pitfall 5: Two code paths for the lead-in (ARCH-02 regression)
**What goes wrong:** A separate post-pick reset duplicating `START_PHASE`/`jump(…, 0.1)` drifts from `startRun` over time; the grep fence only catches the `phase: 0.33` **literal**, not a drifted constant copy — review must check that both entry points share the `leadIn()` helper (Pattern 3 code).

### Pitfall 6: Empty offer pool freezes the game
**What goes wrong:** `tickRun` sets `status: 'choose'` on cadence [VERIFIED: js/game.js:32-35] regardless of pool availability; with every card capped, the choose freeze has nothing to offer and a one-button player can never leave. **Fix:** in tickRun's offer hook, if `pickOffers(...)` returns empty, do **not** enter choose — continue running (optionally re-arm cadence so a later offer lands when a new card becomes available; simplest: skip silently and try again next cadence).
**Warning signs:** headless sim stalls at `status === 'choose'` with `offer.length === 0`.

### Pitfall 7: New HUD span crashes every existing shell test
**What goes wrong:** bootShell's DOM stub resolves ids through a fixed map [VERIFIED: tests/shell.test.js:33-37 `'hud-score': { textContent: '' }, 'hud-best': { textContent: '' }, 'hud-prompt': { textContent: '' }` and :57 `getElementById: id => (id === 'game' ? canvas : hud[id])`] — a new `getElementById('hud-owned')` in shell.js returns `undefined` and the next `updateHud()` throws inside the frame loop, turning T-01-08 tests RED.
**How to avoid:** the plan includes "extend bootShell `hud` map with `hud-owned`" as an explicit step in the same task that adds the span (test-infrastructure edit; existing assertions unchanged).

### Pitfall 8: Assuming the prompt renders inside the PS1 buffer
**What goes wrong:** D-04's phrasing ("shell prompt text through the PS1 buffer") suggests in-canvas text. Reality: `#hud` is a DOM overlay above the canvas (index.html:19-23; css/style.css:10-24 `position: absolute; inset: 0; pointer-events: none`) and render3d.js has no text path. Budgeting pixel-font work or render3d changes for the cue is wasted; conversely, "role color" cannot show as color in a single shared-color span without a small CSS/class addition — scope CARD-02's color readout accordingly (glyph + name may suffice at-a-glance; planner decides). Flag this interpretation to the planner explicitly.

### Pitfall 9: choose-state frame loop expectations
**What goes wrong:** While `status === 'choose'` the sim never ticks (js/shell.js:94 guard) — `prevPhase` stays set to the frozen phase [VERIFIED: js/shell.js:102-104 `} else { prevPhase = rope.phase; }`], so render shows a static rope. Correct per D-05 (freeze is the design), but means the fill cue CANNOT come from `tickRun` dt — it needs the shell wall-clock path (Pattern 3).

## Runtime State Inventory

Omitted — this is a feature phase, not a rename/refactor/migration phase. (Persistence note for completeness: `localStorage` key `'jumprope-best'` [VERIFIED: js/game.js:50 `storage.getItem('jumprope-best')`] is untouched by this phase; no stored-data migration exists or is needed.)

## Catalogue Roster Sketch (CARD-07, planner's call)

Roles per CONTEXT: margin / volume / risk / foundation / pace. Existing four map: Cloud Shoes (foundation, floatMul), Heavy Rope (pace-down, ropeMul ×0.9), Golden Handle (volume, scoreMul +1), Wide Stance (margin, windowMul ×1.1). To reach 8, sketch four originals [ASSUMED — design space, verify feel in UAT]: e.g. a rare pace-up risk card (ropeMul ×1.12 & scoreMul +1, cap 2), a margin card with a score tax (windowMul ×1.2 & scoreMul −0.25 floor 0.5), a cheap common foundation chip (floatMul ×1.05, cap 5), a volume multiplier card (scoreMul ×1.15, cap 3). Keep every ropeMul factor within [0.6, 1.2] per application and cap pace cards at 2–3 so effective ropeMul stays ≤ ~2 (Pitfall 1 margin).

Headline numbers for the 1000-tick sim math [computation, this session]: at ropeMul 1 the rope completes 6.41 cycles in 1000 ticks (STEP 1/120, period 1.3); expect 6-7 score events per scripted-card variant at neutral effects; a scripted perfect player must trip zero times during the lead-in (clear window 0.05-0.39 s covers the window).

## Code Examples

### Headless scripted-card simulation gate (criterion 5)
```js
// tests/headless-sim.test.js — Wave 0
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, tickRun, startRun, resumeRun } from '../js/game.js';
import { CARDS, pickOffers } from '../js/upgrades.js';

function scriptedRun(seedRng, pickStrategy) {          // deterministic: no Math.random
  let { rope, player, run } = startRun();
  let prevFeet = false;
  for (let tick = 0; tick < 1000; tick++) {
    if (run.status === 'choose') {
      const card = pickStrategy(run.offer, run.owned); // e.g. offer[cursor % offer.length]
      ({ rope, player, run } = resumeRun(applyCardPure(run, card)));
    }
    if (run.status === 'over') ({ rope, player, run } = startRun());
    const out = tickRun(run, rope, player, 1 / 120, seedRng);   // scripted: press-jump when rope near feet
    ({ run, rope, player } = out);
    assert.ok(Number.isFinite(run.score) && Number.isFinite(player.y), 'no NaN');
    assert.ok(rope.phase >= 0 && rope.phase < 1, 'phase in wrap bounds');
    const feet = rope.phase >= 0.45 && rope.phase <= 0.55;      // mirrors js/rope.js:11-13
    if (feet && !prevFeet) scoreEvents++;                        // cycle counter for "one per cycle"
    prevFeet = feet;
  }
}
```
(Shape only — the driver's jump policy must beat gravity realistically: jump when `rope.phase` approaches 0.33→0.45 within the lead-in-free window; planner tunes. Assert `run.skips` advances ≈ cycles when effects neutral.)

### Weighted draw determinism pin
```js
// stub rng cycling values — mirrors tests/startrun.test.js style [VERIFIED: tests/startrun.test.js:92-97 pattern]
let i = 0; const rng = () => [0.0, 0.5, 0.99][i++ % 3];
const a = pickOffers(CARDS, {}, 2, seeded());  // same seed twice → same offer ids
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pickTwo` uniform index draw + `offer[0]` auto-apply | Rarity-weighted, cap-filtered offers with explicit pick flow | This phase | The whole point of Phase 3 |
| 4-card catalogue, no identity metadata | 6–10+ cards with icon/role/color/rarity/cap fields | This phase | Extends, doesn't replace, the endofunction pattern |

**Deprecated/outdated:** AGENTS.md's description of `js/game.js` as the shell holding rAF/canvas/DOM code is stale — the shell moved to `js/shell.js` in Phase 1 (confirmed: shell.js has the rAF loop; game.js is pure). Plan against the code, not the AGENTS.md line numbers.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Rarity weights 70/25/5 as a starting knob | Pattern 2 | Balance-only; tune in UAT, no structural risk |
| A2 | D-04 "PS1 buffer" wording actually means the existing DOM `hud-prompt` channel (render3d has no text path) | Pattern 4, Pitfall 8 | If literal in-buffer text is wanted, a render3d text path appears — far bigger scope; **discuss-phase should confirm or planner adds checkpoint** |
| A3 | Offer size 2→3 escalation keeps frozen length===2 pins green | Pattern 2 | Pin fails at planner test-run if policy ignores it — cheap to catch |
| A4 | "~0.43 s" lead-in figure ≈ the 0.05-0.39 s clear-window arithmetic I computed | Pattern 3 | Feel constant only; tuned by ear |
| A5 | No rope.js change is required to satisfy the STATE.md wrap blocker | Pitfall 1 | If the 1000-tick sim later shows phase drift at extreme stacked caps, raise cap policy (still not a rope.js change) |
| A6 | bootShell harness (tests/shell.test.js) can be extended with a new hud key and reused for pick-flow tests | Pitfall 7, Pattern 3 | If frozen-byte rule is read strictly for shell.test.js too, pick-flow tests need their own harness copy |

## Open Questions (RESOLVED)

1. **Does "role color" (CARD-02) require an actual color on screen?** — RESOLVED (adopted recommendation): glyph + name plus a CSS class toggle (`role-<color>`) on the existing prompt span, keyed by the highlighted card's `color` field. Implemented by 03-01 Task 2; no checkpoint needed (D-04's no-new-DOM-elements constraint stays intact).
2. **Offer count policy** — RESOLVED (adopted recommendation): 2→3 escalation via `offerCount(skips)`, size 3 beyond skip 30, honoring both frozen length-2 first-offer pins. Implemented by 03-02 Task 2.
3. **Extra-ropes spike** (STATE.md spike-or-defer) — RESOLVED (adopted recommendation): **deferred without spiking**. CARD-08 is v2 per REQUIREMENTS.md, and criterion 5's wrap-bound safety is met by cap policy alone — windup cap 2 (03-02 Task 1) plus the machine-enforced capped-ropeMul bound test (03-03 Task 2). The deferral is recorded explicitly in 03-02's `flagged_assumptions`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js (node --test) | all tests, headless sim | ✓ | v26.8.1 | — |
| Browser (evergreen) | UAT smoke of pick flow / HUD | ✓ (project runs in dev already) | — | — |
| three (CDN importmap) | unchanged render path | ✓ pinned | 0.186.1 | — |

**Missing dependencies:** none. Baseline health: `node --test tests/` → **fail 0** (96 ms) as of research time.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node built-in `node:test` + `node:assert/strict` (Node v26.8.1) |
| Config file | none (convention: `tests/*.test.js`) |
| Quick run command | `node --test tests/` |
| Full suite command | `node --test tests/` (full suite already runs < 1 s) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CARD-01 | press=cycle, hold=confirm, re-entry lock, every offer reachable | integration (bootShell harness) | `node --test tests/pickflow.test.js` | ❌ Wave 0 |
| CARD-02 | catalogue records all carry name/icon/role/color | unit | `node --test tests/catalogue.test.js` | ❌ Wave 0 |
| CARD-03 | seeded draw over N trials reproduces rarity ordering (common > uncommon > rare hit rates) | unit (seeded rng) | `node --test tests/catalogue.test.js` | ❌ Wave 0 |
| CARD-04 | apply up to cap; `isAvailable` false at cap; caps in [.., ..] for ropeMul cards | unit | `node --test tests/catalogue.test.js` | ❌ Wave 0 |
| CARD-05 | capped card never appears in offers under seeded draw; empty pool → no freeze | unit | `node --test tests/catalogue.test.js` | ❌ Wave 0 |
| CARD-06 | owned counts render into icon-strip string; shell HUD shows glyphs | unit + integration | `node --test tests/pickflow.test.js` | ❌ Wave 0 |
| CARD-07 | roster ≥ 6 with all five roles covered (role enum coverage check) | unit | `node --test tests/catalogue.test.js` | ❌ Wave 0 |
| Criterion 5 | 1000-tick scripted-card sim: no NaN, phase ∈ [0,1), 1 score/cycle | headless sim | `node --test tests/headless-sim.test.js` | ❌ Wave 0 |

Regression gates already live and must stay green unchanged: `tests/boundary.test.js` (three-fence, 0.33 grep, Math.random grep, browser-IO grep), `tests/rope.test.js`, `tests/upgrades.test.js`, `tests/game.test.js`, `tests/startrun.test.js`, `tests/shell.test.js`.

### Sampling Rate
- **Per task commit:** `node --test tests/` (whole suite ≈ 0.1 s)
- **Per wave merge:** `node --test tests/`
- **Phase gate:** full suite green + browser UAT of the pick flow (criterion 1 is perceptual: does the confirm gesture read without a tutorial?) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/catalogue.test.js` — CARD-02/03/04/05/07 unit coverage
- [ ] `tests/headless-sim.test.js` — 1000-tick scripted-card sim (criterion 5)
- [ ] `tests/pickflow.test.js` — choose reducer via bootShell harness (or extended tests/shell.test.js harness map per Pitfall 7)
- [ ] bootShell `hud` stub extension — same change serves CARD-06 integration

## Security Domain

`security_enforcement: true`, ASVS L1. This phase adds no auth, no session, no crypto, no server surface, and no new user input beyond existing key/pointer events.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2/V3/V4 (auth/session/access) | no | Static single-player browser game — nothing new |
| V5 Input Validation | minimal | Catalogue strings are in-repo constants; HUD writes stay `textContent` (never `innerHTML`) — same posture as Phase 1 shell |
| V6 Cryptography | no | None used, none needed |
| V14 Build/Deploy | no | No new dependencies; importmap pin unchanged |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| DOM XSS via card/owned strings rendered as HTML | Tampering | Write only via `.textContent`; icons are Unicode literals in CARDS constants (pattern already proven by `updateHud`) |
| Prototype-polluted `owned` keys | Tampering | Keys are catalogue `id`s from in-repo data only; never build owned keys from user input |
| Supply-chain (new package) | Impersonation | Mitigated by design: zero new packages (see Legitimacy Audit) |

## Sources

### Primary (HIGH confidence)
- Direct source reads this session: `js/game.js`, `js/upgrades.js`, `js/rope.js`, `js/player.js`, `js/shell.js`, `js/interpolate.js`, `js/render3d.js` (grep), `index.html`, `css/style.css`
- Direct test reads this session: `tests/rope.test.js`, `tests/upgrades.test.js`, `tests/game.test.js`, `tests/startrun.test.js`, `tests/boundary.test.js`, `tests/shell.test.js`
- Computational probes this session: 1000-tick ropeMul sweep (blackout threshold 15.6, phase bounds, freeze at 156), modulo-wrap float failure (`0.19999999999999996`), lead-in clear-window arithmetic, `node --test tests/` baseline (fail 0)
- Planning state: `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/PROJECT.md`, `.planning/phases/03-card-catalogue-realness/03-CONTEXT.md`

### Secondary (MEDIUM confidence)
- [CITED: en.wikipedia.org/wiki/Roulette_wheel_selection] — CDF inverse-transform weighted selection (fitness proportionate selection, last edited 2026-01-22); without-replacement extension via removal is textbook

### Tertiary (LOW confidence)
- Roguelike catalogue-design conventions (rarity→odds, caps→availability) — general design discourse, tagged LOW; superseded in practice by this phase's CONTEXT decisions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; everything verified against source
- Architecture/patterns: HIGH — all extension points read in source; design choices flagged as planner discretion
- Pitfalls: HIGH for pinned-contract pitfalls (quoted tests); MEDIUM for feel constants (hold timing, weights)
- Rope-wrap blocker resolution: HIGH — algebra + live probe

**Research date:** 2026-10-17
**Valid until:** 2026-11-16 (stable in-repo domain; re-verify only if the test-freeze policy changes)
