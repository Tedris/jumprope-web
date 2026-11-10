import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createAudio, loadSettings, saveSettings } from '../js/audio.js';

// Story 5.5 (FR27/FR29/NFR4): the audio lifecycle regression sweep — 8 voices
// × 6 lifecycle columns re-proven per voice through the voice-agnostic guards.
// MATRIX STORY: product-code delta ZERO. Every leg is a verify-and-pin leg,
// GREEN from first write (Decision D5 — a gold-tree red here is an FR27
// FINDING, stop-and-report, never a product patch); falsifiability lives in
// the mutation battery recorded in the story Debug Log (M1-M8).
//
// Frozen suites are DONORS, never imports (per-suite harness-fork doctrine,
// as 5.3/5.4 state in their headers):
//   makeAudioContext / makeStorage / settle — tests/audio.test.js:24-101
//     (extended ONLY with an `oscs` creation counter for L1's zero-oscillator
//     pre-gesture census; the started counter spans oscillators AND buffer-
//     Sources exactly as the donor's),
//   bootAudioShell + tick/press/keydown — tests/audio.test.js:291-437, with
//     the wrapper extended per story Context §5: voice log (donor), the
//     gesture/suspend call counters (tests/polish.test.js:187-191 idiom) and
//     `globalThis.__audio = w` so L9 can dispatch NEW voices directly,
//   hidden/focus visibility legs — tests/polish.test.js:407-436,
//   VOICES census regex — tests/ceilingbreak.test.js:513-517 (the census IS
//     the contract: legs L1-L4 LOOP over the derived names; never a retyped
//     list — a future ninth voice is covered automatically).
//
// Part A is pure-stub (no boots). Part B boots EXACTLY FOUR times suite-wide
// (L8: P-path + visibility-path; L9: two boots over a shared Map) — NFR4.
// The direct '../js/audio.js' import is allowed and precedented (audio.test.js:6):
// leaf module, zero imports, boundary.test.js re-audits it for free.

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');

// ---------- census: derived from the VOICES source, never retyped (D2) ----------

const audioSrc = await readFile(resolve(jsDir, 'audio.js'), 'utf8');
const voicesMatch = audioSrc.match(/const VOICES = \{([\s\S]*?)\n  \};/);
assert.ok(voicesMatch, 'the VOICES literal is present in js/audio.js (donor regex, ceilingbreak:513)');
const VOICE_NAMES = [...voicesMatch[1].matchAll(/^\s*(\w+):/gm)].map(x => x[1]).sort();

// ---------- stubs (copied from the frozen donors, see header) ----------

function makeAudioContext() {
  const ctx = {
    state: 'suspended',
    currentTime: 0,
    sampleRate: 8000,
    destination: { name: 'destination' },
    resumes: 0,
    suspends: 0,
    gains: 0,
    oscs: 0,
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
  ctx.createOscillator = () => {
    ctx.oscs++;
    return {
      type: '',
      frequency: {
        setValueAtTime() {},
        linearRampToValueAtTime() {},
        exponentialRampToValueAtTime() {},
      },
      connect() {},
      start() { ctx.started++; },
      stop() {},
    };
  };
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

// ---------- Part A: module unit legs, looping columns over the census ----------

test('L1 gesture-gate × census: nothing exists pre-gesture, no queued blast, first attempt starts on the one bus (D-N08/AUD-01, kills M1)', () => {
  assert.ok(VOICE_NAMES.length >= 8, `census derived ${VOICE_NAMES.length} names from the source`);
  for (const name of VOICE_NAMES) {
    const ctx = makeAudioContext();
    // The factory HOLDS the pendingContext (audio.js:50) but must not touch it
    // pre-gesture — the four counters below are the real witnesses (a mutant
    // building voices off the pending slot dies here, not just at :145).
    const audio = createAudio({ context: ctx, storage: makeStorage() });
    audio.handleEvent(name); // no throw is part of the assert (M1 throws here)
    assert.equal(ctx.gains, 0, `${name}: no nodes of any kind before gesture`);
    assert.equal(ctx.oscs, 0, `${name}: zero oscillators created pre-gesture`);
    assert.equal(ctx.bufferSources.length, 0, `${name}: zero bufferSources pre-gesture`);
    assert.equal(ctx.started, 0, `${name}: zero starts pre-gesture`);
    // gesture alone is lifecycle, not music (D-N08: no queued blast on init).
    audio.gesture(ctx);
    assert.equal(ctx.started, 0, `${name}: the first gesture starts ZERO voices`);
    assert.equal(ctx.gains, 1, `${name}: gesture builds exactly the one master gain`);
    // the same oracle shape for EVERY name: >=1 start, env -> master -> destination.
    audio.handleEvent(name);
    assert.ok(ctx.started >= 1, `${name}: the post-gesture attempt starts >=1 voice`);
    assert.equal(ctx.gainNodes[0].connectedTo, ctx.destination,
      `${name}: master sits on the destination bus`);
    assert.notEqual(ctx.gainNodes.at(-1), ctx.gainNodes[0]);
    assert.equal(ctx.gainNodes.at(-1).connectedTo, ctx.gainNodes[0],
      `${name}: voice envelope chains into the SAME master (single-bus law)`);
  }
});

test('L2 suspend-window + resume × census: dispatch never un-suspends, state preserved, bus re-arms after gesture (D3, kills M2)', () => {
  for (const name of VOICE_NAMES) {
    const ctx = makeAudioContext();
    const audio = createAudio({ storage: makeStorage() });
    audio.gesture(ctx);
    assert.equal(ctx.state, 'running', `${name}: gesture lands running`);
    audio.suspend();
    assert.equal(ctx.state, 'suspended', `${name}: suspend() parks the context`);
    assert.equal(ctx.suspends, 1, `${name}: the state guard calls suspend exactly once`);
    audio.suspend(); // redundant call: the state guard must swallow it
    assert.equal(ctx.suspends, 1, `${name}: never re-suspends an already-suspended ctx`);
    // THE suspend-window law (D3): no-sneaky-resume + state preserved. Node
    // starts during the frozen window are the honest shape (context time is
    // the browser-side guard) — NEVER asserted at node level through a stub.
    const resumesIn = ctx.resumes;
    audio.handleEvent(name); // no throw, no resume, no state change
    assert.equal(ctx.resumes, resumesIn, `${name}: dispatch never calls ctx.resume()`);
    assert.equal(ctx.state, 'suspended', `${name}: the suspended state is preserved`);
    // the resume column: gesture() re-arms the bus, nothing stays locked out.
    audio.gesture(ctx);
    assert.equal(ctx.state, 'running', `${name}: gesture after suspend resumes`);
    assert.ok(ctx.resumes > resumesIn, `${name}: the resume rides gesture, not dispatch`);
    const before = ctx.started;
    audio.handleEvent(name);
    assert.ok(ctx.started >= before + 1, `${name}: post-resume attempt starts again (no lock-out)`);
  }
});

test('L3 mute × census: the bus zeroes, every voice attempt leaves it at EXACTLY 0, settings persist per call (FR27, kills M3)', () => {
  for (const name of VOICE_NAMES) {
    const storage = makeStorage();
    const ctx = makeAudioContext();
    const audio = createAudio({ storage });
    audio.gesture(ctx);
    audio.setVolume(0.5);
    assert.equal(storage.writes.length, 1, `${name}: setVolume persists immediately`);
    audio.setMuted(true);
    assert.equal(ctx.gainNodes[0].gain.value, 0, `${name}: mute zeroes the master gain`);
    assert.equal(storage.writes.at(-1)[0], 'jumprope-audio', `${name}: setMuted write-through per call`);
    assert.deepEqual(JSON.parse(storage.writes.at(-1)[1]), { muted: true, volume: 0.5 });
    const writesIn = storage.writes.length;
    audio.handleEvent(name);
    assert.equal(ctx.gainNodes[0].gain.value, 0, `${name}: a voice never moves the muted bus`);
    assert.equal(storage.writes.length, writesIn, `${name}: a voice never writes settings`);
    audio.toggleMute();
    assert.equal(ctx.gainNodes[0].gain.value, 0.5, `${name}: unmute lands settings.volume on the bus`);
    assert.equal(storage.writes.length, writesIn + 1, `${name}: toggleMute persists (write-through, no debounce)`);
  }
});

test('L4 volume × census: setVolume lands + persists, voice attempts never move the bus (FR27, kills M4)', () => {
  for (const name of VOICE_NAMES) {
    const storage = makeStorage();
    const ctx = makeAudioContext();
    const audio = createAudio({ storage });
    audio.gesture(ctx);
    audio.setVolume(0.5);
    assert.equal(ctx.gainNodes[0].gain.value, 0.5, `${name}: volume lands on the one bus`);
    assert.deepEqual(JSON.parse(storage.writes.at(-1)[1]), { muted: false, volume: 0.5 },
      `${name}: persisted in the same call`);
    const writesIn = storage.writes.length;
    audio.handleEvent(name);
    assert.equal(ctx.gainNodes[0].gain.value, 0.5, `${name}: voices never write master`);
    assert.equal(storage.writes.length, writesIn, `${name}: voices never persist settings`);
    audio.setVolume(0.25);
    assert.equal(ctx.gainNodes[0].gain.value, 0.25, `${name}: re-set lands immediately`);
    assert.equal(storage.writes.length, writesIn + 1, `${name}: re-set persists per call (write-through)`);
    assert.deepEqual(JSON.parse(storage.writes.at(-1)[1]), { muted: false, volume: 0.25 });
  }
});

test('L5 fences, no boots: EXACTLY the eight derived names, chargeUsed silent, specifier/track/chargeUsed source censuses (D4, kills M7)', async () => {
  // D4: VOICES is frozen at eight; chargeUsed is a SIM event reaching the
  // lookup and dying silently (juice-only, shell.js:18) — a ninth voice dies
  // HERE and at ceilingbreak §6 + iframesjuice:596.
  assert.deepEqual(VOICE_NAMES, ['ascend', 'jump', 'nearMiss', 'pick', 'ropeLost', 'skip', 'trip', 'win'],
    'the derived census is EXACTLY the eight shipped voices — nothing joins, chargeUsed ABSENT');
  assert.ok(!VOICE_NAMES.includes('chargeUsed'), 'chargeUsed is NOT a voice');
  const ctx = makeAudioContext();
  const audio = createAudio({ storage: makeStorage() });
  audio.handleEvent('chargeUsed');
  assert.equal(ctx.started, 0, 'chargeUsed remains silent at the VOICES lookup (audio.js:212-213)');
  audio.gesture(ctx);
  audio.handleEvent('chargeUsed');
  assert.equal(ctx.started, 0, 'chargeUsed remains silent at the VOICES lookup (audio.js:212-213)');

  // source censuses over the whole js/ tree
  const files = (await readdir(jsDir)).filter(f => f.endsWith('.js')).sort();
  const srcs = new Map();
  for (const f of files) srcs.set(f, await readFile(resolve(jsDir, f), 'utf8'));
  let specifierHits = 0;
  let trackHits = [];
  let chargeHits = [];
  for (const [f, src] of srcs) {
    specifierHits += (src.match(/['"]\.\/audio\.js['"]/g) ?? []).length;
    src.split('\n').forEach((line, i) => {
      if (line.includes('audio/track.ogg')) trackHits.push(`${f}:${i + 1}`);
      if (line.includes('chargeUsed')) chargeHits.push(`${f}:${i + 1}`);
    });
  }
  assert.equal(specifierHits, 1,
    "the './audio.js' specifier occurs EXACTLY once in js/ — the dynamic sole-consumer import (shell.js:64, D-N07)");
  assert.deepEqual(trackHits, ['audio.js:8'],
    'the audio/track.ogg literal lives only at js/audio.js:8 (TRACK-1 deferred, 5.6 lane)');
  // Story 6.2 re-contract (amendment 2, C2): the filename MULTISET, not
  // absolute lines — the line literal rotted at the first game.js edit (any
  // story shifting the push's line reddened it with zero product signal).
  // Armed exactly as before against the real threats: a ninth voice dies
  // upstairs, an audio-surface chargeUsed hit changes THIS set.
  assert.deepEqual(chargeHits.map((h) => h.split(':')[0]).sort(), ['game.js', 'shell.js'],
    'chargeUsed appears in js/ ONLY in game.js (the sim push) + shell.js (the JUICE_TIERS row) — no audio surface');
});

test('L6 settings-apply-at-creation pair + coercion trio: the reloaded value lands on the master BEFORE any voice (FR27/FR24 seam, kills M5)', () => {
  // pair leg 1: persisted volume lands at creation (audio.js:75)
  const s1 = makeStorage([['jumprope-audio', JSON.stringify({ volume: 0.3, muted: false })]]);
  const ctx1 = makeAudioContext();
  const a1 = createAudio({ storage: s1 });
  a1.gesture(ctx1);
  assert.equal(ctx1.gainNodes[0].gain.value, 0.3, 'the restored volume is on the bus BEFORE any voice');
  for (const name of VOICE_NAMES) a1.handleEvent(name);
  assert.equal(ctx1.gainNodes[0].gain.value, 0.3, 'old and new voices alike leave the restored gain unmoved');
  // pair leg 2: muted wins the ternary
  const s2 = makeStorage([['jumprope-audio', JSON.stringify({ volume: 0.3, muted: true })]]);
  const ctx2 = makeAudioContext();
  const a2 = createAudio({ storage: s2 });
  a2.gesture(ctx2);
  assert.equal(ctx2.gainNodes[0].gain.value, 0, 'restored muted wins the ternary: EXACTLY 0, not 0.3');
  for (const name of VOICE_NAMES) a2.handleEvent(name);
  assert.equal(ctx2.gainNodes[0].gain.value, 0, 'no voice re-opens the restored mute');
  // coercion trio (audio-side echoes of the 5.4-L10 law; asymmetry SHIPPED, pinned never fixed)
  const zero = makeStorage();
  saveSettings(zero, { muted: false, volume: 0 });
  assert.deepEqual(loadSettings(makeStorage([['jumprope-audio', zero.writes[0][1]]])), { muted: false, volume: 0 },
    'volume 0 survives the round-trip as 0 — zero is a legal volume (audio.js:10-16)');
  const zeroBoot = makeAudioContext();
  createAudio({ storage: makeStorage([['jumprope-audio', zero.writes[0][1]]]) }).gesture(zeroBoot);
  assert.equal(zeroBoot.gainNodes[0].gain.value, 0, 'a restored volume 0 lands 0 at creation');
  assert.deepEqual(loadSettings(makeStorage([['jumprope-audio', '{{corrupt']])), { muted: false, volume: 1 },
    'a corrupt blob degrades to defaults, never a throw');
  assert.deepEqual(
    loadSettings(makeStorage([['jumprope-audio', JSON.stringify({ muted: false, volume: 0.5, reducedMotion: true })]])),
    { muted: false, volume: 0.5 },
    'shape-pinned read: unknown keys are dropped, exactly the two-key shape returns');
});

test('L7 absent-track lifecycle walk: ONE fetch attempt after gesture, ZERO retries through suspend/resume/mute/volume (FR29 restatement, kills M6)', async () => {
  let count = 0;
  const ctx = makeAudioContext();
  const audio = createAudio({
    storage: makeStorage(),
    fetchFn: () => { count++; return Promise.reject(new Error('404 in the sandbox')); },
  });
  audio.gesture(ctx);
  assert.equal(count, 1, 'the first gesture attempts the track exactly once');
  audio.suspend();
  audio.gesture(ctx);       // resume arm — never a re-fetch site
  audio.setMuted(true);
  audio.setVolume(0.5);
  audio.setMuted(false);
  await settle();
  assert.equal(audio.getStatus().trackMissing, true, 'trackMissing is sticky (audio.js:123-126)');
  assert.equal(audio.getStatus().trackPlaying, false, 'silence: the graceful path never fakes a source');
  assert.equal(count, 1, 'ZERO retries across the whole lifecycle walk');
  assert.equal(ctx.bufferSources.length, 0, 'no source node was ever created for the absent track');
  assert.equal(audio.playTrack(), false, 'a manual call after the settled miss still no-ops');
  assert.equal(count, 1, 'and costs zero further fetches');

  // the throwing-sync variant: same flags, same one attempt, no unhandled rejection
  let syncCount = 0;
  const ctx2 = makeAudioContext();
  const sync = createAudio({
    storage: makeStorage(),
    fetchFn: () => { syncCount++; throw new Error('synchronous boom'); },
  });
  sync.gesture(ctx2);
  assert.equal(syncCount, 1, 'the sync throw is caught at the call site (audio.js:104-110)');
  assert.equal(sync.getStatus().trackMissing, true);
  assert.equal(sync.getStatus().trackPlaying, false);
  sync.gesture(ctx2);
  assert.equal(sync.playTrack(), false);
  assert.equal(syncCount, 1, 'the sticky flag stops the sync path too');
  await settle();
  assert.equal(syncCount, 1, 'still one attempt after the microtask drain');
});

// ---------- Part B: boot legs, EXACTLY four boots suite-wide (NFR4) ----------

let bootCount = 0;

// bootAudioShell fork (tests/audio.test.js:291-396 donor, see header): render
// seam -> recording stub, game/rope/player from file: URLs, the dynamic
// './audio.js' specifier rewritten to a wrapper carrying the voice log AND
// the gesture/suspend call counters (polish.test.js:187-191 idiom) plus
// globalThis.__audio for L9's direct per-voice dispatch. document.hidden is
// part of the stub so the visibilitychange seam reads a real direction.
async function bootLifecycleShell({ storageMap } = {}) {
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
  const views = [];
  globalThis.__shellTestViews = views;
  const log = { voices: [], gestures: 0, suspends: 0 };
  globalThis.__lifecycleAudio = log;
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
    consoleError: console.error,
    audio: globalThis.__audio
  };
  const documentStub = { getElementById: id => (id === 'game' ? canvas : hud[id]), hidden: false };
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
  // Track content is human-gated: the shipping default is a rejecting fetch
  // (the donor's AC3 shape — the graceful-missing path end-to-end).
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

  globalThis.document = documentStub;
  const fileHref = name => pathToFileURL(resolve(jsDir, name)).href;
  // Wrapper over the REAL js/audio.js: same surface, plus the call log the
  // story's L8/L9 counters read (polish idiom), plus the __audio stash.
  const audioWrapHref = 'data:text/javascript,' + encodeURIComponent([
    'import * as real from "' + fileHref('audio.js') + '";',
    'export function createAudio(opts) {',
    '  const a = real.createAudio(opts);',
    '  const log = globalThis.__lifecycleAudio;',
    '  const w = Object.assign({}, a, {',
    '    handleEvent(name) { log.voices.push(name); return a.handleEvent(name); },',
    '    gesture(...args) { log.gestures++; return a.gesture(...args); },',
    '    suspend(...args) { log.suspends++; return a.suspend?.(...args); },',
    '  });',
    '  globalThis.__audio = w;',
    '  return w;',
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

  await import('data:text/javascript,' + encodeURIComponent(`${src}\n//audiolifecycle-boot ${++bootCount}`));
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
    if (saved.audio === undefined) delete globalThis.__audio;
    else globalThis.__audio = saved.audio;
  };
  return { frames, handlers, hud, views, log, contexts, map, document: documentStub, restore };
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

// The donor's scripted-jumper pump (audio.test.js:417-437 shape), kept RUNNING
// instead of driven to choose: jump-holds when grounded with the rope in
// [0.20, 0.28). Throws loudly on trip — the legs want a LIVE channel.
function pumpRunning(env, st, frames) {
  for (let i = 0; i < frames; i++) {
    if (env.views.length === 0) { tick(env, st); continue; } // first frame renders views[0]
    const view = env.views.at(-1);
    assert.notEqual(view.run.status, 'over', 'lifecycle harness: the scripted jumper tripped — the channel died');
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

// Post-RESUME variant: resumeFromPause re-arms the D-07 lead-in lock with the
// WALL clock (reentryAt = performance.now(), LEAD_IN_MS = 450 REAL ms), and a
// frame pump advances only virtual time — so jump holds are legitimately
// discarded and the run may die (ropeLost strip → trip). That is the honest
// post-pause shape; this pump tolerates the death (the log keeps advancing
// through the terminal events) instead of asserting a fiction.
function pumpPostResume(env, st, frames) {
  for (let i = 0; i < frames && env.views.at(-1).run.status !== 'over'; i++) {
    if (env.views.length === 0) { tick(env, st); continue; }
    const view = env.views.at(-1);
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

// Bring the boot to a running, event-emitting state: tap, start, pump a bit.
function startRunning(env) {
  const st = { t: performance.now(), budget: 0 };
  press(env);
  tick(env, st);
  pumpRunning(env, st, 20);
  assert.equal(env.views.at(-1).run.status, 'running', 'the boot reached running');
  return st;
}

test('L8 pause + tab-hide walks (boots A/B, the ONE shared audio seam): suspends EXACTLY once per walk, voice log frozen across each paused window while frames run, resume re-arms, focus never un-suspends (FR27 seams shell.js:246/:262/:327-348, kills M8)', async () => {
  const env = await bootLifecycleShell();
  try {
    assert.equal(env.contexts.length, 0, 'zero contexts at boot (D-N08)');
    const st = startRunning(env);
    assert.equal(env.contexts.length, 1, 'the tap is the one construction site');
    const ctx = env.contexts[0];
    assert.ok(env.log.voices.length >= 1, 'the live channel already reached the voice log');
    const log0 = env.log.voices.length;
    const resumes0 = ctx.resumes;

    // Real input order: keydowns land BETWEEN frames; the pump's final tick
    // already drained every queued intent, so nothing straddles pause entry.
    keydown(env, 'KeyP'); // the pause seam
    assert.equal(env.log.suspends, 1, 'enterPause called audio.suspend exactly once (shell.js:246)');
    assert.equal(ctx.suspends, 1, 'the state guard let exactly one ctx.suspend through');
    assert.equal(ctx.state, 'suspended', 'pause parks context time');

    pumpRunning(env, st, 12); // frames KEEP RUNNING behind the freeze frame
    assert.equal(env.log.voices.length, log0, 'the voice log is FROZEN across the paused window — the drain gate holds');
    assert.equal(ctx.resumes, resumes0, 'no sneaky resume while paused (D3 at the seam)');
    assert.equal(ctx.state, 'suspended', 'the pause is not self-healing');

    keydown(env, 'KeyP'); // the resume seam
    assert.equal(ctx.state, 'running', 'resume re-arms the context via resumeFromPause/gesture (shell.js:262)');

    pumpPostResume(env, st, 40);
    assert.ok(env.log.voices.length > log0, 'the log advances again after resume');
    assert.ok(env.log.voices.length - log0 <= 10,
      'no burst beyond live events: <=10 voices across 40 post-resume frames (two revolutions)');
    for (const n of env.log.voices) {
      assert.ok(VOICE_NAMES.includes(n), `logged name '${n}' is a real voice — the seam invented nothing`);
    }
  } finally {
    env.restore();
  }
  // boot B: the visibility-path entry of the SAME audio seam — one leg, two
  // boots (story Task 2a: "boot A: P path; boot B: visibility path").
  await (async () => {
  const env = await bootLifecycleShell();
  try {
    const st = startRunning(env);
    const ctx = env.contexts[0];
    const log0 = env.log.voices.length;
    const resumes0 = ctx.resumes;
    const phase0 = env.views.at(-1).rope.phase;

    env.document.hidden = true;
    env.handlers.window.visibilitychange();
    assert.equal(env.log.suspends, 1, 'tab-hide suspended audio exactly once (shared enterPause seam)');
    assert.equal(ctx.state, 'suspended', 'hidden+running routes through releaseEverything + enterPause');

    const phases = [];
    for (let i = 0; i < 9; i++) {
      tick(env, st); // still hidden: zero sim steps, zero voices
      phases.push(env.views.at(-1).rope.phase);
    }
    assert.ok(phases.every(p => p === phase0), 'hidden mid-run: the sim is frozen');
    assert.match(env.hud['hud-prompt'].textContent, /paused — press P to resume/,
      'the freeze-frame prompt renders (updateHud runs in the frame, donor polish:427)');
    assert.equal(env.log.voices.length, log0, 'the voice log is FROZEN across the hidden window');
    assert.equal(ctx.resumes, resumes0, 'nothing resumed behind the tab');

    env.handlers.window.focus(); // T-05-01 race: focus must NOT resurrect the context
    assert.equal(ctx.state, 'suspended', 'focus never un-suspends a paused context (shell.js:346-347)');
    assert.equal(ctx.resumes, resumes0, 'no resumes++ before any resume action');

    env.document.hidden = false;
    env.handlers.window.visibilitychange(); // auto-resume through the lead-in
    assert.equal(ctx.state, 'running', 'tab-return re-arms through resumeFromPause/gesture');

    pumpPostResume(env, st, 40);
    assert.ok(env.log.voices.length > log0, 'the log advances again after the tab returns');
    assert.ok(env.log.voices.length - log0 <= 10, 'no burst beyond live events after the return');
  } finally {
    env.restore();
  }
  })();
});

test('L9 reload × old+new voices (two boots, shared Map): persisted volume lands pre-voice; real channel skip/jump + direct win/ascend/ropeLost never move it (FR27/FR24 seam, kills M5)', async () => {
  const shared = new Map();
  // boot A: tap, then Minus×5 — persisted, write-through per call
  const envA = await bootLifecycleShell({ storageMap: shared });
  let persisted;
  try {
    keydown(envA, 'Space');
    assert.equal(envA.contexts.length, 1, 'boot A creates on first tap only');
    for (let i = 0; i < 5; i++) keydown(envA, 'Minus');
    persisted = JSON.parse(shared.get('jumprope-audio'));
    assert.equal(persisted.muted, false, 'boot A leaves sound on');
    assert.ok(Math.abs(persisted.volume - 0.5) < 1e-9,
      `Minus×5 persisted ${persisted.volume} — the 0.5 step-down (float-exact value round-trips verbatim)`);
  } finally {
    envA.restore();
  }

  // boot B: the reload — settings restore APPLY AT CREATION, before any voice
  const envB = await bootLifecycleShell({ storageMap: shared });
  try {
    keydown(envB, 'Space');
    assert.equal(envB.contexts.length, 1, 'the reload boot still creates exactly one context');
    const ctx = envB.contexts[0];
    assert.equal(envB.log.voices.length, 0, 'no voice has crossed yet');
    assert.equal(ctx.gainNodes[0].gain.value, persisted.volume,
      'the persisted volume is on the master BEFORE any voice — apply-at-creation (audio.js:75)');

    // OLD-channel proof: the scripted jumper drives real sim events + shell jumps.
    const st = { t: performance.now(), budget: 0 };
    pumpRunning(envB, st, 40);
    assert.equal(envB.views.at(-1).run.status, 'running', 'the reloaded run is live (no choose/over window crossed)');
    assert.ok(envB.log.voices.includes('skip'), 'the OLD sim-channel skip reaches audio on the reloaded boot');
    assert.ok(envB.log.voices.includes('jump'), 'the shell-side release jump reaches audio');
    assert.equal(ctx.gainNodes[0].gain.value, persisted.volume, 'no old voice moved the restored bus');

    // NEW-channel proof: direct per-voice dispatch of the 5.1/5.2 names.
    const started0 = ctx.started;
    for (const name of ['win', 'ascend', 'ropeLost']) globalThis.__audio.handleEvent(name);
    assert.ok(ctx.started > started0, 'the NEW voices start through the SAME bus on the reloaded boot');
    assert.equal(ctx.gainNodes[0].gain.value, persisted.volume, 'no new voice moved the restored bus');

    for (const n of envB.log.voices) {
      assert.ok(VOICE_NAMES.includes(n), `live-channel name '${n}' ∈ the eight — the AC1 event set on a real run`);
    }
  } finally {
    envB.restore();
  }
});
