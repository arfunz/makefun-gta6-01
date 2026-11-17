// KOTA SENJA — small seeded random helpers.
// One deterministic generator drives the city layout so the same seed
// always builds the same streets, buildings and palms.

export function makeSeededRandom(seed) {
  let state = seed >>> 0;
  return function nextRandom() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomRange(rng, min, max) {
  return min + rng() * (max - min);
}

export function randomInt(rng, min, max) {
  return Math.floor(randomRange(rng, min, max + 1));
}

// ---- choice helpers ----

export function pickFrom(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function shuffleList(rng, list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export function chance(rng, probability) {
  return rng() < probability;
}
