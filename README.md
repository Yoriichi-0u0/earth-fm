# TerraJuke — The Earth Information Jukebox

**Our planet. A thousand stories. One soundtrack.**

TerraJuke is BoboMimi’s prototype for the NASA Space Apps 2026 challenge *The Earth Information Jukebox*. Until 13 November 2026 it was called **Earth FM**. Live at [terrajuke.vercel.app](https://terrajuke.vercel.app/).

TerraJuke is a jukebox. Each NASA Earth visualization is a **record**: choose it, put it on, hear it, flip it and explore it. Side A turns the picture's pixels into sound in real time. Side B plays the measurements behind it on a fixed pitch scale. Pixels are never presented as measurements. The primary audience is first-time learners; educational effectiveness has not yet been established by a user study.

| # | Record | Source |
| --- | --- | --- |
| 01 | Climate Spiral | NASA SVS 5190 (Side A) and GISTEMP v4 January anomalies (Side B), with the Three.js Climate Coil |
| 02 | Night Lights | NASA SVS 5313, EIC Version: change map and NASA's twelve annual frames, cross-checked against SVS 5276 |
| 03 | The Air We Share | NASA SVS 5669, GEOS Aerosols: four aerosols become four instruments on a mixing desk while a Three.js Earth turns under the needle; Side B plays NASA's six stories ([details](docs/AIR.md)) |
| 04 | Moving Earth | EIC exhibit animation from an attributed earth.gov mirror ([provenance](docs/FRAMES.md)) |
| 05 | Arctic September | Project-derived means of NSIDC September extent, not an EIC visual |
| 06 | Temperature Through Time | The Side B GISTEMP measurements on their own |

Every NASA record ends with its journey, *from orbit to your ears*: the instrument, the NASA team, the visualizers and finally you, in your own time zone. Around the shelf: a Three.js jukebox stage, Grooveprint, Scratch and Earth Looper, Your Record (a personal image that stays on the device), Mystery Record, Mystery Place (hear a region's decade of night lights, guess where it is, then see it on NASA's map), and an Auto / Light / Dark appearance switch. The interface is English only. See [the TerraJuke 3 decisions](docs/TERRAJUKE-3-DECISIONS.md), [Night Lights](docs/NIGHT-LIGHTS.md) and [the design notes](docs/TERRAJUKE-DESIGN.md).

The pages are Home (`/`, the jukebox), Listen (`/listen`), Create (`/create`), Explore Data (`/data`) and About (`/about`). `/listen?station=arctic` and `/listen?station=all` open the curated [Earth Stations](docs/EARTH_STATIONS.md). `/?legacy=1` still opens the original Earth FM app for old bookmarks; old climate/visual anchors and shared-mix query parameters remain compatible. See [the submission draft](docs/SUBMISSION.md) and [the actual-user pilot protocol](docs/USER_TEST_PROTOCOL.md).

| Team BoboMimi | Role | Username |
| --- | --- | --- |
| Chia Yuen Kai | Team leader | Chia_0u0 |
| Jacy Chiong Yet Suu | Team member | jacychiongys |

## Run

This checkout is connected to GitHub, Vercel, and Supabase. See [the connection map](docs/CONNECTIONS.md) for project links, installed terminal tools, and local configuration.

Use Node.js 22.12+ or 24 LTS. From the repository root:

```sh
npm ci
npm run dev
```

Open the address printed by Vite, choose a record and press **Play**. Sound starts only when you press Play. Headphones reveal the spatial scan. No credentials or API keys are needed. The app’s fonts, visuals, and observation snapshots are bundled; there are no runtime data requests or uploads.

In this cloud workspace, use `npm --cache /workspace/.npm-cache ci` if the default home cache is not writable. The existing checkout is already isolated; a separate worktree is unnecessary.

## The original Earth FM app

The original Earth FM app is no longer linked from the site, and still opens at `/?legacy=1`. It keeps these broader collection and visual tools:

- **Visual radio:** three attributed earth.gov mirror assets: NASA/NOAA nighttime imagery, an EIC exhibit photograph, and an EIC immersive animation. A 48-strip scan generates D-minor pentatonic notes. Brightness controls pitch, RGB blends harmonics, and scan position controls stereo pan. Animation pixels are resampled at each note’s scheduling boundary.
- **Bring your own frame:** PNG, JPEG, WebP, GIF, MP4, and WebM files up to 20 MB are decoded and analyzed in the browser. Files stay on the device. MP4/WebM support depends on the browser’s codecs. GIF scanning may use the decoder’s current/poster frame; use a video for reliable temporal sampling.
- **Climate collection:** NASA GISTEMP temperature, NOAA Mauna Loa CO₂, NOAA satellite sea level, and a derived NSIDC September ice series. Charts, seeking, pause/resume, three soundscapes, tempo, and year-range controls work together.
- **Make and keep a mix:** device-local favorites, shareable climate settings in the URL, and downloadable stereo PCM WAV files. Visual video exports are a snapshot of the currently displayed frame, rather than a recording of the changing animation.
- **Inclusive controls:** descriptive image alternatives, numeric observations, keyboard controls, dialog focus management, reduced-motion support, and responsive layouts. An animation toggle allows a still-frame listening experience.

Visual sonification interprets displayed pixels, not calibrated physical measurements. Climate recordings use separate observational data. Places suggest tracks and rotate the globe; they do not manufacture local measurements. NASA/NOAA/NSIDC observations are pinned snapshots, not a live feed.

## Production workflow

Work on a branch and open a draft pull request early (see [CLAUDE.md](CLAUDE.md)). `npm run check` runs the unit tests, the build and the Playwright suite.

Only `main` deploys. Merge to `main` once `npm run check` passes; Vercel then builds the push and publishes [terrajuke.vercel.app](https://terrajuke.vercel.app/). Deployments from other branches and preview deployments are disabled. For an explicit terminal deployment, run `vercel deploy --prod --yes --scope chia-0u0-s-projects` from this linked checkout. See [DEPLOYMENT.md](docs/DEPLOYMENT.md).

`npm run data:refresh` verifies the checked-in source hashes and deterministically rebuilds the observation data. `node scripts/refresh-data.mjs --download` restores the same pinned versions using verified HTTPS and recorded hashes; it does not silently refresh to a moving upstream branch.

## Sources and submission

- [Data origins, transformations, and scientific limits](docs/DATA.md)
- [EIC visual asset provenance and credits](docs/FRAMES.md)
- [Sonification design and architecture](docs/SONIFICATION.md)
- [Submission text and a 90-second demo](docs/SUBMISSION.md)
- [Vercel deployment](docs/DEPLOYMENT.md)

The official challenge text was supplied by the team because the challenge website was blocked by the cloud network policy. The implemented target is the supplied summary: pair EIC visual frames with dynamic real-time sonification. Full judging criteria or later challenge resources have not been independently retrieved.

EIC visuals were retrieved from a clearly attributed, pinned earth.gov asset mirror, not downloaded directly from an official NASA endpoint. Missing image dates and production credits are disclosed. This independent project does not imply NASA endorsement. Original data licenses and visual credits are recorded in the provenance documents; no generated or fictional scientific observations are used.
