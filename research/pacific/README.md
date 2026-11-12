# Pacific Listening Lab

**11 November 2026, Asia/Kuching.** Local research on [draft PR #11](https://github.com/Yoriichi-0u0/earth-fm/pull/11), stacked on [NASA resource discovery PR #10](https://github.com/Yoriichi-0u0/earth-fm/pull/10) at `9b547805` and application research PR #9 at `a99cb1d`.

Start the existing Vite development server from the repository root, then open the lab.

```sh
npm run dev -- --host 127.0.0.1 --port 5182 --strictPort
```

[Open the local Pacific Listening Lab](http://127.0.0.1:5182/research/pacific/)

The two dated globes share one strip marker. **Hear 2025** and **Hear 2026** audition that strip in one action each and select the year for the next full scan. This removes the separate radio-selection step when comparing notes. The slider stays silent, and switching years keeps the same relative position. Stop and source switching cancel the previous audio. The original image and legend open below the comparison. Earth FM’s existing appearance and language controls also work in this 2D lab. Its separate entry lives outside the application’s normal navigation and production build.

## What the comparison measures

Both NASA globes show seven-day sea-surface temperature anomalies. The frozen still displays November 9 in 2025 and 2026. The exact climatology and dataset granules used for the render remain unverified. Image credit goes to NASA’s Scientific Visualization Studio and Kel Elkins (Science and Technology Corporation). The data comes from NASA JPL MUR SST. [NASA SVS 5688](https://svs.gsfc.nasa.gov/5688/)

The two globes have different sizes in the original JPEG. The `svs5688-globe-circles-v1` derivatives use bounding squares around the rendered disks and apply the same inscribed-circle rule to both. Origins are zero-based pixel coordinates from the upper left.

| Displayed date | Source square | Derivative |
| --- | --- | --- |
| 2025-11-09 | x=93, y=113, 609 × 609 | [2025 circular panel](assets/svs5688-2025-circle-v1.png) |
| 2026-11-09 | x=774, y=36, 762 × 762 | [2026 circular panel](assets/svs5688-2026-circle-v1.png) |

The generator copies the decoded RGB pixels inside each circle and sets the rest to opaque black. The original JPEG is byte-identical to the prior frozen snapshot. The [provenance manifest](provenance.json) contains the URL, retrieval time, source and derivative SHA-256 hashes, and decoded RGB hashes. [Full original and legend](assets/svs5688-original.jpg)

The existing `useVisualTransport` samples each square at 384 × 384 into 48 strips. Absolute luma selects pitch, RGB shapes the harmonics and horizontal position sets pan. Single strips use the existing short audition voice. Complete scans retain the existing ambient arrangement at 120 BPM. The same relative strip may cross different geographical pixels, land and black corners. A higher note identifies a brighter average in the rendered strip. It provides no SST measurement.

At the default **strip 24**, 2025 is **78.1% luma → A4 (440 Hz)** and 2026 is **64.3% → F4 (349.23 Hz)**. The lower note in 2026 accompanies a visually prominent warm-colored band. This makes the difference between pixel brightness and physical anomaly tangible. Across all strips the two scans use eight and seven distinct pitches respectively. Individual listening preference and comprehension still need human review.

## Animation study

The first extraction from the source movie’s last five seconds held the final November 10 labels. The moving candidate uses **source media seconds 10–15**, with rendered date labels **October 6, 12 and 18** in both years at sampled clip times 0, 2.5 and 4.9 seconds. These are labels read from the displayed frames. Media time does not identify a source granule or establish the observation cadence.

The five-second derivative is 768 × 384, H.264/yuv420p, 12 fps, 60 decoded frames and 400,357 bytes. SHA-256 is `42002e9c380f9e550fcb5e2169dfa441997849e9558db918641c1ec9212c2356`. Its parent is SVS media 1206159 with HTTP ETag `"469effd-66000c7fbf43c"` and Last-Modified November 11, 2026 at 14:12:11 UTC. The prior movie ETag failed the conditional request. FFmpeg sought into the current asset over HTTPS and produced the smaller derivative from the relevant range. The whole high-resolution source movie was not downloaded or fully decoded. [NASA source MP4](https://svs.gsfc.nasa.gov/vis/a000000/a005600/a005688/elnino_eic_ssta_globes_3340x1670_latest.mp4)

FFmpeg decoded the full derivative. Earth FM’s existing local video upload played it in Chromium’s iPhone 13 viewport with 60 total and zero dropped frames in the measured run. The live spectrum changed and Pause stopped the image and sound. Ready took about 439 ms locally. Two changing images and a moving strip make it harder to isolate why a note changed. The still comparison is the clearest first experience. Keep this clip as a separate motion study with dated captions.

## Official resources

The [official challenge Resources tab](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/?tab=resources) returned HTTP 200 on November 11 and 12. Both responses showed the November 13 notice and zero resource links in `resourcesTabContent`. The existing November 13 check is scheduled for 10:00 p.m. Asia/Kuching. NASA identifies SVS 5688 as EIC-related public material. Challenge inclusion remains unconfirmed. [NASA SVS 5688](https://svs.gsfc.nasa.gov/5688/)

When the list appears, record every published title, URL and explicit requirement. Follow any collection links to the supplied frames or datasets, then match their identifiers and versions to the [existing Earth FM source inventory](../../docs/NASA-RESOURCE-DISCOVERY-2026-11.md). Keep the asset’s published credit, terms and render date with the exact bytes selected for the lab. Verify whether a listed collection actually contains 5688 before treating it as an official match. Record an official replacement or newer version separately from the frozen image.

Retain the Pacific Lab as research. The dated SVS 5688 still remains the strongest public candidate for a future Pacific station because its two panels support a repeatable listening comparison with the existing engine. Prefer the still for a first integration if the supplied resources support this use. Keep the original legend and pixel interpretation visible. Check source-specific credits and derivative terms before adding an official asset. [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)

## Verification and evidence

```sh
python3 research/pacific/derive-panels.py
npx tsc --noEmit --strict --moduleResolution Bundler --module ESNext --target ES2022 --jsx react-jsx --skipLibCheck --types vite/client,node --allowImportingTsExtensions research/pacific/main.tsx
node research/pacific/verify.mjs --motion
npm run check
git diff --check
git diff --exit-code a99cb1d -- src public index.html package.json package-lock.json vercel.json supabase
test ! -e dist/research
```

Place the review clip at `project-library/pacific-listening-lab/evidence/svs5688-motion-10s-15s-v1.mp4` for `--motion`. Omit that option to run the still checks alone. The script starts Vite on a free loopback port and closes it after testing. It writes screenshots, raw strip values, oscillator timings and stereo WAV exports to the evidence folder. Set `PACIFIC_EVIDENCE_DIR` to keep a new run separate and place the clip in that directory for the motion check.

- Chromium 156 verified silent keyboard inspection, direct year auditions, a complete 48-note 2026 scan, Stop and cancellation on year switch. A direct audition interrupts a running scan and keeps its current strip. Live oscillator frequencies and timing matched the fixed mapping.
- At the 390 × 664 iPhone 13 emulated viewport, the measured pixel values matched desktop exactly. Light and Simplified Chinese rendered without horizontal overflow. Both captured themes passed the automated axe WCAG A/AA rules used in the script. Median local canvas sampling was 0.8–0.9 ms for the square panels. The estimated single RGBA buffers are 1.42 and 2.22 MiB before analysis and browser overhead. These results are desktop Chromium and emulation evidence. Physical mobile playback, GPU memory, battery and human listening remain untested.
- `npm run check` passed 64 unit tests, the production build and 112 Chromium tests. The lab type check, source hash checks and production tree diff passed. The generated production output excludes the research entry.
- The [showcase publication checklist](../../docs/SHOWCASE.md#publication-checklist) records source attribution and generated-content disclosures. Both finished masters match their prior verified SHA-256 hashes.
