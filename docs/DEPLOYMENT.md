# Earth FM production deployment

Live website: [earth-fm.vercel.app](https://earth-fm.vercel.app/).

Earth FM uses a single branch and deployment workflow: **`main` → Vercel production**. All code and setup remain on `main`. Preview deployments are disabled, and `vercel.json` permits automatic Git deployments only from `main`. Test suites and testing pipelines are not part of this workflow.

The connected [Vercel project `earth-fm`](https://vercel.com/chia-0u0-s-projects/earth-fm) uses GitHub repository `Yoriichi-0u0/earth-fm`, production branch `main`, and the repository root. Build settings are Node.js 24, install command `npm ci`, build command `npm run build`, and output directory `dist`.

## Publish through GitHub

Commit changes directly to `main`, then push:

```sh
git switch main
git add <changed-files>
git commit -m "Describe the change"
git push origin main
```

The connected Vercel build publishes the production website automatically. There is no separate preview, staging, or testing step.

## Explicit terminal deployment

From this linked checkout on `main`:

```sh
vercel project inspect --non-interactive
vercel deploy --prod --yes --scope chia-0u0-s-projects
```

Production builds run `npm run build`. The static sonification application processes data, audio, and uploads in the browser. Supabase is connected for future backend work, with public configuration scoped to Vercel production; see [CONNECTIONS.md](CONNECTIONS.md).

Keep the production website URL in `docs/SUBMISSION.md` for the Space Apps submission.
