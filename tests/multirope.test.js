import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRun, tickRun, startRun, applyUpgrade,
  MIN_ROPES, MAX_ROPES, START_PHASE, ROPE_PERIOD,
} from '../js/game.js';
import { jumpVelocity } from '../js/player.js';
import { UPGRADES, freshEffects } from '../js/upgrades.js';

// One synthetic revolution: rope period 1, dt 1/60, so 60 ticks sweep the
// canonical clock exactly once. The player is re-injected airborne every tick
// — a rig that isolates the crossing/scoring path from jump physics.
const DT = 1 / 60;
const TICKS_PER_REV = 60;
const airborne = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };

function oneRevolution(run) {
  let rope = { phase: 0, period: 1 };
  const skipTicks = [];
  for (let t = 1; t <= TICKS_PER_REV; t++) {
    const out = tickRun(run, rope, airborne, DT);
    run = out.run;
    rope = out.rope;
    if (out.events.includes('skip')) skipTicks.push(t);
  }
  return { run, skipTicks };
}

test('createRun carries ropes: 1 on top of the intact v1 start contract', () => {
  const run = createRun();
  assert.equal(run.ropes, 1);
  // FR25 start contract, unchanged.
  assert.equal(run.status, 'running');
  assert.equal(run.score, 0);
  assert.equal(run.skips, 0);
  assert.deepEqual(run.effects, freshEffects());
  assert.equal(run.offer, null);
  assert.deepEqual(run.owned, {});
  assert.equal(run.buffer, 0);
  assert.equal(run.streak, 0);

  const started = startRun();
  assert.equal(started.rope.phase, START_PHASE);
  assert.equal(started.rope.period, ROPE_PERIOD);
  assert.equal(started.player.vy, jumpVelocity(0.1));
  assert.equal(started.run.ropes, 1);
});

test('rope-count validity band is 1–5 as module constants', () => {
  assert.equal(MIN_ROPES, 1);
  assert.equal(MAX_ROPES, 5);
});

test('tickRun return contract: run/rope/player/tripped/events, run keeps ropes', () => {
  const out = tickRun(createRun(), { phase: 0.44, period: 0.9 }, airborne, DT);
  assert.deepEqual(Object.keys(out).sort(), ['events', 'player', 'rope', 'run', 'tripped']);
  assert.equal(out.run.ropes, 1);
  assert.equal(typeof out.tripped, 'boolean');
  assert.ok(Array.isArray(out.events));
});

for (let n = MIN_ROPES + 1; n <= MAX_ROPES; n++) {
  test(`N=${n} ropes cross evenly spaced on one clock, each scored independently`, () => {
    const { run, skipTicks } = oneRevolution({ ...createRun(), ropes: n });
    assert.equal(skipTicks.length, n, `expected ${n} independent passes in one revolution`);
    assert.equal(run.skips, n);
    assert.equal(run.score, n); // FR21 formula: scoreMul (1) per pass
    // Even spacing: consecutive crossings 1/N of a revolution apart.
    const expectedGap = TICKS_PER_REV / n;
    for (let i = 1; i < skipTicks.length; i++) {
      assert.ok(Math.abs(skipTicks[i] - skipTicks[i - 1] - expectedGap) <= 1,
        `gap ${skipTicks[i] - skipTicks[i - 1]} ticks deviates from ${expectedGap}`);
    }
  });
}

test('multi-rope passes score with the unchanged per-pass formula', () => {
  const multi = UPGRADES.find(u => u.id === 'multi');
  const run = applyUpgrade({ ...createRun(), ropes: 3 }, multi);
  const { run: done } = oneRevolution(run);
  assert.equal(done.skips, 3);
  assert.equal(done.score, 3 * done.effects.scoreMul);
});

test('offer fires once per tick and stops resolving crossings', () => {
  let run = { ...createRun(), ropes: 4, skips: 9 };
  let rope = { phase: 0, period: 1 };
  let fired = 0;
  for (let t = 1; t <= TICKS_PER_REV; t++) {
    const out = tickRun(run, rope, airborne, DT);
    run = out.run;
    rope = out.rope;
    if (out.events.includes('offer')) fired += 1;
    if (run.status === 'choose') break;
  }
  assert.equal(fired, 1);
  assert.equal(run.skips, 10); // never steps over the 10th-skip boundary
  assert.equal(run.status, 'choose');
  assert.equal(run.offer.length, 2);
});

test('failed crossing with no live buffer still trips the run for any rope count', () => {
  for (let n = MIN_ROPES; n <= MAX_ROPES; n++) {
    const grounded = { y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 };
    const { run, tripped, events } = tickRun(
      { ...createRun(), ropes: n }, { phase: 0.44, period: 1 }, grounded, DT,
    );
    assert.equal(tripped, true, `N=${n} must trip`);
    assert.equal(run.status, 'over');
    assert.equal(events.at(-1), 'trip');
  }
});

test('buffer forgives one failing crossing at any rope count, consumed at the crossing', () => {
  for (let n = MIN_ROPES; n <= MAX_ROPES; n++) {
    const grounded = { y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 };
    const { run, tripped, events } = tickRun(
      { ...createRun(), ropes: n }, { phase: 0.44, period: 1 }, grounded, DT, undefined, true,
    );
    assert.equal(tripped, false, `N=${n} buffer must hold`);
    assert.equal(run.status, 'running');
    assert.equal(run.skips, 1);
    assert.equal(run.score, 1);
    assert.equal(run.buffer, 0); // consumed at the crossing (D-N01)
    assert.ok(events.includes('skip') && events.includes('nearMiss'));
  }
});

test('out-of-range rope counts are clamped data, never a throw', () => {
  const grounded = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };
  for (const bad of [0, -3, 6, 99, NaN, undefined, null]) {
    assert.doesNotThrow(() => tickRun({ ...createRun(), ropes: bad },
      { phase: 0.44, period: 1 }, grounded, DT), `ropes=${String(bad)} must not throw`);
  }
  // 0/negative/nullish behave as the minimum; 6+ clamp to the maximum.
  assert.equal(oneRevolution({ ...createRun(), ropes: 0 }).skipTicks.length, MIN_ROPES);
  assert.equal(oneRevolution({ ...createRun(), ropes: -2 }).skipTicks.length, MIN_ROPES);
  assert.equal(oneRevolution({ ...createRun(), ropes: 6 }).skipTicks.length, MAX_ROPES);
  assert.equal(oneRevolution({ ...createRun(), ropes: 12 }).skipTicks.length, MAX_ROPES);
});

test('N=1 parity: explicit ropes:1 ≡ field-absent ≡ v1 for one scripted sequence', () => {
  const withField = { ...createRun() };
  const withoutField = { ...createRun() };
  delete withoutField.ropes;
  const started = startRun();
  let rope = started.rope;
  let player = started.player;
  let a = withField;
  let b = withoutField;
  for (let t = 1; t <= 300; t++) {
    const press = t % 40 === 0 ? true : null;
    const outA = tickRun(a, rope, player, DT, () => 0.5, press);
    const outB = tickRun(b, rope, player, DT, () => 0.5, press);
    assert.deepEqual(outA.run, { ...outB.run, ropes: 1 }, `divergence at tick ${t}`);
    assert.deepEqual(outA.rope, outB.rope);
    assert.deepEqual(outA.player, outB.player);
    assert.equal(outA.tripped, outB.tripped);
    assert.deepEqual(outA.events, outB.events);
    rope = outA.rope;
    player = outA.player;
    a = outA.run;
    b = outB.run;
  }
});
