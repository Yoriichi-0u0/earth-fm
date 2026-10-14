# Data, provenance, and scientific limits

Earth Information Jukebox uses four bundled observational time series. They work offline after the application loads, require no API key, and contain no simulated observations. The source mirrors were retrieved and checked on **2026-10-14**. That date describes this project's check, not the last update by NASA, NOAA, or NSIDC. These are deliberately versioned snapshots, not live feeds.

| Track | Scientific source | Included years | Coverage | Processing |
| --- | --- | --- | --- | --- |
| Global temperature | NASA GISS, GISTEMP v4 | 1880–2025 | Global land and ocean average | Select only `GISTEMP` rows from the mirror's combined annual CSV; retain its annual mean anomaly in °C. |
| Atmospheric CO₂ | NOAA Global Monitoring Laboratory | 1959–2025 | Mauna Loa atmospheric reference record, Hawaiʻi | Read the annual `Mean` column, in dry-air parts per million. |
| Sea level rise | NOAA satellite column, published in EPA's sea-level climate indicator | 1993–2023 | Global mean sea level | Use only `NOAA Adjusted Sea Level`; subtract its 1993 annual mean, multiply inches by exactly 25.4 to obtain mm, and round to 0.01 mm for storage. |
| Arctic sea ice | NSIDC Sea Ice Index, Version 3 | 1987–2022 | Northern Hemisphere sea ice extent | For each September, require all 30 distinct days with nonnegative extent and zero reported missing area; calculate the arithmetic mean and round to four decimals, in million km². |

Every track has at least 30 annual observations. The generation script validates finite values, unique years, and contiguous series. Calendar years after 2025 are excluded from the annual tracks to avoid including a partial 2026 record. The ice source snapshot ends in July 2023, so its last complete September is 2022.

## Retrieval origins

Direct NASA, NOAA, and NSIDC download endpoints were unavailable from the development environment. Rather than inventing replacement values, the application bundles explicitly attributed public mirrors. Git commit pins and SHA-256 content hashes make these choices reviewable and reproducible. The app links to the original scientific providers, while this document and the machine-readable manifest identify the actual retrieval origin.

1. **Temperature:** DataHub / `datasets/global-temp`, commit `44571fe8c15e228c156bb19308e5ccc1e31cf9f7`, [`data/annual.csv`](https://raw.githubusercontent.com/datasets/global-temp/44571fe8c15e228c156bb19308e5ccc1e31cf9f7/data/annual.csv).
   - Original provider: [NASA GISTEMP](https://data.giss.nasa.gov/gistemp/); source endpoint identified by the mirror: `https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv`.
   - The mirror computes an annual mean from the twelve monthly GISTEMP anomalies and rounds to four decimals. This can differ slightly from NASA's rounded published annual `J-D` column. We retain the mirror values and display two decimals; we do not claim to have downloaded the official annual column directly.
   - Anomalies use NASA's **1951–1980** reference period. They are not absolute temperature and are not anomalies relative to preindustrial conditions. The mirror also contains a different series labeled `GCAG`; it is excluded entirely.
   - NASA GISTEMP is a US government work. DataHub's package is licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Attribution: NASA GISS and DataHub / datasets/global-temp. Citation: GISTEMP Team, GISS Surface Temperature Analysis, version 4, NASA Goddard Institute for Space Studies; Lenssen et al. (2024), [doi:10.1029/2023JD040179](https://doi.org/10.1029/2023JD040179).

2. **CO₂:** DataHub / `datasets/co2-ppm`, commit `8c4097238570147adf6fa97ad357315528dac4c5`, [`data/co2-annmean-mlo.csv`](https://raw.githubusercontent.com/datasets/co2-ppm/8c4097238570147adf6fa97ad357315528dac4c5/data/co2-annmean-mlo.csv).
   - Original provider: [NOAA GML atmospheric carbon dioxide trends](https://gml.noaa.gov/ccgg/trends/data.html). The mirror's processing script identifies NOAA's `co2_annmean_mlo.txt` source.
   - We read the published annual mean without averaging, interpolation, or rebasing. `ppm` describes CO₂ mole fraction in dry air.
   - Mauna Loa is an atmospheric monitoring record, not a grid of measurements for arbitrary locations. NOAA may use supplementary measurements in portions of this reference series; the provider documents its observation procedures.
   - NOAA data are US government data; DataHub's additional packaging is under the Open Data Commons Public Domain Dedication and License. Attribution: NOAA Global Monitoring Laboratory and DataHub / datasets/co2-ppm.

3. **Sea level:** DataHub / `datasets/sea-level-rise`, commit `e75c7af397e8ef9cd93348fb608530eb764cc1ba`, [`data/epa-sea-level.csv`](https://raw.githubusercontent.com/datasets/sea-level-rise/e75c7af397e8ef9cd93348fb608530eb764cc1ba/data/epa-sea-level.csv).
   - Original indicator: [EPA, Climate Change Indicators: Sea Level](https://www.epa.gov/climate-indicators/climate-change-indicators-sea-level). The mirror identifies EPA, CSIRO, and NOAA as providers and states that the NOAA column is in inches.
   - We select the **NOAA satellite** column only. The historical CSIRO tide-gauge reconstruction and its error-bound columns are not used or spliced into the NOAA series.
   - Formula: `displayed_mm(year) = (NOAA_inches(year) - NOAA_inches(1993)) × 25.4`. This changes the reference point, not the measured change between years. Satellite altimetry covers the global ocean; it is not a prediction of flooding in the selected city.
   - The scientific data are attributed to NOAA / EPA. DataHub's package is under the Open Data Commons Public Domain Dedication and License.

4. **Sea ice:** `s4f-dortmund/open_data_notebooks`, commit `17a7f4af6c5c895663e62ccda6e76e9228e95ce3`, [`data/2023-07-25/N_seaice_extent_daily_v3.0.csv`](https://raw.githubusercontent.com/s4f-dortmund/open_data_notebooks/17a7f4af6c5c895663e62ccda6e76e9228e95ce3/data/2023-07-25/N_seaice_extent_daily_v3.0.csv).
   - The mirror README attributes the observations to NSIDC Sea Ice Index, Version 3. Its CSV header points to NSIDC-0051 and NSIDC-0081 passive-microwave source products.
   - Citation: Fetterer, F., K. Knowles, W. N. Meier, M. Savoie, and A. K. Windnagel. 2017, updated daily. *Sea Ice Index, Version 3.* Boulder, Colorado USA. NSIDC: National Snow and Ice Data Center. [doi:10.7265/N5K072F8](https://doi.org/10.7265/N5K072F8). Mirror attribution: Scientists for Future Dortmund / s4f-dortmund/open_data_notebooks.
   - The arithmetic mean of daily extents is a **project-derived September mean**, not the official NSIDC monthly extent product. Extent is the area of ocean with at least 15% ice concentration; it does not measure ice volume or thickness. Seasonal ice makes September a useful consistent comparison, but this track does not summarize the full year.
   - Observations before 1987 have alternate-day coverage in this snapshot. They are excluded, rather than interpolated into a complete month. All included Septembers have exactly 30 daily observations.
   - NSIDC permits use with attribution; the above citation is retained as required by the mirror. We distribute data, not NSIDC's figures.

## Geography and sound

Selecting a listening location is an interface perspective. It does **not** turn a global average, Mauna Loa observation, or Arctic observation into local measurements. Data coverage is stated on each track, and changing the location leaves the observations unchanged.

The audio is sonification generated in the browser, not a field recording or an independently observed climate variable. Higher values are mapped to higher notes within the selected observations' range. The chosen soundscape changes timbre. Musical left-to-right panning is presentation, not a scientific transformation. Sound settings and playback speed change the musical interpretation while numerical observations remain available on the chart and in exports. Equal pitches across different tracks do not imply equal physical magnitudes. Normalization is within each dataset, so the resulting pitches do not support scientific comparison between units.

Historical observations and their sonification are not forecasts. No causal attribution, local hazard prediction, or uncertainty estimate should be inferred from the audio. The app's temperature baseline, sea-level reference, CO₂ concentration, and sea-ice seasonal definition remain distinct.

## Reproduction and auditing

The original downloaded bytes are checked in under [`public/data/sources`](../public/data/sources). [`public/data/provenance.json`](../public/data/provenance.json) records each commit, download URL, SHA-256 hash, year range, observation count, and a digest of the processed track collection. [`public/data/observations.json`](../public/data/observations.json) provides the exact observations used in the app. [`src/data/earth.ts`](../src/data/earth.ts) is generated from those snapshots.

Run `node scripts/refresh-data.mjs` from the repository root to verify hashes and regenerate the typed data, JSON export, and provenance manifest offline. Run `node scripts/refresh-data.mjs --download` to restore the same pinned source snapshots over verified HTTPS and regenerate them; downloaded bytes must pass their recorded hashes before use. This command restores the audited version and does not silently update to a moving upstream branch.

To adopt new data, intentionally choose and review newer provider or mirror revisions, update their provenance pins and expected hashes, review complete-year coverage and source methods, and regenerate the artifacts. Keep this document's coverage and checked-on date synchronized. Do not add interpolated, fabricated, or partial-year values as replacements for missing observations.
