// Member journey E2E — the seeded-account run the smoke specs can't do: it
// exercises the live RLS/money paths at runtime (Supabase auth, the member
// quote on a Homework Hall seat, allowance spend on booking, allowance restore
// on cancel). One focused journey:
//
//   sign in → dashboard loads → open the booking surface → book an included
//   Hall visit → cancel it → the included-visit count is back where it started.
//
// GATED: skips (cleanly, e.g. in CI today) unless ALL of these are set:
//   E2E_BASE_URL        target deployment (e.g. a Vercel preview) with real
//                       Supabase env baked in (accounts must work)
//   E2E_SEED_EMAIL      credentials of the seeded member account
//   E2E_SEED_PASSWORD
//
// Required seed state on that deployment (see docs/TEST_PLAN.md):
//   - app_settings.club_enabled = true (selling live, not the held storefront)
//   - the account exists, its email is confirmed, and dashboard intake is
//     complete (setupDone) so /dashboard opens on the Today tab
//   - the account is on a member plan with a finite club_hall_included
//     allowance and at least 1 visit remaining this month
//   - at least one open (not full) Homework Hall room this week that the
//     account has NOT already booked, starting more than 12 hours out
//     (GROUP_REFUND_WINDOW_HOURS) so cancelling returns the included visit;
//     the test books the latest such room it can see
//
// The journey restores its own state: the visit it spends is returned by the
// cancel, so the seeded account is reusable run after run. No other spec may
// mutate this account.
const { test, expect } = require('@playwright/test');

const SEED_EMAIL = process.env.E2E_SEED_EMAIL;
const SEED_PASSWORD = process.env.E2E_SEED_PASSWORD;
const BASE_URL = process.env.E2E_BASE_URL;
const configured = Boolean(SEED_EMAIL && SEED_PASSWORD && BASE_URL);

test.describe('member journey (seeded account)', () => {
  test.skip(!configured, 'Set E2E_SEED_EMAIL, E2E_SEED_PASSWORD and E2E_BASE_URL to run the seeded member journey.');
  if (configured) test.use({ baseURL: BASE_URL });

  test('sign in, book an included Hall visit, cancel it, allowance restored', async ({ page }) => {
    test.setTimeout(180_000);

    await test.step('sign in with the seeded member', async () => {
      await page.goto('/dashboard');
      await expect(page.getByPlaceholder('Email', { exact: true })).toBeVisible({ timeout: 20_000 });
      await page.getByPlaceholder('Email', { exact: true }).fill(SEED_EMAIL);
      await page.getByPlaceholder('Password', { exact: true }).fill(SEED_PASSWORD);
      await page.locator('button[type="submit"]').click();
    });

    await test.step('the dashboard loads past intake', async () => {
      // Cloud pull + render: the Today tab appears only for a confirmed
      // account whose intake is done (seed contract above).
      await expect(page.getByRole('button', { name: 'Today', exact: true }).first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    });

    let before; // included Hall visits at the start
    await test.step('open the booking surface and read the allowance', async () => {
      // The Today tab's club card opens DropInSessions in browse mode.
      await page.getByRole('button', { name: /Homework Hall (&|and) clinics/ }).click();
      await expect(page.getByRole('button', { name: 'My sessions', exact: true })).toBeVisible({ timeout: 20_000 });
      // "N included Homework Hall visits left this month." — the authed GET's
      // hallRemaining. Rendered only when > 0, which the seed guarantees.
      const allowance = page.getByText(/\d+ included Homework Hall visits? left this month/);
      await expect(allowance).toBeVisible({ timeout: 20_000 });
      before = Number((await allowance.innerText()).match(/(\d+) included/)[1]);
      expect(before).toBeGreaterThan(0);
    });

    await test.step('book an included Hall visit', async () => {
      // Hall rooms only, then the latest bookable one (Join renders only on
      // rooms with seats left; the latest is the one the seed keeps outside
      // the 12-hour refund window).
      await page.getByRole('button', { name: 'Homework Hall', exact: true }).click();
      const join = page.getByRole('button', { name: 'Join', exact: true });
      await expect(join.last()).toBeVisible({ timeout: 20_000 });
      await join.last().click();

      // The member quote: this seat settles from the allowance, no Stripe.
      const reserve = page.getByRole('button', { name: /use an included visit/ });
      await expect(reserve).toBeVisible();
      await expect(page.getByText('Included with your membership')).toBeVisible();
      await expect(reserve).toBeDisabled(); // consent gate first
      await page.getByRole('checkbox', { name: /approves this live video session/ }).check();
      await reserve.click();

      // Settled server-side: allowance spent in the same breath as the seat.
      await expect(page.getByText(/an included visit was used/)).toBeVisible({ timeout: 20_000 });
      // The confirmation tick is an IconCheck SVG, not a text glyph, so match
      // the words only.
      await expect(page.getByText(/You.re in/).first()).toBeVisible({ timeout: 20_000 });
      // The visible allowance dropped by one (the line hides at zero).
      if (before > 1) {
        await expect(page.getByText(new RegExp(`^${before - 1} included Homework Hall`))).toBeVisible({ timeout: 20_000 });
      } else {
        await expect(page.getByText(/\d+ included Homework Hall visits? left this month/)).toBeHidden({ timeout: 20_000 });
      }
    });

    await test.step('cancel the seat', async () => {
      await page.getByRole('button', { name: 'My sessions', exact: true }).click();
      const seatCard = page
        .locator('.k-card')
        .filter({ hasText: 'included visit' })
        .filter({ has: page.getByRole('button', { name: 'Cancel', exact: true }) })
        .first();
      await expect(seatCard).toBeVisible({ timeout: 20_000 });
      await seatCard.getByRole('button', { name: 'Cancel', exact: true }).click();
      // Outside the 12-hour window the server restores the allowance and the
      // client says so in its own words. This receipt is deliberately NOT the
      // server's DELETE copy: releaseResult refuses to echo a message written
      // for a paid seat, so assert the sentence the client actually renders for
      // a restored included visit.
      await expect(page.getByText(/included visit is back on your allowance/)).toBeVisible({ timeout: 20_000 });
    });

    await test.step('the included-visit count is restored', async () => {
      await page.getByRole('button', { name: 'Schedule', exact: true }).click();
      await expect(page.getByText(new RegExp(`^${before} included Homework Hall`))).toBeVisible({ timeout: 20_000 });
    });
  });
});
