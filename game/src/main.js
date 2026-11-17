// KOTA SENJA — entry point: builds the world, wires every system,
// runs the loop. The city, the cars, the cops and the missions all
// meet in the single game state object G.

import * as THREE from 'three';
import { CITY, SPOTS, TRAFFIC_COUNT, PEDESTRIAN_COUNT, WANTED, MISSION_DEFS } from './config.js';
import { createInput, pressedOnce, moveAxes, isKeyDown } from './input.js';
import { loadSave, writeSave } from './save.js';
import { createAudioEngine } from './audio.js';
import { buildCity } from './world.js';
import { createCar, carColorAt, drivePlayerCar } from './vehicles.js';
import { spawnTraffic, updateTraffic } from './traffic.js';
import { spawnPedestrians, updatePedestrians } from './pedestrians.js';
import { addWanted, clearWanted, updatePolice } from './police.js';
import { createPlayer, updatePlayerOnFoot, updateCameraRig, nearestStealableCar, enterCar, exitCar } from './player.js';
import { punch, shoot, damagePlayer, healPlayerTick, makePistolPickup, updatePistolPickup } from './combat.js';
import { createMissionState, startMission, updateMissions, missionStepText, debugCompleteAllMissions } from './missions.js';
import { initHud, updateHud, showHudMessage, showOverlay, setWinStats, setMissionCompleteText, renderMissionList } from './hud.js';
import { createRenderer, createScene, createCamera, fitRendererToWindow, watchWindowResize } from './render.js';

function boot() {
  const canvas = document.getElementById('game-canvas');
  const renderer = createRenderer(canvas);
  const { scene } = createScene();
  const camera = createCamera();
  const city = buildCity(scene);
  const save = loadSave();
  const input = createInput(canvas);
  const audio = createAudioEngine();
  audio.setMuted(save.muted);
  const hud = initHud();

  const player = createPlayer(scene, SPOTS.playerStart.x, SPOTS.playerStart.z);
  player.money = save.money;

  const parkedCars = [];
  city.carSpots.forEach((spot, i) => {
    const car = createCar(scene, spot.x, spot.z, (i % 4) * (Math.PI / 2), carColorAt(i), 'parked');
    parkedCars.push(car);
  });
  const trafficCars = spawnTraffic(scene, city.colliders, TRAFFIC_COUNT);
  const peds = spawnPedestrians(scene, PEDESTRIAN_COUNT);
  const pistol = makePistolPickup(scene, SPOTS.pistol.x, SPOTS.pistol.z);

  const G = {
    scene,
    camera,
    renderer,
    input,
    audio,
    hud,
    city,
    player,
    allCars: [...parkedCars, ...trafficCars],
    trafficCars,
    peds,
    policeCars: [],
    officers: [],
    pistol,
    wanted: 0,
    secondsSinceCrime: 0,
    decayAccumulator: 0,
    bustTimer: 0,
    lastRamAt: -99,
    lastOfficerHitAt: -99,
    time: 0,
    mode: 'title',
    missions: createMissionState(),
    save,
    cameraYaw: 0,
    cameraPitch: 0.18,
    cameraDistance: 8,
    shot: null,
    shotWarmup: 0,
    shotReady: false,
    hudMessage(text) {
      showHudMessage(hud, text);
    },
    missionStepText() {
      return missionStepText(G);
    },
    onMissionComplete(def) {
      writeSave(G.save);
      setMissionCompleteText(def);
      renderMissionList(G.missions.completedCount);
      G.mode = 'missionComplete';
      showOverlay('overlay-mission-done');
    },
    onWin() {
      writeSave(G.save);
      setWinStats(G);
      G.mode = 'win';
      showOverlay('overlay-win');
    },
    requestBusted() {
      if (G.mode !== 'playing') return;
      G.player.money = Math.max(0, G.player.money - WANTED.bustFine);
      G.save.money = G.player.money;
      writeSave(G.save);
      G.audio.playBusted();
      clearWanted(G);
      respawnPlayer(G);
      G.mode = 'busted';
      showOverlay('overlay-busted');
    },
    requestWasted() {
      if (G.mode !== 'playing') return;
      G.player.money = Math.max(0, G.player.money - WANTED.wastedFine);
      G.save.money = G.player.money;
      writeSave(G.save);
      G.audio.playBusted();
      clearWanted(G);
      respawnPlayer(G);
      G.mode = 'wasted';
      showOverlay('overlay-wasted');
    },
  };
  G.missions.completedCount = save.missionsCompleted;

  function respawnPlayer(game) {
    const playerState = game.player;
    if (playerState.inCar) {
      playerState.inCar = null;
    }
    playerState.x = SPOTS.playerStart.x;
    playerState.z = SPOTS.playerStart.z;
    playerState.health = 100;
    playerState.mesh.visible = true;
    playerState.mesh.position.set(playerState.x, 0, playerState.z);
    game.cameraYaw = 0;
    game.cameraDistance = 8;
  }

  function startGame(missionIndex) {
    showOverlay(null);
    G.mode = 'playing';
    G.audio.ensureContext();
    G.audio.startEngineHum();
    const index = Math.max(0, Math.min(MISSION_DEFS.length - 1, missionIndex));
    startMission(G, index);
  }

  function wireMenu() {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const next = Math.min(G.missions.completedCount, MISSION_DEFS.length - 1);
        startGame(next);
      });
    }
    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        const next = Math.min(G.missions.completedCount, MISSION_DEFS.length - 1);
        startGame(next);
      });
    }
    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) resumeBtn.addEventListener('click', () => {
      G.mode = 'playing';
      showOverlay(null);
    });
    const nextBtn = document.getElementById('next-mission-btn');
    if (nextBtn) nextBtn.addEventListener('click', () => {
      const next = Math.min(G.missions.completedCount, MISSION_DEFS.length - 1);
      startGame(next);
    });
    const againBtn = document.getElementById('play-again-btn');
    if (againBtn) againBtn.addEventListener('click', () => {
      G.missions = createMissionState();
      G.missions.completedCount = 0;
      G.save.missionsCompleted = 0;
      G.player.money = 0;
      G.save.money = 0;
      writeSave(G.save);
      startGame(0);
    });
    const bustedBtn = document.getElementById('busted-btn');
    if (bustedBtn) bustedBtn.addEventListener('click', () => {
      showOverlay(null);
      G.mode = 'playing';
    });
    const wastedBtn = document.getElementById('wasted-btn');
    if (wastedBtn) wastedBtn.addEventListener('click', () => {
      showOverlay(null);
      G.mode = 'playing';
    });
    const muteBtn = document.getElementById('mute-btn');
    if (muteBtn) muteBtn.addEventListener('click', () => {
      G.save.muted = !G.save.muted;
      G.audio.setMuted(G.save.muted);
      writeSave(G.save);
      muteBtn.textContent = G.save.muted ? 'Suara: Mati (M)' : 'Suara: Hidup (M)';
    });
    const list = document.getElementById('mission-list');
    if (list) {
      list.addEventListener('click', (event) => {
        const item = event.target.closest('.mission-item');
        if (!item) return;
        const index = Array.from(list.children).indexOf(item);
        if (index <= G.missions.completedCount) startGame(index);
      });
    }
    renderMissionList(G.missions.completedCount);
  }
  wireMenu();

  // ---- the frame loop ----

  const clock = new THREE.Clock();

  function handlePlayingKeys() {
    const input = G.input;
    if (pressedOnce(input, 'KeyP') || pressedOnce(input, 'Escape')) {
      G.mode = 'paused';
      showOverlay('overlay-pause');
      return;
    }
    if (pressedOnce(input, 'KeyR')) {
      clearWanted(G);
      respawnPlayer(G);
      G.hudMessage('Mulai lagi dari titik awal.');
      return;
    }
    if (pressedOnce(input, 'KeyM')) {
      G.save.muted = !G.save.muted;
      G.audio.setMuted(G.save.muted);
      writeSave(G.save);
      return;
    }
    for (let n = 1; n <= 5; n += 1) {
      if (pressedOnce(input, `Digit${n}`)) {
        if (n - 1 <= G.missions.completedCount) startGame(n - 1);
        return;
      }
    }
    if (pressedOnce(input, 'KeyE')) {
      if (G.player.inCar) {
        exitCar(G);
      } else {
        const car = nearestStealableCar(G, 4.5);
        if (car) {
          if (car.kind === 'parked' || car.kind === 'traffic') {
            addWanted(G, 1);
            G.hudMessage('Mobil dicuri! Polisi waspada.');
          }
          enterCar(G, car);
          G.audio.startEngineHum();
        }
      }
      return;
    }
    if (pressedOnce(input, 'KeyF')) {
      punch(G);
      return;
    }
    if (input.clickQueued) {
      input.clickQueued = false;
      shoot(G);
    }
  }

  function stepPlaying(dt) {
    const player = G.player;
    if (player.inCar) {
      const axes = moveAxes(G.input);
      const result = drivePlayerCar(player.inCar, axes, dt, G.city.colliders, [...G.allCars, ...G.policeCars]);
      G.audio.setEngineSpeed(result.speedRatio);
      player.x = player.inCar.x;
      player.z = player.inCar.z;
      player.heading = player.inCar.heading;
      // Hitting a pedestrian while driving is a crime.
      for (const ped of G.peds) {
        if (ped.state === 'down') continue;
        const dist = Math.hypot(ped.x - player.x, ped.z - player.z);
        if (dist < 2.2 && Math.abs(player.inCar.speed) > 4) {
          ped.state = 'down';
          ped.downTimer = 5;
          ped.mesh.rotation.x = -Math.PI / 2;
          ped.mesh.position.y = 0.3;
          addWanted(G, 1);
          G.hudMessage('Kamu menabrak pejalan kaki!');
        }
      }
    } else {
      updatePlayerOnFoot(G, dt);
      G.audio.setEngineSpeed(0);
    }
    updateTraffic(G.trafficCars, dt, G.city.colliders);
    const threat = player.inCar
      ? { x: player.inCar.x, z: player.inCar.z, radius: Math.abs(player.inCar.speed) > 6 ? 9 : 0 }
      : { x: player.x, z: player.z, radius: 3 };
    updatePedestrians(G.peds, dt, { threatX: threat.x, threatZ: threat.z, threatRadius: threat.radius });
    updatePolice(G, dt);
    updateMissions(G, dt);
    healPlayerTick(G, dt);
    updatePistolPickup(G, G.pistol);
    updateCameraRig(G, dt);
    updateHud(G.hud, G);
  }

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    G.time += dt;
    if (G.mode === 'playing') {
      handlePlayingKeys();
      if (G.mode === 'playing') stepPlaying(dt);
    } else if (G.mode === 'title') {
      // Slow cinematic orbit behind the title screen.
      G.cameraYaw += dt * 0.05;
      updateCameraRig(G, dt);
      updateTraffic(G.trafficCars, dt, G.city.colliders);
      updatePedestrians(G.peds, dt, { threatX: 9999, threatZ: 9999, threatRadius: 0 });
    }
    if (G.shot && !G.shotReady) {
      G.shotWarmup -= dt;
      if (G.shotWarmup <= 0) {
        G.shotReady = true;
        window.__shotReady = true;
      }
    }
    G.renderer.render(G.scene, G.camera);
  }

  // ---- screenshot staging: real game states, never faked frames ----

  function stageShot(name) {
    G.shot = name;
    if (name === 'chase') {
      startGame(1);
      const car = nearestStealableCar(G, 500);
      if (car) {
        car.x = 20;
        car.z = 51;
        car.heading = Math.PI / 2;
        car.mesh.position.set(car.x, 0, car.z);
        enterCar(G, car);
        car.speed = 22;
      }
      addWanted(G, 3);
      G.cameraYaw = Math.PI;
      G.cameraDistance = 12;
      G.shotWarmup = 2.5;
    } else if (name === 'street') {
      startGame(0);
      G.player.x = 51;
      G.player.z = 51;
      G.player.mesh.position.set(51, 0, 51);
      G.cameraYaw = Math.PI * 0.75;
      G.cameraDistance = 9;
      G.shotWarmup = 1.5;
    } else if (name === 'mission') {
      startGame(0);
      const car = nearestStealableCar(G, 500);
      if (car) {
        car.x = -8;
        car.z = 51;
        car.heading = Math.PI / 2;
        car.mesh.position.set(car.x, 0, car.z);
        enterCar(G, car);
        car.speed = 16;
      }
      G.cameraYaw = Math.PI;
      G.cameraDistance = 11;
      G.shotWarmup = 2.0;
    } else if (name === 'win') {
      startGame(0);
      debugCompleteAllMissions(G);
      G.cameraYaw = Math.PI * 0.6;
      G.cameraDistance = 10;
      G.shotWarmup = 1.0;
    }
  }

  const params = new URLSearchParams(window.location.search);
  const shotName = params.get('shot');
  watchWindowResize(G.renderer, G.camera);
  fitRendererToWindow(G.renderer, G.camera);
  showOverlay('overlay-menu');
  if (shotName) {
    stageShot(shotName);
  }
  animate();

  window.__game = G;
  window.__shotReady = false;
  window.__debugCompleteAllMissions = () => debugCompleteAllMissions(G);
  window.__startMission = (index) => startGame(index);
}

boot();
