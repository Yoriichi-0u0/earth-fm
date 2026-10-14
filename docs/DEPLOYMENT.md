# Deploy Earth FM to Vercel

The production site is static. `vercel.json` selects Vite, runs `npm run build`, and serves `dist`. No Supabase project, API key, or runtime environment variable is needed.

The checkout is linked to [Vercel project `earth-fm`](https://vercel.com/chia-0u0-s-projects/earth-fm). GitHub is connected as `Yoriichi-0u0/earth-fm`, with `codex/earth-fm-bobomimi` selected as the production branch. Build settings are Node.js 24, install command `npm ci`, build command `npm run build`, and output directory `dist`. See [CONNECTIONS.md](CONNECTIONS.md) for the Supabase project and credential configuration.

## GitHub import

1. Push or merge the tested project branch into the GitHub repository.
2. For a new checkout or hosting project, import `Yoriichi-0u0/earth-fm`, select `codex/earth-fm-bobomimi`, and use the repository root as the root directory. The current Vercel project is already connected.
3. Select Node.js 24 or a supported Node.js version of at least 22.12. The framework is Vite, build command is `npm run build`, and output directory is `dist`.
4. Deploy. Open the returned HTTPS URL and validate **Hear this visual**, the immersive video, a climate track, and WAV download. Browser audio begins only after a user gesture.
5. Put the verified HTTPS URL into the Space Apps submission and `docs/SUBMISSION.md`.

The Vercel GitHub integration automatically creates previews for subsequent commits on an imported project. Account sign-in in another interface does not by itself inject CLI credentials into the cloud workspace.

## CLI alternative

If a Vercel CLI connection is available on your machine:

```sh
npm ci
npm run check
npx vercel
```

This creates a reviewable preview. Inspect its behavior before promoting it with `npx vercel --prod`. Use Vercel’s normal secure sign-in or environment settings for authentication; never commit tokens or put them in chat.

## Self-host or local production check

```sh
npm ci
npm run build
npm run preview
```

Any HTTPS static host can serve `dist` unchanged. Bundled source snapshots are deliberately available under `/data/` for provenance and reuse. WAV synthesis and file processing occur in the browser, so the host does not need an audio backend or upload endpoint.
