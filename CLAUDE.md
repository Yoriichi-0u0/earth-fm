# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**TerraJuke — The Earth Information Jukebox** (called Earth FM until 13 November 2026) is Team BoboMimi's entry for the NASA Space Apps 2026 challenge *The Earth Information Jukebox*. This repository is the judged submission; production is https://terrajuke.vercel.app (Vercel project `terrajuke`, team `chia-0u0-s-projects`). Team: Chia Yuen Kai (leader) and Jacy Chiong Yet Suu.

The challenge: pair NASA Earth Information Center (EIC) visual frames with sonification generated in real time, let people select a visualization alongside its soundscape, make it accessible (screen readers, tactile feedback, rich description), balance data with musicality, and tell the story. [docs/TERRAJUKE-3-DECISIONS.md](docs/TERRAJUKE-3-DECISIONS.md) audits every feature against it; [docs/NASA-PUBLISHED-RESOURCE-ALIGNMENT.md](docs/NASA-PUBLISHED-RESOURCE-ALIGNMENT.md) maps the official Resources list.

## Working rules

- Development is the user (Chia Yuen Kai, team leader) and Claude only: no ChatGPT/Codex agents and no external code review. Work autonomously end to end: branch, implement, test, commit, push, open the pull request, merge and deploy. Stop only for steps that need the user in person (for example testing with real screen readers or people, recording a demo, uploading to the Space Apps portal, account or billing settings) and flag those clearly.
- Work on a branch (`claude/<topic>`) with a pull request. Merging to `main` deploys production automatically, so merge only when `npm run check` passes, then verify the live site (`PLAYWRIGHT_BASE_URL=https://terrajuke.vercel.app npm run test:e2e` and a look at the changed pages). If production breaks, roll back or fix forward immediately. Branch and preview deployments are disabled in `vercel.json`; keep it that way.
- When documents disagree with each other, with the code, or with what the user says, ask the user rather than picking one. Several docs are dated research records and can be stale.
- Use **TerraJuke** for display names and `terrajuke` for package, file and storage slugs. Browser storage uses `terrajuke-*` keys and still reads the matching `earth-fm-*` key as a fallback (`src/lib/appearance.ts`, `index.html`, `src/App.tsx`); keep the fallback. `?legacy=1` is the original Earth FM app and keeps that name, as do dated research records.
- Keep credentials and local Vercel/Supabase state (`.vercel/`, `.env*`, `supabase/.temp/`) out of Git.

## Scientific honesty (non-negotiable)

The project's credibility rests on these; reviewers check them.

- Pixels are never presented as measurements. Visual sound is labelled as rendered colour or brightness; measurement sound uses the real observation values on a **fixed** scale (style, tone and tempo never rescale pitch).
- No generated, interpolated or fictional observations. Data and imagery are pinned snapshots with source URL, retrieval date and SHA-256 in a provenance JSON next to the asset (`public/data/`, `public/frames/`, `public/nasa/svs5313/`, `public/art/`).
- Do not claim learning gains, user-study results or accessibility certification; none have been collected.
- A new record needs provenance, deterministic mapping rules, unit tests and a stated-limits section before it goes on the shelf.

## Commands

Node.js 22.12+ or 24. Run `npm ci` once per checkout; `npx playwright install chromium` if there is no system Chromium.

```sh
npm run dev            # Vite on 0.0.0.0:5173
npm run build          # tsc -b (type check) then vite build → dist/
npm run test           # unit tests: tsx --test tests/*.test.ts (node:test + node:assert)
npm run test:e2e       # Playwright, Chromium: full suite against a production build
npm run test:e2e:quick # the same without @full matrix and long-audio tests
npm run check          # test + build + test:e2e — run before asking for review
npm run data:refresh   # verify source hashes and rebuild bundled observation data
```

Single tests:

```sh
npx tsx --test tests/nightLights.decade.test.ts
npx tsx --test --test-name-pattern="legend" tests/nightLights.legend.test.ts
npx playwright test tests/nightLights.e2e.spec.ts -g "Mystery Place"
npx playwright test --last-failed --workers=1
```

There is no linter; `tsc -b` in `npm run build` is the type check.

Playwright notes:
- The main `chromium` project tests a **production build** served by `vite preview` on port 4180 (built automatically by the web server). Tests tagged `@dev` import `/src` modules and run in a `chromium-dev` project against the dev server on 5173. Tag any new test that imports `/src` with `{tag:'@dev'}`.
- `npm run test:e2e:quick` (`E2E_QUICK=1`) skips `@full` tests: viewport/theme matrices and long real-time performances. Use it while iterating; `npm run check` runs everything before merging. Tag new matrix or long-audio tests `{tag:'@full'}`.
- `npm run test:e2e` runs `scripts/e2e.mjs`: phase 1 runs everything except `@timing` on 4 workers; phase 2 runs the load-sensitive `@timing` tests (takes, replays, touch gestures, animation timing) on 2 workers with one retry; a pass on retry is reported as flaky. Reports go to `playwright-report/main` and `playwright-report/timing`. Tag a new test `@timing` if it measures real-time playback or a gesture and can be starved by a busy machine. Plain `npx playwright test …` still works for single files.
- Every `*.e2e.spec.ts` file is picked up automatically.
- Chromium renders Web Audio to a fake output stream (`--disable-audio-output`), so tests make no sound and parallel browsers don't queue for the audio device. `PLAYWRIGHT_AUDIO=1` restores real output.
- Audio-timing tests can fail when the machine is busy (other dev servers, image processing). Rerun failures with `--last-failed --workers=1` before treating them as real.
- `PLAYWRIGHT_BASE_URL=https://terrajuke.vercel.app npm run test:e2e` tests production; `@dev` tests skip themselves there. `PLAYWRIGHT_DEVICES=1` adds emulated WebKit/Android projects, `PLAYWRIGHT_BRANDS=1` the installed Chrome and Edge.

## Architecture

React 19 + Vite + TypeScript, no backend. Everything (sound synthesis via Web Audio, image analysis via canvas, data) runs in the browser; there are no runtime network requests for data. Supabase is linked but unused by the app.

**Entry and routing.** `src/main.tsx` picks the legacy Earth FM app (`src/App.tsx`, when `isLegacyEntry()` in `src/lib/entry.ts` sees `?legacy=1` or old anchors/query params) or the modern app (`src/components/SymphonyStudio.tsx`). The modern app is a hand-rolled router (`src/lib/studioRouter.ts`, History API) over five pages: Home `/` (the jukebox, `JukeboxHome`), Listen, Create, Explore Data, About. Each path also needs a rewrite in `vercel.json`.

**The record model.** `src/data/jukeboxRecords.ts` is the shelf. A record is `kind: 'visual'` (Side A scans image or video pixels; Climate Spiral also has a Side B of GISTEMP measurements) or `kind: 'data'`. `mystery: false` excludes it from Mystery Record. `JukeboxHome.tsx` owns record selection and the deck; heavy views are lazy-loaded (`NightLightsDeck`, `JukeboxStage` 3D shelf, `EarthGlobe`, `MysteryRecord`, `ClimateCoil`).

**Sound engines** (separate on purpose, each with its own mapping):
- `src/lib/imageSonification.ts` + `useVisualTransport.ts`: the 48-strip left-to-right pixel scan (brightness → pitch, RGB → timbre, position → pan), resampling video frames at each note's scheduling boundary.
- `src/lib/climateMapping.ts`, `symphony.ts`, `useSequenceTransport.ts`: measurement melodies on fixed ten-band pitch scales (`PROFILE` in `symphony.ts`); Create's styles and timbres are layered on top.
- `src/lib/audio.ts` (`EarthAudio`): the legacy app's engine.
- `src/lib/air/` + `AirEngine`: The Air We Share, a four-track aerosol score (one Web Audio track gain per aerosol for live Mute/Solo) with a lookahead scheduler; see [docs/AIR.md](docs/AIR.md).
- `src/lib/nightLights/`: framework-free Night Lights science (legend reading in OKLab, frozen masks, cell analysis, decade measure, sound rules, Mystery Place), wrapped by `useNightLightsModel.ts` and `NightLightsDeck.tsx`. See [docs/NIGHT-LIGHTS.md](docs/NIGHT-LIGHTS.md).

**Motion.** Anime.js (`animejs` 4.5) drives the mixer meters and the Record Journey (`RecordJourney.tsx`, data in `src/data/journeys.ts`); Three.js via react-three-fiber drives the jukebox stage, the vinyl, the Climate Coil and the aerosol globe. Every animation is off under reduced motion, and 3D always has a 2D fallback.

**Jukebox Show.** `JukeboxHome` owns the running order and wraps the player in `ShowContext` (`src/lib/showMode.tsx`). `DeckConsole` presses its own Play once per cue when the deck is ready and reports a natural finish (`completed`) or an early stop; stopping a show remounts the deck (`deckEpoch` in its key) so each deck's own cleanup silences it. New decks get show mode for free if they report `ready`, `playing` and `completed` accurately.

**Presentation never drives audio.** The audio clock is the source of truth. Players expose a read-only `RecordSignal`/`NoteEvent` (`src/lib/recordSignal.ts`) that visuals (Grooveprint, the vinyl, the Three.js coil and stage) follow; `announceDeck()` in `src/lib/deckEvents.ts` broadcasts play/stop to the 3D jukebox via a window event. Keep that direction: rendering must not schedule or alter sound.

**Language and appearance.** The interface is English only (Simplified Chinese was removed on 14 Nov 2026). UI text still goes through `t()` from `useStudioLanguage()`, which returns the English text, so keep using it for visible copy. Appearance (Auto/Light/Dark) is a segmented button control (`AppearanceSelector`); it is resolved before paint by the inline script in `index.html` and then by `AppearanceProvider`; both must use the same storage keys.

**Data pipeline.** `scripts/refresh-data.mjs` rebuilds `public/data/observations.json` deterministically from hashed source snapshots; `scripts/build-climate-spiral.ts` builds `src/data/climateSpiral.json`; `scripts/nightlights-*` reproduce the SVS 5313 decade frames and the SVS 5276 cross-check in `validation/`. `research/` holds standalone lab prototypes (Pacific SST maps) that are not part of the app build.

## Code style

Existing components and libraries are written in a dense style (many statements per line, short names). Match the surrounding file rather than reformatting it, and keep diffs focused.

## Documentation

`docs/` mixes current references (CONNECTIONS, DEPLOYMENT, DATA, FRAMES, SONIFICATION, NIGHT-LIGHTS, TERRAJUKE-*) with dated milestone and research records. Update the current references when behaviour changes; leave dated records as historical evidence. [docs/SUBMISSION.md](docs/SUBMISSION.md) is the submission draft and must match what the live app does.
