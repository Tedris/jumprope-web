import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');

// Catches static `from '...'` AND dynamic `import('...')` — the dynamic form
// must not slip past the fence (D-03, RESEARCH Pattern 3).
const SPECIFIER_RE = /(?:\bfrom\s*|\bimport\s*\(\s*)['"]([^'"]+)['"]/g;
const BROWSER_IO_RE = /performance[.]now|Date[.]now|requestAnimationFrame|localStorage|\bdocument\b/;

async function walkSpec(spec, fromFile, graph, bare) {
  if (spec.startsWith('.')) return walkFile(resolve(dirname(fromFile), spec), graph, bare);
  bare.add(`${spec} (imported by ${fromFile})`);
}

async function walkFile(file, graph, bare) {
  if (graph.has(file)) return;
  graph.add(file);
  const src = await readFile(file, 'utf8');
  for (const m of src.matchAll(SPECIFIER_RE)) await walkSpec(m[1], file, graph, bare);
}

// Entry points are derived from what tests/*.test.js actually import, never
// hardcoded, so a new sim dependency cannot silently escape the fence (Pitfall 6).
async function entryPoints() {
  const entries = new Set();
  for (const name of (await readdir(testsDir)).sort()) {
    if (!name.endsWith('.test.js')) continue;
    const file = resolve(testsDir, name);
    const src = await readFile(file, 'utf8');
    for (const m of src.matchAll(SPECIFIER_RE)) {
      if (!m[1].startsWith('.')) continue;
      const target = resolve(dirname(file), m[1]);
      const rel = relative(jsDir, target);
      if (rel && !rel.startsWith('..') && !isAbsolute(rel)) entries.add(target);
    }
  }
  return [...entries];
}

const graphPromise = (async () => {
  const graph = new Set();
  const bare = new Set();
  for (const entry of await entryPoints()) await walkFile(entry, graph, bare);
  return { graph, bare };
})();

test('ARCH-01: no module in the sim/test import graph references three', async () => {
  const { bare } = await graphPromise;
  const offenders = [...bare].filter(n => n.split(/[:\s]/)[0].startsWith('three'));
  assert.deepEqual(offenders, []);
});

test('ARCH-02: the dual rope-init 0.33 literal never reappears in js/', async () => {
  const offenders = [];
  for (const name of (await readdir(jsDir)).sort()) {
    const src = await readFile(resolve(jsDir, name), 'utf8');
    if (/phase:\s*0[.]33/.test(src)) offenders.push(name);
  }
  assert.deepEqual(offenders, []);
});

test('ARCH-02: Math.random in any form sits only on the tickRun default-parameter line', async () => {
  const { graph } = await graphPromise;
  const offenders = [];
  for (const file of [...graph].sort()) {
    const src = await readFile(file, 'utf8');
    src.split('\n').forEach((line, i) => {
      // Deliberately paren-free: the original debt form was the reference
      // pickTwo(UPGRADES, Math.random); a /Math[.]random[(]/ probe passes vacuously on it.
      if (/Math[.]random/.test(line) && !/rng\s*=\s*Math[.]random/.test(line)) {
        offenders.push(`${relative(testsDir, file)}:${i + 1} ${line.trim()}`);
      }
    });
  }
  assert.deepEqual(offenders, []);
});

test('startRun shape holds and injected rng makes offers deterministic', async () => {
  // Deferred link: if a graph module ever resolves to 'three', the graph walk
  // above must fail with its offender list, not a module-loader crash here.
  const { startRun, START_PHASE, createRun, tickRun } = await import('../js/game.js');
  const { rope, player, run } = startRun();
  assert.equal(rope.phase, START_PHASE);
  assert.equal(player.grounded, false);
  assert.equal(run.status, 'running');

  let calls = 0;
  const stub = () => { calls += 1; return 0.5; };
  const base = { ...createRun(), skips: 9 };
  const ropeState = { phase: 0.44, period: 0.9 };
  const playerState = { y: 40, vy: 0, grounded: false, squash: 1, squashVel: 0 };
  const a = tickRun(base, ropeState, playerState, 1 / 60, stub);
  const b = tickRun(base, ropeState, playerState, 1 / 60, stub);
  assert.ok(calls > 0, 'the injected rng must be invoked by the offer path');
  assert.deepEqual(a.run.offer.map(u => u.id), b.run.offer.map(u => u.id));
});

test('wall-clock, DOM, and storage references live only in js/shell.js', async () => {
  const offenders = [];
  for (const name of (await readdir(jsDir)).sort()) {
    if (name === 'shell.js') continue;
    const src = await readFile(resolve(jsDir, name), 'utf8');
    src.split('\n').forEach((line, i) => {
      if (BROWSER_IO_RE.test(line)) offenders.push(`${name}:${i + 1} ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, []);
});
