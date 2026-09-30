export function createPlayer() {
  return { y: 0, vy: 0, grounded: true, squash: 1, squashVel: 0 };
}

export function jumpVelocity(holdSeconds) {
  return 350 + Math.min(holdSeconds, 0.5) * 500;
}

export function jump(player, holdSeconds) {
  return { ...player, vy: jumpVelocity(holdSeconds), grounded: false };
}

export function updatePlayer(player, dt, gravity = 1800) {
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

export function clearsRope(playerY, minHeight = 18) {
  return playerY >= minHeight;
}
