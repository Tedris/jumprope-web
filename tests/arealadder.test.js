import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../js/game.js';
import { AREAS } from '../js/areas.js';
import { jump } from '../js/player.js';
import { mulberry32 } from './support/balance-harness.js';

// Story 4.1 (FR6/FR9, NFR4/NFR5): the area ladder as an INVARIANT — the
// domain heal (clampArea at the tickRun read), one-way ascent, at most one
// area per tick, and the never-throw contract for crafted records. All
// expectations derive from the AREAS rows + SUMMIT_AREA/MIN_AREA +
// ALT_PER_POINT — never a hardcoded ladder table (house rule). Namespace
// game import (startrun/headless-sim idiom) so a missing export surfaces as
// a failing assertion, not a module link error. createRun/startRun gain no
// leg here: the frozen ascent.test.js key-set leg is the fence (§6).

const STEP = 1 / 60; // rig ticks (ascent.test.js DT idiom)
const TICK_STEP = 1 / 120; // scripted-sim step (headless-sim idiom)
const TICKS = 1000;
// startrun/altitude idiom: phase 0.44 → next tick rises into [0.45, 0.55].
const FEET_EDGE = { phase: 0.44, period: 0.9 };
// rope parked far from the feet window: no crossing, altitude constant.
const PARKED = { phase: 0.05, period: 100 };
const AIRBORNE = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };
const rngStub = () => 0.5;

// Seeded under area `area`'s ceiling; one cleared feet-edge pass adds
// ALT_PER_POINT and the airborne y=40 arc puts the post-step peak over the
// strict comparison (ascent.test.js ascentRig idiom).
function ascentRig(area, extra = {}) {
  return {
    run: { ...game.createRun(), area, altitude: AREAS[area - 1].ceiling - 30, ...extra },
    rope: { ...FEET_EDGE },
    player: { ...AIRBORNE },
  };
}
const tickRig = rig => game.tickRun(rig.run, rig.rope, rig.player, STEP, rngStub);

// The crafted-area set every domain leg walks (D-b: garbage, not parseable
// data; story §2). Values are the edge classes; outcomes are the decided
// arms, asserted per leg — never re-derived through clampArea itself.
const CRAFTED = [0, AREAS.length + 1, NaN, 2.5, '3', undefined];

const ascendCount = events => events.filter(e => e === 'ascend').length;

// ---------- §1 clampArea contract (Node-side; kills M2/M3/M5/M6) ----------

test('clampArea is the identity on the ladder', () => {
  assert.equal(typeof game.clampArea, 'function');
  assert.equal(game.MIN_AREA, 1);
  assert.equal(game.SUMMIT_AREA, AREAS.length);
  for (let n = game.MIN_AREA; n <= AREAS.length; n++) {
    assert.equal(game.clampArea(n), n, `rung ${n} is its own fixed point`);
  }
});

test('clampArea sends every garbage class to the alley', () => {
  for (const bad of [0, -3, NaN, null, undefined, '3', 'x', -Infinity]) {
    assert.equal(game.clampArea(bad), game.MIN_AREA,
      `${String(bad)} is data: it reads as the alley, never a throw, ` +
      'never a parse (clampRopes doctrine)');
  }
});

test('clampArea sends top-of-ladder values to the summit tier', () => {
  for (const high of [AREAS.length + 1, Infinity]) {
    assert.equal(game.clampArea(high), AREAS.length, `${String(high)} -> the cap`);
    assert.equal(game.clampArea(high), game.SUMMIT_AREA, 'the cap IS SUMMIT_AREA');
  }
});

test('clampArea truncates fractions into the ladder', () => {
  assert.equal(game.clampArea(3.7), 3, 'fractions truncate like every sibling clamp');
  assert.equal(game.clampArea(game.SUMMIT_AREA + 0.9), AREAS.length,
    'trunc happens before the cap clamp (derived rung, review 4.1)');
  assert.equal(game.clampArea(0.4), game.MIN_AREA, 'trunc happens before the floor clamp');
});

// ---------- §2 domain heal through tickRun (never-throw, AC3; kills M1/M5) ----------

// Live crossing tick: the gate is reached, so a baseless clamp means
// crossesCeiling throws (the ledger's TypeError) or string-corrupts.
test('a live tick with a crafted area never throws and lands on a valid rung', () => {
  // expected POST-tick landings: clamp first, then the tick's own ascend —
  // at AREAS[0].ceiling − 30 the clamped-1 run crosses, clamped-2/5 do not.
  const expected = new Map([
    [0, 2], [NaN, 2], ['3', 2], [undefined, 2], [null, 2], [2.5, 2],
    [AREAS.length + 1, AREAS.length],
  ]);
  for (const crafted of CRAFTED.concat([null])) {
    const out = tickRig(ascentRig(1, { area: crafted }));
    assert.ok(Number.isInteger(out.run.area), `area is an integer for ${String(crafted)}`);
    assert.ok(out.run.area >= game.MIN_AREA && out.run.area <= AREAS.length,
      `area in-ladder for ${String(crafted)}`);
    assert.equal(out.run.area, expected.get(crafted), `landing for ${String(crafted)}`);
  }
});

test('the crafted live tick runs through doesNotThrow (the ledger TypeError dies here)', () => {
  for (const crafted of CRAFTED.concat([null, -Infinity, Infinity])) {
    assert.doesNotThrow(() => tickRig(ascentRig(1, { area: crafted })),
      `tickRun on area ${String(crafted)} returns data, never a TypeError (D-c)`);
  }
});

test(`a crafted ${AREAS.length + 1} record is summit-tier DATA: it WINS past the summit ceiling`, () => {
  const rig = ascentRig(AREAS.length, { area: AREAS.length + 1 });
  const out = tickRig(rig);
  assert.equal(out.run.area, AREAS.length, 'clamped to the summit tier, healed by write-back');
  assert.equal(out.run.status, 'over');
  assert.equal(out.run.outcome, 'summit', 'top-of-ladder garbage behaves as a summit run (D-b)');
  assert.ok(out.events.includes('win'));
});

test("crafted '3' cannot string-concat: two live ticks stay integer 1→2", () => {
  const rig = ascentRig(1, { area: '3' });
  const first = tickRig(rig);
  assert.equal(first.run.area, 2, "garbage lands on 1, then the tick's own ascend (+1)");
  const second = tickRig({ run: first.run, rope: rig.rope, player: rig.player });
  assert.ok(Number.isInteger(second.run.area), `'31' corruption is impossible (D-b)`);
  assert.equal(second.run.area, 2, 'one rung higher only when the peak straddles again');
});

// Gate-short-circuit ticks: the predicate is never reached, yet the record
// still must return cleanly with a clamped area.
test('crafted areas on dead and i-framed ticks return cleanly, clamped', () => {
  for (const crafted of CRAFTED.concat([null])) {
    assert.doesNotThrow(() => game.tickRun(
      { ...game.createRun(), area: crafted, status: 'over' }, { ...FEET_EDGE }, { ...AIRBORNE },
      STEP, rngStub), `dead tick, area ${String(crafted)}`);
    const dead = game.tickRun(
      { ...game.createRun(), area: crafted, status: 'over' }, { ...FEET_EDGE }, { ...AIRBORNE },
      STEP, rngStub);
    assert.ok(Number.isInteger(dead.run.area) && dead.run.area >= game.MIN_AREA
      && dead.run.area <= AREAS.length, `dead-tick write-back heals ${String(crafted)}`);
    const blanked = game.tickRun(
      { ...game.createRun(), area: crafted, iFrames: 1 }, { ...PARKED }, { ...AIRBORNE },
      STEP, rngStub);
    assert.equal(blanked.run.iFrames, 1, 'rig sanity: the blank is still up, gate short-circuited');
    assert.ok(Number.isInteger(blanked.run.area) && blanked.run.area >= game.MIN_AREA
      && blanked.run.area <= AREAS.length, `i-framed write-back heals ${String(crafted)}`);
  }
});

// ---------- §3 write-back heal + spread-survival (AC3) ----------

test('one live tick writes the clamped area back through nextRun', () => {
  for (const crafted of [0, AREAS.length + 1, NaN, '3', null]) {
    const out = game.tickRun(
      { ...game.createRun(), area: crafted }, { ...PARKED }, { ...AIRBORNE }, STEP, rngStub);
    assert.ok(Number.isInteger(out.run.area)
      && out.run.area >= game.MIN_AREA && out.run.area <= AREAS.length,
      `nextRun.area is healed data after one tick, for ${String(crafted)} (D-a)`);
  }
});

test('a crafted area survives applyCard + resumeRun (pure spreads), then the next tick heals it', () => {
  const float = game.CARDS.find(c => c.id === 'float');
  const crafted = AREAS.length + 1;
  const picked = game.applyCard({ ...game.createRun(), area: crafted }, float);
  assert.equal(picked.area, crafted, 'applyCard is a pure spread: the crafted value SURVIVES (D-e)');
  const { rope, player, run } = game.resumeRun(picked);
  assert.equal(run.area, crafted, 'resumeRun spreads too — healing lives at the tick read');
  const out = game.tickRun(run, rope, player, STEP, rngStub);
  assert.equal(out.run.area, AREAS.length, 'the first tickRun after heals by construction');
});

// ---------- §4 idempotency & one-per-tick (AC1, AC2; kills M4) ----------

for (const row of AREAS.slice(0, -1)) {
  test(`five ropes, one global peak: crossing row ${row.area}'s ceiling ascends exactly once`, () => {
    const out = tickRig(ascentRig(row.area, { ropes: 5 }));
    assert.ok(out.events.includes('skip'), 'rig sanity: the tick was live (peak rides a real pass)');
    assert.equal(out.events.filter(e => e === 'skip').length, 1,
      'rig liveness at 5 loops: disjoint windows leave exactly ONE crossing (review 4.1)');
    assert.equal(out.run.area, row.area + 1, 'exactly +1 — never +N for N ropes (AC2)');
    assert.equal(ascendCount(out.events), 1, 'ONE ascend event per tick regardless of rope count');
    assert.equal(out.run.baseAltitude, row.ceiling, 'base altitude is the row we left (derived)');
    assert.equal(out.run.status, 'running');
  });
}

test('a two-ceiling staircase record ascends ONE area per tick, monotone, then settles', () => {
  // Crafted altitude past row 2's ceiling while area: 1 — one plain `if`
  // (never a while) means one step per tick, staircasing up while the peak
  // straddles (D-d). Player re-scripted airborne so the peak is constant.
  let { run, rope, events } = game.tickRun(
    { ...game.createRun(), area: 1, altitude: AREAS[1].ceiling - 20 },
    { ...PARKED }, { ...AIRBORNE }, STEP, rngStub);
  assert.equal(run.area, 2, 'one increment that tick — 2, NOT 3 (the while-mutant dies here)');
  assert.equal(ascendCount(events), 1, 'one ascend event, not two');
  assert.equal(run.baseAltitude, AREAS[0].ceiling, 'base altitude = row 1 ceiling, row by row');
  let area = run.area;
  let ascends = ascendCount(events);
  for (let t = 0; t < 6; t++) {
    const out = game.tickRun(run, rope, { ...AIRBORNE }, STEP, rngStub);
    assert.ok(out.run.area === area || out.run.area === area + 1,
      `tick ${t}: never more than one increment, never a decrease (AC1/AC3)`);
    assert.ok(ascendCount(out.events) <= 1, `tick ${t}: at most one ascend event`);
    ascends += ascendCount(out.events);
    ({ run, rope } = out);
    area = run.area;
  }
  assert.equal(run.area, 3, 'settles one row below where the constant peak stops straddling');
  assert.equal(run.baseAltitude, AREAS[1].ceiling);
  assert.equal(ascends, run.area - game.MIN_AREA, 'every step produced exactly one event');
  assert.notEqual(run.status, 'over', 'a mid-ladder staircase never wins or trips on data alone');
});

// ---------- §5 seeded 1000-tick monotonicity (AC4, NFR4/NFR5) ----------

// headless-sim.test.js:16-21 scripted jumper (window 0.2–0.35, hold 0.5),
// preApply seeding `altitude` just under a derived ceiling — and score
// alongside it, so the frozen altitude === ALT_PER_POINT × score invariant
// (tests/altitude.test.js) holds from tick 0. Seeded rng injected (mulberry32
// from the balance harness); never the default Math.random.
function ladderSim({ seedAltitude, seedArea = 1, rng, jumpWindow = [0.2, 0.35] }) {
  assert.ok(seedAltitude % game.ALT_PER_POINT === 0, 'rig: keep the altitude/score invariant exact');
  let { rope, player, run } = game.startRun();
  run = { ...run, area: seedArea,
    baseAltitude: seedArea === 1 ? 0 : AREAS[seedArea - 2].ceiling,
    altitude: seedAltitude, score: seedAltitude / game.ALT_PER_POINT };
  let prevArea = run.area;
  let ascends = 0;
  for (let t = 0; t < TICKS; t++) {
    if (run.status === 'choose') {
      assert.ok(Array.isArray(run.offer) && run.offer.length > 0, 'offer non-empty in choose');
      run = game.applyCard(run, run.offer[0]);
      ({ rope, player, run } = game.resumeRun(run)); // ARCH-02, never startRun
    }
    assert.notEqual(run.status, 'over', `scripted player died at tick ${t}`);
    if (player.grounded && rope.phase >= jumpWindow[0] && rope.phase <= jumpWindow[1]) player = jump(player, 0.5);
    const out = game.tickRun(run, rope, player, TICK_STEP, rng);
    ({ run, rope, player } = out);
    assert.ok(Number.isInteger(run.area), `area integer at tick ${t}`);
    assert.ok(run.area >= game.MIN_AREA && run.area <= game.SUMMIT_AREA,
      `area in [${game.MIN_AREA}, ${game.SUMMIT_AREA}] at tick ${t} (AC3)`);
    assert.ok(run.area === prevArea || run.area === prevArea + 1,
      `one-way, one-per-tick at tick ${t} (AC1)`);
    assert.equal(run.baseAltitude, run.area === 1 ? 0 : AREAS[run.area - 2].ceiling,
      `base altitude tracks the row left at tick ${t}`);
    assert.equal(run.altitude, game.ALT_PER_POINT * run.score, `altitude invariant at tick ${t}`);
    ascends += ascendCount(out.events);
    prevArea = run.area;
  }
  return { run, ascends };
}

test('seeded 1000-tick run under row 1\u2019s ceiling: monotone, exactly one real ascent', () => {
  const { run, ascends } = ladderSim({ seedAltitude: AREAS[0].ceiling - 20, rng: mulberry32(41) });
  assert.ok(run.area >= 2, 'the run REALLY climbed (non-vacuity)');
  assert.equal(ascends, run.area - 1, 'one event per step (AC1)');
  assert.notEqual(run.status, 'over');
});

test('seeded 1000-tick run under row 2\u2019s ceiling: staircases over several ascents, still monotone', () => {
  const seedArea = 2; // this leg's own input (like the seed numbers), not a ladder literal
  const { run, ascends } = ladderSim({ seedAltitude: AREAS[seedArea - 1].ceiling - 20, seedArea,
    rng: mulberry32(42), jumpWindow: [0.25, 0.4] });
  assert.ok(run.area >= 3, 'multi-crossing coverage: the run visited at least 3 areas');
  assert.ok(run.area <= game.SUMMIT_AREA, 'at most 5 areas visited, ever (AC1)');
  assert.equal(ascends, run.area - seedArea, 'one event per step FROM the seeded rung');
  assert.notEqual(run.status, 'over');
});
