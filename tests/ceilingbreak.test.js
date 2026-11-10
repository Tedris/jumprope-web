import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { AREAS, ALT_PER_POINT } from '../js/game.js';

// Story 4.4 (FR16 / NFR1 / FR23 / NFR8): the ceiling-break moment — the beat.
// ONE new table row in js/shell.js JUICE_TIERS (hitstop/shake/particles) and
// ONE new rope column in js/render3d.js VISTAS with the fifth write in the
// existing area edge. Everything new is fenced HERE (D-e): this file re-implements
// both boots (a test file cannot import helpers from the frozen suites —
// byte-identical discipline): the shell boot from the tests/ceilingmarker.test.js
// donor (tickRun wrapper + fake-clock 50 ms frames), the renderer boot from the
// tests/areavistas.test.js donor (recording Color/material/geometry stub behind
// the two-specifier data-URL rewrite). Expectations derive from AREAS, the
// text-derived shipped constants, and the JUICE_TIERS object itself; the NEW
// rope hexes are pinned as the ladder's own contract (they have no other source,
// D-e). No relative specifier into js/shell.js or js/render3d.js appears here,
// so the SPECIFIER_RE walk in tests/boundary.test.js stays green (ARCH-01).

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');
const fileHref = name => pathToFileURL(resolve(jsDir, name)).href;
const settle = () => new Promise(r => setTimeout(r, 0));
const run1 = promisify(execFile);
let bootCount = 0;

// The decided rope ladder (D-b): tier 1 IS PALE BY REFERENCE (text-derived —
// the look-preservation fence, never a re-typed hex); tiers 2..5 are pinned
// here as the ladder's own contract (no other source exists, D-e).
async function ropeLadder() {
  return [await shippedConst('PALE'), 0xf7dfa0, 0xcfe2f7, 0xa8c8ff, 0xffffff];
}

function luma(hex) {
  return 0.299 * ((hex >> 16) & 0xff) + 0.587 * ((hex >> 8) & 0xff) + 0.114 * (hex & 0xff);
}

async function sourceOf(file) {
  return readFile(resolve(jsDir, file), 'utf8');
}

// Text-derive a shipped `const NAME = 0x...` value (derive-literals idiom,
// donor tests/areavistas.test.js:161-167).
async function shippedConst(name) {
  const src = await sourceOf('render3d.js');
  const m = src.match(new RegExp(`const ${name} = (0x[0-9a-fA-F]+)`));
  assert.ok(m, `the shipped look constant ${name} is present in js/render3d.js`);
  return Number(m[1]);
}

async function shippedIntConst(name) {
  const src = await sourceOf('render3d.js');
  const m = src.match(new RegExp(`const ${name} = ([0-9]+)`));
  assert.ok(m, `the shipped constant ${name} is present in js/render3d.js`);
  return Number(m[1]);
}

// The D-c display-side heal, derived CROSS-SOURCE from js/shell.js itself
// (markerHeal donor, tests/areavistas.test.js:171-176): the same-tick pairing
// fence extended to the fifth write (§5).
async function markerHeal() {
  const src = await sourceOf('shell.js');
  const m = src.match(/const area = (Math\.min\(Math\.max\([^;]+AREAS\.length\));/);
  assert.ok(m, 'js/shell.js carries the markerLine area heal (pairing fence)');
  return area => new Function('run', 'AREAS', `return ${m[1]};`)({ area }, AREAS);
}

// ---------------------------------------------------------------------------
// Shell boot — donor tests/ceilingmarker.test.js:48-152 + the JUICE_TIERS
// namespace capture of tests/juice.test.js:30-101. The tickRun wrapper over the
// REAL sim stamps forceScore (altitude = score x ALT_PER_POINT, invariant
// intact) to park altitude just under a ceiling, and mirrors every sim events
// array into globalThis.__cbEvents (the tests/balance.test.js:39 idiom).
// ---------------------------------------------------------------------------
async function bootBreakShell() {
  const frames = [];
  const handlers = { window: {}, canvas: {} };
  const hudEls = {
    'hud-score': { textContent: '' },
    'hud-best': { textContent: '' },
    'hud-prompt': { textContent: '' },
    'hud-owned': { textContent: '' }
  };
  const canvas = {
    width: 0, height: 0, style: {},
    addEventListener: (type, fn) => { handlers.canvas[type] = fn; }
  };
  const documentStub = { hidden: false, getElementById: id => (id === 'game' ? canvas : hudEls[id]) };
  const views = [];
  globalThis.__cbViews = views;
  const script = { forceScore: undefined };
  globalThis.__cbScript = script;
  globalThis.__cbEvents = [];

  const clock = { t: 0 };
  const saved = {
    document: globalThis.document,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    // Descriptor, not value: reading Node's experimental localStorage getter
    // emits an ExperimentalWarning through console.error.
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    performance: Object.getOwnPropertyDescriptor(globalThis, 'performance'),
    consoleError: console.error
  };
  globalThis.document = documentStub;
  globalThis.window = {
    addEventListener: (type, fn) => { handlers.window[type] = fn; },
    innerWidth: 480, innerHeight: 640,
    matchMedia: () => ({ matches: false, addEventListener() {} })
  };
  globalThis.requestAnimationFrame = cb => { frames.push(cb); return frames.length; };
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: () => null, setItem: () => {} }, configurable: true
  });
  globalThis.performance = { now: () => clock.t };
  console.error = () => {};

  const gameWrapHref = 'data:text/javascript,' + encodeURIComponent([
    `export * from "${fileHref('game.js')}";`,
    'import * as real from "' + fileHref('game.js') + '";',
    'export const tickRun = (...args) => {',
    '  const s = globalThis.__cbScript;',
    '  let out = real.tickRun(...args);',
    '  (globalThis.__cbEvents ??= []).push(...(out.events ?? []));',
    '  if (s.forceScore !== undefined) out = { ...out, run: { ...out.run, score: s.forceScore, altitude: s.forceScore * real.ALT_PER_POINT } };',
    '  return out;',
    '};'
  ].join('\n'));

  const renderStubHref = 'data:text/javascript,' + encodeURIComponent(
    'export function createScene() { return { render(view) { globalThis.__cbViews.push(view); } }; }');

  const src = (await readFile(resolve(jsDir, 'shell.js'), 'utf8'))
    .replace(/from\s*['"]\.\/render3d\.js['"]/, `from '${renderStubHref}'`)
    .replace(/from\s*['"]\.\/game\.js['"]/, `from '${gameWrapHref}'`)
    .replace(/from\s*['"]\.\/rope\.js['"]/, `from '${fileHref('rope.js')}'`)
    .replace(/from\s*['"]\.\/player\.js['"]/, `from '${fileHref('player.js')}'`)
    .replace(/import\(\s*['"]\.\/audio\.js['"]\s*\)/, `import('${fileHref('audio.js')}')`);

  // Distinct data: URL per boot so the bootstrap guard re-runs AND
  // JUICE_TIERS is per-boot-mutable (tests/juice.test.js:85-87 idiom).
  const mod = await import('data:text/javascript,' + encodeURIComponent(`${src}\n//ceilingbreak boot ${++bootCount}`));
  await settle();

  const restore = () => {
    globalThis.document = saved.document;
    globalThis.window = saved.window;
    globalThis.requestAnimationFrame = saved.requestAnimationFrame;
    if (saved.localStorage) Object.defineProperty(globalThis, 'localStorage', saved.localStorage);
    else delete globalThis.localStorage;
    if (saved.performance) Object.defineProperty(globalThis, 'performance', saved.performance);
    else delete globalThis.performance;
    delete globalThis.__cbViews;
    delete globalThis.__cbScript;
    delete globalThis.__cbEvents;
    console.error = saved.consoleError;
  };
  return { mod, frames, handlers, views, script, clock, restore };
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

function landFirst(env) {
  for (let i = 0; i < 30 && !env.views.at(-1).player.grounded; i++) tick(env);
  assert.equal(env.views.at(-1).player.grounded, true, 'the start hop landed');
}

// Scripted physical ascend (donor tests/ceilingmarker.test.js:222-239): park
// the altitude a hair OVER AREAS[0].ceiling; the REAL state machine ascends on
// the sim's own clock — no forceArea anywhere. Returns the frame index F whose
// payload first carries area 2, then pads `pad` further frames.
function ascend(env, pad = 8) {
  startRunning(env);
  landFirst(env);
  env.script.forceScore = (AREAS[0].ceiling + 2) / ALT_PER_POINT;
  for (let i = 0; i < 60 && env.views.at(-1).run.area === 1; i++) tick(env);
  const F = env.views.length - 1;
  assert.equal(env.views.at(-1).run.area, 2, 'the real sim crossed the ceiling (no forceArea involved)');
  for (let i = 0; i < pad; i++) tick(env);
  return F;
}

// Unwrapped per-frame phase deltas (tests/juice.test.js:113 idiom).
function deltas(phases) {
  return phases.map((p, i) => i === 0 ? 0 : (p - phases[i - 1] + 1.5) % 1 - 0.5);
}

// ---------------------------------------------------------------------------
// Renderer boot — donor tests/areavistas.test.js:29-121 (the RICHER
// two-specifier stub: recording Color with hex/birth + colorSets census,
// materials with birthHex, geometries registered). The rope tube is the mesh
// whose geometry.constructor.name === 'TubeGeometry'.
// ---------------------------------------------------------------------------
const THREE_CB_STUB_HREF = 'data:text/javascript,' + encodeURIComponent([
  'export const NearestFilter = 1003;',
  'globalThis.__cbReg ||= { scenes: [], meshes: [], materials: [], geometries: [], targets: [], colorSets: 0 };',
  'const reg = globalThis.__cbReg;',
  'export class Vec3 {',
  '  constructor() { this.x = 0; this.y = 0; this.z = 0; }',
  '  set(x, y, z) { this.x = x; this.y = y; this.z = z; }',
  '  setScalar(v) { this.x = v; this.y = v; this.z = v; }',
  '}',
  'export class Node {',
  '  constructor() {',
  '    this.position = new Vec3();',
  '    this.rotation = new Vec3();',
  '    this.scale = new Vec3();',
  '    this.scale.setScalar(1);',
  '    this.children = [];',
  '    this.visible = true;',
  '  }',
  '  add(child) { this.children.push(child); }',
  '  setSize() {}',
  '  setRenderTarget() {}',
  '  setPixelRatio() {}',
  '  compile() {}',
  '  updateProjectionMatrix() {}',
  '  lookAt() {}',
  '  render() {}',
  '}',
  'export class WebGLRenderer extends Node {}',
  'export class Scene extends Node { constructor() { super(); reg.scenes.push(this); } }',
  'export class Color {',
  '  constructor(hex = 0) { this.hex = hex; this.birth = hex; }',
  '  set(hex) { this.hex = hex; reg.colorSets += 1; }',
  '}',
  'export class Vector3 extends Vec3 {',
  '  constructor(x = 0, y = 0, z = 0) { super(); this.x = x; this.y = y; this.z = z; }',
  '}',
  'export class Vector2 {',
  '  constructor(x = 0, y = 0) { this.x = x; this.y = y; }',
  '  set(x, y) { this.x = x; this.y = y; }',
  '}',
  'export class WebGLRenderTarget {',
  '  constructor(w, h) { this.width = w; this.height = h; this.texture = {}; reg.targets.push(this); }',
  '  setSize(w, h) { this.width = w; this.height = h; }',
  '}',
  'export class PerspectiveCamera extends Node {}',
  'export class OrthographicCamera extends Node {}',
  'export class Group extends Node {}',
  'class Geo extends Node { constructor(args) { super(); this.args = args; reg.geometries.push(this); } }',
  'export class PlaneGeometry extends Geo { constructor(w, h) { super([w, h]); this.w = w; this.h = h; } }',
  'export class BoxGeometry extends Geo { constructor(w, h, d) { super([w, h, d]); this.w = w; this.h = h; this.d = d; } }',
  'export class TubeGeometry extends Geo { constructor(...a) { super(a); } }',
  'export class CatmullRomCurve3 extends Geo { constructor(...a) { super(a); } }',
  'export class CylinderGeometry extends Geo { constructor(...a) { super(a); } }',
  'export class SphereGeometry extends Geo { constructor(...a) { super(a); } }',
  'export class CircleGeometry extends Geo { constructor(...a) { super(a); } }',
  'export class MeshBasicMaterial {',
  '  constructor(o = {}) { this.birthHex = o.color; this.color = new Color(o.color);',
  '    for (const k in o) if (k !== "color") this[k] = o[k]; reg.materials.push(this); }',
  '}',
  'export class MeshLambertMaterial {',
  '  constructor(o = {}) { this.birthHex = o.color; this.color = new Color(o.color);',
  '    for (const k in o) if (k !== "color") this[k] = o[k]; reg.materials.push(this); }',
  '}',
  'export class ShaderMaterial { constructor(o = {}) { this.uniforms = o.uniforms; reg.materials.push(this); } }',
  'export class DirectionalLight extends Node {}',
  'export class Fog { constructor(color, near, far) { this.color = new Color(color); this.near = near; this.far = far; } }',
  'export class Mesh extends Node {',
  '  constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; reg.meshes.push(this); }',
  '}'
].join('\n'));

async function bootBreakRenderer(canvas = { width: 480, height: 640 }) {
  const src = await readFile(resolve(jsDir, 'render3d.js'), 'utf8');
  const rewritten = src
    .replace(/from\s*['"]three['"]/, `from '${THREE_CB_STUB_HREF}'`)
    .replace(/from\s*['"][^'"]*interpolate\.js['"]/, `from '${fileHref('interpolate.js')}'`);
  const mod = await import('data:text/javascript,' + encodeURIComponent(`${rewritten}\n//ceilingbreak vista boot ${++bootCount}`));
  const reg = globalThis.__cbReg;
  for (const k of Object.keys(reg)) reg[k] = Array.isArray(reg[k]) ? [] : 0;
  const scene = mod.createScene(canvas);
  const world = reg.scenes[0];
  const ropeMesh = reg.meshes.find(m => m.geometry?.constructor.name === 'TubeGeometry');
  assert.ok(ropeMesh, 'the rope tube is addressable by TubeGeometry (the D-e handle)');
  // Rope-write census: wrap the live material's Color#set (§3/§4 edges).
  let ropeWrites = 0;
  const set0 = ropeMesh.material.color.set.bind(ropeMesh.material.color);
  ropeMesh.material.color.set = hex => { ropeWrites += 1; return set0(hex); };
  return { scene, reg, world, ropeMesh, ropeWritesOf: () => ropeWrites };
}

function cbView(area, overrides = {}) {
  return {
    run: { status: 'running', area },
    rope: { phase: 0.5 },
    player: { y: 0 },
    prevPhase: 0.5,
    alpha: 0,
    now: 0,
    ...overrides
  };
}

function stateCensus(env) {
  return {
    rope: env.ropeMesh.material.color.hex,
    fog: env.world.fog.color.hex,
    bg: env.world.background.hex
  };
}

// ---------------------------------------------------------------------------
// §1 The beat row — JUICE_TIERS table contract (AC1, D-a) — 1 boot
// ---------------------------------------------------------------------------

test('§1 JUICE_TIERS carries the ascend row: key census + seeds, extending not replacing (D-a)', async () => {
  const env = await bootBreakShell();
  try {
    const t = env.mod.JUICE_TIERS;
    assert.deepEqual(Object.keys(t).sort(), ['ascend', 'chargeUsed', 'nearMiss', 'ropeLost', 'skip', 'trip', 'win'],
      "the seven juice tiers — the ladder is EXTENDED by Story 5.3 (FR16 seam: chargeUsed/win get their rows), 'jump' still gets no juice");
    assert.deepEqual(t.ascend, { hitstop: 60, shake: 1.75, particles: 12 },
      'the beat row lands between nearMiss and trip on every axis');
  } finally { env.restore(); }
});

test('§1 v1 rows verbatim + significance order skip < nearMiss < ascend < trip on all three axes (kills M2)', async () => {
  const src = await sourceOf('shell.js');
  const m = src.match(/export const JUICE_TIERS = \{([\s\S]*?)\n\};/);
  assert.ok(m, 'the JUICE_TIERS literal is present in js/shell.js');
  const t = new Function(`return {${m[1]}};`)();
  assert.deepEqual(t.skip, { hitstop: 8, shake: 0.5, particles: 4 }, 'skip verbatim (D-a: extend, never replace)');
  assert.deepEqual(t.nearMiss, { hitstop: 40, shake: 1.5, particles: 10 }, 'nearMiss verbatim');
  assert.deepEqual(t.trip, { hitstop: 80, shake: 2, particles: 16 }, 'trip verbatim — death stays the loudest event');
  for (const [lo, hi] of [['skip', 'nearMiss'], ['nearMiss', 'chargeUsed'], ['chargeUsed', 'ascend'], ['ascend', 'ropeLost'], ['ropeLost', 'trip'], ['win', 'trip']]) {
    for (const axis of ['hitstop', 'shake', 'particles']) {
      assert.ok(t[lo][axis] < t[hi][axis], `${lo}.${axis} < ${hi}.${axis} — significance-scaled (FEEL-02)`);
    }
  }
  for (const tier of Object.values(t)) {
    assert.ok(tier.shake <= 2, 'shake stays inside the 2 post-pass px band (tests/juice.test.js:161)');
    assert.ok(tier.particles >= 1 && tier.particles <= 24, 'particle counts small and pooled (tests/juice.test.js:162)');
  }
});

// ---------------------------------------------------------------------------
// §2 The beat end-to-end on a booted shell (AC1/AC3) — 3 boots
// ---------------------------------------------------------------------------

test('§2 the ascend frame carries the beat impulse AND the new area together, exactly once, zero payload delta (kills M1)', async () => {
  const env = await bootBreakShell();
  try {
    const F = ascend(env, 4);
    const at = env.views[F];
    const before = env.views[F - 1];
    const tier = env.mod.JUICE_TIERS.ascend;
    assert.ok(tier, 'the beat row exists to be looked up');
    assert.equal(at.run.area, 2, 'palette-flip: the same payload frame already carries the new area');
    assert.equal(at.run.status, 'running', 'the beat is not a win/trip edge');
    assert.equal(at.juice.shake, tier.shake, 'freeze-frame carries the beat shake');
    assert.equal(at.juice.particles, tier.particles, 'freeze-frame carries the beat particles');
    // Exactly one ascend-caused impulse across the whole run (one beat per ascent, D-c).
    const impulses = new Set();
    for (const v of env.views) if (v.juice && v.juice.shake === tier.shake) impulses.add(v.juice.at);
    assert.equal(impulses.size, 1, 'exactly ONE juice impulse was opened by the beat');
    const ascends = globalThis.__cbEvents.filter(e => e === 'ascend');
    assert.equal(ascends.length, 1, "the wrapper's event mirror saw EXACTLY ONE 'ascend' — non-vacuous");
    // Zero payload delta: the beat needs no new fields (D-a).
    assert.deepEqual(Object.keys(at).sort(), Object.keys(before).sort(),
      'payload key set identical across the ascent — no new view fields');
    assert.deepEqual(Object.keys(at.run).sort(), Object.keys(before.run).sort(),
      'run key set identical across the ascent — the state channel is the existing run.area');
  } finally { env.restore(); }
});

test('§2 hitstop delays, never drops: zero-phase-delta freeze frame, then the beat boot re-joins the hitstop-0 control step-for-step (kills M1/M6, D-c)', async () => {
  // A/B (tests/juice.test.js:123-147 idiom, per-boot-mutable table): juice boot
  // = real 60 ms ascend beat with the other tiers parked at 0; control = the
  // whole table at 0. The boots are SEQUENTIAL: the
  // donor shell-boot owns the one-per-process rAF/views globals, so a second
  // concurrent boot would hijack the first one's frame loop.
  const runBeat = async (mutate) => {
    const env = await bootBreakShell();
    try {
      mutate(env.mod.JUICE_TIERS);
      return { F: ascend(env), phases: env.views.map(v => v.rope.phase) };
    } finally { env.restore(); }
  };
  const J = await runBeat(t => { t.skip.hitstop = 0; t.nearMiss.hitstop = 0; t.trip.hitstop = 0; });  // ascend keeps its shipped 60
  const C = await runBeat(t => { for (const tier of Object.values(t)) tier.hitstop = 0; });
  assert.equal(J.F, C.F, 'both boots ascend on the same frame — identical deterministic step schedule');
  const dJ = deltas(J.phases);
  const dC = deltas(C.phases);
  // The 60 ms deadline spans at least one whole 50 ms frame: a zero-delta frame.
  assert.equal(dJ[J.F + 1], 0, 'the frame after the beat holds NO steps — freeze, not drop (50 ms stride < 60 ms deadline)');
  assert.ok(dC[J.F + 1] > 0, 'the unjuiced control advances through that window (otherwise the A/B proves nothing)');
  // Delay-not-drop: by the frame after the release the timelines are step-identical again.
  for (let i = J.F + 3; i < J.phases.length; i++) {
    assert.equal(J.phases[i], C.phases[i],
      `frame ${i}: the beat boot carries the exact control phase — the held steps drained, nothing was dropped`);
  }
  const sum = (arr, a, b) => arr.slice(a, b).reduce((x, y) => x + y, 0);
  const w = Math.min(J.F + 7, J.phases.length);
  assert.ok(Math.abs(sum(dJ, J.F, w) - sum(dC, J.F, w)) < 1e-12,
    'total phase advance around the beat matches the control — the phase clock is untouched (4.2 D-b)');
});

// ---------------------------------------------------------------------------
// §3 The rope-appearance ladder through the recording boot (AC1/AC2) — 2 boots
// ---------------------------------------------------------------------------

test('§3 the 1..5 tour walks the rope ladder; tier 1 IS the derived PALE; rope stays max-bright over its fog (kills M3/M10)', async () => {
  const env = await bootBreakRenderer();
  const ladder = await ropeLadder();
  const geo0 = env.reg.geometries.length;
  const targets0 = env.reg.targets.length;
  const mats0 = env.reg.materials.length;
  const hexes = [];
  for (let t = 1; t <= AREAS.length; t++) {
    env.scene.render(cbView(t));
    hexes.push(env.ropeMesh.material.color.hex);
    assert.ok(luma(hexes[t - 1]) > luma(AREAS[t - 1].fog),
      `tier ${t}: rope luma must stay above its fog luma (D-09 max-bright rule, derived from AREAS.fog)`);
  }
  assert.deepEqual(hexes, ladder, 'the rope ladder per tier, tier 1 by reference (look preservation)');
  assert.equal(new Set(hexes).size, AREAS.length, 'rope appearance is pairwise distinct per tier (FR16)');
  // AC2 mechanism: the fifth write allocates nothing.
  assert.equal(env.reg.geometries.length, geo0, 'the beat allocates ZERO geometry (NFR1)');
  assert.equal(env.reg.targets.length, targets0, 'the beat adds no render target (NFR1)');
  assert.equal(env.reg.materials.length, mats0, 'the beat constructs no new material — the fifth write rides the hoisted ropeMat (NFR1)');
});

test('§3 VISTAS row 1 references PALE — the shipped look preserved through the constant, never a re-typed hex (kills M10)', async () => {
  const src = await sourceOf('render3d.js');
  const block = src.slice(src.indexOf('const VISTAS = ['), src.indexOf('];', src.indexOf('const VISTAS = [')));
  assert.ok(block.length > 0, 'the VISTAS literal is present in js/render3d.js');
  const ropes = [...block.matchAll(/\brope:\s*([A-Za-z_$][\w$]*)/g)];
  assert.equal(ropes.length, 1, 'exactly ONE rope column references a constant — rows 2-5 are hexes');
  assert.equal(ropes[0][1], 'PALE', 'row 1 is PALE BY REFERENCE (4.3 D-a law: pixels preserved through the constant)');
});

test('§3/§4 the edge writes EXACTLY five things once per edge — zero on a repeat, zero for the impulse (kills M4/M5)', async () => {
  const env = await bootBreakRenderer();
  const ladder = await ropeLadder();
  let writes = env.reg.colorSets;
  env.scene.render(cbView(1));                                   // boot cache IS tier 1: no edge
  assert.equal(env.reg.colorSets, writes, 'render(1) at boot takes no vista edge (cache == apply)');
  assert.equal(env.ropeWritesOf(), 0, 'no rope write without an edge');
  env.scene.render(cbView(2));                                   // edge: bg, fog, floor, rope
  assert.equal(env.reg.colorSets - writes, 4, 'an area edge writes EXACTLY four Colors (bg, fog, floor, rope) + visibilities');
  assert.equal(env.ropeWritesOf(), 1, 'exactly ONE rope-material write per edge');
  writes = env.reg.colorSets;
  env.scene.render(cbView(2));                                   // repeat: silent
  assert.equal(env.reg.colorSets, writes, 'a same-area repeat writes ZERO colors (kills M4 every-frame writes)');
  assert.equal(env.ropeWritesOf(), 1, 'the rope material is untouched on a repeat');
  env.scene.render(cbView(3));
  assert.equal(env.reg.colorSets - writes, 4, 'edge 2->3: four writes again');
  assert.equal(env.ropeWritesOf(), 2, 'one rope write on this edge too');
  // §4 state/impulse separation: appearance follows STATE, never the impulse.
  writes = env.reg.colorSets;
  env.scene.render(cbView(3, { now: 1000, juice: { at: 1000, shake: 1.75, particles: 12 } }));
  assert.equal(env.reg.colorSets, writes, 'a juice impulse on a same-area frame writes no colors');
  env.scene.render(cbView(3, { now: 9999, juice: { at: 9999, shake: 2, particles: 16 } }));
  assert.equal(env.reg.colorSets, writes, 'a second impulse still writes no colors (kills M5 impulse-coupled recolor)');
  assert.equal(env.ropeWritesOf(), 2, 'the rope never recolored off view.juice (kills M5)');
  assert.equal(env.ropeMesh.material.color.hex, ladder[2], 'the rope shows the AREA-3 hex, the beat changes nothing');
});

// ---------------------------------------------------------------------------
// §4/§5 static change + crafted payloads (AC3/FR23) — 2 boots
// ---------------------------------------------------------------------------

test('§4 reducedMotion true vs false across the same 1..5 tour: the static change is the WHOLE beat (AC3, D-d)', async () => {
  const env = await bootBreakRenderer();
  const ladder = await ropeLadder();
  const on = [];
  for (let t = 1; t <= AREAS.length; t++) { env.scene.render(cbView(t, { reducedMotion: true })); on.push(stateCensus(env)); }
  const off = [];
  for (let t = 1; t <= AREAS.length; t++) { env.scene.render(cbView(t, { reducedMotion: false })); off.push(stateCensus(env)); }
  assert.deepEqual(on, off, 'rope/fog/bg state is identical under both motion flags — the beat damps to the static change');
  assert.equal(on[3].rope, ladder[3], 'non-vacuous: the tour really walked to the tier-4 rope hex');
  assert.equal(off[0].rope, ladder[0], 'non-vacuous: the tour really returned to the tier-1 PALE');
});

test('§5 crafted areas are data: the rope lands on the tier markerLine lands the fog, same tick; the cache never poisons (kills M3/M9 drift)', async () => {
  const env = await bootBreakRenderer();
  const ladder = await ropeLadder();
  const healFromMarker = await markerHeal();
  for (const area of [undefined, null, NaN, 0, -2, '3', 4.6, 9, Infinity, {}]) {
    env.scene.render(cbView(area));                              // must never throw
    const tier = healFromMarker(area);
    assert.equal(env.world.fog.color.hex, AREAS[tier - 1].fog, `area ${String(area)}: fog heals to tier ${tier}`);
    assert.equal(env.ropeMesh.material.color.hex, ladder[tier - 1],
      `area ${String(area)}: the rope lands on the SAME tier markerLine lands the fog (4.3 D-c pairing, fifth write)`);
  }
  env.scene.render(cbView('nonsense'));
  env.scene.render(cbView(4));
  assert.equal(env.ropeMesh.material.color.hex, ladder[3], 'a crafted frame cannot poison the cache: the next valid payload re-lands');
});

// ---------------------------------------------------------------------------
// §6 Static fences + deferred evidence (AC2/AC4) — no boots
// ---------------------------------------------------------------------------

test('§6 js/audio.js VOICES census is EXACTLY the eight shipped voices — the deferred beat\'s audio half + the rope-loss thud landed, census pinned (AC4 ledger fence, re-contracted by Story 5.2)', async () => {
  const src = await sourceOf('audio.js');
  const m = src.match(/const VOICES = \{([\s\S]*?)\n  \};/);
  assert.ok(m, 'the VOICES literal is present in js/audio.js');
  const names = [...m[1].matchAll(/^\s*(\w+):/gm)].map(x => x[1]).sort();
  assert.deepEqual(names, ['ascend', 'jump', 'nearMiss', 'pick', 'ropeLost', 'skip', 'trip', 'win'],
    'the exact-name-set pin replaces 5.1\'s seven-name census — the rope-loss thud shipped, and nothing else may join the table (Story 5.2; tension is a skip VARIANT, never a name)');
});

test('§6 render3d.js imports EXACTLY {three, ./interpolate.js} — the boot wheel survives the beat (kills M9)', async () => {
  const specs = [...(await sourceOf('render3d.js')).matchAll(/\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(?\s*['"]([^'"]+)['"]/g)]
    .map(m => m[1] ?? m[2]);
  assert.deepEqual(specs.sort(), ['./interpolate.js', 'three'],
    'a third specifier (e.g. a rope column imported from ./areas.js) breaks both frozen renderer boots on boot');
});

test('§6 no new timing surface: no timers anywhere in shell/render3d, stopUntil writes stay the shipped three + the table (kills M6)', async () => {
  const shell = await sourceOf('shell.js');
  const renderer = await sourceOf('render3d.js');
  for (const [name, src] of [['shell.js', shell], ['render3d.js', renderer]]) {
    assert.ok(!/setTimeout\(|setInterval\(/.test(src), `js/${name}: the beat may not open a timer surface (NFR8)`);
  }
  assert.equal((shell.match(/stopUntil\s*=[^=]/g) ?? []).length, 4,
    'declaration + two shipped resets + the one table-driven deadline write — no new timing surface (T-4-03)');
  assert.equal((shell.match(/now < stopUntil/g) ?? []).length, 1, 'the drain gate stays the single freeze mechanism');
});

test('§6 AC2 mechanism census: two render passes, shipped 16-pool, no bitmaps (NFR1)', async () => {
  const src = await sourceOf('render3d.js');
  assert.equal((src.match(/renderer\.render\(/g) ?? []).length, 2,
    'one world pass + the single dither post pass — the beat adds no post-processing (NFR1)');
  assert.ok(!/TextureLoader|new Image\b|createImageBitmap|data:image|\.png|\.jpg|\.webp/.test(src),
    'the beat adds no bitmap machinery (NFR1/NFR10 — donor areavistas §6 oracle)');
});

test('§6 diff census: only the story-authorized files differ from the story base (frozen-file tripwire, kills M8)', async () => {
  // Pinned base (review 4.4, Blind F2): diffing HEAD goes vacuous the moment
  // this story commits; the base sha keeps the tripwire armed for every later
  // run. Shallow clones lacking the base fall back to the HEAD census.
  const BASE = '5659fd4';
  let changed;
  try {
    try {
      changed = (await run1('git', ['diff', '--name-only', BASE])).stdout.split('\n').filter(Boolean);
    } catch (err) {
      if (/bad object|unknown revision/i.test(String(err.stderr) + String(err.message))) {
        changed = (await run1('git', ['diff', '--name-only', 'HEAD'])).stdout.split('\n').filter(Boolean);
      } else {
        throw err;
      }
    }
  } catch (err) {
    if (/not a git repository/i.test(String(err.stderr) + String(err.message))) return; // no VCS: nothing to census
    throw err;
  }
  // porcelain arm (chore consolidation 2026-11-09, ledger :186): git diff is
  // blind to UNTRACKED paths — merge git status --porcelain so a new file goes
  // red at CREATE time, not at commit. Strip the XY/?? status prefixes.
  for (const line of (await run1('git', ['status', '--porcelain'])).stdout.split('\n').filter(Boolean)) {
    changed.push(line.slice(3).split(' -> ').pop().split('"').join(''));
  }
  const allowed = new Set([
    'js/shell.js', 'js/render3d.js',
    'tests/ceilingbreak.test.js', 'tests/juice.test.js', 'tests/areavistas.test.js',
    '_bmad-output/implementation-artifacts/4-4-the-ceiling-break-moment.md',
    '_bmad-output/implementation-artifacts/sprint-status.yaml',
    // The ledger row naming the 5.1/UAT owners of the two deferred halves is an
    // artifact write (loop contract), not a frozen-surface write.
    '_bmad-output/implementation-artifacts/deferred-work.md',
    // Story 4.5 sanctioned re-contract R2 (2026-11-08): the marker CSS rule, the
    // summit suite + its story artifact, and the R1 comment touch above.
    'css/style.css', 'tests/summitapproach.test.js', 'tests/ceilingmarker.test.js',
    '_bmad-output/implementation-artifacts/4-5-summit-approach-one-way-guarantees.md',
    // Story 5.1 sanctioned re-contract R2 (2026-11-09): the two new VOICES
    // entries, the stinger suite, and its story artifact.
    'js/audio.js',
    'tests/ascentstinger.test.js',
    '_bmad-output/implementation-artifacts/5-1-ascent-stinger-win-fanfare.md',
    // Story 5.2 sanctioned re-contract R2 (2026-11-09): the ropeLost VOICES
    // entry + tension state, the thud suite + its story artifact (tests/
    // juice.test.js already rides this set from 4.4).
    'tests/ropelossthud.test.js',
    '_bmad-output/implementation-artifacts/5-2-rope-loss-thud-last-rope-tension.md',
    // Story 5.3 sanctioned re-contract R3 (2026-11-09): the held-rope ghost pool +
    // i-frame cosmetic read land in js/render3d.js (allowed above since 4.4) and the
    // two JUICE rows in js/shell.js — the new suite and its story artifact join here.
    'tests/iframesjuice.test.js',
    '_bmad-output/implementation-artifacts/5-3-i-frame-trip-juice.md',
    // Story 5.4 sanctioned re-contract R1 (2026-11-09): the WR-02 one-line beat
    // gate lands in js/render3d.js (in this set since 4.4); the new reduced-motion
    // suite and this story's artifact join here — zero other paths.
    'tests/reducedmotion.test.js',
    '_bmad-output/implementation-artifacts/5-4-reduced-motion-for-new-states-the-wr-02-fix.md',
    // Story 5.5 sanctioned re-contract R1 (2026-11-09): zero product-code delta —
    // the audio-lifecycle matrix suite and this story's artifact join the set;
    // the live-browser re-run lands Debug-Log evidence + the ledger stamp only.
    'tests/audiolifecycle.test.js',
    '_bmad-output/implementation-artifacts/5-5-audio-lifecycle-regression-sweep.md',
    // Story 5.6 sanctioned re-contract R1 (2026-11-09): zero product-code delta —
    // the committed music asset, the track1 metadata suite, and this story's
    // artifact join the set; the live-browser lane lands Debug-Log evidence +
    // the ledger stamp only.
    'audio/track.ogg',
    'tests/track1.test.js',
    '_bmad-output/implementation-artifacts/5-6-track-1-music-content.md',
    // Story 5.7 sanctioned re-contract R1 (2026-11-09): the shell-only pause-menu
    // layer lands in js/shell.js + css/style.css (both in this set by 4.4/4.5
    // lineage); the new suite and this story's artifact join here — zero other paths.
    'tests/pausemenu.test.js',
    '_bmad-output/implementation-artifacts/5-7-pause-menu-audio-config.md',
    '_bmad-output/implementation-artifacts/pre-66-polish.md',
    'tests/secondwind.test.js',
    'tests/leadinhop.test.js',
    // chore consolidation 2026-11-09: the shared harness primitives, the new
    // harness fence/behavior suite, and this chore's artifact.
    'tests/support/shell-harness.js',
    'tests/harness.test.js',
    '_bmad-output/implementation-artifacts/chore-test-harness-ci-consolidation.md',
    'tests/polish.test.js',
    'tests/altitude.test.js',
    'tests/ascent.test.js', 'tests/uxpolish.test.js', 'tests/shell.test.js',
    'tests/pausemenu.test.js', 'tests/leadinhop.test.js',
    '.github/workflows/test.yml',
    // Epic 5 retrospective (2026-11-10): the retro document artifact joins the
    // census by this file's own written authorization — the same R-series
    // bookkeeping rule the stories used; list-only, tripwire stays armed.
    '_bmad-output/implementation-artifacts/epic-5-retro-2026-11-10.md',
    // Playtest fix 2026-11-10 (ghost-spread): the renderer shortening lands in
    // js/render3d.js (in this set since 4.4); the new suite and the fix artifact
    // join here, authorized by the fix doc — list-only, tripwire stays armed.
    'tests/ghostspread.test.js',
    '_bmad-output/implementation-artifacts/playtest-fix-2026-11-10-ghost-spread.md',
    // Story 6.1 create round (2026-11-10): the story artifact joins the census
    // by this file's own written authorization — the same R-series bookkeeping
    // rule the retro/playtest appends used; list-only, tripwire stays armed.
    '_bmad-output/implementation-artifacts/6-1-policy-bot-summit-gate-the-balance-master-dial.md',
    // Story 6.1 dev round (2026-11-10): the story's own lane joins the census
    // — the harness extension (support file, not a fence), the R1/R2/R3
    // re-contracted balance leg file, and the two NEW files the story creates
    // (the batch-runner support module + its suite; new files go red at
    // CREATE via the porcelain arm). List-only, tripwire stays armed.
    'tests/support/balance-harness.js',
    'tests/support/summit-gate.js',
    'tests/balance.test.js',
    'tests/summitgate.test.js',
    // Story 6.2 dev round (2026-11-10, C1 amendment): the balance-pass lane
    // joins the census — the three product tunables files (game/areas/player),
    // the NEW offer-cadence witness suite, the two R3/R4 re-contracted rig
    // files, and this story's artifact. List-only, tripwire stays armed.
    'js/game.js', 'js/areas.js', 'js/player.js',
    'tests/offercadence.test.js',
    'tests/nearmiss.test.js', 'tests/v1parity.test.js',
    '_bmad-output/implementation-artifacts/6-2-real-tunables-retire-the-placeholders.md',
    // Story 6.3 dev round (2026-11-10, C1): the offer-pacing verdict lane
    // joins the census — this story's artifact and, for the FIRST time in
    // either allow-set, a planning-artifacts path: prd.md, authorized ONLY
    // for the CARD-09 Open-Items row edit this story pins (it pre-authorizes
    // nothing else in planning-artifacts/). List-only, tripwire stays armed.
    '_bmad-output/implementation-artifacts/6-3-offer-pacing-verdict-card-09.md',
    '_bmad-output/planning-artifacts/prd.md',
    // Story 6.4 dev round (2026-11-10, C1): the docs-provenance pass joins
    // the census — this story's artifact plus the three planning docs it
    // rewrites to as-built fact (gdd/epics/architecture; prd.md already listed
    // via 6.3 C1). Authorized ONLY for the G/E/A rows this story pins — it
    // pre-authorizes nothing beyond those rows. List-only, tripwire stays armed.
    '_bmad-output/implementation-artifacts/6-4-docs-provenance-pass.md',
    '_bmad-output/planning-artifacts/epics.md',
    '_bmad-output/planning-artifacts/architecture.md',
    '_bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd.md',
    // Story 6.4 REVIEW-PATCH amendment: gdd-epic-overview.md joins for its
    // one stale period-ladder row (Blind A64-7); authorizes nothing else.
    '_bmad-output/planning-artifacts/gdds/gdd-jumprope-web-2026-10-27/gdd-epic-overview.md',
    // Epic 6 retro bookkeeping (epic-6-retro-2026-11-10.md, Artifact
    // bookkeeping section): list-only, authorizes nothing else.
    '_bmad-output/implementation-artifacts/epic-6-retro-2026-11-10.md',
    // Pre-Epic-7 planning bookkeeping (2026-11-10): tonight's brainstorm
    // session doc, its PRD-update workspace memlog, and the party decision
    // memory join the census — list-only, tripwire stays armed, authorizes
    // nothing else. Session doc + workspace memlog are static after the prep
    // commit; party memory is a living journal path under the same artifact-
    // write rule as sprint-status/deferred-work (loop contract).
    '_bmad-output/brainstorming-session-2026-11-10.md',
    '_bmad-output/planning-artifacts/prds/prd-jumprope-web-2026-11-10/.memlog.md',
    '_bmad-output/party-mode/memories/installed/.memlog.md',
  ]);
  assert.deepEqual(changed.filter(f => !allowed.has(f)), [],
    'anything else touching this tree violates the Story 4.4 frozen list');
});