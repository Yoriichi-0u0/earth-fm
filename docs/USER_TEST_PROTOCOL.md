# Earth FM — first-time learner pilot protocol

Historical guided-lesson protocol. For the current jukebox-first Home, Flip, Scratch/Looper, Your Record, Mystery and silent Grooveprint review, use [EXPERIENCE-VALIDATION.md](EXPERIENCE-VALIDATION.md). The lesson-specific protocol below is preserved for its original scope.

Status: study plan, not results. Target recruitment: 6–10 volunteers, not yet recruited. No user contact, recruitment or research collection is automated by the application.

## Purpose

Determine whether first-time users can begin without help, distinguish visual sonification from scientific measurements, interpret the baseline and compare selected observations. Do not use a small convenience sample to claim universal accessibility, causal learning improvement or statistical significance.

Primary audience: students or curious adults unfamiliar with climate sonification. If minors participate, the team must arrange suitable permission and supervision with the responsible school/guardian before recruitment. Accessibility claims need direct, voluntary participation and feedback from relevant users; an audio feature alone is not evidence.

## Procedure (about 8–10 minutes)

1. Explain that the interface is being tested, not the participant. Explain voluntary participation, what will be recorded and the absence of required personal/contact information. Agree to any recording separately; do not start recording by default.
2. Give a participant code without a name. Record device/browser and relevant previous graph/music experience, only if volunteered. Ask a short baseline question about image brightness versus temperature and the meaning of an anomaly; do not reveal answers.
3. Show the canonical homepage. Ask the participant to start the guided story without coaching. Observe whether they find the entry and which step first causes confusion. Use a clock if time-to-start is measured; do not substitute estimated values.
4. Ask them to listen to a NASA visual and explain what determines that sound. Then listen to the selected-January sequence and identify which of January 1880/2025 is warmer relative to the January baseline. Ask what does and does not change when accompaniment is added.
5. At the Discover step, expand the optional understanding check and ask them to complete it without coaching. Preserve the first attempt, not just their best retry. The optional JSON export includes actual attempts only. Do not copy automated test output into a participant-results folder.
6. Ask them to use Create to choose a tone and play a mix, then Explore Data to inspect a month and compare years. Record whether they can explain the different page purposes. Ask what was confusing, useful or tiring, whether the sound added anything to the image, and what they would change. Distinguish observed difficulties from self-reported preferences. Ask whether they needed help; record help actually given separately.
7. Thank the participant. They decide whether to share their exported record. Agree a deletion/retention arrangement before storing their responses. No name, contact details or default browser analytics export is required.

## Optional comparison design

If testing whether sound adds value, compare equal science content shown as visual-only and visual-plus-sound, with order varied across participants. Use matched content and account for practice effects. Report this as an exploratory pilot; sample size, prior knowledge and order effects limit causal conclusions.

## Results template

Use `user-test-template.csv` only after testing. Leave unobserved fields empty, not zero. Record number approached, number consenting/completing, participant/device mix, assistance, first-attempt answers and confusion themes. Publish aggregate counts with actual denominators; e.g. “x of n participants correctly distinguished pixel brightness from temperature.” Do not insert example success percentages as findings.

Suggested observations: started without help; time to first user-triggered playback (seconds); correctly distinguishes visual/data sound; correctly interprets baseline; identifies period difference; notices quantization; needs accompaniment muted; keyboard/touch obstacles.

The software's 34 unit tests or browser scenario counts are not human participant counts. Practice scores are not equivalent to measured learning gain. Teacher/learner quotes require actual feedback and permission; no endorsements or partnerships are presumed.

## Ready-to-run assets

The application provides a three-step lesson, source-linked comparison, explanatory feedback and optional local record export. It sends no answers to an application backend. Hosting request logs may exist independently; do not describe the entire web as having no network metadata. No study data is prefilled and no aggregate results are shown.

## Public, self-guided station review

Visitors can use `/listen?station=all` without an account. Arctic September (`/listen?station=arctic`) offers an optional prediction before numeric evidence, full record inspection, two concept checks, a free-text scientific explanation and a local JSON export. The export separates first/retry attempts, records whether the evidence step had already been revealed, counts play requests, and timestamps the first scheduled audible observation. It does not grade free text, transmit answers, infer demographic information or aggregate learning scores. Shared exports are actual personal practice records only when a real visitor chooses to provide them. Automated test fixtures must remain separate from learner evidence.

No human review is required as a deployment gate. This implementation makes real-learner review possible on production; it does not pretend that a participant study has already taken place.
