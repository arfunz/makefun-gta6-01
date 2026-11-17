// KOTA SENJA — renderer and the sunset sky.
// One warm directional sun, a hazy horizon, and a low sun disc so
// every screenshot reads as golden hour on the coast.

import * as THREE from 'three';
import { SUNSET } from './config.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
  camera.position.set(0, 10, 20);
  return camera;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SUNSET.skyHorizon);
  scene.fog = new THREE.Fog(SUNSET.fogColor, 180, 520);
  const hemi = new THREE.HemisphereLight(SUNSET.ambientSky, SUNSET.ambientGround, 1.25);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(SUNSET.sunColor, 2.9);
  sun.position.set(-140, 170, -90);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -220;
  sun.shadow.camera.right = 220;
  sun.shadow.camera.top = 220;
  sun.shadow.camera.bottom = -220;
  sun.shadow.camera.far = 600;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  // Low sun disc on the horizon, due west over the sea.
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(26, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe9b0, fog: false }),
  );
  sunDisc.position.set(-380, 66, -160);
  sunDisc.lookAt(0, 20, 0);
  scene.add(sunDisc);
  // Warm gradient sky dome: top dusk blue, horizon orange.
  const skyGeo = new THREE.SphereGeometry(480, 24, 12);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(SUNSET.skyTop) },
      horizonColor: { value: new THREE.Color(SUNSET.skyHorizon) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        float t = clamp(h * 1.6 + 0.12, 0.0, 1.0);
        gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);
  return { scene, sun };
}

// ---- sizing ----

export function fitRendererToWindow(renderer, camera) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

export function watchWindowResize(renderer, camera) {
  window.addEventListener('resize', () => fitRendererToWindow(renderer, camera));
}
