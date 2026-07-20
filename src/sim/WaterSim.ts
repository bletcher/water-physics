import type { IWaveKernel } from './iwave';

/**
 * WaterSim — a damped 2D wave equation on a height field.
 *
 *   ∂²h/∂t² = c²∇²h − k·∂h/∂t
 *
 * Finite-difference update on a grid: each cell's next height depends on its
 * four neighbours' current heights. A rock is a set of cells clamped to zero
 * (a Dirichlet boundary), from which reflection, diffraction, and interference
 * emerge for free. Framework-free: no DOM, no React — just numbers.
 */

/** How the domain edges behave. */
export type Boundary =
  | 'walls' // reflecting (a tank / pool wall)
  | 'open'; // non-reflecting: waves leave as if the water were infinite

export class WaterSim {
  readonly W: number;
  readonly H: number;
  readonly N: number;

  /** height field, current / previous / scratch-next frame */
  hCurr: Float32Array;
  hPrev: Float32Array;
  hNext: Float32Array;

  /** 1 where a rock blocks the water */
  readonly rockMask: Uint8Array;
  readonly rock: { x: number; y: number };

  // --- physics parameters (mutable; driven by the UI) ---
  /** propagation speed; above ~0.62 the explicit scheme goes unstable (CFL) */
  c = 0.42;
  /** per-step energy retention; 1 = lossless, lower = quicker calm */
  damp = 0.994;
  /** rock radius in grid cells */
  rockR = 14;
  /** edge behaviour: reflecting walls, or open (infinite) water */
  boundary: Boundary = 'open';
  /**
   * Optional per-cell c² for spatially-varying wave speed (shallow water:
   * c ∝ √depth ⇒ c² ∝ depth). When null, the scalar `c` is used everywhere.
   */
  c2Field: Float32Array | null = null;
  /** 1 = inside the pond shape, 0 = outside; null = the full rectangle */
  domainMask: Uint8Array | null = null;
  /** when set, step() evolves with dispersive iWave convolution instead of the Laplacian */
  iwaveKernel: IWaveKernel | null = null;
  /** iWave coupling (∝ gravity·dt²); higher = faster waves, ≤ ~4 stays stable */
  gravity = 1.5;
  /** scratch for shift(), allocated on first use */
  private _scratch: Float32Array | null = null;

  constructor(W = 240, H = 160) {
    this.W = W;
    this.H = H;
    this.N = W * H;
    this.hCurr = new Float32Array(this.N);
    this.hPrev = new Float32Array(this.N);
    this.hNext = new Float32Array(this.N);
    this.rockMask = new Uint8Array(this.N);
    this.rock = { x: W * 0.62, y: H * 0.45 };
  }

  /** Rebuild the circular rock mask from `rock` position and `rockR`. */
  buildRock(): void {
    const { W, H, rock, rockR: r } = this;
    this.rockMask.fill(0);
    const r2 = r * r;
    const x0 = Math.max(1, (rock.x - r) | 0), x1 = Math.min(W - 2, (rock.x + r) | 0);
    const y0 = Math.max(1, (rock.y - r) | 0), y1 = Math.min(H - 2, (rock.y + r) | 0);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - rock.x, dy = y - rock.y;
        if (dx * dx + dy * dy <= r2) this.rockMask[y * W + x] = 1;
      }
    }
  }

  /** Move the rock, clamped inside the pool, and rebuild its mask. */
  moveRock(x: number, y: number): void {
    this.rock.x = Math.min(this.W - 4, Math.max(4, x));
    this.rock.y = Math.min(this.H - 4, Math.max(4, y));
    this.buildRock();
  }

  /** Brush the obstacle mask in a disk: value 1 paints a wall, 0 erases. */
  paintMask(cx: number, cy: number, radius: number, value: 0 | 1): void {
    const { W, H, rockMask } = this;
    const r2 = radius * radius;
    const x0 = Math.max(1, (cx - radius) | 0), x1 = Math.min(W - 2, (cx + radius) | 0);
    const y0 = Math.max(1, (cy - radius) | 0), y1 = Math.min(H - 2, (cy + radius) | 0);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r2) rockMask[y * W + x] = value;
      }
    }
  }

  /** Remove all obstacles. */
  clearMask(): void {
    this.rockMask.fill(0);
  }

  /**
   * Shape the pond by rounding its corners. `frac` 0 = the full rectangle
   * (mask cleared), 1 = corners rounded as far as they go (a stadium, or a
   * circle when W = H). Cells outside the rounded rect become "outside" and the
   * waves reflect off the curved edge.
   */
  setCornerRadius(frac: number): void {
    if (frac <= 0.001) { this.domainMask = null; return; }
    const { W, H } = this;
    if (!this.domainMask || this.domainMask.length !== this.N) this.domainMask = new Uint8Array(this.N);
    const dm = this.domainMask;
    const cx = (W - 1) / 2, cy = (H - 1) / 2;
    const halfW = (W - 2) / 2, halfH = (H - 2) / 2; // 1-cell margin
    const r = frac * Math.min(halfW, halfH);        // corner radius
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const qx = Math.abs(x - cx) - (halfW - r);
        const qy = Math.abs(y - cy) - (halfH - r);
        const ax = qx > 0 ? qx : 0, ay = qy > 0 ? qy : 0;
        const d = Math.sqrt(ax * ax + ay * ay) + Math.min(Math.max(qx, qy), 0) - r; // rounded-box SDF
        dm[y * W + x] = d <= 0 ? 1 : 0;
      }
    }
  }

  /** Add a gaussian dimple (a drop) centred at (sx, sy). */
  drop(sx: number, sy: number, radius: number, amp: number): void {
    const { W, H, hCurr, rockMask } = this;
    const r2 = radius * radius;
    const x0 = Math.max(1, (sx - radius * 2) | 0), x1 = Math.min(W - 2, (sx + radius * 2) | 0);
    const y0 = Math.max(1, (sy - radius * 2) | 0), y1 = Math.min(H - 2, (sy + radius * 2) | 0);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - sx, dy = y - sy;
        const g = Math.exp(-(dx * dx + dy * dy) / r2);
        if (g > 0.01 && !rockMask[y * W + x]) hCurr[y * W + x] -= amp * g;
      }
    }
  }

  /** Advance one timestep: h_next = (2h − h_prev + c²∇²h)·damp. */
  step(): void {
    if (this.iwaveKernel) { this.stepIWave(); return; }
    const { W, H, hCurr, hPrev, hNext, rockMask, c2Field, domainMask } = this;
    const scalarC2 = this.c * this.c, damp = this.damp;
    for (let y = 1; y < H - 1; y++) {
      let i = y * W + 1;
      for (let x = 1; x < W - 1; x++, i++) {
        if (rockMask[i] || (domainMask !== null && domainMask[i] === 0)) { hNext[i] = 0; continue; } // wall / outside
        const lap = hCurr[i - 1] + hCurr[i + 1] + hCurr[i - W] + hCurr[i + W] - 4 * hCurr[i];
        const c2 = c2Field ? c2Field[i] : scalarC2;
        hNext[i] = (2 * hCurr[i] - hPrev[i] + c2 * lap) * damp;
      }
    }
    this.applyBoundary();
    // rotate buffers
    this.hPrev = hCurr;
    this.hCurr = hNext;
    this.hNext = hPrev;
  }

  /**
   * Dispersive iWave update: h_next = (2h − h_prev − gravity·(G⊛h))·damp, where
   * G is the dispersion kernel (Fourier symbol ∝ |k|). Obstacle/outside cells are
   * held at zero, and the convolution reads calm (0) beyond the edge.
   */
  private stepIWave(): void {
    const { W, H, hCurr, hPrev, hNext, rockMask, domainMask } = this;
    const kernel = this.iwaveKernel!;
    const P = kernel.P, size = kernel.size, G = kernel.G;
    const A = this.gravity, damp = this.damp;
    const HMAX = 5; // hard clamp — a catastrophic backstop against runaway
    const blocked = (i: number) => rockMask[i] === 1 || (domainMask !== null && domainMask[i] === 0);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (blocked(i)) { hNext[i] = 0; continue; }
        let vd = 0, gRow = 0;
        for (let kn = -P; kn <= P; kn++, gRow += size) {
          const sy = y + kn;
          if (sy < 1 || sy >= H - 1) continue;
          const rowBase = sy * W;
          for (let km = -P; km <= P; km++) {
            const sx = x + km;
            if (sx < 1 || sx >= W - 1) continue;
            vd += G[gRow + (km + P)] * hCurr[rowBase + sx];
          }
        }
        let v = (2 * hCurr[i] - hPrev[i] - A * vd) * damp;
        v = v > HMAX ? HMAX : v < -HMAX ? -HMAX : v;
        hNext[i] = v;
      }
    }
    // light hyper-viscosity: damp the grid-scale (checkerboard) mode the truncated
    // kernel can still nudge, without touching the physical mid/long waves.
    const s = this._scratch ?? (this._scratch = new Float32Array(this.N));
    s.set(hNext);
    const eps = 0.04;
    for (let y = 1; y < H - 1; y++) {
      let i = y * W + 1;
      for (let x = 1; x < W - 1; x++, i++) {
        if (blocked(i)) { hNext[i] = 0; continue; }
        hNext[i] = s[i] + eps * ((s[i - 1] + s[i + 1] + s[i - W] + s[i + W]) * 0.25 - s[i]);
      }
    }
    // absorbing sponge border so outgoing waves leave instead of reflecting
    const B = 12;
    for (let bnd = 0; bnd < B; bnd++) {
      const f = 0.82 + 0.18 * (bnd / B);
      for (let x = 0; x < W; x++) { hNext[bnd * W + x] *= f; hNext[(H - 1 - bnd) * W + x] *= f; }
      for (let y = 0; y < H; y++) { hNext[y * W + bnd] *= f; hNext[y * W + (W - 1 - bnd)] *= f; }
    }
    this.hPrev = hCurr;
    this.hCurr = hNext;
    this.hNext = hPrev;
  }

  /**
   * Set the edge cells of hNext after the interior update.
   *  - 'walls': zero-gradient (Neumann) copy of the interior neighbour → the
   *    wave reflects, as off a tank wall.
   *  - 'open': Mur first-order absorbing boundary — outgoing waves leave with
   *    almost no reflection, so the pool reads as infinite (no border effects).
   */
  private applyBoundary(): void {
    const { W, H, hCurr, hNext } = this;
    if (this.boundary === 'open') {
      const K = (this.c - 1) / (this.c + 1); // Mur coefficient, effective Courant ≈ c
      for (let y = 0; y < H; y++) {
        const l = y * W, r = y * W + (W - 1);
        hNext[l] = hCurr[l + 1] + K * (hNext[l + 1] - hCurr[l]);
        hNext[r] = hCurr[r - 1] + K * (hNext[r - 1] - hCurr[r]);
      }
      for (let x = 0; x < W; x++) {
        const t = x, b = (H - 1) * W + x;
        hNext[t] = hCurr[t + W] + K * (hNext[t + W] - hCurr[t]);
        hNext[b] = hCurr[b - W] + K * (hNext[b - W] - hCurr[b]);
      }
    } else {
      for (let y = 0; y < H; y++) {
        const l = y * W, r = y * W + (W - 1);
        hNext[l] = hNext[l + 1];
        hNext[r] = hNext[r - 1];
      }
      for (let x = 0; x < W; x++) {
        const t = x, b = (H - 1) * W + x;
        hNext[t] = hNext[t + W];
        hNext[b] = hNext[b - W];
      }
    }
  }

  /** Flatten the surface back to stillness. */
  clear(): void {
    this.hCurr.fill(0);
    this.hPrev.fill(0);
    this.hNext.fill(0);
  }

  /**
   * Integer-shift the height field by (dx, dy) cells — used to drift the surface
   * downwind. Exposed upwind edges come in calm; the downwind edge falls off.
   */
  shift(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) return;
    const { W, H } = this;
    if (!this._scratch) this._scratch = new Float32Array(this.N);
    const scratch = this._scratch;
    const bufs = [this.hCurr, this.hPrev];
    for (let bi = 0; bi < bufs.length; bi++) {
      const buf = bufs[bi];
      scratch.set(buf);
      for (let y = 0; y < H; y++) {
        const sy = y - dy;
        const rowOk = sy >= 0 && sy < H;
        for (let x = 0; x < W; x++) {
          const sx = x - dx;
          buf[y * W + x] = rowOk && sx >= 0 && sx < W ? scratch[sy * W + sx] : 0;
        }
      }
    }
  }
}
