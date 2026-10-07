// Playwright E2E config (audit: the box ships Chromium at /opt/pw-browsers but
// no E2E harness existed). The smoke specs in e2e/ need NO external services and
// run against a production build; the deeper journeys (auth, payment) are
// documented in docs/TEST_PLAN.md and need a test Supabase + Stripe test mode.
//
// Run:  npm run build && npm run test:e2e
const { defineConfig, devices } = require('@playwright/test');

const PORT = process.env.E2E_PORT || 3210;
const baseURL = `http://127.0.0.1:${PORT}`;

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    // Use the pre-installed Chromium (PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers);
    // no browser download needed.
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use the pre-installed full Chromium instead of downloading a
        // version-matched headless shell. Override with PW_CHROMIUM if your
        // machine's path differs (locally, just run `npx playwright install`).
        launchOptions: process.env.PW_CHROMIUM || require('fs').existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
          ? { executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }
          : {},
      },
    },
  ],
  // Boot the real app for the tests. Reuses an already-running server locally.
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
