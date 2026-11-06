# Earth FM project workflow

- Work on a `codex/` branch and open a draft pull request early. Commit and push complete, reviewable checkpoints frequently, as requested by the user.
- Keep one production workflow: `main` deploys Earth FM on Vercel. Do not merge or push to `main`, or deploy production, without explicit release approval.
- Preserve the existing Vercel configuration that disables deployments for other branches. Do not create worktrees, preview deployments, or staging environments unless explicitly requested.
- The Earth Looper milestone authorizes the existing unit and Playwright suites, including `npm run check`, and focused regression coverage. Do not introduce a new test framework or CI workflow without a task requirement.
- After each pushed checkpoint, inspect available CI checks and ChatGPT/Codex PR review feedback. Fix reproducible failures and actionable findings, then push the correction; explain any product or scientific tradeoff rather than accepting a review suggestion blindly.
- Use **Earth FM** for display names and `earth-fm` for package and service slugs.
- Keep credentials and local Vercel/Supabase state out of Git.
