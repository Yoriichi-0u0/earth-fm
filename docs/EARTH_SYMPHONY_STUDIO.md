# Earth Symphony Studio — science and implementation notes

Current five-page release (2026-11-02): the five-page redesign supersedes the original screen descriptions below. Open `/` → Start the experience → `/listen`; `/create` controls music, `/data` explains and compares values, `/about` contains methods and sources. The homepage globe now rotates slowly with pause/resume and motion preferences. See [five-page review](FIVE_PAGE_REDESIGN.md). The user approved publishing the five-page and NASA observatory revision through main after local review.

The following original beta milestone and dated updates are retained as implementation history.

Implemented 2026-11-01 in Yoriichi-0u0/TerraJuke-The-Earth-Information-Jukebox. The user explicitly approved committing and pushing this revision to main for production on 2026-11-01. Earlier no-push statements below record the local review milestones before that release approval. Original recordings and existing source snapshots were retained; environment and deployment settings were not changed.

## Open and listen

Run `npm run dev -- --host 127.0.0.1 --port 5173`, then open http://127.0.0.1:5173/?studio=1 . Production entry: https://terrajuke.vercel.app/?studio=1 . The default URL retains the previous application and now links to Symphony Studio 2.0 in its navigation; Studio is lazy-loaded only on its route. The Studio header links back to 1.0. No backend, framework, package or credentials were added.

Start with 2025, Warm Keys + Electronic Pulse, Play year. The 12-month sequence lasts 24.8 seconds at 60 BPM. Compare Electronic Pulse, Cinematic, and Hear Data Only. Export renders a fixed 24.8-second mono 44.1 kHz PCM WAV using the same engine, always at 60 BPM. Remix live playback follows the tempo control; export is deliberately fixed for comparable audition lengths. A/B plays twelve months of A then twelve of B on the same pitch scale and tempo (48.8 seconds).

## Science and sound contract

The pinned GISTEMP v4 global land–ocean snapshot is reused without changing source bytes. It contains January 1880–September 2026, relative to the 1951–1980 monthly average. Original CSV, hashes and NASA source links remain available. It is global, not local weather, and is not a pre-industrial baseline. Missing observations are rests. Historical estimates may be revised by NASA; the snapshot does not update automatically.

Studio's fixed pitch profile `symphony-ten-v1` uses MIDI 48,50,52,55,57,60,62,64,67,69 (C3 D3 E3 G3 A3 C4 D4 E4 G4 A4). Ten equal 0.25°C bands span −1 to +1.5°C; lower boundaries are included, upper boundaries excluded except +1.5 included in the final band. The five-note legacy profile is retained. The shared compiler now accepts 3–12 increasing pitches. No style, tempo, selection range or year rescales the mapping.

Ten pitches are a provisional midpoint within the requested 8–12: twice the previous resolution while keeping a consonant two-octave register. Eight would merge more anomalies; twelve could distinguish smaller changes but needs listening review. This is an engineering starting point, not evidence of a perceptual preference study. Recent individual years naturally use only a few of the global bands: no artificial pitch expansion is introduced to make them sound more varied.

Three layers:
- Data Melody: one fundamental for each valid month, compiled before sound rendering.
- Rhythm & Harmony: synthesized kick, seeded-noise snare and hats, repeating C-major chord progression and soft bass; decorative only.
- Sound Design: sine/triangle voices, adjustable low-pass filtering, feed-forward echo, master gain and compressor.

Hear Data Only uses the selected harmonic-only synthesized tone, one note per month, with no accompaniment, syncopated repeats or echo; its output is independent of style. All oscillator frequencies, start times and envelopes are deterministic. This does not claim bit-identical PCM across different browser DSP implementations. Space currently uses echo, not convolution reverb. Cinematic is a restrained synthesized treatment, not an orchestral sample library. No traditional recordings are imported or represented by the synthesized voices.

## Interaction and lifecycle

Journey provides a short whole-year introduction. All modes expose five melody tones independently of three accompaniment styles. Remix exposes drums, harmony, tempo, space, brightness and live volume. Lab exposes year/month, precise values, note/frequency, missing-data states and sequential A/B. Mode/selection/mix changes stop playback; replay is explicit. Volume changes smoothly during playback. A dedicated playback observation drives the display without overwriting Year A. The audio clock drives month updates. Stop fades the master before disconnecting nodes. Generations prevent pending resume from resurrecting canceled playback. Hiding the document stops sound; unmount closes the context.

## Climate Spiral

SVG projects actual 3D numeric coordinates: month angle, linear anomaly radius, linear year height. Rotation and tilt are user-controlled; 2D removes height. Reduced-motion starts in 2D. This avoids WebGL and new graphics dependencies. Geometry is memoized across month ticks. Discrete monthly samples are joined within each year without invented year-end/missing-data connections. White is selected year, cyan is exact selected data coordinate, the static background halo is decorative. No audio-reactive deformation alters data.

NASA SVS visual inspiration is credited separately from this TerraJuke numeric rendering. It is not a pixel-matched NASA reproduction. SVG does not provide perspective/occlusion or ray-cast picking. Selection is through accessible month and year controls. Mobile layouts stack the figure and controls; curve labels are small on phones.

## Files changed in this revision

- src/main.tsx: opt-in lazy Studio entry; default legacy app retained.
- src/components/SymphonyStudio.tsx and .css: three modes, geometry, sources, accessible controls, responsive design.
- src/lib/symphony.ts: three-layer synthesis, transport, offline renderer and WAV encoding.
- src/lib/climateMapping.ts: extend allowed profile size without altering five-note legacy defaults.
- tests/symphony.test.ts: fixed ten-band boundaries, year independence, rest semantics.
- tests/e2e.spec.ts: add Studio integration and complete sequential A/B scenarios; prior tests retained.

## Verification and acceptance limits

Build and 32 unit tests passed. All 18 pre-existing browser regression tests passed. Both new Studio browser tests passed (including the full 50-second A/B scenario); no automated WCAG A/AA violations were reported. New browser checks exercise month sync, mode cancellation, scientific pitch readout invariance, data-only control isolation, missing observations, mobile overflow, automated accessibility and full A/B completion. Auditions rendered in Chromium: peak amplitude 0.134–0.181 at default volume, nonzero RMS, no full-scale clipping. Desktop/mobile screenshots inspected. The source data/visual hash checks remain in the unit suite.

Still requires human review: musical quality, preference for 8/10/12 pitches, speaker/headphone balance, physical iPhone/Safari playback and touch usability. Journey narration/chapter progression, richer non-pitched percussion, actual reverb, equal-loudness matching, direct curve picking and more mature cinematic arrangement remain future refinement. This is the requested sound-first review milestone with an integrated visual prototype, not a release-ready production replacement. No deployment is authorized.


## Warm-tone and rhythm revision — 2026-11-01

User approved five selectable synthesized melody tones: Warm Keys, Velvet Pad, Soft Pluck, Mellow Reed and Soft Glass. Default is Warm Keys + Electronic Pulse. Each tone uses only integer harmonics of the exact mapped frequency, with a dominant fundamental and gentle attack. There is no detuning or pitch rescaling. Harmonic weights are normalized by their sum; envelopes intentionally differ. This does not establish equal perceived loudness.

All three styles now include a four-pulse kick/snare/hat pattern per month, with deterministic offbeats. Style scales percussion strength. Melody adds two quieter syncopated articulations at the same mapped pitch. A repeating C / Am / F / G accompaniment and bass provide movement without claiming to encode observations. Missing months remain fully silent. Hear Data Only retains the selected tone but suppresses repeats, drums, harmony, bass and echo.

Eight new 24.8-second WAVs were rendered: five tones over Electronic Pulse, Warm Keys over Ambient/Cinematic, and Warm Keys data-only. Peaks at default volume were 0.178–0.240, nonzero RMS, no full-scale clipping. A new browser test covers all 5 tones × 3 styles × 2 data-only states, exact initial scientific fundamental, nonzero output and headroom, and data-only style invariance within 0.00001 PCM amplitude tolerance. Browser DSP can differ by tiny floating-point amounts between otherwise identical contexts, so bit-identical PCM is not asserted.

No packages, recordings, backend or release settings were added. All modifications remain local. Subjective warmth, groove and balance still require listening review; actual instrument authenticity is not claimed.

Final revision validation: production build passed; 32 unit tests passed; full 21-test browser suite passed in 56.3 seconds, including existing regressions, accessibility, full A/B playback and the new 30-render tone/style isolation check. `git diff --check` passed.

## Data-to-sound explanation and audit guide

Added an always-visible explanation section, linked from the current note readout. It shows the currently selected/audible observation → actual mapping band → note and target fundamental, with interval boundaries generated from the same fixed range and profile length. A complete ten-band table and twelve-month trace are expandable, and the trace downloads as CSV including original anomaly, baseline, band, note, unrounded fundamental, mapping/profile IDs and missing/out-of-range status.

Two frozen real observations (1880-01 −0.19°C → G3 ~196Hz, 2025-01 +1.37°C → A4 440Hz) can be auditioned separately or together. Guide auditions explicitly enable data-only without changing the chosen timbre. Text distinguishes data melody from decorative rhythm/chords/bass, repeated articulations and harmonic tone colour. It explains quantization: +1.10 and +1.20°C share G4, while +1.25°C enters A4. Anomaly baseline, global scope, missing values, snapshot coverage, uncertainty limits and NASA/source links remain explicit.

New browser acceptance test independently checks known mapped values against actual oscillator frequencies, verifies automatic data-only, table sizes, missing month silence and CSV contents, automated accessibility and mobile overflow. All three targeted Studio/guide browser checks passed (4.4 seconds). Existing audio synthesis and NASA snapshot bytes were not changed by this revision.

## English default + Simplified Chinese language pilot

Added a persistent manual English / 简体中文 selector to Studio. Fresh sessions default to English regardless of browser language. Existing bilingual inline copy was split into separate English and Chinese messages. The Chinese locale covers controls, modes, timbres/styles, month names, playback/error/export statuses, data-to-sound explanations, table headings, source explanations and accessible labels. TerraJuke/Earth Symphony Studio branding, NASA proper names, scientific units, note names, original scholarly citation, data identifiers and export formats remain stable.

A small React context and a local Chinese message dictionary are used, with no new dependency or backend. Language choice persists in localStorage when available, falls back to English for invalid preferences, and still works if storage is blocked. The document and Studio region language are updated to en or zh-Hans; the original NASA citation remains marked English. Switching language preserves year, month, timbre and mix and does not restart or stop active audio. The existing 1.0 route remains in English.

Two new browser checks cover clean English copy, Chinese controls/science explanations, preserved numerical/pitch state and settings, switching during active playback, reload persistence, missing-data states, invariant CSV output, Chinese automated accessibility, mobile overflow and blocked-storage fallback. Desktop/mobile screenshots were rendered and inspected in both languages. This is a Simplified Chinese pilot, not a Traditional Chinese locale or automatic browser-language detector.

Language pilot final verification: production build, 32 unit tests, all 24 browser tests (56.4 seconds), and git diff --check passed. No push or deployment.

## Production release preparation

The existing main → Vercel production workflow is retained. Studio displays STUDIO BETA instead of LOCAL PROTOTYPE; the 1.0 homepage navigation links to Studio. Only app source, fixed NASA assets/provenance, tests, build script and documentation are included. Local work/, audition WAVs, browser traces, credentials, .vercel/ and .env files are excluded.
