# The Ice Year (NASA SVS 5046, Daily Arctic Sea Ice, 2024)

Record 06 on the TerraJuke shelf (since 15 November 2026; it replaces *Arctic September*, which played
project-derived NSIDC means). Code: [`src/lib/arcticIce/`](../src/lib/arcticIce/) and
[`IceDeck`](../src/components/IceDeck.tsx). Tests: [`tests/arcticIce.test.ts`](../tests/arcticIce.test.ts) and
[`tests/ice.e2e.spec.ts`](../tests/ice.e2e.spec.ts). Why this source: [DECISION-LOG.md](DECISION-LOG.md).

## The visualization

NASA Scientific Visualization Studio 5046, *Daily Arctic Sea Ice, By Year* (visualizer Trent L. Schindler), linked
from the Earth Information Center's daily visualizations. JAXA's GCOM-W1 "SHIZUKU" satellite carries AMSR2, a
microwave radiometer that sees through clouds and the polar night. NASA draws sea ice wherever the 10 km daily
concentration (a 3-day running minimum) is at least **15%**, the standard threshold for sea-ice extent; the ice
colour comes from AMSR2's 89 GHz brightness temperature, and the land from Blue Marble Next Generation.

TerraJuke uses the frames for the **15th of each month of 2024** (twelve 3840 × 2160 OpenEXR renders).
Files, archive captures and hashes: [`public/nasa/svs5046/svs5046.provenance.json`](../public/nasa/svs5046/svs5046.provenance.json).

## Measuring the ice NASA drew

1. **Colour.** The EXRs are linear light. `scripts/svs5046-prepare.sh` converts them to sRGB with macOS sips;
   open ocean then matches NASA's own `_print.jpg` within 2/255 (61,102,137 vs 63,103,138). The analysis reads a
   960 × 540 copy with colour chunks stripped (`validation/svs5046/`); the app shows 1600 × 900 WebPs.
2. **Geometry.** Every EXR stores the RenderMan camera that rendered it, identical in all twelve frames: the eye at
   world (0, 0, 185) looking at the origin, a 16:9 projection. `scripts/svs5046-calibrate.ts` fits the globe inside
   it: radius 99.94 units from NASA's alpha silhouette (overlap 99.84%), North Pole towards the camera, 0°E along +x.
   With that fit, Natural Earth coastlines agree with the land and ocean colours of the July frame on 98.3% of
   14,698 sampled pixels. Each pixel then has a latitude, longitude and ground area; the pixels north of 50°N add
   up to the true area of that cap within 1% (tested).
3. **Sea or land.** Natural Earth 1:110m land, plus any pixel that never shows open water in 2024 but shows
   vegetation or bare ground in some month (small islands the outline misses).
4. **Ice.** A sea pixel NASA drew bright and nearly neutral (every channel above 165, blue at most 70 above red).
   Only latitudes ≥ 50°N are read: closer to the globe's edge NASA paints a white atmospheric halo. In the read
   region the strict and looser colour thresholds agree within 0.5 million km², so the result does not hinge on it.

`scripts/svs5046-analyse.ts` writes [`src/data/arcticIce2024.json`](../src/data/arcticIce2024.json); a unit test
re-runs the analysis on the frames and requires the identical file.

## How it sounds

- **Side A, the year of ice.** Twelve notes, January to December. The ice area north of 50°N sets pitch on one
  fixed scale: sixteen 1-million-km² steps of C major pentatonic from C3, so less ice is a lower glass bell. A
  low-passed ocean wash under each note is as loud as the share of open water. The globe shows that month's frame.
- **Side B, touch the ice.** Tap the globe or use the arrow keys (2° of latitude by 6° of longitude per place).
  The place's twelve months play in turn: a bell in each month NASA drew it frozen (at least half its sea), only the
  ocean wash in open-water months. Farther north rings higher. The caption names the sea and the ice season, for
  example "Hudson Bay, 59°N 87°W: ice in 6 of 12 months, January to June".
- Tempo (48–120 BPM, one month per beat) is a musical choice; it never changes a note.

## Is it sensible? (pinned by tests)

| 15th of | Ice north of 50°N | Note |
|---|---|---|
| January | 12.7 million km² | |
| March | **13.6** (the peak) | NSIDC Sea Ice Index, an independent product, reported ≈ 15.0 million km² of extent that day |
| June | 9.9 | |
| September | **3.9** (the low) | NSIDC ≈ 4.3 |
| December | 10.6 | |

Tests require the peak in February–April and the low in August–October, steady melting from April to September and
freezing from September to December, a September/March ratio between 0.2 and 0.45, and plausible totals. They also
check places: the North Pole is frozen in all 12 months, Hudson Bay freezes in winter and is open in August and
September, the Atlantic-warmed Norwegian Sea never freezes, and the western Sea of Okhotsk freezes in March and is
open in August. TerraJuke reads less than NSIDC's extent because it covers only north of 50°N and counts ice area,
not whole grid cells.

## Limits

- This measures the **picture**: ice as NASA rendered it, not a replacement for JAXA's, NASA's or NSIDC's data.
- One day (the 15th) stands for each month; each day is a 3-day running minimum.
- North of 50°N only, so some southern ice is left out (parts of the Sea of Okhotsk, the Gulf of St. Lawrence).
- Land comes from a coarse 1:110m outline plus islands seen in the frames; narrow channels may be misread.
- The frames came from the Internet Archive's raw captures of NASA's URLs, because svs.gsfc.nasa.gov refused
  connections on 14 Nov 2026; re-check the EXR hashes against NASA when it is reachable.
