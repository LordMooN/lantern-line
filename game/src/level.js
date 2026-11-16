// The five sectors of the crossing, laid out by hand in the game's own design field (1280 by 800).
// Each sector is a departure post, a run of light gates to thread in order, and the far post to
// land on, with gravity wells placed to bend the flight between them. `strength` is the pull in
// pixels cubed a second squared; `core` is the dark heart you must not touch.
export const SECTORS = [
  {
    name: 'The Reed Beds',
    blurb: 'A short hop over the shallows. Let the low well do the turning.',
    post: { x: 190, y: 600 },
    gates: [
      { x: 520, y: 470 },
      { x: 860, y: 560 },
    ],
    arrival: { x: 1130, y: 320 },
    wells: [{ x: 660, y: 300, strength: 2.0e7, core: 54 }],
  },
  {
    name: 'The Drowned Bell',
    blurb: 'Two wells, one tolling under the water. Cross above it, then fall.',
    post: { x: 200, y: 180 },
    gates: [
      { x: 470, y: 300 },
      { x: 700, y: 160 },
      { x: 950, y: 330 },
    ],
    arrival: { x: 1150, y: 620 },
    wells: [
      { x: 620, y: 480, strength: 2.6e7, core: 52 },
      { x: 1050, y: 190, strength: 1.7e7, core: 44 },
    ],
  },
  {
    name: 'Nine Lantern Shoal',
    blurb: 'The shoal pulls from three sides. Keep your wax and cut the corners.',
    post: { x: 200, y: 400 },
    gates: [
      { x: 430, y: 180 },
      { x: 710, y: 300 },
      { x: 980, y: 170 },
      { x: 1170, y: 430 },
    ],
    arrival: { x: 760, y: 660 },
    wells: [
      { x: 610, y: 610, strength: 3.0e7, core: 58 },
      { x: 850, y: 520, strength: 2.3e7, core: 50 },
      { x: 1080, y: 660, strength: 1.6e7, core: 42 },
    ],
  },
  {
    name: 'The Long Tide',
    blurb: 'A long diagonal with three tides against you. One puff buys the last gate.',
    post: { x: 150, y: 130 },
    gates: [
      { x: 410, y: 250 },
      { x: 670, y: 390 },
      { x: 920, y: 570 },
    ],
    arrival: { x: 1140, y: 700 },
    wells: [
      { x: 530, y: 430, strength: 2.9e7, core: 56 },
      { x: 830, y: 230, strength: 2.1e7, core: 48 },
      { x: 1070, y: 420, strength: 3.1e7, core: 60 },
    ],
  },
  {
    name: 'Last Light',
    blurb: 'The harbour is behind the deepest well. Four gates, then climb home.',
    post: { x: 160, y: 660 },
    gates: [
      { x: 390, y: 430 },
      { x: 660, y: 610 },
      { x: 930, y: 420 },
      { x: 1130, y: 240 },
    ],
    arrival: { x: 720, y: 140 },
    wells: [
      { x: 520, y: 240, strength: 2.4e7, core: 50 },
      { x: 800, y: 460, strength: 3.4e7, core: 62 },
      { x: 1040, y: 620, strength: 2.0e7, core: 46 },
      { x: 1010, y: 120, strength: 1.5e7, core: 40 },
    ],
  },
];

/** The post a sector starts from, and the one that ends it, as one small shape each. */
export function postRadius() {
  return 30;
}

export function sectorCount() {
  return SECTORS.length;
}
