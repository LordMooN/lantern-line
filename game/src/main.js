// The loop: one fixed-step simulation, one draw, and the small amount of glue between the input,
// the sound, the rules and the screen. It also answers ?shot=<scene>, which stages a screenshot
// frame instead of starting a game, so tools/shots.mjs can retake the entry's four images.
import { PALETTE, STEP, VIEW } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { drawInterface } from './hud.js';
import { drawScene } from './render.js';
import { createWorld, emberPuff, nextSector, previewPath, recall, releaseLaunch, startRun, update } from './world.js';
import { describeShot, stageShot } from './shots.js';

const canvas = document.querySelector('#game');
const status = document.querySelector('#status');
const context = canvas.getContext('2d', { alpha: false });

const world = createWorld();
const audio = createAudio();
const input = createInput(canvas);
let detail = { feather: false, landing: 0, waxBonus: 0 };
let lastPhase = world.phase;

const shotName = new URLSearchParams(window.location.search).get('shot');

function fitCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(VIEW.width * ratio);
  canvas.height = Math.round(VIEW.height * ratio);
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  canvas.style.width = `${Math.round(VIEW.width * scale)}px`;
  canvas.style.height = `${Math.round(VIEW.height * scale)}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.imageSmoothingEnabled = true;
}

function announce(text) {
  if (status) status.textContent = text;
}

function drainEvents() {
  for (let index = 0; index < world.events.length; index += 1) {
    const event = world.events[index];
    audio.play(event.type, event.index);
    if (event.type === 'land') {
      detail = { feather: event.feather, landing: event.landing, waxBonus: event.waxBonus };
    }
    if (event.type === 'crash') {
      announce(event.reason === 'wax' ? 'The wax is out and the lantern goes dark.' : 'The lantern is lost.');
    }
    if (event.type === 'gate') announce(`Gate ${event.index} threaded.`);
  }
  world.events.length = 0;
}

function afterPhaseChange() {
  if (world.phase === lastPhase) return;
  lastPhase = world.phase;
  if (world.phase === 'aim') announce(`Sector ${world.sector + 1}. Drag back from the lantern and release to fly.`);
  if (world.phase === 'flight') announce('In flight.');
  if (world.phase === 'cleared') announce(`Sector cleared. Score ${world.score + world.runScore}.`);
  if (world.phase === 'over') announce(`Adrift. Final score ${world.score + world.runScore}. Press R to cross again.`);
  if (world.phase === 'won') announce(`The harbour. Final score ${world.score + world.runScore}. Press R to sail again.`);
}

function handleActions() {
  const actions = input.take();
  if (actions.mute) {
    const muted = audio.toggleMute();
    announce(muted ? 'Sound off.' : 'Sound on.');
  }

  if (world.phase === 'title') {
    if (actions.confirm) {
      audio.unlock();
      audio.play('ui');
      startRun(world);
    }
    return;
  }

  if (world.phase === 'aim') {
    world.aim.dragging = input.dragging;
    world.aim.pull = 0;
    if (actions.confirm) {
      audio.unlock();
      emberPuff(world);
    }
    if (actions.launch) {
      audio.unlock();
      releaseLaunch(world, input.pointer);
    }
    return;
  }

  if (world.phase === 'flight') {
    if (actions.puff) emberPuff(world);
    if (actions.restart) recall(world);
    return;
  }

  if (world.phase === 'cleared') {
    if (actions.confirm) nextSector(world);
    return;
  }

  if (world.phase === 'over' || world.phase === 'won') {
    if (actions.restart || actions.confirm) {
      audio.play('ui');
      startRun(world);
    }
  }
}

function render() {
  const preview = world.phase === 'aim' && input.dragging ? previewPath(world, input.pointer) : null;
  context.fillStyle = PALETTE.inkBottom;
  context.fillRect(0, 0, VIEW.width, VIEW.height);
  drawScene(context, world, world.phase === 'aim' && input.dragging ? input.pointer : null, preview);
  drawInterface(context, world, detail);
}

function drawStaticShot(name) {
  const staged = stageShot(name, world);
  detail = staged.detail ?? { feather: false, landing: 0, waxBonus: 0 };
  const draw = () => {
    render();
    window.__lanternLine = {
      ready: true,
      shot: name,
      describe: () => describeShot(world),
    };
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  else draw();
}

if (shotName) {
  fitCanvas();
  window.addEventListener('resize', () => {
    fitCanvas();
    render();
  });
  drawStaticShot(shotName);
} else {
  fitCanvas();
  window.addEventListener('resize', fitCanvas);

  let previous = performance.now();
  let accumulator = 0;

  function frame(now) {
    const elapsed = Math.min(0.2, (now - previous) / 1000);
    previous = now;
    accumulator += elapsed;

    handleActions();
    while (accumulator >= STEP) {
      update(world, STEP);
      drainEvents();
      accumulator -= STEP;
    }
    afterPhaseChange();
    render();
    requestAnimationFrame(frame);
  }

  announce('Lantern Line. Press space to set out.');
  requestAnimationFrame(frame);
}
