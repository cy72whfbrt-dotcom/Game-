export type QualityTier = "low" | "medium" | "high";

export interface QualitySettings {
  tier: QualityTier;
  pixelRatio: number;
  particleCount: number;
  shadowMapSize: number;
  bloomEnabled: boolean;
  dofEnabled: boolean;
  filmGrainEnabled: boolean;
  runeCount: number;
}

const TIERS: Record<QualityTier, QualitySettings> = {
  high: {
    tier: "high",
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    particleCount: 2200,
    shadowMapSize: 2048,
    bloomEnabled: true,
    dofEnabled: true,
    filmGrainEnabled: true,
    runeCount: 14,
  },
  medium: {
    tier: "medium",
    pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
    particleCount: 1100,
    shadowMapSize: 1024,
    bloomEnabled: true,
    dofEnabled: false,
    filmGrainEnabled: true,
    runeCount: 9,
  },
  low: {
    tier: "low",
    pixelRatio: 1,
    particleCount: 450,
    shadowMapSize: 512,
    bloomEnabled: true,
    dofEnabled: false,
    filmGrainEnabled: false,
    runeCount: 5,
  },
};

/**
 * Watches rolling average FPS and steps quality down (and back up, with
 * hysteresis) so weaker devices settle on a stable tier instead of thrashing.
 */
export class QualityManager {
  current: QualitySettings;
  private samples: number[] = [];
  private cooldown = 0;
  private onChange: (q: QualitySettings) => void;

  constructor(startTier: QualityTier, onChange: (q: QualitySettings) => void) {
    this.current = TIERS[startTier];
    this.onChange = onChange;
  }

  reportFrame(dt: number): void {
    const fps = 1 / Math.max(dt, 1e-6);
    this.samples.push(fps);
    if (this.samples.length > 90) this.samples.shift();
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      return;
    }
    if (this.samples.length < 60) return;
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;

    if (avg < 45 && this.current.tier !== "low") {
      this.step(-1);
    } else if (avg > 58 && this.current.tier !== "high") {
      this.step(1);
    }
  }

  private step(direction: 1 | -1): void {
    const order: QualityTier[] = ["low", "medium", "high"];
    const idx = order.indexOf(this.current.tier);
    const next = order[Math.min(order.length - 1, Math.max(0, idx + direction))];
    if (next !== this.current.tier) {
      this.current = TIERS[next];
      this.cooldown = 4;
      this.samples.length = 0;
      this.onChange(this.current);
    }
  }
}

export function detectStartTier(): QualityTier {
  const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
  const mem = nav.deviceMemory ?? 8;
  const cores = nav.hardwareConcurrency ?? 8;
  const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  if (mobile || mem <= 3 || cores <= 3) return "low";
  if (mem <= 6 || cores <= 6) return "medium";
  return "high";
}
