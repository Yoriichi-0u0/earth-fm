# Earth FM workspace cleanup - 8 November 2026

The repository remains at `/Users/jacychiong/Documents/Codex/The Earth Information Jukebox`. No application code, source data, Vercel/Supabase configuration, private audio processing, main merge or production deployment changed.

## Completed

- Verified GitHub source heads: main `bee2801f`, Your Record `22e423e` and Mystery Record `5c6a033`.
- Backed up eight original public review ZIPs and supplemental public historical evidence to a maintainer-accessible draft archive; uploaded the archive index and checksum manifest as well.
- Verified all 11 GitHub asset sizes and SHA-256 digests, then downloaded/rechecked the Mystery Record ZIP before removing redundant local copies.
- Removed 11 sibling Earth FM review/handoff folders, the older dated Earth FM export workspace and the legacy local scratch tools after preserving their necessary public evidence or private contents.
- Removed regenerable build/test outputs and all temporary transfer/download copies.
- Retained compact summaries/previews for Day & Night, Your Record and Mystery Record in ignored `project-library/handoffs/`.
- Preserved 32 unique private recording/input/review files locally, including both original recordings. Removed only duplicate copies and four reproducible decoded-analysis caches. No private recording data was uploaded.
- Verified 225 files belonging to unrelated projects remained unchanged.

The old artifact sets and generated output occupied about 413 MB. The retained local library is about 11 MB, reclaiming approximately 402 MB overall (decimal bytes, excluding normal development dependencies). Installed dependencies remain available for active development.

## Durable records

- [Workspace/retention conventions](WORKSPACE.md)
- [Verified archive assets and digests](EVIDENCE_ARCHIVE_2026-11-08.json)
- [Draft archive](https://github.com/Yoriichi-0u0/earth-fm/releases/tag/untagged-659d583fe0b5af2d9cfc) - tag `earth-fm-evidence-archive-2026-11-08`
- [Cleanup issue #5](https://github.com/Yoriichi-0u0/earth-fm/issues/5) and [housekeeping PR #6](https://github.com/Yoriichi-0u0/earth-fm/pull/6)

The private per-file retention map and local navigation index are in `project-library/organization/` and `project-library/README.md`. Historical metadata retains old paths for traceability; current downloads should use the GitHub archive or new local index.

Validation: matching remote asset SHA-256 digests; successful download round trip; original/private/unrelated-file hash checks; source-head verification; and `git diff --check`. Application tests were not rerun for documentation, ignore rules and file housekeeping. No feature code changed. Production and both independent feature PRs remain unchanged.
