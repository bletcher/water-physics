/**
 * Draw a lollipop sun marker showing where the light comes from and how high it is.
 *
 *  - azimuth (`lightDeg`) plants the base on that side of the pool (the horizon).
 *  - elevation (`elevationDeg`) is the stick: the sun climbs from its horizon base
 *    (0°, grazing) toward the centre / straight overhead (90°). The stick length is
 *    the height. The sun also warms from white (high, midday) to orange (low sun).
 *
 * Screen space matches sim space (x right, y down), so the base sits toward the
 * same side the shading lights and the stick reads as the real light height.
 */
export function drawSun(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  lightDeg: number,
  elevationDeg: number,
): void {
  const rad = lightDeg * Math.PI / 180;
  const el = elevationDeg < 0 ? 0 : elevationDeg > 90 ? 90 : elevationDeg;
  const t = 1 - el / 90;                    // 1 = on the horizon (base), 0 = overhead (centre)
  const cx = cw / 2, cy = ch / 2;
  const dx = Math.cos(rad), dy = Math.sin(rad);
  const rx = cw * 0.44, ry = ch * 0.42;

  const bx = cx + dx * rx, by = cy + dy * ry;         // horizon base (fixed by azimuth)
  const x = cx + dx * rx * t, y = cy + dy * ry * t;   // sun climbs toward centre as it rises
  const R = Math.max(8, Math.min(cw, ch) * 0.026);

  // warm toward the horizon
  const g = Math.round(249 - t * 44);
  const b = Math.round(228 - t * 128);
  const core = `rgba(255,${g},${b},0.97)`;
  const glow = `rgba(255,${g},${b},`;

  ctx.save();

  // lollipop stick: base → sun
  ctx.strokeStyle = 'rgba(205,215,218,0.35)';
  ctx.lineWidth = Math.max(1.5, R * 0.16);
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(x, y);
  ctx.stroke();

  // "planted" ground tick at the horizon base (perpendicular to the stick)
  const px = -dy, py = dx, tl = R * 0.85;
  ctx.strokeStyle = 'rgba(205,215,218,0.55)';
  ctx.beginPath();
  ctx.moveTo(bx - px * tl, by - py * tl);
  ctx.lineTo(bx + px * tl, by + py * tl);
  ctx.stroke();

  // sun halo
  const halo = ctx.createRadialGradient(x, y, 0, x, y, R * 3.2);
  halo.addColorStop(0, glow + '0.85)');
  halo.addColorStop(0.4, glow + '0.30)');
  halo.addColorStop(1, glow + '0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, R * 3.2, 0, Math.PI * 2);
  ctx.fill();

  // rays
  ctx.strokeStyle = glow + '0.7)';
  ctx.lineWidth = Math.max(1, R * 0.16);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * R * 1.35, y + Math.sin(a) * R * 1.35);
    ctx.lineTo(x + Math.cos(a) * R * 1.95, y + Math.sin(a) * R * 1.95);
    ctx.stroke();
  }

  // core
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
