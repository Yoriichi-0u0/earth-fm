# Earth FM — first-visit and listening validation

Prepared 10 November 2026. **Protocol only: zero participant or listening sessions performed. Human verification was deferred at BoboMimi's request.** Browser checks are separate technical evidence. Do not enter automated test output as participant results.

## First visit: 10–12 minutes, without coaching

Use the exact candidate SHA, an anonymous participant code, and a non-private supplied image (the synthetic gradient fixture is sufficient). Note device/model, OS, browser/version, language, theme and audio output. Explain that the interface is being tested, participation is optional and they may stop. Get permission for notes; do not record audio/video by default. Jacy/Yuen Kai can rehearse this protocol, but familiar team members are not first-time participants.

Give one task at a time. Record unassisted completion, actual help, observed confusion and the participant's own words. Measure elapsed time only if actually timed; leave unobserved fields blank. Ask interpretation questions before explaining the answer. The rubric below is for the observer, not a script to teach before the task.

| Task and neutral prompt | Observe | Interpretation to check afterward |
| --- | --- | --- |
| 1. “Start listening to an Earth record, then stop it.” | Finds Play directly from Home; explicit gesture starts sound; Stop is discoverable. Record time to first sound if timed. | “What information made that sound?” Climate Side A uses image pixels, not measured temperatures. |
| 2. “Try the other side of Climate Spiral.” | Finds Flip or Side B; previous audio stops; can explain which side is selected. | Side B uses selected January temperature anomalies relative to the 1951–1980 January mean. Image and observations are related sources, not frame-by-frame matches. |
| 3. “Look up another groove and its value without making a sound.” | Finds Read the grooves and silent inspection; reads year/brightness, note and frequency; can find deeper details if wanted. | A = brightness; B = anomaly. Equal angular sectors encode order, not elapsed years. Displayed frequency is a rounded mapped target. |
| 4. “Make a few notes by moving across the picture.” | Finds Play with Earth / Scratch; horizontal gesture makes notes; vertical gesture scrolls; keyboard alternative works where applicable. | Manual scanning controls the image-pixel sound. It is not playing a thermometer or adding measurements. |
| 5. “Keep three short notes and hear your performance again.” | Finds Record, Finish, Replay; understands Stop/Clear; new manual input cancels replay. | Looper stores scan events in memory, not microphone audio. Changing records clears the take. |
| 6. “Turn this supplied picture into a temporary record.” | Finds Choose image; can Play/Scratch, replace and remove it; understands the local-only wording. | This is personal image sonification, not NASA imagery or scientific observations. Leaving Home/reloading forgets it. |
| 7. “Try a Mystery Record, then discover and open its source.” | Can Play/Stop/Replay, guess or skip, Reveal, and open the original. | Reveal identifies pixels versus measurements and provider. A sound alone does not uniquely identify a source or prove an Earth-science conclusion. Do not score the guess as scientific knowledge. |

Finish with: “What felt clear, confusing or tiring? What would you try next?” Report observed behavior separately from self-reported preferences. For a small convenience pilot, publish actual denominators and assistance, not learning-gain claims or invented success percentages. If something needs fixing, retain the exact steps and candidate SHA so it can be reproduced.

## Listening review: 4–5 minutes, deferred

Use real listeners, including separate notes from Jacy and Yuen Kai if they participate. Keep the same output device and a comfortable listener-chosen level; no microphone, private recording processing or automatic collection is needed.

1. Play brief excerpts from the four curated records; vary the order between listeners. Keep hardware/app volume fixed unless the listener needs to change it, and note that change. Do not treat matching volume percentages as equal acoustic loudness.
2. Compare Climate Side A / Side B, then the same measurement sequence with Hear Data Only. Ask whether the data melody remains identifiable; do not reveal an expected preference.
3. Repeat one Scratch position three or four times at the listener's pace, then vary positions and replay a short take. Ask about harshness, balance, repeated-note annoyance, responsiveness and fatigue. Allow immediate Stop.
4. Record source/side/tone, output, approximate time or selected position, actual volume changes, spontaneous comments and any interruption. Invite an optional 1–5 comfort rating, with 1 = uncomfortable and 5 = comfortable, and a plain-language explanation. Leave skipped ratings blank.

This is subjective listening evidence, not measured loudness, acoustic latency or a controlled preference study. Objective frequency/peak/scheduling checks cannot establish enjoyment or fatigue. Do not alter sound balance based on absent feedback.

## Device checks: perform only on the named environment

Record actual model, OS/build, browser/version, candidate SHA, orientation, text size, theme/language and output device. Mark each item Pass / Fail / Not run with exact reproduction steps and a non-private evidence reference. Do not prefill pass results.

| Environment | Checks |
| --- | --- |
| Physical iPhone / Safari | First gesture audio unlock; native picker with accepted PNG/JPEG/WebP and readable HEIC rejection; horizontal Scratch versus vertical scrolling; Looper cancellation; replacement/removal during startup/play/replay; screen lock/app switch/call interruption and explicit retry; safe areas, enlarged text, Auto theme, Chinese, VoiceOver and focus. |
| Physical Android / Chrome | Same interactions, picker/cancellation, background/lock interruptions, portrait/landscape, enlarged text, TalkBack and native range controls. |
| Apple iOS Simulator, if already available | Record simulated device and runtime/build. Test Safari layout/controls/audio initialization and picker flows with a synthetic image. Label results **iOS Simulator**, not physical iPhone; it cannot establish real touch ergonomics, speakers/Bluetooth, battery/GPU or phone-call behavior. |
| Chromium phone emulation | Verify layout, synthetic touch, keyboard, state/cancellation and automated accessibility. Label it **Chromium emulation**; it is not iOS Safari or physical-device evidence. |

Current Mac inventory: only Command Line Tools are selected; `simctl`, Xcode/Simulator bundles, CoreSimulator runtimes and cached Playwright WebKit are unavailable. No simulator was installed or physical session accessed for this milestone.

## Blank session note

Candidate SHA / date / reviewer code / first-time or familiar:

Environment (physical / iOS Simulator / Chromium emulation), model, OS, browser, output:

Tasks completed without help / help actually given / time actually measured:

Science-versus-pixels answers in the participant's own words:

Observed problem and exact reproduction / participant preference or quote (permission noted):

Listening comfort, repetition, balance, responsiveness, fatigue / volume changes:

Evidence reference / not-run checks / next reproducible fix:

Keep real participant notes private by default; publish only permitted, appropriately anonymized findings. [Issue #7](https://github.com/Yoriichi-0u0/earth-fm/issues/7) tracks remaining device/listening checks. Release approval remains a separate BoboMimi decision; this protocol performs no merge or deployment.

## Technical review at this checkpoint

Starting target: `eca1048b8472a1e16913fcee1180f2594b92a67a`, on `codex/earth-grooveprint` / stacked draft PR #9. The reproducible phone issue was reading density, not a verified scientific or audio defect. At 390 × 844, the expanded panel measured 955.23 CSS px before refinement; with longer explanations collapsed it measures 767.94 px on Side A and 788.33 px on Side B (19.61% / 17.47% shorter). Visible English words decrease from 175 / 178 to 85 / 91. Light and Dark give the same dimensions. Desktop geometry is unchanged. These are layout measurements, not evidence of improved comprehension.

The selected source value/note, silent inspection, enlarged SVG and short scientific distinction remain visible. A native, keyboard-operable “Mapping details and limitations” disclosure preserves the original full explanations, translated into Chinese. Opening it does not change selection, resample imagery or restart playback. No volume or note-repetition changes were justified without human listening evidence.

The combined `npm run check` passed 64 unit tests, the production build and 112 Chromium browser cases, with no skipped or flaky cases. The focused Grooveprint suite passed all 16 cases. Coverage includes every source readout, flip orientation, cancellation, both themes/languages, reduced motion and six viewport shapes. Axe reports no automated violations in the added brief/detailed disclosure scans, but some contrast checks require manual review; these scans do not certify WCAG or physical screen-reader usability. The expert browser walkthrough exercised direct Play/Stop, Flip, silent inspection, Scratch via its keyboard slider, a three-event Looper replay, synthetic personal-image selection, personal-to-Mystery transition, source reveal and return to the original. It is not a first-time participant session or a human listening judgment.

The full 27-file production-to-`eca1048` diff was reviewed. SHA-256 checks found 56 protected production data/audio/asset/renderer/configuration files unchanged; extracted `mapRecordPoint` and `DataArtwork` function bodies are byte-identical to their production Home counterparts. PR #3/#4/#8 and original Grooveprint commits remain ancestors. No private recordings, source imagery, mappings, dependencies or service settings were changed. Human comprehension, listening, physical iPhone/Android, Safari and actual touch ergonomics remain unverified. Keep Issue #7 open. No merge or production release was performed.
