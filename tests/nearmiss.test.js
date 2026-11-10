import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  createRun, tickRun, BUFFER_SEC, NEAR_MARGIN, MIN_ROPES, MAX_ROPES,
} from '../js/game.js';
import { GRAVITY, CLEAR_MIN_HEIGHT as MIN_HEIGHT } from '../js/player.js';

// Story 1.4 — near-miss & streak under multi-rope. Two sections in one file
// (tripresolution.test.js precedent): pure-sim legs pinning the per-pass
// streak bookkeeping (AC1), the strip-trip streak zero (AC3), and 1-rope v1
// parity (AC4); shell-harness legs coalescing the CLOSE! callout to at most
// one episode per revolution (AC2, AC4).
//
// Expectations derive from records and constants (NEAR_MARGIN, the clearsRope
// threshold, MIN_ROPES/MAX_ROPES) — never a hardcoded table (house rule).

// ---------- pure-sim rig (multirope.test.js idiom) ----------

const DT = 1 / 60;            // period 1 at dt 1/60: 60 ticks sweep the clock
const TICKS_PER_REV = 60;
// Story 6.2 re-contract R3 (ledger :26-27/:43-44): GRAVITY and MIN_HEIGHT are
// the js/player.js exports (CLEAR_MIN_HEIGHT, locally MIN_HEIGHT) — the rig's
// duplicate literals retired with the exports; assertions untouched.
const FALL_PER_TICK = GRAVITY * DT * DT; // Δy of one injected vy=0 airborne tick
// minHeight at windowMul 1 is clearsRope's CLEAR_MIN_HEIGHT default threshold.
const NEAR_TOP = MIN_HEIGHT * (1 + NEAR_MARGIN); // near-miss band ceiling

const groundedPlayer = { y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 };
const airborne = (y) => ({ y, vy: 0, grounded: false, squash: 1, squashVel: 0 });
// Injection heights chosen so the LANDED (post-updatePlayer) y the crossing
// is judged against sits just inside / just above the near band.
const NEAR_Y = NEAR_TOP + FALL_PER_TICK / 2;
const COMFORT_Y = NEAR_TOP + FALL_PER_TICK + 1;

function oneRevolution(n, playerAt) {
  let run = { ...createRun(), ropes: n };
  let rope = { phase: 0, period: 1 };
  const crossings = [];
  for (let t = 1; t <= TICKS_PER_REV; t++) {
    const out = tickRun(run, rope, playerAt(crossings.length), DT);
    run = out.run;
    rope = out.rope;
    if (out.events.length > 0) crossings.push({ t, events: out.events, streak: run.streak });
  }
  return { run, crossings };
}

// ---------- AC1: per-pass streak bookkeeping under N >= 2 (test pins) ----------

for (let n = MIN_ROPES + 1; n <= MAX_ROPES; n++) {
  test(`N=${n}: every in-band crossing counts a near-miss — streak advances +1 per pass across one revolution (AC1)`, () => {
    const landY = NEAR_Y - FALL_PER_TICK;
    assert.ok(landY >= MIN_HEIGHT && landY < NEAR_TOP, 'rig lands inside the near band');
    const { run, crossings } = oneRevolution(n, () => airborne(NEAR_Y));
    // Disjoint windows (pinned by multirope.test.js) mean one rising edge per
    // tick: n crossings arrive one-per-tick, each a full skip + near-miss.
    assert.equal(crossings.length, n, 'one feet-crossing per rope per revolution');
    crossings.forEach((c, i) => {
      assert.deepEqual(c.events, ['skip', 'nearMiss'], `crossing ${i + 1} events`);
      assert.equal(c.streak, i + 1, `crossing ${i + 1} advances the streak to ${i + 1}`);
    });
    assert.equal(run.streak, n);
    assert.equal(run.skips, n, 'near-misses score skips like any cleared pass');
    assert.equal(run.score, n);
  });
}

test('decay under multi-rope: a tight pass counts, a comfortable clear resets to 0 — both scored (AC1)', () => {
  // playerAt sees the crossing count so far: NEAR_Y until the first pass,
  // then a comfortable height — crossings[1]'s plain ['skip'] proves the
  // second pass was judged above the band.
  const { run, crossings } = oneRevolution(MIN_ROPES + 1,
    (seen) => airborne(seen === 0 ? NEAR_Y : COMFORT_Y));
  assert.equal(crossings.length, MIN_ROPES + 1);
  assert.deepEqual(crossings[0].events, ['skip', 'nearMiss']);
  assert.equal(crossings[0].streak, 1, 'the tight pass advances the streak');
  assert.deepEqual(crossings[1].events, ['skip'], 'the comfortable clear is a plain skip');
  assert.equal(run.streak, 0, 'a comfortable clear resets the streak to 0');
  assert.equal(run.skips, MIN_ROPES + 1, 'both passes scored');
  assert.equal(run.score, MIN_ROPES + 1);
});

for (let n = MIN_ROPES + 1; n <= MAX_ROPES; n++) {
  test(`N=${n}: one mercy-saved crossing counts exactly ONE near-miss (+1 streak, never +2) (AC1)`, () => {
    const run0 = { ...createRun(), ropes: n, buffer: BUFFER_SEC };
    const out = tickRun(run0, { phase: 0.44, period: 1 }, groundedPlayer, DT, undefined, true);
    assert.deepEqual(out.events, ['skip', 'nearMiss'], 'one event pair per forgiven pass');
    assert.equal(out.run.streak, 1, 'the mercy branch increments once, like the tight-clear branch');
    assert.equal(out.run.skips, 1);
    assert.equal(out.run.buffer, 0, 'buffer consumed at the crossing (D-N01)');
  });
}

// ---------- AC3: the strip-trip streak zero ----------

for (let n = MIN_ROPES + 1; n <= MAX_ROPES; n++) {
  test(`N=${n}: a strip trip zeroes the streak — a trip breaks the consecutive chain (Story 1.4 policy, AC3)`, () => {
    const run0 = { ...createRun(), ropes: n, streak: 2 };
    const out = tickRun(run0, { phase: 0.44, period: 1 }, groundedPlayer, DT);
    assert.equal(out.run.ropes, n - 1, 'one rope stripped');
    assert.equal(out.run.iFrames, n - 1, 'the blank armed');
    assert.deepEqual(out.events, ['ropeLost']);
    assert.equal(out.run.skips, 0, 'the failing crossing scores nothing');
    assert.equal(out.run.streak, 0,
      'STORY 1.4 POLICY: streak counts CONSECUTIVE close calls — the trip zeroes it');
  });
}

// ---------- AC4: 1-rope parity — the v1 trajectory at explicit ropes: 1 ----------

// feel.test.js scriptedPass technique (that file stays untouched): a rope
// whose rising-edge crossing lands on the LAST tick of a 4-tick script.
const STEP = 1 / 120;
const RIG_PERIOD = 1.3;
const INC = STEP / RIG_PERIOD;
const rigRope = (crossTicks) => ({ phase: 0.4501 - crossTicks * INC, period: RIG_PERIOD });
const rngStub = () => 0.5;
const floorPlayer = () => ({ y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 });
const airPlayer = (y) => ({ y, vy: 0, grounded: false, squash: 1, squashVel: 0 });

function scriptedPass(state, kind) {
  const crossTicks = 4;
  const forgiven = kind === 'forgiven';
  let player = kind === 'clean' ? airPlayer(COMFORT_Y)
    : kind === 'tight' ? airPlayer(MIN_HEIGHT * (1 + NEAR_MARGIN * 0.5))
      : kind === 'miss' ? floorPlayer()
        : floorPlayer();
  let { run } = state;
  let rope = rigRope(crossTicks);
  const events = [];
  for (let tick = 0; tick < crossTicks; tick++) {
    const press = forgiven && tick === crossTicks - 1 ? true : null;
    const out = tickRun(run, rope, player, STEP, rngStub, press);
    events.push(...out.events);
    ({ run, rope, player } = out);
  }
  return { run, events };
}

test('N=1 parity: tight/forgiven passes advance +1, comfortable clears and the death zero — the v1 rules at explicit ropes: 1 (AC4)', () => {
  const kinds = ['tight', 'tight', 'clean', 'tight', 'forgiven', 'tight', 'clean'];
  // Trajectory FOLDED from the v1 rules (near kind: +1, comfortable: 0),
  // never a literal table.
  let expectedStreak = 0;
  const expectedStreaks = kinds.map((k) => {
    expectedStreak = k === 'clean' ? 0 : expectedStreak + 1;
    return expectedStreak;
  });
  let state = { run: { ...createRun(), ropes: 1 } };
  kinds.forEach((kind, i) => {
    state = scriptedPass(state, kind);
    assert.deepEqual(
      state.events,
      kind === 'clean' ? ['skip'] : ['skip', 'nearMiss'],
      `pass ${i + 1} (${kind}) events`);
    assert.equal(state.run.streak, expectedStreaks[i], `pass ${i + 1} (${kind}) streak`);
  });
  // The v1 death arm: last rope, failed crossing, no buffer.
  const dead = scriptedPass(state, 'miss');
  assert.deepEqual(dead.events, ['trip']);
  assert.equal(dead.run.status, 'over');
  assert.equal(dead.run.streak, 0, 'death zeroes the streak, verbatim v1');
  assert.equal(dead.run.ropes, 1, 'the 1-rope field never drifted through the script');
});

// ---------- shell harness legs (AC2 coalescing, AC4 gate-never-eats) ----------
//
// juice.test.js bootShell pattern (render3d stub, file: URLs, real clock)
// with one delta: './game.js' points at a data: wrapper that delegates to
// the REAL tickRun. A `mirror` script appends 'nearMiss' to out.events on
// scripted ticks while mirroring streak + 1 into out.run (a scripted tick is
// one whose phase sweep crosses a target — phase advance stays REAL, so rope
// wraps stay real wraps), and injects an airborne player so the real crossing
// clears comfortably (a plain skip) and the run survives the multi-revolution
// script. A `ropes`/`nearY` script skips the mirror: real crossings, real streak. No
// relative js/ specifier appears in this file besides the pure game.js
// import above, keeping the boundary.test.js walk green.

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');

let bootCount = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function bootNearMissShell(script) {
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
  globalThis.__nearmissScript = script;

  const saved = {
    document: globalThis.document,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    // Descriptor, not value: reading Node's experimental localStorage getter
    // emits an ExperimentalWarning through console.error.
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    consoleError: console.error
  };
  globalThis.document = { getElementById: (id) => (id === 'game' ? canvas : hud[id]) };
  globalThis.window = {
    addEventListener: (type, fn) => { handlers.window[type] = fn; }
  };
  globalThis.requestAnimationFrame = (cb) => { frames.push(cb); return frames.length; };
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: () => null, setItem: () => {} }, configurable: true
  });
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

  const fileHref = (name) => pathToFileURL(resolve(jsDir, name)).href;
  const gameWrapHref = 'data:text/javascript,' + encodeURIComponent([
    'export * from "' + fileHref('game.js') + '";',
    'import { tickRun as realTickRun } from "' + fileHref('game.js') + '";',
    'export const tickRun = (run, rope, player, dt, rng, press) => {',
    '  const s = globalThis.__nearmissScript;',
    '  if (!s) return realTickRun(run, rope, player, dt, rng, press);',
    '  const inc = (dt * ((run.effects && run.effects.ropeMul) ?? 1)) / rope.period;',
    '  const raw = rope.phase + inc;',
    '  const next = raw >= 1 ? (rope.phase - 1) + inc : raw;',
    '  const forced = { ...run };',
    '  if (s.ropes !== undefined) forced.ropes = s.ropes;',
    '  if (s.mirror) forced.streak = s.streak;',
    '  const out = realTickRun(',
    '    forced, rope,',
    '    s.nearY !== undefined',
    '      ? { y: s.nearY, vy: 0, grounded: false, squash: 1, squashVel: 0 }',
    '      : { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 },',
    '    dt, rng, press);',
    '  let events = out.events;',
    '  for (const t of (s.targets ?? [])) {',
    '    const crossed = raw >= 1',
    '      ? (t > rope.phase || t <= next)',
    '      : (rope.phase < t && next >= t);',
    '    if (crossed) { s.streak += 1; s.count += 1; events = [...events, "nearMiss"]; }',
    '  }',
    '  return s.mirror',
    '    ? { ...out, run: { ...out.run, streak: s.streak }, events }',
    '    : { ...out, events };',
    '};',
  ].join('\n'));

  const src = (await readFile(resolve(jsDir, 'shell.js'), 'utf8'))
    .replace(/from\s*['"]\.\/render3d\.js['"]/, `from '${renderStubHref}'`)
    .replace(/from\s*['"]\.\/game\.js['"]/, `from '${gameWrapHref}'`)
    .replace(/from\s*['"]\.\/rope\.js['"]/, `from '${fileHref('rope.js')}'`)
    .replace(/from\s*['"]\.\/player\.js['"]/, `from '${fileHref('player.js')}'`)
    .replace(/import\(\s*['"]\.\/audio\.js['"]\s*\)/, `import('${fileHref('audio.js')}')`);

  const restore = () => {
    delete globalThis.__nearmissScript;
    delete globalThis.__shellTestViews;
    globalThis.document = saved.document;
    globalThis.window = saved.window;
    globalThis.requestAnimationFrame = saved.requestAnimationFrame;
    if (saved.localStorage) {
      Object.defineProperty(globalThis, 'localStorage', saved.localStorage);
    } else {
      delete globalThis.localStorage;
    }
    console.error = saved.consoleError;
  };
  // Distinct data: URL per boot so the bootstrap guard re-runs per script.
  // A failed boot restores the globals before rethrowing, so a broken
  // shell.js can never poison the legs that follow.
  try {
    await import('data:text/javascript,' + encodeURIComponent(`${src}\n//nearmiss-boot ${++bootCount}`));
  } catch (err) {
    restore();
    throw err;
  }
  return { frames, handlers, hud, views, restore };
}

function keydown(env, code = 'Space') {
  env.handlers.window.keydown({ code, repeat: false, preventDefault() {} });
}

// Real-clock pumping: updateHud's flash branch consults performance.now()
// directly, so frames must advance on the real clock (juice.test.js callout
// leg idiom). Each pump records one frame sample: CLOSE! episode starts
// (false→true transition on the prompt) and clock wraps (phase decrease =
// rope.js's wrap arithmetic).
function makeSampler(env, st) {
  const sam = {
    episodes: 0, wraps: 0, close: false, prevPhase: null, epTexts: [],
    pump() {
      st.t = performance.now();
      env.frames.at(-1)(st.t);
      const v = env.views.at(-1);
      // Per-frame phase advance is < 0.02 (frames are pumped at ms strides),
      // so a drop past -0.5 can only be a wrap.
      if (sam.prevPhase !== null && v.rope.phase < sam.prevPhase - 0.5) sam.wraps += 1;
      sam.prevPhase = v.rope.phase;
      const nowClose = /CLOSE!/.test(env.hud['hud-prompt'].textContent);
      if (nowClose && !sam.close) {
        sam.episodes += 1;
        sam.epTexts.push(env.hud['hud-prompt'].textContent);
      }
      sam.close = nowClose;
      return v;
    }
  };
  return sam;
}

async function pumpUntil(sam, pred, budgetMs, why) {
  const end = performance.now() + budgetMs;
  while (performance.now() < end) {
    const v = sam.pump();
    if (pred(v)) return v;
    await sleep(2);
  }
  assert.fail(`nearmiss harness: ${why} (never happened within ${budgetMs} ms of real frames)`);
}

// Two windows per revolution at phase ≈ 0.45 and ≈ 0.90 — a pair ≈ 0.58 s
// apart at period 1.3, well beyond 2 × FLASH_MS (150 ms), so an UNGATED
// second callout would time out and re-flash inside the same revolution.
test('coalescing: two scripted near-misses per revolution, ONE CLOSE! episode per revolution — the sim streak still counts every pass (AC2)', async () => {
  const script = { targets: [0.45, 0.9], streak: 0, count: 0, mirror: true };
  const env = await bootNearMissShell(script);
  try {
    const st = { t: performance.now() };
    const sam = makeSampler(env, st);
    keydown(env);
    await pumpUntil(sam, (v) => v.run.status === 'running', 1000,
      'the start press never left idle');
    // The gate boots open: the first-ever callout fires before any wrap.
    await pumpUntil(sam, () => script.count >= 1, 3000,
      'the first scripted near-miss never happened');
    await pumpUntil(sam, () => /CLOSE!/.test(env.hud['hud-prompt'].textContent), 500,
      'the first-ever callout never reached the HUD prompt');
    assert.equal(sam.wraps, 0, 'the first-ever callout fires mid-revolution 0 — the gate boots open');
    // Observation window: exactly two full revolutions, wrap #1 → wrap #3.
    await pumpUntil(sam, () => sam.wraps >= 1, 3000, 'the second revolution never started');
    const inj0 = script.count;
    const epi0 = sam.episodes;
    await pumpUntil(sam, () => script.count >= inj0 + 4, 3000,
      'two revolutions never carried four scripted near-miss crossings');
    await pumpUntil(sam, () => sam.wraps >= 3, 3000, 'the wrap clock stalled');
    assert.equal(script.count - inj0, 4, 'exactly two scripted near-misses per revolution');
    assert.equal(sam.episodes - epi0, 2,
      'exactly ONE CLOSE! episode per revolution — the second crossing of each rev is gated (ungated would be 4)');
    const v = env.views.at(-1);
    // The belt asserts the flash TEXT — the ×N the player actually reads
    // (streak at the first callout of its revolution, per The Design's
    // decided cosmetic). The streak arithmetic itself lives in the AC1 legs.
    assert.equal(sam.epTexts[epi0], 'CLOSE! \u00d7' + (inj0 + 1),
      'the first callout of the revolution renders CLOSE! ×N with the streak it carried');
    assert.equal(v.run.status, 'running', 'coalescing never derailed the run');
  } finally {
    env.restore();
  }
});

// AC4 half at the shell: at 1 rope there is one feet window per revolution
// (`js/rope.js` k=0), so the wrap gate can never eat a single-rope callout.
test('1-rope gate-never-eats: one near-miss per revolution flashes on EVERY revolution, the first ever fires immediately (AC4)', async () => {
  const script = { targets: [0.45], streak: 0, count: 0, mirror: true };
  const env = await bootNearMissShell(script);
  try {
    const st = { t: performance.now() };
    const sam = makeSampler(env, st);
    keydown(env);
    await pumpUntil(sam, (v) => v.run.status === 'running', 1000,
      'the start press never left idle');
    await pumpUntil(sam, () => script.count >= 1, 3000,
      'the first scripted crossing never happened');
    await pumpUntil(sam, () => /CLOSE!/.test(env.hud['hud-prompt'].textContent), 500,
      'the first-ever callout never fired');
    assert.equal(sam.wraps, 0, 'it fires immediately, before any wrap');
    assert.equal(sam.episodes, 1, 'exactly one episode so far');
    await pumpUntil(sam, () => sam.wraps >= 2, 4000, 'two revolutions never elapsed');
    assert.ok(script.count >= 2, 'a scripted crossing happened on every revolution');
    assert.equal(sam.episodes, script.count,
      'episodes == injections: the rev gate never ate a single-rope near-miss');
  } finally {
    env.restore();
  }
});

// Story 1.4 review patch: lead-in re-entry (resumeFromPause) restarts the
// canonical clock, so the callout gate must re-arm. Pre-fix the gate stayed
// closed through the post-resume lead-in and ate the interrupted
// revolution's next callout until the next true wrap.
test('pause→resume re-arms the gate: the post-resume callout flashes before any wrap (AC2)', async () => {
  const script = { targets: [0.45, 0.9], streak: 0, count: 0, mirror: true };
  const env = await bootNearMissShell(script);
  try {
    const st = { t: performance.now() };
    const sam = makeSampler(env, st);
    keydown(env);
    await pumpUntil(sam, (v) => v.run.status === 'running', 1000,
      'the start press never left idle');
    await pumpUntil(sam, () => /CLOSE!/.test(env.hud['hud-prompt'].textContent), 1000,
      'the first-ever callout never reached the HUD prompt');
    // Freeze once the flash has timed out — still mid-revolution 0 (after
    // the 0.45 scripted crossing, before the 0.9 one), with the gate closed.
    await pumpUntil(sam, () => !/CLOSE!/.test(env.hud['hud-prompt'].textContent), 1000,
      'the flash never timed out');
    assert.equal(sam.wraps, 0, 'the pause lands inside revolution 0');
    keydown(env, 'KeyP'); // enterPause: the clock freezes
    const wrapsAtPause = sam.wraps;
    const epiAtPause = sam.episodes;
    for (let i = 0; i < 5; i++) { sam.pump(); await sleep(2); }
    keydown(env, 'KeyP'); // resumeFromPause: leadIn snaps phase to 0.33
    const end = performance.now() + 2000;
    while (performance.now() < end && sam.episodes === epiAtPause) {
      sam.pump();
      await sleep(2);
    }
    assert.ok(sam.episodes > epiAtPause,
      'no callout fired after resume within the lead-in window');
    assert.equal(sam.wraps, wrapsAtPause,
      'the re-arm came from the lead-in snap — no wrap elapsed (pre-fix: only after 1.0)');
  } finally {
    env.restore();
  }
});

// Story 1.4 review patch (D1): REAL multi-rope crossings through the gate —
// no synthetic events. At ropes=2 with the player pinned in the near band,
// every revolution carries two REAL nearMiss events; run.streak must count
// each one, and each revolution must flash exactly one callout episode.
test('real 2-rope crossings: every near-miss counts, exactly ONE CLOSE! per revolution (AC2)', async () => {
  const nearY = NEAR_TOP + GRAVITY * STEP * STEP / 2; // lands just inside the band
  const env = await bootNearMissShell({ ropes: 2, nearY });
  try {
    const st = { t: performance.now() };
    const sam = makeSampler(env, st);
    keydown(env);
    await pumpUntil(sam, (v) => v.run.status === 'running', 1000,
      'the start press never left idle');
    await pumpUntil(sam, () => /CLOSE!/.test(env.hud['hud-prompt'].textContent), 3000,
      'the first real near-miss crossing never reached the prompt');
    // Observation window: one FULL revolution, wrap #1 → #2 (rev 0 starts
    // mid-revolution at the leadIn phase 0.33).
    await pumpUntil(sam, () => sam.wraps >= 1, 3000, 'revolution 1 never started');
    const w0 = sam.wraps;
    const e0 = sam.episodes;
    const s0 = env.views.at(-1).run.streak;
    await pumpUntil(sam, () => sam.wraps >= w0 + 1, 3000, 'the wrap clock stalled');
    assert.equal(env.views.at(-1).run.streak - s0, 2,
      'two real crossings each counted +1 into the sim streak — never coalesced');
    assert.equal(sam.episodes - e0, 1,
      'exactly ONE CLOSE! episode per revolution driven by REAL nearMiss events');
  } finally {
    env.restore();
  }
});
