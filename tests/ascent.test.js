import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import * as game from '../js/game.js';
import { AREAS } from '../js/areas.js';
import { freshEffects } from '../js/upgrades.js';
import { jump, createPlayer, updatePlayer } from '../js/player.js';

// Story 2.2: the jump peak (run.altitude + player.y on the post-step state)
// vs the frozen area ladder — ascent as data, the summit win as 'over' +
// outcome 'summit'. Expectations derive from the AREAS rows + ALT_PER_POINT +
// the card records; the ONE explicit table is the ladder contract leg itself
// (ALT_PER_POINT-precedent: the table's own contract is pinned, every rig
// derives from AREAS). Namespace game import (startrun idiom).

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');
const fileHref = name => pathToFileURL(resolve(jsDir, name)).href;
const settle = () => new Promise(r => setTimeout(r, 0));
let bootCount = 0;

const STEP = 1 / 120;
const DT = 1 / 60;
const EPS = 0.01;
// startrun/altitude idiom: phase 0.44 → next tick rises into [0.45, 0.55].
const FEET_EDGE = { phase: 0.44, period: 0.9 };
// rope parked far from the feet window: no crossing for >1 s of sim (inc
// ≈ 0.01/second), so the arc is observed with altitude constant.
const PARKED = { phase: 0.05, period: 100 };
const AIRBORNE = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };
const rngStub = () => 0.5;
const floatCard = game.CARDS.find(c => c.id === 'float');

// ---------- data-table + factory contract legs ----------

test('AREAS contract: five frozen rows on the 250/600/1000/1500/2100 ladder', () => {
  // The table's OWN contract leg — placeholder numbers per FR15/GDD; the
  // Epic 6 balance pass re-contracts this leg, every other leg here derives.
  const LADDER = [
    { area: 1, name: 'alley', ceiling: 250, periodMul: 1.00 },
    { area: 2, name: 'rooftops', ceiling: 600, periodMul: 0.96 },
    { area: 3, name: 'blimp', ceiling: 1000, periodMul: 0.92 },
    { area: 4, name: 'stratosphere', ceiling: 1500, periodMul: 0.88 },
    { area: 5, name: 'moon-approach', ceiling: 2100, periodMul: 0.85 },
  ];
  assert.equal(AREAS.length, 5);
  AREAS.forEach((row, i) => {
    assert.deepEqual(
      { area: row.area, name: row.name, ceiling: row.ceiling, periodMul: row.periodMul },
      LADDER[i], `row ${i + 1} matches the ladder`);
    assert.equal(row.palette, row.name, 'palette follows the area name (4.3 owns values)');
    assert.equal(typeof row.fog, 'number', 'fog placeholder (4.3 owns)');
    assert.ok(!('base' in row), 'no base field: base of area n = previous ceiling');
    assert.ok(Object.isFrozen(row), 'frozen rows');
  });
  assert.ok(Object.isFrozen(AREAS), 'the ladder array is frozen');
  for (let i = 1; i < AREAS.length; i++) {
    assert.ok(AREAS[i].ceiling > AREAS[i - 1].ceiling, 'ceilings strictly increase');
  }
});

test('factory contract: createRun gains area 1, baseAltitude 0, outcome null', () => {
  const run = game.createRun();
  assert.equal(run.area, 1);
  assert.equal(run.baseAltitude, 0);
  assert.equal(run.outcome, null);
});

test('crossesCeiling is strict > on every rung', () => {
  assert.equal(typeof game.crossesCeiling, 'function');
  for (const row of AREAS) {
    assert.equal(game.crossesCeiling(row.ceiling - EPS, row.area), false);
    assert.equal(game.crossesCeiling(row.ceiling, row.area), false,
      `peak exactly at ${row.ceiling} does NOT cross (GDD "exceeds")`);
    assert.equal(game.crossesCeiling(row.ceiling + EPS, row.area), true);
  }
});

// ---------- sim rigs ----------

// Seeded 30 u under area `area`'s ceiling; one cleared feet-edge pass adds
// ALT_PER_POINT and the airborne y=40 arc puts the post-step peak at
// ceiling + (40 − 30 + ALT_PER_POINT) u — over on the strict comparison.
function ascentRig(area, extra = {}) {
  return {
    run: { ...game.createRun(), area, altitude: AREAS[area - 1].ceiling - 30, ...extra },
    rope: { ...FEET_EDGE },
    player: { ...AIRBORNE },
  };
}
const tickRig = rig => game.tickRun(rig.run, rig.rope, rig.player, DT, rngStub);

// ---------- non-summit ascents (one leg per rung, derived) ----------

for (const row of AREAS.slice(0, -1)) {
  test(`crossing area ${row.area}'s ceiling ascends as data`, () => {
    const out = tickRig(ascentRig(row.area));
    assert.equal(out.run.status, 'running', 'ascent never ends the run');
    assert.equal(out.run.area, row.area + 1);
    assert.equal(out.run.baseAltitude, AREAS[row.area - 1].ceiling, 'base = broken ceiling');
    assert.equal(out.run.outcome, null);
    assert.equal(out.tripped, false);
    assert.ok(out.events.includes('ascend'), 'ascend rides the D-N02 channel');
    assert.ok(!out.events.includes('win') && !out.events.includes('trip'));
  });
}

test(`crossing the summit ceiling ends the run as over + outcome summit`, () => {
  const summit = AREAS[AREAS.length - 1];
  const out = tickRig(ascentRig(summit.area));
  assert.equal(out.run.status, 'over');
  assert.equal(out.run.outcome, 'summit');
  assert.equal(out.run.tripped, undefined, 'tripped is a RESULT flag, not a run field');
  assert.equal(out.tripped, false, 'win implies not-tripped');
  assert.equal(out.run.area, summit.area, 'summit wins instead of incrementing');
  assert.ok(out.events.includes('win'));
  assert.ok(!out.events.includes('trip') && !out.events.includes('ascend'));
});

// ---------- no-cross legs ----------

test('a below-ceiling peak changes nothing', () => {
  const rig = ascentRig(1);
  rig.run.altitude = AREAS[0].ceiling - 200;
  const out = tickRig(rig);
  assert.equal(out.run.area, 1);
  assert.equal(out.run.baseAltitude, 0);
  assert.ok(!out.events.includes('ascend'));
});

test('a peak EXACTLY at the ceiling does not cross (sim strictness pin)', () => {
  const out = game.tickRun(
    { ...game.createRun(), altitude: AREAS[0].ceiling },
    { ...PARKED },
    { y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 },
    DT, rngStub);
  assert.equal(out.run.area, 1);
  assert.ok(!out.events.includes('ascend'));
  assert.equal(out.run.status, 'running');
});

// ---------- rope-count invariance (the check lives outside the rope loop) ----------

for (const ropes of [1, 2, 3, 4, 5]) {
  test(`the same crossing tick ascends identically at ${ropes} rope(s)`, () => {
    const out = tickRig(ascentRig(1, { ropes }));
    assert.equal(out.run.area, 2);
    assert.equal(out.run.baseAltitude, AREAS[0].ceiling);
    assert.equal(out.run.status, 'running');
    assert.equal(out.events.filter(e => e === 'ascend').length, 1,
      'exactly one area increment per tick regardless of rope count');
  });
}

// ---------- heal leg (hand-built/frozen-harness records) ----------

test('a record without area/baseAltitude/outcome behaves as 1/0/null', () => {
  const { area, baseAltitude, outcome, ...bare } = game.createRun();
  assert.equal(area, 1); // destructure sanity only — the record below lacks them
  const rig = ascentRig(1);
  rig.run = { ...bare, altitude: AREAS[0].ceiling - 30 };
  const out = tickRig(rig);
  assert.equal(out.run.area, 2, 'healed area 1 crossed to 2');
  assert.equal(out.run.baseAltitude, AREAS[0].ceiling);
  assert.equal(out.run.outcome, null);
});

// ---------- hold-length physics legs (REAL physics, no hand-picked peaks) ----------

function simApex(hold, floatMul = 1) {
  let p = jump(createPlayer(), hold);
  let apex = p.y;
  do {
    p = updatePlayer(p, STEP, 1800 / floatMul);
    apex = Math.max(apex, p.y);
  } while (p.y > 0);
  return apex;
}

// Fly the full arc through tickRun on the parked rope: altitude is constant,
// so the only motion is the arc — the ceiling sits ceilingOffset above.
function fly(hold, effects, ceilingOffset) {
  let run = { ...game.createRun(), effects, altitude: AREAS[0].ceiling - ceilingOffset };
  let rope = { ...PARKED };
  let player = jump(createPlayer(), hold);
  const events = [];
  for (let i = 0; i < 150; i++) {
    const out = game.tickRun(run, rope, player, STEP, rngStub);
    ({ run, rope, player } = out);
    events.push(...out.events);
    if (player.grounded) break;
  }
  return { run, events };
}

test('short hold fails to cross a ceiling 45 u above; full hold crosses it', () => {
  assert.ok(simApex(0) < 45, 'rig sanity: the short arc stays under the ceiling');
  const short = fly(0, game.createRun().effects, 45);
  assert.equal(short.run.area, 1, 'the bare short arc does not ascend');
  assert.ok(!short.events.includes('ascend'));
  const full = fly(0.5, game.createRun().effects, 45);
  assert.equal(full.run.area, 2, 'the full arc crosses');
  assert.equal(full.run.baseAltitude, AREAS[0].ceiling);
  assert.equal(full.run.status, 'running');
});

test('hang-time composes: Cloud Shoes crosses a peak-margin rig the bare run does not', () => {
  const floatMul = floatCard.apply(freshEffects()).floatMul;
  const bareApex = simApex(0.5);
  const floatApex = simApex(0.5, floatMul);
  assert.ok(floatApex - bareApex > 1, 'rig sanity: floatMul must lift the arc');
  const margin = (bareApex + floatApex) / 2;
  const bare = fly(0.5, game.createRun().effects, margin);
  assert.equal(bare.run.area, 1, 'bare arc peaks under the rig ceiling');
  const floated = fly(0.5, floatCard.apply(freshEffects()), margin);
  assert.equal(floated.run.area, 2, 'the scaled arc (g = 1800/floatMul) clears it');
});

// ---------- precedence & exclusion ----------

test('a trip tick never also wins: over(trip) beats a same-tick summit peak', () => {
  const summit = AREAS[AREAS.length - 1];
  const out = game.tickRun(
    { ...game.createRun(), area: summit.area, altitude: summit.ceiling + 100, ropes: 1 },
    { ...FEET_EDGE },
    { y: 10, vy: 0, grounded: false, squash: 1, squashVel: 0 }, // below 18 u: the last rope kills
    DT, rngStub);
  assert.equal(out.run.status, 'over');
  assert.equal(out.run.outcome, 'tripped', 'the death path stamps the outcome');
  assert.equal(out.tripped, true);
  assert.equal(out.run.area, summit.area, 'no ascent on a dead tick');
  assert.ok(out.events.includes('trip'));
  assert.ok(!out.events.includes('win') && !out.events.includes('ascend'));
});

test('a 10th-skip ascent coexists with the offer: choose + area + baseAltitude', () => {
  const out = tickRig(ascentRig(1, { skips: 9 }));
  assert.equal(out.run.status, 'choose', 'the marker swaps on the same tick');
  assert.ok(out.run.offer, 'the offer stays pending');
  assert.equal(out.run.area, 2);
  assert.equal(out.run.baseAltitude, AREAS[0].ceiling);
  assert.ok(out.events.includes('offer') && out.events.includes('ascend'));
});

test('a 10th-skip summit peak WINS and clears the pending offer', () => {
  const summit = AREAS[AREAS.length - 1];
  const out = tickRig(ascentRig(summit.area, { skips: 9 }));
  assert.equal(out.run.status, 'over', 'a run cannot await a pick and be terminally won');
  assert.equal(out.run.outcome, 'summit');
  assert.equal(out.run.offer, null);
  assert.ok(out.events.includes('win'));
});

test('i-frames suppress ceiling evaluation; it re-presents when the blank ends', () => {
  const rig = {
    run: { ...game.createRun(), area: 1, altitude: AREAS[0].ceiling - 30, iFrames: 1 },
    rope: { ...PARKED },
    player: { ...AIRBORNE },
  };
  const first = game.tickRun(rig.run, rig.rope, rig.player, DT, rngStub);
  assert.equal(first.run.area, 1, 'no ascent during i-frames (4.5 interlock)');
  assert.equal(first.run.iFrames, 1, 'a blankless tick spends no i-frames');
  const second = game.tickRun({ ...first.run, iFrames: 0 }, first.rope, first.player, DT, rngStub);
  assert.equal(second.run.area, 2, 'the same peak ascends on the first live tick');
  assert.ok(second.events.includes('ascend'));
});

// ---------- 1000-tick drift gate (headless-sim scriptedRun technique) ----------

test('a 1000-tick headless run never ascends: the new check perturbs nothing', () => {
  let { rope, player, run } = game.startRun();
  for (let t = 0; t < 1000; t++) {
    assert.notEqual(run.status, 'over', `scripted player tripped at tick ${t}`);
    if (player.grounded && rope.phase >= 0.2 && rope.phase <= 0.35) player = jump(player, 0.5);
    ({ run, rope, player } = game.tickRun(run, rope, player, STEP, rngStub));
    assert.equal(run.altitude, game.ALT_PER_POINT * run.score, `altitude invariant at tick ${t}`);
  }
  assert.equal(run.area, 1);
  assert.equal(run.baseAltitude, 0);
  assert.equal(run.outcome, null);
  assert.notEqual(run.status, 'over');
});

// ---------- shell legs (FOURTH bootShell fork — sanctioned by story 2.2;
// extraction is a separate chore per deferred-work.md:44) ----------

// The tickRun wrapper stamps a summit-win record the real state machine also
// reaches (altitude fixed so the storage leg pins the SOURCE value).
async function bootAscentShell({ preSeed = {} } = {}) {
  const frames = [];
  const handlers = { window: {}, canvas: {} };
  const hud = {
    'hud-score': { textContent: '' },
    'hud-best': { textContent: '' },
    'hud-prompt': { textContent: '' },
    'hud-owned': { textContent: '' },
  };
  const canvas = {
    width: 0, height: 0, style: {},
    addEventListener: (type, fn) => { handlers.canvas[type] = fn; },
  };
  const errors = [];
  const views = [];
  globalThis.__shellTestViews = views;

  const map = new Map(Object.entries(preSeed));
  const storageStub = {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, v); },
  };
  const script = { winAt: null, winAlt: 123.4, ticks: 0, done: false };
  globalThis.__ascScript = script;

  const clock = { t: 0 };
  const saved = {
    document: globalThis.document,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    performance: Object.getOwnPropertyDescriptor(globalThis, 'performance'),
    consoleError: console.error,
  };
  globalThis.document = { hidden: false, getElementById: id => (id === 'game' ? canvas : hud[id]) };
  globalThis.window = {
    addEventListener: (type, fn) => { handlers.window[type] = fn; },
    innerWidth: 480, innerHeight: 640,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
  };
  globalThis.requestAnimationFrame = cb => { frames.push(cb); return frames.length; };
  Object.defineProperty(globalThis, 'localStorage', { value: storageStub, configurable: true });
  globalThis.performance = { now: () => clock.t };
  console.error = (...args) => { errors.push(args); };

  const gameWrapHref = 'data:text/javascript,' + encodeURIComponent([
    `export * from "${fileHref('game.js')}";`,
    'import * as real from "' + fileHref('game.js') + '";',
    'export const tickRun = (...args) => {',
    '  const s = globalThis.__ascScript;',
    '  const out = real.tickRun(...args);',
    '  if (s.winAt !== null && !s.done) {',
    '    s.ticks += 1;',
    '    if (s.ticks >= s.winAt) {',
    '      s.done = true;',
    '      return { ...out, tripped: false,',
    '        run: { ...out.run, status: "over", outcome: "summit", altitude: s.winAlt } };',
    '    }',
    '  }',
    '  return out;',
    '};',
  ].join('\n'));

  const src = (await readFile(resolve(jsDir, 'shell.js'), 'utf8'))
    .replace(/from\s*['"]\.\/render3d\.js['"]/, `from 'data:text/javascript,${encodeURIComponent(
      'export function createScene() { return { render(view) { globalThis.__shellTestViews.push(view); } }; }')}'`)
    .replace(/from\s*['"]\.\/game\.js['"]/, `from '${gameWrapHref}'`)
    .replace(/from\s*['"]\.\/rope\.js['"]/, `from '${fileHref('rope.js')}'`)
    .replace(/from\s*['"]\.\/player\.js['"]/, `from '${fileHref('player.js')}'`);

  await import('data:text/javascript,' + encodeURIComponent(`${src}\n//asc-boot ${++bootCount}`));
  await settle(); // the (failing, caught) dynamic audio import lands here

  const restore = () => {
    globalThis.document = saved.document;
    globalThis.window = saved.window;
    globalThis.requestAnimationFrame = saved.requestAnimationFrame;
    if (saved.localStorage) Object.defineProperty(globalThis, 'localStorage', saved.localStorage);
    else delete globalThis.localStorage;
    if (saved.performance) Object.defineProperty(globalThis, 'performance', saved.performance);
    else delete globalThis.performance;
    delete globalThis.__ascScript;
    delete globalThis.__shellTestViews;
    console.error = saved.consoleError;
  };
  return { frames, handlers, hud, views, map, script, clock, errors, restore };
}

function tick(env, ms = 50) {
  env.clock.t += ms;
  env.frames.at(-1)(env.clock.t);
}

function startRunning(env) {
  env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
  tick(env);
  assert.equal(env.views.at(-1).run.status, 'running', 'opening Space started the run');
}

test('shell: the summit win saves best-altitude on the win tick, shows no Missed prompt, and restarts permadeath-clean', async () => {
  const env = await bootAscentShell();
  try {
    startRunning(env);
    env.script.winAt = 3; // summit-stamp after 3 more tickRun calls
    tick(env); tick(env);
    const won = env.views.at(-1).run;
    assert.equal(won.status, 'over');
    assert.equal(won.outcome, 'summit');
    // (a) best-altitude recorded on the WIN TICK, before any restart press
    assert.equal(env.map.get('jumprope-best'), String(Math.round(env.script.winAlt)),
      'the win-tick arm saves the rounded altitude');
    // (b) a summit run never reads the loss copy
    assert.ok(!env.hud['hud-prompt'].textContent.includes('Missed'),
      'the over-prompt is gated on outcome');
    assert.match(env.hud['hud-prompt'].textContent, /^Summit\. Altitude \d+ best \d+$/,
      'story 2.4 ships the Summit. copy in the prompt slot');
    // (c) the EXISTING over-restart branch restarts it (FR22: zero new handlers)
    env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
    env.handlers.window.keyup({ code: 'Space' });
    tick(env, 100);
    const r = env.views.at(-1).run;
    assert.equal(r.status, 'running', 'the release restarted the run');
    assert.equal(r.altitude, 0);
    assert.equal(r.area, 1);
    assert.equal(r.baseAltitude, 0);
    assert.equal(r.outcome, null);
    assert.equal(env.map.get('jumprope-best'), String(Math.round(env.script.winAlt)),
      'the restart-site Math.max re-save is idempotent');
  } finally { env.restore(); }
});
