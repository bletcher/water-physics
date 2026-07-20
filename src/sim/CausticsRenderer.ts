import type { Renderer } from './types';
import type { WaterSim } from './WaterSim';
import { shadeStone } from './shade';
import { sunDir } from './light';

const ETA = 1.0 / 1.33;   // air → water refractive index ratio
const BEND = 1 - ETA;     // small-angle horizontal bend of a refracted ray ≈ 0.248

/**
 * Renders the pool *floor*, lit by caustics. For each surface cell we refract a
 * downward sun ray through the surface (Snell's law) and splat its light energy
 * where it lands on the floor `depth` below — convergence makes the bright net.
 * The floor is then viewed through the water with Beer–Lambert depth absorption.
 *
 * Forward light-splatting (a scatter) is the physically real method and is why
 * this lives in JS/TS rather than a fragment shader, which only gathers.
 */
export class CausticsRenderer implements Renderer {
  depth = 18;      // water depth, in grid cells (drives refraction offset + tint)
  str = 0.75;      // caustic contrast
  elevation = 62;  // sun height above the horizon (drives refraction + specular)
  lightDeg = 230;  // sun azimuth (also drives the specular glint)
  whitecap = 0;    // wind whitecap intensity (0 = none)

  private caustic: Float32Array | null = null;
  private cTmp: Float32Array | null = null;

  private ensureBuffers(n: number): void {
    if (!this.caustic || this.caustic.length !== n) {
      this.caustic = new Float32Array(n);
      this.cTmp = new Float32Array(n);
    }
  }

  private computeCaustics(sim: WaterSim): void {
    const { W, H, hCurr, rockMask } = sim;
    const caustic = this.caustic!;
    caustic.fill(0);
    const D = this.depth;

    // sun tilt via Snell: elevation θ → incidence (90−θ) from vertical,
    // sin(refracted) = ETA·cos(θ); horizontal offset per unit depth = tan(refracted).
    const az = this.lightDeg * Math.PI / 180;
    const sinR = ETA * Math.cos(this.elevation * Math.PI / 180);
    const tanR = sinR / Math.sqrt(1 - sinR * sinR);
    const tx = Math.cos(az) * tanR, ty = Math.sin(az) * tanR;

    for (let y = 1; y < H - 1; y++) {
      let i = y * W + 1;
      for (let x = 1; x < W - 1; x++, i++) {
        if (rockMask[i]) continue; // rock blocks light → a soft shadow on the floor
        const gx = (hCurr[i + 1] - hCurr[i - 1]) * 0.5; // ∂h/∂x
        const gy = (hCurr[i + W] - hCurr[i - W]) * 0.5; // ∂h/∂y
        const fx = x + (BEND * gx + tx) * D;
        const fy = y + (BEND * gy + ty) * D;
        const x0 = fx | 0, y0 = fy | 0;
        if (x0 < 1 || y0 < 1 || x0 >= W - 2 || y0 >= H - 2) continue;
        const rx = fx - x0, ry = fy - y0, j = y0 * W + x0; // bilinear splat of 1 unit
        caustic[j]         += (1 - rx) * (1 - ry);
        caustic[j + 1]     += rx * (1 - ry);
        caustic[j + W]     += (1 - rx) * ry;
        caustic[j + W + 1] += rx * ry;
      }
    }
    this.blur(sim);
  }

  /** separable 1-2-1 blur to soften splat noise */
  private blur(sim: WaterSim): void {
    const { W, H } = sim;
    const caustic = this.caustic!, cTmp = this.cTmp!;
    for (let y = 1; y < H - 1; y++) {
      let i = y * W + 1;
      for (let x = 1; x < W - 1; x++, i++)
        cTmp[i] = (caustic[i - 1] + 2 * caustic[i] + caustic[i + 1]) * 0.25;
    }
    for (let y = 1; y < H - 1; y++) {
      let i = y * W + 1;
      for (let x = 1; x < W - 1; x++, i++)
        caustic[i] = (cTmp[i - W] + 2 * cTmp[i] + cTmp[i + W]) * 0.25;
    }
  }

  private sample(sim: WaterSim, sx: number, sy: number): number {
    const { W, H } = sim;
    const caustic = this.caustic!;
    if (sx < 0) sx = 0; else if (sx > W - 1.001) sx = W - 1.001;
    if (sy < 0) sy = 0; else if (sy > H - 1.001) sy = H - 1.001;
    const x0 = sx | 0, y0 = sy | 0, rx = sx - x0, ry = sy - y0, j = y0 * W + x0;
    return caustic[j]         * (1 - rx) * (1 - ry)
         + caustic[j + 1]     * rx * (1 - ry)
         + caustic[j + W]     * (1 - rx) * ry
         + caustic[j + W + 1] * rx * ry;
  }

  render(sim: WaterSim, img: ImageData): void {
    this.ensureBuffers(sim.N);
    this.computeCaustics(sim);

    const { W, H, hCurr, rockMask } = sim;
    const px = img.data;

    const { lx, ly, lz } = sunDir(this.lightDeg, this.elevation);

    // Beer–Lambert absorption: red is lost first, then green, then blue
    const kd = this.depth * 0.010;
    const aR = Math.exp(-kd * 1.9), aG = Math.exp(-kd * 0.95), aB = Math.exp(-kd * 0.45);
    const D = this.depth, str = this.str;

    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, o = i * 4;
        if (rockMask[i]) { shadeStone(px, o, rockMask, i, W, lx, ly); continue; }
        const gx = (hCurr[i + 1] - hCurr[i - 1]) * 0.5;
        const gy = (hCurr[i + W] - hCurr[i - W]) * 0.5;

        // where we SEE the floor: the view ray refracts opposite the light
        const sx = x - BEND * gx * D, sy = y - BEND * gy * D;

        // procedural pool tiles at the sampled (refracted) floor point
        const T = 16;
        const tileX = ((sx % T) + T) % T, tileY = ((sy % T) + T) % T;
        const grout = (tileX < 1.4 || tileY < 1.4) ? 0.62 : 1.0;
        let fr = 92 * grout, fg = 150 * grout, fb = 172 * grout;

        const light = 0.32 + str * this.sample(sim, sx, sy);
        fr *= light; fg *= light; fb *= light;
        fr *= aR; fg *= aG; fb *= aB;

        // surface specular glint (slope scaled ×3.2 to match the Ripple Study look)
        const sxg = gx * 3.2, syg = gy * 3.2;
        const inv = 1 / Math.sqrt(sxg * sxg + syg * syg + 1);
        const nx = -sxg * inv, ny = -syg * inv, nz = inv;
        const diff = Math.max(0, nx * lx + ny * ly + nz * lz);
        const spec = Math.pow(diff, 80) * 210;
        fr += spec; fg += spec; fb += spec;

        if (this.whitecap > 0) {
          const foam = this.whitecap * (hCurr[i] - 0.4);
          if (foam > 0) { const f = foam * 150; fr += f; fg += f; fb += f; }
        }

        px[o]     = fr < 0 ? 0 : fr > 255 ? 255 : fr;
        px[o + 1] = fg < 0 ? 0 : fg > 255 ? 255 : fg;
        px[o + 2] = fb < 0 ? 0 : fb > 255 ? 255 : fb;
        px[o + 3] = 255;
      }
    }
  }
}
