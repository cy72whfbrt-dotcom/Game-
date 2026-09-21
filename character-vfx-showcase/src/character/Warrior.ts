// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import * as THREE from "three/webgpu";
import { color, float, oscSine, positionLocal, uniform, vec3 } from "three/tsl";
import { clock } from "../utils/Clock";
import { PEDESTAL_TOP_Y } from "../utils/Constants";

/**
 * Modular placeholder hero built entirely from primitives, grouped exactly
 * the way a rigged GLB (torso / pelvis / limbs / cape / weapon as separate
 * nodes) would be, so swapping in a real character asset later only means
 * replacing `buildWarrior()`'s body with a GLTFLoader result and keeping the
 * same `Warrior` interface (root, runeEmissive, capeBone, update()).
 */
export interface Warrior {
  root: THREE.Group;
  headAnchor: THREE.Object3D;
  chestAnchor: THREE.Object3D;
  runeIntensity: ReturnType<typeof uniform>;
  update(elapsed: number, dt: number, pointer: THREE.Vector2): void;
}

const METAL_DARK = new THREE.Color(0x2b2e36);
const METAL_STEEL = new THREE.Color(0x9aa4b2);
const LEATHER = new THREE.Color(0x3a2417);
const CLOTH = new THREE.Color(0x5b1620);
const RUNE_COLOR = new THREE.Color(0x7ad4ff);

function metalMaterial(base: THREE.Color, roughness: number, metalness: number): THREE.MeshPhysicalNodeMaterial {
  const mat = new THREE.MeshPhysicalNodeMaterial();
  mat.color = base;
  mat.roughness = roughness;
  mat.metalness = metalness;
  mat.clearcoat = 0.25;
  mat.clearcoatRoughness = 0.35;
  mat.envMapIntensity = 1.1;
  return mat;
}

function fabricMaterial(base: THREE.Color, roughness = 0.85): THREE.MeshStandardNodeMaterial {
  const mat = new THREE.MeshStandardNodeMaterial();
  mat.color = base;
  mat.roughness = roughness;
  mat.metalness = 0.0;
  return mat;
}

function runeEmissiveMaterial(intensity: ReturnType<typeof uniform>): THREE.MeshStandardNodeMaterial {
  const mat = new THREE.MeshStandardNodeMaterial();
  mat.color = new THREE.Color(0x0a0a12);
  mat.roughness = 0.4;
  mat.metalness = 0.6;
  const pulse = oscSine(clock.uElapsed.mul(0.6)).mul(0.35).add(0.65);
  mat.emissiveNode = color(RUNE_COLOR).mul(pulse).mul(intensity).mul(1.1);
  return mat;
}

function box(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d, 2, 2, 2), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function cyl(rt: number, rb: number, h: number, seg: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function sphere(r: number, mat: THREE.Material, wSeg = 20, hSeg = 16): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, wSeg, hSeg), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function cone(r: number, h: number, seg: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildWarrior(): Warrior {
  const root = new THREE.Group();
  root.name = "Warrior";

  const runeIntensity = uniform(1);
  const steel = metalMaterial(METAL_STEEL, 0.32, 0.92);
  const darkSteel = metalMaterial(METAL_DARK, 0.45, 0.85);
  const leather = fabricMaterial(LEATHER, 0.9);
  const cloth = fabricMaterial(CLOTH, 0.95);
  const rune = runeEmissiveMaterial(runeIntensity);

  const pelvis = new THREE.Object3D();
  pelvis.position.y = 1.24;
  root.add(pelvis);

  // --- Legs ---
  const legGroup = new THREE.Group();
  pelvis.add(legGroup);
  for (const side of [-1, 1]) {
    const thigh = cyl(0.16, 0.13, 0.55, 10, darkSteel);
    thigh.position.set(0.19 * side, -0.32, 0);
    legGroup.add(thigh);

    const knee = sphere(0.14, steel);
    knee.position.set(0.19 * side, -0.58, 0.02);
    legGroup.add(knee);

    const shin = cyl(0.13, 0.11, 0.5, 10, darkSteel);
    shin.position.set(0.19 * side, -0.86, 0);
    legGroup.add(shin);

    const boot = box(0.18, 0.16, 0.32, steel);
    boot.position.set(0.19 * side, -1.16, 0.06);
    legGroup.add(boot);

    const shinRune = box(0.08, 0.22, 0.02, rune);
    shinRune.position.set(0.19 * side, -0.86, 0.12);
    legGroup.add(shinRune);
  }

  // --- Torso ---
  const torso = new THREE.Group();
  torso.position.y = 0.32;
  pelvis.add(torso);

  const waist = cyl(0.24, 0.28, 0.22, 12, leather);
  waist.position.y = 0;
  torso.add(waist);

  const chestArmor = box(0.62, 0.62, 0.36, steel);
  chestArmor.position.y = 0.42;
  torso.add(chestArmor);

  const chestRidge = box(0.1, 0.55, 0.39, darkSteel);
  chestRidge.position.set(0, 0.42, 0);
  torso.add(chestRidge);

  const chestRune = box(0.24, 0.3, 0.02, rune);
  chestRune.position.set(0, 0.42, 0.185);
  torso.add(chestRune);

  const abdomenPlate = cyl(0.26, 0.24, 0.22, 12, steel);
  abdomenPlate.position.y = 0.14;
  torso.add(abdomenPlate);

  const beltBuckle = box(0.12, 0.1, 0.06, rune);
  beltBuckle.position.set(0, 0.02, 0.24);
  torso.add(beltBuckle);

  const chestAnchor = new THREE.Object3D();
  chestAnchor.position.set(0, 0.42, 0);
  torso.add(chestAnchor);

  // Pauldrons (shoulder armor)
  const pauldronGroup = new THREE.Group();
  torso.add(pauldronGroup);
  for (const side of [-1, 1]) {
    const p = new THREE.Group();
    p.position.set(0.42 * side, 0.68, 0);
    pauldronGroup.add(p);

    const main = sphere(0.26, steel, 16, 12);
    main.scale.set(1, 0.85, 1.1);
    p.add(main);

    const spike = cone(0.07, 0.28, 8, darkSteel);
    spike.position.set(0, 0.22, -0.02);
    p.add(spike);

    const trim = torusRing(0.24, 0.03, rune);
    trim.rotation.x = Math.PI / 2;
    trim.position.y = -0.02;
    p.add(trim);
  }

  // Arms
  const armsGroup = new THREE.Group();
  torso.add(armsGroup);
  const upperArms: THREE.Object3D[] = [];
  for (const side of [-1, 1]) {
    const upperArm = new THREE.Group();
    upperArm.position.set(0.42 * side, 0.5, 0);
    armsGroup.add(upperArm);
    upperArms.push(upperArm);

    const bicep = cyl(0.11, 0.1, 0.34, 10, darkSteel);
    bicep.position.set(0, -0.2, 0);
    upperArm.add(bicep);

    const elbow = sphere(0.1, steel);
    elbow.position.set(0, -0.4, 0);
    upperArm.add(elbow);

    const forearm = cyl(0.1, 0.085, 0.32, 10, steel);
    forearm.position.set(0, -0.6, 0);
    upperArm.add(forearm);

    const gauntlet = box(0.15, 0.16, 0.15, darkSteel);
    gauntlet.position.set(0, -0.8, 0);
    upperArm.add(gauntlet);
  }

  // Cape
  const capeGeo = new THREE.PlaneGeometry(0.9, 1.35, 10, 16);
  capeGeo.translate(0, -0.675, 0);
  const capeMat = fabricMaterial(CLOTH, 0.95);
  capeMat.side = THREE.DoubleSide;
  const capeWindPhase = uniform(0);
  capeMat.positionNode = positionLocal.add(
    vec3(
      oscSine(positionLocal.y.mul(-1.4).add(clock.uElapsed.mul(1.1)).add(capeWindPhase)).mul(
        float(0.09).mul(positionLocal.y.mul(-1).clamp(0, 1.4)),
      ),
      0,
      oscSine(positionLocal.y.mul(-1.8).add(clock.uElapsed.mul(1.4))).mul(
        float(0.14).mul(positionLocal.y.mul(-1).clamp(0, 1.4)),
      ),
    ),
  );
  const cape = new THREE.Mesh(capeGeo, capeMat);
  cape.castShadow = true;
  cape.position.set(0, 0.62, -0.22);
  cape.rotation.x = 0.15;
  torso.add(cape);

  // Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.98, 0);
  torso.add(headGroup);

  const neck = cyl(0.08, 0.09, 0.1, 10, darkSteel);
  headGroup.add(neck);

  const helmet = sphere(0.19, steel, 20, 16);
  helmet.position.y = 0.16;
  helmet.scale.set(1, 1.05, 1.02);
  headGroup.add(helmet);

  const visor = box(0.2, 0.08, 0.04, darkSteel);
  visor.position.set(0, 0.16, 0.18);
  headGroup.add(visor);

  const visorGlow = box(0.14, 0.03, 0.01, rune);
  visorGlow.position.set(0, 0.165, 0.205);
  headGroup.add(visorGlow);

  const crest = box(0.03, 0.22, 0.1, darkSteel);
  crest.position.set(0, 0.34, -0.05);
  headGroup.add(crest);

  const headAnchor = new THREE.Object3D();
  headAnchor.position.set(0, 0.3, 0);
  headGroup.add(headAnchor);

  // Greatsword held on the back
  const swordGroup = new THREE.Group();
  swordGroup.position.set(-0.05, 0.55, -0.28);
  swordGroup.rotation.set(0.15, 0, -2.3);
  torso.add(swordGroup);

  const blade = box(0.06, 1.3, 0.015, steel);
  blade.position.y = 0.75;
  swordGroup.add(blade);

  const bladeCore = box(0.02, 1.2, 0.02, rune);
  bladeCore.position.y = 0.75;
  swordGroup.add(bladeCore);

  const guard = box(0.34, 0.06, 0.06, darkSteel);
  guard.position.y = 0.06;
  swordGroup.add(guard);

  const grip = cyl(0.03, 0.03, 0.28, 10, leather);
  grip.position.y = -0.1;
  swordGroup.add(grip);

  const pommel = sphere(0.06, darkSteel);
  pommel.position.y = -0.26;
  swordGroup.add(pommel);

  root.position.y = PEDESTAL_TOP_Y;
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  function update(elapsed: number, dt: number, pointer: THREE.Vector2): void {
    const breathing = Math.sin(elapsed * 1.4) * 0.012;
    torso.position.y = 0.32 + breathing;
    torso.rotation.y = pointer.x * 0.08;
    headGroup.rotation.y = pointer.x * 0.18;
    headGroup.rotation.x = -pointer.y * 0.12;

    for (let i = 0; i < upperArms.length; i++) {
      const side = i === 0 ? -1 : 1;
      upperArms[i].rotation.z = side * (0.08 + Math.sin(elapsed * 1.4 + i) * 0.015);
    }

    capeWindPhase.value = Math.sin(elapsed * 0.6) * 0.6;
    root.position.y = PEDESTAL_TOP_Y + Math.sin(elapsed * 1.4) * 0.006;
  }

  return { root, headAnchor, chestAnchor, runeIntensity, update };
}

function torusRing(radius: number, tube: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 24), mat);
  m.castShadow = true;
  return m;
}
