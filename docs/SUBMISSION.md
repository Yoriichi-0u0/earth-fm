# TerraJuke: The Earth Information Jukebox, submission draft

**Challenge:** The Earth Information Jukebox, NASA Space Apps 2026.
**Team:** BoboMimi. Chia Yuen Kai (leader, `Chia_0u0`) and Jacy Chiong Yet Suu (`jacychiongys`).
**Live:** https://terrajuke.vercel.app · **Code:** https://github.com/Yoriichi-0u0/TerraJuke-The-Earth-Information-Jukebox

Status: draft for the team's own submission form, updated 14 November 2026. It describes the app as deployed; it is not evidence of a submission or of any user study.

## One-line pitch

TerraJuke turns NASA's pictures of Earth into music you can play like a jukebox: choose a record, press Play, and hear the planet, then see exactly how each sound was made and where the data came from.

## The problem

NASA's Earth Information Center shows the planet on giant screens, but a picture only reaches people who can see it, and a beautiful picture rarely explains itself. The challenge asks for EIC visual frames paired with sound generated in real time, accessible to blind and low-vision visitors, musical rather than noisy, and able to tell the story.

## What TerraJuke does

Every NASA visualization is a **record**. Side A turns the picture's pixels into sound live in the browser; Side B, where one exists, plays the measurements or the story behind it. Six records:

| # | Record | NASA source | What you hear |
|---|---|---|---|
| 01 | Climate Spiral | SVS 5190 (Climate Vital Signs, EIC) + GISTEMP v4 | A: brightness → pitch across 48 strips. B: twelve Januaries, 1880–2025, on a fixed temperature scale |
| 02 | Night Lights | SVS 5313, EIC Version (Black Marble, VIIRS) | A: purple rises, orange falls, read on NASA's own legend. B: NASA's twelve yearly frames as a melody; Mystery Place guessing game |
| 03 | **The Air We Share** | SVS 5669, GEOS Aerosols | Four aerosols become four instruments on a mixing desk while a Three.js Earth turns under the needle; Side B plays NASA's six stories |
| 04 | Moving Earth | EIC exhibit animation | Video pixels resampled on every note |
| 05 | Arctic September | NSIDC Sea Ice Index | September extent → pitch (measurements) |
| 06 | Temperature Through Time | NASA GISS GISTEMP v4 | The Side B measurements on their own |

**The Air We Share** is the headline. NASA describes this resource as suited to *multi-track experimentation*, so TerraJuke reads NASA's colour bar from NASA's own image and gives each aerosol an instrument: smoky brass (fire smoke), desert strings (dust), an ocean bed (sea salt) and glass bells (sulfate). Earth is literally the record. Each slice of longitude that turns under the needle is one step of the groove: how much of each aerosol sets loudness, where it sits north or south sets pitch, and where there is none the instrument rests. Over Africa all four play at once. Mute or solo any track to pick out the Saharan dust river or the smoke from southern Africa. Side B tells NASA's own six stories, from Hurricane Erin's sea-salt spirals to Kilauea's sulfate stream.

**Play the whole jukebox** turns TerraJuke into a real jukebox: it plays every record in turn, each introduced by an animated title card and a spoken announcement, which suits a big screen in an Earth Information Center or a judging table. The challenge welcomes a curated playlist as a deliverable; this is one that is generated live.

Around the shelf: the **Record Journey**, an animated "from orbit to your ears" strip naming the satellite or model, the NASA team, the visualizers, the Earth Information Center and finally the listener, in their own time zone (computed in the browser, nothing sent). Also a 3D record rack, a Grooveprint picture of each groove, Scratch and Earth Looper for performing, Your Record for a personal image that never leaves the device, and Mystery Record.

## Challenge alignment

| The challenge asks for | TerraJuke |
|---|---|
| EIC visual frames + sonification generated in real time | Every visual record is analysed and synthesized live in the browser from pinned NASA files; no recordings |
| Select or experience a specific visualization with its soundscape | A jukebox shelf and 3D rack: one press to choose, one press to play |
| Map colour, brightness, shape or pixel density to sound | Brightness → pitch; RGB → timbre; NASA legend position → pitch; aerosol colour → instrument; colour strength → loudness; density → rhythm (rests where there is nothing) |
| Balance data with musicality | Fixed scales from the data; shared pentatonic scales so layers harmonise; tempo, tone and mixer are musical choices that never change a note |
| Accessibility for blind and low-vision users | Every map is a keyboard instrument with spoken descriptions; captions and screen-reader announcements on every note; Android vibration patterns; reduced motion; 2D fallbacks for all 3D; automated WCAG checks in light and dark |
| Tell the story | NASA's own stories on Side B, liner notes with the method and limits, and the Record Journey from instrument to listener |
| Use the Resources | EIC Content Database (SVS 5190, SVS 5313 EIC Version) and the listed GEOS Aerosols (SVS 5669); the Caldwell 73 sonification informed the scanning design |

## Validity

Every NASA file is pinned with its source URL and SHA-256. Every mapping is a fixed rule with unit tests: 119 unit tests and 145 browser tests at this checkpoint. For The Air We Share, tests check that each of NASA's six stories is dominated by the aerosol NASA names, at least twice the next one, and that grey land and Antarctica stay silent. Night Lights is cross-checked against NASA's separately published SVS 5276 series (r = 0.999 for the world).

Each record states its limits: pixels are not measurements; GEOS is a model analysis; colour strength is not optical depth; one aerosol moment, not a live feed; equal note lengths do not encode elapsed time. No user study has been run, and TerraJuke claims no learning gains.

## 90-second demo

- **0:00–0:10.** Home. "NASA watches the whole planet. TerraJuke lets you hear it." Choose **The Air We Share**.
- **0:10–0:35.** Press **Meet the four instruments** for five seconds, then **Play the world**. The globe turns under the needle; the meters jump. "Each slice of longitude is a step in the groove. Dust plays strings, smoke plays brass, sea salt plays the ocean bed, sulfate rings like glass." Solo **Dust** over Africa and the Atlantic: "that's the Sahara crossing an ocean."
- **0:35–0:50.** Side B: **Hurricane Erin**. The caption and screen reader read NASA's story; the sea-salt track swells.
- **0:50–1:05.** Close your eyes: focus the map, press → a few times. "Every slice is described out loud. The same music works without the picture."
- **1:05–1:20.** Flip to **Climate Spiral** Side B: twelve Januaries rise from G3 to A4. "Here the notes are the measurements."
- **1:20–1:30.** Press **Play the whole jukebox** and let the title card roll. Scroll to the Record Journey ending at "You". "From a satellite, through NASA, to your ears, wherever you are. TerraJuke."

## Credits

NASA Scientific Visualization Studio; NASA Global Modeling and Assimilation Office; NASA GISS; NASA/NOAA Suomi NPP VIIRS and Black Marble; NSIDC. Visualizers and scientists are credited in each record's liner notes and in `public/nasa/*/provenance.json`. TerraJuke is an independent project and does not imply NASA endorsement. Built with React, Three.js (react-three-fiber), Anime.js and the Web Audio API; developed with AI assistance (Claude Code).
