// KOTA SENJA — cars: mesh factory plus arcade driving physics.
// One module builds every car (player, traffic, police) and moves them.

import * as THREE from 'three';
import { CAR_TUNING } from './config.js';

const CAR_COLORS = [0xc0392b, 0x2e86c1, 0xf1c40f, 0x7d3c98, 0x16a085, 0xe67e22, 0xecf0f1, 0x2c3e50];

export function carColorAt(index) {
  return CAR_COLORS[index % CAR_COLORS.length];
}

export function makeCarMesh(color, isPolice) {
  const group = new THREE.Group();
  const bodyColor = isPolice ? 0x1c2733 : color;
  const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.72, 4.4), bodyMat);
  body.position.y = 0.62;
  body.castShadow = true;
  group.add(body);
  const cabinMat = new THREE.MeshLambertMaterial({ color: isPolice ? 0x2c3e50 : 0x22303c });
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.62, 2.2), cabinMat);
  cabin.position.set(0, 1.24, -0.25);
  cabin.castShadow = true;
  group.add(cabin);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(wx, 0.42, wz);
    group.add(wheel);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const hx of [-0.7, 0.7]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.1), headMat);
    head.position.set(hx, 0.66, 2.22);
    group.add(head);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2d2d });
  for (const tx of [-0.7, 0.7]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.1), tailMat);
    tail.position.set(tx, 0.66, -2.22);
    group.add(tail);
  }
  if (isPolice) {
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f5 });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.3, 4.42), stripeMat);
    stripe.position.y = 0.86;
    group.add(stripe);
    const barMat = new THREE.MeshBasicMaterial({ color: 0x2244ff });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.5), barMat);
    bar.position.set(0, 1.66, -0.25);
    group.add(bar);
    group.userData.lightBar = bar;
  }
  return group;
}

export function createCar(scene, x, z, heading, color, kind) {
  const isPolice = kind === 'police';
  const mesh = makeCarMesh(color, isPolice);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  return {
    mesh,
    kind,
    x,
    z,
    heading,
    speed: 0,
    steer: 0,
    radius: CAR_TUNING.radius,
    color,
    loop: null,
    loopIndex: 0,
    loopDir: 1,
    targetSpeed: 0,
    stuckTime: 0,
    flashTimer: 0,
  };
}

export function carForward(car) {
  return { x: Math.sin(car.heading), z: Math.cos(car.heading) };
}

export function resolveCircleColliders(x, z, radius, colliders) {
  let nx = x;
  let nz = z;
  for (const box of colliders) {
    const closestX = Math.max(box.minX, Math.min(nx, box.maxX));
    const closestZ = Math.max(box.minZ, Math.min(nz, box.maxZ));
    const dx = nx - closestX;
    const dz = nz - closestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq < radius * radius) {
      if (distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        nx = closestX + (dx / dist) * radius;
        nz = closestZ + (dz / dist) * radius;
      } else {
        nz = box.maxZ + radius;
      }
    }
  }
  return { x: nx, z: nz };
}

// ---- arcade driving for the player's car ----

export function drivePlayerCar(car, axes, dt, colliders, allCars) {
  const forward = axes.forward;
  const steerInput = axes.strafe;
  if (forward > 0) {
    car.speed += CAR_TUNING.accel * dt;
  } else if (forward < 0) {
    if (car.speed > 0.5) car.speed -= CAR_TUNING.brake * dt;
    else car.speed -= CAR_TUNING.reverseAccel * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 14 * dt);
  }
  car.speed = Math.max(-CAR_TUNING.maxReverse, Math.min(CAR_TUNING.maxSpeed, car.speed));
  const speedRatio = Math.abs(car.speed) / CAR_TUNING.maxSpeed;
  const moving = Math.min(1, Math.abs(car.speed) / 6);
  const steerAmount = steerInput * CAR_TUNING.steerRate * (0.4 + 0.6 * (1 - speedRatio)) * moving;
  car.heading += steerAmount * dt * (car.speed >= 0 ? 1 : -1);
  const fwd = carForward(car);
  let nextX = car.x + fwd.x * car.speed * dt;
  let nextZ = car.z + fwd.z * car.speed * dt;
  const resolved = resolveCircleColliders(nextX, nextZ, car.radius, colliders);
  const hitWall = resolved.x !== nextX || resolved.z !== nextZ;
  if (hitWall) car.speed *= 0.55;
  car.x = resolved.x;
  car.z = resolved.z;
  // Soft push between cars so they never overlap.
  for (const other of allCars) {
    if (other === car) continue;
    const dx = car.x - other.x;
    const dz = car.z - other.z;
    const dist = Math.hypot(dx, dz);
    const minDist = car.radius + other.radius;
    if (dist > 0.01 && dist < minDist) {
      const push = (minDist - dist) / 2;
      car.x += (dx / dist) * push;
      car.z += (dz / dist) * push;
      other.x -= (dx / dist) * push;
      other.z -= (dz / dist) * push;
      car.speed *= 0.8;
    }
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  return { hitWall, speedRatio };
}

export function removeCarMesh(scene, car) {
  scene.remove(car.mesh);
}
