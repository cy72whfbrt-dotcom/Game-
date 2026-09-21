// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import * as THREE from "three/webgpu";

export interface SimpleCharacter {
  root: THREE.Group;
  update(elapsed: number): void;
}

/**
 * Deliberately minimal placeholder: a capsule body + sphere head. The point
 * of this scene is the VFX layered around it, not the character mesh — swap
 * this for a GLTFLoader result later without touching anything else.
 */
export function buildSimpleCharacter(): SimpleCharacter {
  const root = new THREE.Group();

  const bodyMat = new THREE.MeshStandardNodeMaterial();
  bodyMat.color = new THREE.Color(0x6b7280);
  bodyMat.roughness = 0.35;
  bodyMat.metalness = 0.55;

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.1, 8, 16), bodyMat);
  body.position.y = 1.05;
  body.castShadow = true;
  body.receiveShadow = true;
  root.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 16), bodyMat);
  head.position.y = 1.95;
  head.castShadow = true;
  root.add(head);

  function update(elapsed: number): void {
    root.position.y = Math.sin(elapsed * 1.4) * 0.02;
  }

  return { root, update };
}
