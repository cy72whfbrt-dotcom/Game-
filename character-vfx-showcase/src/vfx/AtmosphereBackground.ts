// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import * as THREE from "three/webgpu";
import { color, mx_noise_float, positionWorld, uv } from "three/tsl";
import { clock } from "../utils/Clock";
import { GPUParticleSystem } from "./particles/GPUParticleSystem";

export interface AtmosphereBackground {
  group: THREE.Group;
  dustParticles: GPUParticleSystem;
  update(elapsed: number): void;
}

/** Deep background: gradient sky dome, faint god-rays, distant fog layers and drifting dust motes. */
export function createAtmosphereBackground(scene: THREE.Scene, particleBudget: number): AtmosphereBackground {
  const group = new THREE.Group();

  scene.fog = new THREE.FogExp2(0x08060d, 0.045);
  scene.background = new THREE.Color(0x050308);

  const domeMat = new THREE.MeshBasicNodeMaterial();
  domeMat.side = THREE.BackSide;
  domeMat.fog = false;
  const heightT = positionWorld.y.mul(0.05).add(0.35).saturate();
  const top = color(new THREE.Color(0x140f22));
  const bottom = color(new THREE.Color(0x030204));
  domeMat.colorNode = bottom.mix(top, heightT);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 24, 16), domeMat);
  group.add(dome);

  // Faint volumetric-looking god ray plane layers behind the character.
  for (let i = 0; i < 4; i++) {
    const rayMat = new THREE.MeshBasicNodeMaterial();
    rayMat.transparent = true;
    rayMat.depthWrite = false;
    rayMat.blending = THREE.AdditiveBlending;
    rayMat.side = THREE.DoubleSide;
    const stripes = uv().x.mul(18).add(i * 3.1).fract().sub(0.5).abs().oneMinus().pow(9);
    const drift = mx_noise_float(uv().mul(2).add(clock.uElapsed.mul(0.02).add(i)));
    rayMat.colorNode = color(new THREE.Color(0x8fd0ff));
    rayMat.opacityNode = stripes.mul(drift.mul(0.3).add(0.2)).mul(0.12);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), rayMat);
    plane.position.set(0, 4, -6 - i * 2.2);
    plane.rotation.y = 0.2 * (i % 2 === 0 ? 1 : -1);
    group.add(plane);
  }

  const dustParticles = new GPUParticleSystem({
    count: particleBudget,
    radius: 6.5,
    height: 5.5,
    riseSpeed: [0.05, 0.18],
    size: [0.01, 0.03],
    colorA: new THREE.Color(0x5f6f9a),
    colorB: new THREE.Color(0x2f2a45),
    origin: new THREE.Vector3(0, 0, -1),
  });
  group.add(dustParticles.mesh);

  function update(elapsed: number): void {
    dome.rotation.y = elapsed * 0.004;
  }

  return { group, dustParticles, update };
}
