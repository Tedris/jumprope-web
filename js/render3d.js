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
const FOG_NEAR = 7;
const FOG_FAR = 22;
const LIGHT_INTENSITY = 2.4;   // D-05: the one light — brightness lives here, no ambient fill

// The ONE post pass (D-02): sRGB-encode first (the render target holds
// LINEAR values), then Bayer 4×4 offset + 31-level floor quantize (~15-bit),
// with the pattern indexed at internal-buffer pixel space (never the output
// framebuffer coordinate — Pitfall 3).
const BAYER_FRAG = `
  uniform sampler2D tDiffuse;
  uniform vec2 uInternalRes;
  varying vec2 vUv;

  vec3 toSRGB( vec3 c ) {
    return mix( c * 12.92, pow( ( c + 0.055 ) / 1.055, vec3( 2.4 ) ), step( vec3( 0.0031308 ), c ) );
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

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), worldMaterial(FLOOR));
  floor.rotation.x = -Math.PI / 2;                     // one sparse quad keeps the snap calm (Pitfall 7)
  scene.add(floor);

  const playerGeometry = new THREE.BoxGeometry(0.6, 1.1, 0.4);
  playerGeometry.translate(0, 0.55, 0);
  const playerBox = new THREE.Mesh(playerGeometry, worldMaterial(ROSE));
  scene.add(playerBox);

  const sun = new THREE.DirectionalLight(0xffffff, LIGHT_INTENSITY);   // D-05: the one light
  sun.position.set(-4, 7, 3);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(50, canvas.width / canvas.height, 0.1, 80);
  camera.position.set(0, 1.5, 6.5);
  camera.lookAt(0, 1.2, 0);

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

  function render(view) {
    // Passive resize poll: the canvas element is a constructor arg, so a
    // property read is the boundary-fence-legal size channel.
    if (canvas.width !== lastWidth || canvas.height !== lastHeight) {
      lastWidth = canvas.width;
      lastHeight = canvas.height;
      applyBufferSize(lastWidth, lastHeight);
    }

    // Single clock entry: canonical rope phase, interpolated prev -> curr.
    // The bar model is gone (D-08); Plan 03's rope arc and character rig
    // pose from this value.
    const phase = lerpPhase(view.prevPhase, view.rope.phase, view.alpha ?? 0);
    playerBox.position.y = (view.player.y ?? 0) * WORLD_PER_PIXEL;

    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);                 // -> 240-row LINEAR target
    renderer.setRenderTarget(null);
    ditherMat.uniforms.tDiffuse.value = rt.texture;
    renderer.render(postScene, postCamera);         // -> sRGB + Bayer + quantize -> canvas
  }

  return { render };
}
