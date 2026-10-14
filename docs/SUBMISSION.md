# BoboMimi submission materials

**Project:** Earth FM — Our planet. One soundtrack.

**Challenge:** The Earth Information Jukebox, NASA Space Apps 2026.

**Team:** BoboMimi. Leader: Chia Yuen Kai (`Chia_0u0`). Member: Jacy Chiong Yet Suu (`jacychiongys`).

## One-sentence pitch

Earth FM lets you listen to NASA Earth Information Center visuals through real-time pixel sonification, then explore the measured climate stories behind our changing planet.

## Project summary

Earth science deserves more than a glance. Earth FM turns the planet’s visual signals into an instrument you can play: choose an EIC-related frame, press play, and watch a scan line move as the browser turns brightness into pitch, color into timbre, and horizontal position into stereo sound. An immersive Earth animation is sampled again for each note, making its soundtrack respond to the frame currently on screen. You can also bring your own EIC image or video without uploading it to a server.

For scientific context, four separate recordings translate attributed NASA, NOAA, and NSIDC observations into music: global temperature anomalies, atmospheric CO₂ at Mauna Loa, global satellite sea level, and September Arctic sea ice extent. Each annual note follows a visible chart and retains its original measurement. Select an era, choose a soundscape, save favorites, share a mix, or export a WAV.

Earth FM’s interface supports keyboard navigation, descriptive visual alternatives, numeric readings, a still-frame animation option, and mobile screens. Bundled assets and fonts allow the core experience to run without API credentials or ongoing external data requests. The project documents exactly where its sources came from and distinguishes a picture’s color from a physical measurement.

## How this addresses the supplied challenge

| Challenge goal | Implemented behavior |
| --- | --- |
| Pair EIC visual frames and sound | Three attributed earth.gov mirror assets, including an EIC immersive animation, appear alongside their generated sound and scan position. Local EIC frame/video input is supported. |
| Generate dynamic sonification in real time | Web Audio synthesizes notes near their playback time from newly sampled pixels; animation input is sampled at each note. No soundtrack file is streamed or played. |
| Make visual Earth science multi-sensory | Brightness, color, and scan position map to pitch, tone, and spatial sound; a visible scan, chart, numerical readouts, and explanatory text provide complementary channels. |
| Make access engaging and inclusive | Keyboard controls, labeled controls, modal focus handling, reduced-motion behavior, device-local processing, no required account, and responsive layouts. |

This mapping covers the summary supplied by the team. It does not claim validation against unavailable full judging criteria or formal accessibility certification.

## 90-second demo script

1. **0:00–0:10 — Hook.** “What if we could hear our changing planet? We’re BoboMimi, and this is Earth FM.” Show the globe and press **Listen to the Earth**.
2. **0:10–0:30 — Visual radio.** Explain the scanning line. “Every strip becomes a note. Brightness changes pitch, color shapes its harmonics, and the sound travels from left to right.” Select **Untethered**, enable **Follow the animation** if needed, and show the spectrum changing as the Earth moves.
3. **0:30–0:45 — Participation.** Show **Bring your own EIC frame**. “This is an instrument for visuals, not just a fixed playlist. Your file stays on your device.” Mention the still-frame option.
4. **0:45–1:05 — Scientific context.** Choose **The Arctic** and play the ice recording. “Pictures and measurements are different. Here, each note is a real September mean, synchronized with its original numeric value.” Briefly switch to temperature.
5. **1:05–1:20 — Sharing.** Open **Make it your own**, adjust an era and soundscape, then demonstrate **Share this mix** or WAV download.
6. **1:20–1:30 — Close.** “One planet. A shared frequency. Earth FM makes Earth science something we can see, hear, and connect with.” Show BoboMimi credits.

## Sources and project links

- Source repository: https://github.com/Yoriichi-0u0/earth-fm/tree/codex/earth-fm-bobomimi
- Challenge: https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/
- Project website: https://earth-fm.vercel.app/ (production deployment and homepage verified October 14, 2026).
- [Observation sources and transformations](DATA.md)
- [Visual assets, mirror evidence, missing dates, and credits](FRAMES.md)
- [Sonification method and implementation](SONIFICATION.md)

The EIC visual relationship is supported by an explicitly attributed earth.gov asset mirror. Current official bytes, original observation dates, and complete production credits were not independently verified because the source domains were blocked during development. These are exhibit/imagery assets; they are not year-matched visualizations of the annual climate tracks. The project clearly communicates this boundary and retains the original credits and provenance.

This document is prepared submission text. It does not register the team, upload a demo, or submit the project on the Space Apps website.
