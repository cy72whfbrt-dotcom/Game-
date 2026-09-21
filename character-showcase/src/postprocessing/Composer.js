import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { VignetteGrainShader } from '../shaders/vignetteGrainShader.js';

/**
 * Full post-processing chain: SSAO (contact/ambient occlusion) -> Bloom
 * (glow for emissive VFX) -> Bokeh depth-of-field -> vignette + film grain
 * -> ACES output. Built as a class so main.js can update/resize it each frame.
 */
export class Composer {
  constructor(renderer, scene, camera, width, height) {
    this.composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    this.ssaoPass = new SSAOPass(scene, camera, width, height);
    this.ssaoPass.kernelRadius = 0.35;
    this.ssaoPass.minDistance = 0.0015;
    this.ssaoPass.maxDistance = 0.15;
    this.ssaoPass.output = SSAOPass.OUTPUT.Default;
    this.composer.addPass(this.ssaoPass);

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.55, 0.4, 0.82);
    this.composer.addPass(this.bloomPass);

    this.bokehPass = new BokehPass(scene, camera, {
      focus: 4.4,
      aperture: 0.0011,
      maxblur: 0.006,
    });
    this.composer.addPass(this.bokehPass);

    this.vignettePass = new ShaderPass(VignetteGrainShader);
    this.composer.addPass(this.vignettePass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  setSize(width, height) {
    this.composer.setSize(width, height);
    this.ssaoPass.setSize(width, height);
    this.bokehPass.setSize?.(width, height);
  }

  update(time) {
    this.vignettePass.uniforms.uTime.value = time;
  }

  render() {
    this.composer.render();
  }
}
