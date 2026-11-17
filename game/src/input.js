// KOTA SENJA — keyboard and mouse input.
// Tracks held keys, mouse look deltas and pointer lock so the player
// and the camera can both read one shared input state.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouseDeltaX: 0,
    mouseDeltaY: 0,
    pointerLocked: false,
    clickQueued: false,
    anyKeyPressed: false,
  };

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    input.keys.add(event.code);
    input.anyKeyPressed = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
  });

  document.addEventListener('mousemove', (event) => {
    if (!input.pointerLocked) return;
    input.mouseDeltaX += event.movementX || 0;
    input.mouseDeltaY += event.movementY || 0;
  });
  document.addEventListener('pointerlockchange', () => {
    input.pointerLocked = document.pointerLockElement === canvas;
  });
  canvas.addEventListener('click', () => {
    input.clickQueued = true;
    if (!input.pointerLocked && document.pointerLockElement !== canvas) {
      try {
        canvas.requestPointerLock();
      } catch (err) {
        // Pointer lock is a nicety; the game stays playable without it.
      }
    }
  });

  return input;
}

export function isKeyDown(input, code) {
  return input.keys.has(code);
}

export function consumeMouseLook(input) {
  const look = { dx: input.mouseDeltaX, dy: input.mouseDeltaY };
  input.mouseDeltaX = 0;
  input.mouseDeltaY = 0;
  return look;
}

export function consumeClick(input) {
  const clicked = input.clickQueued;
  input.clickQueued = false;
  return clicked;
}

// ---- movement axes ----

export function moveAxes(input) {
  let forward = 0;
  let strafe = 0;
  if (isKeyDown(input, 'KeyW') || isKeyDown(input, 'ArrowUp')) forward += 1;
  if (isKeyDown(input, 'KeyS') || isKeyDown(input, 'ArrowDown')) forward -= 1;
  if (isKeyDown(input, 'KeyA') || isKeyDown(input, 'ArrowLeft')) strafe -= 1;
  if (isKeyDown(input, 'KeyD') || isKeyDown(input, 'ArrowRight')) strafe += 1;
  return { forward, strafe };
}

export function cameraTurnKeys(input) {
  let yaw = 0;
  let pitch = 0;
  if (isKeyDown(input, 'ArrowLeft')) yaw += 1;
  if (isKeyDown(input, 'ArrowRight')) yaw -= 1;
  if (isKeyDown(input, 'ArrowUp')) pitch += 1;
  if (isKeyDown(input, 'ArrowDown')) pitch -= 1;
  return { yaw, pitch };
}

export function pressedOnce(input, code) {
  if (!isKeyDown(input, code)) return false;
  input.keys.delete(code);
  return true;
}
