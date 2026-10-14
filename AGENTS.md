# Earth FM project workflow

- Work directly on `main`. Commit and push changes to `origin/main`.
- Keep one production workflow: pushes to `main` deploy to Earth FM on Vercel.
- Do not create additional branches, worktrees, pull requests, preview deployments, or staging environments unless the user explicitly requests them.
- Do not run test suites or add testing workflows unless the user explicitly requests them. Production builds and deployment status checks are part of publishing.
- Use **Earth FM** for display names and `earth-fm` for package and service slugs.
- Keep credentials and local Vercel/Supabase state out of Git.
