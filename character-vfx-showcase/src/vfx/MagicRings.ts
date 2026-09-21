// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import * as THREE from "three/webgpu";
import { color, mx_noise_float, oscSine, texture, uniform, uv, vec2 } from "three/tsl";
import { clock } from "../utils/Clock";
import { createRingRuneTexture } from "../utils/ProceduralTextures";

export interface MagicRings {
  group: THREE.Group;
  groundLight: THREE.PointLight;
  update(elapsed: number): void;
}

interface RingDef {
  radius: number;
  tube: number;
  speed: number;
  color: THREE.Color;
  runeCount: number;
}

/**
 * 5 concentric shader-driven rune rings under the pedestal, each rotating at
 * its own speed/direction with a pulsing emissive intensity and a soft
 * animated distortion of the rune alpha mask.
 */
export function createMagicRings(): MagicRings {
  const group = new THREE.Group();

  const defs: RingDef[] = [
    { radius: 1.55, tube: 0.22, speed: 0.09, color: new THREE.Color(0x5fd0ff), runeCount: 10 },
    { radius: 1.95, tube: 0.16, speed: -0.14, color: new THREE.Color(0x9a6bff), runeCount: 14 },
    { radius: 2.3, tube: 0.12, speed: 0.2, color: new THREE.Color(0xff8a3d), runeCount: 8 },
    { radius: 2.62, tube: 0.08, speed: -0.27, color: new THREE.Color(0x5fd0ff), runeCount: 18 },
    { radius: 2.9, tube: 0.05, speed: 0.35, color: new THREE.Color(0xffe19a), runeCount: 22 },
  ];

  const meshes: THREE.Mesh[] = [];

  defs.forEach((def, i) => {
    const geo = new THREE.RingGeometry(def.radius - def.tube, def.radius + def.tube, 96, 1);
    const mat = new THREE.MeshBasicNodeMaterial();
    mat.transparent = true;
    mat.blending = THREE.AdditiveBlending;
    mat.depthWrite = false;
    mat.side = THREE.DoubleSide;

    const runeTex = texture(createRingRuneTexture(def.runeCount, i * 12.3), uv());
    const warpedUv = uv().add(
      vec2(mx_noise_float(uv().mul(6).add(clock.uElapsed.mul(0.15))), mx_noise_float(uv().mul(6).add(clock.uElapsed.mul(0.11).add(4.0)))).mul(
        0.01,
      ),
    );
    const warpedRune = texture(createRingRuneTexture(def.runeCount, i * 12.3), warpedUv);
    const pulse = oscSine(clock.uElapsed.mul(1.2).add(i * 1.3)).mul(0.35).add(0.85);

    mat.colorNode = color(def.color);
    mat.opacityNode = warpedRune.a.mul(pulse).mul(0.95);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.02 + i * 0.002;
    mesh.userData.speed = def.speed;
    mesh.renderOrder = 2;
    meshes.push(mesh);
    group.add(mesh);
  });

  const groundLight = new THREE.PointLight(0x6fc7ff, 8, 6, 2);
  groundLight.position.set(0, 0.3, 0);
  group.add(groundLight);

  function update(elapsed: number): void {
    for (const m of meshes) {
      m.rotation.z = elapsed * (m.userData.speed as number);
    }
    groundLight.intensity = 7 + Math.sin(elapsed * 2.1) * 1.5;
  }

  return { group, groundLight, update };
}
