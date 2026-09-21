// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import * as THREE from "three/webgpu";
import { color, mx_noise_float, oscSine, texture, uv } from "three/tsl";
import { clock } from "../utils/Clock";
import { createCrackTexture } from "../utils/ProceduralTextures";
import { GPUParticleSystem } from "./particles/GPUParticleSystem";
import { PEDESTAL_TOP_Y } from "../utils/Constants";

export interface GroundVFX {
  group: THREE.Group;
  pedestal: THREE.Group;
  emberParticles: GPUParticleSystem;
  update(elapsed: number): void;
}

/** Old stone pedestal with glowing cracks, rising embers and a soft ground mist plane. */
export function createGroundVFX(particleBudget: number): GroundVFX {
  const group = new THREE.Group();
  const pedestal = new THREE.Group();
  group.add(pedestal);

  const stoneMat = new THREE.MeshStandardNodeMaterial();
  stoneMat.color = new THREE.Color(0x2a2622);
  stoneMat.roughness = 0.95;
  stoneMat.metalness = 0.05;

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.9, 0.5, 24, 1), stoneMat);
  base.position.y = 0.25;
  base.castShadow = true;
  base.receiveShadow = true;
  pedestal.add(base);

  const mid = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.6, 0.35, 24, 1), stoneMat);
  mid.position.y = 0.62;
  mid.castShadow = true;
  mid.receiveShadow = true;
  pedestal.add(mid);

  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.16, 24, 1), stoneMat);
  top.position.y = 0.86;
  top.castShadow = true;
  top.receiveShadow = true;
  pedestal.add(top);

  // Crack overlay ring on the top surface, emissive.
  const crackMat = new THREE.MeshBasicNodeMaterial();
  crackMat.transparent = true;
  crackMat.blending = THREE.AdditiveBlending;
  crackMat.depthWrite = false;
  const crackTex = texture(createCrackTexture(3), uv());
  const pulse = oscSine(clock.uElapsed.mul(1.7)).mul(0.4).add(0.7);
  crackMat.colorNode = color(new THREE.Color(0x6fc7ff));
  crackMat.opacityNode = crackTex.r.mul(pulse).mul(1.3).saturate();
  const crackDisc = new THREE.Mesh(new THREE.CircleGeometry(1.16, 32), crackMat);
  crackDisc.rotation.x = -Math.PI / 2;
  crackDisc.position.y = 0.945;
  crackDisc.renderOrder = 3;
  pedestal.add(crackDisc);

  // Side crack bands
  for (let i = 0; i < 3; i++) {
    const sideCrack = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), crackMat);
    const angle = (i / 3) * Math.PI * 2;
    sideCrack.position.set(Math.cos(angle) * 1.85, 0.25, Math.sin(angle) * 1.85);
    sideCrack.lookAt(0, 0.25, 0);
    sideCrack.rotateY(Math.PI);
    sideCrack.renderOrder = 3;
    pedestal.add(sideCrack);
  }

  // Soft ground mist
  const mistMat = new THREE.MeshBasicNodeMaterial();
  mistMat.transparent = true;
  mistMat.depthWrite = false;
  mistMat.blending = THREE.NormalBlending;
  const mistNoise = mx_noise_float(uv().mul(3).add(clock.uElapsed.mul(0.03)));
  const mistEdge = uv().sub(0.5).length().oneMinus().smoothstep(0.15, 0.5);
  mistMat.colorNode = color(new THREE.Color(0x2a2440));
  mistMat.opacityNode = mistEdge.mul(mistNoise.mul(0.15).add(0.18)).saturate();
  const mist = new THREE.Mesh(new THREE.CircleGeometry(4.2, 48), mistMat);
  mist.rotation.x = -Math.PI / 2;
  mist.position.y = 0.02;
  mist.renderOrder = 1;
  group.add(mist);

  const emberParticles = new GPUParticleSystem({
    count: particleBudget,
    radius: 1.1,
    height: 1.4,
    riseSpeed: [0.4, 1.1],
    size: [0.02, 0.06],
    colorA: new THREE.Color(0xffb15c),
    colorB: new THREE.Color(0x6fc7ff),
    origin: new THREE.Vector3(0, PEDESTAL_TOP_Y, 0),
  });
  group.add(emberParticles.mesh);

  function update(elapsed: number): void {
    void elapsed;
  }

  return { group, pedestal, emberParticles, update };
}
