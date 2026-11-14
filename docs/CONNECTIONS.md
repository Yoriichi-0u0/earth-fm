# TerraJuke connections

Use **TerraJuke** for display names and `terrajuke` for package, file and storage slugs. Until 13 November 2026 the project was called Earth FM; some hosted identifiers keep that history, as listed below.

| Service | Connected project |
| --- | --- |
| GitHub | [Yoriichi-0u0/TerraJuke-The-Earth-Information-Jukebox](https://github.com/Yoriichi-0u0/TerraJuke-The-Earth-Information-Jukebox) |
| Production branch | [`main`](https://github.com/Yoriichi-0u0/TerraJuke-The-Earth-Information-Jukebox/tree/main) |
| Live website | [terrajuke.vercel.app](https://terrajuke.vercel.app/). `earth-fm.vercel.app` remains an alias of the same project. |
| Vercel | [terrajuke](https://vercel.com/chia-0u0-s-projects/terrajuke), team `chia-0u0-s-projects` |
| Supabase | [Hosted project `jycymoxtfbuxzmpeaykj`](https://supabase.com/dashboard/project/jycymoxtfbuxzmpeaykj), organization **Chia's Project**, Singapore. It was created as "Earth FM"; its dashboard name changes only in Supabase. |
| In-event repository | `Yoriichi-0u0/TerraJuke-SpaceApps-2026`, where the Night Lights science was first written during the event; ported into this repository. This repository is the submission. |

The GitHub repository was renamed from `The-Earth-Information-Jukebox` to `earth-fm`, then to `TerraJuke-The-Earth-Information-Jukebox`. GitHub redirects the old URLs, so older links in commit history and research notes still resolve. Point local remotes at the current URL:

```sh
git remote set-url origin https://github.com/Yoriichi-0u0/TerraJuke-The-Earth-Information-Jukebox.git
```

Day-to-day work happens on branches with draft pull requests; only `main` deploys. See [CLAUDE.md](../CLAUDE.md).

## Terminal tools

Use Git, Node.js 22.12+ or 24 LTS with npm, and the GitHub CLI. The Vercel CLI (`npm i -g vercel`) and Supabase CLI are optional: install them on the machine that needs them. Then verify:

```sh
git remote -v
gh auth status
vercel whoami
vercel project inspect --non-interactive
supabase projects list
```

Run `npm ci` once per checkout. `npx playwright install chromium` provides the browser for `npm run test:e2e` when no system Chromium is present.

## Local and hosted configuration

Vercel's ignored `.vercel/project.json` links this checkout to project `prj_e445P1uqWj2tc6rnTcdv8RrS39EV` (`terrajuke`), team `team_oxm1CmX4JrCJZnCmghrYwsLv`. Run `vercel link --project terrajuke --scope chia-0u0-s-projects` to recreate it. The project uses Vite, Node.js 24, `npm ci`, `npm run build`, and output directory `dist`. Its production Git branch is `main`. Preview deployments are disabled in the project settings, and `vercel.json` permits automatic Git deployments only from `main`.

Supabase's local configuration is `supabase/config.toml`, with `project_id = "terrajuke"`. That value only names the local development stack. The ignored `supabase/.temp/project-ref` links to hosted project `jycymoxtfbuxzmpeaykj` in `ap-southeast-1`.

The ignored `.env.local` holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The two public Supabase variables are configured for Vercel's production environment only. `.env.example` documents the variable names without a real key. Never commit platform tokens, database passwords, or Supabase secret keys.

The app runs entirely in the browser and does not use Supabase yet. The hosted database and credentials are ready for future backend work; connecting them added no tables and changed no application behavior.

## Browser storage

The app stores two preferences in the visitor's browser: `terrajuke-appearance` and `terrajuke-saved` (favourites in the original app). When a TerraJuke key is empty, the app reads the matching `earth-fm-*` key, so visitors from the Earth FM period keep their choices. The language preference keys (`terrajuke-studio-language`, `earth-fm-studio-language`) are no longer read: the interface is English only.

Use [DEPLOYMENT.md](DEPLOYMENT.md) for hosting and verification commands.
