/**
 * Shade an obstacle cell as warm stone. Works for any mask shape (circle or a
 * hand-painted wall): the surface "normal" of the obstacle edge comes from the
 * mask's own gradient, so edges facing the light pick up a rim highlight while
 * interior cells stay flat.
 */
export function shadeStone(
  px: Uint8ClampedArray,
  o: number,
  mask: Uint8Array,
  i: number,
  W: number,
  lx: number,
  ly: number,
): void {
  const mgx = mask[i + 1] - mask[i - 1];
  const mgy = mask[i + W] - mask[i - W];
  const rim = Math.max(0, -mgx * lx + -mgy * ly) * 26;
  const g = 60 + rim;
  px[o] = g + 10;
  px[o + 1] = g + 5;
  px[o + 2] = g;
  px[o + 3] = 255;
}
