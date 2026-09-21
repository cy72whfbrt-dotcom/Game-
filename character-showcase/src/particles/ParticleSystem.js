import * as THREE from 'three';

const dummy = new THREE.Object3D();

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function makeParticle(kind) {
  if (kind === 'ember') {
    return {
      angle: rand(0, Math.PI * 2),
      radius: rand(0.15, 0.85),
      y: rand(0.0, 0.3),
      riseSpeed: rand(0.25, 0.55),
      spiralSpeed: rand(0.3, 0.9) * (Math.random() < 0.5 ? 1 : -1),
      wobble: rand(0.5, 1.5),
      phase: rand(0, Math.PI * 2),
      size: rand(0.012, 0.026),
      colorT: Math.random(),
      maxY: rand(1.6, 2.4),
    };
  }
  // ambient dust, wide volume around the whole scene
  return {
    x: rand(-3.2, 3.2),
    y: rand(0.1, 3.2),
    z: rand(-3.2, 3.2),
    driftX: rand(-0.05, 0.05),
    driftY: rand(0.02, 0.08),
    driftZ: rand(-0.05, 0.05),
    phase: rand(0, Math.PI * 2),
    size: rand(0.006, 0.016),
  };
}

/**
 * GPU-instanced particle systems: embers spiral up around the character in
 * real 3D (x/y/z), ambient dust drifts through the whole volume. Both are
 * rendered as a single InstancedMesh draw call each, not per-particle divs.
 */
export function buildParticleSystems() {
  const emberCount = 220;
  const dustCount = 160;

  const emberGeo = new THREE.IcosahedronGeometry(1, 0);
  const emberMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const embers = new THREE.InstancedMesh(emberGeo, emberMat, emberCount);
  embers.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(emberCount * 3), 3);
  embers.frustumCulled = false;

  const dustGeo = new THREE.IcosahedronGeometry(1, 0);
  const dustMat = new THREE.MeshBasicMaterial({
    color: 0x8fb8d8,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const dust = new THREE.InstancedMesh(dustGeo, dustMat, dustCount);
  dust.frustumCulled = false;

  const emberData = Array.from({ length: emberCount }, () => makeParticle('ember'));
  const dustData = Array.from({ length: dustCount }, () => makeParticle('dust'));

  const colorEmber = new THREE.Color(0xff9a42);
  const colorArcane = new THREE.Color(0x6ee7f5);
  const tmpColor = new THREE.Color();

  emberData.forEach((p, i) => {
    tmpColor.copy(p.colorT > 0.6 ? colorArcane : colorEmber);
    embers.setColorAt(i, tmpColor);
  });
  embers.instanceColor.needsUpdate = true;

  return { embers, dust, emberData, dustData };
}

export function updateParticleSystems(systems, dt, time, energy, center = new THREE.Vector3(0, 0, 0)) {
  const { embers, dust, emberData, dustData } = systems;
  const speedMul = 1 + energy * 0.6;

  for (let i = 0; i < emberData.length; i++) {
    const p = emberData[i];
    p.y += p.riseSpeed * dt * speedMul;
    p.angle += p.spiralSpeed * dt * (0.6 + energy * 0.4);

    if (p.y > p.maxY) {
      p.y = 0.0;
      p.radius = rand(0.15, 0.85);
    }

    const wob = Math.sin(time * p.wobble + p.phase) * 0.06;
    const x = center.x + Math.cos(p.angle) * (p.radius + wob);
    const z = center.z + Math.sin(p.angle) * (p.radius + wob);
    const lifeT = p.y / p.maxY;
    const fade = Math.sin(Math.min(lifeT, 1) * Math.PI); // fades in and out

    dummy.position.set(x, p.y, z);
    const s = p.size * (0.6 + fade * 0.8);
    dummy.scale.setScalar(Math.max(s, 0.0001));
    dummy.rotation.set(time + i, time * 0.6 + i, 0);
    dummy.updateMatrix();
    embers.setMatrixAt(i, dummy.matrix);
  }
  embers.instanceMatrix.needsUpdate = true;

  for (let i = 0; i < dustData.length; i++) {
    const p = dustData[i];
    p.x += p.driftX * dt;
    p.y += p.driftY * dt;
    p.z += p.driftZ * dt;
    if (p.y > 3.4) p.y = 0.05;

    const flicker = 0.6 + 0.4 * Math.sin(time * 1.4 + p.phase);
    dummy.position.set(p.x, p.y, p.z);
    dummy.scale.setScalar(p.size * flicker);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    dust.setMatrixAt(i, dummy.matrix);
  }
  dust.instanceMatrix.needsUpdate = true;
}
