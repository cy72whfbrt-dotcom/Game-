import * as THREE from 'three';

/**
 * Real 3D light rig: warm key light (shadow caster), cool rim light,
 * soft hemisphere fill, and two magic point lights that also tint the armor.
 */
export function buildLighting(scene) {
  const key = new THREE.DirectionalLight(0xfff1d8, 2.4);
  key.position.set(2.6, 4.2, 2.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 12;
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  key.shadow.bias = -0.0015;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x8fd6ff, 1.6);
  rim.position.set(-2.8, 2.6, -3.2);
  scene.add(rim);

  const fill = new THREE.HemisphereLight(0x2a2f45, 0x0a0806, 0.55);
  scene.add(fill);

  const arcanePoint = new THREE.PointLight(0x6ee7f5, 2.4, 3.6, 2.2);
  arcanePoint.position.set(0, 1.1, 0.3);
  scene.add(arcanePoint);

  const violetPoint = new THREE.PointLight(0xb18cff, 1.7, 3.2, 2.2);
  violetPoint.position.set(0.5, 1.5, 0.2);
  scene.add(violetPoint);

  return { key, rim, fill, arcanePoint, violetPoint };
}
