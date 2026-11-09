import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createAudio } from '../js/audio.js';
import * as game from '../js/game.js';
import { mulberry32 } from './support/balance-harness.js';

// Story 5.1 (FR28/FR27/FR16, NFR5/NFR8): the ascent stinger & win fanfare.
// The smallest possible product delta — js/audio.js VOICES gains exactly two
// procedural voices — fenced here in ONE suite: Part A unit legs on the leaf
// module (stub contexts, harness copies from tests/audio.test.js per the
// leaf-import rationale at audio.test.js:9-11), the derived-signature-set
// distinctness oracle in the tests/feelcap.test.js:130-145 idiom, cheap
// sim-derived channel-truth legs on the REAL game.js event arms, and Part B
// real-shell boots (bootAudioShell copy per the audio.test.js:285-396
// harness-copy precedent, extended with the ceilingmarker/summitapproach
// game-wrap stamp donor and the feelcap single-clock/stub-delete discipline).
// Direct '../js/game.js' import: precedented verbatim by
// tests/summitapproach.test.js:9 — the boundary graph gains no new node
// (tests/boundary.test.js:27-43 derives entries from these imports).

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');
const fileHref = name => pathToFileURL(resolve(jsDir, name)).href;
const settle = () => new Promise(r => setTimeout(r, 0));
const { AREAS, SUMMIT_AREA } = game;

// ---------- Part A stubs (audio.test.js:24-88 counting-stub copy) ----------

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

function makeStorage() {
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, v); },
  };
}

// Recording context — feelcap.test.js:55-128 idiom: every osc.start logs
// `osc:<type>:<f0>`; buffer-source starts log 'noise'/'track' tagged via the
// module's OWN makeNoise buffer size. Voice identity is read from the shipped
// module's behavior, never hard-coded here (the oracle's "never twice" rule).
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

// The derived-signature-set oracle (feelcap.test.js:130-145 idiom, widened to
// all seven shipped names by Story 5.1): drive the REAL createAudio and
// collect, per event name, the Set of signatures started. Expectations
// downstream derive from THIS — never a second hard-coded table.
function voiceSignatureSets() {
  const ctx = makeRecordingContext();
  const audio = createAudio({ storage: { getItem: () => null, setItem: () => {} } });
  audio.gesture(ctx);
  const out = {};
  for (const name of ['jump', 'skip', 'nearMiss', 'trip', 'pick', 'ascend', 'win']) {
    const before = ctx.voiceLog.length;
    audio.handleEvent(name);
    out[name] = new Set(ctx.voiceLog.slice(before));
  }
  return out;
}

const intersect = (x, y) => [...x].filter(s => y.has(s));

// ---------- Part A: census / lifecycle legs (AC1, AC3; Task 1a) ----------

test('ascend post-gesture starts oscillators on the master bus (AC1)', () => {
  const ctx = makeAudioContext();
  const audio = createAudio({ storage: makeStorage() });
  audio.gesture(ctx);
  const master = ctx.gainNodes[0];
  const before = ctx.started;
  audio.handleEvent('ascend');
  const n = ctx.started - before;
  assert.ok(n >= 2 && n <= 3,
    `the stinger is a 2-3 note rise per the story — bounded so a swapped or bloated voice goes red (got ${n})`);
  for (const g of ctx.gainNodes.slice(1)) {
    assert.equal(g.connectedTo, master, 'every voice envelope rides the ONE master gain (FR27)');
  }
});

test('win post-gesture starts at least three oscillators on the master bus (AC2)', () => {
  const ctx = makeAudioContext();
  const audio = createAudio({ storage: makeStorage() });
  audio.gesture(ctx);
  const master = ctx.gainNodes[0];
  const before = ctx.started;
  audio.handleEvent('win');
  const n = ctx.started - before;
  assert.ok(n >= 3 && n <= 4,
    `the fanfare is the biggest moment: 3-4 oscillators — bounded so a swapped voice goes red (got ${n})`);
  for (const g of ctx.gainNodes.slice(1)) {
    assert.equal(g.connectedTo, master, 'the fanfare rides the same master bus (FR27)');
  }
});

test('ascend BEFORE gesture: no error, no queued blast on unlock (AC3, NFR5)', () => {
  const audio = createAudio({ storage: makeStorage() });
  const ctx = makeAudioContext();
  audio.handleEvent('ascend'); // the keyboard-only player's first ascent, pre-gesture
  assert.equal(ctx.started, 0, 'nothing may start while the context is un-born');
  audio.gesture(ctx);
  assert.equal(ctx.started, 0, 'the unlock must not flush a queued blast — the drop is by state');
});

test('win BEFORE gesture: no error, no queued blast on unlock (AC3, NFR5)', () => {
  const audio = createAudio({ storage: makeStorage() });
  const ctx = makeAudioContext();
  audio.handleEvent('win');
  assert.equal(ctx.started, 0, 'nothing may start while the context is un-born');
  audio.gesture(ctx);
  assert.equal(ctx.started, 0, 'the unlock must not flush a queued fanfare');
});

test('muted ascend/win route through the zeroed master without error (FR27 leg)', () => {
  const ctx = makeAudioContext();
  const audio = createAudio({ storage: makeStorage() });
  audio.gesture(ctx);
  audio.setMuted(true);
  assert.equal(ctx.gainNodes[0].gain.value, 0, 'mute zeroes the master gain');
  const before = ctx.started;
  audio.handleEvent('ascend');
  audio.handleEvent('win');
  assert.ok(ctx.started - before >= 1, 'the voices still schedule (routing intact) — silence is the bus');
});

// ---------- Part A: distinctness oracle legs (AC2; Task 1b) ----------

test('oracle: the ascend signature set is non-empty and disjoint with every other voice (AC2)', () => {
  const sets = voiceSignatureSets();
  assert.ok(sets.ascend.size >= 2,
    `derived ascend set must carry staggered material (size ${sets.ascend.size} — red by design until the voice ships)`);
  for (const other of ['jump', 'skip', 'nearMiss', 'trip', 'pick', 'win']) {
    assert.deepEqual(intersect(sets.ascend, sets[other]), [],
      `the ascend stinger must share no (type,freq) signature with ${other}`);
  }
});

test('oracle: the win signature set is non-empty and disjoint with every other voice (AC2)', () => {
  const sets = voiceSignatureSets();
  assert.ok(sets.win.size >= 3,
    `a 3-4 note fanfare must derive >= 3 signatures (size ${sets.win.size} — red by design until the voice ships)`);
  for (const other of ['jump', 'skip', 'nearMiss', 'trip', 'pick', 'ascend']) {
    assert.deepEqual(intersect(sets.win, sets[other]), [],
      `the win fanfare must share no (type,freq) signature with ${other}`);
  }
});
// Review round 5.1 (Blind F1): the Set-oracle is permutation-blind and the
// count floors were one-sided — a verbatim swap of the ascend/win bodies or a
// reversed (descending) fanfare shipped green. Bounded counts above + these
// ordered-schedule legs fence the voices' rising identities (the story's own
// "I went up / I won"): strictly increasing f0 over strictly increasing t,
// derived from the shipped module's scheduling, never a hard-coded table.
function voiceSched(name) {
  const ctx = makeRecordingContext();
  const audio = createAudio({ storage: { getItem: () => null, setItem: () => {} } });
  audio.gesture(ctx);
  const before = ctx.schedLog.length;
  audio.handleEvent(name);
  return ctx.schedLog.slice(before).map(e => ({ t: e.t, f0: parseFloat(e.sig.split(':')[2]) }));
}

test('identity: ascend and win note lines are strictly rising in f0 over rising t (Blind F1)', () => {
  for (const name of ['ascend', 'win']) {
    const notes = voiceSched(name);
    assert.ok(notes.length >= 2, `${name} must schedule a multi-note line (got ${notes.length})`);
    for (let i = 1; i < notes.length; i++) {
      assert.ok(notes[i].t > notes[i - 1].t,
        `${name} note ${i}: starts must be strictly staggered (${notes[i].t} <= ${notes[i - 1].t})`);
      assert.ok(notes[i].f0 > notes[i - 1].f0,
        `${name} note ${i}: the line must rise (${notes[i].f0} <= ${notes[i - 1].f0} — a descending or swapped voice reds here)`);
    }
  }
});

// ---------- Part A: channel-truth legs (sim-derived; Task 1c) ----------

const STEP = 1 / 60;
const PARKED = { phase: 0.05, period: 100 };
const GROUND = { y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 };
const rngStub = () => 0.5;
const areaEvents = events => events.filter(e => e === 'ascend' || e === 'win').length;

test('channel truth: an area-1 ceiling-straddle tick emits exactly ["ascend"] (AC1 feed)', () => {
  const out = game.tickRun(
    { ...game.createRun(), area: 1, altitude: AREAS[0].ceiling + 60 },
    { ...PARKED }, { ...GROUND }, STEP, rngStub);
  assert.deepEqual(out.events, ['ascend'], 'the ascend name is already the shipped channel fact (silent until 5.1)');
  assert.equal(out.run.area, 2, 'one step that tick');
  assert.equal(out.run.status, 'running');
});

test('channel truth: 4->5 ascend, then a win tick carrying no offer and no ascend (AC2 feed)', () => {
  const t1 = game.tickRun(
    { ...game.createRun(), area: 4, altitude: AREAS[4].ceiling + 50 },
    { ...PARKED }, { ...GROUND }, STEP, rngStub);
  assert.deepEqual(t1.events, ['ascend'], 'tick 1 is ascend-only (frozen summitapproach §1.7 echo)');
  const t2 = game.tickRun(t1.run, t1.rope, { ...GROUND }, STEP, rngStub);
  assert.equal(t2.run.status, 'over', 'the win lands the NEXT tick');
  assert.ok(t2.events.includes('win'), 'the win name reaches the channel — the fanfare\'s trigger');
  assert.ok(!t2.events.includes('offer') && !t2.events.includes('ascend'),
    'no phantom pick announcement and no ascend on the win tick (game.js:271-272 splice)');
  let extra = 0;
  let r = t2.run;
  for (let t = 0; t < 2; t++) {
    const o = game.tickRun(r, t2.rope, { ...GROUND }, STEP, rngStub);
    extra += areaEvents(o.events);
    r = o.run;
  }
  assert.equal(extra, 0, 'quiet after: the fanfare trigger fires on exactly one transition tick');
});

// ---------- Part B: real-shell boot legs (bootAudioShell copy; Task 1d) ----------

let bootCount = 0;
const FR = 50; // ms per pumped frame (audio.test.js tick idiom)

// bootAudioShell copy (audio.test.js:291-396 precedent) with three documented
// deltas: (1) the './game.js' specifier rewrites to the stamp donor
// (ceilingmarker/summitapproach idiom) — globalThis.__asScript =
// { calls, patch } patches the INPUT run on the Nth tickRun call, so a real
// ascend/win transition drives the REAL drain; (2) the single-clock
// performance stub + seeded Math.random (feelcap bootCap:180-201 discipline)
// make cross-boot timelines comparable; (3) audioReady:false deletes the
// AudioContext stub (feelcap:203-213) for the NFR8 audio-absent boot.
async function bootStingerShell({ audioReady = true } = {}) {
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
    addEventListener: (type, fn) => { handlers.canvas[type] = fn; },
  };
  const views = [];
  globalThis.__stingerViews = views;
  const voices = [];
  globalThis.__stingerAudioLog = voices;
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
  globalThis.document = { getElementById: id => (id === 'game' ? canvas : hud[id]) };
  globalThis.window = { addEventListener: (type, fn) => { handlers.window[type] = fn; } };
  globalThis.requestAnimationFrame = cb => { frames.push(cb); return frames.length; };
  Object.defineProperty(globalThis, 'localStorage', { value: storageStub, configurable: true });
  globalThis.performance = { now: () => clock.t };
  Math.random = mulberry32(12345); // determinism for any rng consumption; the
  // compared timelines end before the tenth skip, so rng is never actually
  // drawn there (feelcap:201-202 discipline).
  if (audioReady) {
    globalThis.AudioContext = function StubAudioContext() {
      const ctx = makeAudioContext();
      contexts.push(ctx);
      return ctx;
    };
    globalThis.fetch = () => Promise.reject(new Error('no track in the sandbox'));
  } else {
    delete globalThis.AudioContext; // the shipped degradation path: audio.js
    // loads but stays inert BY STATE; fetch untouched (feelcap 'absent' arm).
  }
  console.error = () => {};

  const renderStubHref = 'data:text/javascript,' + encodeURIComponent([
    'export function createScene() {',
    '  return {',
    '    render(view) {',
    '      globalThis.__stingerViews.push(view);',
    '    }',
    '  };',
    '}',
  ].join('\n'));

  const gameWrapHref = 'data:text/javascript,' + encodeURIComponent([
    `export * from "${fileHref('game.js')}";`,
    'import * as real from "' + fileHref('game.js') + '";',
    'export const tickRun = (...args) => {',
    '  const s = globalThis.__asScript;',
    '  if (s) {',
    '    s.n = (s.n || 0) + 1;',
    '    if (!s.done && s.n === s.calls) {',
    '      s.done = true;',
    '      args = [{ ...args[0], ...s.patch }, ...args.slice(1)];',
    '    }',
    '  }',
    '  return real.tickRun(...args);',
    '};',
  ].join('\n'));

  // Wrapper over the REAL js/audio.js: same surface, plus a voice log —
  // one argument forwarded, exactly like the five frozen harness wrappers.
  const audioWrapHref = 'data:text/javascript,' + encodeURIComponent([
    'import * as real from "' + fileHref('audio.js') + '";',
    'export function createAudio(opts) {',
    '  const a = real.createAudio(opts);',
    '  return Object.assign({}, a, { handleEvent(name) {',
    '    globalThis.__stingerAudioLog.push(name);',
    '    return a.handleEvent(name);',
    '  } });',
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

  await import('data:text/javascript,' + encodeURIComponent(`${src}\n//stinger-boot ${++bootCount}`));
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
    console.error = saved.consoleError;
  };
  return { frames, handlers, hud, views, voices, contexts, clock, restore };
}

function tick(env) {
  env.clock.t += FR;
  env.frames.at(-1)(env.clock.t);
}

function press(env) {
  env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
}

function release(env) {
  env.handlers.window.keyup({ code: 'Space' });
}

// driveToChoose copy (audio.test.js:417-436) generalized to a predicate, with
// an optional per-frame [phase, score] tap for the NFR8 byte-identity leg.
function driveTo(env, pred, { budget = 1500, timeline = null } = {}) {
  press(env);
  tick(env);
  for (let n = 0; n < budget; n++) {
    const v = env.views.at(-1);
    if (timeline) timeline.push([v.rope.phase, v.run.score]);
    if (pred(v)) return;
    assert.notEqual(v.run.status, 'over', 'stinger harness: the scripted jumper tripped');
    if (v.run.status === 'running' && v.player.grounded
        && v.rope.phase >= 0.2 && v.rope.phase < 0.28) {
      press(env);
      tick(env);
      release(env);
      tick(env);
    } else {
      tick(env);
    }
  }
  assert.fail('stinger harness: the predicate never landed within the frame budget');
}

test('real shell drains a real ascend transition to handleEvent — exactly once, beside the old voices (AC1)', async () => {
  globalThis.__asScript = { calls: 5, n: 0, done: false, patch: { altitude: AREAS[0].ceiling + 60 } };
  const env = await bootStingerShell();
  try {
    driveTo(env, v => v.run.status === 'choose');
    assert.equal(env.voices.filter(v => v === 'ascend').length, 1,
      "a real ceiling-break tick reaches audio.handleEvent('ascend') exactly once (D-N02)");
    assert.ok(env.voices.includes('skip') && env.voices.includes('jump'),
      'the frozen channel legs keep flowing beside the new voice');
  } finally {
    env.restore();
    globalThis.__asScript = null;
  }
});

test('real shell drains the summit win to handleEvent once per run-end — quiet after (AC2)', async () => {
  globalThis.__asScript = {
    calls: 5, n: 0, done: false,
    patch: { area: SUMMIT_AREA, altitude: AREAS[SUMMIT_AREA - 1].ceiling + 50 },
  };
  const env = await bootStingerShell();
  try {
    press(env);
    tick(env);
    for (let n = 0; n < 100 && env.views.at(-1).run.status !== 'over'; n++) tick(env);
    assert.equal(env.views.at(-1).run.outcome, 'summit', 'the stamp won at the summit, never tripped');
    assert.ok(!env.voices.includes('trip'), 'the standing script never reached a trip');
    assert.equal(env.voices.filter(v => v === 'win').length, 1, "the real drain fires handleEvent('win') once");
    for (let n = 0; n < 60; n++) tick(env); // the over-record keeps pumping frames
    assert.equal(env.voices.filter(v => v === 'win').length, 1,
      'no dedupe state in audio.js — the CHANNEL owns once-per-run-end');
  } finally {
    env.restore();
    globalThis.__asScript = null;
  }
});

test('NFR8: audio-on vs audio-absent boots of the identical stamped script keep byte-identical phase+score timelines', async () => {
  const script = () => ({ calls: 5, n: 0, done: false, patch: { altitude: AREAS[0].ceiling + 60 } });
  globalThis.__asScript = script();
  const on = await bootStingerShell({ audioReady: true });
  let onTimeline;
  try {
    onTimeline = [];
    driveTo(on, v => v.run.skips >= 6, { timeline: onTimeline }); // ends before the tenth skip: rng never drawn
    assert.equal(on.contexts.length, 1, 'the audio-on boot really built the context');
    assert.ok(on.voices.includes('ascend'), 'the compared run really carried the new voice churn');
  } finally {
    on.restore();
    globalThis.__asScript = null;
  }
  globalThis.__asScript = script();
  const off = await bootStingerShell({ audioReady: false });
  let offTimeline;
  try {
    offTimeline = [];
    driveTo(off, v => v.run.skips >= 6, { timeline: offTimeline });
    assert.equal(off.contexts.length, 0, 'the audio-absent boot never built a context (BY STATE)');
  } finally {
    off.restore();
    globalThis.__asScript = null;
  }
  assert.equal(JSON.stringify(offTimeline), JSON.stringify(onTimeline),
    'the ascend voices are pure node churn — the rope keeps its own clock (NFR8)');
});
