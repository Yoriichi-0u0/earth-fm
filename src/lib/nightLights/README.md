# Night Lights science (NASA SVS 5313, EIC Version)

Framework-free modules ported from the team's hackathon repository `Yoriichi-0u0/TerraJuke-SpaceApps-2026` at `4a1abc4` (written 14 Nov 2026). Methodology, limits and the SVS 5276 cross-check are documented there in `LIMITATIONS.md` and `README.md`, and summarised in this repository's [`docs/NIGHT-LIGHTS.md`](../../../docs/NIGHT-LIGHTS.md).

- `legend.ts`, `color.ts`: NASA's legend bar read from the image (OKLab).
- `layout.ts`, `layout-detect.ts`: frozen masks for the legend, insets, labels and wedges.
- `analyze.ts`: lit pixels, legend position, 32 × 9 cells, the four regions.
- `sonify.ts`: fixed change-map sound rules.
- `decade.ts`: NASA's 12 annual frames, brightness above the base map, octave-per-doubling melody.
- `describe.ts`: plain-language captions and summaries.
