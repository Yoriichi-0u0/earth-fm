/**
 * What NASA rendered at one sRGB pixel of SVS 5046. NASA draws sea ice (AMSR2 concentration ≥ 15%) as
 * blue-white over a dark-blue ocean; land comes from Blue Marble Next Generation (green, brown, or white snow).
 * The thresholds are fixed and tested against sampled pixels of the frames.
 */
export type Surface = 'ocean' | 'white' | 'land';
/** Open water: blue clearly dominates and the pixel is not bright. */
export const isOcean = (r: number, g: number, b: number) => b > r + 40 && b > g + 12 && r < 150;
/** Ice or snow: bright and nearly neutral (blue-white). */
export const isWhite = (r: number, g: number, b: number) => Math.min(r, g, b) > 165 && b - r < 70;
export function surfaceClass(r: number, g: number, b: number): Surface | 'mixed' {
  if (isWhite(r, g, b)) return 'white';
  if (isOcean(r, g, b)) return 'ocean';
  // Vegetation or bare ground: red or green rival blue.
  if (r > b - 8 || g > b + 4) return 'land';
  return 'mixed';
}
