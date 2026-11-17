// Pedestrians: people strolling the sidewalks, each ambling toward a
// sidewalk waypoint and picking a new one when they arrive.
import * as THREE from 'three';
import { PED_COUNT, COLORS } from './config.js';
import { randomSidewalkPoint } from './world.js';

export function makePedMesh(shirt, skin) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.85, 0.34),
    new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.9 }),
  );
  body.position.y = 0.95;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 10, 8),
    new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 }),
  );
  head.position.y = 1.62;
  head.castShadow = true;
  g.add(head);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x22222a, roughness: 1 });
  for (const lx of [-0.14, 0.14]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.22), legMat);
    leg.position.set(lx, 0.28, 0);
    g.add(leg);
  }
  return g;
}

export function spawnPeds(city, rng, count = PED_COUNT) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const p = randomSidewalkPoint(rng);
    const t = randomSidewalkPoint(rng);
    const mesh = makePedMesh(rng.pick(COLORS.shirts), rng.pick(COLORS.skin));
    mesh.position.set(p.x, 0, p.z);
    peds.push({
      x: p.x,
      z: p.z,
      heading: rng.range(0, Math.PI * 2),
      speed: rng.range(1.1, 1.9),
      targetX: t.x,
      targetZ: t.z,
      mesh,
      down: false,
      downTimer: 0,
    });
  }
  return peds;
}

export function updatePeds(peds, dt, rng) {
  for (const p of peds) {
    if (p.down) {
      p.downTimer -= dt;
      if (p.downTimer <= 0) {
        p.down = false;
        p.mesh.rotation.x = 0;
        p.mesh.position.y = 0;
        const t = randomSidewalkPoint(rng);
        p.targetX = t.x;
        p.targetZ = t.z;
      }
      continue;
    }
    if (p.speed <= 0) continue; // staged for a screenshot: stand still
    const dx = p.targetX - p.x;
    const dz = p.targetZ - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 1.2) {
      const t = randomSidewalkPoint(rng);
      p.targetX = t.x;
      p.targetZ = t.z;
      continue;
    }
    p.heading = Math.atan2(dx, dz);
    p.x += (dx / d) * p.speed * dt;
    p.z += (dz / d) * p.speed * dt;
    p.mesh.position.set(p.x, Math.abs(Math.sin((p.x + p.z) * 2)) * 0.04, p.z);
    p.mesh.rotation.y = p.heading;
  }
}

// A punch knocks a pedestrian down; they get up after a few seconds.
export function knockDown(ped) {
  ped.down = true;
  ped.downTimer = 6;
  ped.mesh.rotation.x = -Math.PI / 2;
  ped.mesh.position.y = 0.3;
}
