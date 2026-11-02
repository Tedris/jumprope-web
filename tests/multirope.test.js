import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRun, tickRun, startRun, applyUpgrade,
  MIN_ROPES, MAX_ROPES, START_PHASE, ROPE_PERIOD,
} from '../js/game.js';
import { jumpVelocity } from '../js/player.js';
import { atFeetOffset } from '../js/rope.js';
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
  // Literal 6 = 3 passes x scoreMul 2 (multi adds +1); reading the multiplier
  // back off the system under test would pass even if scoring ignored it.
  assert.equal(done.effects.scoreMul, 2);
  assert.equal(done.score, 6);
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

test('windows are disjoint: at most one rope is at-feet for any phase, N = 1..5', () => {
  // Pins the invariant the offer/trip `break` logic relies on: offsets k/N
  // are >= 0.2 apart for N <= 5 while the feet window is 0.1 wide, so two
  // rising edges can never land on one tick — Story 1.2 builds on this.
  for (let n = MIN_ROPES; n <= MAX_ROPES; n++) {
    for (let i = 0; i < 1000; i++) {
      const phase = i / 1000;
      let live = 0;
      for (let k = 0; k < n; k++) if (atFeetOffset(phase, k, n)) live += 1;
      assert.ok(live <= 1, `N=${n} phase ${phase}: ${live} windows live at once`);
    }
  }
});

test('a failing crossing on rope k >= 1 trips, and the buffer saves it, too', () => {
  // N=2 rope 1's window is (phase + 0.5) mod 1 in [0.45, 0.55], i.e. phase
  // in [0.95, 1) u [0, 0.05): the wrap-straddling rope must judge a grounded
  // player exactly like rope 0 does.
  const grounded = { y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 };
  const over = tickRun({ ...createRun(), ropes: 2 }, { phase: 0.94, period: 1 }, grounded, DT);
  assert.equal(over.tripped, true);
  assert.equal(over.run.status, 'over');
  assert.equal(over.events.at(-1), 'trip');

  const saved = tickRun({ ...createRun(), ropes: 2 }, { phase: 0.94, period: 1 }, grounded, DT, undefined, true);
  assert.equal(saved.tripped, false);
  assert.equal(saved.run.status, 'running');
  assert.equal(saved.run.skips, 1);
  assert.equal(saved.run.buffer, 0);
  assert.ok(saved.events.includes('skip') && saved.events.includes('nearMiss'));
});

test('out-of-range rope counts are clamped data, never a throw', () => {
  const grounded = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };
  for (const bad of [0, -3, 6, 99, NaN, undefined, null, Infinity, -Infinity, '4']) {
    assert.doesNotThrow(() => tickRun({ ...createRun(), ropes: bad },
      { phase: 0.44, period: 1 }, grounded, DT), `ropes=${String(bad)} must not throw`);
  }
  // 0/negative/nullish/non-numeric behave as the minimum; 6+ clamp to the
  // maximum — +Infinity included ("very many ropes", the opposite arm from
  // NaN's minimum default; a string is uninterpretably minimum, not "4").
  assert.equal(oneRevolution({ ...createRun(), ropes: 0 }).skipTicks.length, MIN_ROPES);
  assert.equal(oneRevolution({ ...createRun(), ropes: -2 }).skipTicks.length, MIN_ROPES);
  assert.equal(oneRevolution({ ...createRun(), ropes: 6 }).skipTicks.length, MAX_ROPES);
  assert.equal(oneRevolution({ ...createRun(), ropes: 12 }).skipTicks.length, MAX_ROPES);
  assert.equal(oneRevolution({ ...createRun(), ropes: Infinity }).skipTicks.length, MAX_ROPES);
  assert.equal(oneRevolution({ ...createRun(), ropes: -Infinity }).skipTicks.length, MIN_ROPES);
  assert.equal(oneRevolution({ ...createRun(), ropes: '4' }).skipTicks.length, MIN_ROPES);
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
