import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createAudio } from '../js/audio.js';

// Plan 04-04 capstone (FEEL-01/02, AUD-02/04): the REAL js/shell.js frame
// loop driven headlessly, asserting Phase-4 success criteria 1, 2, 3 and 5
// ACROSS the lanes 04-01/02/03 shipped — a regression in any lane fails here
// even if its own suite stays green. Harness = tests/shell.test.js's
// bootShell source-rewrite mechanism (render3d -> recording view stub,
// game/rope/player/audio -> file: URLs, unique data: URL per boot) composed
// with tests/juice.test.js's scripted-jumper polling idiom and
// tests/audio.test.js's stub-context discipline. No resolvable relative
// specifier into js/ beyond audio.js (a leaf, allowed by the audio.test.js
// precedent) appears in this file, so tests/boundary.test.js stays green
// UNEDITED.
//
// Clock model: a single fake monotonic clock — globalThis.performance is
// stubbed to the harness counter for the whole boot window, so frame(now),
// the press/hold bookkeeping, and updateHud's FLASH_MS/PICK_HOLD_MS
// comparisons all consult the SAME virtual clock. Deltas are exact 4 ms
// strides with zero wall-clock dependence (T-4-10: the boot-to-script gap
// simply cannot exist), every poll loop carries a hard frame budget so a
// stuck script fails as a test, never as a hang, and the audio-on vs
// audio-off timeline comparison is bit-deterministic by construction.
//
// Stub discipline (T-4-09): every stub lands on globalThis inside bootCap's
// dynamic-import window and is restored in env.restore(); the audio-free
// determinism boot installs NO audio stub at all (no AudioContext, bare
// file: audio import — the shipped 'unsupported' degradation path).
const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');
const fileHref = name => pathToFileURL(resolve(jsDir, name)).href;

const FR = 4; // fake ms per pumped frame

let bootCount = 0;
const settle = () => new Promise(r => setTimeout(r, 0));

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// Recording AudioContext factory — audio.test.js's shape plus a per-context
// voice log: every osc.start records `osc:<type>:<f0>`; every buffer-source
// start records 'noise' (the trip voice's LCG buffer) or 'track', tagged via
// the module's OWN makeNoise buffer size (0.25 s × sampleRate) — the voice
// identity is read from the shipped module's behavior, never hard-coded here.
function makeRecordingContext(sampleRate = 8000) {
  const ctx = {
    state: 'suspended',
    currentTime: 0,
    sampleRate,
    destination: { name: 'destination' },
    voiceLog: [],
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
      start() { ctx.voiceLog.push(`osc:${rec.type}:${rec.frequency._f0}`); },
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

// Canonical per-event voice signatures DERIVED from the shipped module (the
// plan's "read from js/audio.js's table, not hard-coded twice"): drive the
// real createAudio through a recording context and log which signatures each
// handleEvent name starts.
function canonicalVoices() {
  const ctx = makeRecordingContext();
  const audio = createAudio({ storage: { getItem: () => null, setItem: () => {} } });
  audio.gesture(ctx);
  const out = {};
  for (const name of ['jump', 'skip', 'nearMiss', 'trip', 'pick']) {
    const before = ctx.voiceLog.length;
    audio.handleEvent(name);
    out[name] = new Set(ctx.voiceLog.slice(before));
  }
  return out;
}

// ---------------------------------------------------------------------------
// bootCap — bootShell-copy harness (shell.test.js mechanism + the './audio.js'
// rewrite plan 04-03 mandates, plus the single-clock stub).
// ---------------------------------------------------------------------------
async function bootCap({
  audioReady = true,
  storageMap,
  fetchMode = 'reject',
  rngSeed = 12345,
} = {}) {
  const id = `c${++bootCount}`;
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
  const contexts = [];
  const map = storageMap ?? new Map();
  const storageStub = {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, v); },
    removeItem: k => { map.delete(k); },
  };
  const st = { t: 0 };

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
  const viewKey = `__capViews_${id}`;
  const slotKey = `__capAudio_${id}`;
  globalThis[viewKey] = views;
  globalThis.document = { getElementById: name => (name === 'game' ? canvas : hud[name]) };
  globalThis.window = { addEventListener: (type, fn) => { handlers.window[type] = fn; } };
  globalThis.requestAnimationFrame = cb => { frames.push(cb); return frames.length; };
  Object.defineProperty(globalThis, 'localStorage', { value: storageStub, configurable: true });
  globalThis.performance = { now: () => st.t };
  Math.random = makeRng(rngSeed); // determinism for any rng consumption; the
  // compared timelines never reach rng (both legs end before the tenth skip).
  if (audioReady) {
    globalThis.AudioContext = function StubAudioContext() {
      const ctx = makeRecordingContext();
      contexts.push(ctx);
      return ctx;
    };
  } else {
    // T-4-09's clean boot: no audio stub at all — the shipped degradation
    // path is a silent no-op BY STATE (audio.js loaded, never initialised).
    delete globalThis.AudioContext;
  }
  if (fetchMode === 'reject') {
    globalThis.fetch = () => Promise.reject(new Error('no track in the sandbox'));
  } else if (fetchMode === 'resolve') {
    globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]) });
  } // 'absent': leave globalThis.fetch untouched (clean-boot leg)
  console.error = () => {};

  const renderStubHref = 'data:text/javascript,' + encodeURIComponent([
    'export function createScene() {',
    '  return {',
    '    render(view) {',
    `      globalThis.${viewKey}.push(view);`,
    '    }',
    '  };',
    '}',
  ].join('\n'));

  // Wrapper over the REAL js/audio.js (audio.test.js precedent): exposes the
  // live instance on a per-boot slot so tests can read getStatus()/playTrack
  // through the same object the shell wired — zero behavior change.
  const audioWrapHref = 'data:text/javascript,' + encodeURIComponent([
    `import * as real from "${fileHref('audio.js')}"`,
    'export function createAudio(opts) {',
    '  const a = real.createAudio(opts);',
    `  globalThis.${slotKey} = { instance: a };`,
    '  return a;',
    '}',
    'export const loadSettings = real.loadSettings;',
    'export const saveSettings = real.saveSettings;',
  ].join('\n'));

  let src = (await readFile(resolve(jsDir, 'shell.js'), 'utf8'))
    .replace(/from\s*['"]\.\/render3d\.js['"]/, `from '${renderStubHref}'`)
    .replace(/from\s*['"]\.\/game\.js['"]/, `from '${fileHref('game.js')}'`)
    .replace(/from\s*['"]\.\/rope\.js['"]/, `from '${fileHref('rope.js')}'`)
    .replace(/from\s*['"]\.\/player\.js['"]/, `from '${fileHref('player.js')}'`);
  src = audioReady
    ? src.replace(/import\(\s*['"]\.\/audio\.js['"]\s*\)/, `import('${audioWrapHref}')`)
    : src.replace(/import\(\s*['"]\.\/audio\.js['"]\s*\)/, `import('${fileHref('audio.js')}')`);

  await import('data:text/javascript,' + encodeURIComponent(`${src}\n//feelcap-boot ${id}`));
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
    delete globalThis[viewKey];
    delete globalThis[slotKey];
  };
  const audioSlot = audioReady ? globalThis[slotKey] : null;
  return {
    id, frames, handlers, hud, views, contexts, map, st,
    audio: audioSlot && audioSlot.instance, restore,
  };
}

// --- scripted-jumper machine (juice.test.js polling idiom, exact strides) ----
// Crossing choreography on the default-physics sim (gravity 1800, rope 1.3 s,
// feet window 0.45–0.55, clear threshold 18 px, near-miss ceiling 27 px):
//   cycle 0 lead-in — no input, the lead-in jump clears crossing 1 on its own
//   cycle 1 clean press — poll grounded && phase in [0.245, 0.255): the
//     release lands ~0.26, y at the crossing ~30 px — clears 18, stays under
//     27 => a CLEAN skip (streak resets), jump + skip voices fire
//   cycle 2 late press — poll grounded && phase in [0.40, 0.41): keydown,
//     pump once (pressIntent -> holdFrom), keyup; the release lands ~0.425
//     BEFORE the 0.45 crossing with y ~15 px: clearance fails, the delivered
//     press keeps the buffer alive => forgiven near-miss (skip + nearMiss).
//     With latePress:false this cycle gets NO input => the crossing trips
//     (the control leg).
//   cycle 3+ clean presses again (>= 2 crossings past the near-miss) until
//     endSkips (default 5) — or, with endSkips:Infinity, up to the tenth
//     skip: the card offer, the cycle+hold-confirm (pick voice), the resume,
//     and then a stand-and-trip (trip voice).
function scriptedRun(boot, {
  latePress = true,
  budget = 4000,
  endSkips = 5,
  until = null,
} = {}) {
  const rec = {
    phases: [], scores: [], prompts: [], juiceAt: [], voiceCur: [],
    crossings: [], cleanPressFrames: [], latePressFrame: null,
    chooseAt: null, confirmFrame: null, overAt: null,
  };
  const ctxOf = () => boot.contexts[0];
  const frameIdx = () => rec.phases.length - 1;
  const record = () => {
    const v = boot.views.at(-1);
    const n = rec.phases.length;
    const prevSkips = rec.crossings.length ? rec.crossings.at(-1).skips : 0;
    rec.phases.push(v.rope.phase);
    rec.scores.push(v.run.score);
    rec.prompts.push(boot.hud['hud-prompt'].textContent);
    rec.juiceAt.push(v.juice ? v.juice.at : null);
    rec.voiceCur.push(ctxOf() ? ctxOf().voiceLog.length : 0);
    if (n > 0 && v.run.skips > prevSkips) {
      rec.crossings.push({ frame: n, nearMiss: v.run.streak > 0, skips: v.run.skips });
    }
  };
  const pump = () => {
    boot.st.t += FR;
    boot.frames.at(-1)(boot.st.t);
    record();
  };
  const press = () => boot.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
  const release = () => boot.handlers.window.keyup({ code: 'Space' });

  press();   // the first gesture: starts the run (and the audio gesture seam)
  pump();    // 4 ms < one STEP: acc just fills, nothing consumed yet
  release(); // the idle-press release lands harmlessly (holdFrom === null)
  pump();    // acc 8 ms: still one STEP short on the very first drain
  pump();    // the first STEP runs: idle -> running

  const LATE_CYCLE = 2;
  let lateDone = false;
  let resumed = false;
  let lastPhase = boot.views.at(-1).rope.phase;
  let lastPressCycle = 0; // the idle-start press already spent cycle 0's input
  let cycle = 0;
  for (let guard = 0; guard < budget; guard += 1) {
    const v = boot.views.at(-1);
    if (until && until(v, rec)) return rec;
    if (v.run.status === 'over') { rec.overAt = frameIdx(); return rec; }
    if (v.run.status === 'choose') {
      if (rec.chooseAt !== null) throw new Error('feelcap harness: second card offer — budget mis-sized');
      rec.chooseAt = frameIdx();
      press();                                // cycle the cursor, arm PICK_HOLD
      for (let g2 = 0; g2 < 300; g2 += 1) {   // 300 × 4 ms > 800 ms hold
        pump();
        if (boot.views.at(-1).run.status === 'running') {
          rec.confirmFrame = frameIdx();
          resumed = true;                     // post-resume: NO more presses — the
          break;                              // standing player must trip (moment 5)
        }
      }
      if (rec.confirmFrame === null) {
        throw new Error('feelcap harness: the hold-confirm never resumed within the PICK_HOLD budget');
      }
      continue;
    }
    assert.equal(v.run.status, 'running',
      `feelcap harness: unexpected status "${v.run.status}" at frame ${frameIdx()}`);
    if (v.rope.phase < lastPhase - 0.3) cycle += 1;
    lastPhase = v.rope.phase;

    const isLateCycle = latePress && cycle === LATE_CYCLE && !lateDone;
    // Control: the late press is OMITTED — cycle LATE_CYCLE carries NO input
    // (not a clean press), so the two scripts differ by exactly that press.
    const wantClean = latePress ? cycle !== LATE_CYCLE : cycle < LATE_CYCLE;
    const canPress = !resumed && v.player.grounded && lastPressCycle !== cycle;
    if (isLateCycle && canPress && v.rope.phase >= 0.40 && v.rope.phase < 0.41) {
      lateDone = true;
      lastPressCycle = cycle;
      rec.latePressFrame = frameIdx();
      press();
      pump();                                 // pressIntent -> holdFrom
      release();                              // consumed next pump, < 0.45
      continue;
    }
    if (wantClean && canPress && v.run.skips >= 1 && !isLateCycle
        && v.rope.phase >= 0.245 && v.rope.phase < 0.255) {
      lastPressCycle = cycle;
      rec.cleanPressFrames.push(frameIdx());
      press();
      pump();
      release();
      continue;
    }
    if (v.run.skips >= endSkips) return rec;
    pump();
  }
  assert.fail(`feelcap harness: script exceeded its ${budget}-frame (${Math.round(budget * FR / 1000)} s-of-sim) budget — status "${boot.views.at(-1).run.status}", skips ${boot.views.at(-1).run.skips} (T-4-10 guard)`);
}

// Voice log entries started during frames a..b (inclusive), via the
// per-frame cursor recorded alongside the phase timeline.
function voicesIn(boot, rec, a, b) {
  const log = boot.contexts[0] ? boot.contexts[0].voiceLog : [];
  return log.slice(rec.voiceCur[Math.max(0, a - 1)], rec.voiceCur[b]);
}

// --- tests ------------------------------------------------------------------

test('FEEL-01 criterion 1: a scripted late press is forgiven end-to-end on the real frame loop while the identical no-press script trips — and the audio-on/audio-off phase+score timelines are byte-identical (D-N01/D-N02/D-N11/D-N09, AUD-02)', async () => {
  const on = await bootCap({ audioReady: true, fetchMode: 'reject' });
  let forgiven;
  try {
    forgiven = scriptedRun(on, { latePress: true });
  } finally {
    on.restore();
  }
  const off = await bootCap({ audioReady: false, fetchMode: 'absent' });
  let audioFree;
  try {
    audioFree = scriptedRun(off, { latePress: true });
  } finally {
    off.restore();
  }
  const ctrl = await bootCap({ audioReady: true, fetchMode: 'reject' });
  let control;
  try {
    control = scriptedRun(ctrl, { latePress: false });
  } finally {
    ctrl.restore();
  }

  // 1. Forgiveness: the run survives the late-press crossing and keeps
  //    scoring for >= 2 further crossings, never reaching 'over'.
  assert.equal(forgiven.overAt, null, 'the forgiven run must never reach "over"');
  const nmIdx = forgiven.crossings.findIndex(c => c.nearMiss);
  assert.ok(nmIdx >= 0, 'the late-press crossing must resolve as a near-miss (streak > 0)');
  assert.equal(forgiven.crossings.filter(c => c.nearMiss).length, 1,
    'exactly one near-miss crossing — the late-press one');
  assert.equal(forgiven.crossings[nmIdx].skips, 3,
    'the forgiven pass scores like a clean skip (third crossing)');
  assert.ok(forgiven.crossings.length >= nmIdx + 3,
    `expected >= 2 crossings past the near-miss (got ${forgiven.crossings.length - nmIdx - 1})`);

  // 2. Control: identical rig, the press omitted -> the very same crossing
  //    trips. The forgiveness is doing the work, not a lucky rig.
  assert.notEqual(control.overAt, null, 'the control script (no late press) must trip');
  assert.equal(control.crossings.length, 2,
    'the control passes the first two crossings then trips at the SAME third crossing the forgiven run passed');

  // 3. Never locks to music (AUD-02 mechanical half): audio stub installed
  //    vs the clean unsupported boot => byte-identical rope-phase AND score
  //    timelines across the whole scripted run, hitstop stall frames included.
  assert.equal(audioFree.phases.length, forgiven.phases.length);
  assert.deepEqual(audioFree.phases, forgiven.phases,
    'the rope-phase timeline with audio on vs audio off must be byte-identical — the rope never locks to, nor is slowed by, audio');
  assert.deepEqual(audioFree.scores, forgiven.scores,
    'the score timeline must be byte-identical across the audio boundary');
  // The nearMiss hitstop tier is really inside that shared timeline: nine
  // zero-delta frames after the crossing in BOTH boots (drain gate, D-N05).
  const F = forgiven.crossings[nmIdx].frame;
  for (let i = 1; i <= 9; i += 1) {
    assert.equal(forgiven.phases[F + i], forgiven.phases[F],
      `frame F+${i} sits inside the 40 ms nearMiss freeze (audio-on boot)`);
    assert.equal(audioFree.phases[F + i], audioFree.phases[F],
      `frame F+${i} must freeze identically with audio off`);
  }
});

test('FEEL-02/03 criterion 2: one near-miss event moves hitstop, the CLOSE!×N callout, and the nearMiss voice together (events channel proven end-to-end)', async () => {
  const boot = await bootCap({ audioReady: true });
  try {
    const rec = scriptedRun(boot);
    const canon = canonicalVoices();
    const nmIdx = rec.crossings.findIndex(c => c.nearMiss);
    assert.ok(nmIdx >= 0, 'the scripted near-miss crossing must exist');
    const F = rec.crossings[nmIdx].frame;

    // Hitstop: the JUICE_TIERS nearMiss tier (40 ms) freezes the drain for
    // exactly nine 4 ms frames after the crossing frame, then releases —
    // delayed, never dropped.
    for (let i = 1; i <= 9; i += 1) {
      assert.equal(rec.phases[F + i], rec.phases[F],
        `frame F+${i} must carry a zero phase delta (40 ms nearMiss hitstop under the ${FR} ms clock)`);
    }
    assert.notEqual(rec.phases[F + 10], rec.phases[F],
      'the freeze must release at the 40 ms deadline');
    assert.ok(Number.isFinite(rec.juiceAt[F]),
      'the crossing frame must carry the view.juice impulse for the WebGL layer');

    // Callout: CLOSE! ×N rides the HUD prompt channel within FLASH_MS (150)
    // and reverts after — D-N04, streak count straight from run.streak.
    assert.match(rec.prompts[F], /CLOSE! ×1\b/,
      'the CLOSE! callout with the ×N streak suffix must be on the HUD prompt on the crossing frame');
    assert.match(rec.prompts[F + 20], /CLOSE!/,
      'the callout is still up 80 ms after the crossing (inside FLASH_MS)');
    assert.doesNotMatch(rec.prompts[F + 40], /CLOSE!/,
      'the callout reverts after FLASH_MS (updateHud flash branch, no new DOM)');

    // Voice: the canonical nearMiss signature (derived from the shipped
    // js/audio.js behavior, not hard-coded twice) starts within one frame of
    // the crossing — the tickRun events -> audio fan-out seam.
    const win = voicesIn(boot, rec, F, F + 1);
    for (const sig of canon.nearMiss) {
      assert.ok(win.includes(sig),
        `the nearMiss voice signature ${sig} must start within one frame of the crossing (window: ${JSON.stringify(win)})`);
    }
  } finally {
    boot.restore();
  }
});

test('AUD-01/02 criterion 3: five pairwise-distinct voices ride the real frame loop — jump, skip, nearMiss, trip, pick (event→SFX mapping at the shell seam)', async () => {
  const boot = await bootCap({ audioReady: true });
  try {
    const rec = scriptedRun(boot, { endSkips: Infinity, budget: 10000 });
    assert.notEqual(rec.chooseAt, null,
      'the scripted run must reach a card offer within the 40 s-of-sim budget (04-01 cadence: every tenth skip)');
    assert.notEqual(rec.confirmFrame, null, 'the hold-confirm must complete the pick');
    assert.notEqual(rec.overAt, null, 'post-resume the standing player must trip (the trip moment)');

    const canon = canonicalVoices();
    const cp = rec.crossings[0].frame; // lead-in clean crossing: no input, pure skip voice
    const nm = rec.crossings.find(c => c.nearMiss).frame;
    const windows = {
      jump: [rec.cleanPressFrames[0], rec.cleanPressFrames[0] + 2], // the release jump
      skip: [cp, cp],
      nearMiss: [nm, nm + 1],
      pick: [rec.confirmFrame, rec.confirmFrame],
      trip: [rec.overAt, rec.overAt],
    };
    const reps = {};
    for (const [name, [a, b]] of Object.entries(windows)) {
      const win = voicesIn(boot, rec, a, b);
      assert.ok(win.length >= 1,
        `moment ${name} (frames ${a}..${b}) must start >= 1 voice through the frame loop`);
      const rep = win.find(s => canon[name].has(s));
      assert.ok(rep !== undefined,
        `moment ${name} window ${JSON.stringify(win)} must contain the canonical ${name} signature ${JSON.stringify([...canon[name]])}`);
      reps[name] = rep;
    }
    const vals = Object.values(reps);
    assert.equal(new Set(vals).size, vals.length,
      `the five moment signatures must be pairwise distinct: ${JSON.stringify(reps)}`);
  } finally {
    boot.restore();
  }
});

test('AUD-04 criterion 5: mute/volume write through to the storage stub and a second boot on the SAME map honors them at construction (D-N10 round-trip)', async () => {
  const shared = new Map();
  const bootA = await bootCap({ audioReady: true, storageMap: shared });
  try {
    bootA.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
    assert.equal(bootA.contexts.length, 1, 'the gesture seam is unchanged');
    bootA.handlers.window.keydown({ code: 'Mute', repeat: false, preventDefault() {} });
    let s = JSON.parse(shared.get('jumprope-audio'));
    assert.deepEqual(s, { muted: true, volume: 1 },
      'Mute writes { muted: true, volume: <default 1> } write-through, no reload');
    bootA.handlers.window.keydown({ code: 'Minus', repeat: false, preventDefault() {} });
    s = JSON.parse(shared.get('jumprope-audio'));
    assert.equal(s.muted, true, 'a volume step preserves the mute decision');
    assert.ok(Math.abs(s.volume - 0.9) < 1e-9,
      'one Minus step persists volume 0.9 write-through (shipped step is ±0.1 from the default)');
  } finally {
    bootA.restore();
  }

  const bootB = await bootCap({ audioReady: true, storageMap: shared });
  try {
    bootB.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
    assert.equal(bootB.contexts.length, 1, 'the reload boot still creates the context on first gesture only');
    assert.equal(bootB.contexts[0].gainNodes[0].gain.value, 0,
      'the persisted mute lands on the master gain at construction — mute survives the reload');
    bootB.handlers.window.keydown({ code: 'Mute', repeat: false, preventDefault() {} });
    assert.ok(Math.abs(bootB.contexts[0].gainNodes[0].gain.value - 0.9) < 1e-9,
      'un-mute restores the persisted volume onto the same master gain');
    assert.equal(JSON.parse(shared.get('jumprope-audio')).muted, false, 'the unmute is persisted too');
  } finally {
    bootB.restore();
  }

  // Reducer bypass on a pristine boot: control keys may persist settings but
  // must NEVER construct a context, charge a press, or start a run.
  const bootC = await bootCap({ audioReady: true, storageMap: new Map() });
  try {
    for (const code of ['Mute', 'Minus', 'Equal']) {
      bootC.handlers.window.keydown({ code, repeat: false, preventDefault() {} });
    }
    for (let i = 0; i < 5; i += 1) {
      bootC.st.t += FR;
      bootC.frames.at(-1)(bootC.st.t);
    }
    assert.equal(bootC.contexts.length, 0, 'control keys never construct the AudioContext');
    assert.equal(bootC.views.at(-1).run.status, 'idle',
      'audio keys bypass the press/release reducer — no run starts from a control key');
  } finally {
    bootC.restore();
  }
});

test('AUD-02/D-N09 track mechanism: the absent file is the tested-normal state (zero unhandled rejections, zero track sources); with content wired in, exactly ONE loop:true source shares the master bus with the voices', async () => {
  const rejections = [];
  const grab = err => rejections.push(err);
  process.on('unhandledRejection', grab);
  try {
    // Part A — the shipping-today state: rejecting fetch, no audio/ on disk.
    const boot = await bootCap({ audioReady: true, fetchMode: 'reject' });
    try {
      boot.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
      await settle();
      const ctx = boot.contexts[0];
      const status = boot.audio.getStatus();
      assert.equal(status.trackMissing, true, 'the absent track is a flag, never a throw');
      assert.equal(status.trackPlaying, false);
      assert.equal(ctx.bufferSources.length, 0, 'zero track sources started');
      assert.equal(rejections.length, 0, 'the rejecting fetch must never surface as an unhandled rejection');
      assert.equal(boot.audio.playTrack(), false, 'and the layer never retries');
    } finally {
      boot.restore();
    }

    // Part B — the mechanism with content wired IN (still no file on disk):
    // the gesture-time playTrack starts exactly one loop: true source, it
    // lands on the SAME master GainNode the voice envelopes chain into, and
    // a repeated playTrack never doubles it.
    const boot2 = await bootCap({ audioReady: true, fetchMode: 'resolve' });
    try {
      boot2.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
      await settle();
      const ctx2 = boot2.contexts[0];
      assert.equal(boot2.audio.getStatus().trackPlaying, true, 'the wired-in track plays');
      assert.equal(ctx2.bufferSources.length, 1, 'exactly one AudioBufferSourceNode');
      assert.equal(ctx2.bufferSources[0].loop, true, 'loop: true — one pre-rendered file (D-N09)');
      assert.equal(ctx2.bufferSources[0].connectedTo, ctx2.gainNodes[0],
        'the track rides the same master bus the SFX use');
      assert.equal(boot2.audio.playTrack(), false, 'never a second fetch while playing');
      assert.equal(ctx2.bufferSources.length, 1, 'and never a second source');
      boot2.audio.handleEvent('skip');
      const env = ctx2.gainNodes.at(-1);
      assert.equal(env.connectedTo, ctx2.gainNodes[0], 'voice envelope -> master');
      assert.equal(ctx2.gainNodes[0].connectedTo, ctx2.destination, 'master -> destination');
    } finally {
      boot2.restore();
    }
  } finally {
    process.off('unhandledRejection', grab);
  }
});

// Task 2: graph audit — mirrors tests/boundary.test.js's SPECIFIER_RE/walkFile
// mechanism but seeds the walk at js/audio.js: the containment D-N07/D-N09
// depends on becomes a self-extending, directory-walked pin (a new sim module
// is covered the day it is born; a back-edge self-diagnoses by file:line).
test('AUD-02 structural: the graph seeded at js/audio.js reaches zero sim files, the sim holds zero audio references, and shell.js is the single importer (D-N07/D-N09)', async () => {
  const SPECIFIER_RE = /(?:\bfrom\s*|\bimport\s*\(\s*)['"]([^'"]+)['"]/g;

  async function walkFile(file, graph, bare) {
    if (graph.has(file)) return;
    graph.add(file);
    const src = await readFile(file, 'utf8');
    for (const m of src.matchAll(SPECIFIER_RE)) {
      const spec = m[1];
      if (spec.startsWith('.')) {
        await walkFile(resolve(dirname(file), spec), graph, bare);
      } else {
        bare.add(`${spec} (imported by ${file})`);
      }
    }
  }

  // 1. Forward reachability: audio.js must be a LEAF — the graph is itself.
  const graph = new Set();
  const bare = new Set();
  await walkFile(resolve(jsDir, 'audio.js'), graph, bare);
  assert.deepEqual([...graph].map(f => f.slice(jsDir.length + 1)), ['audio.js'],
    'a path from js/audio.js into any sim file breaks D-N09 — audio must never reach updateRope/updatePlayer/tickRun/applyUpgrade');
  assert.deepEqual([...bare], [], 'an npm dependency crept into audio.js (D-N07 zero-dependency rule)');
  const audioSrc = await readFile(resolve(jsDir, 'audio.js'), 'utf8');
  assert.equal((audioSrc.match(/(?:^|\n)\s*(?:import|export)\s[^\n]*\bfrom\b/g) ?? []).length, 0,
    'js/audio.js gained an import/export-from statement — it must stay a leaf');

  // 2. Reverse references: zero files under js/ (excluding audio.js itself
  //    and its single consumer shell.js) may name audio, even in a comment.
  //    Directory-walked, so future modules are covered the day they are born.
  const offenders = [];
  for (const name of (await readdir(jsDir)).sort()) {
    if (name === 'audio.js' || name === 'shell.js') continue;
    const src = await readFile(resolve(jsDir, name), 'utf8');
    src.split('\n').forEach((line, i) => {
      if (/audio/i.test(line)) offenders.push(`${name}:${i + 1} ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, [],
    'a js/ module outside shell.js references audio by name — reword it (D-N09: the sim holds zero audio references, comments included)');

  // 3. Containment: exactly ONE js/ file imports './audio.js', decided with
  //    the same specifier-regex loop (not a substring match).
  const importers = [];
  for (const name of (await readdir(jsDir)).sort()) {
    const file = resolve(jsDir, name);
    const src = await readFile(file, 'utf8');
    for (const m of src.matchAll(SPECIFIER_RE)) {
      if (m[1].startsWith('.') && resolve(dirname(file), m[1]) === resolve(jsDir, 'audio.js')) {
        importers.push(name);
      }
    }
  }
  assert.deepEqual([...new Set(importers)], ['shell.js'],
    "D-N07's one-importer containment: exactly js/shell.js may import './audio.js'");
});
