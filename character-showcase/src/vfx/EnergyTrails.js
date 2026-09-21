import * as THREE from 'three';
import { trailVertexShader, trailFragmentShader } from '../shaders/trailShader.js';

const TRAIL_CONFIGS = [
  { radius: 0.62, turns: 2.2, height: 1.9, yStart: 0.05, color: 0x6ee7f5, speed: 0.5, rotSpeed: 0.18, tube: 0.014 },
  { radius: 0.78, turns: 1.7, height: 1.75, yStart: 0.1, color: 0xb18cff, speed: -0.4, rotSpeed: -0.12, tube: 0.011 },
];

function buildSpiralCurve(cfg, phase) {
  const points = [];
  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * Math.PI * 2 * cfg.turns + phase;
    const y = cfg.yStart + t * cfg.height;
    const r = cfg.radius * (0.85 + 0.15 * Math.sin(t * Math.PI));
    points.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
  }
  return new THREE.CatmullRomCurve3(points);
}

/**
 * Spiral energy trails as real TubeGeometry meshes winding through 3D space
 * around the character, with a shader-driven scrolling glow along their length.
 */
export function buildEnergyTrails() {
  const group = new THREE.Group();
  const trails = [];

  TRAIL_CONFIGS.forEach((cfg, i) => {
    const curve = buildSpiralCurve(cfg, i * 1.7);
    const geometry = new THREE.TubeGeometry(curve, 140, cfg.tube, 8, false);

    const uniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(cfg.color) },
      uSpeed: { value: cfg.speed },
      uIntensity: { value: 1.0 },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: trailVertexShader,
      fragmentShader: trailFragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    trails.push({ mesh, uniforms, rotSpeed: cfg.rotSpeed });
  });

  return { group, trails };
}

export function updateEnergyTrails(trails, time, energy) {
  trails.forEach(({ mesh, uniforms, rotSpeed }) => {
    uniforms.uTime.value = time;
    uniforms.uIntensity.value = 0.7 + energy * 0.7;
    mesh.rotation.y = time * rotSpeed;
  });
}
