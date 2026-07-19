/**
 * Draw a small sun marker near the canvas edge, in the direction the light comes
 * from (azimuth `lightDeg`). Makes the abstract "light angle" concrete: sweep it
 * and the sun circles the scene while the highlights track toward it.
 *
 * Screen space matches sim space (x right, y down), so the sun sits toward the
 * same side the shading lights.
 */
export function drawSun(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  lightDeg: number,
): void {
  const rad = lightDeg * Math.PI / 180;
  const x = cw / 2 + Math.cos(rad) * cw * 0.44;
  const y = ch / 2 + Math.sin(rad) * ch * 0.42;
  const R = Math.max(8, Math.min(cw, ch) * 0.028);

  ctx.save();

  // soft halo
  const halo = ctx.createRadialGradient(x, y, 0, x, y, R * 3.2);
  halo.addColorStop(0, 'rgba(255,240,200,0.85)');
  halo.addColorStop(0.4, 'rgba(255,228,165,0.32)');
  halo.addColorStop(1, 'rgba(255,228,165,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, R * 3.2, 0, Math.PI * 2);
  ctx.fill();

  // rays
  ctx.strokeStyle = 'rgba(255,240,200,0.75)';
  ctx.lineWidth = Math.max(1, R * 0.16);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * R * 1.35, y + Math.sin(a) * R * 1.35);
    ctx.lineTo(x + Math.cos(a) * R * 1.95, y + Math.sin(a) * R * 1.95);
    ctx.stroke();
  }

  // core
  ctx.fillStyle = 'rgba(255,249,228,0.97)';
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
