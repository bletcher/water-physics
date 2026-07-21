/**
 * A painter's "value study": collapse a finished frame into a few flat tones of
 * light and dark, dropping colour and texture so only the big value pattern
 * remains. Applied as a post-process over the rendered pixels, so it works the
 * same for every scene (ripples, wake, shore, the light on the floor).
 */
export function applyValueStudy(px: Uint8ClampedArray, count: number, levels: number): void {
  const n = count * 4;
  for (let o = 0; o < n; o += 4) {
    let L = (0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2]) / 255;
    L = L < 0 ? 0 : L > 1 ? 1 : L;
    const v = Math.min(levels - 1, Math.floor(L * levels)) / (levels - 1);
    // a warm-neutral ramp (toned paper → chalk) rather than dead grey
    px[o] = 30 + v * 214;
    px[o + 1] = 32 + v * 210;
    px[o + 2] = 36 + v * 200;
  }
}
