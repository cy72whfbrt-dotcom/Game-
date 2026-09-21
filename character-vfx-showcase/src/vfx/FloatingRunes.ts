// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import * as THREE from "three/webgpu";
import { color, oscSine, texture, uv } from "three/tsl";
import { clock } from "../utils/Clock";
import { createRuneTexture } from "../utils/ProceduralTextures";
import { PEDESTAL_TOP_Y } from "../utils/Constants";

export interface FloatingRunes {
  group: THREE.Group;
  update(elapsed: number): void;
  setCount(count: number): void;
}

interface RuneInstance {
  mesh: THREE.Mesh;
  radius: number;
  height: number;
  angleSpeed: number;
  angle0: number;
  bobSpeed: number;
  bobPhase: number;
  spinSpeed: number;
}

/**
 * Floating rune glyphs distributed on rings around the character at varying
 * radius/height/depth — some pass behind the body, some in front — each
 * slowly rotating and pulsing independently.
 */
export function createFloatingRunes(maxCount: number): FloatingRunes {
  const group = new THREE.Group();
  const runes: RuneInstance[] = [];

  const colors = [0x7ad4ff, 0xc9a3ff, 0xffb15c];

  for (let i = 0; i < maxCount; i++) {
    const size = THREE.MathUtils.lerp(0.12, 0.32, Math.random());
    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicNodeMaterial();
    mat.transparent = true;
    mat.blending = THREE.AdditiveBlending;
    mat.depthWrite = false;
    mat.side = THREE.DoubleSide;

    const runeTex = texture(createRuneTexture(i * 5.17), uv());
    const pulse = oscSine(clock.uElapsed.mul(0.9).add(i * 0.7)).mul(0.35).add(0.75);
    mat.colorNode = color(new THREE.Color(colors[i % colors.length]));
    mat.opacityNode = runeTex.a.mul(pulse);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 4;
    mesh.visible = false;
    group.add(mesh);

    runes.push({
      mesh,
      radius: THREE.MathUtils.lerp(0.9, 2.1, Math.random()),
      height: PEDESTAL_TOP_Y + THREE.MathUtils.lerp(0.3, 2.3, Math.random()),
      angleSpeed: THREE.MathUtils.lerp(0.06, 0.22, Math.random()) * (Math.random() > 0.5 ? 1 : -1),
      angle0: Math.random() * Math.PI * 2,
      bobSpeed: THREE.MathUtils.lerp(0.6, 1.4, Math.random()),
      bobPhase: Math.random() * Math.PI * 2,
      spinSpeed: THREE.MathUtils.lerp(-0.6, 0.6, Math.random()),
    });
  }

  let activeCount = maxCount;

  function setCount(count: number): void {
    activeCount = Math.min(count, maxCount);
    runes.forEach((r, i) => {
      r.mesh.visible = i < activeCount;
    });
  }
  setCount(maxCount);

  function update(elapsed: number): void {
    for (let i = 0; i < activeCount; i++) {
      const r = runes[i];
      const angle = r.angle0 + elapsed * r.angleSpeed;
      r.mesh.position.set(
        Math.cos(angle) * r.radius,
        r.height + Math.sin(elapsed * r.bobSpeed + r.bobPhase) * 0.08,
        Math.sin(angle) * r.radius,
      );
      r.mesh.rotation.z = elapsed * r.spinSpeed;
      r.mesh.lookAt(0, r.mesh.position.y, 0);
    }
  }

  return { group, update, setCount };
}
