// KOTA SENJA — the city itself: streets, buildings, palms, harbor.
// One seeded build lays out the whole map; everything else in the game
// reads the colliders and road lines this module returns.

import * as THREE from 'three';
import { CITY, SUNSET, cityHalfSpan } from './config.js';
import { makeSeededRandom, randomRange, randomInt, pickFrom, chance } from './random.js';

function makeWindowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#20242e';
  ctx.fillRect(0, 0, 128, 256);
  const rng = makeSeededRandom(20261117);
  for (let row = 0; row < 12; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const lit = rng() < 0.55;
      ctx.fillStyle = lit ? (rng() < 0.7 ? '#ffd27a' : '#9fd8ff') : '#2c3242';
      ctx.fillRect(8 + col * 20, 10 + row * 20, 12, 12);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makePalmTree(trunkMaterial, crownMaterial) {
  const palm = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 5.4, 6), trunkMaterial);
  trunk.position.y = 2.7;
  trunk.rotation.z = 0.08;
  palm.add(trunk);
  for (let i = 0; i < 6; i += 1) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.4, 4), crownMaterial);
    const angle = (i / 6) * Math.PI * 2;
    frond.position.set(Math.cos(angle) * 1.1, 5.6, Math.sin(angle) * 1.1);
    frond.rotation.z = Math.cos(angle) * 1.1;
    frond.rotation.x = -Math.sin(angle) * 1.1;
    frond.scale.set(1, 1, 0.28);
    palm.add(frond);
  }
  return palm;
}

export function buildCity(scene) {
  const rng = makeSeededRandom(777001);
  const half = cityHalfSpan();
  const colliders = [];
  const streetCenterlines = [];
  const carSpots = [];
  const palmSpots = [];

  const windowTexture = makeWindowTexture();
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x8a7a5e });
  const roadMat = new THREE.MeshLambertMaterial({ color: SUNSET.roadColor });
  const walkMat = new THREE.MeshLambertMaterial({ color: SUNSET.sidewalkColor });
  const waterMat = new THREE.MeshLambertMaterial({ color: SUNSET.waterColor });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
  const crownMat = new THREE.MeshLambertMaterial({ color: 0x2f7a3d });

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 260, half * 2 + 120), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(20, -0.05, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(120, half * 2 + 120), waterMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(CITY.harborX + 60, 0.02, 0);
  sea.receiveShadow = true;
  scene.add(sea);

  const pitch = CITY.blockSize + CITY.streetWidth;
  for (let i = -CITY.blocksAcross; i <= CITY.blocksAcross; i += 1) {
    const at = i * pitch - CITY.streetWidth / 2;
    streetCenterlines.push({ axis: 'x', at });
    streetCenterlines.push({ axis: 'z', at });
    const roadX = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 40, CITY.streetWidth), roadMat);
    roadX.rotation.x = -Math.PI / 2;
    roadX.position.set(0, 0, at);
    roadX.receiveShadow = true;
    scene.add(roadX);
    const roadZ = new THREE.Mesh(new THREE.PlaneGeometry(CITY.streetWidth, half * 2 + 40), roadMat);
    roadZ.rotation.x = -Math.PI / 2;
    roadZ.position.set(at, 0, 0);
    roadZ.receiveShadow = true;
    scene.add(roadZ);
  }

  // Crosswalk stripes where streets meet.
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xd8d2c4 });
  for (let i = -CITY.blocksAcross; i <= CITY.blocksAcross; i += 1) {
    for (let j = -CITY.blocksAcross; j <= CITY.blocksAcross; j += 1) {
      const cx = i * pitch - CITY.streetWidth / 2;
      const cz = j * pitch - CITY.streetWidth / 2;
      for (let s = -2; s <= 2; s += 1) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 5), stripeMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(cx + s * 2.6, 0.03, cz - CITY.streetWidth / 2 - 1);
        scene.add(stripe);
      }
    }
  }

  // Buildings fill every block; each block holds one to four towers.
  const blockCenters = [];
  for (let bx = 0; bx < CITY.blocksAcross; bx += 1) {
    for (let bz = 0; bz < CITY.blocksAcross; bz += 1) {
      const cx = (bx - (CITY.blocksAcross - 1) / 2) * pitch + pitch / 2 - CITY.streetWidth / 2;
      const cz = (bz - (CITY.blocksAcross - 1) / 2) * pitch + pitch / 2 - CITY.streetWidth / 2;
      blockCenters.push({ x: cx, z: cz });
    }
  }
  for (const block of blockCenters) {
    const count = randomInt(rng, 1, 3);
    for (let k = 0; k < count; k += 1) {
      const w = randomRange(rng, 12, 20);
      const d = randomRange(rng, 12, 20);
      const h = randomRange(rng, 10, 42);
      const ox = randomRange(rng, -8, 8);
      const oz = randomRange(rng, -8, 8);
      const color = pickFrom(rng, SUNSET.buildingPalette);
      const material = new THREE.MeshLambertMaterial({ color, emissive: 0x1a1208 });
      const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      building.position.set(block.x + ox, h / 2, block.z + oz);
      building.castShadow = true;
      building.receiveShadow = true;
      scene.add(building);
      const windows = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.92, h * 0.94),
        new THREE.MeshBasicMaterial({ map: windowTexture, transparent: true }),
      );
      windows.position.set(block.x + ox, h / 2, block.z + oz + d / 2 + 0.06);
      scene.add(windows);
      const windowsBack = windows.clone();
      windowsBack.position.z = block.z + oz - d / 2 - 0.06;
      windowsBack.rotation.y = Math.PI;
      scene.add(windowsBack);
      colliders.push({
        minX: block.x + ox - w / 2,
        maxX: block.x + ox + w / 2,
        minZ: block.z + oz - d / 2,
        maxZ: block.z + oz + d / 2,
      });
    }
  }

  // Palms line the sidewalks; streetlights warm the corners.
  for (let i = -CITY.blocksAcross; i <= CITY.blocksAcross; i += 1) {
    for (let j = -CITY.blocksAcross; j <= CITY.blocksAcross; j += 1) {
      const cx = i * pitch - CITY.streetWidth / 2;
      const cz = j * pitch - CITY.streetWidth / 2;
      if (chance(rng, 0.6)) {
        const palm = makePalmTree(trunkMat, crownMat);
        palm.position.set(cx + CITY.streetWidth / 2 + 2.5, 0, cz + CITY.streetWidth / 2 + 2.5);
        palm.rotation.y = rng() * Math.PI * 2;
        scene.add(palm);
        palmSpots.push({ x: palm.position.x, z: palm.position.z });
      }
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.2, 6), new THREE.MeshLambertMaterial({ color: 0x2c2c34 }));
      pole.position.y = 2.6;
      lamp.add(pole);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffd9a0 }),
      );
      bulb.position.y = 5.3;
      lamp.add(bulb);
      lamp.position.set(cx - CITY.streetWidth / 2 - 2.5, 0, cz - CITY.streetWidth / 2 - 2.5);
      scene.add(lamp);
    }
  }

  // Harbor: pier, crates and moored boats east of the city.
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x7a5c40 });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(46, 1.2, 14), pierMat);
  pier.position.set(CITY.harborX + 8, 0.6, 40);
  pier.castShadow = true;
  pier.receiveShadow = true;
  scene.add(pier);
  colliders.push({ minX: CITY.harborX - 15, maxX: CITY.harborX + 31, minZ: 33, maxZ: 47 });
  const crateMat = new THREE.MeshLambertMaterial({ color: 0xa8763e });
  for (let i = 0; i < 10; i += 1) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), crateMat);
    crate.position.set(
      CITY.harborX - 6 + randomRange(rng, -8, 8),
      1.1,
      40 + randomRange(rng, -5, 5),
    );
    crate.rotation.y = rng() * Math.PI;
    crate.castShadow = true;
    scene.add(crate);
  }
  const boatMat = new THREE.MeshLambertMaterial({ color: 0xe8e0d0 });
  for (let i = 0; i < 3; i += 1) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 9), boatMat);
    hull.position.y = 0.4;
    boat.add(hull);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 3), new THREE.MeshLambertMaterial({ color: 0x3a6ea8 }));
    cabin.position.set(0, 1.8, -1);
    boat.add(cabin);
    boat.position.set(CITY.harborX + 24 + i * 14, 0, -30 + i * 34);
    boat.rotation.y = 0.2;
    scene.add(boat);
  }

  // Parked cars the player can steal, placed along the roads.
  for (let i = 0; i < 8; i += 1) {
    const line = streetCenterlines[randomInt(rng, 0, streetCenterlines.length - 1)];
    const along = randomRange(rng, -half + 20, half - 20);
    if (line.axis === 'x') carSpots.push({ x: along, z: line.at + 4.4 });
    else carSpots.push({ x: line.at + 4.4, z: along });
  }

  // A distant skyline silhouette for depth at the world edge.
  const skylineMat = new THREE.MeshBasicMaterial({ color: 0x4a3a6e });
  for (let i = 0; i < 10; i += 1) {
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(randomRange(rng, 18, 34), randomRange(rng, 40, 80), 18),
      skylineMat,
    );
    tower.position.set(-half - 60 - i * 4, tower.geometry.parameters.height / 2, -half + i * 34);
    scene.add(tower);
  }

  return {
    colliders,
    streetCenterlines,
    carSpots,
    palmSpots,
    half,
  };
}

export function clampToCity(x, z) {
  const half = cityHalfSpan();
  return {
    x: Math.max(-half - 30, Math.min(CITY.harborX + 46, x)),
    z: Math.max(-half - 30, Math.min(half + 30, z)),
  };
}
