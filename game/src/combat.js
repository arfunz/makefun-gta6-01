// Combat: a punch with F and a shot with the mouse click. Both are crimes,
// so both raise the wanted level.
import * as THREE from 'three';
import { addWanted } from './police.js';
import { knockDown } from './pedestrians.js';

export function punch(G) {
  const p = G.player;
  if (p.inCar) return false;
  const fx = Math.sin(p.heading);
  const fz = Math.cos(p.heading);
  let best = null;
  let bd = 2.6;
  for (const ped of G.peds) {
    if (ped.down) continue;
    const dx = ped.x - p.x;
    const dz = ped.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d >= bd || d < 0.01) continue;
    const dot = (dx * fx + dz * fz) / d;
    if (dot > 0.3) {
      bd = d;
      best = ped;
    }
  }
  G.audio.punch();
  if (!best) return false;
  knockDown(best, G.rng);
  addWanted(G, 1);
  return true;
}

export function shoot(G) {
  const p = G.player;
  if (p.inCar) return;
  G.audio.shoot();
  const fx = Math.sin(p.heading);
  const fz = Math.cos(p.heading);
  let best = null;
  let bd = 30;
  for (const ped of G.pedestrians) {
    if (ped.down) continue;
    const dx = ped.x - p.x;
    const dz = ped.z - p.z;
    const d = Math.hypot(dx, dz);
    const dot = (dx * fx + dz * fz) / (d || 1);
    if (d < bd && dot > 0.9) {
      bd = d;
      best = ped;
    }
  }
  if (best) {
    knockDown(best);
    addWanted(G, 1);
    G.hud.showToast('Kamu menembak pejalan kaki!');
  }
  G.shootFlash = G.time + 0.08;
}
