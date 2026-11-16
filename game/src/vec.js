// The smallest possible vector kit: positions and velocities are plain {x, y} pairs, and every
// helper returns a new pair rather than changing one in place, so the simulation holds no hidden
// shared state between a real flight and the dotted preview of one.
export function vec(x = 0, y = 0) {
  return { x, y };
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a, factor) {
  return { x: a.x * factor, y: a.y * factor };
}

export function length(a) {
  return Math.hypot(a.x, a.y);
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** The same direction at length 1, or the zero vector when there is no direction to keep. */
export function normalize(a) {
  const size = Math.hypot(a.x, a.y);
  return size < 1e-6 ? { x: 0, y: 0 } : { x: a.x / size, y: a.y / size };
}

export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

/** Frame-rate independent smoothing without a clock: `rate` is the share left after one second. */
export function approach(current, target, rate, dt) {
  const kept = Math.pow(rate, dt);
  return target + (current - target) * kept;
}
