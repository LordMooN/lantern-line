// The whole flight model, and nothing that needs a browser: a lantern drifts under the pull of the
// gravity wells, a launch is one velocity, and a puff is one small nudge. The same functions drive
// the dotted aim preview, so the line you see is the line the lantern will actually fly.
import { TUNING } from './config.js';
import { distance, normalize, sub } from './vec.js';

/** The pull of every well at one point, added up: `strength / (d^2 + soften^2)` toward its centre. */
export function pullAt(point, wells) {
  let x = 0;
  let y = 0;
  for (let index = 0; index < wells.length; index += 1) {
    const well = wells[index];
    const dx = well.x - point.x;
    const dy = well.y - point.y;
    const d2 = dx * dx + dy * dy;
    const falloff = well.strength / (d2 + TUNING.gravitySoften * TUNING.gravitySoften);
    const d = Math.sqrt(d2) || 1;
    x += (dx / d) * falloff;
    y += (dy / d) * falloff;
  }
  return { x, y };
}

/** One integration step (semi-implicit Euler: pull first, then move), given the ship's own state. */
export function integrate(body, wells, dt) {
  const pull = pullAt(body.pos, wells);
  body.vel.x += pull.x * dt;
  body.vel.y += pull.y * dt;
  body.pos.x += body.vel.x * dt;
  body.pos.y += body.vel.y * dt;
  return Math.hypot(body.vel.x, body.vel.y);
}

/**
 * The path a launch would take, sampled for the aim preview: `samples` points, evenly spaced in
 * time, each with the seconds it is reached at, so the dots nearest the lantern can be drawn smaller.
 */
export function predictPath(origin, velocity, wells, seconds, samples) {
  const body = { pos: { x: origin.x, y: origin.y }, vel: { x: velocity.x, y: velocity.y } };
  const dt = 1 / 90;
  const steps = Math.max(1, Math.round(seconds / dt));
  const every = Math.max(1, Math.floor(steps / samples));
  const points = [];
  for (let step = 1; step <= steps; step += 1) {
    integrate(body, wells, dt);
    if (step % every === 0) points.push({ x: body.pos.x, y: body.pos.y, t: step * dt });
  }
  return points;
}

/** The well whose dark heart the point is inside, if any: touching one burns the lantern. */
export function coreHit(point, wells) {
  for (let index = 0; index < wells.length; index += 1) {
    if (distance(point, wells[index]) <= wells[index].core) return wells[index];
  }
  return null;
}

/** Whether a point threads a gate: the gate's mouth is a circle around its centre. */
export function gateHit(point, gate) {
  return distance(point, gate) <= TUNING.gateRadius;
}

/** Whether a point is close enough to a post to land on it. */
export function postHit(point, post) {
  return distance(point, post) <= 34;
}

/** The first gate of `gates` the segment from `a` to `b` passes through, or -1. */
export function crossedGate(a, b, gates) {
  for (let index = 0; index < gates.length; index += 1) {
    const gate = gates[index];
    for (let step = 1; step <= 6; step += 1) {
      const t = step / 6;
      const point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      if (gateHit(point, gate)) return index;
    }
  }
  return -1;
}

/** The velocity a drag from `from` toward `to` gives: pulling back fires the lantern forward. */
export function launchVelocity(from, to) {
  const back = sub(from, to);
  const pull = Math.min(Math.hypot(back.x, back.y), TUNING.dragFullPull);
  if (pull < 6) return null;
  const unit = normalize(back);
  const speed = TUNING.launchMinSpeed + (TUNING.launchMaxSpeed - TUNING.launchMinSpeed) * (pull / TUNING.dragFullPull);
  return { x: unit.x * speed, y: unit.y * speed };
}
