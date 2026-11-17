// KOTA SENJA — shared tuning numbers and mission data.
// One place for every magic number so the rest of the game reads cleanly.

export const SAVE_KEY = 'kota-senja-save-v1';

export const CITY = {
  blocksAcross: 5, // 5 x 5 blocks of buildings
  blockSize: 44, // metres of building ground per block
  streetWidth: 14, // metres of road between blocks
  sidewalkWidth: 3,
  harborX: 176, // east of this the sea begins
  wallX: 196, // world edge
};

export const PLAYER_TUNING = {
  walkSpeed: 6.5,
  runSpeed: 11,
  turnSpeed: 9,
  radius: 0.7,
  maxHealth: 100,
  healthRegenPerSecond: 3,
  regenDelaySeconds: 5,
  punchRange: 2.4,
  punchDamage: 34,
  pistolDamage: 45,
  pistolAmmoStart: 12,
};

export const CAR_TUNING = {
  accel: 22,
  brake: 34,
  reverseAccel: 12,
  maxSpeed: 40,
  maxReverse: 10,
  steerRate: 2.1,
  grip: 6,
  radius: 1.7,
  stealWanted: 1,
};

export const WANTED = {
  maxStars: 5,
  decayAfterSeconds: 18,
  decayStepSeconds: 9,
  policeCarsPerStar: 1,
  bustDistance: 2.4,
  bustHoldSeconds: 1.1,
  bustFine: 120,
  wastedFine: 80,
  ramDamage: 14,
  officerPunchDamage: 8,
};

export const TRAFFIC_COUNT = 14;
export const PEDESTRIAN_COUNT = 22;
export const MAX_POLICE_CARS = 5;

export const SUNSET = {
  skyTop: 0x2e3a6e,
  skyHorizon: 0xff9a5c,
  sunColor: 0xffd9a0,
  fogColor: 0xe8965f,
  ambientSky: 0x8a7fd0,
  ambientGround: 0x5c4632,
  buildingPalette: [0xd9a066, 0xc97b4a, 0xe8c39a, 0xb98a68, 0x9a6b8f, 0x7d8aa8, 0xd97b5f],
  roadColor: 0x464c58,
  sidewalkColor: 0xb8a88f,
  waterColor: 0x1e6f8f,
};

export const MISSION_DEFS = [
  {
    id: 1,
    title: 'Misi 1 — Kiriman Pertama',
    titleEn: 'First Delivery',
    story: 'Raka, kurir Kota Senja, berutang pada Raja Pelabuhan. Kerja pertama: antar paket ke seberang kota sebelum senja habis.',
    reward: 150,
    steps: [{ kind: 'goto', spot: 'plaza', text: 'Antar paket ke Plaza Senja' }],
  },
  {
    id: 2,
    title: 'Misi 2 — Tagihan',
    titleEn: 'The Pickup',
    story: 'Seseorang berutang pada Raja Pelabuhan. Ambil uangnya di gang pelabuhan, lalu antar ke tempat aman — polisi mulai mengendus.',
    reward: 250,
    steps: [
      { kind: 'goto', spot: 'alley', text: 'Ambil uang di Gang Pelabuhan' },
      { kind: 'goto', spot: 'garage', text: 'Antar uang ke Garasi Aman', wantedOnStart: 1 },
    ],
  },
  {
    id: 3,
    title: 'Misi 3 — Lari Pelabuhan',
    titleEn: 'Harbor Run',
    story: 'Raja Pelabuhan mau mobil emas itu. Curi dari tempat parkir dan bawa ke dermaga — jangan sampai tertangkap.',
    reward: 400,
    steps: [
      { kind: 'steal', spot: 'goldcar', text: 'Curi mobil emas di parkiran' },
      { kind: 'goto', spot: 'harbor', text: 'Antar mobil emas ke Dermaga' },
    ],
  },
  {
    id: 4,
    title: 'Misi 4 — Kabur',
    titleEn: 'The Getaway',
    story: 'Polisi Kota Senja mengepungmu. Bertahan 25 detik tanpa tertangkap — lalu menghilanglah.',
    reward: 500,
    steps: [{ kind: 'survive', seconds: 25, wantedOnStart: 3, text: 'Lepaskan kejaran polisi: bertahan 25 detik' }],
  },
  {
    id: 5,
    title: 'Misi 5 — Raja Senja',
    titleEn: 'King of Senja',
    story: 'Tiga pemberhentian terakhir. Selesaikan semuanya dan utang Raka lunas — Kota Senja jadi milikmu.',
    reward: 1000,
    steps: [
      { kind: 'goto', spot: 'market', text: 'Ambil pesanan terakhir di Pasar Senja' },
      { kind: 'goto', spot: 'tower', text: 'Serahkan ke Menara Matahari' },
      { kind: 'goto', spot: 'harbor', text: 'Temui Raja Pelabuhan di Dermaga' },
    ],
  },
];

// Every named place sits on a street or an intersection, never inside
// a building, so every mission marker is always reachable on foot.
export const SPOTS = {
  playerStart: { x: -8, z: 51 },
  plaza: { x: 109, z: -123 },
  alley: { x: -65, z: -65 },
  garage: { x: 51, z: 109 },
  goldcar: { x: -65, z: 51 },
  harbor: { x: 160, z: 51 },
  market: { x: -123, z: 109 },
  tower: { x: 109, z: 51 },
  pistol: { x: -7, z: -65 },
};

// ---- derived helpers ----

export function missionById(id) {
  return MISSION_DEFS.find((mission) => mission.id === id) || null;
}

export function totalReward() {
  return MISSION_DEFS.reduce((sum, mission) => sum + mission.reward, 0);
}

export function streetLines() {
  // Centerlines of every road, in world metres. The city grid is
  // symmetric: streets run where the blocks end.
  const pitch = CITY.blockSize + CITY.streetWidth;
  const lines = [];
  for (let i = -CITY.blocksAcross; i <= CITY.blocksAcross; i += 1) {
    const offset = i * pitch - CITY.streetWidth / 2;
    lines.push({ axis: 'x', at: offset });
    lines.push({ axis: 'z', at: offset });
  }
  return lines;
}

export function cityHalfSpan() {
  return (CITY.blocksAcross * (CITY.blockSize + CITY.streetWidth) + CITY.streetWidth) / 2;
}
