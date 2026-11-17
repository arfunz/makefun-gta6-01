// Police: white cars with a blue light bar that chase the player when the
// wanted level is up, and the wanted level itself (it rises on crime and
// decays once the player keeps clean for a while).
import { WANTED } from './config.js';
import { makeCar } from './vehicles.js';
import { randomRoadPoint } from './world.js';

// A police car appearing on a road 40 to 70 units from the player.
function spawnPoliceNear(G) {
  const p = G.player;
  let x = p.x + 45;
  let z = p.z;
  for (let tries = 0; tries < 12; tries++) {
    const spot = randomRoadPoint(G.rng);
    const d = Math.hypot(spot.x - p.x, spot.z - p.z);
    if (d > 40 && d < 70) {
      x = spot.x;
      z = spot.z;
      break;
    }
  }
  const car = makeCar(x, z, 0, 0xf2f2f2, 'police');
  car.targetSpeed = 26;
  car.speed = 20;
  return car;
}

// Keep the number of police cars on the street equal to the wanted level
// (at most three), spawning them near the player or standing them down.
export function ensurePolice(G) {
  const want = Math.min(G.wanted, WANTED.policeMax);
  while (G.policeCars.length < want) {
    const car = spawnPoliceNear(G);
    G.policeCars.push(car);
    G.scene.add(car.mesh);
    G.allCars.push(car);
  }
  while (G.policeCars.length > want) {
    const car = G.policeCars.pop();
    G.scene.remove(car.mesh);
    const i = G.allCars.indexOf(car);
    if (i >= 0) G.allCars.splice(i, 1);
  }
}

// Chase the player, ram them, and take health on contact.
export function updatePolice(G, dt) {
  ensurePolice(G);
  const p = G.player;
  for (const car of G.policeCars) {
    const tx = p.inCar && p.car ? p.car.x : p.x;
    const tz = p.inCar && p.car ? p.car.z : p.z;
    const dx = tx - car.x;
    const dz = tz - car.z;
    const d = Math.hypot(dx, dz);
    if (d < 1.2) continue;
    const target = Math.atan2(dx, dz);
    let dh = target - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    car.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, dh));
    car.speed += (car.targetSpeed - car.speed) * Math.min(1, 1.2 * dt);
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    if (d < 3.2) {
      // Ram: shove the player and take health.
      const pushX = (dx / d) * 3;
      const pushZ = (dz / d) * 3;
      if (p.inCar && p.car) {
        p.car.x += pushX;
        p.car.z += pushZ;
        p.car.speed *= 0.55;
      } else {
        p.x += pushX;
        p.z += pushZ;
        p.health = Math.max(0, p.health - 3);
        if (p.health <= 0 && G.mode === 'playing') {
          G.mode = 'wasted';
          G.hud.showOverlay('wasted');
        }
      }
      car.speed *= 0.5;
    }
  }
}

// Wanted decays one star at a time while the player stays clean: the
// first star drops after decayDelay, then one every decayStep.
export function decayWanted(G, dt) {
  if (G.wanted <= 0) return;
  G.decayAcc += dt;
  if (G.decayAcc < WANTED.decayDelay) return;
  G.decayAcc = Math.max(0, WANTED.decayDelay - WANTED.decayStep);
  G.wanted -= 1;
  ensurePolice(G);
  if (G.wanted === 0) G.hud.showToast('Polisi kehilangan jejakmu.');
}

export function addWanted(G, n) {
  if (G.wanted >= WANTED.maxStars) return;
  G.wanted = Math.min(WANTED.maxStars, G.wanted + n);
  if (G.wanted > G.maxWanted) G.maxWanted = G.wanted;
  G.decayAcc = 0;
  ensurePolice(G);
  G.hud.showToast('Wanted naik! Polisi mengejarmu.');
}
