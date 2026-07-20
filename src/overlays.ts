/**
 * Draw a lollipop sun marker: where the light comes from, and how high it is.
 *
 *  - azimuth (`lightDeg`) plants the base around the pool — which side the light
 *    comes from (the base tracks the compass direction).
 *  - elevation (`elevationDeg`) is an always-vertical stick: the sun rises straight
 *    up off its base, and the stick's height is the sun's height (0° grazing sits
 *    on the base, 90° overhead lifts it all the way up). The sun also warms from
 *    white (high, midday) to orange (low sun).
 *
 * The stick stays upright as the azimuth rotates, so height always reads as "how
 * far up," never as an angle.
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
  const cx = cw / 2, cy = ch / 2;

  // base = compass direction (a squashed rim so the vertical stick always fits)
  const bx = cx + Math.cos(rad) * cw * 0.42;
  const by = cy + Math.sin(rad) * ch * 0.24;
  const stick = ch * 0.22 * (el / 90);   // vertical stick length = height
  const x = bx, y = by - stick;          // sun rises straight up
  const R = Math.max(8, Math.min(cw, ch) * 0.026);

  // warm toward the horizon
  const t = 1 - el / 90;
  const g = Math.round(249 - t * 44);
  const b = Math.round(228 - t * 128);
  const core = `rgba(255,${g},${b},0.97)`;
  const glow = `rgba(255,${g},${b},`;

  ctx.save();

  // vertical stick: base → sun
  ctx.strokeStyle = 'rgba(205,215,218,0.4)';
  ctx.lineWidth = Math.max(1.5, R * 0.16);
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(x, y);
  ctx.stroke();

  // "planted" foot at the base (horizontal tick)
  ctx.strokeStyle = 'rgba(205,215,218,0.6)';
  ctx.beginPath();
  ctx.moveTo(bx - R * 0.9, by);
  ctx.lineTo(bx + R * 0.9, by);
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

/**
 * Draw a wind arrow in the top-left corner: it points downwind and grows with
 * wind speed, with a "wind NN%" label. Nothing is drawn when the air is calm.
 */
export function drawWindArrow(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  windDeg: number,
  windSpeed: number,
): void {
  if (windSpeed <= 0.001) return;
  const rad = windDeg * Math.PI / 180;
  const dx = Math.cos(rad), dy = Math.sin(rad);
  const cxp = cw * 0.14, cyp = ch * 0.18;
  const len = (0.045 + windSpeed * 0.085) * cw;
  const tipX = cxp + dx * len, tipY = cyp + dy * len;
  const ah = Math.max(6, cw * 0.016);

  ctx.save();
  ctx.strokeStyle = 'rgba(180,222,232,0.85)';
  ctx.lineWidth = Math.max(2, cw * 0.004);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cxp - dx * len, cyp - dy * len);
  ctx.lineTo(tipX, tipY);
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - Math.cos(rad - 0.4) * ah, tipY - Math.sin(rad - 0.4) * ah);
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - Math.cos(rad + 0.4) * ah, tipY - Math.sin(rad + 0.4) * ah);
  ctx.stroke();

  ctx.fillStyle = 'rgba(150,170,180,0.9)';
  ctx.font = `${Math.max(10, cw * 0.013)}px "IBM Plex Sans", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`wind ${Math.round(windSpeed * 100)}%`, cxp, cyp - ch * 0.09);
  ctx.restore();
}
