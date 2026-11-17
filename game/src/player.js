// Raka, the courier: on foot with WASD and a mouse camera, or behind the
// wheel of any car he can steal with E. Green shirt, yellow cap.
import * as THREE from 'three';
import { PLAYER, CAR, WORLD } from './config.js';
import { driveCar, nearestCar } from './vehicles.js';
import { resolveCircle } from './world.js';
import { makePedMesh } from './pedestrians.js';
import { addWanted } from './police.js';

export function createPlayer(city) {
  const mesh = makePedMesh(0x2a9d6b, 0xe8b98a);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.3, 0.14, 10),
    new THREE.MeshStandardMaterial({ color: 0xe8c33d, roughness: 0.8 }),
  );
  cap.position.y = 1.86;
  mesh.add(cap);
  mesh.position.set(city.spawn.x, 0, city.spawn.z);
  return {
    x: city.spawn.x,
    z: city.spawn.z,
    heading: 0,
    speed: 0,
    inCar: false,
    car: null,
    health: PLAYER.health,
    money: 0,
    mesh,
  };
}

export function updatePlayer(G, dt) {
  const p = G.player;
  const input = G.input;
  if (p.inCar && p.car) {
    const throttle = (input.keys.has('KeyW') || input.keys.has('ArrowUp') ? 1 : 0) + (input.keys.has('KeyS') || input.keys.has('ArrowDown') ? -1 : 0);
    const steer = (input.keys.has('KeyA') || input.keys.has('ArrowLeft') ? 1 : 0) + (input.keys.has('KeyD') || input.keys.has('ArrowRight') ? -1 : 0);
    driveCar(p.car, throttle, steer, dt, G.city.colliders, G.allCars);
    p.x = p.car.x;
    p.z = p.car.z;
    p.heading = p.car.heading;
    p.speed = p.car.speed;
    p.mesh.visible = false;
    if (Math.abs(p.car.speed) > 0.5) G.audio.setEngine(Math.abs(p.car.speed) / CAR.top);
  } else {
    p.mesh.visible = true;
    let fwd = 0;
    let side = 0;
    if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) fwd += 1;
    if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) fwd -= 1;
    if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) side -= 1;
    if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) side += 1;
    const moving = fwd !== 0 || side !== 0;
    const run = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
    const speed = run ? PLAYER.run : PLAYER.walk;
    const cy = G.cameraYaw;
    const sin = Math.sin(cy);
    const cos = Math.cos(cy);
    let mx = 0;
    let mz = 0;
    if (moving) {
      // Camera-relative movement: W moves away from the camera, D to its right.
      mx = -sin * fwd + cos * side;
      mz = -cos * fwd - sin * side;
      const len = Math.hypot(mx, mz);
      mx /= len;
      mz /= len;
    }
    const nx = p.x + mx * speed * dt;
    const nz = p.z + mz * speed * dt;
    const fixed = resolveCircle(nx, nz, PLAYER.radius, G.city.colliders);
    p.x = fixed.x;
    p.z = fixed.z;
    if (moving) p.heading = Math.atan2(mx, mz);
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
    p.speed = moving ? speed : 0;
    G.audio.setEngine(0);
  }
}

export function enterCar(G) {
  const p = G.player;
  const car = nearestCar(p.x, p.z, [...G.trafficCars, ...G.parkedCars], PLAYER.enterRange);
  if (!car) return false;
  if (car.kind === 'traffic') {
    // Stealing a moving car is a crime.
    addWanted(G, 1);
    G.hud.showToast('Kamu mencuri mobil!');
  }
  car.driven = true;
  car.kind = 'player';
  p.inCar = true;
  p.car = car;
  p.x = car.x;
  p.z = car.z;
  p.heading = car.heading;
  p.mesh.visible = false;
  G.audio.horn();
  return true;
}

export function exitCar(G) {
  const p = G.player;
  if (!p.inCar || !p.car) return;
  const car = p.car;
  car.driven = false;
  p.x = car.x + Math.cos(car.heading) * 2.2;
  p.z = car.z - Math.sin(car.heading) * 2.2;
  p.heading = car.heading;
  p.inCar = false;
  p.car = null;
  p.mesh.visible = true;
  p.mesh.position.set(p.x, 0, p.z);
  p.mesh.rotation.y = p.heading;
}

export function hurtPlayer(G, amount) {
  const p = G.player;
  if (p.health <= 0) return;
  p.health = Math.max(0, p.health - amount);
  if (p.health <= 0) {
    G.mode = 'wasted';
    G.hud.showOverlay('wasted');
  }
}

export function respawnPlayer(G) {
  const p = G.player;
  p.x = G.city.spawn.x;
  p.z = G.city.spawn.z;
  p.heading = Math.PI;
  p.health = PLAYER.health;
  p.inCar = false;
  p.car = null;
  p.mesh.visible = true;
  p.mesh.position.set(p.x, 0, p.z);
  p.mesh.rotation.y = p.heading;
  G.cameraYaw = Math.PI;
}
