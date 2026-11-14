# TerraJuke — improvements following the simulated judging review

Date: 2026-11-02. Status: following local review, the user explicitly approved committing and pushing this guided-learning revision to main for the existing production workflow. Earlier local-review notes describe the completed pre-release verification.

## Implemented

1. Canonical entry: the default root now loads Studio. `?studio=1` is an alias. `?legacy=1`, known original anchors and old shared-mix parameters preserve the original experience. Hash changes also update the entry, so an existing browser tab can follow an old anchor correctly. The title/description and submission draft match the reviewed product.
2. Coherent lesson: Start listening opens a guided story with three steps: NASA Climate Spiral visual → actual GISTEMP measurements → personal understanding check. The same scientific subject ties the EIC-related visual scan to the measurement explanation. The simplified visual player reads real pixels during playback; no soundtrack recording is substituted.
3. Better initial audible contrast: twelve selected Januaries across 1880–2025 use the original fixed ten-band mapping. No per-year normalization, pitch exaggeration, synthetic observations or changes to the NASA snapshot. Pure data is default in this comparison; accompaniment is optional. Dates, anomaly and exact target frequency are visible. The horizontal axis uses true calendar spacing; notes are equal in duration and explicitly do not express elapsed time or warming rate. The selection is not a continuous record or a complete trend estimate.
4. Quantization is disclosed: same-band values remain the same note. The lesson explicitly explains why all months of 1880 can sound G3 and why a cross-year introduction is more revealing. No unsupported precision mode was quietly added.
5. Checkable learning: four questions cover comparison, image brightness, target pitch and anomaly baseline. Actual first/retry attempts are retained in the optional local JSON record. Explanatory feedback is available. Optional help/confusion fields support a human pilot. No answers are transmitted to an application backend, no aggregate impact figures are displayed and no human results are invented.
6. Materials: submission description and proposed 90-second script rewritten for the new journey; real-user protocol and an empty observations CSV prepared. The proposed video duration is a presentation plan, not a claimed official 2026 submission rule.

## Boundaries

English/default and Simplified Chinese are supported. Source links, NASA credits, snapshot revision caveats, keyboard operation, audio cancellation, reduced-motion behavior and source integrity remain. The image's published revision is not claimed to exactly match the numeric snapshot. Image brightness is not temperature, global anomalies are not local weather, and uncertainty is not encoded in sound.

True human musical review, actual first-time-user testing, accessibility co-design and physical iPhone/Safari checks remain incomplete. The pilot protocol targets 6–10 volunteers but none are claimed recruited/tested. Existing automated scenarios do not constitute participant evidence. No accounts, backend, new framework or package were added.

## Review assets

- Local canonical entry: http://127.0.0.1:5173/
- Original experience: http://127.0.0.1:5173/?legacy=1
- Guided visual: NASA SVS 5190 with its pinned local image and full source credit.
- Selected observations: `src/data/guidedStory.ts` and downloadable CSV.
- Main implementation: `src/components/GuidedStory.tsx`, `src/main.tsx`, `src/lib/entry.ts`, with Studio/visual-player integration and Chinese messages.
- User pilot: `USER_TEST_PROTOCOL.md`, `user-test-template.csv`.
- Pitch/submission: `SUBMISSION.md`.

## Verification

Production build passed. 34 unit tests and a complete 28-test browser run passed, covering original regression cases, the full A/B sequence, actual source values, routing, guided pixel audio/data audio, state/cleanup, Chinese, local first/retry export, automated accessibility and mobile overflow. After visual inspection, the mobile chart was adjusted to a narrower coordinate system with readable labels; both targeted lesson tests and the production build passed for that adjustment.

The 24.8-second selected-January WAV uses the same renderer and fixed mapping as live playback. Its default-volume peak was approximately 0.1703; this verifies non-silence/headroom, not subjective listening quality or equal loudness. Desktop and Chinese mobile images were rendered for review.
