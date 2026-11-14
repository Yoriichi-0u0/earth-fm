# TerraJuke — Accessible listening and Pacific map comparison

This branch stacks on PR #12 at 796b82a. Climate Spiral A/B remains the flagship. The separate Pacific route explores matched render columns from SVS 5176. The original 5688 lab and its assets are pinned in PR #11.

## Accessible Climate Spiral

The player already exposes labelled Play and Stop controls and a pressed state on the two side buttons. The vinyl flip stays in place and keeps keyboard focus. The previous groove slider exposed its index and, on Side B, the year. Its detailed values were nearby in the document. A visitor also had to switch into Scratch for a single image-strip audition. Side B's Play started the full sequence.

Open **Read the grooves**, focus **Inspect sector (silent)**, and use the arrow keys or Home and End. The range value now includes the strip or January date, the brightness or anomaly, the mapped note and its frequency. Its accessible description gives the interpretation and Side B's 1951–1980 baseline. The adjacent **Hear selected strip** or **Hear selected January** button plays that position through the existing engine. The January audition uses data-only playback. Selection stops prior audio and stays silent. The main Play action still starts the existing full sequence. Changing sides stops the previous owner and keeps focus on the flip control.

Chart2Music informed the point-by-point value and note pairing. Accessible Groove Pizza informed the choice to keep reading and music separate. The slider supplies text for assistive technology and the button starts sound on demand. This design avoids layering synthesized speech over the note. The release evidence covers the Chromium accessibility tree, keyboard input and axe. VoiceOver, NVDA, perceived audio balance and first-time comprehension remain to be evaluated with listeners. Suggested task: find the player with the display hidden, inspect and audition one selection per side, and explain what caused each note. [Chart2Music](https://github.com/julianna-langston/chart2music) · [Accessible Groove Pizza](https://github.com/NYUMusEdLab/Accessible-Groove-Pizza)

## SVS 5176 source and spatial evidence

NASA identifies the sequence as Pacific-centered equirectangular SST anomaly imagery linked to JPL MUR SST v4.1. Credit NASA Scientific Visualization Studio and Kel Elkins, with the contributors listed in the catalog. The filenames and visible date stamps identify October 10 in 2025 and 2026. File retrieval was November 12, 2026 MYT. The full source and browser derivative hashes are in [the manifest](provenance.json). The live directory can change. [NASA SVS 5176](https://svs.gsfc.nasa.gov/5176/) · [JPL PO.DAAC product](https://podaac.jpl.nasa.gov/dataset/MUR-JPL-L4-GLOB-v4.1)

- The EXR headers have identical 4096 × 2048 data and display windows, channels, pixel aspect, screen window and camera transforms. At 1024 × 512, the unshifted pair shares 221,820 exact grayscale pixels. A one-pixel horizontal or vertical shift lowers that count to 125,561–146,388. Shared coastline shapes and geographic landmarks line up. This supports comparing the same render columns.
- Fitting the project's Natural Earth coastlines against image color edges supports a full-world orientation with the seam near Greenwich, the center near 180°, and latitude running approximately 90° N to 90° S. The strongest horizontal fits were 0 and −1 pixels at 1024 × 512. This is a landmark-based estimate from a render. The EXRs do not carry an authoritative CRS, bounding box or pixel-to-coordinate transform. The interface uses shared strip indices and approximate globe orientation. [Natural Earth](https://www.naturalearthdata.com/)
- NASA's legend spans −4 to +4 °C. Red and blue represent warmer and cooler surface water relative to a reference. The linked MUR product family documents a 2003–2014 day-of-year anomaly climatology. The exact climatology and granules behind these two rendered images remain unverified. The images include rendered land and dates. Quantitative temperature requires validated numeric data and metadata. [NOAA-hosted MUR v4.1 variable metadata](https://psl.noaa.gov/thredds/dodsC/Projects/ATOMIC/preliminary/data/jpl_mur_sst/20191215090000-JPL-L4_GHRSST-SSTfnd-MUR-GLOB-v02.0-fv04.1.nc.html)

## Browser experiment

Run `npm run dev -- --host 127.0.0.1` and open `/research/pacific-5176/`. Both stills use the same linear 4 × 4 average, sRGB transfer and lossless PNG encoding. FFmpeg decodes the EXRs as linear RGB with alpha. Every alpha sample is 1 and all RGB values are finite in [0, 1]. The conversion assumes linear sRGB primaries for the rendered RGB. The file headers have no chromaticity metadata. With fully opaque input there is no premultiplication or background compositing difference.

The shared slider selects one of 48 strips from the same analysis canvas geometry in each image. Both analyses take rows [171, 341) in the 512-pixel browser image and resample to 384 × 64, excluding the visible date stamps. This is the central latitude band of the render. Land and other rendered pixels within the band contribute. Brightness drives pitch through the existing mapping. Color shapes timbre and strip position shapes stereo. At the default strip 24, 79.1% and 78.0% brightness both map to A4 at 440 Hz. The notes fall in the same pitch band even though the images differ.

The optional **Paired 3D globes** use the existing Three.js and React Three Fiber dependencies. One demand-driven WebGL canvas draws both textures with unlit material. The strip changes both viewing angles and highlights the same band segment. The 2D images and browser scan own the inputs. The renderer loads on request, stops rendering when idle, and releases its textures on close. The comparison and audio remain available if WebGL fails. This standalone route is in English. The Climate Spiral changes retain English and Simplified Chinese.

The official Resources tab still showed the November 13 notice just after midnight MYT. The existing 10 p.m. check is scheduled. SVS 5176 remains independent NASA research until the official challenge inventory establishes a match. [Official Resources tab](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/?tab=resources)

## Reproduce

Save the EXRs from the manifest as `20251010.exr` and `20261010.exr` in `project-library/pacific-5176/`. The source files total approximately 43 MB and stay local.

```sh
python3 research/pacific-5176/derive.py project-library/pacific-5176
node research/pacific-5176/verify.mjs
npm run check
git diff --check
test ! -e dist/research
```

The conversion check verifies full source hashes, exact RGB bytes, derivative hashes and the alignment statistics. It used FFmpeg 9.0.2. The browser verification captures 2D, 3D and phone-sized screenshots and two strip WAVs. The WAVs use TerraJuke's offline ambient export of the same strip values. The live one-note audition uses the shorter scratch envelope, verified separately through oscillator events. This experiment has no production entry or bundle impact. Chromium software WebGL and emulation are the graphics evidence. Native Safari, physical phones and assistive-technology tests are pending.
