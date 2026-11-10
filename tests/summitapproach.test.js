import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as game from '../js/game.js';
import { jump, createPlayer } from '../js/player.js';
import { CARDS } from '../js/upgrades.js';
import { mulberry32 } from './support/balance-harness.js';

// Story 4.5 (FR9/FR15/FR6, FR8 seam): summit approach & one-way guarantees.
// The sim is PINNED, not edited: js/game.js stays byte-identical to baseline
// 2c3e693 (§4.1 census — the DENY pin, D-a). The only product delta is the
// marker-side blocked-at-ceiling arm (js/shell.js markerBlocked + one CSS
// opacity rule, D-b), fenced in §3 with the marker's 4→5 win-target flip.
//
// Interlock semantics (D-a, deferred-work.md:54-55 pin): DENY, level-triggered,
// NO banking. The shipped gate (js/game.js:263 `iframesLeft === 0`) FORGETS a
// suppressed crossing — nothing is banked, latched, or queued; the verdict
// re-evaluates from live state on the first tick whose POST-LOOP i-frames are 0
// (the drain tick IS eligible — the gate reads the decremented count). The
// crafted crossing-starved `iFrames: 1` record resolves forever: accepted
// crafted-input semantics (a latch field would violate NFR7's record-key fence
// and NFR8's one-clock rule); falsifiable in §1.3/§1.4.
//
// Ledger :139 disposition (vacuity recorded IN-RUN, per the ledger's option B,
// while this suite's own seeded legs seed NEAR the cadence — option A): the
// frozen 4.1 `ladderSim` covers ~9 skips in 1000 ticks, under the `% 10` offer
// gate, so its mulberry32 stream provably never advances. This suite seeds
// `skips: 9` so the FIRST skip draws an offer INSIDE the invariant legs
// (rng-liveness asserted via a wrapped draw counter); `tests/arealadder.test.js`
// stays byte-identical. Seed sensitivity rides to the Epic 6 balance pass.
//
// Expectations derive from AREAS / SUMMIT_AREA / MIN_AREA / ALT_PER_POINT —
// never a hardcoded ladder table (house rule). Seeds are mulberry32, never
// Math.random (NFR4). The shell boot is the fifth fork of the
// tests/ceilingmarker.test.js donor (harness extraction stays the deferred
// chore, deferred-work.md:45/:56); the fork ADDS the `iFrames` output stamp
// (mirroring the donor's forceAreaOut) and a `forceRopesIn` input stamp.

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');
const fileHref = name => pathToFileURL(resolve(jsDir, name)).href;
const settle = () => new Promise(r => setTimeout(r, 0));
const run1 = promisify(execFile);
let bootCount = 0;

const STEP = 1 / 60; // rig ticks (ascent.test.js DT idiom)
const TICK_STEP = 1 / 120; // scripted-sim step (headless-sim idiom)
const TICKS = 1000;
const { AREAS, SUMMIT_AREA, MIN_AREA, ALT_PER_POINT } = game;

// hand-built rigs — tests/arealadder.test.js:19-37 donor
const FEET_EDGE = { phase: 0.44, period: 0.9 }; // phase 0.44 → next tick rises into [0.45, 0.55]
const PARKED = { phase: 0.05, period: 100 }; // no crossing for thousands of ticks
const AIRBORNE = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };
const GROUND = { y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 };
const rngStub = () => 0.5;

const ascends = events => events.filter(e => e === 'ascend').length;
const wins = events => events.filter(e => e === 'win').length;

// The per-revolution bound for the drain legs, DERIVED (never a tick literal):
// an effective revolution is FEET_EDGE.period × periodMul(area) seconds long.
const revolutionTicks = area =>
  Math.ceil((FEET_EDGE.period * AREAS[area - 1].periodMul) / STEP) + 1;

// ---------- §1 i-frame interlock (crafted rigs; AC2; kills M1/M2/M3/M4/M5) ----------

test('§1.1/§1.2 a summit peak during a live blank is DENIED; the identical record with no i-frames wins the SAME tick', () => {
  const rig = {
    run: { ...game.createRun(), area: SUMMIT_AREA, altitude: AREAS[SUMMIT_AREA - 1].ceiling - 30, iFrames: 1 },
    rope: { ...PARKED },
    player: { ...AIRBORNE }, // peak = ceiling − 30 + ≈39.5 → legally OVER the summit ceiling
  };
  const out = game.tickRun(rig.run, rig.rope, rig.player, STEP, rngStub);
  assert.equal(out.run.status, 'running', 'the blank, not the peak, is the suppressor (D-a)');
  assert.equal(out.run.outcome, null, 'no summit stamp during an i-frame');
  assert.equal(out.run.area, SUMMIT_AREA, 'no area event of any kind');
  assert.ok(!out.events.includes('win') && !out.events.includes('ascend') && !out.events.includes('trip'),
    'the summit twin of frozen ascent.test.js:256 — different gate arm, not a re-pin (kills M1)');
  assert.equal(out.run.iFrames, 1, 'a crossing-starved tick spends no i-frames');

  const live = game.tickRun({ ...rig.run, iFrames: 0 }, rig.rope, rig.player, STEP, rngStub);
  assert.equal(live.run.status, 'over', 'the SAME peak on a live tick wins immediately');
  assert.equal(live.run.outcome, 'summit');
  assert.deepEqual(live.events, ['win'], 'exactly the win event (PARKED rope: no crossing, no offer to splice)');
});

test('§1.3 DENY pin: a suppressed summit peak is NEVER banked — nothing fires when the peak later goes legal (kills M2)', () => {
  let { run, rope } = game.tickRun(
    { ...game.createRun(), area: SUMMIT_AREA, altitude: AREAS[SUMMIT_AREA - 1].ceiling - 30, iFrames: 1 },
    { ...PARKED }, { ...AIRBORNE }, STEP, rngStub);
  assert.equal(run.status, 'running', 'the AIRBORNE tick was suppressed');
  for (let t = 0; t < 4; t++) { // grounded PARKED ticks: peak legally BELOW the ceiling
    const out = game.tickRun(run, rope, { ...GROUND }, STEP, rngStub);
    assert.ok(!out.events.includes('win') && !out.events.includes('ascend'), `suppression banked at tick ${t} (D-a: DENY, no latch)`);
    ({ run, rope } = out);
  }
  assert.equal(run.iFrames, 1, 'PARKED starves the decrement — the crafted blank never drains');
  for (let t = 0; t < 4; t++) { // iFrames 0, grounded, peak below: the verdict is state-live, never latched
    const out = game.tickRun({ ...run, iFrames: 0 }, rope, { ...GROUND }, STEP, rngStub);
    assert.equal(out.run.status, 'running', `a banked re-fire at tick ${t} (no latch may exist — NFR7/NFR8)`);
    assert.ok(!out.events.includes('win') && !out.events.includes('ascend'), `banked fire at tick ${t}`);
    ({ run, rope } = out);
  }
  assert.equal(run.area, SUMMIT_AREA);
});

test('§1.4 the crafted crossing-starved record resolves forever: 720 ticks, iFrames unchanged, nothing fires (D-a pin)', () => {
  let { run, rope } = game.tickRun(
    { ...game.createRun(), area: SUMMIT_AREA, altitude: AREAS[SUMMIT_AREA - 1].ceiling + 5, iFrames: 1 },
    { ...PARKED }, { ...GROUND }, STEP, rngStub);
  let fired = 0;
  for (let t = 0; t < 720; t++) { // 12 s — far beyond any legitimate blank (≤ 1 revolution)
    const out = game.tickRun(run, rope, { ...GROUND }, STEP, rngStub);
    fired += ascends(out.events) + wins(out.events);
    assert.equal(out.run.status, 'running', `tick ${t}: accepted crafted-input semantics (fixing needs a latch — refused)`);
    ({ run, rope } = out);
  }
  assert.equal(fired, 0, 'the pin: suppression forever for the crossing-starved record (measured at authoring)');
  assert.equal(run.iFrames, 1, 'the record is untouched: level-triggered, nothing banked');
  assert.equal(run.area, SUMMIT_AREA);
});

test('§1.5 real strip at the summit: the win re-fires EXACTLY ONCE on the first record whose iFrames drain 1→0 (kills M1/M5)', () => {
  let { run, rope } = game.tickRun(
    { ...game.createRun(), area: SUMMIT_AREA, altitude: AREAS[SUMMIT_AREA - 1].ceiling + 5, ropes: 2 },
    { ...FEET_EDGE }, { ...GROUND }, STEP, rngStub);
  assert.equal(run.outcome, null, 'the strip tick stripped, did not die');
  assert.equal(run.iFrames, 1, 'the strip opened the blank despite the peak being over (kills M1)');
  assert.equal(run.status, 'running', 'no win while the blank is live (kills M5 by staying alive-to-fire)');
  let winTick = -1;
  let total = 0;
  for (let t = 1; t <= 300 && winTick === -1; t++) {
    const out = game.tickRun(run, rope, { ...GROUND }, STEP, rngStub);
    if (!out.events.includes('win')) {
      assert.equal(out.run.status, 'running', `tick ${t}`);
      if (out.run.iFrames > 0) assert.ok(!out.events.includes('win') && !out.events.includes('ascend'),
        `area event on an iFrames>0 record at tick ${t} (interlock, AC2)`);
    } else {
      winTick = t;
      // Review 4.5 (Blind F3): the drain-tick eligibility CLAIM ("the gate reads
      // the post-loop i-frames; the drain tick IS eligible") had prose-only proof.
      // A drain+1-delayed verdict (banking-lite) passes every other §1 leg — pin
      // the win to the FIRST record whose iFrames reached 0.
      assert.equal(out.run.iFrames, 0,
        `win at tick ${t} must land on an iFrames-0 record (drain-tick eligibility)`);
      if (t > 1) assert.ok(run.iFrames > 0,
        `tick ${t}: the PRIOR record still had a live blank — the win is the FIRST 0-drain tick, not a delayed verdict`);
      assert.equal(out.run.status, 'over', 'win ⇒ over the SAME tick (kills M5)');
      assert.equal(out.run.outcome, 'summit', 'the win stamps summit at the win tick (kills M5)');
      assert.equal(out.run.area, SUMMIT_AREA, 'the win does not touch the area (kills M4)');
    }
    total += wins(out.events);
    ({ run, rope } = out);
  }
  assert.ok(winTick > 1, `the blank must span at least one tick (winTick ${winTick})`);
  assert.ok(winTick <= revolutionTicks(SUMMIT_AREA),
    `win at tick ${winTick} must land within one effective revolution (bound ${revolutionTicks(SUMMIT_AREA)}, derived)`);
  for (let t = 0; t < 240; t++) { // over-record ticks cannot re-fire (gate needs running/choose)
    const out = game.tickRun(run, rope, { ...GROUND }, STEP, rngStub);
    total += wins(out.events);
    ({ run, rope } = out);
  }
  assert.equal(total, 1, 'the win fires exactly once, drain tick included (kills M5)');
  assert.equal(run.status, 'over', 'the over-record cannot re-fire (the gate needs running/choose)');
  // The 240 corpse ticks hold one SHIPPED quirk worth recording: the crossings
  // loop is status-blind, so a post-win FAILED pass re-stamps outcome 'tripped'
  // on the dead record. The WIN CENSUS above (exactly 1), not the corpse's
  // outcome field, is the AC3 invariant — and no 'win' event can hide in it.
});

test('§1.6 the same drain-refire at area 4: ONE ascend on the drain tick, bounded by the derived area-4 revolution', () => {
  let { run, rope } = game.tickRun(
    { ...game.createRun(), area: 4, altitude: AREAS[3].ceiling + 5, ropes: 2 },
    { ...FEET_EDGE }, { ...GROUND }, STEP, rngStub);
  assert.equal(run.iFrames, 1, 'strip suppressed the straddling peak');
  assert.equal(run.area, 4, 'no ascend during the blank (kills M1)');
  let ascendTick = -1;
  for (let t = 1; t <= 300 && ascendTick === -1; t++) {
    const out = game.tickRun(run, rope, { ...GROUND }, STEP, rngStub);
    if (ascends(out.events) > 0) ascendTick = t;
    if (out.run.iFrames > 0) assert.ok(ascends(out.events) === 0, `ascend on an iFrames>0 record at tick ${t}`);
    assert.equal(wins(out.events), 0, `no win below the summit (tick ${t})`);
    ({ run, rope } = out);
  }
  assert.ok(ascendTick > 1 && ascendTick <= revolutionTicks(4),
    `ascend at tick ${ascendTick}, bound ${revolutionTicks(4)} derived from AREAS[3].periodMul`);
  assert.equal(run.area, 5, 'one step, to the summit rung');
  assert.equal(run.baseAltitude, AREAS[3].ceiling, 'base tracks the row left');
  assert.equal(run.status, 'running');
});

test('§1.7 straddle WITHOUT i-frames: two ceilings in one tick still take ONE step per tick, win only after (kills M3/M4)', () => {
  // altitude straddles BOTH row 4's and row 5's ceilings; PARKED keeps the
  // altitude constant — the frozen arealadder §4 staircase pinned at the summit rung.
  const t1 = game.tickRun(
    { ...game.createRun(), area: 4, altitude: AREAS[4].ceiling + 50 },
    { ...PARKED }, { ...GROUND }, STEP, rngStub);
  assert.equal(t1.run.area, 5, 'ONE increment that tick — 5, and the win waits (the while-mutant dies here, M3)');
  assert.deepEqual(t1.events, ['ascend'], 'tick 1 is ascend-ONLY: never ascend+win in one tick (kills M3)');
  const { run, rope } = t1;
  const out2 = game.tickRun(run, rope, { ...GROUND }, STEP, rngStub);
  assert.equal(out2.run.status, 'over', 'the win is the NEXT tick, never the same tick');
  assert.equal(out2.run.outcome, 'summit');
  assert.equal(out2.run.area, SUMMIT_AREA, 'the summit arm never increments (kills M4 NOW, before clampArea heals the corpse)');
  assert.ok(out2.events.includes('win') && ascends(out2.events) === 0, 'tick 2 is win-only (M3/M4 die twice)');
  let extra = 0;
  let r = out2.run;
  for (let t = 0; t < 4; t++) { const o = game.tickRun(r, rope, { ...GROUND }, STEP, rngStub); extra += wins(o.events); r = o.run; }
  assert.equal(extra, 0, 'quiet after: no sequence double-ascends (AC2)');
  assert.equal(r.area, SUMMIT_AREA, 'the trace never leaves [MIN_AREA, SUMMIT_AREA] (kills M4)');
});

test('§1.8 straddle + i-frames: nothing during the blank, ONE step per tick after it clears, win exactly once', () => {
  const t0 = game.tickRun(
    { ...game.createRun(), area: 4, altitude: AREAS[4].ceiling + 50, iFrames: 1 },
    { ...PARKED }, { ...GROUND }, STEP, rngStub);
  assert.equal(t0.run.area, 4, 'the blank tick stays silent — both ceilings straddled, neither taken (kills M1)');
  assert.deepEqual(t0.events, [], 'no events during the crafted blank');
  let { run, rope } = t0;
  for (let t = 0; t < 2; t++) {
    const out = game.tickRun(run, rope, { ...GROUND }, STEP, rngStub);
    assert.equal(out.run.status, 'running', `blank tick ${t} stays silent (kills M1)`);
    assert.ok(!out.events.includes('ascend') && !out.events.includes('win'), `area event during i-frames at ${t}`);
    ({ run, rope } = out);
  }
  const a = game.tickRun({ ...run, iFrames: 0 }, rope, { ...GROUND }, STEP, rngStub);
  assert.equal(a.run.area, 5, 'one step the tick i-frames clear');
  assert.equal(ascends(a.events), 1);
  assert.equal(wins(a.events), 0, 'and the win still waits one tick — one area event per tick (kills M3)');
  const b = game.tickRun(a.run, a.rope, { ...GROUND }, STEP, rngStub);
  assert.equal(wins(b.events), 1, 'win exactly once, one tick later');
  assert.equal(b.run.area, SUMMIT_AREA, 'the summit arm never increments (kills M4)');
});

test('§1.9 trip > ascend: a last-rope trip on a straddling tick beats the ascend (non-summit twin of frozen ascent.test.js:223)', () => {
  const out = game.tickRun(
    { ...game.createRun(), area: 4, altitude: AREAS[3].ceiling + 100, ropes: 1 },
    { ...FEET_EDGE },
    { y: 10, vy: 0, grounded: false, squash: 1, squashVel: 0 }, // below 18: the last rope kills, while the peak straddles
    STEP, rngStub);
  assert.equal(out.run.status, 'over');
  assert.equal(out.run.outcome, 'tripped', 'the death path stamps the outcome');
  assert.deepEqual(out.events, ['trip'], 'no ascend, no win on a dead tick (D-d iii)');
  assert.equal(out.run.area, 4, 'no ascent on a dead tick');
});

test('§1.11 crafted fractional i-frames: the one-tick under-dim is ACCEPTED crafted-input semantics (review 4.5, Edge F1)', () => {
  // A fractional blank (unproducible live — clampRopes truncs) drains PAST zero
  // on the crossing that consumes it: tick 1 denies the verdict (post-loop −0.5
  // ≠ 0) while the record reads −0.5, so the marker is un-dimmed for exactly that
  // rendered frame; tick 2's entry clamp heals to 0 and fires. Named + pinned so
  // the dim mirror is never "fixed" to `!== 0` — crafted −3 ASCENDS (verified at
  // review), so a ≠0 predicate would dim where nothing is refused. Ledger :61
  // family, crafted half; the iFrames:1 crossing-starved forever-case stays §1.4.
  const t1 = game.tickRun(
    { ...game.createRun(), area: 4, altitude: AREAS[3].ceiling + 5, ropes: 2, iFrames: 0.5 },
    // phase 0.449 + STEP/1.3 lands the window-entry crossing edge on tick 1 (FEET 0.45..0.55).
    { phase: 0.449, period: 1.3 }, { ...GROUND }, STEP, rngStub);
  assert.deepEqual(t1.events, [], 'tick 1: crossing suppressed, verdict refused (post-loop count ≠ 0)');
  assert.equal(t1.run.iFrames, -0.5, 'the record stores the past-zero drain (view: predicate > 0 ⇒ no dim that frame)');
  assert.equal(t1.run.area, 4, 'and the area is unmoved');
  const t2 = game.tickRun(t1.run, t1.rope, { ...GROUND }, STEP, rngStub);
  assert.equal(t2.run.area, 5, 'tick 2 heals at entry and the verdict fires — bounded, no forever-case');
  assert.equal(ascends(t2.events), 1);
});

test('§1.10 ascent while a mercy buffer decays: a surviving buffer forgives and ascends the SAME tick; a decayed one trips', () => {
  const alt = AREAS[2].ceiling + 5; // peak straddles row 3 strictly even at y ≈ 15
  const player = { y: 15, vy: 0, grounded: false, squash: 1, squashVel: 0 }; // below 18: only the buffer saves it
  const alive = game.tickRun(
    { ...game.createRun(), area: 3, altitude: alt, buffer: 0.05 },
    { ...FEET_EDGE }, { ...player }, STEP, rngStub);
  assert.deepEqual(alive.events, ['skip', 'nearMiss', 'ascend'],
    'measured at authoring (D-d iv): the forgiving pass and the ascend share the tick');
  assert.equal(alive.run.buffer, 0, 'the buffer is consumed at the crossing');
  assert.equal(alive.run.area, 4, 'area+1 with the run still live');
  assert.equal(alive.run.baseAltitude, AREAS[2].ceiling);
  assert.equal(alive.run.status, 'running');
  const dead = game.tickRun(
    { ...game.createRun(), area: 3, altitude: alt, buffer: 0.001 },
    { ...FEET_EDGE }, { ...player }, STEP, rngStub);
  assert.deepEqual(dead.events, ['trip'], 'fully decayed pre-crossing (STEP 1/60): trip beats ascend');
  assert.equal(dead.run.area, 3, 'no ascend on a dead tick');
  assert.equal(dead.run.outcome, 'tripped');
});

// ---------- §2 seeded sims + the summit walk (AC2/AC3; kills M3/M4/M5) ----------

// The per-tick invariant battery (Task 2.1): integer area in [MIN, SUMMIT],
// one-way one-per-tick, ≤ 1 ascend, NO area event on an iFrames>0 record
// (the interlock), baseAltitude tracks the row left, altitude ≡ ALT×score,
// and every area bump pairs 1:1 with an ascend event (ladder-only path, AC3).
function tickAsserts(out, prevArea, t) {
  const { run, events } = out;
  assert.ok(Number.isInteger(run.area), `area integer at tick ${t}`);
  assert.ok(run.area >= MIN_AREA && run.area <= SUMMIT_AREA, `area in [${MIN_AREA}, ${SUMMIT_AREA}] at tick ${t}`);
  assert.ok(run.area === prevArea || run.area === prevArea + 1, `one-way, one-per-tick at tick ${t} (AC1)`);
  assert.ok(ascends(events) <= 1, `at most one ascend at tick ${t}`);
  assert.equal(run.area - prevArea, ascends(events), `area bump pairs 1:1 with ascend at tick ${t} (ladder-only, AC3)`);
  if (run.iFrames > 0) assert.ok(!events.includes('ascend') && !events.includes('win'),
    `area event on an iFrames>0 record at tick ${t} (interlock, AC2)`);
  assert.equal(run.baseAltitude, run.area === 1 ? 0 : AREAS[run.area - 2].ceiling, `base tracks the row left at tick ${t}`);
  // Story 6.2 re-contract (amendment 3, ledger :55-56): the exact equality was
  // bit-true only because the ×2 placeholder commutes with every accumulation
  // rounding; ALT 2.5 + a picked ×1.15 scoreMul drifts 1 ulp between the two
  // sums. Tolerance 1e-9 ≈ 10⁻⁷ of one skip's 2.5-altitude quantum — armed
  // against real drift, deaf only to float dust.
  assert.ok(Math.abs(run.altitude - ALT_PER_POINT * run.score) <= 1e-9 * Math.max(1, ALT_PER_POINT * run.score),
    `altitude invariant at tick ${t}`);
}

// ladderSim donor (tests/arealadder.test.js:217-247) + the `skips: 9` cadence
// seed: the FIRST skip trips the `% 10` offer gate INSIDE the leg, so the rng
// stream is provably consumed (ledger :139 option A — see header for option B).
function cadenceSim({ seed, seedArea }) {
  const base = mulberry32(seed);
  let draws = 0;
  const rng = () => { draws += 1; return base(); };
  const seedAltitude = AREAS[seedArea - 1].ceiling - 20;
  assert.ok(seedAltitude % ALT_PER_POINT === 0, 'rig: keep the altitude/score invariant exact');
  let { rope, player, run } = game.startRun();
  run = { ...run, area: seedArea,
    baseAltitude: seedArea === 1 ? 0 : AREAS[seedArea - 2].ceiling,
    altitude: seedAltitude, score: seedAltitude / ALT_PER_POINT, skips: 9 };
  let prevArea = run.area;
  let picks = 0;
  for (let t = 0; t < TICKS; t++) {
    if (run.status === 'choose') {
      assert.ok(Array.isArray(run.offer) && run.offer.length > 0, `offer non-empty in choose at tick ${t}`);
      run = game.applyCard(run, run.offer[0]);
      ({ rope, player, run } = game.resumeRun(run)); // ARCH-02, never startRun
      picks += 1;
    }
    assert.notEqual(run.status, 'over', `trip-free by construction: died at tick ${t}`);
    if (player.grounded && rope.phase >= 0.2 && rope.phase <= 0.35) player = jump(player, 0.5);
    const out = game.tickRun(run, rope, player, TICK_STEP, rng);
    ({ run, rope, player } = out);
    tickAsserts(out, prevArea, t);
    prevArea = run.area;
  }
  return { run, draws, picks };
}

test('§2.2 seeded cadence legs under rows 1–2: skips-seeded 9, offer gate fires INSIDE the leg, invariants hold (rng-live)', () => {
  for (const [seed, seedArea] of [[41, 1], [42, 2]]) {
    const { draws, picks } = cadenceSim({ seed, seedArea });
    assert.ok(draws > 0, `seed ${seed}: the mulberry32 stream advanced (rng draw ≥ 1, ledger :139)`);
    assert.ok(picks > 0, `seed ${seed}: an offer was actually faced (skips 9 seed put the %10 gate inside)`);
  }
});

test('§2.2 seeded cadence leg under row 3: same battery, third rng stream, still monotone', () => {
  const { run, draws, picks } = cadenceSim({ seed: 47, seedArea: 3 });
  assert.ok(draws > 0, 'rng draw ≥ 1 (rng-live by construction)');
  assert.ok(picks > 0, 'the offer gate fired inside the leg');
  assert.notEqual(run.status, 'over', 'trip-free');
  assert.ok(run.area >= 3 && run.area <= SUMMIT_AREA, 'never went backwards, never past the summit');
});

test('§2.3 AC3 summit walk: area-4 record to the real 2,100 break — win EXACTLY once incl. 240 post-win ticks, ladder-only path', () => {
  const base = mulberry32(44); // winTick ≈ 17,385 measured at authoring (~9 ms)
  let draws = 0;
  const rng = () => { draws += 1; return base(); };
  const seedAltitude = AREAS[3].ceiling - 20;
  let { rope, player, run } = game.startRun();
  run = { ...run, area: 4, baseAltitude: AREAS[2].ceiling,
    altitude: seedAltitude, score: seedAltitude / ALT_PER_POINT };
  let prevArea = run.area;
  let winCount = 0;
  let picks = 0;
  let post = 0;
  let maxTicks = 0;
  let maxPeak = 0; // the crossesCeiling truth: altitude + arc y (game.js:262)
  for (let t = 0; t < 40000 && post < 240; t++) {
    maxTicks = t;
    if (run.status === 'choose') {
      assert.ok(Array.isArray(run.offer) && run.offer.length > 0, `offer non-empty in choose at tick ${t}`);
      run = game.applyCard(run, run.offer[0]);
      ({ rope, player, run } = game.resumeRun(run)); // ARCH-02, never startRun
      picks += 1;
    }
    if (player.grounded && rope.phase >= 0.2 && rope.phase <= 0.35) player = jump(player, 0.5);
    const out = game.tickRun(run, rope, player, TICK_STEP, rng);
    ({ run, rope, player } = out);
    tickAsserts(out, prevArea, t);
    if (out.events.includes('win')) {
      winCount += 1;
      assert.equal(out.run.area, SUMMIT_AREA, 'win ⇒ area is the summit (kills M4)');
      assert.equal(out.run.status, 'over', 'win ⇒ over the SAME tick (kills M5)');
      assert.equal(out.run.outcome, 'summit');
    }
    maxPeak = Math.max(maxPeak, run.altitude + player.y);
    prevArea = run.area;
    if (run.status === 'over') post += 1; // keep ticking PAST the terminal record
  }
  assert.equal(run.status, 'over', `the walk finished (ticks ${maxTicks})`);
  assert.equal(winCount, 1, 'win count stays 1 across 240 post-win over-record ticks (kills M5)');
  assert.ok(maxPeak > AREAS[SUMMIT_AREA - 1].ceiling,
    `broke the real 2,100 ceiling via the peak (max ${maxPeak}) — the win-tick stamps above are the summit proof; the corpse's outcome field is status-blind-quirked (see §1.5)`);
  assert.ok(picks >= 1 && draws > 0, `rng consumed through the real pick stream (picks ${picks})`);
});

// ---------- §3 shell boot (fifth fork of the ceilingmarker donor) ----------

function makeDom() {
  const created = [];
  const mk = tag => {
    const el = {
      tag,
      children: [],
      listeners: {},
      style: {},
      textContent: '',
      _cn: '',
      get className() { return this._cn; },
      set className(v) { this._cn = v; },
      appendChild(c) { this.children.push(c); return c; },
      insertBefore(c, ref) { const i = this.children.indexOf(ref); if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); return c; },
      replaceChildren(...cs) { this.children = cs; },
      addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); },
      fire(type, ev = {}) { for (const fn of this.listeners[type] ?? []) fn(ev); },
    };
    created.push(el);
    return el;
  };
  return { created, mk };
}

async function bootSummitShell() {
  const frames = [];
  const handlers = { window: {}, canvas: {} };
  const { created, mk } = makeDom();
  const hudEls = {
    'hud-score': mk('span'),
    'hud-best': mk('span'),
    'hud-prompt': mk('span'),
    'hud-owned': mk('span'),
    'hud-ropes': mk('span'),
  };
  const canvas = {
    width: 0, height: 0, style: {},
    addEventListener: (type, fn) => { handlers.canvas[type] = fn; },
  };
  const hudRoot = mk('div');
  for (const el of [hudEls['hud-score'], hudEls['hud-best'], hudEls['hud-ropes'],
    hudEls['hud-prompt'], hudEls['hud-owned']]) if (el) hudRoot.appendChild(el);
  const documentStub = {
    hidden: false,
    createElement: mk,
    getElementById: id => (id === 'game' ? canvas : id === 'hud' ? hudRoot : hudEls[id]),
  };

  const map = new Map();
  const storageStub = {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, v); },
  };
  const script = { forceScore: undefined, forceArea: null, forceAreaOut: undefined, forceRopesIn: null, forceIFrames: null, forceIFramesIn: null, chooseOffer: null, armed: false };
  globalThis.__saScript = script;
  const views = [];
  globalThis.__saViews = views;

  const clock = { t: 0 };
  const saved = {
    document: globalThis.document,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    performance: Object.getOwnPropertyDescriptor(globalThis, 'performance'),
    consoleError: console.error,
  };
  globalThis.document = documentStub;
  globalThis.window = {
    addEventListener: (type, fn) => { handlers.window[type] = fn; },
    innerWidth: 480, innerHeight: 640,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
  };
  globalThis.requestAnimationFrame = cb => { frames.push(cb); return frames.length; };
  Object.defineProperty(globalThis, 'localStorage', { value: storageStub, configurable: true });
  globalThis.performance = { now: () => clock.t };
  console.error = () => {};

  // tickRun wrapper over the REAL sim (donor ceilingmarker.test.js:110-127,
  // fifth fork): chained INPUT stamps (area, ropes) and OUTPUT stamps (score/
  // altitude, iFrames — the fork's NEW arm, mirroring forceAreaOut's shape).
  const gameWrapHref = 'data:text/javascript,' + encodeURIComponent([
    `export * from "${fileHref('game.js')}";`,
    'import * as real from "' + fileHref('game.js') + '";',
    'export const tickRun = (...args) => {',
    '  const s = globalThis.__saScript;',
    '  s.steps = (s.steps || 0) + 1;',
    '  let a = args;',
    '  if (s.forceArea !== null) a = [{ ...a[0], area: s.forceArea }, ...a.slice(1)];',
    '  if (s.forceRopesIn !== null) a = [{ ...a[0], ropes: s.forceRopesIn }, ...a.slice(1)];',
    '  if (s.forceIFramesIn !== null) a = [{ ...a[0], iFrames: s.forceIFramesIn }, ...a.slice(1)];',
    '  let out = real.tickRun(...a);',
    '  if (s.forceScore !== undefined) out = { ...out, run: { ...out.run, score: s.forceScore, altitude: s.forceScore * real.ALT_PER_POINT } };',
    '  if (s.forceIFrames !== null) out = { ...out, run: { ...out.run, iFrames: s.forceIFrames } };',
    '  if (s.forceAreaOut !== undefined) out = { ...out, run: { ...out.run, area: s.forceAreaOut } };',
    '  if (s.chooseOffer && !s.armed && out.run.status === "running") {',
    '    s.armed = true;',
    '    out = { ...out, run: { ...out.run, status: "choose", offer: s.chooseOffer } };',
    '  }',
    '  return out;',
    '};',
  ].join('\n'));

  const src = (await readFile(resolve(jsDir, 'shell.js'), 'utf8'))
    .replace(/from\s*['"]\.\/render3d\.js['"]/, `from 'data:text/javascript,${encodeURIComponent(
      'export function createScene() { return { render(view) { globalThis.__saViews.push(view); } }; }')}'`)
    .replace(/from\s*['"]\.\/game\.js['"]/, `from '${gameWrapHref}'`)
    .replace(/from\s*['"]\.\/rope\.js['"]/, `from '${fileHref('rope.js')}'`)
    .replace(/from\s*['"]\.\/player\.js['"]/, `from '${fileHref('player.js')}'`);

  await import('data:text/javascript,' + encodeURIComponent(`${src}\n//summit-boot ${++bootCount}`));
  await settle();

  const restore = () => {
    globalThis.document = saved.document;
    globalThis.window = saved.window;
    globalThis.requestAnimationFrame = saved.requestAnimationFrame;
    if (saved.localStorage) Object.defineProperty(globalThis, 'localStorage', saved.localStorage);
    else delete globalThis.localStorage;
    if (saved.performance) Object.defineProperty(globalThis, 'performance', saved.performance);
    else delete globalThis.performance;
    delete globalThis.__saScript;
    delete globalThis.__saViews;
    console.error = saved.consoleError;
  };
  return { frames, handlers, hud: hudEls, views, map, script, clock, created, hudRoot, restore };
}

function tick(env, ms = 50) {
  env.clock.t += ms;
  env.frames.at(-1)(env.clock.t);
}

function startRunning(env) {
  env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
  tick(env);
  assert.equal(env.views.at(-1).run.status, 'running', 'opening Space started the run');
}

function landFirst(env) {
  for (let i = 0; i < 30 && !env.views.at(-1).player.grounded; i++) tick(env);
  assert.equal(env.views.at(-1).player.grounded, true, 'the start hop landed');
}

// the dim appends a class — the finder tolerates the blocked state (frozen
// ceilingmarker boots never set iFrames, so their exact-match finder is safe)
function marker(env) {
  return env.created.find(el => el._cn === 'hud-marker' || el._cn.startsWith('hud-marker '));
}

const dimmed = env => marker(env)._cn === 'hud-marker blocked';

function markerDist(env) {
  const m = /(?:ceiling|summit) (\d+) ↑/.exec(marker(env).textContent);
  return m ? Number(m[1]) : NaN;
}

// ---------- §3 presentation legs (AC1; kills M6/M7/M8/M9/M12) ----------

test('§3.2 the SIM ascend flips the marker into win-target mode end-to-end (ceiling → summit)', async () => {
  const env = await bootSummitShell();
  try {
    startRunning(env);
    landFirst(env);
    env.script.forceArea = 4;
    env.script.forceScore = (AREAS[3].ceiling - 30) / ALT_PER_POINT; // grounded peak BELOW row 4
    tick(env);
    let { run, player } = env.views.at(-1);
    assert.equal(run.area, 4, 'parked at the fourth rung');
    assert.equal(marker(env).textContent,
      'ceiling ' + Math.max(0, Math.ceil(AREAS[3].ceiling - run.altitude - player.y)) + ' ↑',
      'area-4 target derived from AREAS[3].ceiling (win-target mode not yet)');
    env.script.forceScore = (AREAS[3].ceiling + 2) / ALT_PER_POINT; // the sim now breaks row 4 on its own
    for (let i = 0; i < 8 && env.views.at(-1).run.area === 4; i++) tick(env);
    ({ run, player } = env.views.at(-1));
    assert.equal(run.area, SUMMIT_AREA, 'the REAL sim crossed row 4 (no forceArea→5 anywhere)');
    assert.equal(marker(env).textContent,
      'summit ' + Math.max(0, Math.ceil(AREAS[SUMMIT_AREA - 1].ceiling - run.altitude - player.y)) + ' ↑',
      'the marker followed into win-target mode (FR15/FR8 seam, D-c)');
  } finally { env.restore(); }
});

test('§3.3a/§3.3b blocked-at-ceiling: live i-frames + dist 0 dim the line (area 4 and the summit) and the dim lifts at iFrames 0', async () => {
  for (const area of [4, SUMMIT_AREA]) {
    const env = await bootSummitShell();
    try {
      env.script.forceArea = area;
      env.script.forceScore = AREAS[area - 1].ceiling / ALT_PER_POINT; // altitude pinned AT the ceiling
      env.script.forceIFrames = 2; // the sim suppresses; the line must say so
      env.script.forceIFramesIn = 2; // review 4.5 (Blind F4): blank from tick 1 (see §3.3d note)
      startRunning(env);
      for (let i = 0; i < 12; i++) {
        tick(env);
        assert.equal(env.views.at(-1).run.status, 'running', `area ${area} frame ${i}: blank passes cannot die`);
        assert.ok(dimmed(env), `area ${area} frame ${i}: dist 0 + live blank must dim (D-b)`);
      }
      const { run, player } = env.views.at(-1);
      assert.equal(marker(env).textContent,
        (area === SUMMIT_AREA ? 'summit ' : 'ceiling ') + Math.max(0, Math.ceil(AREAS[area - 1].ceiling - run.altitude - player.y)) + ' ↑',
        'the TEXT is unchanged while blocked (kills M12 — no blocked glyph, distance stays truth)');
      if (area === 4) { // §3.3b — SAME boot: the dim lifts the tick i-frames die (kills M6)
        assert.equal(run.status, 'running', 'un-dim phase starts live');
        env.script.forceIFrames = 0;
        tick(env);
        assert.equal(marker(env)._cn, 'hud-marker', 'never-dimming mutant dies: iFrames 0 must lift the dim');
      }
    } finally { env.restore(); }
  }
});

test('§3.3c/§3.3e no dim while far from the ceiling, and a crafted Infinity blank dims NOTHING (the :146 mirror)', async () => {
  const env = await bootSummitShell();
  try {
    env.script.forceArea = 4;
    env.script.forceScore = (AREAS[3].ceiling - 100) / ALT_PER_POINT;
    env.script.forceIFrames = 3;
    startRunning(env);
    for (let i = 0; i < 6; i++) tick(env);
    const { run, player } = env.views.at(-1);
    const d = markerDist(env);
    assert.equal(d, Math.max(0, Math.ceil(AREAS[3].ceiling - run.altitude - player.y)),
      'the marker IS the payload formula, arc included (ceilingmarker:279 idiom)');
    assert.ok(d > 0 && run.status === 'running', `far from the ceiling: honest countdown (got ${d})`);
    assert.equal(marker(env)._cn, 'hud-marker', 'a live blank ALONE never dims (kills M7)');
    env.script.forceIFrames = Infinity; // the sim reads non-finite as NO i-frames (game.js:146)
    for (let i = 0; i < 5 && !env.views.at(-1).player.grounded; i++) {
      tick(env);
      assert.equal(env.views.at(-1).run.status, 'running', 'the lead-in hop lands inside the pre-crossing window');
    }
    assert.equal(env.views.at(-1).player.grounded, true, 'rig: GROUNDED at-ceiling keeps the peak at exactly the strict-> boundary — no ascend');
    env.script.forceScore = AREAS[3].ceiling / ALT_PER_POINT; // dist 0: ONLY the finite-mirror separates dim from not
    tick(env);
    assert.equal(env.views.at(-1).run.iFrames, Infinity, 'the crafted blank reached the payload');
    assert.ok(markerDist(env) === 0 && env.views.at(-1).run.area === 4,
      'rig: the Infinity-phase frame is dist 0 at area 4 (a mirror-less mutant would dim it)');
    assert.equal(marker(env)._cn, 'hud-marker', 'a dead Infinity blank must not dim (kills M8 — the Number.isFinite mirror)');
  } finally { env.restore(); }
});

test('§3.3d equivalence leg: dimmed ⟺ (dist 0 ∧ iFrames > 0) across the payload matrix (kills M9)', async () => {
  const env = await bootSummitShell();
  try {
    startRunning(env);
    landFirst(env);
    for (const area of [4, SUMMIT_AREA]) {
      for (const off of [0, -50]) {
        for (const iframes of [0, 2]) {
          env.script.forceArea = area;
          env.script.forceScore = (AREAS[area - 1].ceiling + off) / ALT_PER_POINT;
          env.script.forceIFrames = iframes;
          env.script.forceIFramesIn = iframes; // review 4.5 (Blind F4): the FIRST tick of the cell
          // must already run the sim in the blank — an output-only stamp let tick 1 execute with the
          // PREVIOUS cell's i-frames, silently violating the crafted-blank premise on cell entry.
          tick(env);
          const { run, player } = env.views.at(-1);
          assert.equal(run.status, 'running', `matrix area ${area} off ${off} iFrames ${iframes}`);
          const dist = markerDist(env);
          assert.equal(dist, Math.max(0, Math.ceil(AREAS[area - 1].ceiling - run.altitude - player.y)),
            'the marker IS the payload formula (ceilingmarker:279 idiom)');
          // dist === 0 is the ceil(x) ≤ 0 arithmetic: AT the ceiling (off 0, grounded) only.
          assert.equal(dimmed(env), dist === 0 && run.iFrames > 0,
            `blocked ⟺ dist 0 ∧ iFrames > 0 (area ${area} off ${off} iFrames ${iframes})`);
        }
      }
    }
    // Review 4.5 (Blind F2): out-of-domain run.area can reach the VIEW only via
    // an OUTPUT stamp (the sim write-backs healed integers) — the donor's
    // forceAreaOut arm. Without it, markerBlocked's clamp is comment-pinned and
    // a clamp-dropping mutant desyncs dim-vs-text on crafted payloads unnoticed.
    for (const crafted of [0, 4.6, NaN, Infinity]) {
      env.script.forceAreaOut = crafted;
      env.script.forceScore = AREAS[SUMMIT_AREA - 1].ceiling / ALT_PER_POINT; // altitude AT the summit ceiling
      env.script.forceIFrames = 2;
      env.script.forceIFramesIn = 2;
      tick(env);
      const healed = Math.min(Math.max(Math.round(Number.isFinite(crafted) ? crafted : 1), 1), AREAS.length);
      const dist0 = Math.max(0, Math.ceil(AREAS[healed - 1].ceiling - env.views.at(-1).run.altitude - env.views.at(-1).player.y)) === 0;
      assert.equal(dimmed(env), dist0,
        `crafted area ${String(crafted)} dims through the SAME clamp as the text (heals to tier ${healed})`);
      env.script.forceAreaOut = undefined;
      env.script.forceIFrames = null;
      env.script.forceIFramesIn = null;
    }
  } finally { env.restore(); }
});

test('§3.3f choose and over payloads blank the text and un-dim the line (the status guard)', async () => {
  const env = await bootSummitShell();
  try {
    env.script.forceArea = 4; // dist-0 live-blank payload: ONLY the status guard may keep it un-dimmed
    env.script.forceScore = AREAS[3].ceiling / ALT_PER_POINT;
    env.script.forceIFrames = 2;
    startRunning(env);
    env.script.chooseOffer = [CARDS[0], CARDS[1]]; // arm AFTER the run is live (donor :325 idiom)
    tick(env);
    assert.equal(env.views.at(-1).run.status, 'choose', 'the wrapper parked the run in choose');
    assert.ok(env.views.at(-1).run.altitude >= AREAS[3].ceiling && env.views.at(-1).run.iFrames > 0,
      'rig: the choose payload IS a dist-0 live-blank frame (a guard-less markerBlocked would dim it — kills the drop-the-status-arm mutant)');
    assert.equal(marker(env).textContent, '', 'choose: no marker text');
    assert.equal(marker(env)._cn, 'hud-marker', 'choose: un-dimmed (markerBlocked status guard)');
  } finally { env.restore(); }

  const env2 = await bootSummitShell();
  try {
    startRunning(env2);
    env2.script.forceScore = 40 / ALT_PER_POINT; // plain boot: the grounded fail-pass REACHES the trip
    for (let i = 0; i < 400 && env2.views.at(-1).run.status === 'running'; i++) tick(env2);
    assert.equal(env2.views.at(-1).run.status, 'over', 'grounded, the rope eventually trips');
    // (An over payload with iFrames > 0 is UNPRODUCIBLE: trip/win both require
    // iframesLeft === 0 at gate time — game.js:170/:263 — so the death frame
    // reads un-dimmed by construction; the crafted witness lives in the choose phase above.)
    assert.equal(marker(env2).textContent, '', 'over: no marker text');
    assert.equal(marker(env2)._cn, 'hud-marker', 'over: un-dimmed (kills the dim-anyway reading)');
  } finally { env2.restore(); }
});

test('§3.4 truthfulness: through a REAL strip blank at the ceiling the sim refuses the break; the dim lifts on the blank-end tick', async () => {
  const env = await bootSummitShell();
  try {
    const C = AREAS[3].ceiling;
    env.script.forceArea = 4;
    env.script.forceRopesIn = 2; // two real ropes: a failed pass STRIPS (a real blank, ledger :61 verbatim)
    env.script.forceScore = (C - 200) / ALT_PER_POINT; // DISTANCE cover: the hop pass scores safely, no ascend, no death
    startRunning(env);
    for (let i = 0; i < 40 && env.views.at(-1).run.skips === 0; i++) {
      tick(env);
      assert.equal(env.views.at(-1).run.status, 'running', 'phase 1 survives the hop pass');
    }
    assert.equal(env.views.at(-1).run.skips, 1, 'rig liveness: the airborne hop pass scored (200 u under the ceiling)');
    for (let i = 0; i < 30 && !env.views.at(-1).player.grounded; i++) {
      tick(env);
      assert.equal(env.views.at(-1).run.status, 'running', 'phase 1 lands the hop');
    }
    assert.equal(env.views.at(-1).player.grounded, true, 'phase 1 ends grounded — the next pass will fail');
    assert.equal(marker(env)._cn, 'hud-marker', 'phase 1: dist 200, never dimmed');
    let stripped = false;
    for (let i = 0; i < 240 && !stripped; i++) {
      tick(env);
      const { run } = env.views.at(-1);
      assert.equal(run.status, 'running', 'phase 2: two ropes survive the failed pass (a strip, not a death)');
      stripped = run.iFrames > 0;
      if (!stripped) assert.equal(marker(env)._cn, 'hud-marker', 'no dim far from the ceiling');
    }
    assert.ok(stripped, 'a real rope-stripped blank opened (the ledger scenario)');
    env.script.forceRopesIn = null;
    env.script.forceScore = (C + 5) / ALT_PER_POINT; // altitude ALONE over: dist 0, the peak wants the break
    let ended = false;
    for (let i = 0; i < 240 && !ended; i++) {
      // R4 (Story 5.2 sanctioned re-contract, parent-approved 2026-11-09): the
      // ropeLost juice row arms a 65 ms freeze on the strip frame (D-N05
      // delays, never drops). A frozen frame legitimately re-presents the
      // LAST STEPPED record, so the truthfulness asserts below ride stepped
      // frames only — the blank-end tick is always stepped (65 ms < two 50 ms
      // strides), so ended stays reachable and a never-lift-the-dim mutant
      // still dies on the first stepped post-blank frame.
      const n0 = env.script.steps || 0;
      tick(env);
      const stepped = (env.script.steps || 0) > n0;
      const { run } = env.views.at(-1);
      if (run.iFrames > 0) {
        if (stepped) {
          assert.equal(run.status, 'running', 'the blank refuses the break the line promises (FR9)');
          assert.equal(run.area, 4, 'no ascend event hid behind the dim (no area bump = no ascend, AC2)');
          assert.equal(run.outcome, null);
          assert.equal(marker(env).textContent, 'ceiling 0 ↑', 'dist 0 while the sim refuses (the ledger defect, fixed)');
          assert.equal(marker(env)._cn, 'hud-marker blocked', 'the dim says: refused right now (deferred-work:61)');
        }
      } else {
        ended = true;
        if (stepped) {
          assert.equal(marker(env)._cn, 'hud-marker', 'the dim lifts the tick the blank ends — the break is already taken');
        }
      }
    }
    assert.ok(ended, 'the blank drained (the harmless pass spent the i-frame)');
  } finally { env.restore(); }
});

test('§3.5 payload zero-delta: the arm adds NO view/run field (NFR7, 4.4 census donor)', async () => {
  const env = await bootSummitShell();
  try {
    startRunning(env);
    for (let i = 0; i < 4; i++) tick(env);
    const before = env.views.at(-1);
    env.script.forceArea = 4;
    env.script.forceScore = AREAS[3].ceiling / ALT_PER_POINT; // dist 0 ∧…
    env.script.forceIFrames = 2; // …iFrames > 0: a genuinely blocked frame, key-censused
    for (let i = 0; i < 4; i++) tick(env);
    const at = env.views.at(-1);
    assert.ok(dimmed(env), 'rig: the census sampled a blocked frame');
    assert.deepEqual(Object.keys(at).sort(), Object.keys(before).sort(),
      'view key set identical across the dim — no new view fields (NFR7)');
    assert.deepEqual(Object.keys(at.run).sort(), Object.keys(before.run).sort(),
      'run key set identical across the dim — the arm is display-only');
    assert.deepEqual(Object.keys(at.run).sort(), Object.keys(game.createRun()).sort(),
      'the record key set is the shipped createRun set (frozen altitude.test.js:48 twin)');
  } finally { env.restore(); }
});

// ---------- §4 static fences (AC1–3; kills M10/M11 + the frozen-list tripwire) ----------

const sourceOf = f => readFile(resolve(jsDir, f), 'utf8');

// §4.1 RETIRED by Story 6.2 (story amendment 2, C2): 4.5's sim-interlock
// pinned the game.js blob hash at 2c3e693 with no successor-handoff clause;
// 6.2's sanctioned tunable retune edits js/game.js BY DESIGN, which kills a
// build-specific blob pin structurally. Re-hashing is FORBIDDEN — a content
// hash re-pinned to a story's own build dies at the next sim story. The
// by-tree diff census (§4.3, allow-list carrying the 6.2 lane) is the
// surviving and strictly broader fence: it names every changed path.

test('§4.2 markerBlocked opens no timing surface and shell.js keeps its shipped four specifiers (NFR8 — kills M10)', async () => {
  const src = await sourceOf('shell.js');
  const m = src.match(/function markerBlocked\([\s\S]*?\n {2}\}/); // stops at the 2-space-indented close, not startGame's
  assert.ok(m, 'markerBlocked ships in js/shell.js (the D-b arm)');
  for (const forbidden of [/setTimeout\(/, /setInterval\(/, /requestAnimationFrame\(/, /performance\.now/, /Date\.now|new Date\b|\.getTime\(/]) {
    assert.ok(!forbidden.test(m[0]), `markerBlocked must stay state-driven — no ${forbidden} (blink is FORBIDDEN, D-b)`);
  }
  const specs = [...src.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(mm => mm[1]).filter(s => s.startsWith('./'));
  assert.deepEqual(specs.sort(), ['./game.js', './player.js', './render3d.js', './rope.js'],
    'the two-boundary specifier set is untouched (ARCH-01/ARCH-02)');
});

test('§4.3 diff census: only the story-authorized files differ from base 2c3e693 (frozen-file tripwire, kills M11)', async () => {
  // Pinned base (4.4's review mechanism): diffing HEAD goes vacuous the moment
  // this story commits; the base sha keeps the tripwire armed for every later
  // run. Shallow clones lacking the base fall back to the HEAD census.
  const BASE = '2c3e693';
  let changed;
  try {
    try {
      changed = (await run1('git', ['diff', '--name-only', BASE])).stdout.split('\n').filter(Boolean);
    } catch (err) {
      if (/bad object|unknown revision/i.test(String(err.stderr) + String(err.message))) {
        changed = (await run1('git', ['diff', '--name-only', 'HEAD'])).stdout.split('\n').filter(Boolean);
      } else {
        throw err;
      }
    }
  } catch (err) {
    if (/not a git repository/i.test(String(err.stderr) + String(err.message))) return; // no VCS: nothing to census
    throw err;
  }
  // porcelain arm (chore consolidation 2026-11-09, ledger :186): git diff is
  // blind to UNTRACKED paths — merge git status --porcelain so a new file goes
  // red at CREATE time, not at commit. Strip the XY/?? status prefixes.
  for (const line of (await run1('git', ['status', '--porcelain'])).stdout.split('\n').filter(Boolean)) {
    changed.push(line.slice(3).split(' -> ').pop().split('"').join(''));
  }
  const allowed = new Set([
    'js/shell.js', 'css/style.css',
    'tests/summitapproach.test.js',
    'tests/ceilingbreak.test.js', 'tests/ceilingmarker.test.js', // the two sanctioned re-contracts R2/R1
    '_bmad-output/implementation-artifacts/4-5-summit-approach-one-way-guarantees.md',
    '_bmad-output/implementation-artifacts/sprint-status.yaml',
    '_bmad-output/implementation-artifacts/deferred-work.md',
    // Story 5.1 sanctioned re-contract R2 (2026-11-09): the two new VOICES
    // entries, the stinger suite, and its story artifact.
    'js/audio.js',
    'tests/ascentstinger.test.js',
    '_bmad-output/implementation-artifacts/5-1-ascent-stinger-win-fanfare.md',
    // Story 5.2 sanctioned re-contract R2 (2026-11-09): the ropeLost VOICES
    // entry + tension state, the thud suite + its story artifact, and tests/
    // juice.test.js — that file joins this census's changed set only via the
    // R3 JUICE_TIERS re-contract (the ceilingbreak set already had it).
    'tests/ropelossthud.test.js',
    'tests/juice.test.js',
    '_bmad-output/implementation-artifacts/5-2-rope-loss-thud-last-rope-tension.md',
    // Story 5.3 sanctioned re-contract R3 (2026-11-09): js/render3d.js joins THIS
    // census because 4.5's base postdates the last renderer edit — the ghost pool +
    // i-frame cosmetic read are that edit; tests/areavistas.test.js joins for the
    // R2 tube-census identity-append; plus the new suite and the story artifact.
    'js/render3d.js',
    'tests/areavistas.test.js',
    'tests/iframesjuice.test.js',
    '_bmad-output/implementation-artifacts/5-3-i-frame-trip-juice.md',
    // Story 5.4 sanctioned re-contract R1 (2026-11-09): the WR-02 one-line beat
    // gate lands in js/render3d.js (in this set since 4.4); the new reduced-motion
    // suite and this story's artifact join here — zero other paths.
    'tests/reducedmotion.test.js',
    '_bmad-output/implementation-artifacts/5-4-reduced-motion-for-new-states-the-wr-02-fix.md',
    // Story 5.5 sanctioned re-contract R1 (2026-11-09): zero product-code delta —
    // the audio-lifecycle matrix suite and this story's artifact join the set;
    // the live-browser re-run lands Debug-Log evidence + the ledger stamp only.
    'tests/audiolifecycle.test.js',
    '_bmad-output/implementation-artifacts/5-5-audio-lifecycle-regression-sweep.md',
    // Story 5.6 sanctioned re-contract R1 (2026-11-09): zero product-code delta —
    // the committed music asset, the track1 metadata suite, and this story's
    // artifact join the set; the live-browser lane lands Debug-Log evidence +
    // the ledger stamp only.
    'audio/track.ogg',
    'tests/track1.test.js',
    '_bmad-output/implementation-artifacts/5-6-track-1-music-content.md',
    // Story 5.7 sanctioned re-contract R1 (2026-11-09): the shell-only pause-menu
    // layer lands in js/shell.js + css/style.css (both in this set by 4.4/4.5
    // lineage); the new suite and this story's artifact join here — zero other paths.
    'tests/pausemenu.test.js',
    '_bmad-output/implementation-artifacts/5-7-pause-menu-audio-config.md',
    '_bmad-output/implementation-artifacts/pre-66-polish.md',
    'tests/secondwind.test.js',
    'tests/leadinhop.test.js',
    // chore consolidation 2026-11-09: the shared harness primitives, the new
    // harness fence/behavior suite, and this chore's artifact.
    'tests/support/shell-harness.js',
    'tests/harness.test.js',
    '_bmad-output/implementation-artifacts/chore-test-harness-ci-consolidation.md',
    'tests/polish.test.js',
    'tests/altitude.test.js',
    'tests/ascent.test.js', 'tests/uxpolish.test.js', 'tests/shell.test.js',
    'tests/pausemenu.test.js', 'tests/leadinhop.test.js',
    '.github/workflows/test.yml',
    // Epic 5 retrospective (2026-11-10): the retro document artifact joins the
    // census by this file's own written authorization — the same R-series
    // bookkeeping rule the stories used; list-only, tripwire stays armed.
    '_bmad-output/implementation-artifacts/epic-5-retro-2026-11-10.md',
    // Playtest fix 2026-11-10 (ghost-spread): the renderer shortening lands in
    // js/render3d.js (in this set since 4.3's base lineage); the new suite and
    // the fix artifact join here, authorized by the fix doc — list-only.
    'tests/ghostspread.test.js',
    '_bmad-output/implementation-artifacts/playtest-fix-2026-11-10-ghost-spread.md',
    // Story 6.1 create round (2026-11-10): the story artifact joins the census
    // by this file's own written authorization — the same R-series bookkeeping
    // rule the retro/playtest appends used; list-only, tripwire stays armed.
    '_bmad-output/implementation-artifacts/6-1-policy-bot-summit-gate-the-balance-master-dial.md',
    // Story 6.1 dev round (2026-11-10): the story's own lane joins the census
    // — the harness extension (support file, not a fence), the R1/R2/R3
    // re-contracted balance leg file, and the two NEW files the story creates
    // (the batch-runner support module + its suite; new files go red at
    // CREATE via the porcelain arm). List-only, tripwire stays armed.
    'tests/support/balance-harness.js',
    'tests/support/summit-gate.js',
    'tests/balance.test.js',
    'tests/summitgate.test.js',
    // Story 6.2 dev round (2026-11-10, C1 amendment): the balance-pass lane
    // joins the census — the three product tunables files (game/areas/player),
    // the NEW offer-cadence witness suite, the two R3/R4 re-contracted rig
    // files, and this story's artifact. List-only, tripwire stays armed.
    'js/game.js', 'js/areas.js', 'js/player.js',
    'tests/offercadence.test.js',
    'tests/nearmiss.test.js', 'tests/v1parity.test.js',
    '_bmad-output/implementation-artifacts/6-2-real-tunables-retire-the-placeholders.md',
    // Story 6.3 dev round (2026-11-10, C1): the offer-pacing verdict lane
    // joins the census — this story's artifact and, for the FIRST time in
    // either allow-set, a planning-artifacts path: prd.md, authorized ONLY
    // for the CARD-09 Open-Items row edit this story pins (it pre-authorizes
    // nothing else in planning-artifacts/). List-only, tripwire stays armed.
    '_bmad-output/implementation-artifacts/6-3-offer-pacing-verdict-card-09.md',
    '_bmad-output/planning-artifacts/prd.md',
    // Story 6.4 dev round (2026-11-10, C1): the docs-provenance pass joins
    // the census — this story's artifact plus the three planning docs it
    // rewrites to as-built fact (gdd/epics/architecture; prd.md already listed
    // via 6.3 C1). Authorized ONLY for the G/E/A rows this story pins — it
    // pre-authorizes nothing beyond those rows. List-only, tripwire stays armed.
    '_bmad-output/implementation-artifacts/6-4-docs-provenance-pass.md',
    '_bmad-output/planning-artifacts/epics.md',
    '_bmad-output/planning-artifacts/architecture.md',
    '_bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd.md',
    // Story 6.4 REVIEW-PATCH amendment: gdd-epic-overview.md joins for its
    // one stale period-ladder row (Blind A64-7); authorizes nothing else.
    '_bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd-epic-overview.md',
    // Epic 6 retro bookkeeping (epic-6-retro-2026-11-10.md, Artifact
    // bookkeeping section): list-only, authorizes nothing else.
    '_bmad-output/implementation-artifacts/epic-6-retro-2026-11-10.md',
  ]);
  assert.deepEqual(changed.filter(f => !allowed.has(f)), [],
    'anything else touching this tree violates the Story 4.5 frozen list');
});
