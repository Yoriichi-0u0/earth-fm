import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/e2e.spec.ts','**/appearance.e2e.spec.ts','**/personalRecord.e2e.spec.ts','**/mysteryRecord.e2e.spec.ts','**/recordIntegration.e2e.spec.ts','**/grooveprint.e2e.spec.ts','**/climateSpiralFirstVisit.e2e.spec.ts','**/nightLights.e2e.spec.ts'],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 3,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // PLAYWRIGHT_BASE_URL tests a deployed build (for example https://earth-fm.vercel.app) instead of the local dev server.
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
    launchOptions: {
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {}),
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    // Opt-in device emulation (PLAYWRIGHT_DEVICES=1). Emulated engines and screens, not physical phones or tablets.
    // The six-viewport scans resize 320→1024 in one page; WebKit keeps a stale header grid track there
    // (see docs/EXPERIENCE-VALIDATION.md), so they stay Chromium-only.
    ...(process.env.PLAYWRIGHT_DEVICES === '1'
      ? [
          { name: 'webkit-iphone', testMatch: ['**/climateSpiralFirstVisit.e2e.spec.ts', '**/grooveprint.e2e.spec.ts', '**/nightLights.e2e.spec.ts'], grepInvert: /at six viewports/, use: { ...devices['iPhone 13'], launchOptions: {} } },
          ...([
            ['webkit-iphone-se', 'iPhone SE'], ['webkit-iphone-pro-max', 'iPhone 15 Pro Max'], ['webkit-iphone-landscape', 'iPhone 13 landscape'],
            ['webkit-ipad', 'iPad (gen 7)'], ['webkit-ipad-pro-landscape', 'iPad Pro 11 landscape'], ['webkit-desktop', 'Desktop Safari'],
            ['android-pixel', 'Pixel 7'], ['android-small', 'Galaxy S9+'], ['android-tablet', 'Galaxy Tab S4'],
          ] as const).map(([name, device]) => ({ name, testMatch: '**/climateSpiralFirstVisit.e2e.spec.ts', use: { ...devices[device], launchOptions: {} } })),
        ]
      : []),
    // Opt-in installed browsers (PLAYWRIGHT_BRANDS=1): the real Google Chrome and Microsoft Edge apps on this machine.
    ...(process.env.PLAYWRIGHT_BRANDS === '1'
      ? (['chrome', 'msedge'] as const).map(channel => ({ name: channel, testMatch: ['**/climateSpiralFirstVisit.e2e.spec.ts', '**/grooveprint.e2e.spec.ts'], use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1440, height: 1000 }, launchOptions: {} } }))
      : []),
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'npm run dev -- --port 5173 --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
