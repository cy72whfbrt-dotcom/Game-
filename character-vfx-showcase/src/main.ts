// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import * as THREE from "three/webgpu";
import { createRenderer } from "./scene/RendererFactory";
import { HeroCamera } from "./camera/HeroCamera";
import { buildSimpleCharacter } from "./character/SimpleCharacter";
import { createSimpleGround } from "./vfx/SimpleGround";
import { GPUParticleSystem } from "./vfx/particles/GPUParticleSystem";
import { createPostFX } from "./postprocessing/PostFX";
import { clock } from "./utils/Clock";

async function bootstrap(): Promise<void> {
  const appHost = document.getElementById("app")!;
  const loadingScreen = document.getElementById("loading-screen")!;
  const loadingFill = document.getElementById("loading-bar-fill")!;
  const loadingSub = document.getElementById("loading-sub")!;
  const rendererLabel = document.getElementById("renderer-label")!;
  const fpsLabel = document.getElementById("fps-label")!;

  const setProgress = (pct: number, text: string): void => {
    loadingFill.style.width = `${pct}%`;
    loadingSub.textContent = text;
  };

  setProgress(15, "Initialisiere Renderer…");
  const { renderer, backendLabel } = await createRenderer(appHost);
  rendererLabel.textContent = backendLabel;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050308);
  scene.fog = new THREE.FogExp2(0x08060d, 0.05);

  const heroCamera = new HeroCamera(window.innerWidth / window.innerHeight);

  setProgress(35, "Beleuchte die Szene…");
  const key = new THREE.DirectionalLight(0xfff1d6, 3.4);
  key.position.set(3, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x8fd0ff, 2.4);
  rim.position.set(-4, 3, -3);
  scene.add(rim);

  const ambient = new THREE.HemisphereLight(0x392e55, 0x0a0710, 0.8);
  scene.add(ambient);

  setProgress(55, "Stelle den Charakter hin…");
  const character = buildSimpleCharacter();
  scene.add(character.root);

  const ground = createSimpleGround();
  scene.add(ground);

  setProgress(75, "Ein Effekt: aufsteigende Energiepartikel…");
  // The one effect for now: a dense swirl of glowing GPU particles rising
  // around the character. More effects (aura, rings, shield, ...) can be
  // added the same way — each is its own self-contained module.
  const particles = new GPUParticleSystem({
    count: 1800,
    radius: 1.7,
    height: 3.0,
    riseSpeed: [0.2, 0.6],
    size: [0.012, 0.03],
    colorA: new THREE.Color(0x6fc7ff),
    colorB: new THREE.Color(0xc9a3ff),
    origin: new THREE.Vector3(0, 0, 0),
  });
  scene.add(particles.mesh);

  setProgress(90, "Kalibriere Post-Processing…");
  const postFX = createPostFX(renderer, scene, heroCamera.camera, {
    bloomEnabled: true,
    dofEnabled: false,
    filmGrainEnabled: false,
  });

  window.addEventListener("pointermove", (ev) => {
    const nx = (ev.clientX / window.innerWidth) * 2 - 1;
    const ny = (ev.clientY / window.innerHeight) * 2 - 1;
    heroCamera.setPointer(nx, ny);
  });

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    heroCamera.resize(window.innerWidth / window.innerHeight);
  });

  setProgress(100, "Bereit.");
  requestAnimationFrame(() => {
    loadingScreen.classList.add("hidden");
  });

  let fpsAccum = 0;
  let fpsFrames = 0;
  let fpsTimer = 0;
  const clockDelta = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clockDelta.getDelta(), 0.1);
    clock.tick(dt);
    const elapsed = clock.elapsed;

    heroCamera.update(elapsed, dt);
    character.update(elapsed);

    postFX.postProcessing.render();

    fpsAccum += 1 / Math.max(dt, 1e-6);
    fpsFrames += 1;
    fpsTimer += dt;
    if (fpsTimer >= 0.5) {
      fpsLabel.textContent = Math.round(fpsAccum / fpsFrames).toString();
      fpsAccum = 0;
      fpsFrames = 0;
      fpsTimer = 0;
    }
  });
}

bootstrap().catch((err) => {
  console.error("Fatal error while starting the scene:", err);
  const loadingSub = document.getElementById("loading-sub");
  if (loadingSub) {
    loadingSub.textContent = "Fehler beim Laden — siehe Konsole.";
    loadingSub.style.color = "#ff6b6b";
  }
});
