export function createPlayer() {
  return { y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 };
}

export function jumpVelocity(holdSeconds) {
  return 350 + Math.min(holdSeconds, 0.5) * 500;
}

// Story 6.2 (ledger :26-27/:43-44, Decided 8): the physics constants join the
// export surface so the nearmiss/v1parity rigs stop duplicating them — the
// values are UNCHANGED, every trace byte-identical by construction.
export const GRAVITY = 1800;
export const CLEAR_MIN_HEIGHT = 18;

export function jump(player, holdSeconds, launchMul = 1) {
  return { ...player, vy: jumpVelocity(holdSeconds) * launchMul, grounded: false };
}

export function updatePlayer(player, dt, gravity = GRAVITY) {
  let { y, vy, grounded, squash, squashVel } = player;
  vy -= gravity * dt;
  y += vy * dt;
  if (y <= 0) {
    if (!grounded) {
      squash = 0.6;
      squashVel = 0;
    }
    y = 0;
    vy = 0;
    grounded = true;
  } else {
    grounded = false;
  }
  if (squash !== 1) {
    const stiffness = 300;
    const damping = 40;
    squashVel += (stiffness * (1 - squash) - damping * squashVel) * dt;
    squash += squashVel * dt;
  }
  return { y, vy, grounded, squash, squashVel };
}

export function clearsRope(playerY, minHeight = CLEAR_MIN_HEIGHT) {
  return playerY >= minHeight;
}
