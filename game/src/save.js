// KOTA SENJA — save and load through localStorage.
// Remembers money, mission progress and the best wanted level survived.

import { SAVE_KEY } from './config.js';

export function defaultSave() {
  return {
    money: 0,
    missionsCompleted: 0,
    bestWanted: 0,
    muted: false,
  };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    const save = defaultSave();
    if (typeof parsed.money === 'number') save.money = parsed.money;
    if (typeof parsed.missionsCompleted === 'number') save.missionsCompleted = parsed.missionsCompleted;
    if (typeof parsed.bestWanted === 'number') save.bestWanted = parsed.bestWanted;
    if (typeof parsed.muted === 'boolean') save.muted = parsed.muted;
    return save;
  } catch (err) {
    return defaultSave();
  }
}

// ---- writing ----

export function writeSave(save) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch (err) {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    // A failed clear is harmless; the next write overwrites it.
  }
}
