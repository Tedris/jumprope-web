import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { START_PHASE } from '../js/game.js';

// Plan 05-01 (UI-01): the pause/resume lifecycle over the REAL js/shell.js,
// booted through a bootAudioShell harness copy (tests/audio.test.js Part B
// precedent): data-URL source rewrite with a unique trailer, the dynamic
// './audio.js' specifier replaced by a wrapper that logs gesture()/suspend()
// calls, a stub AudioContext with a symmetric suspend leg, plus the harness
// gains this phase requires — canvas.style and document.hidden (RESEARCH
// Pitfall 5). No static specifier into js/shell.js: the ARCH-01 graph walk
// would reach render3d -> three (boundary.test.js), so shell is only ever
// exercised through this rewritten boot.

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');

// ---------- stubs ----------

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
  ctx.decodeAudioData = async buf => buf;
  return ctx;
}

const settle = () => new Promise(r => setTimeout(r, 0));

let bootCount = 0;

async function bootPolishShell() {
  const frames = [];
  const handlers = { window: {}, canvas: {} };
  const hud = {
    'hud-score': { textContent: '' },
    'hud-best': { textContent: '' },
    'hud-prompt': { textContent: '' },
    'hud-owned': { textContent: '' }
  };
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    addEventListener: (type, fn) => { handlers.canvas[type] = fn; }
  };
  const documentStub = {
    hidden: false,
    getElementById: id => (id === 'game' ? canvas : hud[id])
  };
  const views = [];
  globalThis.__shellTestViews = views;
  // Wrapper-visible call log: every gesture()/suspend()/handleEvent() the
  // shell routes through the audio seam, plus the live ctx stubs.
  const log = { voices: [], suspends: 0, gestures: 0 };
  globalThis.__polishAudio = log;
  const contexts = [];
  const map = new Map();
  const storageStub = {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, v); },
  };

  const saved = {
    document: globalThis.document,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    AudioContext: globalThis.AudioContext,
    fetch: globalThis.fetch,
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    consoleError: console.error
  };
  globalThis.document = documentStub;
  globalThis.window = {
    addEventListener: (type, fn) => { handlers.window[type] = fn; }
  };
  globalThis.requestAnimationFrame = cb => { frames.push(cb); return frames.length; };
  Object.defineProperty(globalThis, 'localStorage', {
    value: storageStub, configurable: true
  });
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
    '}'
  ].join('\n'));

  const fileHref = name => pathToFileURL(resolve(jsDir, name)).href;
  // Wrapper over the REAL js/audio.js: same surface, plus the call log. The
  // suspend leg optional-chains a.suspend?.() so the boot never depends on
  // the shipped surface already carrying it.
  const audioWrapHref = 'data:text/javascript,' + encodeURIComponent([
    'import * as real from "' + fileHref('audio.js') + '";',
    'export function createAudio(opts) {',
    '  const a = real.createAudio(opts);',
    '  const log = globalThis.__polishAudio;',
    '  return Object.assign({}, a, {',
    '    handleEvent(name) { log.voices.push(name); return a.handleEvent(name); },',
    '    gesture(...args) { log.gestures++; return a.gesture(...args); },',
    '    suspend(...args) { log.suspends++; return a.suspend?.(...args); },',
    '  });',
    '}',
    'export const loadSettings = real.loadSettings;',
    'export const saveSettings = real.saveSettings;',
  ].join('\n'));

  const src = (await readFile(resolve(jsDir, 'shell.js'), 'utf8'))
    .replace(/from\s*['"]\.\/render3d\.js['"]/, `from '${renderStubHref}'`)
    .replace(/from\s*['"]\.\/game\.js['"]/, `from '${fileHref('game.js')}'`)
    .replace(/from\s*['"]\.\/rope\.js['"]/, `from '${fileHref('rope.js')}'`)
    .replace(/from\s*['"]\.\/player\.js['"]/, `from '${fileHref('player.js')}'`)
    .replace(/import\(\s*['"]\.\/audio\.js['"]\s*\)/, `import('${audioWrapHref}')`);

  await import('data:text/javascript,' + encodeURIComponent(`${src}\n//polish-boot ${++bootCount}`));
  await settle(); // the shell's dynamic audio import lands one microtask later

  const restore = () => {
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
  return { frames, handlers, hud, views, log, contexts, document: documentStub, map, restore };
}

// ---------- pumping helpers (pickflow / bootAudioShell idiom) ----------

function tick(env, st) {
  st.t += 50;
  env.frames.at(-1)(st.t);
}

function press(env) {
  env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
}

function release(env) {
  env.handlers.window.keyup({ code: 'Space' });
}

function keydown(env, code) {
  env.handlers.window.keydown({ code, repeat: false, preventDefault() {} });
}

// Start a running run: the first Space starts the run AND constructs the
// AudioContext (the shell's single construction site is press-gesture).
function startRunning(env, st) {
  press(env);
  tick(env, st);
  assert.equal(env.views.at(-1).run.status, 'running', 'the opening Space tap started the run');
}

// ---------- UI-01 legs ----------

test('manual pause freezes stepping, suspends audio once, and holds the prompt (D-01/D-02)', async () => {
  const env = await bootPolishShell();
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    for (let i = 0; i < 6; i++) tick(env, st);
    const phase0 = env.views.at(-1).rope.phase;
    const score0 = env.views.at(-1).run.score;
    const ctx = env.contexts[0];
    assert.ok(ctx, 'the opening press constructed the context');
    const resumesAtPause = ctx.resumes;

    keydown(env, 'KeyP');
    const phases = [];
    const scores = [];
    for (let i = 0; i < 5; i++) {
      tick(env, st);
      phases.push(env.views.at(-1).rope.phase);
      scores.push(env.views.at(-1).run.score);
    }
    // D-02: zero sim steps across five pumped stub-clock frames — the frozen
    // frames must be byte-identical to each other AND to the moment of pause.
    assert.ok(phases.every(p => p === phase0), 'rope.phase frozen across 5 paused frames');
    assert.ok(scores.every(s => s === score0), 'run.score frozen across 5 paused frames');
    assert.match(env.hud['hud-prompt'].textContent, /paused — press P to resume/);
    assert.ok(env.log.suspends === 1, 'audio.suspend() called exactly once on pause');
    assert.equal(ctx.state, 'suspended', 'the context is suspended while paused');
    // T-05-01: the freeze frame must not resurrect audio on its own.
    assert.equal(ctx.resumes, resumesAtPause, 'no resume() fired while still paused');

    // D-01: Escape pauses too — resume with P, pause again with Escape.
    keydown(env, 'KeyP');
    keydown(env, 'Escape');
    const escPhases = [];
    for (let i = 0; i < 2; i++) {
      tick(env, st);
      escPhases.push(env.views.at(-1).rope.phase);
    }
    assert.ok(escPhases.every(p => p === escPhases[0]), 'Escape froze stepping too (P/Esc parity)');
    assert.match(env.hud['hud-prompt'].textContent, /paused — press P to resume/);
  } finally {
    env.restore();
  }
});

test('resume re-enters the lead-in with the run intact; a press in the lock window is dropped (D-03/D-07)', async () => {
  const env = await bootPolishShell();
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    for (let i = 0; i < 8; i++) tick(env, st);
    const before = env.views.at(-1);
    const score0 = before.run.score;
    const effects0 = before.run.effects;
    const owned0 = before.run.owned;
    const ctx = env.contexts[0];

    keydown(env, 'KeyP');
    tick(env, st);
    const resumesBefore = ctx.resumes;
    keydown(env, 'KeyP'); // resume — routes through the resumeRun lead-in

    // Zero-delta frame: no drain, just the per-frame render — the exact
    // post-resume lead-in snapshot.
    env.frames.at(-1)(st.t);
    const resumed = env.views.at(-1);
    assert.strictEqual(resumed.rope.phase, START_PHASE, 'resume lands at the START_PHASE lead-in');
    assert.strictEqual(resumed.run.score, score0, 'score survives pause (resumeRun, not startRun)');
    assert.deepEqual(resumed.run.effects, effects0, 'effects survive pause');
    assert.deepEqual(resumed.run.owned, owned0, 'owned cards survive pause');
    assert.equal(ctx.state, 'running', 'gesture() on resume re-ran the suspended context');
    assert.equal(ctx.resumes, resumesBefore + 1, 'resumes incremented exactly once via gesture()');

    // D-07 re-entry lock: one Space pressed immediately after resume is
    // dropped — gravity must keep decaying the lead-in jump with no mid-air
    // re-launch (the lead-in launch velocity is 400).
    press(env);
    release(env);
    const vys = [resumed.player.vy];
    for (let i = 0; i < 6; i++) {
      tick(env, st);
      vys.push(env.views.at(-1).player.vy);
    }
    assert.ok(vys.every(vy => vy <= 400), 'the locked press never charged a >lead-in jump');
    assert.ok(vys.every((vy, i) => i === 0 || vy < vys[i - 1]),
      'vy decays monotonically — the dropped press launched nothing (D-07)');
  } finally {
    env.restore();
  }
});

test('a 5 s paused clock never fast-forwards the lead-in (Pitfall 1)', async () => {
  const env = await bootPolishShell();
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    for (let i = 0; i < 4; i++) tick(env, st);
    const phaseAtPause = env.views.at(-1).rope.phase;

    keydown(env, 'KeyP');
    st.t += 5000; // one 5000-ms paused frame
    env.frames.at(-1)(st.t);
    assert.strictEqual(env.views.at(-1).rope.phase, phaseAtPause,
      'the paused frame itself holds zero sim time');

    keydown(env, 'KeyP'); // resume
    tick(env, st);        // one pumped 50-ms frame post-resume
    const phase = env.views.at(-1).rope.phase;
    assert.ok(phase >= START_PHASE && phase - START_PHASE <= 0.05 / 1.3 + 1e-9,
      `phase is START_PHASE plus at most the pumped frame of lead-in, got ${phase}`);
  } finally {
    env.restore();
  }
});

test('pause clears run.buffer — the post-resume crossing trips, never forgives (D-12, Pitfall 2)', async () => {
  const env = await bootPolishShell();
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    let guard = 0;
    while (!env.views.at(-1).player.grounded && ++guard < 20) tick(env, st);
    assert.ok(env.views.at(-1).player.grounded, 'the lead-in jump landed, ready to charge');

    press(env);
    tick(env, st);
    release(env); // the fired press arms the FEEL-01 forgiveness buffer
    tick(env, st);
    assert.ok(env.views.at(-1).run.buffer > 0, 'the fired press armed run.buffer');

    keydown(env, 'KeyP'); // pause clears press state + buffer (D-12)
    keydown(env, 'KeyP'); // resume
    env.frames.at(-1)(st.t); // zero-delta snapshot of the resume instant
    const after = env.views.at(-1);
    assert.strictEqual(after.run.buffer, 0, 'pause cleared run.buffer via spread');
    assert.strictEqual(after.rope.phase, START_PHASE, 'resume re-entered the lead-in');

    // No further input: the first grounded crossing post-resume must trip.
    guard = 0;
    while (env.views.at(-1).run.status === 'running' && ++guard < 90) tick(env, st);
    assert.strictEqual(env.views.at(-1).run.status, 'over',
      'a stale press never leaks into the post-resume rhythm — the crossing trips');
  } finally {
    env.restore();
  }
});
