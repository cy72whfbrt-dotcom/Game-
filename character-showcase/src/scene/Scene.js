import * as THREE from 'three';
import { buildGround } from './Ground.js';
import { setupEnvironment, setupFogAndBackground } from './Environment.js';
import { buildLighting } from '../lighting/Lighting.js';
import { buildAura, updateAura } from '../vfx/Aura.js';
import { buildEnergyRings, updateEnergyRings } from '../vfx/EnergyRings.js';
import { buildEnergyTrails, updateEnergyTrails } from '../vfx/EnergyTrails.js';
import { buildParticleSystems, updateParticleSystems } from '../particles/ParticleSystem.js';
import { loadCharacter } from '../character/CharacterLoader.js';

export async function buildScene(renderer) {
  const scene = new THREE.Scene();

  setupFogAndBackground(scene);
  setupEnvironment(renderer, scene);

  const lights = buildLighting(scene);

  const ground = buildGround();
  scene.add(ground);

  const { root: character, isPlaceholder } = await loadCharacter(scene);

  const aura = buildAura();
  aura.mesh.position.y = 1.05;
  scene.add(aura.mesh);

  const { group: ringGroup, rings } = buildEnergyRings();
  scene.add(ringGroup);

  const { group: trailGroup, trails } = buildEnergyTrails();
  scene.add(trailGroup);

  const particleSystems = buildParticleSystems();
  scene.add(particleSystems.embers, particleSystems.dust);

  const center = new THREE.Vector3(0, 0, 0);

  function update(dt, time, energy) {
    updateAura(aura, time, energy);
    updateEnergyRings(rings, time, energy);
    updateEnergyTrails(trails, time, energy);
    updateParticleSystems(particleSystems, dt, time, energy, center);

    if (character?.userData?.cape) {
      const cape = character.userData.cape;
      cape.rotation.z = Math.sin(time * 0.6) * 0.04;
      cape.rotation.x = Math.sin(time * 0.4) * 0.02;
    }
    if (character?.userData?.corePoint) {
      character.userData.corePoint.intensity = 2.6 + Math.sin(time * 3.2) * 0.8 + energy * 1.6;
    }

    lights.arcanePoint.intensity = 2.2 + Math.sin(time * 2.4) * 0.6 + energy * 1.4;
    lights.violetPoint.intensity = 1.6 + Math.cos(time * 1.8) * 0.5 + energy * 1.1;

    ground.userData.crackUniforms.uTime.value = time;
    ground.userData.crackUniforms.uIntensity.value = 0.8 + energy * 0.6;
  }

  return { scene, character, isPlaceholder, lights, ground, update };
}
