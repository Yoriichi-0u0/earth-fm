/**
 * NASA SVS 5046's fixed RenderMan camera, read from the EXR headers of every 2024 frame, and the globe
 * fitted inside it. Maps an image pixel to the latitude and longitude NASA rendered there, and back.
 *
 * Camera (identical in all twelve frames): worldToCamera = diag(-1,-1,-1) with translation z = 185, so the
 * eye sits at world (0,0,185) looking at the origin; worldToNDC scales x by 0.83334 and y by 1.4815
 * (a 16:9 frame). The globe's radius, pole direction and longitude origin are fitted once
 * (scripts/svs5046-calibrate.ts) against Natural Earth coastlines and the frames' own land colours.
 */
export const FRAME = {width: 3840, height: 2160} as const;
export const CAMERA = {distance: 185, sx: 0.833340883, sy: 1.481495023} as const;
export const EARTH_RADIUS_KM = 6371.0088;

export type Globe = {radius: number; tiltX: number; tiltY: number; lonOffset: number; mirror: 1 | -1};
/** Fitted by scripts/svs5046-calibrate.ts; see docs/ARCTIC-ICE.md for the fit quality. */
export const GLOBE: Globe = {radius: 99.94, tiltX: 0, tiltY: 0, lonOffset: 0, mirror: 1};

const rad = Math.PI / 180, deg = 180 / Math.PI;
type V3 = [number, number, number];
/** Rotate a world-space point into Earth axes (x towards 0°E on the equator, z towards the North Pole). */
function toEarth([x, y, z]: V3, g: Globe): V3 {
  const cx = Math.cos(g.tiltX * rad), sx = Math.sin(g.tiltX * rad), cy = Math.cos(g.tiltY * rad), sy = Math.sin(g.tiltY * rad);
  const y1 = y * cx - z * sx, z1 = y * sx + z * cx;
  const x2 = x * cy + z1 * sy, z2 = -x * sy + z1 * cy;
  return [x2, y1, z2];
}
function fromEarth([x, y, z]: V3, g: Globe): V3 {
  const cx = Math.cos(g.tiltX * rad), sx = Math.sin(g.tiltX * rad), cy = Math.cos(g.tiltY * rad), sy = Math.sin(g.tiltY * rad);
  const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
  return [x1, y * cx + z1 * sx, -y * sx + z1 * cx];
}
const wrap = (lon: number) => ((lon + 540) % 360) - 180;

/** The world point NASA's camera sees at pixel (px, py) of a width × height copy of the frame, or null for space. */
export function pixelToWorld(px: number, py: number, width: number, height: number, g: Globe = GLOBE): V3 | null {
  const nx = ((px + 0.5) / width) * 2 - 1, ny = 1 - ((py + 0.5) / height) * 2;
  const d: V3 = [-nx / CAMERA.sx, -ny / CAMERA.sy, -1], c = CAMERA.distance;
  // |(0,0,c) + t d|² = R²
  const a = d[0] * d[0] + d[1] * d[1] + 1, b = -2 * c, k = c * c - g.radius * g.radius, disc = b * b - 4 * a * k;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return [t * d[0], t * d[1], c - t];
}
export function pixelToLatLon(px: number, py: number, width: number, height: number, g: Globe = GLOBE): {lat: number; lon: number} | null {
  const w = pixelToWorld(px, py, width, height, g);
  if (!w) return null;
  const [x, y, z] = toEarth(w, g);
  return {lat: Math.asin(Math.max(-1, Math.min(1, z / g.radius))) * deg, lon: wrap(Math.atan2(g.mirror * y, x) * deg + g.lonOffset)};
}
/** Pixel position (in a width × height copy) of a latitude/longitude, or null when it faces away from the camera. */
export function latLonToPixel(lat: number, lon: number, width: number, height: number, g: Globe = GLOBE): {x: number; y: number} | null {
  const l = (lon - g.lonOffset) * rad, p = lat * rad;
  const earth: V3 = [g.radius * Math.cos(p) * Math.cos(l), g.mirror * g.radius * Math.cos(p) * Math.sin(l), g.radius * Math.sin(p)];
  const [x, y, z] = fromEarth(earth, g), c = CAMERA.distance;
  // Visible when the surface normal points at the eye.
  if (x * x + y * y + z * (z - c) > 0) return null;
  const nx = (-CAMERA.sx * x) / (c - z), ny = (-CAMERA.sy * y) / (c - z);
  return {x: ((nx + 1) / 2) * width - 0.5, y: ((1 - ny) / 2) * height - 0.5};
}
/** Ground area (km²) that one pixel of a width × height copy covers at (px, py); 0 off the globe. */
export function pixelAreaKm2(px: number, py: number, width: number, height: number, g: Globe = GLOBE): number {
  const p = pixelToWorld(px, py, width, height, g), dx = pixelToWorld(px + 0.5, py, width, height, g), dy = pixelToWorld(px, py + 0.5, width, height, g);
  if (!p || !dx || !dy) return 0;
  const u = [dx[0] - p[0], dx[1] - p[1], dx[2] - p[2]], v = [dy[0] - p[0], dy[1] - p[1], dy[2] - p[2]];
  const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const scale = EARTH_RADIUS_KM / g.radius;
  return 4 * Math.hypot(cross[0], cross[1], cross[2]) * scale * scale;
}
