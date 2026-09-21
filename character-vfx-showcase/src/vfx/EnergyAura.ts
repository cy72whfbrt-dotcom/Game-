// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import * as THREE from "three/webgpu";
import { color, mx_noise_float, oscSine, positionWorld, uniform } from "three/tsl";
import { clock } from "../utils/Clock";
import { fresnelTerm } from "./shaders/Fresnel";
import { PEDESTAL_TOP_Y } from "../utils/Constants";

export interface EnergyAura {
  group: THREE.Group;
  intensity: ReturnType<typeof uniform>;
  update(elapsed: number, dt: number): void;
}

/**
 * Multi-layer fresnel energy shell around the character: three slightly
 * offset transparent shells, additive blended, each with its own noise
 * "dissolve" pattern and rotation speed so the aura reads as volumetric
 * energy rather than a flat glow decal.
 */
export function createEnergyAura(): EnergyAura {
  const group = new THREE.Group();
  const intensity = uniform(1);

  const layers: THREE.Mesh[] = [];
  const layerDefs = [
    { radius: 0.5, height: 1.5, color: new THREE.Color(0x5fd0ff), speed: 0.12, power: 2.2, noiseScale: 2.2 },
    { radius: 0.58, height: 1.65, color: new THREE.Color(0x9a6bff), speed: -0.08, power: 3.0, noiseScale: 3.4 },
    { radius: 0.68, height: 1.8, color: new THREE.Color(0xffb15c), speed: 0.05, power: 4.2, noiseScale: 1.6 },
  ];

  for (const def of layerDefs) {
    const geo = new THREE.CapsuleGeometry(def.radius, def.height, 8, 20);
    const mat = new THREE.MeshBasicNodeMaterial();
    mat.transparent = true;
    mat.blending = THREE.AdditiveBlending;
    mat.depthWrite = false;
    mat.side = THREE.DoubleSide;

    const fresnel = fresnelTerm(def.power);
    const noiseCoord = positionWorld.mul(def.noiseScale).add(clock.uElapsed.mul(0.35));
    const noise = mx_noise_float(noiseCoord).mul(0.5).add(0.5);
    const pulse = oscSine(clock.uElapsed.mul(1.6)).mul(0.25).add(0.85);
    const dissolve = noise.smoothstep(0.15, 0.85);

    mat.colorNode = color(def.color);
    mat.opacityNode = fresnel.mul(dissolve).mul(pulse).mul(intensity).mul(0.85);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.spinSpeed = def.speed;
    mesh.renderOrder = 5;
    layers.push(mesh);
    group.add(mesh);
  }

  group.position.set(0, PEDESTAL_TOP_Y + 1.35, 0);

  function update(elapsed: number): void {
    for (const layer of layers) {
      layer.rotation.y = elapsed * (layer.userData.spinSpeed as number);
    }
  }

  return { group, intensity, update };
}
