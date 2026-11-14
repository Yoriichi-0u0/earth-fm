# TerraJuke design preview

**TerraJuke — The Earth Information Jukebox** replaced the name Earth FM on 13 November 2026. It began as the provisional display name for this research branch. Since 14 November the repository, Vercel project, package, exports and stored preferences also use TerraJuke. Browser preferences saved under the old `earth-fm-*` keys are still read as a fallback. The `?legacy=1` app and dated research records keep the Earth FM name they had at the time.

## Apple-style refresh — 13 November 2026

BoboMimi asked to drop the pine-green dark theme in favour of an Apple-like design. The modern pages now use:

- **Surfaces:** neutral system greys, with true black and #1c1c1e cards in Dark, and #f5f5f7 with white cards in Light. There is no tinted page glow.
- **Accent:** one blue for actions. Play is #0071e3 with white text in both modes. Links are #0066cc in Light and #2997ff in Dark. Dark-mode filled accent buttons use black text, because white on #2997ff measures 3.01:1.
- **Typography:** the system face, which is SF Pro on Apple devices and Segoe UI or Roboto elsewhere. Tracking is looser, and the study fonts are no longer used on these pages. Apple fonts are referenced as system fonts and never bundled.
- **Icon:** a new original app-style mark, a blue tile holding a black record with an Earth label and one scan line. Its source is `public/brand/terrajuke.svg`, rendered to the existing 128 px PNG. The ImageGen mark was retired.
- **Landscape phones:** when a phone is held sideways, the hero collapses to its headline so Play stays within the first screen.
- **Climate Coil (Three.js):** on Side B, every monthly GISTEMP v4 anomaly from the pinned snapshot is drawn as one coil. Time runs left to right, and each turn is a year with January at the top. Distance from the axis follows Side B's fixed −1.0 to +1.5 °C scale, and the twelve Januarys heard are white beads that pulse with each note. It is lazy-loaded, renders only on demand and pauses off-screen. It falls back to the 2D chart without WebGL, and a toggle switches between the two. The geometry lives in `src/lib/climateCoil.ts` with unit tests. NASA did not render this view.

Scientific imagery keeps its original colours and dark media surfaces. Legacy keeps its own preserved styling.

## Experience 2.0 — 13 November 2026

An audit of 120 rendered screenshots covered five devices (desktop, iPad, iPhone, iPhone landscape, Pixel), both themes, English and Chinese, and every modern route and Home state. Ranked by impact, it found:

1. **High — phones squeezed the science.** The vinyl column took about 30% of the width beside the NASA visual or the coil. Its text wrapped and the visual shrank.
2. **High — the phone header cost about 120 px.** The labelled selectors were large and "Explore Data" wrapped onto two lines.
3. **Medium — Play scrolled away.** Grooveprint inspection and Scratch sit far below the transport.
4. **Medium — the coil was small and passive.** On desktop it was 127 px tall, and on phones the "2026" label overlapped the newest turns.

Decisions:

- **Phones (≤640 px):**
  - the visual or coil takes the full width, and the record becomes a compact row beneath it with a flat disc, Flip, Try 3D and the caption;
  - the transport is sticky inside the deck, so Play or "Hear this position" stays in reach while inspecting or scratching;
  - the preference labels are visually hidden but keep their accessible names, and navigation is one line of 44 px targets;
  - the A/B buttons drop their redundant sublabels.
- **Interactive Climate Coil (the one Three.js investment):**
  - tap or click any January bead to select it silently through the existing inspector, so the slider, Grooveprint, readout and coil stay in agreement;
  - hovering shows the date, anomaly and mapped note;
  - a blue time-cursor ring glides to the current observation, and jumps instead when reduced motion is on;
  - the year axis sits below the canvas, and the coil is about 185–220 px tall;
  - a drag rotates the coil, and a tap only counts after less than 6 px of movement;
  - it keeps demand rendering, pauses off-screen, falls back to 2D, adds no new data and keeps the fixed scale.
- **Rejected:** a second sticky Play button. The design deliberately keeps a single Play control. A full-screen 3D observatory was also rejected because of battery cost on phones and duplication of the coil.

## Design direction (original study, 13 November 2026)

| Study | Distinguishing idea | Decision |
| --- | --- | --- |
| Signal Room | Pine and lime, prominent playback, separate record shelf | Adopted. The first action remains easy to find on phones and the visual still has room to tell the story. |
| Field Notes | Mineral paper, editorial headings, horizontal catalogue | The light palette draws on this study. Its wide layout needed more space than the Home player can count on. |
| Pressing House | Copper and black, large vinyl, mechanical deck | The deck had strong character and gave the imagery and accessible controls less room on phones. |

The scan-cut vinyl icon combines concentric grooves with a wedge that suggests the scan moving across an image. The mark was generated with OpenAI ImageGen for the brand study and resized to a 128-pixel PNG for the app. The wordmark is set in Space Grotesk and the interface uses DM Sans. Both installed fonts use the SIL Open Font License 1.1. The three generated mockups are design studies with illustrative visuals. The app continues to use the pinned scientific imagery and data.

## Apple guidance applied

| Official reference | TerraJuke decision |
| --- | --- |
| [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles/) and [Layout](https://developer.apple.com/design/human-interface-guidelines/layout/) | Place a single Play/Stop control above the visual. Group the record shelf and personal image tools beside the deck on desktop and below it on narrow screens. |
| [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility/) | Retain labelled controls and user-initiated sound. Offer a direct keyboard path to the shelf and return focus to the player when a record is selected. |
| [Typography](https://developer.apple.com/design/human-interface-guidelines/typography/) and [Color](https://developer.apple.com/design/human-interface-guidelines/color/) | Use scalable type for titles and readouts, distinct light and dark surfaces, and a high-contrast playback control. Scientific imagery keeps its original colours. |
| [Motion](https://developer.apple.com/design/human-interface-guidelines/motion/) | Keep the existing motion preference and the explicit, lazy-loaded 3D option. |
| [Design resources](https://developer.apple.com/design/resources/) | Use original artwork and the existing licensed fonts and icons. The build bundles no Apple design assets. |

## Naming screen

TerraJuke combines a recognizable Earth root with a clear music cue. It is shorter and more specific than EarthPlayer. EarthJuke reads clearly, and an existing [EarthJuke NASA repository](https://github.com/Mayoora146/EarthJuke_NASA) makes it a weaker option. EarthPlayer overlaps with the former Blueturn app name. Tellurune is distinctive and gives fewer cues about listening.

Public searches covered Google and Bing, GitHub, Apple’s Malaysian App Store, Google Play, and .com/.app registry lookups on 13 November 2026 MYT. The public screen surfaced no verified exact TerraJuke collision in those channels. Store results and registry responses can change. Trademark clearance remains open. The [MyIPO search portal](https://www.myipo.gov.my/search-trademark/) points to an account-based service, and the [WIPO database](https://www.wipo.int/en/web/global-brand-database) stopped at verification in this run.

## Review boundary

This draft stacks on PR #13 at `16b18843e7cb3e8229e02f7e1a6ff2cf0e6a07da`. Scientific source files and mapping modules are outside the design diff. The browser evidence covers keyboard operation, layout, themes and audio scheduling. Native screen-reader use, physical-device ergonomics and first-time user comprehension remain open.
