---
title: 'Game Architecture'
project: 'jumprope-web'
date: '2026-11-12'
author: 'Ed'
version: '2.0'
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9]
status: 'complete'
engine: 'Vanilla ES modules + Three.js r186'
platform: 'Web browser (static files)'

# Source Documents
gdd: '_bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd.md'
epics: '_bmad-output/planning-artifacts/epics.md'
brief: null
narrative: '_bmad-output/narrative-design.md'
---

# Game Architecture

**Executive summary:** Jumprope Web v3 ("The Training Saga") stacks a day/life/
world layer onto the shipped, gate-proven v1/v2 rope machine — without touching
it. Four structural rules carry the whole design: one immutable game-state tree
(`{meta, life, day, world}`), one settlement transaction (`compost`) that is the
only place days end and the world ages, one rng-derivation discipline that makes
bit-exact shadow replay a product contract, and one monotone ledger that makes
the lossless law executable. Engine stack unchanged (vanilla ES modules +
Three.js r186, pin held); every new mechanic is data, deterministic, and
boundary-tested, and the v2 contracts stay as-shipped beneath the overlay.

## Document Status

This architecture document was created through the GDS Architecture Workflow.

**Steps Completed:** 9 of 9 — status: complete (v3 retarget validated 2026-11-12)

**Source context:** the v1/v2 architecture spine
(`_bmad-output/planning-artifacts/architecture.md`), the retargeted GDD,
epics through Epic 8, and the v3 narrative design are treated as input; this
document records the decisions for **v3 ("The Training Saga")**. The v2
("The Ascent") pass of this document is preserved in git history.

---

## Project Context

### Game Overview

**Jumprope Web** — one-button rope-jump roguelike retargeted to **v3 "Training
Saga"**: the day is the run. A life of training days feeds permanent stats
(supercompensation), replays into shadows (deterministic ghosts of past days),
and posts to a world's gate economy — an incremental in disguise that becomes a
hero sim. The v1/v2 rope machine survives verbatim as the interior of the rope
activity; the v3 overlay stacks on top of it, never inside it.

### Technical Scope

**Platform:** Web browser (desktop + mobile, WebGL, static files, no server)
**Genre:** Roguelike (day-is-the-run; incremental/automation hybrid garnish on the spine)
**Project Level:** High — five shipped versions of engine; the change is
architectural *height* (a day/life/world layer above the run), not a new stack
**Stack:** Vanilla ES modules, no build step; Three.js (CDN pin) as render shell only — unchanged, re-validated by as-built code

### Core Systems

| System | Complexity | Why it's hard |
|--------|-----------|---------------|
| Day scheduler & stamina | High (irreversible) | A new top-level sim loop wrapping the run loop; day state (pool, caps, recordings) persists mid-day; nightfall compost is the only reset |
| Shadow replay | High (irreversible) | Determinism promoted from test hygiene to product contract: seed + inputs per day, bit-exact replay, replay = *read* state inside the fixed-step budget, never a second simulation |
| Persistence v3 + migration | High (irreversible) | Mid-day state, recordings (order-KB/day under localStorage realities), diary, ceilings, life-cards — plus v2→v3 migration (outcome counters become stat-ledger sub-cases); atomic-day-state write discipline |
| Stations (4+1 activities on one tap) | High (local, provable) | Rope grammar generalized to stride/rep/page/tap-fight cadences sharing one input and one clock; each station a mini-sim in the same fixed step |
| Dungeon day-type | Medium-High | Second failure texture (HP, flinch, eject, per-day gate lock) inside the same tap vocabulary; dungeon = palette-flip of the existing stage, zero new geometry class |
| Gate economy & hunter tick | Medium | New world-sim layer: spawn/shelf-life/tick rng, ticked one per *slept* day, frozen while closed; board and news are two reads of one state |
| Stats, feeds, caps, supercomp | Medium | Pure ledger, but touches everything: 1:1 feeds + bleed, per-day caps, 125%-of-failure ceiling rule, hidden RANK weighted sum |
| Content pools (state-keyed prose) | Medium | New data-table content layer (diary/TV/System/ticker registers; slip templates); deterministic keying, mods-friendly, zero copy in code |
| Render: ghosts, wear, skins | Medium | Design-uncapped shadow count inside a fixed frame budget (documented cheaper-far-shadow exception, never a gameplay cap); wear geometry; full-body `.glb` skins on the 17-joint contract with NFR10 texture caps |
| Interrupt push-in | Low | The game's only automatic camera move; shell-level, reads day-state events only |

### Technical Requirements

- 60 FPS @ 240-line internal render with the gym full of ghosts; frame budget
  absorbs replay playback — replays are read state, never second simulations
- Fixed-step 1/120 sim stays frame-rate-independent; day/world clocks tick on
  sim steps and slept days, never wall-clock or Date
- Page-load to first jump < 2 s, unchanged; mid-day persistence must not add
  load cost
- Bit-exact day replay (seed + inputs) — CI-grade seeded replay sweeps join the
  physics sweeps as the determinism gate
- Storage: bounded per-day recording cost; hundred-day save stays sane under
  localStorage quotas; save degrades to session-only when unavailable
- Save migration v2 → v3 (counters → stat ledger; best-altitude carried)
- Sim/render boundary fence holds for ghosts, board, diary, chyron — the
  renderer reads day/life/world state, never infers it
- Lossless law as a data invariant: no write path may reduce a permanent stat
  or its ceiling (assertable)
- No server, no build step, zero dependencies — unchanged doctrine

### Complexity Drivers (ranked by irreversibility)

1. **The day record schema** — one shape holding pool, caps, feeds, recordings,
   diary lines, compost results; everything downstream (persistence, shadows,
   nightfall, save migration) reads it
2. **Determinism contract as product** — every nondeterministic draw in
   day/world sim must be seed-derived or it silently breaks shadows; the audit
   is architectural, not per-story
3. **Two-layer clock hierarchy** — phase clock (rope) inside activity beats
   inside day ticks inside slept-world days; each layer owns exactly one kind
   of gate and must never re-clock another (the v2 counting-clocks lesson, one
   level up)
4. **Atomic mid-day persistence** — a corrupt day-state write is the first
   data-loss class the lossless law would expose; journal/validate/rollback is
   a rule to encode
5. **Replay-under-budget** — N shadows × M days of inputs replayed per frame
   within one sim step; the budget is a contract to test, not a hope
6. **Station grammar abstraction** — generalizing rope's beat/trip/cap cadence
   without forking five private state machines (or a framework)

### Technical Risks

- **Replay storage bloat** — unbounded input logs; needs delta/keyframe policy
  decided once, in architecture, before Story work writes saves
- **Determinism drift** — a stray `Math.random`/`Date.now` in day/world sim
  ships a game where shadows lie; fence with seeded replay-sweep tests
- **Mid-day save corruption** — first time a crash mid-write loses *today*, not
  just a best-score; atomicity is a feature
- **Migration bugs on real v2 saves** — the counter→ledger mapping must be
  total; a dropped counter is a broken past (the lossless law again)
- **Frame budget at montage scale** — design-uncapped ghosts vs 60 FPS; the
  cheaper-far-shadow exception must be render-layer-only (no gameplay cap leaks)
- **Boundary fence erosion via diegetic UI** — board/diary/chyron are *content
  views*; the temptation to compute text in the render layer is the fence's
  newest attack surface
- **NFR10 cap enforcement** — mod-supplied `.glb` textures need hard
  dimension/size/count verdicts at load, loud for authors, silent for players
- **Frozen-test × surface expansion** — every new layer (day, world, shadows)
  demands new contract-test files in the same change; v2's dominant cost,
  now across three layers
---

## Engine & Framework

### Selected Engine

**Vanilla ES modules + Three.js** r186 (`three@0.186.1`, importmap-pinned CDN) — pin HELD for v3

**Rationale:** Revalidation, twice removed. The hard constraints — pure
Node-importable sim core, <2 s load-to-first-jump, static files with no build
step, custom PS1 shader pipeline — disqualified Godot/Phaser/PlayCanvas in Oct
2026 and still disqualify them for v3: a shadow-replay product contract needs
the sim to be plain deterministic JS under bare Node, which no engine export
lane preserves. Version status (verified 2026-11-12): r187 shipped Oct 30,
2026; the pin stays at 0.186.1 deliberately — upgrades are a managed,
separately-gated decision (the v2 deploy-UAT pass certified 0.186.1; zero-diff
deploy doctrine). v3's one new Three.js appetite is `GLTFLoader` for model
skins (core module, no addons) — already proven by the Story 8.4 spike.

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

### Remaining Architecture Decisions

To be made explicitly in Step 4:

1. Day/life/world record shape — the three-tier state tree above the run record
2. Station activity contract — the beat/fail/cap grammar generalized, per-station module shape
3. Deterministic content layer — state-keyed prose tables; rng sub-stream derivation from the day seed
4. Recording & replay shape — input-log vs delta/keyframe, KB-per-day budget, replay-reads-never-simulates rule
5. Nightfall compost transaction — atomic day settlement (feed → caps → shadows → diary → wear)
6. World tick contract — one tick per slept day, hunter-clear rng derivation, frozen-while-closed semantics
7. Save schema v3 + migration — v2 counters → stat ledger mapping, versioning, atomic mid-day writes
8. Lossless-law enforcement — stat writes as the only mutation path; assertable no-rollback invariant
9. RANK/LEVEL encoding — hidden-but-derivable, gate-bound weights, news/board as reads
10. Dungeon day-type contract — fight mini-sim inside the day, eject transaction, per-day gate lock
11. Shadow rendering contract — N replay states per step, documented cheaper-far-shadow exception
12. Content-view fence — diary/board/chyron render as tables; prose composition stays sim-side
13. Skin pipeline wiring — `.glb` loader path + NFR10 texture caps (from the accepted 8.4 spike)

---

## Architectural Decisions

### Decision Summary (v3)

| Category | Decision | Version | Rationale |
|----------|----------|---------|-----------|
| State management | Single game-state POJO `{ meta, life, day, world }`; pure `update*` spreads per layer; the run record nests inside `day` during rope sessions | n/a (pure JS) | One persistence path, one snapshot for save/shadow/replay-sweeps; extends the shipped single-record convention |
| Activity system | Shared beat kernel (cadence phase, fail window, cap arithmetic as data) + code stations: rope verbatim, tap-fighting as code with private HP; run/lift/read as cadence configs | n/a | Rope physics stays frozen code; three simple stations don't justify a framework; "beat/fail/cap" becomes the one grammar every station honors |
| RNG discipline | Sub-stream registry: `deriveStream(seed, domain, ordinal)`; named domains `cards`, `board`, `hunterTick`, `gateSpawn`, `content` | n/a | Draw order independent of consumer count — the precondition for "shadows never lie"; a stray `Math.random` becomes a fence-test failure |
| Recording & replay | Input-event logs per activity segment `{seed, segment, [(step, inputBit)]}`; replay advances the same station transitions inside the same fixed step. **Budget (the GDD's owed number): ≤ 4 KB/day soft, 8 KB/day hard** — overflow coalesces same-step events, never keyframes; a 100-day save stays ≤ 800 KB, sane against the ~5 MB localStorage reality | n/a | Sparse by nature (taps are events, not per-step data); bit-exact by construction; zero second-simulation cost — the determinism contract made physical |
| Day settlement | One pure `compost(day, life, world) → {life', world', diaryLine, shadows, wear}` at sleep | n/a | Purity = all-or-nothing; the lossless law can't be half-applied; persistence wraps the result atomically |
| World time | Tick exclusively inside compost: `world.advance(world, dayNumber)`; `Date.now` is a sim-fence violation | n/a | "The world ages only when tomorrows are lived" becomes structural; frozen-while-closed needs no rule |
| Persistence | New key `jumprope-life`, envelope `{v: 3, state, sum}`; checksum + previous-key corruption defense; migration chain on load; single `persist(gameState)` path | key schema v3 | One JSON blob per save — localStorage per-key atomicity suffices once state is single; a bad write can't corrupt a life |
| Save migration | v2 → v3 total map: Epic 7 outcome counters → milestone sub-cases of the stat ledger; `bestAltitude` carried from the shipped `jumprope-best` key (the versioned `jumprope-best-altitude` never shipped) | n/a | A dropped counter is a broken past; the migration is one pure function with its own contract test |
| Stat writes | Stats/ceilings writable ONLY via `life.js` ledger API (`gain`/`raiseCeiling`, clamped, monotone); seeded fuzz leg asserts no legal transition decreases either | n/a | The lossless law as an executable fence, not prose |
| RANK / LEVEL | `rankOf(life)` derived, never stored; gate-bound weights in `RANK_WEIGHTS` data table; LEVEL stored (dungeon-earned only) | n/a | The number the news quotes cannot desync from the ledger; the census trigger gets one truth |
| Dungeons | `day.dayType: 'dungeon'` + fighting station (private HP/flinch, dungeon-local); eject = data `{ejectedGate, lockedUntilDay}` folded at compost | n/a | "A dungeon is a day type" made structural; day bookkeeping applies to fights for free |
| Shadow playback | Sim advances every posted replay per step, emits `shadowPoses[]` in the snapshot; renderer reads poses, LOD render-only | n/a | Playback stays Node-testable behind the fence; the frame-budget exception has zero gameplay surface |
| Prose/content | `js/content.js` — pure state-keyed tables + selectors sim-side; renderer mounts strings only | n/a | Boundary fence unchanged; prose Node-testable like physics; mods replace tables wholesale (NFR16) |
| Model skins | Lazy `GLTFLoader` from the pinned specifier; 17-joint contract verified at bind; NFR10 caps enforced at load; author-console diagnostics, player silence | three@0.186.1 core | Load budget protected; the 8.4 spike verdict wired as-is; the 8.5 byte-identical pin survives |

**Foundation:** the v2 contracts below are KEPT AS-SHIPPED (run-state schema,
card-effect contract, counting rule, trip waterfall, rope-rate chain, mapping
convention); nothing in v3 revisits them. The phase clock is now explicitly
*nested* inside the day clock — it never re-clocks it.

### Run-State Schema

`Run = { status, outcome, altitude, skips, area, ropes: [{ mul, charged }],
effects, owned, offer, buffer, iFramesEndAt, airJumps, ... }` — one POJO,
spread-copied, no nested sub-state beyond `effects`.

- `status`: `'idle' | 'running' | 'choose' | 'over'` (v1 enum **unchanged**)
- `outcome`: `'tripped' | 'summit'` on `over` — the win is data, no new status
- `altitude`: the single persisted number; per-pass points fold in-tick as
  `altitude += ALT_PER_POINT × run.effects.scoreMul` (as-built `ALT_PER_POINT = 2.5`,
  `js/game.js:42`, Story 6.2 — the v2 draft's `2` retired); `score` survives only as per-pass/event prose
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

- As-built v2 keys: `jumprope-best` (the best-altitude value — the versioned
  `jumprope-best-altitude` never shipped), `jumprope-meta` (Epic 7 outcome counters),
  `jumprope-audio` (settings). Migration reads all three; each stays legal-but-read-only
  after the first v3 write. Session-only fallback unchanged.

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
| day / life / world (v3) | `day`, `life`, `world` tiers of `gameState` |
| nightfall compost | `compost(day, life, world)` |
| stamina | `day.stamina.pool` (SU) |
| stations / corners | `rope|run|lift|read|fight` modules; `day.station` |
| shadow / cast / re-cast / retire | `life.shadows[]`; `castShadow`, `recastCorner`, `retireShadow` |
| recording | `day.recordings[]` `{seed, segment, events}` |
| gate / board / shelf life | `world.gates[] {tier,comp,reward,shelf}` |
| hunter tick | `world.advance(world, dayNumber)` |
| supercompensation ceiling | `life.ceilings[stat]`, `raiseCeiling(stat, realized)` |
| RANK (hidden) | `rankOf(life)` — derived; weights `RANK_WEIGHTS` |
| diary / chyron / slips (prose) | `js/content.js` selectors → strings |
| model skin / joint contract | `life.wornSkin`; 17-name contract in `render3d.js` |

**Convention:** every new design term adds its table row in the same change that
introduces the term.

### The State Tree (v3, consequence of the state decision)

```
gameState = {
  meta:  { v, bestAltitude, settings, counters(legacy, migrated) },
  life:  { stats{STR,VIT,AGI,INT}, ceilings{}, LEVEL, lifeCards[], diary[],
           shadows[{corner, dayRef, frozen}], milestones{}, name, wornSkin },
  day:   { number, seed, stamina{pool}, beats, caps(day),
           station: <active station state — the run record while rope>,
           recordings[], dayCards[], dayType, gateLocks, result },
  world: { seed, dayTick, gates[{tier,comp,reward,shelf,clearedBy}], news[] }
}
```

Save, shadow recordings, replay sweeps, and the diary read exactly this shape;
`rankOf(life)` is called, never cached in state.

### Clocks (v3, consequence of the world-time decision)

| Layer | Owner | Ticks on | Gates |
|-------|-------|----------|-------|
| Phase clock | `rope.js` (verbatim) | sim steps | clearance, pose, audio |
| Beat clock | station kernel | sim steps → beats | stamina drain, day-card offers (every 20 beats), recording timestamps |
| Day | `day.js` | nightfall (`compost`) | caps, ceiling moves, shadow casting, diary |
| World | `world.js` | inside `compost` | hunter clears, spawns, shelf life |
| Wall clock | `shell.js` only | rAF | never a sim input — FPS/telemetry only |

### Architecture Decision Records

- **ADR-1 (kept)** Altitude-canonical run record: one field; divergence
  structurally impossible.
- **ADR-2 (kept)** Whole-record `applyCard`: uniform patch functions, uniform
  tests.
- **ADR-3 Input-event replay:** rejected keyframe+delta (interpolation makes
  shadows lie) and result-only animation (violates bit-exactness); seed +
  input-event segments replayed by the same transitions, in-step. Consequence:
  budgeted ≤ 4 KB/day (8 KB hard; same-step coalescing is the only overflow
  policy) — an input-chatty future activity needs more coalescing rules, not
  keyframes.
- **ADR-4 World time = slept days:** rejected wall-clock ticks (saves become
  time-bombs; absence must not mutate the board); the tick lives in compost.
  Consequence: `Date` is banned in the sim import graph — fence-able by the
  boundary-test family.
- **ADR-5 Lossless law as ledger API:** rejected convention-only discipline;
  monotone-by-construction writes + a seeded fuzz fence leg. Consequence: any
  future "spend a stat" idea is a doctrine change, not a PR.
- **ADR-6 Derived RANK:** rejected stored rank; `rankOf(life)` is the census.
  Consequence: chyron triggers cannot lie; retuning weights is data.

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
- *Invariant breach* — WRAP_MAX clamp, phase monotonicity, ledger monotonicity
  (v3): caught by tests, not at runtime; production behavior is the clamp itself
- *Save corruption (v3)* — envelope checksum failure: load the previous-key
  copy; if both fail, fresh v3 life with `{meta: {corrupt: true}}` — the diary
  says so once, nothing else mentions it. The game never pauses for storage;
  the lossless law's only honest exception is *telling, once*

**Example:**

```js
// js/life.js — pure: the ledger is the lossless law
function gain(life, stat, amount, cap) {
  const v = Math.min(life.stats[stat] + amount, cap);
  return v < life.stats[stat] ? life : { ...life, stats: { ...life.stats, [stat]: v } };
}

// js/shell.js — seam: corrupt save is data, silent two-step degrade
function loadLife(storage) {
  for (const key of ['jumprope-life', 'jumprope-life.prev']) {
    try {
      const env = JSON.parse(storage.getItem(key));
      if (env && env.v === 3 && checksum(env) === env.sum) return migrate(env.state);
    } catch { /* fall through to prev */ }
  }
  return freshLife({ corrupt: true });
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
Four sanctioned homes (v3 adds the fourth):

| Type | Home | Examples |
|------|------|----------|
| Physics/timing | module constants | `STEP`, `GRAVITY`, `BASE_PERIOD`, `WRAP_MAX` |
| Balance/content | data tables | `AREAS` rows, `UPGRADES` effects/caps, station cadence tables, `RANK_WEIGHTS`, milestone tables, `CEILING_RULE` |
| Prose | `js/content.js` tables (v3) | diary/TV/System/ticker pools, slip templates — state-keyed, mods-replaceable |
| Player state | storage seam | `mute`, `volume`, `jumprope-life` (+ `.prev`) |

**Rule:** every tunable lives in exactly one row of exactly one table; a balance
change is a table diff touching no logic — now true of prose keys too.

### Event System

**Pattern:** events as **return values** on the existing one-way sim→shell
channel. No emitter, no bus, no subscriptions — nothing may call back into the
sim.

**Naming:** lowercase literal event names, extended in the same change as the
mechanic: v1 `skip | nearMiss | trip | offer`; v2 `strip | ascend | win`;
v3 `beat | cap | sleep | compost | cast | recast | retire | eject | gateSpawn |
gateClear | news | interrupt | rename | name | wear`. Day/world transitions
return `[state', events]` exactly like `tickRun`; the shell fans out to
audio/renderer; nothing replies. Coalescing rules live in the doc (near-miss
callouts: one per revolution; news events: at most one per day).

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
policy-bot balance gate (Epic 6); **replay-sweep harness (v3)** — seeded N-day
sims asserting shadow replay equals recorded reality, CI's determinism gate in
the same family as the balance bot; reduced-motion toggle (accessibility, not
debug).

**Activation:** none in-page — no debug console, cheat commands, or overlays,
in any build (there is no second build). Determinism + frozen tests are the
debugger; anything not reproducible from a seed is a bug in the sim, not in a
missing log. Exception: the NFR16 mod-author console lane (skin joint/cap
verdicts at bind) ships in the product — authors loud, players silent.

---

## Project Structure

### Organization Pattern

**Pattern:** Flat modules by architectural layer — `js/<word>.js`, one lowercase
word per system, purity layer known by name and enforced by the import-graph
walk in `tests/boundary.test.js`. No subfolders in v2; **no subfolders in v3.**

**Rationale:** unchanged — folders remain pure indirection. v3 is the honest
test of the "new file only for a new pure-data subject consumed by two layers"
rule and passes it five times: `day`, `life`, `world`, `station`, `content` are
each a new subject read by both the sim root and the shell/renderer. Rope-day
modules keep their v2 names and contracts verbatim.

### Directory Structure

```
jumprope-web/
├── index.html                  # near-frozen (importmap pin only)
├── package.json                # near-frozen ({ name, private, type })
├── js/
│   ├── game.js                 # ROOT COMPOSER: tickGame(gameState, input, rng) —
│   │                           #   run/day/world layering + shadow playback loop
│   ├── day.js                  # NEW: day state, beat routing, stamina, offers,
│   │                           #   compost(day, life, world), recordings[]
│   ├── life.js                 # NEW: stat ledger (gain/raiseCeiling, monotone),
│   │                           #   life-cards, milestones, diary, shadows, rankOf()
│   ├── world.js                # NEW: gates, news, advance(world, dayNumber) —
│   │                           #   ticked ONLY from compost
│   ├── station.js              # NEW: beat kernel (cadence/fail/cap), cadence
│   │                           #   tables, recordSegment/replaySegment
│   ├── content.js              # NEW: prose tables + state-keyed selectors — pure leaf
│   ├── rope.js                 # verbatim (rope-day interior)
│   ├── player.js               # + stride/rep cadence constants only
│   ├── areas.js                # verbatim
│   ├── upgrades.js             # + day-card/life-card vocabularies (habit, auto-pick)
│   ├── interpolate.js          # + shadowPoses[] passthrough
│   ├── shell.js                # drives tickGame; loadLife/persist seam (v3 envelope,
│   │                           #   prev-key, migration); push-in trigger is a state read
│   ├── render3d.js             # + ghosts (poses in, LOD out), wear geometry,
│   │                           #   board/door/chyron views, lazy skin loader
│   └── audio.js                # leaf; + page-turn, door, cast voices
├── mods/                       # JSON manifests + models/*.glb (NFR10 caps at load)
├── audio/track.ogg
├── tests/
│   ├── *.test.js               # existing files byte-frozen
│   ├── day.test.js             # NEW: day state, beats, stamina, offers
│   ├── life.test.js            # NEW: ledger monotonicity, ceilings, rankOf contract
│   ├── world.test.js           # NEW: gates, tick determinism, shelf life
│   ├── station.test.js         # NEW: beat kernel, record→replay identity
│   ├── content.test.js         # NEW: selector determinism (same state, same string)
│   ├── compost.test.js         # NEW: settlement matrix (feed × cap × ceiling)
│   ├── replay-sweep.test.js    # NEW: N-day seeded shadows-equal-reality gate
│   └── migrate.test.js         # NEW: v2→v3 total-map migration legs
└── _bmad-output/ · docs/       # planning & knowledge — not shipped
```

### System Location Mapping

| System | Location | Responsibility | Purity |
|--------|----------|----------------|--------|
| Game-root composition, shadow playback loop | `js/game.js` | `createGame` / `tickGame` / `endDay`; advances replay segments via `station.js` | pure |
| Day state & settlement | `js/day.js` | `createDay` / `tickDay` / `compost`; stamina, beats, caps, recordings | pure, rng param |
| Stat ledger & lossless law | `js/life.js` | `gain`, `raiseCeiling`, life-card application, milestones, `rankOf(life)` | pure |
| Gate economy & news | `js/world.js` | `advance(world, dayNumber)`, spawn/shelf/clear rolls | pure, derived streams |
| Stations, recording, replay | `js/station.js` | beat kernel + cadence tables; `recordSegment` / `replaySegment` | pure |
| Prose | `js/content.js` | state-keyed selectors → strings (diary/TV/System/ticker/slips) | pure leaf, imports nothing |
| Run orchestration, trip waterfall, rope day | `js/game.js` + `js/rope.js` (v2, verbatim) | nested inside `day.station` | pure |
| Card catalogues & offers | `js/upgrades.js` | day-cards (20-beat cadence) + life-cards (milestone draws) | pure, rng param |
| Persistence v3 | `js/shell.js` | envelope/checksum/prev-key/migration; `persist(gameState)` sole writer | impure seam |
| Ghosts, wear, board, chyron, skins | `js/render3d.js` | poses in → pixels out; skin bind + NFR10 load verdicts | impure, sole `three` |

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
| v2 state fields | as decided (kept) | `altitude`, `iFramesEndAt`, `airJumps`, `outcome` |
| v3 state fields | domain nouns, no abbreviations | `day.stamina.pool`, `life.ceilings`, `world.gates[].shelf` |
| Event names | lowercase literal strings | v1/v2 rows + `'compost'`, `'cast'`, `'eject'`, `'news'`, `'name'` |

#### Game Assets
No asset naming — all geometry procedural, zero bitmap texture budget; the one
file slot is `audio/track.ogg` (lowercase, purpose-named).

### Architectural Boundaries

1. Pure sim graph (`game/day/life/world/station/content/rope/player/upgrades/
   areas/interpolate`) imports nothing browser-side; no `three`, DOM, `Date`,
   `Math.random`, storage — mechanically enforced by `tests/boundary.test.js`
   (extended to the five new modules). `content.js` imports nothing at all.
2. `render3d.js` is the sole `three` consumer (incl. lazy `GLTFLoader` from the
   pinned specifier); `audio.js` stays a leaf absent from the sim import graph.
3. Data flow is one-way: shell → renderer/audio (view payload + event lists);
   no channel returns into the sim — shadows, chyrons, and slips cross as data.
4. `areas.js` / cadence tables / `RANK_WEIGHTS` / prose tables: pure data,
   never GPU objects, never code callbacks.
5. `mods/models/*.glb` cross the boundary as *loaded assets with verdicts*:
   NFR10 caps checked at bind; failing models bind nothing and change nothing.
6. `index.html` / `package.json` near-frozen; changes need justification past
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

#### Shadow-on-Rails (v3)

**Purpose:** Ghosts of past days with zero drift and zero AI — a shadow is a
recording played by the same machine that made it.

**Components:**
- `station.js` recorder — during live play, wraps the beat kernel: every input
  edge appends `(step, inputBit)` to the active segment `{seed, segment, events}`
- `life.shadows[]` — `{corner, dayRef, frozen}`: references, never copies;
  output frozen at casting-day ceilings (casting reads, gameplay never does)
- `game.js` playback loop — each `tickGame` step, every posted shadow advances
  `replaySegment(segment, step)` — the *same* station transition function,
  keyed by the segment's own seed; emits `shadowPoses[]` into the snapshot
- `render3d.js` — desaturated mini-figures at the corner anchors; LOD is
  pose-preserving tri-count only

**Data flow:**

```
live day: taps ─► station transition ─► recorder ─► day.recordings[]
                                          nightfall ─► life.shadows (cast)
shadow: segment.seed ─► deriveStream ─► replaySegment(step) ─► pose ─► renderer
```

**Implementation guide:**

```js
// station.js — one transition, two consumers (live + replay) — the identity
// under test: replaySegment(seg, t).pose ≡ what live play produced at t
function replaySegment(seg, step) {
  const rng = deriveStream(seg.seed, 'station', seg.segment);
  const st = advanceTo(seg.segment, seg.events, step, rng);   // sparse events: jump-ahead ok
  return poseOf(st);
}
```

**Edge cases:** multi-segment days (station switches) replay segment-by-
segment; dungeon days record the fight segment too (battle-shadows at posted
gates); re-cast swaps the reference (the corner's past changes, the shadow
never grows); retire removes the reference — the diary keeps the day; a shadow
whose recording failed checksum degrades to an empty corner + author-console
verdict, never a wrong ghost.

#### World-Time-as-Slept-Days (v3)

**Purpose:** "The world ages only when tomorrows are lived" with zero
bookkeeping: the tick is a line inside compost, not a system that runs.

**Rule:** `world.advance(world, dayNumber)` is called ONLY from `compost`;
`Date` is banned sim-side (boundary fence); every roll inside draws
`deriveStream(world.seed, 'tick'|'gateSpawn', dayNumber)`. Load, idle, and
tab-hide cannot mutate the board because nothing else can tick it.

#### Monotone Ledger (v3)

**Purpose:** The lossless law as code — no write path in the game can reduce
a permanent stat or ceiling.

**Rule:** `life.js` exports the only stat mutators (`gain`, `raiseCeiling`);
both clamp to monotone; `raiseCeiling` is called only from `compost` on
failure days (`CEILING_RULE`: 125% of realized). Cards, days, worlds, and
news may *read* stats and *add to the queue of reasons*; only compost spends
them into the ledger. Fence: seeded fuzz leg in `life.test.js` — no legal
transition sequence decreases either number.

#### Compost Transaction (v3)

**Purpose:** Nightfall touches five subsystems; a half-composted day is the
only unacceptable save.

```js
// day.js — pure, total, all-or-nothing; shell wraps the result in persist()
function compost(day, life, world) {
  const grown = settleFeeds(life, day);            // feed → caps → ledger via gain()
  const raised = settleCeilings(grown, day);       // failure days raise ceilings
  const cast = castShadows(raised, day);           // recordings → shadow candidates
  const aged = world.advance(world, day.number);   // hunter tick, spawns, shelf life
  return [{ ...aged.world, day: freshDay(day.number + 1, aged.world),
            life: cast.life },
          ['sleep', 'compost', ...(aged.events ?? [])]];
}
```

**Edge cases:** voluntary sleep = empty-beats compost (zero feed, no ceiling
move — resting is legal, laziness is neutral); forced sleep (pool empty)
differs only in who clicked; diary line composed by `content.js` from the
settled numbers — the prose can't disagree with the ledger because it reads it.

#### State-Keyed Prose (v3)

**Purpose:** Writing that is reproducible like physics — same state, same
sentence; mods can replace the whole library.

**Rule:** `content.js` selectors are pure `(state) → string`: key =
`(register, act, stateTier…)` hashed into a pool index consumed via
`deriveStream(seed, 'content', ordinal)`; the string is composed *from* state
(numbers interpolated from the ledger), never stored with it; renderer mounts
strings only. Determinism test leg: same gameState → same string, forever.

### Communication Patterns

**Pattern:** Direct calls with immutable payloads; events are return values.
No emitters, no shared mutable context, no DI beyond injected `rng`/`storage`.
v3 raises the root call; everything else is unchanged.

```js
// shell.js — the entire cross-layer API, one direction
const [next, events] = tickGame(gameState, input, STEP, rng);  // layers day/run/world
renderer.draw(viewPayload(next, clock));    // state incl. shadowPoses, board, chyron
audio.react(events);                         // 'compost' pages, 'cast' whooshes, leaf
if (dueForPersist()) persist(next);           // sleep + throttled mid-day autosave; sole writer
```

### Entity Patterns

**Creation:** `create*` factories returning frozen-ish POJOs; no classes, no
pooling (the largest new population — posted shadows — is replay *state*, not
entities; ≤ 30 concurrent objects still).

```js
// world.js — gates are data rows with derived streams behind every roll
function createGate(seed, ordinal) {
  const rng = deriveStream(seed, 'gateSpawn', ordinal);
  return { tier: rollTier(rng), comp: rollComp(rng), reward: rollReward(rng),
           shelf: SHELF_DAYS, clearedBy: null };
}
```

### State Patterns

**Pattern:** Flat-field transitions inside pure functions — `status` enums plus
substate *fields*; transitions are branch-returns, never mutation or FSM
objects. v3's additions stay data-shaped: `day.dayType: 'training'|'dungeon'`,
`world.gates[].clearedBy`, milestone flags — no new enums for the reveal
sequence; the acts are *derived readings*, not states.

```js
// day.js — entering a dungeon is a field write + station swap, not a mode
function enterGate(day, gateId) {
  return { ...day, dayType: 'dungeon', gate: gateId,
           station: fightStation(gateFor(day.world, gateId)) };
}
```

### Data Patterns

**Access:** read-only imported module tables; consumers index, never copy.

```js
// areas.js — frozen rows; ceiling = the one that ends this area, periodMul for
// sim via ropeRate only, palette/fog for renderer (Decision 6/7)
export const AREAS = Object.freeze([   // as-built after the Story 6.2 sweep (js/areas.js)
  { area: 1, name: 'alley',         ceiling:   250, periodMul: 1.00, palette: 'alley',         fog: 0x2a3440 },
  { area: 2, name: 'rooftops',      ceiling:   600, periodMul: 0.95, palette: 'rooftops',      fog: 0x16213e },
  { area: 3, name: 'blimp',         ceiling:   900, periodMul: 0.88, palette: 'blimp',         fog: 0x101a30 },
  { area: 4, name: 'stratosphere',  ceiling:  1350, periodMul: 0.82, palette: 'stratosphere',  fog: 0x0a1020 },
  { area: 5, name: 'moon-approach', ceiling:  2100, periodMul: 0.76, palette: 'moon-approach', fog: 0x060610 }, // summit win ceiling
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
| Stat writes (v3) | only `life.js` ledger API; monotone | life.test.js fuzz leg |
| World mutation (v3) | only `world.advance` from `compost` | world.test.js tick determinism |
| New activity (v3) | station kernel table row + cadence row | station.test.js record/replay identity |
| Prose (v3) | `content.js` selectors only; no string concat in render | content.test.js determinism leg |
| Replay (v3) | advance via `replaySegment`; never re-simulate live | replay-sweep.test.js |
| Save writes (v3) | `persist(gameState)` sole writer, envelope+prev-key | migrate.test.js + seam review |

---

## Architecture Validation

### Validation Summary

| Check | Result | Notes |
|-------|--------|-------|
| Decision Compatibility | PASS | The v3 spine composes one way: `tickGame → day → compost → {ledger gain, world.advance, castShadows}` — no pair of decisions writes the same field; the four clocks layer (phase ⊂ beat ⊂ day ⊂ slept-day) and none re-clocks another; choose-freeze extends naturally (a frozen beat clock is simply a step that didn't run) |
| GDD Coverage | PASS | 10/10 v3 systems mapped; the two numbers the GDD deferred to architecture are now owed no longer — recording budget set here (≤ 4 KB/day soft / 8 KB hard); gate-bound tunables (VIT pool, offer cadence, bleed %, tick rate, RANK weights) are data-table rows owned by Epic 16, as designed |
| Pattern Completeness | PASS | Standard six categories defined; 5 novel v3 patterns (Shadow-on-Rails, World-Time-as-Slept-Days, Monotone Ledger, Compost Transaction, State-Keyed Prose) with components, flow, examples, edge cases; v2's 3 novel patterns kept and consistent with the overlay |
| Epic Mapping | PASS | Epics 9–16 map to files, patterns, and named test files (table below) |
| Document Completeness | PASS | Executive summary rewritten for v3 during this pass; no placeholders; version columns present |

### Epic Mapping (v3)

| Epic | Delivers | Files | Key patterns | Named tests |
|------|----------|-------|--------------|-------------|
| 9 Day Skeleton | day state, stamina, sleep, compost, diary, wear | `day.js`, `content.js`, `game.js`, `life.js` (wear), `day.js:compost` | Compost Transaction, State-Keyed Prose | `day.test.js`, `compost.test.js`, `content.test.js` |
| 10 Activities & Stats | run/lift/read stations, feed/bleed/caps, supercomp, day-cards | `station.js`, `life.js`, `upgrades.js`, `player.js` | Monotone Ledger, station kernel | `station.test.js`, `life.test.js` |
| 11 Life Cards & Milestones | milestones, permanent pick-two, habits | `upgrades.js`, `life.js` | ledger + offer patterns | `catalogue.test.js` (new legs), `life.test.js` |
| 12 The World Layer | TV ladder, board, hunter tick, RANK debuts, Interrupt | `world.js`, `content.js`, `render3d.js`, `audio.js` | World-Time-as-Slept-Days, State-Keyed Prose | `world.test.js`, `content.test.js` |
| 13 Dungeons & Tap-Fighting | door, dayType, fight station, eject, LEVEL | `day.js`, `station.js` (fight), `render3d.js` | dungeon-as-day-type | `dungeon.test.js` (new) |
| 14 Shadows & Automation | recording engine, cast/recast/retire, posts, auto-pick | `station.js` (record/replay), `life.js`, `game.js` | Shadow-on-Rails, ADR-3 | `station.test.js` identity legs, `replay-sweep.test.js` |
| 15 Model Skins | `.glb` wiring, texture caps, template, diagnostics | `render3d.js`, `mods/models/` | NFR10 verdicts at bind | `glbspike.test.js` promoted legs (new file), `equip.test.js` (new legs) |
| 16 Balance & Prove | day-economy gate, metrics, docs | harness + tables | balance-bot family + replay sweeps | `balance.test.js` (new legs), `replay-sweep.test.js`, `migrate.test.js` |

### Coverage Report

- **Systems Covered:** 10/10 (day, stations, stats/ledger, life-cards, world/gates, dungeons, shadows, RANK, prose, skins + persistence/migration)
- **Patterns Defined:** 12 (7 standard + 5 novel v3; v2's 3 kept)
- **Decisions Made:** 13 v3 decisions + engine revalidation + ADR-3…6 (ADR-1/2 kept)

### Issues Resolved (this pass)

1. Executive summary still described v2 → rewritten for the v3 overlay
2. Recording storage budget deferred from the GDD → set: ≤ 4 KB/day soft,
   8 KB hard, same-step coalescing as the only overflow policy
3. Persist policy read sleep-only → corrected to sleep + throttled mid-day
   autosave (the GDD requires mid-day persistence)
4. Structure section line duplication from the retarget edit → removed

### Validation Date

2026-11-12

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

1. `node --test tests/` — confirm the frozen v1/v2 suite is green before touching anything
2. Read this document's Consistency Rules table — this file (`game-architecture.md` v2.0) is the authoritative spine; the v1-era `_bmad-output/planning-artifacts/architecture.md` is historical reference only
3. Configure Context7 per the AI Tooling instructions above
4. Start Epic 9 (The Day Skeleton) — `day.js` with `compost.test.js` red first;
   the rope machine enters the day unchanged, which is the first acceptance fact

---

*Architecture complete — 9 of 9 steps, v3 retarget validated 2026-11-12.*
