// @ts-nocheck -- three@0.169 ships no type declarations for the webgpu/tsl entry points used here (see README).
import * as THREE from "three/webgpu";

function ctx2d(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx };
}

/** A single glowing rune glyph on a transparent square, used for floating runes and ring inscriptions. */
export function createRuneTexture(seed = 0): THREE.CanvasTexture {
  const { canvas, ctx } = ctx2d(256);
  ctx.clearRect(0, 0, 256, 256);
  ctx.translate(128, 128);

  const strokes = 5 + Math.floor(pseudoRandom(seed) * 4);
  ctx.strokeStyle = "#ffffff";
  ctx.lineCap = "round";
  ctx.lineWidth = 8;
  ctx.shadowColor = "#bcd4ff";
  ctx.shadowBlur = 18;

  let r = pseudoRandom(seed + 1);
  ctx.beginPath();
  ctx.arc(0, 0, 92, 0, Math.PI * 2);
  ctx.globalAlpha = 0.5;
  ctx.stroke();

  ctx.globalAlpha = 1;
  for (let i = 0; i < strokes; i++) {
    r = pseudoRandom(seed + i * 7 + 2);
    const a0 = r * Math.PI * 2;
    const r2 = pseudoRandom(seed + i * 13 + 3);
    const a1 = r2 * Math.PI * 2;
    const len0 = 30 + pseudoRandom(seed + i * 3) * 60;
    const len1 = 30 + pseudoRandom(seed + i * 5) * 60;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a0) * len0, Math.sin(a0) * len0);
    ctx.lineTo(Math.cos(a1) * len1, Math.sin(a1) * len1);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Ring of runes + concentric guide lines for the magic circle geometry alpha map. */
export function createRingRuneTexture(count: number, seed = 0): THREE.CanvasTexture {
  const { canvas, ctx } = ctx2d(1024);
  ctx.clearRect(0, 0, 1024, 1024);
  ctx.translate(512, 512);
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 10;

  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, 480, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 340, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const rr = pseudoRandom(seed + i);
    ctx.save();
    ctx.rotate(a);
    ctx.translate(0, -410);
    ctx.globalAlpha = 0.55 + rr * 0.45;
    ctx.fillRect(-4, -22, 8, 44);
    ctx.fillRect(-16, 0, 32, 6);
    ctx.restore();
  }

  // radial spokes
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  for (let i = 0; i < count * 2; i++) {
    const a = (i / (count * 2)) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 330, Math.sin(a) * 330);
    ctx.lineTo(Math.cos(a) * 490, Math.sin(a) * 490);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Cracked-stone emissive mask used on the pedestal for glowing fissures. */
export function createCrackTexture(seed = 1): THREE.CanvasTexture {
  const { canvas, ctx } = ctx2d(512);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = "#ffffff";
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 6;

  const branches = 6;
  for (let b = 0; b < branches; b++) {
    let x = pseudoRandom(seed + b) * 512;
    let y = pseudoRandom(seed + b + 50) * 512;
    let angle = pseudoRandom(seed + b + 100) * Math.PI * 2;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segments = 14 + Math.floor(pseudoRandom(seed + b + 200) * 10);
    for (let s = 0; s < segments; s++) {
      angle += (pseudoRandom(seed + b * 31 + s) - 0.5) * 1.1;
      x += Math.cos(angle) * 18;
      y += Math.sin(angle) * 18;
      ctx.lineTo(x, y);
      if (pseudoRandom(seed + b * 17 + s) > 0.75) {
        const bx = x + Math.cos(angle + 1) * 30;
        const by = y + Math.sin(angle + 1) * 30;
        ctx.moveTo(x, y);
        ctx.lineTo(bx, by);
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Soft radial falloff used as a glow/particle sprite base (multiplied by shader noise). */
export function createGlowSprite(): THREE.CanvasTexture {
  const { canvas, ctx } = ctx2d(128);
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
