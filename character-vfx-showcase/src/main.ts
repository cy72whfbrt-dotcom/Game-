// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import * as THREE from "three/webgpu";
import { createRenderer } from "./scene/RendererFactory";
import { createLightingRig } from "./lighting/CinematicLighting";
import { HeroCamera } from "./camera/HeroCamera";
import { buildWarrior } from "./character/Warrior";
import { createEnergyAura } from "./vfx/EnergyAura";
import { createMagicRings } from "./vfx/MagicRings";
import { createEnergyTrails } from "./vfx/EnergyTrails";
import { createFloatingRunes } from "./vfx/FloatingRunes";
import { createGroundVFX } from "./vfx/GroundVFX";
import { createAtmosphereBackground } from "./vfx/AtmosphereBackground";
import { createEnergyShield } from "./vfx/EnergyShield";
import { GPUParticleSystem } from "./vfx/particles/GPUParticleSystem";
import { createPostFX } from "./postprocessing/PostFX";
import { clock } from "./utils/Clock";
import { detectStartTier, QualityManager, type QualitySettings } from "./utils/QualityManager";
import { PEDESTAL_TOP_Y } from "./utils/Constants";

async function bootstrap(): Promise<void> {
  const appHost = document.getElementById("app")!;
  const loadingScreen = document.getElementById("loading-screen")!;
  const loadingFill = document.getElementById("loading-bar-fill")!;
  const loadingSub = document.getElementById("loading-sub")!;
  const rendererLabel = document.getElementById("renderer-label")!;
  const fpsLabel = document.getElementById("fps-label")!;
  const qualityLabel = document.getElementById("quality-label")!;

  const setProgress = (pct: number, text: string): void => {
    loadingFill.style.width = `${pct}%`;
    loadingSub.textContent = text;
  };

  setProgress(8, "Initialisiere Renderer…");
  const { renderer, backendLabel } = await createRenderer(appHost);
  rendererLabel.textContent = backendLabel;

  const scene = new THREE.Scene();
  const heroCamera = new HeroCamera(window.innerWidth / window.innerHeight);

  setProgress(20, "Beleuchte die Szene…");
  const startTier = detectStartTier();
  const initialParticleBudget = startTier === "high" ? 6000 : startTier === "medium" ? 3000 : 1200;

  const lighting = createLightingRig(scene, renderer, startTier === "high" ? 2048 : startTier === "medium" ? 1024 : 512);

  setProgress(35, "Beschwöre den Krieger…");
  const warrior = buildWarrior();
  scene.add(warrior.root);

  setProgress(50, "Webe die Energieaura…");
  const aura = createEnergyAura();
  scene.add(aura.group);

  const shield = createEnergyShield();
  scene.add(shield.mesh);

  const swirlDust = new GPUParticleSystem({
    count: Math.round(initialParticleBudget * 0.45),
    radius: 1.9,
    height: 3.8,
    riseSpeed: [0.15, 0.55],
    size: [0.012, 0.03],
    colorA: new THREE.Color(0x6fc7ff),
    colorB: new THREE.Color(0xbfe6ff),
    origin: new THREE.Vector3(0, PEDESTAL_TOP_Y, 0),
  });
  scene.add(swirlDust.mesh);

  const swirlGlints = new GPUParticleSystem({
    count: Math.round(initialParticleBudget * 0.08),
    radius: 2.3,
    height: 4.2,
    riseSpeed: [0.05, 0.2],
    size: [0.05, 0.11],
    colorA: new THREE.Color(0xffffff),
    colorB: new THREE.Color(0x9ee8ff),
    origin: new THREE.Vector3(0, PEDESTAL_TOP_Y, 0),
  });
  scene.add(swirlGlints.mesh);

  const rings = createMagicRings();
  scene.add(rings.group);

  const trails = createEnergyTrails();
  scene.add(trails.group);

  setProgress(65, "Zeichne Runen…");
  const runes = createFloatingRunes(16);
  scene.add(runes.group);
  runes.setCount(startTier === "high" ? 14 : startTier === "medium" ? 9 : 5);

  setProgress(78, "Formt den Sockel…");
  const ground = createGroundVFX(Math.round(initialParticleBudget * 0.35));
  scene.add(ground.group);

  const atmosphere = createAtmosphereBackground(scene, Math.round(initialParticleBudget * 0.65));
  scene.add(atmosphere.group);

  setProgress(90, "Kalibriere Post-Processing…");
  const postFX = createPostFX(renderer, scene, heroCamera.camera, {
    bloomEnabled: true,
    dofEnabled: startTier === "high",
    filmGrainEnabled: startTier !== "low",
  });

  const qualityManager = new QualityManager(startTier, (q: QualitySettings) => {
    renderer.setPixelRatio(q.pixelRatio);
    runes.setCount(q.runeCount);
    swirlDust.setCount(Math.round(q.particleCount * 0.45));
    swirlGlints.setCount(Math.round(q.particleCount * 0.08));
    ground.emberParticles.setCount(Math.round(q.particleCount * 0.35));
    atmosphere.dustParticles.setCount(Math.round(q.particleCount * 0.65));
    postFX.rebuild({
      bloomEnabled: q.bloomEnabled,
      dofEnabled: q.dofEnabled,
      filmGrainEnabled: q.filmGrainEnabled,
    });
    qualityLabel.textContent = q.tier === "high" ? "Hoch" : q.tier === "medium" ? "Mittel" : "Niedrig";
  });

  // Pointer parallax input.
  const pointerNDC = new THREE.Vector2(0, 0);
  window.addEventListener("pointermove", (ev) => {
    pointerNDC.x = (ev.clientX / window.innerWidth) * 2 - 1;
    pointerNDC.y = (ev.clientY / window.innerHeight) * 2 - 1;
    heroCamera.setPointer(pointerNDC.x, pointerNDC.y);
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
    const pointer = heroCamera.getPointer();

    warrior.update(elapsed, dt, pointer);
    aura.update(elapsed, dt);
    shield.update(elapsed);
    rings.update(elapsed);
    trails.update(elapsed);
    runes.update(elapsed);
    ground.update(elapsed);
    atmosphere.update(elapsed);
    lighting.update(elapsed, pointer);

    postFX.postProcessing.render();

    qualityManager.reportFrame(dt);

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
  console.error("Fatal error while starting the AAA RPG VFX scene:", err);
  const loadingSub = document.getElementById("loading-sub");
  if (loadingSub) {
    loadingSub.textContent = "Fehler beim Laden — siehe Konsole.";
    loadingSub.style.color = "#ff6b6b";
  }
});
