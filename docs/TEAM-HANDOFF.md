# Team handoff: Jacy's Claude takes over (14–15 November 2026)

Chia's Claude session is pausing to save tokens. From now until submission, **Jacy (Jacy Chiong Yet Suu) and her Claude Code own the repository**. Read [CLAUDE.md](../CLAUDE.md) first; every rule there still applies.

## Where things stand

- `main` = production, https://terrajuke.vercel.app. Merging a PR to `main` deploys automatically (Vercel Git integration, project `terrajuke`); no Vercel login is needed to ship.
- Seven records on the shelf: 01 Climate Spiral, 02 Night Lights, 03 The Air We Share, 04 Currents of Heat, 05 Moving Earth, 06 Arctic September, 07 Temperature Through Time. Plus Jukebox Show ("Play the whole jukebox"), Record Journey, Mystery Record, Create, Explore Data, About.
- `npm run check` was green at this handoff (128 unit, 154 browser tests). Last feature PR: #23 Currents of Heat.
- **No new records beyond task 1.** Any record needs provenance, fixed mapping rules, unit tests and stated limits before it goes on the shelf. Apart from the two rebuilds in task 1, fix bugs and polish only.

## Rules for two Claudes on one repo

1. Only one session merges to `main` at a time. Chia's session will not push until Chia says Jacy is done.
2. Always `git pull` on `main` before branching; one branch per task (`claude/<topic>`), one PR each.
3. Before merging: `npm run check` passes. After merging: `PLAYWRIGHT_BASE_URL=https://terrajuke.vercel.app npm run test:e2e:quick` and look at the changed page. If production breaks, revert the merge commit at once.
4. Scientific honesty is non-negotiable: no claims of user studies, learning gains or accessibility certification; pixels are never called measurements.
5. If two documents disagree, or a doc disagrees with the live app, ask Jacy or Chia; don't pick one.
6. **Review by Chia's Claude.** Every PR description ends with a review summary: what changed and why, files touched, test results (`npm run check` counts), the NASA source and its provenance for any record, and anything not verified. Chia passes it to their Claude for review. Task 1 PRs (record rebuilds) wait for that review before merging; docs-only and small-fix PRs may merge first and be reviewed after.

## Setup (once)

```sh
git clone https://github.com/Yoriichi-0u0/TerraJuke-The-Earth-Information-Jukebox.git terrajuke
cd terrajuke && npm ci && npx playwright install chromium
npm run dev    # http://localhost:5173
```

Jacy's GitHub account needs write access to the repository (Chia: Settings → Collaborators).

## Tasks, in order

### 1. Rebuild records 06 and 07 from original NASA sources (Chia's decision, 14 Nov)

Arctic September (06) and Temperature Through Time (07) are *data remixes*: 06 plays project-derived NSIDC means, and 07 replays the GISTEMP numbers that Climate Spiral's Side B already plays. Neither has an original NASA EIC/SVS visual. Chia wants every record to come from an original NASA source, built the way the newest records are.

Replace each with a record built like **The Air We Share** (`src/lib/air/`, `AirDeck`, [AIR.md](AIR.md)) and **Currents of Heat** (`src/lib/ocean/`, `OceanDeck`, [OCEAN.md](OCEAN.md)). Read those two first and copy their structure:
- **Source:** a NASA visualization from the challenge Resources or the EIC content database ([NASA-PUBLISHED-RESOURCE-ALIGNMENT.md](NASA-PUBLISHED-RESOURCE-ALIGNMENT.md), [NASA-RESOURCE-DISCOVERY-2026-11.md](NASA-RESOURCE-DISCOVERY-2026-11.md)). Keep the themes (Arctic sea ice; global temperature) if a suitable SVS visual with a numeric colour bar or legend exists; otherwise propose a different source to Chia before building. Prefer a still or a short frame series with a printed numeric scale, so values can be read back from colour (as Ocean does).
- **Provenance:** pin the file(s) in `public/nasa/svs<ID>/` with source URL, retrieval date and SHA-256 in `provenance.json` (if svs.gsfc.nasa.gov times out, the Internet Archive `id_` raw capture of the same URL works; record that).
- **Science:** a framework-free `src/lib/<name>/` (analyse, sonify with a fixed scale, describe), unit tests that check the readings against known physical facts, and a doc `docs/<NAME>.md` with a stated-limits section. Values read from colour are "as rendered by NASA", never "measurements".
- **Deck:** Side A plays the whole picture; Side B lets people touch or arrow-key to a place and hear and read its value. Captions and an `aria-live` announcer for every note; works with reduced motion and has a 2D fallback; reports `ready`, `playing` and `completed` so Jukebox Show works.
- **Wire-up:** `src/data/jukeboxRecords.ts` (keep numbers 06 and 07; `mystery:false` unless Mystery Record supports it), `src/data/journeys.ts`, lazy-load in `JukeboxHome.tsx`, e2e tests (desktop + phone, light + dark, axe), then update SUBMISSION.md, README, About copy and test counts.
- Remove the old 06/07 code, tests and data only once the replacement passes `npm run check`. Never leave the live shelf with a broken or empty slot: ship each rebuild as its own PR.

Do 06 first, merge and verify live, then 07. If time runs short, finish one properly rather than two halfway, and tell Chia.

### 2. Demo video kit (Claude prepares, people record)

Record after task 1 lands, so the shelf in the video is final. Script: the **90-second demo** section of [SUBMISSION.md](SUBMISSION.md). Check the current Space Apps rules for video length and format before cutting it.

Claude can make, in `docs/video/` (or a scratch folder, not shipped):
- a shot list with exact clicks, URLs and timings for each beat, checked against the live site;
- narration text and an `.srt` caption file timed to the script;
- title and end cards (TerraJuke name, team BoboMimi, "NASA Space Apps 2026", the NASA-is-not-an-endorser line from Credits).

**Manual:** the screen recording must be done by a person with real audio (QuickTime or OBS, system audio on), because test browsers render audio silently. Record at 1920×1080, dark appearance, browser zoom 100%, notifications off.

Done when: shot list and captions match a dry run on the live site, and every claim in the narration matches what the app does.

### 3. Submission text final pass

- Re-read [SUBMISSION.md](SUBMISSION.md) against the live app, record by record. Fix any mismatch in the doc (or the app, if it is a bug).
- Draft the portal fields (project summary, how it addresses the challenge, NASA data used, tools, AI-use disclosure) into `docs/PORTAL-DRAFT.md`, taken from SUBMISSION.md and [NASA-PUBLISHED-RESOURCE-ALIGNMENT.md](NASA-PUBLISHED-RESOURCE-ALIGNMENT.md). Check the portal's current field list and AI-disclosure rule on the official Space Apps site.
- Update test counts in SUBMISSION.md if they change.

**Manual:** uploading to the Space Apps portal and pressing Submit.

### 4. Live QA sweep

On https://terrajuke.vercel.app, desktop and a real phone, light and dark, and with reduced motion on:
- every record: Play, Stop, Side B, keyboard control, captions update;
- Jukebox Show plays through and Stop/Escape silences it;
- Create, Explore Data, About, Mystery Record, `?legacy=1`.

Log findings in `docs/evidence/qa-2026-11-15.md` (date, device, browser, steps, result). Fix small bugs on a branch with a test; leave risky ones listed for Chia.

### 5. Screen reader check (manual, people)

VoiceOver (macOS and iPhone) and, if a Windows machine is available, NVDA. Follow [USER_TEST_PROTOCOL.md](USER_TEST_PROTOCOL.md). Record what was tried and what happened in `docs/evidence/`. This is a check, not a certification; do not describe it as a user study unless it was run as one.

### 6. Only if time is left

Small polish found in task 4 (copy, spacing, a slow first load on phones). No new dependencies, no new records.

## Prompt to paste into Jacy's Claude Code

> Read CLAUDE.md and docs/TEAM-HANDOFF.md in this repository. You are continuing TerraJuke for NASA Space Apps 2026 with Jacy. Work through the handoff tasks in order, one branch and PR per task, following every rule in both files. Start with task 1 (rebuilding records 06 and 07 from NASA sources); if a person is free to help, task 2 (the video kit) can run in a second session that touches only docs. Stop and ask me for anything that needs a person: recording, real devices, screen readers, the Space Apps portal, or account settings.
