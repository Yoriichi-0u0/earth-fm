# Releases

Every merge to `main` that changes what visitors get is a release: `main` deploys production automatically.
Docs-only or test-only merges are recorded in the changelog as a patch but do not need a tag.

## Cut a release (the session that merges does this, straight after verifying production)

1. **Changelog.** Move the PR's lines from `## [Unreleased]` in [CHANGELOG.md](../../CHANGELOG.md) into a new
   `## [X.Y.Z] - YYYY-MM-DD HH:MM · PR #N` section (MYT). Add the compare/tag link at the bottom.
2. **Notes.** Write `docs/releases/vX.Y.Z.md` from [the template](#template) below.
3. **Tag and publish.** Tag the merge commit that is live, not the changelog commit:
   ```sh
   gh release create vX.Y.Z --target <merge-sha> --title "TerraJuke X.Y.Z: <headline>" --notes-file docs/releases/vX.Y.Z.md
   ```
4. **Handoff.** If the release changes who holds the repository or what is next, update
   [docs/TEAM-HANDOFF.md](../TEAM-HANDOFF.md); record any product or science choice in
   [docs/DECISION-LOG.md](../DECISION-LOG.md).

Version rules: MAJOR for a new edition (a new record or page structure), MINOR for features, PATCH for fixes,
tests and docs. Rollback = revert the merge commit on `main` (Vercel redeploys); record it as a PATCH release.

## Template

```markdown
# TerraJuke X.Y.Z: <headline>

- Released: YYYY-MM-DD HH:MM MYT · PR #N · merge `<sha>` · by <person / which Claude session>
- Production: https://terrajuke.vercel.app · bundle `index-<hash>.js` (matches a local build of `<sha>`)

## What changed for visitors
## NASA sources touched (IDs, pinned files, provenance; or "none")
## Verification (exact counts; emulated vs physical vs human)
## Not verified / known limits
## Rollback
```

## Index

| Version | Date | Headline |
|---|---|---|
| [8.0.0](v8.0.0.md) | 2026-11-15 | The Ice Year (NASA SVS 5046), About this sound (5W1H), Sound: Note by note or Continuous |
| [7.0.0](v7.0.0.md) | 2026-11-14 | Two-page redesign: Home introduces and guides, Listen holds every player |
