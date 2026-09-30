import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, tickRun, applyUpgrade, loadBest, saveBest } from '../js/game.js';
import { createRope } from '../js/rope.js';
import { createPlayer } from '../js/player.js';
import { UPGRADES } from '../js/upgrades.js';

test('new run starts clean', () => {
  const run = createRun();
  assert.equal(run.score, 0);
  assert.equal(run.status, 'running');
});

test('clearing the rope scores and counts a skip', () => {
  const rope = { phase: 0.44, period: 0.9 };
  const player = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };
  const { run } = tickRun(createRun(), rope, player, 1 / 60);
  assert.equal(run.score, 1);
  assert.equal(run.skips, 1);
});

test('caught by rope ends run', () => {
  const rope = { phase: 0.44, period: 0.9 };
  const player = { y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 };
  const { run, tripped } = tickRun(createRun(), rope, player, 1 / 60);
  assert.equal(tripped, true);
  assert.equal(run.status, 'over');
});

test('score multiplier from upgrades applies per skip', () => {
  const multi = UPGRADES.find(u => u.id === 'multi');
  let run = applyUpgrade(createRun(), multi);
  const rope = { phase: 0.44, period: 0.9 };
  const player = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };
  ({ run } = tickRun(run, rope, player, 1 / 60));
  assert.equal(run.score, 2);
});

test('upgrade offered at tenth skip', () => {
  let run = createRun();
  run = { ...run, skips: 9 };
  const rope = { phase: 0.44, period: 0.9 };
  const player = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };
  ({ run } = tickRun(run, rope, player, 1 / 60));
  assert.equal(run.status, 'choose');
  assert.equal(run.offer.length, 2);
});

test('best score round-trips through storage', () => {
  const data = new Map();
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  assert.equal(loadBest(storage), 0);
  saveBest(storage, 42);
  assert.equal(loadBest(storage), 42);
});

test('blocked storage falls back gracefully', () => {
  const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(loadBest(storage), 0);
  saveBest(storage, 7);
});
