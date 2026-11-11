import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bootModule, captureConsoleErrors, fileHref, installStage, installVirtualClock,
  makeAudioWrapHref, makeGameWrapHref, makeRenderStubHref, settle, shellSrc,
} from './support/shell-harness.js';
import { saveMeta, SUMMIT_AREA } from '../js/game.js';

// Story 7.2 (FR33/FR22, AC1-AC4): every run leaves a mark — the outcome
// counters accrue at run end through the ONE write lane beside saveBest
// (shell.js run-end branch, D1), MAX area / summit-only / +=-skips (D2), and
// the saveMeta try-hoist makes caller bugs loud while blocked storage stays
// silent (D3). Recorded, consumed by NOTHING (AC4 — 7.3 reads).
//
// Scripted shell legs per D6: the full-shell env-walk idiom is the pausemenu
// donor (tests/pausemenu.test.js bootMenuShell :116, tick :144, tick-to-trip
// :426-428) — frozen suites are DONORS, never imports (fork hygiene). No
// batch machinery anywhere in this file, so AC3's seed-honesty clause is
// vacuous by construction; every value asserted is the live run's own field
// (law-form — no current-build numerics).
//
// Legs: (a) tick-to-trip accrual + mid-walk no-write witness + once-count;
//       (b) scripted summit — the real summit branch on a seeded near-summit
//          startRun state (the wrapper seeds a domain-legal position; the
//          summit write itself is shipped code);
//       (c) exactly-once under idle / P-pause-resume / tab-hide / restart;
//       (d) MAX monotonicity against a pre-seeded higher furthestArea;
//       (e) lifetime += against pre-seeded skips/summits;
//       (f) the try-hoist red-green pair, direct (nullish meta THROWS on
//          healthy storage; blocked storage with a POJO stays silent);
//       (g) AC4 shape guard: the persisted meta JSON is EXACTLY the three
//          counters — no run record rides along (permadeath).
// Boots: one per scripted leg (a,b,c,d,e,g) + zero for (f). The trip pump is
// the audiolifecycle/pausemenu scripted-jumper donor; the game wrapper arms
// mirror MENU_GAME_WRAP (offer-stripping) — leg (b) adds the seed + a
// trip-resurrection so the walk can only end at the REAL summit.

let bootCount = 0;

// ---------- harness: bootRunmarkShell (pausemenu bootMenuShell donor, trimmed
// of the menu chrome the legs never touch) + the meta-write tally the
// exactly-once legs read ----------

const RUNMARK_GAME_WRAP = `
  export const tickRun = (...a) => {
    const o = real.tickRun(...a);
    return o.run.status === "choose" ? { ...o, run: { ...o.run, status: "running", offer: null } } : o;
  };`;

// Leg (b) only: the near-summit startRun seed (area 5, one skip below the
// summit ceiling, previous row's ceiling as base — a state any real climb
// passes through) + the trip-resurrection arm so the scripted walk ends at
// the summit branch, never at a trip. The summit itself is shipped code.
const SUMMIT_GAME_WRAP = `
  export const tickRun = (...a) => {
    const o = real.tickRun(...a);
    if (o.run.status === "choose") return { ...o, run: { ...o.run, status: "running", offer: null } };
    if (o.run.status === "over" && o.run.outcome === "tripped")
      return { ...o, run: { ...o.run, status: "running", outcome: null }, tripped: false };
    return o;
  };
  export const startRun = () => {
    const s = real.startRun();
    return { ...s, run: { ...s.run, area: real.SUMMIT_AREA,
      altitude: real.AREAS[real.SUMMIT_AREA - 1].ceiling - 60,
      baseAltitude: real.AREAS[real.SUMMIT_AREA - 2].ceiling } };
  };`;

async function bootRunmarkShell({ storageMap = new Map(), inject = RUNMARK_GAME_WRAP } = {}) {
  const map = storageMap;
  const writes = { meta: 0 }; // jumprope-meta setItem tally (AC2 witness)
  const storage = {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, v); if (k === 'jumprope-meta') writes.meta += 1; },
  };
  const viewsKey = '__runmarkViews#' + (++bootCount); // per-boot: a later boot's restore() must never blind an earlier live boot
  const stage = installStage({
    storage, clock: installVirtualClock(), errors: captureConsoleErrors(),
    viewsKey, createElement: true, insertBefore: true, spans: true, hudRoot: true,
    fetchReject: true,
  });
  if (stage.hud['hud-ropes']) stage.hud['hud-ropes'] = stage.mk('span');
  // Seed index.html's real #hud children (pausemenu:127-128): the insertBefore
  // slot resolves by identity.
  for (const el of [stage.hud['hud-score'], stage.hud['hud-best'], stage.hud['hud-ropes'],
    stage.hud['hud-prompt'], stage.hud['hud-owned']]) if (el) stage.hudRoot.appendChild(el);
  await bootModule(await shellSrc({
    render3d: makeRenderStubHref({ viewsKey }), game: makeGameWrapHref(fileHref('game.js'), inject),
    audio: makeAudioWrapHref(fileHref('audio.js'), 'return a;'),
  }), 'runmark-boot');
  await settle(); // the shell's dynamic audio import lands one microtask later
  return { ...stage, map, writes, st: { t: 0 } };
}

// ---------- pumps (the shared tick idiom, pausemenu:144 donor) ----------

function tick(env, st) {
  st.t += 50;
  env.clock.t = st.t; // the virtual performance clock rides the pumped scalar
  env.frames.at(-1)(st.t);
}

const view = env => env.views.at(-1);
const keydown = (env, code) =>
  env.handlers.window.keydown({ code, repeat: false, preventDefault() {} });
const keyup = (env, code) => env.handlers.window.keyup({ code, repeat: false });
const press = env => keydown(env, 'Space');
const release = env => keyup(env, 'Space');
const pauseKey = env => keydown(env, 'KeyP');

// Scripted jumper (pausemenu pumpRunning donor): jump-holds when grounded
// with the rope in [0.20, 0.28). Throws loudly on trip — live-run pumps prove
// the run is alive, not the frame count.
function pumpRunning(env, st, frames) {
  for (let i = 0; i < frames; i++) {
    if (env.views.length === 0) { tick(env, st); continue; }
    const v = view(env);
    assert.notEqual(v.run.status, 'over', 'the scripted jumper tripped');
    if (v.run.status === 'running' && v.player.grounded
        && v.rope.phase >= 0.2 && v.rope.phase < 0.28) {
      press(env);
      tick(env, st);
      release(env);
      tick(env, st);
    } else {
      tick(env, st);
    }
  }
}

function startRunning(env) {
  press(env);
  tick(env, env.st);
  pumpRunning(env, env.st, 20);
  assert.equal(view(env).run.status, 'running', 'the boot reached running');
  return env.st;
}

// Pump until the run has scored `want` skips — the +=-delta witnesses must
// never be vacuous (a zero delta is satisfied by clobbering code too).
function pumpSkips(env, st, want) {
  for (let i = 0; i < 400 && view(env).run.skips < want; i++) {
    const v = view(env);
    assert.notEqual(v.run.status, 'over', 'the skip pump tripped');
    if (v.player.grounded && v.rope.phase >= 0.2 && v.rope.phase < 0.28) {
      press(env);
      tick(env, st);
      release(env);
      tick(env, st);
    } else {
      tick(env, st);
    }
  }
  assert.ok(view(env).run.skips >= want, `the pump scored at least ${want} skips`);
}

// The no-input drain (pausemenu L2 :427 donor): a grounded player meets the
// rope within a few revolutions — a REAL trip through the shipped death arm.
function tripWalk(env, st) {
  for (let i = 0; i < 400 && view(env).run.status !== 'over'; i++) tick(env, st);
  assert.equal(view(env).run.status, 'over', 'the no-input walk ends with a real trip');
  assert.equal(view(env).run.outcome, 'tripped', 'the ending is the shipped trip arm');
}

// Jump-hold pump that STOPS at over — leg (b) runs to the real summit, leg
// (c) keeps a restarted run briefly alive. Returns whether it ended.
function pumpToOver(env, st, cap) {
  for (let i = 0; i < cap && view(env).run.status === 'running'; i++) {
    const v = view(env);
    if (v.player.grounded && v.rope.phase >= 0.2 && v.rope.phase < 0.28) {
      press(env);
      tick(env, st);
      release(env);
      tick(env, st);
    } else {
      tick(env, st);
    }
  }
}

// ---------- (a) the run-end accrual, tripped outcome ----------

test('a tripped run end accrues {max(0,area), +0 summits, +=skips} EXACTLY ONCE beside saveBest (AC1/AC2, D1/D2 — leg a)', async () => {
  const env = await bootRunmarkShell();
  try {
    const st = startRunning(env);
    assert.equal(env.writes.meta, 0,
      'zero jumprope-meta writes while a run is LIVE — the accrual rides the run-end branch, not the tick (the pausemenu :424 tripwire mirrored in-file)');
    pumpSkips(env, st, 2); // a non-vacuous skips delta
    assert.equal(env.writes.meta, 0, 'still zero meta writes mid-walk — no per-tick accrual');
    tripWalk(env, st);
    tick(env, st);
    const run = view(env).run;
    assert.ok(run.skips > 0, 'the walk scored skips — the += delta is non-vacuous');
    const meta = JSON.parse(env.map.get('jumprope-meta'));
    assert.equal(meta.furthestArea, Math.max(0, run.area), 'furthestArea = MAX(0, area reached) (D2)');
    assert.equal(meta.summits, 0, 'a tripped run never moves summits (D2)');
    assert.equal(meta.skips, run.skips, 'lifetime skips = += the run-local delta (D2)');
    assert.equal(env.writes.meta, 1, 'EXACTLY ONE jumprope-meta write for the whole run (AC2)');
    assert.deepEqual([...env.map.keys()].sort(), ['jumprope-best', 'jumprope-meta'],
      'the run-end write lane is the two ledger keys — no second persistence path (AC1)');
  } finally {
    env.restore();
  }
});

// ---------- (b) the scripted summit ----------

test('a summit run end accrues summits +1 and furthestArea = the summit ladder, once (AC1, D2 — leg b)', async () => {
  const env = await bootRunmarkShell({ inject: SUMMIT_GAME_WRAP });
  try {
    const st = env.st;
    press(env); // idle -> startFreshRun -> the seeded near-summit state
    tick(env, st);
    pumpToOver(env, st, 800);
    const run = view(env).run;
    assert.equal(run.status, 'over', 'the walk ended');
    assert.equal(run.outcome, 'summit', 'it ended at the REAL summit branch (the wrapper only seeds the position and revives trips)');
    const meta = JSON.parse(env.map.get('jumprope-meta'));
    assert.equal(meta.summits, 1, "summits += 1 iff outcome === 'summit' (D2)");
    assert.equal(meta.furthestArea, run.area, 'furthestArea tracks the area reached (MAX, D2)');
    assert.equal(meta.furthestArea, SUMMIT_AREA, 'a summit walk has furthestArea at the top of the ladder');
    assert.ok(run.skips > 0, 'the seeded walk SCORES skips before the summit — the += delta is non-vacuous (review F2)');
    assert.equal(meta.skips, run.skips, 'the summit run accrues its skips too — BOTH endings accrue (D2)');
    assert.equal(env.writes.meta, 1, 'exactly ONE meta write — revived trips wrote nothing (AC2)');
  } finally {
    env.restore();
  }
});

// ---------- (c) exactly once per run ----------

test('idle, pause/resume, tab-hide and restart ticks leave meta BYTE-IDENTICAL with exactly ONE write per finished run (AC2, D1 — leg c)', async () => {
  const env = await bootRunmarkShell();
  try {
    const st = startRunning(env);
    tripWalk(env, st);
    assert.equal(env.writes.meta, 1, 'the ended run wrote meta exactly once');
    const raw = env.map.get('jumprope-meta');
    const run1Skips = view(env).run.skips;
    const same = why => {
      assert.equal(env.map.get('jumprope-meta'), raw, `meta byte-identical: ${why}`);
      assert.equal(env.writes.meta, 1, `write tally still ONE: ${why}`);
    };
    for (let i = 0; i < 30; i++) tick(env, st);
    same('idle death-screen ticks cannot re-fire accrual');
    // Review F1: the pause/tab-hide arms run on a LIVE run — enterPause is
    // running-gated (shell.js:275), so fired over a dead run the keys were
    // no-ops and the witnesses were unfalsifiable. Restart FIRST, then cycle.
    press(env);
    tick(env, st); // over + press ARMS the restart (shell.js:407)
    release(env);
    tick(env, st); // ...and the release starts the fresh run
    assert.equal(view(env).run.status, 'running', 'the restarted run is live');
    pumpToOver(env, st, 30); // briefly alive — the NEW run must not have ended yet
    assert.equal(view(env).run.status, 'running', 'the restarted run is still live (no second run end happened)');
    same('a live restarted run has written nothing — accrual is once-per-RUN, not once-per-game');
    pauseKey(env);
    tick(env, st);
    assert.match(env.hud['hud-prompt'].textContent, /paused/,
      'P on a LIVE run really freezes it — the pause witness is falsifiable (review F1)');
    for (let i = 0; i < 8; i++) tick(env, st);
    pauseKey(env); // P fully toggles (shell.js:326) — the resume path re-enters frame()
    for (let i = 0; i < 5; i++) tick(env, st);
    assert.equal(view(env).run.status, 'running', 'the resumed run is live again');
    same('a LIVE pause/resume round-trip cannot double-count (FR22 handler hygiene)');
    env.document.hidden = true;
    env.handlers.window.visibilitychange();
    for (let i = 0; i < 4; i++) tick(env, st);
    env.document.hidden = false;
    env.handlers.window.visibilitychange();
    for (let i = 0; i < 4; i++) tick(env, st);
    assert.equal(view(env).run.status, 'running', 'the tab-hide round-trip kept the run live, unwritten');
    same('a LIVE tab-hide round-trip cannot double-count');
    tripWalk(env, st); // the SECOND run ends with a real trip
    assert.equal(env.writes.meta, 2, 'the second run end wrote meta exactly ONE more time');
    const meta2 = JSON.parse(env.map.get('jumprope-meta'));
    assert.equal(meta2.skips, run1Skips + view(env).run.skips,
      'lifetime skips = run1 + run2 deltas — once-per-RUN accrual across a session (review F1)');
  } finally {
    env.restore();
  }
});

// ---------- (d) MAX monotonicity ----------

test('a pre-seeded higher furthestArea is NEVER lowered — MAX, not assignment (D2 — leg d)', async () => {
  const env = await bootRunmarkShell({
    storageMap: new Map([['jumprope-meta', '{"furthestArea":4,"summits":0,"skips":0}']]),
  });
  try {
    const st = startRunning(env);
    pumpSkips(env, st, 2);
    tripWalk(env, st);
    const run = view(env).run;
    assert.ok(run.area < 4, 'the ledger holds strictly ABOVE the area this run reached — the MAX arm is load-bearing');
    const meta = JSON.parse(env.map.get('jumprope-meta'));
    assert.equal(meta.furthestArea, 4, 'the ledger never regresses (D2: MAX, never assignment)');
    assert.equal(meta.summits, 0, 'summits ride through unchanged on a tripped run');
    assert.equal(meta.skips, run.skips, 'the skips ledger was seeded 0 — it equals the run delta (+=)');
    assert.equal(env.writes.meta, 1, 'one write for the run end');
  } finally {
    env.restore();
  }
});

// ---------- (e) lifetime accumulation ----------

test('pre-seeded skips/summits grow by EXACTLY the finished run\'s delta (D2 — leg e)', async () => {
  const env = await bootRunmarkShell({
    storageMap: new Map([['jumprope-meta', '{"furthestArea":0,"summits":2,"skips":7}']]),
  });
  try {
    const st = startRunning(env);
    pumpSkips(env, st, 2);
    tripWalk(env, st);
    const run = view(env).run;
    const meta = JSON.parse(env.map.get('jumprope-meta'));
    assert.ok(run.skips > 0, 'the run scored skips — the += delta is non-vacuous');
    assert.equal(meta.skips, 7 + run.skips, 'lifetime skips = seed += run-local delta (D2 — assignment would clobber to run.skips)');
    assert.equal(meta.summits, 2, 'a tripped run adds nothing to summits');
    assert.equal(meta.furthestArea, run.area, 'furthestArea = max(0, area) against a zero seed');
    assert.equal(env.writes.meta, 1, 'one write for the run end');
  } finally {
    env.restore();
  }
});

// ---------- (f) the try-hoist red-green pair (direct, bootless) ----------

test('saveMeta: nullish meta on HEALTHY storage THROWS (caller bug, loud); blocked storage with a POJO stays SILENT (D3, 7.1-F5 — leg f)', () => {
  // The metalegger fake idiom (copied, never imported): healthy + blocked.
  const data = new Map();
  const healthy = { getItem: k => (data.has(k) ? data.get(k) : null), setItem: (k, v) => { data.set(k, v); } };
  assert.throws(() => saveMeta(healthy, null), TypeError,
    'a lost shell-local is a caller BUG — it must surface as a TypeError, never die by the storage-unavailable catch (Blind F5)');
  assert.throws(() => saveMeta(healthy, undefined), TypeError, 'undefined meta throws the same way');
  const blocked = { getItem() { throw new Error('storage blocked'); }, setItem() { throw new Error('storage blocked'); } };
  assert.doesNotThrow(() => saveMeta(blocked, { furthestArea: 1, summits: 0, skips: 3 }),
    'blocked storage keeps its SILENT meaning — the catch catches storage, nothing else (the metalegger blocked-leg stays green untouched)');
});

// ---------- (g) the AC4 shape guard ----------

test('after runtime accrual the persisted meta JSON is EXACTLY the three counters — no run record rides along (AC4, permadeath — leg g)', async () => {
  const env = await bootRunmarkShell();
  try {
    const st = startRunning(env);
    tripWalk(env, st);
    const raw = env.map.get('jumprope-meta');
    assert.ok(raw, 'the runtime accrual persisted the ledger');
    assert.deepEqual(Object.keys(JSON.parse(raw)).sort(), ['furthestArea', 'skips', 'summits'],
      'the stored shape is closed at runtime too — the shell passes its shell-local meta, the sim record never rides along (architecture §Persistence)');
  } finally {
    env.restore();
  }
});
