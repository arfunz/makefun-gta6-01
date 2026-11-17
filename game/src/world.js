// The city of Kota Senja: a fixed seeded grid of roads, blocks, buildings
// with lit windows, palms, lamps and crosswalks, plus the colliders the
// cars and the player bounce off. Everything here is deterministic.
import * as THREE from 'three';
import { WORLD, ROADS, COLORS, SEED } from './config.js';
import { makeRng } from './random.js';

// One lit-window texture per facade colour, drawn on a canvas with a
// dedicated seed so the same colour always gets the same windows.
const facadeCache = new Map();
function facadeTexture(color) {
  if (facadeCache.has(color)) return facadeCache.get(color);
  const trng = makeRng(SEED + color);
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  g.fillRect(0, 0, 128, 256);
  for (let y = 12; y < 244; y += 24) {
    for (let x = 10; x < 118; x += 22) {
      const lit = trng.next() < 0.55;
      g.fillStyle = lit ? '#ffd97a' : '#20222e';
      g.fillRect(x, y, 14, 16);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  facadeCache.set(color, tex);
  return tex;
}

export function buildCity(scene, rng) {
  const city = {
    colliders: [],
    roadsX: ROADS.slice(),
    roadsZ: ROADS.slice(),
    spawn: { x: -8, z: 51 },
    waterZ: WORLD.waterZ,
    bounds: WORLD,
    rng,
  };
  const cx = (WORLD.minX + WORLD.maxX) / 2;
  const cz = (WORLD.minZ + WORLD.maxZ) / 2;
  const w = WORLD.maxX - WORLD.minX;
  const d = WORLD.maxZ - WORLD.minZ;

  // Ground, one dark slab for the whole map.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(w + 220, d + 280),
    new THREE.MeshStandardMaterial({ color: COLORS.ground, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(cx, 0, cz);
  ground.receiveShadow = true;
  scene.add(ground);

  // The sea, a flat dark-blue sheet along the south edge.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(640, 240),
    new THREE.MeshBasicMaterial({ color: COLORS.water }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(cx, -0.2, WORLD.waterZ + 120);
  scene.add(water);

  // Roads and their sidewalks, one strip per centre line.
  const roadMat = new THREE.MeshStandardMaterial({ color: COLORS.road, roughness: 1 });
  const walkMat = new THREE.MeshStandardMaterial({ color: COLORS.walk, roughness: 1 });
  for (const z of ROADS) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(w, WORLD.roadHalf * 2), roadMat);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(cx, 0.01, z);
    strip.receiveShadow = true;
    scene.add(strip);
    for (const side of [-1, 1]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(w, WORLD.walk), walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(cx, 0.02, z + side * (WORLD.roadHalf + WORLD.walk / 2));
      walk.receiveShadow = true;
      scene.add(walk);
    }
  }
  for (const x of ROADS) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadHalf * 2, d), roadMat);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(x, 0.015, cz);
    strip.receiveShadow = true;
    scene.add(strip);
    for (const side of [-1, 1]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.walk, d), walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(x + side * (WORLD.roadHalf + WORLD.walk / 2), 0.025, cz);
      walk.receiveShadow = true;
      scene.add(walk);
    }
  }

  // Crosswalk stripes at every intersection.
  const crossMat = new THREE.MeshBasicMaterial({ color: COLORS.cross });
  for (const x of ROADS) {
    for (const z of ROADS) {
      for (let i = -2; i <= 2; i++) {
        const a = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 3.2), crossMat);
        a.position.set(x + i * 2.2, 0.03, z - WORLD.roadHalf - 1);
        scene.add(a);
        const b = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.04, 1.2), crossMat);
        b.position.set(x - WORLD.roadHalf - 1, 0.03, z + i * 2.2);
        scene.add(b);
      }
    }
  }

  // Buildings: one or two per block, each with a lit-window facade, and a
  // collider so cars and the player cannot drive through them.
  const roofMat = new THREE.MeshStandardMaterial({ color: COLORS.roofs, roughness: 1 });
  for (let xi = 0; xi < ROADS.length - 1; xi++) {
    for (let zi = 0; zi < ROADS.length - 1; zi++) {
      const bx0 = ROADS[xi] + 11;
      const bx1 = ROADS[xi + 1] - 11;
      const bz0 = ROADS[zi] + 11;
      const bz1 = ROADS[zi + 1] - 11;
      const n = rng.chance(0.35) ? 2 : 1;
      for (let b = 0; b < n; b++) {
        const bw = rng.range(8, 13);
        const bd = rng.range(8, 13);
        const bh = rng.range(10, 38);
        const px = bx0 + (bx1 - bx0) * (n === 1 ? 0.5 : b === 0 ? 0.28 : 0.72);
        const pz = bz0 + (bz1 - bz0) * (n === 1 ? 0.5 : b === 0 ? 0.68 : 0.32);
        const color = rng.pick(COLORS.facades);
        const side = new THREE.MeshStandardMaterial({ map: facadeTexture(color), roughness: 0.85 });
        const box = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), [side, side, roofMat, roofMat, side, side]);
        box.position.set(px, bh / 2, pz);
        box.castShadow = true;
        box.receiveShadow = true;
        scene.add(box);
        city.colliders.push({ x0: px - bw / 2 - 0.4, z0: pz - bd / 2 - 0.4, x1: px + bw / 2 + 0.4, z1: pz + bd / 2 + 0.4 });
      }
    }
  }

  // Palms along the sidewalks, every second road.
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 1 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x2a7a3a, roughness: 1 });
  function palm(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 4.2, 7), trunkMat);
    trunk.position.y = 2.1;
    trunk.castShadow = true;
    g.add(trunk);
    for (let i = 0; i < 5; i++) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.6, 4), frondMat);
      const a = (i / 5) * Math.PI * 2;
      frond.position.set(Math.cos(a) * 0.9, 4.4, Math.sin(a) * 0.9);
      frond.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
      frond.castShadow = true;
      g.add(frond);
    }
    g.position.set(x, 0, z);
    scene.add(g);
  }
  for (let ri = 0; ri < ROADS.length; ri += 2) {
    const z = ROADS[ri];
    for (let x = WORLD.minX + 24; x < WORLD.maxX - 12; x += 40) {
      if (ROADS.some((r) => Math.abs(x - r) < 12)) continue;
      if (rng.chance(0.5)) palm(x, z + 8.5);
      if (rng.chance(0.5)) palm(x + 20, z - 8.5);
    }
  }

  // Lamps at every second intersection.
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x30303a, roughness: 0.8 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffe9a8, emissiveIntensity: 1.2 });
  for (let xi = 0; xi < ROADS.length; xi++) {
    for (let zi = 0; zi < ROADS.length; zi++) {
      if ((xi + zi) % 2 !== 0) continue;
      const x = ROADS[xi] + 8.5;
      const z = ROADS[zi] + 8.5;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.2, 6), poleMat);
      pole.position.set(x, 2.6, z);
      scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), lampMat);
      lamp.position.set(x, 5.3, z);
      scene.add(lamp);
    }
  }
  return city;
}

// Push a circle out of every building collider it overlaps.
export function resolveCircle(x, z, r, colliders) {
  let hit = false;
  for (const c of colliders) {
    const nx = Math.max(c.x0, Math.min(x, c.x1));
    const nz = Math.max(c.z0, Math.min(z, c.z1));
    const dx = x - nx;
    const dz = z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    hit = true;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      x = nx + (dx / d) * r;
      z = nz + (dz / d) * r;
    } else {
      // Centre inside the box: push out along the smallest penetration.
      const pl = x - c.x0;
      const pr = c.x1 - x;
      const pt = z - c.z0;
      const pb = c.z1 - z;
      const m = Math.min(pl, pr, pt, pb);
      if (m === pl) x = c.x0 - r;
      else if (m === pr) x = c.x1 + r;
      else if (m === pt) z = c.z0 - r;
      else z = c.z1 + r;
    }
  }
  return { x, z, hit };
}

export function onRoad(x, z) {
  for (const r of ROADS) {
    if (Math.abs(z - r) <= WORLD.roadHalf + 0.5) return true;
    if (Math.abs(x - r) <= WORLD.roadHalf + 0.5) return true;
  }
  return false;
}

export function randomSidewalkPoint(rng) {
  const axis = rng.pick(['x', 'z']);
  const line = rng.pick(ROADS);
  const side = rng.pick([1, -1]) * (WORLD.roadHalf + WORLD.walk / 2);
  if (axis === 'x') return { x: rng.range(WORLD.minX + 10, WORLD.maxX - 10), z: line + side };
  return { x: line + side, z: rng.range(WORLD.minZ + 10, WORLD.maxZ - 10) };
}

export function randomRoadPoint(rng) {
  const axis = rng.pick(['x', 'z']);
  const line = rng.pick(ROADS);
  if (axis === 'x') return { x: rng.range(WORLD.minX + 10, WORLD.maxX - 10), z: line };
  return { x: line, z: rng.range(WORLD.minZ + 10, WORLD.maxZ - 10) };
}
