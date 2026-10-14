# Earth FM

**Our planet. A thousand stories. One soundtrack.**

Earth FM is BoboMimi’s working prototype for the [2026 NASA Space Apps Earth Information Jukebox challenge](https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/). It pairs Earth Information Center related visuals with sound synthesized locally in real time. A second listening mode makes four measured climate signals audible and keeps their original values on a synchronized chart.

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

Open the address printed by Vite. Click **Listen to the Earth** or **Hear this visual** to unlock browser audio. Headphones reveal the spatial scan. No credentials or API keys are needed. The app’s fonts, visuals, and observation snapshots are bundled; there are no runtime data requests or uploads.

In this cloud workspace, use `npm --cache /workspace/.npm-cache ci` if the default home cache is not writable. The existing checkout is already isolated; a separate worktree is unnecessary.

## What works

- **Visual radio:** three attributed earth.gov mirror assets: NASA/NOAA nighttime imagery, an EIC exhibit photograph, and an EIC immersive animation. A 48-strip scan generates D-minor pentatonic notes. Brightness controls pitch, RGB blends harmonics, and scan position controls stereo pan. Animation pixels are resampled at each note’s scheduling boundary.
- **Bring your own frame:** PNG, JPEG, WebP, GIF, MP4, and WebM files up to 20 MB are decoded and analyzed in the browser. Files stay on the device. MP4/WebM support depends on the browser’s codecs. GIF scanning may use the decoder’s current/poster frame; use a video for reliable temporal sampling.
- **Climate collection:** NASA GISTEMP temperature, NOAA Mauna Loa CO₂, NOAA satellite sea level, and a derived NSIDC September ice series. Charts, seeking, pause/resume, three soundscapes, tempo, and year-range controls work together.
- **Make and keep a mix:** device-local favorites, shareable climate settings in the URL, and downloadable stereo PCM WAV files. Visual video exports are a snapshot of the currently displayed frame, rather than a recording of the changing animation.
- **Inclusive controls:** descriptive image alternatives, numeric observations, keyboard controls, dialog focus management, reduced-motion support, and responsive layouts. An animation toggle allows a still-frame listening experience.

Visual sonification interprets displayed pixels, not calibrated physical measurements. Climate recordings use separate observational data. Places suggest tracks and rotate the globe; they do not manufacture local measurements. NASA/NOAA/NSIDC observations are pinned snapshots, not a live feed.

## Production workflow

```sh
git switch main
git add <changed-files>
git commit -m "Describe the change"
git push origin main
```

All work stays on `main`. Vercel builds each push and publishes directly to [Earth FM](https://earth-fm.vercel.app/). Preview deployments and testing workflows are not used. For an explicit terminal deployment, run `vercel deploy --prod --yes --scope chia-0u0-s-projects` from this linked checkout.

`npm run data:refresh` verifies the checked-in source hashes and deterministically rebuilds the observation data. `node scripts/refresh-data.mjs --download` restores the same pinned versions using verified HTTPS and recorded hashes; it does not silently refresh to a moving upstream branch.

## Sources and submission

- [Data origins, transformations, and scientific limits](docs/DATA.md)
- [EIC visual asset provenance and credits](docs/FRAMES.md)
- [Sonification design and architecture](docs/SONIFICATION.md)
- [Submission text and a 90-second demo](docs/SUBMISSION.md)
- [Vercel deployment](docs/DEPLOYMENT.md)

The official challenge text was supplied by the team because the challenge website was blocked by the cloud network policy. The implemented target is the supplied summary: pair EIC visual frames with dynamic real-time sonification. Full judging criteria or later challenge resources have not been independently retrieved.

EIC visuals were retrieved from a clearly attributed, pinned earth.gov asset mirror, not downloaded directly from an official NASA endpoint. Missing image dates and production credits are disclosed. This independent project does not imply NASA endorsement. Original data licenses and visual credits are recorded in the provenance documents; no generated or fictional scientific observations are used.
