import * as THREE from 'three';
import { lerpPhase } from './interpolate.js';

const WORLD_PER_PIXEL = 0.01;

// Canonical PS1 tuning values — copied verbatim from the signed-off look
// spike (".planning/spikes/ps1-look.html", "## Look Decisions"). Every knob
// below was approved as-rendered at the 02-01 checkpoint; change only with
// a fresh sign-off.
const INTERNAL_H = 240;        // D-01: locked internal rows; width follows the buffer aspect
const SNAP_S = 2;              // D-03: vertex-snap block size in internal pixels ("authentic crawl")
const SKY = 0x2a3440;          // D-07: dim dusty blue sky — fog color matched (D-06)
const FLOOR = 0x3a4a42;        // D-07: dusty green floor
const ROSE = 0xc94f6d;         // D-07/D-13: prototype accent — the jumper pops against the moody stage
const PROP = 0x1d2630;         // D-07/D-18: dark props — handles, cap, eyes (later: silhouettes)
const PALE = 0xf4f0d8;         // D-09: rope pale — unlit and fog-exempt so it stays max-bright
const ROPE_RADIUS = 0.75;      // D-10: rope reach clears head (≈1.35) and floor from the hip-high hands axis
const HANDLE_HEIGHT = 0.7;     // D-08: hands axis at hip height — the rope sweeps about this X axis
const HANDLE_SPAN = 0.5;       // hands' |x|: rope ends converge here; shoulders can reach it
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

// The ONE post pass (D-02): sRGB-encode first (the render target holds
// LINEAR values), then Bayer 4×4 offset + 31-level floor quantize (~15-bit),
// with the pattern indexed at internal-buffer pixel space (never the output
// framebuffer coordinate — Pitfall 3).
const BAYER_FRAG = `
  uniform sampler2D tDiffuse;
  uniform vec2 uInternalRes;
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
    vec3 c = toSRGB( texture2D( tDiffuse, vUv ).rgb );
    vec2 cell = floor( vUv * uInternalRes );
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

  // One shared snap uniform for every world material (D-03: world geometry
  // only — anything that must stay register-stable opts out later).
  const uSnapGrid = { value: new THREE.Vector2(internalW / (2 * SNAP_S), INTERNAL_H / (2 * SNAP_S)) };

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

  // Horizon silhouettes (D-18): static dark slabs far off-axis and behind
  // the floor edge, deep inside the fog falloff; nothing tall within 6
  // world units of x = 0 keeps the judgment zone clean.
  const SILHOUETTES = [
    { x: -14, w: 2.5, h: 2.2 },
    { x: -9, w: 1.8, h: 1.4 },
    { x: 7.5, w: 2.0, h: 1.0 },
    { x: 11, w: 3.0, h: 2.8 },
    { x: 14, w: 2.2, h: 1.8 }
  ];
  for (const s of SILHOUETTES) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, 1.4), propMat);
    slab.position.set(s.x, s.h / 2, -8);
    scene.add(slab);
  }

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
      uInternalRes: { value: new THREE.Vector2(internalW, INTERNAL_H) }
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
    uSnapGrid.value.set(internalW / (2 * SNAP_S), INTERNAL_H / (2 * SNAP_S));   // uniform value only — no recompile
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

  function render(view) {
    // Passive resize poll: the canvas element is a constructor arg, so a
    // property read is the boundary-fence-legal size channel.
    if (canvas.width !== lastWidth || canvas.height !== lastHeight) {
      lastWidth = canvas.width;
      lastHeight = canvas.height;
      applyBufferSize(lastWidth, lastHeight);
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
      rig.position.y = Math.sin(now / 400) * 0.05;      // small breath bob
      ropePivot.rotation.x = -now / 1400;               // slow rope twirl about the hands axis
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
      ropePivot.rotation.x = -Math.PI +
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
      // world-down at rotation.x = -PI about the hands axis (R_x(-PI) maps
      // +Y -> -Y), matching atFeet's 0.45–0.55 phase window (js/rope.js:11-13)
      // where the score tick fires.
      ropePivot.rotation.x = -theta;
      ropePivot.rotation.z = 0;
      armL.rotation.x = Math.sin(theta) * 0.25;         // light antiphase sway; hands stay near the handles
      armR.rotation.x = -Math.sin(theta) * 0.25;
      const airborne = playerY > 0;                     // tuck keyed off sim height, never its own timer
      legL.rotation.x = airborne ? -0.7 : 0;
      legR.rotation.x = airborne ? 0.4 : 0;
    }

    for (let k = 0; k < scarf.length; k++) {
      scarf[k].rotation.x = Math.sin(beat - k * 0.4) * 0.5;   // scarf trails a beat behind (D-15)
    }

    // Blob shadow (D-17, RESEARCH Pattern 6): continuous shrink + fade with jump height.
    shadow.scale.setScalar(1 / (1 + playerY * WORLD_PER_PIXEL * 0.8));
    shadow.material.opacity = 0.45 / (1 + playerY * WORLD_PER_PIXEL * 0.8);

    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);                 // -> 240-row LINEAR target
    renderer.setRenderTarget(null);
    ditherMat.uniforms.tDiffuse.value = rt.texture;
    renderer.render(postScene, postCamera);         // -> sRGB + Bayer + quantize -> canvas
  }

  return { render };
}
