"use client";

import { useId } from "react";
import { MathText } from "@/components/practice/MathText";
import { VisualView } from "@/components/stage/visuals";
import { SUBJECT_TINT } from "@/components/ui";
import { useT } from "@/i18n";
import type { Locale, Subject } from "@/lib/types";
import type { Extras, PreviewPair } from "@/lib/review";
import { answerText } from "@/practice/answer";
import type { Choice, Item } from "@/practice/types";

/** One question as both languages see it from the same seed, with everything a reviewer checks. */
export function ItemPair({ pair, subject, n }: { pair: PreviewPair; subject: Subject; n: number }) {
  const t = useT();
  return (
    <li className="rounded-md border border-border bg-panel">
      <p className="flex flex-wrap items-center justify-between gap-x-3 border-b border-border px-4 py-2 font-opmono text-xs text-muted">
        <span>#{n}</span>
        <span>{t("trust.review.seed", { seed: pair.seed })}</span>
      </p>
      {pair.versions > 1 && <p className="border-b border-border bg-panel2/60 px-4 py-2 text-xs text-muted">{t("trust.review.versions", { n: pair.versions })}</p>}
      <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
        <Side item={pair.en} others={pair.others.en} locale="en" subject={subject} />
        <Side item={pair.es} others={pair.others.es} locale="es" subject={subject} />
      </div>
    </li>
  );
}

function Side({ item, others, locale, subject }: { item: Item; others: Extras; locale: Locale; subject: Subject }) {
  const t = useT();
  const id = useId();
  const key = item.answer.kind === "choice" ? item.answer.index : -1;
  return (
    <div role="group" aria-labelledby={`${id}-${locale}`} className="min-w-0 space-y-3 px-4 py-4 text-sm">
      <h4 id={`${id}-${locale}`} className="text-xs font-semibold text-muted">
        {t(locale === "en" ? "trust.review.english" : "trust.review.spanish")}
      </h4>
      <p lang={locale} className="text-body font-medium text-ink">
        <MathText parts={item.prompt} />
      </p>
      <Line label={t("trust.review.readAloud")} lang={locale}>
        {item.say}
      </Line>
      {item.picture && (
        <p className="flex items-center gap-3">
          <span aria-hidden="true" className="text-t1">
            {item.picture}
          </span>
          <span className="text-muted">
            {t("trust.review.picture")}: <span lang={locale}>{item.alt}</span>
          </span>
        </p>
      )}
      {item.visual && (
        <figure className="space-y-1">
          <div className="max-w-xs">
            <VisualView visual={item.visual} alt={item.alt ?? ""} tint={SUBJECT_TINT[subject]} />
          </div>
          <figcaption className="text-xs text-muted">
            {t("trust.review.picture")}: <span lang={locale}>{item.alt}</span>
          </figcaption>
        </figure>
      )}
      {item.markable && <p className="text-xs text-muted">{t("trust.review.markable")}</p>}

      {item.choices && (
        <div>
          <h5 className="text-xs font-semibold text-muted">{t("trust.review.choices")}</h5>
          <ul className="mt-1 space-y-1">
            {item.choices.map((c, i) => (
              <li key={i} className={`flex flex-wrap items-baseline gap-x-2 rounded-sm px-2 py-1 ${i === key ? "bg-good/10" : ""}`}>
                <span lang={locale} className="font-medium text-ink">
                  {c.picture && <span aria-hidden="true">{c.picture} </span>}
                  {c.label}
                </span>
                {c.say && c.say !== c.label && (
                  <span lang={locale} className="text-xs text-muted">
                    “{c.say}”
                  </span>
                )}
                {i === key && <span className="text-xs font-semibold text-ink">{t("trust.review.key")}</span>}
                {c.why && <span className="font-opmono text-xs text-warn">{t("trust.review.why", { why: c.why })}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {others.choices.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-muted">{t("trust.review.otherChoices")}</h5>
          <ul className="mt-1 space-y-1">
            {others.choices.map((c: Choice) => (
              <li key={`${c.label}|${c.why ?? ""}`} className="flex flex-wrap items-baseline gap-x-2 px-2 py-1">
                <span lang={locale} className="font-medium text-ink">
                  {c.picture && <span aria-hidden="true">{c.picture} </span>}
                  {c.label}
                </span>
                {c.why && <span className="font-opmono text-xs text-warn">{t("trust.review.why", { why: c.why })}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {item.answer.kind !== "choice" && (
        <Line label={t("trust.review.answer")} lang={locale}>
          <span className="font-opmono">{answerText(item.answer)}</span>
          {item.answer.kind === "text" && item.answer.accept.length > 1 && (
            <span className="block text-xs text-muted">{t("trust.review.accepts", { list: item.answer.accept.slice(1).join(" · ") })}</span>
          )}
        </Line>
      )}
      <Line label={t("trust.review.input")}>{t(`trust.review.inputKind.${item.input}`)}</Line>

      <WrongList label={t("trust.review.wrong")} items={item.wrong ?? []} lang={locale} />
      <WrongList label={t("trust.review.otherWrong")} items={others.wrong} lang={locale} />

      <Numbered label={t("trust.review.hints")} items={item.hints} lang={locale} />
      <Numbered label={t("trust.review.otherHints")} items={others.hints} lang={locale} bullets />
      <Numbered label={t("trust.review.steps")} items={item.steps} lang={locale} />
      <Numbered label={t("trust.review.otherSteps")} items={others.steps} lang={locale} bullets />
      <p className="font-opmono text-xs text-muted">{t("trust.review.pace", { n: item.seconds })}</p>
    </div>
  );
}

function WrongList({ label, items, lang }: { label: string; items: { value: string; why: string }[]; lang: Locale }) {
  const t = useT();
  if (!items.length) return null;
  return (
    <div>
      <h5 className="text-xs font-semibold text-muted">{label}</h5>
      <ul className="mt-1 space-y-0.5">
        {items.map((w) => (
          <li key={`${w.value}|${w.why}`} className="font-opmono text-xs">
            <span lang={lang} className="text-ink">
              {w.value}
            </span>{" "}
            <span className="text-warn">{t("trust.review.why", { why: w.why })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Line({ label, lang, children }: { label: string; lang?: Locale; children: React.ReactNode }) {
  return (
    <p>
      <span className="text-xs font-semibold text-muted">{label}: </span>
      <span lang={lang} className="text-ink">
        {children}
      </span>
    </p>
  );
}

/** A numbered list (a version's hints or steps, in order), or bullets for ones gathered from other versions. */
function Numbered({ label, items, lang, bullets = false }: { label: string; items: string[]; lang: Locale; bullets?: boolean }) {
  if (!items.length) return null;
  const List = bullets ? "ul" : "ol";
  return (
    <div>
      <h5 className="text-xs font-semibold text-muted">{label}</h5>
      <List lang={lang} className={`mt-1 space-y-0.5 pl-5 text-ink ${bullets ? "list-disc" : "list-decimal"}`}>
        {items.map((h, i) => (
          <li key={i}>{h}</li>
        ))}
      </List>
    </div>
  );
}
