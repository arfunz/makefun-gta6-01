// The five courier jobs: what each one asks, where it points, what it pays,
// and the win when the debt is cleared.
import { MISSIONS } from './config.js';
import { writeSave } from './save.js';

export function createMissions() {
  return { defs: MISSIONS, current: 0, completedCount: 0, target: null, active: false };
}

export function startMission(G, index) {
  const m = G.missions;
  const at = Math.max(0, Math.min(index, m.defs.length - 1));
  const def = m.defs[at];
  m.current = at;
  m.target = { x: def.target.x, z: def.target.z };
  m.active = true;
  G.mode = 'playing';
  G.hud.showToast(`Misi ${at + 1} / 5 — ${def.objective}`);
}

export function updateMissions(G, dt) {
  const m = G.missions;
  if (!m.active || G.mode !== 'playing') return;
  const d = Math.hypot(m.target.x - G.player.x, m.target.z - G.player.z);
  if (d < 7) completeMission(G);
}

// The reward, the save and the win, when the player reaches the target.
function completeMission(G) {
  const m = G.missions;
  const def = m.defs[m.current];
  m.active = false;
  m.completedCount += 1;
  G.money += def.reward;
  G.player.money = G.money;
  G.hud.setMissionDone(def);
  G.audio.pickup();
  writeSave({ missionsCompleted: m.completedCount, money: G.money });
  if (m.completedCount >= m.defs.length) {
    G.mode = 'win';
    G.hud.setWinStats(G);
    G.hud.showOverlay('win');
  } else {
    nextMission(G);
  }
}

export function nextMission(G) {
  const m = G.missions;
  if (m.current + 1 < MISSIONS.length) {
    startMission(G, m.current + 1);
  }
}

export function debugCompleteAllMissions(G) {
  const m = G.missions;
  const total = MISSIONS.reduce((n, d) => n + d.reward, 0);
  G.money = Math.max(G.money, total);
  m.completedCount = MISSIONS.length;
  m.current = MISSIONS.length - 1;
  m.active = false;
  G.player.money = G.money;
  writeSave({ missionsCompleted: m.completedCount, money: G.money });
  G.mode = 'win';
  G.hud.setWinStats(G);
  G.hud.showOverlay('win');
}
