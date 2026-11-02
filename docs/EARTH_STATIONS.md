# Earth FM — curated Earth Stations

## Plan and design review

The approved direction is a science listening platform: retain the five-page Studio, make animated visual sonification discoverable, and add one complete curated station. Work stays on main and the user has authorized publication through the existing Vercel production workflow. No human approval gate or participant recruitment is required for implementation.

Protect scientific credibility by retaining fixed data-to-pitch mappings, source bytes, clear geography/units, missing-data silence, and the distinction between pixels and measurements. Protect creative expression by reusing the sound engine and optional accompaniment. Protect accessibility through text/numeric alternatives, keyboard controls, reduced motion, explicit playback and clean audio disposal.

The new Arctic September station uses the existing reviewed NSIDC-derived September means, 1987–2022. Each mean requires 30 observed daily extents. This is a project-derived mean, not the official NSIDC monthly product, a daily annual minimum, thickness, volume or a global statistic. A fixed 3–8 million km² range maps ten 0.5 million km² intervals to the existing ten-pitch bank. Less extent selects a lower or equal note; missing/out-of-range values are silent. Equal notes in different stations do not mean equal physical quantities.

Listen keeps the original Climate Station as the default beginner route. A station directory lives within Listen, not a sixth page. Arctic September adds Listen → Inspect → Explain: a brief pair comparison and 25-second selected-year audition, exact observations, the full historical record, a reproducible CSV trace, and a personal explanation/check. The same station can be inspected in Explore Data and shaped in Create. The climate station gains an explicitly selected moving Earth visual using the existing attributed EIC animation, not a new invented scientific movie.

The review rejected adding a backend, general-purpose music editor, new data tracks beyond one station, or mandatory quizzes. External visitors can start from public station links and optionally download their own anonymous learning record. First and subsequent answers and whether evidence was revealed are retained. Automated fixtures are never represented as real learners. No claim of educational impact is made without actual participant evidence.

## Validation plan

Verify raw source/derived means, all mapping boundaries, fixed pitches across mixes, actual scheduled frequencies, deterministic exports, cancelled playback, video sampling while time advances, still-frame/reduced-motion behavior, source links, URL history, both languages, mobile layout, keyboard/accessibility, real first/retry records and deployed direct links. Inspect the rendered interfaces before release. After push, verify the exact production commit and repeat a focused public-site flow.

## Implementation and self-review findings

- `/listen?station=all` is the station directory; the existing `/listen` beginner route remains Climate Spiral. Arctic deep links use `?station=arctic` in Listen, Create and Explore Data. All stay inside the five existing pages and retain Back/Forward and direct refresh.
- Synthesis now has a reusable compiled-frequency boundary. Climate observations still use the unchanged compiler; ice uses its own physical-unit mapping. No sea-ice number is disguised as a temperature anomaly. The same synthesis serves live playback and WAV export, including pure data, five tones and three styles.
- Moving visuals are selected explicitly at `/listen?visual=motion`. Existing EIC video bytes and mirror attribution are reused. Each scheduled note stores the sampled frame time and strip data for a verifiable readout. The video shows its decoded frame, not an unrelated poster; scan position follows the contained image region.
- Review found and fixed a decoded-media readiness race and a mobile table focus issue. Native readiness listeners handle already-cached media; scrollable scientific tables are keyboard focusable.
- Sources distinguish project-derived September means from the official monthly NSIDC product. The exact original daily CSV, source manifest, DOI and all 36 values remain inspectable.
- Learning exports retain actual attempts and written reflections locally. They are not participant counts, automatic judgments of scientific prose or evidence of educational effectiveness.

No dependency, backend, additional page or new scientific source file was introduced. Original recordings and the preserved 1.0 application remain. Public release was explicitly authorized by the user.

## Completed local verification

`npm run check` passed: 40 unit tests, TypeScript/Vite build and 36 Chromium browser scenarios. New checks verify Arctic source alignment, every fixed-band boundary, missing/out-of-range rests, exact CSV precision, actual live oscillator targets, exported WAV duration, station URLs/history, first/retry records and evidence flags, advancing video/sample timestamps, still-frame and motion controls, bilingual mobile overflow and automated WCAG A/AA-related checks. Original regression cases and the complete approximately 49-second temperature A/B sequence remain passing. Desktop and Chinese mobile station screenshots were inspected.

Public review entry points:

- [Earth Stations](https://earth-fm.vercel.app/listen?station=all)
- [Arctic September](https://earth-fm.vercel.app/listen?station=arctic)
- [Live visual sound](https://earth-fm.vercel.app/listen?visual=motion)
- [Arctic source trace](https://earth-fm.vercel.app/data?station=arctic)
- [Arctic creative mix](https://earth-fm.vercel.app/create?station=arctic)

A deployment/browser check is software evidence. Real external visitors may now review the public experience and voluntarily share their own reflection files; no real-learner findings have been invented or inferred from automated test scores.
