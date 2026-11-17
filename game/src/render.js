// The renderer, the sunset scene and the third-person camera.
import * as THREE from 'three';
import { COLORS } from './config.js';

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.sky);
  scene.fog = new THREE.Fog(COLORS.fog, 90, 340);
  const hemi = new THREE.HemisphereLight(0xffd9b0, 0x3a2a3a, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a0, 1.6);
  sun.position.set(90, 70, -60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -120;
  sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 120;
  sun.shadow.camera.bottom = -120;
  sun.shadow.camera.far = 400;
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 700);
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  return { renderer, scene, camera, sun };
}

// Third-person camera: behind and above the player, looking at them.
// yaw PI puts the camera north of the player, looking south.
export function updateCamera(G, dt) {
  const p = G.player;
  const cam = G.camera;
  const dist = G.cameraDistance;
  const pitch = G.cameraPitch;
  const yaw = G.cameraYaw;
  const tx = p.inCar && p.car ? p.car.x : p.x;
  const tz = p.inCar && p.car ? p.car.z : p.z;
  const target = new THREE.Vector3(tx, 1.6, tz);
  const cx = tx + Math.sin(yaw) * dist * Math.cos(pitch);
  const cy = 1.6 + Math.sin(pitch) * dist;
  const cz = tz + Math.cos(yaw) * dist * Math.cos(pitch);
  cam.position.set(cx, cy, cz);
  cam.lookAt(target);
}
