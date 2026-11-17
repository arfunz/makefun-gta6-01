// KOTA SENJA — pedestrians: the city's foot traffic.
// They stroll the sidewalks and run when a car or a fist comes close.

import * as THREE from 'three';
import { CITY, cityHalfSpan } from './config.js';
import { makeSeededRandom, randomRange, randomInt, pickFrom } from './random.js';

const SHIRT_COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xecf0f1, 0xe67e22];

function makePedMesh(shirtColor) {
  const group = new THREE.Group();
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.85, 0.36),
    new THREE.MeshLambertMaterial({ color: shirtColor }),
  );
  torso.position.y = 1.05;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xd9a066 }),
  );
  head.position.y = 1.72;
  head.castShadow = true;
  group.add(head);
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.62, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x2c3e50 }),
  );
  legs.position.y = 0.31;
  group.add(legs);
  return group;
}

function sidewalkPoint(rng, half) {
  const pitch = CITY.blockSize + CITY.streetWidth;
  const lines = [];
  for (let i = -CITY.blocksAcross; i <= CITY.blocksAcross; i += 1) {
    lines.push(i * pitch - CITY.streetWidth / 2);
  }
  const at = pickFrom(rng, lines);
  const along = randomRange(rng, -half + 10, half - 10);
  const offset = CITY.streetWidth / 2 + 2;
  if (rng() < 0.5) return { x: along, z: at + offset };
  return { x: at + offset, z: along };
}

export function spawnPedestrians(scene, count) {
  const rng = makeSeededRandom(9917);
  const half = cityHalfSpan();
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const spot = sidewalkPoint(rng, half);
    const mesh = makePedMesh(pickFrom(rng, SHIRT_COLORS));
    mesh.position.set(spot.x, 0, spot.z);
    scene.add(mesh);
    const dest = sidewalkPoint(rng, half);
    peds.push({
      mesh,
      x: spot.x,
      z: spot.z,
      heading: rng() * Math.PI * 2,
      speed: randomRange(rng, 1.1, 2.0),
      state: 'walk',
      targetX: dest.x,
      targetZ: dest.z,
      fleeTimer: 0,
      downTimer: 0,
      bobPhase: rng() * Math.PI * 2,
    });
  }
  return peds;
}

// ---- movement, fleeing and getting back up ----

export function updatePedestrians(peds, dt, ctx) {
  const half = cityHalfSpan();
  for (const ped of peds) {
    if (ped.state === 'down') {
      ped.downTimer -= dt;
      if (ped.downTimer <= 0) {
        ped.state = 'walk';
        ped.mesh.rotation.x = 0;
        ped.mesh.position.y = 0;
        const spot = sidewalkPoint(makeSeededRandom((Math.random() * 1e9) | 0), half);
        ped.x = spot.x;
        ped.z = spot.z;
        const dest = sidewalkPoint(makeSeededRandom((Math.random() * 1e9) | 0), half);
        ped.targetX = dest.x;
        ped.targetZ = dest.z;
      }
      continue;
    }
    // Flee a fast car or the player when they come too close.
    const threatDx = ped.x - ctx.threatX;
    const threatDz = ped.z - ctx.threatZ;
    const threatDist = Math.hypot(threatDx, threatDz);
    if (ctx.threatRadius > 0 && threatDist < ctx.threatRadius) {
      ped.state = 'flee';
      ped.fleeTimer = 1.6;
    }
    if (ped.state === 'flee') {
      ped.fleeTimer -= dt;
      const len = Math.max(0.01, threatDist);
      ped.x += (threatDx / len) * 5.5 * dt;
      ped.z += (threatDz / len) * 5.5 * dt;
      ped.heading = Math.atan2(threatDx / len, threatDz / len);
      if (ped.fleeTimer <= 0) ped.state = 'walk';
    } else {
      const dx = ped.targetX - ped.x;
      const dz = ped.targetZ - ped.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 2) {
        const dest = sidewalkPoint(makeSeededRandom((Math.random() * 1e9) | 0), half);
        ped.targetX = dest.x;
        ped.targetZ = dest.z;
      } else {
        ped.heading = Math.atan2(dx / dist, dz / dist);
        ped.x += (dx / dist) * ped.speed * dt;
        ped.z += (dz / dist) * ped.speed * dt;
      }
    }
    const clamped = { x: ped.x, z: ped.z };
    ped.x = Math.max(-half - 10, Math.min(half + 10, clamped.x));
    ped.z = Math.max(-half - 10, Math.min(half + 10, clamped.z));
    ped.mesh.position.set(ped.x, Math.abs(Math.sin(ped.bobPhase)) * 0.06, ped.z);
    ped.mesh.rotation.y = ped.heading;
    ped.bobPhase += dt * (ped.state === 'flee' ? 14 : 7);
  }
}
