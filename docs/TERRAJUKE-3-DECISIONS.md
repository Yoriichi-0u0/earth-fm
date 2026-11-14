# TerraJuke 3: keep, cut, add (14 Nov 2026)

**Yardstick.** The NASA Space Apps challenge *The Earth Information Jukebox*: pair **Earth Information Center visual frames** with **dynamic sonifications generated in real time**; let people **select or experience a specific EIC visualization alongside its soundscape**; make it **accessible** (screen readers, tactile feedback, rich description); balance data with musicality; tell the story. Judging: Impact, Creativity, Validity, Relevance, Presentation.

**Organising idea.** TerraJuke is a jukebox. Each NASA visualization is a **record**: you choose it, put it on, hear it, flip it, explore it. Three.js makes the machine itself the visual centrepiece. Every feature must serve that metaphor and the challenge, or it goes.

**Baseline.** This repository (`codex/terrajuke-experience-2`, production `05e8af5` at terrajuke.vercel.app). The hackathon repository (`TerraJuke-SpaceApps-2026`) remains the project submitted for judging under the Local Lead's ruling; work flows from it into this one (the team's own new work), never the reverse.

## Audit and decisions

| Feature | Challenge fit | Decision | Why |
|---|---|---|---|
| Record collection ("Choose a record") and record player | Core: "select a visualization alongside its soundscape" | **Keep, make it the 3D jukebox** | The jukebox is the product; today it is a flat list |
| Climate Spiral record (SVS 5190, Side A pixels / Side B GISTEMP) | EIC visual (Climate Vital Signs) plus measurements | **Keep** | Strongest existing EIC record; honest two-sided design |
| Climate Coil (Three.js) | Visual exploration of Side B | **Keep** | Already the best Three.js piece |
| Grooveprint | Record-groove picture of the data | **Keep** | Pure jukebox language |
| Explore Data (GISTEMP notes, CSV) | Validity, transparency | **Keep** | Every note has a number |
| Create (style mixer, 25 s WAV) | Musicality, engagement | **Keep** | Temperature still drives pitch; style is labelled as musical choice |
| Your Record (image upload) | Creativity, engagement | **Keep** | Clearly labelled as personal, not NASA data |
| Mystery Record | Discovery | **Keep** | Draws from the shelf; no invented records |
| Appearance, English / Chinese | Accessibility, reach | **Keep** | New strings get English first; Chinese where feasible |
| "Moving Earth" record | Decorative EIC exhibit animation from a **third-party GitHub mirror** of earth.gov; no data meaning | **Keep for now, renumbered 03** (revised) | The earth.gov originals now return 404, so it cannot be re-sourced; its provenance (mirror URL, SHA-256) is documented in docs/FRAMES.md and the record already says it is an archived visual, not data. It is also Mystery Record's only animated record. Revisit when the Listen page is reworked |
| "Temperature Through Time" record | Same GISTEMP data as Climate Spiral Side B | **Keep for now, 05** (revised) | Mystery Record's measurement round depends on it; remove together with the Mystery rework |
| "Arctic September" record | NSIDC project-derived means, **not an EIC visualization** | **Keep for now, 04** (revised) | As above; labelled as project-derived means, not an EIC frame |
| Legacy Earth FM app (`?legacy=1`, footer "Original experience ↗") | NOAA CO₂, sea level etc., older lime-green design, not EIC | **Remove the footer link**; the `?legacy=1` deep link keeps working for old bookmarks | Off-challenge and confusing as a front-door choice |
| **Mystery Place** (proposal) | Listen & Discover: hear a region's decade and guess which part of the world it is, then reveal it on NASA's map | **Next** | Educational, scientific, jukebox-native; replaces Mystery Record's dependence on the measurement records |
| **Night Lights record (SVS 5313, EIC Version)** | Named in the challenge Resources; EIC visual; real-time sonification; validated | **Add** | Change map + Hear the decade (NASA's 12 annual frames) + SVS 5276 cross-check + regional comparison + synchronized sound, ring, caption, screen reader and vibration |
| **3D jukebox (Three.js)** | Presentation, creativity, the "Jukebox" keyword | **Add** | Records on a carousel; the chosen record drops onto the platter; its NASA visual is the label; the tonearm tracks playback |
| Further EIC records (candidates: SVS 3912 sea-surface currents and temperature, SVS 5011 ISS lightning) | Breadth across the Resources | **Later, only if validated** | Each needs provenance, deterministic rules, tests and stated limits |

## Build order

1. Night Lights science into `src/lib/nightLights/` with its unit tests, NASA files, provenance and the SVS 5276 validation (ported from the hackathon repository at `4a1abc4`, the team's own work from 14 Nov).
2. Night Lights record in the jukebox (replaces Moving Earth on the shelf), with the synchronized feedback channels.
3. Three.js jukebox stage for choosing and playing records.
4. Shelf clean-up (remove Moving Earth, the duplicate records and the legacy entry), docs, tests.
5. Full check, draft PR, production deploy, live verification.
