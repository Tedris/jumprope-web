import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../js/game.js';
import { CARDS, pickOffers } from '../js/upgrades.js';
import { jump } from '../js/player.js';

// Criterion 5 gate: a deterministic 1000-tick headless simulation driving the
// real pure sim (startRun/tickRun/applyCard/resumeRun) with a scripted jumper
// and scripted card picks. Namespace import (tests/startrun.test.js idiom) so
// a missing export surfaces as a failing assertion, not a module link error.
// No raw randomness, no browser IO — the boundary fence graph stays green.

const STEP = 1 / 120;
const TICKS = 1000;

// Scripted jump policy: hold 0.5 s (v0 = 600) the first tick the player is
// grounded with the rope phase inside the mid-cycle window — tuned against
// the real physics; tripping is fixed by widening this window, never by a
// physics change (plan flagged_assumption A4-adjacent).
const JUMP_WINDOW_LO = 0.2;
const JUMP_WINDOW_HI = 0.35;

function scriptedRun({ rng, pickStrategy, preApply, seedSkips = 0 }) {
  assert.equal(typeof game.startRun, 'function');
  assert.equal(typeof game.resumeRun, 'function');
  assert.equal(typeof game.applyCard, 'function');

  let { rope, player, run } = game.startRun();
  if (preApply) run = preApply(run);
  // Cadence seeding mirrors the established tests/startrun.test.js:20 idiom
  // ({ ...createRun(), skips: 9 }): neutral physics yields only ~6.4 cycles in
  // 1000 ticks (RESEARCH headline 6.41), so a freeze is otherwise unreachable.
  if (seedSkips) run = { ...run, skips: seedSkips };

  const stats = { cycles: 0, scoreEvents: 0, chooses: 0, picks: 0, firstOffer: null };
  let prevPhase = rope.phase;
  let prevFeet = rope.phase >= 0.45 && rope.phase <= 0.55; // mirrors js/rope.js:11-13

  for (let tick = 0; tick < TICKS; tick++) {
    if (run.status === 'choose') {
      stats.chooses += 1;
      // Plan 01 rule: a choose freeze with an empty offer is impossible —
      // assert we never arrive empty-handed (Pitfall 6 stall pin).
      assert.ok(Array.isArray(run.offer) && run.offer.length > 0,
        `choose at tick ${tick} must carry a non-empty offer`);
      if (stats.firstOffer === null) stats.firstOffer = run.offer;
      const card = pickStrategy(run.offer, stats.picks);
      run = game.applyCard(run, card);
      ({ rope, player, run } = game.resumeRun(run)); // ARCH-06 lead-in, never startRun
      assert.equal(run.status, 'running', 'pick must exit choose via resumeRun');
      stats.picks += 1;
    }
    assert.notEqual(run.status, 'over', `scripted player tripped at tick ${tick}`);

    if (player.grounded && rope.phase >= JUMP_WINDOW_LO && rope.phase <= JUMP_WINDOW_HI) {
      player = jump(player, 0.5);
    }

    ({ run, rope, player } = game.tickRun(run, rope, player, STEP, rng));

    assert.ok(Number.isFinite(run.score), `score finite at tick ${tick}`);
    assert.ok(Number.isFinite(player.y), `player.y finite at tick ${tick}`);
    assert.ok(rope.phase >= 0 && rope.phase < 1, `phase in [0,1) at tick ${tick}`);

    if (rope.phase < prevPhase) stats.cycles += 1; // phase wrap = one cycle
    prevPhase = rope.phase;
    const feet = rope.phase >= 0.45 && rope.phase <= 0.55;
    if (feet && !prevFeet) stats.scoreEvents += 1; // rising edge = one score event
    prevFeet = feet;
  }

  // Defensive: a freeze landing on the very last tick still resolves through
  // the real pick path so the end-state assertion below stays honest.
  if (run.status === 'choose') {
    stats.chooses += 1;
    assert.ok(Array.isArray(run.offer) && run.offer.length > 0, 'end-of-run offer non-empty');
    if (stats.firstOffer === null) stats.firstOffer = run.offer;
    run = game.applyCard(run, pickStrategy(run.offer, stats.picks));
    ({ rope, player, run } = game.resumeRun(run));
    stats.picks += 1;
  }
  assert.equal(run.status, 'running', 'run neither trips nor stalls through choose');
  return { run, stats };
}

const cursorPick = (offer, picksSoFar) => offer[picksSoFar % offer.length];

test('neutral 1000-tick scripted sim: no NaN, phase bounded, one score per cycle', () => {
  const { run, stats } = scriptedRun({ rng: () => 0.5, pickStrategy: cursorPick });
  // RESEARCH headline: 6.41 rope cycles at ropeMul 1 in 1000 ticks.
  assert.ok(stats.cycles >= 6 && stats.cycles <= 7,
    `expected 6-7 cycles, got ${stats.cycles}`);
  assert.ok(stats.scoreEvents >= stats.cycles,
    'every rope cycle produced at least one score event');
  assert.equal(run.skips, stats.scoreEvents, 'skips advance exactly with score events');
});

test('scripted picks land through applyCard + resumeRun and never stall', () => {
  let rngCalls = 0;
  const rng = () => { rngCalls += 1; return 0.5; };
  const { run, stats } = scriptedRun({
    rng, pickStrategy: cursorPick, seedSkips: 9,
  });
  assert.ok(rngCalls > 0, 'the injected rng must be invoked by the offer path');
  assert.ok(stats.chooses >= 1, 'the cadence freeze must be reached within 1000 ticks');
  assert.equal(stats.picks, stats.chooses, 'every freeze is resolved by exactly one pick');
  const owned = Object.values(run.owned).reduce((t, n) => t + n, 0);
  assert.equal(owned, stats.picks, 'run.owned totals equal the picks handled');
  assert.ok(run.skips > 10, `skips must advance past the first cadence, got ${run.skips}`);
  assert.equal(run.skips - 9, stats.scoreEvents, 'skips beyond the seed equal score events');
  // The freeze offer matches the pure-seam draw replayed under the same stub.
  assert.deepEqual(stats.firstOffer.map(c => c.id),
    pickOffers(CARDS, {}, 2, () => 0.5).map(c => c.id),
    'freeze offer must equal the deterministic pickOffers draw');
});
