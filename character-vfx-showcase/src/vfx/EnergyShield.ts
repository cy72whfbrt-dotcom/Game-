// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import * as THREE from "three/webgpu";
import { color, mx_noise_float, oscSine, positionLocal, uniform, uv } from "three/tsl";
import { clock } from "../utils/Clock";
import { fresnelTerm } from "./shaders/Fresnel";
import { PEDESTAL_TOP_Y } from "../utils/Constants";

export interface EnergyShield {
  mesh: THREE.Mesh;
  intensity: ReturnType<typeof uniform>;
  update(elapsed: number): void;
}

/**
 * The big translucent "barrier" shell that wraps the whole character —
 * a tapered cylinder (wide at the base, narrowing toward the top) with a
 * hex-grid scanline pattern, additive fresnel rim and a slow vertical
 * energy scroll, on top of (not instead of) the tighter fresnel aura.
 */
export function createEnergyShield(): EnergyShield {
  const intensity = uniform(1);

  const geo = new THREE.CylinderGeometry(1.35, 0.75, 3.6, 48, 24, true);
  const mat = new THREE.MeshBasicNodeMaterial();
  mat.transparent = true;
  mat.blending = THREE.AdditiveBlending;
  mat.depthWrite = false;
  mat.side = THREE.DoubleSide;

  const fresnel = fresnelTerm(1.6);

  // Hex-ish scanline grid: two interleaved stripe frequencies scrolling in opposite directions.
  const scrollA = uv().y.mul(10).sub(clock.uElapsed.mul(0.35)).fract();
  const bandA = scrollA.sub(0.5).abs().oneMinus().smoothstep(0.75, 0.98);
  const scrollB = uv().x.mul(24).add(uv().y.mul(6)).add(clock.uElapsed.mul(0.12)).fract();
  const bandB = scrollB.sub(0.5).abs().oneMinus().smoothstep(0.9, 0.995);

  const drift = mx_noise_float(positionLocal.mul(1.4).add(clock.uElapsed.mul(0.08))).mul(0.5).add(0.5);
  const pulse = oscSine(clock.uElapsed.mul(0.9)).mul(0.2).add(0.8);

  mat.colorNode = color(new THREE.Color(0x6fc7ff)).mix(color(new THREE.Color(0xc9a3ff)), drift.mul(0.5));
  mat.opacityNode = fresnel
    .mul(0.35)
    .add(bandA.mul(0.5))
    .add(bandB.mul(0.35))
    .mul(pulse)
    .mul(intensity)
    .mul(0.6)
    .saturate();

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, PEDESTAL_TOP_Y + 1.7, 0);
  mesh.renderOrder = 3;

  function update(elapsed: number): void {
    mesh.rotation.y = elapsed * 0.05;
  }

  return { mesh, intensity, update };
}
