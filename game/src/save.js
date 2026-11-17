// Save: missions completed and money, in localStorage.
const KEY = 'kota-senja-save-v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { missionsCompleted: 0, money: 0 };
    const s = JSON.parse(raw);
    return { missionsCompleted: s.missionsCompleted | 0, money: s.money | 0 };
  } catch {
    return { missionsCompleted: 0, money: 0 };
  }
}

export function writeSave(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable (private mode): the game still runs.
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Ignore.
  }
}
