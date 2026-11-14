# Night Lights record (NASA SVS 5313, EIC Version)

Record 02 on the TerraJuke shelf. The science modules in [`src/lib/nightLights/`](../src/lib/nightLights/README.md) were ported from the team's hackathon repository `Yoriichi-0u0/TerraJuke-SpaceApps-2026` at `4a1abc4` (written 14 November 2026). That repository's `LIMITATIONS.md` holds the full pixel rules and every frozen mask rectangle; this page summarises them.

## The visualization

NASA Scientific Visualization Studio 5313, *Change in Night Lights between 2012 and 2023 – EIC Version* (Black Marble, Suomi NPP VIIRS; visualizer Kel Elkins). Purple means more light, orange less light and white little change. The pinned 1024 × 288 image, `public/nasa/svs5313/svs5313_eic_02599_print.jpg`, was downloaded from NASA's original URL and checked byte for byte against an Internet Archive capture. Its provenance and credits are in [`svs5313.provenance.json`](../public/nasa/svs5313/svs5313.provenance.json).

The EIC movie opens with NASA's annual night-light averages for 2012–2023. Each of the twelve frames in `public/nasa/svs5313/decade/` is the average of the five movie frames at the centre of that year's hold, scaled to the change map's grid. [`decade/provenance.json`](../public/nasa/svs5313/decade/provenance.json) records the source movie's hash and frame numbers, and [`scripts/nightlights-extract-decade.sh`](../scripts/nightlights-extract-decade.sh) reproduces them.

## Two sides

- **Side A, the change map.** The browser reads NASA's own legend bar into a scale from −1 (orange) through 0 (white) to +1 (purple). It masks the legend, the four magnified insets, their labels, box outlines and connector wedges. Each remaining lit pixel takes the legend position of its colour, and a 32 × 9 grid of cells summarises them. A rising pair of notes means more light, a falling pair less light and a single tone steady. Pitch follows position on the legend, loudness and one to four pulses follow the lit-pixel share, and pan runs west to east.
- **Side B, hear the decade.** A place's light is its brightness above the dark base map: every pixel's luma above its 7 × 7 median, summed, with NASA's printed year masked and no lit threshold. One note plays per year. Each place starts on A3, and every doubling of its brightness is one octave up. The decade ends on NASA's change-map figure for the same place, as NASA's movie does. Tempo and beats per bar are adjustable.

Each selection fires one feedback event that drives, at the same moment, the sound, a ring on the map (a still outline under reduced motion), a visible caption, optional screen-reader text and optional vibration on supported Android browsers.

**Mystery Place** ([`mysteryPlace.ts`](../src/lib/nightLights/mysteryPlace.ts)) plays one place's decade without naming it, asks the listener to guess, then reveals it on NASA's map. It draws only from places large enough for a reliable reading and lit in 2012: the whole map, India and Western Europe.

## Validation

- **Independent NASA check.** NASA SVS 5276 publishes the same annual averages as separate 12-frame series. [`scripts/nightlights-crosscheck-5276.ts`](../scripts/nightlights-crosscheck-5276.ts) applies the same measure to them and writes [`validation/svs5276-crosscheck.json`](../validation/svs5276-crosscheck.json) with source hashes. Year by year, the EIC-derived decade tracks it with r = 0.999 for the world and r = 0.96 for India. The 2023 ÷ 2012 ratio is 1.24 against NASA's 1.18 for the world, and 1.83 for TerraJuke's India box against 1.51 for NASA's wider South Asia view. Ukraine's view gives r = 0.41 against TerraJuke's small Ukraine box, so there is no reliable comparison.
- **Why no threshold.** An earlier hackathon version counted only pixels above a brightness threshold. At this coarse scale, dim lights cross the threshold as they brighten, which inflated India's growth. The threshold-free measure agrees with the independent series.
- **Unit tests.** `tests/nightLights.*.test.ts` re-detect the masks on the pinned file, check the legend, regions and sound rules, and pin the decade ratios and the cross-check.

## Limits

- TerraJuke reads **rendered colours and brightness**, not radiance. It never reports an exact amount of light, and NASA's display rendering need not be linear.
- It does not measure or infer urbanization, population, economic activity, energy use or any cause of change.
- "Lit share" is a share of map pixels. The map is equirectangular, so it is not a share of ground area.
- The wide EIC layout repeats some longitudes, so some places appear twice.
- Ukraine's box (280 map pixels) and the Eastern Mediterranean's (308) are too small for a reliable decade reading. The app flags them as weak readings, and both read brighter while the change map shows less light. Western Europe dims by about 10%, right at the threshold.
- NASA's two renderings do not always agree. The record's region table marks each place's decade trend as agreeing or differing with the change map. Cell by cell, the unit tests pin the comparison: of 24 comparable cells, 13 agree on direction, 7 differ only between "little change" and a direction, and 4 point in opposite directions.
- Colours come from a JPEG, so compression noise shifts some pixels slightly.
