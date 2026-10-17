import test from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, RARITY_WEIGHT, freshEffects, isAvailable, offerCount, pickOffers } from '../js/upgrades.js';
import * as game from '../js/game.js';

// Seeded LCG (numerical-recipes constants, exact 32-bit via Math.imul) —
// deterministic like the counting stubs in tests/startrun.test.js, no Math.random.
function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const FIXTURE_ROPE = { phase: 0.44, period: 0.9 };
const FIXTURE_PLAYER = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };

test('record shape: identity fields, cap, apply over only the four frozen effect keys', () => {
  const DEFINED_COLORS = ['sky', 'slate', 'amber', 'mint', 'ember'];
  for (const card of CARDS) {
    for (const key of ['name', 'icon', 'role', 'color', 'rarity']) {
      assert.equal(typeof card[key], 'string', `${card.id}.${key} is a string`);
      assert.ok(card[key].length > 0, `${card.id}.${key} is non-empty`);
    }
    assert.equal(typeof card.cap, 'number', `${card.id}.cap is numeric`);
    assert.ok(card.cap > 0, `${card.id}.cap is positive`);
    assert.equal(typeof card.apply, 'function', `${card.id}.apply is a function`);
    // T-3-06: the color set never grows past the five classes CSS defines.
    assert.ok(DEFINED_COLORS.includes(card.color), `${card.id}.color is one of the defined five`);
    assert.deepEqual(Object.keys(card.apply(freshEffects())).sort(),
      ['floatMul', 'ropeMul', 'scoreMul', 'windowMul'],
      `${card.id}.apply introduces no new effect keys (Pitfall 3)`);
  }
});

test('roster breadth: at least 6 cards spanning all five roles (CARD-07)', () => {
  assert.ok(CARDS.length >= 6, `catalogue holds ${CARDS.length} cards`);
  assert.deepEqual([...new Set(CARDS.map(c => c.role))].sort(),
    ['foundation', 'margin', 'pace', 'risk', 'volume']);
});

test('same seed gives identical offer id sequences — pickOffers is pure over rng', () => {
  const runOnce = () => {
    const rng = seeded(24680);
    const draws = [];
    for (let n = 0; n < 10; n++) draws.push(pickOffers(CARDS, {}, 2, rng).map(c => c.id));
    return draws;
  };
  assert.deepEqual(runOnce(), runOnce());
});

test('rarity skews draws measurably: common > uncommon > rare (CARD-03)', () => {
  assert.ok(RARITY_WEIGHT.common > RARITY_WEIGHT.uncommon
    && RARITY_WEIGHT.uncommon > RARITY_WEIGHT.rare, 'weights are ordered');
  const rng = seeded(0xBEEF01);
  const hits = { common: 0, uncommon: 0, rare: 0 };
  for (let n = 0; n < 2000; n++) {
    const [card] = pickOffers(CARDS, {}, 1, rng);
    hits[card.rarity] += 1;
  }
  assert.ok(hits.common > hits.uncommon && hits.uncommon > hits.rare,
    `expected common > uncommon > rare, got ${JSON.stringify(hits)}`);
});

test('isAvailable flips exactly at cap; a capped card is never offered (CARD-04/05)', () => {
  for (const card of CARDS) {
    assert.equal(isAvailable(card, { [card.id]: card.cap - 1 }), true, `${card.id} available one below cap`);
    assert.equal(isAvailable(card, { [card.id]: card.cap }), false, `${card.id} unavailable at cap`);
    const rng = seeded(0xC0FFEE);
    for (let n = 0; n < 50; n++) {
      const offers = pickOffers(CARDS, { [card.id]: card.cap }, 3, rng);
      assert.equal(offers.length, 3, 'seven other cards remain drawable');
      assert.ok(!offers.some(c => c.id === card.id), `${card.id} never appears at cap`);
    }
  }
});

test('pool shrinks before it empties; an empty pool never freezes (CARD-05, Pitfall 6)', () => {
  const capped = Object.fromEntries(CARDS.map(c => [c.id, c.cap]));
  assert.equal(pickOffers(CARDS, capped, 3, () => 0.5).length, 0, 'all capped: empty pool');
  const oneLeft = { ...capped, [CARDS[0].id]: CARDS[0].cap - 1 };
  const shrunk = pickOffers(CARDS, oneLeft, 3, () => 0.5);
  assert.equal(shrunk.length, 1, 'seven of eight capped: the offer shrinks to the survivor');
  assert.equal(shrunk[0].id, CARDS[0].id);
  const out = game.tickRun({ ...game.createRun(), skips: 9, owned: capped },
    FIXTURE_ROPE, FIXTURE_PLAYER, 1 / 60, () => 0.5);
  assert.equal(out.run.skips, 10, 'the skip still scores');
  assert.equal(out.run.status, 'running', 'an exhausted pool skips the freeze, never a dead choose');
  assert.equal(out.run.offer, null);
});

test('offers are pairwise distinct by id string only (CARD-02 encoding row)', () => {
  for (const owned of [{}, { float: 1, tally: 1, widebrim: 2 }]) {
    const rng = seeded(77);
    for (let n = 0; n < 25; n++) {
      const offers = pickOffers(CARDS, owned, 3, rng);
      assert.equal(offers.length, 3);
      assert.equal(new Set(offers.map(c => c.id)).size, offers.length, 'no repeat within an offer');
    }
  }
});

test('offer size escalates 2 -> 3 beyond skip 30 (CARD-01 stays 1 of 2-3)', () => {
  assert.equal(offerCount(10), 2);
  assert.equal(offerCount(30), 2);
  assert.equal(offerCount(31), 3);
  let calls = 0;
  const stub = () => { calls += 1; return 0.5; };
  const tenth = game.tickRun({ ...game.createRun(), skips: 9 }, FIXTURE_ROPE, FIXTURE_PLAYER, 1 / 60, stub);
  assert.ok(calls > 0, 'the offer path consumed the injected rng');
  assert.equal(tenth.run.status, 'choose');
  assert.equal(tenth.run.offer.length, 2, 'the tenth-skip offer stays exactly 2 (frozen pins)');
  const fortieth = game.tickRun({ ...game.createRun(), skips: 39 }, FIXTURE_ROPE, FIXTURE_PLAYER, 1 / 60, stub);
  assert.equal(fortieth.run.status, 'choose');
  assert.equal(fortieth.run.offer.length, 3, 'beyond skip 30 the offer grows to three');
});
