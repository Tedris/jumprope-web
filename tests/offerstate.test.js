import test from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, isAvailable, pickOffers } from '../js/upgrades.js';
import { createRun, tickRun } from '../js/game.js';

// Story 3.1 (FR10): state-aware dead-pick filtering. stateCap records are the
// single source of truth (NFR5) — every leg here derives its thresholds from
// the CARDS records; the rng stays in position 4 so every frozen seeded leg
// keeps its draw sequence.

// Seeded LCG (numerical-recipes constants, exact 32-bit via Math.imul) —
// same idiom as tests/catalogue.test.js, deterministic, no Math.random.
function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const cardById = (id) => CARDS.find((c) => c.id === id);

test('isAvailable: stateCap hides the card exactly when every threshold is met', () => {
  const spare = cardById('extrarope');
  const cord = cardById('reinforce');
  for (const [card, key] of [[spare, 'ropes'], [cord, 'charged']]) {
    const threshold = card.stateCap[key];
    assert.ok(threshold >= 1, `${card.id} has a numeric stateCap.${key} to test against`);
    assert.equal(isAvailable(card, {}, { [key]: threshold }), false,
      `${card.id} hidden when ${key} = ${threshold} (saturated = dead pick)`);
    assert.equal(isAvailable(card, {}, { [key]: threshold + 3 }), false,
      `${card.id} hidden above threshold too`);
    assert.equal(isAvailable(card, {}, { [key]: threshold - 1 }), true,
      `${card.id} shown one below threshold`);
  }
});

test('isAvailable: state omitted or threshold key absent keeps the legacy behaviour', () => {
  const spare = cardById('extrarope');
  assert.equal(isAvailable(spare, {}), true, '2-arg call (state omitted) behaves exactly as today');
  assert.equal(isAvailable(spare, {}, {}), true, 'absent state key counts as 0, and 0 < threshold');
  assert.equal(isAvailable(spare, {}, { charged: 2 }), true, 'a different key saturating is not this card\'s business');
  assert.equal(isAvailable(spare, { extrarope: spare.cap }), false, 'the owned cap still rules without state');
  assert.equal(isAvailable(cardById('float'), {}, { ropes: 9, charged: 9 }), true,
    'cards without stateCap are untouched by state');
});

test('pickOffers: the trailing state arg filters draws; every seeded draw honours it', () => {
  const saturated = { ropes: cardById('extrarope').stateCap.ropes, charged: 0 };
  const spare = cardById('extrarope').id;
  const DRAWS = 200;
  let fullOffers = 0;
  let shownHits = 0;
  for (let n = 0; n < DRAWS; n++) {
    const a = pickOffers(CARDS, {}, 2, seeded(n), saturated);
    const b = pickOffers(CARDS, {}, 2, seeded(n), { ropes: 3, charged: 0 });
    assert.ok(!a.some((c) => c.id === spare), `draw ${n}: extrarope never at 5 ropes held`);
    if (a.length === 2) fullOffers += 1;
    if (b.some((c) => c.id === spare)) shownHits += 1;
  }
  assert.equal(fullOffers, DRAWS, 'the 11-card pool still fills every 2-pick');
  assert.ok(shownHits > 0, 'extrarope does appear across the same seeds at 3 ropes held');
});

test('determinism: rng is consumed positionally — unsaturated state cannot shift any draw', () => {
  const drawAll = (state) => {
    const rng = seeded(20261106);
    const out = [];
    for (let n = 0; n < 50; n++) out.push(pickOffers(CARDS, {}, 2, rng, state).map((c) => c.id).join('+'));
    return out;
  };
  const stateless = drawAll(undefined);
  assert.deepEqual(drawAll(undefined), stateless, 'same seed replays identically (NFR4)');
  assert.deepEqual(drawAll({ ropes: 1, charged: 0 }), stateless,
    'a state that saturates nothing yields the identical sequence — filtering never reorders or consumes extra rng');
  assert.notDeepEqual(drawAll({ ropes: 5, charged: 2 }), stateless,
    'and the saturated state genuinely differs — the filter is live, not decorative');
});

test('rarity wiring: all four new ids surface in 2000 seeded draws from empty owned', () => {
  const rng = seeded(0x31F1);
  const seen = new Set();
  for (let n = 0; n < 2000; n++) {
    for (const card of pickOffers(CARDS, {}, 2, rng)) seen.add(card.id);
  }
  for (const id of ['extrarope', 'reinforce', 'doublejump', 'highjump']) {
    assert.ok(seen.has(id), `${id} participates in the 70/25/5 weighted draws (AC2)`);
  }
});

// End-to-end witness through the REAL call site (js/game.js offer leg):
// a crafted 5-rope record takes its 10th skip on a cleared crossing and the
// resulting offer must not dangle a dead Spare Rope pick. The rope sits just
// below the k=0 feet window so the very next tick is the rising edge; the
// airborne fixture clears every crossing (y 40 >> minHeight 18).
const WITNESS_ROPE = { phase: 0.449, period: 0.9 };
const WITNESS_PLAYER = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };

test('witness: the live tickRun offer hides extrarope at 5 ropes while the same-stub state-less draw shows it', () => {
  // Contrast pair, not a tautology: derive the first constant stub whose
  // state-less 2-pick surfaces extrarope, then replay it through tickRun.
  let stub = null;
  for (let k = 1; k < 100 && stub === null; k++) {
    const r = k / 100;
    if (pickOffers(CARDS, {}, 2, () => r).some((c) => c.id === 'extrarope')) stub = r;
  }
  assert.ok(stub !== null, 'extrarope is drawable in a state-less draw at all');

  const run0 = { ...createRun(), ropes: 5, skips: 9 };
  const out = tickRun(run0, WITNESS_ROPE, WITNESS_PLAYER, 1 / 120, () => stub);
  assert.equal(out.run.skips, 10, 'the crafted crossing is the 10th skip (offer cadence)');
  assert.equal(out.run.status, 'choose', 'the offer fired through the live call site');
  assert.equal(out.run.owned.extrarope ?? 0, 0,
    'the crafted run owns no Spare Rope — the exclusion is the state arm, not the owned cap (review 3.1)');
  assert.ok(out.run.offer.length > 0 && !out.run.offer.some((c) => c.id === 'extrarope'),
    `live offer ${out.run.offer.map((c) => c.id)} excludes the saturated Spare Rope`);
  assert.ok(pickOffers(CARDS, {}, 2, () => stub).some((c) => c.id === 'extrarope'),
    'the same-stub state-less draw includes it — the exclusion is caused by the state plumbing');
});

// Review 3.1: the empty-cap fail-open has no live record to exercise it —
// pin it on a synthetic card so the vacuous-every hole can never re-open.
test('empty stateCap names no threshold and never hides (fail-open parity)', () => {
  const synthetic = { id: 'phantom', cap: Infinity, stateCap: {} };
  assert.equal(isAvailable(synthetic, {}, { ropes: 9, charged: 9 }), true,
    'an empty stateCap must not read as "all thresholds met"');
});
