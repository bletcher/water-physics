import type { Renderer } from './types';
import type { WaterSim } from './WaterSim';
import { sunDir } from './light';

/**
 * Shades the surface directly from its normal: fake diffuse light, a sharp
 * specular sun-glint, and crest-height lift over a deep-teal base. This is the
 * look of the original Ripple Study.
 *
 * Obstacles are drawn from a *smoothed* copy of the (binary) wall mask, so
 * hand-painted walls read as rounded stone with a soft anti-aliased edge instead
 * of the staircased, "bumpy" outline the raw brush disks would give.
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

  private smask: Float32Array | null = null;
  private sTmp: Float32Array | null = null;

  /** Blur the 0/1 wall mask into a soft 0..1 coverage field (edges anti-aliased). */
  private smoothMask(sim: WaterSim): Float32Array {
    const { N, W, H, rockMask } = sim;
    if (!this.smask || this.smask.length !== N) {
      this.smask = new Float32Array(N);
      this.sTmp = new Float32Array(N);
    }
    const a = this.smask, t = this.sTmp!;
    for (let i = 0; i < N; i++) a[i] = rockMask[i];
    // two separable 1-2-1 passes soften the staircased brush edges into a ramp
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 1; y < H - 1; y++) {
        let i = y * W + 1;
        for (let x = 1; x < W - 1; x++, i++) t[i] = (a[i - 1] + 2 * a[i] + a[i + 1]) * 0.25;
      }
      for (let y = 1; y < H - 1; y++) {
        let i = y * W + 1;
        for (let x = 1; x < W - 1; x++, i++) a[i] = (t[i - W] + 2 * t[i] + t[i + W]) * 0.25;
      }
    }
    return a;
  }

  render(sim: WaterSim, img: ImageData): void {
    const { W, H, hCurr, domainMask } = sim;
    const px = img.data;

    const { lx, ly, lz } = sunDir(this.lightDeg, this.elevation);
    const [pr, pg, pb] = this.primary;
    const [cr, cg, cb] = this.crest;
    const dr = cr - pr, dg = cg - pg, db = cb - pb; // primary → crest per unit height
    const smask = this.smoothMask(sim);

    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, o = i * 4;
        if (domainMask !== null && domainMask[i] === 0) { px[o] = 14; px[o + 1] = 18; px[o + 2] = 23; px[o + 3] = 255; continue; }
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

        // obstacle: blend warm stone over the water by smoothed coverage, so the
        // silhouette and its rim highlight are soft rather than staircased.
        const cov = smask[i];
        if (cov > 0.004) {
          const mgx = smask[i + 1] - smask[i - 1];
          const mgy = smask[i + W] - smask[i - W];
          const rim = Math.max(0, -mgx * lx + -mgy * ly) * 90;
          const sg = 60 + rim;
          let a = cov > 1 ? 1 : cov;
          a = a * a * (3 - 2 * a);          // smoothstep for a clean edge
          const ia = 1 - a;
          r = r * ia + (sg + 10) * a;
          g = g * ia + (sg + 5) * a;
          b = b * ia + sg * a;
        }

        px[o]     = r < 0 ? 0 : r > 255 ? 255 : r;
        px[o + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
        px[o + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
        px[o + 3] = 255;
      }
    }
  }
}
