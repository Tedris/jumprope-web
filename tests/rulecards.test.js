import test from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, freshEffects } from '../js/upgrades.js';
import { MAX_ROPES } from '../js/game.js';

// Story 3.1: the four FR12 rule-change cards and the FR11 amendment freeze.
// Expectations derive from the records themselves (NFR5) — the tables below
// ARE the external contracts: FR12 metadata pins and the FR11 v1-freeze /
// sanctioned re-cost of Wide Brim and Heavy Rope (sprint-change-proposal
// 2026-11-06 §5; Dev Agent Record amendment).

const cardById = (id) => CARDS.find((c) => c.id === id);

const SHIPPED_ROLES = ['foundation', 'margin', 'pace', 'risk', 'volume'];
const DEFINED_COLORS = ['sky', 'slate', 'amber', 'mint', 'ember'];

const NEW_IDS = ['extrarope', 'reinforce', 'doublejump', 'highjump'];

test('FR12: the four new records carry their pinned metadata', () => {
  const PINS = {
    extrarope: { name: 'Spare Rope', rarity: 'uncommon', cap: 4 },
    reinforce: { name: 'Steel Cord', rarity: 'uncommon', cap: 2 },
    doublejump: { name: 'Second Wind', rarity: 'uncommon', cap: 2 },
    highjump: { name: 'Launch Heels', rarity: 'common', cap: 3 },
  };
  for (const id of NEW_IDS) {
    const card = cardById(id);
    assert.ok(card, `${id} is in the catalogue`);
    assert.equal(card.name, PINS[id].name, `${id}.name`);
    assert.equal(card.rarity, PINS[id].rarity, `${id}.rarity`);
    assert.equal(card.cap, PINS[id].cap, `${id}.cap`);
    assert.ok(SHIPPED_ROLES.includes(card.role), `${id}.role ${card.role} is a shipped string`);
    assert.ok(DEFINED_COLORS.includes(card.color), `${id}.color ${card.color} is one of the defined five`);
    assert.equal(typeof card.icon, 'string');
    assert.ok(card.icon.length > 0, `${id}.icon non-empty`);
    assert.equal(typeof card.desc, 'string');
    assert.ok(card.desc.length > 0 && card.desc.length <= 40,
      `${id}.desc follows the plain-rule copy limit, got ${card.desc.length} chars`);
  }
});

test('effects-shape contract: the still-unlanded cards keep the inert endofunction', () => {
  // Story 3.2 re-contract: extrarope (run-shape, whole-record patch) and
  // highjump (launchMul) landed their effects — pinned by
  // tests/simpleeffects.test.js. The remaining rule-changers stay inert
  // endofunctions until their stories (3.3 charged, 3.4 airJumps).
  for (const id of ['reinforce', 'doublejump']) {
    assert.deepEqual(cardById(id).apply(freshEffects()), freshEffects(),
      `${id}.apply must return the effects untouched until its effect story`);
  }
});

test('stateCap metadata: plain-data thresholds on the two saturating cards', () => {
  assert.deepEqual(cardById('extrarope').stateCap, { ropes: MAX_ROPES },
    'Spare Rope saturates exactly at the sim rope ceiling (game.js MAX_ROPES; the cross-check lives here so upgrades.js never imports game.js)');
  assert.deepEqual(cardById('reinforce').stateCap, { charged: 2 },
    'FR12: up to 2 charged ropes (Story 3.3 wires the live data)');
  for (const card of CARDS) {
    if (card.stateCap === undefined) continue;
    assert.ok(NEW_IDS.includes(card.id), `${card.id} is the only class carrying stateCap in 3.1`);
    assert.ok(Object.keys(card.stateCap).length > 0, `${card.id}.stateCap names at least one threshold — an empty cap would hide vacuously (review 3.1)`);
    for (const [key, min] of Object.entries(card.stateCap)) {
      assert.equal(typeof min, 'number', `${card.id}.stateCap.${key} is plain data, not a predicate (NFR5)`);
      assert.ok(Number.isFinite(min), `${card.id}.stateCap.${key} is finite`);
      assert.ok(min >= 1, `${card.id}.stateCap.${key} >= 1 — a 0/negative threshold would hide whenever the key is absent from state (review 3.1)`);
    }
  }
});

// FR11 freeze: six legacy cards byte-identical to v1; slowrope/widebrim equal
// their amended values. Effects are pinned as the one-pick application and
// the cap-stacked closure is DERIVED from it (factor^cap, add*cap).
const EFFECT_PINS = {
  // untouched v1
  float: { rarity: 'common', cap: 4, factors: { floatMul: 1.15 }, adds: {} },
  multi: { rarity: 'uncommon', cap: 3, factors: {}, adds: { scoreMul: 1 } },
  window: { rarity: 'uncommon', cap: 3, factors: { windowMul: 1.1 }, adds: {} },
  feather: { rarity: 'common', cap: 5, factors: { floatMul: 1.05 }, adds: {} },
  tally: { rarity: 'uncommon', cap: 3, factors: { scoreMul: 1.15 }, adds: {} },
  windup: { rarity: 'rare', cap: 2, factors: { ropeMul: 1.12 }, adds: { scoreMul: 1 } },
  // FR11 amendment (sanctioned re-cost, Story 3.1)
  slowrope: { rarity: 'common', cap: 3, factors: { ropeMul: 0.9, scoreMul: 1.15 }, adds: {} },
  widebrim: { rarity: 'uncommon', cap: 2, factors: { windowMul: 1.2, floatMul: 0.9 }, adds: {} },
};

test('FR11: the legacy eight match their frozen/amended closures, rarity and cap', () => {
  for (const [id, pin] of Object.entries(EFFECT_PINS)) {
    const card = cardById(id);
    assert.ok(card, `${id} is a legacy card and stays in the catalogue`);
    assert.equal(card.rarity, pin.rarity, `${id}.rarity`);
    assert.equal(card.cap, pin.cap, `${id}.cap`);
    let cap = freshEffects();
    for (let i = 0; i < card.cap; i++) cap = card.apply(cap);
    const one = card.apply(freshEffects());
    for (const key of Object.keys(freshEffects())) {
      const base = pin.factors[key] ?? 0;
      const expectOne = pin.factors[key] ? base : (pin.adds[key] ? 1 + pin.adds[key] : 1);
      assert.ok(Math.abs(one[key] - expectOne) < 1e-9,
        `${id}: one-pick ${key} ${one[key]} vs pinned ${expectOne}`);
      const expectCap = pin.factors[key]
        ? Math.pow(base, card.cap)
        : (pin.adds[key] ? 1 + pin.adds[key] * card.cap : 1);
      assert.ok(Math.abs(cap[key] - expectCap) < 1e-9,
        `${id}: capped ${key} ${cap[key]} vs derived ${expectCap}`);
    }
  }
});

test('catalogue rule 2 (no climb-rate regression priced in): ropeMul x scoreMul >= 1 everywhere', () => {
  // Derived from the real closures, never a table (NFR5): the rule-report's
  // reduceClimb verdict must stay empty for the shipped catalogue.
  for (const card of CARDS) {
    for (const [n, label] of [[1, 'one-pick'], [card.cap, 'capped']]) {
      let fx = freshEffects();
      for (let i = 0; i < n; i++) fx = card.apply(fx);
      assert.ok(fx.ropeMul * fx.scoreMul >= 1,
        `${card.id} at ${label}: ropeMul ${fx.ropeMul} x scoreMul ${fx.scoreMul} = ${fx.ropeMul * fx.scoreMul} cuts climb rate (rule 2 violation)`);
    }
  }
});
