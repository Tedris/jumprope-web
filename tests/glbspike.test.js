import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { makeProbeGlb } from './fixtures/make-probe-glb.js';
import { startRun, tickRun } from '../js/game.js';
import { jump } from '../js/player.js';
import { lerpPhase } from '../js/interpolate.js';

// Story 8.4 — the joint-name contract spike (§a-§f). NOTHING SHIPS: this suite
// is the whole proof surface (FR38 spike-gated). The CONTRACT table below IS
// the published contract's test-side twin (D1 — js/render3d.js is byte-zero,
// carries zero .name writes; the identity paths are the rigAndPivot /
// pose-probe addressing style frozen by tests/render3d.test.js). The probe
// (.glb) is authored ONLY by the checked-in generator; §c re-runs the
// generator IN MEMORY and asserts byte-equality with the committed asset.
// A2 row (h) law: this file holds NO relative specifier to js/render3d.js —
// the renderer is booted as TEXT through the data-URL stub idiom (donor:
// tests/render3d.test.js:9-94, copied per D5, never imported).

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');
const render3dPath = resolve(jsDir, 'render3d.js');
const interpolateHref = pathToFileURL(resolve(jsDir, 'interpolate.js')).href;
const probePath = resolve(testsDir, 'fixtures', 'probe.glb');

// Committed-asset size law (track1.test.js:44 idiom): a static-host budget
// pinned HERE; the probe is kilobyte-class, the leg asserts the relation.
const PROBE_GLB_MAX_BYTES = 32768;

// Canonical sampling schedule (D5 — the numbers live in STORY TEXT; the loop
// consumes them, no leg asserts one as a magic expectation): warm-up, then
// COUNT samples at STRIDE; a press lands every PRESS_EVERY ticks (truthiness
// only — the forgiveness-buffer arm in js/game.js, never a jump). The jump
// POLICY lines are the scripted-run donor (tests/headless-sim.test.js:55-65):
// press alone parks a grounded skipper under the second feet-crossing (Debug
// Log D5-AMEND), so the loop keeps the sim 'running' — D5's stated invariant.
const STEP = 1 / 120;
const WARMUP = 240;
const COUNT = 64;
const STRIDE = 2;
const PRESS_EVERY = 96;
const CONST_RNG = () => 0.5; // seed honesty: no Math.random anywhere (row (o))
const JUMP_LO = 0.2;
const JUMP_HI = 0.35;

// ---------- §Contract test-side twin: names, parent edges, identity paths ----

const CONTRACT_NAMES = [
  'torso', 'head', 'cap', 'eyeL', 'eyeR', 'scarf0', 'scarf1', 'scarf2',
  'armL', 'armR', 'legL', 'legR', 'chest', 'chestL', 'chestR', 'handleL', 'handleR',
];
// name -> contract parent (null = a scene root: the rig root or the rope pivot).
const CONTRACT_PARENT = {
  torso: null, head: 'torso', cap: 'head', eyeL: 'head', eyeR: 'head',
  scarf0: 'head', scarf1: 'scarf0', scarf2: 'scarf1',
  armL: 'torso', armR: 'torso', legL: null, legR: null,
  chest: 'torso', chestL: 'chest', chestR: 'chest',
  handleL: null, handleR: null,
};
// Root nodes in shipped build order: the rig's children, then the pivot's handles.
const SCENE_ROOT_ORDER = ['torso', 'legL', 'legR', 'handleL', 'handleR'];

// The identity-addressed CONTRACT (D1 option (a)): the §Contract table's paths
// from the two fingerprint roots. chestL/chestR read undefined when the jiggle
// props are absent (CHEST_JIGGLE off) — the bind falls off gracefully (§e).
function contractTargets({ rig, pivot }) {
  const torso = rig.children[0];
  const head = torso.children[1];
  const scarf0 = head.children[4];
  const scarf1 = scarf0.children[1];
  const scarf2 = scarf1.children[1];
  const chest = torso.children[4];
  return {
    torso, head,
    cap: head.children[1], eyeL: head.children[2], eyeR: head.children[3],
    scarf0, scarf1, scarf2,
    armL: torso.children[2], armR: torso.children[3],
    legL: rig.children[1], legR: rig.children[2],
    chest, chestL: chest.children[0], chestR: chest.children[1],
    handleL: pivot.children[1], handleR: pivot.children[2],
  };
}

// The bind law (D2): name -> target lookup, never throws, never half-binds.
function bindProbe(nodes, targets) {
  const bound = {};
  const unbound = [];
  for (const node of nodes) {
    const target = Object.hasOwn(targets, node.name) ? targets[node.name] : undefined;
    if (target) bound[node.name] = target;
    else unbound.push(node.name);
  }
  return { bound, unbound };
}

// ---------- the test-side GLB reader (D4a: ships NOWHERE, ~35 lines) --------
// An asset-INTEGRITY fence for the spike: unlike a future shipped loader
// (whose NEVER-throws law belongs to the wiring story), this reader THROWS on
// malformed bytes — every §a red-path leg exercises that contract by name.

const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const CHUNK_JSON = 0x324f5347;
const CHUNK_BIN = 0x004e4942;

function readGlb(bytes) {
  if (bytes.byteLength < 12) throw new Error('glb: header truncated');
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(0, true) !== GLB_MAGIC) throw new Error('glb: bad magic');
  if (dv.getUint32(4, true) !== GLB_VERSION) throw new Error('glb: version must be 2');
  if (dv.getUint32(8, true) !== bytes.byteLength) throw new Error('glb: length mismatch');
  const jsonLen = dv.getUint32(12, true);
  if (dv.getUint32(16, true) !== CHUNK_JSON) throw new Error('glb: first chunk must be JSON');
  if (jsonLen % 4 !== 0) throw new Error('glb: JSON chunk misaligned');
  if (20 + jsonLen > bytes.byteLength) throw new Error('glb: JSON chunk truncated');
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLen)));
  const bin = { bytes: new Uint8Array(0) };
  const at = 20 + jsonLen;
  if (at < bytes.byteLength) {
    const binLen = dv.getUint32(at, true);
    if (dv.getUint32(at + 4, true) !== CHUNK_BIN) throw new Error('glb: second chunk must be BIN');
    if (at + 8 + binLen > bytes.byteLength) throw new Error('glb: BIN chunk truncated');
    bin.bytes = bytes.subarray(at + 8, at + 8 + binLen);
  }
  return { json, bin: bin.bytes };
}

// Non-indexed TRIANGLES only (the probe format's single primitive shape):
// every accessor's count contributes count / 3 triangles.
function triangleCount(json) {
  let tris = 0;
  for (const mesh of json.meshes) {
    for (const prim of mesh.primitives) {
      tris += json.accessors[prim.attributes.POSITION].count / 3;
    }
  }
  return tris;
}

// ---------- boot machinery (donor: tests/render3d.test.js, COPIED per D5) ----

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
  'export class Mesh extends Node {',
  '  constructor(geometry, material) { super(); this.material = material; }',
  '}'
].join('\n'));

const stubCanvas = { width: 480, height: 640 };

// jiggleOff flips the CHEST_JIGGLE switch TEST-LOCALLY (D7's graceful-fall-off
// boot): the same data-URL text mechanism as the import rewrites; nothing
// shipped changes — js/render3d.js stays byte-identical by diff fact.
async function loadStubbedCreateScene(jiggleOff = false) {
  let src = await readFile(render3dPath, 'utf8');
  if (jiggleOff) src = src.replace('const CHEST_JIGGLE = true', 'const CHEST_JIGGLE = false');
  const rewritten = src
    .replace(/from\s*['"]three['"]/, `from '${THREE_STUB_HREF}'`)
    .replace(/from\s*['"][^'"]*interpolate\.js['"]/, `from '${interpolateHref}'`);
  const mod = await import('data:text/javascript,' + encodeURIComponent(rewritten));
  return mod.createScene;
}

// rig and ropePivot are the world scene's two 3-children Groups: the rig
// parents three child Groups, the pivot three Meshes (both fingerprints
// unique among the stub children) — donor walk, tests/render3d.test.js.
function rigAndPivot(worldScene) {
  const trios = worldScene.children.filter(c => (c.children?.length ?? 0) === 3);
  const rigs = trios.filter(g => g.children.every(c => !c.material));
  const pivots = trios.filter(g => g.children.every(c => c.material));
  assert.strictEqual(rigs.length, 1, 'exactly one rig-shaped Group in the stub world');
  assert.strictEqual(pivots.length, 1, 'exactly one ropePivot-shaped Group in the stub world');
  return { rig: rigs[0], pivot: pivots[0] };
}

// derive-don't-retype (row (f)): every shipped number the legs consume comes
// out of the renderer source, never re-typed here.
const render3dSrc = await readFile(render3dPath, 'utf8');
function sourceNumber(label, re) {
  const m = render3dSrc.match(re);
  assert.ok(m, `the ${label} law is present in js/render3d.js source`);
  return Number(m[1]);
}
const K = {
  WORLD_PER_PIXEL: sourceNumber('world mapping', /const WORLD_PER_PIXEL = ([0-9.]+)/),
  HANDLE_HEIGHT: sourceNumber('handle height', /const HANDLE_HEIGHT = ([0-9.]+)/),
  HANDLE_SPAN: sourceNumber('handle span', /const HANDLE_SPAN = ([0-9.]+)/),
  CHEST_BASE_Y: sourceNumber('chest base', /const CHEST_BASE_Y = ([0-9.]+)/),
  JIGGLE_CLAMP: sourceNumber('jiggle clamp', /const JIGGLE_CLAMP = ([0-9.]+)/),
  ARM_SWING: sourceNumber('arm swing', /armL\.rotation\.x = Math\.sin\(theta\) \* ([0-9.]+)/),
  TUCK_L: sourceNumber('left tuck', /legL\.rotation\.x = airborne \? (-?[0-9.]+) : 0/),
  TUCK_R: sourceNumber('right tuck', /legR\.rotation\.x = airborne \? (-?[0-9.]+) : 0/),
  ARM_REST_Z: sourceNumber('arm rest', /armL\.rotation\.z = (-?[0-9.]+)/),
  ARM_REST_Z_R: sourceNumber('arm rest mirror', /armR\.rotation\.z = (-?[0-9.]+)/),
};
const scarfLaw = render3dSrc.match(/scarf\[k\]\.rotation\.x = Math\.sin\(beat - k \* ([0-9.]+)\) \* ([0-9.]+)/);
assert.ok(scarfLaw, 'the scarf lag law is present in js/render3d.js source');
const SCARF_LAG = Number(scarfLaw[1]);
const SCARF_AMP = Number(scarfLaw[2]);

// ---------- §d pose witness: the real pipeline, the canonical schedule -------

const probeCommitted = await readFile(probePath);
const probeJson = readGlb(probeCommitted).json;

async function collectPoseSamples(jiggleOff) {
  const createScene = await loadStubbedCreateScene(jiggleOff);
  globalThis.__render3dScenes = [];
  const scene = createScene(stubCanvas);
  const [world] = globalThis.__render3dScenes;
  const { rig, pivot } = rigAndPivot(world);
  const targets = contractTargets({ rig, pivot });
  const { bound } = bindProbe(probeJson.nodes, targets);
  let { rope, player, run } = startRun([]);
  const samples = [];
  for (let tick = 0; tick <= WARMUP + (COUNT - 1) * STRIDE; tick++) {
    assert.equal(run.status, 'running', `the canonical schedule must never trip (tick ${tick})`);
    if (player.grounded && rope.phase >= JUMP_LO && rope.phase <= JUMP_HI) {
      player = jump(player, 0.5);
    }
    const prevPhase = rope.phase;
    const view = {
      run, rope, player, prevPhase, alpha: 0, best: 0,
      now: (tick / 120) * 1000, reducedMotion: false,
    };
    scene.render(view);
    if (tick >= WARMUP && (tick - WARMUP) % STRIDE === 0) {
      samples.push({
        prevPhase, phase: rope.phase, playerY: player.y, squash: player.squash ?? 1,
        pose: {
          pivotX: pivot.rotation.x, pivotY: pivot.position.y,
          rigY: rig.position.y, rigSX: rig.scale.x, rigSY: rig.scale.y, rigSZ: rig.scale.z,
          armL: bound.armL.rotation.x, armR: bound.armR.rotation.x,
          legL: bound.legL.rotation.x, legR: bound.legR.rotation.x,
          scarf0: bound.scarf0.rotation.x, scarf1: bound.scarf1.rotation.x,
          scarf2: bound.scarf2.rotation.x, chestY: bound.chest.position.y,
        },
      });
    }
    ({ run, rope, player } = tickRun(run, rope, player, STEP, CONST_RNG,
      tick % PRESS_EVERY === 0 ? 'edge' : null));
  }
  return { samples, rig, pivot, targets, bound, endStatus: run.status };
}

const pose = await collectPoseSamples(false);
const poseOff = await collectPoseSamples(true);

// Recompute EVERY posed channel from the sample's own view fields through the
// SAME lerpPhase the pipeline consumed — then assert === (zero tolerance:
// identity, not tolerance — the bound targets ARE the shipped rig objects).
function assertChannels(p, label) {
  for (let i = 0; i < p.samples.length; i++) {
    const s = p.samples[i];
    const theta = lerpPhase(s.prevPhase, s.phase, 0) * Math.PI * 2;
    const at = ch => `sample ${i}, ${label}, channel ${ch}`;
    assert.equal(s.pose.pivotX, theta, at('pivot.rotation.x'));
    assert.equal(s.pose.pivotY, K.HANDLE_HEIGHT + s.pose.rigY, at('pivot.position.y'));
    assert.equal(s.pose.rigY, s.playerY * K.WORLD_PER_PIXEL, at('rig.position.y'));
    assert.equal(s.pose.rigSX, 1 / s.squash, at('rig.scale.x'));
    assert.equal(s.pose.rigSY, s.squash, at('rig.scale.y'));
    assert.equal(s.pose.rigSZ, 1 / s.squash, at('rig.scale.z'));
    assert.equal(s.pose.armL, Math.sin(theta) * K.ARM_SWING, at('armL.rotation.x'));
    assert.equal(s.pose.armR, -Math.sin(theta) * K.ARM_SWING, at('armR.rotation.x'));
    assert.equal(s.pose.legL, s.playerY > 0 ? K.TUCK_L : 0, at('legL.rotation.x'));
    assert.equal(s.pose.legR, s.playerY > 0 ? K.TUCK_R : 0, at('legR.rotation.x'));
    assert.equal(s.pose.scarf0, Math.sin(theta - 0 * SCARF_LAG) * SCARF_AMP, at('scarf0.rotation.x'));
    assert.equal(s.pose.scarf1, Math.sin(theta - 1 * SCARF_LAG) * SCARF_AMP, at('scarf1.rotation.x'));
    assert.equal(s.pose.scarf2, Math.sin(theta - 2 * SCARF_LAG) * SCARF_AMP, at('scarf2.rotation.x'));
  }
}

// ============================================================================
// §a — reader contract (red-green on hand-built buffers; a THROWING integrity
//    fence BY DESIGN — the NEVER-throws law is a shipped loader's problem)
// ============================================================================

function buildGlb(jsonText, bin = new Uint8Array(0)) {
  const jsonBytes = new TextEncoder().encode(jsonText);
  const jsonPadded = Math.ceil(jsonBytes.length / 4) * 4;
  const binPadded = Math.ceil(bin.byteLength / 4) * 4;
  const bytes = new Uint8Array(12 + 8 + jsonPadded + 8 + binPadded);
  const dv = new DataView(bytes.buffer);
  dv.setUint32(0, GLB_MAGIC, true);
  dv.setUint32(4, GLB_VERSION, true);
  dv.setUint32(8, bytes.length, true);
  dv.setUint32(12, jsonPadded, true);
  dv.setUint32(16, CHUNK_JSON, true);
  bytes.fill(0x20, 20 + jsonBytes.length, 20 + jsonPadded);
  bytes.set(jsonBytes, 20);
  dv.setUint32(20 + jsonPadded, binPadded, true);
  dv.setUint32(24 + jsonPadded, CHUNK_BIN, true);
  bytes.set(bin, 28 + jsonPadded);
  return bytes;
}

const MINIMAL_JSON = JSON.stringify({
  asset: { version: '2.0' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ name: 'a', mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] }],
  bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36, target: 34962 }],
  buffers: [{ byteLength: 36 }],
});

test('§a factory convention: the generator and the reader are pure functions (AC2)', () => {
  assert.equal(typeof makeProbeGlb, 'function', 'the generator is an exported function');
  assert.equal(typeof readGlb, 'function', 'the reader is a suite-internal function');
  const bytes = makeProbeGlb();
  assert.ok(bytes instanceof Uint8Array, 'makeProbeGlb returns raw bytes, zero IO');
  assert.equal(bytes.byteLength % 4, 0, 'GLB is always 4-byte aligned');
});

test('§a reader: a hand-built valid minimal GLB parses (nodes/meshes/accessors)', () => {
  const bin = new Uint8Array(36);
  const parsed = readGlb(buildGlb(MINIMAL_JSON, bin));
  assert.equal(parsed.json.nodes.length, 1);
  assert.equal(parsed.json.meshes.length, 1);
  assert.equal(parsed.json.accessors.length, 1);
  assert.equal(parsed.bin.byteLength, 36, 'the BIN chunk comes back byte-sized');
  assert.equal(triangleCount(parsed.json), 1, 'one 3-vertex primitive = one triangle');
});

test('§a reader: triangleCount sums 1-, 2-, and 3-primitive meshes', () => {
  const acc = count => ({ bufferView: 0, componentType: 5126, count, type: 'VEC3' });
  const mesh = (...counts) => ({ primitives: counts.map(c => ({ attributes: { POSITION: c.i } })) });
  const json = {
    accessors: [acc(3), acc(6), acc(9), acc(6)],
    meshes: [
      mesh({ i: 0 }),
      mesh({ i: 1 }, { i: 2 }),
      mesh({ i: 3 }, { i: 1 }, { i: 0 }),
    ],
  };
  assert.equal(triangleCount(json), 1 + 5 + 5, 'sum over meshes of accessor.count / 3');
});

test('§a reader: a JSON chunk reaching past EOF throws — asset-integrity fence', () => {
  const jsonBytes = new TextEncoder().encode(MINIMAL_JSON);
  const jsonPadded = Math.ceil(jsonBytes.length / 4) * 4;
  const file = new Uint8Array(20 + jsonPadded); // header + JSON chunk, nothing after
  const dv = new DataView(file.buffer);
  dv.setUint32(0, GLB_MAGIC, true);
  dv.setUint32(4, GLB_VERSION, true);
  dv.setUint32(8, file.length, true);
  dv.setUint32(12, jsonPadded + 8, true); // claims eight bytes the file does not have
  dv.setUint32(16, CHUNK_JSON, true);
  file.set(jsonBytes, 20);
  file.fill(0x20, 20 + jsonBytes.length);
  assert.throws(() => readGlb(file), /JSON chunk truncated/);
});

test('§a reader: bad magic throws — asset-integrity fence', () => {
  const bytes = buildGlb(MINIMAL_JSON);
  bytes[1] ^= 0xff;
  assert.throws(() => readGlb(bytes), /bad magic/);
});

test('§a reader: version other than 2 throws — asset-integrity fence', () => {
  const bytes = buildGlb(MINIMAL_JSON);
  new DataView(bytes.buffer).setUint32(4, 1, true);
  assert.throws(() => readGlb(bytes), /version/);
});

test('§a reader: a truncated header throws — asset-integrity fence', () => {
  assert.throws(() => readGlb(buildGlb(MINIMAL_JSON).subarray(0, 8)), /header truncated/);
});

test('§a reader: a JSON chunk length off the 4-byte alignment throws — fence', () => {
  const bytes = buildGlb(MINIMAL_JSON);
  const jsonLen = new DataView(bytes.buffer).getUint32(12, true);
  new DataView(bytes.buffer).setUint32(12, jsonLen + 1, true);
  assert.throws(() => readGlb(bytes), /misaligned/);
});

test('§a reader: a non-JSON first chunk throws — asset-integrity fence', () => {
  const bytes = buildGlb(MINIMAL_JSON);
  new DataView(bytes.buffer).setUint32(16, CHUNK_BIN, true);
  assert.throws(() => readGlb(bytes), /first chunk must be JSON/);
});

// ============================================================================
// §b — contract table + inventory (AC1): names, distinctness, mirror, rest
// ============================================================================

const boot = (await (async () => {
  const createScene = await loadStubbedCreateScene(false);
  globalThis.__render3dScenes = [];
  const scene = createScene(stubCanvas);
  const { rig, pivot } = rigAndPivot(globalThis.__render3dScenes[0]);
  return { rig, pivot, targets: contractTargets({ rig, pivot }) };
})());

test('§b the CONTRACT table carries EXACTLY the 17 published names (AC1)', () => {
  assert.deepEqual(Object.keys(boot.targets).sort(), CONTRACT_NAMES.slice().sort(),
    'the identity-addressed table is the published contract, no name drift');
  assert.deepEqual(Object.keys(CONTRACT_PARENT).sort(), CONTRACT_NAMES.slice().sort(),
    'every published name has exactly one parent edge');
});

test('§b every name resolves through the boot world to a DISTINCT rig object', () => {
  const objects = CONTRACT_NAMES.map(name => {
    const target = boot.targets[name];
    assert.ok(target && typeof target === 'object', `contract name ${name} resolves`);
    return target;
  });
  assert.equal(new Set(objects).size, CONTRACT_NAMES.length,
    'pairwise distinct — two names on one object would mean a path drifted');
});

test('§b the probe mirrors the contract hierarchy (parent edges + root order)', () => {
  const parentOf = new Map();
  for (const node of probeJson.nodes) {
    for (const child of node.children ?? []) parentOf.set(probeJson.nodes[child].name, node.name);
  }
  for (const index of probeJson.scenes[0].nodes) parentOf.set(probeJson.nodes[index].name, null);
  for (const name of CONTRACT_NAMES) {
    assert.equal(parentOf.get(name), CONTRACT_PARENT[name],
      `probe parent edge of ${name} equals the contract's`);
  }
  assert.deepEqual(probeJson.scenes[0].nodes.map(i => probeJson.nodes[i].name), SCENE_ROOT_ORDER,
    'scene roots appear in shipped build order');
});

test('§b bind-pose agreement: every probe translation === the shipped rest', () => {
  for (const node of probeJson.nodes) {
    const target = boot.targets[node.name];
    assert.ok(target, `probe node ${node.name} names a contract joint`);
    assert.equal(node.translation.length, 3);
    assert.equal(node.translation[0], Math.fround(target.position.x), `translation.x of ${node.name}`);
    assert.equal(node.translation[1], Math.fround(target.position.y), `translation.y of ${node.name}`);
    assert.equal(node.translation[2], Math.fround(target.position.z), `translation.z of ${node.name}`);
  }
});

test('§b the shipped rest channels hold the contract law values (boot, never rendered)', () => {
  assert.equal(boot.targets.armL.rotation.z, K.ARM_REST_Z, 'armL rest rotation.z');
  assert.equal(boot.targets.armR.rotation.z, K.ARM_REST_Z_R, 'armR mirrors the same law');
  assert.equal(boot.targets.chest.position.x, 0);
  assert.equal(boot.targets.chest.position.y, K.CHEST_BASE_Y, 'chest rides CHEST_BASE_Y at rest');
  assert.equal(boot.targets.chest.position.z, 0);
  assert.equal(boot.targets.handleL.position.x, -K.HANDLE_SPAN, 'handleL sits at -HANDLE_SPAN');
  assert.equal(boot.targets.handleR.position.x, K.HANDLE_SPAN, 'handleR mirrors the span');
});

// ============================================================================
// §c — bind bijection + determinism + placement (AC2 first half, AC5)
// ============================================================================

test('§c bind bijection: the probe covers all 17, unbound EMPTY, aliases impossible', () => {
  const { bound, unbound } = bindProbe(probeJson.nodes, boot.targets);
  assert.deepEqual(Object.keys(bound).sort(), CONTRACT_NAMES.slice().sort(),
    'every published joint has a probe node and every probe node binds');
  assert.deepEqual(unbound, [], 'the spike probe matches the contract EXACTLY');
  const targets = CONTRACT_NAMES.map(name => bound[name]);
  assert.equal(new Set(targets).size, CONTRACT_NAMES.length, 'distinct bound targets');
  for (const name of CONTRACT_NAMES) {
    assert.equal(bound[name], boot.targets[name], `bound ${name} is the §b-resolved object`);
  }
});

test('§c determinism: regeneration IN MEMORY byte-equals the committed probe', () => {
  assert.ok(Buffer.compare(Buffer.from(makeProbeGlb()), probeCommitted) === 0,
    'committed bytes must be generator output — drift reddens here forever');
});

test('§c the committed probe lives under the static-host size budget', () => {
  assert.ok(probeCommitted.byteLength > 0 && probeCommitted.byteLength <= PROBE_GLB_MAX_BYTES,
    `probe.glb is ${probeCommitted.byteLength} B, budget ${PROBE_GLB_MAX_BYTES} B (track1-style)`);
});

test('§c placement law: the probe is test-side and exists nowhere else', async () => {
  const fixtures = await readdir(resolve(testsDir, 'fixtures'));
  assert.ok(fixtures.includes('probe.glb'), 'tests/fixtures/probe.glb is the home');
  assert.deepEqual(fixtures.filter(n => n.endsWith('.glb')), ['probe.glb'],
    'exactly one .glb in the fixtures directory');
  const jsFiles = await readdir(jsDir);
  assert.deepEqual(jsFiles.filter(n => n.endsWith('.glb')), [],
    'zero .glb in js/ — no shipped code path loads it (AC5, NFR14)');
  const audioFiles = await readdir(resolve(testsDir, '..', 'audio'));
  assert.deepEqual(audioFiles.filter(n => n.endsWith('.glb')), [], 'the probe never lives under audio/');
  const assetsAbsent = await readdir(resolve(testsDir, '..', 'assets')).then(() => false, () => true);
  assert.ok(assetsAbsent, 'assets/ must not exist (D3 placement law)');
});

// ============================================================================
// §d — pose through the REAL pipeline, identity at every sample (AC2 second
//      half): the bound probe's channels === the recomputed shipped law
// ============================================================================

test('§d every asserted target is the CONTRACT-bound shipped object by reference', () => {
  assert.equal(pose.bound.torso, pose.rig.children[0], 'bound torso IS the rig-path object');
  assert.equal(pose.bound.armL, pose.rig.children[0].children[2], 'bound armL IS the pose-probe path');
  assert.equal(pose.bound.legR, pose.rig.children[2], 'bound legR IS the rig-path object');
  assert.equal(pose.bound.handleR, pose.pivot.children[2], 'bound handleR IS the pivot-path object');
  for (const name of CONTRACT_NAMES) {
    assert.equal(pose.bound[name], pose.targets[name], `bound ${name} === the CONTRACT target`);
  }
});

test('§d channel-for-channel === the recomputed law at every sample, zero tolerance', () => {
  assertChannels(pose, 'running schedule');
});

test('§d coverage relations over the sampled run (count, span, branch mix)', () => {
  assert.equal(pose.samples.length, COUNT, 'the schedule produced its sample count');
  const phases = pose.samples.map(s => s.phase);
  assert.ok(Math.max(...phases) >= 0.9, 'the sampled phases reach the back of the revolution');
  assert.ok(Math.min(...phases) < 0.1, 'the sampled phases cross the wrap to the front');
  assert.ok(pose.samples.some(s => s.playerY > 0), 'at least one airborne (tuck) sample');
  assert.ok(pose.samples.some(s => s.playerY === 0), 'at least one grounded sample');
});

test('§d the chest spring stays inside CHEST_BASE_Y +/- JIGGLE_CLAMP, always finite', () => {
  pose.samples.forEach((s, i) => {
    assert.ok(Number.isFinite(s.pose.chestY), `chest y finite at sample ${i}`);
    assert.ok(Math.abs(s.pose.chestY - K.CHEST_BASE_Y) <= K.JIGGLE_CLAMP,
      `chest offset within clamp at sample ${i}`);
  });
});

test('§d status stayed running for the whole sampled run (the sampled branch)', () => {
  assert.equal(pose.endStatus, 'running');
  assert.equal(pose.samples.length, COUNT, 'the run never left the running branch early');
});

// ============================================================================
// §e — graceful fall-off (AC2, D7): missing targets drop, extras drop, no throw
// ============================================================================

test('§e jiggle-off boot: bind reports chestL/chestR UNBOUND, binds the other 15', () => {
  assert.deepEqual(Object.keys(poseOff.bound).sort(),
    CONTRACT_NAMES.filter(n => n !== 'chestL' && n !== 'chestR').sort(),
    'the 15 resolvable names bind through');
  assert.deepEqual(poseOff.bound.chestL, undefined, 'chestL fell off gracefully (prop absent)');
  assert.deepEqual(poseOff.bound.chestR, undefined, 'chestR fell off gracefully (prop absent)');
});

test('§e jiggle-off schedule: every law still holds; the dead spring sits at endpoint', () => {
  assertChannels(poseOff, 'jiggle-off schedule');
  poseOff.samples.forEach((s, i) => {
    assert.equal(s.pose.chestY, K.CHEST_BASE_Y,
      `chest at the still endpoint (spring dead) at sample ${i}`);
  });
});

test('§e synthetic probes: an artist scarf4 unbinds, a short scarf chain drops silently', () => {
  const withExtra = bindProbe(
    probeJson.nodes.concat([{ name: 'scarf4' }]), boot.targets);
  assert.deepEqual(withExtra.unbound, ['scarf4'], 'the 5-segment chain drops its extras, no throw');
  assert.equal(Object.keys(withExtra.bound).length, CONTRACT_NAMES.length, 'the contract set still binds');
  const shortChain = bindProbe(
    probeJson.nodes.filter(n => !n.name.startsWith('scarf')), boot.targets);
  assert.deepEqual(shortChain.unbound, [], 'a probe missing names unbinds NOTHING loudly');
  assert.equal(Object.keys(shortChain.bound).length, CONTRACT_NAMES.length - 3,
    'absent probe nodes simply have zero consumers (D7 structure law)');
});

// ============================================================================
// §f — triangle budget both-sides-derived + NFR10 zero-bitmap (AC3)
// ============================================================================

const BOX_TRIS = 12; // BoxGeometry = 12 triangles BY CONSTRUCTION (D6 law)

function rigMeshCount(rig) {
  let count = 0;
  const stack = [...rig.children];
  while (stack.length > 0) {
    const node = stack.pop();
    if ('material' in node) count += 1;
    stack.push(...(node.children ?? []));
  }
  return count;
}

test('§f the budget leg: probe triangles > 0 and within the derived shipped count', () => {
  const probeTris = triangleCount(probeJson);
  const handleTris = CONTRACT_NAMES.filter(n => n.startsWith('handle')).length * BOX_TRIS;
  const shipTris = rigMeshCount(boot.rig) * BOX_TRIS + handleTris;
  assert.ok(probeTris > 0 && probeTris <= shipTris,
    `triangle budget: probe ${probeTris} vs shipped rig ${shipTris} (NFR10 few-hundred law)`);
});

test('§f boot-walk and source-census derive the SAME shipped mesh count', () => {
  const start = render3dSrc.indexOf('// Character rig (D-13)');
  const end = render3dSrc.indexOf('// Rope (D-08/D-10)');
  assert.ok(start >= 0 && end > start, 'the rig-block markers fence the census slice');
  const slice = render3dSrc.slice(start, end);
  const literalSites = (slice.match(/new THREE\.Mesh\(/g) ?? []).length;
  const scarfLoop = slice.match(/for \(let k = 0; k < (\d+); k\+\+\)/);
  assert.ok(scarfLoop, 'the scarf loop inside the rig block is present');
  const instances = literalSites + (Number(scarfLoop[1]) - 1); // seg meshes build IN the loop
  assert.equal(rigMeshCount(boot.rig), instances,
    'boot-walk instances must equal the rig-block source census');
});

test('§f zero-bitmap: the probe declares no images, textures, or materials', () => {
  assert.equal(probeJson.images, undefined, 'no images entry (NFR10 NOT amended)');
  assert.equal(probeJson.textures, undefined, 'no textures entry');
  assert.equal(probeJson.materials, undefined, 'no materials entry');
  assert.equal(probeJson.buffers.length, 1, 'exactly one buffer');
  assert.ok(!('uri' in probeJson.buffers[0]), 'the single buffer is the embedded BIN chunk, never base64/uri');
  for (const mesh of probeJson.meshes) {
    for (const prim of mesh.primitives) {
      assert.ok(!('material' in prim), 'primitive carries no material key');
    }
  }
});

test('§f zero-bitmap byte scan: no PNG or JPEG magic anywhere in the probe', () => {
  const find = bytes => seq => {
    outer: for (let i = 0; i + seq.length <= bytes.length; i++) {
      if (seq.every((v, j) => bytes[i + j] === v)) return true;
    }
    return false;
  };
  const hit = find(probeCommitted);
  assert.equal(hit([0x89, 0x50, 0x4e, 0x47]), false, 'no PNG signature');
  assert.equal(hit([0xff, 0xd8]), false, 'no JPEG SOI marker');
});
