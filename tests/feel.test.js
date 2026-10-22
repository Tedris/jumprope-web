import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, tickRun, BUFFER_SEC, NEAR_MARGIN } from '../js/game.js';
import { createPlayer } from '../js/player.js';

// Phase-4 feel suite (D-N01/D-N02/D-N03/D-N11): pure Node sim only — press
// offsets vs the feet-cross on the phase clock, the per-step events channel,
// and the near-miss/streak rule. No browser IO, no raw randomness; the
// boundary.test.js entry-point walk stays three-free via these three modules.

const STEP = 1 / 120; // headless-sim.test.js idiom
const RIG_PERIOD = 1.3;
const INC = STEP / RIG_PERIOD; // phase advance per tick at ropeMul 1

// Rope whose feet-cross rising edge lands exactly `crossTicks` tickRun calls
// ahead (phase 0.4501 - n*inc puts step n inside the [0.45, 0.55] window with
// 0.0001 of float headroom, step n-1 outside it).
const rigRope = (crossTicks) => ({ phase: 0.4501 - crossTicks * INC, period: RIG_PERIOD });

// Grounded at y 0: any un-forgiven crossing trips.
const floorPlayer = () => createPlayer();
const airPlayer = (y) => ({ ...createPlayer(), y, grounded: false });

const rngStub = () => 0.5;

// Step a rig whose crossing lands on `crossTicks`, delivering press = true on
// the tick `pressBefore` steps earlier (or on the crossing step itself when 0).
function stepToCrossing({ run, crossTicks = 14, pressBefore = null, player = floorPlayer() }) {
  let rope = rigRope(crossTicks);
  const presses = new Array(crossTicks).fill(false);
  if (pressBefore !== null) presses[crossTicks - 1 - pressBefore] = true;
  let out;
  for (let tick = 0; tick < crossTicks; tick++) {
    out = tickRun(run, rope, player, STEP, rngStub, presses[tick] ? true : null);
    ({ run, rope, player } = out);
  }
  return { out, run, rope, player };
}

test('press 0.05 s before the crossing forgives the trip into a counted near-miss skip (FEEL-01)', () => {
  const { out } = stepToCrossing({ run: createRun(), crossTicks: 14, pressBefore: 6 });
  assert.equal(out.run.status, 'running');
  assert.equal(out.tripped, false);
  assert.equal(out.run.skips, 1);
  assert.equal(out.run.score, 1); // forgiven pass scores like a clean one
  assert.deepEqual(out.events, ['skip', 'nearMiss']);
  assert.equal(out.run.streak, 1);
  assert.equal(out.run.buffer, 0, 'buffer consumed at the feet-crossing (D-N01)');
  assert.equal(BUFFER_SEC, 0.1, 'FEEL-01 locked window (D-N01)');
});

test('press 0.15 s before the crossing has fully decayed — the crossing trips (D-N01 bound)', () => {
  const { out } = stepToCrossing({ run: createRun(), crossTicks: 20, pressBefore: 18 });
  assert.equal(out.tripped, true);
  assert.equal(out.run.status, 'over');
  assert.deepEqual(out.events, ['trip']);
  assert.equal(out.run.streak, 0);
  assert.equal(out.run.skips, 0);
});

test('press exactly 0.10 s before (12 ticks): iterative phase-clock decay leaves a positive float residue (~2.4e-17) above the inclusive buffer === 0 boundary, so this edge forgives', () => {
  const { out } = stepToCrossing({ run: createRun(), crossTicks: 16, pressBefore: 12 });
  assert.equal(out.tripped, false);
  assert.equal(out.run.status, 'running');
  assert.deepEqual(out.events, ['skip', 'nearMiss']);
});

test('D-N11 pin: a delivered press never mutates player state — pressed and un-pressed scripts are deep-equal on the player at every pre-crossing step', () => {
  let pressed = { run: createRun(), rope: rigRope(14), player: floorPlayer() };
  let plain = { run: createRun(), rope: rigRope(14), player: floorPlayer() };
  for (let tick = 0; tick < 13; tick++) {
    const press = tick === 7 ? true : null; // 6 ticks before the crossing
    pressed = flatten(tickRun(pressed.run, pressed.rope, pressed.player, STEP, rngStub, press));
    plain = flatten(tickRun(plain.run, plain.rope, plain.player, STEP, rngStub, null));
    assert.deepEqual(pressed.player, plain.player, `player identical at pre-crossing tick ${tick}`);
    assert.ok(!pressed.out.events.includes('jump'), 'press never emits a jump');
  }
});

function flatten(out) {
  return { run: out.run, rope: out.rope, player: out.player, out };
}

test('5-arg backward compat: press-free trip rig mirrors tests/game.test.js:22-28 and trips on the crossing step; return carries run/rope/player/tripped/events', () => {
  const rope = { phase: 0.44, period: 0.9 };
  const player = { y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 };
  const out = tickRun(createRun(), rope, player, 1 / 60);
  assert.equal(out.tripped, true);
  assert.equal(out.run.status, 'over');
  assert.deepEqual(out.events, ['trip']);
  assert.deepEqual(Object.keys(out).sort(), ['events', 'player', 'rope', 'run', 'tripped']);
  const fresh = createRun();
  assert.equal(fresh.buffer, 0);
  assert.equal(fresh.streak, 0);
});

test('events alphabet: takeoff transition (grounded in, airborne out) emits jump; plain grounded steps emit none', () => {
  const rope = { phase: 0.2, period: RIG_PERIOD };
  // The Task-1 detector (player.grounded && !nextPlayer.grounded) reads the
  // takeoff transition inside one step: grounded flag with live upward vy.
  const takeoff = { ...createPlayer(), vy: 600 };
  const out = tickRun(createRun(), rope, takeoff, STEP, rngStub);
  assert.deepEqual(out.events, ['jump']);
  const idle = tickRun(createRun(), rigRope(10), floorPlayer(), STEP, rngStub);
  assert.deepEqual(idle.events, [], 'non-crossing grounded steps stay silent');
});

// One scripted pass: reset rope/player, tick to a rising-edge crossing, and
// report the crossing step's events plus the resulting streak/score.
function scriptedPass(state, kind) {
  const crossTicks = 4;
  const forgiven = kind === 'forgiven';
  let player = kind === 'clean' ? airPlayer(40)
    : kind === 'tight' ? airPlayer(18 * (1 + NEAR_MARGIN * 0.5))
      : floorPlayer();
  let { run } = state;
  let rope = rigRope(crossTicks);
  const events = [];
  for (let tick = 0; tick < crossTicks; tick++) {
    const press = forgiven && tick === crossTicks - 1 ? true : null;
    const out = tickRun(run, rope, player, STEP, rngStub, press);
    assert.deepEqual(out.events, tick === crossTicks - 1 ? out.events : [],
      'only the crossing step reports events');
    events.push(...out.events);
    ({ run, rope, player } = out);
  }
  return { run, events };
}

test('ten-pass scripted sequence: exact event stream and streak trajectory 0→1→2→0→1→2→3→0→1→0, score/skips identical for near-miss and clean passes', () => {
  const kinds = ['clean', 'tight', 'forgiven', 'clean', 'tight',
    'forgiven', 'forgiven', 'clean', 'tight', 'clean'];
  const expectedEvents = [
    ['skip'], ['skip', 'nearMiss'], ['skip', 'nearMiss'], ['skip'], ['skip', 'nearMiss'],
    ['skip', 'nearMiss'], ['skip', 'nearMiss'], ['skip'], ['skip', 'nearMiss'],
    ['skip', 'offer'], // tenth skip: cadence freeze rides the last pass
  ];
  const expectedStreaks = [0, 1, 2, 0, 1, 2, 3, 0, 1, 0];
  let state = { run: createRun() };
  const stream = [];
  kinds.forEach((kind, i) => {
    state = scriptedPass(state, kind);
    assert.deepEqual(state.events, expectedEvents[i], `pass ${i + 1} (${kind}) events`);
    assert.equal(state.run.streak, expectedStreaks[i], `pass ${i + 1} (${kind}) streak`);
    stream.push(...state.events.filter(e => e !== 'offer'));
  });
  assert.equal(state.run.skips, 10, 'every pass including near-misses counts one skip');
  assert.equal(state.run.score, 10, 'near-misses score identically to clean passes');
  assert.deepEqual(stream, expectedEvents.flat().filter(e => e !== 'offer'));
});

test('two tight crossings in a row build a streak-2 with both crossings emitting [skip, nearMiss] (D-N03)', () => {
  let state = { run: createRun() };
  state = scriptedPass(state, 'tight');
  assert.deepEqual(state.events, ['skip', 'nearMiss']);
  assert.equal(state.run.streak, 1);
  state = scriptedPass(state, 'tight');
  assert.deepEqual(state.events, ['skip', 'nearMiss']);
  assert.equal(state.run.streak, 2);
});

test('windowMul coupling pin: at windowMul 1.25 the near-miss band scales to minHeight 14.4 (band 14.4–21.6) — y 18 tight, y 23.25 roomy', () => {
  // minHeight = 18 / 1.25 = 14.4; band = [14.4, 14.4 * (1 + NEAR_MARGIN)).
  // The 4-tick rig drops the airborne player 1.25 units (Σ 15t/120, t=1..4),
  // so start y 18 lands 16.75 (inside the band) and 23.25 lands 22.0 (out).
  const effects = { floatMul: 1, ropeMul: 1, scoreMul: 1, windowMul: 1.25 };
  let run = { ...createRun(), effects };
  for (const [y, expected, streak] of [[18, ['skip', 'nearMiss'], 1], [23.25, ['skip'], 0]]) {
    let rope = rigRope(4);
    let player = airPlayer(y);
    let out;
    for (let tick = 0; tick < 4; tick++) {
      out = tickRun(run, rope, player, STEP, rngStub);
      ({ run, rope, player } = out);
    }
    assert.deepEqual(out.events, expected, `y ${y} vs the scaled band`);
    assert.equal(run.streak, streak);
  }
});
