# Earth FM — five-page local review

Date: 2026-11-02. Status: after local review, the user explicitly approved committing and pushing this five-page revision together with the NASA observatory visual refinement to main for production.

Visual follow-up: see [the NASA observatory refinement](NASA_OBSERVATORY_REFINEMENT.md) for the newer attributed globe, source strip and visual-player presentation. The initial page-reorganization notes below are retained.

## What changed

The previous Studio placed a homepage, a lesson, multiple modes, music controls, a chart, a data guide and credits in one long page. The new design separates five purposes and gives the first-time visitor one prominent entry.

| Page | Local URL | Primary task |
| --- | --- | --- |
| Home | http://127.0.0.1:5173/ | Understand the purpose and start a guided experience |
| Listen | http://127.0.0.1:5173/listen | Look → Listen → Discover, one step at a time |
| Create | http://127.0.0.1:5173/create | Choose a tone/style and audition a mix |
| Explore Data | http://127.0.0.1:5173/data | Inspect an exact NASA month, hear its note and compare years |
| About | http://127.0.0.1:5173/about | Understand methods, scientific limits and sources |

Home has one main Start the experience action, a short explanation and three small orientation items. Its globe is a contextual illustration and slowly rotates at 3 degrees/second, approximately two minutes per turn. It supports pause/resume, pointer dragging and left/right keys. Rotation pauses during interaction and resumes after two seconds; it also respects reduced motion, the Motion effects switch, page visibility and whether the globe is on screen.

Listen presents one active step. The first uses real NASA Climate Spiral pixels and explicitly identifies this as visual sound. The second plays twelve selected January observations with dates, exact anomalies and mapped frequencies. It explains the January baseline, actual chart year spacing and equal-duration note timing. The third compares two example observations and offers Create or Explore Data. The learning check is optional and collapsed; actual first/retry attempts remain available for private local export.

Create exposes five synthesized tones and three styles as clear choices. Drums, harmony, tempo, echo and brightness are in More sound controls. Hear Data Only remains independent. A separate preview card gives year, tone/style, Play/Stop, live volume and 25-second WAV export. On narrow screens, the single Play/Stop control stays at the bottom of the viewport while choosing a sound. Parameter changes stop the current preview; playback restarts only by user action. Export uses 60 BPM for comparable 24.8-second files, while live tempo is adjustable.

Explore Data separates measurement inspection from music creation. Month/year controls, the baseline, exact value and target note precede a fixed-scale monthly chart. A second year is opt-in. Full A/B playback preserves Year A selection and plays all twelve months of A before all twelve of B, at the same tempo and pitch scale. Missing observations are silent. The mapping explanation, source trace and optional 2D/3D Climate Spiral are disclosures, rather than competing first-screen sections.

About gathers plain-language project explanation, the distinction between pixel sound and measurement sound, NASA references, visual credits, challenge context and prototype limits. A compact NASA visual credit also stays next to the guided image.

The dark teal space theme, dotted Earth and warm lime actions are retained. Independent pages, larger gaps and fewer simultaneous panels provide the new visual hierarchy. English is the default; Simplified Chinese is selectable and persists when local preference storage is available.

## Science and sound

The NASA snapshot, original assets, existing recordings, fixed ten-band mapping and synthesis code were not replaced. The numeric snapshot remains global GISTEMP v4 monthly land–ocean anomalies for January 1880–September 2026, retrieved 18 October 2026, relative to the 1951–1980 average for each corresponding month. Each 0.25°C band from −1.00 to +1.50°C selects the same target fundamental in every tone/style; missing and out-of-range values stay silent. All new tones remain explicitly synthetic.

The visual sonification reads displayed pixels. Its colours, labels and background can affect sound; it is not calibrated as a temperature measurement. The NASA reference visual may use a different data revision from the pinned numerical snapshot. The scientific chart and melody use the actual numerical observations.

## Implementation

React, TypeScript, Vite and Web Audio remain the architecture. No package, backend or rendering framework was added. A small path router supports real links, browser Back/Forward, direct page entry, titles and focus management. Exact Vercel static rewrites for the four non-root pages are prepared for a future authorized release; no catch-all captures the `/data/…` source files.

`SymphonyStudio.tsx` is now the shell; page components, shared climate transport and the extracted spiral have separate responsibilities. Leaving a page disposes its audio player; no hidden page continues playing. Hiding the browser page stops active audio. The original app remains available through `/?legacy=1`, original anchors and shared mix links.

## Verification and review limits

`npm run check` covers 34 unit cases, the TypeScript/Vite production build and 28 browser scenarios. Browser checks include the preserved original experience, all five routes, direct reload/history, real pixel scanning, scientific frequencies, five tones × three styles × data-only/full mix, full sequential A/B, live volume, parameter cancellation, route cleanup, WAV/CSV/learning record downloads, missing months, blocked local preference storage, language persistence, mobile overflow, reduced motion and rotation controls. All passed in the final run. Automated mobile accessibility scans cover all five pages in both languages and an expanded missing-data explanation.

Desktop and 390px mobile screenshots were inspected. These checks establish software behavior, not learning effectiveness or a physical-device certification. Next review should use fresh novice-user feedback on purpose, first playback, navigation and the distinction between Create and Explore Data. Physical iPhone/Safari playback and subjective sound quality still need human/device review.

## Local review

Run `npm run dev -- --host 127.0.0.1 --port 5173` from the repository if the current local server is stopped, and open the Home URL above. Start → Play visual sound → Continue to the real data → Play the data melody → Continue to the discovery. Then try a tone in Create and inspect the corresponding source value in Explore Data.

The existing main-to-Vercel production workflow remains in place. Publication was separately approved after the local review described here.
