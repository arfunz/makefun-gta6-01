// KOTA SENJA — combat: fists, the pistol, and taking damage.
// Punching a pedestrian is a crime; shooting is a bigger one.

import * as THREE from 'three';
import { PLAYER_TUNING, WANTED } from './config.js';
import { addWanted } from './police.js';

export function nearestPedInFront(game, maxDistance, maxAngle) {
  const player = game.player;
  const fx = Math.sin(player.heading);
  const fz = Math.cos(player.heading);
  let best = null;
  let bestDist = maxDistance;
  for (const ped of game.peds) {
    if (ped.state === 'down') continue;
    const dx = ped.x - player.x;
    const dz = ped.z - player.z;
    const dist = Math.hypot(dx, dz);
    if (dist > bestDist || dist < 0.01) continue;
    const dot = (dx * fx + dz * fz) / dist;
    if (dot < Math.cos(maxAngle)) continue;
    bestDist = dist;
    best = ped;
  }
  return best;
}

export function punch(game) {
  const player = game.player;
  if (player.punchCooldown > 0 || player.inCar) return false;
  player.punchCooldown = 0.45;
  game.audio.playThud();
  const ped = nearestPedInFront(game, PLAYER_TUNING.punchRange, 1.1);
  if (ped) {
    ped.state = 'down';
    ped.downTimer = 4;
    ped.mesh.rotation.x = -Math.PI / 2;
    ped.mesh.position.y = 0.3;
    addWanted(game, 1);
    game.hudMessage('Kamu memukul pejalan kaki! Bintang naik.');
    return true;
  }
  const officer = nearestOfficerInFront(game, PLAYER_TUNING.punchRange, 1.1);
  if (officer) {
    officer.health -= PLAYER_TUNING.punchDamage;
    game.audio.playThud();
    if (officer.health <= 0) {
      officer.down = true;
      officer.mesh.rotation.x = -Math.PI / 2;
      officer.mesh.position.y = 0.3;
    }
    addWanted(game, 1);
    return true;
  }
  return false;
}

export function nearestOfficerInFront(game, maxDistance, maxAngle) {
  const player = game.player;
  const fx = Math.sin(player.heading);
  const fz = Math.cos(player.heading);
  let best = null;
  let bestDist = maxDistance;
  for (const officer of game.officers) {
    if (officer.down) continue;
    const dx = officer.x - player.x;
    const dz = officer.z - player.z;
    const dist = Math.hypot(dx, dz);
    if (dist > bestDist || dist < 0.01) continue;
    const dot = (dx * fx + dz * fz) / dist;
    if (dot < Math.cos(maxAngle)) continue;
    bestDist = dist;
    best = officer;
  }
  return best;
}

// ---- shooting, damage and the pistol pickup ----

export function shoot(game) {
  const player = game.player;
  if (!player.hasPistol || player.ammo <= 0 || player.shootCooldown > 0 || player.inCar) return false;
  player.shootCooldown = 0.28;
  player.ammo -= 1;
  game.audio.playShot();
  const fx = Math.sin(game.cameraYaw + Math.PI);
  const fz = Math.cos(game.cameraYaw + Math.PI);
  const ox = player.x;
  const oz = player.z;
  let best = null;
  let bestDist = 70;
  const targets = [];
  for (const ped of game.peds) if (ped.state !== 'down') targets.push({ x: ped.x, z: ped.z, ref: ped, kind: 'ped' });
  for (const officer of game.officers) if (!officer.down) targets.push({ x: officer.x, z: officer.z, ref: officer, kind: 'officer' });
  for (const target of targets) {
    const dx = target.x - ox;
    const dz = target.z - oz;
    const along = dx * fx + dz * fz;
    if (along < 1 || along > bestDist) continue;
    const across = Math.abs(dx * fz - dz * fx);
    if (across > 1.4) continue;
    bestDist = along;
    best = target;
  }
  if (best) {
    if (best.kind === 'ped') {
      best.ref.state = 'down';
      best.ref.downTimer = 5;
      best.ref.mesh.rotation.x = -Math.PI / 2;
      best.ref.mesh.position.y = 0.3;
    } else {
      best.ref.health -= PLAYER_TUNING.pistolDamage;
      if (best.ref.health <= 0) {
        best.ref.down = true;
        best.ref.mesh.rotation.x = -Math.PI / 2;
        best.ref.mesh.position.y = 0.3;
      }
    }
    addWanted(game, 1);
    game.hudMessage('Tembakan dilepas! Polisi waspada.');
  }
  return true;
}

export function damagePlayer(game, amount) {
  const player = game.player;
  if (player.health <= 0) return;
  player.health -= amount;
  player.lastDamageAt = game.time;
  if (player.health <= 0) {
    player.health = 0;
    game.requestWasted();
  }
}

export function healPlayerTick(game, dt) {
  const player = game.player;
  if (player.health <= 0) return;
  if (game.time - player.lastDamageAt < PLAYER_TUNING.regenDelaySeconds) return;
  player.health = Math.min(PLAYER_TUNING.maxHealth, player.health + PLAYER_TUNING.healthRegenPerSecond * dt);
}

export function makePistolPickup(scene, x, z) {
  const group = new THREE.Group();
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.16, 0.16),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
  );
  gun.position.y = 0.4;
  group.add(gun);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.35 }),
  );
  glow.position.y = 0.4;
  group.add(glow);
  group.position.set(x, 0, z);
  scene.add(group);
  return { mesh: group, x, z, taken: false };
}

export function updatePistolPickup(game, pickup) {
  if (pickup.taken) return;
  pickup.mesh.rotation.y += 0.02;
  const player = game.player;
  if (Math.hypot(player.x - pickup.x, player.z - pickup.z) < 2) {
    pickup.taken = true;
    pickup.mesh.visible = false;
    player.hasPistol = true;
    player.ammo = PLAYER_TUNING.pistolAmmoStart;
    game.audio.playChime();
    game.hudMessage('Pistol didapat! Klik untuk menembak. Amunisi 12.');
  }
}
