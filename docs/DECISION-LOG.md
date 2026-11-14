# Decision log

Product, science and process decisions, newest first. Each entry says who decided, why, and what it rules out.
Treat entries as settled: do not re-ask unless new facts contradict them (then add a new entry; never rewrite old ones).
Earlier decisions live in dated docs such as [TERRAJUKE-3-DECISIONS.md](TERRAJUKE-3-DECISIONS.md) and
[TEAM-HANDOFF.md](TEAM-HANDOFF.md).

## 2026-11-14 23:20 · Keep a changelog and cut releases
- **Decided by:** Jacy (request in chat).
- **What:** [CHANGELOG.md](../CHANGELOG.md), release notes in [releases/](releases/), this log and GitHub releases
  (`v7.0.0` onwards) are the project's shared memory. Every PR adds to `[Unreleased]`; every app-changing merge to
  `main` is tagged and released. See CLAUDE.md, "Change records".
- **Why:** several people and AI sessions work on the repo; they must be able to rely on written records.

## 2026-11-14 23:10 · Record 06 is rebuilt from NASA SVS 5046 (2024)
- **Decided by:** Jacy's Claude; Jacy was offered SVS 5046 or SVS 3167 and left the choice to Claude.
- **What:** the new Arctic record uses *Daily Arctic Sea Ice, By Year* (SVS 5046, Trent L. Schindler, an EIC daily
  visualization): JAXA AMSR2 sea ice drawn where concentration ≥ 15 %, twelve frames (the 15th of each month of 2024).
- **Why:** current data, EIC relevance and 4K imagery. It has no numeric colour bar, but NASA's ≥ 15 % threshold is
  the standard definition of sea-ice extent, and NASA's own RenderMan camera matrices (in every EXR frame) let each
  pixel be mapped to a latitude, longitude and area. SVS 3167 had a printed concentration scale but only
  600×200 frames ending in 2004.
- **Rules out:** any further use of the project-derived NSIDC September means in the jukebox shelf.
- **Jacy's requirement:** every sound must come from the NASA source itself, not from remixes built earlier, and
  each record must explain its sound with 5W1H (what, who, when, where, why, how).

## 2026-11-14 22:50 · Merge and deploy the two-page redesign (7.0.0)
- **Decided by:** Jacy ("Merge and deploy").
- **What:** Home is the introduction and guide; Listen holds every player.

## 2026-11-14 21:30 · Two pages first, then sources
- **Decided by:** Jacy.
- **What:** redesign Home (introduction plus eye guidance) and Listen (all players) before the record rebuilds;
  then verify every source is truly NASA. "Eye guidance" was left to Claude: a moving spotlight guide, not webcam
  eye tracking. User-friendliness and device compatibility are part of every page change.

## 2026-11-14 21:10 · This repository is the submission
- **Decided by:** Jacy ("follow the GitHub main latest update").
- **What:** an earlier organiser ruling about pre-existing work is resolved; `main` of this repository is judged.
