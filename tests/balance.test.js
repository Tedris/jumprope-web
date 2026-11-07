import test from 'node:test';
import assert from 'node:assert/strict';
import * as harness from './support/balance-harness.js';
import * as game from '../js/game.js';
import { AREAS } from '../js/areas.js';
import { CARDS, RARITY_WEIGHT, freshEffects } from '../js/upgrades.js';
import { jump } from '../js/player.js';

// Story 2.5: ascent economy balance harness legs. The harness
// (tests/support/balance-harness.js) is a measurement instrument; these legs
// pin its contract, determinism, evaluator parity with the live sim, the
// catalogue rule report (epics.md:93-94), and the offer-collision baseline
// (sprint-change-proposal-2026-11-06.md:33). Expectations derive from the
// real apply closures and RARITY_WEIGHT — never a hand-maintained table
// (AGENTS.md frozen-test discipline).

const STEP = 1 / 120;
const ALT = game.ALT_PER_POINT;

const sortedKeys = (obj) => Object.keys(obj).sort();

const stackedEffects = (card, times) => {
  let effects = freshEffects();
  for (let i = 0; i < times; i++) effects = card.apply(effects);
  return effects;
};

// Mirror of runBot's scripted policy driving tickRun directly, recording the
// sim's OWN ascend/win event ticks (tests/headless-sim.test.js:39-59 idiom).
function simAscentTicks({ ticks, altitude0 }) {
  let { rope, player, run } = game.startRun();
  run = { ...run, altitude: altitude0, owned: harness.cappedOwned() };
  const ascends = [];
  let winTick = null;
  for (let tick = 0; tick < ticks; tick++) {
    if (player.grounded && rope.phase >= 0.2 && rope.phase <= 0.35) player = jump(player, 0.5);
    const out = game.tickRun(run, rope, player, STEP, () => 0.5);
    ({ run, rope, player } = out);
    if (out.events.includes('ascend')) ascends.push(tick);
    if (out.events.includes('win')) winTick = tick;
    if (run.status === 'over') break;
  }
  return { ascends, winTick };
}

// --- Task 2: contract legs (factory-contract test, AGENTS.md) ---

test('harness export surface and every report key set are pinned', () => {
  assert.deepEqual(sortedKeys(harness), [
    'AXIS', 'ascentReport', 'cappedOwned', 'cardRuleReport', 'collisionReport',
    'evaluateLadder', 'mulberry32', 'runBot', 'summitRate',
  ]);
  assert.deepEqual(sortedKeys(harness.runBot({ ticks: 8 })), [
    'altitude', 'elapsedTicks', 'invalidPhaseStep', 'maxPeak', 'skips', 'trace', 'tripTick', 'trips', 'winTick',
  ]);
  assert.deepEqual(sortedKeys(harness.runBot({ ticks: 8 }).trace[0]), [
    'altitude', 'iFrames', 'phase', 'score', 'status', 'tick', 'y',
  ]);
  assert.deepEqual(sortedKeys(harness.evaluateLadder(harness.runBot({ ticks: 8 }))), [
    'climbRate', 'crossTicks', 'reachedArea', 'summitEta', 'winTick',
  ]);
  assert.deepEqual(sortedKeys(harness.ascentReport({ ticks: 8 })), [
    'altitudePerSkip', 'crossTicks', 'summitEta',
  ]);
  const report = harness.cardRuleReport({ ticks: 40 });
  assert.ok(report.baseline.skips >= 1, 'the probe horizon contains a skip — a zero-skip horizon makes every delta NaN');
  assert.ok(report.cards.every((c) => Number.isFinite(c.climbDeltaPick) && Number.isFinite(c.climbDeltaCap)),
    'deltas are real numbers at a meaningful horizon');
  assert.deepEqual(sortedKeys(report), ['baseline', 'cards', 'dominated', 'neutralClimb', 'reduceClimb']);
  assert.deepEqual(sortedKeys(report.baseline), [
    'altitude', 'altitudePerSkip', 'climbRate', 'elapsedTicks', 'maxPeak', 'skips',
  ]);
  assert.deepEqual(sortedKeys(report.cards[0]), [
    'axis', 'climbDeltaCap', 'climbDeltaPick', 'id', 'name', 'peakDeltaCap', 'peakDeltaPick', 'trips',
  ]);
  assert.deepEqual(sortedKeys(harness.collisionReport({ draws: 5, pick: 2 })), ['draws', 'rate']);
  assert.deepEqual(sortedKeys(harness.summitRate({ seeds: [0], ticks: 8 })), [
    'rate', 'seeds', 'summits', 'winTicks',
  ]);
});

// --- Task 2: determinism legs (NFR4, Decided 9) ---

test('runBot is deterministic under identical config', () => {
  assert.deepEqual(harness.runBot({ ticks: 600 }), harness.runBot({ ticks: 600 }));
});

test('cardRuleReport twice deepEqual', () => {
  assert.deepEqual(harness.cardRuleReport({ ticks: 100 }), harness.cardRuleReport({ ticks: 100 }));
});

test('collisionReport with equal seed is equal', () => {
  const a = harness.collisionReport({ draws: 500, pick: 2, seed: 7 });
  const b = harness.collisionReport({ draws: 500, pick: 2, seed: 7 });
  assert.deepEqual(a, b);
});

// --- Task 2: gate-parity leg (headless-sim.test.js:90-92 band) ---

test('neutral 1000-tick bot mirrors the shipped gate: no trip, 6-7 cycles, altitude == ALT x score', () => {
  const result = harness.runBot({ ticks: 1000 });
  assert.equal(result.trips, false, 'the shipped physics must not trip the bot');
  const cycles = result.trace.filter((e, i) => i > 0 && e.phase < result.trace[i - 1].phase).length;
  assert.ok(cycles >= 6 && cycles <= 7, `phase wraps ${cycles} in the pinned [6, 7] band`);
  for (const e of result.trace) {
    assert.ok(Math.abs(e.altitude - ALT * e.score) < 1e-9, `tick ${e.tick}: altitude tracks ALT_PER_POINT x score`);
  }
});

// --- Task 2: evaluator-parity leg (Decided 2 made executable) ---

test('post-hoc ladder evaluation reproduces the sim\'s own ascend/win ticks', () => {
  const crafted = AREAS[0].ceiling + 2;
  const result = harness.runBot({ ticks: 1200, altitude0: crafted });
  const post = harness.evaluateLadder(result);
  const sim = simAscentTicks({ ticks: 1200, altitude0: crafted });
  assert.equal(post.crossTicks[0], 0, 'tick-0 ascend of the crafted run is a tick-0 post-hoc crossing');
  assert.deepEqual(post.crossTicks, sim.ascends);

  const near = harness.runBot({ ticks: 600, altitude0: 2000 });
  const nearPost = harness.evaluateLadder(near);
  const nearSim = simAscentTicks({ ticks: 600, altitude0: 2000 });
  assert.deepEqual(nearPost.crossTicks, nearSim.ascends);
  assert.equal(nearPost.winTick, near.winTick, 'summit tick agrees with the sim');
  assert.equal(nearPost.winTick, nearSim.winTick);
});

test('ascentReport answers the AC1 triad on a real horizon', () => {
  const rep = harness.ascentReport({ ticks: 1000 });
  assert.equal(rep.altitudePerSkip, ALT, 'neutral altitudePerSkip is exactly ALT_PER_POINT');
  const direct = harness.evaluateLadder(harness.runBot({ ticks: 1000 }));
  assert.deepEqual(rep.crossTicks, direct.crossTicks);
  assert.equal(rep.summitEta, direct.summitEta);
});

// --- Task 2: sweep legs (AC2, post-hoc exact + re-simulated periods) ---

test('scale invariance: (K, ladder) and (2K, 2x ladder) cross identical ticks', () => {
  const trace = harness.runBot({}).trace;
  const one = harness.evaluateLadder(trace, { altPerPoint: 120, ladder: [240, 480] });
  const two = harness.evaluateLadder(trace, { altPerPoint: 240, ladder: [480, 960] });
  assert.ok(one.crossTicks.length > 0 && one.winTick !== null, 'the sweep trace must actually cross');
  assert.deepEqual(two.crossTicks, one.crossTicks);
  assert.equal(two.winTick, one.winTick);
});

test('monotone ETA: lowering the ladder strictly shortens summitEta on one trace', () => {
  const trace = harness.runBot({}).trace;
  const eta = (top) => harness.evaluateLadder(trace, { altPerPoint: 120, ladder: [240, top] }).summitEta;
  const [short, mid, tall] = [900, 1200, 1500].map(eta);
  assert.ok(short < mid && mid < tall, `${short} < ${mid} < ${tall}`);
  assert.ok(Number.isFinite(mid), 'a reachable ladder gives a finite ETA');
});

test('period sweep re-simulates per value and flags blackout-bound periods', () => {
  const sweep = [1.3, 0.65, 0.325, 0.08].map((period) => {
    const result = harness.runBot({ period });
    return { period, ...harness.evaluateLadder(result), trips: result.trips, invalid: result.invalidPhaseStep };
  });
  for (const entry of sweep) {
    assert.equal(entry.invalid, STEP / entry.period >= 0.1, 'invalidPhaseStep marks the blackout bound');
  }
  const rate = (period) => sweep.find((s) => s.period === period).climbRate;
  assert.ok(rate(0.65) > rate(1.3), 'a faster clock climbs faster');
  assert.ok(rate(0.325) < rate(1.3), 'sub-window flight reports a worse climb, not a hidden fix');
  assert.ok(sweep.find((s) => s.period === 0.08).invalid, 'the short period is flagged, not silently clean');
});

// --- Task 2: summitRate leg (AC5, Epic 6 reuse seam) ---

test('summitRate: multi-seed, deterministic, shape pinned, picks flow through the pick path', () => {
  const plain = { seeds: [0, 1, 2], ticks: 600, altitude0: 2000 };
  const first = harness.summitRate(plain);
  assert.deepEqual(harness.summitRate(plain), first);
  assert.equal(first.rate, 1, 'a crafted near-summit start must summit on every seed');
  assert.equal(first.winTicks.filter((t) => typeof t === 'number').length, 3, 'every seed records its win tick');

  const seam = { seeds: [0, 1, 2], ticks: 3000, altitude0: 1980, owned: {}, pickStrategy: (offer, n) => offer[n % offer.length] };
  const seamFirst = harness.summitRate(seam);
  assert.deepEqual(harness.summitRate(seam), seamFirst, 'seeded picks + rng are deterministic');
  assert.ok(seamFirst.summits > 0, 'the pick seam reaches the summit at least once');

  const dial = (K) => harness.summitRate({ seeds: [0], ticks: 1200, altPerPoint: K, ladder: [10, 20, 40, 80, 100] });
  const [baseK, doubled] = [dial(2), dial(4)];
  assert.ok(baseK.rate === 1 && doubled.rate === 1, 'the swept dial summits inside the horizon');
  assert.ok(doubled.winTicks[0] < baseK.winTicks[0],
    `the master dial moves the summit tick (${baseK.winTicks[0]} -> ${doubled.winTicks[0]}) — AC5 seam is live`);
});

// --- Task 3: rule report legs (AC3, catalogue rules epics.md:93-94) ---

test('per-card climb and peak deltas land in the analytic band of the real closures', () => {
  const report = harness.cardRuleReport({ ticks: 1200 });
  const baseSkips = report.baseline.skips;
  assert.ok(baseSkips >= 6 && baseSkips <= 10, `baseline ~8 skips (measured ${baseSkips})`);

  for (const entry of report.cards) {
    const card = CARDS.find((c) => c.id === entry.id);
    for (const [n, climbKey, peakKey] of [[1, 'climbDeltaPick', 'peakDeltaPick'], [card.cap, 'climbDeltaCap', 'peakDeltaCap']]) {
      const fx = stackedEffects(card, n);
      const climbFactor = fx.ropeMul * fx.scoreMul;
      const peakFactor = fx.floatMul;
      const climbBand = 0.05 + climbFactor / baseSkips;
      assert.ok(Math.abs(entry[climbKey] - (climbFactor - 1)) <= climbBand,
        `${entry.id}/${n}: measured ${entry[climbKey]} within ${climbBand} of analytic ${climbFactor - 1}`);
      const peakBand = peakFactor === 1 ? 0.02 : 0.05;
      assert.ok(Math.abs(entry[peakKey] - (peakFactor - 1)) <= peakBand,
        `${entry.id}/${n}: peak ${entry[peakKey]} within ${peakBand} of analytic ${peakFactor - 1}`);
    }
  }
});

test('dominated / reduceClimb / neutralClimb equal the analytic derivations', () => {
  const report = harness.cardRuleReport({ ticks: 1200 });
  const deltas = new Map(CARDS.map((card) => {
    const one = stackedEffects(card, 1);
    const cap = stackedEffects(card, card.cap);
    return [card.id, {
      axis: harness.AXIS[card.id],
      cp: one.ropeMul * one.scoreMul - 1,
      cc: cap.ropeMul * cap.scoreMul - 1,
      pp: one.floatMul - 1,
      pc: cap.floatMul - 1,
    }];
  }));

  const expectedDominated = [];
  for (const [idA, a] of deltas) {
    for (const [idB, b] of deltas) {
      if (idA === idB || a.axis !== b.axis) continue;
      const ge = a.cp <= b.cp && a.cc <= b.cc && a.pp <= b.pp && a.pc <= b.pc;
      const strict = a.cp < b.cp || a.cc < b.cc || a.pp < b.pp || a.pc < b.pc;
      if (ge && strict) expectedDominated.push({ id: idA, by: idB });
    }
  }
  const byId = (list) => [...list].sort((x, y) => x.id.localeCompare(y.id));
  assert.deepEqual(byId(report.dominated), byId(expectedDominated), 'one-axis-one-card verdicts match the closures');

  const expectedReduce = CARDS.filter((card) => {
    const one = stackedEffects(card, 1);
    const cap = stackedEffects(card, card.cap);
    return one.ropeMul * one.scoreMul < 1 || cap.ropeMul * cap.scoreMul < 1;
  }).map((card) => card.id).sort();
  assert.deepEqual([...report.reduceClimb].sort(), expectedReduce, 'rule-2 violators are exactly the measured climb-cutters');

  const neutralAnalytic = CARDS.filter((card) => {
    const one = stackedEffects(card, 1);
    const cap = stackedEffects(card, card.cap);
    return one.ropeMul * one.scoreMul === 1 && cap.ropeMul * cap.scoreMul === 1;
  }).map((card) => card.id).sort();
  assert.deepEqual([...report.neutralClimb].sort(), neutralAnalytic, 'zero-climb cards are exactly the no-climb-axis cards');
});

test('trip honesty: tripped entries use their trip tick, never the full horizon (Decided 7)', () => {
  const ticks = 1200;
  const base = harness.runBot({ ticks });
  const baseRate = base.altitude / (base.trips ? base.tripTick : base.elapsedTicks);
  const report = harness.cardRuleReport({ ticks });
  for (const entry of report.cards) {
    const card = CARDS.find((c) => c.id === entry.id);
    const pickRun = harness.runBot({ ticks, effects: stackedEffects(card, 1) });
    const capRun = harness.runBot({ ticks, effects: stackedEffects(card, card.cap) });
    assert.equal(entry.trips, pickRun.trips || capRun.trips, `${entry.id}: flag reflects both strengths`);
    for (const [run, key] of [[pickRun, 'climbDeltaPick'], [capRun, 'climbDeltaCap']]) {
      const elapsed = run.trips ? run.tripTick : run.elapsedTicks;
      assert.equal(entry[key], run.altitude / elapsed / baseRate - 1,
        `${entry.id}/${key}: rate divides by ${elapsed} — the run's true tick count`);
    }
  }
});

test('trip honesty is live: a never-jump bot trips and gets no extrapolated ETA', () => {
  const tripped = harness.runBot({ ticks: 1200, policy: { lo: 2, hi: 2, hold: 0.5 } });
  assert.ok(tripped.trips, 'a bot that never jumps dies right after the lead-in hop');
  assert.equal(tripped.winTick, null);
  assert.equal(tripped.elapsedTicks, tripped.tripTick + 1, 'the trace ends on the trip tick');
  assert.ok(tripped.altitude > 0, 'it scored before dying — the rate window truncates, never zeroes');
  assert.equal(harness.evaluateLadder(tripped).summitEta, Infinity,
    'a tripped trace extrapolates no finite ETA (Decided 7 in the ladder view too)');
});

// --- Task 3: collision legs (AC4, proposal baseline 16.1/46.8) ---

function exactCollisionRate(pick) {
  let probability = 0;
  const walk = (pool, prob, axes, depth) => {
    if (depth === pick) return;
    const total = pool.reduce((t, c) => t + RARITY_WEIGHT[c.rarity], 0);
    pool.forEach((card, i) => {
      const q = (prob * RARITY_WEIGHT[card.rarity]) / total;
      if (axes.includes(harness.AXIS[card.id])) probability += q; // absorbing: first collision
      else walk([...pool.slice(0, i), ...pool.slice(i + 1)], q, [...axes, harness.AXIS[card.id]], depth + 1);
    });
  };
  walk(CARDS, 1, [], 0);
  return probability;
}

test('same-axis collision rate: seeded draws track the exact weighted enumeration', () => {
  for (const pick of [2, 3]) {
    const exact = exactCollisionRate(pick);
    const empirical = harness.collisionReport({ draws: 20000, pick, seed: 0 });
    assert.ok(Math.abs(empirical.rate - exact) <= 0.015,
      `pick-of-${pick}: empirical ${empirical.rate} within sampling band of exact ${exact}`);
    // Story 3.1 re-contract: exact weighted enumeration over the 12-card /
    // sentinel-axis pool is 7.07% / 20.54% (was 16.25% / 46.20% on 8 cards) —
    // the four inert rule-changers are axis-singletons, so same-axis
    // collisions drop ("trending to zero", deferred-work :61 outcome).
    const baseline = pick === 2 ? 0.07 : 0.21;
    assert.ok(Math.abs(exact - baseline) <= 0.01,
      `pick-of-${pick}: exact ${exact} reproduces the proposal baseline ~${baseline}`);
  }
});

// --- Task 3: AXIS guard leg (Decided 3) ---

// Story 3.1 amendment (deferred-work :74 contract, permanently implemented):
// every card must be MAPPED; cards whose apply writes no effect field (the
// run-shaped/inert class — the 3.1 rule-changers awaiting 3.2-3.4 effects)
// are exempt from the "axis is a field apply writes" and group co-write
// checks. Effect-writing (legacy) cards keep the strict Decided-3 check.
test('AXIS covers every card; effect-writing cards keep the strict axis contract', () => {
  const touchedFields = (card) => {
    const base = freshEffects();
    const applied = card.apply(base);
    return Object.keys(base).filter((field) => applied[field] !== base[field]);
  };
  const groups = new Map();
  for (const card of CARDS) {
    assert.ok(card.id in harness.AXIS, `${card.id} must be mapped in AXIS`);
    const touched = touchedFields(card);
    if (touched.length === 0) continue; // inert class — sentinel axis, exempt (Story 3.1)
    assert.ok(touched.includes(harness.AXIS[card.id]),
      `${card.id}: axis ${harness.AXIS[card.id]} is a field its apply closure actually writes`);
    if (!groups.has(harness.AXIS[card.id])) groups.set(harness.AXIS[card.id], []);
    groups.get(harness.AXIS[card.id]).push(card);
  }
  for (const [axis, group] of groups) {
    if (group.length < 2) continue;
    const shared = group
      .map(touchedFields)
      .reduce((a, b) => a.filter((field) => b.includes(field)));
    assert.ok(shared.includes(axis), `axis ${axis}: pair must co-write ${axis} — re-effect cards must fail loudly`);
  }
});
