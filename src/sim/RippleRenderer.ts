import type { Renderer } from './types';
import type { WaterSim } from './WaterSim';
import { shadeStone } from './shade';
import { sunDir } from './light';

/**
 * Shades the surface directly from its normal: fake diffuse light, a sharp
 * specular sun-glint, and crest-height lift over a deep-teal base. This is the
 * look of the original Ripple Study.
 */
export class RippleRenderer implements Renderer {
  /** azimuth of the sun, in degrees around the pool */
  lightDeg = 230;
  /** height of the sun above the horizon (0° grazing → 90° overhead) */
  elevation = 40;
  /** wind whitecap intensity (0 = none) */
  whitecap = 0;
  /** water colour at rest, [r,g,b] */
  primary: [number, number, number] = [12, 42, 58];
  /** colour a full crest reaches; troughs shift the opposite way */
  crest: [number, number, number] = [38, 76, 98];

  render(sim: WaterSim, img: ImageData): void {
    const { W, H, hCurr, rockMask, domainMask } = sim;
    const px = img.data;

    const { lx, ly, lz } = sunDir(this.lightDeg, this.elevation);
    const [pr, pg, pb] = this.primary;
    const [cr, cg, cb] = this.crest;
    const dr = cr - pr, dg = cg - pg, db = cb - pb; // primary → crest per unit height

    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, o = i * 4;
        if (domainMask !== null && domainMask[i] === 0) { px[o] = 14; px[o + 1] = 18; px[o + 2] = 23; px[o + 3] = 255; continue; }
        if (rockMask[i]) { shadeStone(px, o, rockMask, i, W, lx, ly); continue; }
        const gx = (hCurr[i + 1] - hCurr[i - 1]) * 1.6;
        const gy = (hCurr[i + W] - hCurr[i - W]) * 1.6;
        const inv = 1 / Math.sqrt(gx * gx + gy * gy + 1);
        const nx = -gx * inv, ny = -gy * inv, nz = inv;

        const diff = Math.max(0, nx * lx + ny * ly + nz * lz);
        const spec = Math.pow(diff, 90) * 235;
        const h = hCurr[i];

        let r = pr + dr * h + diff * 34 + spec;
        let g = pg + dg * h + diff * 66 + spec;
        let b = pb + db * h + diff * 88 + spec;
        if (this.whitecap > 0) {
          const foam = this.whitecap * (h - 0.4);
          if (foam > 0) { const f = foam * 150; r += f; g += f; b += f; }
        }
        px[o]     = r < 0 ? 0 : r > 255 ? 255 : r;
        px[o + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
        px[o + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
        px[o + 3] = 255;
      }
    }
  }
}
