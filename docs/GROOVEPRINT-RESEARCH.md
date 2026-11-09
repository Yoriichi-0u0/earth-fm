# Earth Grooveprint research

Based on PR #8 at `c301527`. This is a passive 2D visualization experiment, not a production release or a new sonification mapping.

- Side A: the existing 48 decoded strips, in left-to-right order, become equal clockwise sectors from twelve o'clock. Absolute brightness 0–1 sets outer radius 26–44 in a 100-unit viewBox. The inner radius is 24. Image brightness is not temperature. Length is continuous; the existing pitch quantization can give different lengths the same note. No new pixel sampling or per-image normalization.
- Side B: the existing 12 selected January GISTEMP observations pass through the existing `mapData`/`symphony-ten-v1` profile. Band index 0–9 sets outer radius 26–44. The scientific range stays −1.00 to +1.50 °C relative to the 1951–1980 January average, in ten 0.25 °C bands. Equal angles encode selected observation order, not elapsed years. Missing/out-of-range events have no filled sector; a dashed marker identifies the gap, not zero.
- The highlighted sector follows the existing selected position. It is not an audio scheduler or proof that sound is currently audible. The artwork's rotation remains illustrative. Side colour identifies the input type, not another physical measurement.
- Preserve the vinyl artwork, NASA imagery, datasets, audio transports, fixed profiles, optional 3D implementation, themes, languages and other experiences. The engraving is 2D only; 3D remains illustrative. An optional enlarged diagram makes the sectors inspectable on phones. The key follows the transport only, and does not encode musical accompaniment.

Acceptance: deterministic fixture geometry, truthful gaps, correct side/source/position, unchanged audio output and cancellation, accessible explanation and keyboard controls, usable phone layouts and no continuous animation loop introduced by the engraving. Capture before/after views before deciding whether to retain it. Physical-device, perceptual and learning results must be reported separately from automated checks.

## Research result — 9 November 2026

Retain as a research candidate. Desktop comparison shows a distinct source-derived pattern while the Earth artwork stays visible. The small phone vinyl is a summary, not a precise reading surface; the optional enlarged diagram is needed to inspect sectors. No claim of improved understanding has been established with participants.

`npm run check` passed 61 unit tests, the production build and all 105 Chromium scenarios. Nine new browser scenarios cover source values, original frequencies, Scratch/Looper highlighting, delayed startup cancellation, hidden tabs/navigation, unavailable imagery, bilingual keyboard/reduced-motion use, six viewports and a pure-transform benchmark. SHA-256 verification found no changes in 49 protected source/data/audio/3D/configuration files. Optional 3D retains the original illustrative record.

Next: BoboMimi should compare before/after images and try reading a few sectors in the enlarged view on physical phones. Keep real-device/listening checks in Issue #7 open. PR #9 is based on unmerged PR #8; neither PR nor production is authorized for merge/deployment by this experiment.
