// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import * as THREE from "three/webgpu";
import { color } from "three/tsl";

/**
 * Minimal stand-in for three's RoomEnvironment addon, rebuilt with
 * NodeMaterial-only meshes: RoomEnvironment itself uses plain
 * MeshStandardMaterial/MeshBasicMaterial, which the WebGPURenderer's node
 * pipeline rejects, so this produces an equivalent enclosed room of warm
 * and cool "area lights" for PMREM to bake into a usable HDR environment.
 */
export function createEnvironmentScene(): THREE.Scene {
  const scene = new THREE.Scene();

  const roomMat = new THREE.MeshBasicNodeMaterial();
  roomMat.colorNode = color(new THREE.Color(0x0c0a14));
  roomMat.side = THREE.BackSide;
  const room = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), roomMat);
  scene.add(room);

  const lightDefs: { pos: [number, number, number]; size: [number, number, number]; col: number; intensity: number }[] = [
    { pos: [-8, 6, -6], size: [4, 4, 0.1], col: 0x5f9dff, intensity: 6 },
    { pos: [8, 4, -4], size: [3, 6, 0.1], col: 0xffb15c, intensity: 5 },
    { pos: [0, 10, 4], size: [8, 0.1, 4], col: 0xffffff, intensity: 4 },
    { pos: [-6, -4, 6], size: [4, 4, 0.1], col: 0x9a6bff, intensity: 3 },
  ];

  for (const def of lightDefs) {
    const mat = new THREE.MeshBasicNodeMaterial();
    mat.colorNode = color(new THREE.Color(def.col)).mul(def.intensity);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(def.size[0], def.size[1], def.size[2]), mat);
    mesh.position.set(def.pos[0], def.pos[1], def.pos[2]);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  }

  return scene;
}
