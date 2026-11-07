import { updateRope, atFeetOffset } from './rope.js';
import { jump, createPlayer, updatePlayer, clearsRope } from './player.js';
import { CARDS, freshEffects, pickOffers, shouldOfferUpgrade, offerCount } from './upgrades.js';
import { AREAS } from './areas.js';

// Shell-side HUD reads the catalogue through game.js: tests/shell.test.js's
// frozen bootShell harness only rewrites the game/rope/player/render3d
// specifiers, so shell.js must not gain a direct './upgrades.js' import.
export { CARDS } from './upgrades.js';
// Story 2.3 (FR8): the ceiling marker reads the ladder through the same
// harness-rewritten channel — shell must not import areas.js directly.
export { AREAS } from './areas.js';

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

// Story 2.1 (FR7): PLACEHOLDER — Epic 6 balance pass owns this value.
export const ALT_PER_POINT = 2;

// Story 2.2 (FR9): crossing the top row's ceiling wins instead of ascending.
export const SUMMIT_AREA = AREAS.length;

export function clampRopes(count) {
  // +Infinity is "very many ropes" -> the maximum; NaN/nullish/strings -> the
  // minimum. (Number.isFinite is false for Infinity, so it needs its own arm.)
  const n = Number.isFinite(count) ? Math.trunc(count)
    : count === Infinity ? MAX_ROPES : MIN_ROPES;
  return Math.min(MAX_ROPES, Math.max(MIN_ROPES, n));
}

// Story 2.2 (FR6): strict `>` — a peak exactly at the ceiling has not broken
// it (GDD "exceeds"). `area` is the 1-based ladder index.
export function crossesCeiling(peakAltitude, area) {
  return peakAltitude > AREAS[area - 1].ceiling;
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
  return { status: 'running', score: 0, altitude: 0, skips: 0, effects: freshEffects(), offer: null, owned: {}, buffer: 0, streak: 0, ropes: 1, iFrames: 0, area: 1, baseAltitude: 0, outcome: null };
}

export function tickRun(run, rope, player, dt, rng = Math.random, press = null) {
  const nextRope = updateRope(rope, dt * run.effects.ropeMul);
  const nextPlayer = updatePlayer(player, dt, 1800 / run.effects.floatMul);
  let { score, skips, status, offer } = run;
  let altitude = run.altitude ?? 0;
  // Story 2.2: same ?? heal idiom as altitude — hand-built harness records
  // (e.g. the uxpolish tickRun wrapper) lack the ascent fields.
  let area = run.area ?? 1;
  let baseAltitude = run.baseAltitude ?? 0;
  let outcome = run.outcome ?? null;
  let tripped = false;
  // D-N01: the forgiveness buffer decays on the phase clock, so a rope-speed
  // upgrade shortens the real-time window exactly as it shortens the period.
  // A press re-arms the full window at delivery; it is truthiness only and
  // never fires a jump (D-N11).
  let buffer = Math.max(0, (run.buffer ?? 0) - dt * (run.effects.ropeMul ?? 1));
  if (press) buffer = BUFFER_SEC;
  let streak = run.streak ?? 0;
  // FR3: i-frames are a crossing count, not a second clock (NFR8). Any
  // non-finite record (NaN/Infinity/nullish) behaves as "no i-frames" — there
  // is no clampRopes-style Infinity arm here. Capped to MAX_ROPES so crafted
  // floats cannot decrement forever; legitimate writers only ever produce
  // integers 0..MAX_ROPES - 1 (a strip leaves ropeCount - 1).
  let iframesLeft = Number.isFinite(run.iFrames) ? Math.min(MAX_ROPES, Math.max(0, run.iFrames)) : 0;
  let strippedTo = null;
  const events = [];
  if (player.grounded && !nextPlayer.grounded) events.push('jump');
  const minHeight = 18 / run.effects.windowMul;
  // FR1: N ropes on the one canonical clock — rope k's feet window is the
  // phase clock offset by k/N. With ropes = 1 (or absent, hence the ?? 1
  // fallback for hand-built run records) this is exactly the v1 single edge.
  const ropeCount = clampRopes(run.ropes ?? MIN_ROPES);
  for (let k = 0; k < ropeCount; k++) {
    if (atFeetOffset(rope.phase, k, ropeCount) || !atFeetOffset(nextRope.phase, k, ropeCount)) continue;
    // FR3: during a blank every crossing is a harmless pass — a true blank on
    // the clock: no score, no skips (so offers cannot fire mid-blank), no
    // trip, no streak change, no buffer consumption.
    if (iframesLeft > 0) {
      iframesLeft -= 1;
      continue;
    }
    if (clearsRope(nextPlayer.y, minHeight)) {
      score += run.effects.scoreMul;
      altitude += ALT_PER_POINT * run.effects.scoreMul;
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
        // FR10 state-aware dead-pick filter (Story 3.1): ropeCount is the
        // clamped count from the crossings loop; charged: 0 is the honest
        // current value — Story 3.3 extends this object with real charges.
        const offers = pickOffers(CARDS, run.owned ?? {}, offerCount(skips), rng,
          { ropes: ropeCount, charged: 0 });
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
      altitude += ALT_PER_POINT * run.effects.scoreMul;
      skips += 1;
      buffer = 0;
      streak += 1;
      events.push('skip', 'nearMiss');
    } else if (ropeCount > 1) {
      // FR2: ropes are health — strip one rope and blank the clock. All ropes
      // share the one period, so "fastest" is degenerate (any rope; offsets
      // re-space as k/(N-1) on the next tick). Writing the clamped count heals
      // out-of-range records by construction. The blank counts the POST-strip
      // ropes: the harmless passes are evenly spaced, so first-pass to
      // first-live spans exactly one revolution (NFR8). Measured from the trip
      // tick, the next live crossing is never sooner than one revolution, but
      // a trip riding a later rope's edge runs its passes out sooner (pinned
      // by tests/tripresolution.test.js). A strip BREAKS the consecutive
      // chain: the streak zeroes here (Story 1.4's policy call — death also
      // zeroes it, and the blank's harmless passes touch nothing).
      // The break is safe because feet windows are disjoint — at most one
      // rising edge per tick (pinned by tests/multirope.test.js) — so no
      // second crossing can hide behind it.
      strippedTo = ropeCount - 1;
      iframesLeft = strippedTo;
      streak = 0;
      events.push('ropeLost');
      break;
    } else {
      // Last rope: the v1 death, verbatim. tripped stays fatal-only so the
      // shell's saveBest/juice handling needs no changes.
      status = 'over';
      outcome = 'tripped';
      tripped = true;
      streak = 0;
      events.push('trip');
      break;
    }
  }
  // Story 2.2 (FR6/FR26): the jump peak is global altitude + arc height,
  // sampled on the post-step position — no separate timeline (NFR8). One
  // plain if per tick, never a while (Story 4.1's one-ascend interlock);
  // dead ticks are excluded (trip > win), i-frame ticks are suppressed
  // (Story 4.5), and a summit peak wins instead of incrementing, clearing
  // any same-tick offer — a run cannot await a pick and be terminally won.
  const peak = altitude + nextPlayer.y;
  if ((status === 'running' || status === 'choose') && iframesLeft === 0 && crossesCeiling(peak, area)) {
    if (area === SUMMIT_AREA) {
      status = 'over';
      outcome = 'summit';
      offer = null;
      // Story 2.4 (FR26): the offer FIELD never renders, so its channel cue
      // goes too — Story 5.1 must not inherit a phantom pick announcement on
      // the win tick (deferred-work claim). events is const: splice in place.
      const oi = events.indexOf('offer');
      if (oi !== -1) events.splice(oi, 1);
      events.push('win');
    } else {
      baseAltitude = AREAS[area - 1].ceiling;
      area += 1;
      events.push('ascend');
    }
  }
  const nextRun = { ...run, score, altitude, skips, status, offer, buffer, streak, iFrames: iframesLeft, area, baseAltitude, outcome };
  if (strippedTo !== null) nextRun.ropes = strippedTo;
  return {
    run: nextRun,
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
