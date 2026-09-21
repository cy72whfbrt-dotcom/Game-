import * as THREE from 'three';
import { crackVertexShader, crackFragmentShader } from '../shaders/crackShader.js';

/**
 * Real 3D stone pedestal: a beveled cylinder with a noise-displaced top face,
 * plus a thin overlay disc carrying the shader-driven glowing crack pattern.
 */
export function buildGround() {
  const group = new THREE.Group();
  group.name = 'Ground';

  const radius = 2.4;
  const height = 0.5;
  const radialSegments = 48;

  const geo = new THREE.CylinderGeometry(radius, radius * 1.08, height, radialSegments, 6, false);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y > height / 2 - 0.01) {
      const n = Math.sin(x * 3.1) * Math.cos(z * 2.7) * 0.012 + Math.sin(x * 9.3 + z * 6.1) * 0.006;
      pos.setY(i, y + n);
    }
  }
  geo.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x2b2620,
    roughness: 0.92,
    metalness: 0.05,
  });

  const pedestal = new THREE.Mesh(geo, material);
  pedestal.position.y = -height / 2;
  pedestal.receiveShadow = true;
  pedestal.castShadow = true;
  group.add(pedestal);

  // stepped base ring for depth
  const baseRing = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.16, radius * 1.24, 0.18, radialSegments),
    material
  );
  baseRing.position.y = -height - 0.09;
  baseRing.receiveShadow = true;
  baseRing.castShadow = true;
  group.add(baseRing);

  // glowing crack overlay, shader-driven
  const crackUniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x6ee7f5) },
    uIntensity: { value: 1.0 },
  };
  const crackMat = new THREE.ShaderMaterial({
    vertexShader: crackVertexShader,
    fragmentShader: crackFragmentShader,
    uniforms: crackUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const cracks = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.98, radialSegments), crackMat);
  cracks.rotation.x = -Math.PI / 2;
  cracks.position.y = 0.006;
  group.add(cracks);

  group.userData.crackUniforms = crackUniforms;
  group.userData.radius = radius;

  return group;
}
