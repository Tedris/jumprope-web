import test from 'node:test';
import assert from 'node:assert/strict';
import { constants, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Story 3.0: mechanical fences against doc-vs-reality drift — the exact rot
// this chore story exists for (VERIFY-CONTRACT rules 1/2/4/8 plus the
// night-file retirement). Static file reads only, ~0 ms; fence precedent is
// tests/boundary.test.js. If a leg goes red, the docs or the gate drifted —
// never the game.

const testsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testsDir, '..');

const read = (...parts) => readFileSync(resolve(projectRoot, ...parts), 'utf8');

// (a) rule 1: one gate script, executable, running node's test runner over
// tests/ with the TAP reporter the PASS-line parse depends on
test('gate: run_tests.sh exists, is executable, and runs the pinned TAP oracle command', () => {
  const gate = resolve(projectRoot, 'run_tests.sh');
  assert.ok(existsSync(gate), 'run_tests.sh must exist at the repo root (the one gate name)');
  assert.ok(statSync(gate).mode & constants.S_IXUSR,
    'run_tests.sh must carry the exec bit (git mode 100755 — a 644 gate dies in CI)');
  const script = read('run_tests.sh');
  assert.match(script, /node --test --test-reporter=tap\b[^\n]*tests\//,
    'the gate must run node --test with the tap reporter over tests/ (the parse contract)');
});

// (b) rule 8: CI runs the same gate from a clean checkout, no package manager
test('ci: a GitHub Actions workflow runs run_tests.sh and names no package manager', () => {
  const dir = resolve(projectRoot, '.github', 'workflows');
  assert.ok(existsSync(dir), '.github/workflows/ must exist (CI runs the same oracle)');
  const ymls = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
  assert.ok(ymls.length > 0, 'at least one .github/workflows/*.y(a)ml must exist');
  const ci = ymls.map((f) => read('.github', 'workflows', f)).join('\n');
  assert.match(ci, /run_tests\.sh/, 'CI must invoke the same gate: ./run_tests.sh');
  assert.doesNotMatch(ci, /\b(npm (i|ci|install|add)|yarn|pnpm)\b/,
    'zero dependencies: CI must run no package manager (no lockfile exists)');
});

// (c) rule 4: both docs name the single gate — no second gate name anywhere
test('docs: AGENTS.md and VERIFY-CONTRACT.md both name run_tests.sh', () => {
  for (const doc of ['AGENTS.md', 'VERIFY-CONTRACT.md']) {
    assert.match(read(doc), /run_tests\.sh/, `${doc} must name the one gate command`);
  }
});

// (d) night-loop retirement: root is clean, the archive holds the records
test('retirement: night-era files live in docs/archive/night/, not at the root', () => {
  for (const stale of ['NIGHT.md', 'JOURNAL.md', 'BLOCKED.md', 'tools/night']) {
    assert.ok(!existsSync(resolve(projectRoot, stale)),
      `${stale} must no longer exist at the repo root (retired, not deleted)`);
  }
  for (const kept of ['NIGHT.md', 'JOURNAL.md', 'BLOCKED.md', 'tools/night/night.conf']) {
    assert.ok(existsSync(resolve(projectRoot, 'docs', 'archive', 'night', ...kept.split('/'))),
      `${kept} must be retired (git mv to docs/archive/night/), not deleted — ` +
      'VERIFY-CONTRACT rule 3 points at the archive copy');
  }
});
