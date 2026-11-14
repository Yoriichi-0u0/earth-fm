# TerraJuke — submission draft for the five-page revision

Status: five-page and NASA observatory release, 2026-11-02. The user approved publishing this revision through the existing main-to-production workflow after local review. This is submission material, not evidence that the team has submitted it or that any user study has been completed.

**Project:** TerraJuke — Hear Earth’s changing climate.

**Challenge:** The Earth Information Jukebox, NASA Space Apps 2026.

**Team:** BoboMimi. Leader: Chia Yuen Kai (`Chia_0u0`). Member: Jacy Chiong Yet Suu (`jacychiongys`).

## One-sentence pitch

TerraJuke helps first-time learners explore one climate story through a NASA visual, live-generated sound and traceable measurements, then check what they understood.

## Problem, audience and contribution

Earth visualizations can be engaging but difficult for a first-time learner to interpret. Our initial audience is students and curious members of the public who are new to climate graphs and sonification. This is a design focus, not a claim that every learner benefits.

Our contribution is an explainable learning path that distinguishes two ways of listening: image patterns become sound through live pixel sampling; scientific anomalies become melody through a fixed published mapping. Users can hear the difference, inspect the source values and check common misconceptions. The sound is synthesized in the browser and is not a recording of Earth or an authentic traditional instrument.

## What the prototype does

1. **Hear a NASA visual.** The guided story begins with NASA SVS 5190, the Climate Spiral, identified in NASA's EIC-related Climate Vital Signs Dashboard. A 48-strip left-to-right scan turns visible brightness into pitch, RGB into timbre and position into stereo pan. Sound is generated during playback. Labels and backgrounds also affect the scan; this is explicitly not a physical thermometer.
2. **Hear real observations.** Twelve selected January GISTEMP v4 anomalies from 1880–2025 play on the same fixed ten-band pitch scale. The first comparison uses a warm synthesized tone with no accompaniment. Dates, values and target frequencies are synchronized; the chart uses actual year spacing. Equal note duration does not encode elapsed time or warming rate. The selection illustrates differences and is not the full record or proof of a trend by itself.
3. **Discover and optionally check understanding.** Four questions address period comparison, the distinction between image brightness and temperature, the role of data in pitch and the baseline. Feedback explains each answer. A user may download their own local practice record with first and later attempts preserved. This is not aggregate research evidence and is not uploaded to a backend.
4. **Explore and create.** Create offers five synthesized tones, three accompaniment styles, data-only listening and audio export. Explore Data has year/month selection, exact values, sequential year A/B, CSV traces and an optional 2D/3D spiral. About explains the mapping and sources. Advanced controls are collapsed. The preserved Original experience has multiple attributed visual assets, animation sampling and local image/video input.

Home offers one primary Start the experience action; Listen presents Look → Listen → Discover as separate steps. Create, Explore Data and About have independent page URLs. The reviewed Studio is the default local route. Original 1.0 is retained behind `?legacy=1`; old anchors and shared-mix parameters remain compatible. English is default, with persistent Simplified Chinese. Keyboard controls, reduced-motion defaults, motion control and mobile layouts are included. These features do not constitute accessibility certification or proof of suitability for all disabilities.

## Challenge alignment

The official summary calls for EIC visual frames paired with dynamic real-time sonification, with accessible, engaging, multisensory exploration. The guided NASA Climate Spiral scan directly demonstrates visual/sound pairing; the numeric sequence is a complementary scientific explanation rather than a replacement. Both stay within one climate story.

Detailed challenge requirements and the complete 2026 central judging guide have not been independently obtained. The prototype does not claim compliance with unknown scoring weights or requirements. EIC relationship, mirror provenance for older assets, snapshot revisions and source credits are documented.

## Proposed 90-second pitch and demo

- **0:00–0:10 — Purpose.** “A graph can show change. Can sound help a new learner notice and understand it? We are BoboMimi, and this is TerraJuke.” Open the canonical Studio homepage and start the guided story.
- **0:10–0:30 — Respond to the challenge.** Play the NASA Climate Spiral scan. “The browser creates this sound from the visible image in real time. Brightness becomes pitch. This is a visual pattern—not a temperature measurement.” Identify the NASA source.
- **0:30–0:58 — Explain the scientific difference.** Move to the twelve selected Januaries and play the data-only comparison. “Now the measurements set the notes. We keep the same month, tone and pitch scale across years.” Point to a date, original anomaly and frequency. Mention gaps and equal-duration notes.
- **0:58–1:12 — Demonstrate transparency.** Contrast 1880 January at −0.19°C/G3 with 2025 January at +1.37°C/A4. “Different values within a band can still share a note, so the exact numbers remain visible.”
- **1:12–1:23 — Learning and inclusion.** Show the understanding check, optional Chinese, and data-only controls. “We have a working prototype and a real-user test protocol. We have not yet established learning effectiveness.”
- **1:23–1:30 — Close.** “See it, hear it, then explain what changed. TerraJuke makes the mapping visible so the music can become a path into Earth science.”

This is a proposed demo length, not a verified 2026 video-length rule. The team should confirm its actual event's submission requirements before recording final materials.

## Evidence, sources and limits

- Repository: https://github.com/Yoriichi-0u0/TerraJuke-The-Earth-Information-Jukebox/tree/main
- Canonical public entry: https://terrajuke.vercel.app/
- Direct Studio alias: https://terrajuke.vercel.app/?studio=1
- Official challenge summary on the official site: https://www.spaceappschallenge.org/2026/find-a-team/proteas/
- NASA visual: https://svs.gsfc.nasa.gov/5190/
- EIC-related gallery: https://svs.gsfc.nasa.gov/gallery/climate-vital-signs-dashboard/
- NASA data: https://data.giss.nasa.gov/gistemp/
- [Science, sound and source records](EARTH_SYMPHONY_STUDIO.md)
- [Real-user pilot protocol and reporting limits](USER_TEST_PROTOCOL.md)

GISTEMP snapshot retrieved 2026-10-18 covers January 1880–September 2026. Baseline is 1951–1980 for each corresponding month. Global anomalies are not local weather or absolute temperatures. The original visual's exact data revision is not confirmed to match the snapshot, and no pixel-to-exact-value inference is made. Uncertainty is not encoded in sound.

Automated tests verify software behavior and source integrity. They do not establish learning gains, participant satisfaction or public impact. No participant findings, teacher endorsements, accessibility partnerships or user counts have been collected or invented. Human musical review, physical Safari/iPhone checks and actual novice-user testing remain necessary.
