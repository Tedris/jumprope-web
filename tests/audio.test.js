import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createAudio, loadSettings, saveSettings } from '../js/audio.js';

// Plan 04-03 (AUD-01..04). Part A unit-tests the leaf module against a stub
// AudioContext / Map storage; the direct '../js/audio.js' import is allowed
// because audio.js imports nothing, so the boundary graph gains one IO-free,
// three-free node and tests/boundary.test.js re-audits it for free.
// Part B boots the REAL js/shell.js through the same source-rewriting data:-
// URL harness as tests/shell.test.js / tests/pickflow.test.js (harness copy
// precedent), pre-instrumenting createAudio with a voice log and injecting a
// stub AudioContext class + Map-backed localStorage before the import. No
// resolvable relative specifier into js/ (shell seam included) appears in
// this file beyond audio.js itself, keeping the SPECIFIER_RE fence green.

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

function makeStorage(initial) {
  const map = new Map(initial);
  const writes = [];
  return {
    map,
    writes,
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, v); writes.push([k, v]); },
  };
}

const settle = () => new Promise(r => setTimeout(r, 0));

// ---------- Part A: module unit legs ----------

test('cold import + factory create nothing; audio is inert pre-gesture (D-N08)', () => {
  const audio = createAudio({ storage: makeStorage() });
  const status = audio.getStatus();
  assert.equal(status.initialized, false);
  assert.equal(status.ctxState, 'none');
  assert.equal(status.trackPlaying, false);
  assert.equal(status.trackMissing, false);
  audio.handleEvent('skip'); // silent no-op before init
  audio.handleEvent('jump');
  assert.equal(audio.playTrack(), false, 'no fetchFn -> the track layer no-ops');
});

test('gesture is the only lifecycle site: create-once, resume-on-gesture (D-N08/AUD-03)', () => {
  const ctx = makeAudioContext();
  const audio = createAudio({ storage: makeStorage() });
  audio.gesture(ctx);
  assert.equal(ctx.gains, 1, 'exactly one master gain built on the first gesture');
  assert.equal(ctx.gainNodes[0].connectedTo, ctx.destination, 'master sits on the destination bus');
  assert.equal(ctx.gainNodes[0].gain.value, 1, 'default volume on the fresh bus');
  // A later gesture must never construct a second context/gain (T-4-08) —
  // it only revives a suspended one.
  const other = makeAudioContext();
  audio.gesture(other);
  assert.equal(other.gains, 0, 'the running context is never replaced');
  ctx.state = 'suspended';
  audio.gesture(other);
  assert.equal(ctx.resumes, 2, 'resume() on every gesture over a suspended context (1 init + 1 recovery)');
  assert.equal(other.gains, 0);
  assert.equal(audio.getStatus().ctxState, 'running');
});

test('suspend/resume round-trip: the pause lifecycle rides the state-guarded pair (UI-01)', () => {
  const ctx = makeAudioContext();
  const audio = createAudio({ storage: makeStorage() });
  audio.gesture(ctx);
  assert.equal(ctx.state, 'running', 'the first gesture lands the context in running state');
  audio.suspend();
  assert.equal(ctx.state, 'suspended', 'suspend() parks a running context');
  assert.ok(ctx.suspends === 1, 'suspend called exactly once on the running state');
  audio.suspend();
  assert.ok(ctx.suspends === 1, 'suspend over a non-running context is a guarded no-op');
  audio.gesture(ctx);
  assert.ok(ctx.resumes >= 1, 'the next gesture resumes the suspended context');
  assert.equal(ctx.state, 'running', 'the round-trip returns to running');
});

test('voice map: one voice per event, unknown names and offer silent (AUD-01)', () => {
  for (const name of ['jump', 'skip', 'nearMiss', 'trip', 'pick']) {
    const ctx = makeAudioContext();
    const audio = createAudio({ storage: makeStorage() });
    audio.handleEvent(name);
    assert.equal(ctx.started, 0, `${name} before init must start nothing`);
    audio.gesture(ctx);
    const before = ctx.started;
    audio.handleEvent(name);
    assert.ok(ctx.started >= before + 1, `${name} must start >=1 voice through the bus`);
    const afterVoice = ctx.started;
    audio.handleEvent('offer');
    audio.handleEvent('nonsense');
    assert.equal(ctx.started, afterVoice, 'unknown events stay silent');
  }
});

test('track: absent file = flag + silence, present file = one looping source on the bus (D-N09)', async () => {
  const missCtx = makeAudioContext();
  const missing = createAudio({
    storage: makeStorage(),
    fetchFn: () => Promise.reject(new Error('missing')),
  });
  missing.gesture(missCtx);
  await settle();
  assert.equal(missing.getStatus().trackMissing, true);
  assert.equal(missing.getStatus().trackPlaying, false);
  assert.equal(missCtx.bufferSources.length, 0, 'the graceful path never fakes a source');
  assert.equal(missing.playTrack(), false, 'and never retries (no fetch loop, no unhandled rejection)');

  const okCtx = makeAudioContext();
  const present = createAudio({
    storage: makeStorage(),
    fetchFn: async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]) }),
  });
  present.gesture(okCtx);
  await settle();
  assert.equal(okCtx.bufferSources.length, 1, 'exactly one AudioBufferSourceNode');
  assert.equal(okCtx.bufferSources[0].loop, true, 'loop: true — one pre-rendered file (AUD-02 mechanism)');
  assert.equal(okCtx.bufferSources[0].connectedTo, okCtx.gainNodes[0], 'the track shares the master bus with SFX');
  assert.equal(present.getStatus().trackPlaying, true);
});

test('playTrack re-entry guard flips synchronously: gesture racing a manual call starts one loop (WR-04)', async () => {
  const ctx = makeAudioContext();
  let inflight = null;
  const audio = createAudio({
    storage: makeStorage(),
    // every call shares the SAME in-flight promise, so a guard miss would
    // resolve BOTH chains and start two looping sources through the master.
    fetchFn: () => (inflight ??= Promise.resolve({ ok: true, arrayBuffer: async () => new Uint8Array([1]) })),
  });
  audio.gesture(ctx); // the gesture seam starts fetch #1 — still pending here
  assert.equal(audio.playTrack(), false, 'a manual call racing the pending fetch is rejected');
  await settle();
  assert.equal(ctx.bufferSources.length, 1, 'exactly one looping source for the double call');
  assert.equal(audio.getStatus().trackPlaying, true);
  assert.equal(audio.getStatus().trackMissing, false);
  assert.equal(audio.playTrack(), false, 'the settled track still no-ops');
});

test('settings: single-key round-trip, write-through, coercion, graceful degradation (AUD-04/T-4-06)', () => {
  const fresh = makeStorage();
  assert.deepEqual(loadSettings(fresh), { muted: false, volume: 1 });

  const audio = createAudio({ storage: fresh });
  audio.toggleMute();
  assert.equal(fresh.writes.length, 1, 'write-through on the change itself, no debouncing');
  assert.equal(fresh.writes[0][0], 'jumprope-audio', 'exactly one key');
  assert.deepEqual(JSON.parse(fresh.writes[0][1]), { muted: true, volume: 1 });

  assert.deepEqual(
    loadSettings(makeStorage([['jumprope-audio', fresh.writes[0][1]]])),
    { muted: true, volume: 1 },
    'the same map reloads the decision');
  const boot = makeAudioContext();
  createAudio({ storage: makeStorage([['jumprope-audio', fresh.writes[0][1]]]) }).gesture(boot);
  assert.equal(boot.gainNodes[0].gain.value, 0, 'a reloaded mute reads 0 straight onto the master gain');

  assert.deepEqual(loadSettings(makeStorage([['jumprope-audio', '{"volume": 7}']])), { muted: false, volume: 1 }, 'volume clamped to [0,1]');
  assert.deepEqual(loadSettings(makeStorage([['jumprope-audio', 'not json']])), { muted: false, volume: 1 }, 'junk degrades to defaults');
  assert.deepEqual(loadSettings({ getItem: () => { throw new Error('storage blocked'); } }), { muted: false, volume: 1 });
  const hostile = makeStorage();
  saveSettings(hostile, { muted: 'yes', volume: 'nope' });
  assert.deepEqual(JSON.parse(hostile.writes[0][1]), { muted: true, volume: 1 }, 'shape-pinned write');
  saveSettings({ setItem: () => { throw new Error('storage blocked'); } }, { muted: false, volume: 1 });

  const zero = makeStorage();
  saveSettings(zero, { muted: false, volume: 0 });
  assert.deepEqual(JSON.parse(zero.writes[0][1]), { muted: false, volume: 0 }, 'volume 0 persists as 0, never rewritten to 1');
  assert.deepEqual(
    loadSettings(makeStorage([['jumprope-audio', zero.writes[0][1]]])),
    { muted: false, volume: 0 },
    'a persisted volume 0 reloads as 0');
  const zeroBoot = makeAudioContext();
  createAudio({ storage: makeStorage([['jumprope-audio', zero.writes[0][1]]]) }).gesture(zeroBoot);
  assert.equal(zeroBoot.gainNodes[0].gain.value, 0, 'a reloaded volume 0 reads 0 straight onto the master gain');
});

test('one bus: volume changes land on the SAME master gain the voices chain into (D-N09)', () => {
  const ctx = makeAudioContext();
  const audio = createAudio({ storage: makeStorage() });
  audio.gesture(ctx);
  audio.setVolume(0.5);
  assert.equal(ctx.gainNodes[0].gain.value, 0.5);
  audio.handleEvent('skip');
  const envGain = ctx.gainNodes.at(-1);
  assert.notEqual(envGain, ctx.gainNodes[0]);
  assert.equal(envGain.connectedTo, ctx.gainNodes[0], 'voice envelope -> master -> destination');
  audio.setMuted(true);
  assert.equal(ctx.gainNodes[0].gain.value, 0, 'mute zeroes the one bus, SFX and track alike');
  assert.equal(audio.isMuted(), true);
  assert.equal(audio.getVolume(), 0.5, 'mute does not eat the volume setting');
});

test('trip noise buffer stays within full scale [-1, 1) (CR-01)', () => {
  const ctx = makeAudioContext();
  const audio = createAudio({ storage: makeStorage() });
  audio.gesture(ctx);
  audio.handleEvent('trip');
  const src = ctx.bufferSources.at(-1);
  assert.ok(src && src.buffer, 'the trip voice reads from the pre-rendered noise buffer');
  const data = src.buffer.getChannelData(0);
  assert.ok(data.length > 0);
  for (let i = 0; i < data.length; i++) {
    assert.ok(data[i] >= -1 && data[i] < 1,
      `sample ${i} = ${data[i]} must stay in [-1, 1) — full-scale, never clipping`);
  }
});

// ---------- Part B: real-shell seam legs ----------

let bootCount = 0;

// bootShell-copy harness (tests/pickflow.test.js precedent): the render seam
// becomes a recording stub, game/rope/player load for real from file: URLs,
// and the shell's dynamic './audio.js' specifier is rewritten to a wrapper
// data module that logs every handleEvent name. A stub AudioContext class and
// a Map-backed localStorage arrive BEFORE the import so the gesture seam and
// the persistence seam run for real (with Map cross-boot persistence).
async function bootAudioShell({ storageMap } = {}) {
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
    addEventListener: (type, fn) => { handlers.canvas[type] = fn; }
  };
  const views = [];
  globalThis.__shellTestViews = views;
  const voices = [];
  globalThis.__audioLog = voices;
  const contexts = [];
  const map = storageMap ?? new Map();
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
  globalThis.document = { getElementById: id => (id === 'game' ? canvas : hud[id]) };
  globalThis.window = {
    addEventListener: (type, fn) => { handlers.window[type] = fn; }
  };
  globalThis.requestAnimationFrame = cb => { frames.push(cb); return frames.length; };
  Object.defineProperty(globalThis, 'localStorage', {
    value: storageStub, configurable: true
  });
  // Gesture-only construction the shell's own guard reads (typeof check).
  globalThis.AudioContext = function StubAudioContext() {
    const ctx = makeAudioContext();
    contexts.push(ctx);
    return ctx;
  };
  // Track content is human-gated: the shipping default here is a rejecting
  // fetch, proving the graceful-missing path end-to-end without any network.
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
  // Wrapper module over the REAL js/audio.js: same surface, plus a voice log.
  // Double-quoted href only — encodeURIComponent leaves ' unescaped and this
  // href is embedded inside single-quoted import specifiers downstream.
  const audioWrapHref = 'data:text/javascript,' + encodeURIComponent([
    'import * as real from "' + fileHref('audio.js') + '";',
    'export function createAudio(opts) {',
    '  const a = real.createAudio(opts);',
    '  return Object.assign({}, a, { handleEvent(name) {',
    '    globalThis.__audioLog.push(name);',
    '    return a.handleEvent(name);',
    '  } });',
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

  await import('data:text/javascript,' + encodeURIComponent(`${src}\n//audio-boot ${++bootCount}`));
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
  return { frames, handlers, hud, views, voices, contexts, map, restore };
}

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

// pickflow's scripted-jumper precedent: ~50 ms pumped frames, jump-holds when
// grounded with the rope in [0.20, 0.28). Throws loudly on budget or trip.
function driveToChoose(env) {
  const st = { t: performance.now(), budget: 0 };
  press(env);
  tick(env, st);
  while (true) {
    if (++st.budget > 1200) throw new Error('audio harness: "choose" never landed within the frame budget');
    const view = env.views.at(-1);
    if (view.run.status === 'choose') return { view, st };
    assert.notEqual(view.run.status, 'over', 'audio harness: the scripted jumper tripped before the offer');
    if (view.run.status === 'running' && view.player.grounded
        && view.rope.phase >= 0.2 && view.rope.phase < 0.28) {
      press(env);
      tick(env, st);
      release(env);
      tick(env, st);
    } else {
      tick(env, st);
    }
  }
}

test('shell seam: zero contexts cold, one on first tap, resume-only after (AUD-03 end-to-end)', async () => {
  const env = await bootAudioShell();
  try {
    assert.equal(env.contexts.length, 0, 'no AudioContext at module or page load (D-N08)');
    keydown(env, 'Space');
    assert.equal(env.contexts.length, 1, 'press() is the only construction site');
    const ctx = env.contexts[0];
    assert.equal(ctx.state, 'running', 'a suspended fresh context is resumed inside the first gesture');
    ctx.state = 'suspended';
    keydown(env, 'Space');
    assert.equal(env.contexts.length, 1, 'no second constructor on later gestures');
    assert.ok(ctx.resumes >= 2, 'resume() called on every subsequent gesture');
  } finally {
    env.restore();
  }
});

test('shell seam: real channel drives jump/skip/trip voices and exactly one pick', async () => {
  const env = await bootAudioShell();
  try {
    // trip leg: press to start, then never jump — the second crossing trips.
    const st = { t: performance.now(), budget: 0 };
    press(env);
    while (++st.budget < 100 && !env.voices.includes('trip')) tick(env, st);
    assert.ok(env.voices.includes('trip'), 'the sim events channel carries trip to audio');

    // skip/jump legs: the scripted jumper crosses feet and releases jumps.
    const env2 = await bootAudioShell();
    try {
      const { st: st2 } = driveToChoose(env2);
      assert.ok(env2.voices.includes('skip'), 'skip crossings reach audio');
      assert.ok(env2.voices.includes('jump'), 'shell-side jump releases reach audio');
      assert.ok(!env2.voices.includes('nonsense'), 'nothing outside the voice map is dispatched');

      // pick leg: one cycle press, then hold past PICK_HOLD_MS in real time.
      keydown(env2, 'Space'); // cycles the cursor and re-arms the hold timer
      let guard = 0;
      while (!env2.voices.includes('pick') && ++guard < 120) {
        await new Promise(r => setTimeout(r, 25));
        tick(env2, st2);
      }
      assert.ok(env2.voices.includes('pick'), 'the hold-confirm plays the card voice');
      assert.equal(env2.voices.filter(v => v === 'pick').length, 1, 'exactly one pick voice');
    } finally {
      env2.restore();
    }
  } finally {
    env.restore();
  }
});

test('shell seam: Minus/Mute adjust + persist without touching the reducer; mute survives reload (AUD-04)', async () => {
  const shared = new Map();
  const env = await bootAudioShell({ storageMap: shared });
  try {
    tick(env, { t: performance.now(), budget: 1 });
    keydown(env, 'Minus');
    const written = JSON.parse(shared.get('jumprope-audio'));
    assert.equal(written.volume, 0.9, 'Minus steps volume by 0.1 and persists immediately');
    keydown(env, 'Mute');
    assert.equal(JSON.parse(shared.get('jumprope-audio')).muted, true, 'Mute persists muted:true');
    tick(env, { t: performance.now(), budget: 2 });
    assert.equal(env.views.at(-1).run.status, 'idle', 'control keys bypass the press/release reducer');
  } finally {
    env.restore();
  }

  const env2 = await bootAudioShell({ storageMap: shared });
  try {
    keydown(env2, 'Space');
    assert.equal(env2.contexts.length, 1, 'the reload boot still creates on first gesture only');
    assert.equal(env2.contexts[0].gainNodes[0].gain.value, 0,
      'the persisted mute lands on the master gain — the round-trip survives through the real shell');
  } finally {
    env2.restore();
  }
});
