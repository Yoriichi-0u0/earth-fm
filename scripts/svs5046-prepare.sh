#!/bin/sh
# Rebuild the Arctic Sea Ice record's images from NASA SVS 5046 frames (macOS: sips, cwebp).
#   scripts/svs5046-prepare.sh <folder with arctic_sea_ice.2024DDD.exr files>
# The EXR frames are NASA's 3840x2160 RenderMan renders, stored in linear light. sips converts them
# to standard sRGB (this matches NASA's own _print.jpg to within 2/255 on open ocean), then:
#   validation/svs5046/2024-MM-15.png  960x540 RGBA, colour chunks stripped: what the analysis reads
#   public/nasa/svs5046/2024-MM-15.webp 1600x900 RGBA WebP: what the record shows
# Hashes of the EXR originals and of every output are recorded in public/nasa/svs5046/svs5046.provenance.json.
set -eu
src=${1:?folder with EXR frames}
root=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
srgb="/System/Library/ColorSync/Profiles/sRGB Profile.icc"
mkdir -p "$root/validation/svs5046" "$root/public/nasa/svs5046"
for pair in 015:01 046:02 075:03 106:04 136:05 167:06 197:07 228:08 259:09 289:10 320:11 350:12; do
  doy=${pair%%:*}; month=${pair##*:}; name=2024-$month-15
  sips -s format png "$src/arctic_sea_ice.2024$doy.exr" --out "$work/linear.png" >/dev/null
  sips -m "$srgb" "$work/linear.png" --out "$work/srgb.png" >/dev/null
  sips -z 540 960 "$work/srgb.png" --out "$work/small.png" >/dev/null
  node "$root/scripts/png-strip-colour.mjs" "$work/small.png" "$root/validation/svs5046/$name.png"
  cwebp -quiet -q 82 -alpha_q 90 -resize 1600 900 "$work/srgb.png" -o "$root/public/nasa/svs5046/$name.webp"
done
rm -rf "$work"
echo "Done. Next: npx tsx scripts/svs5046-analyse.ts"
