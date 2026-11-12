import { createRun, tickRun, applyCard, resumeRun, loadBest, saveBest, loadMeta, saveMeta, startRun, ROPE_PERIOD, CARDS, lockedIdsFor, clampRopes, MIN_ROPES, AREAS, SUMMIT_AREA, clampCharged, clampAirJumps } from './game.js';
import { createRope } from './rope.js';
import { createPlayer, jump } from './player.js';
import { createScene } from './render3d.js';

const STEP = 1 / 120;
const PICK_HOLD_MS = 800;
const LEAD_IN_MS = 450;
const FLASH_MS = 150;

// FEEL-02 (D-N06/D-N12): the single source of truth for juice magnitudes —
// event tier (skip < nearMiss < trip) scaled by significance. Seeds are
// PROVISIONAL; morning playtest re-tunes values as a data-only diff here and
// nowhere else. 'jump' is intentionally absent: it gets no juice.
export const JUICE_TIERS = {
  skip: { hitstop: 8, shake: 0.5, particles: 4 },
  nearMiss: { hitstop: 40, shake: 1.5, particles: 10 },
  chargeUsed: { hitstop: 50, shake: 1.6, particles: 11 },  // FR16 seam: an absorbed hit out-juices a close call, stays under the ceiling break; seed provisional — 6.2 retunes (Story 5.3)
  ascend: { hitstop: 60, shake: 1.75, particles: 12 },  // FR16 ceiling-break beat; seed provisional — 6.2 retunes (Story 4.4)
  ropeLost: { hitstop: 65, shake: 1.9, particles: 14 },  // FR28 rope-loss thud beat; seed provisional — 6.2 retunes (Story 5.2)
  win: { hitstop: 0, shake: 1.95, particles: 15 },  // FR16 seam: summit reached — leaf strictly under death, and hitstop 0 never freezes the tick that ENDS the run (design call, story scan B); seed provisional — 6.2 retunes (Story 5.3)
  trip: { hitstop: 80, shake: 2, particles: 16 }
};

// Story 5.7 (D5): the ONE volume-step law (FR24, AGENTS.md:53 shared handler) —
// the `-`/`=` keydowns and both pause-menu buttons all route bumpVolume; the
// clamp lives in audio.setVolume (audio.js:224), so this is a step, not a time.
// (Placed after JUICE_TIERS, not the :6-9 timing block the story names: the
// frozen audiolifecycle L5 census pins the tiers' line positions by LINE.)
const VOLUME_STEP = 0.1;

// The buffer tracks the window (coerced so Node-side stub environments
// without innerWidth fall back to the old default and stay green);
// js/render3d.js discovers size changes through its passive poll.
function windowSize() {
  return [Number(window.innerWidth) || 480, Number(window.innerHeight) || 640];
}

// UI-03 (D-07): the aspect clamp band — outside it the canvas box is shrunk to
// the band edge and the black page background shows through as letterbox bars.
// RESEARCH A5: the 480×640 harness fallback sits exactly on the 3:4 edge, so
// MIN must not exceed 0.75 or the Node boots would grow surprise bars.
const ASPECT_MIN = 3 / 4;
const ASPECT_MAX = 2 / 1;

// Story 8.1 (FR36 seam, NFR16): the skin-record normalizer — a PURE factory,
// invalid states are data: a non-object record or a non-integer color
// collapses to an ABSENT key, and the renderer's ONE application site falls
// back to the shipped defaults. Shape-sanitize only, zero browser IO (the
// boundary walk stays green). D3 landing note: shell-internal — a fifth
// static specifier would break the shipped-four shell census (summitapproach
// §4.2), so the factory lives here and tests extract it by source text.
function normalizeSkin(raw) {
  const colorsIn = typeof raw?.colors === 'object' && raw.colors !== null ? raw.colors : null;
  const colors = {};
  for (const key of ['rose', 'prop', 'limb']) {
    if (colorsIn && Number.isInteger(colorsIn[key])) colors[key] = colorsIn[key];
  }
  return { name: String(raw?.name ?? ''), colors };
}

// Story 8.2 (FR39, P2 = URL query param): the shipped built-in skin table —
// plain DATA with lowercase keys. The value of ?skin= is a KEY into this
// table, NEVER a path or URL — the zero-request law (AC2: nothing is ever
// fetched from the param). 'mint' is Story 8.1's legibility-certified
// witness (tests/skins.test.js §g; the 8.1 D4 colors), so the mechanism has
// a live proof: ?skin=mint visibly recolors the run, no art decision needed.
const SKINS = { mint: { name: 'mint', colors: { rose: 0x7ce38b, prop: 0x10151f, limb: 0x9aa4b2 } } };

// Story 8.2 (D3, AC4): the equip resolver — a PURE factory, shell-internal
// (the 8.1 D3 landing lesson holds: a fifth static specifier would break the
// frozen four-specifier shell census, summitapproach §4.2). Raw search STRING
// in ('' = none), table record or undefined out. URLSearchParams is a pure
// global — the LOOK_KNOBS idiom (render3d.js:53) is the precedent; keys are
// lowercase so ?skin=Mint hits; Object.hasOwn is the law — NOT table[v]:
// ?skin=constructor must MISS, the prototype chain is not inventory. Never
// throws, never does IO; a miss yields undefined -> normalizeSkin -> the
// shipped defaults, i.e. inert default + total silence (UX-DR2, NFR16).
function resolveSkinParam(search, table) {
  const v = new URLSearchParams(search).get('skin');
  if (typeof v !== 'string') return undefined;
  const k = v.toLowerCase();
  return Object.hasOwn(table, k) ? table[k] : undefined;
}

// Story 8.3 (FR36, P1 = cosmetic-only schema v1): mods are DATA. A manifest is
// one read, one parse, one strict validator — and a valid record's optional
// skin composes into the equip expression at the ONE boot site below. NOTHING
// a manifest carries is ever executed (the data-only law). Schema v1 declares
// EXACTLY {v, name, skin?}: v the integer 1; name a 1..64-char display string
// (inert — zero copy ships, UX-DR2 silence); skin the optional record
// { name, colors } with all three of rose/prop/limb integers 0..0xFFFFFF.
// The RANGE law lives in this validator (P1a disposition, the BH-4 ledger
// item): normalizeSkin above stays shape-only. Every violation drops the
// WHOLE manifest (the P1 fallback law) and every null lands at the same
// shipped-default silence (NFR16). Shell-internal per the 8.1/8.2 D3 scar: a
// fifth static specifier would break the frozen shipped-four shell census.

// The payload cap (D3): one source-pinned literal, the track1 static-host-
// budget idiom (tests/track1.test.js:44) — a larger manifest is a violation.
const MOD_MANIFEST_MAX_BYTES = 65536;

// The read deadline (D3, review-round amendment EH-1/BH-1): the module's ONE
// top-level await must ALWAYS settle — an accepted-but-unanswered connection
// aborts at this cap and lands at the same null silence as every other
// failure mode (AC3 universality). 3 s: generous for a same-origin static
// file, short enough that a wedged host cannot hold first paint hostage.
const MOD_MANIFEST_TIMEOUT_MS = 3000;

// The validator (D1): JSON text in, validated manifest object or null out —
// pure, all-or-nothing, never throws, never logs, zero IO tokens. A
// __proto__ arriving from the decoder is an OWN key: the subset gate rejects
// it and Object.prototype stays clean. Duplicate keys are resolved by the
// decoder (last wins) BEFORE the gate reads them — duplicate v lands on v:2
// and dies at the strict version check.
function parseModManifest(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  for (const key of Object.keys(raw)) {
    if (key !== 'v' && key !== 'name' && key !== 'skin') return null;
  }
  if (raw.v !== 1) return null;
  if (typeof raw.name !== 'string' || raw.name.length < 1 || raw.name.length > 64) return null;
  if ('skin' in raw) {
    const rec = raw.skin;
    if (typeof rec !== 'object' || rec === null || Array.isArray(rec)) return null;
    for (const key of Object.keys(rec)) {
      if (key !== 'name' && key !== 'colors') return null;
    }
    if (typeof rec.name !== 'string' || rec.name.length < 1 || rec.name.length > 64) return null;
    const colors = rec.colors;
    if (typeof colors !== 'object' || colors === null || Array.isArray(colors)) return null;
    for (const key of Object.keys(colors)) {
      if (key !== 'rose' && key !== 'prop' && key !== 'limb') return null;
    }
    // All three present AND in range (the gate above already killed any
    // surplus key): a missing key fails Number.isInteger(undefined), so a
    // half-record is unrepresentable — the whole manifest drops (D1).
    for (const key of ['rose', 'prop', 'limb']) {
      if (!Number.isInteger(colors[key]) || colors[key] < 0 || colors[key] > 0xffffff) return null;
    }
  }
  return raw;
}

// The mods param resolver (D3): the resolveSkinParam twin — a PATH LAW, not a
// table hit. The value must be lowercase, <= 128 chars, rooted under mods/,
// end .json, carry no scheme/drive/query/fragment/percent characters, and
// hold no empty or '..' segment. Returns the value VERBATIM — it is a PATH
// under mods/, never a URL — or null. Pure: the read belongs to the seam.
function resolveModsParam(search) {
  const v = new URLSearchParams(search).get('mods');
  if (typeof v !== 'string') return null;
  if (v !== v.toLowerCase() || v.length > 128) return null;
  if (!v.startsWith('mods/') || !v.endsWith('.json')) return null;
  if (/[:\\?#%]/.test(v)) return null;
  for (const segment of v.split('/')) {
    if (segment === '' || segment === '..') return null;
  }
  return v;
}

// The loader (D3): the shell's ONE read channel — the only fetch CALL token
// in js/ outside the audio module's own injected lane (byte-zero, cited via
// the diff-fact census). The short-circuit order IS the AC2 law: a null url
// (no param) returns BEFORE the channel is ever touched — parameterless
// boots are zero-request (NFR14). One fetch, one buffer, then the validator
// owns the decoded text. NEVER rejects, NEVER logs: the catch is the silence
// that keeps the boot-fork error spies green (UX-DR2).
async function loadModManifest(url) {
  if (!url || typeof fetch !== 'function') return null;
  try {
    // The signal is the AC3 deadline: a stalled response aborts (an
    // AbortError rejection) into the catch below — never an unsettled boot.
    const res = await fetch(url, {
      signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(MOD_MANIFEST_TIMEOUT_MS) : undefined,
    });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > MOD_MANIFEST_MAX_BYTES) return null;
    return parseModManifest(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

// Story 8.3 (D4): the boot seam MOVES to module scope — the 8.2 guard line
// lands here VERBATIM (still exactly one guarded read site on one line; the
// scope is census-irrelevant, and resolveModsParam parses the mods param from
// this SAME string — there is no second read site). The manifest pre-resolves
// during module evaluation: a data-URL module's promise settles only AFTER
// its top-level awaits complete, so bootModule's import absorbs this one
// await and all seven boot forks land exactly as before (the timing law —
// startGame stays synchronous; this is the module's ONLY top-level await).
// A manifest skin is a boot INPUT, never a runtime retint (purity rider).
const equipSearch = typeof location !== 'undefined' && location.search ? location.search : '';
const modManifest = await loadModManifest(resolveModsParam(equipSearch));

export function startGame(canvas) {
  // UI-03 (D-07/D-10): one contain-fit band computation sizes BOTH the CSS box
  // and the backing buffer — render3d's passive poll re-derives RT, snap grid
  // and camera aspect from canvas.width/height, and CSS-only or buffer-only
  // writes would each re-introduce the distortion (Pitfall 9). In-band windows
  // compute dw = innerWidth, dh = innerHeight: the pixel-identical passthrough.
  function applyWindowSize() {
    const [w, h] = windowSize(); // the Number(x) || fallback coercion is the NaN guard (T-05-05)
    const aspect = Math.min(ASPECT_MAX, Math.max(ASPECT_MIN, w / h));
    const dw = Math.round(Math.min(w, h * aspect));
    const dh = Math.round(Math.min(h, w / aspect));
    canvas.style.width = dw + 'px';
    canvas.style.height = dh + 'px';
    [canvas.width, canvas.height] = [Math.max(2, dw), Math.max(2, dh)];
  }
  applyWindowSize();
  // Story 8.1 (FR36/FR39): the ONE skin boot site; Story 8.2's P2 mechanism
  // (URL query param — the user decision 2026-11-12) and Story 8.3's manifest
  // skin (P1: the mods param, pre-resolved at module scope above) compose at
  // this ONE consumption site. The ?? tail spells the PRECEDENCE law (D4): an
  // explicit table hit BEATS the manifest record; a table miss auto-equips a
  // valid manifest's skin; both flow through the SAME normalizeSkin into the
  // ONE createScene application site (the one-seam law — the renderer stays
  // byte-zero). Absent or invalid resolves to undefined -> the placeholder
  // record -> zero color writes: the byte-inert 8.1/8.2 composition, inert
  // default + total silence (UX-DR2, NFR16), nothing persisted (D6), and a
  // paramless boot makes zero requests (NFR14). Node boots take '' -> the
  // byte-inert composition: every frozen boot is bit-identical.
  const scene = createScene(canvas, normalizeSkin(resolveSkinParam(equipSearch, SKINS) ?? modManifest?.skin));
  const rng = Math.random;
  // D-N07: js/shell.js is audio.js's sole consumer. The import is dynamic so
  // the frozen data:-URL Node harnesses (which cannot resolve new relative
  // specifiers) boot unmodified — there the rejection leaves the game silent,
  // never broken (the visible 'audio off' diagnostic covers D-N08's rule).
  let audio = null;
  let audioReady = false;
  let audioDiag = '';
  import('./audio.js')
    .then(({ createAudio }) => {
      audio = createAudio({
        storage: localStorage,
        fetchFn: typeof fetch === 'function' ? fetch : undefined,
      });
    })
    .catch(() => {
      audioDiag = 'audio-error';
    });
  const hudScore = document.getElementById('hud-score');
  const hudBest = document.getElementById('hud-best');
  const hudPrompt = document.getElementById('hud-prompt');
  const hudOwned = document.getElementById('hud-owned');
  // Story 1.3: null-guarded — the frozen Node harnesses answer getElementById
  // from fixed 4-key hud maps, so this id resolves to undefined there.
  const hudRopes = document.getElementById('hud-ropes');

  // UI polish (2026-11-05): the offer renders as SELECTABLE cards with
  // descriptions and swipe-to-cycle, when a real DOM exists. The whole layer
  // is gated on createElement + the #hud anchor, so the frozen Node harnesses
  // (fixed getElementById maps, no createElement) keep the text-prompt channel
  // byte-identical. Every card gesture feeds the SAME pick vars as the
  // Space/canvas cycle path — releaseEverything/enterPause hygiene unchanged.
  const hudRoot = typeof document.createElement === 'function' ? document.getElementById('hud') : null;
  const cards = hudRoot && typeof hudRoot.appendChild === 'function' ? setupCards(hudRoot) : null;

  // Story 2.3 (FR8): the ceiling marker — runtime span on the cards-gating
  // idiom, so the frozen DOM-less harnesses never see a new node. DESIGN's HUD
  // order puts the marker between the rope pips and the owned line, hence the
  // insertBefore path; it is capability-probed so appendChild-only stubs
  // (frozen harnesses) keep booting via the old placement.
  const markerEl = hudRoot && typeof hudRoot.appendChild === 'function' ? (() => {
    const el = document.createElement('span');
    el.className = 'hud-marker';
    if (typeof hudRoot.insertBefore === 'function') {
      hudRoot.insertBefore(el, hudOwned ?? null);
    } else {
      hudRoot.appendChild(el);
    }
    return el;
  })() : null;
  // Story 5.7 (FR30/FR27): the pause menu — same capability probe + one-liner
  // shape as the cards (:89 idiom), so DOM-less harnesses never build the node.
  // The api bag is callback-only (D4): the factory captures NO shell state and
  // `audio` is read live (it may still be null at boot — the readout's
  // 'audio off' branch is volume() returning null, D3/2c).
  const menu = hudRoot && typeof hudRoot.appendChild === 'function' ? setupMenu(hudRoot, {
    visible: () => paused,
    volume: () => audio && audio.getVolume(),
    muted: () => audio && audio.isMuted(),
    diag: () => audioDiag,
    onResume: () => resumeFromPause(),
    onVolume: bumpVolume,
    onToggleMute: () => audio && audio.toggleMute(),
  }) : null;

  let rope = createRope(ROPE_PERIOD);
  let player = createPlayer();
  let run = { ...createRun(), status: 'idle' };
  let prevPhase = rope.phase;
  let holdFrom = null;
  let pressIntent = null;
  let releaseIntent = false;
  let pickIdx = 0;
  let pickPressedAt = null;
  let pickDone = false;
  let pickFill = 0;
  // Start disarmed: a press inside the first LEAD_IN_MS of process life must
  // not be swallowed by the D-07 lock (performance.now() ≈ 0 under node:test).
  let reentryAt = -LEAD_IN_MS;
  // D1 (ledger :136): true while a constructed lead-in hop is airborne.
  let leadInHop = false;
  let flashUntil = 0;
  let flashName = '';
  // Story 1.4: at most one CLOSE! callout per revolution. The gate counts
  // wraps of the one canonical clock — a wrap is exactly phase < prevPhase
  // (rope.js wraps as (phase - 1) + inc) — never a second timer (NFR8).
  let revCount = 0;
  let calloutRev = -1;
  let best = loadBest(localStorage);
  // Story 7.1 (FR31): the meta ledger boots through the same seam, one
  // getItem + one JSON.parse (NFR12). The ONE write site is the run-end
  // branch below (saveMeta beside saveBest); READS into gameplay stay
  // creation-time — startFreshRun's lockedIdsFor. Story 7.4's ARM diff
  // only watches the accrual, never feeds a deal (7.3 D3, unchanged).
  let meta = loadMeta(localStorage);
  // Story 2.4 (FR26): run-start best snapshot (drives the "new best" tail)
  // and the restart arming flag — shell-local by design, never in the record.
  let bestAtStart = best;
  let restartArmed = false;
  // Story 7.4 (FR34, D4): names of the cards whose unlock predicate flipped
  // at the last run end — shell-local by design, never in the record. Armed
  // at the accrual diff below, announced on the over/idle prompt surfaces,
  // cleared by the ONE startFreshRun handler: once per unlock, no backlog.
  let pendingUnlock = null;
  // Story 1.3 display bookkeeping, same status as `best`: max ropes ever
  // held this run (row width) and the last drawn solid/ghost signature.
  let ropesEver = MIN_ROPES;
  let pipsShown = '';
  // One shared reset for every new-run path (house rule: no per-path duplication).
  const resetPips = () => { ropesEver = MIN_ROPES; pipsShown = ''; };
  // Story 1.4 (review fix): entering the lead-in — start/restart/resume/
  // pick-confirm — restarts the canonical clock, so the CLOSE! gate re-arms.
  // The snap to START_PHASE lands inside the handlers, invisible to the
  // drain's wrap compare. One shared handler, no per-path duplication.
  const rearmCalloutGate = (sim) => { revCount++; return sim; };
  // Ledger :136 — the auto-hop is airborne, so the :384 press-arm and :401
  // release gates would deny (or spend) a press begun inside it. One handler.
  const armLeadInHop = () => { leadInHop = true; };
  // The one permadeath start: fresh baseline record, pips reset, best snapshot.
  // A hold charged in the dying run must not cross the boundary — a stale
  // holdFrom lets releaseEverything fire a phantom jump inside the fresh run.
  function startFreshRun() {
    bestAtStart = best;
    pendingUnlock = null; // Story 7.4: the ONE clear site — the announce is spent
    holdFrom = null;
    pressIntent = null;
    resetPips();
    ({ rope, player, run } = rearmCalloutGate(startRun(lockedIdsFor(CARDS, meta))));
    armLeadInHop(); // one write covers the cold-boot and death-restart callers
  }
  let acc = 0;
  let stopUntil = 0;
  let juiceSig = null;
  let pressFired = false;
  // UI-01 (D-01/D-04): pause lives entirely shell-side — the sim never learns
  // it exists (ARCH-01). pausedByVis records tab-hide origin so the visible
  // leg can auto-resume through the lead-in while a manual pause waits for P.
  let paused = false;
  let pausedByVis = false;
  // UI-02 (D-06): the OS reduced-motion preference is read once at boot and
  // kept live through the MediaQueryList change event — no polling, no
  // persistence, no in-game override; the OS setting is the single source of
  // truth. The typeof guard mirrors the AudioContext one in press(): harnesses
  // whose window stub lacks matchMedia boot with the flag false.
  const motionQ = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let reducedMotion = motionQ ? motionQ.matches : false;
  if (motionQ && typeof motionQ.addEventListener === 'function') {
    motionQ.addEventListener('change', e => { reducedMotion = e.matches; });
  }
  let last = performance.now();

  function unlockAudio() {
    // D-N08: the ONLY AudioContext-creation site is the first gesture; every
    // later gesture only revives a suspended context. A constructor throw
    // leaves the game running with a diagnostic, never blocked.
    if (audio) {
      if (!audioReady && typeof AudioContext === 'function') {
        try {
          audio.gesture(new AudioContext());
          audioReady = true;
          audioDiag = ''; // recovery clears the witness — 'audio off' must not outlive the failure (review F1)
        } catch {
          audioDiag = 'audio-error';
        }
      } else if (audioReady) {
        audio.gesture();
      }
    }
  }

  // Story 5.7 (D5): the ONE volume-bump handler — the keyboard `-`/`=` lines
  // and both pause-menu buttons share it verbatim. The seam returns nothing
  // (audio.js:223), so every caller re-reads through the frame render (D3).
  function bumpVolume(delta) {
    if (audio) audio.setVolume(audio.getVolume() + delta);
  }

  function press() {
    if (paused) return; // input is locked behind the freeze frame (D-12/Pitfall 4)
    unlockAudio();
    if (pressIntent === null) pressIntent = performance.now();
  }

  function release() {
    if (paused) return; // releaseIntent must never arm behind the freeze frame
    releaseIntent = true;
  }

  // Criterion 4 (D-11): ONE shared release-everything handler for every
  // focus/pointer loss — window blur, canvas pointercancel, and the
  // hidden+running visibility leg all route here, never a per-event cleanup
  // fork. It behaves exactly as if the player released at that instant: a
  // mid-press loss converts pressIntent to holdFrom FIRST so the fired jump
  // keeps real hold time, then arms releaseIntent and deliberately leaves
  // holdFrom in place for consumeIntents to fire-and-clear (Pitfall 6 — zero-
  // ing it here would silently eat the jump). releaseIntent is armed ONLY for
  // a live hold while running, so the over-status release-restart branch
  // below can never be triggered by focus loss (T-05-07). A choose-status
  // sub-confirm hold cancels cleanly instead.
  function releaseEverything() {
    if (run.status === 'running' && pressIntent !== null) {
      holdFrom = pressIntent;
      pressIntent = null;
    }
    if (run.status === 'running' && holdFrom !== null) {
      releaseIntent = true; // fires via consumeIntents with the hold-so-far (D-11)
    } else {
      pressIntent = null;
    }
    if (run.status === 'choose') {
      pickPressedAt = null;
      pickFill = 0;
    }
  }

  // UI-01: entering pause freezes the frame by holding the drain gate open
  // (D-02, the hitstop pattern) and clears every pending press state (D-12) —
  // the sim buffer goes via the same spread idiom as the boot state copy.
  function enterPause(byVisibility) {
    if (paused || run.status !== 'running') return; // D-04: only an active stepping run
    paused = true;
    pausedByVis = !!byVisibility;
    holdFrom = null;
    pressIntent = null;
    releaseIntent = false;
    run = { ...run, buffer: 0 };
    acc = 0;
    stopUntil = 0;
    juiceSig = null;
    if (audioReady) audio.suspend?.();
  }

  // D-03: resume re-enters the card-pick lead-in through the one resumeRun
  // path — NOT startRun(), which would wipe score/effects/owned (Pitfall 3).
  function resumeFromPause() {
    if (!paused) return;
    paused = false;
    pausedByVis = false;
    ({ rope, player, run } = rearmCalloutGate(resumeRun({ ...run, buffer: 0 })));
    reentryAt = performance.now(); // D-07 re-entry lock, same as the pick-confirm path
    armLeadInHop();
    holdFrom = null;
    pressIntent = null;
    releaseIntent = false;
    acc = 0;
    stopUntil = 0;
    if (audioReady) audio.gesture(); // gesture() resumes the suspended context
  }

  canvas.addEventListener('pointerdown', press);
  canvas.addEventListener('pointerup', release);
  // Criterion 4 (D-11): focus/pointer loss routes to the one shared release.
  // The drag-out / cursor-leave pointer gestures stay deliberately unbound —
  // browsers deliver a pointerup outside the canvas anyway. Both handlers run
  // synchronously in the event, like every other transition here.
  canvas.addEventListener('pointercancel', releaseEverything);
  window.addEventListener('blur', releaseEverything);
  window.addEventListener('keydown', e => {
    // AUD-04: audio controls short-circuit BEFORE the Space press/release
    // reducer so a volume tweak never charges a jump or starts a run.
    // e.repeat: a held key must not flap mute or hammer setVolume's
    // synchronous write-through at OS repeat rate.
    if (e.code === 'Mute') { e.preventDefault(); if (audio && !e.repeat) audio.toggleMute(); return; }
    if (e.code === 'Minus') { e.preventDefault(); if (audio && !e.repeat) bumpVolume(-VOLUME_STEP); return; }
    if (e.code === 'Equal') { e.preventDefault(); if (audio && !e.repeat) bumpVolume(+VOLUME_STEP); return; }
    // UI-01 (D-01): P/Esc toggles pause, after the audio short-circuits and
    // before the Space reducer so it never charges a jump. !e.repeat: an OS
    // key-repeat must not strobe pause/resume at ~30 Hz (Pitfall 11).
    if (e.code === 'KeyP' || e.code === 'Escape') {
      e.preventDefault();
      if (!e.repeat) { paused ? resumeFromPause() : enterPause(false); }
      return;
    }
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) press(); }
    // Card picker parity: arrows cycle the cursor at choose and (re)arm the
    // hold-confirm, exactly like the Space/canvas cycle path (no new gesture).
    if (run.status === 'choose' && run.offer && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
      e.preventDefault();
      if (!e.repeat) {
        const n = run.offer.length;
        pickIdx = (pickIdx + (e.code === 'ArrowRight' ? 1 : n - 1)) % n;
        pickPressedAt = performance.now();
        pickDone = false;
      }
    }
    // Story 3.5 (FR13): digit picker — 1/2/3 CONFIRM offer[k] instantly
    // through the shared confirmPick (the freeze stays snappy; D-a). Out of
    // range or outside choose: fully inert, no preventDefault
    // (EXPERIENCE.md:62 "everything else inert"). Numpad codes are the same
    // keys for numpad-only players (review 3.5, Blind nit).
    if (run.status === 'choose' && run.offer && !e.repeat
        && performance.now() >= stopUntil // ledger :143 — the freeze gates BOTH paths
        && (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3'
          || e.code === 'Numpad1' || e.code === 'Numpad2' || e.code === 'Numpad3')) {
      const k = Number(e.code.charAt(e.code.length - 1));
      if (k <= run.offer.length) {
        e.preventDefault();
        pickIdx = k - 1;
        confirmPick();
      }
    }
  });
  window.addEventListener('keyup', e => { if (e.code === 'Space') release(); });
  // UI-03 (D-10): the existing resize listener re-derives the band/letterbox;
  // orientation changes fire resize on all target browsers, so an
  // orientationchange listener is deliberately absent.
  window.addEventListener('resize', applyWindowSize);
  // UI-01 (D-04): the visibilitychange event carries no state — direction
  // comes from document.hidden. Only an active stepping run enters the paused
  // state; idle/choose/over keep today's D-N08 gesture path verbatim. Both
  // transitions run synchronously here — rAF stops in a hidden tab, so a
  // transition deferred to frame() would land only on return (Pitfall 10).
  window.addEventListener('visibilitychange', () => {
    const hidden = typeof document !== 'undefined' && document.hidden;
    if (hidden) {
      // releaseEverything first so nothing armed can survive the transition —
      // it runs for EVERY status (WR-01: platforms that deliver
      // visibilitychange without blur must still cancel a choose-status hold;
      // it is a proven no-op for idle/over and arms nothing outside running).
      // enterPause's D-12 clearing then supersedes the armed release (a
      // hidden run clears holds rather than firing them).
      releaseEverything();
      if (run.status === 'running') enterPause(true);
      else if (audioReady) audio.gesture();
    } else {
      if (pausedByVis) resumeFromPause(); // tab-return auto-resume through the lead-in
      // D-N08 recovery path — CR-01: never past a manual pause (T-05-01 covers
      // this gesture as well as the focus listener below).
      else if (audioReady && !paused) audio.gesture();
    }
  });
  // Pitfall 4: neither the focus listener nor the visible-branch gesture above
  // may un-suspend a context the game itself paused.
  window.addEventListener('focus', () => { if (audioReady && !paused) audio.gesture(); });

  function consumeIntents() {
    if (pressIntent !== null) {
      if (run.status === 'running') {
        // D-07: a press inside the post-pick lead-in window is discarded —
        // it must never start a jump charge.
        if (performance.now() - reentryAt >= LEAD_IN_MS) {
          holdFrom = pressIntent;
        }
      } else if (run.status === 'idle') {
        startFreshRun(); // a new run starts clean, best snapshot included
      } else if (run.status === 'choose' && run.offer) {
        // D-01/D-02: press = cycle the cursor (wraps), and (re)arm the hold timer.
        pickIdx = (pickIdx + 1) % run.offer.length;
        pickPressedAt = performance.now();
        pickDone = false;
      } else if (run.status === 'over') {
        restartArmed = true; // Story 2.4 (FR22): restart needs a press begun PAST the death
      }
      pressIntent = null;
    }
    if (releaseIntent) {
      if (run.status === 'running') {
        if (performance.now() - reentryAt >= LEAD_IN_MS && holdFrom !== null) {
          // Story 3.4 (FR12/FR17): the one button discriminates by state at
          // RELEASE — grounded launches byte-identically; airborne spends a
          // Second Wind charge with the SAME hold model; no charge is a
          // silent denial (no pressFired — the D-N01 buffer arms for
          // PERMITTED launches only, no voice, no juice). The decision
          // instant is player.grounded here; a hold that lands became a
          // ground jump, charge untouched.
          const grounded = player.grounded || leadInHop; // D1: a hop release lands
          if (grounded) leadInHop = false; // R2: one-shot grace, launch retires it
          const airLaunch = !grounded && clampAirJumps(run.airJumps) >= 1;
          if (grounded || airLaunch) {
            player = jump(player, (performance.now() - holdFrom) / 1000, run.effects.launchMul ?? 1);
            audio?.handleEvent('jump');
            // Shell writing a run field mid-run — the enterPause buffer:0
            // precedent; tickRun heals/clamps 0..1 on every tick after.
            if (airLaunch) run = { ...run, airJumps: Math.max(0, run.airJumps - 1) };
            // D-N01/D-N11: hand the press to the sim on this exact STEP's
            // tickRun (the release's jump call stays the player's timing).
            pressFired = true;
          }
          holdFrom = null; // denial clears too — no phantom re-fire
        }
      } else if (run.status === 'choose') {
        if (pickDone) {
          pickDone = false; // swallow the confirm-release (Pitfall 4)
        } else {
          pickPressedAt = null; // early release = cancel; the cursor stays
          pickFill = 0;
        }
      } else if (run.status === 'over' && restartArmed) {
        // Story 2.4 (AC4): a release alone — e.g. a key held across the death
        // — must never launch the new run; only a press begun while over arms it.
        restartArmed = false;
        startFreshRun(); // permadeath-clean row for the restarted run
      }
      releaseIntent = false;
    }
    tickPick();
  }

  // Story 3.5 (FR13): one confirmation handler (house rule) — the hold-fill
  // path and the digit keys share it verbatim. Statement order is load-
  // bearing (3.3/3.4 review): applyCard BEFORE reentryAt; holdFrom cleared so
  // a Space held across the pick never launches on release.
  function confirmPick() {
    const picked = run.offer[pickIdx];
    flashName = picked.name;
    audio?.handleEvent('pick');
    flashUntil = performance.now() + FLASH_MS;
    run = applyCard(run, picked);
    ({ rope, player, run } = rearmCalloutGate(resumeRun(run)));
    reentryAt = performance.now();
    armLeadInHop();
    holdFrom = null;
    pickIdx = 0;
    pickPressedAt = null;
    pickFill = 0;
    pickDone = true;
  }

  // Fill cue + hold-confirm: driven from wall-clock every STEP regardless of
  // status — tickRun never runs in 'choose' (Pitfall 9).
  function tickPick() {
    if (run.status === 'choose' && run.offer && pickPressedAt !== null) {
      pickFill = Math.min(1, (performance.now() - pickPressedAt) / PICK_HOLD_MS);
      if (pickFill >= 1 && !pickDone) confirmPick();
    }
  }

  // CARD-04: the stack ceiling reads on every offer line, not only on the
  // pick rule. A metadata-less record (non-finite cap) falls back to ' ×N'.
  function offerLine(card, active) {
    const owned = (run.owned ?? {})[card.id] ?? 0;
    const cap = card.cap ?? Number.POSITIVE_INFINITY;
    const readout = Number.isFinite(cap) ? ' ×' + owned + '/' + cap : ' ×' + owned;
    let line = (active ? '> ' : '  ') + card.icon + ' ' + card.name + readout;
    if (active && pickPressedAt !== null) {
      const filled = Math.round(pickFill * 5);
      line += ' [' + '#'.repeat(filled) + '-'.repeat(5 - filled) + ']';
    }
    return line;
  }

  // Card overlay layer: builds one .hud-card per offer entry (icon, name,
  // description, owned/cap, fill bar). Tap a card = select + (re)arm the
  // hold-confirm; hold to fill = confirm via tickPick (unchanged); horizontal
  // swipe anywhere on the strip cycles the cursor and CLEARS the fill (it
  // never confirms). All writes go through the shared pick vars, so blur /
  // pointercancel / hidden-tab hygiene routes are untouched.
  function setupCards(root) {
    const wrap = document.createElement('div');
    wrap.className = 'hud-cards';
    root.appendChild(wrap);
    const els = [];
    let sig = '';
    const swipe = { x: null, moved: false };
    const SWIPE_PX = 28;
    wrap.addEventListener('pointerdown', e => { swipe.x = e.clientX; swipe.moved = false; });
    wrap.addEventListener('pointermove', e => {
      if (swipe.x === null || run.status !== 'choose' || !run.offer) return;
      const dx = e.clientX - swipe.x;
      if (Math.abs(dx) > SWIPE_PX) {
        swipe.moved = true;
        swipe.x = e.clientX;
        const n = run.offer.length;
        pickIdx = (pickIdx + (dx < 0 ? 1 : n - 1)) % n;
        pickPressedAt = null;
        pickFill = 0;
      }
    });
    const endSwipe = () => { swipe.x = null; };
    wrap.addEventListener('pointerup', endSwipe);
    wrap.addEventListener('pointercancel', endSwipe);

    function makeCard(card, i) {
      const el = document.createElement('div');
      el.className = 'hud-card';
      const role = ' role-' + (card.color ?? 'slate');
      const icon = document.createElement('div');
      icon.className = 'card-icon' + role;
      icon.textContent = card.icon ?? '';
      const name = document.createElement('div');
      name.className = 'card-name' + role;
      name.textContent = card.name;
      const desc = document.createElement('div');
      desc.className = 'card-desc';
      desc.textContent = card.desc ?? '';
      const cap = card.cap ?? Number.POSITIVE_INFINITY;
      const held = (run.owned ?? {})[card.id] ?? 0;
      const read = document.createElement('div');
      read.className = 'card-owned';
      read.textContent = Number.isFinite(cap) ? ' ×' + held + '/' + cap : ' ×' + held;
      const fill = document.createElement('div');
      fill.className = 'card-fill';
      const bar = document.createElement('div');
      bar.className = 'card-fill-bar';
      bar.style.width = '0%';
      fill.appendChild(bar);
      const hint = document.createElement('div');
      hint.className = 'card-hint';
      hint.textContent = String(i + 1);
      for (const child of [hint, icon, name, desc, read, fill]) el.appendChild(child);
      el.addEventListener('pointerdown', e => {
        if (run.status !== 'choose' || !run.offer) return;
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        unlockAudio();
        pickIdx = i;
        pickPressedAt = performance.now();
        pickDone = false;
      });
      el.addEventListener('pointerup', () => { if (!swipe.moved) release(); });
      el.addEventListener('pointercancel', releaseEverything);
      return { el, bar };
    }

    return {
      render() {
        if (run.status !== 'choose' || !run.offer) {
          if (sig !== '') { sig = ''; els.length = 0; wrap.replaceChildren(); }
          return;
        }
        const next = run.offer.map(c => c.id).join(',') + '|' + pickIdx
          + '|' + JSON.stringify(run.owned ?? {});
        if (next !== sig) {
          sig = next;
          els.length = 0;
          const built = run.offer.map(makeCard);
          els.push(...built);
          wrap.replaceChildren(...built.map(b => b.el));
        }
        for (let i = 0; i < els.length; i++) {
          els[i].el.className = 'hud-card' + (i === pickIdx ? ' selected' : '');
          els[i].bar.style.width = (i === pickIdx ? Math.round(pickFill * 100) : 0) + '%';
        }
      },
    };
  }

  // Story 2.3 (FR8): distance-to-ceiling is the SAME sum tickRun judges
  // (altitude + player.y vs the area ceiling) — display math on the one-way
  // payload; no new clock, no new record field, no renderer truth.
  function markerLine(run, player) {
    if (run.status !== 'running') return '';
    // story area ?? 1 heal covers only nullish; crafted out-of-domain areas are
    // data, clamped at read like clampRopes — a throw here would skip
    // scene.render on every subsequent frame.
    const area = Math.min(Math.max(Math.round(Number.isFinite(run.area) ? run.area : 1), 1), AREAS.length);
    const dist = Math.max(0, Math.ceil(AREAS[area - 1].ceiling - run.altitude - player.y));
    return (area === SUMMIT_AREA ? 'summit ' : 'ceiling ') + dist + ' \u2191';
  }

  // Story 4.5 (deferred-work.md:61): blocked-at-ceiling — while a live i-frame
  // blank gates the ascend OFF (game.js:263), the dist-0 line is promising a
  // break the sim refuses. Live i-frames read exactly like tickRun :146 —
  // finite AND positive: Infinity is non-finite, a crafted Infinity blank is
  // dead (no suppression, so no dim; a > 0-only mutant would lie).
  function markerBlocked(run, player) {
    if (run.status !== 'running') return false;
    // The markerLine clamp expression, textually identical — first regex match
    // stays markerLine's copy, so the areavistas §5 pairing fence is unaffected.
    const area = Math.min(Math.max(Math.round(Number.isFinite(run.area) ? run.area : 1), 1), AREAS.length);
    // Review 4.5 (Blind F1): dist reads through markerLine's EXACT expression,
    // so dim and text are bit-identical by construction — the bare sum disagreed
    // inside the 1-ulp float-associativity tie window (dim at "ceiling 1").
    const dist = Math.max(0, Math.ceil(AREAS[area - 1].ceiling - run.altitude - player.y));
    return Number.isFinite(run.iFrames) && run.iFrames > 0 && dist === 0;
  }

  function updateHud() {
    hudScore.textContent = String(Math.round(run.altitude));
    hudBest.textContent = 'best ' + Math.round(Math.max(best, run.altitude));
    const owned = run.owned ?? {};
    // Story 3.5 (FR14): state-aware owned line — multiplier cards keep the
    // icon repeat; state cards read their live field through the display
    // clamps (reads only, NFR7): Spare Rope the rope COUNT, Steel Cord the
    // charges, Second Wind the double-jump availability (DESIGN.md:87
    // glyphs ×/⟳/↑). updateHud runs every rendered frame — no stale
    // display is possible (AC4).
    hudOwned.textContent = CARDS
      .filter(c => (owned[c.id] ?? 0) > 0)
      .map(c => c.id === 'extrarope' ? c.icon + '×' + clampRopes(run.ropes)
        : c.id === 'reinforce' ? c.icon + '⟳' + clampCharged(run.charged)
        : c.id === 'doublejump' ? c.icon + '↑' + clampAirJumps(run.airJumps)
        : c.icon.repeat(owned[c.id]))
      .join(' ');
    if (cards) cards.render();
    if (menu) menu.render();
    if (markerEl) {
      markerEl.textContent = markerLine(run, player);
      markerEl.className = 'hud-marker' + (markerBlocked(run, player) ? ' blocked' : '');
    }
    let prompt = '';
    let roleClass = '';
    if (paused) {
      prompt = 'paused — press P to resume';
    } else if (run.status === 'choose' && run.offer) {
      if (!cards) {
        prompt = run.offer.map((card, i) => offerLine(card, i === pickIdx)).join('\n');
        const highlight = run.offer[pickIdx];
        if (highlight && highlight.color) roleClass = 'role-' + highlight.color;
      }
    } else if (run.status === 'over' && run.outcome === 'summit') {
      prompt = 'Summit. Altitude ' + Math.round(run.altitude) + ' best ' + Math.round(Math.max(best, run.altitude));
      roleClass = 'role-amber';
    } else if (run.status === 'over') {
      prompt = 'Missed! Altitude ' + Math.round(run.altitude);
      if (Math.round(run.altitude) > bestAtStart) prompt += ' best ' + Math.round(run.altitude);
    } else if (run.status === 'idle') {
      prompt = 'press space / tap to start';
      if (audioDiag) prompt += ' (audio off)';
    } else if (run.status === 'running' && performance.now() < flashUntil) {
      prompt = flashName.toUpperCase();
    } else if (run.status === 'running' && run.skips === 0) {
      prompt = 'press space / tap when the rope reaches your feet';
    }
    // Story 7.4 (FR34/D5): the one-shot unlock line rides the existing prompt
    // channel (NFR7 by lineage, no new DOM, no timers) on the over/idle
    // surfaces ONLY — the running branches above stay byte-identical, so a
    // mid-run announce is structurally impossible.
    if (pendingUnlock && !paused && (run.status === 'over' || run.status === 'idle')) {
      prompt += '\nunlocked: ' + pendingUnlock.map((n) => n.toUpperCase()).join(', ');
    }
    hudPrompt.textContent = prompt;
    hudPrompt.className = roleClass;
    // Story 1.3: pip row re-derived from run.ropes every frame — the clamp is
    // re-applied at read because invalid counts are never normalized into the
    // record. Rebuild children only when the solid/ghost signature changes.
    if (hudRopes) {
      const held = clampRopes(run.ropes ?? MIN_ROPES);
      ropesEver = Math.max(ropesEver, held);
      const sig = 'h'.repeat(held) + 'g'.repeat(ropesEver - held);
      if (sig !== pipsShown) {
        pipsShown = sig;
        // Story 5.2 (FR28): the ONE audio.setRopes seam — the pip-signature
        // flip IS the held-count change, so this fires exactly once per
        // change (and resetPips re-arms the signature, so every new run
        // re-fires). Optional-chained: it no-ops when audio never booted
        // or a harness stubs an old-shape instance; DOM-less 4-key harness
        // maps never reach this block (v1parity-immunity, story :96).
        audio?.setRopes?.(held);
        const makePip = (cls, glyph) => {
          const pip = document.createElement('span');
          pip.className = cls;
          pip.textContent = glyph;
          return pip;
        };
        hudRopes.replaceChildren(
          ...Array.from({ length: held }, () => makePip('pip-held', '\u2588')),
          ...Array.from({ length: ropesEver - held }, () => makePip('pip-ghost', '\u2592')),
        );
      }
    }
  }

  function frame(now) {
    acc += (now - last) / 1000;
    last = now;
    if (acc > 0.25) acc = 0.25;
    // UI-01 (D-02): the pause gate — an indefinite freeze must hold no sim
    // time at all, so acc drains to zero every paused frame; without this the
    // clamped backlog would fast-forward the post-resume lead-in (Pitfall 1).
    if (paused) acc = 0;
    while (acc >= STEP) {
      // D-N05: juice freeze gate — a pending event deadline halts the drain
      // here, delaying (never dropping) the remaining steps of this drain;
      // the held acc resumes under the unchanged 0.25 clamp above. With the
      // gate removed the drain is byte-identical to the pre-Phase-4 loop.
      // UI-01: the paused flag holds the same gate open indefinitely, while
      // updateHud()/scene.render() below keep the freeze frame + prompt live.
      if (paused || now < stopUntil) break;
      consumeIntents();
      if (run.status === 'running') {
        prevPhase = rope.phase;
        const out = tickRun(run, rope, player, STEP, rng, pressFired ? true : null);
        pressFired = false;
        ({ run, rope, player } = out);
        if (rope.phase < prevPhase) revCount++;
        // D-N02 single-channel rule: sim events are audio's only feed.
        if (audio) for (const ev of (out.events ?? [])) audio.handleEvent(ev);
        if (out.tripped || run.outcome === 'summit') {
          best = Math.max(best, Math.round(run.altitude));
          saveBest(localStorage, best);
          // Story 7.2 (FR33, D1/D2): the outcome counters accrue on THIS
          // branch — the run-end seam shared with saveBest, structurally
          // once-per-run (the running-drain gate, :718). MAX area, summits
          // only on 'summit', skips += the run-local delta. Recorded here,

          // Story 7.4 (FR34, D4a): the unlock ARM — two pure reads of the 7.3
          // derivation bracket the accrual; ids that leave the locked set arm
          // the shell-local one-shot (pool-order names; ids, never names,
          // decide the set). No counter law moved, no second write site.
          const lockedBefore = lockedIdsFor(CARDS, meta);
          meta = {
            furthestArea: Math.max(meta.furthestArea, run.area),
            summits: meta.summits + (run.outcome === 'summit' ? 1 : 0),
            skips: meta.skips + run.skips,
          };
          saveMeta(localStorage, meta);
          const flipped = CARDS.filter(
            (c) => lockedBefore.includes(c.id) && !lockedIdsFor(CARDS, meta).includes(c.id));
          if (flipped.length > 0) pendingUnlock = flipped.map((c) => c.name);
        }
        // D-N02: the events array is the ONLY juice trigger (the tripped
        // fallback is a defensive shim for a channel-less sim build).
        for (const e of (out.events ?? (out.tripped ? ['trip'] : []))) {
          const tier = JUICE_TIERS[e];
          if (tier) {
            // Deadline, not a counter: hits never queue behind each other (T-4-03).
            stopUntil = Math.max(stopUntil, now + tier.hitstop);
            juiceSig = { at: now, shake: tier.shake, particles: tier.particles };
          }
          if (e === 'nearMiss' && calloutRev !== revCount) {
            // D-N04: the CLOSE! callout rides the proven card-name flash
            // channel — no new DOM, streak count straight from the sim.
            // Story 1.4: one callout per revolution; the ×N number may lag
            // a streak incremented later in the same rev (cosmetic, decided).
            calloutRev = revCount;
            flashName = 'CLOSE! \u00d7' + (run.streak ?? 1);
            flashUntil = now + FLASH_MS;
          }
        }
      } else {
        prevPhase = rope.phase;
      }
      acc -= STEP;
    }
    try {
      updateHud();
      scene.render({ run, rope, player, prevPhase, alpha: acc / STEP, best, now, juice: juiceSig, reducedMotion });
    } catch (err) {
      console.error('render failed:', err);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Story 5.7 (D1-D6): the pause-menu factory — a module-level sibling of the
// DOM-layer code that captures NO shell state: every semantic arrives through
// the api bag (visible/volume/muted/diag/onResume/onVolume/onToggleMute), so a
// later idle-screen entry point reuses the panel without rework (AC5). The
// panel is a pure VIEW (D3): it stores nothing and mirrors nothing — render
// re-reads the live settings, the only protocol the value-returning seams
// allow. Handlers are visible()-guarded and call ONLY the api callbacks (D6);
// the nodes carry a pointerdown listener and NOTHING else — a click behind
// the frozen frame must do exactly what it did before the click happened.
function setupMenu(root, api) {
  const wrap = document.createElement('div');
  wrap.className = 'hud-menu hidden';
  root.appendChild(wrap);
  const resume = document.createElement('div');
  resume.className = 'hud-menu-btn menu-resume';
  resume.textContent = 'Resume';
  const row = document.createElement('div');
  row.className = 'hud-menu-row';
  const down = document.createElement('div');
  down.className = 'hud-menu-btn menu-vol-down';
  down.textContent = '-';
  const read = document.createElement('div');
  read.className = 'hud-menu-read';
  const up = document.createElement('div');
  up.className = 'hud-menu-btn menu-vol-up';
  up.textContent = '+';
  const mute = document.createElement('div');
  mute.className = 'hud-menu-btn menu-mute';
  mute.textContent = 'Sound on';
  for (const child of [resume, row, mute]) wrap.appendChild(child);
  for (const child of [down, read, up]) row.appendChild(child);
  const guard = fn => e => {
    if (!api.visible()) return; // inert whenever the panel is not showing
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    fn();
  };
  resume.addEventListener('pointerdown', guard(() => api.onResume()));
  down.addEventListener('pointerdown', guard(() => api.onVolume(-VOLUME_STEP)));
  up.addEventListener('pointerdown', guard(() => api.onVolume(+VOLUME_STEP)));
  mute.addEventListener('pointerdown', guard(() => api.onToggleMute()));
  let sig = '';
  return {
    // Cards idiom (:529-547): the child structure is built once, text and
    // className land under a string-signature guard — updateHud IS the
    // freeze-frame pump (D3), so a paused panel re-reads every rendered frame.
    render() {
      const visible = api.visible();
      const v = api.volume();
      const muted = api.muted();
      // The api bag's diag is the shell's audio-failure witness (review F1):
      // an AudioContext-creation failure must NOT render a healthy readout.
      const off = !!api.diag() || v === null || v === undefined;
      const next = (visible ? 'v' : '-') + '|' + (off ? 'off' : Math.round(v * 100))
        + '|' + (muted ? 'muted' : 'on');
      if (next !== sig) {
        sig = next;
        read.textContent = off ? 'audio off' : 'volume ' + Math.round(v * 100) + '%';
        mute.textContent = muted ? 'Sound muted' : 'Sound on';
        wrap.className = 'hud-menu' + (visible ? '' : ' hidden');
      }
    },
  };
}

if (typeof document !== 'undefined') {
  startGame(document.getElementById('game'));
}
