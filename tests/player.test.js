import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, jumpVelocity, jump, updatePlayer, clearsRope } from '../js/player.js';

test('hold duration increases jump velocity, capped at 0.5s', () => {
  assert.equal(jumpVelocity(0), 350);
  assert.equal(jumpVelocity(0.25), 475);
  assert.equal(jumpVelocity(2), 600);
});

test('jump sets upward velocity and ungrounds', () => {
  const p = jump(createPlayer(), 0.2);
  assert.equal(p.vy, 450);
  assert.equal(p.grounded, false);
});

test('player falls back to ground and regrounds', () => {
  let p = jump(createPlayer(), 0);
  for (let i = 0; i < 60; i++) p = updatePlayer(p, 1 / 60);
  assert.equal(p.grounded, true);
  assert.equal(p.y, 0);
});

test('landing compresses squash below 1', () => {
  let p = jump(createPlayer(), 0);
  for (let i = 0; i < 60; i++) p = updatePlayer(p, 1 / 60);
  assert.ok(p.squash < 1);
});

test('squash springs back toward 1 over time', () => {
  let p = jump(createPlayer(), 0);
  for (let i = 0; i < 120; i++) p = updatePlayer(p, 1 / 60);
  assert.ok(Math.abs(p.squash - 1) < 0.05);
});

test('clearsRope checks height threshold', () => {
  assert.equal(clearsRope(20), true);
  assert.equal(clearsRope(5), false);
});
