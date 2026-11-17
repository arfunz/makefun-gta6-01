// Cars: the meshes, the arcade driving model, and the nearest-car search.
// A car's front is its local +z, so a heading of t means it travels toward
// (sin t, cos t) on the ground.
import * as THREE from 'three';
import { CAR } from './config.js';
import { resolveCircle } from './world.js';

export function makeCarMesh(color, police = false) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.62, 4.2),
    new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.4 }),
  );
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.55, 2.1),
    new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.2, metalness: 0.6 }),
  );
  cabin.position.set(0, 1.1, -0.25);
  cabin.castShadow = true;
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
  for (const [wx, wz] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.36, wz);
    group.add(wheel);
  }
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffe9a0, emissiveIntensity: 0.8 });
  for (const wx of [-0.6, 0.6]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.1), headMat);
    head.position.set(wx, 0.6, 2.12);
    group.add(head);
  }
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xd42a2a, emissive: 0x8a1010, emissiveIntensity: 0.6 });
  for (const wx of [-0.6, 0.6]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.1), tailMat);
    tail.position.set(wx, 0.6, -2.12);
    group.add(tail);
  }
  if (police) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.18, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x2244ff, emissiveIntensity: 1.6 }),
    );
    bar.position.set(0, 1.45, -0.25);
    group.add(bar);
    group.userData.lightBar = bar;
  }
  return group;
}

import { ROADS, PARKED_COUNT, COLORS } from './config.js';

export function makeCar(x, z, heading, color, kind = 'traffic') {
  const mesh = makeCarMesh(color, kind === 'police');
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  return { x, z, heading, speed: 0, targetSpeed: 0, mesh, kind, color, stuckTime: 0, driven: false };
}

export function driveCar(car, throttle, steer, dt, colliders, others) {
  if (throttle > 0) car.speed += CAR.accel * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 0.5) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.accel * 0.6 * dt;
  } else {
    car.speed -= Math.sign(car.speed) * 6 * dt;
    if (Math.abs(car.speed) < 0.2) car.speed = 0;
  }
  car.speed = Math.max(-CAR.reverse, Math.min(CAR.top, car.speed));
  const turnRate = CAR.turn * Math.min(1, Math.abs(car.speed) / 8) * (car.speed >= 0 ? 1 : -1);
  car.heading += steer * turnRate * dt;
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const fixed = resolveCircle(nx, nz, CAR.radius, colliders);
  if (fixed.hit) car.speed *= 0.4;
  car.x = fixed.x;
  car.z = fixed.z;
  for (const o of others) {
    if (o === car) continue;
    const dx = car.x - o.x;
    const dz = car.z - o.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.01 && d < 3.4) {
      const push = (3.4 - d) / 2;
      car.x += (dx / d) * push;
      car.z += (dz / d) * push;
      car.speed *= 0.7;
    }
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
}

export function nearestCar(x, z, cars, maxDist) {
  let best = null;
  let bd = maxDist;
  for (const c of cars) {
    const d = Math.hypot(c.x - x, c.z - z);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best;
}

// Parked cars along the road edges. The first is Raka's own orange car,
// parked by the spawn point.
export function spawnParked(city, rng, count = PARKED_COUNT) {
  const cars = [];
  cars.push(makeCar(-2, 51, Math.PI / 2, 0xe87a2a, 'parked'));
  for (let i = 1; i < count; i++) {
    const axis = rng.pick(['x', 'z']);
    const lane = rng.pick(ROADS);
    const along = rng.range(-120, 180);
    const side = rng.pick([1, -1]);
    const x = axis === 'x' ? along : lane + side * 4.5;
    const z = axis === 'x' ? lane + side * 4.5 : along;
    const heading = axis === 'x' ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : (side > 0 ? 0 : Math.PI);
    cars.push(makeCar(x, z, heading, rng.pick(COLORS.cars), 'parked'));
  }
  return cars;
}
