import { createRun, tickRun, applyCard, resumeRun, loadBest, saveBest, startRun, ROPE_PERIOD, CARDS } from './game.js';
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
  trip: { hitstop: 80, shake: 2, particles: 16 }
};

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

  function press() {
    if (paused) return; // input is locked behind the freeze frame (D-12/Pitfall 4)
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
    if (paused) return; // releaseIntent must never arm behind the freeze frame
    releaseIntent = true;
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
    ({ rope, player, run } = resumeRun({ ...run, buffer: 0 }));
    reentryAt = performance.now(); // D-07 re-entry lock, same as the pick-confirm path
    holdFrom = null;
    pressIntent = null;
    releaseIntent = false;
    acc = 0;
    stopUntil = 0;
    if (audioReady) audio.gesture(); // gesture() resumes the suspended context
  }

  canvas.addEventListener('pointerdown', press);
  canvas.addEventListener('pointerup', release);
  window.addEventListener('keydown', e => {
    // AUD-04: audio controls short-circuit BEFORE the Space press/release
    // reducer so a volume tweak never charges a jump or starts a run.
    // e.repeat: a held key must not flap mute or hammer setVolume's
    // synchronous write-through at OS repeat rate.
    if (e.code === 'Mute') { e.preventDefault(); if (audio && !e.repeat) audio.toggleMute(); return; }
    if (e.code === 'Minus') { e.preventDefault(); if (audio && !e.repeat) audio.setVolume(Math.max(0, audio.getVolume() - 0.1)); return; }
    if (e.code === 'Equal') { e.preventDefault(); if (audio && !e.repeat) audio.setVolume(Math.min(1, audio.getVolume() + 0.1)); return; }
    // UI-01 (D-01): P/Esc toggles pause, after the audio short-circuits and
    // before the Space reducer so it never charges a jump. !e.repeat: an OS
    // key-repeat must not strobe pause/resume at ~30 Hz (Pitfall 11).
    if (e.code === 'KeyP' || e.code === 'Escape') {
      e.preventDefault();
      if (!e.repeat) { paused ? resumeFromPause() : enterPause(false); }
      return;
    }
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) press(); }
  });
  window.addEventListener('keyup', e => { if (e.code === 'Space') release(); });
  window.addEventListener('resize', () => { [canvas.width, canvas.height] = windowSize(); });
  // UI-01 (D-04): the visibilitychange event carries no state — direction
  // comes from document.hidden. Only an active stepping run enters the paused
  // state; idle/choose/over keep today's D-N08 gesture path verbatim. Both
  // transitions run synchronously here — rAF stops in a hidden tab, so a
  // transition deferred to frame() would land only on return (Pitfall 10).
  window.addEventListener('visibilitychange', () => {
    const hidden = typeof document !== 'undefined' && document.hidden;
    if (hidden) {
      if (run.status === 'running') enterPause(true);
      else if (audioReady) audio.gesture();
    } else {
      if (pausedByVis) resumeFromPause(); // tab-return auto-resume through the lead-in
      else if (audioReady) audio.gesture(); // D-N08 recovery path, unchanged
    }
  });
  // Pitfall 4: focus must never un-suspend a context the game itself paused.
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
          // D-N01/D-N11: hand the press to the sim on this exact STEP's
          // tickRun (the release's jump call stays the player's timing).
          pressFired = true;
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
    if (paused) {
      prompt = 'paused — press P to resume';
    } else if (run.status === 'choose' && run.offer) {
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
        // D-N02 single-channel rule: sim events are audio's only feed.
        if (audio) for (const ev of (out.events ?? [])) audio.handleEvent(ev);
        if (out.tripped) {
          best = Math.max(best, run.score);
          saveBest(localStorage, best);
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
          if (e === 'nearMiss') {
            // D-N04: the CLOSE! callout rides the proven card-name flash
            // channel — no new DOM, streak count straight from the sim.
            flashName = 'CLOSE! \u00d7' + (run.streak ?? 1);
            flashUntil = now + FLASH_MS;
          }
        }
      } else {
        prevPhase = rope.phase;
      }
      acc -= STEP;
    }
    updateHud();
    try {
      scene.render({ run, rope, player, prevPhase, alpha: acc / STEP, best, now, juice: juiceSig, reducedMotion });
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
