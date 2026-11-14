// Copy a PNG without colour-management chunks (iCCP, gAMA, cHRM, sRGB) or text, so browsers and
// Node tests decode the same 8-bit values. Usage: node scripts/png-strip-colour.mjs in.png out.png
import { readFileSync, writeFileSync } from 'node:fs';
const [input, output] = process.argv.slice(2);
const file = readFileSync(input), keep = [file.subarray(0, 8)];
for (let i = 8; i < file.length; ) {
  const length = file.readUInt32BE(i), type = file.toString('latin1', i + 4, i + 8);
  if (!['iCCP', 'gAMA', 'cHRM', 'sRGB', 'tEXt', 'iTXt', 'zTXt', 'pHYs', 'tIME'].includes(type)) keep.push(file.subarray(i, i + 12 + length));
  i += 12 + length;
}
writeFileSync(output, Buffer.concat(keep));
