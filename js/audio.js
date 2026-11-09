// AUD-01..04 (D-N07): the single WebAudio home. Leaf module — zero imports —
// with every environmental touch (audio context, storage, fetch) arriving as
// a parameter so boundary fences re-audit this file for free. js/shell.js is
// its only consumer; the audio layer only READS game events and never writes
// back into rope/player/run (D-N09 consumer rule).

const SETTINGS_KEY = 'jumprope-audio';
const TRACK_URL = 'audio/track.ogg';

// Valid volume is any finite number, clamped into [0,1]; 0 is a legitimate
// setting, so the invalid-input fallback is an explicit finiteness check,
// never a || coalesce (which would silently rewrite 0 to 1).
const clampVolume = v => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1;
};

// D-N10: the injectable-storage seam of game.js's best-score helpers — one
// key, shape-pinned read (T-4-06), silent degradation.
export function loadSettings(storage) {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return { muted: false, volume: 1 };
    const s = JSON.parse(raw);
    return {
      muted: s.muted === true,
      volume: clampVolume(s.volume),
    };
  } catch {
    return { muted: false, volume: 1 };
  }
}

export function saveSettings(storage, settings) {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify({
      muted: !!settings.muted,
      volume: clampVolume(settings.volume),
    }));
  } catch {
    // storage unavailable; settings are session-only
  }
}

// Factory per D-N08: nothing is constructed here — the shell hands the live
// context to gesture() on the first user press; `context` is the pre-bound
// convenience slot for tests. Missing WebAudio is a silent no-op BY STATE.
export function createAudio({ context, storage, fetchFn } = {}) {
  let ctx = null;
  let pendingContext = context || null;
  let master = null;
  let noise = null;
  let settings = loadSettings(storage);
  let trackPlaying = false;
  let trackMissing = false;
  let trackPending = false;
  // Story 5.2 (FR28): last-rope tension — pure closure STATE (Decisions #3):
  // armed ONLY through setRopes below, touches no node and no ctx, so it is
  // a correct no-op before the first gesture (the play() state-guard idiom
  // applied to a setter). The shell calls it from updateHud's pip-signature
  // flip — one shared call site; no new event names (D-N02 untouched).
  let tension = false;

  function applyGain() {
    if (master) master.gain.value = settings.muted ? 0 : settings.volume;
  }

  function gesture(audioContext) {
    if (!ctx) {
      const c = audioContext !== undefined && audioContext !== null ? audioContext : pendingContext;
      if (!c) return;
      ctx = c;
      pendingContext = null;
      master = ctx.createGain();
      master.gain.value = settings.muted ? 0 : settings.volume;
      master.connect(ctx.destination);
      noise = makeNoise(ctx);
      // A context created inside the gesture may still arrive suspended
      // (autoplay policy on some browsers) — recover immediately, never
      // leave a silent broken state behind the first tap (AUD-03).
      if (ctx.state === 'suspended') ctx.resume();
      playTrack();
    } else if (ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  // UI-01: pause suspends context time entirely — the symmetric counterpart
  // of gesture()'s recovery arm, state-guarded the same way. The returned
  // Promise is fire-and-forget; gesture() above is the resume path.
  function suspend() {
    if (ctx && ctx.state === 'running') ctx.suspend();
  }

  // D-N09: one pre-rendered file, looped through the shared master bus. The
  // absent track is the tested DEFAULT (human-gated content): flag + silence,
  // never a throw, never a retry loop.
  function playTrack(url = TRACK_URL) {
    // trackPending flips synchronously: a gesture() racing a manual call
    // must never start a second fetch while the first is still in flight.
    if (!master || !fetchFn || trackPlaying || trackMissing || trackPending) return false;
    trackPending = true;
    let p;
    try {
      p = fetchFn(url);
    } catch {
      trackPending = false;
      trackMissing = true;
      return false;
    }
    Promise.resolve(p)
      .then(r => (r && r.ok ? r.arrayBuffer() : Promise.reject(new Error('missing'))))
      .then(buf => ctx.decodeAudioData(buf))
      .then(decoded => {
        const source = ctx.createBufferSource();
        source.buffer = decoded;
        source.loop = true;
        source.connect(master);
        source.start(0);
        trackPending = false;
        trackPlaying = true;
      })
      .catch(() => {
        trackPending = false;
        trackMissing = true;
      });
    return true;
  }

  // Deterministic white noise for the trip voice — a seeded LCG, never the
  // global rng, so the module stays clean under the ARCH-02 graph walk if a
  // test imports it.
  function makeNoise(c) {
    const rate = c.sampleRate || 22050;
    const buf = c.createBuffer(1, Math.floor(rate * 0.25), rate);
    const data = buf.getChannelData(0);
    let seed = 0x9e3779b9;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      data[i] = ((seed >>> 8) / 0x1000000) * 2 - 1;   // >>> 8 leaves 24 bits; divide by 2^24 for [-1, 1)
    }
    return buf;
  }

  function tone(type, freq, t0, dur, end) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (end) osc.frequency.linearRampToValueAtTime(end, t0 + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.25, t0);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(env);
    env.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur);
  }

  function noiseHit(t0, dur, fromHz, toHz) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(fromHz, t0);
    filter.frequency.exponentialRampToValueAtTime(toHz, t0 + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.4, t0);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(env);
    env.connect(master);
    src.start(t0);
    src.stop(t0 + dur);
  }

  // AUD-01: one short voice per gameplay moment. Every voice starts inside
  // play() — the single voice-start funnel whose node churn a stub counts.
  function play(voice) {
    if (!ctx || !master) return;
    voice(ctx.currentTime || 0);
  }

  const VOICES = {
    jump: t => tone('square', 220, t, 0.08, 330),
    // Story 5.2 (FR28): the rope's own tick gains a last-rope variant — a
    // taut double-tick (tonic + free harmonic 1320, nearMiss/pick stagger
    // precedent) while tension is armed by setRopes(1). Unarmed, the shipped
    // single 660 tick is byte-identical (v1parity: DOM-less harnesses never
    // reach the pip block, so tension can never arm on a parity boot).
    skip: t => { if (tension) { tone('triangle', 660, t, 0.04); tone('triangle', 1320, t + 0.05, 0.04); } else tone('triangle', 660, t, 0.06); },
    nearMiss: t => { tone('square', 880, t, 0.05); tone('square', 880, t + 0.07, 0.05); },
    trip: t => noiseHit(t, 0.25, 1600, 120),
    // Story 5.2 (FR28): the rope-loss thud — oscillator-only square sub-bass
    // (Decisions #1: a noiseHit body would collide with trip's single 'noise'
    // oracle tag). One down-ramp note under every shipped pitch (110 < win's
    // 196 floor); the terminal variant of the same moment stays the untouched
    // trip voice — the channel already splits strip (ropeLost) from last-rope
    // (trip), so VOICES IS the variant mechanism (Decisions #2, D-N09).
    ropeLost: t => tone('square', 110, t, 0.2, 55),
    pick: t => { tone('triangle', 523, t, 0.07); tone('triangle', 659, t + 0.07, 0.08); },
    // Story 5.1 (FR28): the deferred beat's audio half. Uniform voices —
    // no per-area variant (a tier payload would widen handleEvent beyond
    // the frozen one-parameter contract). Pure tone() stagger, scheduled
    // on t0 + literal offsets only; signatures stay disjoint with the
    // five v1 voices' (type,freq) set — fenced by ascentstinger §oracle.
    ascend: t => { tone('square', 330, t, 0.09); tone('square', 440, t + 0.08, 0.09); tone('square', 587, t + 0.16, 0.09); },
    win: t => { tone('triangle', 196, t, 0.11); tone('triangle', 392, t + 0.11, 0.11); tone('triangle', 494, t + 0.22, 0.12); tone('triangle', 784, t + 0.33, 0.22); },
  };

  function handleEvent(name) {
    const voice = VOICES[name];
    if (voice) play(voice);
  }

  // D-N10: write-through on every change, no debouncing.
  function setMuted(v) {
    settings = { ...settings, muted: !!v };
    applyGain();
    saveSettings(storage, settings);
  }

  function setVolume(v) {
    settings = { ...settings, volume: Math.min(1, Math.max(0, Number(v) || 0)) };
    applyGain();
    saveSettings(storage, settings);
  }

  function toggleMute() {
    setMuted(!settings.muted);
  }
  // Story 5.2: the state-only rope-count seam (see `tension` above) — held
  // exactly 1 arms the variant, any other count disarms it, so Spare Rope
  // reverses for free through the same updateHud call site.
  function setRopes(held) {
    tension = held === 1;
  }

  return {
    gesture,
    suspend,
    handleEvent,
    playTrack,
    setMuted,
    setVolume,
    toggleMute,
    setRopes,
    isMuted: () => settings.muted,
    getVolume: () => settings.volume,
    getStatus: () => ({
      initialized: ctx !== null,
      ctxState: ctx ? ctx.state : 'none',
      trackPlaying,
      trackMissing,
    }),
  };
}
