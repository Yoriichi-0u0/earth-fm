import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// The main project tests a production build (vite preview): a few bundles per page load instead of
// hundreds of dev-server modules. Tests tagged @dev import /src modules and run against the dev server.
// E2E_QUICK=1 skips @full tests (viewport/theme matrices and long real-time performances).
const PREVIEW = 'http://127.0.0.1:4180';
const DEV = 'http://127.0.0.1:5173';
const deployed = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const quick = process.env.E2E_QUICK === '1';

export default defineConfig({
  testDir: './tests',
  // Every *.e2e.spec.ts file (and e2e.spec.ts) runs; no list to keep in sync.
  testMatch: ['**/*e2e.spec.ts'],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // PLAYWRIGHT_BASE_URL tests a deployed build (for example https://terrajuke.vercel.app) instead of the local dev server.
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? PREVIEW,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
    launchOptions: {
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {}),
      // Web Audio renders to Chromium's fake output stream (a timer-driven sink) instead of the machine's
      // speakers: parallel browsers no longer queue for one audio device, and tests make no sound.
      // PLAYWRIGHT_AUDIO=1 restores real output for listening sessions.
      args: process.env.PLAYWRIGHT_AUDIO === '1' ? [] : ['--disable-audio-output'],
    },
  },
  projects: [
    { name: 'chromium', grepInvert: quick ? /@dev|@full/ : /@dev/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    // Tests that import /src modules need Vite's dev server (skipped when testing a deployed URL).
    ...(deployed ? [] : [{ name: 'chromium-dev', grep: /@dev/, grepInvert: quick ? /@full/ : undefined, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 }, baseURL: DEV } }]),
    // Opt-in device emulation (PLAYWRIGHT_DEVICES=1). Emulated engines and screens, not physical phones or tablets.
    // The six-viewport scans resize 320→1024 in one page; WebKit keeps a stale header grid track there
    // (see docs/EXPERIENCE-VALIDATION.md), so they stay Chromium-only.
    ...(process.env.PLAYWRIGHT_DEVICES === '1'
      ? [
          { name: 'webkit-iphone', testMatch: ['**/climateSpiralFirstVisit.e2e.spec.ts', '**/grooveprint.e2e.spec.ts', '**/nightLights.e2e.spec.ts','**/air.e2e.spec.ts','**/home.e2e.spec.ts','**/ice.e2e.spec.ts'], grepInvert: /at six viewports/, use: { ...devices['iPhone 13'], launchOptions: {} } },
          ...([
            ['webkit-iphone-se', 'iPhone SE'], ['webkit-iphone-pro-max', 'iPhone 15 Pro Max'], ['webkit-iphone-landscape', 'iPhone 13 landscape'],
            ['webkit-ipad', 'iPad (gen 7)'], ['webkit-ipad-pro-landscape', 'iPad Pro 11 landscape'], ['webkit-desktop', 'Desktop Safari'],
            ['android-pixel', 'Pixel 7'], ['android-small', 'Galaxy S9+'], ['android-tablet', 'Galaxy Tab S4'],
          ] as const).map(([name, device]) => ({ name, testMatch: ['**/climateSpiralFirstVisit.e2e.spec.ts','**/home.e2e.spec.ts','**/ice.e2e.spec.ts'], use: { ...devices[device], launchOptions: {} } })),
        ]
      : []),
    // Opt-in installed browsers (PLAYWRIGHT_BRANDS=1): the real Google Chrome and Microsoft Edge apps on this machine.
    ...(process.env.PLAYWRIGHT_BRANDS === '1'
      ? (['chrome', 'msedge'] as const).map(channel => ({ name: channel, testMatch: ['**/climateSpiralFirstVisit.e2e.spec.ts', '**/grooveprint.e2e.spec.ts'], use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1440, height: 1000 }, launchOptions: {} } }))
      : []),
  ],
  webServer: deployed ? undefined : [
    { command: 'npx vite build --logLevel warn && npx vite preview --port 4180 --strictPort --host 127.0.0.1', url: PREVIEW, reuseExistingServer: false, timeout: 120_000 },
    { command: 'npm run dev -- --port 5173 --strictPort --host 127.0.0.1', url: DEV, reuseExistingServer: !process.env.CI, timeout: 30_000 },
  ],
});
