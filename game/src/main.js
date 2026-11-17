// KOTA SENJA — the game loop, the state, the menus and the debug handles
// the screenshot staging scripts use.
import * as THREE from 'three';
import { SEED, SHOT_ROAD_Z, SHOT_ANCHOR_X, WANTED } from './config.js';
import { makeRng } from './random.js';
import { buildCity } from './world.js';
import { spawnParked } from './vehicles.js';
import { spawnTraffic, updateTraffic } from './traffic.js';
import { spawnPeds, updatePeds } from './pedestrians.js';
import { ensurePolice, updatePolice, decayWanted } from './police.js';
import { createPlayer, updatePlayer, enterCar, exitCar, respawnPlayer } from './player.js';
import { punch, shoot } from './combat.js';
import { createMissions, startMission, updateMissions, nextMission, debugCompleteAllMissions } from './missions.js';
import { bindHud, updateHud, showOverlay, hideOverlays, showToast, setWinStats, renderMissionList } from './hud.js';
import { createAudio } from './audio.js';
import { loadSave, clearSave } from './save.js';
import { createInput, wasPressed, endFrame } from './input.js';
import { createWorld, updateCamera } from './render.js';

const canvas = document.getElementById('game');
const world = createWorld(canvas);
const rng = makeRng(SEED);
const city = buildCity(world.scene, rng);
city.rng = rng;
const hud = bindHud();
const input = createInput(canvas);
const audio = createAudio();
const save = loadSave();

// The hud's verbs, attached so the game and the missions can call them
// as methods on the hud object.
hud.showToast = (text) => showToast(hud, text);
hud.showOverlay = (name) => showOverlay(hud, name);
hud.hideOverlays = () => hideOverlays(hud);
hud.setMissionDone = (def) => setMissionDone(hud, def);
hud.setWinStats = (g) => setWinStats(hud, g);
hud.renderMissionList = (g) => renderMissionList(hud, g);

const G = {
  mode: 'title',
  time: 0,
  wanted: 0,
  maxWanted: 0,
  crimeTimer: 0,
  decayAcc: 0,
  bustTimer: 0,
  money: save.money || 0,
  player: createPlayer(city),
  trafficCars: [],
  peds: [],
  pedestrians: null,
  policeCars: [],
  parkedCars: [],
  playerCar: null,
  allCars: [],
  missions: createMissions(),
  city,
  scene: world.scene,
  renderer: world.renderer,
  camera: world.camera,
  cameraYaw: Math.PI,
  cameraPitch: 0.18,
  cameraDistance: 10,
  hud,
  input,
  audio,
  save,
  rng,
  shot: null,
  shotReady: false,
  shotWarmup: 0,
};

G.trafficCars = spawnTraffic(city, rng);
for (const c of G.trafficCars) world.scene.add(c.mesh);
G.peds = spawnPeds(city, rng);
G.pedestrians = G.peds;
for (const p of G.peds) world.scene.add(p.mesh);
G.parkedCars = spawnParked(city, rng);
for (const c of G.parkedCars) world.scene.add(c.mesh);
G.playerCar = G.parkedCars[0];
G.allCars = [...G.trafficCars, ...G.parkedCars];
G.player.money = G.money;
G.missions.completedCount = save.missionsCompleted || 0;
world.scene.add(G.player.mesh);

import { resume as resumeAudio, setMuted as setMutedAudio, horn as hornAudio, punch as punchAudio, shoot as shootAudio, pickup as pickupAudio } from './audio.js';
import { writeSave } from './save.js';

// Attach the sound verbs as methods on the audio object, so the game
// modules can call them as G.audio.horn() and G.audio.punch(). The
// object already carries its own setEngine method.
audio.horn = () => hornAudio(audio);
audio.punch = () => punchAudio(audio);
audio.shoot = () => shootAudio(audio);
audio.pickup = () => pickupAudio(audio);

// ---- menus ----
function startGame(newGame) {
  if (newGame || G.missions.completedCount >= 5) {
    clearSave();
    G.money = 0;
    G.player.money = 0;
    G.missions.completedCount = 0;
    G.missions.current = 0;
    G.missions.active = true;
    G.player.health = 100;
    respawnPlayer(G);
    G.wanted = 0;
    G.maxWanted = 0;
    G.policeCars = [];
    ensurePolice(G);
  }
  resumeAudio(G.audio);
  hud.hideOverlays();
  G.mode = 'playing';
  startMission(G, G.missions.current);
  G.hud.showToast('Selamat datang di Kota Senja, Raka.');
}

function toggleMute() {
  const muted = !G.audio.muted;
  setMutedAudio(G.audio, muted);
  document.getElementById('btn-mute').textContent = muted ? '🔇 Suara: Mati' : '🔊 Suara: Nyala';
}

function payFineAndRespawn(G, note) {
  const fine = Math.min(G.money, WANTED.bustFine);
  G.money -= fine;
  G.player.money = G.money;
  G.wanted = 0;
  G.decayAcc = 0;
  G.policeCars = [];
  ensurePolice(G);
  respawnPlayer(G);
  writeSave({ missionsCompleted: G.missions.completedCount, money: G.money });
  hud.hideOverlays();
  G.mode = 'playing';
  G.hud.showToast(note + ' Denda $' + fine + '.');
}

function doBusted(G) {
  payFineAndRespawn(G, 'Polisi menangkapmu.');
}

function doWasted(G) {
  payFineAndRespawn(G, 'Raka bangun di rumah sakit.');
}

document.getElementById('btn-start').addEventListener('click', () => startGame(true));
document.getElementById('btn-continue').addEventListener('click', () => startGame(false));
document.getElementById('btn-next').addEventListener('click', () => hud.hideOverlays());
document.getElementById('btn-again').addEventListener('click', () => startGame(true));
document.getElementById('btn-busted').addEventListener('click', () => doBusted(G));
document.getElementById('btn-wasted').addEventListener('click', () => doWasted(G));
document.getElementById('btn-resume').addEventListener('click', () => { hud.hideOverlays(); G.mode = 'playing'; });
document.getElementById('btn-restart').addEventListener('click', () => startGame(true));
document.getElementById('btn-mute').addEventListener('click', () => toggleMute());

// ---- screenshot staging (?shot=chase|street|mission|win) ----
// The camera looks south from north of the player, so the crowd goes on
// the far (south) sidewalk and the traffic in the lane in front.
const headingOf = (axis, dir) => (axis === 'x' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI));

function stageShot(kind) {
  const anchor = { x: SHOT_ANCHOR_X, z: SHOT_ROAD_Z };
  G.mode = 'playing';
  function stageCrowd() {
    let placed = 0;
    for (const p of G.peds) {
      if (placed >= 8) break;
      p.x = anchor.x - 16 + (placed % 5) * 8;
      p.z = anchor.z + (placed % 2 === 0 ? 8 : 11);
      p.speed = 0;
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = placed % 2 === 0 ? Math.PI : 0;
      placed++;
    }
    let tc = 0;
    const offsets = [-20, -9, 9, 18];
    for (const c of G.trafficCars) {
      if (tc >= 4) break;
      c.axis = 'x';
      c.lane = anchor.z;
      c.dir = tc % 2 === 0 ? 1 : -1;
      c.x = anchor.x + offsets[tc];
      c.z = anchor.z + (tc % 2 === 0 ? 2 : -2);
      c.speed = 0;
      c.targetSpeed = 0;
      c.heading = headingOf(c.axis, c.dir);
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = c.heading;
      tc++;
    }
  }
  function stageCar() {
    const car = G.playerCar;
    car.driven = true;
    car.kind = 'player';
    G.player.inCar = true;
    G.player.car = car;
    G.player.x = anchor.x;
    G.player.z = anchor.z;
    car.x = anchor.x;
    car.z = anchor.z;
    car.heading = Math.PI;
    car.speed = 0;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    G.player.heading = Math.PI;
    G.player.mesh.visible = false;
    G.cameraYaw = Math.PI;
    G.cameraPitch = 0.18;
    G.cameraDistance = 12;
  }
  if (kind === 'chase') {
    startMission(G, 1);
    G.wanted = 3;
    G.maxWanted = 3;
    ensurePolice(G);
    stageCar();
    stageCrowd();
    // One police car right behind the player, lights on.
    const pc = G.policeCars[0];
    if (pc) {
      pc.x = anchor.x - 12;
      pc.z = anchor.z + 4;
      pc.heading = Math.PI;
      pc.speed = 0;
      pc.mesh.position.set(pc.x, 0, pc.z);
      pc.mesh.rotation.y = pc.heading;
    }
  } else if (kind === 'street') {
    startMission(G, 0);
    G.wanted = 0;
    ensurePolice(G);
    G.player.x = anchor.x;
    G.player.z = anchor.z;
    G.player.heading = Math.PI;
    G.player.mesh.position.set(G.player.x, 0, G.player.z);
    G.player.mesh.rotation.y = G.player.heading;
    G.cameraYaw = Math.PI;
    G.cameraPitch = 0.18;
    G.cameraDistance = 10;
    stageCrowd();
  } else if (kind === 'mission') {
    startMission(G, 1);
    G.wanted = 1;
    G.maxWanted = 1;
    ensurePolice(G);
    stageCar();
    stageCrowd();
  } else if (kind === 'win') {
    debugCompleteAllMissions(G);
    G.cameraYaw = Math.PI;
    G.cameraPitch = 0.18;
    G.cameraDistance = 12;
  }
  updateHud(G);
  G.shot = kind;
  G.shotWarmup = 0;
}

// ---- the game loop ----
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  G.time += dt;
  if (G.mode === 'playing' && !G.shot) {
    // Camera.
    G.cameraYaw -= input.mouseDX * 0.0032;
    G.cameraPitch = Math.max(0.05, Math.min(0.9, G.cameraPitch + input.mouseDY * 0.002));
    G.cameraDistance = G.player.inCar ? 13 : 10;
    // Keys.
    if (wasPressed(input, 'KeyE')) {
      if (G.player.inCar) exitCar(G);
      else enterCar(G);
    }
    if (wasPressed(input, 'KeyF')) punch(G);
    if (input.clicked) {
      input.clicked = false;
      shoot(G);
    }
    if (wasPressed(input, 'KeyP')) {
      G.mode = 'paused';
      hud.showOverlay('pause');
    }
    if (wasPressed(input, 'KeyR')) startGame(true);
    if (wasPressed(input, 'KeyM')) toggleMute();
    // World.
    updatePlayer(G, dt);
    // Busted: a police car touching the player on foot.
    if (G.wanted > 0 && !G.player.inCar) {
      for (const car of G.policeCars) {
        if (Math.hypot(car.x - G.player.x, car.z - G.player.z) < 3.5) {
          G.mode = 'busted';
          hud.showOverlay('busted');
          break;
        }
      }
    }
    updateTraffic(G.trafficCars, dt, G.city, G.allCars);
    updatePeds(G.peds, dt, G.rng);
    updatePolice(G, dt);
    updateMissions(G, dt);
    decayWanted(G, dt);
    updateHud(G);
  } else if (G.mode === 'paused') {
    if (wasPressed(input, 'KeyP')) {
      hud.hideOverlays();
      G.mode = 'playing';
    }
    if (wasPressed(input, 'KeyR')) startGame(true);
  }
  // Shots and menus still render.
  updateCamera(G, dt);
  world.renderer.render(world.scene, world.camera);
  if (G.shot) {
    G.shotWarmup += 1;
    if (G.shotWarmup >= 6) {
      window.__shotReady = true;
      G.shotReady = true;
    }
  }
  endFrame(input);
}

// ---- debug handles (the staging scripts and the kit use these) ----
window.__game = G;
window.__startMission = (index) => startMission(G, index);
window.__debugCompleteAllMissions = () => debugCompleteAllMissions(G);
window.__shotReady = false;

// ---- boot ----
G.missions.current = Math.min(G.missions.completedCount, 4);
hud.renderMissionList(G);
if (save.missionsCompleted > 0 || save.money > 0) {
  document.getElementById('btn-continue').style.display = 'inline-block';
}
hud.showOverlay('title');
const params = new URLSearchParams(location.search);
const shotKind = params.get('shot');
if (shotKind) {
  hud.hideOverlays();
  stageShot(shotKind);
}
frame();
