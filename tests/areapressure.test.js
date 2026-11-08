import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../js/game.js';
import { AREAS } from '../js/areas.js';
import { CARDS, freshEffects } from '../js/upgrades.js';
import { atFeetOffset } from '../js/rope.js';
import { jump, createPlayer } from '../js/player.js';
import { mulberry32 } from './support/balance-harness.js';

// Story 4.2 (FR15, NFR8, FR23): area pressure — the current area's
// periodMul composes into the phase increment and the D-N01 buffer decay,
// both read ONCE at tick start (D-b/D-c). The phase value is continuous
// across ascents (pressure changes pace, never teleports the rope) and the
// shared handlers stay byte-identical because the multiplier is pure
// sim-side data derived from run.area + the frozen AREAS rows. Every
// expectation derives from AREAS/CARDS/ROPE_PERIOD records — never a
// literal multiplier (Epic 6 retunes the numbers; a literal here would be
// a false alarm waiting to happen). Namespace game import (startrun
// idiom); arealadder.test.js is the structural donor, never a source of
// behavior expectations (frozen).

const STEP = 1 / 120; // shell cadence (js/shell.js:6)
const DT = 1 / 60; // single-tick rig cadence (ascent.test.js DT idiom)
const TICKS = 1000;
const MAX_DT = 0.25; // the shell's accumulator clamp (js/shell.js:631)
// startrun/altitude idiom: phase 0.44 -> next tick rises into the feet window.
const FEET_EDGE = { phase: 0.44, period: 0.9 };
const AIRBORNE = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };
const rngStub = () => 0.5;
// headless-sim.test.js:39-59 scripted-jumper policy.
const JUMP_WINDOW_LO = 0.2;
const JUMP_WINDOW_HI = 0.35;

// The one composition in the shipped time-scaled idiom (D-a): dt scaled by
// effects.ropeMul, divided by the AREA multiplier (left-associative so the
// alley is byte-identical to the shipped expression), then updateRope's
// divide-by-record-period and single-subtract wrap (js/rope.js).
function expectedInc(dt, ropeMul, periodMul, ropePeriod) {
  return ((dt * ropeMul) / periodMul) / ropePeriod;
}

function expectedPhase(prev, inc) {
  const next = prev + inc;
  return next >= 1 ? (prev - 1) + inc : next;
}

// Feet-window width probed through atFeetOffset (the constants are not
// exported — sampling is the wheel, story §"Existing wheels").
const WINDOW_WIDTH = (() => {
  const GRID = 1 / 1000;
  let lo = null;
  let hi = null;
  for (let i = 0; i <= 1000; i++) {
    if (atFeetOffset(i * GRID, 0, 1)) {
      if (lo === null) lo = i * GRID;
      hi = i * GRID;
    }
  }
  assert.ok(lo !== null, 'the feet window must exist on the probe grid');
  return hi - lo;
})();

// Worst legitimate ropeMul: the product of every effects-side card's
// ropeMul-raising factor at its cap (catalogue.test.js:86-88 probing
// idiom; slowrope lowers and contributes nothing). Derived, not 1.12^2.
const WORST_ROPEMUL = (() => {
  let acc = 1;
  for (const card of CARDS) {
    if (card.shape === 'run') continue;
    const step = card.apply(freshEffects()).ropeMul;
    if (step > 1) for (let i = 0; i < (card.cap ?? 0); i++) acc *= step;
  }
  return acc;
})();
const MIN_PERIOD_MUL = Math.min(...AREAS.map(row => row.periodMul));

// ---------- §1 areaPeriodMul contract (kills M5) ----------

test('areaPeriodMul returns the AREAS row multiplier for every rung', () => {
  assert.equal(typeof game.areaPeriodMul, 'function');
  for (let a = 1; a <= AREAS.length; a++) {
    assert.equal(game.areaPeriodMul(a), AREAS[a - 1].periodMul,
      `rung ${a} reads row ${a}'s periodMul`);
  }
  assert.equal(game.areaPeriodMul(game.MIN_AREA), AREAS[0].periodMul);
  assert.equal(game.areaPeriodMul(game.SUMMIT_AREA), AREAS[AREAS.length - 1].periodMul);
});

test('areaPeriodMul routes garbage areas through clampArea — never throws', () => {
  for (const bad of [0, -3, NaN, null, undefined, '3', 'x', -Infinity]) {
    assert.equal(game.areaPeriodMul(bad), AREAS[0].periodMul,
      `${String(bad)} is data: the alley multiplier, never a lookup throw`);
  }
  for (const high of [AREAS.length + 1, Infinity]) {
    assert.equal(game.areaPeriodMul(high), AREAS[AREAS.length - 1].periodMul,
      `${String(high)} -> the summit multiplier (clampArea's cap arm)`);
  }
  assert.equal(game.areaPeriodMul(2.5), AREAS[1].periodMul,
    'fractions truncate into the ladder like every sibling clamp');
});

// ---------- §2 composition arithmetic (AC1; kills M1/M2/M6) ----------

// Single tick at area `area`: rope on the canonical ROPE_PERIOD so the
// increment derives purely from records; altitude 0 parks the peak under
// every ceiling so nothing ascends.
function composeRig(area, extra = {}) {
  return {
    run: { ...game.createRun(), area, altitude: 0, ...extra },
    rope: { phase: 0.2, period: game.ROPE_PERIOD },
    player: createPlayer(),
  };
}

for (const row of AREAS) {
  test(`phase increment at area ${row.area} composes dt x ropeMul / (period x periodMul)`, () => {
    const rig = composeRig(row.area);
    const out = game.tickRun(rig.run, rig.rope, rig.player, STEP, rngStub);
    const inc = expectedInc(STEP, 1, row.periodMul, game.ROPE_PERIOD);
    assert.equal(out.rope.phase, expectedPhase(rig.rope.phase, inc),
      `area ${row.area}: the record-derived increment, exactly`);
    assert.equal(out.run.area, row.area, 'rig ticks below every ceiling');
  });
}

test('the area multiplier and ropeMul compose multiplicatively, grouping-free', () => {
  const windup = CARDS.find(c => c.id === 'windup');
  const eff = windup.apply(freshEffects()); // record-derived ropeMul, not a 1.12 literal
  const row = AREAS[3]; // a tier whose multiplier differs from 1 and from ropeMul
  const rig = composeRig(row.area, { effects: eff });
  const out = game.tickRun(rig.run, rig.rope, rig.player, STEP, rngStub);
  const inc = expectedInc(STEP, eff.ropeMul, row.periodMul, game.ROPE_PERIOD);
  assert.equal(out.rope.phase, expectedPhase(rig.rope.phase, inc),
    'speed effect and area pressure multiply on the same clock');
  const altGrouped = ((STEP / row.periodMul) * eff.ropeMul) / game.ROPE_PERIOD;
  assert.ok(Math.abs(inc - altGrouped) <= 4 * Number.EPSILON * altGrouped,
    'the two multipliers commute within ulp — composition is grouping-free');
});

test('area 1 is bit-identical to the baseline expression (frozen-suite identity)', () => {
  const rig = composeRig(1);
  const out = game.tickRun(rig.run, rig.rope, rig.player, STEP, rngStub);
  const baselineInc = (STEP * 1) / game.ROPE_PERIOD; // the shipped pre-4.2 dt math
  assert.equal(out.rope.phase, expectedPhase(rig.rope.phase, baselineInc),
    'periodMul 1.00 divides exactly: the alley tick is unchanged bits');
});

test('1000-tick alley trace equals the baseline recurrence every phase', () => {
  let { run, rope, player } = game.startRun(); // alley from the factory
  let baseline = rope.phase;
  const inc = (STEP * 1) / game.ROPE_PERIOD;
  for (let tick = 0; tick < TICKS; tick++) {
    assert.notEqual(run.status, 'over', `scripted jumper tripped at tick ${tick}`);
    if (player.grounded && rope.phase >= JUMP_WINDOW_LO && rope.phase <= JUMP_WINDOW_HI) {
      player = jump(player, 0.5);
    }
    const out = game.tickRun(run, rope, player, STEP, rngStub);
    baseline = expectedPhase(baseline, inc);
    assert.equal(out.rope.phase, baseline, `tick ${tick}: alley phase is baseline bits`);
    ({ run, rope, player } = out);
  }
  assert.equal(run.area, 1, 'the trace stayed in the alley (under 250 u)');
  assert.ok(run.skips > 0, 'the trace actually played (non-vacuity)');
});

// ---------- §3 phase preservation across ascent (AC2/NFR8; kills M1/M3) ----------

function ascentRig(area, extra = {}) {
  return {
    run: { ...game.createRun(), area, altitude: AREAS[area - 1].ceiling - 30, ...extra },
    rope: { ...FEET_EDGE },
    player: { ...AIRBORNE },
  };
}

for (const row of AREAS.slice(0, -1)) {
  test(`the ascent tick clocks on the OLD multiplier, the next tick on the NEW (D-b)`, () => {
    const rig = ascentRig(row.area);
    const out = game.tickRun(rig.run, rig.rope, rig.player, DT, rngStub);
    assert.ok(out.events.includes('ascend'), 'rig genuinely ascends (non-vacuity)');
    assert.equal(out.run.area, row.area + 1);
    const oldInc = expectedInc(DT, 1, row.periodMul, rig.rope.period);
    const expectedOld = expectedPhase(rig.rope.phase, oldInc);
    assert.equal(out.rope.phase, expectedOld,
      'one multiplier per tick: the ascend tick never re-clocks mid-tick');
    assert.deepEqual(out.rope, { ...rig.rope, phase: expectedOld },
      'the ascend branch leaves the rope record as the pure updateRope result');
    const out2 = game.tickRun(out.run, out.rope, out.player, DT, rngStub);
    const newInc = expectedInc(DT, 1, AREAS[row.area].periodMul, rig.rope.period);
    assert.equal(out2.rope.phase, expectedPhase(out.rope.phase, newInc),
      'the NEXT tick re-clocks to the new area');
    assert.equal(out2.run.area, row.area + 1, 'no second ascent: the ceiling moved up');
  });
}

// ---------- §4 wrap-bound guarantee (AC1 tail, D-e; mutation bait) ----------

test('the worst-case increment stays inside the feet window and below one wrap', () => {
  assert.ok(WINDOW_WIDTH > 0.05 && WINDOW_WIDTH < 0.2, `probed window ${WINDOW_WIDTH}`);
  assert.ok(WORST_ROPEMUL > 1, 'a ropeMul-up card must exist for the bound to bite');
  const worstInc = (STEP * WORST_ROPEMUL) / (game.ROPE_PERIOD * MIN_PERIOD_MUL);
  assert.ok(worstInc < WINDOW_WIDTH,
    `worst step ${worstInc} stays inside the ${WINDOW_WIDTH} window — no blackout`);
  const dtCapInc = (MAX_DT * WORST_ROPEMUL) / (game.ROPE_PERIOD * MIN_PERIOD_MUL);
  assert.ok(dtCapInc < 1,
    `even at the shell's ${MAX_DT} dt cap the step (${dtCapInc}) wraps at most once`);
});

// ---------- §5 buffer phase-invariance (D-c; kills M4) ----------

// Press-armed buffer, rope parked clear of the feet window, altitude just
// under the row's ceiling with a grounded player: the ONLY dynamics are the
// decay. Grace must span a constant FRACTION OF A REVOLUTION everywhere, so
// the real-time window shrinks exactly with the period.
function bufferDecayTrace(area) {
  const row = AREAS[area - 1];
  let run = { ...game.createRun(), area, altitude: row.ceiling - 30 };
  let rope = { phase: 0.05, period: game.ROPE_PERIOD };
  let player = createPlayer();
  let out = game.tickRun(run, rope, player, STEP, rngStub, true);
  const armed = out.rope.phase;
  let ticks = 0;
  while (out.run.buffer > 0) {
    assert.ok(ticks < 500, 'the buffer must drain');
    assert.equal(out.run.status, 'running');
    assert.equal(out.run.area, area, 'no ascent during decay (rig pin)');
    out = game.tickRun(out.run, out.rope, out.player, STEP, rngStub, null);
    ticks += 1;
  }
  return { ticks, span: out.rope.phase - armed, row };
}

test('the forgiveness buffer drains on the phase clock: constant phase span, area-scaled real time', () => {
  const low = bufferDecayTrace(game.MIN_AREA);
  const high = bufferDecayTrace(AREAS.length);
  for (const t of [low, high]) {
    const predicted = game.BUFFER_SEC * t.row.periodMul; // real-time expiry from records
    assert.ok(Math.abs(t.ticks * STEP - predicted) < 1.5 * STEP,
      `area ${t.row.area}: buffer expires ${t.ticks * STEP} s within a tick of ${predicted} s`);
  }
  assert.ok(high.ticks < low.ticks, 'the summit grace window is SHORTER in seconds');
  const incHigh = expectedInc(STEP, 1, high.row.periodMul, game.ROPE_PERIOD);
  const incLow = expectedInc(STEP, 1, low.row.periodMul, game.ROPE_PERIOD);
  assert.ok(Math.abs(high.span - low.span) < Math.max(incHigh, incLow),
    'grace spans the same phase fraction in every area — no second clock (NFR8)');
});

// ---------- §6 shared-handler identity + record shape (AC3; D-d/D-g) ----------

test('a resumed area-4 run continues bit-identically to the direct sim', () => {
  const record = { ...game.createRun(), area: 4, altitude: AREAS[3].ceiling - 30 };
  const lead = game.leadIn();
  const direct = game.tickRun({ ...record }, { ...lead.rope }, { ...lead.player }, STEP, rngStub);
  const resumed = game.resumeRun({ ...record });
  const viaResume = game.tickRun(resumed.run, resumed.rope, resumed.player, STEP, rngStub);
  assert.deepEqual(viaResume, direct,
    'the multiplier is computed from run.area — nothing for the handler to restore');
});

test('tickRun grows no new run fields (D-d)', () => {
  const rig = composeRig(2);
  const out = game.tickRun(rig.run, rig.rope, rig.player, STEP, rngStub);
  assert.deepEqual(Object.keys(out.run), Object.keys(game.startRun().run));
});

test('the multiplier survives pause/resume through run.area alone', () => {
  const rig = ascentRig(4);
  const asc = game.tickRun(rig.run, rig.rope, rig.player, DT, rngStub);
  assert.equal(asc.run.area, AREAS.length, 'the rig reached the summit tier (non-vacuity)');
  const resumed = game.resumeRun(asc.run);
  const out = game.tickRun(resumed.run, resumed.rope, resumed.player, STEP, rngStub);
  const inc = expectedInc(STEP, 1, AREAS[AREAS.length - 1].periodMul, resumed.rope.period);
  assert.equal(out.rope.phase, expectedPhase(resumed.rope.phase, inc),
    'post-ascent resume ticks on the NEW area multiplier via run.area only');
});

// ---------- §7 1000-tick pressure witness (seeded; kills M1/M2/M3) ----------

test('1000-tick climb: every tick increments from the records, altitude identity holds, area >= 2', () => {
  const rng = mulberry32(0xC0FFEE);
  const seed = AREAS[0].ceiling - 30; // one hop from the first ascent
  let { run, rope, player } = game.startRun();
  run = { ...run, altitude: seed, score: seed / game.ALT_PER_POINT }; // keeps altitude = ALT_PER_POINT x score
  let prevPhase = rope.phase;
  for (let tick = 0; tick < TICKS; tick++) {
    assert.notEqual(run.status, 'over', `scripted jumper tripped at tick ${tick}`);
    if (run.status === 'choose') { // defensive: cadence seeding keeps this unreachable
      run = game.applyCard(run, run.offer[0]);
      ({ run, rope, player } = game.resumeRun(run));
      prevPhase = rope.phase;
    }
    if (player.grounded && rope.phase >= JUMP_WINDOW_LO && rope.phase <= JUMP_WINDOW_HI) {
      player = jump(player, 0.5);
    }
    const inc = expectedInc(STEP, run.effects.ropeMul, AREAS[run.area - 1].periodMul, rope.period);
    assert.ok(inc < WINDOW_WIDTH, `tick ${tick}: the step stays inside the feet window`);
    const out = game.tickRun(run, rope, player, STEP, rng);
    assert.equal(out.rope.phase, expectedPhase(prevPhase, inc),
      `tick ${tick}: increment from the tick-start records (area ${run.area})`);
    assert.equal(out.run.altitude, game.ALT_PER_POINT * out.run.score,
      `tick ${tick}: the frozen altitude identity survives pace changes`);
    assert.ok(out.run.area >= run.area, `tick ${tick}: one-way ladder`);
    prevPhase = out.rope.phase;
    ({ run, rope, player } = out);
  }
  assert.ok(run.area >= 2, `the climb must enter the pressure band, ended at area ${run.area}`);
});
