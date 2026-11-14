# TerraJuke — NASA observatory visual refinement

2026-11-02. Following local review, the user explicitly approved committing and pushing the five-page and NASA observatory revision to main through the existing production workflow. The five-page structure remains.

## User-facing changes

Home introduces NASA EARTH DATA → SOUND above the main message and retains one prominent Start the experience action. A NASA Earth Observatory surface composite gives the rotating globe real land, ocean and ice detail. The blue atmospheric rim, orbital marks, deep navy background and warmer small accents establish an Earth observation setting. Source and historical-image context are visible next to the globe.

A concise NASA GISTEMP v4 record strip makes the data source and 1880–2026 coverage visible before entering the experience. A real NASA Climate Spiral thumbnail introduces Look → Listen → Discover below the hero. The imagery is a preview; it does not act as an exact reading for a selected month.

Listen presents the NASA Climate Spiral as the main exhibition piece, with a compact side column explaining brightness → pitch, colour → tone and scan position → stereo position. Playback, scan and volume remain functional. On phones the Play/Stop control comes before the visual, making the first action easy to find. The measurement step identifies NASA GISTEMP separately from the pixel sound. About contains the new image source and provenance. Create and Explore Data inherit the restrained blue theme while preserving their separate tasks.

English remains the default and the new visible copy is translated into Simplified Chinese. No NASA insignia was added as TerraJuke branding. This remains an independent project using clearly attributed NASA material.

## Historical image and rendering

The new source is [NASA Earth Observatory, Blue Marble: Next Generation with Topography](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography/), July 2004. It is a historical monthly surface composite. The checked source JPEG is 5400×2700; a 2048×1024 JPEG derivative is bundled at 320,457 bytes. [Image provenance](../public/frames/observatory-provenance.json) records the official retrieval URL, original/display SHA-256 hashes, dimensions and processing.

A small native WebGL surface renderer projects the texture with the same orthographic camera as the existing SVG globe. It adds no library or framework. Lighting and slow rotation are illustrative and do not represent current solar time, weather, the selected NASA temperature observation, or local climate measurements. The existing Natural Earth SVG globe remains available if the graphics capability or image fails. Context loss also restores that illustration; a restored graphics context reloads the surface. The approximately two-minute rotation, pause/resume, dragging, keyboard, motion preferences, visibility and offscreen controls remain.

The GISTEMP snapshot, numeric mapping and sound engine were unchanged. Original audio files and 1.0 assets were retained. No generated image is presented as NASA imagery.

## Verification

35 unit tests, TypeScript/Vite production build and 31 browser scenarios passed in the final check. New coverage verifies official image provenance and local bytes, the actual rendered centre pixel against the source at the camera's latitude/longitude, camera movement, graphics-context loss/recovery, unavailable graphics, and failed image loading. Existing checks cover the five pages, audio workflow and cleanup, source values, A/B, English/Chinese, mobile overflow and automated accessibility.

Desktop and 390px mobile screenshots were inspected. This is local Chromium evidence; physical iPhone/Safari and subjective appearance remain for real-device/user review. The additional globe asset is bundled and requires no runtime third-party request.

Production entry: https://terrajuke.vercel.app/ . The original entry remains https://terrajuke.vercel.app/?legacy=1 . Local development uses http://127.0.0.1:5173/ .
