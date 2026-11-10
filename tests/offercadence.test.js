import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, tickRun, applyCard, resumeRun, BUFFER_SEC, NEAR_MARGIN, AREAS, CARDS } from '../js/game.js';

// Story 6.2 (ledger :5-6, Decided 7a): the offer-cadence check-gap witness.
// The buffer-forgiven branch incremented `skips` with no shouldOfferUpgrade
// check while the cleared path checks on every increment — a forgiven 10th
// skip silently deferred its offer to the 20th, violating FR10's
// every-10th-skip law. These legs pin the repaired cadence on SCRIPTED sims
// only (feel.test.js rig idiom): one rising-edge crossing per script, stub
// rng, zero seed numerics (the seed-honesty law — outcomes are data).
// Leg 1 is the red-green witness: red before the forgiven-branch check,
// green after; legs 2-4 guard against over-correction (cadence shifted,
// double-fire, freeze-in-choose on an exhausted pool).

const STEP = 1 / 120; // headless-sim.test.js idiom
const RIG_PERIOD = 1.3;
const INC = STEP / RIG_PERIOD; // phase advance per tick at ropeMul 1

// Rope whose feet-cross rising edge lands exactly `crossTicks` tickRun calls
// ahead (0.0001 of float headroom inside [0.45, 0.55] on the crossing tick),
// generalized by ropeMul so post-pick scripts stay honest after a rope-speed card.
const rigRope = (crossTicks, ropeMul = 1) => ({
  phase: 0.4501 - crossTicks * INC * ropeMul, period: RIG_PERIOD,
});

const rngStub = () => 0.5;
const floorPlayer = () => ({ y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 });
const airPlayer = (y) => ({ y, vy: 0, grounded: false, squash: 1, squashVel: 0 });
// Comfortable clear: above the near band MIN_HEIGHT × (1 + NEAR_MARGIN).
const COMFORT_Y = 40;
const CROSS_TICKS = 8; // buffer survives: 0.1 − 8·STEP ≈ 0.033 > 0 at the crossing

// Script to one crossing: player at the feet with a live buffer => forgiven
// pass; airborne at COMFORT_Y => clean pass. Returns the run and every event.
function scriptCrossing({ run, rope, player }) {
  const events = [];
  for (let tick = 0; tick < CROSS_TICKS; tick++) {
    const out = tickRun(run, rope, player, STEP, rngStub, null);
    events.push(...out.events);
    ({ run, rope, player } = out);
  }
  return { run, events };
}

const forgivenCross = (run0) => scriptCrossing({
  run: run0, rope: rigRope(CROSS_TICKS), player: floorPlayer(),
});

const allCaps = Object.fromEntries(CARDS.map((c) => [c.id, c.cap]));

test('forgiven crossing at the 10th skip fires its offer — FR10 every-10th-skip law (red-green witness)', () => {
  const { run, events } = forgivenCross({ ...createRun(), skips: 9, buffer: BUFFER_SEC });
  assert.equal(run.skips, 10, 'the forgiven pass counts like a clean skip');
  assert.equal(run.buffer, 0, 'buffer consumed at the crossing (D-N01)');
  assert.equal(run.status, 'choose',
    'a forgiven 10th skip arms choose exactly like a clean 10th — no deferral to the 20th');
  assert.ok(Array.isArray(run.offer) && run.offer.length > 0, 'the offer is non-empty (choose never arms empty)');
  assert.ok(events.includes('offer'), 'the events channel carries the offer');
  assert.deepEqual(events.filter((e) => e === 'offer').length, 1, 'exactly one offer event');
});

test('forgiven crossing at the 9th skip fires nothing — the cadence is not shifted', () => {
  const { run, events } = forgivenCross({ ...createRun(), skips: 8, buffer: BUFFER_SEC });
  assert.equal(run.skips, 9);
  assert.equal(run.status, 'running', '9 skips is not an offer boundary');
  assert.equal(run.offer, null);
  assert.ok(!events.includes('offer'), 'no offer off-cadence');
  assert.deepEqual(events, ['skip', 'nearMiss'], 'the forgiven pass keeps its D-N03 event pair');
});

test('a clean 10th skip still yields exactly one offer — no double-fire, and the 11th skip is quiet', () => {
  const first = scriptCrossing({
    run: { ...createRun(), skips: 9 }, rope: rigRope(CROSS_TICKS), player: airPlayer(COMFORT_Y),
  });
  assert.equal(first.run.status, 'choose');
  assert.equal(first.events.filter((e) => e === 'offer').length, 1,
    'the cleared branch fires exactly one offer at the 10th skip');
  // Resolve the pick (ARCH-02: applyCard + resumeRun) and cross once more:
  // skip 11 is off-cadence — neither branch may offer again.
  const picked = first.run.offer[0];
  const resumed = resumeRun(applyCard(first.run, picked));
  const ropeMul = resumed.run.effects.ropeMul ?? 1;
  const second = scriptCrossing({
    run: resumed.run, rope: rigRope(CROSS_TICKS, ropeMul), player: airPlayer(COMFORT_Y),
  });
  assert.equal(second.run.skips, 11);
  assert.equal(second.run.status, 'running', 'the 11th skip fires no offer from either branch');
  assert.ok(!second.events.includes('offer'));
});

test('exhausted pool at a forgiven 10th keeps the run running — choose never freezes (Pitfall 6)', () => {
  const { run, events } = forgivenCross({
    ...createRun(), skips: 9, buffer: BUFFER_SEC, owned: allCaps,
  });
  assert.equal(run.skips, 10, 'the forgiven pass still scores');
  assert.equal(run.status, 'running',
    'an exhausted pool must never arm choose — the run would freeze in the menu');
  assert.equal(run.offer, null);
  assert.ok(!events.includes('offer'));
  assert.ok(events.includes('skip') && events.includes('nearMiss'), 'the pass itself stays honest');
});
