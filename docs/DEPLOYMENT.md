# TerraJuke production deployment

Live website: [terrajuke.vercel.app](https://terrajuke.vercel.app/). `earth-fm.vercel.app` is an alias of the same Vercel project.

Home (`/`) is the jukebox. Listen, Create, Explore Data and About have their own routes (`/listen`, `/create`, `/data`, `/about`); exact static rewrites in `vercel.json` support a direct refresh while preserving `/data/…` source files. English is the default, with an optional persistent Simplified Chinese choice. The original Earth FM app remains at `?legacy=1`, with old anchors and shared-mix links preserved.

TerraJuke has one production workflow: **`main` → Vercel production**. Preview deployments are disabled, and `vercel.json` permits automatic Git deployments only from `main`.

The connected [Vercel project `terrajuke`](https://vercel.com/chia-0u0-s-projects/terrajuke) builds GitHub repository `Yoriichi-0u0/TerraJuke-The-Earth-Information-Jukebox`, production branch `main`, from the repository root. Build settings are Node.js 24, install command `npm ci`, build command `npm run build`, and output directory `dist`.

## Publish through GitHub

1. Work on a branch and open a draft pull request early (see [CLAUDE.md](../CLAUDE.md)).
2. Run `npm run check` (unit tests, build and the Playwright suite) and make sure it passes.
3. Merge to `main`, then verify the live site (below).

The push to `main` triggers the Vercel production build automatically. There is no separate preview or staging step.

## Explicit terminal deployment

From this linked checkout on `main`, when a Git-triggered build needs repeating:

```sh
vercel project inspect --non-interactive
vercel deploy --prod --yes --scope chia-0u0-s-projects
```

## Verify the live site

Run the Playwright suite against production. Tests that import from `/src` skip themselves on a deployed URL.

```sh
PLAYWRIGHT_BASE_URL=https://terrajuke.vercel.app npm run test:e2e
```

Production builds run `npm run build`. The static sonification app processes data, audio and uploads in the browser. Supabase is connected for future backend work, with public configuration scoped to Vercel production; see [CONNECTIONS.md](CONNECTIONS.md).

Keep the production website URL in `docs/SUBMISSION.md` for the Space Apps submission.
