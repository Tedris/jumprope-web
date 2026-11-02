---
title: 'Game Architecture'
project: 'jumprope-web'
date: '2026-10-28'
author: 'Ed'
version: '1.0'
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9]
status: 'complete'
engine: 'Vanilla ES modules + Three.js r186'
platform: 'Web browser (static files)'

# Source Documents
gdd: '_bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd.md'
epics: '_bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/epics.md'
brief: null
---

# Game Architecture

**Executive summary:** Jumprope Web v2 ("The Ascent") extends a shipped,
zero-dependency, pure-core/no-build-step browser game into a winnable vertical
roguelike. The architecture adds state to the immutable run record (ropes-as-HP,
altitude, areas) under three structural rules — one canonical phase clock, one
run-record mutation contract (`applyCard`/`resolveTrip`), one rope-rate
derivation — so every v2 mechanic is data, deterministic, and boundary-tested.
Engine stack is unchanged (vanilla ES modules + Three.js r186, verified
2026-10-28); all new complexity is designed to land in the pure simulation core.

## Document Status

This architecture document is being created through the GDS Architecture Workflow.

**Steps Completed:** 9 of 9 — **status: complete** (validated 2026-10-28)

**Source context:** the v1.0 architecture spine
(`_bmad-output/planning-artifacts/architecture.md`) and the finalized GDD +
epics are treated as input; this document records the decisions for v2
("The Ascent").

---

## Project Context

### Game Overview

**Jumprope Web** — One-button, browser-playable rope-jump roguelike. Skip rope
in a dithered PS1-style scene; ropes are health, altitude is score, punching a
jump through an area ceiling ascends; break the summit ceiling (area 5) to win.
Demake in the spirit of Scarlet Skips — spirit, not letter.

### Technical Scope

**Platform:** Web browser (desktop + mobile, WebGL, static files, no server)
**Genre:** Roguelike (single-input rhythm-arcade feel)
**Project Level:** Medium scale; complexity ranked by irreversibility (see below)
**Stack:** Vanilla ES modules, no build step; Three.js (CDN pin) as render shell only

### Core Systems

| System | Complexity | Why it's hard |
|--------|-----------|---------------|
| Altitude ↔ score schema | High (irreversible) | One run-state migration touching scoring, HUD, persistence, and win logic at once; wrong shape = permanent retrofit |
| Card-effect contract | High (irreversible, open decision) | Rule-changing cards break the v1 "effects = pure multiplier endofunctions" pattern; the chosen shape is expensive to undo once four state-changing cards depend on it (see Ambiguity Flags / Step 4) |
| Multi-rope trip resolution | High (local, provable) | Combinatorial state (buffer × charge × rope count × i-frames); code is small, the *proving* is the mountain |
| PS1 renderer | Medium | N sag-baked ropes, per-area palette/fog vistas — Medium only because the boundary fence already holds; must *read* state (i-frames, ascent), never infer it |
| Runtime shell | Medium | Fixed-step loop; lifecycle extended to i-frames/win state via the shared release/resume path |
| Jump physics | Medium | Fixed step 1/120; hold-charge; + Second Wind mid-air jump (resets on ground contact) |
| Procedural audio | Low | New ascent stinger, win fanfare, strip thud |
| Persistence | Low | Best-altitude + settings; session-only fallback; v1 best-score key meets the altitude schema (see Ambiguity Flags) |

### Technical Requirements

- 60 FPS at 240-row internal render on integrated GPUs; frame-rate-independent sim
- Load-to-first-jump < 2 s; all geometry procedural; zero bitmap texture budget
- Determinism: sim pure, rng injected; headless policy-bot balance gate (5–20% summit band)
- Sim/render boundary fence holds for every new mechanic (tests/boundary.test.js)
- New HUD/vista layers inside the aspect-correct letterbox resize path
- Identifier ↔ design-term mapping table maintained in architecture.md (the GDD
  punted it there; four state-changing cards make drift a live risk)

### Complexity Drivers (ranked by irreversibility)

1. **Score↔altitude unification** — one schema decision locking in scoring, HUD,
   persistence, and win conditions downstream
2. **Card-effect contract** — OPEN DECISION (Step 4): `applyCard` as a whole-record
   patch-function vs the v1 effects-subfield endofunction. Rule-changing cards must
   write sibling fields (`ropes`, `charges`, `airJumps`); testability (one-line
   per-card contract tests) and a single HUD read-path favor whole-record. Settle
   before Epic 3 draws four dependents.
3. **Counting clocks** — OPEN DECISION (Step 4): with N ropes, passes accrue N×
   per revolution, decoupling skip-count from wall-clock. Architecture must state
   which counter each gate ticks on (offer cadence, ladder, area entry, i-frame
   duration). "The rope's phase is the canonical clock" needs its scope written
   down: canonical for scoring window, pose, and audio — for *gates* or not?
4. **Trip-resolution matrix** — buffer × Steel Cord charge × rope count × i-frames;
   locally fixable but exhaustively provable
5. **State readability** — i-frames and ascent are run-state fields the renderer
   *reads, never infers*: ghosting must look like ghosting (a blank on the clock
   otherwise reads as broken); ceiling breaks must land as *moments*, not numbers
6. **Phase-clock integrity** — area period multipliers modulate the clock's rate,
   never re-clock it (pillar 2 + demake-ethics: no beat-lock)

### Ambiguity Flags (each becomes a Step 4 decision)

1. **Strip order determinism** — "trip strips the fastest rope" needs a total
   ordering with a named tie-break (equal-period ropes). Trips touch no rng; they
   must stay pure for the determinism doctrine to hold. Encode the rule, never
   rely on field/insertion order.
2. **Rope-wrap bound composition** — v1's speed caps keep the rope inside the
   wrap bound "by construction"; a second multiplicand (per-area period pressure)
   breaks that claim. The bound needs one owner: clamp the product, re-derive the
   per-card cap under worst-case area, or a loud sim assert.
3. **State change during i-frames** — rope-count changes mid-blank (Spare Rope
   pick, Steel Cord events) must not extend or shorten the i-frame's wall-clock
   end. Freeze-the-freeze semantics are a rule to encode, not an emergent accident.
4. **Best-score storage migration** — shipped v1 `jumprope-best` holds score
   units; v2 records altitude (2 u/pt). Migrate-on-load (carry the v1 constant)
   vs version-and-reset (clean slate). Small but irreversible on first v2 write;
   party lean: version-and-reset — Ed's call.

### Technical Risks

- Logic leakage into render/HUD via state-changing cards (boundary fence erosion) —
  the owned-card HUD's state counters are the prime hotspot: they must read the
  single run record, never stitch multiple sources
- Ambiguity-driven agent divergence: four flagged points where two AI agents
  would implement different games (see Ambiguity Flags) — resolve in Step 4
  before Epic 1 stories open
- Invariant drift: v1 guarantees stated "by construction" silently lose that
  status when new multipliers compose into the same product (rope-wrap bound is
  the known instance; audit the phrase across architecture.md)
- Frozen-test discipline × four new mechanics: a combinatorial proving matrix
  (trip-matrix × card transitions × area transitions), each story demanding
  red-green legs and new test files — the dominant cost of v2
- Invariant break: period multipliers re-clocking the phase (epic 4.2 trap)
- Undecided art gag (jiggle vs cel) forks rendering conventions if deferred past
  art-epic lock
- Docs drift: design terms and code identifiers diverging without the mapping table

---

## Engine & Framework

### Selected Engine

**Vanilla ES modules + Three.js** r186 (`three@0.186.1`, importmap-pinned CDN)

**Rationale:** Revalidation, not migration (v2 of an existing project). The hard
constraints — pure Node-importable sim core, <2 s load-to-first-jump, static
files with no build step, custom PS1 shader pipeline — disqualify the
alternatives researched Oct 2026: Godot 4.6 web export (WASM/GDScript kills
headless determinism; ~6–12 MB gzipped breaks the load budget), Phaser 4.2
(2D-only lane), PlayCanvas 2.24 (component model would re-clock the sim loop;
ecosystem pulls toward its editor/tooling). Three.js sits at exactly current
stable (r186, Sep 2026) and is consumed solely by `js/render3d.js` — the
boundary fence keeps it a render leaf.

### Engine-Provided Architecture

| Component | Solution | Notes |
|-----------|----------|-------|
| Rendering | Three.js WebGL scene graph + raw shaders | PS1 RT/vertex-snap/dither pass built on top, not provided |
| Physics | Custom (player.js ballistic sim) | Fixed step 1/120, frame-rate independent |
| Audio | Raw WebAudio (audio.js) | Procedural voices, gesture-gated context |
| Input | Browser Pointer/Keyboard events | Normalized in shell.js, shared release path |
| Scene management | Imperative assembly in render3d.js | No scene files, no editor, all geometry procedural |
| Build system | None | Bare ES modules + importmap pin |

Three.js provides almost no architectural decisions by design — that absence is
what preserves the pure-core doctrine. Everything above marked custom is
already fixed by the shipped v1 tree.

### Starter Template

None — existing shipped codebase; `index.html` and `package.json` are
deliberately near-frozen.

### Development Environment — AI Tooling

- **Context7** (upstash/context7, MCP): version-current Three.js doc lookup for
  AI agents. Guardrail against stale-API suggestions (r186 removed
  `PCFSoftShadowMap`, deprecated `Clock`; agent training data predates these).
- No engine-bridge MCP: Three.js has no editor to bridge; live-state inspection
  is served by the headless Node test suite (deterministic, citable).

### Remaining Architectural Decisions

To be made explicitly in Step 4:

1. Run-state record schema (altitude↔score unification, rope list, win state)
2. Card-effect contract: `applyCard` whole-record patch vs effects endofunction
3. Counting clocks: which counter each gate ticks on (offers, ladder, area entry)
4. Trip-resolution encoding + deterministic strip tie-break
5. i-frame semantics incl. state-change-during-i-frames rule
6. Rope-wrap bound ownership under card × area multiplier composition
7. Area data model + phase-clock-safe period multipliers
8. Storage versioning (v1 `jumprope-best` → altitude)
9. State-machine encoding + identifier↔design-term mapping (extends spine)

---

## Architectural Decisions

### Decision Summary

| Category | Decision | Version | Rationale |
|----------|----------|---------|-----------|
| State management | Altitude-canonical run record; ropes as ordered `[{mul, charged}]`; win as data | n/a (pure JS) | "Score *is* altitude" holds structurally, not by sync discipline; strip order has a substrate |
| Card system | `applyCard(run, card) → newRun` whole-record patch functions | n/a | One contract for 12 cards; one-line contract tests; single HUD/persistence read path |
| Time & gating | Passes count events; revolutions modulate pressure; no gate ticks on wall-time | n/a | Each clock drives what it honestly measures; GDD pacing note encoded as rule |
| Trip resolution | Single pure `resolveTrip` waterfall; strip = max `mul`, ties → highest index | n/a | Priority order structural, not test-pinned; trips stay rng-free |
| i-frames | Revolution-expiry, phase-anchored (`iFramesEndAt = phase`) | n/a | "Constant blank" true by construction; immune to mid-blank rope-count changes |
| Rope-speed bound | Single `ropeRate = min(base × effectMul × areaMul, WRAP_MAX)`; caps-never-reach-clamp test | n/a | One owner; sim/renderer can't disagree; survives future multiplicands |
| Areas | One frozen `AREAS` table (`js/areas.js`), pure data rows, both consumers | n/a | One row = one area = one diff; multipliers exist only inside `ropeRate` |
| Persistence | Version-and-reset (`jumprope-best-altitude`); v1 key never read, never deleted | key schema v2 | Zero migration surface for one number; rollback-safe |
| State machine | Flat data encoding (v1 pattern extended); i-frames/ascend are fields, not statuses | n/a | No representable-but-illegal states; `tripped` precedent |
| Rendering stack (revalidated) | Three.js via importmap CDN pin, render-leaf only | r186 (0.186.1), verified 2026-10-28 | Current stable; alternatives fail determinism/load/no-build constraints |

### Run-State Schema

`Run = { status, outcome, altitude, skips, area, ropes: [{ mul, charged }],
effects, owned, offer, buffer, iFramesEndAt, airJumps, ... }` — one POJO,
spread-copied, no nested sub-state beyond `effects`.

- `status`: `'idle' | 'running' | 'choose' | 'over'` (v1 enum **unchanged**)
- `outcome`: `'tripped' | 'summit'` on `over` — the win is data, no new status
- `altitude`: the single persisted number; per-pass points fold in-tick as
  `altitude += 2 × passScore`; `score` survives only as per-pass/event prose
- `ropes`: ordered chronologically (Spare Rope appends) — strip tie-break depends
  on this ordering; `charged` is Steel Cord's flag, not a side-table
- i-frames live *inside* `running` as `iFramesEndAt` (a phase value); ascend is an
  instantaneous `run.area` bump. Neither is a status: legal state-space stays flat.

### Card-Effect Contract

Every card is a pure `applyCard(run, card) → newRun`; multiplier cards are simply
the subset that touch only `run.effects`. Caps live beside each card's patch.
Contract test per card, one line each, in the same change (frozen-test doctrine).
The owned-card HUD reads run state only — never card internals.

### Time & Counting Rule

> Passes count events; revolutions modulate pressure; no gate ticks on wall-time.

Offers fire on pass-count multiples; ceilings test jump-peak; area pressure is a
rate factor only. Wall-clock compression from multi-rope builds is balance-owned
(policy-bot gate, Epic 6.1), not architecture-owned.

### Trip Waterfall (single decision point)

`resolveTrip(run)` order: **buffer → charge consume → strip rope → i-frames →
death**. Strip = max `mul`, ties by highest array index (newest rope sheds;
chronology makes it a total order). All v2 mechanics route through this function;
none may resolve trips inline. The Steel-Cord-vs-last-rope ordering question
(epic 3.5) is answered structurally: charge consumes *before* any strip.

### Rope-Rate Chain

`ropeRate(run) = min(BASE_PERIOD⁻¹ × effectMul × AREAS[area].periodMul, WRAP_MAX)`
— sole speed producer, consumed by sim and renderer. `WRAP_MAX` derived from
`STEP`. Guard test: no legal card-stack × any area reaches the clamp.

### Persistence

Key `jumprope-best-altitude` (v2); v1 `jumprope-best` never read, never deleted.
Settings keys carry over unchanged. Session-only fallback unchanged.

### Identifier ↔ Design-Term Mapping (deliverable, extends spine)

| Design term (GDD) | Code identifier |
|-------------------|-----------------|
| skip / pass | `skips` (pass counter) |
| rope period | `BASE_PERIOD`, factors of `ropeRate` |
| rope speed cards | `ropeMul` (effects field) |
| hang time | `floatMul` |
| clearance window | `windowMul` / clearance threshold |
| mercy buffer | buffer fields on `run` |
| i-frames | `iFramesEndAt` |
| altitude | `altitude` (was `score` in v1 — see migration note) |
| area pressure | `AREAS[n].periodMul` |
| ropes (HP) | `run.ropes.length` |

**Convention:** every new design term adds its table row in the same change that
introduces the term.

### Architecture Decision Records (context for the two irreversible bets)

- **ADR-1 Altitude-canonical:** rejected keep-both-fields and derive-on-read;
  chose one field so score/altitude divergence is structurally impossible.
  Consequence: v1 prose/test references to `score` are historical; mapping table
  row added.
- **ADR-2 Whole-record `applyCard`:** rejected two-layer effects+handlers and
  declarative patch-DSL; chose uniform patch functions — less machinery, uniform
  tests. Consequence: spine's "effects is the upgrade surface" phrasing updated.

---

## Cross-cutting Concerns

These patterns apply to ALL systems and must be followed by every implementation.

### Error Handling

**Strategy:** Invalid states are data, never thrown errors. Pure modules neither
throw nor catch. try-catch exists only at the IO seam in `shell.js`.

**Levels (all data or seam-local, no exception taxonomy):**
- *Gameplay invalidity* — trip, cap breach, double-ascend: encoded as state
  fields; the waterfall/patch functions resolve them by returning new state
- *IO failure* — storage parse, AudioContext construction: caught at the seam,
  degrade silently (session-only storage / silence), game never pauses
- *Invariant breach* — WRAP_MAX clamp, phase monotonicity: caught by tests, not
  at runtime; production behavior is the clamp itself

**Example:**

```js
// js/game.js — pure: loss is data
function resolveTrip(run) {
  if (run.buffer > 0) return { ...run, buffer: 0 };          // near-miss save
  const charged = lastChargedIndex(run.ropes);
  if (charged >= 0) return { ...run, ropes: consumeCharge(run.ropes, charged) };
  if (run.ropes.length <= 1) return { ...run, status: 'over', outcome: 'tripped' };
  return beginIFrames(stripFastest(run));                      // data, not error
}

// js/shell.js — seam: hostile bytes, silent degrade
function loadBest(storage) {
  try {
    const rec = JSON.parse(storage.getItem('jumprope-best-altitude'));
    return rec && rec.v === 2 ? rec.value : 0;
  } catch { return 0; }
}
```

### Logging

**Format:** none — no logger, no levels, no console output in pure modules
(existing convention, unchanged).
**Destination:** n/a. Debugging surface = `node --test` suite (any state is
constructible/citable), seeded headless replays, the balance gate.

**Rule:** hot paths (120 Hz tick, render pose) stay allocation- and side-effect-
free; if a bug needs observing, make it *reproducible* (seed the rng in a test)
rather than loud. The shell may hold an injected `log` no-op for seam fallbacks
only.

### Configuration

**Approach:** inline UPPER_SNAKE constants — no config files, no env vars.
Three sanctioned homes:

| Type | Home | Examples |
|------|------|----------|
| Physics/timing | module constants | `STEP`, `GRAVITY`, `BASE_PERIOD`, `WRAP_MAX` |
| Balance/content | data tables | `AREAS` rows, `UPGRADES` card effects/caps, altitude-per-point |
| Player state | storage seam | `mute`, `volume`, `jumprope-best-altitude` |

**Rule:** every tunable lives in exactly one row of exactly one table; a balance
change is a table diff touching no logic.

### Event System

**Pattern:** events as **return values** on the existing one-way sim→shell
channel. No emitter, no bus, no subscriptions — nothing may call back into the
sim.

**Naming:** lowercase literal event names, extended in the same change as the
mechanic: v1 `skip | nearMiss | trip | offer` + v2 `strip | ascend | win`
(i-frames need no event — `iFramesEndAt` is read state, per Decision 5).
Coalescing rules live in the doc (near-miss callouts: one per revolution).

**Example:**

```js
// pure: tick returns events; shell fans out to audio + renderer; neither replies
function tickRun(run, input, dt, clock, rng) {
  // ... phase advance, pass detection ...
  if (passedFeet) return [{ ...run, altitude }, ['skip']];
  if (tripped)    return resolveTripWithEvents(run);          // ['strip'] etc.
}
```

### Debug Tools

**Available tools:** the test suite as state inspector; seeded headless sim +
policy-bot balance gate (Epic 6); reduced-motion toggle (accessibility, not
debug).

**Activation:** none in-page — no debug console, cheat commands, or overlays,
in any build (there is no second build). Determinism + frozen tests are the
debugger; anything not reproducible from a seed is a bug in the sim, not in a
missing log.

---

## Project Structure

### Organization Pattern

**Pattern:** Flat modules by architectural layer — `js/<word>.js`, one lowercase
word per system, purity layer known by name and enforced by the import-graph
walk in `tests/boundary.test.js`. No subfolders in v2.

**Rationale:** ~10 files make folders pure indirection; the mirrored
`tests/<module>.test.js` convention and the frozen-test doctrine both key off
flat filenames. The rule that keeps flat honest: *a new file appears only when
a new pure-data subject is consumed by two layers* — v2's single instance is
`areas.js`. New logic otherwise extends the module that already owns its
subject. No `utils/`, no `core/`, no file moves.

### Directory Structure

```
jumprope-web/
├── index.html                  # near-frozen (importmap pin only)
├── package.json                # near-frozen ({ name, private, type })
├── js/
│   ├── game.js                 # run orchestration; + altitude fold, ascend,
│   │                           #   outcome, resolveTrip waterfall
│   ├── rope.js                 # + multi-rope N phase-offset passes, ropeRate chain
│   ├── player.js               # + Second Wind air-jump budget (ground-contact reset)
│   ├── upgrades.js             # + 4 rule-changing cards as applyCard patches
│   ├── areas.js                # NEW: frozen AREAS table — pure data, sim + renderer
│   ├── interpolate.js          # unchanged (lerpPhase)
│   ├── shell.js                # + ascend/win event fan-out, v2 best-key seam
│   ├── render3d.js             # + N ropes, i-frame ghost (reads iFramesEndAt),
│   │                           #   per-area vista rows
│   └── audio.js                # + ascend/win/strip voices (leaf)
├── tests/
│   ├── *.test.js               # existing files byte-frozen
│   ├── areas.test.js           # NEW: ladder contract + caps-never-reach-clamp
│   ├── trip.test.js            # NEW: trip matrix (rope × buffer × charge × iframe)
│   ├── ascent.test.js          # NEW: peak/ceiling/ascend/win matrix
│   └── <behavior>.test.js      # new file per new behavior (frozen-test doctrine)
├── audio/
│   └── track.ogg               # content-deferred (TRACK-1); degrades to silence
└── _bmad-output/ · docs/       # planning & knowledge — not shipped
```

### System Location Mapping

| System | Location | Responsibility | Purity |
|--------|----------|----------------|--------|
| Run orchestration, trip waterfall, win/ascend | `js/game.js` | `createRun` / `tickRun` / `applyCard` / `resolveTrip` | pure |
| Multi-rope passes, rope-rate chain | `js/rope.js` | phase clock, `atFeet`, `ropeRate` (sole speed producer) | pure |
| Jump physics | `js/player.js` | hold-charge ballistics, squash-spring, air-jump budget | pure |
| Card catalogue + offers | `js/upgrades.js` | 12 cards as patch functions, caps, `pickOffers(rng)` | pure, rng param |
| Area ladder | `js/areas.js` | ceilings, periodMul, palette/fog/vista data | pure data |
| Frame loop, input, pause, storage, resize | `js/shell.js` | fixed-step accumulator, lifecycle, IO seam | impure seam |
| PS1 pipeline, ropes, ghosts, vistas | `js/render3d.js` | one-way view-payload consumer; reads state, infers nothing | impure, sole `three` |
| SFX voices, master bus | `js/audio.js` | event-channel-fed voices, gesture-gated context | leaf |

### Naming Conventions

#### Files
- Lowercase single-word modules in `js/`; tests mirror module names
  (`tests/areas.test.js`); relative imports always with `.js` extension;
  named exports only.

#### Code Elements
| Element | Convention | Example |
|---------|-----------|---------|
| Functions | `camelCase` | `pickOffers`, `resolveTrip` |
| Factories | `create*` → fresh POJO | `createRun()` |
| Transitions | `update*` / `apply*` → new object, never mutate | `applyCard(run, card)` |
| Predicates | read as questions | `atFeet()`, `crossesCeiling()` |
| Constants | `UPPER_SNAKE` | `WRAP_MAX`, `BASE_PERIOD` |
| Effect fields | `*Mul` suffix | `ropeMul`, `floatMul` |
| v2 state fields | as decided (Decision 1) | `altitude`, `iFramesEndAt`, `airJumps`, `outcome` |
| Event names | lowercase literal strings | `'skip'`, `'strip'`, `'ascend'`, `'win'` |

#### Game Assets
No asset naming — all geometry procedural, zero bitmap texture budget; the one
file slot is `audio/track.ogg` (lowercase, purpose-named).

### Architectural Boundaries

1. Pure sim graph (`game/rope/player/upgrades/areas/interpolate`) imports
   nothing browser-side; no `three`, DOM, `Date`, `Math.random`, storage —
   mechanically enforced by `tests/boundary.test.js`.
2. `render3d.js` is the sole `three` consumer; `audio.js` stays a leaf absent
   from the sim import graph.
3. Data flow is one-way: shell → renderer/audio (view payload + event lists);
   no channel returns into the sim.
4. `areas.js` holds pure data only — vista fields are numbers/hex/params, never
   GPU objects (Decision 7's convention line).
5. `index.html` / `package.json` near-frozen; changes need justification past
   the boundary-fence greps.

---

## Implementation Patterns

These patterns ensure consistent implementation across all AI agents.

### Novel Patterns

#### Phase-Offset Multi-Rope

**Purpose:** Render N ropes of gameplay truth from a single canonical clock —
zero drift is possible because there is nothing to drift.

**Components:**
- `rope.js` — the sole interpreter of the phase clock; `ropeRate(run)` yields
  rate; rope *i* of *N* owns feet-window at `phase ≡ (i / N + 0.5) mod 1`
- `run.ropes` — ordered records supplying `mul` (per-rope rate from source
  cards) and `charged`; window *scheduling* uses count/offset, *strip* uses `mul`
- Renderer — poses N sag-baked geometries from `lerpPhase` theta at the same
  offsets; geometry mirrors the sim formula, never its own timing

**Data flow:**

```
phase (canonical, monotonic) ──► offset windows [0.5, 0.5+1/N, …] ──► pass events
                              └► rope geometry theta per offset      └► resolveTrip per failed pass
```

**Implementation guide:**

```js
// rope.js — pass detection iterates OFFSETS, never "each rope object's timer"
function passesThisStep(phase0, phase1, count) {
  const hits = [];
  for (let i = 0; i < count; i++) {
    const w = ((0.5 + i / count) % 1);            // feet-window center
    if (crossed(phase0, phase1, w)) hits.push(i);  // wrap-aware crossing
  }
  return hits;                                      // ordered; empty most steps
}
```

**Edge cases:** WRAP_MAX keeps ≤ 1 crossing/rope/step by construction; count
changes mid-step impossible (state changes land on tick boundaries).

#### Revolution-Anchored i-Frames

**Purpose:** A duration that is *of the rope's clock*, not wall-time — survives
any future rope-count mutation without bookkeeping.

**Components:** `beginIFrames(run)` stamps `iFramesEndAt = phase` at strip;
tick predicate `inIFrames(run, phase) = run.iFramesEndAt !== null &&
!wrappedPast(phase, run.iFramesEndAt)`; renderer reads the predicate — infers
nothing (state-readability driver).

**Implementation guide:**

```js
// game.js — expiry is one phase-wrap, so rope count never appears here
function tickRun(run, input, dt, clock, rng) {
  const phase = advancePhase(run.phase, ropeRate(run) * dt);
  if (inIFrames(run, phase)) return [{ ...run, phase }, []];   // true blank
  // …pass windows, trips…
}
```

**Edge cases:** mid-blank Spare Rope → ghost length unchanged (future only);
mid-blank ascend → remaining blank scales because the *period* changed — both
honest, both tested. `iFramesEndAt === null` is the only non-i-frame encoding.

#### Freeze-the-Freeze

**Purpose:** Two frozen things stay coherent by construction: the `choose`
overlay freezes the *canonical clock itself* (v1 precedent), so i-frame expiry,
pass windows, and offers all pause together — no "picked during the ghost"
special case exists to write.

**Rule:** any new timed state must expire on the phase clock so that the
`choose` freeze covers it for free; nothing may count ticks while frozen.

### Communication Patterns

**Pattern:** Direct calls with immutable payloads; events are return values.
No emitters, no shared mutable context, no DI beyond injected `rng`/`storage`.

```js
// shell.js — the entire cross-layer API, one direction
const [nextRun, events] = tickRun(run, input, STEP, clock, rng);
renderer.draw(viewPayload(nextRun, clock));   // state + cosmetic clock
audio.react(events);                           // fire-and-forget, leaf
```

### Entity Patterns

**Creation:** `create*` factories returning frozen-ish POJOs; no classes, no
pooling (≤5 ropes, zero spawns).

```js
// rope.js — one entry per rope; mul from source card, charged by Steel Cord
function createRope(mul = 1) { return { mul, charged: false }; }
```

### State Patterns

**Pattern:** Flat-field transitions inside pure functions — `status` enum plus
substate *fields* (`iFramesEndAt`, `airJumps`, `outcome`); transitions are
branch-returns, never mutation or FSM objects.

```js
// upgrades.js — Second Wind: budget field, reset by ground contact in player.js
applyCard: (run) => ({ ...run, airJumps: (run.airJumps ?? 0) + 1,
                       owned: [...run.owned, 'doublejump'] })
```

### Data Patterns

**Access:** read-only imported module tables; consumers index, never copy.

```js
// areas.js — frozen rows; ceiling = the one that ends this area, periodMul for
// sim via ropeRate only, palette/fog for renderer (Decision 6/7)
export const AREAS = Object.freeze([
  { area: 1, name: 'alley',         ceiling:   250, periodMul: 1.00, palette: 'alley',    fog: 0x1a1a2e },
  { area: 2, name: 'rooftops',      ceiling:   600, periodMul: 0.96, palette: 'rooftops', fog: 0x16213e },
  // …blimp 1000 / stratosphere 1500 / moon-approach 2100 (summit win ceiling)
]);
```

### Consistency Rules

| Pattern | Convention | Enforcement |
|---------|-----------|-------------|
| State changes | return new object via spread; never mutate | review + contract tests |
| New timed state | expire on phase clock (Freeze-the-Freeze) | trip/ascent tests + review |
| Trip handling | call `resolveTrip`; never resolve inline | trip.test.js matrix |
| Rope speed | obtain from `ropeRate(run)`; never compose locally | areas.test.js clamp gate |
| Card effects | `applyCard` patch function + 1-line contract test | catalogue tests per card |
| HUD/state reads | from run record fields only | boundary.test.js + review |
| New design terms | same-change mapping-table row | review checklist |

---

## Architecture Validation

### Validation Summary

| Check | Result | Notes |
|-------|--------|-------|
| Decision Compatibility | PASS | No conflicts; clock-decision cross-compose verified (choose-freeze ⇒ phase-freeze ⇒ i-frame freeze; ropeRate sole chain) |
| GDD Coverage | PASS | 8/8 systems and all technical requirements covered; number-key picker noted as shell-input story work, not an architecture gap |
| Pattern Completeness | PASS | Communication/entity/state/error/data/events all defined; 3 novel patterns documented with components, flow, and edge cases |
| Epic Mapping | PASS | Epics 1–6 map to file locations, patterns, and named test files |
| Document Completeness | PASS | Version column + executive summary added during validation; no placeholder text |

### Coverage Report

- **Systems Covered:** 8/8
- **Patterns Defined:** 7 (4 standard + 3 novel: Phase-Offset Multi-Rope,
  Revolution-Anchored i-Frames, Freeze-the-Freeze)
- **Decisions Made:** 10 (9 workflow decisions + engine revalidation) + 2 ADRs

### Issues Resolved

1. Decision summary table lacked the required Version column → added
   (Three.js r186 verified 2026-10-28; zero-dependency stack → n/a elsewhere)
2. Executive summary missing at document top → added
3. AREAS example ceiling semantics corrected (row ceiling = ceiling that *ends*
   the area: Alley 250 … summit 2,100)

### Validation Date

2026-10-28

---

## Development Environment

### Prerequisites

- **Node.js ≥ 18** — runs `node --test tests/`; no npm packages are installed
- **Any static HTTP server** for play — ES modules require HTTP, not `file://`
  (`npx serve .` or `python3 -m http.server`)
- **Modern evergreen browser** with WebGL (Three.js r186 loads via the
  `index.html` importmap CDN pin)

### AI Tooling (MCP Servers)

| MCP Server | Purpose | Install Type |
| ---------- | ------- | ------------ |
| [Context7](https://github.com/upstash/context7) (`@upstash/context7-mcp`) | Version-current Three.js doc lookup — guards against stale-API suggestions (r186 removed `PCFSoftShadowMap`, deprecated `Clock`) | `npx` |

**Setup:** `claude mcp add context7 -- npx -y @upstash/context7-mcp` (or the
equivalent MCP-client config).

No engine-bridge MCP: Three.js has no editor to bridge; live-state inspection is
served by the headless Node test suite (deterministic, citable).

### Setup Commands

```bash
# Clone — there is no init step; the shipped tree IS the project.
git clone <repo> && cd jumprope-web

node --test tests/            # full suite must be green (< 10 s gate)
python3 -m http.server 8080   # play at http://localhost:8080
```

### First Steps

1. `node --test tests/` — confirm the frozen v1 suite is green before touching anything
2. Read the spine (`_bmad-output/planning-artifacts/architecture.md`) + this document's Consistency Rules table
3. Configure Context7 per the AI Tooling instructions above
4. Start Epic 1 (Ropes as HP) — `rope.js` multi-rope passes with `trip.test.js` red first

---

*Architecture complete — 9 of 9 steps, validated 2026-10-28.*
