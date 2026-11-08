import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../js/game.js';
import { CARDS, freshEffects, pickOffers } from '../js/upgrades.js';
import { createPlayer, jump } from '../js/player.js';
import { atFeetOffset } from '../js/rope.js';

// Story 3.3 — Steel Cord: run.charged is a scalar 0..2 (D-a), a trip with a
// charge consumes it BETWEEN the buffer and the strip branch (buffer → charge
// → strip, D-c), the blank spans one revolution at the HELD rope count (D-d),
// the streak zeroes (D-e), and the event is the new name chargeUsed (D-f).
// Expectations derive from the card records and the shipped constants, never
// a hardcoded table (NFR5). Trip rig idiom mirrored inline from
// tests/tripresolution.test.js (period 1 at dt 1/60, phase 0.44 rising edge,
// grounded player); the scripted-jumper legs mirror
// tests/simpleeffects.test.js legs 6/10.

const DT = 1 / 60;
const TICKS_PER_REV = 60;
const STEP = 1 / 120;
const grounded = { y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 };

const cardById = (id) => CARDS.find((c) => c.id === id);
const reinforce = cardById('reinforce');

// One tick whose phase crosses rope 0's feet window on the rising edge with
// nobody else's (tripresolution.test.js rig, inline — frozen files are never
// imported).
function failingTick(run, press = null) {
  return game.tickRun(run, { phase: 0.44, period: 1 }, grounded, DT, undefined, press);
}

// Seeded LCG (numerical-recipes constants, exact 32-bit via Math.imul) —
// same idiom as tests/offerstate.test.js / catalogue.test.js.
function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Leg 1 — factory contract (house rule: contract test ships in the change).
test('contract: createRun carries charged 0; clampCharged heals every arm as data', () => {
  assert.equal(game.createRun().charged, 0, 'charge state is part of the record (AC1)');
  assert.equal(game.MAX_CHARGED, 2, 'FR12: up to 2 charged ropes at once');
  assert.equal(reinforce.stateCap.charged, game.MAX_CHARGED,
    'the record threshold equals the sim cap (the cross-check lives here so upgrades.js never imports game.js)');
  assert.equal(game.clampCharged(Infinity), game.MAX_CHARGED, '+Infinity is "fully charged" -> the cap');
  assert.equal(game.clampCharged(-Infinity), 0);
  for (const bad of [NaN, null, undefined, 'x']) {
    assert.equal(game.clampCharged(bad), 0, `${String(bad)} reads uncharged, never throws`);
  }
  assert.equal(game.clampCharged(5), game.MAX_CHARGED);
  assert.equal(game.clampCharged(-3), 0);
  assert.equal(game.clampCharged(1.7), 1, 'fractional truncates like clampRopes');
});

// Leg 2 — the pick flows through the REAL applyCard path (run-shaped arm).
test('pick path: applyCard grows run.charged 1 then 2, touches no effect field', () => {
  let run = game.applyCard(game.createRun(), reinforce);
  assert.equal(run.charged, 1, 'one pick, one charge');
  assert.equal(run.owned.reinforce, 1, 'owned tallies like every card');
  assert.deepEqual(run.effects, freshEffects(), 'a charge trip-spending card touches no effect field');
  run = game.applyCard(run, reinforce);
  assert.equal(run.charged, 2);
  assert.equal(run.owned.reinforce, 2);
  // Defensive caps (FR12): over-count, +Infinity and an already-saturated
  // record all land at MAX_CHARGED — data, not error.
  for (const crafted of [5, Infinity, 2]) {
    assert.equal(game.applyCard({ ...game.createRun(), charged: crafted }, reinforce).charged,
      game.MAX_CHARGED, `crafted charged=${String(crafted)} lands at the cap`);
  }
});

// Leg 3 — the AC2 core: armor eats the hit.
test('charge trip: charge consumed, ropes intact, blank counts ropes HELD', () => {
  const { run, tripped, events } = failingTick({ ...game.createRun(), ropes: 3, charged: 1, streak: 2 });
  assert.equal(tripped, false);
  assert.equal(run.status, 'running');
  assert.equal(run.charged, 0, 'the charge is consumed instead of a rope');
  assert.equal(run.ropes, 3, 'a charge trip NEVER strips');
  assert.equal(run.iFrames, 3, 'one i-frame per rope held (D-d): the blank spans one revolution');
  assert.equal(run.streak, 0, 'a failed crossing breaks the chain (D-e)');
  assert.equal(run.skips, 0, 'the failing crossing scores nothing');
  assert.equal(run.score, 0);
  assert.ok(events.includes('chargeUsed'), 'the event is the new name (D-f)');
  assert.ok(!events.includes('ropeLost') && !events.includes('trip'), 'no ropeLost, no trip (D-f)');
});

// Leg 4 — the charge blank's shape (mirror of scriptBlank, tripresolution
// .test.js:43-71, for the charge branch).
function scriptChargeBlank(n) {
  const out = failingTick({ ...game.createRun(), ropes: n, charged: 1 });
  let run = out.run;
  let rope = out.rope;
  let harmless = 0;
  let blankEnd = null;
  let firstLive = null;
  let blankClosed = false;
  for (let t = 1; t <= 4 * TICKS_PER_REV; t++) {
    const o = game.tickRun(run, rope, grounded, DT);
    if (o.run.iFrames < run.iFrames) {
      harmless += 1;
      blankEnd = t;
      assert.equal(o.run.skips, run.skips);
      assert.equal(o.run.score, run.score);
      assert.equal(o.run.streak, run.streak);
      assert.equal(o.run.charged, run.charged, 'blank ticks never touch the charge');
      assert.deepEqual(o.events, []);
    }
    run = o.run;
    rope = o.rope;
    if (run.iFrames === 0) blankClosed = true;
    if (o.events.some(e => e === 'skip' || e === 'trip' || e === 'ropeLost' || e === 'chargeUsed')) {
      firstLive = t;
      break;
    }
  }
  return { run, harmless, blankEnd, firstLive, blankClosed };
}

test('charge blank at N=3: N harmless passes, silent, first live never sooner than one revolution', () => {
  const { run, harmless, blankEnd, firstLive, blankClosed } = scriptChargeBlank(3);
  assert.equal(harmless, 3, 'one harmless pass per rope HELD (unchanged count, GDD one-pass-per-rope)');
  assert.ok(blankClosed, 'i-frames drained to zero as the blank ended');
  assert.ok(blankEnd !== null && Math.abs(blankEnd - TICKS_PER_REV) <= 2,
    `blank ended at tick ${blankEnd}, expected ~${TICKS_PER_REV} (NFR8: the phase clock is the only clock)`);
  assert.ok(firstLive !== null && firstLive > blankEnd, 'first live crossing follows the blank');
  assert.ok(firstLive >= TICKS_PER_REV,
    `live crossing at tick ${firstLive}: never before one full revolution after the trip`);
  assert.equal(run.ropes, 2, 'the first live crossing fails and strips (charges are gone)');
  assert.equal(run.charged, 0);
});

// Leg 5 — AC4: the explicit life/death pair, same rig, same seed.
test('last rope: the charge is the difference between life and death', () => {
  const armed = failingTick({ ...game.createRun(), ropes: 1, charged: 1 });
  assert.equal(armed.run.status, 'running', 'the charge survives what kills the uncharged run');
  assert.equal(armed.tripped, false);
  assert.equal(armed.run.charged, 0);
  assert.equal(armed.run.ropes, 1, 'the last rope is never stripped by a charge trip');
  assert.equal(armed.run.iFrames, 1, 'one pass per rope held: the run continues through the one-revolution blank');
  assert.ok(armed.events.includes('chargeUsed') && !armed.events.includes('trip'));
  const bare = failingTick({ ...game.createRun(), ropes: 1, charged: 0 });
  assert.equal(bare.run.status, 'over');
  assert.equal(bare.run.outcome, 'tripped');
  assert.equal(bare.tripped, true);
  assert.ok(bare.events.includes('trip'), 'the same rig uncharged still dies — Epic 1 verbatim (AC3)');
});

// Leg 6 — the resolution-order matrix (epics.md:549: buffer → charge → strip).
test('resolution order: buffer beats charge, charge beats strip, absent charge is Epic 1', () => {
  const a = failingTick({ ...game.createRun(), ropes: 3, charged: 1 }, true);
  assert.equal(a.run.skips, 1, 'the pressed failing crossing is a forgiven pass');
  assert.ok(a.events.includes('skip') && a.events.includes('nearMiss'));
  assert.equal(a.run.charged, 1, 'the buffer forgives — the charge is untouched (buffer → charge)');
  assert.equal(a.run.ropes, 3);
  assert.ok(!a.events.includes('chargeUsed'));
  const b = failingTick({ ...game.createRun(), ropes: 3, charged: 1 });
  assert.equal(b.run.ropes, 3, 'the charge wins over the strip (charge → strip)');
  assert.equal(b.run.charged, 0);
  assert.ok(!b.events.includes('ropeLost'), 'no strip, no ropeLost');
  const c = failingTick({ ...game.createRun(), ropes: 2, charged: 0 });
  assert.equal(c.run.ropes, 1);
  assert.equal(c.run.iFrames, 1);
  assert.ok(c.events.includes('ropeLost'), 'the uncharged strip is exactly Epic 1 (AC3)');
});

// Leg 7 — crafted charge values are data (invalid-states-are-data doctrine,
// mirroring multirope.test.js:176-192's invalid-ropes style).
test('crafted charged values are read-healed data: uncharged arms strip, Infinity clamps', () => {
  for (const bad of [0, -3, 6, NaN, null, undefined, 'x', -Infinity]) {
    assert.doesNotThrow(() => failingTick({ ...game.createRun(), ropes: 2, charged: bad }),
      `charged=${String(bad)} must not throw`);
  }
  for (const bad of ['x', -3, 0]) {
    const { run, events } = failingTick({ ...game.createRun(), ropes: 2, charged: bad });
    assert.equal(run.ropes, 1, `charged=${String(bad)} behaves uncharged — the strip branch is reached`);
    assert.equal(run.charged, 0, 'the healed value is written into the record (iFrames precedent)');
    assert.ok(events.includes('ropeLost'));
  }
  const absent = { ...game.createRun(), ropes: 2 };
  delete absent.charged;
  const gone = failingTick(absent);
  assert.equal(gone.run.ropes, 1, 'an absent field behaves uncharged (nullish clamp arm)');
  assert.equal(gone.run.charged, 0);
  const inf = failingTick({ ...game.createRun(), ropes: 3, charged: Infinity });
  assert.equal(inf.run.charged, 1, 'Infinity clamps to 2 at read, the trip consumes one');
  assert.equal(inf.run.ropes, 3);
  assert.ok(inf.events.includes('chargeUsed'));
});

// Leg 8 — deal-site witness (deferred-work :85): the state object is LIVE.
// The stub is DERIVED deterministic (offerstate.test.js:102-105 idiom) so the
// INCLUDE-half can never ship vacuous.
const WITNESS_ROPE = { phase: 0.449, period: 0.9 };
const WITNESS_PLAYER = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };

test('witness: the tenth-skip deal reads live charged — owned sub-cap isolates the stateCap arm', () => {
  let stub = null;
  for (let k = 1; k < 100 && stub === null; k++) {
    const r = k / 100;
    if (pickOffers(CARDS, { reinforce: 1 }, 2, () => r).some((c) => c.id === 'reinforce')) stub = r;
  }
  assert.ok(stub !== null, 'Steel Cord is drawable at owned 1 in a state-less draw at all');

  const out = game.tickRun({ ...game.createRun(), owned: { reinforce: 1 }, charged: 2, skips: 9 },
    WITNESS_ROPE, WITNESS_PLAYER, 1 / 120, () => stub);
  assert.equal(out.run.skips, 10, 'the crafted crossing is the 10th skip (offer cadence)');
  assert.equal(out.run.status, 'choose');
  assert.ok(out.run.offer.length > 0 && !out.run.offer.some((c) => c.id === 'reinforce'),
    `live offer ${out.run.offer.map((c) => c.id)} excludes the saturated Steel Cord`);

  const same = game.tickRun({ ...game.createRun(), owned: { reinforce: 1 }, charged: 0, skips: 9 },
    WITNESS_ROPE, WITNESS_PLAYER, 1 / 120, () => stub);
  assert.ok(same.run.offer.some((c) => c.id === 'reinforce'),
    `same-seed offer at charged 0 (${same.run.offer.map((c) => c.id)}) includes it — the exclusion is the live state, not the draw`);
});

// Leg 9 — determinism with the state object live + scripted no-stall
// (simpleeffects.test.js leg 10, INCLUDING the post-loop applyCard+resumeRun
// PAIR — a bare applyCard never writes status, D-06).
const rngStub = () => 0.5;
const LEAD = 0.1;
const wantsJump = (phase, ropeCount) => {
  for (let k = 0; k < ropeCount; k++) if (atFeetOffset(phase + LEAD, k, ropeCount)) return true;
  return false;
};

test('200-seed replay with live charged state; a 1000-tick charged build never stalls', () => {
  const drawsView = [];
  const drawsStateless = [];
  const drawsSaturated = [];
  for (let seed = 0; seed < 200; seed++) {
    // owned.reinforce keeps Steel Cord in the pool (owned arm below cap 2), so
    // charged state alone decides its presence: 1 hides nothing, 2 saturates
    // the stateCap — the offerstate.test.js:73-77 non-vacuity idiom.
    drawsView.push(pickOffers(CARDS, { reinforce: 1 }, 2, seeded(seed), { ropes: 1, charged: 1 }).map((c) => c.id).join('+'));
    drawsStateless.push(pickOffers(CARDS, { reinforce: 1 }, 2, seeded(seed), undefined).map((c) => c.id).join('+'));
    drawsSaturated.push(pickOffers(CARDS, { reinforce: 1 }, 2, seeded(seed), { ropes: 1, charged: 2 }).map((c) => c.id).join('+'));
  }
  assert.deepEqual(drawsView, drawsStateless, 'a state view that hides nothing shifts no rng position (NFR4)');
  assert.notDeepEqual(drawsSaturated, drawsView, 'saturating charged hides reinforce — the live deal state is wired, not decorative (NFR4)');

  let { rope, run } = game.startRun();
  let player = createPlayer();
  for (let i = 0; i < reinforce.cap; i++) run = game.applyCard(run, reinforce);
  assert.equal(run.charged, game.MAX_CHARGED, 'two real picks reach full charges (no crafted count)');
  let picks = 0;
  for (let t = 0; t < 1000; t++) {
    if (run.status === 'choose') { // the scripted rig resolves every freeze
      assert.ok(run.offer.length > 0, 'choose never carries an empty offer (Pitfall 6)');
      run = game.applyCard(run, run.offer[picks++ % run.offer.length]);
      ({ rope, player, run } = game.resumeRun(run));
      continue;
    }
    if (player.grounded && wantsJump(rope.phase, run.ropes)) {
      player = jump(player, 0.5, run.effects.launchMul ?? 1);
    }
    const out = game.tickRun(run, rope, player, STEP, rngStub);
    ({ run, rope, player } = out);
    assert.ok(run.charged <= game.MAX_CHARGED, `charged never exceeds the cap mid-run (tick ${t})`);
    if (run.status === 'over') break; // a trip or the summit is a legitimate end
  }
  if (run.status === 'choose') run = game.resumeRun(game.applyCard(run, run.offer[picks++ % run.offer.length])).run;
  assert.notEqual(run.status, 'choose', 'the run completes or dies by trip/win — never stalls');
  assert.ok(run.skips > 0, 'the charged build was actually skipping');
});
