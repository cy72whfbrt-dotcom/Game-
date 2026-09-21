// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import * as THREE from "three/webgpu";
import { color, mx_noise_float, oscSine, uv } from "three/tsl";
import { clock } from "../utils/Clock";

export interface EnergyTrails {
  group: THREE.Group;
  update(elapsed: number): void;
}

class SpiralCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private radius: number,
    private height: number,
    private turns: number,
    private phase: number,
  ) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const angle = t * Math.PI * 2 * this.turns + this.phase;
    const r = this.radius * (0.55 + 0.45 * Math.sin(t * Math.PI));
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = t * this.height;
    return target.set(x, y, z);
  }
}

/**
 * Two counter-spiralling energy streams orbiting the character, built from
 * tube geometry with additive, scrolling-UV shader material so the streak
 * appears to flow upward like a magical current.
 */
export function createEnergyTrails(): EnergyTrails {
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];

  const configs = [
    { radius: 0.85, height: 2.6, turns: 2.6, phase: 0, tube: 0.02, color: new THREE.Color(0x6fc7ff), dir: 1, scroll: 0.6 },
    { radius: 0.95, height: 2.5, turns: 2.2, phase: Math.PI, tube: 0.015, color: new THREE.Color(0xffb15c), dir: -1, scroll: 0.45 },
  ];

  for (const cfg of configs) {
    const curve = new SpiralCurve(cfg.radius, cfg.height, cfg.turns, cfg.phase);
    const geo = new THREE.TubeGeometry(curve, 160, cfg.tube, 8, false);
    const mat = new THREE.MeshBasicNodeMaterial();
    mat.transparent = true;
    mat.blending = THREE.AdditiveBlending;
    mat.depthWrite = false;

    const scrollU = uv().x.sub(clock.uElapsed.mul(cfg.scroll * cfg.dir)).fract();
    const streak = scrollU.sub(0.5).abs().oneMinus().pow(6);
    const noiseFlicker = mx_noise_float(uv().mul(20).add(clock.uElapsed.mul(0.5))).mul(0.4).add(0.6);
    const pulse = oscSine(clock.uElapsed.mul(1.1)).mul(0.2).add(0.9);

    mat.colorNode = color(cfg.color);
    mat.opacityNode = streak.mul(noiseFlicker).mul(pulse).mul(1.6).saturate();

    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 6;
    meshes.push(mesh);
    group.add(mesh);
  }

  group.position.y = 0.15;

  function update(elapsed: number): void {
    group.rotation.y = elapsed * 0.15;
  }

  return { group, update };
}
