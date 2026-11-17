// KOTA SENJA — Raka on foot: movement, camera rig, entering cars.
// The camera orbits behind Raka and swings behind the car when driving.

import * as THREE from 'three';
import { PLAYER_TUNING, CAR_TUNING } from './config.js';
import { moveAxes, consumeMouseLook, cameraTurnKeys } from './input.js';
import { resolveCircleColliders } from './vehicles.js';

export function makePlayerMesh() {
  const group = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0x0e7a6e });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.85, 0.38), jacket);
  torso.position.y = 1.08;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xc98d5f }),
  );
  head.position.y = 1.76;
  head.castShadow = true;
  group.add(head);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.29, 0.12, 12),
    new THREE.MeshLambertMaterial({ color: 0xf1c40f }),
  );
  cap.position.y = 1.96;
  group.add(cap);
  const pants = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  for (const lx of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.66, 0.3), pants);
    leg.position.set(lx, 0.33, 0);
    group.add(leg);
  }
  for (const ax of [-0.42, 0.42]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.22), jacket);
    arm.position.set(ax, 1.1, 0);
    group.add(arm);
  }
  return group;
}

export function createPlayer(scene, x, z) {
  const mesh = makePlayerMesh();
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  return {
    mesh,
    x,
    z,
    heading: 0,
    speed: 0,
    health: PLAYER_TUNING.maxHealth,
    money: 0,
    inCar: null,
    hasPistol: false,
    ammo: 0,
    lastDamageAt: -99,
    punchCooldown: 0,
    shootCooldown: 0,
  };
}

export function updatePlayerOnFoot(game, dt) {
  const player = game.player;
  const input = game.input;
  const axes = moveAxes(input);
  const running = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
  const speed = running ? PLAYER_TUNING.runSpeed : PLAYER_TUNING.walkSpeed;
  const yaw = game.cameraYaw;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  let moveX = 0;
  let moveZ = 0;
  if (axes.forward !== 0 || axes.strafe !== 0) {
    const fx = -sin;
    const fz = -cos;
    const rx = -cos;
    const rz = sin;
    moveX = fx * axes.forward + rx * axes.strafe;
    moveZ = fz * axes.forward + rz * axes.strafe;
    const len = Math.hypot(moveX, moveZ) || 1;
    moveX /= len;
    moveZ /= len;
    player.heading = Math.atan2(moveX, moveZ);
  }
  const nextX = player.x + moveX * speed * dt;
  const nextZ = player.z + moveZ * speed * dt;
  const resolved = resolveCircleColliders(nextX, nextZ, PLAYER_TUNING.radius, game.city.colliders);
  player.x = resolved.x;
  player.z = resolved.z;
  player.speed = (axes.forward !== 0 || axes.strafe !== 0) ? speed : 0;
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.rotation.y = player.heading;
  // Simple walk bob so the character reads as alive.
  const bob = player.speed > 0 ? Math.sin(game.time * 11) * 0.05 : 0;
  player.mesh.position.y = bob;
  player.punchCooldown = Math.max(0, player.punchCooldown - dt);
  player.shootCooldown = Math.max(0, player.shootCooldown - dt);
}

// ---- entering and leaving cars, and the orbit camera ----

export function nearestStealableCar(game, maxDistance) {
  const player = game.player;
  let best = null;
  let bestDist = maxDistance;
  for (const car of game.allCars) {
    if (car.kind === 'police') continue;
    if (car === player.inCar) continue;
    const dist = Math.hypot(car.x - player.x, car.z - player.z);
    if (dist < bestDist) {
      bestDist = dist;
      best = car;
    }
  }
  return best;
}

export function enterCar(game, car) {
  const player = game.player;
  player.inCar = car;
  player.mesh.visible = false;
  car.kind = 'player';
  game.cameraDistance = 11;
  if (car.stolen !== true) {
    car.stolen = true;
  }
}

export function exitCar(game) {
  const player = game.player;
  const car = player.inCar;
  if (!car) return;
  const side = { x: Math.cos(car.heading), z: -Math.sin(car.heading) };
  player.x = car.x + side.x * 2.6;
  player.z = car.z + side.z * 2.6;
  player.heading = car.heading;
  player.mesh.visible = true;
  player.mesh.position.set(player.x, 0, player.z);
  player.inCar = null;
  game.cameraDistance = 8;
}

export function updateCameraRig(game, dt) {
  const input = game.input;
  const look = consumeMouseLook(input);
  game.cameraYaw -= look.dx * 0.0032;
  game.cameraPitch = Math.max(-0.15, Math.min(0.55, game.cameraPitch + look.dy * 0.0022));
  const keys = cameraTurnKeys(input);
  game.cameraYaw += keys.yaw * 2.4 * dt;
  game.cameraPitch = Math.max(-0.15, Math.min(0.55, game.cameraPitch - keys.pitch * 1.4 * dt));
  const focus = game.player.inCar
    ? { x: game.player.inCar.x, y: 1.6, z: game.player.inCar.z }
    : { x: game.player.x, y: 1.7, z: game.player.z };
  const dist = game.cameraDistance;
  const camX = focus.x + Math.sin(game.cameraYaw) * Math.cos(game.cameraPitch) * dist;
  const camY = focus.y + Math.sin(game.cameraPitch) * dist + 3.2;
  const camZ = focus.z + Math.cos(game.cameraYaw) * Math.cos(game.cameraPitch) * dist;
  game.camera.position.set(camX, camY, camZ);
  game.camera.lookAt(focus.x, focus.y, focus.z);
}
