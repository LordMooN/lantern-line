// One place for the game's look and its tuning: the design field the whole game is drawn in,
// the ink-and-ember palette, the fixed physics step, and the numbers that decide how a launch
// feels. Nothing here changes while the game runs, so a sector always plays the same way.
export const VIEW = { width: 1280, height: 800 };

/** The ink night, the ember light, and the two cool notes the gates and the deep water use. */
export const PALETTE = {
  inkTop: '#0b0a16',
  inkBottom: '#04040a',
  haze: 'rgba(96, 84, 168, 0.16)',
  ridge: '#11101d',
  ridgeFar: '#191627',
  ember: '#ffc46b',
  emberHot: '#fff2cf',
  emberDeep: '#e8853a',
  gateOpen: '#ffd489',
  gatePassed: '#7fd6c8',
  gateLocked: 'rgba(150, 132, 196, 0.32)',
  wellCore: '#08070f',
  wellRim: '#5b4a92',
  silk: 'rgba(255, 196, 107, 0.55)',
  text: '#f3e9d8',
  textDim: 'rgba(243, 233, 216, 0.58)',
  danger: '#ff7a6b',
  wax: '#ffd489',
  paper: '#ffe9c2',
};

/** Fixed physics step: the simulation never reads a clock, so a replay is the same game. */
export const STEP = 1 / 120;

export const TUNING = {
  /** Launch speed at full drag, in pixels a second, and the pull that reaches it. */
  launchMinSpeed: 150,
  launchMaxSpeed: 690,
  dragFullPull: 260,
  /** Gravity is an inverse square pull, softened near a well so a grazing pass stays smooth. */
  gravitySoften: 46,
  /** A puff of ember mid-flight: a nudge along the direction you are already drifting. */
  puffSpeed: 96,
  puffsPerFlight: 2,
  puffWaxCost: 7,
  /** Wax is the clock: it drains in flight, and every gate tops it up. */
  waxFull: 100,
  waxDrainPerSecond: 4.2,
  waxGateBonus: 16,
  waxLaunchCost: 4,
  /** A lantern that burns out takes this long to go out, and you lose one of three. */
  burnoutSeconds: 1.6,
  lanterns: 3,
  /** Landing slower than this is a feather landing: a small bonus. */
  featherLanding: 210,
  /** Gates must be threaded within this many pixels of their centre. */
  gateRadius: 40,
  /** Off the field by this much and the lantern is lost to the dark. */
  edgeMargin: 120,
  gateScore: 120,
  sectorScore: 250,
  featherScore: 60,
  waxScorePerPoint: 9,
  trailSamples: 150,
  trailSeconds: 2.4,
};

/** Short, quiet names for the sectors, shown on the HUD and on the results screen. */
export const SCORE = {
  gatesCleared: 'gates',
  sector: 'sector',
};
