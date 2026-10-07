import { useEffect, useSyncExternalStore } from "react";
import { RULES, type SkillStatus } from "@/learning/engine";
import { getSkill } from "@/practice/skills";
import { daysBetween, fromLocalDate, localDate } from "@/planner/dates";
import { PLAN_RULES } from "@/planner/plan";
import { startOfWeek, summarizeWeek } from "../activity";
import { weekFacts } from "../family";
import { statusesOf } from "../practice";
import { read, update, useStore, type StoreState } from "../store";
import type { Account, Profile } from "../types";
import { isQuiet, nameWords, renderWeekly, tr, WeeklyInput, withoutNames, type Email, type LearnerWeek } from "./render";

// The weekly family email (opt-in): composed from the same numbers as the Family page, nothing for a
// week with no activity, only ever to the account's own address (never to a child, who has none).
// Until accounts live on our server, the browser that holds the record asks /api/email/weekly to send
// last week's email the next time a grown-up opens a screen that calls useWeeklyEmail (Settings, and
// every Parent view screen once the app shell calls it); the server only sends to an address that
// confirmed with the code from a confirmation email. With the backend, a scheduled job calls the same
// composer.

const DAY = 864e5;

/** Kept on the account record, so export includes it (without the token) and deleting the account removes it. */
export type WeeklyOptIn = {
  on: boolean;
  /** Set once the address owner entered the emailed code (the token proves it to the server). */
  confirmed?: { token: string; at: number };
  /** When the confirmation email was last sent. */
  askedAt?: number;
  /** Monday (YYYY-MM-DD) of the last week handled: sent, or skipped because it was empty. */
  lastWeek?: string;
  lastSentAt?: number;
};
// ponytail: lives beside Account until lib/types.ts gives Account a `weeklyEmail` field (requested).
type WithWeekly = Account & { weeklyEmail?: WeeklyOptIn };

export const weeklyOf = (s: StoreState, accountId: string | null): WeeklyOptIn | undefined =>
  (s.accounts.find((a) => a.id === accountId) as WithWeekly | undefined)?.weeklyEmail;

function patch(change: (w: WeeklyOptIn) => WeeklyOptIn) {
  update((s) => {
    const a = s.accounts.find((x) => x.id === s.session.accountId) as WithWeekly | undefined;
    if (!a) return;
    a.weeklyEmail = change(a.weeklyEmail ?? { on: false });
  });
}

// ----- composing -----

/**
 * When "worth a look" items count, the same as the Family page's nudges: a test or quiz from tomorrow
 * to the plan's prep window with no prep set finished, a check open 14 days (the mastery law's
 * overdue line), a stuck skill still practiced in the last 14 days, 5 days in a row with nothing done.
 */
export const LOOK_RULES = { prepDays: PLAN_RULES.prepDays, checkWaitMs: RULES.overdueCheckMs, stuckRecentMs: 14 * DAY, idleDays: 5 };

/** The last time a learner did anything, up to `now`: an answer, a lesson, the tutor, a plan line, reading. */
function lastActive(s: StoreState, profileId: string, now: number): number | undefined {
  let last: number | undefined;
  const see = (t: number | undefined) => {
    if (t !== undefined && t <= now && (last === undefined || t > last)) last = t;
  };
  for (const a of s.attempts) if (a.profileId === profileId) see(a.at);
  for (const e of s.activity) if (e.profileId === profileId && e.type !== "course_added") see(e.at);
  for (const d of s.planDone) if (d.profileId === profileId) see(d.at);
  for (const th of s.threads) if (th.profileId === profileId) see(th.lines.at(-1)?.at ?? th.startedAt);
  for (const r of s.reading) if (r.profileId === profileId && r.date <= localDate(now)) see(Math.min(now, fromLocalDate(r.date).getTime()));
  return last;
}

type Tally = { own: number; helped: number; missed: number };

/** The Monday after `weekStart`, by the calendar: a week with a clock change is 167 or 169 hours long. */
export function weekEnd(weekStart: number) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 7);
  return d.getTime();
}

/** The server's limits (render.ts WeeklyInput), so what the browser composes always parses there. */
const MAX = { skills: 20, count: 1_000_000, learners: 12 };
const count = (x: number) => Math.min(MAX.count, Math.max(0, Math.round(x)));
const ids = (list: string[]) => list.slice(0, MAX.skills);

function learnerWeek(s: StoreState, p: Profile, weekStart: number, now: number, scrub: (text: string) => string): LearnerWeek {
  const at = Math.min(now, weekEnd(weekStart) - 1);
  const f = weekFacts(s, p.id, at);
  // Lesson checks are added to practice answers, as the Family page adds them. weekFacts carries its
  // own count of them once it has one (lessonChecks); until then, the week's lesson events.
  const week = summarizeWeek(
    s.activity.filter((e) => e.profileId === p.id),
    weekStart,
  );
  const checks: Tally = (f as typeof f & { lessonChecks?: Tally }).lessonChecks ?? { own: week.own, helped: week.help, missed: week.missed };

  const today = localDate(now);
  const prepped = new Set(s.sets.filter((x) => x.profileId === p.id && x.kind === "prep" && x.finishedAt).map((x) => x.eventId));
  const tests = s.events
    .filter((e) => e.profileId === p.id && !e.done && (e.kind === "test" || e.kind === "quiz") && !prepped.has(e.id))
    .filter((e) => daysBetween(today, e.date) >= 1 && daysBetween(today, e.date) <= LOOK_RULES.prepDays)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)
    .map((e) => ({ kind: e.kind as "test" | "quiz", date: e.date, title: scrub(e.title).slice(0, 80) }));
  const statuses = Object.values(statusesOf(s, p.id, now)).filter((st) => getSkill(st.skillId));
  const open = (st: SkillStatus) => st.state === "ready" || st.state === "checked" || st.state === "refresh";
  const overdue = statuses.filter((st) => open(st) && st.checkOpensAt !== undefined && now - st.checkOpensAt >= LOOK_RULES.checkWaitMs).map((st) => st.skillId);
  const stuck = statuses.filter((st) => st.stuck && st.lastPracticeAt !== undefined && now - st.lastPracticeAt <= LOOK_RULES.stuckRecentMs).map((st) => st.skillId);
  const idle = daysBetween(localDate(lastActive(s, p.id, now) ?? p.createdAt), today);
  return {
    grade: p.grade,
    minutes: count(f.minutes + f.readingMinutes),
    lessons: count(f.lessons),
    sets: count(f.sets),
    own: count(f.own + checks.own),
    helped: count(f.helped + checks.helped),
    missed: count(f.missed + checks.missed),
    proved: ids(f.proved.filter((id) => getSkill(id))),
    checksWaiting: ids(f.checksWaiting.filter((id) => getSkill(id))),
    helpOn: ids(f.helpOn),
    overdue: ids(overdue),
    stuck: ids(stuck),
    tests,
    ...(idle >= LOOK_RULES.idleDays ? { idleDays: Math.min(idle, 400) } : {}),
  };
}

/**
 * The email's content for one family and one Monday-to-Sunday week (`weekStart` = Monday 00:00
 * local), or null when nothing happened that week. `now` is when it is composed: tests coming up
 * and days without activity are counted from then. Parsed exactly as the server parses it, so the
 * preview and the email agree.
 */
export function weeklyInput(s: StoreState, accountId: string, weekStart: number, now: number): WeeklyInput | null {
  const account = s.accounts.find((a) => a.id === accountId);
  const all = s.profiles.filter((p) => p.accountId === accountId).sort((a, b) => a.createdAt - b.createdAt);
  if (!account || !all.length) return null;
  const kids = all.slice(0, MAX.learners);
  const locale = s.prefs.locale;
  const names = nameWords([...all.map((k) => k.nickname), account.displayName]);
  const scrub = (text: string) => withoutNames(text, names, tr(locale, "trust.email.child"), tr(locale, "trust.email.childs"));
  const learners = kids.map((p) => {
    const twins = kids.filter((k) => k.grade === p.grade);
    const week = learnerWeek(s, p, weekStart, now, scrub);
    return twins.length > 1 ? { ...week, n: twins.indexOf(p) + 1 } : week;
  });
  if (learners.every(isQuiet)) return null;
  return WeeklyInput.parse({ locale, weekStart: localDate(weekStart), learners });
}

/** What the next email would say if this week ended now (the Settings preview). */
export function previewWeekly(s: StoreState, accountId: string, now: number, origin: string): Email | null {
  const input = weeklyInput(s, accountId, startOfWeek(now), now);
  return input && renderWeekly(input, origin);
}

// ----- talking to /api/email/weekly -----

export type EmailMode = "send" | "preview";

let mode: Promise<EmailMode> | null = null;
/**
 * "send" when this site can send email (Resend is configured); "preview" otherwise. Only an answer
 * from the server is remembered: after a failed request (offline, a cold start timing out) the next
 * call asks again.
 */
export function emailMode(): Promise<EmailMode> {
  mode ??= fetch("/api/email/weekly", { cache: "no-store" })
    .then(async (r) => {
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { mode?: EmailMode };
      return j.mode === "send" ? ("send" as const) : ("preview" as const);
    })
    .catch(() => {
      mode = null;
      return "preview" as const;
    });
  return mode;
}
/** Test hook. */
export const resetEmailMode = () => void (mode = null);

type Reply = { ok?: boolean; error?: string; token?: unknown };
const post = (body: unknown) =>
  fetch("/api/email/weekly", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, json: (await r.json().catch(() => ({}))) as Reply }))
    .catch(() => ({ status: 0, json: {} as Reply }));
const tokenIn = (r: Reply) => (typeof r.token === "string" && /^[A-Za-z0-9._-]{20,120}$/.test(r.token) ? r.token : null);

const signedIn = () => {
  const s = read();
  const account = s.accounts.find((a) => a.id === s.session.accountId);
  return account && s.session.profileId === "parent" ? { s, account } : null;
};

/** Turns the weekly email on or off for the signed-in family. Turning it off forgets the confirmation. */
export function setWeeklyOn(on: boolean) {
  patch((w) => (on ? { ...w, on: true } : { on: false, lastWeek: w.lastWeek }));
}

export type AskResult = "sent" | "preview" | "rate" | "failed";

/** Emails a confirmation code (and a link carrying it) to the account's address. */
export async function askConfirmation(now = Date.now()): Promise<AskResult> {
  const me = signedIn();
  if (!me) return "failed";
  const r = await post({ action: "confirm", to: me.account.email, locale: me.s.prefs.locale });
  if (r.status === 503) return "preview";
  if (r.status === 429) return "rate";
  if (!r.json.ok) return "failed";
  patch((w) => ({ ...w, askedAt: now }));
  return "sent";
}

/**
 * The confirmation code in what a grown-up typed or pasted: the code itself ("4K7Q-MZ2D", any case,
 * O for 0 and I or L for 1 forgiven) or the whole link from the email (`…/settings#weekly=4K7QMZ2D`).
 * Null when there is none.
 */
export function codeFrom(text: string): string | null {
  const raw = /#weekly=([^\s&#]+)/.exec(text)?.[1] ?? text;
  const c = raw
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  return /^[0-9A-HJKMNP-TV-Z]{8}$/.test(c) ? c : null;
}

/** The code of a confirmation link this page was opened from (`/settings#weekly=<code>`), if any. */
export function confirmCodeInUrl(): string | null {
  const hash = typeof window === "undefined" ? "" : window.location.hash;
  return hash.startsWith("#weekly=") ? (codeFrom(hash) ?? "") : null;
}

/** A code from the confirmation email (typed, pasted, or from its link): check it with the server and keep the token it returns. */
export async function confirmWeekly(code: string, now = Date.now()): Promise<boolean> {
  const me = signedIn();
  const clean = codeFrom(code);
  if (!me || !clean) return false;
  const r = await post({ action: "verify", to: me.account.email, code: clean });
  const token = r.json.ok ? tokenIn(r.json) : null;
  if (!token) return false;
  patch((w) => ({ ...w, on: true, confirmed: { token, at: now } }));
  return true;
}

export type SendResult = "sent" | "empty" | "not-due" | "off" | "preview" | "unconfirmed" | "failed";

let sending: Promise<SendResult> | null = null;

/**
 * Sends last week's email once, when it is on and confirmed and that week ended after the
 * confirmation. An empty week is marked handled without sending anything. Two calls at once (two
 * screens opening together) share one attempt.
 */
export function sendDueWeekly(now = Date.now()): Promise<SendResult> {
  sending ??= sendDue(now)
    .then((r) => {
      setStatus({ last: r });
      return r;
    })
    .finally(() => (sending = null));
  return sending;
}

async function sendDue(now: number): Promise<SendResult> {
  const me = signedIn();
  const w = me && weeklyOf(me.s, me.account.id);
  if (!me || !w?.on) return "off";
  if (!w.confirmed) return "unconfirmed";
  const lastMonday = startOfWeek(startOfWeek(now) - 1);
  const key = localDate(lastMonday);
  if (w.lastWeek && w.lastWeek >= key) return "not-due";
  if (startOfWeek(now) <= w.confirmed.at) return "not-due";
  if ((await emailMode()) !== "send") return "preview";
  const input = weeklyInput(me.s, me.account.id, lastMonday, now);
  if (!input) {
    patch((x) => ({ ...x, lastWeek: key }));
    return "empty";
  }
  const r = await post({ action: "send", to: me.account.email, token: w.confirmed.token, week: input });
  if (r.status === 403) {
    patch((x) => ({ ...x, confirmed: undefined }));
    return "unconfirmed";
  }
  if (!r.json.ok) return "failed";
  // A token more than a week old comes back replaced, so an active family's never runs out.
  const fresh = tokenIn(r.json);
  patch((x) => ({ ...x, lastWeek: key, lastSentAt: now, ...(fresh && x.confirmed ? { confirmed: { ...x.confirmed, token: fresh } } : {}) }));
  return "sent";
}

// What Settings says about sending: whether the app shell sends too, and how the last try went.
type Status = { shells: number; last: SendResult | null };
let status: Status = { shells: 0, last: null };
const listeners = new Set<() => void>();
function setStatus(change: Partial<Status>) {
  status = { ...status, ...change };
  for (const l of listeners) l();
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

/**
 * Sends last week's email, if it is due, whenever a Parent view screen opens with the email
 * confirmed. Does nothing for a learner, or when the email is off. The app shell calls it with no
 * argument (then every Parent view screen sends); Settings calls it with "settings".
 */
export function useWeeklyEmail(from: "shell" | "settings" = "shell") {
  const due = useStore((s) => s.session.profileId === "parent" && Boolean(weeklyOf(s, s.session.accountId)?.confirmed));
  useEffect(() => {
    if (from !== "shell") return;
    setStatus({ shells: status.shells + 1 });
    return () => setStatus({ shells: status.shells - 1 });
  }, [from]);
  useEffect(() => {
    if (due) void sendDueWeekly();
  }, [due]);
}

/** True while the app shell sends the email, so any Parent view screen does (not only Settings). */
export const useSentFromParentView = () => useSyncExternalStore(subscribe, () => status.shells > 0, () => false);
/** How the latest send attempt on this page went, or null before one. */
export const useLastSend = () => useSyncExternalStore(subscribe, () => status.last, () => null);
/** Test hook. */
export const resetSendStatus = () => setStatus({ shells: 0, last: null });
