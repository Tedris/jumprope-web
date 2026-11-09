import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Story 5.4 (FR23): reduced motion for the new states & the WR-02 fix.
//
// Doctrine (same as the 5.3 harness note): js/render3d.js is read as TEXT and
// its two import specifiers rewritten (a REGISTERING three-stub + a file: URL
// for interpolate.js), imported as a data: URL — no relative specifier into
// js/ appears here for the renderer, so the SPECIFIER_RE walk in
// tests/boundary.test.js stays green (ARCH-01). The stub+helpers are the
// tests/render3d.test.js:23-97,134-166,236-274 donor COPIED into this file —
// frozen suites cannot be imported, and renderer-stub forking is the ratified
// per-suite doctrine. The stub is EXTENDED (as iframesjuice's note prescribes
// for its own legs) with Color hex registration and scene/fog recording,
// because L4/L8 read the dim and vista channels; every pose helper
// (rigAndPivot, runningPose) stays verbatim. The bootShell donor is copied
// from tests/iframesjuice.test.js (NFR8 A/B shape, :652) with the matchMedia
// arm PARAMETERIZED so the two boots differ ONLY in the OS flag. The audio
// helpers arrive via a data:-URL-free pathToFileURL dynamic import — audio.js
// is a zero-import leaf, so the boundary graph gains no new node.
//
// Leg kinds (loop contract, honest-red rule): L1-L3 are the WR-02 repro —
// they are RED against the unpatched tree by design; L4-L11 are verify-and-
// pin legs, green on baseline BY DESIGN (they freeze inherited invariants).
// tests/render3d.test.js is byte-identical: its idle/snap/uShake/particle/
// runningPose legs are the inherited premises restated reduced-only here.

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');
const render3dPath = resolve(jsDir, 'render3d.js');
const interpolateHref = pathToFileURL(resolve(jsDir, 'interpolate.js')).href;
const fileHref = name => pathToFileURL(resolve(jsDir, name)).href;
const settle = () => new Promise(r => setTimeout(r, 0));
const STEP = 1 / 120;

let renderBoots = 0;
let shellBoots = 0;
const sourceOf = name => readFile(resolve(jsDir, name), 'utf8');


// Text-derive a shipped `const NAME = <number>` constant (derive-literals
// doctrine) — hex look constants and decimal opacities alike, never re-typed.
async function shippedConst(name) {
  const m = (await sourceOf('render3d.js')).match(new RegExp(`const ${name} = (0x[0-9a-fA-F]+|[\\d.]+)`));
  assert.ok(m, `the shipped look constant ${name} is present in js/render3d.js`);
  return Number(m[1]);
}

// Text-derive the shipped JUICE_TIERS rows (derive-literals doctrine — the
// 5.3 rows are READ from js/shell.js, never re-typed).
async function shippedJuice() {
  const m = (await readFile(resolve(jsDir, 'shell.js'), 'utf8'))
    .match(/export const JUICE_TIERS = \{([\s\S]*?)\n\};/);
  assert.ok(m, 'the JUICE_TIERS literal is present in js/shell.js');
  const rows = {};
  for (const r of m[1].matchAll(/(\w+):\s*\{\s*hitstop:\s*([\d.]+),\s*shake:\s*([\d.]+),\s*particles:\s*(\d+)/g)) {
    rows[r[1]] = { hitstop: Number(r[2]), shake: Number(r[3]), particles: Number(r[4]) };
  }
  assert.ok(rows.chargeUsed && rows.win, 'the chargeUsed + win rows are present to derive from');
  return rows;
}

// ---------------------------------------------------------------------------
// Render-module boot — the registering three-stub (render3d.test.js donor,
// color-recording extension as per the header note).
// ---------------------------------------------------------------------------

const THREE_STUB_HREF = 'data:text/javascript,' + encodeURIComponent([
  'export const NearestFilter = 1003;',
  'globalThis.__rmReg = { scenes: [], meshes: [], materials: [], geometries: [], cameras: [], renderCalls: 0 };',
  'const reg = globalThis.__rmReg;',
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
  'export class WebGLRenderer extends Node { render() { reg.renderCalls += 1; } }',
  'export class Scene extends Node { constructor() { super(); reg.scenes.push(this); } }',
  // Color RECORDS (the render3d.test.js donor is color-blind; the dim/vista
  // legs read hexes): birth keeps the construction value, hex the live one.
  'export class Color {',
  '  constructor(hex = 0) { this.hex = hex; this.birth = hex; }',
  '  set(hex) { this.hex = hex; }',
  '}',
  'export class Vector3 extends Vec3 {',
  '  constructor(x = 0, y = 0, z = 0) { super(); this.x = x; this.y = y; this.z = z; }',
  '}',
  'export class Vector2 {',
  '  constructor(x = 0, y = 0) { this.x = x; this.y = y; }',
  '  set(x, y) { this.x = x; this.y = y; }',
  '}',
  'export class WebGLRenderTarget {',
  '  constructor() { this.texture = {}; }',
  '  setSize() {}',
  '}',
  'export class PerspectiveCamera extends Node { constructor() { super(); reg.cameras.push(this); } }',
  'export class OrthographicCamera extends Node { constructor() { super(); reg.cameras.push(this); } }',
  'export class Group extends Node {}',
  'class Geo extends Node { constructor(args) { super(); this.args = args; reg.geometries.push(this); } }',
  'export class PlaneGeometry extends Geo { constructor(w, h) { super([w, h]); this.w = w; this.h = h; } }',
  'export class BoxGeometry extends Geo { constructor(w, h, d) { super([w, h, d]); this.w = w; this.h = h; this.d = d; } }',
  'export class TubeGeometry extends Geo { constructor(...a) { super(a); } }',
  'export class CatmullRomCurve3 extends Node {}',
  'export class CircleGeometry extends Geo { constructor(...a) { super(a); } }',
  'export class MeshBasicMaterial {',
  // color guarded like the Lambert arm: the option loop must not clobber the
  // recording Color with the raw hex (the vista ropeMat.color.set path).
  '  constructor(o = {}) { this.transparent = false; this.opacity = 1; this.birthHex = o.color; this.color = new Color(o.color);',
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

async function bootRender() {
  const src = await readFile(render3dPath, 'utf8');
  const rewritten = src
    .replace(/from\s*['"]three['"]/, `from '${THREE_STUB_HREF}'`)
    .replace(/from\s*['"][^'"]*interpolate\.js['"]/, `from '${interpolateHref}'`);
  const mod = await import('data:text/javascript,' + encodeURIComponent(`${rewritten}\n//reducedmotion boot ${++renderBoots}`));
  const reg = globalThis.__rmReg;
  for (const k of ['scenes', 'meshes', 'materials', 'geometries', 'cameras']) reg[k].length = 0;
  reg.renderCalls = 0;
  const scene = mod.createScene({ width: 480, height: 640 });
  const world = reg.scenes[0];                     // world builds BEFORE post (frozen elsewhere)
  const tubeMeshes = reg.meshes.filter(m => m.geometry?.constructor.name === 'TubeGeometry');
  return { scene, reg, world, post: reg.scenes[1], tubeMeshes, ropeTube: tubeMeshes[0] };
}

// dampenView donor shape (render3d.test.js:143-154) + the 5.3 run fields.
function rmView(overrides = {}) {
  return {
    run: { status: 'running', area: 1 },
    rope: { phase: 0.5 },
    player: { y: 0 },
    prevPhase: 0.5,
    alpha: 0,
    best: 0,
    now: 0,
    ...overrides,
  };
}

// rigAndPivot + runningPose — verbatim donors (render3d.test.js:241-273; a
// test file cannot import from the frozen suite).
function rigAndPivot(worldScene) {
  const trios = worldScene.children.filter(c => (c.children?.length ?? 0) === 3);
  const rigs = trios.filter(g => g.children.every(c => !c.material));
  const pivots = trios.filter(g => g.children.every(c => c.material));
  assert.strictEqual(rigs.length, 1, 'exactly one rig-shaped Group in the stub world');
  assert.strictEqual(pivots.length, 1, 'exactly one ropePivot-shaped Group in the stub world (a 3-ghost pool would join this set — R2 says four)');
  return { rig: rigs[0], pivot: pivots[0] };
}

function runningPose(worldScene) {
  const { rig, pivot } = rigAndPivot(worldScene);
  const torsoGroup = rig.children[0];
  const shadow = worldScene.children.find(
    c => typeof c.material?.opacity === 'number' && c.material.opacity < 0.45 &&
      Math.abs(c.rotation.x + Math.PI / 2) < 1e-9
  );
  return {
    rigY: rig.position.y,
    rigScale: [rig.scale.x, rig.scale.y, rig.scale.z],
    pivotX: pivot.rotation.x,
    pivotZ: pivot.rotation.z,
    armL: torsoGroup.children[2].rotation.x,
    armR: torsoGroup.children[3].rotation.x,
    legL: rig.children[1].rotation.x,
    legR: rig.children[2].rotation.x,
    shadowScale: shadow ? shadow.scale.x : null,
    shadowOpacity: shadow ? shadow.material.opacity : null,
  };
}

// The whole-rig pose vector (Task 1a): depth-first walk of the rig Group —
// deterministic children order — recording rotation.x per node. Mutation-
// proof and name-free: it COVERS the arms (torsoGroup children 2/3) AND the
// scarf chain (headGroup's 3-link descendants) in one vector, so a future
// per-site refactor cannot silently re-animate one consumer.
function poseVector(rig) {
  const out = [];
  const walk = node => {
    out.push(node.rotation.x);
    for (const child of node.children) walk(child);
  };
  walk(rig);
  return out;
}

// Structural scarf identification for L2's per-consumer proof: headGroup is
// torsoGroup.children[1]; its 5th child is scarf seg 0 (built after head,
// cap, eyeL, eyeR), and each later seg hangs as the seg's 2nd child
// (render3d.js:254-265). The first seg's mesh width (0.24 - 0.05*0) pins
// the identity without a name.
function scarfSegsOf(rig) {
  const headGroup = rig.children[0].children[1];
  assert.equal(headGroup.children[4].children[0].geometry.w, 0.24,
    'the structural scarf probe landed on seg 0 (BoxGeometry width 0.24, render3d.js:259)');
  const segs = [headGroup.children[4]];
  for (let k = 1; k < 3; k++) segs.push(segs[k - 1].children[1]);
  return segs;
}

function ghostGroupOf(world) {
  return world.children.find(g => (g.children?.length ?? 0) === 4
    && g.children.every(c => c.geometry?.constructor.name === 'TubeGeometry'));
}

// ---------------------------------------------------------------------------
// Shell boots — the iframesjuice.test.js bootShell donor with the matchMedia
// arm PARAMETERIZED ({ reduced }) so the L9 A/B differs ONLY in the flag.
// ---------------------------------------------------------------------------

async function bootShell({ reduced = false } = {}) {
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
  globalThis.__rmTestViews = views;

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
  globalThis.document = { getElementById: id => (id === 'game' ? canvas : hud[id]) };
  globalThis.window = {
    addEventListener: (type, fn) => { handlers.window[type] = fn; },
    innerWidth: 480, innerHeight: 640,
    matchMedia: () => ({ matches: reduced, addEventListener() {} })   // the ONE A/B difference
  };
  globalThis.requestAnimationFrame = cb => { frames.push(cb); return frames.length; };
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: () => null, setItem: () => {} }, configurable: true
  });
  const clock = { t: 0 };
  globalThis.performance = { now: () => clock.t };
  console.error = () => {};

  const renderStubHref = 'data:text/javascript,' + encodeURIComponent([
    'export function createScene() {',
    '  return {',
    '    render(view) {',
    '      globalThis.__rmTestViews.push(view);',
    '    }',
    '  };',
    '}'
  ].join('\n'));

  // The run-stamp wrap (ropelossthud donor + the summitapproach forceScore
  // arm — the ascend seed; the stream is patch-driven, no output jacks).
  const script = { n: 0, patches: [], events: [], forceScore: undefined };
  globalThis.__rmScript = script;
  const gameWrapHref = 'data:text/javascript,' + encodeURIComponent([
    `export * from "${fileHref('game.js')}";`,
    'import * as real from "' + fileHref('game.js') + '";',
    'export const tickRun = (...args) => {',
    '  const s = globalThis.__rmScript;',
    '  s.n += 1;',
    '  for (const p of s.patches) {',
    '    if (!p.done && s.n === p.at) { p.done = true; args = [{ ...args[0], ...p.run }, ...args.slice(1)]; }',
    '  }',
    '  let out = real.tickRun(...args);',
    '  s.events.push(...(out.events ?? []));',
    '  if (s.forceScore !== undefined) out = { ...out, run: { ...out.run, score: s.forceScore, altitude: s.forceScore * real.ALT_PER_POINT } };',
    '  return out;',
    '};'
  ].join('\n'));

  const src = (await readFile(resolve(jsDir, 'shell.js'), 'utf8'))
    .replace(/from\s*['"]\.\/render3d\.js['"]/, `from '${renderStubHref}'`)
    .replace(/from\s*['"]\.\/game\.js['"]/, `from '${gameWrapHref}'`)
    .replace(/from\s*['"]\.\/rope\.js['"]/, `from '${fileHref('rope.js')}'`)
    .replace(/from\s*['"]\.\/player\.js['"]/, `from '${fileHref('player.js')}'`)
    .replace(/import\(\s*['"]\.\/audio\.js['"]\s*\)/, `import('${fileHref('audio.js')}')`);

  // Distinct data: URL per boot so the bootstrap guard re-runs.
  const mod = await import('data:text/javascript,' + encodeURIComponent(`${src}\n//reducedmotion boot ${++shellBoots}`));
  await settle();

  const restore = () => {
    globalThis.document = saved.document;
    globalThis.window = saved.window;
    globalThis.requestAnimationFrame = saved.requestAnimationFrame;
    if (saved.localStorage) {
      Object.defineProperty(globalThis, 'localStorage', saved.localStorage);
    } else {
      delete globalThis.localStorage;
    }
    if (saved.performance) {
      Object.defineProperty(globalThis, 'performance', saved.performance);
    } else {
      delete globalThis.performance;
    }
    delete globalThis.__rmTestViews;
    delete globalThis.__rmScript;
    console.error = saved.consoleError;
  };
  return { mod, frames, handlers, hud, views, script, clock, restore };
}

function press(env) {
  env.handlers.window.keydown({ code: 'Space', repeat: false, preventDefault() {} });
}

function pump(env, ms = 4) {
  env.clock.t += ms;
  env.frames.at(-1)(env.clock.t);
}

// ---------------------------------------------------------------------------
// Part A — WR-02: the idle beat (Task 1a, AC3). L1/L3 are the honest-red
// repro legs (RED on the unpatched tree); L2 is the gate proof.
// ---------------------------------------------------------------------------

test('L1 WR-02 repro: the whole-rig idle pose vector is static across view.now advances under reducedMotion (arms AND scarf hold the zero-clock pose)', async () => {
  const env = await bootRender();
  const { rig } = rigAndPivot(env.world);
  const scarf = scarfSegsOf(rig);
  assert.ok(scarf.length === 3, 'the pose-vector rig genuinely spans the scarf chain (Task 1a coverage)');

  env.scene.render(rmView({ run: { status: 'idle' }, now: 1000, reducedMotion: true }));
  const first = poseVector(rig);
  env.scene.render(rmView({ run: { status: 'idle' }, now: 1400, reducedMotion: true }));
  // Nothing here asserts pivot/bob — the inherited render3d.test.js:281-287
  // legs own those channels; THIS vector owns every rotation.x INSIDE the rig,
  // i.e. exactly the WR-02 consumers (arms :568-569, scarf loop :613-615).
  assert.deepStrictEqual(poseVector(rig), first,
    'WR-02 (epics.md:101): the reduced idle pose must not move ANY rig rotation.x off wall-clock beat — a future per-site refactor that re-animates one consumer reddens here');
});

test('L2 gate proof: the SAME idle frames under full motion DO animate the arms and the scarf (the stillness is the branch, not dead code)', async () => {
  const env = await bootRender();
  const { rig } = rigAndPivot(env.world);
  const torso = rig.children[0];
  const scarf = scarfSegsOf(rig);

  env.scene.render(rmView({ run: { status: 'idle' }, now: 1000 }));
  const arm0 = [torso.children[2].rotation.x, torso.children[3].rotation.x];
  const scarf0 = scarf.map(s => s.rotation.x);
  env.scene.render(rmView({ run: { status: 'idle' }, now: 1400 }));
  const arm1 = [torso.children[2].rotation.x, torso.children[3].rotation.x];
  const scarf1 = scarf.map(s => s.rotation.x);

  assert.notStrictEqual(arm1[0], arm0[0], 'the LEFT arm strictly differs between now=1000 and now=1400 under full motion');
  assert.notStrictEqual(arm1[1], arm0[1], 'the RIGHT arm strictly differs (both arms are beat consumers)');
  assert.ok(scarf1.some((x, k) => x !== scarf0[k]),
    'at least one scarf node strictly differs — the out-of-branch scarf loop is a LIVE beat consumer under full motion');
});

test('L3 still-endpoint law (D5): the reduced idle pose EQUALS the full-motion idle pose rendered at now = 0 (beat gates to zero-clock)', async () => {
  const red = await bootRender();
  red.scene.render(rmView({ run: { status: 'idle' }, now: 99999, reducedMotion: true }));
  const reducedPose = poseVector(rigAndPivot(red.world).rig);

  const full = await bootRender();
  full.scene.render(rmView({ run: { status: 'idle' }, now: 0 }));
  const zeroPose = poseVector(rigAndPivot(full.world).rig);

  // L1 survives a STATIC wall-clock phase (a mutant clocking to a constant
  // angle is still); this cross-render identity does not: it pins the exact
  // zero-clock pose — arms sin(0) = 0, scarf the fixed drape sin(-k*0.4)*0.5.
  assert.deepStrictEqual(reducedPose, zeroPose,
    'the reduced pose IS the zero-clock pose (gate ⇒ beat = 0 ⇒ every consumer reads the now = 0 render), Decision D5');
});

// ---------------------------------------------------------------------------
// Part B — the Epic-5 states under reduced motion (Task 1b, AC1/AC2):
// verify-and-pin legs L4-L9, GREEN on baseline by design (D2: ghosts stay
// VISIBLE — never hidden, never wall-clock).
// ---------------------------------------------------------------------------

test('L4 blank-on statics restated reduced-only: {ropes:3, iFrames:2} at now=1000 vs now=9500 renders byte-equal cosmetics under reducedMotion, equal to the full-motion blank read (5.3 :502 law)', async () => {
  const ROSE = await shippedConst('ROSE');
  const FLOOR = await shippedConst('FLOOR');
  const DIM = await shippedConst('GHOST_DIM');
  const BLANK_OP = await shippedConst('GHOST_OPACITY_BLANK');
  const snap = async (t, reduced) => {
    const env = await bootRender();
    env.scene.render(rmView({ run: { status: 'running', area: 1, ropes: 3, iFrames: 2 }, now: t, ...(reduced ? { reducedMotion: true } : {}) }));
    const ghostGroup = ghostGroupOf(env.world);
    const roseMat = env.reg.materials.find(m => m.birthHex === ROSE && m.customProgramCacheKey);
    const limbMat = env.reg.materials.find(m => m.birthHex === FLOOR && m.customProgramCacheKey && m !== env.world.children[0].material);
    return { rose: roseMat.color.hex, limb: limbMat.color.hex, ghost: ghostGroup.children[0].material.opacity };
  };
  const a = await snap(1000, true);
  const b = await snap(9500, true);
  const c = await snap(1000, false);
  assert.deepEqual(b, a, 'the reduced blank read is STATIC across a view.now jump (zero clock term — a view.now-parity mutation would redden here)');
  assert.deepEqual(c, a, 'and byte-equal to the full-motion blank read — the pair is a state channel, not a cosmetic clock');
  // Liveness: the blank genuinely lit (a dim-read the boots never took would
  // make all three snapshots trivially equal).
  assert.equal(a.rose, DIM, 'roseMat is dimmed to the shipped GHOST_DIM — the read actually fired');
  assert.equal(a.limb, DIM, 'limbMat is dimmed too (the two-material pair)');
  assert.equal(a.ghost, BLANK_OP, 'the ghosts lifted to the shipped visible-through opacity');
});

test('L5 ghosts under reducedMotion (D2): per-slot visibility and opacity IDENTICAL to full motion, sweep === pivot on BOTH scenes — visible-and-dim, never hidden, never wall-clock', async () => {
  const DIM_OP = await shippedConst('GHOST_OPACITY');
  const view = reduced => rmView({
    run: { status: 'running', area: 1, ropes: 3 },
    rope: { phase: 0.5 }, prevPhase: 0.5, now: 1000,
    ...(reduced ? { reducedMotion: true } : {})
  });
  const a = await bootRender();   // reduced
  const b = await bootRender();   // full motion, same scripted view
  a.scene.render(view(true));
  b.scene.render(view(false));
  const gA = ghostGroupOf(a.world);
  const gB = ghostGroupOf(b.world);

  // D2 guard (kills M5): a reduced-branch hide would zero A's vector while
  // B keeps the ropes-1 pattern — deepStrictEqual reddens.
  assert.deepEqual(gA.children.map(g => g.visible), gB.children.map(g => g.visible),
    'the per-slot visibility vector is IDENTICAL under both flags (D2: hiding deletes state — FR23 damps cosmetics, not state)');
  assert.deepEqual(gA.children.map(g => g.visible), [true, true, false, false],
    'ropes 3 keeps TWO held extras visible under reducedMotion — visible is the decided behavior, not a gap');
  assert.deepEqual(gA.children.map(g => g.rotation.x), gB.children.map(g => g.rotation.x),
    'the FR3 phase-offset vector is identical under both flags');
  assert.equal(gA.children[0].material.opacity, gB.children[0].material.opacity, 'the shared ghostMat opacity is identical (0.35 outside a blank)');
  assert.equal(gA.children[0].material.opacity, DIM_OP, 'and it is the shipped dim value');
  // The sweep is the CANONICAL rope clock in both scenes (no wall-clock term
  // to damp): sibling of the pivot write, on BOTH flags.
  assert.equal(gA.rotation.x, rigAndPivot(a.world).pivot.rotation.x, 'reduced scene: ghostGroup.rotation.x === ropePivot.rotation.x (one clock)');
  assert.equal(gB.rotation.x, rigAndPivot(b.world).pivot.rotation.x, 'full scene: same law');
  assert.equal(gA.rotation.x, gB.rotation.x, 'and the two scenes sweep to the SAME angle — byte-identical judgment channel');
  assert.deepEqual(runningPose(a.world), runningPose(b.world),
    'the whole judgment-relevant pose stays byte-identical with the ghosts LIVE (the inherited :313-351 proof extended to the 5.3 channels)');
});

test('L5b the blank OFF-edge restores construction values under BOTH flags: a reduced ON→OFF pair lands opacity and both body hexes byte-identical to the full-motion pair (kills the damp-on-restore mutant)', async () => {
  const ROSE = await shippedConst('ROSE');
  const FLOOR = await shippedConst('FLOOR');
  const DIM_OP = await shippedConst('GHOST_OPACITY');
  const BLANK_OP = await shippedConst('GHOST_OPACITY_BLANK');
  const cycle = async (reduced) => {
    const env = await bootRender();
    const view = (t, iF) => rmView({ run: { status: 'running', area: 1, ropes: 3, iFrames: iF }, now: t, ...(reduced ? { reducedMotion: true } : {}) });
    env.scene.render(view(1000, 2));                                     // blank ON edge
    const onGhost = ghostGroupOf(env.world).children[0].material.opacity;
    env.scene.render(view(9000, 0));                                     // blank OFF edge — the restore
    const roseMat = env.reg.materials.find(m => m.birthHex === ROSE && m.customProgramCacheKey);
    const limbMat = env.reg.materials.find(m => m.birthHex === FLOOR && m.customProgramCacheKey && m !== env.world.children[0].material);
    return { onGhost, offGhost: ghostGroupOf(env.world).children[0].material.opacity, rose: roseMat.color.hex, limb: limbMat.color.hex };
  };
  const full = await cycle(false);
  const reduced = await cycle(true);
  assert.equal(full.onGhost, BLANK_OP, 'liveness (full): the ON edge lifted the ghosts (a dead blank channel would flatten the cycle)');
  assert.equal(full.offGhost, DIM_OP, 'liveness (full): the OFF edge restored the shipped dim');
  assert.deepEqual(reduced, full, 'the WHOLE ON→OFF restore pair — opacity and both body-material hexes — is byte-identical under reducedMotion (FR23 damps clocks, never a restore value; the OFF-branch else arm has no reduced term)');
  assert.equal(reduced.offGhost, DIM_OP, 'the reduced OFF-edge restore is the construction dim, not any dampened variant');
  assert.equal(reduced.rose, ROSE, 'roseMat restored to its construction hex under reducedMotion');
  assert.equal(reduced.limb, FLOOR, 'limbMat restored to its construction hex under reducedMotion');
});

test('L6 per-event shake for the 5.3 rows: chargeUsed + win seeds hold uShake at the exact still vector under reducedMotion at every sample; the same seed jitters under full motion (gate proof)', async () => {
  const rows = await shippedJuice();          // derive-literals: shake/particles READ from js/shell.js
  for (const row of ['chargeUsed', 'win']) {
    const seed = rows[row];
    const env = await bootRender();
    const uShake = env.post.children[0].material.uniforms.uShake;
    assert.ok(uShake, 'the post quad keeps its uniforms through the ShaderMaterial stub');
    for (const t of [1000, 1030, 1139]) {
      env.scene.render(rmView({ now: t, reducedMotion: true, juice: { at: 1000, shake: seed.shake, particles: seed.particles } }));
      // + 0 normalizes -0 (the donor law): zero amplitude through a negative
      // sin term must read the still vector, sign aside.
      assert.strictEqual(uShake.value.x + 0, 0, `${row}: uShake.x is the still vector at now=${t} — shake zeroed at the single juiceShake source`);
      assert.strictEqual(uShake.value.y + 0, 0, `${row}: uShake.y is the still vector at now=${t}`);
    }
    const fresh = await bootRender();
    const ref = fresh.post.children[0].material.uniforms.uShake;
    fresh.scene.render(rmView({ now: 1000, juice: { at: 1000, shake: seed.shake, particles: seed.particles } }));
    fresh.scene.render(rmView({ now: 1030 }));
    assert.notStrictEqual(ref.value.x, 0, `${row}: the SAME seed jitters under full motion at now=1030 — the stillness is the reduced branch, not a dead row`);
  }
});

test('L7 particle rows on the 5.3 seeds: spawn, opacity ramp and lifetime stay LIVE under reducedMotion while the flight positions hold (events stay; min(particles, PARTICLE_POOL))', async () => {
  const rows = await shippedJuice();
  const pool = Number((await sourceOf('render3d.js')).match(/const PARTICLE_POOL = (\d+)/)[1]);
  for (const row of ['chargeUsed', 'win']) {
    const seed = rows[row];
    const env = await bootRender();
    env.scene.render(rmView({ now: 1000, reducedMotion: true, juice: { at: 1000, shake: seed.shake, particles: seed.particles } }));
    const group = env.world.children.find(g => (g.children?.length ?? 0) === pool);
    assert.ok(group, `the pooled ${pool}-quad particle group is reachable via Group.add`);
    const live = group.children.filter(p => p.visible);
    const expected = Math.min(seed.particles, pool);
    assert.strictEqual(live.length, expected, `${row}: exactly min(${seed.particles}, ${pool}) quads spawn under reduced motion — the burst STILL spawns`);
    const spawn = live.map(p => [p.position.x, p.position.y, p.position.z]);
    const ramp = [group.children[0].material.opacity];
    for (const t of [1030, 1139]) {
      env.scene.render(rmView({ now: t, reducedMotion: true, juice: { at: 1000, shake: seed.shake, particles: seed.particles } }));
      live.forEach((p, i) => {
        assert.deepStrictEqual([p.position.x, p.position.y, p.position.z], spawn[i], `${row}: flight positions pinned at now=${t} (MINIMAL: motion term zeroed, state kept)`);
      });
      ramp.push(group.children[0].material.opacity);
    }
    assert.ok(ramp[1] < ramp[0] && ramp[2] < ramp[1], 'the opacity ramp keeps running across the samples (the fade is state, not motion)');
    assert.ok(ramp[2] > 0, 'the 0.45 s lifetime is untouched mid-flight (still live at +139 ms)');
  }
});

test('L8 ascent palette under reducedMotion: after the area 1->2 flip, three now-samples render identical sky/fog/floor/rope hexes and slab visibility, equal to the flip frame (no eased-in)', async () => {
  const src = await sourceOf('render3d.js');
  const block = src.match(/const VISTAS = \[([\s\S]*?)\n\];/);
  assert.ok(block, 'the VISTAS literal is present to derive the tier-2 hexes from');
  // Tier 1 references the SKY/FLOOR/PALE constants BY NAME (VISTAS comment:
  // "preserved structurally, never as re-typed hex") — the parse RESOLVES
  // names through shippedConst so the row index keeps aligning with `area`.
  const numTok = async t => (/^0x/.test(t) ? Number(t) : shippedConst(t));
  const rows = await Promise.all([...block[1].matchAll(/\{\s*sky:\s*(0x[0-9a-fA-F]+|\w+),\s*floor:\s*(0x[0-9a-fA-F]+|\w+),[^}]*?rope:\s*(0x[0-9a-fA-F]+|\w+)/g)]
    .map(async m => ({ sky: await numTok(m[1]), floor: await numTok(m[2]), rope: await numTok(m[3]) })));
  assert.equal(rows.length, 5, 'VISTAS parses to EXACTLY the five tiers (row index === area index)');

  const env = await bootRender();
  const flipSnap = () => ({
    bg: env.world.background.hex,
    fog: env.world.fog.color.hex,
    floor: env.world.children[0].material.color.hex,
    rope: env.ropeTube.material.color.hex,
    slabs: env.reg.meshes.map(m => m.visible),
  });
  const at = t => { env.scene.render(rmView({ run: { status: 'running', area: 2, ropes: 1 }, now: t, reducedMotion: true })); return flipSnap(); };
  env.scene.render(rmView({ run: { status: 'running', area: 1, ropes: 1 }, now: 1000, reducedMotion: true }));
  const alley = flipSnap();
  const s1 = at(5000);    // the flip frame
  const s2 = at(5040);
  const s3 = at(9500);
  assert.deepEqual(s2, s1, 'area-2 cosmetics are frame-identical 40 ms after the flip — no eased-in under reducedMotion');
  assert.deepEqual(s3, s1, 'and 4.5 s after — the flip is an instant per-area write ("No tween, no timer", 4.3)');
  // the D-06 pair: fog color is the sky color — both channels read VISTAS[1].sky
  for (const [k, s] of [['bg', s1.bg], ['fog', s1.fog], ['floor', s1.floor], ['rope', s1.rope]]) {
    assert.equal(s, rows[1][k === 'bg' || k === 'fog' ? 'sky' : k], `the flipped ${k} matches the derived VISTAS[1] value — the census read the real channel`);
  }
  assert.notEqual(s1.rope, alley.rope, 'the alley and rooftops rope hexes genuinely differ (the flip was live, not vacuous)');
});

test('L9 sim purity + boot A/B (FR23): reducedMotion reaches ONLY shell+render3d, and one scripted ascend+charge+trip stream boots byte-identical across the flag', async () => {
  // Source census first — the flag must be invisible to the sim.
  const files = (await readdir(jsDir)).filter(f => f.endsWith('.js')).sort();
  const hits = {};
  for (const f of files) {
    const src = await readFile(resolve(jsDir, f), 'utf8');
    const n = (src.match(/reducedMotion/g) ?? []).length;
    if (n) hits[f] = n;
  }
  assert.deepEqual(Object.keys(hits).sort(), ['render3d.js', 'shell.js'],
    `reducedMotion appears ONLY in shell.js + render3d.js across js/ — got ${JSON.stringify(hits)}`);
  for (const f of ['game.js', 'rope.js', 'player.js', 'interpolate.js', 'audio.js']) {
    assert.ok(!(f in hits), `the sim module ${f} never even sees the flag (judgment cannot fork on it)`);
  }

  // ONE scripted stream, identical on both boots: forceScore seeds the
  // area-1 ceiling crossing (ascend), the tick-5 stamp makes a 3-rope
  // charged run (chargeUsed at the first feet pass, then the 3->2->1
  // cascade into the trip). >400 ticks.
  // game.js via file URL (the direct-import precedent, data-URL style — no
  // literal js/ specifier in this file, boundary graph unchanged).
  const game = await import(fileHref('game.js'));
  const record = async reduced => {
    const env = await bootShell({ reduced });
    try {
      env.script.forceScore = (game.AREAS[0].ceiling + 5) / game.ALT_PER_POINT;   // between ceilings: EXACTLY one ascend
      env.script.patches.push({ at: 5, run: { ropes: 3, charged: 1 } });
      press(env);
      pump(env);
      const phases = [];
      const records = [];
      let F = -1;
      for (let g = 0; g < 3000; g++) {
        pump(env);
        const v = env.views.at(-1);
        if (F < 0 && env.script.events.includes('trip')) F = phases.length;
        phases.push(v.rope.phase);
        records.push({
          status: v.run.status, score: v.run.score, altitude: v.run.altitude,
          ropes: v.run.ropes, area: v.run.area, iFrames: v.run.iFrames, charged: v.run.charged,
        });
        if (F >= 0 && phases.length >= F + 45) break;
      }
      assert.notEqual(F, -1, 'the scripted cascade never reached the trip tick (harness premise, not a flag effect)');
      return { phases, records, n: env.script.n, events: env.script.events.slice(), flagSeen: env.views.every(v => !!v.reducedMotion === reduced) };
    } finally { env.restore(); }
  };
  const reduced = await record(true);
  const full = await record(false);
  assert.ok(reduced.flagSeen && full.flagSeen, 'the boot views genuinely carried the flag (true/reduced vs false/full) — the A/B is not vacuous');
  for (const e of ['ascend', 'chargeUsed', 'trip']) {
    assert.ok(reduced.events.includes(e) && full.events.includes(e), `the scripted stream fired ${e} in BOTH boots: ${reduced.events}`);
  }
  assert.ok(reduced.n >= 400 && full.n >= 400, `the stream ran ${reduced.n} sim ticks (>= 400) on both boots`);
  assert.equal(reduced.n, full.n, 'conserved sim tick count — the freeze/skip schedule is flag-independent');
  assert.deepEqual(reduced.phases, full.phases, 'phase trace byte-identical across the flag (FR23: judgment + phase timing stay)');
  assert.deepEqual(reduced.records, full.records, 'run-record trace (status/score/altitude/ropes/area/iFrames/charged) byte-identical across the flag');
});

// ---------------------------------------------------------------------------
// Part C — AC2 laws (Task 1c): the flag is never persisted; snapGridFor is
// the sole snap-grid authority.
// ---------------------------------------------------------------------------

test('L10 the reduced-motion flag is NEVER persisted: two setItem sites in js/, the audio key shape {muted,volume} closed, motion keys dropped by construction, the matchMedia block storage-free', async () => {
  // (a) Persistence-surface census: there is no third channel to leak into.
  const files = (await readdir(jsDir)).filter(f => f.endsWith('.js')).sort();
  const sites = [];
  for (const f of files) {
    const src = await readFile(resolve(jsDir, f), 'utf8');
    for (let i = (src.match(/setItem\(/g) ?? []).length; i > 0; i--) sites.push(f);
  }
  assert.deepEqual(sites.sort(), ['audio.js', 'game.js'],
    `setItem( appears EXACTLY twice across js/ (audio.js jumprope-audio + game.js jumprope-best) — got ${sites}`);

  // (b) The audio settings seam: save writes ONLY {muted, volume}; load
  // drops unknown keys. audio.js is a zero-import leaf — dynamic file-URL
  // import, no specifier into js/ in this file (boundary graph unchanged).
  const audio = await import(fileHref('audio.js'));
  const store = {
    data: {},
    getItem(k) { return Object.hasOwn(this.data, k) ? this.data[k] : null; },
    setItem(k, v) { this.data[k] = v; },
  };
  audio.saveSettings(store, { muted: true, volume: 0.5, reducedMotion: true, prefersReducedMotion: false });
  assert.deepEqual(Object.keys(store.data), ['jumprope-audio'], 'saveSettings touches exactly ONE storage key');
  const written = JSON.parse(store.data['jumprope-audio']);
  assert.deepEqual(Object.keys(written).sort(), ['muted', 'volume'],
    'the persisted key set is EXACTLY {muted, volume} — a third (motion) key would redden here (kills M6)');
  assert.deepEqual(audio.loadSettings({ getItem: () => JSON.stringify({ muted: true, volume: 0.5, reducedMotion: true, prefersReducedMotion: true }) }),
    { muted: true, volume: 0.5 },
    'loadSettings on a crafted motion-keyed blob returns EXACTLY the audio pair — motion keys dropped by construction');

  // (c) The shell read block: matchMedia once in js/, zero storage calls in
  // the boot block that holds it ("no polling, no persistence, no in-game
  // override", shell.js:164-173).
  const shell = await sourceOf('shell.js');
  const literal = /'\(prefers-reduced-motion: reduce\)'/;
  let total = 0;
  for (const f of files) {
    total += ((await readFile(resolve(jsDir, f), 'utf8')).match(new RegExp(literal.source, 'g')) ?? []).length;
  }
  assert.equal(total, 1, "the '(prefers-reduced-motion: reduce)' literal occurs EXACTLY once in js/ (shell.js boot read)");
  const from = shell.indexOf('const motionQ');
  const to = shell.indexOf('let last = performance.now');
  assert.ok(from > 0 && to > from, 'the boot read block is locatable between the matchMedia read and the clock');
  assert.ok(!/setItem|getItem|localStorage|storage\./.test(shell.slice(from, to)),
    'the motion-read block contains ZERO storage calls — the flag has no persistence path');
});

test('L11 snapGridFor is the SOLE snap-grid authority: 4 occurrences, all in render3d.js, both uniform writes spread through it, SNAP_ literals defined once and never written raw', async () => {
  const files = (await readdir(jsDir)).filter(f => f.endsWith('.js')).sort();
  let total = 0;
  for (const f of files) {
    const src = await readFile(resolve(jsDir, f), 'utf8');
    const n = (src.match(/snapGridFor\(/g) ?? []).length;
    if (f !== 'render3d.js') assert.equal(n, 0, `${f} must not reference snapGridFor — the singleton lives ONLY in render3d.js`);
    total += n;
  }
  assert.equal(total, 4, 'snapGridFor( occurs EXACTLY 4x (1 definition + 3 call sites), all inside render3d.js — no second snap-grid authority (kills M7)');

  const src = await sourceOf('render3d.js');
  const writeLines = src.split('\n').filter(l => l.includes('uSnapGrid.value.set('));
  assert.equal(writeLines.length, 2, 'the uSnapGrid uniform has exactly two .value.set write sites (applyBufferSize + render flag edge)');
  for (const l of writeLines) {
    assert.ok(l.includes('...snapGridFor('), `every uSnapGrid write routes through the snapGridFor spread — raw write: ${l.trim()}`);
    assert.ok(!/SNAP_/.test(l), 'no uniform write carries a raw SNAP_ literal');
  }
  for (const f of files) {
    if (f === 'render3d.js') continue;
    const other = await readFile(resolve(jsDir, f), 'utf8');
    assert.ok(!/SNAP_/.test(other), `SNAP_S/SNAP_OFF are defined ONLY in render3d.js (${f} clean)`);
  }
});
