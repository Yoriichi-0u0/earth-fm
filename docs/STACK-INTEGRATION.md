# TerraJuke stacked integration readiness

Planning only: this document authorizes no merge, retargeting or deployment. `main` automatically deploys production. PR #8 and PR #9 remain draft and unmerged.

## Reviewed ancestry

- Production: `bee2801f4fbba336c2ca0a61518971d467e21703`.
- PR #8: `c3015275cede10e28c3663c1fd981575858eefd7`, based on main. It already includes the original PR #3/#4 histories via merge commits.
- PR #9: `codex/earth-grooveprint`, based on PR #8's branch. Its original checkpoint is `472b6e0`; later refinement commits stay on that branch. Its current small diff is relative to PR #8, not main.

Review the PR #8 delta from production and the PR #9 delta from PR #8 separately. Also review the full combined delta from main and pin the exact candidate SHA. Do not assume independent test totals add together: run the combined workflow on the actual candidate.

## Recommended eventual path: one approved combined release

Once BoboMimi explicitly approves both scopes and the production release:

1. Refresh remote refs and verify that the candidate still contains the reviewed PR #8 head and all expected histories. Recheck both PRs' latest CI/reviews, source/provenance invariance and Issue #7's physical-device/listening evidence. Resolve new changes before release.
2. Retarget PR #9 to main, keeping its branch/history intact. This intentionally exposes the full combined diff for the final release review. Retargeting is a future metadata action, not performed by this task.
3. Run `npm run check`, production build and diff checks on the exact candidate after any reconciliation with current main. Confirm the final approved SHA, rollback target, scientific values, private-image behavior and permissions boundaries.
4. Merge the combined PR using a **merge commit**, not squash/rebase. All PR #8, PR #3/#4 and research/refinement commits are already ancestors of this candidate. Merging once includes them once and triggers one production deployment.
5. Verify the resulting main ancestry and Vercel deployment against the approved SHA, then verify public flows. Record that PR #8's changes arrived through the combined release. GitHub may automatically update superseded PR states; inspect rather than manually discarding or rewriting their history.

Do not cherry-pick or re-merge PR #3/#4/#8 afterward; their changes are already included. Do not merge a stale PR #9 delta as a second copy of PR #8. Preserve original branch heads and PR discussions as review evidence.

## Alternative: release PR #8 first

If BoboMimi explicitly wants two separate releases, merge PR #8 to main with a merge commit, then retarget PR #9 to main and verify that its remaining diff is only Grooveprint/refinement. Reconcile current main, rerun the combined checks and separately authorize the second release. Shared ancestry prevents duplicate changes. Each main merge triggers production, so approval of the first release does not authorize the second.

## Reversibility and open gates

Before release, record main's known-good SHA and deployment identifier. If rollback is needed, use a separately authorized Vercel rollback or a reviewed revert commit that retains history; never reset/force-push main. A code rollback can itself trigger deployment. None is executed here.

Current automated evidence does not establish physical iOS/Android behavior, screen-reader usability, perceived musical quality or comprehension. Keep Issue #7 open until actual evidence exists. Private recording rights and any competition-submission decision remain separate. No service configuration, preview environment or production setting is needed for this stack.
