import * as THREE from 'three';
import { lerpPhase } from './interpolate.js';

const WORLD_PER_PIXEL = 0.01;
const CENTER = 0;
const EDGE = 6;

function worldX(phase) {
  return CENTER + (EDGE - CENTER) * (1 - 2 * phase);
}

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(canvas.width, canvas.height, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f7f3e8');

  const camera = new THREE.PerspectiveCamera(50, canvas.width / canvas.height, 0.1, 100);
  camera.position.set(0, 2.2, 9);
  camera.lookAt(0, 1, 0);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 12),
    new THREE.MeshBasicMaterial({ color: '#d8d0bd' })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const playerGeometry = new THREE.BoxGeometry(0.6, 1.1, 0.4);
  playerGeometry.translate(0, 0.55, 0);
  const playerBox = new THREE.Mesh(playerGeometry, new THREE.MeshBasicMaterial({ color: '#c94f6d' }));
  scene.add(playerBox);

  const obstacle = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.4, 0.35),
    new THREE.MeshBasicMaterial({ color: '#7a5c3e' })
  );
  obstacle.position.y = 0.2;
  scene.add(obstacle);

  function render(view) {
    const phase = lerpPhase(view.prevPhase, view.rope.phase, view.alpha);
    obstacle.position.x = worldX(phase);
    playerBox.position.y = view.player.y * WORLD_PER_PIXEL;
    renderer.render(scene, camera);
  }

  return { render };
}
