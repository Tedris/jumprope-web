import test from 'node:test';
import assert from 'node:assert/strict';
import { UPGRADES, freshEffects, pickTwo, shouldOfferUpgrade } from '../js/upgrades.js';

test('effects start neutral', () => {
  assert.deepEqual(freshEffects(), { floatMul: 1, ropeMul: 1, scoreMul: 1, windowMul: 1 });
});

test('effects stack multiplicatively', () => {
  const multi = UPGRADES.find(u => u.id === 'multi');
  const once = multi.apply(freshEffects());
  const twice = multi.apply(once);
  assert.equal(once.scoreMul, 2);
  assert.equal(twice.scoreMul, 3);
});

test('pickTwo returns two distinct upgrades for any rng seed', () => {
  for (const seed of [0, 0.5, 0.99]) {
    let i = 0;
    const rng = () => [seed, seed][i++ % 2];
    const [a, b] = pickTwo(UPGRADES, rng);
    assert.notEqual(a.id, b.id);
  }
});

test('upgrade offered every tenth skip only', () => {
  assert.equal(shouldOfferUpgrade(0), false);
  assert.equal(shouldOfferUpgrade(10), true);
  assert.equal(shouldOfferUpgrade(20), true);
  assert.equal(shouldOfferUpgrade(9), false);
});
