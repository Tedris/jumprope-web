# Jump Rope Roguelike — Design Spec

Inspired by Scarlet Skips: a one-button jump rope roguelike about skipping rope for absurdly high scores, with juicy bounce physics.

## Intent

A browser game where the player keeps Scarlet skipping rope as long as possible. One button (space, click, or tap) controls everything. Easy to play, tough to finish. Simple shape-based graphics now; pixel-art sprites later without changing game logic.

## Tech

- Single HTML page + HTML5 Canvas 2D + vanilla JS. No framework, no build step.
- Files: `index.html`, `css/style.css`, `js/game.js`, `js/player.js`, `js/rope.js`, `js/upgrades.js`.
- Fixed-timestep update loop (`requestAnimationFrame` with accumulator); rendering interpolates.
- Canvas scales to fit the viewport while keeping aspect ratio.

## Architecture

`game.js` owns a fixed-timestep loop, input handling, and a state machine:

```
idle → running → run-over → upgrade-choice → running
                                      (every N skips) ↗
```

- `player.js` — jump physics and jiggle. Press-and-hold charges jump height (hold duration maps to impulse). Landing applies squash-and-stretch via spring interpolation (overshoot + settle). Player logic is pure state in / state out; no drawing.
- `rope.js` — rope swing cycle with period affected by upgrades. A skip succeeds when the player's feet are above the rope's contact line at the crossing moment; otherwise the run ends (trip). Timing window is a pure function of player height and rope angle.
- `upgrades.js` — data-driven upgrade pool. Each upgrade: name, description, apply(state) function. Examples: +float time, slower rope swing, score multiplier, wider timing window. Effects stack; offered as choose-1-of-2 every 10 skips during the run.
- Rendering lives only in `game.js` draw code (circles/rects/text). Sprite upgrade later = replace draw calls only.

## Gameplay Loop

1. Idle screen: press button to start.
2. Rope swings at a steady cadence. Press the button as the rope reaches Scarlet's feet; hold longer to jump higher.
3. Each successful skip: +1 × multiplier score, bounce sound-free squash animation, counter ticks.
4. Every 10 skips: game pauses into upgrade-choice — two random upgrades shown, pick with click/key. Unpicked option is discarded.
5. Trip (rope catches feet): run ends. Show score + best score. Next press starts a new run.

Best score persists in `localStorage`.

## Error Handling

- Missing/blocked `localStorage`: fall back to in-memory best score.
- Window resize: recompute canvas scale on `resize`; no layout thrash (single handler).
- Tab hidden: cap catch-up steps in the accumulator so physics stays stable on resume.

## Testing

- Pure logic (timing-window check, score computation, upgrade stacking, state transitions) in small pure functions, tested with `node --test` on plain `.js` modules.
- Rendering and feel verified manually in browser.

## Out of Scope (later)

Pixel-art sprites, animations beyond spring bounce, unlockable characters, audio, multiple rope types, mobile-specific tuning.
