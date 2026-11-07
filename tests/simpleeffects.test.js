import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../js/game.js';
import { CARDS, freshEffects, pickOffers } from '../js/upgrades.js';
import { createPlayer, jump, updatePlayer, jumpVelocity } from '../js/player.js';
import { atFeetOffset } from '../js/rope.js';
import { AREAS } from '../js/areas.js';
import { mulberry32 } from './support/balance-harness.js';

// Story 3.2: Spare Rope (& the ADR-2 whole-record pick path) and Launch Heels
// (& the launchMul effect) — contract legs for both new effects, the run-shape
// dispatch, the defensive clamp, and the FR17-timing interlocks. Expectations
// derive from the card records and the physics formula, never a hand-maintained
// table (AGENTS.md frozen-test discipline). Rig idioms: tests/headless-sim.test.js
// scripted jumper (legs 5-6), tests/ascent.test.js apex/fly rigs (legs 7-8),
// tests/v1parity.test.js derived semi-implicit band (leg 7).

const STEP = 1 / 120;
const REV_TICKS = 156; // 1.3 s rope period at STEP — exactly one revolution
const rngStub = () => 0.5;
const PARKED = { phase: 0.05, period: 100 }; // ascent.test.js idiom: no crossing in a fly window

const extrarope = CARDS.find(c => c.id === 'extrarope');
const highjump = CARDS.find(c => c.id === 'highjump');

const stackedLaunch = (times) => {
  let fx = freshEffects();
  for (let i = 0; i < times; i++) fx = highjump.apply(fx);
  return fx.launchMul;
};

// Lead-band jumper policy (headless-sim generalized to N ropes): jump the
// first tick the player is grounded with any rope's derived phase inside its
// feet window shifted LEAD revolutions earlier. Windows derive from
// atFeetOffset(k, N) each tick — never hardcoded (NFR5).
const LEAD = 0.1;
const wantsJump = (phase, ropeCount) => {
  for (let k = 0; k < ropeCount; k++) if (atFeetOffset(phase + LEAD, k, ropeCount)) return true;
  return false;
};

// Leg 1 — highjump closure pins, derived from the record.
test('Launch Heels apply multiplies launchMul by 1.1 per copy; the frozen four stay neutral', () => {
  const once = highjump.apply(freshEffects());
  assert.equal(once.launchMul, 1.1);
  for (const field of ['floatMul', 'ropeMul', 'scoreMul', 'windowMul']) {
    assert.equal(once[field], 1, `highjump leaves ${field} untouched`);
  }
  assert.equal(stackedLaunch(highjump.cap), 1.1 * 1.1 * 1.1,
    `cap ${highjump.cap} stacks multiplicatively`);
});

// Leg 2 — Spare Rope through the REAL pick path (AC1).
test('Spare Rope through applyCard grows run.ropes immediately, one per owned copy', () => {
  let run = game.startRun().run;
  for (let n = 1; n <= extrarope.cap; n++) {
    run = game.applyCard(run, extrarope);
    assert.equal(run.ropes, n + 1, `pick ${n}: ropes live as ${n + 1} at once`);
    assert.equal(run.owned.extrarope, n, `pick ${n}: owned tallies`);
    assert.equal(run.offer, null, 'the offer is spent by the pick');
    assert.deepEqual(run.effects, freshEffects(), 'the run patch touches no effect key');
  }
});

// Leg 3 — applyUpgrade routes through the same helper (AC1, house one-handler rule).
test('applyUpgrade keeps v1 semantics on the shared whole-record patch', () => {
  const out = game.applyUpgrade({ ...game.createRun(), ropes: 2 }, extrarope);
  assert.equal(out.ropes, 3, 'the shim resolves the run-shaped card identically');
  assert.equal(out.status, 'running', 'applyUpgrade stamps running as before');
  assert.equal(out.offer, null);
});

// Leg 4 — defensive clamp is data, not error (AC2).
test('crafted over-cap records clamp as data: no crash, no sixth rope', () => {
  for (const ropes of [5, Infinity]) {
    const picked = game.applyCard(
      { ...game.createRun(), ropes, status: 'choose', offer: [extrarope] }, extrarope);
    assert.equal(picked.ropes, game.MAX_ROPES, `ropes: ${ropes} clamps to the ceiling`);
    assert.equal(picked.status, 'choose', 'applyCard never writes status (D-06)');
  }
});

// Leg 5 — the new rope is live from the next phase tick (AC1, NFR5).
test('a picked rope is live next tick: exactly 2 cleared passes per revolution at 2 ropes', () => {
  const revolve = (target) => {
    let { rope, player, run } = game.startRun();
    for (let i = 1; i < target; i++) run = game.applyCard(run, extrarope);
    ({ rope, player, run } = game.resumeRun(run));
    let skips = 0;
    for (let t = 0; t < REV_TICKS; t++) {
      if (player.grounded && wantsJump(rope.phase, run.ropes)) player = jump(player, 0.5);
      const out = game.tickRun(run, rope, player, STEP, rngStub);
      ({ run, rope, player } = out);
      skips += out.events.filter(e => e === 'skip').length;
      assert.notEqual(run.status, 'over', `no trip in the scripted revolution at tick ${t}`);
    }
    return skips;
  };
  assert.equal(revolve(1), 1, 'rig control: one rope scores one pass per revolution');
  assert.equal(revolve(2), 2, 'the Spare Rope pick doubles cleared passes from the very next revolution');
});

// Leg 6 — live hide-path witness (deferred-work :83 ropes arm).
test('the state-aware deal hides Spare Rope at 5 ropes — live path and pure seam', () => {
  let { rope, run } = game.startRun();
  let player = createPlayer();
  for (let i = 0; i < extrarope.cap; i++) run = game.applyCard(run, extrarope);
  assert.equal(run.ropes, game.MAX_ROPES, 'four real picks reach the ceiling (no crafted count)');
  run = { ...run, skips: 9 };
  const rng = mulberry32(7);
  let offer = null;
  for (let t = 0; t < 3000 && offer === null; t++) {
    if (player.grounded && wantsJump(rope.phase, run.ropes)) player = jump(player, 0.5);
    const out = game.tickRun(run, rope, player, STEP, rng);
    ({ run, rope, player } = out);
    assert.notEqual(run.status, 'over', `the scripted jumper survives to the offer (tick ${t})`);
    if (out.events.includes('offer')) offer = run.offer.map(c => c.id);
  }
  assert.ok(offer, 'the tenth skip fires the offer');
  assert.ok(!offer.includes('extrarope'), 'FR10 stateCap hides the dead Spare Rope pick at 5 ropes');

  // Contrast pair at the pure seam: owned BELOW cap (at owned = cap the cap
  // alone excludes, so only a sub-cap pool isolates the stateCap arm).
  const owned = { extrarope: extrarope.cap - 1 };
  let seed = 0;
  while (seed < 200 && !pickOffers(CARDS, owned, 2, mulberry32(seed)).some(c => c.id === 'extrarope')) seed++;
  assert.ok(seed < 200, 'some seed deals Spare Rope on the state-less draw');
  assert.ok(!pickOffers(CARDS, owned, 2, mulberry32(seed), { ropes: game.MAX_ROPES, charged: 0 })
    .some(c => c.id === 'extrarope'), 'the same-seed state-aware draw hides it (stateCap ropes arm)');
});

// Apex of one arc through the real integrator (ascent.test.js simApex with the
// launch multiplier threaded at launch only).
const apexUnder = (hold, launchMul, floatMul) => {
  let p = jump(createPlayer(), hold, launchMul);
  let apex = p.y;
  do {
    p = updatePlayer(p, STEP, 1800 / floatMul);
    apex = Math.max(apex, p.y);
  } while (p.y > 0);
  return apex;
};

// Leg 7 — composition under the derived semi-implicit band (AC3).
test('measured apex tracks jv(h)^2 * launchMul^2 * floatMul within the Euler band', () => {
  const jv = jumpVelocity(0.5);
  const cases = [
    [1, 1],
    [stackedLaunch(1), 1],
    [stackedLaunch(highjump.cap), 1],
    [stackedLaunch(highjump.cap), CARDS.find(c => c.id === 'float').apply(freshEffects()).floatMul],
  ];
  for (const [lm, fm] of cases) {
    const v = jv * lm;
    const gEff = 1800 / fm;
    const analytic = (jv * jv * lm * lm * fm) / (2 * 1800); // peak = v^2 / 2g, g = 1800/floatMul
    const ratio = apexUnder(0.5, lm, fm) / analytic;
    assert.ok(ratio >= 1 - (gEff * STEP) / v - 1e-9 && ratio <= 1,
      `launchMul ${lm} floatMul ${fm}: left-sum bound, got ${ratio}`);
  }
  // launchMul-only peak ratio = launchMul^2 (band: both apexes share the
  // v1parity left-sum bound, applied once per side).
  const lmCap = stackedLaunch(highjump.cap);
  const ratio = apexUnder(0.5, lmCap, 1) / apexUnder(0.5, 1, 1);
  const slack = (1800 * STEP) / jv;
  assert.ok(ratio >= lmCap * lmCap * (1 - slack / lmCap - 1e-9) && ratio <= lmCap * lmCap / (1 - slack),
    `peak ratio ${ratio} brackets launchMul^2 ${lmCap * lmCap}`);
});

// Leg 8 — rig-clear witness, mirroring frozen ascent.test.js:209-219.
test('Launch Heels crosses a peak-margin ceiling the bare run cannot', () => {
  const lm = stackedLaunch(1);
  const bareApex = apexUnder(0.5, 1, 1);
  const heeledApex = apexUnder(0.5, lm, 1);
  assert.ok(heeledApex - bareApex > 1, 'rig sanity: launchMul must lift the arc');
  const margin = (bareApex + heeledApex) / 2;
  const fly = (launchMul) => {
    let run = { ...game.createRun(), effects: { ...freshEffects(), launchMul },
      altitude: AREAS[0].ceiling - margin };
    let rope = { ...PARKED };
    let player = jump(createPlayer(), 0.5, launchMul);
    const events = [];
    for (let i = 0; i < 150; i++) {
      const out = game.tickRun(run, rope, player, STEP, rngStub);
      ({ run, rope, player } = out);
      events.push(...out.events);
      if (player.grounded) break;
    }
    return { run, events };
  };
  const bare = fly(1);
  assert.equal(bare.run.area, 1, 'the bare arc peaks under the rig ceiling');
  assert.ok(!bare.events.includes('ascend'));
  const heeled = fly(lm);
  assert.equal(heeled.run.area, 2, 'the multiplied arc (launch velocity x' + lm + ') clears it');
  assert.ok(heeled.events.includes('ascend'));
});

// Leg 9 — FR17 timing contract at cap + the lead-in decision (Task 3).
test('timing contract at cap: grounded iff y === 0, zero jump events, lead-in unamplified', () => {
  let run = { ...game.createRun(), effects: { ...freshEffects(), launchMul: stackedLaunch(highjump.cap) } };
  let rope = { ...PARKED }; // ascent.test.js idiom: the arc rides with no crossing
  let player = game.startRun().player; // the canonical lead-in hop is the ONLY airborne source
  for (let t = 0; t < 600; t++) {
    const out = game.tickRun(run, rope, player, STEP, rngStub);
    ({ run, rope, player } = out);
    assert.equal(player.grounded, player.y === 0, `no coyote time at tick ${t} (FR17)`);
    assert.ok(!out.events.includes('jump'), 'launchMul never fabricates a jump (D-N11)');
  }
  let heels3 = game.startRun().run;
  for (let i = 0; i < 3; i++) heels3 = game.applyCard(heels3, highjump);
  const resumed = game.resumeRun(game.applyCard(heels3, highjump));
  assert.equal(resumed.player.vy, jumpVelocity(0.1),
    'the canonical lead-in hop is never multiplied (ARCH-02, D-c)');
});
// Leg 10 — determinism guards (the draw math is untouched).
test('draw replay over 200 seeds is unchanged, and a stacked 1000-tick run never stalls', () => {
  const drawA = [];
  const drawB = [];
  for (let seed = 0; seed < 200; seed++) {
    drawA.push(pickOffers(CARDS, {}, 2, mulberry32(seed)).map(c => c.id));
    drawB.push(pickOffers(CARDS, {}, 2, mulberry32(seed)).map(c => c.id));
  }
  assert.deepEqual(drawA, drawB, 'launchMul landing changed no draw math');

  let { rope, player, run } = game.startRun();
  player = createPlayer();
  for (let i = 0; i < highjump.cap; i++) run = game.applyCard(run, highjump);
  run = game.applyCard(run, extrarope);
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
    if (run.status === 'over') break; // a trip or the summit is a legitimate end
  }
  if (run.status === 'choose') run = game.applyCard(run, run.offer[picks++ % run.offer.length]);
  assert.notEqual(run.status, 'choose', 'the run completes or dies by trip/win — never stalls');
  assert.ok(run.skips > 0, 'the stacked build was actually skipping');
});
