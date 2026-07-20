/**
 * iWave (Tessendorf) dispersion kernel.
 *
 * The plain wave equation uses the Laplacian ∇²h (Fourier symbol −k²), so every
 * wavelength travels at one speed — no dispersion. Deep-water gravity waves obey
 * ω = √(g·k): long waves are faster than short ones. iWave keeps the interactive
 * height-field scheme but replaces the Laplacian with a convolution whose Fourier
 * symbol is the dispersion operator.
 *
 * We use the symbol  s(k) = kCut·tanh(|k| / kCut):
 *   - ≈ |k| for long waves  → ω = √(g·k), the correct deep-water dispersion;
 *   - monotonically increasing and saturating for short waves → the group velocity
 *     never goes negative (no spurious backward-propagating ripples) and the symbol
 *     stays bounded and ≥ 0, so the leapfrog is stable for gravity ≤ ~4/kCut.
 *
 * The kernel is the direct inverse DFT of that symbol, tapered to its edge and
 * forced to zero-sum so flat water is a fixed point.
 */

export interface IWaveKernel {
  /** kernel half-width in cells */
  P: number;
  /** full kernel width, 2P+1 */
  size: number;
  /** (2P+1)² kernel, row-major */
  G: Float32Array;
}

/**
 * Build the dispersion kernel. `P` is the kernel radius (bigger = more accurate,
 * more expensive per cell); `kCut` is where the dispersion saturates (bigger =
 * more of the spectrum disperses, but a tighter stability bound on gravity).
 */
export function makeIWaveKernel(P = 5, kCut = 2.0): IWaveKernel {
  const size = 2 * P + 1;
  const G = new Float32Array(size * size);
  const N = 48; // frequency-grid resolution for the inverse DFT

  for (let m = -P; m <= P; m++) {
    for (let n = -P; n <= P; n++) {
      let sum = 0;
      for (let a = 0; a < N; a++) {
        const kx = -Math.PI + (2 * Math.PI * a) / N;
        for (let b = 0; b < N; b++) {
          const ky = -Math.PI + (2 * Math.PI * b) / N;
          const kk = Math.sqrt(kx * kx + ky * ky);
          const s = kCut * Math.tanh(kk / kCut); // monotonic, non-negative dispersion symbol
          sum += s * Math.cos(kx * m + ky * n);
        }
      }
      // cosine taper to zero at the kernel edge → less truncation ringing
      const r = Math.sqrt(m * m + n * n);
      const taper = r < P ? 0.5 * (1 + Math.cos(Math.PI * r / P)) : 0;
      G[(m + P) * size + (n + P)] = (sum / (N * N)) * taper;
    }
  }

  // enforce zero-sum: flat water stays flat (only shifts the DC component)
  let mean = 0;
  for (let i = 0; i < G.length; i++) mean += G[i];
  mean /= G.length;
  for (let i = 0; i < G.length; i++) G[i] -= mean;

  return { P, size, G };
}
