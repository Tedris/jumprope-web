import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as game from '../js/game.js';

// Story 5.3 (FR3/FR16/NFR8/NFR1): i-frame & trip juice — held-rope ghosts +
// the state-derived blank read + the chargeUsed/win JUICE rows.
//
// Doctrine (same as the frozen suites): js/render3d.js is read as TEXT and its
// two import specifiers rewritten (a REGISTERING three-stub + a file: URL for
// interpolate.js), imported as a data: URL — no relative specifier into js/
// appears here for the renderer, so the SPECIFIER_RE walk in
// tests/boundary.test.js stays green (ARCH-01). The registering stub is the
// tests/juice.test.js:273-328 __juiceReg pattern COPIED into this file (the
// frozen suites cannot be imported) and EXTENDED as the story's harness note
// prescribes: real Group children, Mesh/Tube/Plane/Box/Circle registration,
// Color hex recording, scene registration, and a render-call counter — so the
// ghost pool, the dim reads, the trio fingerprints and the pass census are all
// machine-inspectable. Booted legs copy the tests/juice.test.js bootShell
// donor and the tests/ropelossthud.test.js tickRun run-stamp donor (input
// patches; the one documented output stamp injects the callout-channel event);
// crafted views follow the tests/areavistas.test.js vistaView donor shape.
// The direct '../js/game.js' import is precedented (ropelossthud :5,
// summitapproach :9) — the boundary graph gains no new node.

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

// Text-derive a shipped `const NAME = 0x...` look constant (derive-literals
// doctrine, donor tests/ceilingbreak.test.js:48-53) — never re-typed hex.
async function shippedConst(name) {
  const m = (await sourceOf('render3d.js')).match(new RegExp(`const ${name} = (0x[0-9a-fA-F]+)`));
  assert.ok(m, `the shipped look constant ${name} is present in js/render3d.js`);
  return Number(m[1]);
}

// ---------------------------------------------------------------------------
// Render-module boot — the registering three-stub (Story 5.3 harness note:
// __juiceReg copied from juice.test.js:273-328, Group children made real,
// geometries/materials/cameras/scenes registered, render() counted).
// ---------------------------------------------------------------------------

const THREE_IFR_STUB_HREF = 'data:text/javascript,' + encodeURIComponent([
  'export const NearestFilter = 1003;',
  'globalThis.__ifrReg = { scenes: [], meshes: [], materials: [], geometries: [], cameras: [], renderCalls: 0 };',
  'const reg = globalThis.__ifrReg;',
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
  // Color RECORDS (the juice donor is color-blind; the dim leg reads hexes):
  // birth keeps the construction value, hex the live one.
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
  '  constructor(o = {}) { this.transparent = false; this.opacity = 1; this.birthHex = o.color; this.color = new Color(o.color);',
  '    for (const k in o) this[k] = o[k]; reg.materials.push(this); }',
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
    .replace(/from\s*['"]three['"]/, `from '${THREE_IFR_STUB_HREF}'`)
    .replace(/from\s*['"][^'"]*interpolate\.js['"]/, `from '${interpolateHref}'`);
  const mod = await import('data:text/javascript,' + encodeURIComponent(`${rewritten}\n//iframes boot ${++renderBoots}`));
  const reg = globalThis.__ifrReg;
  for (const k of ['scenes', 'meshes', 'materials', 'geometries', 'cameras']) reg[k].length = 0;
  reg.renderCalls = 0;
  const scene = mod.createScene({ width: 480, height: 640 });
  const world = reg.scenes[0];                     // world builds BEFORE post (frozen elsewhere)
  const tubeMeshes = reg.meshes.filter(m => m.geometry?.constructor.name === 'TubeGeometry');
  return { scene, reg, world, tubeMeshes, ropeTube: tubeMeshes[0], ghosts: tubeMeshes.slice(1) };
}

// Crafted views — the vistaView donor shape (tests/areavistas.test.js:132-142)
// plus the two 5.3 state fields; run extras merge into the donor run shape.
function ifrView(runExtras = {}, extras = {}) {
  return {
    run: { status: 'running', area: 1, ...runExtras },
    rope: { phase: 0.5 },
    player: { y: 0 },
    prevPhase: 0.5,
    alpha: 0,
    now: 0,
    ...extras
  };
}

function ghostGroupOf(world) {
  return world.children.find(g => (g.children?.length ?? 0) === 4
    && g.children.every(c => c.geometry?.constructor.name === 'TubeGeometry'));
}

// The rigAndPivot probe, mirrored locally (render3d.test.js:241-248 verbatim
// shape — a test file cannot import from the frozen suites).
function rigAndPivot(worldScene) {
  const trios = worldScene.children.filter(c => (c.children?.length ?? 0) === 3);
  const rigs = trios.filter(g => g.children.every(c => !c.material));
  const pivots = trios.filter(g => g.children.every(c => c.material));
  assert.strictEqual(rigs.length, 1, 'exactly one rig-shaped Group in the stub world');
  assert.strictEqual(pivots.length, 1, 'exactly one ropePivot-shaped Group in the stub world (a 3-ghost pool would join this set — R2 says four)');
  return { rig: rigs[0], pivot: pivots[0] };
}

// Cosmetic-channel snapshot across everything this story may touch.
function cosmeticSnap(env) {
  const ghostGroup = ghostGroupOf(env.world);
  return {
    hexes: env.reg.materials.map(m => (m.color ? m.color.hex : null)),
    opacities: env.reg.materials.map(m => (typeof m.opacity === 'number' ? m.opacity : null)),
    ghostsVisible: ghostGroup ? ghostGroup.children.map(g => g.visible) : null,
    ghostPhases: ghostGroup ? ghostGroup.children.map(g => g.rotation.x) : null,
    ghostGroupX: ghostGroup ? ghostGroup.rotation.x : null,
    pivotX: rigAndPivot(env.world).pivot.rotation.x,
  };
}

// ---------------------------------------------------------------------------
// Shell boots — juice.test.js bootShell donor (4-key hud map, render stub) and
// the ropelossthud tickRun run-stamp donor (input patches { at, run }); ONE
// documented output arm injects the callout-channel event on the trip tick
// (the ceilingbreak/summitapproach output-stamp idiom, see leg 13's note).
// ---------------------------------------------------------------------------

async function bootShell() {
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
  globalThis.__ifrsTestViews = views;

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
    matchMedia: () => ({ matches: false, addEventListener() {} })
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
    '      globalThis.__ifrsTestViews.push(view);',
    '    }',
    '  };',
    '}'
  ].join('\n'));

  // The run-stamp wrap (ropelossthud DELTA 2 donor + the ceilingbreak
  // forceScore / summitapproach forceArea arms + the leg-13 callout arm).
  const script = { n: 0, patches: [], events: [], forceArea: null, forceScore: undefined, calloutTrip: false };
  globalThis.__ifrsScript = script;
  const gameWrapHref = 'data:text/javascript,' + encodeURIComponent([
    `export * from "${fileHref('game.js')}";`,
    'import * as real from "' + fileHref('game.js') + '";',
    'export const tickRun = (...args) => {',
    '  const s = globalThis.__ifrsScript;',
    '  s.n += 1;',
    '  for (const p of s.patches) {',
    '    if (!p.done && s.n === p.at) { p.done = true; args = [{ ...args[0], ...p.run }, ...args.slice(1)]; }',
    '  }',
    '  let a = args;',
    '  if (s.forceArea !== null) a = [{ ...a[0], area: s.forceArea }, ...a.slice(1)];',
    '  let out = real.tickRun(...a);',
    '  s.events.push(...(out.events ?? []));',
    '  if (s.forceScore !== undefined) out = { ...out, run: { ...out.run, score: s.forceScore, altitude: s.forceScore * real.ALT_PER_POINT } };',
    '  if (s.calloutTrip && (out.events ?? []).includes("trip")) {',
    '    out = { ...out, run: { ...out.run, streak: 4 }, events: [...out.events, "nearMiss"] };',
    '    s.events.push("nearMiss");',
    '  }',
    '  return out;',
    '};'
  ].join('\n'));

  const src = (await readFile(resolve(jsDir, 'shell.js'), 'utf8'))
    .replace(/from\s*['"]\.\/render3d\.js['"]/, `from '${renderStubHref}'`)
    .replace(/from\s*['"]\.\/game\.js['"]/, `from '${gameWrapHref}'`)
    .replace(/from\s*['"]\.\/rope\.js['"]/, `from '${fileHref('rope.js')}'`)
    .replace(/from\s*['"]\.\/player\.js['"]/, `from '${fileHref('player.js')}'`)
    .replace(/import\(\s*['"]\.\/audio\.js['"]\s*\)/, `import('${fileHref('audio.js')}')`);

  // Distinct data: URL per boot so the bootstrap guard re-runs AND
  // JUICE_TIERS is per-boot-mutable (juice.test.js:85-87 idiom).
  const mod = await import('data:text/javascript,' + encodeURIComponent(`${src}\n//iframesjuice boot ${++shellBoots}`));
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
    delete globalThis.__ifrsTestViews;
    delete globalThis.__ifrsScript;
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

// Unwrapped per-frame phase deltas (juice.test.js:113-116 verbatim idiom).
function deltas(phases) {
  return phases.map((p, i) => i === 0 ? 0 : (p - phases[i - 1] + 1.5) % 1 - 0.5);
}

// ---------------------------------------------------------------------------
// Part A — the ghost pool (Task 1a, AC3 mechanism)
// ---------------------------------------------------------------------------

test('ghost pool census: boot registers 1 rope + 4 ghosts in ONE 4-children Group, never a trio, never the pivot (AC3, R2 law)', async () => {
  const env = await bootRender();
  assert.equal(env.tubeMeshes.length, 5,
    'exactly one rope + exactly four ghosts — the MAX_ROPES − 1 pool (js/game.js:25); the areavistas tube census R2 keys on this');
  assert.ok(env.ropeTube, 'the rope is the FIRST-registered tube mesh (construction order pins rope-before-ghosts)');
  assert.ok(env.ghosts.length === 4 && env.ghosts.every(g => env.reg.meshes.indexOf(g) > env.reg.meshes.indexOf(env.ropeTube)),
    'every ghost registers AFTER the rope in reg.meshes — the identity census stays keyed to the rope');
  const ghostGroup = ghostGroupOf(env.world);
  assert.ok(ghostGroup, 'the ghosts live in ONE Group at the scene root');
  assert.equal(ghostGroup.children.length, 4, 'children 4, never 3 — a material trio would collide with the ropePivot fingerprint (render3d.test.js:242-246)');
  assert.ok(ghostGroup.children.every(g => g.visible === false), 'the pool is hidden at boot (built once, visibility is the only on-edge)');
  assert.equal(new Set(ghostGroup.children.map(g => g.material)).size, 1, 'ONE shared ghost material');
  assert.ok(ghostGroup.children.every(g => g.geometry === env.ropeTube.geometry), 'ghosts SHARE the rope geometry — zero new geometry (NFR1/NFR10)');
  assert.ok(!ghostGroup.children.every(c => c.geometry?.constructor.name === 'BoxGeometry'), 'the ghost group is not slab-shaped (horizon census)');
  const { pivot } = rigAndPivot(env.world);
  assert.equal(pivot.children.length, 3, 'ropePivot keeps exactly [tube, handleL, handleR]');
  assert.ok(ghostGroup.children.every(g => !pivot.children.includes(g)), 'ghosts are NEVER children of ropePivot');
  assert.ok(env.world.children.includes(ghostGroup), 'the ghostGroup sits at the scene root');
});

test('60 ghost-live frames + 2 bursts allocate NOTHING and keep the two-pass render (AC3/NFR1)', async () => {
  const env = await bootRender();
  const before = {
    meshes: env.reg.meshes.length,
    geometries: env.reg.geometries.length,
    materials: env.reg.materials.length,
    cameras: env.reg.cameras.length
  };
  for (let k = 0; k < 60; k++) {
    const juice = k === 20 || k === 40
      ? { at: 100 + k * 16, shake: 1.6, particles: 11 }      // the chargeUsed seed magnitudes, crafted
      : undefined;
    env.scene.render(ifrView({ ropes: 3 }, { now: 100 + k * 16, juice }));
  }
  assert.deepEqual(
    { meshes: env.reg.meshes.length, geometries: env.reg.geometries.length, materials: env.reg.materials.length, cameras: env.reg.cameras.length },
    before, 'register arrays grow by ZERO across 60 ghost-live frames with bursts (no per-frame allocation)');
  assert.equal(env.reg.cameras.length, 2, 'camera count unchanged (world + post, no new pass)');
  assert.equal(env.reg.renderCalls, 120, 'exactly two render passes per frame — no new render pass (NFR1)');
  const ghostGroup = ghostGroupOf(env.world);
  assert.equal(ghostGroup.children.filter(g => g.visible).length, 2, 'ropes 3 -> two ghosts visible on the last frame (<= 4 writes per frame)');
});

// ---------------------------------------------------------------------------
// Part B — the inline clamp mirrors (Task 1b, AC1 "the renderer computes no
// gameplay truth" — the arms mirrored from js/game.js, never imported)
// ---------------------------------------------------------------------------

test('ropes clamp mirror: hostile counts yield the clampRopes-arm ghost counts (AC1)', async () => {
  const env = await bootRender();
  const table = [
    [1, 0], [2, 1], [3, 2], [5, 4],
    [Infinity, 4],   // the +Infinity arm -> MAX_ROPES 5 -> 4 ghosts (clampRopes js/game.js:41-46)
    [NaN, 0],        // non-finite -> MIN_ROPES 1 -> zero ghosts
    ['x', 0],        // strings -> the minimum
    [-1, 0],         // under-range clamps to 1
    [2.9, 1]         // Math.trunc, NOT round — the 2.9 case pins the trunc arm
  ];
  const ghostGroup = ghostGroupOf(env.world);
  assert.ok(ghostGroup, 'the ghost pool exists to count');
  table.forEach(([ropes, visible], i) => {
    env.scene.render(ifrView({ ropes }, { now: 1000 + i }));
    assert.equal(ghostGroup.children.filter(g => g.visible).length, visible,
      `ropes ${String(ropes)} -> ${visible} visible ghosts (the js/game.js:41-46 arms mirrored inline, literal 5/1)`);
  });
});

test('iFrames active mirror: Number.isFinite && > 0 — Infinity reads OFF here while the ropes arm maps it ON (js/game.js:146,:170; the arms are NOT the same law, the leg names both)', async () => {
  const env = await bootRender();
  const ROSE = await shippedConst('ROSE');
  const FLOOR = await shippedConst('FLOOR');
  const DIM = 0x5a5a66;             // the story §4 seed hex (a data contract pin)
  const ghostGroup = ghostGroupOf(env.world);
  assert.ok(ghostGroup, 'the ghost pool exists');
  const bodyMats = ghostGroup.children[0] && env.reg.materials;
  assert.ok(bodyMats, 'materials registered');
  const table = [
    [0, false],
    [NaN, false],
    [-3, false],
    [2, true],
    // js/game.js:146 treats non-finite iFrames as INACTIVE (no clampRopes-style
    // Infinity arm here) — the read mirrors that arm, so Infinity reads dim OFF
    // even though the ropes clamp arm maps Infinity to 5. Both laws, one leg.
    [Infinity, false]
  ];
  const roseMat = env.reg.materials.find(m => m.birthHex === ROSE && m.color);
  const limbMat = env.reg.materials.find(m => m.birthHex === FLOOR && m.color && m !== env.world.children[0].material);
  table.forEach(([iFrames, dim], i) => {
    env.scene.render(ifrView({ ropes: 3, iFrames }, { now: 2000 + i }));
    assert.equal(roseMat.color.hex === DIM && limbMat.color.hex === DIM, dim,
      `iFrames ${String(iFrames)} -> dim ${dim ? 'ON' : 'OFF'} (the finite-check arm; Infinity is NOT a blank)`);
  });
});

// ---------------------------------------------------------------------------
// Part C — the blank read (Task 1c, AC1 + NFR8: static, state-derived, edges-only)
// ---------------------------------------------------------------------------

test('blank ON-edge writes EXACTLY roseMat.color + limbMat.color + ghost opacity — nothing else moves (Decision #3)', async () => {
  const env = await bootRender();
  const ghostGroup = ghostGroupOf(env.world);
  assert.ok(ghostGroup, 'the ghost pool exists');
  const ghostMat = ghostGroup.children[0].material;
  const floorMat = env.world.children[0].material;
  const ropeMat = env.ropeTube.material;
  const ROSE_HEX = await shippedConst('ROSE');
  const roseMat = env.reg.materials.find(m => m.birthHex === ROSE_HEX && m !== floorMat && m !== ropeMat && m.color && m.color.hex !== undefined && m.customProgramCacheKey !== undefined);
  assert.ok(roseMat, 'the rose body material is addressable');
  const snapHexes = () => env.reg.materials.map(m => (m.color ? m.color.hex : null));
  const snapOps = () => env.reg.materials.map(m => (typeof m.opacity === 'number' ? m.opacity : null));
  env.scene.render(ifrView({ ropes: 3, iFrames: 0 }, { now: 100 }));
  const hexA = snapHexes(); const opA = snapOps();
  const ropeHexA = ropeMat.color.hex;
  env.scene.render(ifrView({ ropes: 3, iFrames: 2 }, { now: 104 }));
  const hexB = snapHexes(); const opB = snapOps();
  const changed = hexA.map((h, i) => (h !== null && h !== hexB[i] ? i : -1)).filter(i => i >= 0);
  assert.equal(changed.length, 2, `EXACTLY two materials change color on the ON edge, got ${changed.length}`);
  assert.ok(changed.includes(env.reg.materials.indexOf(roseMat)), 'roseMat.color is one of the two writes');
  assert.ok(!changed.includes(env.reg.materials.indexOf(floorMat)), 'the floor material is not touched');
  assert.equal(ropeMat.color.hex, ropeHexA, 'ropeMat.color is NEVER touched (the vista arm keeps the rope column sole-writer, js/render3d.js:466)');
  const FLOOR_HEX = await shippedConst('FLOOR');
  const limbed = env.reg.materials.filter(m => m.customProgramCacheKey && m.birthHex === FLOOR_HEX && m !== floorMat);
  assert.ok(changed.includes(env.reg.materials.indexOf(limbed[0])) && limbed.length === 1, 'limbMat.color is the other write (and only it among floor-hued Lambert rig materials)');
  assert.equal(ghostMat.opacity, 0.85, 'ghosts lift to 0.85 on the ON edge — visible-through the dimmed skipper');
  const theta = Math.PI; // phase .5 * 2PI — the ghosts sweep on the canonical clock, sibling of the pivot write
  assert.equal(ghostGroup.rotation.x, theta, 'ghostGroup.rotation.x = theta (one write, the running arm)');
  const opChanged = opA.map((o, i) => (o !== null && o !== opB[i] ? i : -1)).filter(i => i >= 0);
  assert.deepEqual(opChanged, [env.reg.materials.indexOf(ghostMat)], 'the ONLY opacity write of the edge is the shared ghost material (shadow/particle materials untouched)');
});

test('blank OFF-edge restores the construction hexes and the dim opacity exactly — cycle-safe (Decision #3)', async () => {
  const env = await bootRender();
  const ROSE = await shippedConst('ROSE');
  const FLOOR = await shippedConst('FLOOR');
  const ghostGroup = ghostGroupOf(env.world);
  assert.ok(ghostGroup, 'the ghost pool exists');
  const ghostMat = ghostGroup.children[0].material;
  const roseMat = env.reg.materials.find(m => m.birthHex === ROSE && m.customProgramCacheKey);
  const limbMat = env.reg.materials.find(m => m.birthHex === FLOOR && m.customProgramCacheKey && m !== env.world.children[0].material);
  const on = ifrView({ ropes: 3, iFrames: 2 }, { now: 100 });
  const off = ifrView({ ropes: 3, iFrames: 0 }, { now: 104 });
  env.scene.render(on);
  env.scene.render(off);
  assert.equal(roseMat.color.hex, ROSE, 'the OFF edge restores roseMat to its construction hex (constant, no capture logic)');
  assert.equal(limbMat.color.hex, FLOOR, 'the OFF edge restores limbMat to its construction hex');
  assert.equal(ghostMat.opacity, 0.35, 'ghost opacity returns to the dim-but-present 0.35 default');
  env.scene.render(on); env.scene.render(off); env.scene.render(on); env.scene.render(off);
  assert.equal(roseMat.color.hex, ROSE, 'cycling on/off leaves the construction look exact');
  assert.equal(ghostMat.opacity, 0.35, 'and the pool back at default opacity');
});

test('the blank read is state-derived: same state at now=1000 vs now=9500 renders byte-equal cosmetics, reducedMotion included (NFR8; 5.4 inherits statics)', async () => {
  const envA = await bootRender();
  const view = t => ifrView({ ropes: 3, iFrames: 2 }, { now: t, reducedMotion: t === 9500 ? true : undefined });
  envA.scene.render(view(1000));
  // Snapshots are taken BEFORE the next boot: reg is one shared live array that
  // bootRender() clears — a lazy snapshot would compare a boot against itself.
  const snapA = cosmeticSnap(envA);
  const envB = await bootRender();
  envB.scene.render(view(9500));
  const snapB = cosmeticSnap(envB);
  assert.deepEqual(snapB, snapA,
    'the same crafted state at two clocks renders an identical cosmetic snapshot — zero view.now input into the read');
  const envC = await bootRender();
  envC.scene.render(ifrView({ ropes: 3, iFrames: 2 }, { now: 7 }));
  assert.deepEqual(cosmeticSnap(envC), snapA,
    'and under any now, no timer: the read is a static state pair (no oscillation for 5.4 to damp)');
});

test('ropePivot children + the runningPose shadow-finder stay identity-clean with ghosts live (Task 1a leg 4)', async () => {
  const env = await bootRender();
  const ghostGroup = ghostGroupOf(env.world);
  assert.ok(ghostGroup, 'the ghost pool exists');
  const ropeTube = env.ropeTube;
  for (const iFrames of [0, 2, 0]) {
    env.scene.render(ifrView({ ropes: 3, iFrames }, { now: 300 }));
    const { pivot } = rigAndPivot(env.world);
    assert.deepEqual(pivot.children.map(m => m.geometry?.constructor.name),
      ['TubeGeometry', 'BoxGeometry', 'BoxGeometry'],
      'ropePivot keeps exactly [tube, handleL, handleR] across blank edges');
    assert.equal(pivot.children[0], ropeTube, 'the rope tube identity in the pivot is stable');
  }
  // The render3d.test.js:257-259 finder, with ghosts live and lifted: still EXACTLY
  // the blob shadow, by two independent facts (Group carries no .material; a Group
  // child never appears at the root scan).
  env.scene.render(ifrView({ ropes: 3, iFrames: 2 }, { now: 400, player: { y: 40 } }));
  const found = env.world.children.filter(
    c => typeof c.material?.opacity === 'number' && c.material.opacity < 0.45 &&
      Math.abs(c.rotation.x + Math.PI / 2) < 1e-9
  );
  assert.equal(found.length, 1, 'the probe finder matches exactly one root child with ghosts live');
  assert.equal(found[0].geometry.constructor.name, 'CircleGeometry', 'the one match is the blob shadow (rotation.x = -PI/2 identity)');
});

test('source census: render3d stays timer-free and keeps EXACTLY the two specifiers (loop contract, NFR8)', async () => {
  const src = await sourceOf('render3d.js');
  assert.ok(!/setTimeout|setInterval|Date\.now|performance\.now/.test(src),
    'the i-frame read may not open a timing surface — the module stays timer-free (NFR8, the frozen boundary leg stays green)');
  const specs = [...src.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  assert.deepEqual(specs.sort(), ['./interpolate.js', 'three'],
    'a third specifier (e.g. clampRopes from ./game.js) breaks the two frozen data-URL boots — mirror inline, never import');
});

// ---------------------------------------------------------------------------
// Part D/E — the event rows (Task 1d/1e, AC2): data pins + channel truth
// ---------------------------------------------------------------------------

test('JUICE_TIERS gains EXACTLY chargeUsed + win verbatim, win.hitstop 0, seven-name census, bands over all seven (AC2 data pins)', async () => {
  const env = await bootShell();
  try {
    const t = env.mod.JUICE_TIERS;
    assert.deepEqual(Object.keys(t).sort(), ['ascend', 'chargeUsed', 'nearMiss', 'ropeLost', 'skip', 'trip', 'win'],
      "the seven juice tiers — table EXTENDED by Story 5.3 (FR16 seam: the silent event names get their rows); 'jump'/'offer'/'pick' still get no juice");
    assert.deepEqual(t.chargeUsed, { hitstop: 50, shake: 1.6, particles: 11 }, 'the absorbed-hit row verbatim (Decision #1)');
    assert.deepEqual(t.win, { hitstop: 0, shake: 1.95, particles: 15 }, 'the summit row verbatim (Decision #1 + #5: 15 < the 16-pool)');
    assert.equal(t.win.hitstop, 0, 'win freezes NOTHING at the tick that ends the run (the design call, scan variant B)');
    for (const tier of Object.values(t)) {
      assert.ok(tier.shake <= 2, 'shake stays inside the 2 post-pass px band');
      assert.ok(tier.particles >= 1 && tier.particles <= 24, 'particle counts small and pooled');
    }
    assert.deepEqual(t.skip, { hitstop: 8, shake: 0.5, particles: 4 }, 'skip verbatim (extend, never replace)');
    assert.deepEqual(t.nearMiss, { hitstop: 40, shake: 1.5, particles: 10 }, 'nearMiss verbatim');
    assert.deepEqual(t.ascend, { hitstop: 60, shake: 1.75, particles: 12 }, 'ascend verbatim');
    assert.deepEqual(t.ropeLost, { hitstop: 65, shake: 1.9, particles: 14 }, 'ropeLost verbatim');
    assert.deepEqual(t.trip, { hitstop: 80, shake: 2, particles: 16 }, 'trip verbatim — death stays the loudest event');
  } finally { env.restore(); }
});

test('sim channel: the charge tick emits EXACTLY [chargeUsed] with a ropeCount blank — no trip, no ropeLost (AC2)', () => {
  const out = game.tickRun(
    { ...game.createRun(), charged: 1 },
    { phase: 0.449, period: 0.9 },
    { y: 12, vy: 0, grounded: false, squash: 1, squashVel: 0 },   // airborne: a falling leg must not mint a spurious 'jump'
    1 / 120, () => 0.5);
  assert.deepEqual(out.events, ['chargeUsed'], 'the armor eats the hit and nothing else fires (js/game.js:217-224)');
  assert.equal(out.run.iFrames, game.clampRopes(out.run.ropes ?? 1), 'a blank of one pass per HELD rope follows — the state the AC1 read must light in');
  assert.equal(out.run.charged, 0, 'the charge is consumed');
});

test('sim channel: the summit tick pushes win with the offer spliced; VOICES stays the shipped EIGHT — chargeUsed audio-silent, win rides 5.1 (AC2, the §6 fence untouched)', () => {
  const summit = game.createRun();
  const out = game.tickRun(
    { ...summit, status: 'running', area: game.AREAS.length, skips: 9, altitude: game.AREAS.at(-1).ceiling - 30 },
    { phase: 0.449, period: 0.9 },
    { y: 40, vy: 0, grounded: true, squash: 1, squashVel: 0 },
    1 / 120, () => 0.4);
  assert.ok(out.events.includes('win'), 'the summit tick pushes win (js/game.js:273)');
  assert.ok(!out.events.includes('offer'), `the spliced offer stays gone from the channel: ${out.events}`);
  assert.equal(out.run.outcome, 'summit');
  return sourceOf('audio.js').then(src => {
    const m = src.match(/const VOICES = \{([\s\S]*?)\n  \};/);
    assert.ok(m, 'the VOICES literal is present in js/audio.js');
    const names = [...m[1].matchAll(/^\s*(\w+):/gm)].map(x => x[1]).sort();
    assert.deepEqual(names, ['ascend', 'jump', 'nearMiss', 'pick', 'ropeLost', 'skip', 'trip', 'win'],
      "the shipped eight — chargeUsed is ABSENT (audio-silent, fenced by ceilingbreak §6 which this story leaves untouched), win PRESENT (5.1's voice; this story adds zero audio material)");
  });
});

// ---------------------------------------------------------------------------
// Part F — booted legs (Task 1f, ≤4 boots, NFR4)
// ---------------------------------------------------------------------------

// One scripted boot: start press, 4 ms strides, { at: 5, run: { ropes: 3 } }
// stamps a MULTI-ROPE run; the no-jack cascade (3 -> 2 -> 1 -> trip) fires the
// REAL trip arm at stamped ropes: 3 play (recordStrip donor shape). tripHitstop
// parks this boot's own JUICE_TIERS row (per-boot-mutable data-URL table).
async function recordTrip({ tripHitstop }) {
  const env = await bootShell();
  try {
    env.mod.JUICE_TIERS.trip.hitstop = tripHitstop;
    env.script.patches.push({ at: 5, run: { ropes: 3 } });
    env.script.calloutTrip = true;
    press(env);
    pump(env);
    const phases = [];
    const alphas = [];
    const steps = [];
    let F = -1;
    for (let g = 0; g < 3000; g++) {
      pump(env);
      const v = env.views.at(-1);
      if (F < 0 && env.script.events.includes('trip')) F = phases.length;
      phases.push(v.rope.phase);
      alphas.push(v.alpha);
      steps.push(env.script.n);
      if (F >= 0 && phases.length >= F + 45) break;
      if (F < 0) assert.notEqual(v.run.status, 'over', 'trip harness: the run died before the scripted trip tick — the stamp went wrong');
    }
    assert.notEqual(F, -1, 'trip harness: the 3->2->1 strip cascade never reached the trip tick');
    assert.ok(env.script.events.filter(e => e === 'ropeLost').length >= 2,
      'the scripted case is genuinely multi-rope play (two strips precede the trip)');
    return { phases, alphas, steps, d: deltas(phases), F };
  } finally { env.restore(); }
}

test('NFR8 A/B at the trip tick (stamped ropes: 3, callout channel live): identical phase sequence and step counts; the trip freeze window exists ONLY with the row (AC3 busiest case)', async () => {
  const ctrl = await recordTrip({ tripHitstop: 0 });   // nearMiss row stays live (40 ms floor)
  const juice = await recordTrip({ tripHitstop: 80 }); // the shipped seed
  assert.equal(juice.F, ctrl.F, 'both boots fire the trip on the same frame — identical deterministic step schedule');
  assert.deepEqual(juice.phases, ctrl.phases, 'the sim timing is byte-identical with and without the juice (NFR8/AC1)');
  assert.deepEqual(juice.steps, ctrl.steps, 'conserved total steps — the freeze delays, never drops');
  const F = juice.F;
  assert.deepEqual(juice.alphas.slice(0, F + 10), ctrl.alphas.slice(0, F + 10),
    'through the shared 40 ms nearMiss floor (frames F+1..F+9, 4 ms strides) the two boots are indistinguishable');
  for (let i = 10; i <= 19; i++) {   // F+10 is where the control's 40 ms deadline passes (40 < 40 false); juice holds to F+19
    assert.ok(juice.alphas[F + i] > 1, `frame F+${i}: the 80 ms deadline holds the drain (acc accumulates beyond the sawtooth band) ONLY with the row`);
    assert.ok(ctrl.alphas[F + i] < 1, `frame F+${i}: the control drains in the normal band — no trip freeze without the row`);
  }
});

test('the win tick advances the drain with ZERO frozen frames and carries the seed shake/particles on the win view (AC2, Decision #1 hitstop-0)', async () => {
  const env = await bootShell();
  try {
    assert.deepEqual(env.mod.JUICE_TIERS.win, { hitstop: 0, shake: 1.95, particles: 15 }, 'the win row is live for this boot');
    env.script.forceArea = game.AREAS.length;                       // scripted summit (output-stamp donor)
    env.script.forceScore = (game.AREAS.at(-1).ceiling - 12) / game.ALT_PER_POINT;
    press(env);
    pump(env);
    const phases = [];
    let F = -1;
    let winView = null;
    for (let g = 0; g < 400; g++) {
      pump(env);
      const v = env.views.at(-1);
      if (F < 0 && v.run.outcome === 'summit') { F = phases.length; winView = v; }
      phases.push(v.rope.phase);
      assert.ok(v.alpha < 1, `frame ${phases.length}: hitstop 0 writes max(stopUntil, now + 0) — provably no freeze window, alpha stays in the drain band`);
      if (F >= 0 && phases.length >= F + 10) break;
    }
    assert.notEqual(F, -1, 'the scripted summit tick never reached the view (the stamp went wrong)');
    const d = deltas(phases);
    assert.ok(d[F] > 0, 'the summit tick advances the phase clock like any live frame');
    const live = d.slice(2, F).filter(x => x > 0);
    const ref = Math.min(...live);                   // one drain step's phase advance, as THIS boot actually produced it
    const m = Math.round(d[F] / ref);
    assert.ok(m === 1 || m === 2, 'the win-frame delta is a legitimate 1- or 2-step drain stride');
    assert.ok(Math.abs(d[F] - m * ref) < 1e-9, 'matching an unparked neighbor exactly (zero frozen steps at the tick)');
    // (the phase-array index, not a views[] index — the view is captured at detection)
    assert.deepEqual({ shake: winView.juice.shake, particles: winView.juice.particles }, { shake: 1.95, particles: 15 },
      "view.juice on the win frame equals the seed row — the burst rides the run's last live frame");
  } finally { env.restore(); }
});

test('blank render-through: during a real strip the run.iFrames > 0 views are a contiguous suffix of the strip tick — the renderer inputs prove the read is derivable from state alone (AC1)', async () => {
  const env = await bootShell();
  try {
    env.script.patches.push({ at: 5, run: { ropes: 3, buffer: 0, charged: 0 } });
    press(env);
    pump(env);
    const live = [];
    let Fs = -1;
    let ended = false;
    for (let g = 0; g < 1200 && !ended; g++) {
      pump(env);
      const v = env.views.at(-1);
      if (Fs < 0 && env.script.events.includes('ropeLost')) Fs = live.length;
      live.push(v.run.iFrames);
      if (Fs >= 0 && live.length >= Fs + 5) assert.equal(v.run.status, 'running', 'the blank never ends the run (a strip, not a death)');
      // Stop at the END of the FIRST blank — the no-press cascade would open a
      // second blank (2->1) and this leg's claim is per-strip contiguity.
      if (Fs >= 0 && live.length > Fs + 1 && v.run.iFrames === 0) ended = true;
    }
    assert.ok(ended, 'the first blank never closed (the stamp went wrong)');
    assert.notEqual(Fs, -1, 'no strip ever opened (the stamp went wrong)');
    const blankIdx = live.map((n, i) => (typeof n === 'number' && n > 0 ? i : -1)).filter(i => i >= 0);
    assert.ok(blankIdx.length > 0, 'the blank produced i-frame-bearing frames (the read has real inputs)');
    assert.equal(blankIdx[0], Fs, 'the blank suffix starts at the strip tick');
    assert.deepEqual(blankIdx, Array.from({ length: blankIdx.length }, (_, k) => blankIdx[0] + k),
      'the run.iFrames > 0 frames are a CONTIGUOUS suffix — no per-frame clock needed to find them');
    assert.equal(live[Fs], 2, 'a ropes-3 strip leaves exactly two passes (js/game.js:240 strippedTo)');
  } finally { env.restore(); }
});
