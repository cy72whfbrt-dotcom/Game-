import * as THREE from 'three';
import { ringVertexShader, ringFragmentShader } from '../shaders/ringShader.js';

const RING_CONFIGS = [
  { radius: 1.05, tube: 0.018, color: 0x6ee7f5, speed: 0.22, segments: 18, spin: 0.06 },
  { radius: 1.35, tube: 0.012, color: 0xb18cff, speed: -0.16, segments: 26, spin: -0.04 },
  { radius: 1.65, tube: 0.01, color: 0x6ee7f5, speed: 0.3, segments: 34, spin: 0.03 },
];

/**
 * Real 3D torus rings lying flat on the pedestal, each with an independent
 * rotation speed and a shader-driven rune/segment pattern scrolling around it.
 */
export function buildEnergyRings() {
  const group = new THREE.Group();
  const rings = [];

  RING_CONFIGS.forEach((cfg) => {
    const uniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(cfg.color) },
      uSpeed: { value: cfg.speed },
      uSegments: { value: cfg.segments },
      uIntensity: { value: 1.0 },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: ringVertexShader,
      fragmentShader: ringFragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const geometry = new THREE.TorusGeometry(cfg.radius, cfg.tube, 8, 96);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = 0.02;
    group.add(mesh);
    rings.push({ mesh, uniforms, spin: cfg.spin });
  });

  return { group, rings };
}

export function updateEnergyRings(rings, time, energy) {
  rings.forEach(({ mesh, uniforms, spin }) => {
    uniforms.uTime.value = time;
    uniforms.uIntensity.value = 0.7 + energy * 0.6;
    mesh.rotation.z = time * spin;
  });
}
