// Traffic: cars that cruise the road grid, turning at intersections and
// slowing for the car ahead. They stay on their lane, so they never need
// the building colliders.
import { TRAFFIC_COUNT, COLORS, ROADS } from './config.js';
import { makeCar } from './vehicles.js';

// Right-hand traffic: the lane offset from a road's centre line.
function laneOffset(axis, dir) {
  if (axis === 'x') return dir > 0 ? 2 : -2;
  return dir > 0 ? -2 : 2;
}

// The heading that drives along an axis in a direction.
function headingOf(axis, dir) {
  if (axis === 'x') return dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  return dir > 0 ? 0 : Math.PI;
}

export function spawnTraffic(city, rng, count = TRAFFIC_COUNT) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const axis = rng.pick(['x', 'z']);
    const dir = rng.pick([1, -1]);
    const lane = rng.pick(ROADS);
    const along = rng.range(-120, 180);
    const x = axis === 'x' ? along : lane + laneOffset(axis, dir);
    const z = axis === 'x' ? lane + laneOffset(axis, dir) : along;
    const car = makeCar(x, z, headingOf(axis, dir), rng.pick(COLORS.cars), 'traffic');
    car.axis = axis;
    car.dir = dir;
    car.lane = lane;
    car.targetSpeed = rng.range(7, 11);
    car.speed = car.targetSpeed;
    car.cool = 0;
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(cars, dt, city, others) {
  for (const car of cars) {
    if (car.driven) continue;
    car.cool -= dt;
    // Slow for the car ahead on the same lane.
    let gap = 99;
    for (const o of cars) {
      if (o === car || o.axis !== car.axis || o.lane !== car.lane || o.dir !== car.dir) continue;
      const g = (o.x - car.x) * (car.axis === 'x' ? car.dir : 0) + (o.z - car.z) * (car.axis === 'z' ? car.dir : 0);
      if (g > 0 && g < gap) gap = g;
    }
    if (gap < 8) car.speed = Math.max(0, Math.min(car.speed, 4));
    else if (car.targetSpeed > 0) car.speed += Math.sign(car.targetSpeed - car.speed) * 8 * dt;
    else car.speed = Math.max(0, car.speed - 10 * dt);
    if (car.axis === 'x') car.x += car.dir * car.speed * dt;
    else car.z += car.dir * car.speed * dt;
    car.heading = headingOf(car.axis, car.dir);
    // Off the map: turn around.
    const pos = car.axis === 'x' ? car.x : car.z;
    if (pos < -135 || pos > 205) {
      car.dir *= -1;
      car.cool = 3;
      car.heading = headingOf(car.axis, car.dir);
    }
    // Intersection: turn or go straight.
    if (car.cool <= 0) {
      const along = car.axis === 'x' ? car.x : car.z;
      for (const cross of ROADS) {
        if (Math.abs(along - cross) >= 1 || Math.abs(along - cross) < 0.2) continue;
        const roll = city.rng.next();
        if (roll >= 0.45) break; // straight on
        const left = roll < 0.225;
        const newAxis = car.axis === 'x' ? 'z' : 'x';
        let newDir;
        if (car.axis === 'x' && car.dir > 0) newDir = left ? -1 : 1;
        else if (car.axis === 'x') newDir = left ? 1 : -1;
        else if (car.axis === 'z' && car.dir > 0) newDir = left ? 1 : -1;
        else newDir = left ? -1 : 1;
        car.axis = newAxis;
        car.dir = newDir;
        car.lane = cross;
        if (newAxis === 'x') car.z = cross + laneOffset('x', newDir);
        else car.x = cross + laneOffset('z', newDir);
        car.heading = headingOf(newAxis, newDir);
        car.cool = 2.5;
        break;
      }
    }
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
  }
}
