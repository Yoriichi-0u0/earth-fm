# From Earth to sound

## Scope: current Home versus the original engine

The current Home jukebox distinguishes pixel sound from fixed-band measurement sound. Both are synthesized in the browser after a user gesture; no authentic traditional-instrument samples are published by these engines.

- **Climate Side A, Moving Earth and Your Record:** the original visual engine below uses fixed displayed brightness 0–1 and D-minor pentatonic notes D3–D5. Source pixels, not measured temperatures, determine these notes.
- **Climate Side B / Temperature Through Time:** twelve selected January GISTEMP observations use the existing ten fixed 0.25°C bands from −1.00 to +1.50°C relative to the 1951–1980 January mean, with `symphony-ten-v1` notes C3, D3, E3, G3, A3, C4, D4, E4, G4, A4. This does not use the Legacy selected-range normalization.
- **Arctic September:** selected project-derived September extent means use fixed 3–8 million km² bounds in 0.5-unit bands, with the same ten-note tuning. Equal pitches across different physical variables do not establish equal scientific quantities.
- **Grooveprint:** A encodes existing strip brightness; B encodes existing temperature note bands. Equal angles encode order, not elapsed years. Inspection is silent. See [the mapping/geometry notes](GROOVEPRINT-RESEARCH.md) and [current showcase explanations](SHOWCASE.md).

The visual-radio and Legacy climate sections below document the original `EarthAudio` path. Its shared D-minor scale and selected-range climate normalization do **not** describe every current Earth FM instrument. [The Studio notes](EARTH_SYMPHONY_STUDIO.md) cover its separate settings and arrangement; [resource readiness](NASA-RESOURCE-READINESS.md) records future-media limits.

## Visual radio: the challenge’s core

1. Decode a bundled visual or a user-selected local file. A canvas samples a 384-pixel-wide copy, retaining its aspect ratio. The original displayed file is unchanged.
2. Divide the canvas into 48 vertical strips. Include every RGBA pixel and alpha-composite it over black.
3. Average each strip’s red, green, and blue channels. Compute displayed-image luma as `0.2126 R + 0.7152 G + 0.0722 B`, with channels in `[0,1]`. This is an sRGB luma estimate, not measured radiance or a physical quantity.
4. Quantize luma against fixed bounds `[0,1]` onto the scale: black maps to D3, white to D5. Blend RGB-dependent fundamental, octave, and third harmonic weights. Position the note left or right using the strip’s center.
5. Synthesize each note near its playback time. The scheduler reads a fresh canvas just before scheduling a note, within a 150 ms lookahead. For a playing video, this uses the current decoded video frame. UI scan position, note, luma readout, and spectrum update at the scheduled audio time.

The tempo sets the scan speed: one strip per `60 / BPM` seconds. A complete 48-strip scan at 120 BPM takes approximately 24 seconds plus the final note’s release. Only one listening mode plays at a time. Pause stops voices with a short fade and cancels queued updates; a visual starts scanning from the left when replayed.

Pixels in labels, legends, people, and exhibit surroundings contribute to an image scan. These are explicitly visual inputs. A blue area does not automatically indicate a colder temperature; a bright city does not supply a CO₂ measurement. The app provides a numeric climate-data mode separately.

When reduced motion is requested, video listening defaults to a still frame. The user can explicitly enable **Follow the animation**. Bundled GIF animation is played through its WebM derivative for controllable playback. Uploaded GIFs may be sampled from their poster/current decoded frame, so MP4/WebM is preferred for temporal input.

## Legacy climate recordings

One annual observation becomes one note. Its value is normalized to the minimum and maximum of the **selected year range**, then quantized to the same scale. A constant series maps to D4. Higher values yield higher or equal pitches. The selected range remains the normalization reference during pause, resume, and seeking.

Ambient uses soft sine harmonics with a low drone; Keys uses a short attack and piano-like harmonic decay; Pulse uses a shorter triangle-wave rhythm. These are synthetic timbres, not recordings of natural environments. The tempo changes how fast the historical sequence is heard and does not change the observations.

Tracks retain their original units, baselines, coverage, and year ranges. Pitches cannot be compared as physical quantities across tracks or across differently normalized eras. Selecting a place suggests a relevant track and rotates the decorative Natural Earth globe; it does not spatially interpolate data.

## Export and privacy

WAV export generates deterministic 24 kHz, 16-bit, stereo PCM with the same pitch and harmonic rules. Climate exports describe the selected observation range. Visual exports capture the image/video frame visible at the moment of export and scan that snapshot; they do not record all future animated frames. Live Web Audio includes delay and compression effects, so PCM exports are musically equivalent rather than bit-identical to live output.

Files, pixel buffers, favorites, and sound are processed locally. A shared climate mix encodes only track ID, timbre, tempo, and selected years in its URL. Uploaded visuals are not included in shared links and are never sent to a server.

## Implementation

- `src/lib/audio.ts`: pure pitch mapping, audio-clock scheduling, lifecycle cleanup, harmonic voices, and PCM rendering.
- `src/lib/imageSonification.ts`: tested pixel aggregation, fixed brightness mapping, and live frame providers.
- `src/components/FrameJukebox.tsx`: media decoding, scanning, uploads, playback coordination, and source credits.
- `src/App.tsx`: climate listening room, chart, settings, collection, sharing, and BoboMimi credits.
- `src/components/EarthGlobe.tsx`: interactive orthographic SVG with bundled public-domain geography.

The app is a static React/TypeScript application built by Vite. Hosting needs no database, secret, or server process. Supabase could support opt-in shared collections in a future iteration; it is not required for this version.
