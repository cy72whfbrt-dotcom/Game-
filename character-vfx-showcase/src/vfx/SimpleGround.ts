// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import * as THREE from "three/webgpu";

/** Plain flat stone floor — no pedestal, no cracks, just a surface to stand on. */
export function createSimpleGround(): THREE.Mesh {
  const mat = new THREE.MeshStandardNodeMaterial();
  mat.color = new THREE.Color(0x1c1a22);
  mat.roughness = 0.9;
  mat.metalness = 0.05;

  const mesh = new THREE.Mesh(new THREE.CircleGeometry(6, 48), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}
