import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAudio } from '../js/audio.js';

// Story 5.6 (FR29/NFR6): TRACK-1 — the music CONTENT, first committed binary in
// repo history. Product-code delta ZERO: `js/audio.js:98-128` already ships the
// whole mechanism (`source.loop = true` at :117, `connect(master)` :118,
// `start(0)` :119, one-fetch guard :101, sticky-failure catch :123-126), so
// every leg here is a verify-and-pin leg (5.5-D5 doctrine): a gold-tree red is a
// FINDING to report, never a product patch. Falsifiability lives in the mutation
// battery recorded in the story Debug Log (M1-M5).
//
// WHY A NEW FILE: tests/audio.test.js, tests/feelcap.test.js and
// tests/audiolifecycle.test.js are the AC5 frozen exhibit — they pin the
// ABSENT-file silence legs and must stay byte-identical with the file on disk
// (they can never see it: each injects its own fetchFn, and a relative
// fetch('audio/track.ogg') inside Node always throws as an invalid URL). New
// content legs therefore land here (5.5-D1 precedent); the only existing-file
// writes in this story are the two sanctioned R1 census appends. The direct
// '../js/audio.js' import is allowed and precedented — leaf module, zero
// imports, so tests/boundary.test.js re-audits it for free.
//
// DONORS (copied, never imported): makeAudioContext / makeStorage / settle —
// tests/audio.test.js:24-101, extended ONLY with a per-source `startArgs` log
// (4a asserts start was called ONCE with 0); the source-census walk —
// tests/audiolifecycle.test.js:247-263; the VOICES census regex —
// tests/ceilingbreak.test.js:513-517.
//
// WHY NODE NEVER DECODES THE OGG: Node has no WebAudio, and pretending otherwise
// (a hand-rolled Vorbis decoder in a test) would test the test, not the product.
// decodeAudioData is a seam: the legs below INJECT the real committed bytes
// through the SAME fetchFn the browser uses and pin what `js/audio.js` does with
// whatever comes back (one source, loop on, on the master bus, started once).
// The audible faces — the wrap seam, the 404 face, volume/mute audibility — are
// pinned by the scratch-browser lane recorded in the story Debug Log.

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');
const trackPath = resolve(testsDir, '..', 'audio', 'track.ogg');
const MAX_BYTES = 3145728; // 3 MB static-host budget (AC2, D3)

const audioSrc = await readFile(resolve(jsDir, 'audio.js'), 'utf8');
// The URL under test is READ from the source, never retyped (4a): a retyped
// literal here would silently keep passing if someone moved the file.
const trackUrl = audioSrc.match(/const TRACK_URL = '([^']+)'/)[1];

// ---------- stubs (donor: tests/audio.test.js:24-101, +startArgs log) --------

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
      startArgs: [],
      connect(t) { rec.connectedTo = t; },
      start(...args) { ctx.started++; rec.startArgs.push(args); },
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

// The committed bytes, read once. Node cannot and must not decode them; they
// travel through fetchFn exactly as HTTP bytes would.
const trackBytes = readFileSync(trackPath);
const trackDecodeStub = buf => Promise.resolve({ marker: true, byteLength: buf.length });

// ---------- ogg page walker (fs + DataView only, Task 3a/3b) -----------------

function walkPages(buf) {
  const pages = [];
  let off = 0;
  while (off + 27 <= buf.length) {
    assert.equal(buf.toString('ascii', off, off + 4), 'OggS', `page magic at byte ${off}`);
    const segments = buf[off + 26];
    let bodyLen = 0;
    for (let i = 0; i < segments; i++) bodyLen += buf[off + 27 + i];
    pages.push({
      off,
      version: buf[off + 4],
      headerType: buf[off + 5],
      serial: buf.readUInt32LE(off + 14),
      sequence: buf.readUInt32LE(off + 18),
      body: off + 27 + segments,
      bodyLen,
      end: off + 27 + segments + bodyLen,
    });
    off = pages.at(-1).end;
  }
  return { pages, end: off };
}

const pagesOf = walkPages(trackBytes).pages;

// ===========================================================================
// Part A — METADATA legs: the DELIVERY format. Pure fs + DataView, zero boots,
// zero timers. These say NOTHING about the seam, which is a decoded-PCM
// construction property (story "The loop mechanism" + D6) — do not inflate them.
// ===========================================================================

test('track1 container: OggS, stream-structure version 0, BOS page, sequence 0 (AC2/D3)', async () => {
  assert.equal(pagesOf.length > 1, true, 'a real multi-page Ogg stream, not a stub file');
  assert.equal(trackBytes.toString('ascii', 0, 4), 'OggS', 'the Ogg container magic');
  assert.equal(trackBytes[4], 0, 'stream_structure_version === 0 (the only defined value)');
  assert.equal(trackBytes[5] & 0x02, 0x02, 'header_type&0x02: page 0 is the beginning-of-stream');
  assert.equal(trackBytes.readUInt32LE(18), 0, 'page 0 carries page_sequence === 0');
  // every page parses and the walk lands exactly on EOF — a truncated or
  // tail-padded file would break decodeAudioData in the browser.
  const { end } = walkPages(trackBytes);
  assert.equal(end, trackBytes.length, 'the page walk lands exactly at EOF (no truncation, no padding)');
  pagesOf.forEach((p, i) => assert.equal(p.sequence, i, `page ${i} sequence numbers are dense from 0`));
});

test('track1 identification header: 0x01 "vorbis", version 0, mono, 44100 Hz — ffprobe-independent (AC2/D3)', async () => {
  const p0 = pagesOf[0];
  assert.equal(p0.body, 28, 'page-0 body sits at 27 + the segment table');
  assert.equal(trackBytes[p0.body], 0x01, 'packet type 1 = the Vorbis identification header');
  assert.equal(trackBytes.toString('ascii', p0.body + 1, p0.body + 7), 'vorbis', 'the Vorbis signature');
  assert.equal(trackBytes.readUInt32LE(p0.body + 7), 0, 'codec version === 0 (Vorbis I)');
  assert.equal(trackBytes[p0.body + 11], 1, 'channels === 1 — the shipped mix is MONO (D3)');
  assert.equal(trackBytes.readUInt32LE(p0.body + 12), 44100, 'sample_rate === 44100 (D3)');
});

test('track1 budget + layer fence: <= 3,145,728 B and NO loop/replay metadata anywhere (AC2/D6)', async () => {
  const { size } = await stat(trackPath);
  assert.ok(size <= MAX_BYTES, `the static-host budget is ${MAX_BYTES} B, the file is ${size}`);
  // The seam is a PCM-construction property (two-pass render, D6). Loop tags
  // would be dead code — decodeAudioData + source.loop never read them — so a
  // future tagged-loop "fix" belongs in the samples, not the container. This leg
  // fences the layer; `-map_metadata -1` at encode time is why it holds.
  const keys = [];
  for (const p of pagesOf) {
    const head = trackBytes[p.body];
    if (head === 3 || head === 5) { // comment header, or the setup packet carrying it
      keys.push(...trackBytes.subarray(p.body, p.end).toString('latin1').matchAll(/[A-Z0-9_]+(?==)/g).map(m => m[0]));
    }
  }
  for (const forbidden of ['LOOP_START', 'LOOP_END', 'REPLAYGAIN']) {
    assert.equal(keys.includes(forbidden), false, `${forbidden} must be ABSENT by design (D6/D8)`);
    assert.equal(trackBytes.toString('latin1').includes(forbidden), false,
      `${forbidden} appears nowhere in the committed bytes`);
  }
});

test('track1 census re-arms: the URL literal, the sole-consumer specifier, the eight voices (AC5 restatement, kills the "someone edited the literal" mutant)', async () => {
  // Local restatement of audiolifecycle L5's fences, aimed at THIS story's asset.
  const files = (await readdir(jsDir)).filter(f => f.endsWith('.js')).sort();
  const trackHits = [];
  let specifierHits = 0;
  for (const f of files) {
    const src = await readFile(resolve(jsDir, f), 'utf8');
    src.split('\n').forEach((line, i) => {
      if (line.includes('audio/track.ogg')) trackHits.push(`${f}:${i + 1}`);
    });
    specifierHits += (src.match(/['"]\.\/audio\.js['"]/g) ?? []).length;
  }
  assert.deepEqual((await readdir(resolve(jsDir, '..', 'audio'))).sort(), ['track.ogg'],
    'audio/ contains EXACTLY the committed asset — nothing else shipped beside it');
  assert.deepEqual(trackHits, ['audio.js:8'],
    'the audio/track.ogg literal lives ONLY at js/audio.js:8 — one URL, one owner');
  assert.equal(trackUrl, 'audio/track.ogg', 'and that literal is what these legs fetch');
  assert.equal(specifierHits, 1, "the './audio.js' specifier occurs EXACTLY once in js/ (shell.js:64)");
  const m = audioSrc.match(/const VOICES = \{([\s\S]*?)\n  \};/);
  assert.ok(m, 'the VOICES literal is present in js/audio.js (donor regex, ceilingbreak:513)');
  assert.deepEqual([...m[1].matchAll(/^\s*(\w+):/gm)].map(x => x[1]).sort(),
    ['ascend', 'jump', 'nearMiss', 'pick', 'ropeLost', 'skip', 'trip', 'win'],
    'the mix floor changes NO voice: VOICES stays frozen at exactly eight');
});

// ===========================================================================
// Part B — MECHANISM legs pinned against the REAL committed bytes, injected
// through the same fetchFn seam the browser uses (Task 4). Still zero boots.
// ===========================================================================

test('track1 present-file: one fetch of the source-read URL, ONE loop:true source on the master, started once with 0 (AC1, pins audio.js:101/114-121 incl. the loop law at :117)', async () => {
  const calls = [];
  const ctx = makeAudioContext();
  const audio = createAudio({
    storage: makeStorage(),
    fetchFn: async url => {
      calls.push(url);
      return { ok: true, arrayBuffer: async () => trackBytes };
    },
  });
  ctx.decodeAudioData = trackDecodeStub;
  audio.gesture(ctx);
  await settle();
  assert.deepEqual(calls, [trackUrl], 'exactly ONE fetch of the URL read from js/audio.js:8');
  assert.equal(ctx.bufferSources.length, 1, 'exactly one AudioBufferSourceNode for the whole lifecycle');
  const [src] = ctx.bufferSources;
  assert.equal(src.loop, true, 'loop = true at js/audio.js:117 — the seamless-wrap law (M1 dies here)');
  assert.equal(src.buffer.marker, true, 'the decoded buffer is the one the real bytes produced');
  assert.equal(src.buffer.byteLength, trackBytes.length, 'the committed bytes reached the decoder intact');
  assert.equal(src.connectedTo, ctx.gainNodes[0], 'the track rides the MASTER bus with the SFX (audio.js:118)');
  assert.deepEqual(src.startArgs, [[0]], 'start(0) exactly once — no offset, no second start');
  assert.equal(audio.getStatus().trackPlaying, true);
  assert.equal(audio.getStatus().trackMissing, false);
});

test('track1 no-restart law: zero onended/.loop=false in js/, and the SUCCESS-path lifecycle walk never re-fetches or re-starts (AC1, kills M2/M3)', async () => {
  // With loop = true the decoded AudioBuffer wraps natively; there is nothing to
  // restart. A restart arm added "for the loop" would be a second source — and
  // this census is what makes that impossible to land quietly.
  const restart = [];
  for (const f of (await readdir(jsDir)).filter(f => f.endsWith('.js')).sort()) {
    const src = await readFile(resolve(jsDir, f), 'utf8');
    src.split('\n').forEach((line, i) => {
      if (/onended|\.loop\s*=\s*false/.test(line)) restart.push(`${f}:${i + 1}`);
    });
  }
  assert.deepEqual(restart, [], 'no onended handler and no loop=false anywhere in js/ (story "loop mechanism", grep law)');

  // The success-path twin of audio.test.js's WR-04 leg: a manual playTrack()
  // RACING the gesture fetch must be rejected by the synchronous pending flip
  // (audio.js:102). Both calls share ONE in-flight promise, so a guard that
  // forgot trackPending would resolve BOTH chains into two looping sources.
  const calls = [];
  let inflight = null;
  const ctx = makeAudioContext();
  const audio = createAudio({
    storage: makeStorage(),
    fetchFn: url => {
      calls.push(url);
      return (inflight ??= Promise.resolve({ ok: true, arrayBuffer: async () => trackBytes }));
    },
  });
  ctx.decodeAudioData = trackDecodeStub;
  audio.gesture(ctx); // starts fetch #1 — still pending right here
  assert.equal(audio.playTrack(), false, 'a manual call racing the pending fetch is rejected (:101-102)');
  await settle();
  audio.gesture(ctx);          // resume arm — never a re-fetch site
  audio.suspend();
  audio.gesture(ctx);          // suspend, then the recovery arm
  audio.setMuted(true);
  audio.setVolume(0.5);
  audio.setMuted(false);
  await settle();
  assert.equal(calls.length, 1, 'ONE fetch across the whole walk (guard at audio.js:101-102)');
  assert.equal(ctx.bufferSources.length, 1, 'and still one source — no restart machinery exists to trigger');
  assert.equal(ctx.bufferSources[0].loop, true, 'the loop law survives the walk untouched');
  assert.equal(audio.getStatus().trackPlaying, true, 'trackPlaying: the success path is the one pinned here');
  assert.equal(audio.getStatus().trackMissing, false);
  assert.equal(audio.playTrack(), false, 'a manual call after the settled play still no-ops');
  assert.equal(calls.length, 1, 'and costs zero further fetches');
});

test('track1 silence + bus laws: nothing runs pre-gesture, persisted volume lands BEFORE the track node, mute/volume move ONLY the master (AC1, FR29)', async () => {
  // cold factory with a WORKING fetchFn — the success path is also gesture-gated
  const coldCtx = makeAudioContext();
  const coldCalls = [];
  const cold = createAudio({
    storage: makeStorage(),
    fetchFn: async url => { coldCalls.push(url); return { ok: true, arrayBuffer: async () => trackBytes }; },
  });
  coldCtx.decodeAudioData = trackDecodeStub;
  await settle();
  assert.equal(coldCalls.length, 0, 'zero fetches before any gesture (audio.js:82 is the ONLY track call site)');
  assert.equal(coldCtx.gains, 0, 'zero nodes of any kind before the gesture');
  assert.equal(coldCtx.bufferSources.length, 0, 'and no track source — the demake never starts music pre-unlock');
  assert.equal(cold.playTrack(), false, 'a manual playTrack() pre-gesture is a no-op (no master yet, :101)');
  assert.equal(coldCalls.length, 0, 'even the manual call cannot smuggle a pre-gesture fetch');

  // persisted volume is on the bus BEFORE the track node exists
  const ctx = makeAudioContext();
  const calls = [];
  const audio = createAudio({
    storage: makeStorage([['jumprope-audio', JSON.stringify({ muted: false, volume: 0.4 })]]),
    fetchFn: async url => { calls.push(url); return { ok: true, arrayBuffer: async () => trackBytes }; },
  });
  ctx.decodeAudioData = trackDecodeStub;
  audio.gesture(ctx);
  assert.equal(ctx.gainNodes[0].gain.value, 0.4, 'the reloaded volume lands at creation (audio.js:75)');
  assert.equal(ctx.bufferSources.length, 0, 'the track node does not exist yet — the bus was set first');
  await settle();
  assert.equal(ctx.bufferSources.length, 1);
  assert.equal(ctx.bufferSources[0].connectedTo, ctx.gainNodes[0],
    'the node the mute/volume walk below moves is PRECISELY the node the track is wired into (M5 dies here too)');
  assert.equal(ctx.gains, 1, 'the track builds NO gain node of its own — it only connects (M5 dies here)');
  audio.setMuted(true);
  assert.equal(ctx.gainNodes[0].gain.value, 0, 'mute zeroes the master the track is connected INTO (:64-66)');
  assert.equal(ctx.bufferSources.length, 1, 'with the track source alive (mute is a bus gain, never a stop)');
  audio.setMuted(false);
  assert.equal(ctx.gainNodes[0].gain.value, 0.4, 'unmute restores the persisted volume, not a default');
  audio.setVolume(0.75);
  assert.equal(ctx.gainNodes[0].gain.value, 0.75, 'volume moves the SAME master gain');
  assert.equal(ctx.gains, 1, 'and still no per-track node: the track has exactly one volume law — the master');
  assert.equal(calls.length, 1, 'the whole volume/mute walk cost zero re-fetches');
});
