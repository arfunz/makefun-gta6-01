// KOTA SENJA — every tunable number in one place, so the rest of the code
// reads names instead of literals. Changing the feel of the game means
// changing this file, not hunting through the modules.
export const SEED = 20261117;

// The city is a grid of square blocks. Roads run along both axes at these
// centre lines; each road is 12 wide with a 5-wide sidewalk on each side.
export const WORLD = {
  block: 40,
  roadHalf: 6,
  walk: 5,
  minX: -140,
  maxX: 210,
  minZ: -140,
  maxZ: 230,
  waterZ: 226,
};
export const ROADS = [-109, -69, -29, 11, 51, 91, 131, 171];

// The staged screenshots anchor on the east-west road at z = 51, with the
// camera north of the player looking south (screen-left is world +x).
export const SHOT_ROAD_Z = 51;
export const SHOT_ANCHOR_X = 51;

export const PLAYER = { walk: 6, run: 10, radius: 0.6, health: 100, enterRange: 3.6 };
export const CAR = { accel: 15, brake: 26, reverse: 9, top: 33, turn: 2.1, radius: 1.7 };
export const TRAFFIC_COUNT = 14;
export const PED_COUNT = 22;
export const PARKED_COUNT = 8;

export const WANTED = { decayDelay: 20, decayStep: 10, bustFine: 200, wastedFine: 200, maxStars: 5, bustHold: 2, policeMax: 3 };

// The five courier jobs. Rewards add to $2300, the debt Raka owes the
// Harbor King. Each target is a named place in the city.
export const MISSIONS = [
  { name: 'Paket Plaza', objective: 'Antar paket ke Plaza Senja', target: { x: 171, z: 171 }, reward: 300 },
  { name: 'Uang Pelabuhan', objective: 'Ambil uang di Gang Pelabuhan', target: { x: 51, z: 211 }, reward: 400 },
  { name: 'Dokumen Menara', objective: 'Antar dokumen ke Menara Senja', target: { x: -109, z: -109 }, reward: 400 },
  { name: 'Tagihan Pasar', objective: 'Tagih utang di Pasar Ikan', target: { x: 171, z: -69 }, reward: 500 },
  { name: 'Paket Terakhir', objective: 'Serahkan paket ke Raja Pelabuhan', target: { x: 91, z: 221 }, reward: 700 },
];

export const COLORS = {
  sky: 0xff7a33,
  fog: 0xff8c42,
  ground: 0x2e2a33,
  road: 0x232329,
  walk: 0xb08d5f,
  cross: 0xe8e4da,
  water: 0x14405e,
  facades: [0x8a5a3b, 0x6b4a5e, 0x3b5a7a, 0x7a6b3b, 0x4a6b4a, 0x5e3b4a],
  roofs: 0x1c1c22,
  cars: [0xe8a33d, 0x8a3b8a, 0xd43b3b, 0x3b7ad4, 0xe8e8e8, 0x2a2a2e, 0x3bd47a],
  shirts: [0x2a9d6b, 0xe87a2a, 0x8a5fd4, 0xd43b3b, 0xe8e8e8, 0x3b7ad4, 0xd4c53b],
  skin: [0xe8b98a, 0xc98d5f, 0x8a5a3b, 0xf0c8a0],
};

export function missionTotal() {
  return MISSIONS.reduce((n, m) => n + m.reward, 0);
}
