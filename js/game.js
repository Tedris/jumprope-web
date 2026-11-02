import { updateRope, atFeetOffset } from './rope.js';
import { jump, createPlayer, updatePlayer, clearsRope } from './player.js';
import { CARDS, freshEffects, pickOffers, shouldOfferUpgrade, offerCount } from './upgrades.js';

// Shell-side HUD reads the catalogue through game.js: tests/shell.test.js's
// frozen bootShell harness only rewrites the game/rope/player/render3d
// specifiers, so shell.js must not gain a direct './upgrades.js' import.
export { CARDS } from './upgrades.js';

export const START_PHASE = 0.33;
export const ROPE_PERIOD = 1.3;

// FEEL-01: input-buffer window in phase-clock seconds (D-N01).
export const BUFFER_SEC = 0.1;
// FEEL-03 (D-N03): near-miss tightness as a fraction of the minHeight
// threshold — provisional seed, UAT re-tunes the number only.
export const NEAR_MARGIN = 0.5;

// FR1: valid rope counts are 1–5; anything else is clamped as data at read.
export const MIN_ROPES = 1;
export const MAX_ROPES = 5;

function clampRopes(count) {
  // +Infinity is "very many ropes" -> the maximum; NaN/nullish/strings -> the
  // minimum. (Number.isFinite is false for Infinity, so it needs its own arm.)
  const n = Number.isFinite(count) ? Math.trunc(count)
    : count === Infinity ? MAX_ROPES : MIN_ROPES;
  return Math.min(MAX_ROPES, Math.max(MIN_ROPES, n));
}

// The one canonical lead-in (ARCH-02): both cold start and post-pick resume
// compose this exact pair — never duplicate the constants.
export function leadIn() {
  return {
    rope: { phase: START_PHASE, period: ROPE_PERIOD },
    player: jump(createPlayer(), 0.1),
  };
}

export function startRun() {
  return { ...leadIn(), run: { ...createRun(), status: 'running' } };
}

export function resumeRun(run) {
  return { ...leadIn(), run: { ...run, status: 'running', offer: null } };
}

export function createRun() {
  return { status: 'running', score: 0, skips: 0, effects: freshEffects(), offer: null, owned: {}, buffer: 0, streak: 0, ropes: 1 };
}

export function tickRun(run, rope, player, dt, rng = Math.random, press = null) {
  const nextRope = updateRope(rope, dt * run.effects.ropeMul);
  const nextPlayer = updatePlayer(player, dt, 1800 / run.effects.floatMul);
  let { score, skips, status, offer } = run;
  let tripped = false;
  // D-N01: the forgiveness buffer decays on the phase clock, so a rope-speed
  // upgrade shortens the real-time window exactly as it shortens the period.
  // A press re-arms the full window at delivery; it is truthiness only and
  // never fires a jump (D-N11).
  let buffer = Math.max(0, (run.buffer ?? 0) - dt * (run.effects.ropeMul ?? 1));
  if (press) buffer = BUFFER_SEC;
  let streak = run.streak ?? 0;
  const events = [];
  if (player.grounded && !nextPlayer.grounded) events.push('jump');
  const minHeight = 18 / run.effects.windowMul;
  // FR1: N ropes on the one canonical clock — rope k's feet window is the
  // phase clock offset by k/N. With ropes = 1 (or absent, hence the ?? 1
  // fallback for hand-built run records) this is exactly the v1 single edge.
  const ropeCount = clampRopes(run.ropes ?? MIN_ROPES);
  for (let k = 0; k < ropeCount; k++) {
    if (atFeetOffset(rope.phase, k, ropeCount) || !atFeetOffset(nextRope.phase, k, ropeCount)) continue;
    if (clearsRope(nextPlayer.y, minHeight)) {
      score += run.effects.scoreMul;
      skips += 1;
      events.push('skip');
      // D-N03: tight clearance under NEAR_MARGIN × minHeight above the
      // threshold is a near-miss — a full skip with a callout event on top.
      if (nextPlayer.y < minHeight * (1 + NEAR_MARGIN)) {
        events.push('nearMiss');
        streak += 1;
      } else {
        streak = 0;
      }
      // Checked per cleared-pass increment so a multi-pass tick cannot step
      // over a 10th-skip boundary on the scoring path; the offer stops
      // crossing resolution for this tick (tickRun never runs in choose).
      // Buffer-forgiven passes below are v1-frozen and skip this check — a
      // forgiven 10th defers the offer to the next cleared crossing.
      if (shouldOfferUpgrade(skips)) {
        const offers = pickOffers(CARDS, run.owned ?? {}, offerCount(skips), rng);
        // Pitfall 6: an exhausted pool must never freeze the run in choose.
        if (offers.length > 0) {
          status = 'choose';
          offer = offers;
          events.push('offer');
          break;
        }
      }
    } else if (buffer > 0) {
      // D-N01/D-N11: a live buffer converts the would-be trip into a forgiven
      // pass — scored like a clean skip, near-miss by definition (D-N03), and
      // the buffer is consumed at the crossing.
      score += run.effects.scoreMul;
      skips += 1;
      buffer = 0;
      streak += 1;
      events.push('skip', 'nearMiss');
    } else {
      // Story 1.2 replaces this branch with rope-as-HP trip resolution
      // (strip fastest rope, i-frames). Until then a failed crossing ends
      // the run for any rope count, exactly as v1.
      status = 'over';
      tripped = true;
      streak = 0;
      events.push('trip');
      break;
    }
  }
  return {
    run: { ...run, score, skips, status, offer, buffer, streak },
    rope: nextRope,
    player: nextPlayer,
    tripped,
    events,
  };
}

export function applyUpgrade(run, upgrade) {
  return { ...run, effects: upgrade.apply(run.effects), offer: null, status: 'running' };
}

// status stays untouched — resumeRun owns the running transition (D-06).
export function applyCard(run, card) {
  return {
    ...run,
    effects: card.apply(run.effects),
    owned: { ...run.owned, [card.id]: (run.owned[card.id] ?? 0) + 1 },
    offer: null,
  };
}

export function loadBest(storage) {
  try {
    return Number(storage.getItem('jumprope-best')) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(storage, score) {
  try {
    storage.setItem('jumprope-best', String(score));
  } catch {
    // storage unavailable; best score is session-only
  }
}
