// KOTA SENJA — traffic: ordinary cars looping the city streets.
// They follow rectangular loops around blocks and slow for the car ahead.

import { createCar, carForward } from './vehicles.js';
import { CITY, cityHalfSpan } from './config.js';
import { makeSeededRandom, randomInt, pickFrom } from './random.js';

function loopAroundBlock(cx, cz, halfSize, dir) {
  const pts = [
    { x: cx - halfSize, z: cz - halfSize },
    { x: cx + halfSize, z: cz - halfSize },
    { x: cx + halfSize, z: cz + halfSize },
    { x: cx - halfSize, z: cz + halfSize },
  ];
  return dir > 0 ? pts : pts.slice().reverse();
}

export function spawnTraffic(scene, colliders, count) {
  const rng = makeSeededRandom(4451);
  const cars = [];
  const pitch = CITY.blockSize + CITY.streetWidth;
  const half = cityHalfSpan();
  for (let i = 0; i < count; i += 1) {
    const bx = randomInt(rng, 0, CITY.blocksAcross - 1);
    const bz = randomInt(rng, 0, CITY.blocksAcross - 1);
    const cx = (bx - (CITY.blocksAcross - 1) / 2) * pitch + pitch / 2 - CITY.streetWidth / 2;
    const cz = (bz - (CITY.blocksAcross - 1) / 2) * pitch + pitch / 2 - CITY.streetWidth / 2;
    const dir = rng() < 0.5 ? 1 : -1;
    const loop = loopAroundBlock(cx, cz, pitch / 2 + CITY.streetWidth / 2, dir);
    const start = loop[0];
    const color = pickFrom(rng, [0xc0392b, 0x2e86c1, 0xf1c40f, 0x7d3c98, 0x16a085, 0xe67e22, 0xecf0f1]);
    const car = createCar(scene, start.x, start.z, 0, color, 'traffic');
    car.loop = loop;
    car.loopIndex = 1;
    car.loopDir = dir;
    car.targetSpeed = 8 + rng() * 5;
    car.speed = car.targetSpeed;
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(cars, dt, colliders) {
  for (const car of cars) {
    const target = car.loop[car.loopIndex % car.loop.length];
    const dx = target.x - car.x;
    const dz = target.z - car.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 3) {
      car.loopIndex += 1;
      continue;
    }
    const wantHeading = Math.atan2(dx, dz);
    let diff = wantHeading - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    let desired = car.targetSpeed;
    for (const other of cars) {
      if (other === car) continue;
      const ox = other.x - car.x;
      const oz = other.z - car.z;
      const forward = carForward(car);
      const ahead = ox * forward.x + oz * forward.z;
      const side = Math.abs(ox * forward.z - oz * forward.x);
      if (ahead > 0 && ahead < 9 && side < 2.4) {
        desired = Math.min(desired, Math.max(0, other.speed - 1));
      }
    }
    car.speed += (desired - car.speed) * Math.min(1, dt * 2.5);
    const fwd = carForward(car);
    car.x += fwd.x * car.speed * dt;
    car.z += fwd.z * car.speed * dt;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
  }
}

// ---- queries used by police and missions ----

export function nearestTrafficCar(cars, x, z, maxDistance) {
  let best = null;
  let bestDist = maxDistance;
  for (const car of cars) {
    const dist = Math.hypot(car.x - x, car.z - z);
    if (dist < bestDist) {
      bestDist = dist;
      best = car;
    }
  }
  return best;
}

export function countCarsNear(cars, x, z, radius) {
  let count = 0;
  for (const car of cars) {
    if (Math.hypot(car.x - x, car.z - z) < radius) count += 1;
  }
  return count;
}
