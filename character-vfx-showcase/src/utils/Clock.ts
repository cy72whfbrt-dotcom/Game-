// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import { uniform } from "three/tsl";

/**
 * Single shared GPU time uniform. All VFX shaders read from this instead of
 * each owning their own `timerLocal()` node, so every effect stays in sync
 * and slow-motion / pause can be implemented in one place later.
 */
class SharedClock {
  elapsed = 0;
  delta = 0;
  readonly uElapsed = uniform(0);
  readonly uDelta = uniform(0);

  tick(delta: number): void {
    this.delta = Math.min(delta, 0.1);
    this.elapsed += this.delta;
    this.uElapsed.value = this.elapsed;
    this.uDelta.value = this.delta;
  }
}

export const clock = new SharedClock();
