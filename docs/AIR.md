# The Air We Share (NASA SVS 5669, GEOS Aerosols)

Record 03 on the TerraJuke shelf. Code: [`src/lib/air/`](../src/lib/air/) (framework-free science), [`AirDeck`](../src/components/AirDeck.tsx), [`AirMixer`](../src/components/AirMixer.tsx), [`AirTurntable`](../src/components/AirTurntable.tsx) and [`AirGlobeScene`](../src/components/AirGlobeScene.tsx). Tests: [`tests/air.test.ts`](../tests/air.test.ts) and [`tests/air.e2e.spec.ts`](../tests/air.e2e.spec.ts).

## The visualization

NASA Scientific Visualization Studio 5669, *GEOS Aerosols (2025)*: one moment, 19 August 2025 at 20:00 UTC, from NASA's Goddard Earth Observing System. GEOS assimilates satellite observations, in-situ measurements and about a million weather observations per hour. NASA colours four aerosol types and describes six events in the frame: Hurricane Erin, the Saharan dust journey, Kilauea's and Etna's sulfate plumes, southern African fire smoke and wildfires in Spain. It is listed in the challenge Resources, where NASA calls it "excellently suited for multi-track experimentation".

Credits: NASA's Global Modeling and Assimilation Office and Scientific Visualization Studio. Visualizers Joseph V. Ardizzone and Helen-Nicole Kostis; scientist Lesley Ott. Dataset: GEOS-FP 2 km replay. DOI 10.5281/zenodo.21893141.

The analysed 1920 × 1080 PNG and NASA's colour bar are pinned in [`public/nasa/svs5669/`](../public/nasa/svs5669/svs5669.provenance.json) with SHA-256 hashes. `svs.gsfc.nasa.gov` timed out from the development network on 14 Nov 2026, so both files came from the Internet Archive's raw captures of NASA's original URLs; re-verify the hashes against NASA when reachable. The globe texture and shelf poster are display-only resamples.

## How sight becomes sound

1. **NASA's own legend.** The four swatches are read from NASA's colour-bar image: black carbon (210, 94, 69), dust (193, 154, 220), sea salt (133, 170, 169) and sulfate (83, 220, 52).
2. **Each pixel** (every other pixel in each direction: 960 × 540 samples) takes the swatch with the nearest OKLab hue, within 40°. Strength is the pixel's projection onto that swatch in linear RGB, from 0 to 1. Pixels with low chroma (grey land, ice, Antarctica) or strength below 0.06 count as clear air.
3. **Earth is the record.** The map is cut into 64 slices of longitude, 5.625° each, played west to east. In each slice and for each aerosol:
   - `amount` = mean strength over the slice (clear air counts as zero) → **loudness**, on one fixed scale (full at 0.30). Below 0.004 the track rests, so rhythm comes from where aerosols are.
   - latitude of the aerosol's strongest 15° band → **pitch** within the instrument's range, north higher, on one shared D minor pentatonic scale so the tracks always harmonise.
   - longitude → **time** and **stereo position**.
4. **Four instruments.** Black carbon: smoky brass (filtered sawtooth). Dust: desert strings (detuned triangles). Sea salt: ocean bed (slow sine pair). Sulfate: glass bells (sine with bell partials).
5. **Side B: NASA's six stories.** Each story is a longitude/latitude window played as eight slices, with NASA's description read out.

Tempo, Mute and Solo are the listener's musical choices. They never change a note.

## What the tests check

- The legend colours and hues read from NASA's colour bar.
- Coverage of the pinned still: sulfate 16.4%, sea salt 6.65%, dust 3.08%, black carbon 1.10% of samples; the browser's own analysis matches.
- **Each of NASA's six stories is dominated by the aerosol NASA names, at least twice the runner-up.** Grey land and Antarctica stay near silent.
- Salt over two oceans is placed where most of it is, not averaged into the tropics.
- Every slice sounds; over Africa all four tracks play at once; the score is deterministic.
- Pitches stay in D minor pentatonic and rise with latitude; loudness and pan follow fixed rules.
- In the browser: both sides, the keyboard map, Mute and Solo, the record journey, and an automated accessibility scan.

## Accessibility

The map is a keyboard instrument: ←/→ hear one slice at a time with a spoken description such as "8°E: light dust near 20°N; faint black carbon (smoke) near 5°S", Home/End jump to the edges, Enter plays from the selected slice, Escape stops. Every step updates the caption, the mixer meters, the globe and the needle together. Android browsers can vibrate a pattern for the loudest aerosol. Without WebGL, or when the visitor prefers it, a 2D globe shows the same longitude. Under reduced motion nothing glides or pulses.

## Limits

- GEOS is a model analysis, not a direct measurement.
- NASA's colour bar has no numeric scale, so loudness follows rendered colour strength, never aerosol optical depth or concentration.
- One moment (19 Aug 2025, 20:00 UTC), not a live feed.
- Shares are of map pixels on an equirectangular map, not of area; polar regions are stretched.
- Where aerosols overlap, the rendered colour is a blend; each pixel is assigned to its nearest hue.
