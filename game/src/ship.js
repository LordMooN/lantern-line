// The courier itself: one paper lantern with a candle inside. It sits on a post until it is
// launched, keeps a short silk trail of where it has been, and carries the two ember puffs that can
// save a flight. Its state is plain data so the world can reset it without rebuilding anything.
import { TUNING } from './config.js';
import { normalize } from './vec.js';

/** A lantern resting on a post. */
export function createShip(post) {
  return {
    pos: { x: post.x, y: post.y },
    vel: { x: 0, y: 0 },
    trail: [],
    puffs: TUNING.puffsPerFlight,
    flying: false,
    alive: true,
    /** Grows from 0 to 1 as a burnt-out lantern goes dark, for the renderer. */
    dimming: 0,
    spin: 0,
  };
}

export function launch(ship, velocity) {
  ship.vel.x = velocity.x;
  ship.vel.y = velocity.y;
  ship.flying = true;
  ship.pos = { x: ship.pos.x, y: ship.pos.y };
  ship.trail = [];
}

/** A puff of ember: a nudge along the drift, or straight up when the lantern hangs still. */
export function puff(ship) {
  if (!ship.flying || ship.puffs <= 0) return false;
  const heading = normalize(ship.vel);
  const push = heading.x === 0 && heading.y === 0 ? { x: 0, y: -1 } : heading;
  ship.vel.x += push.x * TUNING.puffSpeed;
  ship.vel.y += push.y * TUNING.puffSpeed;
  ship.puffs -= 1;
  return true;
}

/** Remember where the lantern was, so the renderer can lay a silk line behind it. */
export function recordTrail(ship, seconds) {
  if (!ship.flying) return;
  ship.trail.push({ x: ship.pos.x, y: ship.pos.y, t: seconds });
  const cutoff = seconds - TUNING.trailSeconds;
  while (ship.trail.length > 2 && ship.trail[0].t < cutoff) ship.trail.shift();
  if (ship.trail.length > TUNING.trailSamples) ship.trail.shift();
}

/** Park the lantern back on a post, ready for the next attempt. */
export function landOn(ship, post) {
  ship.pos = { x: post.x, y: post.y };
  ship.vel = { x: 0, y: 0 };
  ship.flying = false;
  ship.trail = [];
  ship.spin = 0;
}
