# Earth FM connections

Use **Earth FM** for display names and `earth-fm` for package and service slugs.

| Service | Connected project |
| --- | --- |
| GitHub | [Yoriichi-0u0/earth-fm](https://github.com/Yoriichi-0u0/earth-fm) |
| App branch | [`codex/earth-fm-bobomimi`](https://github.com/Yoriichi-0u0/earth-fm/tree/codex/earth-fm-bobomimi) |
| Live website | [earth-fm.vercel.app](https://earth-fm.vercel.app/) |
| Vercel | [earth-fm](https://vercel.com/chia-0u0-s-projects/earth-fm), team `chia-0u0-s-projects` |
| Supabase | [Earth FM](https://supabase.com/dashboard/project/jycymoxtfbuxzmpeaykj), organization **Chia's Project**, Singapore |

The GitHub repository was renamed from `The-Earth-Information-Jukebox` to `earth-fm`. The local Git remote uses the new URL. The application is on `codex/earth-fm-bobomimi`; `main` currently contains the original README.

## Installed terminal tools

Git 2.53.0, Node.js 24.21.0 with npm 11.19.0, GitHub CLI 2.102.0, Vercel CLI 64.0.2, and Supabase CLI 2.120.0 are installed in `~/.local/bin`. The path is added to `~/.zshrc`. Application dependencies and Playwright Chromium are also installed.

Open a new terminal, or run `source ~/.zshrc` in an existing zsh terminal, then verify:

```sh
git remote -v
gh auth status
vercel whoami
vercel project inspect --non-interactive
supabase whoami
supabase projects list
```

## Local and hosted configuration

Vercel's ignored `.vercel/project.json` links this checkout to project `prj_e445P1uqWj2tc6rnTcdv8RrS39EV`, team `team_oxm1CmX4JrCJZnCmghrYwsLv`. The project uses Vite, Node.js 24, `npm ci`, `npm run build`, and output directory `dist`. Its production Git branch is `codex/earth-fm-bobomimi`.

Supabase's local configuration is `supabase/config.toml`, with `project_id = "earth-fm"`. The ignored `supabase/.temp/project-ref` links to hosted project `jycymoxtfbuxzmpeaykj` in `ap-southeast-1`.

The ignored `.env.local` contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, alongside Vercel's local authentication variables. The two public Supabase variables are also configured for Vercel's development, preview, and production environments. `.env.example` documents the application variable names without a real key. Never commit platform tokens, database passwords, or Supabase secret keys.

The current sonification application runs entirely in the browser and does not consume Supabase yet. The hosted database and credentials are ready for future backend work; connecting them did not add database tables or change application behavior.

Use [DEPLOYMENT.md](DEPLOYMENT.md) for hosting and verification commands.
