import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Story 8.3 (FR36, P1 = cosmetic-only schema v1 + whole-manifest fallback):
// mods are DATA. A manifest is one read, one parse, one strict validator — its
// optional skin composes into Story 8.2's equip expression at the ONE boot
// site through Story 8.1's seam (normalizeSkin -> createScene's ONE
// application site; render3d.js is byte-zero this story). Every violation —
// parse error, unknown key, wrong type, out-of-range color, oversized
// payload, non-OK response, rejected read, absent channel, path-law miss —
// drops the WHOLE manifest to shipped defaults in total silence (UX-DR2,
// NFR16). Nothing a manifest carries is ever executed: the data-only law has
// its own red-green tripwire legs (§e). The frozen 632 are the
// untouched-green proof (the ONE authorized re-contract R1 lives inside
// equip.test.js §e — this suite adds zero further frozen edits).
//
// shell.js cannot be imported (boot IO), so the shipped function text IS the
// seam under test (the equip.test.js:143-162 cross-source extraction donor —
// the pairing fence: a silent delete or rename reddens here). The loader is
// assembled by CONCATENATING the extracted sources — the loader references
// the validator BY NAME, so the bundle under test keeps the shipped wiring.
// Boot craft donor: equip.test.js:115-129 (bootSkin) + :177-186 (withLocation
// — stub set IMMEDIATELY before the boot, ALWAYS restored in finally; a
// leaked read channel would retint later suites' request legs). Fixes are
// JSON TEXT literals inside this suite (AC5 — no DOM anywhere, no fixture
// files beyond the committed mods/mint.json asset leg).

const testsDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(testsDir, '..');
const jsDir = resolve(rootDir, 'js');
const render3dPath = resolve(jsDir, 'render3d.js');
const shellPath = resolve(jsDir, 'shell.js');
const modsAssetPath = resolve(rootDir, 'mods', 'mint.json');
const interpolateHref = pathToFileURL(resolve(jsDir, 'interpolate.js')).href;

const THREE_MODS_STUB_HREF = 'data:text/javascript,' + encodeURIComponent([
  'export const NearestFilter = 1003;',
  'globalThis.__modsReg ||= { scenes: [], meshes: [], materials: [], geometries: [], targets: [], colorSets: 0 };',
  'const reg = globalThis.__modsReg;',
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
  // Color RECORDS (areavistas donor): birth keeps the construction value, hex
  // the live one; every .set() increments the write census.
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

let boots = 0;

// Boot the renderer through the seam: skin is the record-as-DATA argument
// (undefined = the inert shipped path every default boot takes).
async function bootSkin(skin, canvas = { width: 480, height: 640 }) {
  const src = await readFile(render3dPath, 'utf8');
  const rewritten = src
    .replace(/from\s*['"]three['"]/, `from '${THREE_MODS_STUB_HREF}'`)
    .replace(/from\s*['"][^'"]*interpolate\.js['"]/, `from '${interpolateHref}'`);
  const mod = await import('data:text/javascript,' + encodeURIComponent(`${rewritten}\n//mods boot ${++boots}`));
  const reg = globalThis.__modsReg;
  for (const k of Object.keys(reg)) reg[k] = Array.isArray(reg[k]) ? [] : 0;
  const scene = mod.createScene(canvas, skin);
  const world = reg.scenes[0];
  // IDENTITY-ADDRESS law: the character materials are the first three
  // constructions, in order rose, limb, prop (render3d.js:187-189).
  const mats = reg.materials.slice(0, 3);
  return { scene, reg, world, mats };
}

// Text-derive a shipped `const NAME = 0x...` value (equip:133-138 donor — the
// derive-literals rule: never re-type a signed-off hex in a test).
async function shippedConst(name) {
  const src = await readFile(render3dPath, 'utf8');
  const m = src.match(new RegExp(`const ${name} = (0x[0-9a-fA-F]+|0\\.\\d+)`));
  assert.ok(m, `the shipped look constant ${name} is present in js/render3d.js`);
  return Number(m[1]);
}

// Cross-source extraction (the equip §a donor family): the shipped factories
// ARE the mechanism under test. The loader + validator + path resolver + cap
// assemble in ONE bundle — the loader references the validator by NAME, so
// the shipped wiring survives the extraction (pairing fence).
async function modsFactories() {
  const src = await readFile(shellPath, 'utf8');
  const cap = src.match(/^const MOD_MANIFEST_MAX_BYTES = \d+;$/m);
  assert.ok(cap, 'the shipped MOD_MANIFEST_MAX_BYTES literal is present in js/shell.js at module scope (pairing fence)');
  const parse = src.match(/function parseModManifest\(text\) \{[\s\S]*?\n\}/);
  assert.ok(parse, 'the shipped parseModManifest factory is present in js/shell.js (pairing fence)');
  const mods = src.match(/function resolveModsParam\(search\) \{[\s\S]*?\n\}/);
  assert.ok(mods, 'the shipped resolveModsParam factory is present in js/shell.js (pairing fence)');
  const load = src.match(/async function loadModManifest\(url\) \{[\s\S]*?\n\}/);
  assert.ok(load, 'the shipped loadModManifest factory is present in js/shell.js (pairing fence)');
  return new Function(
    `${cap[0]}\n${parse[0]}\n${mods[0]}\n${load[0]};`
    + ' return { MOD_MANIFEST_MAX_BYTES, parseModManifest, resolveModsParam, loadModManifest };'
  )();
}

async function resolverFromShell() {
  const src = await readFile(shellPath, 'utf8');
  const m = src.match(/function resolveSkinParam\(search, table\) \{[\s\S]*?\n\}/);
  assert.ok(m, 'the shipped resolveSkinParam factory is present in js/shell.js (pairing fence)');
  return new Function(`${m[0]}; return resolveSkinParam;`)();
}

async function tableFromShell() {
  const src = await readFile(shellPath, 'utf8');
  const m = src.match(/^const SKINS = \{.*\};$/m);
  assert.ok(m, 'the shipped SKINS table literal is present in js/shell.js at module scope (pairing fence)');
  return new Function(`${m[0]} return SKINS;`)();
}

async function normalizeSkinFromShell() {
  const src = await readFile(shellPath, 'utf8');
  const m = src.match(/function normalizeSkin\(raw\) \{[\s\S]*?\n\}/);
  assert.ok(m, 'the shipped normalizeSkin factory is present in js/shell.js (pairing fence)');
  return new Function(`${m[0]}; return normalizeSkin;`)();
}

// The 8.1 legibility-certified witness, derived from its frozen source line
// (skins.test.js:170) — never re-typed here; drift reddens this fence.
async function mintWitness() {
  const src = await readFile(resolve(testsDir, 'skins.test.js'), 'utf8');
  const m = src.match(/^const MINT = \{ name: 'mint', colors: \{ rose: (0x[0-9a-f]+), prop: (0x[0-9a-f]+), limb: (0x[0-9a-f]+) \} \};$/m);
  assert.ok(m, 'the 8.1 MINT witness line is present in tests/skins.test.js (pairing fence)');
  return { name: 'mint', colors: { rose: Number(m[1]), prop: Number(m[2]), limb: Number(m[3]) } };
}

// The browser-shape location stub (equip :177-186 donor law): set IMMEDIATELY
// before the boot, ALWAYS restore in finally.
async function withLocation(search, fn) {
  const had = 'location' in globalThis;
  const prev = globalThis.location;
  globalThis.location = { search };
  try {
    return await fn();
  } finally {
    if (had) globalThis.location = prev; else delete globalThis.location;
  }
}

// The read-channel stub setter (Testing guidance §c): set immediately before
// the call, restored in finally — a LEAKED channel would change behavior for
// later suites' request legs (the Pitfall).
async function withFetch(stub, fn) {
  const had = 'fetch' in globalThis;
  const prev = globalThis.fetch;
  if (stub === undefined) delete globalThis.fetch;
  else globalThis.fetch = stub;
  try {
    return await fn();
  } finally {
    if (had) globalThis.fetch = prev; else delete globalThis.fetch;
  }
}

// A response over fixed JSON text: ok-flagged, byte-exact.
function responseFor(text, { ok = true } = {}) {
  return { ok, arrayBuffer: async () => new TextEncoder().encode(text).buffer };
}

// The §d mirror boot: the shipped module-scope seam VERBATIM (js/shell.js —
// the guard line + the ONE top-level await + the R1-pinned composition),
// test-local because shell.js cannot be imported. The text stays
// §e/R1-pairing: drift between mirror and shipped composition reddens §f's
// source fences.
async function mirrorBoot(search, serveText) {
  const { loadModManifest, resolveModsParam } = await modsFactories();
  const resolveSkinParam = await resolverFromShell();
  const normalizeSkin = await normalizeSkinFromShell();
  const SKINS = await tableFromShell();
  return withFetch(url => Promise.resolve(responseFor(serveText)), () =>
    withLocation(search, async () => {
      const equipSearch = typeof location !== 'undefined' && location.search ? location.search : '';
      const modManifest = await loadModManifest(resolveModsParam(equipSearch));
      return bootSkin(normalizeSkin(resolveSkinParam(equipSearch, SKINS) ?? modManifest?.skin));
    }));
}

// ---------------------------------------------------------------------------
// §a parseModManifest contract — Node-side, JSON fixtures as text
// (the factory-convention rule, architecture.md:154-156)
// ---------------------------------------------------------------------------

test('§a a VALID manifest parses whole: v 1, name, mint skin preserved (AC1)', async () => {
  const { parseModManifest } = await modsFactories();
  const MINT = await mintWitness(); // decimals DERIVED from the frozen witness, never re-typed
  const text = JSON.stringify({ v: 1, name: 'mint mod', skin: { name: 'mint', colors: MINT.colors } });
  const out = parseModManifest(text);
  assert.notEqual(out, null, 'the schema-v1 witness manifest is VALID');
  assert.equal(out.v, 1, 'v === 1 rides through');
  assert.equal(out.name, 'mint mod', 'the display name rides through');
  assert.deepEqual(out.skin, { name: 'mint', colors: MINT.colors },
    'the skin record survives the gate UNTOUCHED — the validator returns DATA, it does not restyle it');
  // skinless-but-valid is IN, not dropped (AC1: skin is the optional key).
  assert.notEqual(parseModManifest('{"v":1,"name":"plain mod"}'), null, 'a valid manifest WITHOUT skin parses');
});

test('§a the v law: strict integer 1 — missing/\'1\'/2/0/absent die (AC1/AC3)', async () => {
  const { parseModManifest } = await modsFactories();
  for (const text of ['{"name":"x"}', '{"v":"1","name":"x"}', '{"v":2,"name":"x"}', '{"v":0,"name":"x"}']) {
    let out;
    assert.doesNotThrow(() => { out = parseModManifest(text); }, `${text} must degrade, never throw`);
    assert.equal(out, null, `${text} — a whole-manifest drop: v is the STRICT integer 1 (D1)`);
  }
});

test('§a the name law: string 1..64 — missing/empty/65-char/number/null die, 64 rides (AC1)', async () => {
  const { parseModManifest } = await modsFactories();
  for (const text of ['{"v":1}', '{"v":1,"name":""}', '{"v":1,"name":42}', '{"v":1,"name":null}',
    `{"v":1,"name":"${'a'.repeat(65)}"}`]) {
    let out;
    assert.doesNotThrow(() => { out = parseModManifest(text); }, `${text} must degrade, never throw`);
    assert.equal(out, null, `${text.slice(0, 30)}… — name must be a 1..64-char string`);
  }
  assert.notEqual(parseModManifest(`{"v":1,"name":"${'a'.repeat(64)}"}`), null,
    'the 64-char boundary is INCLUSIVE — a maximal display name parses');
});

test('§a the skin-record law + the BH-4 falsifier: the VALIDATOR owns the 24-bit range (AC1)', async () => {
  const { parseModManifest } = await modsFactories();
  const normalizeSkin = await normalizeSkinFromShell();
  const colors = '"rose":8184715,"prop":1053983,"limb":10134706';
  const bad = [
    ['unknown record key', `{"v":1,"name":"m","skin":{"name":"m","hat":"x","colors":{${colors}}}}`],
    ['colors missing limb', `{"v":1,"name":"m","skin":{"name":"m","colors":{"rose":1,"prop":2}}}`],
    ['surplus color key', `{"v":1,"name":"m","skin":{"name":"m","colors":{${colors},"hat":3}}}`],
    ['rose above 0xFFFFFF', `{"v":1,"name":"m","skin":{"name":"m","colors":{"rose":16777216,"prop":2,"limb":3}}}`],
    ['prop negative', `{"v":1,"name":"m","skin":{"name":"m","colors":{"rose":-5,"prop":2,"limb":3}}}`],
    ['rose fractional', `{"v":1,"name":"m","skin":{"name":"m","colors":{"rose":1.5,"prop":2,"limb":3}}}`],
    ['rose a string', `{"v":1,"name":"m","skin":{"name":"m","colors":{"rose":"0x7ce38b","prop":2,"limb":3}}}`],
  ];
  for (const [label, text] of bad) {
    let out;
    assert.doesNotThrow(() => { out = parseModManifest(text); }, `${label} must degrade, never throw`);
    assert.equal(out, null, `${label} — WHOLE-manifest drop (P1 fallback law), no half-applied cosmetics exist`);
  }
  // The BH-4 disposition, mechanized: normalizeSkin KEEPS 0x1000000 (shape-
  // only, the shipped 8.1 law); the manifest validator must DROP it — the
  // range law lives in the validator (AC1, ledger BH-4).
  const kept = normalizeSkin({ name: 'x', colors: { rose: 16777216, prop: 2, limb: 3 } });
  assert.equal(kept.colors.rose, 16777216, 'normalizeSkin stays SHAPE-ONLY — an out-of-range integer passes its gate (the 81-§a contract unchanged)');
  assert.equal(parseModManifest('{"v":1,"name":"m","skin":{"name":"m","colors":{"rose":16777216,"prop":2,"limb":3}}}'), null,
    'the validator DROPS the same record — the falsifier pairs the two laws (out-of-range colors are named in AC3)');
});

test('§a the unknown-key gate: any key outside {v, name, skin} drops the whole manifest — __proto__ included, prototype stays clean (AC1/AC3)', async () => {
  const { parseModManifest } = await modsFactories();
  for (const text of ['{"v":1,"name":"m","gameplay":{"gravity":9}}', '{"v":1,"name":"m","extra":true}']) {
    assert.equal(parseModManifest(text), null,
      `${text.slice(0, 34)}… — a non-cosmetic/unknown key is a schema violation (P1a: v1 declares EXACTLY {v, name, skin?})`);
  }
  assert.equal(parseModManifest('{"v":1,"name":"m","__proto__":{"polluted":1}}'), null,
    'a __proto__ key from the parse is an OWN key — the subset gate rejects it (Pitfall: it never reaches the prototype here)');
  assert.equal({}.polluted, undefined, 'Object.prototype stays CLEAN — the fixture text could not pollute through the gate');
  assert.equal(Object.prototype.polluted, undefined, 'the cleanliness assert the Pitfall demands: no leak across legs');
});

test('§a every parse failure lands at null, nothing thrown (AC3: the silence law)', async () => {
  const { parseModManifest } = await modsFactories();
  for (const text of ['', '{', 'null', '[]', '"mint"', '[1,2]']) {
    let out;
    assert.doesNotThrow(() => { out = parseModManifest(text); }, `text ${JSON.stringify(text)} must degrade, never throw`);
    assert.equal(out, null, `${JSON.stringify(text)} — a broken document is the SAME null as every violation`);
  }
});

test('§a duplicate-key text: the decoder\'s last-wins law is PINNED, and it dies at the strict v check', async () => {
  const { parseModManifest } = await modsFactories();
  assert.equal(JSON.parse('{"v":1,"v":2}').v, 2, 'the decoder law the gate inherits: later keys win');
  assert.equal(parseModManifest('{"v":1,"v":2,"name":"m"}'), null,
    'duplicate v resolves to v:2 BEFORE the gate — the strict integer-1 check drops the manifest');
});

test('§a factory purity: parse + path resolver carry zero IO/rng/exec tokens (AC4, purity rider)', async () => {
  const src = await readFile(shellPath, 'utf8');
  const parse = src.match(/function parseModManifest\(text\) \{[\s\S]*?\n\}/);
  const mods = src.match(/function resolveModsParam\(search\) \{[\s\S]*?\n\}/);
  const load = src.match(/async function loadModManifest\(url\) \{[\s\S]*?\n\}/);
  assert.ok(parse && mods && load, 'the three factories are present (pairing fence)');
  for (const body of [parse[0], mods[0]]) {
    for (const token of ['localStorage', 'document', 'window', 'setItem', 'location', 'fetch',
      'eval', 'Function', 'import', 'Math.random']) {
      assert.ok(!body.includes(token), `the pure factory must carry no ${token} reference — the read belongs to the seam, not the validator`);
    }
  }
  for (const token of ['document', 'window', 'setItem', 'location', 'eval', 'Function', 'Math.random', 'localStorage']) {
    assert.ok(!load[0].includes(token), `the loader must carry no ${token} reference — it is ONE fetch, one buffer, then DATA (AC2)`);
  }
});

// ---------------------------------------------------------------------------
// §b resolveModsParam — the path law (D3)
// ---------------------------------------------------------------------------

test('§b the path law admits mods/-rooted paths VERBATIM, sub-paths included', async () => {
  const { resolveModsParam } = await modsFactories();
  assert.equal(resolveModsParam(''), null, "the empty search ('' = no param) resolves to nothing");
  for (const [search, want] of [
    ['?mods=mods/mint.json', 'mods/mint.json'],
    ['mods=mods/mint.json', 'mods/mint.json'],
    ['?x=1&mods=mods/mint.json', 'mods/mint.json'],
    ['?mods=mods/a/b.json', 'mods/a/b.json'],
    [`?mods=mods/${'a'.repeat(128 - 10)}.json`, `mods/${'a'.repeat(118)}.json`],
  ]) {
    assert.equal(resolveModsParam(search), want, `${search} passes every clause and returns VERBATIM (a PATH under mods/, never a URL)`);
  }
});

test('§b the hostile-value law: traversal, scheme, host, encoding, case, size all die (AC3)', async () => {
  const { resolveModsParam } = await modsFactories();
  for (const search of ['?mods=', '?mods', '?mods=x.json', '?mods=../etc/passwd.json',
    '?mods=mods/../secret.json', '?mods=mods/../../x.json', '?mods=http://evil/x.json',
    '?mods=//evil.com/x.json', '?mods=mods:/x', '?mods=:443/x.json', '?mods=mods\\evil.json',
    '?mods=mods/a.json?x=1', '?mods=mods/a.json#f', '?mods=mods/%2e%2e/x.json',
    '?mods=Mods/mint.json', '?mods=mods/MINT.JSON', '?mods=mods//x.json',
    `?mods=mods/${'a'.repeat(129 - 10)}.json`]) {
    let out;
    assert.doesNotThrow(() => { out = resolveModsParam(search); }, `${search} must degrade, never throw`);
    assert.equal(out, null, `${search} — outside the path law; the boot falls back to shipped defaults in silence (AC3)`);
  }
});

test('§b the mods read never disturbs the skin read: ?skin=&mods= co-existence (pairing to equip §a)', async () => {
  const { resolveModsParam } = await modsFactories();
  const resolveSkinParam = await resolverFromShell();
  const SKINS = await tableFromShell();
  const search = '?skin=mint&mods=mods/mint.json';
  assert.equal(resolveModsParam(search), 'mods/mint.json', 'the mods param resolves through the path law');
  assert.equal(resolveSkinParam(search, SKINS), SKINS.mint, 'the skin param still hits the table — two readers, one search string, no interference');
});

// ---------------------------------------------------------------------------
// §c loadModManifest — stubbed read channel (Node-side; the guarded seam)
// ---------------------------------------------------------------------------

test('§c a valid body parses through the validator and the channel is touched EXACTLY ONCE, url verbatim (AC2 one-request law)', async () => {
  const { loadModManifest } = await modsFactories();
  const MINT = await mintWitness();
  const text = JSON.stringify({ v: 1, name: 'mint mod', skin: { name: 'mint', colors: MINT.colors } });
  const calls = [];
  const out = await withFetch(url => { calls.push(url); return Promise.resolve(responseFor(text)); },
    () => loadModManifest('mods/mint.json'));
  assert.deepEqual(calls, ['mods/mint.json'], 'EXACTLY ONE request, the resolved PATH verbatim — count-2 is a boot-budget violation (NFR14)');
  assert.equal(out.v, 1, 'the bytes arrive at the validator — the parsed manifest is what the boot site sees');
  assert.deepEqual(out.skin, { name: 'mint', colors: MINT.colors }, 'the skin record survived the wire intact');
});

test('§c a non-OK response is null with no parse attempted — even over an otherwise-VALID body (AC3)', async () => {
  const { loadModManifest } = await modsFactories();
  const MINT = await mintWitness();
  const text = JSON.stringify({ v: 1, name: 'mint mod', skin: { name: 'mint', colors: MINT.colors } });
  const out = await withFetch(() => Promise.resolve(responseFor(text, { ok: false })),
    () => loadModManifest('mods/mint.json'));
  assert.equal(out, null, 'a failed response is the SAME null as a violation — no buffer, no parse, no half-application (AC3)');
});

test('§c the payload cap: valid JSON over MOD_MANIFEST_MAX_BYTES drops whole (AC3; the cap-removed mutant dies here)', async () => {
  const { loadModManifest, MOD_MANIFEST_MAX_BYTES } = await modsFactories();
  // A VALID schema-v1 document padded with inter-token whitespace — JSON's
  // own license, so the body parses valid: with the cap removed the mutant
  // RETURNS THE OBJECT, which is exactly what this leg denies.
  const padded = `{"v":1,${' '.repeat(MOD_MANIFEST_MAX_BYTES)}"name":"pad","skin":{"name":"pad","colors":{"rose":1,"prop":2,"limb":3}}}`;
  assert.ok(padded.length > MOD_MANIFEST_MAX_BYTES, 'the fixture really exceeds the cap');
  const out = await withFetch(() => Promise.resolve(responseFor(padded)),
    () => loadModManifest('mods/big.json'));
  assert.equal(out, null, 'the byteLength guard kills the oversized manifest BEFORE the parse (the track1 budget idiom, tests/track1.test.js:44)');
});

test('§c a rejected read and an absent channel both land at null — nothing thrown, nothing logged (AC3)', async () => {
  const { loadModManifest } = await modsFactories();
  const rejected = await withFetch(() => Promise.reject(new Error('no manifest in the sandbox')),
    () => loadModManifest('mods/ghost.json'));
  assert.equal(rejected, null, 'a REJECTED read is the SAME null — the catch is the silence that keeps the boot-fork error spies green');
  const absent = await withFetch(undefined, () => loadModManifest('mods/mint.json'));
  assert.equal(absent, null, 'no channel at all -> null (the guarded typeof read, the 8.2 shape)');
});

test('§c the default-boot law: NO param means the channel is NEVER TOUCHED (AC2/NFR14)', async () => {
  const { loadModManifest, resolveModsParam } = await modsFactories();
  assert.equal(resolveModsParam(''), null, "'' (every Node boot and every location-less fork) resolves to NO path");
  let touched = false;
  const out = await withFetch(url => { touched = true; return Promise.resolve(responseFor('{"v":1,"name":"x"}')); },
    () => loadModManifest(resolveModsParam('')));
  assert.equal(out, null, 'the absent-param boot is null — shipped defaults');
  assert.equal(touched, false, 'the channel was NEVER TOUCHED — the !url short-circuit runs BEFORE the typeof probe (the AC2 law, D3); a default boot makes ZERO requests');
});

test('§c the parse-site census: the shell holds EXACTLY ONE parse call (AC2 — the one-parse law)', async () => {
  const shell = await readFile(shellPath, 'utf8');
  const shellCode = shell.replace(/^[ \t]*\/\/.*$/gm, ''); // comment-stripped (the BH-3 lesson)
  assert.equal((shellCode.match(/JSON\.parse\(/g) ?? []).length, 1,
    'EXACTLY one JSON parse site in js/shell.js — the validator is the sole entry point for manifest text (D1)');
});

// ---------------------------------------------------------------------------
// §d Composition boots + pairing fences (the equip §d donor; the R1 mirror)
// ---------------------------------------------------------------------------

test('§d ?mods=manifest end-to-end: the three materials carry the mint hexes, colorSets === 3, look defaults ride (AC6)', async () => {
  const MINT = await mintWitness();
  const text = JSON.stringify({ v: 1, name: 'mint mod', skin: { name: 'mint', colors: MINT.colors } });
  const env = await mirrorBoot('?mods=mods/mint.json', text);
  assert.deepEqual(env.mats.map(m => m.color.hex), [MINT.colors.rose, MINT.colors.limb, MINT.colors.prop],
    'identity-addressed rose/limb/prop carry the mint hexes — ?mods=mods/mint.json recolors EXACTLY like ?skin=mint (the AC6 dogfood twin)');
  assert.equal(env.reg.colorSets, 3, 'EXACTLY three color writes — the ONE application site, once per material (the 8.1 D1 law unchanged)');
  const src = await readFile(render3dPath, 'utf8');
  const near = Number(src.match(/num\('fogNear', ([0-9.]+)\)/)[1]);
  const far = Number(src.match(/num\('fogFar', ([0-9.]+)\)/)[1]);
  assert.deepEqual([env.world.fog.near, env.world.fog.far], [near, far],
    "the mods param cannot collide with a look knob — LOOK_KNOBS keys are light/fogNear/fogFar (render3d.js:52-59); a ?mods= boot takes the shipped fog defaults");
});

test('§d precedence law: an explicit ?skin= table hit BEATS the manifest skin — the ?? short-circuit (D4)', async () => {
  const MINT = await mintWitness();
  const other = { rose: 0x010203, prop: 0x040506, limb: 0x070809 };
  const text = JSON.stringify({ v: 1, name: 'other mod', skin: { name: 'other', colors: other } });
  const env = await mirrorBoot('?skin=mint&mods=mods/other.json', text);
  assert.deepEqual(env.mats.map(m => m.color.hex), [MINT.colors.rose, MINT.colors.limb, MINT.colors.prop],
    'the TABLE record rides — a manifest never overrides an explicit equip (?? short-circuit); the manifest skin is not consulted');
  assert.equal(env.reg.colorSets, 3, 'zero writes beyond the table\'s three — the manifest colors never reach the application site');
});

test('§d a VALID manifest without a skin key boots the shipped defaults with ZERO color writes (AC1 optionality, AC3)', async () => {
  const env = await mirrorBoot('?mods=mods/plain.json', '{"v":1,"name":"plain mod"}');
  const ROSE = await shippedConst('ROSE');
  const FLOOR = await shippedConst('FLOOR');
  const PROP = await shippedConst('PROP');
  assert.equal(env.reg.colorSets, 0, 'skinless-valid composes through undefined -> the placeholder record -> the key-count guard writes NOTHING');
  assert.deepEqual(env.mats.map(m => m.color.hex), [ROSE, FLOOR, PROP], 'the game plays with shipped defaults');
});

test('§d a garbage-manifest boot writes NOTHING, ships defaults, throws NOTHING — whole-drop silence (AC3/AC4)', async () => {
  const env = await mirrorBoot('?mods=mods/broken.json', '{"v":1,"name":"m","gameplay":{"gravity":0}}');
  const ROSE = await shippedConst('ROSE');
  const FLOOR = await shippedConst('FLOOR');
  const PROP = await shippedConst('PROP');
  assert.equal(env.reg.colorSets, 0, 'a schema violation reaching the wire still lands at zero writes — no half-applied cosmetics (NFR16)');
  assert.deepEqual(env.mats.map(m => m.color.hex), [ROSE, FLOOR, PROP], 'shipped defaults, total silence (UX-DR2)');
});

test('§d the boot-seam shape: one pre-resolution, ONE top-level await, synchronous startGame, the R1 composition tail ×1 (D4 timing law)', async () => {
  const shell = await readFile(shellPath, 'utf8');
  assert.equal((shell.match(/loadModManifest\(resolveModsParam\(equipSearch\)\)/g) ?? []).length, 1,
    'the module-scope pre-resolution composes the resolver INTO the loader — the mods read is CONSUMED, never computed-and-discarded');
  assert.equal((shell.match(/^const modManifest = await loadModManifest\(/gm) ?? []).length, 1,
    'EXACTLY ONE top-level await in the module — the data-URL import promise absorbs it and every boot fork lands exactly as before (a second await or an async startGame would suspend boots mid-body: the seven-fork timing law)');
  assert.match(shell, /^export function startGame\(canvas\) \{$/m,
    'startGame stays SYNCHRONOUS — the boot forks call it during module evaluation and none may assume a defer (D4 rejection (a))');
  assert.equal((shell.match(/modManifest\?\.skin/g) ?? []).length, 1,
    'the manifest tail rides the ONE composition — mirrors the R1-pinned equip §e fence (pairing: the two fences quote the same text)');
});

// ---------------------------------------------------------------------------
// §e The data-only law: script-looking strings execute NOTHING (AC2 red-green)
// ---------------------------------------------------------------------------

const SCRIPT_STRINGS = [
  "import('data:text/javascript,globalThis.__PWNED=1')",
  "eval('globalThis.__PWNED=1')",
  "new Function('globalThis.__PWNED=1')",
];

test('§e a manifest carrying script-looking strings is VALID DATA and executes NOTHING (AC2, FR36 — the data-only law)', async () => {
  const factories = await modsFactories(); // extract BEFORE arming — the recorder wraps the Function constructor
  const resolveSkinParam = await resolverFromShell();
  const normalizeSkin = await normalizeSkinFromShell();
  const SKINS = await tableFromShell();
  const MINT = await mintWitness();
  delete globalThis.__PWNED;
  const hits = [];
  const savedEval = globalThis.eval;
  const savedFunction = globalThis.Function;
  globalThis.eval = (...args) => { hits.push(['eval', String(args[0])]); return undefined; };
  globalThis.Function = function Function(...args) { hits.push(['Function', String(args[0])]); return savedFunction(...args); };
  const envs = [];
  try {
    for (const script of SCRIPT_STRINGS) {
      // The strings sit in LEGAL fields (valid 1..64-char strings) — the
      // manifest is VALID and its skin applies while the tripwires are armed.
      const text = `{"v":1,"name":${JSON.stringify(script)},"skin":{"name":${JSON.stringify(script.slice(0, 24))},"colors":{"rose":${MINT.colors.rose},"prop":${MINT.colors.prop},"limb":${MINT.colors.limb}}}}`;
      const out = factories.parseModManifest(text);
      assert.notEqual(out, null, `a script-looking STRING is a legal name — the schema validates TYPES, it never interprets content: ${script.slice(0, 20)}…`);
      const env = await withFetch(() => Promise.resolve(responseFor(text)), () =>
        withLocation('?mods=mods/script.json', async () => {
          const equipSearch = typeof location !== 'undefined' && location.search ? location.search : '';
          const modManifest = await factories.loadModManifest(factories.resolveModsParam(equipSearch));
          return bootSkin(normalizeSkin(resolveSkinParam(equipSearch, SKINS) ?? modManifest?.skin));
        }));
      envs.push([script, env]);
    }
  } finally {
    globalThis.eval = savedEval;
    globalThis.Function = savedFunction;
  }
  assert.deepEqual(hits, [], 'ZERO evaluation tripwire hits across the parse+composition window — no eval, no Function, nothing fed by manifest content (FR36)');
  assert.equal(globalThis.__PWNED, undefined, 'the dynamic-import payload NEVER RAN — the import-marker stays undefined (data stays data)');
  for (const [script, env] of envs) {
    assert.deepEqual(env.mats.map(m => m.color.hex), [MINT.colors.rose, MINT.colors.limb, MINT.colors.prop],
      `the boot is UNHARMED while the script-string name rides inert: ${script.slice(0, 20)}…`);
    assert.equal(env.reg.colorSets, 3, 'exactly the three application writes — the boot composed normally around the tripwires');
  }
  delete globalThis.__PWNED;
});

test('§e dead-payload twins: the same strings in a COLORS field are a TYPE violation — whole-drop, zero hits, zero writes', async () => {
  const factories = await modsFactories();
  const resolveSkinParam = await resolverFromShell();
  const normalizeSkin = await normalizeSkinFromShell();
  const SKINS = await tableFromShell();
  delete globalThis.__PWNED;
  const hits = [];
  const savedEval = globalThis.eval;
  const savedFunction = globalThis.Function;
  globalThis.eval = (...args) => { hits.push(['eval', String(args[0])]); return undefined; };
  globalThis.Function = function Function(...args) { hits.push(['Function', String(args[0])]); return savedFunction(...args); };
  let wrote = -1;
  try {
    for (const script of SCRIPT_STRINGS) {
      const text = `{"v":1,"name":"dead mod","skin":{"name":"x","colors":{"rose":${JSON.stringify(script)},"prop":2,"limb":3}}}`;
      assert.equal(factories.parseModManifest(text), null, `a string where an INTEGER belongs is a type violation -> WHOLE-drop (D1): ${script.slice(0, 20)}…`);
      const env = await withFetch(() => Promise.resolve(responseFor(text)), () =>
        withLocation('?mods=mods/dead.json', async () => {
          const equipSearch = typeof location !== 'undefined' && location.search ? location.search : '';
          const modManifest = await factories.loadModManifest(factories.resolveModsParam(equipSearch));
          return bootSkin(normalizeSkin(resolveSkinParam(equipSearch, SKINS) ?? modManifest?.skin));
        }));
      wrote = env.reg.colorSets;
      assert.equal(env.reg.colorSets, 0, 'the dead payload never reaches a frame — shipped defaults (AC3)');
    }
  } finally {
    globalThis.eval = savedEval;
    globalThis.Function = savedFunction;
  }
  assert.deepEqual(hits, [], 'zero tripwire hits — the dead payload is inert bytes');
  assert.equal(globalThis.__PWNED, undefined, 'the import marker stays undefined — nothing ran');
  assert.equal(wrote, 0, 'the last twin wrote nothing (the loop really booted)');
  delete globalThis.__PWNED;
});

test('§e the shell holds ZERO evaluation tokens and EXACTLY ONE literal dynamic import site (the census behind the red-green)', async () => {
  const shell = await readFile(shellPath, 'utf8');
  const shellCode = shell.replace(/^[ \t]*\/\/.*$/gm, ''); // comment-stripped (BH-3)
  assert.equal((shellCode.match(/\beval\(/g) ?? []).length, 0, 'js/shell.js holds ZERO eval call tokens');
  assert.equal((shellCode.match(/new\s+Function\(/g) ?? []).length, 0, 'js/shell.js holds ZERO Function-constructor call tokens');
  assert.equal((shellCode.match(/import\(\s*(?!['"])/g) ?? []).length, 0, 'no NON-LITERAL dynamic import exists — nothing computed is ever imported (a manifest string could never ride it)');
  assert.equal((shellCode.match(/import\(/g) ?? []).length, 1,
    'EXACTLY one dynamic import site remains — the pre-existing literal lane to the audio module (the spec is the literal \'./audio.js\', census-pinned untouched-green elsewhere)');
  assert.equal((shellCode.match(/import\(\s*'\.\/audio\.js'\s*\)/g) ?? []).length, 1,
    'that one site is still the LITERAL audio specifier — no manifest content can steer any import (FR36)');
});

// ---------------------------------------------------------------------------
// §f Ownership + persistence + asset fences (the purity rider, mechanized)
// ---------------------------------------------------------------------------

test('§f fetch ownership: EXACTLY one call site in shell.js, ZERO in every sim/render file (the boundary regex carries no fetch token — this leg owns the law)', async () => {
  const shellCode = (await readFile(shellPath, 'utf8')).replace(/^[ \t]*\/\/.*$/gm, '');
  assert.equal((shellCode.match(/fetch\(/g) ?? []).length, 1,
    'js/shell.js holds EXACTLY one fetch CALL token — the loader; the typeof probe beside the injected audio lane is a guard, not a call');
  for (const name of ['render3d.js', 'game.js', 'rope.js', 'player.js', 'areas.js', 'interpolate.js', 'upgrades.js']) {
    const code = (await readFile(resolve(jsDir, name), 'utf8')).replace(/^[ \t]*\/\/.*$/gm, '');
    assert.equal((code.match(/fetch\(/g) ?? []).length, 0, `js/${name} holds ZERO fetch tokens — the read never entered the sim/render graph (epics.md:1159)`);
  }
  // audio.js is cited-not-counted: its injected fetchFn(url) channel is not a
  // fetch( token and is a byte-zero diff fact this story (D7).
});

test('§f the location mirror: ONE guarded read site, two tokens, one line — render3d untouched (equip §e re-affirmance)', async () => {
  const shell = await readFile(shellPath, 'utf8');
  const shellCode = shell.replace(/^[ \t]*\/\/.*$/gm, '');
  const render = await readFile(render3dPath, 'utf8');
  assert.equal((shell.match(/typeof location !== 'undefined'/g) ?? []).length, 1,
    'the guarded read shape appears EXACTLY once — the scope MOVE (startGame -> module) is census-irrelevant (equip §e stands untouched)');
  assert.equal((shellCode.match(/location\.search/g) ?? []).length, 2,
    'location.search appears in shell CODE exactly twice — both inside the ONE guard expression; the mods param parses from the SAME already-read string (Pitfall: a second read site dies here)');
  assert.equal(shellCode.split('\n').filter(l => l.includes('location.search')).length, 1,
    'all location.search reads sit on ONE code line');
  assert.equal((render.match(/location\.search/g) ?? []).length, 2,
    'render3d keeps EXACTLY its two LOOK_KNOBS tokens — nothing leaked into the render graph (the 8.2 fence unchanged, byte-zero render3d by D7)');
});

test('§f zero persistence, one boot call, one meta read — the fourth-key tripwire stays armed, unspent (D6)', async () => {
  const shell = await readFile(shellPath, 'utf8');
  assert.equal((shell.match(/setItem\(/g) ?? []).length, 0, 'a manifest is a per-load URL choice — ZERO write sites (the readdir-setitem censuses stay untouched-green)');
  assert.equal((shell.match(/jumprope-/g) ?? []).length, 0, 'no new storage key literal — persisting an equipped mod is the 8.2 AC6 STOP-AND-ASK decision, not this story');
  assert.equal((shell.match(/createScene\(/g) ?? []).length, 1, 'the ONE application site is unchanged — the manifest flows through the SAME 8.1 seam');
  assert.equal((shell.match(/loadMeta\(localStorage\)/g) ?? []).length, 1, 'the metalegger boot fence stays armed: exactly one meta read (the module-scope insertions sit ABOVE the loadBest/loadMeta region, outside the window)');
});

test('§f the shipped example manifest: present, capped, VALID, and PAIRED to the frozen mint witnesses (AC6, D5)', async () => {
  const { parseModManifest, MOD_MANIFEST_MAX_BYTES } = await modsFactories(); // cap derived from source, track1 :44 donor
  const { size } = await stat(modsAssetPath);
  assert.ok(size <= MOD_MANIFEST_MAX_BYTES, `mods/mint.json (${size} B) fits the payload cap it must survive (the committed-asset size law, tests/track1.test.js:195)`);
  const text = await readFile(modsAssetPath, 'utf8');
  const out = parseModManifest(text);
  assert.notEqual(out, null, 'the shipped witness manifest parses VALID through the shipped validator (?mods=mods/mint.json equips, AC6)');
  assert.equal(out.v, 1, 'schema version 1');
  const MINT = await mintWitness(); // decimals DERIVED from the frozen 0x… sources — never re-typed
  assert.deepEqual(out.skin, MINT,
    'the manifest skin record EQUALS the SKINS-table mint witness — ?mods=mods/mint.json and ?skin=mint recolor identically (the dogfood-twin claim, D5); the decimals are the witnesses in JSON\'s only number form');
});
