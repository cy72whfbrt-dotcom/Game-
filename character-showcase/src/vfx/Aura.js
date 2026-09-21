import * as THREE from 'three';
import { auraVertexShader, auraFragmentShader } from '../shaders/auraShader.js';

/**
 * A 3D energy hull wrapped around the character: fresnel rim, animated noise,
 * additive transparency — a real mesh in space, not a CSS glow.
 */
export function buildAura() {
  const uniforms = {
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color(0x6ee7f5) },
    uColorB: { value: new THREE.Color(0xb18cff) },
    uIntensity: { value: 0.32 },
    uFresnelPower: { value: 3.4 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: auraVertexShader,
    fragmentShader: auraFragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });

  const geometry = new THREE.CapsuleGeometry(0.52, 1.05, 6, 20);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 1.05;
  mesh.scale.set(1.15, 1.05, 1.15);
  mesh.renderOrder = 10;

  return { mesh, uniforms };
}

export function updateAura(aura, time, energy) {
  aura.uniforms.uTime.value = time;
  aura.uniforms.uIntensity.value = 0.22 + energy * 0.4;
  aura.mesh.rotation.y = time * 0.12;
}
