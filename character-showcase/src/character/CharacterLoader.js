import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildPlaceholderCharacter } from './PlaceholderCharacter.js';

const GLB_PATH = 'assets/character/character.glb';

/**
 * Loads assets/character/character.glb if present; otherwise falls back to a
 * fully procedural 3D placeholder built from real meshes (see PlaceholderCharacter.js).
 * @param {import('three').Scene} scene
 * @returns {Promise<{ root: import('three').Object3D, isPlaceholder: boolean }>}
 */
export function loadCharacter(scene) {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();

    loader.load(
      GLB_PATH,
      (gltf) => {
        const root = gltf.scene;
        root.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        scene.add(root);
        resolve({ root, isPlaceholder: false });
      },
      undefined,
      () => {
        const root = buildPlaceholderCharacter();
        scene.add(root);
        resolve({ root, isPlaceholder: true });
      }
    );
  });
}
