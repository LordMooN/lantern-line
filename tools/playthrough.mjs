// A headless playthrough under the game's own rules: it launches every solved leg, sector after
// sector, and prints what happened. Use it to check a level change without opening a browser.
//   node tools/playthrough.mjs
import { STEP, TUNING } from '../game/src/config.js';
import { SOLUTIONS } from '../game/src/solutions.js';
import { SECTORS } from '../game/src/level.js';
import { createWorld, currentSector, nextSector, releaseLaunch, startRun, update } from '../game/src/world.js';

const world = createWorld();
startRun(world);

function launchSolution(sectorIndex, legIndex) {
  const velocity = SOLUTIONS[sectorIndex][legIndex];
  const raw = Math.hypot(velocity.x, velocity.y);
  const speed = Math.min(TUNING.launchMaxSpeed, Math.max(TUNING.launchMinSpeed + 1, raw));
  const pull = ((speed - TUNING.launchMinSpeed) / (TUNING.launchMaxSpeed - TUNING.launchMinSpeed)) * TUNING.dragFullPull;
  const pointer = {
    x: world.ship.pos.x - (velocity.x / raw) * pull,
    y: world.ship.pos.y - (velocity.y / raw) * pull,
  };
  return releaseLaunch(world, pointer);
}

for (let sectorIndex = 0; sectorIndex < SOLUTIONS.length; sectorIndex += 1) {
  if (sectorIndex > 0) nextSector(world);
  console.log(`\n=== ${currentSector(world).name} (score ${world.score}, lanterns ${world.lanterns})`);
  for (let leg = 0; leg < SOLUTIONS[sectorIndex].length; leg += 1) {
    const before = { gates: world.gatesPassed, phase: world.phase };
    const launched = launchSolution(sectorIndex, leg);
    let guard = 0;
    const events = [];
    while (world.phase === 'flight' && guard < 4000) {
      update(world, STEP);
      for (const event of world.events) events.push(event.type + (event.reason ? `:${event.reason}` : ''));
      world.events.length = 0;
      guard += 1;
    }
    console.log(
      `  leg ${leg + 1}: launched=${launched} ${before.phase}/${before.gates} -> ${world.phase}/${world.gatesPassed}` +
        ` wax=${world.wax.toFixed(0)} events=${events.join(',') || '-'}`,
    );
    if (world.phase === 'over' || world.phase === 'cleared') break;
    for (let extra = 0; extra < 14; extra += 1) update(world, STEP);
  }
  if (world.phase === 'over') break;
  console.log(`  sector end: ${world.phase}, score ${world.score}, run ${world.runScore}, lanterns ${world.lanterns}`);
}
console.log(`\nsectors ${SECTORS.length}, final phase ${world.phase}, score ${world.score + world.runScore}`);
