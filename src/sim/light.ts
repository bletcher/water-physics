/**
 * Unit direction toward the sun, from azimuth (compass angle, degrees) and
 * elevation (height above the horizon: 0° = grazing along the surface, 90° =
 * straight overhead). Used for diffuse + specular shading, so raising the sun
 * lifts the whole surface into light and shortens the glare, while a low sun
 * throws long grazing reflections.
 */
export function sunDir(azimuthDeg: number, elevationDeg: number): { lx: number; ly: number; lz: number } {
  const az = azimuthDeg * Math.PI / 180;
  const el = elevationDeg * Math.PI / 180;
  const ch = Math.cos(el);
  return { lx: Math.cos(az) * ch, ly: Math.sin(az) * ch, lz: Math.sin(el) };
}
