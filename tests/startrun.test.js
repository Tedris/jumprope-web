import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../js/game.js';

// Namespace import (not named) so a missing startRun export surfaces as a
// failing assertion here rather than a module link error.

test('startRun returns running run with lead-in rope and airborne player', () => {
  assert.equal(typeof game.startRun, 'function');
  const { rope, player, run } = game.startRun();
  assert.equal(rope.phase, game.START_PHASE);
  assert.equal(rope.period, game.ROPE_PERIOD);
  assert.equal(run.status, 'running');
  assert.equal(player.grounded, false);
});

test('tickRun routes offers through an injected rng (deterministic)', () => {
  let calls = 0;
  const stub = () => { calls += 1; return 0.5; };
  const base = { ...game.createRun(), skips: 9 };
  const rope = { phase: 0.44, period: 0.9 };
  const player = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };
  const a = game.tickRun(base, rope, player, 1 / 60, stub);
  const b = game.tickRun(base, rope, player, 1 / 60, stub);
  assert.ok(calls > 0, 'the injected rng must be invoked by the offer path');
  assert.equal(a.run.status, 'choose');
  assert.deepEqual(a.run.offer.map(u => u.id), b.run.offer.map(u => u.id));
});

test('tickRun keeps the 4-arg call surface working', () => {
  const base = { ...game.createRun(), skips: 9 };
  const rope = { phase: 0.44, period: 0.9 };
  const player = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };
  const out = game.tickRun(base, rope, player, 1 / 60);
  assert.equal(out.run.status, 'choose');
  assert.equal(out.run.offer.length, 2);
});
