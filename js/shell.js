import { createRun, tickRun, applyCard, resumeRun, loadBest, saveBest, startRun, ROPE_PERIOD, CARDS } from './game.js';
import { createRope } from './rope.js';
import { createPlayer, jump } from './player.js';
import { createScene } from './render3d.js';

const STEP = 1 / 120;
const PICK_HOLD_MS = 800;
const LEAD_IN_MS = 450;
const FLASH_MS = 150;

// The buffer tracks the window (coerced so Node-side stub environments
// without innerWidth fall back to the old default and stay green);
// js/render3d.js discovers size changes through its passive poll.
function windowSize() {
  return [Number(window.innerWidth) || 480, Number(window.innerHeight) || 640];
}

export function startGame(canvas) {
  [canvas.width, canvas.height] = windowSize();
  const scene = createScene(canvas);
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
  let flashUntil = 0;
  let flashName = '';
  let best = loadBest(localStorage);
  let acc = 0;
  let last = performance.now();

  function press() {
    // D-N08: the ONLY AudioContext-creation site is this first gesture; every
    // later gesture only revives a suspended context. A constructor throw
    // leaves the game running with a diagnostic, never blocked.
    if (audio) {
      if (!audioReady && typeof AudioContext === 'function') {
        try {
          audio.gesture(new AudioContext());
          audioReady = true;
        } catch {
          audioDiag = 'audio-error';
        }
      } else if (audioReady) {
        audio.gesture();
      }
    }
    if (pressIntent === null) pressIntent = performance.now();
  }

  function release() {
    releaseIntent = true;
  }

  canvas.addEventListener('pointerdown', press);
  canvas.addEventListener('pointerup', release);
  window.addEventListener('keydown', e => {
    // AUD-04: audio controls short-circuit BEFORE the Space press/release
    // reducer so a volume tweak never charges a jump or starts a run.
    if (e.code === 'Mute') { e.preventDefault(); if (audio) audio.toggleMute(); return; }
    if (e.code === 'Minus') { e.preventDefault(); if (audio) audio.setVolume(Math.max(0, audio.getVolume() - 0.1)); return; }
    if (e.code === 'Equal') { e.preventDefault(); if (audio) audio.setVolume(Math.min(1, audio.getVolume() + 0.1)); return; }
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) press(); }
  });
  window.addEventListener('keyup', e => { if (e.code === 'Space') release(); });
  window.addEventListener('resize', () => { [canvas.width, canvas.height] = windowSize(); });
  // D-N08 resume hooks: recover a context the browser suspended mid-session
  // (no-op before the first gesture ever lands).
  window.addEventListener('visibilitychange', () => { if (audioReady) audio.gesture(); });
  window.addEventListener('focus', () => { if (audioReady) audio.gesture(); });

  function consumeIntents() {
    if (pressIntent !== null) {
      if (run.status === 'running') {
        // D-07: a press inside the post-pick lead-in window is discarded —
        // it must never start a jump charge.
        if (performance.now() - reentryAt >= LEAD_IN_MS) {
          holdFrom = pressIntent;
        }
      } else if (run.status === 'idle') {
        ({ rope, player, run } = startRun());
      } else if (run.status === 'choose' && run.offer) {
        // D-01/D-02: press = cycle the cursor (wraps), and (re)arm the hold timer.
        pickIdx = (pickIdx + 1) % run.offer.length;
        pickPressedAt = performance.now();
        pickDone = false;
      }
      pressIntent = null;
    }
    if (releaseIntent) {
      if (run.status === 'running') {
        if (performance.now() - reentryAt >= LEAD_IN_MS && holdFrom !== null) {
          player = jump(player, (performance.now() - holdFrom) / 1000);
          audio?.handleEvent('jump');
          holdFrom = null;
        }
      } else if (run.status === 'choose') {
        if (pickDone) {
          pickDone = false; // swallow the confirm-release (Pitfall 4)
        } else {
          pickPressedAt = null; // early release = cancel; the cursor stays
          pickFill = 0;
        }
      } else if (run.status === 'over') {
        best = Math.max(best, run.score);
        saveBest(localStorage, best);
        ({ rope, player, run } = startRun());
      }
      releaseIntent = false;
    }
    tickPick();
  }

  // Fill cue + hold-confirm: driven from wall-clock every STEP regardless of
  // status — tickRun never runs in 'choose' (Pitfall 9).
  function tickPick() {
    if (run.status === 'choose' && run.offer && pickPressedAt !== null) {
      pickFill = Math.min(1, (performance.now() - pickPressedAt) / PICK_HOLD_MS);
      if (pickFill >= 1 && !pickDone) {
        const picked = run.offer[pickIdx];
        flashName = picked.name;
        audio?.handleEvent('pick');
        flashUntil = performance.now() + FLASH_MS;
        run = applyCard(run, picked);
        ({ rope, player, run } = resumeRun(run));
        reentryAt = performance.now();
        holdFrom = null;
        pickIdx = 0;
        pickPressedAt = null;
        pickFill = 0;
        pickDone = true;
      }
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

  function updateHud() {
    hudScore.textContent = String(run.score);
    hudBest.textContent = 'best ' + Math.max(best, run.score);
    const owned = run.owned ?? {};
    hudOwned.textContent = CARDS
      .filter(c => (owned[c.id] ?? 0) > 0)
      .map(c => c.icon.repeat(owned[c.id]))
      .join(' ');
    let prompt = '';
    let roleClass = '';
    if (run.status === 'choose' && run.offer) {
      prompt = run.offer.map((card, i) => offerLine(card, i === pickIdx)).join('\n');
      const highlight = run.offer[pickIdx];
      if (highlight && highlight.color) roleClass = 'role-' + highlight.color;
    } else if (run.status === 'over') {
      prompt = 'Missed! Score ' + run.score;
    } else if (run.status === 'idle') {
      prompt = 'press space / tap to start';
      if (audioDiag) prompt += ' (audio off)';
    } else if (run.status === 'running' && performance.now() < flashUntil) {
      prompt = flashName.toUpperCase();
    } else if (run.status === 'running' && run.skips === 0) {
      prompt = 'press space / tap when the rope reaches your feet';
    }
    hudPrompt.textContent = prompt;
    hudPrompt.className = roleClass;
  }

  function frame(now) {
    acc += (now - last) / 1000;
    last = now;
    if (acc > 0.25) acc = 0.25;
    while (acc >= STEP) {
      consumeIntents();
      if (run.status === 'running') {
        prevPhase = rope.phase;
        const out = tickRun(run, rope, player, STEP, rng);
        ({ run, rope, player } = out);
        // D-N02 single-channel rule: sim events are audio's only feed.
        if (audio) for (const ev of out.events) audio.handleEvent(ev);
        if (out.tripped) {
          best = Math.max(best, run.score);
          saveBest(localStorage, best);
        }
      } else {
        prevPhase = rope.phase;
      }
      acc -= STEP;
    }
    updateHud();
    try {
      scene.render({ run, rope, player, prevPhase, alpha: acc / STEP, best, now });
    } catch (err) {
      console.error('render failed:', err);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (typeof document !== 'undefined') {
  startGame(document.getElementById('game'));
}
