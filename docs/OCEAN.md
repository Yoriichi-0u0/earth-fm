# Currents of Heat (NASA SVS 3912, ECCO2 sea surface currents and temperature)

Record 04 on the TerraJuke shelf. Code: [`src/lib/ocean/`](../src/lib/ocean/) and [`OceanDeck`](../src/components/OceanDeck.tsx). Tests: [`tests/ocean.test.ts`](../tests/ocean.test.ts) and [`tests/ocean.e2e.spec.ts`](../tests/ocean.e2e.spec.ts).

## The visualization

NASA Scientific Visualization Studio 3912, *Global Sea Surface Currents and Temperature* (Greg Shirah), a listed challenge resource. Surface currents from ECCO2 (MIT and NASA JPL: the MIT general circulation model synthesising satellite and in-situ ocean data, resolving eddies) are traced as fine lines and coloured by sea-surface temperature. NASA prints the colour scale: **Sea Surface Temp (°C), 0 to 32, linear**. TerraJuke uses frame 25000 of the global series: **19 June 2007, 12:00 UTC**.

Files and hashes: [`public/nasa/svs3912/svs3912.provenance.json`](../public/nasa/svs3912/svs3912.provenance.json). The map and globe show NASA's 2048 × 1024 JPEG. The analysis reads a 1024 × 512 PNG made once from that JPEG (decoded and resampled with macOS sips, with all colour metadata stripped), so browsers and tests read identical pixels.

## Reading temperature from colour

1. NASA's colour bar gradient spans columns 14–291 between black borders at 13 and 292, where the 0 and 32 ticks sit; the 10 and 20 ticks confirm a linear scale. Temperature at column x is (x − 13) / 279 × 32 °C.
2. Each trace pixel is matched to the nearest bar colour by **lightness-normalised OKLab chromaticity** (a/L, b/L), so a dim trace and a bright trace of the same colour read the same temperature. Dark background, grey land and ice (lightness under 0.22 or chroma under 0.05) and colours far from the bar read nothing.
3. Every colour on NASA's bar reads back as its own temperature within 1.2 °C (tested).

## How it sounds

- **Side A, pole to pole**: 48 bands from 80°N to 72°S. Each band's median temperature sets pitch on one fixed scale: sixteen 2 °C steps of D minor pentatonic from D3 (0 °C) upward. A soft shimmer above the note follows how much of the band NASA's current traces cover; stereo follows where the band's warmest tenth sits, and the globe turns there.
- **Side B, touch the ocean**: a 64 × 32 grid of 5.625° cells. Tap or use the arrow keys: each place plays its note and says, for example, "3°N, 149°E: 29.6 °C, tropical". Land and ice are silent.

## Is it sensible? (pinned by tests)

| Region | Median read | What the ocean is known to do |
|---|---|---|
| Western Pacific warm pool | 29.5 °C | The warmest open ocean on Earth |
| Eastern equatorial Pacific | 24.2 °C | The cooler "cold tongue", several degrees below the warm pool |
| Gulf Stream | 22.8 °C | A warm current, far warmer than the Labrador Sea beside it (2.8 °C) |
| Southern Ocean, 55–65°S | 3.0 °C | Near freezing |

Tests also check that the ocean warms from each pole toward the equator, that the warmest band lies within 20° of the equator, and that every band contains open-ocean traces. These are plausibility checks on a model frame, not a comparison with an independent data set.

## Limits

- ECCO2 is a model that assimilates observations; this is one moment (19 June 2007), not today's ocean.
- Temperatures come from rendered colour, so they are only as precise as the colour scale (about 1 °C).
- Traces show where currents flow, not how fast; trace coverage sets only the shimmer.
