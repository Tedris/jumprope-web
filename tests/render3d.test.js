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

// ---------- D-05 untouched-channel + still-endpoint audit legs (plan 05-02 truths 3+4) ----------

// rig and ropePivot are the world scene's two 3-children Groups: the rig
// parents three child Groups (torso group + two legs), the pivot three Meshes
// (tube + two handles). Both fingerprints are unique among the stub children.
function rigAndPivot(worldScene) {
  const trios = worldScene.children.filter(c => (c.children?.length ?? 0) === 3);
  const rigs = trios.filter(g => g.children.every(c => !c.material));
  const pivots = trios.filter(g => g.children.every(c => c.material));
  assert.strictEqual(rigs.length, 1, 'exactly one rig-shaped Group in the stub world');
  assert.strictEqual(pivots.length, 1, 'exactly one ropePivot-shaped Group in the stub world');
  return { rig: rigs[0], pivot: pivots[0] };
}

// The judgment-relevant pose channels D-05 protects: rope pivot, rig height
// and squash, arms (torsoGroup children added after headGroup), legs, and the
// blob shadow (the only Mesh whose material opacity render() animates — it is
// < 0.45 exactly while airborne, null on the ground frames).
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

test('reduced motion holds the idle and trip-settle still endpoints; full motion animates them (Open Q3)', async () => {
  const env = await bootDampenScene();
  const { rig, pivot } = rigAndPivot(env.world);

  // Idle life under reduced motion: breath bob and twirl hold their still
  // endpoints on every frame, regardless of the cosmetic clock advancing.
  env.scene.render(dampenView({ run: { status: 'idle' }, now: 1000, reducedMotion: true }));
  const first = [rig.position.y, pivot.rotation.x];
  env.scene.render(dampenView({ run: { status: 'idle' }, now: 1400, reducedMotion: true }));
  assert.strictEqual(rig.position.y, 0, 'the breath bob holds its still endpoint at 0');
  assert.strictEqual(pivot.rotation.x, 0, 'the idle twirl is frozen at the rest pose');
  assert.deepStrictEqual([rig.position.y, pivot.rotation.x], first,
    'the idle pose is still across a clock advance — no slow drift');

  // Trip settle under reduced motion: the pivot holds exactly -PI, the damped
  // oscillation term is gone at every sampled t after the trip.
  env.scene.render(dampenView({ run: { status: 'running' }, now: 2000, reducedMotion: true }));
  env.scene.render(dampenView({ run: { status: 'over' }, now: 2000, reducedMotion: true }));
  for (const t of [2010, 2050, 2300]) {
    env.scene.render(dampenView({ run: { status: 'over' }, now: t, reducedMotion: true }));
    assert.strictEqual(pivot.rotation.x, -Math.PI, `settle holds -PI exactly at +${t - 2000} ms`);
  }

  // Gate proof: the SAME frame sequences under full motion do animate — the
  // stillness above is the reducedMotion branch firing, not dead code.
  const fresh = await bootDampenScene();
  const ctl = rigAndPivot(fresh.world);
  fresh.scene.render(dampenView({ run: { status: 'idle' }, now: 1000 }));
  const idle0 = ctl.pivot.rotation.x;
  fresh.scene.render(dampenView({ run: { status: 'idle' }, now: 1400 }));
  assert.notStrictEqual(ctl.pivot.rotation.x, idle0, 'gate proof: full motion twirls while idle');

  fresh.scene.render(dampenView({ run: { status: 'running' }, now: 2000 }));
  fresh.scene.render(dampenView({ run: { status: 'over' }, now: 2000 }));
  fresh.scene.render(dampenView({ run: { status: 'over' }, now: 2010 }));
  assert.notStrictEqual(ctl.pivot.rotation.x, -Math.PI, 'gate proof: full motion shakes at the settle');
});

test('the running pose, rope pivot, limbs and blob shadow are byte-identical under reduced motion (D-05)', async () => {
  const a = await bootDampenScene();  // reduced motion on
  const b = await bootDampenScene();  // full-motion reference, same scripted views
  const frames = [
    { now: 1000, phase: 0.25, prevPhase: 0.2, alpha: 0.5, playerY: 0, squash: 1 },
    { now: 1150, phase: 0.75, prevPhase: 0.7, alpha: 0.5, playerY: 30, squash: 1 },
    { now: 1300, phase: 0.5, prevPhase: 0.5, alpha: 0, playerY: 0, squash: 0.9 },
  ];
  const posesA = [];
  const posesB = [];
  for (const f of frames) {
    const view = {
      ...dampenView({
        run: { status: 'running' },
        rope: { phase: f.phase },
        prevPhase: f.prevPhase,
        alpha: f.alpha,
        now: f.now,
        player: { y: f.playerY, squash: f.squash },
      }),
    };
    a.scene.render({ ...view, reducedMotion: true });
    b.scene.render(view);
    posesA.push(runningPose(a.world));
    posesB.push(runningPose(b.world));
  }
  posesA.forEach((pose, i) => {
    assert.deepStrictEqual(pose, posesB[i],
      `judgment-relevant pose byte-identical at frame ${i} (now=${frames[i].now})`);
  });

  // Liveness proof 1: the airborne frame's shadow genuinely faded in BOTH
  // scenes — the pose probe reached the real animated shadow, not a stub null.
  assert.ok(typeof posesA[1].shadowOpacity === 'number' && posesA[1].shadowOpacity < 0.45,
    'the blob shadow fades with jump height under reduced motion exactly as without');
  // Liveness proof 2: the flag DID reach render3d — the PS1 snap layer diverges
  // between the two scenes while every channel compared above stayed equal.
  assert.notStrictEqual(snapGridUniform(a.world).value.x, snapGridUniform(b.world).value.x,
    'the reduced flag demonstrably took effect (dampened snap grid) while poses stayed identical');
});
