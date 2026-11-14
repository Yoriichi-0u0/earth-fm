// Loads the pinned NASA SVS 5669 PNGs as RGBA pixels for Node unit tests.
// PNG is lossless and these files carry no colour profile or gamma chunk, so browsers decode
// exactly these bytes; the tests and the app analyse the same pixels.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import type { Raster } from '../src/lib/nightLights/raster.ts';

export const STILL_PATH = new URL('../public/nasa/svs5669/svs5669_aerosols_2025-08-19T20Z_1920x1080.png', import.meta.url);
export const COLORBAR_PATH = new URL('../public/nasa/svs5669/svs5669_aerosols_cbar.png', import.meta.url);

let still: Raster | undefined, colorbar: Raster | undefined;
export const loadStill = (): Raster => (still ??= decodePng(readFileSync(STILL_PATH)));
export const loadColorbar = (): Raster => (colorbar ??= decodePng(readFileSync(COLORBAR_PATH)));

/** Minimal decoder: 8-bit RGB or RGBA, non-interlaced (what NASA ships here). */
export function decodePng(file: Buffer): Raster {
  let width = 0, height = 0, channels = 0;
  const idat: Buffer[] = [];
  for (let i = 8; i < file.length; ) {
    const length = file.readUInt32BE(i), type = file.toString('latin1', i + 4, i + 8), body = file.subarray(i + 8, i + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0); height = body.readUInt32BE(4);
      const depth = body[8], colorType = body[9], interlace = body[12];
      if (depth !== 8 || interlace !== 0 || (colorType !== 2 && colorType !== 6)) throw new Error(`unsupported PNG: depth ${depth}, colour type ${colorType}, interlace ${interlace}`);
      channels = colorType === 6 ? 4 : 3;
    } else if (type === 'IDAT') idat.push(body);
    i += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat)), stride = width * channels;
  const out = new Uint8ClampedArray(width * height * 4);
  const prev = new Uint8Array(stride), cur = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0, b = prev[x], c = x >= channels ? prev[x - channels] : 0;
      let v = row[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[x] = v & 255;
    }
    for (let x = 0; x < width; x++) {
      const j = (y * width + x) * 4, k = x * channels;
      out[j] = cur[k]; out[j + 1] = cur[k + 1]; out[j + 2] = cur[k + 2]; out[j + 3] = channels === 4 ? cur[k + 3] : 255;
    }
    prev.set(cur);
  }
  return { width, height, data: out };
}
