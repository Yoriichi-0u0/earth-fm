# TerraJuke — unified listening room refinement

Status: UI refinement after production commit 28e4d93. Following local review, the user explicitly approved committing and pushing this revision to GitHub main for the existing Vercel production workflow. Earlier no-push notes below describe the completed local review stage.

## Challenge alignment and evidence

The target remains NASA Space Apps 2026, The Earth Information Jukebox. The official challenge summary reproduced on the official team page https://www.spaceappschallenge.org/2026/find-a-team/proteas/ describes pairing Earth Information Center visuals with sound generated dynamically in real time, making Earth science accessible, engaging and multisensory. The challenge's staging page https://staging-web-v2.spaceappschallenge.org/2026/challenges/earth-information-jukebox/ confirms the title and its indexed summary matches this goal. The public challenge URLs could not supply the detailed requirements/resources to the browsing tool. Full judging criteria have not been independently verified. No additional scoring rules, required 3D technology or required instrument bank are assumed.

| Verified summary goal | How this revision addresses it | Practical limit |
| --- | --- | --- |
| Pair EIC visual frames with sound | 1.0 Visual Radio is embedded in the same 2.0 listening room, including three attributed NASA/EIC-related mirror assets and local image/video selection. | Visual origin/date/credit limitations remain disclosed; mirror assets are not claimed as newly downloaded NASA originals. |
| Generate dynamic sound in real time | Reuse the existing live pixel sampling and Web Audio engine; animated frames are sampled at each scheduled note. | Visual WAV export is the frame at export time, not an evolving video soundtrack. |
| Make Earth science more accessible | A plain-language introduction, one-click 25-second start, three short usage steps, explicit image/data distinction, English/Chinese, keyboard rotation and accessible controls. | Automated tests and designer inspection are not a study of public comprehension or formal accessibility certification. |
| Engage multiple senses | Interactive Earth, temperature spiral, moving image scan, synchronized monthly readings and audio. | Orbit/halo/meter animation is decorative/status feedback, not a new scientific data channel or measured audio spectrum. |

The climate-data melody is a complementary educational interpretation, not a substitute for the EIC visual-pairing requirement. Both experiences now sit in one interface. The globe is explicitly contextual; the spiral's coordinates represent the observations. No regional temperature is inferred from the globe or imagery.

## Design assumptions and choices

Assumption: many visitors are new to both climate science and sonification. A first screen should answer what this is, what to do and what happens next without explaining signal processing. This is a design hypothesis, not a validated universal-usability claim.

Theme: a dark listening room, a teal dotted Earth inherited from 1.0, warm lime action colour, restrained orbital movement and generous spacing. The first heading is “See our Earth. Hear its story.” The introductory sentence states that NASA visuals and climate observations become sound. A single prominent Start listening action begins a known 25-second 2025 journey and scrolls to the player. A secondary action opens the EIC visual experience.

The next decision has two choices:
- Hear climate change: published global temperature anomalies determine melody pitch.
- Hear an Earth visual: displayed image brightness/colour/position determine sound; these are not physical temperature observations.

Within the climate experience, retain Earth Journey / Earth Remix Studio / Data Lab. Year selection is called Choose a year outside A/B comparison. Sound settings are collapsed in the introductory Journey and expanded in Remix. Low-level sound-engine notes are also collapsed. The numerical reading explains the baseline in everyday language, and the full data-to-sound guide remains available. The original NASA Climate Spiral image is available in a labelled reference disclosure; it is not overlaid with an invented exact match to the newer numeric snapshot.

## Reused functionality and boundaries

- Reuse EarthGlobe (public-domain Natural Earth geometry) with no regional markers in the Studio hero. Add left/right keyboard rotation for this context; retain existing marker behavior in the old app.
- Reuse FrameJukebox, FrameAudio, local upload, frame selection, live sampling, scan tempo, volume and WAV export. Add optional global motion allowance and bilingual text without changing frame IDs or scientific pixel conversion.
- Reuse all five synthesized melody tones, three accompaniment styles, ten-band monthly mapping, A/B, CSV trace, provenance and fixed data bytes.
- Switching experiences cancels/unmounts the outgoing player; image and data audio do not overlap. Document hiding stops visual playback, as it already does climate playback.
- Motion defaults off under reduced-motion preference. A visible Motion effects toggle disables decorative animations and prevents following animation until re-enabled. Essential selected-month/scan-position changes still report progress. No automatic sound on entry.
- Native expandable sections, phone layout, visible focus and keyboard controls remain. Language preference stays local to the browser. No backend, new framework, package or external media service was added.

## Local experience

Open http://127.0.0.1:5173/?studio=1 . The existing root /#climate-spiral and ?legacy=1 preserve the earlier experience for comparison. The production site is unchanged until separately published.

Suggested review path: start the 25-second story, observe a highlighted month and numeric reading, open Choose your sound, switch to Visual Radio, hear a frame, inspect what brightness means, switch languages, and repeat on a phone. Physical iPhone/Safari playback and real novice-user comprehension still need review.

## Verified results

- Production compilation passed after integration.
- 32 unit tests passed, retaining source hashes and audio mapping behavior.
- All 26 browser tests passed in the final complete run (57.1 seconds), including legacy regressions, complete A/B playback, five-tone/style isolation, bilingual state, data-to-sound trace, unified audio switching, keyboard globe rotation, motion-controlled animation, automated accessibility and phone overflow checks.
- Desktop and 390px mobile screenshots inspected for the English and Chinese experiences.
- The final diff whitespace check passed.
- No push, commit or deployment of this UI revision. The existing production release remains unchanged.
