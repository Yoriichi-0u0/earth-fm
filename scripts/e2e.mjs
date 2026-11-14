#!/usr/bin/env node
// Runs the browser suite in two phases so speed never costs reliability:
//   1. every test except @timing, on the configured workers (4 locally);
//   2. the load-sensitive @timing tests (takes, replays, touch gestures, animation timing) on 2 workers
//      with one retry. They measure real time, so a busy computer can starve them; a test that only
//      passes on retry is reported as flaky, and a real regression still fails twice.
// Extra arguments pass through to both phases (for example --project=chromium or -g "Looper").
// E2E_QUICK=1 (npm run test:e2e:quick) also skips @full tests.
import { spawnSync } from 'node:child_process';

const extra = process.argv.slice(2);
const run = (args, report) => spawnSync('npx', ['playwright', 'test', ...args, ...extra], {
  stdio: 'inherit',
  env: { ...process.env, PLAYWRIGHT_HTML_OUTPUT_DIR: `playwright-report/${report}` },
}).status ?? 1;

const main = run(['--grep-invert', '@timing'], 'main');
const timing = run(['--grep', '@timing', '--workers=2', '--retries=1'], 'timing');
process.exit(main || timing);
