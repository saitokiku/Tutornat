import { useEffect } from "react";
import { addDays, localDate } from "@/planner/dates";
import { startOfWeek, summarizeWeek } from "../activity";
import { weekFacts } from "../family";
import { read, update, useStore, type StoreState } from "../store";
import type { Account, Profile } from "../types";
import { isQuiet, renderWeekly, tr, withoutNames, type Email, type LearnerWeek, type WeeklyInput } from "./render";

// The weekly family email (opt-in): composed from the same numbers as the Family page, nothing for a
// week with no activity, only ever to the account's own address (never to a child, who has none).
// Until accounts live on our server, the browser that holds the record asks /api/email/weekly to send
// last week's email the next time a grown-up opens the Parent view (useWeeklyEmail); the server only
// sends to an address that confirmed by clicking a link. With the backend, a scheduled job calls the
// same composer.

const WEEK = 7 * 864e5;

/** Kept on the account record, so export includes it and deleting the account removes it. */
export type WeeklyOptIn = {
  on: boolean;
  /** Set once the address owner opened the confirmation link (token proves it to the server). */
  confirmed?: { token: string; at: number };
  /** When the confirmation link was last sent. */
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

/** The last moment a learner did anything: an answer, a lesson event, a reading entry. */
function lastActive(s: StoreState, profileId: string) {
  let at = 0;
  for (const a of s.attempts) if (a.profileId === profileId && a.at > at) at = a.at;
  for (const e of s.activity) if (e.profileId === profileId && e.at > at) at = e.at;
  for (const r of s.reading) if (r.profileId === profileId) at = Math.max(at, new Date(`${r.date}T12:00`).getTime());
  return at;
}

function learnerWeek(s: StoreState, p: Profile, weekStart: number, now: number, scrub: (text: string) => string): LearnerWeek {
  const at = Math.min(now, weekStart + WEEK - 1);
  const f = weekFacts(s, p.id, at);
  // Lesson checks and practice answers together, exactly as the Family page adds them.
  const lessons = summarizeWeek(
    s.activity.filter((e) => e.profileId === p.id),
    weekStart,
  );
  const today = localDate(now);
  const soon = addDays(today, 3);
  const prepped = new Set(s.sets.filter((x) => x.profileId === p.id && x.kind === "prep" && x.eventId).map((x) => x.eventId));
  const tests = s.events
    .filter((e) => e.profileId === p.id && !e.done && (e.kind === "test" || e.kind === "quiz") && e.date >= today && e.date <= soon && !prepped.has(e.id))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)
    .map((e) => ({ kind: e.kind as "test" | "quiz", date: e.date, title: scrub(e.title).slice(0, 80) }));
  const last = lastActive(s, p.id);
  const idle = last ? Math.floor((now - last) / 864e5) : 0;
  return {
    grade: p.grade,
    minutes: f.minutes + f.readingMinutes,
    lessons: f.lessons,
    sets: f.sets,
    own: f.own + lessons.own,
    helped: f.helped + lessons.help,
    missed: f.missed + lessons.missed,
    proved: f.proved,
    checksWaiting: f.checksWaiting,
    helpOn: f.helpOn,
    overdue: f.overdue,
    stuck: f.stuck,
    tests,
    ...(idle >= 5 ? { idleDays: Math.min(idle, 400) } : {}),
  };
}

/**
 * The email's content for one family and one Monday-to-Sunday week (`weekStart` = Monday 00:00
 * local), or null when nothing happened that week. `now` is when it is composed: tests coming up
 * and days without activity are counted from then.
 */
export function weeklyInput(s: StoreState, accountId: string, weekStart: number, now: number): WeeklyInput | null {
  const account = s.accounts.find((a) => a.id === accountId);
  const kids = s.profiles.filter((p) => p.accountId === accountId).sort((a, b) => a.createdAt - b.createdAt);
  if (!account || !kids.length) return null;
  const locale = s.prefs.locale;
  const names = [...kids.map((k) => k.nickname), account.displayName];
  const scrub = (text: string) => withoutNames(text, names, tr(locale, "trust.email.child"), tr(locale, "trust.email.childs"));
  const learners = kids.map((p) => {
    const twins = kids.filter((k) => k.grade === p.grade);
    const week = learnerWeek(s, p, weekStart, now, scrub);
    return twins.length > 1 ? { ...week, n: twins.indexOf(p) + 1 } : week;
  });
  if (learners.every(isQuiet)) return null;
  return { locale, weekStart: localDate(weekStart), learners };
}

/** What the next email would say if this week ended now (the Settings preview). */
export function previewWeekly(s: StoreState, accountId: string, now: number, origin: string): Email | null {
  const input = weeklyInput(s, accountId, startOfWeek(now), now);
  return input && renderWeekly(input, origin);
}

// ----- talking to /api/email/weekly -----

export type EmailMode = "send" | "preview";

let mode: Promise<EmailMode> | null = null;
/** "send" when this site can send email (Resend is configured); "preview" otherwise. */
export function emailMode(): Promise<EmailMode> {
  mode ??= fetch("/api/email/weekly", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { mode: "preview" }))
    .then((j: { mode?: EmailMode }) => (j.mode === "send" ? "send" : "preview"))
    .catch(() => "preview" as const);
  return mode;
}
/** Test hook. */
export const resetEmailMode = () => void (mode = null);

const post = (body: unknown) =>
  fetch("/api/email/weekly", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, json: (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string } }))
    .catch(() => ({ status: 0, json: {} as { ok?: boolean; error?: string } }));

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

/** Emails the confirmation link to the account's address. */
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

/** The link from the confirmation email landed here: check it with the server and keep it. */
export async function confirmWeekly(token: string, now = Date.now()): Promise<boolean> {
  const me = signedIn();
  if (!me || !/^[A-Za-z0-9_-]{20,100}$/.test(token)) return false;
  const r = await post({ action: "verify", to: me.account.email, token });
  if (!r.json.ok) return false;
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
  sending ??= sendDue(now).finally(() => (sending = null));
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
  patch((x) => ({ ...x, lastWeek: key, lastSentAt: now }));
  return "sent";
}

/**
 * For the signed-in app shell and Settings: whenever the Parent view opens with the email on, last
 * week's email goes out if it is due. Does nothing for a learner, or when the email is off.
 */
export function useWeeklyEmail() {
  const due = useStore((s) => s.session.profileId === "parent" && Boolean(weeklyOf(s, s.session.accountId)?.confirmed));
  useEffect(() => {
    if (due) void sendDueWeekly();
  }, [due]);
}
