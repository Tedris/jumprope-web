export const CARDS = [
  { id: 'float', name: 'Cloud Shoes', desc: '+15% hang time', icon: '☁',
    role: 'foundation', color: 'sky', rarity: 'common', cap: 4,
    apply: s => ({ ...s, floatMul: s.floatMul * 1.15 }) },
  // FR11 amendment (Story 3.1): keep the slow pace, buy the climb rate back
  // with score — ropeMul FIRST (it is Heavy Rope's AXIS). 0.9x1.15 = 1.035.
  { id: 'slowrope', name: 'Heavy Rope', desc: 'Slower pace, +15% score', icon: '⌛',
    role: 'pace', color: 'slate', rarity: 'common', cap: 3,
    apply: s => ({ ...s, ropeMul: s.ropeMul * 0.9, scoreMul: s.scoreMul * 1.15 }) },
  { id: 'multi', name: 'Golden Handle', desc: '+1 skip score', icon: '✦',
    role: 'volume', color: 'amber', rarity: 'uncommon', cap: 3,
    apply: s => ({ ...s, scoreMul: s.scoreMul + 1 }) },
  { id: 'window', name: 'Wide Stance', desc: '+10% clearance forgiveness', icon: '◇',
    role: 'margin', color: 'mint', rarity: 'uncommon', cap: 3,
    apply: s => ({ ...s, windowMul: s.windowMul * 1.1 }) },
  { id: 'feather', name: 'Featherweight', desc: '+5% hang time', icon: '✽',
    role: 'foundation', color: 'sky', rarity: 'common', cap: 5,
    apply: s => ({ ...s, floatMul: s.floatMul * 1.05 }) },
  { id: 'tally', name: 'Lucky Tally', desc: '+15% skip score', icon: '♣',
    role: 'volume', color: 'amber', rarity: 'uncommon', cap: 3,
    apply: s => ({ ...s, scoreMul: s.scoreMul * 1.15 }) },
  // Pitfall 1 policy: the ONLY ropeMul-up card — cap 2 holds stacked ropeMul
  // to 1.12^2 ≈ 1.25, five-fold inside the ≈15.6 feet-window blackout bound.
  { id: 'windup', name: 'Wind-Up Handle', desc: '+12% rope speed, +1 score', icon: '⚙',
    role: 'risk', color: 'ember', rarity: 'rare', cap: 2,
    apply: s => ({ ...s, ropeMul: s.ropeMul * 1.12, scoreMul: s.scoreMul + 1 }) },
  // FR11 amendment (Story 3.1): the score subtraction becomes a hang-time
  // cost (GDD currency). windowMul FIRST (it is Wide Brim's AXIS).
  { id: 'widebrim', name: 'Wide Brim', desc: '+20% forgiveness, −10% hang time', icon: '⌸',
    role: 'margin', color: 'mint', rarity: 'uncommon', cap: 2,
    apply: s => ({ ...s, windowMul: s.windowMul * 1.2, floatMul: s.floatMul * 0.9 }) },
  // FR12 rule-changers (Story 3.1): card presence only — apply stays the inert
  // endofunction until each effect lands (3.3 charges, 3.4 mid-air jump).
  // stateCap = plain-data dead-pick thresholds (FR10).
  { id: 'extrarope', name: 'Spare Rope', desc: '+1 rope (max 5)', icon: '∥',
    role: 'foundation', color: 'mint', rarity: 'uncommon', cap: 4,
    stateCap: { ropes: 5 },        // 5 held = dead pick (equals game.js MAX_ROPES)
    shape: 'run',                 // ADR-2 whole-record patch, dispatched in game.js
    apply: (run) => ({ ...run, ropes: (run.ropes ?? 1) + 1 }) },
  { id: 'reinforce', name: 'Steel Cord', desc: 'a rope survives one trip', icon: '▣',
    role: 'risk', color: 'slate', rarity: 'uncommon', cap: 2,
    stateCap: { charged: 2 },      // FR12: up to 2 charged ropes (Story 3.3 wires the data)
    apply: s => ({ ...s }) },
  { id: 'doublejump', name: 'Second Wind', desc: 'extra jump in mid-air', icon: '⇈',
    role: 'foundation', color: 'sky', rarity: 'uncommon', cap: 2,
    apply: s => ({ ...s }) },      // mid-air jump lands in Story 3.4
  { id: 'highjump', name: 'Launch Heels', desc: '+10% launch velocity', icon: '△',
    role: 'foundation', color: 'sky', rarity: 'common', cap: 3,
    apply: s => ({ ...s, launchMul: s.launchMul * 1.1 }) },
];

// Compat alias: tests/upgrades.test.js freezes the UPGRADES named export.
export const UPGRADES = CARDS;

// Starting balancing knob (RESEARCH Pattern 2 / A1) — UAT tunes values only.
export const RARITY_WEIGHT = { common: 70, uncommon: 25, rare: 5 };

export function freshEffects() {
  return { floatMul: 1, ropeMul: 1, scoreMul: 1, windowMul: 1, launchMul: 1 };
}

// state (Story 3.1, FR10) is the optional run-state view ({ ropes, charged, ... },
// plain data). A card whose stateCap thresholds are ALL met is a dead pick and
// hides; state omitted keeps the exact 2-arg contract for every frozen caller.
export function isAvailable(card, owned, state) {
  if ((owned[card.id] ?? 0) >= (card.cap ?? Infinity)) return false;
  const cap = card.stateCap;
  if (!cap || !state) return true;
  const thresholds = Object.entries(cap);
  // An empty stateCap names no thresholds — an unguarded every() would be
  // vacuously true and hide the card from every stateful draw.
  return thresholds.length === 0 || !thresholds.every(([key, min]) => (state[key] ?? 0) >= min);
}

// Inverse-CDF weighted draw over RARITY_WEIGHT, availability-filtered first
// (CARD-05: no dead picks) with splice-removal so draws are distinct without
// replacement. May return fewer than count, never a repeat; mutates nothing.
// state is the TRAILING optional 5th arg — the inverse-CDF consumes rng
// positionally, so rng must never shift (determinism legs depend on it).
export function pickOffers(pool, owned, count, rng, state) {
  const remaining = pool.filter(c => isAvailable(c, owned, state));
  const out = [];
  while (out.length < count && remaining.length > 0) {
    const total = remaining.reduce((t, c) => t + (RARITY_WEIGHT[c.rarity] ?? 1), 0);
    let r = rng() * total;
    let idx = 0;
    for (let i = 0; i < remaining.length; i++) {
      r -= RARITY_WEIGHT[remaining[i].rarity] ?? 1;
      if (r < 0) { idx = i; break; }
    }
    out.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return out;
}

// 2-arg compat shim — the distinct-pair property at tests/upgrades.test.js:17-24
// is kept by splice-removal in pickOffers, not the old retry-bias branch.
export function pickTwo(pickList, rng) {
  return pickOffers(pickList, {}, 2, rng);
}

export function shouldOfferUpgrade(skips) {
  return skips > 0 && skips % 10 === 0;
}

// Offer-size escalation (RESEARCH Open Q2): size 3 beyond skip 30, else 2.
// First-offer pins stay green — the tenth-skip call lands on 2.
export function offerCount(skips) {
  return skips > 30 ? 3 : 2;
}
