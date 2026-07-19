import type { Renderer } from './types';
import type { WaterSim } from './WaterSim';
import { shadeStone } from './shade';

/**
 * Renders water over a varying-depth bottom: deep water reads dark teal, the
 * shallows brighten toward a sandy turquoise, and wave crests break into foam as
 * they shoal near the shore. Cells with depth ≤ 0 are dry beach and draw as sand,
 * so the shoreline is actually visible. Pair with a WaterSim whose `c2Field`
 * encodes the same depth (c ∝ √depth) so the waves visibly slow and refract.
 */
export class ShallowWaterRenderer implements Renderer {
  lightDeg = 210;
  /** per-cell depth: >0 water (1 = deep, →0 = shore), ≤0 dry land (−1 = high beach) */
  depthField: Float32Array | null = null;

  render(sim: WaterSim, img: ImageData): void {
    const { W, H, hCurr, rockMask } = sim;
    const px = img.data;
    const depth = this.depthField;

    const rad = this.lightDeg * Math.PI / 180;
    let lx = Math.cos(rad) * 0.75, ly = Math.sin(rad) * 0.75, lz = 0.6;
    const ll = Math.hypot(lx, ly, lz); lx /= ll; ly /= ll; lz /= ll;

    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, o = i * 4;
        if (rockMask[i]) { shadeStone(px, o, rockMask, i, W, lx, ly); continue; }

        const d = depth ? depth[i] : 1;
        if (d <= 0) {
          // dry beach: sand, lighter (drier) higher up the beach, with a faint grain
          const dry = -d < 1 ? -d : 1;
          const grain = (((x * 13 + y * 7) % 5) - 2) * 2;
          px[o]     = 150 + (206 - 150) * dry + grain;
          px[o + 1] = 132 + (190 - 132) * dry + grain;
          px[o + 2] = 96 + (150 - 96) * dry + grain;
          px[o + 3] = 255;
          continue;
        }
        const gx = (hCurr[i + 1] - hCurr[i - 1]) * 1.6;
        const gy = (hCurr[i + W] - hCurr[i - W]) * 1.6;
        const inv = 1 / Math.sqrt(gx * gx + gy * gy + 1);
        const nx = -gx * inv, ny = -gy * inv, nz = inv;
        const diff = Math.max(0, nx * lx + ny * ly + nz * lz);
        const spec = Math.pow(diff, 70) * 180;
        const h = hCurr[i];

        // base colour interpolates shallow (sandy turquoise) → deep (dark teal)
        let r = 120 + (8 - 120) * d;
        let g = 165 + (40 - 165) * d;
        let b = 150 + (62 - 150) * d;

        r += diff * 40 + h * 22 + spec;
        g += diff * 60 + h * 26 + spec;
        b += diff * 70 + h * 30 + spec;

        // whitecaps: crests breaking in the shallows near shore
        const foam = Math.max(0, 0.32 - d) * Math.max(0, h - 0.25) * 7;
        if (foam > 0) { r += foam * 180; g += foam * 185; b += foam * 185; }

        px[o]     = r < 0 ? 0 : r > 255 ? 255 : r;
        px[o + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
        px[o + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
        px[o + 3] = 255;
      }
    }
  }
}
