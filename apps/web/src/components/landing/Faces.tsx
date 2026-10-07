"use client";

import type { ReactNode } from "react";
import { IconCheck, IconExternal, IconHint, IconNotYet, IconPractice, IconTest } from "@/components/icons";
import { Badge, Stat, StatGroup } from "@/components/ui";
import { useT } from "@/i18n";
import type { Locale } from "@/lib/types";
import { answerText, check } from "@/practice/answer";
import type { Item } from "@/practice/types";
import type { HeroSet, LandingData } from "./data";
import type { Outcome } from "./Sheet";

// How it works, shown rather than told: the problem from the top of the page as each part of the product
// sees it. The checker rows are run through the real checker, the tutor lines are the demo tutor's own
// words for this problem, the sources are the ones the product links for this skill, and the parent
// ledger fills in from what the visitor just did.

const minus = (s: string) => s.replace(/-/g, "−");

/** Four ways a learner might answer, each run through the checker. */
function samples(item: Item): { shown: string; verdict: "right" | "same" | "notYet" }[] {
  const a = item.answer;
  let tries: string[] = [];
  if (a.kind === "fraction") {
    const decimal = [2, 4, 5, 8, 10].includes(a.d) ? [String(a.n / a.d)] : [];
    tries = [`${a.n}/${a.d}`, `${a.n * 2}/${a.d * 2}`, ...decimal, `${a.d}/${a.n}`].slice(0, 4);
  } else if (a.kind === "number") {
    tries = [String(a.value), `x = ${a.value}`, String(-a.value), String(a.value + 2)];
  } else if (a.kind === "choice" && item.choices) {
    const wrong = item.choices.map((_, i) => i).filter((i) => i !== a.index);
    return [a.index, ...wrong.slice(0, 2)].map((i) => ({ shown: item.choices![i].label, verdict: i === a.index ? "right" : "notYet" }));
  }
  const canonical = answerText(a, item.choices);
  return tries.map((r) => ({ shown: minus(r), verdict: check(a, r).correct ? (r === canonical ? "right" : "same") : "notYet" }));
}

export function Faces({ data, set, item, locale, outcomes }: { data: LandingData; set: HeroSet; item: Item; locale: Locale; outcomes: Outcome[] }) {
  const t = useT();
  const { rules } = data;
  return (
    <section aria-labelledby="how" className="border-t border-border">
      <div className="mx-auto max-w-wide px-gutter py-20 sm:px-8 sm:py-28">
        <div className="max-w-[40rem]">
          <h2 id="how" className="font-brand text-t1 font-semibold text-ink sm:text-d3">
            {t("landing.how")}
          </h2>
          <p className="mt-4 text-body text-muted">{t("land.how.body")}</p>
        </div>
        <div className="mt-12 divide-y divide-border border-y border-border sm:mt-16">
          <Face title={t("land.f.check.title")} body={t("land.f.check.body")}>
            <Checker item={item} />
          </Face>
          <Face title={t("land.f.tutor.title")} body={t("land.f.tutor.body")}>
            <Transcript item={item} locale={locale} />
          </Face>
          <Face title={t("land.f.sources.title")} body={t("land.f.sources.body")}>
            <Sources set={set} locale={locale} />
          </Face>
          <Face title={t("land.f.cal.title")} body={t("land.f.cal.body")}>
            <Week days={data.weekdays[locale]} skill={set.title[locale]} />
          </Face>
          <Face title={t("land.f.parent.title")} body={t("land.f.parent.body", { days: rules.secondCheckDays, pass: rules.checkPass, size: rules.checkSize })}>
            <Ledger outcomes={outcomes} />
          </Face>
        </div>
      </div>
    </section>
  );
}

function Face({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="grid gap-6 py-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-12 md:py-14 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]">
      <div className="max-w-[30rem]">
        <h3 className="font-brand text-t2 font-semibold text-ink">{title}</h3>
        <p className="mt-2.5 text-sm text-muted">{body}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

const VERDICT = {
  right: { key: "land.f.check.right", icon: IconCheck, tone: "text-good" },
  same: { key: "land.f.check.same", icon: IconCheck, tone: "text-good" },
  notYet: { key: "land.f.check.notYet", icon: IconNotYet, tone: "text-muted" },
} as const;

function Checker({ item }: { item: Item }) {
  const t = useT();
  const rows = samples(item);
  return (
    <table className="w-full overflow-hidden rounded-md border border-border bg-panel text-left shadow-soft">
      <thead>
        <tr className="border-b border-border text-xs text-muted">
          <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">
            {item.input === "choices" ? t("land.f.check.tapped") : t("land.f.check.typed")}
          </th>
          <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">
            {t("land.f.check.says")}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((r) => {
          const v = VERDICT[r.verdict];
          return (
            <tr key={r.shown}>
              <td className="px-4 py-3 sm:px-5">
                <span className="inline-flex min-w-16 items-center justify-center rounded-sm bg-panel2 px-2.5 py-1 font-opmono text-sm text-ink inset-shadow-well">{r.shown}</span>
              </td>
              <td className="px-4 py-3 text-sm text-ink sm:px-5">
                <span className="inline-flex items-center gap-2">
                  <v.icon size={16} className={v.tone} />
                  {t(v.key)}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Transcript({ item, locale }: { item: Item; locale: Locale }) {
  const t = useT();
  const lines: [who: "child" | "tutor", text: string][] = [
    ["child", t("land.f.tutor.ask1")],
    ["tutor", `${t("tutor.demo.open")} ${item.hints[0]}`],
    ["child", t("land.f.tutor.ask2")],
    ["tutor", t("tutor.demo.tryFirst")],
  ];
  return (
    <figure className="rounded-md border border-border bg-panel shadow-soft">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 sm:px-5">
        <Badge>{t("tutor.demoLabel")}</Badge>
      </div>
      <dl className="space-y-3 px-4 py-4 sm:px-5" lang={locale}>
        {lines.map(([who, text], i) => (
          <div key={i} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
            <dt className={`pt-0.5 text-xs ${who === "tutor" ? "font-semibold text-ink" : "text-muted"}`}>{who === "tutor" ? t("land.f.tutor.tutor") : t("land.f.tutor.child")}</dt>
            <dd className={`text-sm ${who === "tutor" ? "text-ink" : "text-muted"}`}>{text}</dd>
          </div>
        ))}
      </dl>
      <figcaption className="border-t border-border px-4 py-2.5 text-xs text-muted sm:px-5">{t("land.f.tutor.note")}</figcaption>
    </figure>
  );
}

function Sources({ set, locale }: { set: HeroSet; locale: Locale }) {
  const t = useT();
  return (
    <ul className="k-rows shadow-soft">
      {set.sources.map((s) => (
        <li key={s.id} className="relative transition-colors duration-(--duration-quick) hover:bg-panel2/60">
          <a
            href={locale === "es" && s.urlEs ? s.urlEs : s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 px-4 py-3.5 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:px-5"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-ink">{s.title}</span>
              <span className="mt-0.5 block text-xs text-muted">{s.source}</span>
              <span className="mt-1.5 block text-sm text-muted">{s.about[locale]}</span>
            </span>
            <IconExternal size={16} className="mt-1 text-muted" />
            <span className="sr-only">({t("land.f.sources.newTab")})</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Week({ days, skill }: { days: string[]; skill: string }) {
  const t = useT();
  return (
    <figure className="rounded-md border border-border bg-panel shadow-soft">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 sm:px-5">
        <Badge>{t("land.f.cal.example")}</Badge>
      </div>
      <ol aria-label={t("land.f.cal.label")} className="grid grid-cols-5 gap-1.5 p-3 sm:gap-2 sm:p-4">
        {days.map((d, i) => {
          const test = i === 4;
          const prep = i >= 1 && i <= 3;
          return (
            <li key={d} className={`flex min-h-24 flex-col gap-2 rounded-sm px-1.5 py-2 sm:px-2.5 ${test ? "bg-panel2" : ""}`}>
              <span className="text-center font-opmono text-xs text-muted">{d}</span>
              {prep && (
                <span className="flex items-center justify-center gap-1 rounded-full border border-border-strong px-1 py-1 text-center text-xs font-medium text-ink">
                  <IconPractice size={13} className="hidden text-muted sm:block" />
                  {t("land.f.cal.prep")}
                </span>
              )}
              {test && (
                <span className="flex items-center justify-center gap-1 rounded-full bg-ink px-1 py-1 text-center text-xs font-semibold text-paper">
                  <IconTest size={13} className="hidden sm:block" />
                  {t("land.f.cal.test")}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <figcaption className="border-t border-border px-4 py-2.5 text-xs text-muted sm:px-5">{t("land.f.cal.skill", { skill })}</figcaption>
    </figure>
  );
}

function Ledger({ outcomes }: { outcomes: Outcome[] }) {
  const t = useT();
  const count = (r: Outcome["result"]) => outcomes.filter((o) => o.result === r).length;
  return (
    <div className="space-y-3">
      <StatGroup className="grid-cols-3! shadow-soft">
        <Stat label={t("land.f.parent.own")} value={count("own")} />
        <Stat label={t("land.f.parent.help")} value={count("helped")} />
        <Stat label={t("land.f.parent.notYet")} value={count("notYet")} />
      </StatGroup>
      {outcomes.length === 0 ? (
        <p className="rounded-md border border-dashed border-border-strong px-4 py-4 text-sm text-muted sm:px-5">{t("land.f.parent.empty")}</p>
      ) : (
        <ul className="k-rows">
          {outcomes.slice(0, 3).map((o, i) => (
            <li key={`${o.id}-${outcomes.length - i}`} className="k-enter flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 sm:px-5">
              {o.result === "own" ? <IconCheck size={16} className="text-good" /> : o.result === "helped" ? <IconHint size={16} className="text-warn" /> : <IconNotYet size={16} className="text-muted" />}
              <span className="min-w-0 flex-1 text-sm font-medium text-ink">{o.skill}</span>
              <span className="text-xs text-muted">
                {t(o.result === "own" ? "land.record.own" : o.result === "helped" ? "land.record.helped" : "land.f.parent.notYet")}
                <span className="font-opmono">
                  {" · "}
                  {t("land.f.parent.tries", { n: o.tries })}
                  {o.hints > 0 && ` · ${t("land.f.parent.hints", { n: o.hints })}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="flex items-center gap-2 text-xs text-muted">
        <IconNotYet size={14} />
        {t("land.f.parent.proved")}
      </p>
    </div>
  );
}
