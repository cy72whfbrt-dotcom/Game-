// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import * as THREE from "three/webgpu";

/**
 * Third-person hero-shot camera: fixed cinematic base pose slightly below
 * eye level, a slow idle drift, and a subtle parallax response to the
 * pointer. Never a free orbit controller — the character stays framed.
 */
export class HeroCamera {
  readonly camera: THREE.PerspectiveCamera;

  private readonly basePosition = new THREE.Vector3(0, 1.5, 4.4);
  private readonly lookTarget = new THREE.Vector3(0, 1.25, 0);
  private pointer = new THREE.Vector2(0, 0);
  private smoothedPointer = new THREE.Vector2(0, 0);

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 60);
    this.camera.position.copy(this.basePosition);
    this.camera.lookAt(this.lookTarget);
  }

  setPointer(nx: number, ny: number): void {
    this.pointer.set(THREE.MathUtils.clamp(nx, -1, 1), THREE.MathUtils.clamp(ny, -1, 1));
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(elapsed: number, dt: number): void {
    this.smoothedPointer.x = THREE.MathUtils.damp(this.smoothedPointer.x, this.pointer.x, 4, dt);
    this.smoothedPointer.y = THREE.MathUtils.damp(this.smoothedPointer.y, this.pointer.y, 4, dt);

    const driftX = Math.sin(elapsed * 0.11) * 0.22;
    const driftY = Math.sin(elapsed * 0.08 + 1.7) * 0.06;

    const parallaxX = this.smoothedPointer.x * 0.55;
    const parallaxY = -this.smoothedPointer.y * 0.22;

    this.camera.position.x = this.basePosition.x + driftX + parallaxX;
    this.camera.position.y = this.basePosition.y + driftY + parallaxY;
    this.camera.position.z = this.basePosition.z + Math.sin(elapsed * 0.05) * 0.15;

    const lookX = this.lookTarget.x + this.smoothedPointer.x * 0.3;
    const lookY = this.lookTarget.y + this.smoothedPointer.y * 0.15;
    this.camera.lookAt(lookX, lookY, this.lookTarget.z);
  }

  getPointer(): THREE.Vector2 {
    return this.smoothedPointer;
  }
}
