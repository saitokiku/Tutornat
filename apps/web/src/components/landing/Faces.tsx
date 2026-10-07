"use client";

import { IconCheck, IconExternal, IconHint, IconNotYet } from "@/components/icons";
import { Stat, StatGroup } from "@/components/ui";
import { useT } from "@/i18n";
import type { Locale } from "@/lib/types";
import { answerText, check } from "@/practice/answer";
import type { Item } from "@/practice/types";
import type { HeroSet } from "./data";
import type { Outcome } from "./Sheet";

// How it works, shown rather than told: the problem from the top of the page as two parts of the product
// see it, side by side. The checker rows are run through the real checker and the tutor lines are the
// tutor's own words for this problem. The calendar and the sources get one ruled line each, with the real
// links. The parent ledger lives in the parents section, right under the problem it reacts to.

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

export function Engine({ set, item, locale, aiOn }: { set: HeroSet; item: Item; locale: Locale; aiOn: boolean }) {
  const t = useT();
  return (
    <section aria-labelledby="how" className="border-t border-border">
      <div className="mx-auto max-w-wide px-gutter py-16 sm:px-8 sm:py-24">
        <div className="max-w-[40rem]">
          <h2 id="how" className="font-brand text-t1 font-semibold text-ink sm:text-d3">
            {t("landing.how")}
          </h2>
          <p className="mt-4 text-body text-muted">{t("land.how.body")}</p>
        </div>

        <div className="mt-12 grid gap-x-10 gap-y-14 sm:mt-14 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col">
            <h3 className="font-brand text-t2 font-semibold text-ink">{t("land.f.check.title")}</h3>
            <p className="mt-2 max-w-[34rem] text-sm text-muted">{t("land.f.check.body")}</p>
            <div className="mt-6 flex-1">
              <Checker item={item} />
            </div>
          </div>
          <div className="flex min-w-0 flex-col">
            <h3 className="font-brand text-t2 font-semibold text-ink">{t("land.f.tutor.title")}</h3>
            <p className="mt-2 max-w-[34rem] text-sm text-muted">{t("land.f.tutor.body")}</p>
            <div className="mt-6 flex-1">
              <Transcript item={item} locale={locale} aiOn={aiOn} />
            </div>
          </div>
        </div>

        {/* The other two parts, one ruled line each. */}
        <dl className="mt-14 border-t border-ink sm:mt-16">
          <div className="grid gap-x-10 gap-y-1.5 border-b border-border py-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <dt className="font-brand text-t3 font-semibold text-ink">{t("land.f.cal.title")}</dt>
            <dd className="text-sm text-muted">{t("land.f.cal.body")}</dd>
          </div>
          <div className="grid gap-x-10 gap-y-1.5 border-b border-border py-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <dt className="font-brand text-t3 font-semibold text-ink">{t("land.f.sources.title")}</dt>
            <dd className="text-sm text-muted">
              {t("land.f.sources.body")}
              <span className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                {set.sources.map((s) => (
                  <a
                    key={s.id}
                    href={locale === "es" && s.urlEs ? s.urlEs : s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group k-tap gap-1.5 rounded-sm font-medium text-ink"
                  >
                    <span className="underline decoration-border-strong transition-[text-decoration-color] duration-(--duration-quick) group-hover:decoration-accent">{s.title}</span>
                    <span className="font-normal text-muted">· {s.source}</span>
                    <IconExternal size={14} className="text-muted" />
                    <span className="sr-only">({t("land.f.sources.newTab")})</span>
                  </a>
                ))}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </section>
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
                {/* What a child typed, as they typed it: a recessed slot, the same face as the answer wells. */}
                <span className="inline-flex min-w-16 items-center justify-center rounded-sm bg-panel2 px-2.5 py-1 text-sm font-semibold text-ink tabular-nums inset-shadow-well">{r.shown}</span>
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

function Transcript({ item, locale, aiOn }: { item: Item; locale: Locale; aiOn: boolean }) {
  const t = useT();
  const lines: [who: "child" | "tutor", text: string][] = [
    ["child", t("land.f.tutor.ask1")],
    ["tutor", `${t("tutor.demo.open")} ${item.hints[0]}`],
    ["child", t("land.f.tutor.ask2")],
    ["tutor", t("tutor.demo.tryFirst")],
  ];
  return (
    <figure className="flex h-full flex-col rounded-md border border-border bg-panel shadow-soft">
      <dl className="flex-1 space-y-3 px-4 py-4 sm:px-5" lang={locale}>
        {lines.map(([who, text], i) => (
          <div key={i} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[5.5rem_minmax(0,1fr)]">
            <dt className={`pt-0.5 text-xs ${who === "tutor" ? "font-semibold text-ink" : "text-muted"}`}>{who === "tutor" ? t("land.f.tutor.tutor") : t("land.f.tutor.child")}</dt>
            <dd className={`text-sm ${who === "tutor" ? "text-ink" : "text-muted"}`}>{text}</dd>
          </div>
        ))}
      </dl>
      <figcaption className="border-t border-border px-4 py-2.5 text-xs text-muted sm:px-5">{t(aiOn ? "land.f.tutor.noteOn" : "land.f.tutor.noteOff")}</figcaption>
    </figure>
  );
}

/** What a parent would see from this visit: it fills in as the visitor answers the problem above. */
export function Ledger({ outcomes }: { outcomes: Outcome[] }) {
  const t = useT();
  const count = (r: Outcome["result"]) => outcomes.filter((o) => o.result === r).length;
  return (
    <figure className="rounded-lg border border-border bg-panel shadow-soft">
      <figcaption className="border-b border-border px-4 py-3 text-sm font-medium text-ink sm:px-5">{t("land.ledger.title")}</figcaption>
      <div className="space-y-3 p-3 sm:p-4">
        <StatGroup className="grid-cols-3!">
          <Stat label={t("land.f.parent.own")} value={count("own")} />
          <Stat label={t("land.f.parent.help")} value={count("helped")} />
          <Stat label={t("land.f.parent.notYet")} value={count("notYet")} />
        </StatGroup>
        {outcomes.length === 0 ? (
          <p className="rounded-md bg-panel2/70 px-4 py-3.5 text-sm text-muted">{t("land.f.parent.empty")}</p>
        ) : (
          <ul className="k-rows">
            {outcomes.slice(0, 3).map((o, i) => (
              <li key={`${o.id}-${outcomes.length - i}`} className="k-enter flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                {o.result === "own" ? <IconCheck size={16} className="text-good" /> : o.result === "helped" ? <IconHint size={16} className="text-warn" /> : <IconNotYet size={16} className="text-muted" />}
                <span className="min-w-0 flex-1 text-sm font-medium text-ink">{o.skill}</span>
                <span className="k-meta">
                  {t(o.result === "own" ? "land.record.own" : o.result === "helped" ? "land.record.helped" : "land.f.parent.notYet")}
                  {" · "}
                  {t("land.f.parent.tries", { n: o.tries })}
                  {o.hints > 0 && ` · ${t("land.f.parent.hints", { n: o.hints })}`}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="flex items-center gap-2 px-1 text-xs text-muted">
          <IconNotYet size={14} />
          {t("land.f.parent.proved")}
        </p>
      </div>
    </figure>
  );
}
