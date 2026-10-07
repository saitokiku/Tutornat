import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // CI builds the production bundle in a dedicated workflow step, so this
  // process only drives Chromium. Two workers fit a 4-core runner.
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'html' : 'list',
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // In CI the production build runs as a dedicated workflow step before
    // Playwright, so this only boots the already-built server (`pnpm start`).
    // The 120s budget covers startup, not the (much slower) build. Locally we
    // run the dev server.
    command: process.env.CI ? 'pnpm start' : 'pnpm dev',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Enable the MAIC Editor (Pro mode) so editor e2e can reach it. This is a
    // build-time NEXT_PUBLIC_* flag: in CI it must be set on the dedicated
    // `pnpm build` step; locally `pnpm dev` reads it here.
    // KAIZEN: this suite covers the engine's UI, which `/` no longer serves
    // once TUTOR_MODE is on (the product landing page takes that route). The
    // product has its own specs; these keep testing the engine. The value is
    // '0', not '': the build bakes the tracked .env into the server and fills
    // any variable the host left unset or empty (D27), so an empty string
    // turned the product back on and every engine spec navigated to a page
    // that was not there.
    env: {
      PORT: '3002',
      NEXT_PUBLIC_MAIC_EDITOR_ENABLED: 'true',
      TUTOR_MODE: '0',
      NEXT_PUBLIC_TUTOR_MODE: '0',
    },
  },
});
