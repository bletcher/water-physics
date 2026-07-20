import type { WaterSim } from './WaterSim';

const RUFFLE = 20;    // ambient across-wind streaks per frame at full wind
const GUST_MAX = 5;   // cat's paws at full wind
const DRIFT = 0.9;    // max drift, cells per frame, at full wind
const SHADOW = 16;    // how far downwind an obstacle shelters the water (cells)
const CAP = 1.2;      // stop ruffling a cell once it's this agitated — bounds the energy
const HMAX = 4;       // hard amplitude clamp — safety net against runaway forcing

/** Whitecap intensity for the renderers: foam only once the wind is fresh. */
export function whitecapFromWind(speed: number): number {
  return Math.max(0, speed - 0.55) * 2.2;
}

interface Gust { x: number; y: number; }

/**
 * Wind acting on the surface. Each frame it: drifts the whole pattern downwind
 * (integer-shift advection); ruffles the surface with tiny across-wind streaks so
 * crests line up perpendicular to the wind; and drives a few "cat's paws" — gust
 * patches that scud downwind roughening the water. Cells sheltered behind an
 * obstacle (upwind) are left calm — a wind shadow. Whitecaps live in the renderer.
 *
 * The plain wave equation is isotropic, so the directionality is faked by the
 * across-wind forcing + downwind drift — the same spirit as our other shortcuts.
 */
export class WindField {
  private gusts: Gust[] = [];
  private accX = 0;
  private accY = 0;

  update(sim: WaterSim, speed: number, deg: number): void {
    if (speed <= 0.001) { this.gusts.length = 0; this.accX = 0; this.accY = 0; return; }
    const { W, H } = sim;
    const rad = deg * Math.PI / 180;
    const wx = Math.cos(rad), wy = Math.sin(rad);   // downwind unit
    const ax = -wy, ay = wx;                        // across-wind unit

    // drift the pattern downwind
    this.accX += wx * speed * DRIFT;
    this.accY += wy * speed * DRIFT;
    let sxi = 0, syi = 0;
    if (this.accX >= 1) { sxi = 1; this.accX -= 1; } else if (this.accX <= -1) { sxi = -1; this.accX += 1; }
    if (this.accY >= 1) { syi = 1; this.accY -= 1; } else if (this.accY <= -1) { syi = -1; this.accY += 1; }
    if (sxi !== 0 || syi !== 0) sim.shift(sxi, syi);

    // cat's paws — keep ~speed·GUST_MAX gusts drifting downwind
    const want = Math.round(speed * GUST_MAX);
    while (this.gusts.length < want) this.gusts.push(this.spawn(W, H, wx, wy));
    while (this.gusts.length > want) this.gusts.pop();
    const gv = 0.6 + speed * 1.4;
    for (const g of this.gusts) {
      g.x += wx * gv;
      g.y += wy * gv;
      if (g.x < -12 || g.x > W + 12 || g.y < -12 || g.y > H + 12) {
        const s = this.spawn(W, H, wx, wy);
        g.x = s.x;
        g.y = s.y;
      }
    }

    // ruffle: ambient everywhere + heavier inside the cat's paws
    const ambientAmp = 0.04 + speed * 0.12;
    const gustAmp = 0.08 + speed * 0.2;
    const n = Math.round(speed * RUFFLE);
    for (let k = 0; k < n; k++) {
      this.streak(sim, 2 + Math.random() * (W - 4), 2 + Math.random() * (H - 4), ambientAmp, ax, ay, wx, wy);
    }
    for (const g of this.gusts) {
      for (let k = 0; k < 5; k++) {
        this.streak(sim, g.x + (Math.random() - 0.5) * 18, g.y + (Math.random() - 0.5) * 18, gustAmp, ax, ay, wx, wy);
      }
    }

    // safety net: keep the field bounded so continuous forcing can't run away
    const hc = sim.hCurr;
    for (let i = 0; i < hc.length; i++) {
      const v = hc[i];
      if (v > HMAX) hc[i] = HMAX; else if (v < -HMAX) hc[i] = -HMAX;
    }
  }

  /** spawn a gust on the upwind side so it crosses the scene */
  private spawn(W: number, H: number, wx: number, wy: number): Gust {
    return {
      x: W / 2 - wx * W * 0.55 + (Math.random() - 0.5) * W * 0.6,
      y: H / 2 - wy * H * 0.55 + (Math.random() - 0.5) * H * 0.6,
    };
  }

  /** a short across-wind line of soft, capped stamps → a wavelet with its crest across the wind */
  private streak(sim: WaterSim, x: number, y: number, amp: number, ax: number, ay: number, wx: number, wy: number): void {
    if (this.sheltered(sim, x, y, wx, wy)) return;
    const W = sim.W, H = sim.H;
    const hc = sim.hCurr, mask = sim.rockMask;
    const len = 1 + (Math.random() * 3 | 0);
    for (let s = -len; s <= len; s++) {
      const xx = Math.round(x + ax * s), yy = Math.round(y + ay * s);
      if (xx < 2 || xx > W - 3 || yy < 2 || yy > H - 3) continue;
      const idx = yy * W + xx;
      if (mask[idx] || Math.abs(hc[idx]) > CAP) continue; // don't pile onto agitated water
      // soft stamp (spread to neighbours) so we add resolvable ripples, not grid-scale noise
      hc[idx] -= amp;
      hc[idx - 1] -= amp * 0.35;
      hc[idx + 1] -= amp * 0.35;
      hc[idx - W] -= amp * 0.35;
      hc[idx + W] -= amp * 0.35;
    }
  }

  /** true if an obstacle sits just upwind — the water here is in its wind shadow */
  private sheltered(sim: WaterSim, x: number, y: number, wx: number, wy: number): boolean {
    for (let d = 2; d <= SHADOW; d++) {
      const xx = Math.round(x - wx * d), yy = Math.round(y - wy * d);
      if (xx < 0 || xx >= sim.W || yy < 0 || yy >= sim.H) return false;
      if (sim.rockMask[yy * sim.W + xx]) return true;
    }
    return false;
  }
}
