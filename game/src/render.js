// Everything the player sees of the night itself: the ink sky and its far ridges, the gravity wells
// and their cold haloes, the light gates, the posts at either end, the silk trail behind the lantern,
// the lantern's own paper and flame, the sparks, and the dotted line of the aim preview. All of it is
// drawn from the world's plain data, in the game's design field, on one canvas.
import { PALETTE, TUNING, VIEW } from './config.js';
import { currentSector } from './world.js';
import { distance } from './vec.js';

/** A fixed scatter of stars, so the sky is the same on every run and in every screenshot. */
const STARS = (() => {
  let state = 0x51f3a7;
  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const stars = [];
  for (let index = 0; index < 190; index += 1) {
    stars.push({
      x: rand() * VIEW.width,
      y: rand() * VIEW.height * 0.86,
      r: 0.4 + rand() * 1.25,
      a: 0.16 + rand() * 0.5,
      twinkle: 0.4 + rand() * 2.2,
      phase: rand() * Math.PI * 2,
    });
  }
  return stars;
})();

function drawSky(ctx, world) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  sky.addColorStop(0, PALETTE.inkTop);
  sky.addColorStop(0.62, '#080813');
  sky.addColorStop(1, PALETTE.inkBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // Two slow veils of haze, one warm and one cold, give the ink some depth without any noise.
  const warm = ctx.createRadialGradient(210, 120, 20, 210, 120, 620);
  warm.addColorStop(0, 'rgba(255, 176, 96, 0.10)');
  warm.addColorStop(1, 'rgba(255, 176, 96, 0)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  const cold = ctx.createRadialGradient(1040, 640, 30, 1040, 640, 700);
  cold.addColorStop(0, PALETTE.haze);
  cold.addColorStop(1, 'rgba(96, 84, 168, 0)');
  ctx.fillStyle = cold;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  for (let index = 0; index < STARS.length; index += 1) {
    const star = STARS[index];
    const twinkle = 0.7 + 0.3 * Math.sin(world.time * star.twinkle + star.phase);
    ctx.globalAlpha = star.a * twinkle;
    ctx.fillStyle = index % 11 === 0 ? PALETTE.ember : '#dfe6ff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** The far shore: three ink ridges, palest in front, that the lanterns are crossing over. */
function drawRidges(ctx, world) {
  const layers = [
    { base: 700, height: 90, colour: PALETTE.ridgeFar, phase: 0.7, alpha: 0.75 },
    { base: 748, height: 70, colour: PALETTE.ridge, phase: 2.1, alpha: 0.9 },
    { base: 790, height: 48, colour: '#0a0912', phase: 4.4, alpha: 1 },
  ];
  for (let index = 0; index < layers.length; index += 1) {
    const layer = layers[index];
    ctx.globalAlpha = layer.alpha;
    ctx.fillStyle = layer.colour;
    ctx.beginPath();
    ctx.moveTo(0, VIEW.height);
    ctx.lineTo(0, layer.base);
    for (let x = 0; x <= VIEW.width; x += 32) {
      const swell = Math.sin(x * 0.0042 + layer.phase) * layer.height * 0.5;
      const ripple = Math.sin(x * 0.017 + layer.phase * 3) * layer.height * 0.16;
      ctx.lineTo(x, layer.base - swell - ripple);
    }
    ctx.lineTo(VIEW.width, VIEW.height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Which way the water is running, as a few faint lines just under the near ridge.
  ctx.strokeStyle = 'rgba(140, 128, 200, 0.10)';
  ctx.lineWidth = 1;
  for (let index = 0; index < 7; index += 1) {
    const y = 726 + index * 11;
    ctx.beginPath();
    for (let x = 0; x <= VIEW.width; x += 40) {
      const wave = Math.sin(x * 0.01 + world.time * 0.5 + index) * 3;
      if (x === 0) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
}

function drawWell(ctx, well, time) {
  const halo = ctx.createRadialGradient(well.x, well.y, well.core * 0.4, well.x, well.y, well.core * 3.6);
  halo.addColorStop(0, 'rgba(84, 68, 148, 0.42)');
  halo.addColorStop(0.45, 'rgba(66, 54, 120, 0.14)');
  halo.addColorStop(1, 'rgba(66, 54, 120, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(well.x, well.y, well.core * 3.6, 0, Math.PI * 2);
  ctx.fill();

  // Two pale rings of falling water, each turning the other way.
  for (let ring = 0; ring < 2; ring += 1) {
    const radius = well.core * (1.5 + ring * 0.55);
    ctx.save();
    ctx.translate(well.x, well.y);
    ctx.rotate(time * (ring === 0 ? 0.22 : -0.13));
    ctx.strokeStyle = ring === 0 ? 'rgba(150, 132, 208, 0.30)' : 'rgba(120, 106, 178, 0.20)';
    ctx.lineWidth = 1.4;
    for (let arc = 0; arc < 5; arc += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, radius, (arc / 5) * Math.PI * 2, (arc / 5) * Math.PI * 2 + 0.82);
      ctx.stroke();
    }
    ctx.restore();
  }

  const core = ctx.createRadialGradient(
    well.x - well.core * 0.25,
    well.y - well.core * 0.3,
    well.core * 0.1,
    well.x,
    well.y,
    well.core,
  );
  core.addColorStop(0, '#131024');
  core.addColorStop(0.75, PALETTE.wellCore);
  core.addColorStop(1, '#100d1d');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(well.x, well.y, well.core, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.shadowColor = 'rgba(126, 104, 196, 0.85)';
  ctx.shadowBlur = 18;
  ctx.strokeStyle = PALETTE.wellRim;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(well.x, well.y, well.core, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawGate(ctx, gate, state, time, index) {
  const open = state === 'open';
  const passed = state === 'passed';
  const colour = passed ? PALETTE.gatePassed : open ? PALETTE.gateOpen : PALETTE.gateLocked;
  const pulse = open ? 1 + Math.sin(time * 3.1) * 0.06 : 1;
  const radius = TUNING.gateRadius;

  ctx.save();
  ctx.translate(gate.x, gate.y);

  if (open) {
    const glow = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius * 2.4);
    glow.addColorStop(0, 'rgba(255, 212, 137, 0.34)');
    glow.addColorStop(0.5, 'rgba(255, 180, 100, 0.12)');
    glow.addColorStop(1, 'rgba(255, 180, 100, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.scale(pulse, pulse);
  ctx.shadowColor = colour;
  ctx.shadowBlur = passed ? 8 : open ? 22 : 0;
  ctx.strokeStyle = colour;
  ctx.lineWidth = passed ? 2 : open ? 3.4 : 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  // A ring of small rubs around the mouth, like a knot of light.
  const rubs = open ? 12 : 8;
  for (let rub = 0; rub < rubs; rub += 1) {
    const angle = (rub / rubs) * Math.PI * 2 + (open ? time * 0.6 : 0);
    ctx.globalAlpha = open ? 0.9 : 0.32;
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * (radius + 7), Math.sin(angle) * (radius + 7), open ? 2.1 : 1.4, 0, Math.PI * 2);
    ctx.fillStyle = colour;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (open) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.emberHot;
    ctx.font = '600 15px ui-serif, Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index + 1), 0, 0.5);
  }
  ctx.restore();
}

function drawPost(ctx, post, state, time) {
  const lit = state !== 'closed';
  const colour = state === 'goal' ? PALETTE.ember : state === 'closed' ? 'rgba(120, 106, 158, 0.5)' : PALETTE.emberDeep;

  ctx.save();
  ctx.translate(post.x, post.y);

  ctx.strokeStyle = 'rgba(200, 186, 232, 0.20)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-16, 26);
  ctx.lineTo(0, 6);
  ctx.lineTo(16, 26);
  ctx.stroke();

  if (lit) {
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 74);
    glow.addColorStop(0, state === 'goal' ? 'rgba(255, 214, 150, 0.4)' : 'rgba(232, 133, 58, 0.24)');
    glow.addColorStop(1, 'rgba(255, 180, 100, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 74, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 18 + (lit ? Math.sin(time * 2.2) * 1.4 : 0), 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = lit ? 'rgba(255, 226, 178, 0.9)' : 'rgba(150, 138, 190, 0.35)';
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The silk trail: a tapering line of warm light that fades out behind the lantern. */
function drawTrail(ctx, trail, time) {
  if (trail.length < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let index = 1; index < trail.length; index += 1) {
    const previous = trail[index - 1];
    const point = trail[index];
    const age = time - point.t;
    const fresh = Math.max(0, 1 - age / TUNING.trailSeconds);
    if (fresh <= 0.02) continue;
    ctx.strokeStyle = `rgba(255, ${Math.round(170 + 60 * fresh)}, ${Math.round(90 + 80 * fresh)}, ${0.34 * fresh})`;
    ctx.lineWidth = 0.6 + 4.4 * fresh;
    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }
  ctx.restore();
}

/** The courier: a paper lantern with a candle inside, a brass cap and a swinging tassel. */
function drawLantern(ctx, ship, time) {
  const fade = 1 - ship.dimming * 0.85;
  const flicker = 0.86 + 0.14 * Math.sin(time * 9.4) * Math.sin(time * 3.1);
  const tilt = Math.max(-0.5, Math.min(0.5, ship.vel.x / 1400));

  ctx.save();
  ctx.translate(ship.pos.x, ship.pos.y);
  ctx.rotate(tilt);
  ctx.globalAlpha = fade;

  const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 58);
  halo.addColorStop(0, `rgba(255, 214, 150, ${0.5 * flicker * fade})`);
  halo.addColorStop(0.45, 'rgba(255, 170, 90, 0.16)');
  halo.addColorStop(1, 'rgba(255, 170, 90, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, 58, 0, Math.PI * 2);
  ctx.fill();

  // Tassel first, so the paper overlaps it.
  ctx.strokeStyle = 'rgba(255, 206, 150, 0.65)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 16);
  ctx.quadraticCurveTo(3 + Math.sin(time * 2.6) * 2, 26, Math.sin(time * 2.6) * 3, 34);
  ctx.stroke();

  // The paper body: a rounded barrel, lit from the candle at its heart.
  const body = ctx.createLinearGradient(-11, 0, 11, 0);
  body.addColorStop(0, '#c8783a');
  body.addColorStop(0.35, PALETTE.paper);
  body.addColorStop(0.62, PALETTE.emberHot);
  body.addColorStop(1, '#b96b32');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-9, -13);
  ctx.quadraticCurveTo(-14, 0, -9, 13);
  ctx.lineTo(9, 13);
  ctx.quadraticCurveTo(14, 0, 9, -13);
  ctx.closePath();
  ctx.fill();

  // Its ribs.
  ctx.strokeStyle = 'rgba(150, 84, 40, 0.42)';
  ctx.lineWidth = 0.9;
  for (let rib = -1; rib <= 1; rib += 1) {
    ctx.beginPath();
    ctx.moveTo(rib * 6.4, -12.2);
    ctx.quadraticCurveTo(rib * 8.6, 0, rib * 6.4, 12.2);
    ctx.stroke();
  }

  // Brass caps top and bottom.
  ctx.fillStyle = '#4a3a2c';
  ctx.beginPath();
  ctx.roundRect(-7, -16.5, 14, 4.4, 1.6);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-7, 12.2, 14, 4.2, 1.6);
  ctx.fill();

  // The candle flame, small and unsteady.
  const flame = 3.1 * flicker;
  const core = ctx.createRadialGradient(0, 0, 0.5, 0, 0, flame + 3);
  core.addColorStop(0, '#fffaf0');
  core.addColorStop(0.4, PALETTE.emberHot);
  core.addColorStop(1, 'rgba(255, 170, 80, 0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.ellipse(0, -1, flame, flame + 2.4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawParticles(ctx, particles) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let index = 0; index < particles.length; index += 1) {
    const particle = particles[index];
    const life = Math.max(0, particle.life / particle.maxLife);
    const colour =
      particle.hue === 'gate'
        ? `rgba(255, 220, 160, ${0.55 * life})`
        : particle.hue === 'danger'
          ? `rgba(255, 130, 110, ${0.6 * life})`
          : particle.hue === 'dim'
            ? `rgba(150, 140, 190, ${0.4 * life})`
            : `rgba(255, 190, 110, ${0.55 * life})`;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * life + 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The dotted arc you aim with: strongest near the lantern, thinning where the flight gets long. */
function drawPreview(ctx, preview) {
  if (!preview) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let index = 0; index < preview.points.length; index += 1) {
    const point = preview.points[index];
    const fade = 1 - index / preview.points.length;
    ctx.fillStyle = `rgba(255, 214, 150, ${0.5 * fade})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 1.2 + 2.1 * fade, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The sling: a warm line back from the lantern while the pull is held, and its band of power. */
function drawSling(ctx, ship, pointer) {
  if (!pointer) return;
  const dx = ship.pos.x - pointer.x;
  const dy = ship.pos.y - pointer.y;
  const pull = Math.min(Math.hypot(dx, dy), TUNING.dragFullPull);
  if (pull < 6) return;
  const power = pull / TUNING.dragFullPull;

  ctx.save();
  ctx.setLineDash([5, 7]);
  ctx.strokeStyle = `rgba(255, 190, 120, ${0.28 + 0.3 * power})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(ship.pos.x, ship.pos.y);
  ctx.lineTo(pointer.x, pointer.y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = `rgba(255, 226, 178, ${0.65 * power + 0.2})`;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(ship.pos.x, ship.pos.y, 22 + power * 8, -Math.PI / 2, -Math.PI / 2 + power * Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Draw the whole night, with the shake a crash leaves in it. */
export function drawScene(ctx, world, pointer, preview) {
  const sector = currentSector(world);
  const shake = world.shake;
  const offsetX = shake > 0 ? Math.sin(world.time * 92) * shake * 0.6 : 0;
  const offsetY = shake > 0 ? Math.cos(world.time * 74) * shake * 0.5 : 0;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  drawSky(ctx, world);
  drawRidges(ctx, world);

  for (let index = 0; index < sector.wells.length; index += 1) {
    drawWell(ctx, sector.wells[index], world.time);
  }

  // Faint guiding lines from the lantern to the next gate, so a new leg reads at a glance.
  if (world.phase !== 'title' && world.phase !== 'over' && world.phase !== 'won') {
    ctx.save();
    ctx.setLineDash([2, 12]);
    ctx.strokeStyle = 'rgba(255, 200, 140, 0.16)';
    ctx.lineWidth = 1;
    const from = world.ship.pos;
    const to = sector.gates[world.gatesPassed] ?? sector.arrival;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }

  // A crossing that is over shows only the water it happened on: no gates or posts over the panel.
  if (world.phase !== 'won' && world.phase !== 'over') {
    drawPost(ctx, sector.post, 'departure', world.time);
    drawPost(ctx, sector.arrival, world.gatesPassed >= sector.gates.length ? 'goal' : 'closed', world.time);

    for (let index = 0; index < sector.gates.length; index += 1) {
      const state = index < world.gatesPassed ? 'passed' : index === world.gatesPassed ? 'open' : 'locked';
      drawGate(ctx, sector.gates[index], state, world.time, index);
    }
  }

  drawTrail(ctx, world.ship.trail, world.time);
  drawPreview(ctx, preview);
  if (world.phase === 'aim' && pointer) drawSling(ctx, world.ship, pointer);
  drawLantern(ctx, world.ship, world.time);
  drawParticles(ctx, world.particles);
  ctx.restore();

  // A vignette keeps the eye on the middle of the crossing.
  const vignette = ctx.createRadialGradient(
    VIEW.width / 2,
    VIEW.height / 2,
    VIEW.height * 0.36,
    VIEW.width / 2,
    VIEW.height / 2,
    VIEW.height * 1.02,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(2, 2, 8, 0.72)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

/** Where the next gate sits relative to the lantern, for the HUD's bearing arrow. */
export function bearing(world) {
  const sector = currentSector(world);
  const target = sector.gates[world.gatesPassed] ?? sector.arrival;
  return { angle: Math.atan2(target.y - world.ship.pos.y, target.x - world.ship.pos.x), target };
}

export function gateDistance(world) {
  const sector = currentSector(world);
  const target = sector.gates[world.gatesPassed] ?? sector.arrival;
  return distance(world.ship.pos, target);
}
