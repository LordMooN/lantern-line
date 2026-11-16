// The screenshot scenes behind ?shot=title|flight|cleared|harbour. Each one is the real game played
// forward under the real physics by the launches in solutions.js: the title sleeps on the first
// sector, the flight scene is the second leg of the drowned bell caught in the air, the cleared
// scene is the shoal finished, and the harbour is a whole crossing flown end to end. Same seed, same
// frame, every time, so a screenshot can be retaken without changing the entry.
import { STEP, TUNING } from './config.js';
import { SOLUTIONS } from './solutions.js';
import {
  PHASE_AIM,
  PHASE_CLEARED,
  PHASE_FLIGHT,
  PHASE_OVER,
  PHASE_TITLE,
  PHASE_WON,
  currentSector,
  nextSector,
  releaseLaunch,
  resetSector,
  startRun,
  update,
} from './world.js';
import { distance } from './vec.js';

function advance(world, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let step = 0; step < steps; step += 1) update(world, STEP);
}

/** Turn one of the solved launch vectors back into the drag that produces it, and let it go. */
function launchSolution(world, sectorIndex, legIndex) {
  const velocity = SOLUTIONS[sectorIndex][legIndex];
  const speed = Math.min(
    TUNING.launchMaxSpeed,
    Math.max(TUNING.launchMinSpeed + 1, Math.hypot(velocity.x, velocity.y)),
  );
  const pull =
    ((speed - TUNING.launchMinSpeed) / (TUNING.launchMaxSpeed - TUNING.launchMinSpeed)) * TUNING.dragFullPull;
  const pointer = {
    x: world.ship.pos.x - (velocity.x / Math.hypot(velocity.x, velocity.y)) * pull,
    y: world.ship.pos.y - (velocity.y / Math.hypot(velocity.x, velocity.y)) * pull,
  };
  return releaseLaunch(world, pointer);
}

/** Fly one solved leg, stopping the moment its gate is threaded or the sector is landed. */
function flyLeg(world, sectorIndex, legIndex, extraSeconds = 0) {
  const before = world.gatesPassed;
  if (!launchSolution(world, sectorIndex, legIndex)) return false;
  let guard = 0;
  while (world.phase === PHASE_FLIGHT && world.gatesPassed === before && guard < 4000) {
    update(world, STEP);
    guard += 1;
  }
  if (extraSeconds > 0) advance(world, extraSeconds);
  return world.phase !== PHASE_FLIGHT || world.gatesPassed > before;
}

/** Fly a sector to its end, leg by leg: each gate catches the lantern and the next leg starts there. */
function flySector(world, sectorIndex) {
  for (let leg = 0; leg < SOLUTIONS[sectorIndex].length; leg += 1) {
    flyLeg(world, sectorIndex, leg);
    if (world.phase === PHASE_CLEARED) return true;
    if (world.phase !== PHASE_AIM) return false;
    advance(world, 0.12);
  }
  return world.phase === PHASE_CLEARED;
}

/** Fly straight at the nearest well's heart, three times: the shortest way to the adrift screen. */
function wreckLanterns(world, times) {
  for (let attempt = 0; attempt < times; attempt += 1) {
    const sector = currentSector(world);
    const well = sector.wells.reduce((best, well) => (distance(well, world.ship.pos) < distance(best, world.ship.pos) ? well : best));
    const dx = well.x - world.ship.pos.x;
    const dy = well.y - world.ship.pos.y;
    const length = Math.hypot(dx, dy) || 1;
    releaseLaunch(world, {
      x: world.ship.pos.x - (dx / length) * TUNING.dragFullPull * 0.9,
      y: world.ship.pos.y - (dy / length) * TUNING.dragFullPull * 0.9,
    });
    let guard = 0;
    while (world.phase === PHASE_FLIGHT && guard < 4000) {
      update(world, STEP);
      guard += 1;
    }
    if (world.phase === PHASE_OVER) return;
  }
}

/** Set up one of the four scenes and return the detail the results panel needs. */
export function stageShot(name, world) {
  if (name === 'flight') {
    startRun(world);
    resetSector(world, 3);
    advance(world, 1.2);
    flyLeg(world, 3, 0);
    advance(world, 0.4);
    flyLeg(world, 3, 1);
    advance(world, 0.35);
    launchSolution(world, 3, 2);
    advance(world, 0.3);
    return { detail: null };
  }

  if (name === 'cleared') {
    startRun(world);
    flySector(world, 0);
    advance(world, 0.2);
    nextSector(world);
    advance(world, 0.2);
    flySector(world, 1);
    advance(world, 0.2);
    nextSector(world);
    advance(world, 1.4);
    flySector(world, 2);
    advance(world, 0.5);
    return { detail: lastLanding(world) };
  }

  if (name === 'adrift') {
    startRun(world);
    flySector(world, 0);
    advance(world, 0.2);
    nextSector(world);
    advance(world, 0.2);
    wreckLanterns(world, TUNING.lanterns);
    advance(world, 0.6);
    return { detail: null };
  }

  if (name === 'harbour') {
    startRun(world);
    for (let index = 0; index < SOLUTIONS.length; index += 1) {
      if (index > 0) {
        nextSector(world);
        advance(world, 0.4);
      }
      flySector(world, index);
      advance(world, 0.3);
    }
    nextSector(world);
    advance(world, 2.4);
    return { detail: null };
  }

  world.phase = PHASE_TITLE;
  advance(world, 5.5);
  return { detail: null };
}

function lastLanding(world) {
  const events = world.events.filter((event) => event.type === 'land');
  return events.length > 0 ? events[events.length - 1] : { feather: false, landing: 0, waxBonus: 0 };
}

/** Where the lantern is, in the frame the screenshot is taken at, for the shot tool's report. */
export function describeShot(world) {
  return {
    phase: world.phase,
    sector: currentSector(world).name,
    gates: `${world.gatesPassed}/${currentSector(world).gates.length}`,
    score: world.score + world.runScore,
    phaseWon: world.phase === PHASE_WON,
  };
}
