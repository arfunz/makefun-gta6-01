// Keyboard and mouse: a set of held keys, edge-triggered presses, and the
// pointer-lock camera deltas. The game consumes edges once per frame.
export function createInput(canvas) {
  const input = { keys: new Set(), pressed: new Set(), mouseDX: 0, mouseDY: 0, clicked: false, locked: false };
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    input.keys.add(e.code);
    input.pressed.add(e.code);
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
  window.addEventListener('blur', () => input.keys.clear());
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas) {
      input.mouseDX += e.movementX;
      input.mouseDY += e.movementY;
    }
  });
  document.addEventListener('pointerlockchange', () => {
    input.locked = document.pointerLockElement === canvas;
  });
  canvas.addEventListener('click', () => {
    if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
    else input.clicked = true;
  });
  return input;
}

export function isDown(input, code) {
  return input.keys.has(code);
}

export function wasPressed(input, code) {
  return input.pressed.has(code);
}

// Clear the edge-triggered presses, the mouse deltas and any unhandled
// click at the end of a frame.
export function endFrame(input) {
  input.pressed.clear();
  input.mouseDX = 0;
  input.mouseDY = 0;
  input.clicked = false;
}
