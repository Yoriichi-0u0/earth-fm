# Earth FM workspace and retention

The canonical local project folder is:

`/Users/jacychiong/Documents/Codex/The Earth Information Jukebox`

Keep the application at the repository root. The existing `src`, `public`, `tests`, `docs`, package files and Git history remain in their normal locations. Installed dependencies may stay available for active development; build/test reports and compiled outputs can be regenerated.

## Where things belong

| Material | Durable location | Local retention |
| --- | --- | --- |
| Source, tests, configuration and documentation | GitHub commits and `codex/` review PRs | One working repository |
| Open work and remaining review/device checks | GitHub issues and PR discussions | Small current handoff summaries |
| Large review ZIPs, screenshots, historical verification and legacy tools | Verified GitHub archive assets | Selected current previews; no redundant full copies |
| Private recordings, candidate excerpts and unresolved permissions | Private local inputs; never a public GitHub asset | `project-library/private-audio/` |
| Temporary transfer files, build output and browser test reports | Regenerate or verify backup first | Remove after use |

`project-library/README.md` is the local navigation index. The entire library and the legacy `work/` scratch directory are ignored by Git. Never put private recordings, credentials, local service state or local backups under `public/` or include them in a public review package.

## GitHub backup archive

The maintenance draft archive uses tag `earth-fm-evidence-archive-2026-11-08` in [GitHub Releases](https://github.com/Yoriichi-0u0/earth-fm/releases). It is a maintainer-accessible draft evidence archive, not a production software release or deployment.

The archive preserves the reviewed public packages and supplemental public historical evidence. Private sections from the original November 3 handoff are excluded and retained locally. `archive-index.json` and `SHA256SUMS.txt` identify the assets; the local cleanup record records verification before removal.

## Working rules

1. Commit and push complete, reviewable source checkpoints regularly. Open draft PRs early and inspect available CI/review feedback after pushes.
2. Record unresolved work in issues instead of accumulating unnamed local folders or undocumented one-off artifacts.
3. Keep current handoff notes in `project-library/handoffs/`. Reference GitHub for full source history and evidence archives.
4. Verify uploaded asset hashes before deleting the corresponding local evidence. Preserve original private inputs before dropping decoded analysis caches.
5. Do not create sibling Earth FM review directories, duplicate repositories, or dated source backups. Keep unrelated projects separate.
6. Main remains the only production branch. A housekeeping commit, draft archive or documentation PR is not release approval; do not merge or deploy without explicit BoboMimi authorization.
