#!/usr/bin/env node
/**
 * Screenshot a locally served page, so UI work can be judged by looking at it
 * rather than by reasoning about the markup.
 *
 * Usage: node scripts/screenshot.mjs <url> <outfile> [width] [height]
 *
 * Two things about this environment are worth knowing, because both are
 * failures that look like something else:
 *
 * - The repo pins a newer Playwright than the image's installed browsers, so
 *   the bundled Chromium is named explicitly. Without `executablePath`,
 *   `launch()` fails telling you to run `npx playwright install`, which is not
 *   the actual problem and does not help.
 * - Only localhost is reachable. The egress proxy refuses external hosts for
 *   the browser exactly as it does for curl, so pointing this at a deployed
 *   URL returns ERR_TUNNEL_CONNECTION_FAILED. Serve the app and shoot that.
 */
import { chromium } from '@playwright/test';

const CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const [, , url, out, width = '1280', height = '900'] = process.argv;
if (!url || !out) {
  console.error('usage: node scripts/screenshot.mjs <url> <outfile> [width] [height]');
  process.exit(1);
}

const browser = await chromium.launch({ executablePath: CHROMIUM });
try {
  const page = await browser.newPage({
    viewport: { width: Number(width), height: Number(height) },
  });
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  // Give client components a moment to hydrate; a screenshot taken at
  // domcontentloaded catches the server markup before any of it comes alive.
  await page.waitForTimeout(2_500);
  await page.screenshot({ path: out, fullPage: true });
  console.log(`${response?.status() ?? '?'} ${await page.title()} -> ${out}`);
} catch (error) {
  console.error(`screenshot failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
