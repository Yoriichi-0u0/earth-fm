#!/usr/bin/env bash
# Reproduces public/nasa/svs5313/decade/YYYY.jpg from NASA SVS 5313's EIC movie.
# Usage: scripts/nightlights-extract-decade.sh /path/to/nightlights_flat_series_and_change_wZooms_13_EIC_2160p30_h265.mp4
# Needs ffmpeg (with HEVC decoding) and Node 24.
#
# The movie opens with NASA's annual night-light averages, one per year, each held for
# about 18 frames with the year printed in the middle of the map (see the label crops in
# LIMITATIONS.md). For each year we take the 5 frames centred on its hold, average them
# (to cancel video-compression noise; the map does not change within a hold), scale the
# 7680 × 2160 frame to the 1024 × 288 grid of the change map with area averaging, and
# save a high-quality JPEG. No other processing.
set -euo pipefail
movie="$1"
out="$(cd "$(dirname "$0")/.." && pwd)/public/nasa/svs5313/decade"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$out"

ffmpeg -v error -y -t 8 -i "$movie" -vf "scale=1024:288:flags=area" -pix_fmt rgb24 -f rawvideo "$work/seq.rgb"

WORK="$work" node --input-type=module -e '
import { readFileSync, writeFileSync } from "node:fs";
const W = 1024, H = 288, N = W * H * 3;
const seq = readFileSync(process.env.WORK + "/seq.rgb");
// Centre frame of each year hold (30 fps), read from the year label at x 3980–4155, y 1075–1140.
const CENTRE = { 2012: 6, 2013: 22, 2014: 39, 2015: 57, 2016: 76, 2017: 94, 2018: 112, 2019: 130, 2020: 148, 2021: 166, 2022: 184, 2023: 222 };
for (const [year, c] of Object.entries(CENTRE)) {
  const px = Buffer.alloc(N);
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (let k = -2; k <= 2; k++) s += seq[(c + k) * N + i];
    px[i] = Math.round(s / 5);
  }
  writeFileSync(`${process.env.WORK}/${year}.ppm`, Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), px]));
}
'

for year in $(seq 2012 2023); do
  ffmpeg -v error -y -i "$work/$year.ppm" -q:v 2 "$out/$year.jpg"
done
echo "Wrote $out/2012.jpg … 2023.jpg"
