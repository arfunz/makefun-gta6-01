// KOTA SENJA — the police: wanted heat, patrol cars and foot officers.
// Everything the law does lives here. Crimes raise the wanted level, patrol
// cars roll in and chase Raka, officers step out when he is on foot, and an
// arrest lands when the police stay touching him long enough.

import * as THREE from 'three';
import { CITY } from './config.js';
import { createCar } from './vehicles.js';

// How the heat behaves, in one place.
const MAX_PATROL_CARS = 5;
const BUST_HOLD_SECONDS = 1.1; // police must keep touching Raka this long
const BUST_TOUCH_METRES = 2.4;
const PATROL_SPAWN_GAP = 1.5; // seconds between patrol cars joining the chase
const PATROL_SPAWN_METRES = 45; // how far out a patrol car appears
const PATROL_TOP_SPEED = 21;
const PATROL_TURN_RATE = 2.6; // radians per second
const OFFICER_SPAWN_METRES = 14; // a patrol car this close lets an officer out
const OFFICER_SPAWN_GAP = 3;
const OFFICER_TOP_SPEED = 8;
const OFFICER_HEALTH = 50;
const RAM_COOLDOWN = 1.0;
const RAM_TOUCH_METRES = 3.6;

let patrolSpawnTimer = 0;
let officerSpawnTimer = 0;
let ramCooldownLeft = 0;

// Streets repeat on a grid: one block plus one street, over and over.
function streetPitch() {
  return CITY.blockSize + CITY.streetWidth;
}

function nearestStreetLine(value) {
  const pitch = streetPitch();
  const index = Math.round((value + CITY.streetWidth / 2) / pitch);
  return index * pitch - CITY.streetWidth / 2;
}

function clampSpawn(value) {
  return Math.max(-160, Math.min(160, value));
}

// ---- the officer on foot ----
// Built from simple boxes and a sphere: navy uniform, cap, pale vest stripe.
function makeOfficerMesh() {
  const group = new THREE.Group();
  const navy = new THREE.MeshStandardMaterial({ color: 0x1d2f45, roughness: 0.85 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111c28, roughness: 0.6 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xdfe8ff, emissive: 0x223344 });

  const legGeo = new THREE.BoxGeometry(0.22, 0.8, 0.24);
  const leftLeg = new THREE.Mesh(legGeo, navy);
  leftLeg.position.set(-0.14, 0.4, 0);
  const rightLeg = new THREE.Mesh(legGeo, navy);
  rightLeg.position.set(0.14, 0.4, 0);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), navy);
  torso.position.y = 1.16;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.1, 0.36), stripeMat);
  stripe.position.y = 1.3;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), skin);
  head.position.y = 1.72;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.24, 0.1, 12), dark);
  cap.position.y = 1.88;
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.18), dark);
  brim.position.set(0, 1.84, 0.24);

  const armGeo = new THREE.BoxGeometry(0.16, 0.66, 0.18);
  const leftArm = new THREE.Mesh(armGeo, navy);
  leftArm.position.set(-0.4, 1.16, 0);
  const rightArm = new THREE.Mesh(armGeo, navy);
  rightArm.position.set(0.4, 1.16, 0);

  group.add(leftLeg, rightLeg, torso, stripe, head, cap, brim, leftArm, rightArm);
  group.traverse((part) => { part.castShadow = true; });
  return group;
}

// ---- spawning ----
// A patrol car appears on the nearest street, a little way from Raka,
// already pointed down the road toward him.
function pickPatrolSpawn(game) {
  const player = game.player;
  const alongX = Math.random() < 0.5;
  const side = Math.random() < 0.5 ? -1 : 1;
  if (alongX) {
    return {
      x: clampSpawn(player.x + side * PATROL_SPAWN_METRES),
      z: nearestStreetLine(player.z),
      heading: side > 0 ? -Math.PI / 2 : Math.PI / 2,
    };
  }
  return {
    x: nearestStreetLine(player.x),
    z: clampSpawn(player.z + side * PATROL_SPAWN_METRES),
    heading: side > 0 ? Math.PI : 0,
  };
}

function spawnPatrolCar(game) {
  const spot = pickPatrolSpawn(game);
  const car = createCar(game.scene, spot.x, spot.z, spot.heading, 0x1c2733, 'police');
  game.policeCars.push(car);
  return car;
}

function spawnOfficer(game, patrolCar) {
  const mesh = makeOfficerMesh();
  const officer = {
    x: patrolCar.x + 2,
    z: patrolCar.z + 1,
    heading: 0,
    mesh,
    health: OFFICER_HEALTH,
    down: false,
    speed: OFFICER_TOP_SPEED,
  };
  mesh.position.set(officer.x, 0, officer.z);
  game.scene.add(mesh);
  game.officers.push(officer);
  return officer;
}

function removeAllPolice(game) {
  for (const car of game.policeCars) game.scene.remove(car.mesh);
  game.policeCars.length = 0;
  for (const officer of game.officers) game.scene.remove(officer.mesh);
  game.officers.length = 0;
}

// ---- chasing ----
function steerToward(mover, targetX, targetZ, turnRate, dt) {
  const want = Math.atan2(targetX - mover.x, targetZ - mover.z);
  let diff = want - mover.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const step = Math.max(-turnRate * dt, Math.min(turnRate * dt, diff));
  mover.heading += step;
}

function chaseInCar(game, car, dt) {
  const player = game.player;
  steerToward(car, player.x, player.z, PATROL_TURN_RATE, dt);
  const targetSpeed = Math.min(PATROL_TOP_SPEED, 14 + game.wanted * 1.5);
  car.speed = Math.min(targetSpeed, (car.speed || 0) + 14 * dt);
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  // Ram the player's car when close enough: shove it and bleed its speed.
  if (player.inCar && ramCooldownLeft <= 0) {
    const dx = player.x - car.x;
    const dz = player.z - car.z;
    const dist = Math.hypot(dx, dz);
    if (dist < RAM_TOUCH_METRES && dist > 0.01) {
      ramCooldownLeft = RAM_COOLDOWN;
      const ride = player.inCar;
      ride.speed = (ride.speed || 0) * 0.6;
      ride.x += (dx / dist) * 1.5;
      ride.z += (dz / dist) * 1.5;
      ride.mesh.position.set(ride.x, 0, ride.z);
    }
  }
}

function chaseOnFoot(game, officer, dt) {
  const player = game.player;
  const dx = player.x - officer.x;
  const dz = player.z - officer.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.01) return;
  officer.heading = Math.atan2(dx, dz);
  const step = Math.min(dist, officer.speed * dt);
  officer.x += (dx / dist) * step;
  officer.z += (dz / dist) * step;
  officer.mesh.position.set(officer.x, 0, officer.z);
  officer.mesh.rotation.y = officer.heading;
}

// ---- wanted level ----
export function addWanted(game, stars) {
  game.wanted = Math.min(5, game.wanted + stars);
  game.secondsSinceCrime = 0;
}

export function clearWanted(game) {
  game.wanted = 0;
  game.secondsSinceCrime = 0;
  game.bustTimer = 0;
  removeAllPolice(game);
}

// ---- the per-frame update ----
function maybeSendOfficer(game, dt) {
  officerSpawnTimer -= dt;
  if (officerSpawnTimer > 0) return;
  const cap = Math.min(game.wanted + 1, 4);
  const standing = game.officers.filter((officer) => !officer.down).length;
  if (standing >= cap) return;
  const player = game.player;
  for (const car of game.policeCars) {
    if (Math.hypot(car.x - player.x, car.z - player.z) <= OFFICER_SPAWN_METRES) {
      spawnOfficer(game, car);
      officerSpawnTimer = OFFICER_SPAWN_GAP;
      return;
    }
  }
}

function touchingPolice(game) {
  const player = game.player;
  for (const car of game.policeCars) {
    if (Math.hypot(car.x - player.x, car.z - player.z) <= BUST_TOUCH_METRES) return true;
  }
  for (const officer of game.officers) {
    if (officer.down) continue;
    if (Math.hypot(officer.x - player.x, officer.z - player.z) <= BUST_TOUCH_METRES) return true;
  }
  return false;
}

export function updatePolice(game, dt) {
  if (game.wanted <= 0) {
    removeAllPolice(game);
    game.bustTimer = 0;
    return;
  }
  ramCooldownLeft = Math.max(0, ramCooldownLeft - dt);
  patrolSpawnTimer -= dt;
  const target = Math.min(game.wanted, MAX_PATROL_CARS);
  if (game.policeCars.length < target && patrolSpawnTimer <= 0) {
    spawnPatrolCar(game);
    patrolSpawnTimer = PATROL_SPAWN_GAP;
  }
  for (const car of [...game.policeCars]) chaseInCar(game, car, dt);
  if (!game.player.inCar) maybeSendOfficer(game, dt);
  for (const officer of [...game.officers]) {
    if (!officer.down) chaseOnFoot(game, officer, dt);
  }
  // Arrest: the police must keep touching Raka while he is on foot.
  if (!game.player.inCar && touchingPolice(game)) {
    game.bustTimer += dt;
    if (game.bustTimer >= BUST_HOLD_SECONDS) {
      game.bustTimer = 0;
      game.requestBusted();
    }
  } else {
    game.bustTimer = Math.max(0, game.bustTimer - dt * 2);
  }
  // Drop officers Raka has long outrun so the street stays tidy.
  for (const officer of [...game.officers]) {
    if (Math.hypot(officer.x - game.player.x, officer.z - game.player.z) > 90) {
      game.scene.remove(officer.mesh);
      game.officers.splice(game.officers.indexOf(officer), 1);
    }
  }
}
