import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  bootModule, captureConsoleErrors, dataUrl, fileHref, installStage, installVirtualClock,
  makeAudioWrapHref, makeGameWrapHref, makeRenderStubHref, settle, shellSrc,
} from './support/shell-harness.js';
import { CARDS } from '../js/upgrades.js';
import { jumpVelocity } from '../js/player.js';

// Chore pre-6.6 (D4): the auto-hop press window (ledger :136) + the digit/
// hitstop gate (ledger :143). Expectations derive from the card records and
// shipped physics exports, never a hardcoded table (NFR5).
// Harness: the pickerhud.test.js mk() DOM + virtual-clock boot crossed with
// the secondwind.test.js boot shape (data-URL source rewrite, recording
// render/audio wrappers, startRun state seeding). Boot fork #6 — counted for
// the harness-consolidation chore. THREE boots total (L1, L2, and ONE shared
// no-card boot for L6 -> L3 -> L4); every window here (441.7 ms auto-hop,
// 450 ms D-07 lock, 40/80 ms hitstops, 800 ms PICK_HOLD_MS) is crossed on the
// fake monotonic clock, never wall-clock timing (NFR4).
// Shell-seam note: like pickerhud, no relative import specifier into js/
// appears below, so boundary.test.js's SPECIFIER_RE walk never sees it.
//
// Mutation matrix (Task 2b; /tmp-clone idiom, one mutant alone per run):
// M1 drop armLeadInHop in startFreshRun  -> L1 + L2 red (+ L6, + L5 census).
// M2 flag never cleared                  -> the post-landing airborne SPEND
//                                            leg red + L6 + the L5 clear census.
// M3 flag honored in the press-arm only  -> L1 red (release still discriminates
//                                            on raw player.grounded).
// M4 digit guard removed                 -> L4a red + the L5 guard census.
// M5 guard widened over the whole choose region (arrows too) -> the L4 arrow
//                                            cycle sub-leg red (confirm-only).
// M6 clear-on-grounded-observation-only  -> L6 red (the replacing-flight tap
//                                            would launch instead of deny).

const testsDir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(testsDir, '..', 'js');
const FR = 4; // fake ms per pumped frame (secondwind pump idiom)
const CARD = (id) => CARDS.find((c) => c.id === id);

let bootCount = 0;

// Wrapper authors (the fork's data-URL seams; per-boot keys keep a later
// boot's restore() from blinding an earlier live boot).
const lhGameWrapHref = (scriptKey, seedBits) => makeGameWrapHref(fileHref('game.js'), `
  export const startRun = ${seedBits.length > 0
    ? `() => {
    const s = real.startRun();
    return { ...s, run: { ...s.run, ${seedBits.join(', ')} } };
  }`
    : '() => real.startRun()'};
  export const tickRun = (...a) => {
    const s = globalThis["${scriptKey}"];
    if (s.forcePhase !== null) {
      a = [a[0], { ...a[1], phase: s.forcePhase }, ...a.slice(2)];
      s.forcePhase = null;
    } else if (s.park) {
      a = [a[0], { ...a[1], phase: 0.05, period: 100 }, ...a.slice(2)];
    }
    const out = real.tickRun(...a);
    if (s.stamp && out.run.status === "running") {
      s.stamp = false;
      return { ...out,
        run: { ...out.run, status: "choose", offer: s.chooseOffer },
        events: [...(out.events ?? []), ...(s.injectEvents ?? [])] };
    }
    return out;
  };`);
// Player spy wrapper: logs every player-driven jump's hold/vy; the
// constructed hop built inside game.js leadIn() never transits it.
const lhPlayerWrapHref = (jumpKey) => dataUrl(`
import * as real from "${fileHref('player.js')}";
export const createPlayer = real.createPlayer;
export const jumpVelocity = real.jumpVelocity;
export const jump = (player, hold, mul) => {
  const out = real.jump(player, hold, mul);
  globalThis["${jumpKey}"].push({ hold, vy: out.vy });
  return out;
};`);
const lhAudioWrapHref = (voiceKey) => makeAudioWrapHref(fileHref('audio.js'), `
  return { ...a, handleEvent(n) {
    globalThis["${voiceKey}"].push(n);
    return a.handleEvent(n);
  } };`);

// One boot of the REAL js/shell.js frame loop: render3d -> recording stub,
// game.js -> wrapper (startRun seeding + rope parking + forced-phase trip rig
// + scripted choose stamps with optional juice-event injection), player.js ->
// spy wrapper (logs every player-driven jump's hold/vy; the constructed hop
// built inside game.js leadIn() never transits it), audio.js -> wrapper
// logging every handleEvent NAME (feelcap/secondwind audioWrap precedent).
async function bootLH({ own = null, airJumps = null } = {}) {
  const id = `lh${++bootCount}`;
  const [viewKey, voiceKey, jumpKey, scriptKey] =
    [`__lhViews_${id}`, `__lhVoices_${id}`, `__lhJumps_${id}`, `__lhScript_${id}`];
  const voices = [];
  const jumps = [];
  const script = { park: false, forcePhase: null, stamp: false, chooseOffer: null, injectEvents: [] };
  const seedBits = [];
  if (own !== null) seedBits.push(`owned: ${JSON.stringify(own)}`);
  if (airJumps !== null) seedBits.push(`airJumps: ${JSON.stringify(airJumps)}`);
  const stage = installStage({
    storage: { getItem: () => null, setItem: () => {} },
    clock: installVirtualClock(), errors: captureConsoleErrors(),
    metrics: true, createElement: true, deleteAudioContext: true,
    viewsKey: viewKey, globals: { [voiceKey]: voices, [jumpKey]: jumps, [scriptKey]: script },
  });
  await bootModule(await shellSrc({
    render3d: makeRenderStubHref({ viewsKey: viewKey }),
    game: lhGameWrapHref(scriptKey, seedBits),
    player: lhPlayerWrapHref(jumpKey),
    audio: lhAudioWrapHref(voiceKey),
  }), 'leadinhop-boot');
  await settle(); // the shell's dynamic audio import lands one microtask later
  return { ...stage, voices, jumps, script };
}

// ---------- kit (secondwind donor idioms) ----------

function pump(env, n = 1) {
  for (let i = 0; i < n; i += 1) {
    env.clock.t += FR;
    env.frames.at(-1)(env.clock.t);
  }
}

function key(env, code) {
  let prevented = 0;
  env.handlers.window.keydown({ code, repeat: false, preventDefault() { prevented += 1; } });
  return { prevented: () => prevented };
}

function up(env, code = 'Space') {
  env.handlers.window.keyup({ code });
}

// One full press: keydown, three pumps (any acc phase fires >= 1 STEP in
// 12 ms, consuming pressIntent -> holdFrom), keyup, three pumps (same
// argument consumes the release -> the launch/deny/spend decision).
function pressCycle(env) {
  key(env, 'Space');
  pump(env, 3);
  up(env);
  pump(env, 3);
}

function view(env) { return env.views.at(-1); }
function voiceCount(env, name) { return env.voices.filter((v) => v === name).length; }
function jumpN(env) { return env.jumps.length; }
function lastJump(env) { return env.jumps.at(-1); }

// vy rises (launches) strictly while airborne between the two view snapshots
// (secondwind's launch counter — the DENIED tap must move it by zero).
function vySeries(env, a, b) {
  return env.views.slice(a, b).map((v) => v.player.vy);
}
function countLaunches(series) {
  let n = 0;
  for (let i = 1; i < series.length; i += 1) {
    if (series[i] > series[i - 1] + 100) n += 1;
  }
  return n;
}

// The player-driven launch a tap must produce: jumpVelocity(hold) exactly
// (the shipped hold model), NEVER the constructed hop's jumpVelocity(0.1).
function assertPlayerLaunch(env, jumps0, voices0, why) {
  assert.equal(jumpN(env), jumps0 + 1, `${why}: exactly one player-driven jump() call`);
  const j = lastJump(env);
  assert.ok(j.hold < 0.1, `${why}: the hold sits under the auto-hop's 0.1 s stamp`);
  assert.equal(j.vy, jumpVelocity(j.hold), `${why}: vy is the hold model exactly`);
  assert.ok(j.vy < jumpVelocity(0.1), `${why}: not the constructed hop's 400`);
  assert.equal(voiceCount(env, 'jump') - voices0, 1, `${why}: one jump voice`);
}

// The idle-space start (press begins at idle; the release arms nothing).
function startRunTap(env) {
  key(env, 'Space');
  pump(env, 3);
  assert.equal(view(env).run.status, 'running', 'the opening Space started the run');
  up(env);
  pump(env, 3);
}

function landHop(env, budget = 300) {
  for (let g = 0; g < budget && !view(env).player.grounded; g += 1) pump(env);
  assert.ok(view(env).player.grounded, 'the hop landed inside the budget');
}

function toDescend(env, budget = 200) {
  for (let g = 0; g < budget; g += 1) {
    if (!view(env).player.grounded && view(env).player.vy < 0) return;
    pump(env);
  }
  assert.fail('the flight never reached its descent within the budget');
}

// Drive to the next scripted choose stamp (the wrapper's one-shot arm).
function toChoose(env, budget = 10) {
  for (let g = 0; g < budget && view(env).run.status !== 'choose'; g += 1) pump(env);
  assert.equal(view(env).run.status, 'choose', 'the scripted freeze landed at choose');
}

// ---------- L1 — cold boot: the constructed opening hop ----------

test('L1 cold boot: a press begun inside the auto-hop LAUNCHES (grounded path, charge untouched); post-landing behavior byte-identical', async () => {
  const env = await bootLH({ own: { doublejump: 1 } });
  try {
    env.script.park = true; // rope parked: the legs read player physics only
    startRunTap(env);
    // The constructed auto-hop is airborne from frame 0 (ledger :136).
    assert.equal(view(env).player.grounded, false, 'the opening hop is airborne');

    // Press+release INSIDE the hop window, before any landing: the launch is
    // real (voice + hold model, not a silent death and not a charge spend).
    assert.equal(jumpN(env), 0, 'no player-driven jump has fired yet');
    const j0 = jumpN(env); const v0 = voiceCount(env, 'jump');
    pressCycle(env);
    assertPlayerLaunch(env, j0, v0, 'the hop-window tap');
    assert.equal(view(env).run.airJumps, 0, 'no charge was spent anywhere');
    assert.equal(view(env).player.grounded, false, 'D3: the tap replaced the hop, still airborne');

    // Land (the FR17 refresh lifts the charge to 1). The one-shot grace was
    // consumed by the hop-tap launch (D1/R2), so what follows is v1 exactly.
    landHop(env);
    assert.equal(view(env).run.airJumps, 1, 'ground contact refreshed the charge');
    const j1 = jumpN(env); const v1 = voiceCount(env, 'jump');
    pressCycle(env); // grounded tap after landing: byte-identical baseline
    assertPlayerLaunch(env, j1, v1, 'the post-landing grounded tap');

    // The first airborne tap after a real landing SPENDS (kills M2: a flag
    // that never clears would launch this tap free through the grounded
    // path and leave the charge whole).
    toDescend(env);
    assert.equal(view(env).run.airJumps, 1, 'still charged before the airborne tap');
    const j2 = jumpN(env); const v2 = voiceCount(env, 'jump');
    pressCycle(env);
    assert.equal(jumpN(env), j2 + 1, 'the airborne tap launched (a spend)');
    assert.equal(view(env).run.airJumps, 0, 'the Second Wind charge SPENT — baseline FR17 intact');
    assert.equal(voiceCount(env, 'jump') - v2, 1, 'one jump voice for the spend');
  } finally { env.restore(); }
});

// ---------- L2 — death-restart through the auto-hop ----------

test('L2 death-restart: the restart hop tap LAUNCHES and structurally CANNOT spend the seeded charge; a bare release stays a denial', async () => {
  const env = await bootLH({ own: { doublejump: 1 }, airJumps: 1 });
  try {
    startRunTap(env);
    landHop(env);
    // Trip: the forced feet-window crossing under a grounded player (the
    // secondwind forcePhase rig idiom).
    env.script.forcePhase = 0.4494;
    for (let g = 0; g < 10 && view(env).run.status === 'running'; g += 1) pump(env);
    assert.equal(view(env).run.status, 'over', 'the forced crossing tripped');
    pump(env, 24); // outlive the 80 ms trip hitstop before the restart press

    key(env, 'Space'); pump(env, 3); // over: arms the restart (FR22)
    up(env); pump(env, 3);           // release: startFreshRun — the hop is live
    assert.equal(view(env).run.status, 'running', 'the restart tap restarted');
    assert.equal(view(env).player.grounded, false, 'the restarted run opens airborne');
    assert.equal(view(env).run.airJumps, 1, 'the seeded charge is live (mid-air, no contact)');

    // The hop tap symptom 1 died on: it LAUNCHES and must NOT spend, even
    // though clampAirJumps(1) >= 1 would otherwise take the charge.
    const j0 = jumpN(env); const v0 = voiceCount(env, 'jump');
    pressCycle(env);
    assertPlayerLaunch(env, j0, v0, 'the restart hop tap');
    assert.equal(view(env).run.airJumps, 1, 'the charge survived — the hop spend is structurally gone');

    // A bare release (no press armed) during the replacing flight stays the
    // shipped pure denial: no launch, no voice, charge untouched.
    const j1 = jumpN(env);
    up(env); pump(env, 3);
    assert.equal(jumpN(env), j1, 'the bare release launched nothing');
    assert.equal(voiceCount(env, 'jump'), v0 + 1, 'the bare release voiced nothing');
    assert.equal(view(env).run.airJumps, 1, 'the bare release spent nothing');
  } finally { env.restore(); }
});

// ---------- L6 -> L3 -> L4: ONE shared no-card boot (boot 3 of 3) ----------

// The shared boot: L6 runs its cold-boot lifecycle FIRST (fresh idle start),
// then the same run continues into the pick/freeze legs. Booted lazily at
// the top of L6 — never module-load-parallel with the L1/L2 boots (those are
// restored before L6 runs) — so exactly THREE boots exist (D4) and no global
// stub ever doubles across live shells; L4's finally restores the last ones.
let env3 = null;

test('L6 the grace is one-shot: the hop tap launches, a SECOND airborne tap during the replacing flight is DENIED (v1 parity, no grace chain)', async () => {
  if (env3 === null) {
    env3 = await bootLH();
    env3.script.park = true;
  }
  const env = env3;
  startRunTap(env);
  assert.equal(view(env).player.grounded, false, 'the opening hop is airborne');

  // Tap one: the grace launch (spy + voice — vy deltas cannot witness a tap
  // during the hop's own ascent).
  const j0 = jumpN(env); const v0 = voiceCount(env, 'jump');
  pressCycle(env);
  assertPlayerLaunch(env, j0, v0, 'the hop tap');

  // Tap two DURING the replacing flight: the launch consumed the flag, so
  // this is the v1 airborne press — SILENT DENIAL, no countLaunches move
  // (kills M6: a flag cleared only on grounded observation would launch).
  toDescend(env);
  const t0 = env.views.length;
  const j1 = jumpN(env); const v1 = voiceCount(env, 'jump');
  pressCycle(env);
  assert.equal(jumpN(env), j1, 'the second airborne tap launched nothing');
  assert.equal(countLaunches(vySeries(env, t0, env.views.length)), 0,
    'countLaunches delta 0 — the replacing flight stays a single launch');
  assert.equal(voiceCount(env, 'jump') - v1, 0, 'the denial is silent (no voice)');
  assert.equal(view(env).run.airJumps, 0, 'no charge exists, none invented');
  assert.equal(view(env).player.grounded, false, 'still airborne on the replacing flight');
  landHop(env); // hand the run over landed for the pick legs
});

test('L3 post-pick floatMul hop: a tap past the 450 ms lock but inside the stretched airtime LAUNCHES; the D-07 window itself still discards', async () => {
  const env = env3;
  env.script.chooseOffer = [CARD('float')];
  env.script.stamp = true;
  toChoose(env);
  const tPick = env.clock.t;
  key(env, 'Digit1'); // confirm through the shared confirmPick (the hop re-arms)
  pump(env, 1); // render the post-handler state (the frame loop renders every frame)
  assert.equal(view(env).run.status, 'running', 'the digit confirmed the pick');
  assert.equal(view(env).run.effects.floatMul, 1.15, 'Cloud Shoes applied');
  assert.equal(voiceCount(env, 'pick'), 1, 'one pick voice');

  // floatMul 1.15 stretches the auto-hop to ~511 ms — past the 450 ms D-07
  // lock. A tap in that band used to deny silently (symptom 2).
  while (env.clock.t - tPick < 458) pump(env);
  assert.equal(view(env).player.grounded, false, 'still airborne inside the stretched hop');
  const j0 = jumpN(env); const v0 = voiceCount(env, 'jump');
  pressCycle(env);
  assertPlayerLaunch(env, j0, v0, 'the 450..airtime tap');
  assert.equal(view(env).run.airJumps, 0, 'no spend on the stretched-hop tap either');

  // The D-07 lock itself is UNTOUCHED: a press begun inside 450 ms of a
  // pick-confirm stays discarded — zero launches, zero voices, nothing.
  env.script.chooseOffer = [CARD('tally')];
  env.script.stamp = true;
  toChoose(env);
  key(env, 'Digit1');
  pump(env, 1); // render the post-handler state
  assert.equal(view(env).run.status, 'running', 'the second pick confirmed');
  const j1 = jumpN(env); const v1 = voiceCount(env, 'jump');
  pressCycle(env); // entirely inside the window: discarded end to end
  assert.equal(jumpN(env), j1, 'the in-window press launched nothing');
  assert.equal(voiceCount(env, 'jump') - v1, 0, 'the in-window press voiced nothing');
});

test('L4 digit/hitstop: Digit1 inside a live hitstop is inert (no confirm, no applyCard delta); past stopUntil it confirms ONCE; the arrow cycle stays live through the freeze', async () => {
  const env = env3;
  try {
    // L4a — digit vs freeze: stamp choose with a nearMiss event injected on
    // the SAME tick (JUICE_TIERS.nearMiss hitstop 40 ms, shell :724 idiom).
    env.script.chooseOffer = [CARD('float'), CARD('multi'), CARD('tally')];
    env.script.injectEvents = ['nearMiss'];
    env.script.stamp = true;
    toChoose(env);
    const mul0 = view(env).run.effects.floatMul;
    const p0 = voiceCount(env, 'pick');
    const tStamp = env.clock.t; // the stamp frame set stopUntil = tStamp + 40
    key(env, 'Digit1'); // inside the freeze (now < stopUntil)
    pump(env, 1); // the freeze keeps RENDERING every frame — post-handler state shows
    assert.equal(view(env).run.status, 'choose', 'the digit did NOT confirm during the hitstop');
    assert.equal(voiceCount(env, 'pick'), p0, 'no pick voice inside the freeze');
    assert.equal(view(env).run.effects.floatMul, mul0, 'no applyCard delta inside the freeze');
    pump(env, 10); // past stopUntil (the witness pump already spent 4 ms)
    key(env, 'Digit1');
    pump(env, 1); // render the post-handler state
    assert.equal(view(env).run.status, 'running', 'the digit confirms once the freeze passed');
    assert.equal(voiceCount(env, 'pick') - p0, 1, 'confirmed exactly once');
    assert.equal(view(env).run.effects.floatMul, mul0 * 1.15, 'offer[0] landed through the guarded path');

    // L4b — the guard is CONFIRM-ONLY (kills M5): the arrow branch must keep
    // cycling DURING the freeze, exactly as shipped.
    env.script.chooseOffer = [CARD('multi'), CARD('tally'), CARD('extrarope')];
    env.script.stamp = true;
    toChoose(env);
    const tally0 = view(env).run.owned.tally ?? 0;
    const ropes0 = view(env).run.ropes;
    const a = key(env, 'ArrowRight'); // inside this freeze
    assert.equal(a.prevented(), 1, 'the arrow cycle stayed live through the freeze (guard is confirm-only)');
    pump(env, 12); // past stopUntil
    key(env, 'Space'); // the hold path re-arms AND cycles: pickIdx 1 -> 2
    assert.equal(view(env).run.status, 'choose', 'the hold is charging');
    pump(env, 210); // PICK_HOLD_MS 800 ms
    assert.equal(view(env).run.status, 'running', 'the hold-confirm fired');
    assert.equal(view(env).run.owned.tally ?? 0, tally0, 'offer[1] was NOT picked');
    assert.equal(view(env).run.ropes, ropes0 + 1, 'offer[2] (arrow cycle + press cycle) was picked');
    up(env);
    pump(env, 3);
  } finally { env.restore(); }
});

// ---------- L5 — fences (source census; no boot) ----------

test('L5 fences: three arming sites, two retire-site writes, the D-07 writes stay the shipped three, the digit guard is confirm-only, the key map is the frozen 14', async () => {
  const src = await readFile(resolve(jsDir, 'shell.js'), 'utf8');
  // armLeadInHop(): exactly the three constructed-hop calls, one definition.
  assert.equal((src.match(/armLeadInHop\(\);/g) ?? []).length, 3,
    'the flag arms at the constructed hops only (startFreshRun / resumeFromPause / confirmPick)');
  assert.equal((src.match(/const armLeadInHop = \(\) =>/g) ?? []).length, 1,
    'one shared handler, no per-path duplication');
  // leadInHop: init + the ONE clear line, nothing else writes false.
  assert.equal((src.match(/leadInHop = false/g) ?? []).length, 2,
    'the flag is written false exactly at init and the single grounded-path clear');
  assert.equal((src.match(/leadInHop = true/g) ?? []).length, 1,
    'true is written inside the shared helper only');
  // D-07: reentryAt keeps its shipped three writes — nothing new armed.
  assert.equal((src.match(/reentryAt\s*=[^=]/g) ?? []).length, 3,
    'the D-07 lock stays armed at exactly its shipped three sites (candidate A stays rejected)');
  // D2: the guard sits in the digit branch condition only...
  const arrow = src.indexOf("if (run.status === 'choose' && run.offer && (e.code === 'ArrowLeft'");
  const digit = src.indexOf("if (run.status === 'choose' && run.offer && !e.repeat");
  assert.ok(arrow !== -1 && digit > arrow, 'both choose-region branches found');
  assert.ok(!src.slice(arrow, digit).includes('stopUntil'),
    'the arrow branch is NOT frozen-gated — the cycle stays live (M5 tripwire)');
  assert.match(src.slice(digit, src.indexOf('confirmPick();', digit)),
    /performance\.now\(\) >= stopUntil/, 'the digit branch carries the freeze guard');
  // Zero new key bindings: the shipped 14-code map, deep-equal (secondwind
  // AC4's idiom — the digit guard adds a CONDITION, never a binding).
  const codes = [...new Set([...src.matchAll(/e\.code === '([A-Za-z0-9_]+)'/g)].map((m) => m[1]))].sort();
  assert.deepEqual(codes, ['ArrowLeft', 'ArrowRight', 'Digit1', 'Digit2', 'Digit3', 'Equal', 'Escape', 'KeyP', 'Minus', 'Mute', 'Numpad1', 'Numpad2', 'Numpad3', 'Space'],
    'the keyboard map is frozen — this chore adds no binding (NFR5)');
});

test('leadinhop: boot logged no console.error', async () => {
  const env = await bootLH();
  try {
    assert.deepEqual(env.errors, [],
      'the consolidated boot surfaced nothing through the console.error capture (chore error leg)');
  } finally { env.restore(); }
});
