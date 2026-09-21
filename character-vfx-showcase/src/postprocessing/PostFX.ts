// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import * as THREE from "three/webgpu";
import {
  bloom,
  dof,
  film,
  pass,
  rgbShift,
  screenUV,
  uniform,
  vec3,
  vec4,
} from "three/tsl";

export interface PostFXOptions {
  bloomEnabled: boolean;
  dofEnabled: boolean;
  filmGrainEnabled: boolean;
}

export interface PostFXPipeline {
  postProcessing: THREE.PostProcessing;
  focusDistance: ReturnType<typeof uniform>;
  rebuild(opts: PostFXOptions): void;
}

/**
 * Single node-graph post pipeline (works on both the WebGPU and WebGL2
 * backends, since it's built from TSL nodes): scene pass -> bloom -> subtle
 * DOF -> color grade + vignette -> chromatic aberration -> film grain ->
 * tone mapping / output color space, all folded into one PostProcessing
 * output node so there is exactly one full-screen composite pass.
 */
export function createPostFX(
  renderer: THREE.WebGPURenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  opts: PostFXOptions,
): PostFXPipeline {
  const postProcessing = new THREE.PostProcessing(renderer);
  const focusDistance = uniform(6.4);

  function rebuild(o: PostFXOptions): void {
    const scenePass = pass(scene, camera);
    const scenePassColor = scenePass.getTextureNode();

    let node = scenePassColor;

    if (o.bloomEnabled) {
      const bloomPass = bloom(scenePassColor, 0.55, 0.35, 0.82);
      node = node.add(bloomPass);
    }

    if (o.dofEnabled) {
      const viewZ = scenePass.getViewZNode();
      node = dof(node, viewZ, focusDistance, 0.018, 1.0);
    }

    {
      const base = node.rgb;
      const luma = base.r.mul(0.299).add(base.g.mul(0.587)).add(base.b.mul(0.114));
      const shadowTint = vec3(0.05, 0.07, 0.12).mul(luma.oneMinus().pow(2));
      const highlightTint = vec3(0.09, 0.05, 0.01).mul(luma.pow(2));
      const gradedColor = base.add(shadowTint).add(highlightTint).mul(1.05).sub(0.015);

      const d = screenUV.sub(0.5).length();
      const vignette = d.smoothstep(0.35, 0.92).oneMinus().mul(0.55).oneMinus();

      node = vec4(gradedColor.mul(vignette), 1.0);
    }

    if (o.filmGrainEnabled) {
      node = film(node, 0.06);
    }

    node = rgbShift(node, 0.0015, 0.0);

    postProcessing.outputNode = node;
    postProcessing.needsUpdate = true;
  }

  rebuild(opts);

  return { postProcessing, focusDistance, rebuild };
}
