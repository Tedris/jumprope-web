import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Playtest fix 2026-11-10 — ghost spread (the multi-rope "outline" bug):
// with the pool SHARING the rope geometry at even phase offsets (the frozen
// 5.3 spacing law), all sweep radii were equal, so the N arcs tiled ONE exact
// circle about the hands axis at every ropes >= 2 and theta — a rotating
// outline of the skipper, not extra ropes. Fix: a per-slot radial shortening
// s_k = GHOST_SHORT_BASE - GHOST_SHORT_STEP * k (< 1, distinct per slot),
// written ONCE at construction. The spacing law, the shared geometry, the one
// shared material and the visibility census are UNTOUCHED — iframesjuice and
// reducedmotion stay frozen-green, which is itself the proof the laws held.
//
// Doctrine: the registering three-stub is the tests/iframesjuice.test.js donor
// COPIED into this file (frozen suites cannot be imported), with ONE harness
// extension — Node.scale is a write-recorder (`writes`) so the write-once law
// is machine-inspectable. The render-module boot is the same donor rewrite
// (three specifier -> data-URL stub, interpolate -> file URL); no relative
// specifier into js/ for the renderer (boundary.test.js SPECIFIER_RE, ARCH-01).

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');
const render3dPath = resolve(jsDir, 'render3d.js');
const interpolateHref = pathToFileURL(resolve(jsDir, 'interpolate.js')).href;

let renderBoots = 0;

const THREE_GS_STUB_HREF = 'data:text/javascript,' + encodeURIComponent([
  'export const NearestFilter = 1003;',
  'globalThis.__gsReg = { scenes: [], meshes: [], materials: [], geometries: [], cameras: [], renderCalls: 0 };',
  'const reg = globalThis.__gsReg;',
  'export class Vec3 {',
  '  constructor() { this.x = 0; this.y = 0; this.z = 0; }',
  '  set(x, y, z) { this.x = x; this.y = y; this.z = z; }',
  '  setScalar(v) { this.x = v; this.y = v; this.z = v; }',
  '}',
  'export class Node {',
  '  constructor() {',
  '    this.position = new Vec3();',
  '    this.rotation = new Vec3();',
  '    this.scale = { x: 1, y: 1, z: 1, writes: 0,',
  '      set(x, y, z) { this.x = x; this.y = y; this.z = z; this.writes += 1; },',
  '      setScalar(v) { this.x = v; this.y = v; this.z = v; this.writes += 1; } };',
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
    .replace(/from\s*['"]three['"]/, `from '${THREE_GS_STUB_HREF}'`)
    .replace(/from\s*['"][^'"]*interpolate\.js['"]/, `from '${interpolateHref}'`);
  const mod = await import('data:text/javascript,' + encodeURIComponent(`${rewritten}\n//ghostspread boot ${++renderBoots}`));
  const reg = globalThis.__gsReg;
  for (const k of ['scenes', 'meshes', 'materials', 'geometries', 'cameras']) reg[k].length = 0;
  reg.renderCalls = 0;
  const scene = mod.createScene({ width: 480, height: 640 });
  const world = reg.scenes[0];
  const tubeMeshes = reg.meshes.filter(m => m.geometry?.constructor.name === 'TubeGeometry');
  return { scene, reg, world, tubeMeshes, ropeTube: tubeMeshes[0], ghosts: tubeMeshes.slice(1) };
}

// ifrView donor shape (tests/iframesjuice.test.js:143-153).
function gsView(runExtras = {}, extras = {}) {
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

// derive-literals doctrine: parse the SHIPPED shortening constants, never
// re-type the numbers here.
async function shippedNum(name) {
  const m = (await readFile(render3dPath, 'utf8')).match(new RegExp(`const ${name} = ([0-9.]+)`));
  assert.ok(m, `the shipped constant ${name} is present in js/render3d.js`);
  return Number(m[1]);
}

test('L1 slot law: every ghost slot scales (1, s_k, s_k) derived from the shipped constants; the real rope stays scale 1 (v1 look untouched)', async () => {
  const env = await bootRender();
  const base = await shippedNum('GHOST_SHORT_BASE');
  const step = await shippedNum('GHOST_SHORT_STEP');
  assert.equal(env.ghosts.length, 4, 'the pool is the frozen GHOST_POOL of 4');
  env.ghosts.forEach((g, k) => {
    const s = base - step * k;
    assert.deepEqual([g.scale.x, g.scale.y, g.scale.z], [1, s, s],
      `slot ${k}: radial-only shortening s_${k} = ${base} - ${step} * ${k}, x neutral (ends stay on the handle line)`);
  });
  assert.deepEqual([env.ropeTube.scale.x, env.ropeTube.scale.y, env.ropeTube.scale.z], [1, 1, 1],
    'the real rope mesh keeps sweep radius 1 — the v1 rope is byte-identical in look');
});

test('L2 outline breaker: all four slot radii are < 1 and pairwise distinct — equal-phase arcs can never tile one closed circle again', async () => {
  const env = await bootRender();
  const radii = env.ghosts.map(g => g.scale.y);
  for (const [k, r] of radii.entries()) {
    assert.ok(r < 1, `slot ${k} radius ${r} < 1 — no ghost sweeps the real rope's circle (the tiled-outline premise is dead)`);
    assert.ok(r > 0.5, `slot ${k} radius ${r} stays a rope, not a wire ring`);
  }
  assert.equal(new Set(radii).size, 4, 'pairwise-distinct radii: the N arcs of ANY even phase-spacing never close into one curve');
});

test('L3 write-once: scale is a construction artifact — 30 running frames across the ropes edges 1->2->5->2->3 leave every slot at exactly 1 write', async () => {
  const env = await bootRender();
  const meshCount = env.reg.meshes.length;
  const walk = [1, 2, 2, 5, 5, 2, 3];
  let frame = 0;
  for (const ropes of walk) {
    for (let i = 0; i < 4; i++) {
      env.scene.render(gsView({ ropes }, { now: frame++ * 8 }));
    }
  }
  env.ghosts.forEach((g, k) => {
    assert.equal(g.scale.writes, 1, `slot ${k}: the scale write happens at construction ONLY — zero per-frame scale surface`);
  });
  assert.equal(env.reg.meshes.length, meshCount, 'zero allocation across the ghost-live walk (NFR1 census)');
});

test('L4 source fence: the scale write sites are enumerable — exactly one ghost.scale.set and two .scale.set calls in js/render3d.js total', async () => {
  const src = await readFile(render3dPath, 'utf8');
  assert.equal((src.match(/ghost\.scale\.set\(/g) ?? []).length, 1,
    'the construction loop is the ONLY ghost scale site — nothing per-frame can re-scale the pool');
  assert.equal((src.match(/\.scale\.set\(/g) ?? []).length, 2,
    'exactly two scale writes in the module: the rig squash and the ghost construction');
});
