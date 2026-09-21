// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import * as THREE from "three/webgpu";

export interface RendererResult {
  renderer: THREE.WebGPURenderer;
  backendLabel: string;
}

/**
 * WebGPURenderer transparently falls back to a WebGL2 backend when
 * `navigator.gpu` is unavailable or device init fails, so this is the single
 * "preferred WebGPU, WebGL2 fallback" entry point for the whole app.
 */
export async function createRenderer(canvasHost: HTMLElement): Promise<RendererResult> {
  const renderer = new THREE.WebGPURenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    forceWebGL: !("gpu" in navigator),
  });

  await renderer.init();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  canvasHost.appendChild(renderer.domElement);

  const isWebGPU = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend === true;
  const backendLabel = isWebGPU ? "WebGPU" : "WebGL2";

  return { renderer, backendLabel };
}
