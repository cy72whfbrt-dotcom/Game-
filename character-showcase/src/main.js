import * as THREE from 'three';
import { buildScene } from './scene/Scene.js';
import { CameraRig } from './camera/CameraRig.js';
import { Composer } from './postprocessing/Composer.js';

const container = document.getElementById('app');
const loadingEl = document.getElementById('loading');

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
container.appendChild(renderer.domElement);

const cameraRig = new CameraRig(window.innerWidth / window.innerHeight);

let composer;
let sceneData;

const clock = new THREE.Clock();
let energy = 0;
let energyTarget = 0.15;

async function init() {
  sceneData = await buildScene(renderer);
  composer = new Composer(renderer, sceneData.scene, cameraRig.camera, window.innerWidth, window.innerHeight);

  loadingEl.classList.add('hidden');
  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerdown', () => { energyTarget = 1.0; });
  window.addEventListener('pointerup', () => { energyTarget = 0.15; });
  window.addEventListener('pointerleave', () => { energyTarget = 0.15; });

  renderer.domElement.addEventListener('pointerenter', () => { energyTarget = 0.55; });

  requestAnimationFrame(animate);
}

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  cameraRig.resize(w / h);
  composer.setSize(w, h);
}

function onPointerMove(e) {
  const nx = (e.clientX / window.innerWidth) * 2 - 1;
  const ny = (e.clientY / window.innerHeight) * 2 - 1;
  cameraRig.setMouse(nx, -ny);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 1 / 30);
  const time = clock.elapsedTime;

  energy += (energyTarget - energy) * Math.min(dt * 2.2, 1);

  cameraRig.update(dt, time);
  sceneData.update(dt, time, energy);
  composer.update(time);
  composer.render();
}

init();
