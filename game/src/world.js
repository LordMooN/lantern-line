// The rules of the crossing, in one place: which sector is being flown, how much wax is left, how
// many lanterns the courier still has, what the gates and the landing are worth, and the small
// bookkeeping that turns a launch into a score. It owns the ship, the particles and the shift of the
// screen on a crash, and it never touches the DOM: the renderer reads this, the loop feeds it.
import { TUNING } from './config.js';
import { SECTORS } from './level.js';
import { coreHit, crossedGate, launchVelocity, postHit, integrate, predictPath } from './physics.js';
import { createShip, landOn, launch, puff, recordTrail } from './ship.js';
import { distance } from './vec.js';

export const PHASE_TITLE = 'title';
export const PHASE_AIM = 'aim';
export const PHASE_FLIGHT = 'flight';
export const PHASE_CLEARED = 'cleared';
export const PHASE_OVER = 'over';
export const PHASE_WON = 'won';

/** A tiny seeded generator, so the sparks of a staged screenshot are the same every time. */
function makeRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sparkBurst(world, point, count, hue) {
  for (let index = 0; index < count; index += 1) {
    const angle = world.random() * Math.PI * 2;
    const speed = 40 + world.random() * 190;
    world.particles.push({
      x: point.x,
      y: point.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5 + world.random() * 0.9,
      maxLife: 1.4,
      size: 1.4 + world.random() * 2.6,
      hue,
    });
  }
}

export function createWorld() {
  const world = {
    phase: PHASE_TITLE,
    sector: 0,
    score: 0,
    runScore: 0,
    best: 0,
    lanterns: TUNING.lanterns,
    wax: TUNING.waxFull,
    gatesPassed: 0,
    attempts: 0,
    feathers: 0,
    crashes: 0,
    time: 0,
    shake: 0,
    events: [],
    particles: [],
    random: makeRandom(0x1a2f3c),
    aim: { dragging: false, pull: 0 },
    ship: null,
  };
  resetSector(world, 0);
  return world;
}

export function currentSector(world) {
  return SECTORS[Math.min(world.sector, SECTORS.length - 1)];
}

export function resetSector(world, index) {
  world.sector = index;
  world.gatesPassed = 0;
  world.runScore = 0;
  world.wax = TUNING.waxFull;
  world.attempts = 0;
  world.ship = createShip(currentSector(world).post);
  world.phase = PHASE_AIM;
  world.aim.dragging = false;
  world.aim.pull = 0;
}

export function totalScore(world) {
  return world.score + world.runScore;
}

/** Begin a crossing from the title screen. */
export function startRun(world) {
  world.score = 0;
  world.lanterns = TUNING.lanterns;
  world.crashes = 0;
  world.feathers = 0;
  world.particles = [];
  resetSector(world, 0);
}

export function nextSector(world) {
  if (world.sector + 1 >= SECTORS.length) {
    world.phase = PHASE_WON;
    world.best = Math.max(world.best, totalScore(world));
    world.events.push({ type: 'won' });
    return;
  }
  resetSector(world, world.sector + 1);
  world.events.push({ type: 'sector' });
}

/** The dotted line the aim preview draws, in design-field pixels. */
export function previewPath(world, pointer) {
  const velocity = world.aim.dragging ? launchVelocity(world.ship.pos, pointer) : null;
  if (!velocity) return null;
  return { velocity, points: predictPath(world.ship.pos, velocity, currentSector(world).wells, 3.2, 34) };
}

export function releaseLaunch(world, pointer) {
  if (world.phase !== PHASE_AIM) return false;
  const velocity = launchVelocity(world.ship.pos, pointer);
  if (!velocity) {
    world.aim.dragging = false;
    world.aim.pull = 0;
    return false;
  }
  launch(world.ship, velocity);
  world.wax = Math.max(0, world.wax - TUNING.waxLaunchCost);
  world.attempts += 1;
  world.phase = PHASE_FLIGHT;
  world.aim.dragging = false;
  world.aim.pull = 0;
  world.events.push({ type: 'launch' });
  return true;
}

export function emberPuff(world) {
  if (world.phase !== PHASE_FLIGHT) return false;
  if (world.wax < TUNING.puffWaxCost) return false;
  if (!puff(world.ship)) return false;
  world.wax -= TUNING.puffWaxCost;
  sparkBurst(world, world.ship.pos, 8, 'ember');
  world.events.push({ type: 'puff' });
  return true;
}

/** Bring the lantern back to the last place it rested — the post, or the gate that caught it. */
export function recall(world) {
  if (world.phase !== PHASE_FLIGHT) return false;
  const sector = currentSector(world);
  const rest = world.gatesPassed === 0 ? sector.post : sector.gates[world.gatesPassed - 1];
  landOn(world.ship, rest);
  world.wax = TUNING.waxFull;
  world.phase = PHASE_AIM;
  world.events.push({ type: 'recall' });
  return true;
}

function crash(world, reason) {
  world.lanterns -= 1;
  world.crashes += 1;
  world.shake = 16;
  sparkBurst(world, world.ship.pos, 46, reason === 'wax' ? 'dim' : 'danger');
  world.events.push({ type: 'crash', reason });
  if (world.lanterns <= 0) {
    world.phase = PHASE_OVER;
    world.best = Math.max(world.best, totalScore(world));
    world.events.push({ type: 'over' });
    return;
  }
  resetSector(world, world.sector);
}

function landSector(world, speed) {
  const sector = currentSector(world);
  const feather = speed <= TUNING.featherLanding;
  const waxBonus = Math.round(world.wax * TUNING.waxScorePerPoint);
  const landing = TUNING.sectorScore + waxBonus + (feather ? TUNING.featherScore : 0);
  world.score += world.runScore + landing;
  world.runScore = 0;
  if (feather) world.feathers += 1;
  world.phase = PHASE_CLEARED;
  world.best = Math.max(world.best, world.score);
  world.shake = 6;
  sparkBurst(world, sector.arrival, 34, 'ember');
  landOn(world.ship, sector.arrival);
  world.events.push({ type: 'land', feather, landing, waxBonus });
}

/** Advance the simulation by `dt` seconds. The aim preview is driven from the pointer separately. */
export function update(world, dt) {
  world.time += dt;
  world.shake = Math.max(0, world.shake - dt * 40);

  for (let index = world.particles.length - 1; index >= 0; index -= 1) {
    const particle = world.particles[index];
    particle.life -= dt;
    if (particle.life <= 0) {
      world.particles.splice(index, 1);
      continue;
    }
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.965;
    particle.vy = particle.vy * 0.965 + 26 * dt;
  }

  if (world.phase === PHASE_TITLE) {
    world.ship.spin += dt * 0.6;
    return;
  }

  if (world.phase !== PHASE_FLIGHT) return;

  const sector = currentSector(world);
  const previous = { x: world.ship.pos.x, y: world.ship.pos.y };
  const speed = integrate(world.ship, sector.wells, dt);
  recordTrail(world.ship, world.time);
  world.ship.spin += dt * 1.4;

  world.wax = Math.max(0, world.wax - TUNING.waxDrainPerSecond * dt);
  if (world.wax <= 0) {
    world.ship.dimming = Math.min(1, world.ship.dimming + dt / TUNING.burnoutSeconds);
    if (world.ship.dimming >= 1) {
      crash(world, 'wax');
      return;
    }
  } else {
    world.ship.dimming = Math.max(0, world.ship.dimming - dt * 2);
  }

  const gateIndex = crossedGate(previous, world.ship.pos, sector.gates.slice(world.gatesPassed));
  if (gateIndex === 0) {
    const gate = sector.gates[world.gatesPassed];
    world.gatesPassed += 1;
    world.runScore += TUNING.gateScore;
    world.wax = Math.min(TUNING.waxFull, world.wax + TUNING.waxGateBonus);
    world.ship.dimming = 0;
    sparkBurst(world, gate, 22, 'gate');
    world.events.push({ type: 'gate', index: world.gatesPassed });
    // The gate catches the lantern like a hoop catches a moth: it hangs there, and the next leg
    // starts from that ring, so a sector is threaded one lamp at a time.
    landOn(world.ship, gate);
    world.phase = PHASE_AIM;
    return;
  }

  if (coreHit(world.ship.pos, sector.wells)) {
    crash(world, 'core');
    return;
  }

  const escaped =
    world.ship.pos.x < -TUNING.edgeMargin ||
    world.ship.pos.x > 1280 + TUNING.edgeMargin ||
    world.ship.pos.y < -TUNING.edgeMargin ||
    world.ship.pos.y > 800 + TUNING.edgeMargin;
  if (escaped) {
    crash(world, 'edge');
    return;
  }

  if (postHit(world.ship.pos, sector.arrival) && world.gatesPassed >= sector.gates.length) {
    landSector(world, speed);
  }
}

/** Distance from the lantern to the next gate, for the HUD's little bearing arrow. */
export function distanceToNextGate(world) {
  const sector = currentSector(world);
  const gate = sector.gates[world.gatesPassed];
  if (!gate) return distance(world.ship.pos, sector.arrival);
  return distance(world.ship.pos, gate);
}
