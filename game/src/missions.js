// KOTA SENJA — five numbered missions with a story.
// Each mission is steps of goto / steal / survive; the marker in the
// world and on the minimap always shows where to go next.

import * as THREE from 'three';
import { MISSION_DEFS, SPOTS } from './config.js';
import { createCar } from './vehicles.js';
import { addWanted, clearWanted } from './police.js';

export function createMissionState() {
  return {
    index: 0,
    stepIndex: 0,
    active: false,
    timer: 0,
    marker: null,
    markerPos: null,
    goldCar: null,
    completedCount: 0,
  };
}

function makeMarkerMesh(scene) {
  const group = new THREE.Group();
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 26, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  beacon.position.y = 13;
  group.add(beacon);
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.4),
    new THREE.MeshBasicMaterial({ color: 0xffd700 }),
  );
  diamond.position.y = 7;
  group.add(diamond);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 3.0, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  group.add(ring);
  group.userData.diamond = diamond;
  scene.add(group);
  return group;
}

function removeMarker(game) {
  if (game.missions.marker) {
    game.scene.remove(game.missions.marker);
    game.missions.marker = null;
  }
  game.missions.markerPos = null;
}

function placeMarker(game, x, z) {
  removeMarker(game);
  game.missions.marker = makeMarkerMesh(game.scene);
  game.missions.marker.position.set(x, 0, z);
  game.missions.markerPos = { x, z };
}

export function currentMissionDef(game) {
  return MISSION_DEFS[game.missions.index] || null;
}

export function currentStep(game) {
  const def = currentMissionDef(game);
  if (!def) return null;
  return def.steps[game.missions.stepIndex] || null;
}

export function startMission(game, index) {
  const def = MISSION_DEFS[index];
  if (!def) return false;
  game.missions.index = index;
  game.missions.stepIndex = 0;
  game.missions.active = true;
  game.missions.timer = 0;
  applyStep(game);
  game.hudMessage(`${def.title} — ${def.story}`);
  return true;
}

function applyStep(game) {
  const step = currentStep(game);
  if (!step) return;
  if (step.wantedOnStart) addWanted(game, step.wantedOnStart);
  if (step.kind === 'goto') {
    const spot = SPOTS[step.spot];
    placeMarker(game, spot.x, spot.z);
  } else if (step.kind === 'steal') {
    const spot = SPOTS[step.spot];
    const goldCar = createCar(game.scene, spot.x, spot.z, 0, 0xf1c40f, 'parked');
    goldCar.isGoldCar = true;
    game.allCars.push(goldCar);
    game.missions.goldCar = goldCar;
    placeMarker(game, spot.x, spot.z);
  } else if (step.kind === 'survive') {
    game.missions.timer = step.seconds;
    removeMarker(game);
  }
}

// ---- progression: checking steps, finishing missions, winning ----

export function updateMissions(game, dt) {
  if (!game.missions.active) return;
  const step = currentStep(game);
  if (!step) return;
  const player = game.player;
  const pos = player.inCar ? { x: player.inCar.x, z: player.inCar.z } : { x: player.x, z: player.z };
  if (step.kind === 'goto') {
    const spot = SPOTS[step.spot];
    if (Math.hypot(pos.x - spot.x, pos.z - spot.z) < 7) {
      game.audio.playChime();
      advanceStep(game);
    }
  } else if (step.kind === 'steal') {
    if (game.missions.goldCar && player.inCar === game.missions.goldCar) {
      game.audio.playChime();
      game.hudMessage('Mobil emas dicuri! Bawa ke Dermaga.');
      advanceStep(game);
    }
  } else if (step.kind === 'survive') {
    game.missions.timer -= dt;
    if (game.missions.timer <= 0) {
      clearWanted(game);
      advanceStep(game);
    }
  }
  if (game.missions.marker) {
    game.missions.marker.userData.diamond.rotation.y += dt * 1.5;
    game.missions.marker.userData.diamond.position.y = 7 + Math.sin(game.time * 2.2) * 0.6;
  }
}

function advanceStep(game) {
  game.missions.stepIndex += 1;
  const def = currentMissionDef(game);
  if (!def) return;
  if (game.missions.stepIndex >= def.steps.length) {
    completeMission(game);
  } else {
    applyStep(game);
    const step = currentStep(game);
    if (step) game.hudMessage(step.text);
  }
}

function completeMission(game) {
  const def = currentMissionDef(game);
  game.missions.active = false;
  removeMarker(game);
  game.player.money += def.reward;
  game.missions.completedCount += 1;
  game.save.money = game.player.money;
  game.save.missionsCompleted = game.missions.completedCount;
  game.audio.playJingle();
  if (game.missions.index + 1 >= MISSION_DEFS.length) {
    game.onWin();
    return;
  }
  game.onMissionComplete(def);
}

export function missionStepText(game) {
  if (!game.missions.active) {
    return game.missions.completedCount >= MISSION_DEFS.length
      ? 'Semua misi selesai — kamu Raja Senja!'
      : 'Tekan 1-5 untuk mulai misi, atau jelajahi kota.';
  }
  const step = currentStep(game);
  if (!step) return '';
  if (step.kind === 'survive') {
    return `${step.text} — ${Math.max(0, Math.ceil(game.missions.timer))} detik`;
  }
  const player = game.player;
  const pos = player.inCar ? { x: player.inCar.x, z: player.inCar.z } : { x: player.x, z: player.z };
  const spot = SPOTS[step.spot];
  const dist = spot ? Math.round(Math.hypot(pos.x - spot.x, pos.z - spot.z)) : 0;
  return `${step.text} — ${dist}m`;
}

export function debugCompleteAllMissions(game) {
  // Plays every mission through the real completion path so the win
  // screen can be staged honestly for a screenshot.
  while (game.missions.index < MISSION_DEFS.length) {
    const def = MISSION_DEFS[game.missions.index];
    game.missions.active = true;
    game.missions.stepIndex = def.steps.length;
    completeMission(game);
    game.missions.index += 1;
    if (game.mode === 'win') break;
  }
}
