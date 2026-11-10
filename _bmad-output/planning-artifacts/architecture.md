# Architecture: Jumprope Web

> Carried forward from GSD codebase maps (see `docs/archive/gsd/planning/codebase/`,
> mapped 2026-10-15 — pre-v1.0) and updated against the shipped v1.0 tree.
> Source of truth is the code itself; this document is the spine for new work.

## System Overview

```text
Browser (index.html)
  └─ importmap pins three@0.186.1 (CDN) ──────────────┐
       │                                              ▼
  js/shell.js ──────────────────► js/render3d.js  (sole `three` consumer)
   rAF fixed-step loop,              PS1 pipeline: 240-row Nearest RT,
   input, pause/visibility,          vertex snap, sRGB→Bayer/15-bit pass,
   audio lifecycle, resize           chibi rig + sag-baked rope, dither
       │  one-way view payload (immutable sim state + cosmetic clock)
       ▼
  js/game.js (pure run orchestration: createRun/tickRun/applyUpgrade)
    ├─ js/rope.js        phase clock, atFeet window, obstacle geometry
    ├─ js/player.js      hold-to-jump physics, gravity, squash-spring
    ├─ js/upgrades.js    UPGRADES catalogue, effects multipliers, pickOffers
    ├─ js/areas.js       five-area ladder data: ceilings, periodMul, palettes
    └─ js/interpolate.js lerpPhase (wrap-aware phase interpolation)
  js/audio.js — leaf: procedural WebAudio SFX fed by the shell's event
                channel; zero references from the sim import graph
  localStorage ('jumprope-best', mute/volume) via injected storage seam
       (as-built: the versioned 'jumprope-best-altitude' of game-architecture.md
        §Persistence was NEVER shipped - accepted 2026-11-10, ledger :159;
        no run record is ever persisted)
```

## The One Rule That Matters

**Pure functional core / imperative shell.** Simulation code
(`game.js`/`rope.js`/`player.js`/`upgrades.js`/`interpolate.js`) never touches
DOM, `Date`, `Math.random`, or storage, never mutates (spread copies only), and
imports nothing browser-side. The WebGL layer never feeds back into game logic
— the shell passes a one-way, immutable view payload to `render3d.js`.
This is enforced mechanically by the derived-entry import-graph walk in
`tests/boundary.test.js` (fails on any `three` reference or browser IO in the
test-reachable sim graph).

## Layers

| Layer | Files | Purity | Notes |
|-------|-------|--------|-------|
| Simulation core | `js/game.js`, `js/rope.js`, `js/player.js`, `js/upgrades.js`, `js/interpolate.js`, `js/areas.js` (ladder data module since Story 2.2) | Pure, Node-importable | Factory `create*` + `update*` returning new state; predicates read as questions; rng injected as a parameter (`tickRun`'s 5th arg) |
| Runtime shell | `js/shell.js` | Impure | rAF loop, fixed `STEP = 1/120` accumulator (clamped 0.25 s), pointer/keyboard/visibility input, pause, storage seam, resize/letterbox |
| Renderer | `js/render3d.js` | Impure; sole `three` consumer | PS1 recipe: low-res Nearest render target, NDC vertex snap, single sRGB-then-Bayer/15-bit post pass; poses only from `lerpPhase` theta |
| Audio | `js/audio.js` | Leaf, impure | Eight procedural SFX voices (`js/audio.js:185-208`; exact census fenced by `tests/ceilingbreak.test.js:511`) + the pre-recorded track loop (`audio/track.ogg`, Story 5.6), master bus, gesture-lifecycle AudioContext, suspend/resume guards; sim graph stays audio-free |

## Key Abstractions

- **Run** — immutable 17-key record
  `{ status, score, altitude, skips, effects, offer, owned, buffer, streak, ropes, charged, airJumps, iFrames, area, baseAltitude, outcome }`
  (fenced by `tests/altitude.test.js:43`; full field census under
  *Run Record & Event Channel* below);
  states `idle → running ↔ choose → over → (restart)`. Invalid states are data
  (`status: 'over'`, `tripped: true`), never thrown errors.
- **Rope phase** — the canonical 0–1 clock: scoring window (`atFeet` 0.45–0.55),
  rope geometry, character pose, and visuals all derive from it. Audio follows
  gameplay; nothing beat-locks.
- **Effects** — upgrade multipliers (`floatMul`/`ropeMul`/`scoreMul`/`windowMul`/
  `launchMul` — five fields, `launchMul` added by Story 3.2)
  as pure endofunctions over an effects record; `ropeMul` capped per-card so
  stacked speed cards stay inside the rope-wrap bound by construction.
- **Cross-cutting singletons** — one shared handler per concern:
  `releaseEverything()` (all input-loss paths), `resumeRun()` (all resume paths),
  `snapGridFor()` (reduced-motion snap grid). Do not duplicate per path.

## Run Record & Event Channel (as-built)

Recorded by Story 6.4 (2026-11-10); every field verified against
`js/game.js:116-118,164-301` and the 17-key fence `tests/altitude.test.js:43`.

**Run** — immutable record, 17 keys (fence: `tests/altitude.test.js:43`);
states `idle → running ↔ choose → over` (`idle` is written ONLY shell-side at
`js/shell.js:130`; `tickRun` never emits it). Fields:

- `status` — run FSM, v1
- `score` — points; `score += scoreMul` per pass (Story 2.1)
- `altitude` — **2.5 u per point** (`ALT_PER_POINT`, `js/game.js:42,182` —
  Story 6.2 retuned from the 2.0 placeholder)
- `skips` — cleared-pass count; the pacing clock: offers every 10th, width
  2→3 after 30 (`js/upgrades.js:105-112`)
- `effects` — `{floatMul, ropeMul, scoreMul, windowMul, launchMul}`
  (endofunction multipliers; `launchMul` added by Story 3.2)
- `offer` — 2–3 cards during `choose`, else `null`; the win tick clears it
  (2.2/2.4)
- `owned` — {cardId: lifetime count} (deal filter + HUD; caps Spare Rope 4 /
  Steel Cord 2 / Second Wind 2 — the lifetime-lock wall, Known Debt w1)
- `buffer` — 0.1 s forgiveness window on the phase clock, decays
  `dt × ropeMul / periodMul` (D-N01)
- `streak` — near-miss chain (1.4); zeroed by trip/strip/comfortable clear
- `ropes` — **1–5, live HP** (`clampRopes`; trip −1 + blank `ropeCount−1`
  crossings, FR2; `extrarope` +1 cap 4; read by HUD pips (1.3), the 3D ghost
  pool (5.3), the state-aware deal filter)
- `charged` — **0–2** (`clampCharged`/`MAX_CHARGED`; Steel Cord armor —
  consumed instead of a rope, blank spans a full revolution, FR12/3.3)
- `airJumps` — **0–1** (`clampAirJumps`; refreshed on ground contact iff
  Second Wind owned, `js/game.js:162`, FR12/3.4)
- `iFrames` — crossings-until-blank-ends, NOT a clock (NFR8; non-finite reads
  as gate-open, capped to MAX_ROPES, FR3; the summit-peak check is suppressed
  while >0 — 4.5's DENY interlock)
- `area` — **1–5 ladder index** (`clampArea`; 4.1 heals crafted domains;
  one-way up)
- `baseAltitude` — the ceiling we just left; a derived floor
  (`AREAS[area−2].ceiling`; arealadder §pinned)
- `outcome` — `null | 'tripped' | 'summit'` (2.2/2.4; drives saveBest-once +
  win/lose presentation)

**Event channel** — `tickRun` returns a per-tick `events` array (order =
causality): `jump`, `skip`, `nearMiss`, `offer`, `chargeUsed` (3.3),
`ropeLost` (1.2/5.2), `trip` (fatal-only, 2.4), `win`, **`ascend`** — nine
names; the shell maps seven to JUICE_TIERS rows (`js/shell.js:15-23`; `jump`
gets no juice) and eight to audio VOICES (ceilingbreak §6 exact-census fence).

**Ascent events** (Stories 4.1/4.2, FR9/FR15): once per tick,
`peak = altitude + y` (post-step sample, no second clock) crossing
`> AREAS[area−1].ceiling` with `iFrames == 0` → non-summit:
`baseAltitude := ceiling`, `area += 1`, push `ascend` — the NEXT tick reads
the new tier's `periodMul` (4.2 D-b: phase stays continuous, NFR8), the vista
flips (4.3), the stinger fires (5.1), the marker re-arms; summit (area 5):
`outcome 'summit'`, any same-tick `offer` field AND its channel cue are
cleared (2.2/2.4). Exactly-one-ascend-per-tick (`if`, never `while` — 4.1
interlock); level-triggered, no banking (4.5).

**Persistence (as-built)**: localStorage `'jumprope-best'` (bare v1 key — the
versioned `jumprope-best-altitude` of `game-architecture.md` was never
shipped; accepted 2026-11-10 per ledger :159) + mute/volume, all via the
injected storage seam; degrades to session-only; **no run record is ever
persisted** (permadeath, FR23).

## Invariants & Guardrails

- Dependency graph is a DAG; no circular imports.
- No module-scope mutable state outside the shell closure; `typeof document`
  guards keep all modules importable under Node.
- Reduced motion dampens cosmetics only — rope timing and judgment stay
  byte-identical; the flag is never persisted.
- Frozen-test discipline: existing `tests/*.test.js` files stay byte-identical;
  new behavior is pinned by new test files. Test expectations derive from
  card/metadata records, not hardcoded tables.
- Every factory return contract gets a Node-side contract test in the same
  change that introduces it; gesture/audio guards get red-green test legs when
  written, not at verification. (v1.0 retrospective lessons.)

## Delivery & Tooling

- Plain ES modules, no build step, no npm deps (`package.json` is
  `{ type: "module" }` only); Three.js via importmap-pinned CDN, render shell
  only.
- Tests: the one gate `./run_tests.sh` — Node's built-in runner under the hood
  (`node --test tests/`, Node ≥ 18, `node:test` + `node:assert/strict`);
  deterministic via seeded rng injection; the v1 1000-tick headless-sim legs
  sit beside the seeded policy-bot summit batch (3 shapes × 40 seeds × 43,200
  ticks — Stories 6.1/6.2, `tests/support/summit-gate.js:150`).
- Serve with any static HTTP server (`npx serve .` / `python3 -m http.server`).

## Known Debt

- (w1) **Owned-cap lifetime lock** — Spare Rope (cap 4), Steel Cord (cap 2)
  and Second Wind (cap 2) hide their card once the LIFETIME `owned` count
  hits the cap — even when the effect is spent or stripped
  (`js/upgrades.js:37-51` caps + `isAvailable` :67-68; the deal filter in
  `js/game.js:166-275`). A stripped Spare Rope never reappears. Policy-bot
  builds brush the wall: extrarope ≈3.4 picks/run vs cap 4 (Story 6.3
  sweep). The decision is re-pointed post-v2 by Story 6.3 Decided-6 —
  correct-course lane; recorded as fact here, not re-litigated (ledger :154).
- (w2) **Seed-sensitivity flake surface** on batch-driven legs — OPEN by
  design; Story 6.3 is the last scheduled sweeper (ledger :244-246).
- Retired by Story 6.4 (2026-11-10): **WR-02 — PAID** by Story 5.4 (2026-11-09,
  the `beat` gate at `js/render3d.js:575`; ledger :221); **`audio/track.ogg`
  — shipped** by Story 5.6 (2026-11-09; ledger :206).
