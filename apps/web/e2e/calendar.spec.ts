import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { collectErrors, family, noOverflow } from "./helpers";

// The calendar: a week with each day's plan, adding from a link, class calendar links that refresh
// by UID, and the family's own .ics. Runs at desktop (7-column week) and phone (day list) sizes.

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plus = (n: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
};
const mondayOf = (d: Date) => {
  const m = new Date(d);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return iso(m);
};
const dayName = (d: Date) => new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(d);
const day = (page: Page, d: Date) => page.getByRole("region", { name: new RegExp(`^${dayName(d)}`) });
const ics = (events: { uid: string; date: Date; title: string }[]) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", ...events.flatMap((e) => ["BEGIN:VEVENT", `UID:${e.uid}`, `DTSTART;VALUE=DATE:${iso(e.date).replace(/-/g, "")}`, `SUMMARY:${e.title}`, "END:VEVENT"]), "END:VCALENDAR"].join("\r\n");

/** Steps the week view until it shows the week containing `d`. `shown` is the Monday on screen. */
async function showWeekOf(page: Page, shown: { monday: string }, d: Date) {
  const target = mondayOf(d);
  while (shown.monday < target) {
    await page.getByRole("button", { name: "Next week" }).click();
    shown.monday = iso(new Date(new Date(`${shown.monday}T12:00:00`).getTime() + 7 * 864e5));
  }
  while (shown.monday > target) {
    await page.getByRole("button", { name: "Previous week" }).click();
    shown.monday = iso(new Date(new Date(`${shown.monday}T12:00:00`).getTime() - 7 * 864e5));
  }
  await expect(day(page, d)).toBeVisible();
}

async function audit(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${label}: ${v.id} — ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
}

test.use({ reducedMotion: "reduce" });

test("a link with ?add= opens the add form with that kind and day chosen", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "cal-add", [["Ada", "4"]]);
  await page.getByRole("button", { name: /Ada/ }).click();
  await page.goto("/calendar?add=test");
  const form = page.getByRole("form", { name: "Add to the calendar" });
  await expect(form).toBeVisible();
  await expect(form.getByRole("radio", { name: "Test" })).toBeChecked();
  await expect(form.getByLabel("Date")).toHaveValue(iso(plus(0)));
  await page.goto(`/calendar?add=homework&date=${iso(plus(9))}`);
  await expect(page.getByRole("form", { name: "Add to the calendar" }).getByRole("radio", { name: "Homework" })).toBeChecked();
  await expect(page.getByRole("form", { name: "Add to the calendar" }).getByLabel("Date")).toHaveValue(iso(plus(9)));
  // Cancel closes it and leaves a clean address.
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("form", { name: "Add to the calendar" })).toHaveCount(0);
  await expect(page).toHaveURL(/\/calendar$/);
  // Today's "I have a test coming" lands on the same form.
  await page.goto("/home");
  await page.getByRole("link", { name: "I have a test coming" }).click();
  await expect(page.getByRole("form", { name: "Add to the calendar" }).getByRole("radio", { name: "Test" })).toBeChecked();
  await noOverflow(page);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("a test five days out puts prep on the three days before it", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "cal-prep", [["Ada", "4"]]);
  await page.getByRole("button", { name: /Ada/ }).click();
  await page.goto("/calendar?add=test");
  const form = page.getByRole("form", { name: "Add to the calendar" });
  await form.getByLabel("What").fill("Multiplication test");
  await form.getByLabel("Date").fill(iso(plus(5)));
  await form.getByRole("button", { name: /Link Multiplication facts/ }).click();
  await form.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/^Saved: Multiplication test,/)).toBeVisible();

  // After saving, the week with the test is on screen.
  const shown = { monday: mondayOf(plus(5)) };
  await expect(day(page, plus(5)).getByRole("link", { name: /Multiplication test/ })).toBeVisible();
  for (const n of [2, 3, 4]) {
    await showWeekOf(page, shown, plus(n));
    await expect(day(page, plus(n)).getByText("Prep: Multiplication test")).toBeVisible();
  }
  for (const n of [1, 5]) {
    await showWeekOf(page, shown, plus(n));
    await expect(day(page, plus(n)).getByText("Prep: Multiplication test")).toHaveCount(0);
  }
  // The test day itself shows the item, not a duplicate "work on" line.
  await showWeekOf(page, shown, plus(5));
  await expect(day(page, plus(5)).getByText("Work on Multiplication test")).toHaveCount(0);
  await noOverflow(page);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("the week reads by keyboard: arrow keys move between days", async ({ page }) => {
  await family(page, "cal-keys", [["Ada", "4"]]);
  await page.getByRole("button", { name: /Ada/ }).click();
  await page.goto("/calendar");
  const today = page.getByRole("region", { name: /, Today$/ });
  await today.focus();
  await page.keyboard.press("ArrowRight");
  await expect(day(page, plus(1))).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(today).toBeFocused();
  await page.keyboard.press("PageDown");
  await expect(day(page, plus(7))).toBeFocused();
});

test("a class calendar link: review, save, then refresh updates by UID without duplicates", async ({ page }) => {
  const errors = collectErrors(page);
  let feed = ics([
    { uid: "u1@school", date: plus(3), title: "Unit 3 Test" },
    { uid: "u2@school", date: plus(1), title: "Reading log due" },
  ]);
  await page.route("**/api/ics", (route) => route.fulfill({ status: 200, contentType: "text/calendar; charset=utf-8", body: feed }));
  await family(page, "cal-feed", [["Ada", "6"]]);
  await page.getByRole("button", { name: /Ada/ }).click();
  await page.goto("/calendar");
  await page.getByRole("button", { name: "Import from school" }).click();
  const panel = page.getByRole("region", { name: "Bring in school dates" });
  await panel.getByRole("button", { name: "Calendar link" }).click();
  await panel.getByLabel("Calendar link (iCal / .ics address)").fill("webcal://school.example/math6.ics");
  await panel.getByLabel("Class name").fill("Math 6");
  await panel.getByRole("button", { name: "Get the events" }).click();
  await expect(panel.getByText("Found 2. Check the names, dates and types, then save.")).toBeVisible();
  await audit(page, "calendar-import-review");
  await panel.getByRole("button", { name: "Save 2" }).click();
  await expect(page.getByText("Saved: 2 new, 0 updated. Math 6 keeps the link, so Refresh brings in changes later.")).toBeVisible();
  await expect(page.getByText("calendar linked", { exact: false })).toBeVisible();

  // The teacher moves the test and adds a lab report.
  feed = ics([
    { uid: "u1@school", date: plus(4), title: "Unit 3 Test" },
    { uid: "u2@school", date: plus(1), title: "Reading log due" },
    { uid: "u3@school", date: plus(2), title: "Lab report" },
  ]);
  await page.getByRole("button", { name: "Refresh class calendars" }).click();
  await expect(page.getByText("Math 6: 1 new, 1 changed.")).toBeVisible();
  // Saving showed the week of the first coming item (the reading log, tomorrow); refreshing keeps it.
  const shown = { monday: mondayOf(plus(1)) };
  await showWeekOf(page, shown, plus(4));
  await expect(day(page, plus(4)).getByRole("link", { name: /Unit 3 Test/ })).toHaveCount(1);
  await showWeekOf(page, shown, plus(3));
  await expect(day(page, plus(3)).getByRole("link", { name: /Unit 3 Test/ })).toHaveCount(0);

  // Refreshing again changes nothing.
  await page.getByRole("button", { name: "Refresh class calendars" }).click();
  await expect(page.getByText("Math 6: Up to date, nothing new.")).toBeVisible();
  await page.getByRole("button", { name: "Refresh: Math 6" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Up to date, nothing new." }).first()).toBeVisible();
  await noOverflow(page);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("a calendar link that can't be read says why, and nothing is saved", async ({ page }) => {
  await page.route("**/api/ics", (route) => route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "blocked" }) }));
  await family(page, "cal-blocked", [["Ada", "6"]]);
  await page.getByRole("button", { name: /Ada/ }).click();
  await page.goto("/calendar?import=link");
  const panel = page.getByRole("region", { name: "Bring in school dates" });
  await panel.getByLabel("Calendar link (iCal / .ics address)").fill("https://192.168.1.10/cal.ics");
  await panel.getByRole("button", { name: "Get the events" }).click();
  await expect(panel.getByText("That address can't be read from here.")).toBeVisible();
  await expect(page.getByText("calendar linked", { exact: false })).toHaveCount(0);
});

test("classes, teacher notes and scores from school; the family's own .ics", async ({ page }) => {
  const errors = collectErrors(page);
  await family(page, "cal-school", [["Ada", "4"]]);
  await page.getByRole("button", { name: /Ada/ }).click();
  await page.goto("/calendar");
  const addClass = page.getByRole("form", { name: "Add class" });
  await addClass.getByLabel("Class name").fill("Math 4");
  await addClass.getByRole("button", { name: "Add class" }).click();
  await expect(page.getByRole("button", { name: "Link calendar: Math 4" })).toBeVisible();

  await page.getByLabel("Teacher's note").fill("Needs more practice with borrowing");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByText("Needs more practice with borrowing")).toBeVisible();

  const score = page.getByRole("form", { name: "Add score" });
  await score.getByLabel("Test or assignment").fill("Unit 2 test");
  await score.getByLabel("Score").fill("45");
  await score.getByLabel("Out of").fill("50");
  await score.getByRole("button", { name: "Add score" }).click();
  await expect(page.getByText("45 / 50")).toBeVisible();
  await expect(page.locator("li", { hasText: "Unit 2 test" }).getByText(/from school/)).toBeVisible();

  await page.goto("/calendar?add=quiz");
  const form = page.getByRole("form", { name: "Add to the calendar" });
  await form.getByLabel("What").fill("Spelling quiz");
  await form.getByLabel("Date").fill(iso(plus(2)));
  await form.getByRole("button", { name: "Save" }).click();
  await audit(page, "calendar-week");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .ics" }).click();
  expect((await download).suggestedFilename()).toBe("kaizenedu-ada.ics");
  await noOverflow(page);
  expect(errors, errors.join("\n")).toEqual([]);
});
