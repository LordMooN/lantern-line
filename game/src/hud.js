// The written layer: the in-flight HUD (sector, gates, wax, lanterns, score), and the four screens
// the game stops on — the title, a sector cleared, a run lost, and the harbour at the end. Panels are
// drawn as cut paper on the ink, with the serif face the logotype uses, so the menu and the sky feel
// like one thing.
import { PALETTE, TUNING, VIEW } from './config.js';
import { SECTORS } from './level.js';
import { PHASE_TITLE, currentSector, totalScore } from './world.js';

const SERIF = 'ui-serif, Georgia, "Times New Roman", serif';
const SANS = 'ui-sans-serif, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function spaced(ctx, text, x, y, spacing, align = 'left') {
  const letters = [...text];
  const widths = letters.map((letter) => ctx.measureText(letter).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + spacing * (letters.length - 1);
  let cursor = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  for (let index = 0; index < letters.length; index += 1) {
    ctx.fillText(letters[index], cursor, y);
    cursor += widths[index] + spacing;
  }
  return total;
}

function paperPanel(ctx, x, y, width, height, alpha = 0.92) {
  ctx.save();
  ctx.fillStyle = `rgba(12, 10, 24, ${alpha})`;
  ctx.strokeStyle = 'rgba(255, 214, 150, 0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 10);
  ctx.fill();
  ctx.stroke();

  // A warm inner edge, as if the panel were lit from the lantern behind it.
  const glow = ctx.createLinearGradient(x, y, x, y + height);
  glow.addColorStop(0, 'rgba(255, 196, 107, 0.10)');
  glow.addColorStop(1, 'rgba(255, 196, 107, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 10);
  ctx.fill();
  ctx.restore();
}

function lanternPip(ctx, x, y, lit) {
  ctx.save();
  ctx.translate(x, y);
  if (lit) {
    const halo = ctx.createRadialGradient(0, 0, 1, 0, 0, 15);
    halo.addColorStop(0, 'rgba(255, 210, 140, 0.55)');
    halo.addColorStop(1, 'rgba(255, 210, 140, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = lit ? PALETTE.paper : 'rgba(72, 62, 96, 0.85)';
  ctx.beginPath();
  ctx.roundRect(-4.5, -7, 9, 14, 3);
  ctx.fill();
  ctx.strokeStyle = lit ? 'rgba(120, 66, 30, 0.6)' : 'rgba(120, 106, 158, 0.4)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-6, -8);
  ctx.lineTo(6, -8);
  ctx.moveTo(-6, 8);
  ctx.lineTo(6, 8);
  ctx.stroke();
  ctx.restore();
}

function drawHud(ctx, world) {
  const sector = currentSector(world);

  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // Sector plate, top left.
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `500 11px ${SANS}`;
  spaced(ctx, `SECTOR ${world.sector + 1} OF ${SECTORS.length}`, 40, 46, 2.6);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `400 26px ${SERIF}`;
  ctx.fillText(sector.name, 39, 76);

  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `400 13px ${SANS}`;
  ctx.fillText(sector.blurb, 40, 98);

  // Gates threaded, under the name.
  const gateY = 124;
  for (let index = 0; index < sector.gates.length; index += 1) {
    const passed = index < world.gatesPassed;
    const next = index === world.gatesPassed;
    ctx.beginPath();
    ctx.arc(46 + index * 22, gateY, next ? 6.5 : 5.5, 0, Math.PI * 2);
    ctx.fillStyle = passed ? PALETTE.gatePassed : 'rgba(120, 106, 158, 0.28)';
    if (next) ctx.fillStyle = PALETTE.gateOpen;
    ctx.fill();
    if (next) {
      ctx.strokeStyle = 'rgba(255, 212, 137, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(46 + index * 22, gateY, 11, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Score, top right.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `500 11px ${SANS}`;
  spaced(ctx, 'SCORE', VIEW.width - 40, 46, 2.6, 'right');
  ctx.fillStyle = PALETTE.emberHot;
  ctx.font = `400 40px ${SERIF}`;
  const shown = totalScore(world);
  ctx.fillText(String(shown), VIEW.width - 40, 84);
  if (world.best > 0) {
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = `400 12px ${SANS}`;
    ctx.fillText(`best ${Math.max(world.best, shown)}`, VIEW.width - 40, 104);
  }
  ctx.textAlign = 'left';

  // Wax: the clock you carry.
  const barX = 40;
  const barY = VIEW.height - 62;
  const barW = 236;
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `500 11px ${SANS}`;
  spaced(ctx, 'WAX', barX, barY - 10, 2.6);
  ctx.fillStyle = 'rgba(120, 106, 158, 0.22)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, 8, 4);
  ctx.fill();
  const share = Math.max(0, Math.min(1, world.wax / TUNING.waxFull));
  const waxGradient = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  waxGradient.addColorStop(0, PALETTE.emberDeep);
  waxGradient.addColorStop(1, PALETTE.gateOpen);
  ctx.fillStyle = share < 0.25 ? PALETTE.danger : waxGradient;
  ctx.beginPath();
  ctx.roundRect(barX, barY, Math.max(4, barW * share), 8, 4);
  ctx.fill();

  // Lanterns and puffs, bottom right.
  for (let index = 0; index < TUNING.lanterns; index += 1) {
    lanternPip(ctx, VIEW.width - 52 - index * 26, VIEW.height - 54, index < world.lanterns);
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `500 11px ${SANS}`;
  spaced(ctx, 'EMBER PUFFS', VIEW.width - 40, VIEW.height - 90, 2.2, 'right');
  for (let index = 0; index < TUNING.puffsPerFlight; index += 1) {
    ctx.beginPath();
    ctx.arc(VIEW.width - 46 - index * 16, VIEW.height - 108, 4, 0, Math.PI * 2);
    ctx.fillStyle = index < world.ship.puffs ? PALETTE.ember : 'rgba(120, 106, 158, 0.25)';
    ctx.fill();
  }
  ctx.textAlign = 'left';

  // The one-line prompt, in the middle of the floor of the screen: only while you are flying.
  if (world.phase === 'aim' || world.phase === 'flight') {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(243, 233, 216, 0.42)';
    ctx.font = `400 13px ${SANS}`;
    const prompt =
      world.phase === 'aim'
        ? 'drag back from the lantern, release to fly  ·  space: ember puff  ·  r: back to the last ring'
        : 'space: ember puff  ·  r: back to the last ring';
    ctx.fillText(prompt, VIEW.width / 2, VIEW.height - 26);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

function drawTitle(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 4, 10, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  const centre = VIEW.width / 2;

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(243, 233, 216, 0.55)';
  ctx.font = `500 12px ${SANS}`;
  spaced(ctx, 'A GRAVITY COURIER’S CROSSING', centre, 236, 5.4, 'center');

  const glint = ctx.createLinearGradient(centre - 330, 0, centre + 330, 0);
  glint.addColorStop(0, '#c8783a');
  glint.addColorStop(0.4, PALETTE.emberHot);
  glint.addColorStop(0.62, PALETTE.ember);
  glint.addColorStop(1, '#b96b32');
  ctx.save();
  ctx.shadowColor = 'rgba(255, 180, 100, 0.55)';
  ctx.shadowBlur = 34;
  ctx.fillStyle = glint;
  ctx.font = `400 86px ${SERIF}`;
  ctx.fillText('Lantern Line', centre, 318);
  ctx.restore();

  ctx.strokeStyle = 'rgba(255, 214, 150, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centre - 300, 344);
  ctx.lineTo(centre - 60, 344);
  ctx.moveTo(centre + 60, 344);
  ctx.lineTo(centre + 300, 344);
  ctx.stroke();

  ctx.fillStyle = 'rgba(243, 233, 216, 0.72)';
  ctx.font = `400 17px ${SERIF}`;
  ctx.fillText('Five sectors of ink and tide stand between you and the harbour.', centre, 382);
  ctx.fillText('Thread every gate of light, then set the lantern down on the far post.', centre, 410);

  // Three short rules, on a strip of paper.
  const rules = [
    ['Drag back', 'from the lantern to aim; the dotted arc is the flight.'],
    ['Ember puff', 'space, twice a flight, to nudge the drift.'],
    ['Wax', 'burns while you fly; gates top it up, the dark does not.'],
  ];
  const panelW = 660;
  paperPanel(ctx, centre - panelW / 2, 448, panelW, 122, 0.78);
  for (let index = 0; index < rules.length; index += 1) {
    const y = 486 + index * 32;
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.ember;
    ctx.font = `500 13px ${SANS}`;
    ctx.fillText(rules[index][0], centre - 34, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(243, 233, 216, 0.72)';
    ctx.font = `400 13px ${SANS}`;
    ctx.fillText(rules[index][1], centre - 16, y);
  }

  const breathe = 0.6 + 0.4 * Math.sin(world.time * 2.4);
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(255, 226, 178, ${0.55 + 0.45 * breathe})`;
  ctx.font = `500 15px ${SANS}`;
  spaced(ctx, 'PRESS SPACE TO SET OUT', centre, 622, 4.2, 'center');

  ctx.fillStyle = 'rgba(243, 233, 216, 0.34)';
  ctx.font = `400 12px ${SANS}`;
  ctx.fillText('made for make.fun’s “Make the best game” bounty', centre, VIEW.height - 40);
  ctx.textAlign = 'left';
  ctx.restore();
}

function lineItem(ctx, label, value, x, y, width, emphasis = false) {
  ctx.textAlign = 'left';
  ctx.fillStyle = emphasis ? PALETTE.text : 'rgba(243, 233, 216, 0.62)';
  ctx.font = `${emphasis ? 500 : 400} 15px ${SANS}`;
  ctx.fillText(label, x, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = emphasis ? PALETTE.emberHot : PALETTE.text;
  ctx.font = `400 18px ${SERIF}`;
  ctx.fillText(value, x + width, y + 1);
  ctx.textAlign = 'left';
}

function drawCleared(ctx, world, detail) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 4, 10, 0.62)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const w = 520;
  const x = VIEW.width / 2 - w / 2;
  const y = 210;
  paperPanel(ctx, x, y, w, 330);

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gatePassed;
  ctx.font = `500 11px ${SANS}`;
  spaced(ctx, 'SECTOR CLEARED', VIEW.width / 2, y + 48, 4.4, 'center');
  ctx.fillStyle = PALETTE.text;
  ctx.font = `400 34px ${SERIF}`;
  ctx.fillText(currentSector(world).name, VIEW.width / 2, y + 92);

  ctx.textAlign = 'left';
  lineItem(ctx, 'Gates threaded', `${currentSector(world).gates.length}`, x + 48, y + 146, w - 96);
  lineItem(ctx, 'Wax left', `${Math.round(world.wax)}`, x + 48, y + 178, w - 96);
  lineItem(ctx, detail.feather ? 'Feather landing' : 'Landing', detail.feather ? 'yes' : '—', x + 48, y + 210, w - 96);
  ctx.strokeStyle = 'rgba(255, 214, 150, 0.2)';
  ctx.beginPath();
  ctx.moveTo(x + 48, y + 230);
  ctx.lineTo(x + w - 48, y + 230);
  ctx.stroke();
  lineItem(ctx, 'Sector score', `+${detail.landing}`, x + 48, y + 262, w - 96, true);

  ctx.textAlign = 'center';
  const breathe = 0.6 + 0.4 * Math.sin(world.time * 2.6);
  ctx.fillStyle = `rgba(255, 226, 178, ${0.5 + 0.4 * breathe})`;
  ctx.font = `500 13px ${SANS}`;
  spaced(ctx, world.sector + 1 >= SECTORS.length ? 'SPACE · SAIL INTO THE HARBOUR' : 'SPACE · ON TO THE NEXT SECTOR', VIEW.width / 2, y + 306, 3.4, 'center');
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawOver(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 4, 10, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const w = 500;
  const x = VIEW.width / 2 - w / 2;
  const y = 224;
  paperPanel(ctx, x, y, w, 296);

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.danger;
  ctx.font = `500 11px ${SANS}`;
  spaced(ctx, 'THE LAST LANTERN IS OUT', VIEW.width / 2, y + 50, 4.2, 'center');
  ctx.fillStyle = PALETTE.text;
  ctx.font = `400 34px ${SERIF}`;
  ctx.fillText('Adrift in the dark', VIEW.width / 2, y + 96);

  lineItem(ctx, 'Sectors crossed', `${world.sector} of ${SECTORS.length}`, x + 48, y + 148, w - 96);
  lineItem(ctx, 'Lanterns lost', `${world.crashes}`, x + 48, y + 180, w - 96);
  lineItem(ctx, 'Final score', `${totalScore(world)}`, x + 48, y + 216, w - 96, true);

  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(255, 226, 178, ${0.62 + 0.38 * Math.sin(world.time * 2.6)})`;
  ctx.font = `500 13px ${SANS}`;
  spaced(ctx, 'PRESS R TO CROSS AGAIN', VIEW.width / 2, y + 262, 3.4, 'center');
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawWon(ctx, world) {
  ctx.save();
  // The night stays visible behind the last panel: a scrim, not a curtain. The wells are left out
  // so nothing cold shows through the writing.
  ctx.fillStyle = 'rgba(4, 4, 10, 0.42)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const glow = ctx.createRadialGradient(VIEW.width / 2, 300, 40, VIEW.width / 2, 300, 520);
  glow.addColorStop(0, 'rgba(255, 196, 107, 0.16)');
  glow.addColorStop(1, 'rgba(255, 196, 107, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.ember;
  ctx.font = `500 11px ${SANS}`;
  spaced(ctx, 'ALL FIVE SECTORS CROSSED', VIEW.width / 2, 178, 4.6, 'center');
  ctx.fillStyle = PALETTE.emberHot;
  ctx.font = `400 62px ${SERIF}`;
  ctx.fillText('The harbour, at last', VIEW.width / 2, 244);

  const w = 500;
  const x = VIEW.width / 2 - w / 2;
  paperPanel(ctx, x, 290, w, 232);
  lineItem(ctx, 'Lanterns kept', `${world.lanterns} of ${TUNING.lanterns}`, x + 48, 342, w - 96);
  lineItem(ctx, 'Feather landings', `${world.feathers}`, x + 48, 376, w - 96);
  lineItem(ctx, 'Gates threaded', `${SECTORS.reduce((sum, sector) => sum + sector.gates.length, 0)}`, x + 48, 410, w - 96);
  ctx.strokeStyle = 'rgba(255, 214, 150, 0.2)';
  ctx.beginPath();
  ctx.moveTo(x + 48, 430);
  ctx.lineTo(x + w - 48, 430);
  ctx.stroke();
  lineItem(ctx, 'Final score', `${totalScore(world)}`, x + 48, 466, w - 96, true);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(243, 233, 216, 0.66)';
  ctx.font = `400 15px ${SERIF}`;
  ctx.fillText('The keeper takes the lantern from your hands and hangs it by the door.', VIEW.width / 2, 570);
  ctx.fillStyle = `rgba(255, 226, 178, ${0.55 + 0.4 * Math.sin(world.time * 2.4)})`;
  ctx.font = `500 13px ${SANS}`;
  spaced(ctx, 'PRESS R TO SAIL AGAIN', VIEW.width / 2, 612, 3.6, 'center');
  ctx.textAlign = 'left';
  ctx.restore();
}

/** Draw the HUD and whichever full screen the phase calls for. */
export function drawInterface(ctx, world, detail) {
  if (world.phase === PHASE_TITLE) {
    drawTitle(ctx, world);
    return;
  }
  if (world.phase === 'won' || world.phase === 'over') {
    if (world.phase === 'won') drawWon(ctx, world);
    else drawOver(ctx, world);
    return;
  }
  drawHud(ctx, world);
  if (world.phase === 'cleared') drawCleared(ctx, world, detail);}
