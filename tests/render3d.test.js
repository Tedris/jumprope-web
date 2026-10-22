import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Regression pin for G-01-1: createScene used to return the bare render
// closure, so shell.js' scene.render(...) threw on the first rAF frame and
// killed the loop. The contract is pinned here without loading the real
// 'three' package or a DOM: js/render3d.js is read as text, its two import
// specifiers are rewritten (stub for the render lib, file: URL for the real
// interpolate module), and the rewritten source is imported as a data: URL.
// No relative specifier into js/ appears in this file, so the SPECIFIER_RE
// walk in tests/boundary.test.js never registers render3d.js as an entry and
// the ARCH-01 three-fence stays green.
const testsDir = dirname(fileURLToPath(import.meta.url));
const render3dPath = resolve(testsDir, '..', 'js', 'render3d.js');
const interpolateHref = pathToFileURL(resolve(testsDir, '..', 'js', 'interpolate.js')).href;

// The stub surface covers the whole Phase-2 scene build (RESEARCH Pitfall 6):
// the 02-02 pipeline symbols plus Plan 03's rope/character/stage symbols, so
// later scene work needs no further stub edits.
const THREE_STUB_HREF = 'data:text/javascript,' + encodeURIComponent([
  'export const NearestFilter = 1003;',
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
  '  }',
  '  add(child) { this.children.push(child); }',
  '  setSize() {}',
  '  setRenderTarget() {}',
  '  setPixelRatio() {}',
  '  compile() {}',
  '  updateProjectionMatrix() {}',
  '  lookAt() {}',
  '  translate() {}',
  '  set() {}',
  '  render() {}',
  '}',
  'export class WebGLRenderer extends Node {}',
  // UI-02: Scene records itself so the dampen legs can reach the two scenes'
  // children — Group.add (Node.add) now records children too.
  'export class Scene extends Node {',
  '  constructor() { super(); (globalThis.__render3dScenes ||= []).push(this); }',
  '}',
  'export class Color { constructor() {} }',
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
  'export class PerspectiveCamera extends Node {}',
  'export class OrthographicCamera extends Node {}',
  'export class Group extends Node {}',
  'export class PlaneGeometry extends Node {}',
  'export class BoxGeometry extends Node {}',
  'export class TubeGeometry extends Node {}',
  'export class CatmullRomCurve3 extends Node {}',
  'export class CylinderGeometry extends Node {}',
  'export class SphereGeometry extends Node {}',
  'export class CircleGeometry extends Node {}',
  'export class MeshBasicMaterial extends Node {}',
  'export class MeshLambertMaterial extends Node {}',
  'export class ShaderMaterial extends Node {',
  '  constructor(options = {}) { super(); this.uniforms = options.uniforms; }',
  '}',
  'export class DirectionalLight extends Node {}',
  'export class Fog { constructor() {} }',
  // Plan 03 Task 2: render() writes shadow.material.opacity — Mesh must keep its material.
  'export class Mesh extends Node {',
  '  constructor(geometry, material) { super(); this.material = material; }',
  '}'
].join('\n'));

async function loadStubbedCreateScene() {
  const src = await readFile(render3dPath, 'utf8');
  const rewritten = src
    .replace(/from\s*['"]three['"]/, `from '${THREE_STUB_HREF}'`)
    .replace(/from\s*['"][^'"]*interpolate\.js['"]/, `from '${interpolateHref}'`);
  const mod = await import('data:text/javascript,' + encodeURIComponent(rewritten));
  return mod.createScene;
}

const stubCanvas = { width: 480, height: 640 };

test('createScene returns a plain object, not the bare render closure', async () => {
  const createScene = await loadStubbedCreateScene();
  const scene = createScene(stubCanvas);
  assert.strictEqual(typeof scene, 'object',
    'G-01-1 contract: createScene must return a plain object, not the bare render closure');
});

test('the returned object exposes a render function', async () => {
  const createScene = await loadStubbedCreateScene();
  const scene = createScene(stubCanvas);
  assert.strictEqual(typeof scene.render, 'function',
    'G-01-1 contract: scene.render must be a function callable by the shell frame loop');
});

test('scene.render runs against the stubbed renderer without throwing', async () => {
  const createScene = await loadStubbedCreateScene();
  const scene = createScene(stubCanvas);
  scene.render({
    run: {},
    rope: { phase: 0.5 },
    player: { y: 0 },
    prevPhase: 0.4,
    alpha: 0.5,
    best: 0,
    now: 0
  });
});

// ---------- UI-02 dampen observability (plan 05-02) ----------

// createScene builds exactly two Scenes in order — world, then post — and the
// stub Scene class registers each instance. Group.add records children, so
// postScene.children[0].material.uniforms.* and the world pool are reachable.
async function bootDampenScene(canvas = { width: 480, height: 640 }) {
  globalThis.__render3dScenes = [];
  const createScene = await loadStubbedCreateScene();
  const scene = createScene(canvas);
  const [world, post] = globalThis.__render3dScenes;
  assert.ok(world && post, 'createScene constructs the world and post scenes');
  return { scene, world, post };
}

function dampenView(overrides = {}) {
  return {
    run: { status: 'running' },
    rope: { phase: 0.5 },
    player: { y: 0 },
    prevPhase: 0.5,
    alpha: 0,
    best: 0,
    now: 0,
    ...overrides,
  };
}

// The shared snap uniform rides every world material's onBeforeCompile —
// invoke the closure with a probe shader to get the live uniform object back.
function snapGridUniform(worldScene) {
  const mat = worldScene.children.find(c => c.material?.onBeforeCompile)?.material;
  assert.ok(mat, 'the stub world scene carries a snap-injected world material');
  mat.userData = {}; // real materials carry userData; the stub Node does not
  const probe = { uniforms: {}, vertexShader: '#include <project_vertex>' };
  mat.onBeforeCompile(probe);
  return probe.uniforms.uSnapGrid;
}

test('reduced motion pins uShake at zero; the same signal without it jitters the UV offset (D-05)', async () => {
  const env = await bootDampenScene();
  const uShake = env.post.children[0].material.uniforms.uShake;
  assert.ok(uShake, 'the post quad keeps its uniforms through the ShaderMaterial stub');

  env.scene.render(dampenView({
    now: 1000, reducedMotion: true,
    juice: { at: 1000, shake: 2, particles: 0 },
  }));
  env.scene.render(dampenView({ now: 1030, reducedMotion: true }));
  // + 0 normalizes -0 (zero amplitude through a negative sin term) — the
  // uniform must read exactly the still vector, sign aside.
  assert.strictEqual(uShake.value.x + 0, 0, 'reducedMotion zeroes the shake amplitude at the source');
  assert.strictEqual(uShake.value.y + 0, 0);

  const fresh = await bootDampenScene();
  const uShakeRef = fresh.post.children[0].material.uniforms.uShake;
  fresh.scene.render(dampenView({ now: 1000, juice: { at: 1000, shake: 2, particles: 0 } }));
  fresh.scene.render(dampenView({ now: 1030 }));
  assert.notStrictEqual(uShakeRef.value.x, 0, 'the same signal under full motion jitters (gate proof)');
});

test('reduced motion holds the sub-pixel snap grid even across a canvas resize (Pitfall 12)', async () => {
  const canvas = { width: 480, height: 640 };
  const env = await bootDampenScene(canvas);
  const uSnap = snapGridUniform(env.world);
  const internal0 = Math.round(240 * 480 / 640);           // rows-driven internal width
  assert.strictEqual(uSnap.value.x, internal0 / (2 * 2), 'boot holds the signed-off SNAP_S=2 wobble grid');

  env.scene.render(dampenView({ now: 100, reducedMotion: true }));
  assert.strictEqual(uSnap.value.x, internal0 / (2 * 0.25), 'reduced motion writes the SNAP_OFF=0.25 grid');
  assert.strictEqual(uSnap.value.y, 240 / (2 * 0.25));

  canvas.width = 960;                                      // forces applyBufferSize via the passive poll
  canvas.height = 640;
  env.scene.render(dampenView({ now: 150, reducedMotion: true }));
  const internal1 = Math.round(240 * 960 / 640);
  assert.strictEqual(uSnap.value.x, internal1 / (2 * 0.25),
    'the resize re-derives from SNAP_OFF — the poll cannot re-apply the wobble (Pitfall 12)');
  assert.strictEqual(uSnap.value.y, 240 / (2 * 0.25));
});

test('reduced motion pins particle flight while spawn, opacity fade and lifetime stay live (D-05)', async () => {
  const env = await bootDampenScene();
  env.scene.render(dampenView({
    now: 1000, reducedMotion: true,
    juice: { at: 1000, shake: 0, particles: 8 },
  }));
  const pool = env.world.children.find(g => (g.children?.length ?? 0) === 16);
  assert.ok(pool, 'the pooled 16-quad particle group is reachable via Group.add');
  const live = pool.children.filter(p => p.visible);
  assert.strictEqual(live.length, 8, 'the burst still spawns under reduced motion — events stay');
  const spawn = live.map(p => [p.position.x, p.position.y, p.position.z]);
  const opacityAtSpawn = pool.children[0].material.opacity;

  env.scene.render(dampenView({ now: 1200, reducedMotion: true }));
  live.forEach((p, i) => {
    assert.strictEqual(p.position.x, spawn[i][0], 'x pinned at the spawn point');
    assert.strictEqual(p.position.y, spawn[i][1], 'y pinned at the spawn point');
    assert.strictEqual(p.position.z, spawn[i][2], 'z pinned at the spawn point');
  });
  const mat = pool.children[0].material;
  assert.ok(mat.opacity < opacityAtSpawn, 'the opacity fade keeps running while the quads hold');
  assert.ok(mat.opacity > 0, 'the 0.45 s lifetime is untouched mid-flight');

  env.scene.render(dampenView({ now: 1500, reducedMotion: true }));
  assert.ok(pool.children.every(p => !p.visible), 'the 0.45 s lifetime retires the burst as today');
});
