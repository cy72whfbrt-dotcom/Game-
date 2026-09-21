// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import * as THREE from "three/webgpu";
import { createEnvironmentScene } from "./EnvironmentScene";

export interface LightRig {
  key: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
  fill: THREE.DirectionalLight;
  ambient: THREE.HemisphereLight;
  emberPoint: THREE.PointLight;
  frostPoint: THREE.PointLight;
  update(elapsed: number, pointer: THREE.Vector2): void;
  dispose(): void;
}

/**
 * Cinematic three-point rig (key / rim / fill) plus two colored point lights
 * that stand in for the VFX actually lighting the character, and an HDR-ish
 * PMREM environment for physically based reflections.
 */
export function createLightingRig(scene: THREE.Scene, renderer: THREE.WebGPURenderer, shadowMapSize: number): LightRig {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(createEnvironmentScene(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.55;

  const key = new THREE.DirectionalLight(0xfff1d6, 3.2);
  key.position.set(4.5, 7.5, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -4;
  key.shadow.bias = -0.0015;
  key.shadow.radius = 3;
  scene.add(key);
  scene.add(key.target);

  const rim = new THREE.DirectionalLight(0x8fd0ff, 2.6);
  rim.position.set(-5, 4.5, -6);
  scene.add(rim);
  scene.add(rim.target);

  const fill = new THREE.DirectionalLight(0x5a4a7a, 0.6);
  fill.position.set(-3, 2, 4);
  scene.add(fill);
  scene.add(fill.target);

  const ambient = new THREE.HemisphereLight(0x392e55, 0x0a0710, 0.65);
  scene.add(ambient);

  const emberPoint = new THREE.PointLight(0xff8a3d, 6, 9, 2);
  emberPoint.position.set(0, 1.1, 1.6);
  scene.add(emberPoint);

  const frostPoint = new THREE.PointLight(0x6fc7ff, 5, 8, 2);
  frostPoint.position.set(0, 2.4, -1.4);
  scene.add(frostPoint);

  function update(elapsed: number, pointer: THREE.Vector2): void {
    const flicker = 1 + Math.sin(elapsed * 9.1) * 0.06 + Math.sin(elapsed * 23.7) * 0.03;
    emberPoint.intensity = 6 * flicker;
    frostPoint.intensity = 5 * (1 + Math.sin(elapsed * 5.3 + 1.4) * 0.08);

    key.position.x = 4.5 + pointer.x * 1.2;
    key.position.y = 7.5 + pointer.y * 0.6;
    key.target.position.set(0, 1.2, 0);

    rim.position.x = -5 - pointer.x * 0.8;
    fill.target.position.set(0, 1, 0);
  }

  function dispose(): void {
    envRT.dispose();
    pmrem.dispose();
  }

  return { key, rim, fill, ambient, emberPoint, frostPoint, update, dispose };
}
