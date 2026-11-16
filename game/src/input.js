// Pointer and keyboard, translated into the game's design field. The canvas is letterboxed inside
// the window, so a click has to be mapped back out of screen pixels before the game may use it; the
// keyboard side is a small set of one-shot actions the loop reads and clears each frame.
import { VIEW } from './config.js';

export function createInput(canvas) {
  const pointer = { x: VIEW.width / 2, y: VIEW.height / 2, inside: false };
  const actions = { launch: false, puff: false, confirm: false, recall: false, restart: false, mute: false };
  let dragging = false;
  let down = null;

  function toField(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / VIEW.width, rect.height / VIEW.height);
    const offsetX = rect.left + (rect.width - VIEW.width * scale) / 2;
    const offsetY = rect.top + (rect.height - VIEW.height * scale) / 2;
    return { x: (event.clientX - offsetX) / scale, y: (event.clientY - offsetY) / scale };
  }

  canvas.addEventListener('pointerdown', (event) => {
    const point = toField(event);
    pointer.x = point.x;
    pointer.y = point.y;
    pointer.inside = true;
    dragging = true;
    down = point;
    canvas.setPointerCapture?.(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    const point = toField(event);
    pointer.x = point.x;
    pointer.y = point.y;
    pointer.inside = true;
  });

  function endDrag(event) {
    if (!dragging) return;
    dragging = false;
    const point = event ? toField(event) : { x: pointer.x, y: pointer.y };
    pointer.x = point.x;
    pointer.y = point.y;
    actions.launch = true;
    down = null;
  }

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', () => {
    dragging = false;
    down = null;
  });
  canvas.addEventListener('pointerleave', () => {
    pointer.inside = false;
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === ' ' || key === 'spacebar') {
      event.preventDefault();
      actions.confirm = true;
      actions.puff = true;
    }
    if (key === 'enter') actions.confirm = true;
    if (key === 'r') actions.restart = true;
    if (key === 'm') actions.mute = true;
  });

  return {
    pointer,
    /** True while the player holds the sling back. */
    get dragging() {
      return dragging;
    },
    get down() {
      return down;
    },
    /** Read the pending actions and clear them, so each press is handled once. */
    take() {
      const taken = { ...actions };
      for (const key of Object.keys(actions)) actions[key] = false;
      return taken;
    },
  };
}
