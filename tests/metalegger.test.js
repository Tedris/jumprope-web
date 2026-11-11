import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMeta, saveMeta } from '../js/game.js';

// Story 7.1 (FR31, AC2/AC3): the meta ledger contract — loadMeta/saveMeta,
// the {furthestArea, summits, skips} state persisted under the ONE bare key
// jumprope-meta beside jumprope-best (D1), through the injected-storage seam
// of loadBest/saveBest (D4). The write lane is DORMANT in 7.1 (D2): these
// legs call saveMeta directly against fake storage — no runtime meta write
// exists, which is exactly what keeps the pausemenu runtime key censuses
// byte-identical (D3).
//
// Patterns: fake-storage round-trip + blocked-storage legs from
// tests/game.test.js:49-61; corrupt/junk/blocked + shape-pinned-write census
// from tests/audio.test.js:216-247. Import discipline (AGENTS.md): ONLY
// ../js/game.js is imported statically — never a tests/*.test.js, which
// would register its tests. Law-form legs only: no current-build numerics
// (no rng involved — A2/seed-honesty vacuous here, D6).

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');

const ZEROS = { furthestArea: 0, summits: 0, skips: 0 };

// Map-backed fake — the game.test.js:49-61 idiom (copied, never imported).
function mapStorage(initial = []) {
  const data = new Map(initial);
  return { data, getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
}

test('meta round-trips through the injected seam under the ONE bare key (AC1, D1)', () => {
  const storage = mapStorage();
  assert.deepEqual(loadMeta(storage), ZEROS, 'a missing key boots the fresh default');
  saveMeta(storage, { furthestArea: 3, summits: 1, skips: 12 });
  assert.deepEqual([...storage.data.keys()], ['jumprope-meta'],
    'exactly ONE bare unversioned key joins the persistence map (D1 — no jumprope-meta-v1, no key split)');
  assert.deepEqual(loadMeta(storage), { furthestArea: 3, summits: 1, skips: 12 }, 'the counters round-trip');
  assert.deepEqual(Object.keys(JSON.parse(storage.data.get('jumprope-meta'))).sort(), ['furthestArea', 'skips', 'summits'],
    'the stored value is the flat three-counter object — no nesting, no extras');
});

test('the boot read is ONE getItem — one seam read, no retry, no loop (AC1, NFR12)', () => {
  let gets = 0;
  const storage = { getItem: () => { gets += 1; return '{"furthestArea":1,"summits":2,"skips":3}'; }, setItem: () => {} };
  assert.deepEqual(loadMeta(storage), { furthestArea: 1, summits: 2, skips: 3 });
  assert.equal(gets, 1, 'the meta boot read is exactly one getItem — it adds nothing measurable to the first-jump budget');
});

test('fence: the shell boot loads meta EXACTLY once, beside the FR24 seam (AC1 — review F2)', async () => {
  // harness.test.js:27-34 pattern: a static source fence — deleting the boot
  // line silently unloads the ledger at boot while every runtime suite stays green.
  const src = await readFile(resolve(jsDir, 'shell.js'), 'utf8');
  assert.equal((src.match(/loadMeta\(localStorage\)/g) ?? []).length, 1,
    'js/shell.js holds EXACTLY one loadMeta(localStorage) boot site');
  assert.match(src, /loadBest\(localStorage\);[\s\S]{0,400}?loadMeta\(localStorage\);/,
    'the surviving site sits in the boot region beside the FR24 seam (shell.js:151/155)');
});

test('corrupt and missing payloads are data, not errors: fresh default, nothing thrown (AC2)', () => {
  // 'not json' degrades like audio.test.js:231; valid-JSON-non-object payloads
  // degrade through the typeof arm, not the try/catch (story pitfall).
  for (const raw of ['not json', '"junk"', '42', 'null', 'true', '']) {
    assert.deepEqual(loadMeta({ getItem: () => raw, setItem: () => {} }), ZEROS,
      `payload ${JSON.stringify(raw)} degrades to the fresh default`);
  }
});

test('per-field degradation: bare {} and hostile values are data — invalid fields read 0 (AC2, D6-b)', () => {
  const read = raw => loadMeta({ getItem: () => raw, setItem: () => {} });
  assert.deepEqual(read('{}'), ZEROS, 'a bare {} degrades per-field to zeros');
  assert.deepEqual(read('[]'), ZEROS, 'a valid-JSON array carries no counters — all fields fall to 0');
  assert.deepEqual(read('{"furthestArea":"abc","summits":-5,"skips":null}'), ZEROS,
    'non-numeric, negative, and null values are invalid data — each falls to 0 (no || coalesce: the guard is finiteness, audio.js:10-16 doctrine)');
  assert.deepEqual(read('{"furthestArea":9e999,"summits":2,"skips":3}'), { furthestArea: 0, summits: 2, skips: 3 },
    'Infinity is non-finite data — the counter falls to 0 while its valid siblings ride');
  assert.deepEqual(read('{"furthestArea":3,"summits":null,"skips":1}'), { furthestArea: 3, summits: 0, skips: 1 },
    'valid fields ride; only the invalid field falls');
  assert.deepEqual(read('{"skips":0}'), ZEROS, 'zero is legitimate data — read as 0, never rewritten');
  assert.deepEqual(read('{"furthestArea":1,"run":{"status":"over","score":99},"metaVersion":7}'),
    { furthestArea: 1, summits: 0, skips: 0 },
    'unknown fields never ride into shell state — the read is shape-pinned like loadSettings (review F4)');
  assert.deepEqual(read('{"furthestArea":2.7,"summits":3,"skips":9.99}'), { furthestArea: 2, summits: 3, skips: 9 },
    'counters are integers — finite fractional data truncates like the sibling clamps (review F3)');
});

test('blocked storage degrades silently both directions: default read, session-only write, nothing thrown (AC2)', () => {
  const blocked = { getItem() { throw new Error('storage blocked'); }, setItem() { throw new Error('storage blocked'); } };
  assert.deepEqual(loadMeta(blocked), ZEROS, 'blocked reads boot the fresh default');
  saveMeta(blocked, { furthestArea: 1, summits: 2, skips: 3 });
  assert.ok(true, 'a blocked write is silent and session-only — reaching here is the assertion (saveBest shape)');
});

test('shape-pinned write: saveMeta serializes EXACTLY {furthestArea,summits,skips}; hostile fields never ride along (AC3, D6-c)', () => {
  const storage = mapStorage();
  saveMeta(storage, { furthestArea: 'nope', summits: -3, skips: Infinity, run: { status: 'over', score: 99 }, metaVersion: 7 });
  assert.deepEqual(Object.keys(JSON.parse(storage.data.get('jumprope-meta'))).sort(), ['furthestArea', 'skips', 'summits'],
    'the serialized shape is closed — a run record passed to saveMeta never rides along (permadeath, architecture §Persistence)');
  assert.deepEqual(JSON.parse(storage.data.get('jumprope-meta')), ZEROS,
    'invalid values are sanitized on the write side too, before stringify (audio.js:33-43 precedent)');
  const int = mapStorage();
  saveMeta(int, { furthestArea: 2.7, summits: -0.5, skips: 4.9 });
  assert.deepEqual(JSON.parse(int.data.get('jumprope-meta')), { furthestArea: 2, summits: 0, skips: 4 },
    'the write side truncates too — a fractional counter never survives a round-trip (review F3)');
});

test('the persisted key set is EXACTLY {jumprope-audio, jumprope-best, jumprope-meta}: no run record is EVER persisted (AC3, D6-d)', async () => {
  // The write-site census: same readdir idiom as reducedmotion L10(a). Every
  // setItem site resolves to one of the three pinned keys — a run-record key
  // has no literal home, and no setItem site stringifies a run record.
  const files = (await readdir(jsDir)).filter(f => f.endsWith('.js')).sort();
  const writeKeys = [];
  const literals = new Set();
  for (const f of files) {
    const src = await readFile(resolve(jsDir, f), 'utf8');
    const consts = new Map([...src.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*['"]([^'"]+)['"]/g)].map(m => [m[1], m[2]]));
    for (const m of src.matchAll(/\.setItem\(\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))/g)) {
      const key = m[1] ?? m[2] ?? consts.get(m[3]);
      assert.ok(typeof key === 'string' && key.startsWith('jumprope-'),
        `${f}: a setItem site writes a key outside the pinned jumprope-* namespace: ${key ?? m[3]}`);
      writeKeys.push(key);
      // From the match forward: the line PREFIX before `.setItem(` can never
      // contain the token, so slicing backwards made this guard dead (review F1).
      const line = src.slice(m.index).split('\n')[0];
      assert.doesNotMatch(line, /setItem\([^)]*(?:\brun\b|\brecord\b)/,
        `${f}: a setItem site references a run record — the permadeath contract forbids persisting it`);
    }
    for (const m of src.matchAll(/['"`](jumprope-[^'"`]+)['"`]/g)) literals.add(m[1]);
    assert.doesNotMatch(src, /jumprope-[a-z-]*(?:run|record)/i,
      `${f}: a run-record-shaped persistence key literal appears in js/ — permadeath contract`);
  }
  assert.deepEqual(writeKeys.sort(), ['jumprope-audio', 'jumprope-best', 'jumprope-meta'],
    `every setItem site in js/ writes exactly one pinned key — got ${writeKeys}`);
  assert.deepEqual([...literals].sort(), ['jumprope-audio', 'jumprope-best', 'jumprope-meta'],
    'the literal key space across js/ is closed — meta state, best altitude, and audio settings are ALL that is ever persisted (FR31)');
});
