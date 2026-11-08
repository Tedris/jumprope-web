import * as THREE from 'three';
import { lerpPhase } from './interpolate.js';

const WORLD_PER_PIXEL = 0.01;

// Canonical PS1 tuning values — copied verbatim from the signed-off look
// spike ("docs/archive/gsd/planning/spikes/ps1-look.html",
// "## Look Decisions"). Every knob
// below was approved as-rendered at the 02-01 checkpoint; change only with
// a fresh sign-off.
const INTERNAL_H = 240;        // D-01: locked internal rows; width follows the buffer aspect
const SNAP_S = 2;              // D-03: vertex-snap block size in internal pixels ("authentic crawl")
const SNAP_OFF = 0.25;         // UI-02 (D-05): reduced-motion snap block — sub-pixel step, wobble gone; never Infinity/0 (GLSL floor NaN)
const SKY = 0x2a3440;          // D-07: dim dusty blue sky — fog color matched (D-06)
const FLOOR = 0x3a4a42;        // D-07: dusty green floor
const ROSE = 0xc94f6d;         // D-07/D-13: prototype accent — the jumper pops against the moody stage
const PROP = 0x1d2630;         // D-07/D-18: dark props — handles, cap, eyes (later: silhouettes)
const PALE = 0xf4f0d8;         // D-09: rope pale — unlit and fog-exempt so it stays max-bright
const ROPE_RADIUS = 0.75;      // D-10: rope reach clears head (≈1.35) and floor from the hip-high hands axis
const HANDLE_HEIGHT = 0.7;     // D-08: hands axis at hip height — the rope sweeps about this X axis
const HANDLE_SPAN = 0.5;       // hands' |x|: rope ends converge here; shoulders can reach it
// Chest-jiggle gag (spec-chest-jiggle-physics): a cosmetic wink, not anatomy —
// one kill switch plus a damped spring coupled to vy deltas. Amplitude is
// sized against the D-03 snap quantum at the character plane (≈ 0.055 world
// units): peaks land ≈ 2–3 snap blocks so the wobble reads as chunky PS1
// hops instead of sub-quantum stillness; a hard clamp keeps vy teleports
// (leadIn swaps on resume/restart/pick) bounded.
const CHEST_JIGGLE = true;       // ON/OFF switch for the chest-jiggle gag — false: no meshes, no spring
const JIGGLE_COUPLING = 0.0025;  // vy delta (px/s) -> spring velocity kick (world units/s)
const JIGGLE_STIFF = 90;         // spring stiffness: ≈ 1.5 Hz wobble
const JIGGLE_DAMP = 4;           // damping ratio ≈ 0.2: 2–3 visible hops, settles ≈ 1 s
const JIGGLE_CLAMP = 0.15;       // max |offset| world units (~3 snap blocks, half the torso height)
const CHEST_BASE_Y = 0.28;       // chestGroup rest height on torsoGroup (torso front face: local z ≈ 0.12)
// Live look-tuning during UAT: append ?light=&fogNear=&fogFar= to override.
// Browser-only read; Node/test import path always takes the shipped defaults.
const LOOK_KNOBS = (() => {
  const q = typeof location !== 'undefined' && location.search ? new URLSearchParams(location.search) : null;
  const num = (key, fallback) => {
    const raw = Number(q?.get(key));
    return Number.isFinite(raw) && raw > 0 ? raw : fallback;
  };
  return { fogNear: num('fogNear', 7), fogFar: num('fogFar', 22), light: num('light', 2.4) };
})();
const FOG_NEAR = LOOK_KNOBS.fogNear;   // spike-approved 7/22; overridable for UAT tuning
const FOG_FAR = LOOK_KNOBS.fogFar;
const LIGHT_INTENSITY = LOOK_KNOBS.light;   // D-05: the one light — brightness lives here, no ambient fill
// Story 4.3 (FR15): area vistas — { sky, floor, prop, silhouettes } per tier,
// indexed by area. Inline by law, not taste: the renderer must NOT import
// js/areas.js — the two frozen data-URL boots rewrite EXACTLY two specifiers
// and a third breaks them on boot (tests/render3d.test.js:10-15, D-a). sky
// tracks AREAS[i].fog; the drift between the two tables is fenced by
// tests/areavistas.test.js §2. Tier 1 IS the signed-off look BY REFERENCE to
// the constants above — the alley pixels are preserved structurally, never as
// re-typed hex (D-a: the data caught up to the render, never the reverse).
// Silhouettes: slabs { x, w, h } at z = -8, depth 1.4, each clear of the
// D-18 judgment zone (|x| - w/2 >= 6).
const VISTAS = [
  { sky: SKY, floor: FLOOR, prop: PROP, silhouettes: [        // alley: the shipped five
    { x: -14, w: 2.5, h: 2.2 }, { x: -9, w: 1.8, h: 1.4 }, { x: 7.5, w: 2.0, h: 1.0 },
    { x: 11, w: 3.0, h: 2.8 }, { x: 14, w: 2.2, h: 1.8 }
  ] },
  { sky: 0x16213e, floor: 0x2f3d46, prop: 0x121a2a, silhouettes: [   // rooftops: a denser skyline
    { x: -15.5, w: 2.4, h: 3.4 }, { x: -11.5, w: 1.6, h: 4.6 }, { x: -8, w: 1.4, h: 2.8 },
    { x: 7.5, w: 1.4, h: 3.8 }, { x: 10.5, w: 2.0, h: 5.2 }, { x: 14.5, w: 1.8, h: 3.0 }
  ] },
  { sky: 0x101a30, floor: 0x2a363f, prop: 0x0e1522, silhouettes: [   // blimp: three wide, low hangars
    { x: -10.5, w: 4.0, h: 2.6 }, { x: 9.5, w: 3.6, h: 3.0 }, { x: 13.5, w: 1.2, h: 4.4 }
  ] },
  { sky: 0x0a1020, floor: 0x232d38, prop: 0x0a0f1a, silhouettes: [   // stratosphere: thin cloud shelves
    { x: -8.5, w: 2.6, h: 0.8 }, { x: 7.5, w: 3.0, h: 0.6 }, { x: 13, w: 2.2, h: 1.2 }
  ] },
  { sky: 0x060610, floor: 0x33384a, prop: 0x080a12, silhouettes: [    // moon-approach: sparse tall spires;
    { x: -12.5, w: 1.4, h: 5.4 }, { x: 11, w: 1.2, h: 4.0 }, { x: 16, w: 2.6, h: 1.0 }   // the moon floor
  ] }                                                                       // is LIGHTER on purpose (D-a)
];

// Display-side area heal, structurally copied from js/shell.js markerLine
// (js/shell.js:555) so the ceiling-marker text and the vista always agree on a
// crafted payload (D-c, same-tick pairing). Invalid areas are DATA, never
// errors; divergences from the sim's clampArea are the +Infinity arm (here the
// alley, there the summit) and finite fractions (here rounded, there truncated)
// — both unreachable in production, tickRun write-back heals every record.
// Returns the 0-based VISTAS index. Do NOT import clampArea: a third import breaks the boot wheel.
function vistaFor(area) {
  return Math.min(Math.max(Math.round(Number.isFinite(area) ? area : 1), 1), VISTAS.length) - 1;
}

// The ONE post pass (D-02): sRGB-encode first (the render target holds
// LINEAR values), then Bayer 4×4 offset + 31-level floor quantize (~15-bit),
// with the pattern indexed at internal-buffer pixel space (never the output
// framebuffer coordinate — Pitfall 3).
const BAYER_FRAG = `
  uniform sampler2D tDiffuse;
  uniform vec2 uInternalRes;
  uniform vec2 uShake;              // D-N06: post-pass UV jitter (dither cell stays on plain vUv)
  varying vec2 vUv;

  vec3 toSRGB( vec3 c ) {   // linear -> sRGB ENCODE: 1.055 * c^(1/2.4) - 0.055
    return mix( c * 12.92, 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055, step( vec3( 0.0031308 ), c ) );
  }
  float bayer4( vec2 p ) {             // standard 4x4 ordered matrix (sign-off: A1 confirmed)
    const mat4 m = mat4( vec4( 0.0, 12.0, 3.0, 15.0 ), vec4( 8.0, 4.0, 11.0, 7.0 ),
                         vec4( 2.0, 14.0, 1.0, 13.0 ), vec4( 10.0, 6.0, 9.0, 5.0 ) );
    int x = int( mod( p.x, 4.0 ) ); int y = int( mod( p.y, 4.0 ) );
    return m[y][x] / 16.0;             // threshold in [0,1)
  }
  void main() {
    vec3 c = toSRGB( texture2D( tDiffuse, vUv + uShake ).rgb );
    vec2 cell = floor( vUv * uInternalRes );   // unjittered vUv: the pattern must not swim with the shake (Pitfall 3)
    vec3 q = floor( c * 31.0 + bayer4( cell ) ) / 31.0;
    gl_FragColor = vec4( q, 1.0 );
  }`;

// Screen-space NDC-grid snap appended after the projection chunk (D-03,
// RESEARCH Pattern 2 — proven on the pinned build by the 02-01 spike).
// gl_Position.w is preserved so the rasteriser divide stays correct.
function applyVertexSnap(material, snapUniform) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSnapGrid = snapUniform;
    shader.vertexShader = 'uniform vec2 uSnapGrid;\n' + shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      {
        vec4 ndc = gl_Position / gl_Position.w;
        ndc.xy = floor( ndc.xy * uSnapGrid + 0.5 ) / uSnapGrid;  // snap to internal-pixel grid
        gl_Position.xy = ndc.xy * gl_Position.w;                 // preserve w — no second divide
      }`
    );
    material.userData.shader = shader;
  };
  material.customProgramCacheKey = () => 'ps1-snap';   // keeps snapped/unsnapped variants apart in the program cache (Pitfall 4)
}

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(1);                        // Pitfall 2: never scale targets by devicePixelRatio
  renderer.setSize(canvas.width, canvas.height, false);

  let internalW = Math.max(2, Math.round(INTERNAL_H * canvas.width / canvas.height));
  const rt = new THREE.WebGLRenderTarget(internalW, INTERNAL_H, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,                 // nearest upscale happens implicitly when the RT is sampled
    generateMipmaps: false
  });

  // UI-02 (D-05): ONE shared grid helper for both uSnapGrid write sites (init
  // and applyBufferSize) so a resize can never re-apply the full wobble the
  // reduced-motion flag removed (Pitfall 12). Grid = internal px / (2 * block).
  let reducedMotion = false;                     // last-seen view.reducedMotion, stored in render()
  function snapGridFor(reduced) {
    const s = reduced ? SNAP_OFF : SNAP_S;       // 0.25 px = sub-pixel step: wobble off, floor stays finite
    return [internalW / (2 * s), INTERNAL_H / (2 * s)];
  }

  // One shared snap uniform for every world material (D-03: world geometry
  // only — anything that must stay register-stable opts out later).
  const uSnapGrid = { value: new THREE.Vector2(...snapGridFor(false)) };

  function worldMaterial(color) {
    const material = new THREE.MeshLambertMaterial({ color, flatShading: true });   // D-05: vertex-lit flat facets
    applyVertexSnap(material, uSnapGrid);
    return material;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, FOG_NEAR, FOG_FAR);   // D-06: fog matched to the sky, hides the world edge

  // Shared world materials (rose accent on torso/head/scarf only, per the
  // UI-SPEC color contract; neutral limbs; dark props — D-13).
  const roseMat = worldMaterial(ROSE);
  const limbMat = worldMaterial(FLOOR);
  const propMat = worldMaterial(PROP);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), worldMaterial(FLOOR));
  floor.rotation.x = -Math.PI / 2;                     // one sparse quad keeps the snap calm (Pitfall 7)
  scene.add(floor);

  // Horizon silhouettes (D-18, Story 4.3/D-e): ALL tiers prebuilt ONCE in ONE
  // Group — render() only flips .visible, so a vista switch allocates nothing
  // and at most one tier ever draws (NFR1's cheap geometry). Per-tier material
  // through the one worldMaterial() pipeline (D-d); tier 1 keeps the shipped
  // slab numbers and the shipped PROP hex — the first-boot look is unchanged.
  // Fingerprint safety: ONE Group of 20 Box children, never trio-shaped, added
  // AFTER the floor — the frozen rig/ropePivot/snap probes (render3d.test.js
  // :241-248, :158-165) cannot see it (D-e).
  const horizonGroup = new THREE.Group();
  const tierSlabs = VISTAS.map((vista, tier) => {
    const tierMat = worldMaterial(vista.prop);
    return vista.silhouettes.map((s) => {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, 1.4), tierMat);
      slab.position.set(s.x, s.h / 2, -8);
      slab.visible = tier === 0;
      horizonGroup.add(slab);
      return slab;
    });
  });
  scene.add(horizonGroup);

  // Blob shadow (D-17): a stable, snap-EXEMPT disc under the crawling
  // geometry — the depth reference that makes jump height legible.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 8),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.02, 0);                     // clears the wobbling floor (no z-fight)
  scene.add(shadow);

  // Character rig (D-13): chibi primitive assembly, built ONCE here; every
  // animated quantity is written in render() from the canonical clock (D-14).
  // root -> torso group -> head (+ cap/eyes/scarf chain); legs on the root.
  const rig = new THREE.Group();
  scene.add(rig);

  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.35, 0);
  rig.add(torsoGroup);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.24), roseMat);
  torso.position.set(0, 0.2, 0);                        // center at ≈ 0.55 world
  torsoGroup.add(torso);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.4, 0);                    // neck at ≈ 0.75 world
  torsoGroup.add(headGroup);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), roseMat);   // big head (D-15)
  head.position.set(0, 0.275, 0);                       // top ≈ 1.3 world
  headGroup.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.58), propMat);    // dark cap over the rose head
  cap.position.set(0, 0.58, 0);
  headGroup.add(cap);
  const eyeGeo = new THREE.BoxGeometry(0.07, 0.07, 0.03);                           // dot-block eyes (D-15)
  const eyeL = new THREE.Mesh(eyeGeo, propMat);
  eyeL.position.set(-0.12, 0.3, 0.28);
  headGroup.add(eyeL);
  const eyeR = new THREE.Mesh(eyeGeo, propMat);
  eyeR.position.set(0.12, 0.3, 0.28);
  headGroup.add(eyeR);

  // Scarf chain (D-15): 3 rose segments behind the neck, parented end to end;
  // posed in render() with per-segment phase lag (Task 3 wires the pose).
  const scarf = [];
  let scarfParent = headGroup;
  for (let k = 0; k < 3; k++) {
    const seg = new THREE.Group();
    seg.position.set(0, k === 0 ? 0.4 : -0.12, k === 0 ? -0.3 : -0.06);
    const segMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24 - 0.05 * k, 0.09, 0.05), roseMat);
    segMesh.position.set(0, -0.05, 0);
    seg.add(segMesh);
    scarfParent.add(seg);
    scarf.push(seg);
    scarfParent = seg;
  }

  const armL = new THREE.Group();
  armL.position.set(-0.24, 0.27, 0);                    // shoulders ≈ 0.62 world
  armL.rotation.z = -1.88;                              // hands out at the handles (hip-high rope axis)
  torsoGroup.add(armL);
  const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.1), limbMat);
  armLMesh.position.set(0, -0.16, 0);
  armL.add(armLMesh);
  const armR = new THREE.Group();
  armR.position.set(0.24, 0.27, 0);
  armR.rotation.z = 1.88;
  torsoGroup.add(armR);
  const armRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.1), limbMat);
  armRMesh.position.set(0, -0.16, 0);
  armR.add(armRMesh);

  // Chest-jiggle gag: two deliberately boxy props on the chest front (D-13
  // chibi boxes, rose like the torso), parented as a pair so ONE shared
  // spring writes ONE position. Hidden entirely when CHEST_JIGGLE is off.
  // Appended LAST on torsoGroup: the frozen render3d.test.js pose probes
  // read children[2]/[3] as armL/armR — the chest must not shift them.
  const chestGroup = new THREE.Group();
  chestGroup.position.set(0, CHEST_BASE_Y, 0);
  chestGroup.visible = CHEST_JIGGLE;
  torsoGroup.add(chestGroup);
  if (CHEST_JIGGLE) {
    const chestGeo = new THREE.BoxGeometry(0.11, 0.11, 0.11);
    const chestL = new THREE.Mesh(chestGeo, roseMat);
    chestL.position.set(-0.09, 0, 0.14);                // centered just in front of the torso face
    chestGroup.add(chestL);
    const chestR = new THREE.Mesh(chestGeo, roseMat);
    chestR.position.set(0.09, 0, 0.14);
    chestGroup.add(chestR);
  }

  const legL = new THREE.Group();
  legL.position.set(-0.1, 0.35, 0);                     // hips
  rig.add(legL);
  const legLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.35, 0.13), limbMat);
  legLMesh.position.set(0, -0.175, 0);
  legL.add(legLMesh);
  const legR = new THREE.Group();
  legR.position.set(0.1, 0.35, 0);
  rig.add(legR);
  const legRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.35, 0.13), limbMat);
  legRMesh.position.set(0, -0.175, 0);
  legR.add(legRMesh);

  // Rope (D-08/D-10): sag-baked HAND-TO-HAND ARC (curve-local semicircle
  // through the two handles at (±ROPE_RADIUS, 0, 0)) sampled into a
  // CatmullRomCurve3 and a TubeGeometry, both constructed ONCE (T-02-10 —
  // no per-frame geometry). The mid-rope point (curve-local +Y) bulges
  // slightly outward so the sagged low point is visually unmistakable when
  // it sweeps to world-down at theta = PI. Sweeping the pivot about X (the
  // hands axis) foreshortens the arc at the camera like a real rope; the
  // old in-screen Z-spin showed a static circle silhouette.
  const ropePts = [];
  for (let k = 0; k < 9; k++) {
    const a = (k / 8) * Math.PI;                       // handle -> over the head -> handle
    const sag = Math.sin(a) * Math.sin(a) * 0.06;      // mid-rope outward bulge
    ropePts.push(new THREE.Vector3(
      Math.cos(a) * (HANDLE_SPAN + (ROPE_RADIUS - HANDLE_SPAN) * Math.sin(a)),
      ROPE_RADIUS * Math.sin(a) + sag,                 // widest aloft, converging at the hands
      0
    ));
  }
  const ropeCurve = new THREE.CatmullRomCurve3(ropePts);
  const ropePivot = new THREE.Group();
  ropePivot.position.set(0, HANDLE_HEIGHT, 0);
  scene.add(ropePivot);

  const ropeTube = new THREE.Mesh(
    new THREE.TubeGeometry(ropeCurve, 32, 0.05, 6, false),
    new THREE.MeshBasicMaterial({ color: PALE, fog: false })   // D-09: unlit, fog-exempt, no snap
  );
  ropePivot.add(ropeTube);

  const handleGeo = new THREE.BoxGeometry(0.08, 0.18, 0.08);   // D-12: handles turn with the arc
  const handleL = new THREE.Mesh(handleGeo, propMat);
  handleL.position.set(-HANDLE_SPAN, 0, 0);
  ropePivot.add(handleL);
  const handleR = new THREE.Mesh(handleGeo, propMat);
  handleR.position.set(HANDLE_SPAN, 0, 0);
  ropePivot.add(handleR);

  // Juice particles (D-N06): one pooled set of 16 flat quads built ONCE —
  // spawns toggle visibility and write closed-form positions, so a burst
  // allocates nothing. Snap-exempt like the rope; one shared material.
  const PARTICLE_POOL = 16;
  const particleMat = new THREE.MeshBasicMaterial({ color: PALE, fog: false, transparent: true });
  const particleGroup = new THREE.Group();
  const particles = [];
  for (let k = 0; k < PARTICLE_POOL; k++) {
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), particleMat);
    quad.visible = false;
    particleGroup.add(quad);
    particles.push(quad);
  }
  scene.add(particleGroup);

  const sun = new THREE.DirectionalLight(0xffffff, LIGHT_INTENSITY);   // D-05: the one light
  sun.position.set(-4, 7, 3);
  scene.add(sun);

  // Fixed side-on-with-slight-angle camera (D-16, UI-SPEC framing): near the
  // +Z axis so the XY-plane arc reads cleanly, small +X offset for depth.
  // Never touched again in render() — zero camera motion, ever.
  const camera = new THREE.PerspectiveCamera(40, canvas.width / canvas.height, 0.1, 80);
  camera.position.set(2.6, 2.2, 8.6);
  camera.lookAt(0, 1, 0);

  // Final pass: the one fullscreen quad (D-02) — no second pass, no composer.
  const postScene = new THREE.Scene();
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const ditherMat = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      uInternalRes: { value: new THREE.Vector2(internalW, INTERNAL_H) },
      uShake: { value: new THREE.Vector2(0, 0) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }`,
    fragmentShader: BAYER_FRAG,
    depthTest: false,
    depthWrite: false
  });
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ditherMat));

  function applyBufferSize(width, height) {
    internalW = Math.max(2, Math.round(INTERNAL_H * width / height));
    rt.setSize(internalW, INTERNAL_H);
    ditherMat.uniforms.uInternalRes.value.set(internalW, INTERNAL_H);
    uSnapGrid.value.set(...snapGridFor(reducedMotion));   // uniform value only — no recompile; follows the stored flag (Pitfall 12)
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  // Precompile both scenes here (criterion 4 / Pitfall 5): the post quad's
  // program compiles lazily too, so a build-time compile beats a first-frame hitch.
  renderer.compile(scene, camera);
  renderer.compile(postScene, postCamera);

  let lastWidth = canvas.width;
  let lastHeight = canvas.height;

  // Cosmetic status bookkeeping (D-11/D-15): view.now is consulted ONLY on
  // the idle/trip branches below — the running pose never reads it (T-02-08).
  let lastStatus = 'idle';
  let tripAt = 0;
  // Vista cache (D-b): the applied VISTAS index. 0 at boot is not a guess —
  // the constructed scene IS tier 1: background/fog/floor/slabs are built from
  // VISTAS[0]'s very values (the SKY/FLOOR/PROP references), so area-less
  // payloads (every frozen-suite boot) never take the apply path.
  let appliedVista = 0;

  // Read-only juice-signal bookkeeping (D-N06): the shell's view.juice is
  // sampled here and NEVER written back (Phase-1 D-01). Everything decays
  // closed-form from these scalars — no timers, no accumulators, no RNG.
  let lastJuiceAt = 0;
  let juiceAt = 0;
  let juiceShake = 0;
  let spawnAt = 0;
  let spawnOriginY = 0;
  let spawnBase = 0;
  let spawnCount = 0;
  let particlesLive = false;

  // Chest-jiggle spring (the sanctioned stateful exception to the juice
  // closed-form rule): offset + velocity, driven by vy deltas on the same
  // view.now clock. UI-02 parity: reduced motion pins the still endpoint 0.
  let jiggleOff = 0;
  let jiggleVel = 0;
  let lastVy = 0;
  let jigglePrevNow = 0;

  function render(view) {
    // UI-02 (D-06): view.reducedMotion is consumed exactly like view.now —
    // one-way data, no listener and no window reference here (ARCH fence).
    // Stored BEFORE the size poll so a same-frame resize re-derives through
    // snapGridFor with the fresh flag (Pitfall 12); a bare flag change takes
    // effect this very frame via the same shared helper (D-06 live-switch).
    const reduced = !!view.reducedMotion;
    if (reduced !== reducedMotion) {
      reducedMotion = reduced;
      uSnapGrid.value.set(...snapGridFor(reduced));
    }

    // Passive resize poll: the canvas element is a constructor arg, so a
    // property read is the boundary-fence-legal size channel.
    if (canvas.width !== lastWidth || canvas.height !== lastHeight) {
      lastWidth = canvas.width;
      lastHeight = canvas.height;
      applyBufferSize(lastWidth, lastHeight);
    }

    // Area vista (Story 4.3, D-b): pure area-state, cache-and-apply in the
    // lastStatus idiom — on an area edge write EXACTLY four things: background,
    // fog color (the D-06 pair), the floor material and the slab visibility.
    // No tween, no timer (NFR8; the ascent BEAT — hitstop, palette-flip — is
    // Story 4.4's). Character/rope/particles are never touched (D-d).
    const vista = vistaFor(view.run.area);
    if (vista !== appliedVista) {
      const v = VISTAS[vista];
      scene.background.set(v.sky);
      scene.fog.color.set(v.sky);
      floor.material.color.set(v.floor);
      for (let t = 0; t < tierSlabs.length; t++) {
        for (const slab of tierSlabs[t]) slab.visible = t === vista;
      }
      appliedVista = vista;
    }

    // Single clock entry: canonical rope phase, interpolated prev -> curr.
    // Every running-pose quantity below derives from it — no mixer, no
    // second timing system (D-14 / T-02-08).
    const phase = lerpPhase(view.prevPhase, view.rope.phase, view.alpha ?? 0);
    const theta = phase * Math.PI * 2;
    const playerY = view.player.y ?? 0;                 // sim pixels — one mapping, three consumers

    const squash = view.player.squash ?? 1;
    rig.scale.set(1 / squash, squash, 1 / squash);

    const status = view.run.status ?? 'idle';
    if (status !== lastStatus) {
      if (status === 'over') tripAt = view.now ?? 0;    // capture the settle start (D-11)
      lastStatus = status;
    }

    let beat = theta;                                   // clock driving arms + scarf secondary motion
    if (status === 'idle') {
      // Idle life (D-15): cosmetic clock reads only here; the twirl is
      // deliberately slower than any gameplay sweep so the states never mix.
      const now = view.now ?? 0;
      rig.position.y = reduced ? 0 : Math.sin(now / 400) * 0.05;   // D-05/Open Q3: breath bob → still endpoint under reduced motion
      ropePivot.rotation.x = reduced ? 0 : now / 1400;            // D-05/Open Q3: idle twirl → frozen pose; rotation.z stays 0 either way
      ropePivot.rotation.z = 0;
      beat = now / 1400;
      armL.rotation.x = Math.sin(beat);
      armR.rotation.x = -Math.sin(beat);
      legL.rotation.x = 0;
      legR.rotation.x = 0;
    } else if (status === 'over') {
      // Trip settle (D-11): rope frozen at the feet-at-rest angle with a
      // short damped shake — closed-form in view.now deltas, no RNG and no
      // accumulator (T-02-09); bigger juice stays Phase 4.
      rig.position.y = 0;
      // D-05/Open Q3: under reduced motion the damped settle shake holds the
      // still endpoint exactly — no pivot oscillation, same freeze posture.
      ropePivot.rotation.x = reduced ? -Math.PI : -Math.PI +
        Math.sin(((view.now ?? 0) - tripAt) * 42) * Math.exp(-((view.now ?? 0) - tripAt) / 200);
      ropePivot.rotation.z = 0;
      armL.rotation.x = 0;
      armR.rotation.x = 0;
      legL.rotation.x = 0;
      legR.rotation.x = 0;
    } else {
      rig.position.y = playerY * WORLD_PER_PIXEL;
      // Convention (PRES-03): theta = PI places the tube's sagged low point
      // at the feet — the curve's bulge lives at local +Y, which sweeps to
      // world-down at rotation.x = PI about the hands axis (R_x(PI) maps
      // +Y -> -Y), matching atFeet's 0.45–0.55 phase window (js/rope.js:11-13)
      // where the score tick fires. +theta = forward skip: the rope's mid
      // travels over-head->front->feet->back (camera at +Z).
      ropePivot.rotation.x = theta;                     // forward sweep: rope top leads toward camera
      ropePivot.rotation.z = 0;
      armL.rotation.x = Math.sin(theta) * 0.25;         // light antiphase sway; hands stay near the handles
      armR.rotation.x = -Math.sin(theta) * 0.25;
      const airborne = playerY > 0;                     // tuck keyed off sim height, never its own timer
      legL.rotation.x = airborne ? -0.7 : 0;
      legR.rotation.x = airborne ? 0.4 : 0;
    }

    // UI polish (2026-11-05): the rope rides the character — the pivot
    // inherits the rig's vertical, so jump/fall carry the handles and the
    // arc with the body (running: mapped sim height; idle: the breath bob;
    // over: settles back to 0). One write site, all statuses.
    ropePivot.position.y = HANDLE_HEIGHT + rig.position.y;

    for (let k = 0; k < scarf.length; k++) {
      scarf[k].rotation.x = Math.sin(beat - k * 0.4) * 0.5;   // scarf trails a beat behind (D-15)
    }

    // Chest-jiggle gag: damped spring integrated OUTSIDE the status branches so
    // idle/trip decay to rest too. vy only changes when sim steps run, so
    // constant-vy free-flight adds no new force — existing oscillation decays.
    if (CHEST_JIGGLE) {
      const vy = Number.isFinite(view.player.vy) ? view.player.vy : 0;
      const jiggleNow = view.now ?? 0;
      const dt = jigglePrevNow === 0 ? 0
        : Math.min(0.05, Math.max(0.001, (jiggleNow - jigglePrevNow) / 1000));   // first frame skips; tab-refocus can't explode
      jigglePrevNow = jiggleNow;
      if (reduced) {
        jiggleOff = 0;
        jiggleVel = 0;
      } else if (dt > 0) {
        // Inertial lag: kick opposite the vy delta, so a launch (vy steps up)
        // reads as a downward lag; gravity's steady vy drop gives hang-time lift.
        jiggleVel += -(vy - lastVy) * JIGGLE_COUPLING - (JIGGLE_STIFF * jiggleOff + JIGGLE_DAMP * jiggleVel) * dt;
        jiggleOff += jiggleVel * dt;
        jiggleOff = Math.min(JIGGLE_CLAMP, Math.max(-JIGGLE_CLAMP, jiggleOff));   // leadIn vy teleports stay bounded
        if (!Number.isFinite(jiggleOff) || !Number.isFinite(jiggleVel)) {
          jiggleOff = 0;
          jiggleVel = 0;
        }
      }
      lastVy = vy;
      chestGroup.position.y = CHEST_BASE_Y + jiggleOff;   // one vertical axis, never NaN
    }

    // Blob shadow (D-17, RESEARCH Pattern 6): continuous shrink + fade with jump height.
    shadow.scale.setScalar(1 / (1 + playerY * WORLD_PER_PIXEL * 0.8));
    shadow.material.opacity = 0.45 / (1 + playerY * WORLD_PER_PIXEL * 0.8);

    // Juice impulse (D-N06): a fresh view.juice.at spawns the pooled quads;
    // every quantity below is closed-form in view.now - spawnAt, so the pool
    // runs with zero per-frame allocation and zero Math.random.
    if (view.juice && view.juice.at !== lastJuiceAt) {
      juiceAt = view.juice.at;
      juiceShake = reduced ? 0 : Math.min(2, view.juice.shake ?? 0);   // D-N12: <= 2 post-pass px; UI-02 (D-05): shake off at the single write site
      lastJuiceAt = view.juice.at;
      spawnAt = view.now ?? 0;
      spawnOriginY = rig.position.y + 0.5;
      spawnBase = spawnCount * 0.7;                     // spawn-counter phase, never RNG
      spawnCount += 1;
      const count = Math.min(view.juice.particles ?? 0, PARTICLE_POOL);
      for (let k = 0; k < PARTICLE_POOL; k++) {
        particles[k].visible = k < count;
        particles[k].position.set(0, spawnOriginY, 0.1);
      }
      particlesLive = count > 0;
      particleMat.opacity = 1;
    }
    if (particlesLive) {
      const pt = ((view.now ?? 0) - spawnAt) / 1000;
      if (pt > 0.45) {
        particlesLive = false;
        for (let k = 0; k < PARTICLE_POOL; k++) particles[k].visible = false;
      } else if (pt > 0) {
        // UI-02 (D-05 static/fade-only): the flight positions go; the spawn
        // block, this frame's opacity ramp and the lifetime check above stay.
        if (!reduced) {
          for (let k = 0; k < PARTICLE_POOL; k++) {
            if (!particles[k].visible) continue;
            const angle = k * 2.399 + spawnBase;          // golden-angle spread
            const speed = 1.6 + 0.05 * k;
            particles[k].position.set(
              Math.cos(angle) * speed * pt,
              spawnOriginY + Math.sin(angle) * speed * pt - 0.5 * 3 * pt * pt,
              0.1
            );
          }
        }
        particleMat.opacity = Math.max(0, 1 - pt / 0.45);
      }
    }
    // Shake: UV-space jitter of the texture sample only (D-N06) — k is in
    // post-pass pixels, divided down to UV units; the camera never moves.
    const jt = (view.now ?? 0) - juiceAt;
    const shake = jt >= 0 && jt < 140 ? juiceShake * Math.exp(-jt / 50) * Math.sin(jt * 0.55) : 0;
    ditherMat.uniforms.uShake.value.set(shake / internalW, shake / INTERNAL_H);

    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);                 // -> 240-row LINEAR target
    renderer.setRenderTarget(null);
    ditherMat.uniforms.tDiffuse.value = rt.texture;
    renderer.render(postScene, postCamera);         // -> sRGB + Bayer + quantize -> canvas
  }

  return { render };
}
