// Story 8.4 (D3): the probe generator — a PURE module (zero IO, zero Date,
// zero Math.random, zero import specifiers): makeProbeGlb() returns the exact
// committed bytes of tests/fixtures/probe.glb, and the §c determinism leg in
// tests/glbspike.test.js regenerates in memory and asserts byte-equality, so
// drift is caught forever in the gate. Plain Node only (ArrayBuffer/DataView/
// TextEncoder — NFR6, no deps).
//
// The joint names, parent edges, and rest translations are VERBATIM from the
// published contract table in the 8.4 story file (§Contract — the FR38
// artifact). Translations are Float32-rounded on the way into the JSON chunk
// (glTF stores node translations as float32), which is what makes the §b
// bind-pose legs' `Math.fround(shippedValue)` comparison exact.

const GLB_MAGIC = 0x46546c67; // 'glTF'
const GLB_VERSION = 2;
const CHUNK_JSON = 0x324f5347; // 'JSON'
const CHUNK_BIN = 0x004e4942; // 'BIN\0'
const POSITION = 0; // the one accessor — the quad below is the whole asset

// The probe's ONLY geometry: a two-triangle unit quad, fixed literal — no RNG,
// no dates anywhere in this file (byte-determinism is the law). 16 meshes share
// it; triangleCount = 16 x 2 = 32, DERIVED by the §f legs, never retyped here.
const QUAD = [
  0, 0, 0, 1, 0, 0, 1, 0, 1,
  0, 0, 0, 1, 0, 1, 0, 0, 1,
];

// Contract-table rows in table order: [name, parent | null (scene root), rest
// translation]. 'null' roots are the rig root (torso/legs) and the rope pivot
// (handles) in the shipped world — the probe mirrors the contract hierarchy.
const ROWS = [
  ['torso', null, [0, 0.35, 0]],
  ['head', 'torso', [0, 0.4, 0]],
  ['cap', 'head', [0, 0.58, 0]],
  ['eyeL', 'head', [-0.12, 0.3, 0.28]],
  ['eyeR', 'head', [0.12, 0.3, 0.28]],
  ['scarf0', 'head', [0, 0.4, -0.3]],
  ['scarf1', 'scarf0', [0, -0.12, -0.06]],
  ['scarf2', 'scarf1', [0, -0.12, -0.06]],
  ['armL', 'torso', [-0.24, 0.27, 0]],
  ['armR', 'torso', [0.24, 0.27, 0]],
  ['legL', null, [-0.1, 0.35, 0]],
  ['legR', null, [0.1, 0.35, 0]],
  ['chest', 'torso', [0, 0.28, 0]],
  ['chestL', 'chest', [-0.09, 0, 0.14]],
  ['chestR', 'chest', [0.09, 0, 0.14]],
  ['handleL', null, [-0.5, 0, 0]],
  ['handleR', null, [0.5, 0, 0]],
];

// Scene roots in shipped build order: the rig's children, then the pivot's.
const ROOTS = ['torso', 'legL', 'legR', 'handleL', 'handleR'];

// The chest joint is a pure group (the spring rides it); every other contract
// name carries a mesh (D3: 16 nodes, 16 meshes).
function hasMesh(name) {
  return name !== 'chest';
}

export function makeProbeGlb() {
  const indexOf = new Map(ROWS.map(([name], i) => [name, i]));
  let meshCount = 0;
  const meshOf = new Map(ROWS.map(([name]) => [name, hasMesh(name) ? meshCount++ : -1]));
  const nodes = ROWS.map(([name, parent, translation]) => {
    const node = { name, translation: translation.map(Math.fround) };
    const children = ROWS.flatMap(([n, p], i) => (p === name ? [i] : []));
    if (children.length > 0) node.children = children;
    if (hasMesh(name)) node.mesh = meshOf.get(name);
    return node;
  });
  // POSITION accessor min/max derived from QUAD (never retyped literals).
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < QUAD.length; i++) {
    const c = i % 3;
    min[c] = Math.min(min[c], QUAD[i]);
    max[c] = Math.max(max[c], QUAD[i]);
  }
  const binByteLength = QUAD.length * 4;
  const json = {
    asset: { version: '2.0', generator: 'jumprope-web tests/fixtures/make-probe-glb.js' },
    scene: 0,
    scenes: [{ name: 'contract', nodes: ROOTS.map((name) => indexOf.get(name)) }],
    nodes,
    meshes: ROWS.filter(([name]) => hasMesh(name)).map(() => ({
      primitives: [{ attributes: { POSITION } }], // mode absent = TRIANGLES, non-indexed
    })),
    accessors: [{
      bufferView: 0, componentType: 5126, count: QUAD.length / 3, type: 'VEC3', min, max,
    }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: binByteLength, target: 34962 }],
    buffers: [{ byteLength: binByteLength }], // no uri: the single embedded BIN chunk
  };

  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPadded = Math.ceil(jsonBytes.length / 4) * 4; // 0x20 padding (spec)
  const binPadded = Math.ceil(binByteLength / 4) * 4; // 0x00 padding (already aligned)
  const bytes = new Uint8Array(12 + 8 + jsonPadded + 8 + binPadded);
  const dv = new DataView(bytes.buffer);
  dv.setUint32(0, GLB_MAGIC, true);
  dv.setUint32(4, GLB_VERSION, true);
  dv.setUint32(8, bytes.length, true);
  dv.setUint32(12, jsonPadded, true);
  dv.setUint32(16, CHUNK_JSON, true);
  bytes.fill(0x20, 20 + jsonBytes.length, 20 + jsonPadded);
  bytes.set(jsonBytes, 20);
  const binAt = 20 + jsonPadded;
  dv.setUint32(binAt, binPadded, true);
  dv.setUint32(binAt + 4, CHUNK_BIN, true);
  for (let i = 0; i < QUAD.length; i++) dv.setFloat32(binAt + 8 + i * 4, QUAD[i], true);
  return bytes;
}
