# TerraJuke (Earth FM) — first-visit and listening validation

Prepared 10 November 2026. **Protocol only: zero participant or listening sessions performed. Human verification was deferred at BoboMimi's request.** Browser checks are separate technical evidence. Do not enter automated test output as participant results.

## Climate Spiral A/B first sessions — 13 November 2026

The first human sessions use the flagship only. Run these four tasks before the broader protocol below. **Status: zero participant, physical-device, screen-reader or listening sessions performed.**

| Task and neutral prompt | Observe | Ask afterwards, before explaining |
| --- | --- | --- |
| A1. “Start listening to the first record, then stop it.” | Finds **Play record** without help. Note the time to first sound only if a clock was running. | “What information made that sound?” |
| A2. “Find out what one groove stands for without making a sound. Then hear only that groove.” | Opens **Read the grooves**, moves **Inspect sector (silent)**, then presses **Hear selected strip**. | “What does the number you read describe?” |
| A3. “Try the other side.” | Flips by the A/B buttons or the vinyl. Side A stops. Plays Side B. | “Which side is playing now?” |
| A4. “What made the sound on each side?” | Uses the participant's own words. Do not prompt with the labels. | Side A is image brightness, including labels and background. It is not temperature. Side B is a selected January anomaly relative to the 1951–1980 January mean, in fixed 0.25 °C bands. The two sides are related sources, not frame-by-frame matches. |

Score A4 as *clear*, *partial* or *confused* from the participant's words. Report counts with the actual denominator. A team member's rehearsal does not count as a first-time session.

### Physical phones on the local network (no deployment)

1. On the Mac, run `npm run build`, then `npx vite preview --host 0.0.0.0 --port 4173`. This serves the exact production build of the candidate SHA. `npm run dev` also works, but it serves unbundled development code.
2. Join the phone and the Mac to the same Wi-Fi. Find the Mac's address with `ipconfig getifaddr en0` and open `http://<that address>:4173/` on the phone. Some guest or campus networks block devices from reaching each other. If so, use a personal hotspot. Do not use a public tunnel or a Vercel preview.
3. Web Audio does not require HTTPS, so playback works over the local address. Legacy's copy-link button falls back to the address bar there. Use the iPhone's volume buttons before you start. Note whether the Ring/Silent switch is on, because on some iOS versions it mutes web audio.
4. Stop the preview server after the session. Nothing is uploaded, and the phone keeps no participant data.

### Physical device and assistive-technology checks for A/B

Record for each item: device model, OS build, browser version, candidate SHA, output (speaker, wired or Bluetooth), and Pass, Fail or Not run with exact steps to reproduce.

| Check | iPhone / Safari | Android / Chrome |
| --- | --- | --- |
| First tap on Play starts sound; Stop silences it right away | | |
| Silent inspection makes no sound. Hear selected strip and Hear selected January play one note each | | |
| Flipping during playback stops Side A. Side B then plays twelve notes | | |
| Locking the screen, switching apps or taking a call stops playback. Play works again afterwards | | |
| Rotating to landscape and back: Play stays in the first screen, no sideways page scroll | | |
| First Scratch or Hear selected strip after loading: note on first press, or the “press again” notice | | |
| Side B Climate Coil: renders, turns by drag, beads pulse with notes; the 2D chart toggle works | | |
| Largest system text size: Play, the side buttons and the inspector remain usable | | |
| VoiceOver / TalkBack: the side buttons announce their pressed state, the inspector announces strip or January, the value, the note and Hz, and “Now playing” is announced | | |
| Comfort (1–5, optional) and the listener's own words on Side A versus Side B, Hear Data Only, and repeated single notes | | |

Screen-reader and comfort results describe the people and devices tested. They do not certify accessibility.

### Automated evidence at this checkpoint

Branch `codex/climate-spiral-validation`, stacked on PR #15 (`1b9d48e`). The candidate SHA is the commit that contains this paragraph; record it with `git rev-parse HEAD` on the session sheet. All of this is automated browser evidence, not human evidence.

- `npm run check` passed 67 unit tests, the production build and 122 Chromium tests. The 116 earlier browser tests are joined by 6 new tests in `tests/climateSpiralFirstVisit.e2e.spec.ts`:
  - the A1–A4 path by touch, checking that each note heard matches the mapped frequency shown and that the inspector stays silent;
  - regression tests for the decode race, a rejected `decode()`, and an image failure that lands before the player resets;
  - the Climate Coil's 3D/2D switch, and its no-WebGL fallback.
- `PLAYWRIGHT_DEVICES=1 npx playwright test --project='webkit-*' --project='android-*'` passed 77 tests. Playwright 1.64 WebKit (revision 2370) emulated iPhone SE, iPhone 13, iPhone 15 Pro Max, iPhone 13 landscape, iPad (gen 7), iPad Pro 11 landscape and desktop Safari. Its Chromium build emulated Pixel 7, Galaxy S9+ and Galaxy Tab S4. iPhone 13 also ran 17 Grooveprint tests. **These are emulated engines and screens, not physical devices or Safari.** They cannot show real touch, speakers, interruptions or VoiceOver/TalkBack behaviour.
- `PLAYWRIGHT_BRANDS=1 npx playwright test --project=chrome --project=msedge` runs the first-visit and Grooveprint files in the installed Google Chrome 157 and Microsoft Edge 155. One run passed 50 of 50. A later parallel run had 2 Edge failures, which reproduced in 4 of 10 parallel repeats and 0 of 10 serial repeats. In each, the first strip note was dropped because Edge's first audio start took longer than 250 ms. This is the instrument's intended guard against a late, stale touch, and it shows “Audio is ready. Move again…”. On a slow phone the first Scratch or Hear selected strip may therefore need a second press; check this on physical devices.
- **Real Safari 27.2 on macOS** (`npm run test:safari`, driven by Apple's `safaridriver`) passed 16 of 16 checks, twice. They cover:
  - the first scan decoded on 20 of 20 cold loads, and Safari's strip brightness matching Playwright WebKit within 0.0005, with no pitch-band changes;
  - Side A playing on Safari's real audio clock, with notes 1 → 6 in 2.6 s, then Stop;
  - silent inspection reading `Image strip 48 / 48, 0.0% brightness, D3, 146.83 Hz`, and Hear selected strip starting a note;
  - flip during playback stopping Side A, and the 1951–1980 and “not matched frame by frame” text being shown;
  - the Climate Coil rendering through Safari's WebGL, and Side B playing G3 at 196.00 Hz before advancing to 02 / 12;
  - the 2D toggle, and no sideways scroll at 1280 px or 430 px.

  Screenshots and JSON go to `test-results/safari/`. To set it up, enable **Safari → Settings → Advanced → Show features for web developers**, then **Developer → Allow remote automation**. **This is desktop Safari on macOS. It is not Safari on a physical iPhone**, which still needs touch, speaker, interruption and VoiceOver checks.
- Before a landscape fix, the iPhone 13 landscape run found Play at 385–433 px on a 342 px screen, outside the first view. A short-landscape rule now keeps it within the first screen on iPhone 13, iPhone SE, Pixel 7 and 844 × 390.
- The WebKit run found two defects, both fixed in `src/lib/useVisualTransport.ts`. Neither fix changes a mapping or a pinned asset. A rejected `decode()` now also leaves the visual unavailable instead of marking a black scan ready.
  - **All-black first scan.** On 2 of 12 cold loads, WebKit read the Climate Spiral before its pixels were decoded. All 48 strips came back as 0 brightness, so the grooves, the silent inspector and Hear selected strip would show and play darkness. Play itself re-samples the image. The transport now waits for `HTMLImageElement.decode()`. The result was 0 of 40 bad first scans after the fix. The new regression test fails without the fix.
  - **Endless loading on a failed image.** In WebKit a fast image failure arrived before the transport's reset cleared it, so the player stayed on Loading with Play disabled. The reset now replays a failure that already happened, and each player shows its own error message.
- Cross-browser decoding of the pinned JPEG: across all 48 strips, Chromium and WebKit luma differ by at most 0.00294. No strip crosses a pitch band, so both browsers produce the same 48 notes and the same five distinct pitches.
- WebKit-only layout observation, not fixed: resizing one page from 320 px through 390 px and 768 px to 1024 px leaves a stale header grid track. The page then scrolls 22 px sideways until a relayout. Fresh loads and realistic phone rotations (320↔568, 360→844, 390↔844) do not overflow. The two six-viewport Grooveprint scans therefore run in Chromium only. Re-check this when an iPad window is resized with Split View or Stage Manager.

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

Mac inventory, 13 November 2026: only Command Line Tools are selected. `simctl`, Xcode, Simulator and CoreSimulator runtimes are unavailable. Playwright WebKit revision 2370 is now cached and runs the opt-in `webkit-iphone` project. No simulator was installed or physical session accessed. (On 10 November, cached Playwright WebKit was also unavailable.)

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
