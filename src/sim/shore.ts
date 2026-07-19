import type { WaterSim } from './WaterSim';

/** Furthest right the waterline reaches (thin beach beyond). */
export const SHORE_MAX = 0.96;

const SWELL_AMP = 0.9;

/**
 * Fill `depth` (>0 water, ≤0 land) and `c2` (per-cell c², ∝ depth) for a beach
 * that shoals from open water on the left to a shoreline on the right. `curve`
 * bows the coastline; `shoreCurve` sets how steeply it shoals. The rightmost
 * point of the waterline is pinned to SHORE_MAX for any curvature.
 */
export function buildShoreFields(
  W: number,
  H: number,
  depth: Float32Array,
  c2: Float32Array,
  opts: { cMax: number; shoreCurve: number; curve: number },
): void {
  const { cMax, shoreCurve, curve } = opts;
  const cm2 = cMax * cMax;
  const base = SHORE_MAX - Math.max(0, curve) * 0.5;
  for (let y = 0; y < H; y++) {
    const yc = y / (H - 1) - 0.5;
    const bump = (0.25 - yc * yc) * 2; // 0 at top/bottom, 0.5 mid-height
    let w = base + curve * bump;
    w = w < 0.1 ? 0.1 : w > 0.98 ? 0.98 : w;
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      const d = u <= w
        ? Math.pow((w - u) / w, shoreCurve) // water: 1 deep → 0 at waterline
        : -((u - w) / (1 - w));             // land: 0 → −1 up the beach
      const i = y * W + x;
      depth[i] = d;
      c2[i] = cm2 * Math.max(d, 0.02);
    }
  }
}

/**
 * Inject a swell rolling in from the left — a vertical wavefront whose amplitude
 * tapers smoothly to zero at the top and bottom. The taper avoids the semicircle
 * artefacts a hard-ended line source would radiate.
 */
export function injectSwell(s: WaterSim, x0: number): void {
  const { W, H } = s;
  const margin = Math.max(10, H * 0.2);
  for (let y = 0; y < H; y++) {
    let e = 1;
    if (y < margin) e = y / margin;
    else if (y > H - 1 - margin) e = (H - 1 - y) / margin;
    e = e * e * (3 - 2 * e); // smoothstep → no sharp ends
    if (e <= 0) continue;
    for (let dx = -3; dx <= 3; dx++) {
      const xx = x0 + dx;
      if (xx > 1 && xx < W - 2) s.hCurr[y * W + xx] -= SWELL_AMP * e * Math.exp(-(dx * dx) / 5);
    }
  }
}
