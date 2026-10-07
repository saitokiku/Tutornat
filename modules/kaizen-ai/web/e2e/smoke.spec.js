// Smoke E2E — no external services required. Runs against a production build to
// prove the public surface renders, the funnel copy is correct, and routing/404
// behave. Deeper journeys (auth, subscribe, book/pay) need a test Supabase +
// Stripe test mode and live in docs/TEST_PLAN.md.
const { test, expect } = require('@playwright/test');

// The hero used to split the page between two businesses — "Real tutors, on the
// schedule" beside "An AI companion for 9 PM" — on the front door of a company
// that sells one thing: a room. Wave 2 gave the whole first screen to the club
// and stated the two facts the old hero never did, WHERE it is and WHEN it
// opens. These assertions are the guard on that: if the front door ever again
// leads with the free AI, or drops the city, or offers a booking while the club
// is held, one of them fails.
test('landing page leads with the club, names the city, and discloses the held state', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Kaizen/i);
  await expect(page.getByText(/Tutoring twice a week/i).first()).toBeVisible();
  await expect(page.getByText(/in a room in Austin/i).first()).toBeVisible();
  await expect(page.getByText(/For students 13 and up/i).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /licenses/i }).first()).toBeVisible();
  // Held state, disclosed in the hero rather than three scrolls down. The club
  // is fail-closed on club_enabled, so this is what an unconfigured or held
  // storefront must say — and it must not be sitting next to a booking button.
  await expect(page.getByText(/The club has not opened yet/i).first()).toBeVisible();
  // Held: the hero captures interest instead of offering the week. /diagnostic
  // is deliberately still offered — it has its own switch (diagnostic_enabled)
  // and answers for itself, which is why the held line is scoped to the club.
  await expect(page.getByRole('link', { name: /get first pick/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /see this week/i })).toHaveCount(0);
  // The home still routes to both sides and carries the bridge claim.
  await expect(page.locator('a[href="/tutoring"]').first()).toBeVisible();
  await expect(page.locator('a[href="/ai"]').first()).toBeVisible();
  await expect(page.getByText(/will do the homework\. Kaizen won/i).first()).toBeVisible();
  // The parent claim is scoped to what the code actually sends (CLAIMS_MATRIX:
  // read-only window + monthly email), not the old "Parents see all of it".
  await expect(page.getByText(/read-only window/i).first()).toBeVisible();
  // The marquee names homework students BRING, so the scope caption beneath it
  // is load-bearing disclosure: verified mastery is narrower than the tutoring.
  await expect(page.getByText(/verified mastery\s+is a narrower promise/i).first()).toBeVisible();
  // Held state: interest capture renders, with no fake booking affordance.
  await expect(page.getByRole('button', { name: /get first pick/i }).first()).toBeVisible();
});

test('the AI companion page renders with its contract and CTAs', async ({ page }) => {
  const res = await page.goto('/ai');
  expect(res.status()).toBe(200);
  await expect(page.getByText(/Ask it for the answer/i).first()).toBeVisible();
  await expect(page.getByText(/teaching contract/i).first()).toBeVisible();
  await expect(page.getByText('$11.99').first()).toBeVisible();
  await expect(page.locator('a[href="/dashboard"]').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /academic integrity/i }).first()).toBeVisible();
});

test('the tutoring hub renders with the problem-based rows and honest prices', async ({ page }) => {
  const res = await page.goto('/tutoring');
  expect(res.status()).toBe(200);
  // The page leads with the one recurring product now, not with a Hall visit.
  await expect(page.getByText(/A seat that stays yours/i).first()).toBeVisible();
  await expect(page.getByText(/Start from your problem/i).first()).toBeVisible();
  // Supervision and tutoring are different words with different legal weight
  // (review-queue item 20), and the page has to keep saying which is which.
  await expect(page.getByText(/shared supervision/i).first()).toBeVisible();
  await expect(page.getByText(/\$14/).first()).toBeVisible();
  await expect(page.getByText(/get first pick/i).first()).toBeVisible();
  await expect(page.locator('a[href="/tutors/apply"]').first()).toBeVisible();
});

test('the public schedule page renders signed-out with the held storefront', async ({ page }) => {
  const res = await page.goto('/schedule');
  expect(res.status()).toBe(200);
  await expect(page.getByText(/this week/i).first()).toBeVisible();
  // No DB in e2e => fail-closed held state with capture, never live booking.
  await expect(page.getByText(/hear first/i).first()).toBeVisible();
});

test('the family page gates on sign-in', async ({ page }) => {
  const res = await page.goto('/family');
  expect(res.status()).toBe(200);
  // Unconfigured/unauthenticated → the sign-in card, never a crash.
  await expect(page.getByText(/sign in|family/i).first()).toBeVisible();
});

test('pricing shows the AI ladder and the standing seat from the pricing lib, and no retired membership', async ({ page }) => {
  await page.goto('/pricing');
  // The AI ladder: .99 prices must render with cents, never rounded.
  await expect(page.getByText('$11.99').first()).toBeVisible();
  await expect(page.getByText('$24.99').first()).toBeVisible();
  await expect(page.getByText('Max AI').first()).toBeVisible();
  // The one recurring Local product, from SEAT_PLAN.
  await expect(page.getByText('Standing Seat').first()).toBeVisible();
  await expect(page.getByText('$550').first()).toBeVisible();
  // Memberships are retired from sale (clubPricing.SALE_STATUS): none may render.
  await expect(page.getByText('$45')).toHaveCount(0);
  await expect(page.getByText('$79')).toHaveCount(0);
  await expect(page.getByText('$109')).toHaveCount(0);
  await expect(page.getByText(/ages 13/i).first()).toBeVisible();
  // The top of the funnel: the diagnostic and the promise attached to it.
  await expect(page.getByText('$59').first()).toBeVisible();
  await expect(page.getByText(/credited in full/i).first()).toBeVisible();
  // Private 1:1 is cut (STRATEGY §11) and we do not publish tutor availability,
  // so no surface may offer it — and the retired "first session free" trial
  // went with it (TRIAL_PLANS is empty).
  await expect(page.getByText(/private 1:1/i)).toHaveCount(0);
  await expect(page.getByText(/first session free/i)).toHaveCount(0);
  // Unconfigured Stripe + held club => capture forms, never dead checkout links.
  await expect(page.getByRole('button', { name: /get first pick/i }).first()).toBeVisible();
  expect(await page.locator('a[href^="/billing?plan="]').count()).toBe(0);
});

test('the landing and tutoring pages sell the seat, not a retired membership', async ({ page }) => {
  for (const path of ['/', '/tutoring']) {
    await page.goto(path);
    // The retired lineup, by name and by figure. Their definitions survive for
    // /terms and the metering rail; no storefront may offer one.
    for (const name of [/\bClub membership\b/i, /\bPlus membership\b/i, /\bMax membership\b/i]) {
      await expect(page.getByText(name), `${path} must not offer a retired membership`).toHaveCount(0);
    }
    for (const figure of ['$45', '$79', '$109']) {
      await expect(page.getByText(figure), `${path} must not quote ${figure}`).toHaveCount(0);
    }
    // And nothing may offer the cut 1:1 product.
    await expect(page.getByText(/private 1:1/i), `${path} must not offer private 1:1`).toHaveCount(0);
  }
  // The front door leads with the one recurring product.
  await page.goto('/');
  await expect(page.getByText('$550').first()).toBeVisible();
});

test('the diagnostic page renders and is honest about not being on sale', async ({ page }) => {
  const res = await page.goto('/diagnostic');
  expect(res.status()).toBe(200);
  // It is a public storefront page: it must render with no account, no Stripe
  // key and the switch closed. The price comes from clubPricing.DIAGNOSTIC.
  await expect(page.getByText('$59').first()).toBeVisible();
  await expect(page.getByText(/credited in full/i).first()).toBeVisible();
  // Nothing may promise a grade or an outcome, here least of all: this is the
  // page a family reads before they spend their first dollar with us.
  await expect(page.getByText(/guarantee/i)).toHaveCount(0);
});

test('legal + licenses pages render', async ({ page }) => {
  for (const [path, needle] of [
    ['/licenses', /Open-Source Licenses/i],
    ['/terms', /membership/i],
    ['/safety', /safety/i],
    ['/privacy', /privacy/i],
  ]) {
    const res = await page.goto(path);
    expect(res.status(), `${path} should be 200`).toBe(200);
    await expect(page.getByText(needle).first()).toBeVisible();
  }
});

test('unknown route returns a 404 page', async ({ page }) => {
  const res = await page.goto('/definitely-not-a-real-page');
  expect(res.status()).toBe(404);
});

test('dashboard loads (login gate when unauthenticated)', async ({ page }) => {
  const res = await page.goto('/dashboard');
  expect(res.status()).toBe(200);
});
