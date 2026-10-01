import test from 'node:test';
import assert from 'node:assert/strict';
import { createRope, updateRope, atFeet, obstacleX } from '../js/rope.js';

test('createRope starts at top of arc', () => {
  assert.equal(createRope(0.9).phase, 0);
});

test('updateRope advances phase by dt/period and wraps', () => {
  const r = updateRope({ phase: 0.9, period: 1 }, 0.3);
  assert.equal(r.phase, 0.2);
});

test('updateRope does not mutate', () => {
  const r = createRope(1);
  updateRope(r, 0.1);
  assert.equal(r.phase, 0);
});

test('atFeet true near mid-cycle only', () => {
  assert.equal(atFeet({ phase: 0.5 }), true);
  assert.equal(atFeet({ phase: 0.1 }), false);
});

test('obstacleX reaches player center at mid-cycle', () => {
  assert.equal(obstacleX(0, 480, 240), 480);
  assert.equal(obstacleX(0.5, 480, 240), 240);
  assert.equal(obstacleX(1, 480, 240), 0);
});

test('obstacleX defaults center to half width', () => {
  assert.equal(obstacleX(0.5, 480), 240);
});
