import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createAudio } from '../js/audio.js';
import * as game from '../js/game.js';
import { mulberry32 } from './support/balance-harness.js';

// Story 5.2 (FR28/FR27, NFR4/NFR8): the rope-loss thud & last-rope tension.
// Product delta is exactly two files: js/audio.js (VOICES gains `ropeLost`; a
// tension closure state + `setRopes` on the return object; the `skip` entry
// becomes the tension-dispatching voice) and js/shell.js (the JUICE_TIERS
// `ropeLost` row + ONE `audio?.setRopes?.(held)` call in updateHud's pip-
// signature block). Part A: unit legs on the leaf module (recording-context
// copy per the ascentstinger :106-188 rationale — copied HERE, never imported
// from the frozen suite), the derived eight-name distinctness oracle (the
// five-voice 'noise'-tag trap: trip is noiseHit, so a noise-based thud would
// share its single tag — the ratified thud is oscillator-only, Decisions #1),
// and sim-derived channel-truth legs on the REAL game.js arms (steelcord :88 /
// nearmiss :103 donors — NO new event names, zero js/game.js delta). Part B:
// module tension-state legs + booted-shell legs (bootStingerShell donor copy
// with three documented deltas: the hud map GAINS 'hud-ropes' — a replaceChildren
// span per ropehud.test.js:33-38, because the pip-signature block is the seam
// and DOM-less 4-key harnesses can never reach tension (v1parity-immunity BY
// CONSTRUCTION); the game-wrap stamp donor generalized to a patch LIST; the
// audio wrapper also logs setRopes). ≤3 boots total (NFR4): 1 seam boot + the
// 2-boot juice-conservation A/B (juice.test.js :170-200 idiom: hitstop 65 vs 0,
// identical phase sequence, conserved total steps, freeze window only with the row).
// Direct '../js/game.js' import precedented by ascentstinger.test.js:5 /
// summitapproach.test.js:9 — the boundary graph gains no new node.

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');
const fileHref = name => pathToFileURL(resolve(jsDir, name)).href;
const settle = () => new Promise(r => setTimeout(r, 0));
let bootCount = 0;

const sourceOf = name => readFile(resolve(jsDir, name), 'utf8');

const noStorage = { getItem: () => null, setItem: () => {} };

// ---------- Recording-context copy (ascentstinger.test.js:110-188) ----------
// oscillators log `osc:<type>:<f0>`; buffer-source starts log the SINGLE
// 'noise' tag — that coarseness is the trap this suite's oscillator-only
// material walks around, and the mutation-proof below re-arms.

function makeRecordingContext(sampleRate = 8000) {
  const ctx = {
    state: 'suspended',
    currentTime: 0,
    sampleRate,
    destination: { name: 'destination' },
    voiceLog: [],
    schedLog: [],
    gainNodes: [],
    bufferSources: [],
    buffers: [],
    resumes: 0,
  };
  ctx.resume = () => { ctx.state = 'running'; ctx.resumes += 1; };
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
    ctx.gainNodes.push(rec);
    return rec;
  };
  ctx.createOscillator = () => {
    const rec = {
      type: '',
      connectedTo: null,
      frequency: {
        _f0: 0,
        setValueAtTime(v) { rec.frequency._f0 = v; },
        linearRampToValueAtTime() {},
        exponentialRampToValueAtTime() {},
      },
      connect(t) { rec.connectedTo = t; },
      start(t) {
        const sig = `osc:${rec.type}:${rec.frequency._f0}`;
        ctx.voiceLog.push(sig);
        ctx.schedLog.push({ sig, t: t ?? 0 });
      },
      stop() {},
    };
    return rec;
  };
  ctx.createBufferSource = () => {
    const rec = {
      buffer: null,
      loop: false,
      connectedTo: null,
      connect(t) { rec.connectedTo = t; },
      start() { ctx.voiceLog.push(rec.buffer && rec.buffer.__noise ? 'noise' : 'track'); },
      stop() {},
    };
    ctx.bufferSources.push(rec);
    return rec;
  };
  ctx.createBuffer = (ch, length, rate) => {
    const data = new Float32Array(length);
    const buf = {
      length,
      sampleRate: rate,
      __noise: length === Math.floor(0.25 * rate),
      getChannelData: () => data,
    };
    ctx.buffers.push(buf);
    return buf;
  };
  ctx.createBiquadFilter = () => ({
    type: '',
    frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
    connect() {},
  });
  ctx.decodeAudioData = async buf => buf;
  return ctx;
}

const intersect = (x, y) => [...x].filter(s => y.has(s));

// The eight-name derivation (Task 1b: "derive all eight names from the shipped
// module", the ceilingbreak §6 :512-515 source-literal idiom). The 5.1 oracle
// loops a FIXED seven-name list — honest but incomplete once VOICES grows;
// THIS suite derives, so the census fence can never be vacuous here.
async function derivedVoiceNames() {
  const src = await sourceOf('audio.js');
  const m = src.match(/const VOICES = \{([\s\S]*?)\n  \};/);
  assert.ok(m, 'the VOICES literal is present in js/audio.js');
  return [...m[1].matchAll(/^\s*(\w+):/gm)].map(x => x[1]).sort();
}

function voiceSets(names, arm = null) {
  const ctx = makeRecordingContext();
  const audio = createAudio({ storage: noStorage });
  audio.gesture(ctx);
  if (arm !== null) audio.setRopes(arm);
  const out = {};
  for (const name of names) {
    const before = ctx.voiceLog.length;
    audio.handleEvent(name);
    out[name] = new Set(ctx.voiceLog.slice(before));
  }
  return { ctx, sets: out };
}

// ---------- Trip-rig channel-truth donors (steelcord :29-32 / nearmiss :102) ----------
// period 1 at dt 1/60, phase 0.44 rising edge, grounded player — inline copies;
// frozen files are never imported.
const DT = 1 / 60;
const grounded = { y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 };
const failingTick = (run, press = null) =>
  game.tickRun(run, { phase: 0.44, period: 1 }, grounded, DT, undefined, press);

// ---------- Part A, Task 1a: material legs ----------

test('ropeLost post-gesture starts EXACTLY ONE oscillator on the master bus (AC1)', () => {
  const ctx = makeRecordingContext();
  const audio = createAudio({ storage: noStorage });
  audio.gesture(ctx);
  const master = ctx.gainNodes[0];
  const before = ctx.voiceLog.length;
  audio.handleEvent('ropeLost');
  assert.equal(ctx.voiceLog.length - before, 1,
    'the thud is ONE sub-bass note — bounded to 1 so a bloated or swapped voice goes red');
  for (const g of ctx.gainNodes.slice(1)) {
    assert.equal(g.connectedTo, master, 'the voice envelope rides the ONE master gain (FR27)');
  }
});

test('ropeLost BEFORE gesture: no error, no queued blast on unlock (AC3, NFR5)', () => {
  const audio = createAudio({ storage: noStorage });
  const ctx = makeRecordingContext();
  audio.handleEvent('ropeLost'); // a strip before the first press: silent, never a throw
  assert.equal(ctx.voiceLog.length, 0, 'nothing may start while the context is un-born');
  audio.gesture(ctx);
  assert.equal(ctx.voiceLog.length, 0, 'the unlock must not flush a queued thud — the drop is by state');
});

// ---------- Part A, Task 1b: derived distinctness oracle legs ----------

test('oracle: the ropeLost signature set is non-empty and disjoint with all seven other voices — trip included (AC1 terminal-variant fence)', async () => {
  const names = await derivedVoiceNames();
  assert.deepEqual(names, ['ascend', 'jump', 'nearMiss', 'pick', 'ropeLost', 'skip', 'trip', 'win'],
    'the eight derived names (red by design until the voice ships — five in Task 2 R1)');
  const { sets } = voiceSets(names);
  assert.ok(sets.ropeLost.size >= 1, 'the thud must derive at least one signature (red until the voice ships)');
  // The terminal-variant leg FIRST: ropeLost ∩ trip empty IS the "distinct
  // terminal variant" fence — and the noise trap: a noiseHit thud would share
  // trip's single 'noise' tag and die here.
  assert.deepEqual(intersect(sets.ropeLost, sets.trip), [],
    'the strip thud and the last-rope crash share NO material — two disjoint variants of one moment');
  for (const other of names.filter(n => n !== 'ropeLost')) {
    assert.deepEqual(intersect(sets.ropeLost, sets[other]), [],
      `the ropeLost thud must share no (type,freq) signature with ${other}`);
  }
});

test('oracle: every ropeLost f0 sits under the shipped mix\'s lowest pitch (< 196 Hz) (AC1 register)', async () => {
  const names = await derivedVoiceNames();
  const { sets } = voiceSets(names);
  const f0s = [...sets.ropeLost].filter(s => s.startsWith('osc:')).map(s => parseFloat(s.split(':')[2]));
  assert.ok(f0s.length >= 1, 'the thud must start at least one oscillator (red until the voice ships)');
  for (const f of f0s) {
    assert.ok(f < 196, `thud f0 ${f} must sit below win's 196 — the sub-bass register fence (a raised thud reds here)`);
  }
});

test('oracle: the baseline skip set is exactly {osc:triangle:660} while tension is unarmed (Decision #4 byte-identity)', async () => {
  const names = await derivedVoiceNames();
  const { sets } = voiceSets(names); // no arm: the shipped default state
  assert.deepEqual([...sets.skip], ['osc:triangle:660'],
    'unarmed, the tick is the shipped single 660 — the tension variant is state-gated, never ambient');
});

// ---------- Part A, Task 1c: channel-truth legs (≤4 tickRun calls) ----------

test('channel truth: a strip tick with ropes > 1 emits exactly ["ropeLost"] (AC1 feed)', () => {
  const out = failingTick({ ...game.createRun(), ropes: 2, streak: 2 });
  assert.deepEqual(out.events, ['ropeLost'], 'the strip arm is the ONLY ropeLost source (game.js:243)');
  assert.equal(out.run.ropes, 1, 'one rope stripped');
  assert.equal(out.run.status, 'running', 'a strip is not death');
});

test('channel truth: a charged tick emits ["chargeUsed"] and NO ropeLost/trip (AC1 "not a charge")', () => {
  const out = failingTick({ ...game.createRun(), ropes: 2, charged: 1 });
  assert.deepEqual(out.events, ['chargeUsed'], 'armor eats the hit on its own name (steelcord :88 donor)');
  assert.equal(out.run.ropes, 2, 'a charge trip NEVER strips');
});

test('channel truth: a buffer mercy-save emits exactly ["skip","nearMiss"] — no thud on the mercy path (AC1)', () => {
  const out = failingTick({ ...game.createRun(), ropes: 2, buffer: game.BUFFER_SEC }, true);
  assert.deepEqual(out.events, ['skip', 'nearMiss'], 'the mercy branch pushes only skip+nearMiss (game.js:205-214) — a refactor leaking ropeLost here reds');
  assert.equal(out.run.ropes, 2, 'a mercy save NEVER strips');
});

test('channel truth: the last rope tick emits ["trip"] with status over — the terminal variant is the CHANNEL (AC1, Decision #2)', () => {
  const out = failingTick({ ...game.createRun(), ropes: 1 });
  assert.deepEqual(out.events, ['trip'], 'ropeCount === 1 resolves on the shipped trip name (game.js:252) — no fake terminal-ropeLost state');
  assert.equal(out.run.status, 'over', 'the last rope is death');
});

// ---------- Part A, Task 1d: mute leg (AC3) ----------

test('muted ropeLost routes through the zeroed master without error (FR27 leg)', () => {
  const ctx = makeRecordingContext();
  const audio = createAudio({ storage: noStorage });
  audio.gesture(ctx);
  audio.setMuted(true);
  assert.equal(ctx.gainNodes[0].gain.value, 0, 'mute zeroes the master gain');
  const before = ctx.voiceLog.length;
  audio.handleEvent('ropeLost');
  assert.ok(ctx.voiceLog.length - before >= 1, 'the thud still schedules (routing intact) — silence is the bus');
  for (const g of ctx.gainNodes.slice(1)) {
    assert.equal(g.connectedTo, ctx.gainNodes[0], 'persisted-state silence rides the ONE master (FR27)');
  }
});

// ---------- Part B, Task 1e: tension state legs ----------

test('setRopes(1) arms the taut double-tick: skip starts {660,1320} staggered (AC2, Decision #4)', () => {
  const ctx = makeRecordingContext();
  const audio = createAudio({ storage: noStorage });
  audio.gesture(ctx);
  audio.setRopes(1);
  const before = ctx.schedLog.length;
  audio.handleEvent('skip');
  const sched = ctx.schedLog.slice(before);
  assert.deepEqual(sched.map(e => e.sig).sort(), ['osc:triangle:1320', 'osc:triangle:660'],
    'the tick gains its taut harmonic under tension (red by design until the variant ships)');
  assert.ok(sched[1].t > sched[0].t, 'the double-tick is staggered (nearMiss/pick precedent)');
});

test('oracle: the tension variant is disjoint with the seven other voices\' baseline sets (1320 is free material)', async () => {
  const names = await derivedVoiceNames();
  const base = voiceSets(names).sets;
  const tension = voiceSets(['skip'], 1).sets.skip;
  assert.ok(tension.size >= 2, 'the armed tick must carry the variant (red until it ships)');
  for (const other of names.filter(n => n !== 'skip')) {
    assert.deepEqual(intersect(tension, base[other]), [],
      `the tension tick must share no signature with ${other} — 1320 belongs to nothing else`);
  }
});

test('Spare Rope reverses: setRopes(2) / setRopes(5) after 1 disarms the variant (AC2 reversal)', () => {
  const ctx = makeRecordingContext();
  const audio = createAudio({ storage: noStorage });
  audio.gesture(ctx);
  audio.setRopes(1);
  audio.setRopes(2);
  let before = ctx.voiceLog.length;
  audio.handleEvent('skip');
  assert.deepEqual(ctx.voiceLog.slice(before), ['osc:triangle:660'], 'regained ropes restore the baseline tick');
  audio.setRopes(1);
  audio.setRopes(5);
  before = ctx.voiceLog.length;
  audio.handleEvent('skip');
  assert.deepEqual(ctx.voiceLog.slice(before), ['osc:triangle:660'], 'any held count other than 1 is disarmed');
});

test('setRopes is state-only: zero node churn pre- AND post-gesture, nothing queues (NFR8, Decisions #3)', () => {
  const ctx = makeRecordingContext();
  const audio = createAudio({ storage: noStorage });
  audio.setRopes(1); // pre-init: the play() :174 state-guard idiom as a setter
  assert.equal(ctx.voiceLog.length, 0, 'setRopes pre-gesture touches no nodes');
  audio.gesture(ctx);
  assert.equal(ctx.voiceLog.length, 0, 'arming pre-gesture must not queue a blast for the unlock');
  audio.setRopes(2);
  audio.setRopes(1);
  assert.equal(ctx.voiceLog.length, 0, 'setRopes ALONE starts nothing in any state');
  audio.handleEvent('skip');
  assert.ok(ctx.voiceLog.length >= 1, 'the state lands only when an event plays it');
});

// ---------- Part B, Task 1f: booted-shell legs (≤3 boots, NFR4) ----------

async function bootRopeShell() {
  const frames = [];
  const handlers = { window: {}, canvas: {} };
  const hud = {
    'hud-score': { textContent: '' },
    'hud-best': { textContent: '' },
    'hud-prompt': { textContent: '' },
    'hud-owned': { textContent: '' },
    // DELTA 1 on the frozen 4-key donor maps: the pip element EXISTS here —
    // the seam lives in the pip-signature block, and the 4-key harnesses
    // prove (v1parity immunity) only in its documented absence (story :96).
    'hud-ropes': {
      textContent: '',
      kids: undefined,
      calls: 0,
      replaceChildren(...kids) { this.calls += 1; this.kids = kids; },
    },
  };
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    addEventListener: (type, fn) => { handlers.canvas[type] = fn; },
  };
  const views = [];
  globalThis.__rlViews = views;
  const log = { voices: [], ropes: [] };
  globalThis.__rlAudioLog = log;
  const script = { n: 0, patches: [], events: [] };
  globalThis.__rlScript = script;
  const contexts = [];
  const map = new Map();
  const storageStub = {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, v); },
  };
  const clock = { t: 0 };

  const saved = {
    document: globalThis.document,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    performance: globalThis.performance,
    MathRandom: Math.random,
    fetch: globalThis.fetch,
    AudioContext: globalThis.AudioContext,
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    consoleError: console.error,
  };
  // createElement joins the stub (ceilingmarker makeDom lane): the pip
  // builder calls document.createElement on every signature flip — without
  // it updateHud throws INSIDE frame()'s try and the view silently goes
  // stale (a harness artifact, not a product fact).
  globalThis.document = {
    hidden: false,
    getElementById: id => (id === 'game' ? canvas : hud[id]),
    createElement: tag => ({ tag, className: '', textContent: '' }),
  };
  globalThis.window = { addEventListener: (type, fn) => { handlers.window[type] = fn; } };
  globalThis.requestAnimationFrame = cb => { frames.push(cb); return frames.length; };
  Object.defineProperty(globalThis, 'localStorage', { value: storageStub, configurable: true });
  globalThis.performance = { now: () => clock.t };
  Math.random = mulberry32(12345); // shell binds rng = Math.random at boot
  globalThis.AudioContext = function StubAudioContext() {
    const ctx = makeRecordingContext();
    contexts.push(ctx);
    return ctx;
  };
  globalThis.fetch = () => Promise.reject(new Error('no track in the sandbox'));
  console.error = () => {};

  const renderStubHref = 'data:text/javascript,' + encodeURIComponent([
    'export function createScene() {',
    '  return { render(view) { globalThis.__rlViews.push(view); } };',
    '}',
  ].join('\n'));

  // DELTA 2: the stamp donor (ceilingmarker/ceilingbreak idiom) generalized
  // to a patch LIST — each { at, run } patches the INPUT run of the Nth
  // tickRun call ONCE, so the REAL strip arm fires inside the REAL drain.
  const gameWrapHref = 'data:text/javascript,' + encodeURIComponent([
    `export * from "${fileHref('game.js')}";`,
    'import * as real from "' + fileHref('game.js') + '";',
    'export const tickRun = (...args) => {',
    '  const s = globalThis.__rlScript;',
    '  s.n += 1;',
    '  for (const p of s.patches) {',
    '    if (!p.done && s.n === p.at) { p.done = true; args = [{ ...args[0], ...p.run }, ...args.slice(1)]; }',
    '  }',
    '  const out = real.tickRun(...args);',
    '  s.events.push(...(out.events ?? []));',
    '  return out;',
    '};',
  ].join('\n'));

  // DELTA 3: the audio wrapper (polish :183-196 donor) also logs setRopes —
  // optional-chained INTO so the RED phase fails on the log, not a throw.
  const audioWrapHref = 'data:text/javascript,' + encodeURIComponent([
    'import * as real from "' + fileHref('audio.js') + '";',
    'export function createAudio(opts) {',
    '  const a = real.createAudio(opts);',
    '  const log = globalThis.__rlAudioLog;',
    '  return Object.assign({}, a, {',
    '    handleEvent(name) { log.voices.push(name); return a.handleEvent(name); },',
    '    setRopes(h) { log.ropes.push(h); return a.setRopes?.(h); },',
    '  });',
    '}',
    'export const loadSettings = real.loadSettings;',
    'export const saveSettings = real.saveSettings;',
  ].join('\n'));

  const src = (await readFile(resolve(jsDir, 'shell.js'), 'utf8'))
    .replace(/from\s*['"]\.\/render3d\.js['"]/, `from '${renderStubHref}'`)
    .replace(/from\s*['"]\.\/game\.js['"]/, `from '${gameWrapHref}'`)
    .replace(/from\s*['"]\.\/rope\.js['"]/, `from '${fileHref('rope.js')}'`)
    .replace(/from\s*['"]\.\/player\.js['"]/, `from '${fileHref('player.js')}'`)
    .replace(/import\(\s*['"]\.\/audio\.js['"]\s*\)/, `import('${audioWrapHref}')`);

  const mod = await import('data:text/javascript,' + encodeURIComponent(`${src}\n//ropelossthud-boot ${++bootCount}`));
  await settle(); // the shell's dynamic audio import lands one microtask later
  const restore = () => {
    globalThis.document = saved.document;
    globalThis.window = saved.window;
    globalThis.requestAnimationFrame = saved.requestAnimationFrame;
    globalThis.performance = saved.performance;
    Math.random = saved.MathRandom;
    globalThis.fetch = saved.fetch;
    globalThis.AudioContext = saved.AudioContext;
    if (saved.localStorage) {
      Object.defineProperty(globalThis, 'localStorage', saved.localStorage);
    } else {
      delete globalThis.localStorage;
    }
    delete globalThis.__rlViews;
    delete globalThis.__rlAudioLog;
    delete globalThis.__rlScript;
    console.error = saved.consoleError;
  };
  return { mod, frames, handlers, hud, views, log, script, contexts, clock, restore };
}

function pump(env, ms = 4) {
  env.clock.t += ms;
  env.frames.at(-1)(env.clock.t);
}

function press(env) {
  env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
}

// Unwrapped per-frame phase deltas (juice.test.js:113-116 verbatim idiom —
// phase advances < 0.02 per step, so the half-open wrap correction is exact).
function deltas(phases) {
  return phases.map((p, i) => i === 0 ? 0 : (p - phases[i - 1] + 1.5) % 1 - 0.5);
}

// One scripted boot (juice recordTimeline donor): start press, then 4 ms fake
// strides. The tick-5 stamp {ropes:2, buffer:0, charged:0} arms the STRIP
// branch of the first no-press crossing (the REAL ropeLost arm, no fake state);
// the run never ends inside the window (blank + ~1 rev of slack after F).
async function recordStrip({ hitstop }) {
  const env = await bootRopeShell();
  try {
    assert.ok(env.mod.JUICE_TIERS.ropeLost,
      'the ropeLost JUICE_TIERS row must exist to A/B (red by design until the row ships)');
    env.mod.JUICE_TIERS.ropeLost.hitstop = hitstop;
    env.script.patches.push({ at: 5, run: { ropes: 2, buffer: 0, charged: 0 } });
    press(env);
    pump(env);
    const phases = [];
    let F = -1;
    for (let g = 0; g < 1600; g++) {
      pump(env);
      const v = env.views.at(-1);
      if (F < 0 && env.script.events.includes('ropeLost')) F = phases.length;
      phases.push(v.rope.phase);
      if (F >= 0 && phases.length >= F + 45) break;
      assert.notEqual(v.run.status, 'over', 'strip harness: the run died before the strip — the scripted boot went wrong');
    }
    assert.notEqual(F, -1, 'strip harness: no ropeLost ever reached the sim (the stamp never armed a strip)');
    return { phases, d: deltas(phases), F };
  } finally {
    env.restore();
  }
}

test('booted shell: a real strip cascade drains ropeLost to handleEvent, flips setRopes once per held change, and carries the seeded juice row (AC2 seam, R3)', async () => {
  const env = await bootRopeShell();
  try {
    env.script.patches.push({ at: 5, run: { ropes: 2, buffer: 0, charged: 0 } });
    press(env);
    pump(env);
    let guard = 0;
    while (!env.log.voices.includes('ropeLost') && guard++ < 1600) {
      pump(env);
      assert.notEqual(env.views.at(-1).run.status, 'over', 'harness: the cascade tripped before stripping');
    }
    assert.ok(env.log.voices.includes('ropeLost'), 'the REAL strip arm reaches audio.handleEvent through the D-N02 drain');
    assert.equal(env.views.at(-1).run.ropes, 1, 'the cascade stripped down to one rope');
    assert.equal(env.views.at(-1).run.status, 'running', 'the strip itself is not death');
    // resetPips() clears the signature on every new-run path (story :95), so
    // the start press re-fires setRopes(1) once at the idle→running flip: the
    // honest once-per-change shape is idle 1 → run-start 1 → stamp 2 → strip 1.
    assert.deepEqual(env.log.ropes, [1, 1, 2, 1],
      'setRopes fired EXACTLY once per held-count change (plus the sanctioned resetPips run-start re-fire); red until the call site ships');
    assert.deepEqual(env.mod.JUICE_TIERS.ropeLost, { hitstop: 65, shake: 1.9, particles: 14 },
      'the R3 juice row carries the D-N12 seed between ascend and trip (red until the row ships)');

    // Spare Rope reversal AT THE SEAM: a later stamp restores held 2 — the
    // sig flip must re-fire setRopes(2) (card semantics frozen at
    // simpleeffects.test.js:54; the seam only mirrors the count).
    env.script.patches.push({ at: env.script.n + 2, run: { ropes: 2 } });
    // The strip armed a 65 ms freeze — pump PAST it (a bare 15-frame stride
    // sits entirely inside the deadline; the drain delays, never drops).
    for (let k = 0; k < 60 && env.log.ropes.length < 5; k++) pump(env);
    assert.deepEqual(env.log.ropes, [1, 1, 2, 1, 2], 'regained ropes reverse the treatment through the same seam');
    for (let i = 3; i < env.log.ropes.length; i++) {
      assert.notEqual(env.log.ropes[i], env.log.ropes[i - 1], 'no re-fire without a held change (past the run-start pair)');
    }
  } finally {
    env.restore();
  }
});

test('NFR8 A/B: the ropeLost hitstop delays, never drops — identical phase sequence, conserved total steps, freeze window only with the row', async () => {
  const ctrl = await recordStrip({ hitstop: 0 });
  const juice = await recordStrip({ hitstop: 65 });
  assert.equal(juice.F, ctrl.F,
    'both boots fire the strip on the same frame — identical deterministic step schedule');
  const F = juice.F;
  // 65 ms of 4 ms strides: frames F+1..F+16 sit inside the deadline.
  for (let i = 1; i <= 16; i++) {
    assert.equal(juice.d[F + i], 0,
      `frame F+${i} sits inside the 65 ms freeze — the sim must not advance there`);
  }
  const window_ = ctrl.d.slice(F + 1, F + 17);
  assert.ok(window_.some(x => x > 0),
    'the unjuiced control advances somewhere in the frozen window (otherwise the A/B proves nothing)');
  // Conservation: the held steps drain the frame the deadline passes (F+17),
  // so from F+18 on both boots execute the IDENTICAL step sequence.
  assert.deepEqual(juice.d.slice(F + 18), ctrl.d.slice(F + 18),
    'post-catch-up frames step in lockstep with the control — the freeze delays, never drops (NFR8)');
  const sum = arr => arr.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum(juice.d.slice(F + 1, F + 41)) - sum(ctrl.d.slice(F + 1, F + 41))) < 1e-12,
    'total phase advance across the window must match the control — steps were deferred, not scheduled away');
});
