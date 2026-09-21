// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import { cameraPosition, clamp, dot, normalWorld, positionWorld } from "three/tsl";

/** Standard view-dependent fresnel rim term, reused by every energy-style VFX shader. */
export function fresnelTerm(power: number) {
  const viewDir = cameraPosition.sub(positionWorld).normalize();
  const facing = clamp(dot(normalWorld, viewDir), 0, 1);
  return facing.oneMinus().pow(power);
}
