import * as THREE from 'three';

/**
 * Cinematic camera: a slow autonomous idle drift plus a subtle
 * mouse-driven parallax offset, always looking at the character.
 */
export class CameraRig {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(34, aspect, 0.1, 40);
    this.basePosition = new THREE.Vector3(0, 1.5, 4.4);
    this.target = new THREE.Vector3(0, 1.15, 0);
    this.camera.position.copy(this.basePosition);
    this.camera.lookAt(this.target);

    this.mouse = new THREE.Vector2(0, 0);
    this.mouseTarget = new THREE.Vector2(0, 0);
  }

  setMouse(nx, ny) {
    this.mouseTarget.set(nx, ny);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(dt, time) {
    this.mouse.lerp(this.mouseTarget, Math.min(dt * 3.5, 1));

    const idleX = Math.sin(time * 0.12) * 0.18;
    const idleY = Math.sin(time * 0.08) * 0.06;

    const px = idleX + this.mouse.x * 0.55;
    const py = idleY + this.mouse.y * 0.22;

    this.camera.position.x = this.basePosition.x + px;
    this.camera.position.y = this.basePosition.y + py;
    this.camera.position.z = this.basePosition.z - Math.abs(this.mouse.x) * 0.12;

    const lookTarget = this.target.clone();
    lookTarget.x += this.mouse.x * 0.18;
    lookTarget.y += this.mouse.y * 0.08;
    this.camera.lookAt(lookTarget);
  }
}
