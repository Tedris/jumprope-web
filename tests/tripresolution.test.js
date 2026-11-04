import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, tickRun, BUFFER_SEC, MIN_ROPES, MAX_ROPES } from '../js/game.js';

// Story 1.2 — trip resolution: a failed crossing at 2+ ropes strips one rope
// and blanks the clock; only the last rope kills. Same rig as
// tests/multirope.test.js: period 1 at dt 1/60 sweeps the canonical clock in
// TICKS_PER_REV ticks, and a grounded player fails every crossing it meets.
const DT = 1 / 60;
const TICKS_PER_REV = 60;
const grounded = { y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 };

// One tick whose phase crosses rope 0's feet window on the rising edge with
// nobody else's: phase 0.44 + dt lands inside [0.45, 0.55] on the first tick.
function failingTick(run, press = null) {
  return tickRun(run, { phase: 0.44, period: 1 }, grounded, DT, undefined, press);
}

test('contract: createRun arms no i-frames; tickRun return shape unchanged', () => {
  assert.equal(createRun().iFrames, 0);
  const out = failingTick(createRun());
  assert.deepEqual(Object.keys(out).sort(), ['events', 'player', 'rope', 'run', 'tripped']);
});

for (let n = MIN_ROPES + 1; n <= MAX_ROPES; n++) {
  test(`strip trip at N=${n}: one rope lost, i-frames armed, the run keeps going`, () => {
    const { run, tripped, events } = failingTick({ ...createRun(), ropes: n });
    assert.equal(tripped, false, `N=${n} must not fatal-trip`);
    assert.equal(run.status, 'running');
    assert.equal(run.ropes, n - 1);
    assert.equal(run.iFrames, n - 1);
    assert.ok(events.includes('ropeLost'), `expected a ropeLost event, got ${events}`);
    assert.notEqual(events.at(-1), 'trip');
    // The failing crossing scores nothing.
    assert.equal(run.skips, 0);
    assert.equal(run.score, 0);
  });
}

// Script one-plus revolutions of grounded player after a strip trip and
// report the blank's shape: how many crossings passed harmlessly, the tick
// the blank ended on, and the tick of the first live crossing after it.
function scriptBlank(n) {
  const out = failingTick({ ...createRun(), ropes: n });
  let run = out.run;
  let rope = out.rope;
  let harmless = 0;
  let blankEnd = null;
  let firstLive = null;
  let blankClosed = false;
  for (let t = 1; t <= 4 * TICKS_PER_REV; t++) {
    const o = tickRun(run, rope, grounded, DT);
    if (o.run.iFrames < run.iFrames) {
      harmless += 1;
      blankEnd = t;
      // A true blank touches nothing else.
      assert.equal(o.run.skips, run.skips);
      assert.equal(o.run.score, run.score);
      assert.equal(o.run.streak, run.streak);
      assert.deepEqual(o.events, []);
    }
    run = o.run;
    rope = o.rope;
    if (run.iFrames === 0) blankClosed = true;
    if (o.events.some(e => e === 'skip' || e === 'trip' || e === 'ropeLost')) {
      firstLive = t;
      break;
    }
  }
  return { run, harmless, blankEnd, firstLive, blankClosed };
}

for (let n = MIN_ROPES + 1; n <= MAX_ROPES; n++) {
  test(`blank at N=${n}: exactly N-1 harmless crossings, then the clock is live`, () => {
    const { run, harmless, blankEnd, firstLive, blankClosed } = scriptBlank(n);
    const ropes = n - 1;
    assert.equal(harmless, ropes, 'one harmless pass per remaining rope');
    assert.ok(blankClosed, 'i-frames drained to zero as the blank ended');
    // R evenly spaced passes span exactly one revolution: the blank ends one
    // revolution after the trip tick, whatever the rope count (NFR8).
    assert.ok(blankEnd !== null && Math.abs(blankEnd - TICKS_PER_REV) <= 2,
      `blank ended at tick ${blankEnd}, expected ~${TICKS_PER_REV}`);
    assert.ok(firstLive !== null && firstLive > blankEnd, 'first live crossing follows the blank');
    // The grounded player still fails it: fatal at 1 rope, another strip above.
    if (ropes === 1) {
      assert.equal(run.status, 'over');
    } else {
      assert.equal(run.ropes, ropes - 1);
      assert.equal(run.iFrames, ropes - 1);
    }
  });
}

test('blank duration is rope-count invariant: one revolution of clock at every N', () => {
  const spans = [];
  for (let n = MIN_ROPES + 1; n <= MAX_ROPES; n++) {
    const { blankEnd } = scriptBlank(n);
    assert.ok(blankEnd !== null && Math.abs(blankEnd - TICKS_PER_REV) <= 2,
      `N=${n}: blank span ${blankEnd} deviates from one revolution by more than 2 ticks`);
    spans.push(blankEnd);
  }
  assert.ok(Math.max(...spans) - Math.min(...spans) <= 4,
    `blank spans differ across rope counts: ${spans}`);
});

test('last-rope death is byte-identical v1: over, tripped, trip event, ropes untouched', () => {
  const { run, tripped, events } = failingTick({ ...createRun(), ropes: 1 });
  assert.equal(tripped, true);
  assert.equal(run.status, 'over');
  assert.equal(events.at(-1), 'trip');
  assert.equal(run.ropes, 1); // left as-is, never stripped below 1
});

test('mercy keeps first priority: a pressed failing crossing at N >= 2 scores, strips nothing', () => {
  const { run, tripped, events } = failingTick({ ...createRun(), ropes: 3 }, true);
  assert.equal(tripped, false);
  assert.equal(run.status, 'running');
  assert.equal(run.skips, 1);
  assert.equal(run.score, 1);
  assert.equal(run.buffer, 0); // consumed at the crossing (D-N01)
  assert.equal(run.ropes, 3);
  assert.equal(run.iFrames, 0);
  assert.ok(events.includes('skip') && events.includes('nearMiss'));
});

test('the blank does not consume the buffer: it decays only on its own phase clock', () => {
  const { run, events } = failingTick({ ...createRun(), ropes: 2, iFrames: 2 }, true);
  assert.equal(run.iFrames, 1); // a harmless crossing, nothing else
  assert.equal(run.buffer, BUFFER_SEC); // re-armed by the press, not consumed
  assert.equal(run.skips, 0);
  assert.deepEqual(events, []);
});

test('records without iFrames behave as no i-frames: N=2 still strips', () => {
  const legacy = { ...createRun(), ropes: 2 };
  delete legacy.iFrames;
  const { run, tripped, events } = failingTick(legacy);
  assert.equal(tripped, false);
  assert.equal(run.ropes, 1);
  assert.equal(run.iFrames, 1);
  assert.equal(events.at(-1), 'ropeLost');
});

test('out-of-range count strips from the clamped value: ropes 7 heals to 5 then writes 4', () => {
  const { run } = failingTick({ ...createRun(), ropes: 7 });
  assert.equal(run.ropes, 4);
  assert.equal(run.iFrames, 4);
});

test('phase-dependent tail: a trip on a later rope edge drains sooner but live crossings still wait a full revolution', () => {
  // i-frames count passes, not ticks (NFR8), so arming cannot compensate for
  // WHERE in the revolution the trip landed. Tripping on the wrap rope's edge
  // (the multirope.test.js rig) gives N=2's single harmless pass ~half a
  // revolution after the trip — shorter than the k=0 rig's 60 ticks. FR3's
  // floor is on the LIVE crossing: never sooner than one revolution.
  const o = tickRun({ ...createRun(), ropes: 2 }, { phase: 0.94, period: 1 }, grounded, DT);
  assert.equal(o.run.ropes, 1);
  assert.equal(o.run.iFrames, 1);
  let { run, rope } = o;
  let harmlessTick = null;
  let liveTick = null;
  for (let t = 1; t <= 2 * TICKS_PER_REV; t++) {
    const oo = tickRun(run, rope, grounded, DT);
    if (oo.run.iFrames < run.iFrames) harmlessTick = t;
    run = oo.run;
    rope = oo.rope;
    if (oo.events.length > 0) {
      liveTick = t;
      break;
    }
  }
  assert.equal(harmlessTick, TICKS_PER_REV / 2, 'documented half-revolution tail for the k=1 trip');
  assert.ok(liveTick !== null && liveTick >= TICKS_PER_REV,
    `live crossing at tick ${liveTick}: never before one full revolution after the trip`);
});

test('unbounded iFrames cap as data: 1e21 drains like the cap, never an immortal blank', () => {
  const first = failingTick({ ...createRun(), ropes: 2, iFrames: 1e21 });
  assert.equal(first.run.iFrames, MAX_ROPES - 1); // capped at read, then the harmless pass debits it
  let { run, rope } = first;
  let liveTick = null;
  for (let t = 1; t <= 6 * TICKS_PER_REV && liveTick === null; t++) {
    const o = tickRun(run, rope, grounded, DT);
    run = o.run;
    rope = o.rope;
    if (o.events.length > 0) liveTick = t;
  }
  assert.ok(liveTick !== null, 'the blank must drain — a capped count cannot freeze the clock immune');
});
