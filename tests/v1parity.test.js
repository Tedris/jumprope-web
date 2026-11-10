import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  createRun, tickRun, resumeRun,
  START_PHASE, BUFFER_SEC, ROPE_PERIOD, MIN_ROPES, MAX_ROPES,
} from '../js/game.js';
import { createPlayer, jump, jumpVelocity, GRAVITY, CLEAR_MIN_HEIGHT as MIN_HEIGHT } from '../js/player.js';
import { atFeetOffset } from '../js/rope.js';
import { CARDS, freshEffects } from '../js/upgrades.js';

// Story 1.5 — input hygiene & v1 parity proof. Two sections in one file
// (nearmiss.test.js precedent): pure-sim legs pinning the v1 jump contract
// (launch formula, clearance threshold, mercy buffer, no coyote time) at EVERY
// rope count, and shell-harness legs exercising the focus-loss and pause hygiene
// paths (blur, hidden tab, pointer-up, P/Esc) at ropes >= 2 through their shared handlers.
//
// This is a PROOF suite: zero production code. Expectations derive from what
// the modules export (jumpVelocity, BUFFER_SEC, START_PHASE, CARDS, the rope
// band via atFeetOffset) — the two physics numbers below ride the js/player.js
// export surface (Story 6.2 re-contract R4, ledger :43: the 2026-11-04 "no
// constant exports until the Epic 6 balance pass" defer is PAID by that pass).

// ---------- pure-sim rig (feel.test.js + multirope.test.js idioms) ----------

const STEP = 1 / 120;
const RIG_PERIOD = ROPE_PERIOD;                    // rope rhythm IS exported
const INC = STEP / RIG_PERIOD;               // phase advance per tick, ropeMul 1
// GRAVITY / MIN_HEIGHT: tickRun's physics constants, imported from js/player.js
// (GRAVITY, CLEAR_MIN_HEIGHT locally as MIN_HEIGHT) — parity values identical.
const FALL_PER_TICK = GRAVITY * STEP * STEP; // Δy of one injected vy=0 airborne tick
const rngStub = () => 0.5;

// Crossing lands on the `crossTicks`-th tickRun (feel.test.js rig: 0.0001 of
// float headroom inside the [0.45, 0.55] band on the crossing tick).
const rigRope = (crossTicks) => ({ phase: 0.4501 - crossTicks * INC, period: RIG_PERIOD });
// A rope a quarter phase clear of the k=0 window — window-free for the SHORT
// trajectory scripts at N=1/absent. At N >= 2 the offset windows (rope.js:11-19)
// ARE reached mid-script on long holds; those scripts assert player physics only.
const cleanRope = () => ({ phase: 0.56, period: RIG_PERIOD });
const airborne = (y) => ({ y, vy: 0, grounded: false, squash: 1, squashVel: 0 });

// Records differing ONLY in the ropes field (multirope.test.js:197 idiom for
// the absent variant).
function ropeVariants() {
  const absent = { ...createRun() };
  delete absent.ropes;
  const out = [['absent', absent]];
  for (let n = MIN_ROPES; n <= MAX_ROPES; n++) out.push([String(n), { ...createRun(), ropes: n }]);
  return out;
}

// flightTicks: landed + 3 ticks of grounded rest for a hold-h launch.
const flightTicks = (hold) =>
  Math.ceil(2 * jumpVelocity(hold) / (GRAVITY * STEP)) + 3;

// ---------- Task 1a: trajectory identity across rope counts ----------

test('a scripted jump trajectory is rope-count invariant: holds 0/0.05/0.25/0.5/1.0 on records differing ONLY in ropes stay deep-equal (AC2, AC3)', () => {
  // The claim is PHYSICS: the player and rope states tick after tick. Events
  // and status legitimately differ — N windows mean N crossing sites (no
  // rope-count-independent "clean phase" window exists for N >= 2) — and the
  // failing-crossing CONSEQUENCE (die vs strip) is the health system, not the
  // jump. AC3 pins that the trajectory the physics produces is one function.
  for (const hold of [0, 0.05, 0.25, 0.5, 1.0]) {
    let variants = ropeVariants();
    let rope = cleanRope();
    let player = jump(createPlayer(), hold);
    for (let tick = 1; tick <= flightTicks(hold); tick++) {
      const outs = variants.map(([name, run]) =>
        [name, tickRun(run, rope, player, STEP, rngStub, null)]);
      const ref = outs[0][1]; // the field-absent v1-shape reference
      for (const [name, out] of outs) {
        assert.deepEqual(out.player, ref.player,
          `hold ${hold} tick ${tick}: player diverged at ropes ${name} vs field-absent`);
        // Same rope input feeds all variants: equal today, but a future tickRun
        // branch that mutates the rope record per run (reset/death paths) diverges.
        assert.ok(Object.values(out.player).every((v) => typeof v !== 'number' || Number.isFinite(v)),
          `hold ${hold} tick ${tick}: player state stays finite at ${name}`);
      }
      rope = ref.rope;
      player = ref.player;
      variants = outs.map(([name, out]) => [name, out.run]);
    }
    assert.equal(player.grounded, true, `hold ${hold}: the script covers the full flight to landing`);
  }
});

// ---------- Task 1b: analytic pins ----------

test('a hold-h trajectory peaks just under jumpVelocity(h)^2 / (2 × 1800), inside the derived semi-implicit-Euler band (AC2)', () => {
  // The left-sum (semi-implicit) trajectory is y_n = v·t − g·t²·(n+1)/2n — strictly
  // under the continuous peak, with relative undershoot (g·dt)/v: 4.3% at hold 0
  // (v 350), 2.5% at the 0.5 s cap. The story's [0.97, 1.0] band missed the
  // short-hold end; the derived bound is strictly tighter and formula-based.
  for (const hold of [0, 0.05, 0.25, 0.5, 1.0]) {
    const v = jumpVelocity(hold);
    let run = { ...createRun(), ropes: 1 };
    let rope = cleanRope();
    let player = jump(createPlayer(), hold);
    let peak = 0;
    for (let tick = 1; tick <= flightTicks(hold); tick++) {
      const out = tickRun(run, rope, player, STEP, rngStub, null);
      peak = Math.max(peak, out.player.y);
      ({ run, rope, player } = out);
    }
    const ratio = peak / ((v * v) / (2 * GRAVITY));
    assert.ok(ratio <= 1, `hold ${hold}: the discrete peak cannot exceed the continuous ${v * v / (2 * GRAVITY)}, got ${peak}`);
    assert.ok(ratio >= 1 - (GRAVITY * STEP) / v - 1e-9,
      `hold ${hold}: peak ${peak} undershoots beyond the left-sum error bound (ratio ${ratio})`);
  }
});

test('the 0.5 s hold cap is a trajectory fact: holds 0.5 and 1.0 produce tick-identical players (AC2)', () => {
  const ticks = flightTicks(0.5);
  const state = (hold) => {
    let run = { ...createRun(), ropes: 1 };
    let rope = cleanRope();
    let player = jump(createPlayer(), hold);
    const traj = [];
    for (let tick = 1; tick <= ticks; tick++) {
      const out = tickRun(run, rope, player, STEP, rngStub, null);
      traj.push(out.player);
      ({ run, rope, player } = out);
    }
    return traj;
  };
  const capped = state(0.5);
  const longer = state(1.0);
  for (let t = 0; t < ticks; t++) {
    assert.deepEqual(longer[t], capped[t], `tick ${t + 1}: holding past 0.5 s must change nothing`);
  }
});

// ---------- Task 1c: clearance boundary ----------

test('the clearance decision boundary is exactly 18 u at base effects: judged at 18 clears (inclusive), under 18 dies at ropes 1 (AC2)', () => {
  // Injected y is pre-updatePlayer: the crossing judges y − FALL_PER_TICK.
  const exact = tickRun({ ...createRun(), ropes: 1 }, rigRope(1),
    airborne(MIN_HEIGHT + FALL_PER_TICK), STEP, rngStub, null);
  assert.equal(exact.run.status, 'running');
  assert.equal(exact.run.score, 1);
  assert.deepEqual(exact.events, ['skip', 'nearMiss']); // 18 sits in the near band [18, 27)
  const under = tickRun({ ...createRun(), ropes: 1 }, rigRope(1),
    airborne(MIN_HEIGHT), STEP, rngStub, null); // judged 17.875
  assert.equal(under.run.status, 'over');
  assert.equal(under.tripped, true);
  assert.deepEqual(under.events, ['trip']);
});

test('Wide Stance apply moves the boundary to 18 / windowMul: y 17 fails bare, clears with the card (FR18, AC2)', () => {
  const windowMul = CARDS.find((c) => c.id === 'window').apply(freshEffects()).windowMul;
  const threshold = MIN_HEIGHT / windowMul; // the "≈16.4" of FR18 — derived, never a literal
  const effects = { ...freshEffects(), windowMul };
  const bare = tickRun({ ...createRun(), ropes: 1 }, rigRope(1),
    airborne(17 + FALL_PER_TICK), STEP, rngStub, null);
  assert.equal(bare.run.status, 'over', 'y 17 is below the bare 18 threshold');
  const carded = tickRun({ ...createRun(), ropes: 1, effects }, rigRope(1),
    airborne(17 + FALL_PER_TICK), STEP, rngStub, null);
  assert.equal(carded.run.status, 'running');
  assert.deepEqual(carded.events, ['skip', 'nearMiss']);
  const exact = tickRun({ ...createRun(), ropes: 1, effects }, rigRope(1),
    airborne(threshold + FALL_PER_TICK), STEP, rngStub, null);
  assert.equal(exact.run.score, 1, 'judged exactly at 18 / windowMul clears (>= is inclusive)');
  const miss = tickRun({ ...createRun(), ropes: 1, effects }, rigRope(1),
    airborne(threshold), STEP, rngStub, null);
  assert.equal(miss.run.status, 'over', 'one tick of fall below the moved threshold trips');
});

// ---------- Task 1d: mercy buffer re-pinned on explicit ropes: 1 ----------

// feel.test.js:28-38 stepToCrossing technique on EXPLICIT ropes: 1 records —
// that explicit field IS the parity claim; feel.test.js stays untouched.
function stepToCrossing({ run, crossTicks, pressBefore }) {
  let rope = rigRope(crossTicks);
  const presses = new Array(crossTicks).fill(false);
  presses[crossTicks - 1 - pressBefore] = true;
  let player = createPlayer(); // grounded: an un-forgiven crossing trips
  let out;
  let enteringBuffer; // the buffer state the crossing tick judges (pre-decay)
  for (let tick = 0; tick < crossTicks; tick++) {
    enteringBuffer = run.buffer;
    out = tickRun(run, rope, player, STEP, rngStub, presses[tick] ? true : null);
    ({ run, rope, player } = out);
  }
  return { ...out, enteringBuffer };
}

const HALF_WINDOW = Math.round((BUFFER_SEC / 2) / STEP);   // 0.05 s of phase clock
const FULL_WINDOW = Math.round(BUFFER_SEC / STEP);         // 0.10 s
const OVER_WINDOW = Math.round((BUFFER_SEC * 1.5) / STEP); // 0.15 s

test('mercy buffer at explicit ropes: 1: 0.05 s forgives, 0.15 s trips, exactly BUFFER_SEC forgives on the float residue — the FEEL-01 trio re-pinned (AC2)', () => {
  const near = stepToCrossing({ run: { ...createRun(), ropes: 1 }, crossTicks: 14, pressBefore: HALF_WINDOW });
  assert.equal(near.run.status, 'running');
  assert.equal(near.tripped, false);
  assert.deepEqual(near.events, ['skip', 'nearMiss']);
  assert.equal(near.run.score, 1);
  assert.equal(near.run.buffer, 0, 'consumed at the crossing (D-N01)');
  assert.equal(BUFFER_SEC, 0.1, 'FEEL-01 locked window');

  const late = stepToCrossing({ run: { ...createRun(), ropes: 1 }, crossTicks: 20, pressBefore: OVER_WINDOW });
  assert.equal(late.tripped, true, 'a 0.15 s press has fully decayed — the v1 trip stands');
  assert.deepEqual(late.events, ['trip']);
  assert.equal(late.enteringBuffer, 0, 'the buffer hit zero before the crossing tick (Math.max clamp)');

  const edge = stepToCrossing({ run: { ...createRun(), ropes: 1 }, crossTicks: 16, pressBefore: FULL_WINDOW });
  assert.ok(edge.enteringBuffer > STEP,
    'exactly BUFFER_SEC forgives only on the POSITIVE residue of fl(0.1) — pin the mechanism, not the rounding luck');
  assert.equal(edge.tripped, false, 'iterative decay leaves a positive residue exactly BUFFER_SEC before');
  assert.deepEqual(edge.events, ['skip', 'nearMiss']);
});

test('buffer decay rides the phase clock: the same 12-tick press trips at ropeMul 1.12 (Wind-Up) where it forgives at 1 (AC2)', () => {
  const ropeMul = CARDS.find((c) => c.id === 'windup').apply(freshEffects()).ropeMul;
  const base = stepToCrossing({ run: { ...createRun(), ropes: 1 }, crossTicks: 16, pressBefore: FULL_WINDOW });
  assert.deepEqual(base.events, ['skip', 'nearMiss']);
  let rope = { phase: 0.4501 - 16 * INC * ropeMul, period: RIG_PERIOD };
  const presses = new Array(16).fill(false);
  presses[16 - 1 - FULL_WINDOW] = true;
  let run = { ...createRun(), ropes: 1, effects: { ...freshEffects(), ropeMul } };
  let player = createPlayer();
  let out;
  for (let tick = 0; tick < 16; tick++) {
    out = tickRun(run, rope, player, STEP, rngStub, presses[tick] ? true : null);
    ({ run, rope, player } = out);
  }
  assert.equal(out.tripped, true,
    'the window shortened with the period (game.js:61) — 12 ticks are 1.12 windows now');
});

// ---------- Task 1e: mid-run rope-count change ----------

test('a jump after a strip-to-1 trip follows the ropes: 1 trajectory tick for tick (AC3)', () => {
  const stripped = tickRun({ ...createRun(), ropes: 2 }, rigRope(1), createPlayer(), STEP, rngStub, null);
  assert.equal(stripped.run.ropes, 1, 'rig: the failed crossing stripped the second rope');
  let a = stripped.run;
  let b = { ...createRun(), ropes: 1 };
  let rope = cleanRope();
  let pa = jump(stripped.player, 0.3);
  let pb = jump(createPlayer(), 0.3);
  for (let tick = 1; tick <= flightTicks(0.3); tick++) {
    const outA = tickRun(a, rope, pa, STEP, rngStub, null);
    const outB = tickRun(b, rope, pb, STEP, rngStub, null);
    assert.deepEqual(outA.player, outB.player, `tick ${tick}: post-strip physics drifted from the ropes: 1 reference`);
    assert.equal(outA.run.status, 'running');
    a = outA.run; b = outB.run; rope = outA.rope; pa = outA.player; pb = outB.player;
  }
});

test('clearance judgment on the k=0 window is identical at N=1 and N=2 for the same y (AC3)', () => {
  const runN = (n) => tickRun({ ...createRun(), ropes: n }, rigRope(1),
    airborne(30 + FALL_PER_TICK), STEP, rngStub, null);
  const a = runN(1);
  const b = runN(2);
  assert.deepEqual(a.events, ['skip']);
  assert.deepEqual(b.events, a.events, 'the k=0 rising edge judges the same at both counts');
  assert.equal(b.run.score, a.run.score);
  assert.equal(b.run.skips, a.run.skips);
});

// ---------- Task 1f: lead-in snap grace (Design Decision — pin, do not fix) ----------

test('lead-in snap grace: per N, the ropes whose feet window contains START_PHASE lose their opening pass to the snap — silent, state-neutral, late by exactly the snap (design decision)', () => {
  const REV = Math.round(1 / INC); // one revolution at ropeMul 1: 156 ticks
  for (let n = MIN_ROPES; n <= MAX_ROPES; n++) {
    const dropped = Array.from({ length: n }, (_, k) => k)
      .filter((k) => atFeetOffset(START_PHASE, k, n));
    const started = resumeRun({ ...createRun(), ropes: n });
    const air = airborne(40); // crossing-path rig (multirope oneRevolution idiom)
    const snap = tickRun(started.run, started.rope, air, STEP, rngStub, null);
    assert.deepEqual(snap.events, [], `N=${n}: the snap tick is silent — dropped passes emit nothing`);
    assert.equal(snap.run.score, started.run.score);
    assert.equal(snap.run.skips, started.run.skips);
    assert.equal(snap.run.ropes, n);
    // A 0-vs-0 compare would be vacuous: seed 2 i-frames so the blank branch has
    // something to drain. The snap tick is silent (asserted above: no rising-edge
    // pass), so the snapped windows' DROPPED passes must not decrement either.
    const seeded = resumeRun({ ...createRun(), ropes: n, iFrames: 2 });
    assert.equal(tickRun(seeded.run, seeded.rope, air, STEP, rngStub, null).run.iFrames, 2,
      `N=${n}: a dropped pass is not a blank — with 2 i-frames armed and no rising-edge pass on the snap tick, the blank branch (game.js:83-86) must not drain the ${dropped.length} snapped window(s) (:79 continue)`);
    let run = snap.run;
    let rope = snap.rope;
    const passTicks = [];
    for (let t = 2; t <= REV; t++) {
      const out = tickRun(run, rope, air, STEP, rngStub, null);
      if (out.events.includes('skip')) passTicks.push(t);
      ({ run, rope } = out);
    }
    assert.equal(passTicks.length, n,
      `N=${n}: every rope scores exactly once per revolution — the grace is timing, not a lost pass`);
    const late = passTicks.filter((t) => t > 0.9 * REV).length;
    assert.equal(late, dropped.length,
      `N=${n}: late-by-one-revolution passes must equal the snapped-window count (derived from atFeetOffset, never a table)`);
    assert.equal(run.ropes, n);
    assert.equal(run.iFrames, 0);
  }
  assert.equal(
    atFeetOffset(START_PHASE, 0, 1), false,
    'N=1: START_PHASE is outside the single v1 window — zero drops is the v1 parity fact');
});

// ---------- Task 1g: no coyote time ----------

test('no coyote time: grounded === (y === 0) every tick and zero jump events without a scripted jump() (FR19, AC2)', () => {
  let run = { ...createRun(), ropes: 1 };
  let rope = cleanRope();
  let player = airborne(50); // dropped, not launched
  let jumpEvents = 0;
  let everAirborne = false;
  for (let tick = 1; tick <= 80; tick++) {
    const out = tickRun(run, rope, player, STEP, rngStub, null);
    jumpEvents += out.events.filter((e) => e === 'jump').length;
    assert.deepEqual(out.events, [], `tick ${tick}: no crossing lives in the clean-phase window`);
    assert.equal(out.player.grounded, out.player.y === 0, `tick ${tick}: grounded iff y === 0 (player.js:17-27)`);
    assert.ok(out.player.vy <= 0, `tick ${tick}: nothing auto-launches`);
    everAirborne = everAirborne || out.player.grounded === false;
    ({ run, rope, player } = out);
  }
  assert.equal(jumpEvents, 0);
  assert.ok(everAirborne, 'the script really did start airborne');
  assert.equal(player.grounded, true, 'and it landed and STAYED grounded — no coyote relaunch');
});

// ---------- shell harness (polish.test.js bootPolishShell + game.js wrapper) ----------
//
// bootPolishShell copy (the blur/pointercancel/visibilitychange dispatch
// surface) with ONE delta: './game.js' points at a data: wrapper delegating
// tickRun (full arity — tests/startrun.test.js freezes the call surface) that
// forces run.ropes (optionally arms run.iFrames ONCE, never re-forced; disarmOnStrip
// stops the forcing after the first ropeLost so strip->death lifecycles can occur)
// into the INPUT record. Physics and phase stay real — force the input,
// assert the output (story 1.4 review lesson). restore is armed BEFORE the
// dynamic import (story 1.4 boot-hygiene patch); file:/data: URLs only,
// keeping the boundary.test.js walk green.

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');

let bootCount = 0;

function makeAudioContext() {
  const ctx = {
    state: 'suspended',
    currentTime: 0,
    sampleRate: 8000,
    destination: { name: 'destination' },
    resumes: 0,
    suspends: 0,
    gains: 0,
    started: 0,
    gainNodes: [],
    bufferSources: [],
  };
  ctx.resume = () => { ctx.state = 'running'; ctx.resumes++; };
  ctx.suspend = () => { ctx.state = 'suspended'; ctx.suspends++; };
  ctx.createGain = () => {
    const rec = {
      gain: {
        value: 1,
        setValueAtTime(v) { rec.gain.value = v; },
        exponentialRampToValueAtTime(v) { rec.gain.value = v; },
        linearRampToValueAtTime(v) { rec.gain.value = v; },
      },
      connectedTo: null,
      connect(t) { rec.connectedTo = t; },
    };
    ctx.gains++;
    ctx.gainNodes.push(rec);
    return rec;
  };
  ctx.createOscillator = () => ({
    type: '',
    frequency: {
      setValueAtTime() {},
      linearRampToValueAtTime() {},
      exponentialRampToValueAtTime() {},
    },
    connect() {},
    start() { ctx.started++; },
    stop() {},
  });
  ctx.createBufferSource = () => {
    const rec = {
      buffer: null,
      loop: false,
      connectedTo: null,
      connect(t) { rec.connectedTo = t; },
      start() { ctx.started++; },
      stop() {},
    };
    ctx.bufferSources.push(rec);
    return rec;
  };
  ctx.createBuffer = (_ch, length) => {
    const data = new Float32Array(length);
    return { length, getChannelData: () => data };
  };
  ctx.createBiquadFilter = () => ({
    type: '',
    frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
    connect() {},
  });
  ctx.decodeAudioData = async (buf) => buf;
  return ctx;
}

const settle = () => new Promise((r) => setTimeout(r, 0));

async function bootParityShell(script) {
  const frames = [];
  const handlers = { window: {}, canvas: {} };
  const hud = {
    'hud-score': { textContent: '' },
    'hud-best': { textContent: '' },
    'hud-prompt': { textContent: '' },
    'hud-owned': { textContent: '' },
  };
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    addEventListener: (type, fn) => { (handlers.canvas[type] ||= []).push(fn); },
  };
  const documentStub = {
    hidden: false,
    getElementById: (id) => (id === 'game' ? canvas : hud[id]),
  };
  const views = [];
  globalThis.__shellTestViews = views;
  globalThis.__parityScript = script;
  const mq = {
    matches: false,
    listeners: [],
    addEventListener(type, fn) { if (type === 'change') this.listeners.push(fn); },
  };
  const log = { voices: [], suspends: 0, gestures: 0 };
  globalThis.__parityAudio = log;
  const contexts = [];
  const map = new Map();
  const storageStub = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, v); },
  };

  const saved = {
    document: globalThis.document,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    AudioContext: globalThis.AudioContext,
    fetch: globalThis.fetch,
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    consoleError: console.error,
  };
  globalThis.document = documentStub;
  const windowStub = {
    addEventListener: (type, fn) => { (handlers.window[type] ||= []).push(fn); },
    innerWidth: 480,
    innerHeight: 640,
    matchMedia: (q) => (q === '(prefers-reduced-motion: reduce)'
      ? mq
      : { matches: false, addEventListener() {} }),
  };
  globalThis.window = windowStub;
  globalThis.requestAnimationFrame = (cb) => { frames.push(cb); return frames.length; };
  Object.defineProperty(globalThis, 'localStorage', { value: storageStub, configurable: true });
  globalThis.AudioContext = function StubAudioContext() {
    const ctx = makeAudioContext();
    contexts.push(ctx);
    return ctx;
  };
  globalThis.fetch = () => Promise.reject(new Error('no track in the sandbox'));
  console.error = () => {};

  const renderStubHref = 'data:text/javascript,' + encodeURIComponent([
    'export function createScene() {',
    '  return {',
    '    render(view) {',
    '      globalThis.__shellTestViews.push(view);',
    '    }',
    '  };',
    '}',
  ].join('\n'));

  const fileHref = (name) => pathToFileURL(resolve(jsDir, name)).href;
  const audioWrapHref = 'data:text/javascript,' + encodeURIComponent([
    'import * as real from "' + fileHref('audio.js') + '";',
    'export function createAudio(opts) {',
    '  const a = real.createAudio(opts);',
    '  const log = globalThis.__parityAudio;',
    '  return Object.assign({}, a, {',
    '    handleEvent(name) { log.voices.push(name); return a.handleEvent(name); },',
    '    gesture(...args) { log.gestures++; return a.gesture(...args); },',
    '    suspend(...args) { log.suspends++; return a.suspend?.(...args); },',
    '  });',
    '}',
    'export const loadSettings = real.loadSettings;',
    'export const saveSettings = real.saveSettings;',
  ].join('\n'));

  const gameWrapHref = 'data:text/javascript,' + encodeURIComponent([
    'export * from "' + fileHref('game.js') + '";',
    'import { tickRun as realTickRun } from "' + fileHref('game.js') + '";',
    'export const tickRun = (run, rope, player, dt, rng, press) => {',
    '  const s = globalThis.__parityScript;',
    '  if (!s) return realTickRun(run, rope, player, dt, rng, press);',
    '  const forced = { ...run };',
    '  if (s.ropes !== undefined && !(s.disarmOnStrip && s.stripped)) forced.ropes = s.ropes;',
    '  if (!s.armed && s.iFrames !== undefined) { forced.iFrames = s.iFrames; s.armed = true; }',
    '  const out = realTickRun(forced, rope, player, dt, rng, press);',
    '  if (s.disarmOnStrip && out.events.includes("ropeLost")) s.stripped = true;',
    '  return out;',
    '};',
  ].join('\n'));

  const src = (await readFile(resolve(jsDir, 'shell.js'), 'utf8'))
    .replace(/from\s*['"]\.\/render3d\.js['"]/, `from '${renderStubHref}'`)
    .replace(/from\s*['"]\.\/game\.js['"]/, `from '${gameWrapHref}'`)
    .replace(/from\s*['"]\.\/rope\.js['"]/, `from '${fileHref('rope.js')}'`)
    .replace(/from\s*['"]\.\/player\.js['"]/, `from '${fileHref('player.js')}'`)
    .replace(/import\(\s*['"]\.\/audio\.js['"]\s*\)/, `import('${audioWrapHref}')`);
  // A silently-unmatched replace would neuter a wrapper (e.g. leave the audio log
  // empty and 2d's pick assertion unfalsifiable). No relative specifier survives.
  for (const rel of ['./game.js', './rope.js', './player.js', './render3d.js', './audio.js']) {
    assert.ok(!src.includes(rel), `boot harness: ${rel} was not rewired — a drifted regex silently disables its wrapper`);
  }

  const restore = () => {
    delete globalThis.__parityScript;
    delete globalThis.__parityAudio;
    delete globalThis.__shellTestViews;
    globalThis.document = saved.document;
    globalThis.window = saved.window;
    globalThis.requestAnimationFrame = saved.requestAnimationFrame;
    globalThis.AudioContext = saved.AudioContext;
    globalThis.fetch = saved.fetch;
    if (saved.localStorage) {
      Object.defineProperty(globalThis, 'localStorage', saved.localStorage);
    } else {
      delete globalThis.localStorage;
    }
    console.error = saved.consoleError;
  };
  // A failed boot restores the globals before rethrowing (1.4 review lesson).
  try {
    await import('data:text/javascript,' + encodeURIComponent(`${src}\n//parity-boot ${++bootCount}`));
  } catch (err) {
    restore();
    throw err;
  }
  await settle();
  return { frames, handlers, hud, views, log, contexts, mq, canvas, window: windowStub, document: documentStub, map, restore };
}

// ---------- pumping helpers (polish.test.js idiom) ----------

function tick(env, st) {
  st.t += 50;
  if (env.clock) env.clock.t = st.t;
  env.frames.at(-1)(st.t);
}

function fireWindow(env, type, ev) {
  // dispatch EVERY registered handler — a forked per-state listener cannot hide
  // behind the last registration (story 1.5 review).
  assert.ok(env.handlers.window[type]?.length, `no '${type}' handler is registered — the hygiene path vanished`);
  for (const fn of env.handlers.window[type]) fn(ev);
}

function press(env) {
  fireWindow(env, 'keydown', { code: 'Space', repeat: false, preventDefault() {} });
}

function release(env) {
  fireWindow(env, 'keyup', { code: 'Space' });
}

function keydown(env, code) {
  fireWindow(env, 'keydown', { code, repeat: false, preventDefault() {} });
}

function emitMq(env, value) {
  env.mq.matches = value;
  env.mq.listeners.forEach((fn) => fn({ matches: value }));
}

function blur(env) { fireWindow(env, 'blur', undefined); }

function startRunning(env, st) {
  press(env);
  tick(env, st);
  assert.equal(env.views.at(-1).run.status, 'running', 'the opening Space tap started the run');
}

function waitGrounded(env, st) {
  let guard = 0;
  while (!env.views.at(-1).player.grounded && ++guard < 20) tick(env, st);
  assert.ok(env.views.at(-1).player.grounded, 'the lead-in jump landed');
}

// polish.test.js:698 cadence, widened for N=2: jumps in TWO windows per
// revolution ([0.20,0.28) and [0.72,0.80)) so the player is airborne above
// 18 u at BOTH k=0 (phase 0.45) and k=1 (phase 0.95) edges — two scored
// skips per revolution and no strip/blank cycle (a tripping edge re-arms a
// blank that eats the other edge's pass, freezing the skip count short of
// the 10th). ~5 revolutions to the offer, well inside the budget.
// Legs running multi-revolution cadences arm disarmOnStrip, so a strip is never
// healed by the wrapper and the never-died guard below is a real, reachable one.
function runToChoose(env, st) {
  let budget = 0;
  while (env.views.at(-1).run.status !== 'choose') {
    if (++budget > 1200) throw new Error('parity harness: "choose" never landed within the frame budget');
    const view = env.views.at(-1);
    assert.notEqual(view.run.status, 'over', 'parity harness: the scripted jumper never DIED');
    const p = view.rope.phase;
    if (view.player.grounded && ((p >= 0.2 && p < 0.28) || (p >= 0.72 && p < 0.8))) {
      press(env);
      tick(env, st);
      release(env);
      tick(env, st);
    } else {
      tick(env, st);
    }
  }
}

// ---------- Task 2a: blur mid-charge at ropes: 2 ----------

test('blur mid-charge at ropes: 2 fires the jump with the hold so far and the stale keyup adds no second jump — the shared releaseEverything, no N>=2 fork (AC1)', async () => {
  // Leg-local fake clock (2f pattern): "with the hold so far" is ONLY falsifiable
  // on a clock the leg controls — with the real clock every synchronous pump is a
  // ~0 s hold and any vy gate passes. An incidental grounded trip during the hold
  // stays wrapper-healed: 2a proves the release channel, not the health ledger.
  const saved = { performance: Object.getOwnPropertyDescriptor(globalThis, 'performance') };
  const clock = { t: 0 };
  Object.defineProperty(globalThis, 'performance', { value: { now: () => clock.t }, configurable: true });
  const env = await bootParityShell({ ropes: 2 });
  env.clock = clock;
  try {
    const st = { t: 0 };
    startRunning(env, st);
    waitGrounded(env, st);
    assert.equal(env.views.at(-1).run.ropes, 2, 'the run under test carries the multi-rope record');

    press(env);
    tick(env, st);
    assert.ok(env.views.at(-1).player.grounded, 'mid-charge: hold accumulating on the ground');

    for (let i = 0; i < 4; i++) tick(env, st); // 200 ms of frames while the hold matures — release must PRESERVE it
    blur(env);
    tick(env, st);
    const fired = env.views.at(-1).player;
    const expect = jumpVelocity(0.3); // press -> blur spans exactly 300 ms of leg clock
    assert.ok(!fired.grounded && fired.vy <= expect && fired.vy >= expect - GRAVITY * 0.05,
      `blur must launch through consumeIntents with the PARTIAL 0.3 s hold, got grounded=${fired.grounded} vy=${fired.vy}`);

    release(env); // the stale keyup an unfocused window eventually delivers
    const vys = [fired.vy];
    for (let i = 0; i < 3; i++) {
      tick(env, st);
      vys.push(env.views.at(-1).player.vy);
    }
    assert.ok(vys.every((v, i) => i === 0 || v < vys[i - 1]),
      `vy decays strictly after the blur-fired jump — no relaunch, got ${vys}`);
  } finally {
    env.restore();
    if (saved.performance) Object.defineProperty(globalThis, 'performance', saved.performance);
    else delete globalThis.performance;
  }
});

// ---------- Task 2b: hidden tab during an active i-frame blank ----------

test('hidden tab during an active i-frame blank: pause clears every intent, resume re-enters the lead-in, and ropes/iFrames ride the record spread — tripped-recovery is shell-invisible (AC1)', async () => {
  const env = await bootParityShell({ ropes: 2, iFrames: 3, disarmOnStrip: true });
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    for (let i = 0; i < 4; i++) tick(env, st); // through the blanked lead-in crossing
    const before = env.views.at(-1);
    assert.equal(before.run.status, 'running');
    assert.ok(before.run.iFrames > 0, 'the blank is ACTIVE when the tab hides');
    const iFrames0 = before.run.iFrames;
    const skips0 = before.run.skips;
    const phase0 = before.rope.phase;

    press(env); // an armed hold at the moment of focus loss
    env.document.hidden = true;
    env.handlers.window.visibilitychange.forEach((fn) => fn()); // releaseEverything + enterPause
    for (let i = 0; i < 2; i++) tick(env, st);
    assert.equal(env.views.at(-1).rope.phase, phase0, 'hidden run frozen');
    assert.match(env.hud['hud-prompt'].textContent, /paused — press P to resume/);

    env.document.hidden = false;
    env.handlers.window.visibilitychange.forEach((fn) => fn()); // pausedByVis auto-resume
    env.frames.at(-1)(st.t); // zero-delta resume snapshot
    const resumed = env.views.at(-1);
    assert.strictEqual(resumed.rope.phase, START_PHASE, 'resume re-enters the canonical lead-in');
    assert.ok(!resumed.player.grounded, 'the lead-in player is airborne');
    assert.strictEqual(resumed.player.vy, jumpVelocity(0.1), 'the one leadIn hold — no other launch path exists');
    assert.strictEqual(resumed.run.ropes, 2, 'ropes rides the resumeRun spread (game.js:44-46)');
    assert.strictEqual(resumed.run.iFrames, iFrames0, 'iFrames survives — the shell holds no tripped-recovery state to fork');
    assert.strictEqual(resumed.run.skips, skips0);

    press(env); // a press landing in the lead-in lock window...
    release(env);
    const vys = [resumed.player.vy];
    for (let i = 0; i < 6; i++) {
      tick(env, st);
      vys.push(env.views.at(-1).player.vy);
    }
    assert.ok(vys.every((v, i) => i === 0 || v < vys[i - 1]),
      `the cleared/locked intents fired nothing on resume — vy decays monotonically, got ${vys}`);

    // Sim-side belt: the spread carry is the sim's, not the wrapper's.
    assert.strictEqual(resumeRun({ ...createRun(), ropes: 2, iFrames: 3 }).run.iFrames, 3);
  } finally {
    env.restore();
  }
});

// ---------- Task 2c: pause -> resume at ropes: 2 ----------

test('pause to resume at ropes: 2 (P key) keeps score/skips/ropes/iFrames and re-enters the lead-in without fast-forward (AC1)', async () => {
  const env = await bootParityShell({ ropes: 2, iFrames: 2 });
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    tick(env, st);
    const before = env.views.at(-1);
    const score0 = before.run.score;
    const skips0 = before.run.skips;
    const ropes0 = before.run.ropes;
    const iFrames0 = before.run.iFrames;
    assert.equal(ropes0, 2);
    const phase0 = before.rope.phase;

    keydown(env, 'KeyP');
    st.t += 5000; // one 5000-ms paused frame
    env.frames.at(-1)(st.t);
    assert.strictEqual(env.views.at(-1).rope.phase, phase0, 'the paused frame carries zero sim time (Pitfall 1)');

    keydown(env, 'KeyP'); // resume through resumeRun
    env.frames.at(-1)(st.t); // zero-delta snapshot
    const resumed = env.views.at(-1);
    assert.strictEqual(resumed.rope.phase, START_PHASE, 'resume lands at the START_PHASE lead-in');
    assert.strictEqual(resumed.run.score, score0, 'score survives (resumeRun, not startRun)');
    assert.strictEqual(resumed.run.skips, skips0);
    assert.strictEqual(resumed.run.ropes, ropes0);
    assert.strictEqual(resumed.run.iFrames, iFrames0, 'the i-frame blank survives a manual pause at N=2');
    assert.strictEqual(resumed.run.status, 'running');

    tick(env, st); // one pumped 50-ms frame post-resume
    const phase = env.views.at(-1).rope.phase;
    assert.ok(phase >= START_PHASE && phase - START_PHASE <= 0.05 / ROPE_PERIOD + 1e-9,
      `no lead-in fast-forward at N=2, got phase ${phase}`);
  } finally {
    env.restore();
  }
});

// ---------- Task 2d: blur mid card-hold at ropes: 2 ----------

test('blur mid card-hold at ropes: 2 cancels cleanly — no pick, the offer stays listed, ropes unchanged (AC1)', async () => {
  const env = await bootParityShell({ ropes: 2, disarmOnStrip: true });
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    runToChoose(env, st);
    assert.strictEqual(env.views.at(-1).run.status, 'choose');
    assert.strictEqual(env.views.at(-1).run.ropes, 2, 'the choose-status record carries the rope count');

    env.handlers.canvas.pointerdown.forEach((fn) => fn({ pointerId: 1 })); // cycles the cursor, re-arms the hold
    tick(env, st);
    assert.match(env.hud['hud-prompt'].textContent, /\[[-#]+\]/, 'the fill cue is live');

    blur(env);
    tick(env, st);
    const prompt = env.hud['hud-prompt'].textContent;
    assert.ok(!prompt.includes('['), 'the fill cue is gone — cancelled, not carried');
    assert.match(prompt, /^> /m, 'the offer prompt still lists the offer');
    for (let i = 0; i < 4; i++) tick(env, st);
    assert.strictEqual(env.views.at(-1).run.status, 'choose', 'nothing confirmed across the blur');
    assert.strictEqual(env.views.at(-1).run.ropes, 2, 'choose froze stepping — the record is untouched');
    assert.ok(!env.log.voices.includes('pick'), 'the audio log shows no pick event');
  } finally {
    env.restore();
  }
});

// ---------- Task 2e: blur on the over screen, under the rope system ----------

test('blur on the game-over screen restarts nothing after the full rope lifecycle — strip, blank, last-rope death (T-05-07 re-proven, AC1)', async () => {
  const env = await bootParityShell({ ropes: 2, disarmOnStrip: true });
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    let guard = 0; // never jump: strip at the first grounded crossing, die on the last rope's
    while (env.views.at(-1).run.status === 'running' && ++guard < 90) tick(env, st);
    assert.strictEqual(env.views.at(-1).run.status, 'over',
      'the rope system ran its course: strip -> blank -> last-rope death');
    assert.strictEqual(env.views.at(-1).run.ropes, 1, 'the death was earned on the LAST rope');
    const phase0 = env.views.at(-1).rope.phase;

    blur(env);
    for (let i = 0; i < 3; i++) tick(env, st);
    assert.strictEqual(env.views.at(-1).run.status, 'over',
      'focus loss on a dead run starts no new run (the release-restart branch stays unarmed)');
    assert.strictEqual(env.views.at(-1).rope.phase, phase0, 'the game-over rope stays still');
    assert.match(env.hud['hud-prompt'].textContent, /^Missed!/, 'the game-over prompt is untouched');
  } finally {
    env.restore();
  }
});

// ---------- Task 2f: reduced-motion sim parity ----------

test('reduced motion is a view-payload cosmetic flag only: the identical scripted session yields deep-equal score/skips/phase trajectories at ropes: 2 (AC4)', async () => {
  // The shell consults performance.now for the D-07 lock and hold maths, and
  // its `last` stamps at boot — so a dual-boot on the real clock diverges by
  // the boot skew. This leg alone swaps in a deterministic clock so the two
  // sessions drain identical dt sequences; every other leg keeps the real one.
  async function session(reduced) {
    const saved = {
      performance: Object.getOwnPropertyDescriptor(globalThis, 'performance'),
    };
    const clock = { t: 0 };
    Object.defineProperty(globalThis, 'performance', {
      value: { now: () => clock.t }, configurable: true,
    });
    try {
      const env = await bootParityShell({ ropes: 2, disarmOnStrip: true });
      try {
        if (reduced) emitMq(env, true); // the whole session runs calm
        const st = { t: 0 };
        press(env); // the first frame starts the run under the shared clock
        const traj = [];
        for (let i = 0; i < 48; i++) {
          st.t += 50;
          clock.t = st.t;
          env.frames.at(-1)(st.t);
          const v = env.views.at(-1);
          traj.push([v.run.score, v.run.skips, v.rope.phase]);
        }
        return {
          traj,
          status: env.views.at(-1).run.status,
          flags: new Set(env.views.map((v) => v.reducedMotion)),
        };
      } finally {
        env.restore();
      }
    } finally {
      if (saved.performance) Object.defineProperty(globalThis, 'performance', saved.performance);
      else delete globalThis.performance;
    }
  }
  const full = await session(false);
  const calm = await session(true);
  assert.equal(calm.status, 'running');
  assert.deepEqual(calm.traj, full.traj,
    'the SIM channel is byte-identical under reduced motion — rope timing untouched (FR23)');
  assert.ok(full.traj.some(([score]) => score > 0), 'the scripted session actually scored');
  assert.ok(full.traj.some(([,, phase], i) => i > 0 && phase < full.traj[i - 1][2]),
    'the session crossed a clock wrap — real revolutions were compared, not a frozen frame');
  assert.deepEqual([...full.flags], [false], 'the loud session carried reducedMotion false');
  assert.deepEqual([...calm.flags], [true], 'the calm session carried reducedMotion true — the ONLY payload delta');
});
