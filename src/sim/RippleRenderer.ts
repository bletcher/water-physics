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

  render(sim: WaterSim, img: ImageData): void {
    const { W, H, hCurr, rockMask } = sim;
    const px = img.data;

    const { lx, ly, lz } = sunDir(this.lightDeg, this.elevation);

    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, o = i * 4;
        if (rockMask[i]) { shadeStone(px, o, rockMask, i, W, lx, ly); continue; }
        const gx = (hCurr[i + 1] - hCurr[i - 1]) * 1.6;
        const gy = (hCurr[i + W] - hCurr[i - W]) * 1.6;
        const inv = 1 / Math.sqrt(gx * gx + gy * gy + 1);
        const nx = -gx * inv, ny = -gy * inv, nz = inv;

        const diff = Math.max(0, nx * lx + ny * ly + nz * lz);
        const spec = Math.pow(diff, 90) * 235;
        const h = hCurr[i];

        const r = 12 + diff * 34 + h * 26 + spec;
        const g = 42 + diff * 66 + h * 34 + spec;
        const b = 58 + diff * 88 + h * 40 + spec;
        px[o]     = r < 0 ? 0 : r > 255 ? 255 : r;
        px[o + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
        px[o + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
        px[o + 3] = 255;
      }
    }
  }
}
