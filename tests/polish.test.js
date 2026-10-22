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
  // UI-02 (D-06): stubbed MediaQueryList with a test-visible emit hook
  // (RESEARCH harness shape) — mq.matches = v; mq.listeners.forEach(...)
  const mq = {
    matches: false,
    listeners: [],
    addEventListener(type, fn) { if (type === 'change') this.listeners.push(fn); },
  };
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
  // UI-03: the window metrics are settable so the resize legs can drive the
  // band math through the real listener; the defaults mirror the windowSize()
  // 480×640 fallback, so every existing leg keeps booting into the
  // letterbox-free passthrough.
  const windowStub = {
    addEventListener: (type, fn) => { handlers.window[type] = fn; },
    innerWidth: 480,
    innerHeight: 640,
    // UI-02: the reduced-motion query resolves to the live mq stub; every
    // other query is a dead false/false pair.
    matchMedia: q => (q === '(prefers-reduced-motion: reduce)'
      ? mq
      : { matches: false, addEventListener() {} }),
  };
  globalThis.window = windowStub;
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
  return { frames, handlers, hud, views, log, contexts, mq, canvas, window: windowStub, document: documentStub, map, restore };
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

// UI-02 (D-06): fire a live MediaQueryList change — the harness shape from
// RESEARCH Pattern 2's stub block.
function emitMq(env, value) {
  env.mq.matches = value;
  env.mq.listeners.forEach(fn => fn({ matches: value }));
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

test('tab hidden mid-run auto-pauses with suspend; focus never un-suspends (D-04/T-05-01)', async () => {
  const env = await bootPolishShell();
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    for (let i = 0; i < 4; i++) tick(env, st);
    const phase0 = env.views.at(-1).rope.phase;
    const ctx = env.contexts[0];
    const resumesAtPause = ctx.resumes;

    env.document.hidden = true;
    env.handlers.window.visibilitychange();
    const phases = [];
    for (let i = 0; i < 3; i++) {
      tick(env, st); // still "hidden" — the run must be frozen
      phases.push(env.views.at(-1).rope.phase);
    }
    assert.ok(phases.every(p => p === phase0), 'hidden mid-run: zero sim steps');
    assert.ok(env.log.suspends === 1, 'tab-hide suspended audio exactly once');
    assert.equal(ctx.state, 'suspended');
    assert.match(env.hud['hud-prompt'].textContent, /paused — press P to resume/);

    // T-05-01: a focus event racing the hide must not resurrect the context.
    env.handlers.window.focus();
    assert.equal(ctx.state, 'suspended', 'focus did not un-suspend the paused context');
    assert.equal(ctx.resumes, resumesAtPause, 'no resumes++ before any resume action');
  } finally {
    env.restore();
  }
});

test('tab hidden during game-over stays the D-N08 gesture path — no paused state (D-04)', async () => {
  const env = await bootPolishShell();
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    let guard = 0; // never jump: the second grounded crossing trips the run
    while (env.views.at(-1).run.status === 'running' && ++guard < 90) tick(env, st);
    assert.strictEqual(env.views.at(-1).run.status, 'over', 'the run tripped to game-over');

    const gestures0 = env.log.gestures;
    env.document.hidden = true;
    env.handlers.window.visibilitychange();
    assert.strictEqual(env.log.suspends, 0, 'hiding outside a stepping run never suspends');
    assert.equal(env.log.gestures, gestures0 + 1, 'the D-N08 gesture path is the only effect');
    tick(env, st);
    tick(env, st);
    assert.strictEqual(env.views.at(-1).run.status, 'over', 'no paused state over a dead run');
    assert.match(env.hud['hud-prompt'].textContent, /^Missed!/, 'the game-over prompt is untouched');

    env.document.hidden = false;
    env.handlers.window.visibilitychange(); // visible otherwise = today's gesture recovery
    assert.strictEqual(env.views.at(-1).run.status, 'over', 'and the return leg changes nothing');
  } finally {
    env.restore();
  }
});

test('hidden-on-idle no-ops; tab-return while pausedByVis auto-resumes through the lead-in (A1)', async () => {
  const env = await bootPolishShell();
  try {
    const st = { t: performance.now() };
    // hidden while idle: no paused state, no suspend, prompt untouched.
    env.document.hidden = true;
    env.handlers.window.visibilitychange();
    tick(env, st);
    tick(env, st);
    assert.strictEqual(env.log.suspends, 0, 'hidden-on-idle suspends nothing');
    assert.strictEqual(env.views.at(-1).run.status, 'idle', 'idle entered no paused state');
    assert.match(env.hud['hud-prompt'].textContent, /press space \/ tap to start/, 'idle prompt unchanged');
    env.document.hidden = false;
    env.handlers.window.visibilitychange();

    // hidden mid-run, then the tab-return auto-resume leg:
    startRunning(env, st);
    for (let i = 0; i < 3; i++) tick(env, st);
    const phase0 = env.views.at(-1).rope.phase;
    env.document.hidden = true;
    env.handlers.window.visibilitychange();
    tick(env, st);
    tick(env, st);
    assert.strictEqual(env.views.at(-1).rope.phase, phase0, 'hidden run is frozen');

    env.document.hidden = false;
    env.handlers.window.visibilitychange(); // no keypress — return alone resumes
    env.frames.at(-1)(st.t); // zero-delta snapshot of the resume instant
    const back = env.views.at(-1);
    assert.strictEqual(back.rope.phase, START_PHASE, 'tab-return auto-resumes through the lead-in');
    assert.strictEqual(back.run.status, 'running', 'back to a live run without a keypress');
    assert.equal(env.contexts[0].state, 'running', 'audio recovered on return');
    tick(env, st);
    assert.ok(env.views.at(-1).rope.phase > START_PHASE, 'stepping resumed');
  } finally {
    env.restore();
  }
});

// ---------- UI-02 legs ----------

test('the boot view payload carries reducedMotion false and a change subscription exists (D-06)', async () => {
  const env = await bootPolishShell();
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    const view = env.views.at(-1);
    assert.ok('reducedMotion' in view, 'the one-way view payload carries the reducedMotion key');
    assert.strictEqual(view.reducedMotion, false, 'the boot read of the false query is false');
    assert.ok(env.mq.listeners.length >= 1,
      'the shell subscribed to the MediaQueryList change event (addEventListener)');
  } finally {
    env.restore();
  }
});

test('a live matchMedia change flips the view payload both ways, next frame, no restart (D-06)', async () => {
  const env = await bootPolishShell();
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    assert.strictEqual(env.views.at(-1).reducedMotion, false, 'boot state: full motion');

    emitMq(env, true);
    tick(env, st);
    assert.strictEqual(env.views.at(-1).reducedMotion, true,
      'the very next pumped frame carries the flipped preference (D-06 live on)');

    emitMq(env, false);
    tick(env, st);
    assert.strictEqual(env.views.at(-1).reducedMotion, false,
      'flipping back takes effect on the very next frame too (D-06 live off)');

    // The toggle is a pure view flag: the run kept stepping throughout.
    assert.strictEqual(env.views.at(-1).run.status, 'running', 'no pause/restart on the toggle');
    assert.ok(env.log.suspends === 0, 'reduced motion never suspends audio');
  } finally {
    env.restore();
  }
});

test('the HUD channel is byte-identical under reduced motion — legibility anchors untouched (D-05)', async () => {
  const full = await bootPolishShell();
  const calm = await bootPolishShell();
  try {
    emitMq(calm, true); // calm runs the whole session with reduced motion on
    const snap = env => ['hud-score', 'hud-best', 'hud-prompt', 'hud-owned']
      .map(k => env.hud[k].textContent).join(' | ');
    const stF = { t: performance.now() };
    const stC = { t: stF.t };
    // Dual-boot caveat (harness globals point at the LAST boot): re-registrations
    // from both shells land in calm.frames, so each boot must be pumped through
    // its OWN frame closure — frames[0], the boot registration — not at(-1).
    const pump = (env, st) => { st.t += 50; env.frames[0](st.t); };

    // Identical scripted session on both boots: start, then 30 pumped frames
    // at identical timestamps — enough to cross the lead-in crossing so the
    // score tick and prompt transitions are exercised on the HUD channel.
    press(full);
    press(calm);
    for (let i = 0; i < 30; i++) {
      pump(full, stF);
      pump(calm, stC);
      assert.strictEqual(snap(calm), snap(full), `HUD text byte-identical at frame ${i}`);
    }
    // Both boots' payloads share the harness view sink; the flag sets prove the
    // two sessions differed ONLY in the reducedMotion payload.
    const flags = new Set(calm.views.map(v => v.reducedMotion));
    assert.ok(flags.has(true) && flags.has(false),
      'differential proof: one session ran reducedMotion=true, the other false');
    assert.notStrictEqual(full.hud['hud-score'].textContent, '0',
      'liveness: the session actually scored — the parity check is not comparing two dead HUDs');
  } finally {
    full.restore();
    calm.restore();
  }
});

// ---------- UI-03 legs ----------

// UI-03 (D-07/D-10): set the stub metrics, then dispatch the shell's existing
// resize listener — the same handlers-dispatch idiom as the keydown legs.
function resizeTo(env, w, h) {
  env.window.innerWidth = w;
  env.window.innerHeight = h;
  env.handlers.window.resize();
}

test('resize to 2000×400 clamps to the 2:1 band edge: 800×400 box, style writes match (D-07)', async () => {
  const env = await bootPolishShell();
  try {
    resizeTo(env, 2000, 400);
    const aspect = env.canvas.width / env.canvas.height;
    assert.ok(aspect <= 2 && aspect >= 3 / 4,
      `buffer aspect ${aspect} must sit inside the clamp band [0.75, 2]`);
    assert.strictEqual(env.canvas.width, 800, 'contain-fit: min(2000, 400 * 2) = 800');
    assert.strictEqual(env.canvas.height, 400, 'height keeps the full window: min(400, 2000 / 2)');
    assert.strictEqual(env.canvas.style.width, '800px', 'CSS box follows the clamped buffer (Pitfall 9)');
    assert.strictEqual(env.canvas.style.height, '400px');
  } finally {
    env.restore();
  }
});

test('resize to 300×900 holds the 3:4 floor: 300×400 box, style writes match the buffer (D-07)', async () => {
  const env = await bootPolishShell();
  try {
    resizeTo(env, 300, 900);
    const aspect = env.canvas.width / env.canvas.height;
    assert.ok(aspect >= 3 / 4 && aspect <= 2,
      `buffer aspect ${aspect} must hold the 3:4 floor of the clamp band`);
    assert.strictEqual(env.canvas.width, 300, 'width keeps the full window: min(300, 900 * 0.75)');
    assert.strictEqual(env.canvas.height, 400, 'contain-fit: min(900, 300 / 0.75) = 400');
    assert.strictEqual(env.canvas.style.width, '300px');
    assert.strictEqual(env.canvas.style.height, '400px');
  } finally {
    env.restore();
  }
});

test('a normal 480×640 window is the exact passthrough — no band, no margins (CONTEXT specifics §3)', async () => {
  const env = await bootPolishShell();
  try {
    resizeTo(env, 480, 640);
    assert.strictEqual(env.canvas.width, 480, 'in-band windows are byte-identical to today');
    assert.strictEqual(env.canvas.height, 640);
    assert.strictEqual(env.canvas.style.width, '480px');
    assert.strictEqual(env.canvas.style.height, '640px');
  } finally {
    env.restore();
  }
});

test('garbage window metrics (0 / undefined / 1×1) coerce — buffer dims stay finite and ≥ 2 (T-05-05)', async () => {
  const env = await bootPolishShell();
  try {
    resizeTo(env, 0, undefined); // Number(x) || 480/640 is the sole input gate
    assert.ok(Number.isFinite(env.canvas.width) && Number.isFinite(env.canvas.height),
      'no NaN reaches the buffer after the coercion guard');
    assert.ok(env.canvas.width >= 2 && env.canvas.height >= 2,
      `buffer dims ${env.canvas.width}×${env.canvas.height} must be ≥ 2`);

    resizeTo(env, 1, 1); // Math.max(2, …) floor against a physically tiny window
    assert.ok(Number.isFinite(env.canvas.width) && Number.isFinite(env.canvas.height),
      'the 1×1 window still yields finite buffer dims');
    assert.ok(env.canvas.width >= 2 && env.canvas.height >= 2,
      `the Math.max(2, …) floor holds: got ${env.canvas.width}×${env.canvas.height}`);
  } finally {
    env.restore();
  }
});

test('boot sizes through the shared applyWindowSize — style + buffer written before any resize event (D-10)', async () => {
  const env = await bootPolishShell();
  try {
    // No resize dispatch anywhere in this leg: these writes can only come
    // from the boot-time call of the SAME applyWindowSize the listener uses.
    assert.strictEqual(env.canvas.width, 480, 'boot buffer width = passthrough of the 480×640 stub window');
    assert.strictEqual(env.canvas.height, 640);
    assert.strictEqual(env.canvas.style.width, '480px', 'boot writes the CSS box too, not only the buffer (Pitfall 9)');
    assert.strictEqual(env.canvas.style.height, '640px');
  } finally {
    env.restore();
  }
});

test('no orientationchange listener is registered — the resize path is the sole sizing channel (D-10)', async () => {
  const src = await readFile(resolve(jsDir, 'shell.js'), 'utf8');
  assert.ok(!/addEventListener\(\s*['"]orientationchange['"]/.test(src),
    'js/shell.js must not bind orientationchange — resize alone drives applyWindowSize (D-10)');
});

// ---------- criterion 4 legs: input-loss hardening (D-11/D-12) ----------

// D-11: the shared releaseEverything() handler is dispatched through the
// harness handler map once bound. The optional-call form keeps the RED legs
// failing on the BEHAVIOR assertion (no airborne player after a loss event)
// rather than on a TypeError while the event is still unrouted.
function blur(env) { env.handlers.window.blur?.(); }

function pointercancel(env) { env.handlers.canvas.pointercancel?.(); }

function waitGrounded(env, st) {
  let guard = 0;
  while (!env.views.at(-1).player.grounded && ++guard < 20) tick(env, st);
  assert.ok(env.views.at(-1).player.grounded,
    'the lead-in jump landed — the charge under test starts from the ground');
}

// pickflow's driveToChoose idiom continued on the caller's clock: hold-jump
// (≈0 hold, vy ≈ 350) whenever grounded with rope.phase in [0.20, 0.28)
// clears every cycle deterministically until the 10-skip offer freezes the
// run into 'choose'.
function runToChoose(env, st) {
  let budget = 0;
  while (env.views.at(-1).run.status !== 'choose') {
    if (++budget > 1200) {
      throw new Error('polish harness: "choose" never landed within the frame budget');
    }
    const view = env.views.at(-1);
    assert.notEqual(view.run.status, 'over',
      'polish harness: the scripted jumper tripped before the cadence freeze');
    if (view.player.grounded && view.rope.phase >= 0.2 && view.rope.phase < 0.28) {
      press(env);
      tick(env, st);
      release(env);
      tick(env, st);
    } else {
      tick(env, st);
    }
  }
}

test('mid-charge blur fires the jump with the hold so far; stale keyup adds no second jump (D-11, Pitfall 6)', async () => {
  const env = await bootPolishShell();
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    waitGrounded(env, st);

    press(env);        // charge starts: pressIntent armed
    tick(env, st);     // consumeIntents converts it to holdFrom — still grounded
    assert.ok(env.views.at(-1).player.grounded, 'mid-charge: hold accumulating on the ground');

    blur(env);         // focus loss mid-charge = released at that instant
    tick(env, st);
    const fired = env.views.at(-1).player;
    assert.ok(!fired.grounded && fired.vy > 200,
      `blur must launch through consumeIntents with the partial hold, got grounded=${fired.grounded} vy=${fired.vy}`);

    // The stale keyup that eventually reaches the unfocused window must not
    // fire a second jump: vy only ever decays under gravity afterwards.
    release(env);
    const vys = [fired.vy];
    for (let i = 0; i < 3; i++) {
      tick(env, st);
      vys.push(env.views.at(-1).player.vy);
    }
    assert.ok(vys.every((v, i) => i === 0 || v < vys[i - 1]),
      `vy decays strictly after the blur-fired jump — no relaunch, got ${vys}`);
  } finally {
    env.restore();
  }
});

test('mid-hold pointercancel launches and leaves no hold behind (D-11)', async () => {
  const env = await bootPolishShell();
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    waitGrounded(env, st);

    env.handlers.canvas.pointerdown({ pointerId: 1 }); // touch press starts the hold
    tick(env, st);
    assert.ok(env.views.at(-1).player.grounded, 'mid-hold: touch hold accumulating on the ground');

    pointercancel(env); // OS/app-switch cancellation = released at that instant
    tick(env, st);
    const fired = env.views.at(-1).player;
    assert.ok(!fired.grounded && fired.vy > 200,
      `pointercancel must launch with the hold-so-far, got grounded=${fired.grounded} vy=${fired.vy}`);

    // No holdFrom survives the cancel: once the fired jump lands, later frames
    // are grounded rest — never a re-launch from a stuck charge.
    let guard = 0;
    while (!env.views.at(-1).player.grounded && ++guard < 20) tick(env, st);
    assert.ok(env.views.at(-1).player.grounded, 'the pointercancel-fired jump landed');
    const vys = [];
    for (let i = 0; i < 4; i++) {
      tick(env, st);
      vys.push(env.views.at(-1).player.vy);
    }
    assert.ok(vys.every(v => v === 0),
      `no hold survived the cancel — grounded frames only, got ${vys}`);
  } finally {
    env.restore();
  }
});

test('blur mid card-hold cancels cleanly — no pick, offer prompt still listed (D-11)', async () => {
  const env = await bootPolishShell();
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    runToChoose(env, st);
    assert.strictEqual(env.views.at(-1).run.status, 'choose', 'the 10-skip offer froze the run');

    env.handlers.canvas.pointerdown({ pointerId: 1 }); // cycles cursor, re-arms the hold
    tick(env, st);
    assert.match(env.hud['hud-prompt'].textContent, /\[[-#]+\]/,
      'the fill cue is live during the sub-confirm hold');

    blur(env); // focus loss under the 800 ms confirm threshold = clean cancel
    tick(env, st);
    const prompt = env.hud['hud-prompt'].textContent;
    assert.ok(!prompt.includes('['), 'the fill cue is gone — the hold was cancelled, not carried');
    assert.match(prompt, /^> /m, 'the offer prompt still lists the offer');
    for (let i = 0; i < 4; i++) tick(env, st);
    assert.strictEqual(env.views.at(-1).run.status, 'choose', 'nothing confirmed across the blur');
    assert.ok(!env.log.voices.includes('pick'), 'the audio log shows no pick event');
  } finally {
    env.restore();
  }
});

test('blur on the game-over screen restarts nothing — over never arms the release branch (T-05-07)', async () => {
  const env = await bootPolishShell();
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    let guard = 0; // never jump: the first grounded crossing trips the run
    while (env.views.at(-1).run.status === 'running' && ++guard < 90) tick(env, st);
    assert.strictEqual(env.views.at(-1).run.status, 'over', 'the run tripped to game-over');
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

test('hidden mid-hold pauses and stays cleared — the post-resume crossing trips (D-12 fire-superseded-by-clear)', async () => {
  const env = await bootPolishShell();
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    waitGrounded(env, st);
    press(env);
    tick(env, st); // holdFrom armed at the moment the tab hides

    env.document.hidden = true;
    env.handlers.window.visibilitychange(); // hidden+running routes releaseEverything() then enterPause
    const phase0 = env.views.at(-1).rope.phase;
    tick(env, st);
    tick(env, st);
    assert.strictEqual(env.views.at(-1).rope.phase, phase0,
      'hidden mid-hold: the run is frozen — enterPause supersedes the armed release');

    env.document.hidden = false;
    env.handlers.window.visibilitychange(); // tab-return auto-resume through the lead-in
    env.frames.at(-1)(st.t); // zero-delta snapshot of the resume instant
    assert.strictEqual(env.views.at(-1).rope.phase, START_PHASE, 'resumed into the lead-in');

    // No armed release/hold leaked into the lead-in: with no further input the
    // first grounded crossing trips — a phantom jump would have skipped it.
    let guard = 0;
    while (env.views.at(-1).run.status === 'running' && ++guard < 90) tick(env, st);
    assert.strictEqual(env.views.at(-1).run.status, 'over',
      'the post-resume crossing trips — no armed state survived the pause');
  } finally {
    env.restore();
  }
});

// D-12 matrix extension (plan 05-04 Task 2): the pause leg composes with the
// blur leg — behind the freeze frame every press path is early-returned and
// every loss event is a no-op, so a blur while paused neither fires an airborne
// state nor leaves an intent armed for the post-resume rhythm.
test('blur while paused is a no-op — nothing airborne, nothing armed for the lead-in (D-12 matrix)', async () => {
  const env = await bootPolishShell();
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    for (let i = 0; i < 4; i++) tick(env, st);
    keydown(env, 'KeyP'); // manual pause, run.status stays 'running'

    blur(env); // focus loss behind the freeze frame must change nothing
    const frozen = env.views.at(-1);
    for (let i = 0; i < 3; i++) tick(env, st);
    const after = env.views.at(-1);
    assert.strictEqual(after.rope.phase, frozen.rope.phase, 'stepping stayed frozen across the blur');
    assert.strictEqual(after.player.y, frozen.player.y, 'no airborne state appeared behind the freeze');

    keydown(env, 'KeyP'); // resume through the lead-in
    env.frames.at(-1)(st.t);
    assert.strictEqual(env.views.at(-1).rope.phase, START_PHASE, 'resume landed the lead-in');
    // A phantom releaseIntent would fire as soon as the D-07 lock drops; with
    // the no-op honored, the untouched first grounded crossing trips.
    let guard = 0;
    while (env.views.at(-1).run.status === 'running' && ++guard < 90) tick(env, st);
    assert.strictEqual(env.views.at(-1).run.status, 'over',
      'no phantom jump leaked from the paused blur — the crossing trips');
  } finally {
    env.restore();
  }
});

// ---------- gap-closure legs (plan 05-05): CR-01 / WR-01 pins ----------

// CR-01 / T-05-01: the mitigation covers "the focus listener AND the
// visible-branch gesture" — the focus leg above pins the first half, this leg
// walks the manual-pause half the suite never walked.
test('manual-pause -> hide -> reveal never un-suspends the paused context (CR-01/T-05-01)', async () => {
  const env = await bootPolishShell();
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    for (let i = 0; i < 4; i++) tick(env, st);

    keydown(env, 'KeyP'); // manual pause: enterPause(false) — pausedByVis stays false
    const ctx = env.contexts[0];
    assert.ok(env.log.suspends === 1, 'manual pause suspended the context once');
    assert.equal(ctx.state, 'suspended', 'the context is suspended behind the freeze frame');
    const gestures0 = env.log.gestures;
    const resumes0 = ctx.resumes;
    const phase0 = env.views.at(-1).rope.phase;

    env.document.hidden = true;
    env.handlers.window.visibilitychange(); // enterPause early-returns — pausedByVis stays false
    env.document.hidden = false;
    env.handlers.window.visibilitychange(); // the visible else-branch must not gesture past a pause

    tick(env, st);
    tick(env, st);
    assert.equal(ctx.state, 'suspended', 'the visible-leg event did not resume the paused context');
    assert.equal(env.log.gestures, gestures0, 'the visible branch dispatched no gesture() past the manual pause');
    assert.equal(ctx.resumes, resumes0, 'no resumes++ while the player holds the pause');
    assert.match(env.hud['hud-prompt'].textContent, /paused — press P to resume/);
    assert.strictEqual(env.views.at(-1).rope.phase, phase0, 'stepping stayed frozen across the round-trip');
  } finally {
    env.restore();
  }
});

// WR-01 / D-11: the hidden leg must run the one shared release for EVERY
// status. Platform caveat pinned here: tickPick times the hold on the REAL
// performance.now (shell.js), which bootPolishShell does not stub, so the
// st.t += 900 jump below simulates elapsed frame-loop time only and can never
// produce an in-harness auto-confirm — the deciding red signal is the fill
// cue surviving the hidden event (pickPressedAt never cleared), and the
// real-browser confirm edge stays on manual UAT row 5.
test('tab hidden during a sub-confirm card hold cancels — no auto-confirm on return (WR-01/D-11)', async () => {
  const env = await bootPolishShell();
  try {
    const st = { t: performance.now() };
    startRunning(env, st);
    runToChoose(env, st);
    assert.strictEqual(env.views.at(-1).run.status, 'choose', 'the 10-skip offer froze the run');

    env.handlers.canvas.pointerdown({ pointerId: 1 }); // cycles cursor, (re)arms the hold
    tick(env, st);
    assert.match(env.hud['hud-prompt'].textContent, /\[[-#]+\]/,
      'the fill cue is live during the sub-confirm hold');

    env.document.hidden = true;
    env.handlers.window.visibilitychange(); // hidden WITHOUT any blur — the WR-01 platform
    st.t += 900; // background longer than PICK_HOLD_MS (800)
    env.document.hidden = false;
    env.handlers.window.visibilitychange();
    tick(env, st);
    tick(env, st);

    const prompt = env.hud['hud-prompt'].textContent;
    assert.strictEqual(env.views.at(-1).run.status, 'choose', 'the hold did not confirm in the background');
    assert.ok(!prompt.includes('['), 'the fill cue is gone — the hidden leg cancelled the hold');
    assert.ok(!env.log.voices.includes('pick'), 'the audio log shows no pick event');
    assert.match(prompt, /^> /m, 'the offer prompt still lists the offer');
  } finally {
    env.restore();
  }
});
