# Earth FM 2.0 — local Electronic Explore milestone

Status: implemented locally on main, not committed, pushed, or deployed. BoboMimi authorized local audio analysis, implementation and reasonable testing on 2026-10-18. Competition eligibility discussions are deferred at the team's direction. Publication of family instrument recordings remains unapproved.

## User experience

Open `http://127.0.0.1:5173/#climate-spiral` after starting the existing local development command with `--host 127.0.0.1 --port 5173`. The new Climate Spiral panel appears before the preserved Earth FM 1.0 content.

Choose a year and month, or use the month slider with the keyboard. A valid selection displays the signed anomaly and auditions one 0.9-second Electronic data note. Hear this month repeats the audition; Stop note cancels it. Volume changes do not change the scientific event. Starting an existing player stops the new audition, and starting an audition stops existing climate/visual playback. Hiding the page stops an audition.

The first milestone is entirely data-only. It does not implement the guided Listen composition, traditional sample playback, or new exports. Sape & Gong is explicitly marked under review, with no synthetic sound described as an authentic traditional instrument.

## Scientific snapshot

- Provider: NASA GISS, GISTEMP v4 global Land-Ocean Temperature Index.
- Source: https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv
- Accessed: 2026-10-18; exact UTC time in the provenance JSON.
- SHA-256: `4c64eda288bce32b8d76926278f346ecea1e53506df8ee72a3d5accb0657c416`.
- 1,761 finite monthly estimates, January 1880–September 2026.
- October–December 2026 are missing, not zero, and remain silent. Missing month buttons are disabled; the calendar slider can inspect their labelled unavailable state.
- Units: decimal degrees Celsius; baseline: 1951–1980 for the corresponding month.
- Raw file: `public/data/sources/gistemp-global-monthly-2026-10-18.csv`.
- Provenance: `public/data/climate-spiral-provenance.json`.
- Generated compact year/month data: `src/data/climateSpiral.json`.

Regenerate offline with `node --import tsx scripts/build-climate-spiral.ts`. This verifies the pinned raw-file hash before producing the data module. Normal application builds do not download or refresh observations. Do not silently replace the pinned source or pretend a later source retrieval is this snapshot.

NASA citation: GISTEMP Team, 2026: GISS Surface Temperature Analysis (GISTEMP), version 4. NASA Goddard Institute for Space Studies. Accessed 2026-10-18. Lenssen et al. (2024), A GISTEMPv4 observational uncertainty ensemble, doi:10.1029/2023JD040179.

## Visual provenance and interpretation

NASA SVS 5190: https://svs.gsfc.nasa.gov/5190/

Exact downloaded English/Celsius image URL and byte hash are in the provenance JSON. The local image is `public/frames/climate-spiral-svs5190-2026-10-18.jpg`. It displays 2026; the source page lists an update on 2026-09-11. NASA's EIC gallery links the Climate Vital Signs Dashboard, which explicitly lists this production.

Credits: NASA's Scientific Visualization Studio; Mark SubbaRao and Ed Hawkins; see the source page for complete production credits. NASA media guidance and any asset-specific terms remain applicable; Earth FM does not imply NASA endorsement.

The later numeric snapshot and published visual are related GISTEMP v4 products. Exact numerical revision matching has not been verified. The overlaid ring marks a month label, not an exact point on a historical curve. The selected numeric year is displayed outside the original image. No temperatures are inferred from image pixels. An anomaly is not an absolute temperature, local temperature, forecast, or anomaly relative to a pre-industrial baseline. Uncertainty is not encoded in the note.

## Shared scientific mapping

`src/lib/climateMapping.ts` parses the source and compiles instrument-independent note/rest events. Scientific period, anomaly, band, target frequency and mapping/profile IDs are preserved before a renderer chooses its voice.

Five fixed bands:

| Anomaly, °C | Band | Electronic reference frequency |
| --- | --- | --- |
| −1.00 to <−0.50 | 1 | 261.625565 Hz |
| −0.50 to <0.00 | 2 | 293.664768 Hz |
| 0.00 to <+0.50 | 3 | 349.228231 Hz |
| +0.50 to <+1.00 | 4 | 391.995436 Hz |
| +1.00 to +1.50 | 5 | 440 Hz |

Bounds never rescale by year or selected range. Different anomalies in one band intentionally sound alike. Out-of-range values produce an explicit rest/error state instead of clipping into the highest/lowest note. Missing values are never converted to a midpoint note.

The Electronic profile is provisional reference tuning, not a measurement or approval of sape tuning. A future approved traditional bank must share one profile with the Electronic renderer; it must not introduce separate instrument-specific temperature mappings. The shared compiler supports 3–5 sorted pitches, with profile identifiers and equally spaced anomaly bands. Changing the number/tuning of pitches requires review, updating explanatory copy, and consistent use by both renderers.

## Audio engine and lifecycle

`src/lib/climateAudition.ts` uses native Web Audio. A fundamental carries the scientific pitch; a quiet octave harmonic changes timbre. There is no accompaniment, drone, prerecorded soundtrack, or randomization. It resumes the browser audio context from a user gesture, uses the audio clock, cancels stale resume requests, fades stops, disconnects voices, and disposes its context on unmount.

The existing annual player and Visual Radio remain in place. `src/App.tsx` coordinates ownership so they cannot continue under the new audition. No Vercel, Supabase, environment, package, or deployment configuration was changed.

## Local acceptance coverage

New unit checks verify every generated monthly value against the frozen CSV, data/visual hashes, coverage, known values, mapping boundaries and monotonicity, invalid profiles and malformed source handling, silence for missing/out-of-range data, scheduled frequencies, cancellation, pending-resume races, and disposal.

Five browser checks cover real AudioContext event scheduling and stop completion, numeric/visual selection, unavailable months, keyboard operation, legacy-player coordination, blocked-audio retry, image-failure recovery, mobile overflow and automated accessibility checks. The full existing regression suite is also run. These checks do not replace subjective music review or physical Safari/iPhone verification.

## Scope and release boundary

Family recording analysis derivatives and diagnostic excerpts are stored outside this repository. No instrument recordings or sample bank are served by the app. Publication, redistribution and asset licensing still require the appropriate rights-holder agreement.

Future work, only after the next explicit authorization: review private candidate excerpts with BoboMimi, approve/record a clean cultural bank and common tuning, then develop the guided Listen score. A production-triggering push remains a separate release decision. Do not push or deploy this local milestone without that approval.

## Verified results — 2026-10-18

- `npm run test`: **31 passed, 0 failed**, including seven new Climate Spiral data/mapping/audio checks.
- `npm run test:e2e`: **18 passed, 0 failed**, including five new Climate Explore browser checks and all thirteen existing regression checks.
- Automated accessibility checks in available and missing-data states: no tested WCAG A/AA violations.
- `npm run build`: passed TypeScript and Vite production compilation. This created a local build only; it did not deploy.
- `git diff --check`: passed.
- Manual image review: desktop and mobile screenshots inspected. Safari/iPhone hardware playback and subjective musical listening remain unverified.
- Final branch: `main`; changes remain uncommitted. No packages were installed, and no audio assets were added to `src` or `public`.

## Changed files

| File | Purpose |
| --- | --- |
| `src/App.tsx` | Add the scene/navigation and coordinate playback ownership. |
| `src/components/ClimateExplore.tsx` | Monthly scientific Explore interaction and provenance disclosure. |
| `src/components/ClimateExplore.css` | Responsive layout and visible focus styles. |
| `src/lib/climateMapping.ts` | Strict monthly CSV parser and shared note/rest event mapping. |
| `src/lib/climateAudition.ts` | Deterministic Electronic audition with cancellation/cleanup. |
| `src/data/climateSpiral.ts` | Typed access to the fixed monthly snapshot. |
| `src/data/climateSpiral.json` | Generated monthly values and metadata. |
| `scripts/build-climate-spiral.ts` | Offline, hash-verified regeneration. |
| `public/data/sources/gistemp-global-monthly-2026-10-18.csv` | Original pinned NASA data bytes. |
| `public/data/climate-spiral-provenance.json` | Data/visual retrieval, hashes, credits and limits. |
| `public/frames/climate-spiral-svs5190-2026-10-18.jpg` | Pinned NASA source overview. |
| `tests/climateSpiral.test.ts` | Data integrity, scientific mapping and audio lifecycle tests. |
| `tests/e2e.spec.ts` | Five browser acceptance scenarios alongside existing regressions. |
| `docs/CLIMATE_EXPLORE.md` | Implementation, usage, provenance, results and release boundaries. |
