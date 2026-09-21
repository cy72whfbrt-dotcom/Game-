import * as THREE from 'three';

const STEEL = { color: 0x555a63, metalness: 0.9, roughness: 0.32 };
const DARK_STEEL = { color: 0x2b2e35, metalness: 0.85, roughness: 0.38 };
const GOLD = { color: 0xc9a25a, metalness: 0.95, roughness: 0.28 };
const CLOTH = { color: 0x241a3e, metalness: 0.0, roughness: 0.92 };
const LEATHER = { color: 0x2a1f16, metalness: 0.1, roughness: 0.75 };

function steelMat(opts = {}) {
  return new THREE.MeshStandardMaterial({ ...STEEL, ...opts });
}

function emissiveMat(color, intensity = 2.2) {
  return new THREE.MeshStandardMaterial({
    color: 0x050505,
    metalness: 0.2,
    roughness: 0.3,
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    toneMapped: false,
  });
}

function mesh(geometry, material, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, castShadow = true } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = castShadow;
  m.receiveShadow = true;
  return m;
}

function buildLeg(sign) {
  const group = new THREE.Group();
  const thigh = mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.42, 10), steelMat(DARK_STEEL), { y: 0.62 });
  const shin = mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.4, 10), steelMat(DARK_STEEL), { y: 0.24 });
  const knee = mesh(new THREE.SphereGeometry(0.09, 12, 10), steelMat(GOLD), { y: 0.42 });
  const boot = mesh(new THREE.BoxGeometry(0.16, 0.14, 0.28), steelMat({ ...DARK_STEEL, roughness: 0.5 }), { y: 0.06, z: 0.04 });
  group.add(thigh, shin, knee, boot);
  group.position.x = sign * 0.15;
  return group;
}

function buildArm(sign) {
  const group = new THREE.Group();
  const upper = mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.34, 10), steelMat(STEEL), { y: -0.2, rz: sign * 0.06 });
  const elbow = mesh(new THREE.SphereGeometry(0.07, 12, 10), steelMat(GOLD), { y: -0.4 });
  const fore = mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.32, 10), steelMat(DARK_STEEL), { y: -0.6, rz: sign * -0.03 });
  const gauntlet = mesh(new THREE.BoxGeometry(0.11, 0.14, 0.11), steelMat({ ...DARK_STEEL, roughness: 0.45 }), { y: -0.8 });
  group.add(upper, elbow, fore, gauntlet);
  return group;
}

function buildCape(root) {
  const width = 0.62;
  const height = 0.95;
  const wSeg = 10;
  const hSeg = 14;
  const geo = new THREE.PlaneGeometry(width, height, wSeg, hSeg);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = (y + height / 2) / height; // 0 top .. 1 bottom
    const sway = Math.sin(t * Math.PI * 1.4) * 0.05 * t;
    const bulge = Math.pow(t, 1.3) * 0.14;
    pos.setZ(i, -bulge + sway * Math.sign(x || 1) * 0.3);
  }
  geo.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    ...CLOTH,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0x120a24),
    emissiveIntensity: 0.4,
  });
  const cape = new THREE.Mesh(geo, material);
  cape.position.set(0, 1.16, -0.16);
  cape.castShadow = true;
  cape.receiveShadow = true;
  cape.userData.isCape = true;
  root.add(cape);
  return cape;
}

export function buildPlaceholderCharacter() {
  const root = new THREE.Group();
  root.name = 'PlaceholderCharacter';

  // legs + boots
  root.add(buildLeg(-1));
  root.add(buildLeg(1));

  // belt
  const belt = mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.09, 20, 1, true), steelMat(LEATHER), { y: 0.86 });
  const buckle = mesh(new THREE.BoxGeometry(0.09, 0.09, 0.03), steelMat(GOLD), { y: 0.86, z: 0.22 });
  root.add(belt, buckle);

  // torso
  const torso = mesh(new THREE.BoxGeometry(0.42, 0.44, 0.26, 2, 2, 2), steelMat(STEEL), { y: 1.14 });
  root.add(torso);

  const chestTrim = mesh(new THREE.TorusGeometry(0.18, 0.012, 8, 24), steelMat(GOLD), { y: 1.3, rx: Math.PI / 2 });
  root.add(chestTrim);

  // glowing core
  const core = mesh(new THREE.SphereGeometry(0.065, 20, 16), emissiveMat(0x6ee7f5, 3.2), { y: 1.16, z: 0.14 });
  root.add(core);

  const corePoint = new THREE.PointLight(0x6ee7f5, 6, 3.2, 2.0);
  corePoint.position.copy(core.position);
  root.add(corePoint);

  // neck + helm
  const neck = mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.08, 12), steelMat(DARK_STEEL), { y: 1.42 });
  const helm = mesh(new THREE.ConeGeometry(0.135, 0.28, 8, 1, false), steelMat(STEEL), { y: 1.6 });
  helm.rotation.x = Math.PI;
  const visor = mesh(new THREE.BoxGeometry(0.16, 0.02, 0.02), emissiveMat(0x6ee7f5, 4.0), { y: 1.54, z: 0.1 });
  root.add(neck, helm, visor);

  // shoulders (pauldrons)
  const pauldronGeo = new THREE.SphereGeometry(0.14, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.62);
  [-1, 1].forEach((sign) => {
    const pauldron = mesh(pauldronGeo, steelMat(STEEL), {
      x: sign * 0.33,
      y: 1.38,
      rz: sign * -0.15,
      ry: sign > 0 ? Math.PI : 0,
    });
    root.add(pauldron);

    const armGroup = buildArm(sign);
    armGroup.position.set(sign * 0.34, 1.3, 0);
    root.add(armGroup);
  });

  // weapon (right hand)
  const weapon = new THREE.Group();
  const hilt = mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.22, 8), steelMat(LEATHER), { y: 0.11 });
  const guard = mesh(new THREE.BoxGeometry(0.14, 0.02, 0.03), steelMat(GOLD), { y: 0.23 });
  const blade = mesh(new THREE.BoxGeometry(0.035, 0.62, 0.012), emissiveMat(0x6ee7f5, 2.4), { y: 0.55 });
  const orb = mesh(new THREE.SphereGeometry(0.045, 14, 12), emissiveMat(0xb18cff, 3.0), { y: 0.86 });
  weapon.add(hilt, guard, blade, orb);
  weapon.position.set(0.42, 0.58, 0.05);
  weapon.rotation.z = -0.06;
  root.add(weapon);

  // cape
  const cape = buildCape(root);

  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  root.userData.corePosition = core.position.clone();
  root.userData.weaponTip = new THREE.Vector3(0.42, 1.44, 0.05);
  root.userData.cape = cape;
  root.userData.corePoint = corePoint;

  return root;
}
