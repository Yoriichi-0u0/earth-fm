/**
 * Natural Earth 1:110m land (public domain, already bundled in src/data/world.json) rasterised onto a
 * 0.25° latitude/longitude grid north of 20°N by scanline filling, even–odd rule.
 */
export const GRID = {step: 0.25, south: 20} as const;
export type LandGrid = {cols: number; rows: number; land: Uint8Array};
type Ring = readonly (readonly [number, number])[] | readonly (readonly number[])[];

export function rasterLand(rings: readonly Ring[]): LandGrid {
  const cols = Math.round(360 / GRID.step), rows = Math.round((90 - GRID.south) / GRID.step), land = new Uint8Array(cols * rows);
  const north = rings.filter(r => r.some(p => p[1] > GRID.south));
  for (let row = 0; row < rows; row++) {
    const lat = 90 - (row + 0.5) * GRID.step, crossings: number[] = [];
    for (const ring of north) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x1, y1] = ring[j], [x2, y2] = ring[i];
      if ((y1 > lat) !== (y2 > lat)) crossings.push(x1 + ((lat - y1) / (y2 - y1)) * (x2 - x1));
    }
    crossings.sort((a, b) => a - b);
    for (let k = 0; k + 1 < crossings.length; k += 2) {
      const from = Math.max(0, Math.ceil((crossings[k] + 180) / GRID.step - 0.5)), to = Math.min(cols - 1, Math.floor((crossings[k + 1] + 180) / GRID.step - 0.5));
      for (let col = from; col <= to; col++) land[row * cols + col] = 1;
    }
  }
  return {cols, rows, land};
}
export function isLand(grid: LandGrid, lat: number, lon: number): boolean {
  if (lat < GRID.south) return false;
  const row = Math.min(grid.rows - 1, Math.floor((90 - lat) / GRID.step)), col = Math.min(grid.cols - 1, Math.max(0, Math.floor((lon + 180) / GRID.step)));
  return grid.land[row * grid.cols + col] === 1;
}
