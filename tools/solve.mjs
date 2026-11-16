// Level check and screenshot tooling: fly every leg of every sector under the real physics and
// search for a launch that reaches the next gate (or the landing post) without touching a well's
// heart or leaving the field. The vectors it finds are pasted into game/src/shots.js, so a staged
// screenshot shows a flight that really happened. Run it from this folder with `node solve.mjs`.
import { writeFileSync } from 'node:fs';
import { STEP, TUNING } from '../game/src/config.js';
import { SECTORS } from '../game/src/level.js';
import { coreHit, gateHit, integrate, postHit } from '../game/src/physics.js';

const LIMIT_SECONDS = 12;

/** Fly one launch from `origin` and say whether it reaches `target` (a gate, or the landing post). */
function flyLeg(sector, origin, target, velocity, isLanding) {
  const body = { pos: { x: origin.x, y: origin.y }, vel: { ...velocity } };
  let time = 0;
  while (time < LIMIT_SECONDS) {
    const previous = { x: body.pos.x, y: body.pos.y };
    const speed = integrate(body, sector.wells, STEP);
    time += STEP;
    if (coreHit(body.pos, sector.wells)) return { ok: false, why: 'core' };
    if (body.pos.x < -TUNING.edgeMargin || body.pos.x > 1280 + TUNING.edgeMargin ||
        body.pos.y < -TUNING.edgeMargin || body.pos.y > 800 + TUNING.edgeMargin) {
      return { ok: false, why: 'edge' };
    }
    const reached = isLanding ? postHit(body.pos, target) : gateHit(body.pos, target);
    if (reached && speed <= (isLanding ? 900 : TUNING.launchMaxSpeed * 1.4)) {
      return { ok: true, time, speed, at: { x: body.pos.x, y: body.pos.y } };
    }
    if (time > 2.5 && speed < 60) return { ok: false, why: 'stalled' };
    void previous;
  }
  return { ok: false, why: 'timeout' };
}

function searchLeg(sector, origin, target, isLanding) {
  const found = [];
  for (let angle = 0; angle < 360; angle += 2) {
    const radians = (angle * Math.PI) / 180;
    for (let speed = 170; speed <= TUNING.launchMaxSpeed; speed += 12) {
      const velocity = { x: Math.cos(radians) * speed, y: Math.sin(radians) * speed };
      const result = flyLeg(sector, origin, target, velocity, isLanding);
      if (result.ok) {
        found.push({ angle, launchSpeed: speed, impact: result.speed, time: result.time });
        break;
      }
    }
  }
  return found;
}

const plan = [];
for (let index = 0; index < SECTORS.length; index += 1) {
  const sector = SECTORS[index];
  const legs = [];
  let origin = sector.post;
  const stops = [...sector.gates.map((gate) => ({ target: gate, landing: false })), { target: sector.arrival, landing: true }];
  for (let leg = 0; leg < stops.length; leg += 1) {
    const { target, landing } = stops[leg];
    const solutions = searchLeg(sector, origin, target, landing);
    const picked = solutions
      .slice()
      .sort((a, b) => (landing && a.impact <= TUNING.featherLanding ? -1 : 1) - (landing && b.impact <= TUNING.featherLanding ? -1 : 1) || a.time - b.time)[0];
    if (picked) {
      const radians = (picked.angle * Math.PI) / 180;
      legs.push({ v: { x: Math.round(Math.cos(radians) * picked.launchSpeed * 100) / 100, y: Math.round(Math.sin(radians) * picked.launchSpeed * 100) / 100 }, time: Math.round(picked.time * 100) / 100, impact: Math.round(picked.impact) });
    } else {
      legs.push(null);
    }
    console.log(`${sector.name} leg ${leg + 1} -> ${landing ? 'arrival post' : `gate ${leg + 1}`}: ${solutions.length} launches, picked ${JSON.stringify(legs[leg])}`);
    origin = target;
  }
  plan.push({ sector: sector.name, legs });
}

const module = `// The launches a pilot who knows the water would make: one vector a leg, for each of the five
// sectors, found by flying the real physics in tools/solve.mjs (run it after any change to level.js).
// Each leg starts where the last one ended — the post, then the gate that caught the lantern — and
// every vector is written with its decimals, since a rounded one can miss a gate by a pixel. The
// game itself never reads this file; shots.js does, to stage screenshots of flights that happened.
export const SOLUTIONS = ${JSON.stringify(plan.map((entry) => entry.legs.map((leg) => leg.v)), null, 2)};
`;

writeFileSync(new URL('../game/src/solutions.js', import.meta.url), module);
console.log(`\nwrote game/src/solutions.js (${plan.length} sectors)`);
