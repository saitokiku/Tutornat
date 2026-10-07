import { z } from "zod";
import en, { type Key } from "@/i18n/en";
import es from "@/i18n/es";
import { GRADES, type Grade, type Locale } from "@/lib/types";
import { getSkill } from "@/practice/skills";

// The weekly family email, rendered from numbers only. The same function renders the preview in
// Settings and the email the server sends, so the preview is exactly what goes out. Learner names
// never appear: the email passes through a mail service, so learners are listed by grade.
// Runs on the server and in the browser: no store, no "use client" imports.

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const count = z.number().int().min(0).max(1_000_000);
const skills = z.array(z.string().max(60)).max(20).transform((ids) => ids.filter((id) => getSkill(id)));

export const LearnerWeek = z.object({
  grade: z.enum(GRADES as [Grade, ...Grade[]]),
  /** 1, 2… when two learners share a grade, so the grown-up can tell them apart. */
  n: z.number().int().min(1).max(12).optional(),
  minutes: count,
  lessons: count,
  sets: count,
  own: count,
  helped: count,
  missed: count,
  proved: skills,
  checksWaiting: skills,
  helpOn: skills,
  overdue: skills,
  stuck: skills,
  /** Tests or quizzes in the next 3 days with no prep set started. Titles have learner names removed. */
  tests: z.array(z.object({ kind: z.enum(["test", "quiz"]), date: day, title: z.string().max(80) })).max(5),
  /** Days since anything was done, when it is 5 or more. */
  idleDays: z.number().int().min(5).max(400).optional(),
});

export const WeeklyInput = z.object({
  locale: z.enum(["en", "es"]),
  /** Monday of the week described. */
  weekStart: day,
  learners: z.array(LearnerWeek).min(1).max(12),
});

export type LearnerWeek = z.infer<typeof LearnerWeek>;
export type WeeklyInput = z.infer<typeof WeeklyInput>;
export type Email = { subject: string; text: string; html: string };

const DICTS: Record<Locale, Record<Key, string>> = { en, es };

/** Same rules as i18n t(): `<key>_one` when the count is 1, `{name}` placeholders. */
export function tr(locale: Locale, key: Key, vars?: Record<string, string | number>): string {
  const one = `${key}_one` as Key;
  if (vars && vars.n === 1 && one in en) key = one;
  const s = DICTS[locale][key] ?? en[key];
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

const tag = (l: Locale) => (l === "es" ? "es-US" : "en-US");
const utcNoon = (d: string) => {
  const [y, m, dd] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, dd, 12);
};

/** "Oct 6 – 12" / "6–12 oct": the Monday-to-Sunday week, the same wherever it is rendered. */
export function weekRange(locale: Locale, weekStart: string) {
  const a = utcNoon(weekStart);
  return new Intl.DateTimeFormat(tag(locale), { month: "short", day: "numeric", timeZone: "UTC" }).formatRange(a, a + 6 * 864e5);
}

const dayLabel = (locale: Locale, d: string) =>
  new Intl.DateTimeFormat(tag(locale), { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }).format(utcNoon(d));

export function learnerLabel(locale: Locale, l: Pick<LearnerWeek, "grade" | "n">) {
  const g = l.grade === "K" ? tr(locale, "grade.K") : l.grade === "adult" ? tr(locale, "grade.adult") : tr(locale, "grade.n", { n: l.grade });
  return l.n ? tr(locale, "trust.email.learnerN", { grade: g, n: l.n }) : g;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Removes family names from free text: "Ada's spelling test" → "your child's spelling test". Whole
 * words only, any case, with English possessives. For anything typed by a family that leaves the
 * device (email, model calls); the names come from the device and are never sent themselves.
 */
export function withoutNames(text: string, names: string[], bare: string, possessive: string) {
  const list = names.map((n) => n.trim()).filter((n) => n.length >= 2);
  if (!list.length) return text;
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${list.map(escapeRe).join("|")})('s|’s)?(?![\\p{L}\\p{N}])`, "giu");
  return text.replace(re, (_m, s?: string) => (s ? possessive : bare)).replace(/\s+/g, " ").trim();
}

export const isQuiet = (l: LearnerWeek) => l.minutes + l.lessons + l.sets + l.own + l.helped + l.missed === 0;

type Section = { title: string; facts: string[]; look: string[]; quiet: boolean };

function sections(input: WeeklyInput): Section[] {
  const { locale } = input;
  const names = (ids: string[]) => ids.map((id) => getSkill(id)!.title[locale]).join(", ");
  return input.learners.map((l) => {
    const quiet = isQuiet(l);
    const facts = quiet
      ? [tr(locale, "trust.email.quiet")]
      : [
          tr(locale, "trust.email.minutes", { n: l.minutes }),
          tr(locale, "trust.email.answers", { own: l.own, help: l.helped, missed: l.missed }),
          tr(locale, "trust.email.done", { lessons: l.lessons, sets: l.sets }),
          ...(l.proved.length ? [tr(locale, "trust.email.proved", { skills: names(l.proved) })] : []),
          ...(l.checksWaiting.length ? [tr(locale, "trust.email.waiting", { skills: names(l.checksWaiting) })] : []),
          ...(l.helpOn.length ? [tr(locale, "trust.email.helpOn", { skills: names(l.helpOn) })] : []),
        ];
    const look = [
      ...(l.overdue.length ? [tr(locale, "trust.email.overdue", { skills: names(l.overdue) })] : []),
      ...(l.stuck.length ? [tr(locale, "trust.email.stuck", { skills: names(l.stuck) })] : []),
      ...l.tests.map((e) => tr(locale, e.kind === "quiz" ? "trust.email.quiz" : "trust.email.test", { date: dayLabel(locale, e.date), title: e.title })),
      ...(l.idleDays ? [tr(locale, "trust.email.idle", { n: l.idleDays })] : []),
    ];
    return { title: learnerLabel(locale, l), facts, look, quiet };
  });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const C = { paper: "#FAFAF9", panel: "#FFFFFF", border: "#E4E3DF", ink: "#1A1917", muted: "#6B6862", accent: "#A93B5D" };
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

function page(locale: Locale, subject: string, body: string) {
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head><body style="margin:0;background:${C.paper};color:${C.ink};font-family:${FONT};font-size:16px;line-height:1.55"><div style="max-width:560px;margin:0 auto;padding:28px 20px">
<p style="margin:0 0 20px;font-size:18px;font-weight:700;letter-spacing:-0.01em">Kaizen<span style="color:${C.accent}">EDU</span></p>
${body}
</div></body></html>`;
}

const list = (items: string[]) => `<ul style="margin:0;padding-left:20px">${items.map((i) => `<li style="margin:2px 0">${esc(i)}</li>`).join("")}</ul>`;
const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="display:inline-block;background:${C.ink};color:${C.paper};border-radius:999px;padding:11px 20px;text-decoration:none;font-weight:600">${esc(label)}</a></p>`;
const small = (s: string) => `<p style="margin:0 0 10px;color:${C.muted};font-size:13px">${esc(s)}</p>`;

/** The weekly email. `origin` is the site the links point to, e.g. https://kaizenedu.net. */
export function renderWeekly(input: WeeklyInput, origin: string): Email {
  const { locale } = input;
  const range = weekRange(locale, input.weekStart);
  const subject = tr(locale, "trust.email.subject", { range });
  const family = `${origin}/family`;
  const settings = `${origin}/settings`;
  const parts = sections(input);
  const intro = tr(locale, "trust.email.intro", { range });
  const names = tr(locale, "trust.email.names");
  const honest = tr(locale, "child.honest");
  const why = tr(locale, "trust.email.why");

  const text = [
    intro,
    names,
    "",
    ...parts.flatMap((p) => [p.title, ...p.facts.map((f) => `- ${f}`), ...(p.look.length ? [`${tr(locale, "trust.email.look")}:`, ...p.look.map((f) => `- ${f}`)] : []), ""]),
    `${tr(locale, "trust.email.open")}: ${family}`,
    "",
    honest,
    `${why} ${settings}`,
  ].join("\n");

  const html = page(
    locale,
    subject,
    `<h1 style="margin:0 0 6px;font-size:22px;line-height:1.25;letter-spacing:-0.015em">${esc(intro)}</h1>
<p style="margin:0 0 20px;color:${C.muted};font-size:14px">${esc(names)}</p>
${parts
  .map(
    (p) =>
      `<div style="background:${C.panel};border:1px solid ${C.border};border-radius:14px;padding:16px 18px;margin:0 0 12px"><h2 style="margin:0 0 8px;font-size:17px">${esc(p.title)}</h2>${p.quiet ? `<p style="margin:0;color:${C.muted}">${esc(p.facts[0])}</p>` : list(p.facts)}${
        p.look.length ? `<p style="margin:12px 0 4px;font-weight:600">${esc(tr(locale, "trust.email.look"))}</p>${list(p.look)}` : ""
      }</div>`,
  )
  .join("\n")}
${button(family, tr(locale, "trust.email.open"))}
${small(honest)}
<p style="margin:0;color:${C.muted};font-size:13px">${esc(why)} <a href="${esc(settings)}" style="color:${C.muted}">${esc(settings.replace(/^https?:\/\//, ""))}</a></p>`,
  );
  return { subject, text, html };
}

/** Sent once when a grown-up turns the weekly email on: proves the address is theirs. */
export function renderConfirm(locale: Locale, link: string): Email {
  const subject = tr(locale, "trust.email.confirm.subject");
  const body = tr(locale, "trust.email.confirm.body");
  const ignore = tr(locale, "trust.email.confirm.ignore");
  return {
    subject,
    text: [body, "", link, "", ignore].join("\n"),
    html: page(locale, subject, `<p style="margin:0 0 8px">${esc(body)}</p>${button(link, tr(locale, "trust.email.confirm.button"))}${small(ignore)}`),
  };
}
