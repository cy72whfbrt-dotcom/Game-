// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import * as THREE from "three/webgpu";
import {
  attribute,
  billboarding,
  cameraPosition,
  clamp,
  color,
  float,
  Fn,
  hash,
  mix,
  mx_noise_float,
  positionLocal,
  positionWorld,
  smoothstep,
  texture,
  uniform,
  uv,
  vec3,
  vec4,
} from "three/tsl";
import { clock } from "../../utils/Clock";
import { createGlowSprite } from "../../utils/ProceduralTextures";

export interface GPUParticleSystemOptions {
  count: number;
  radius: number;
  height: number;
  riseSpeed: [number, number];
  size: [number, number];
  colorA: THREE.Color;
  colorB: THREE.Color;
  origin: THREE.Vector3;
}

/**
 * Fully GPU-driven particle system: per-instance seed/speed/radius/size
 * attributes are uploaded once, and every frame's position, drift, fade and
 * glow is computed inside the vertex/fragment shader from those attributes
 * plus a single shared time uniform — no per-particle JS update loop.
 */
export class GPUParticleSystem {
  readonly mesh: THREE.InstancedMesh;
  private readonly material: THREE.SpriteNodeMaterial;

  constructor(opts: GPUParticleSystemOptions) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const count = opts.count;

    const seeds = new Float32Array(count);
    const speeds = new Float32Array(count);
    const radii = new Float32Array(count);
    const angles = new Float32Array(count);
    const sizes = new Float32Array(count);
    const lifetimes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      seeds[i] = Math.random() * 1000;
      speeds[i] = THREE.MathUtils.lerp(opts.riseSpeed[0], opts.riseSpeed[1], Math.random());
      radii[i] = Math.random() * opts.radius;
      angles[i] = Math.random() * Math.PI * 2;
      sizes[i] = THREE.MathUtils.lerp(opts.size[0], opts.size[1], Math.random());
      lifetimes[i] = THREE.MathUtils.lerp(2.2, 5.5, Math.random());
    }
    geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
    geometry.setAttribute("aSpeed", new THREE.InstancedBufferAttribute(speeds, 1));
    geometry.setAttribute("aRadius", new THREE.InstancedBufferAttribute(radii, 1));
    geometry.setAttribute("aAngle", new THREE.InstancedBufferAttribute(angles, 1));
    geometry.setAttribute("aSize", new THREE.InstancedBufferAttribute(sizes, 1));
    geometry.setAttribute("aLifetime", new THREE.InstancedBufferAttribute(lifetimes, 1));

    const material = new THREE.SpriteNodeMaterial();
    material.transparent = true;
    material.depthWrite = false;
    material.blending = THREE.AdditiveBlending;

    const seed = attribute("aSeed", "float");
    const speed = attribute("aSpeed", "float");
    const radius = attribute("aRadius", "float");
    const angle0 = attribute("aAngle", "float");
    const size = attribute("aSize", "float");
    const lifetime = attribute("aLifetime", "float");

    const t = clock.uElapsed.add(seed).div(lifetime).fract();
    const angle = angle0.add(clock.uElapsed.mul(0.25)).add(mx_noise_float(vec3(seed, clock.uElapsed.mul(0.15), 0)).mul(1.4));
    const wobbleR = radius.mul(float(1).add(mx_noise_float(vec3(seed.mul(1.7), clock.uElapsed.mul(0.4), 0)).mul(0.25)));

    const localX = angle.cos().mul(wobbleR);
    const localZ = angle.sin().mul(wobbleR);
    const localY = t.mul(opts.height);

    const worldPos = vec3(localX, localY, localZ).add(vec3(opts.origin.x, opts.origin.y, opts.origin.z));

    const fadeIn = smoothstep(0, 0.12, t);
    const fadeOut = float(1).sub(smoothstep(0.75, 1.0, t));
    const flicker = mx_noise_float(vec3(seed.mul(3.1), clock.uElapsed.mul(3), 0)).mul(0.3).add(0.7);
    const lifeFade = fadeIn.mul(fadeOut).mul(flicker);

    material.positionNode = worldPos;
    material.scaleNode = size.mul(lifeFade.mul(0.6).add(0.4));

    const glowTex = texture(createGlowSprite(), uv());
    const camDist = cameraPosition.sub(worldPos).length();
    const closeFade = smoothstep(0.12, 0.55, camDist);
    const tintMix = mx_noise_float(vec3(seed.mul(0.7), 0, 0)).mul(0.5).add(0.5);
    const tint = mix(color(opts.colorA), color(opts.colorB), tintMix);

    material.colorNode = tint;
    material.opacityNode = glowTex.a.mul(lifeFade).mul(closeFade).mul(1.4);

    this.material = material;
    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  }

  setCount(visibleCount: number): void {
    this.mesh.count = Math.min(visibleCount, this.mesh.geometry.attributes.aSeed.count);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
