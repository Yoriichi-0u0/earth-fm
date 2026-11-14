// Loads the pinned NASA file as RGBA pixels for Node unit tests.
// svs5313.decoded.bmp is the pinned JPEG decoded once with macOS `sips -s format bmp`
// (24-bit, top-down). Browsers decode the same JPEG at run time; see test/fixtures/README.md.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import type { Raster } from '../src/lib/nightLights/raster.ts';

export const JPEG_PATH = new URL('../public/nasa/svs5313/svs5313_eic_02599_print.jpg', import.meta.url);

export function loadFixture(): Raster {
  return parseBmp(readFileSync(new URL('./fixtures/nightLights/svs5313.decoded.bmp', import.meta.url)));
}

/** One of NASA's annual frames (public/nasa/svs5313/decade/YYYY.jpg), decoded once with sips and gzipped. */
export function loadYearFixture(year: number): Raster {
  return parseBmp(gunzipSync(readFileSync(new URL(`./fixtures/nightLights/decade/${year}.bmp.gz`, import.meta.url))));
}

function parseBmp(b: Buffer): Raster {
  const offset = b.readUInt32LE(10);
  const width = b.readInt32LE(18);
  const rawHeight = b.readInt32LE(22);
  const height = Math.abs(rawHeight);
  const bpp = b.readUInt16LE(28) / 8;
  const stride = Math.ceil((width * bpp) / 4) * 4;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const row = rawHeight < 0 ? y : height - 1 - y;
    for (let x = 0; x < width; x++) {
      const i = offset + row * stride + x * bpp;
      const j = (y * width + x) * 4;
      data[j] = b[i + 2];
      data[j + 1] = b[i + 1];
      data[j + 2] = b[i];
      data[j + 3] = 255;
    }
  }
  return { width, height, data };
}
