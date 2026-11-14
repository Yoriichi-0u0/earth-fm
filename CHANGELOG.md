# Changelog

All notable changes to TerraJuke (called Earth FM until 13 November 2026) are recorded here, newest first.
This file, [docs/releases/](docs/releases/) and [docs/DECISION-LOG.md](docs/DECISION-LOG.md) are the project's
authoritative record. A person or AI joining the project can rely on them without asking again; if they ever
disagree with the code or the live site, the code and the live site win and the record must be corrected.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions: `MAJOR` = a new TerraJuke edition
(a new record or a new page structure), `MINOR` = new features within an edition, `PATCH` = fixes, tests and docs.
Versions before 7.0.0 were numbered retroactively on 14 November 2026 from the merge history; only 7.0.0 onwards
have git tags and GitHub releases. Times are MYT (UTC+8). How to cut a release: [docs/releases/README.md](docs/releases/README.md).

## [Unreleased]

## [8.0.0] - 2026-11-15 00:46 · PRs #29, #30 · live

The Ice Year, About this sound, and the Sound setting. Production: https://terrajuke.vercel.app, merge `208d678`,
bundle `index-CFCACNwB.js`. Notes: [docs/releases/v8.0.0.md](docs/releases/v8.0.0.md).

### Added
- Record 06 **The Ice Year** from NASA SVS 5046 (*Daily Arctic Sea Ice*, JAXA AMSR2, 2024), replacing the
  NSIDC-derived *Arctic September*. Side A: twelve months, the ice area NASA drew north of 50°N (measured through
  NASA's own RenderMan camera) sets pitch: 13.6 million km² in March to 3.9 in September. Side B: touch or arrow-key
  any Arctic place to hear its ice season. [docs/ARCTIC-ICE.md](docs/ARCTIC-ICE.md).
- **Sound: Note by note or Continuous** under Play on every record (remembered on the device). Note by note
  strikes each value as its own note (• • •); Continuous joins them into one line that glides from value to value
  (━━━), with rests where there is no value. Pitches, timing, loudness and stereo still come from each record's fixed
  rules; only how notes join changes. Applies from the next Play; single taps and Scratch always strike.
- **About this sound (5W1H)** under every record: What, Who, When, Where, Why and How, from each record's
  provenance (`src/data/soundStories.ts`).

### Removed
- *Arctic September* from the shelf, the jukebox data deck and Mystery Record (Mystery now draws from Climate Spiral,
  Moving Earth and Temperature Through Time). The NSIDC series stays only in the Arctic guided story.

## [7.0.1] - 2026-11-14 23:22 · PR #28 · docs only

### Added
- Change records: this changelog, release notes in `docs/releases/`, the decision log, and
  [docs/SOURCE-VERIFICATION.md](docs/SOURCE-VERIFICATION.md) (all seven records checked on 14 Nov 2026).
- CLAUDE.md rule: every pull request updates `[Unreleased]`; every merge to `main` that changes the app cuts a release.

## [7.0.0] - 2026-11-14 22:58 · PR #27

Two-page redesign. Production: https://terrajuke.vercel.app, merge `8ec8e34`, bundle `index-MnTVyrhU.js`.
Notes: [docs/releases/v7.0.0.md](docs/releases/v7.0.0.md).

### Changed
- Home (`/`) is an introduction instead of a player: what TerraJuke does for the challenge, a "follow the light"
  guide (a glowing dot moves across a drawn player: choose, play, follow the scan, explore by hand), the two kinds
  of sound, and the seven-record shelf linking to `/listen?record=<id>`.
- Listen (`/listen`) is the jukebox with every player. `?station=climate|arctic` and `?visual=motion` still open the
  guided stories.

### Added
- **Guide me** on Listen (and `/listen?guide=1`): a spotlight on the real controls, one at a time; silent, skips
  hidden controls, Escape closes and returns focus.
- `tests/home.e2e.spec.ts`: 7 screens × light/dark (no sideways scroll, ≥44 px targets, axe), also in the opt-in
  emulated WebKit/Android projects.

### Removed
- The station directory (`/listen?station=all` now shows the jukebox), `StudioWelcome`, `StationLibrary`.

### Fixed
- "Guide me" hidden on phones by an older rule; landscape tour never auto-played; guide card off-screen at 320 px.

## [6.0.1] - 2026-11-14 22:19 · PRs #24, #25, #26

### Added
- Currents of Heat responsive and accessibility test, 320–1440 px (#24).
- [docs/TEAM-HANDOFF.md](docs/TEAM-HANDOFF.md): Jacy's Claude takes over; tasks and two-session rules (#25, #26).

## [6.0.0] - 2026-11-14 20:25 · PR #23 · "TerraJuke 6"

### Added
- Record 04 **Currents of Heat** from NASA SVS 3912 (ECCO2): temperature read from NASA's 0–32 °C colour bar,
  pole to pole on Side A, touch the ocean on Side B. [docs/OCEAN.md](docs/OCEAN.md).

### Changed
- The 3D record rack loads when the page is idle, and not at all under Save-Data.

## [5.0.0] - 2026-11-14 19:30 · PR #22 · "TerraJuke 5"

### Added
- **Play the whole jukebox** (Jukebox Show): every record in turn with title cards, announcements and a show bar.
- **Meet the four instruments** on The Air We Share.

## [4.0.1] - 2026-11-14 19:17 · PR #21

### Changed
- Browser tests run against a production build in two phases (`@timing` tests gentler); quick mode; silent audio.

### Fixed
- Earth Looper replay no longer aborts on a single late note (threshold 120 → 500 ms).

## [4.0.0] - 2026-11-14 18:06 · PR #20 · "TerraJuke 4"

### Added
- Record 03 **The Air We Share** from NASA SVS 5669 (GEOS aerosols): four aerosols, four instruments, a turning
  Three.js Earth, NASA's six stories on Side B. [docs/AIR.md](docs/AIR.md).
- **Record Journey** strip ("from orbit to your ears"); new TerraJuke icon (AI artwork, credited).

### Changed
- Appearance is a segmented Auto · Light · Dark control.

### Removed
- Simplified Chinese; the interface is English only.

## [3.1.0] - 2026-11-14 17:06 · PR #19

### Changed
- Renamed Earth FM → TerraJuke (display names, package, storage keys with `earth-fm-*` fallback); CLAUDE.md replaces AGENTS.md.

## [3.0.0] - 2026-11-14 16:24 · PR #18 · "TerraJuke 3"

### Added
- Record 02 **Night Lights** from NASA SVS 5313 (EIC Version): change map on Side A, NASA's twelve yearly frames
  on Side B, Mystery Place, SVS 5276 cross-check. [docs/NIGHT-LIGHTS.md](docs/NIGHT-LIGHTS.md).
- Tempo and meter as labelled musical choices; the Three.js 3D jukebox stage. (Stack #8–#17 included.)

## [2.2.0] - 2026-11-08 · Earth FM Jukebox Day and Night
- Jukebox layout with day and night appearance; final visual polish.

## [2.1.0] - 2026-11-02 · Earth FM five pages
- Five pages (Home, Listen, Create, Explore Data, About), NASA observatory visuals, guided learning, Earth Stations
  with Arctic listening.

## [2.0.0] - 2026-11-01 · Earth Symphony Studio beta
- Selectable tones, unified visual and climate listening, English/Chinese interface.

## [1.0.0] - 2026-10-14 · Earth FM
- First visual and climate sonification, connected to GitHub and Vercel; `main` is the single production branch.

[Unreleased]: https://github.com/Yoriichi-0u0/TerraJuke-The-Earth-Information-Jukebox/compare/v8.0.0...main
[8.0.0]: https://github.com/Yoriichi-0u0/TerraJuke-The-Earth-Information-Jukebox/releases/tag/v8.0.0
[7.0.0]: https://github.com/Yoriichi-0u0/TerraJuke-The-Earth-Information-Jukebox/releases/tag/v7.0.0
