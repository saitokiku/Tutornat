"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { IconArrowRight, IconCheck, IconHint, IconMinus, IconNotYet, IconReadAloud, IconRefresh, IconStop } from "@/components/icons";
import { MathText } from "@/components/practice/MathText";
import { speakText } from "@/components/stage/hear";
import { VisualView } from "@/components/stage/visuals";
import { Button, Segmented, SUBJECT_TINT, SubjectDot, announce, btn } from "@/components/ui";
import { gradeLabel, useT } from "@/i18n";
import type { Locale } from "@/lib/types";
import { check, type Verdict } from "@/practice/answer";
import type { Item } from "@/practice/types";
import type { BandKey, HeroSet } from "./data";
import { HeroLine, Stacked, type Mark } from "./NumberLine";

// A real practice item from the engine, played the way the product plays it: "not yet", never "wrong";
// a hint ladder; worked steps after two tries; and the record says "with help" whenever help was used.
// Nothing here writes to the store: it is a try-out, and it says so.

export type Outcome = { id: string; skill: string; result: "own" | "helped" | "notYet"; tries: number; hints: number };

const BAND_ORDER: BandKey[] = ["k2", "35", "69"];
const BAND_LABEL = { k2: "land.band.k2", "35": "land.band.35", "69": "land.band.69" } as const;

const FORM_KEY = {
  simplest: "practice.form.simplest",
  factored: "practice.form.factored",
  expanded: "practice.form.expanded",
  simplified: "practice.form.simplified",
  remainder: "practice.form.remainder",
} as const;

const noop = () => () => {};
/** Speech synthesis exists in this browser. False on the server, so the first paint matches. */
const useCanSpeak = () => useSyncExternalStore(noop, () => "speechSynthesis" in window, () => false);

export function Sheet({
  set,
  item,
  band,
  onBand,
  locale,
  onResult,
  onNext,
}: {
  set: HeroSet;
  item: Item;
  band: BandKey;
  onBand: (b: BandKey) => void;
  locale: Locale;
  onResult: (o: Outcome) => void;
  onNext: () => void;
}) {
  const t = useT();
  const young = band === "k2";
  return (
    <section aria-labelledby="sheet-title" data-young={young || undefined} className="rounded-lg border border-border bg-panel shadow-lift">
      <h2 id="sheet-title" className="sr-only">
        {t("land.sheet.title")}
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-border px-4 py-3 sm:px-6">
        <p className="flex min-w-0 items-center gap-2 text-xs text-muted">
          <SubjectDot subject="math" />
          <span className="font-medium text-ink">{t("subject.math")}</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">{gradeLabel(locale, set.grade)}</span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span className="hidden truncate sm:inline">{set.title[locale]}</span>
        </p>
        <Segmented
          label={t("land.sheet.grade")}
          value={band}
          onChange={(v) => onBand(v as BandKey)}
          options={BAND_ORDER.map((b) => ({ value: b, label: <span className="font-opmono tabular-nums">{t(BAND_LABEL[b])}</span> }))}
        />
      </div>
      <Problem key={`${item.id}:${locale}`} item={item} skill={set.title[locale]} locale={locale} young={young} onResult={onResult} onNext={onNext} />
    </section>
  );
}

type Feedback = { kind: "right" } | { kind: "notYet"; form?: Verdict["form"] } | null;

function Problem({
  item,
  skill,
  locale,
  young,
  onResult,
  onNext,
}: {
  item: Item;
  skill: string;
  locale: Locale;
  young: boolean;
  onResult: (o: Outcome) => void;
  onNext: () => void;
}) {
  const t = useT();
  const promptId = useId();
  const canSpeak = useCanSpeak();
  const [speaking, setSpeaking] = useState(false);
  const [tries, setTries] = useState(0);
  const [hints, setHints] = useState(0);
  const [shown, setShown] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [top, setTop] = useState("");
  const [bottom, setBottom] = useState("");
  const [num, setNum] = useState("");
  const [tried, setTried] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const topRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLInputElement>(null);
  const numRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const done = feedback?.kind === "right";
  // Same rule as the practice runner: a hint, the worked steps or an earlier miss make it "with help".
  const helped = hints > 0 || shown || tries > 0;

  useEffect(() => () => void (typeof window !== "undefined" && "speechSynthesis" in window && speechSynthesis.cancel()), []);
  useEffect(() => {
    if (done) nextRef.current?.focus();
  }, [done]);

  const say = () => {
    if (speaking) {
      speechSynthesis.cancel();
      return setSpeaking(false);
    }
    if (speakText(item.say, locale, () => setSpeaking(false))) setSpeaking(true);
  };

  const response = item.input === "fraction" ? `${top}/${bottom}` : item.input === "choices" ? "" : num;
  const ready = item.input === "fraction" ? Boolean(top && bottom) : Boolean(num.replace("−", ""));

  const submit = (answer: string | number) => {
    if (done) return;
    const verdict = check(item.answer, answer);
    if (verdict.correct) {
      setFeedback({ kind: "right" });
      onResult({ id: item.id, skill, result: helped ? "helped" : "own", tries: tries + 1, hints });
      announce(helped ? t("practice.rightHelped") : t("practice.right"));
      return;
    }
    setTries((n) => n + 1);
    setFeedback({ kind: "notYet", form: verdict.form });
    // Keep what they wrote, selected, so the next try replaces it in one go.
    const field = item.input === "fraction" ? topRef.current : numRef.current;
    requestAnimationFrame(() => field?.select());
  };

  const pick = (i: number) => {
    if (done) return;
    setPicked(i);
    if (!check(item.answer, i).correct) setTried((list) => (list.includes(i) ? list : [...list, i]));
    submit(i);
  };
  const edit = (set: (v: string) => void, v: string) => {
    set(v);
    if (feedback?.kind === "notYet") setFeedback(null);
  };

  const next = () => {
    if (!done && tries > 0) onResult({ id: item.id, skill, result: "notYet", tries, hints });
    onNext();
  };

  const onTopKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "/" || e.key === "ArrowDown") {
      e.preventDefault();
      bottomRef.current?.focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!bottom) bottomRef.current?.focus();
      else if (ready) submit(response);
    }
  };
  const onBottomKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" || (e.key === "Backspace" && !bottom)) {
      e.preventDefault();
      topRef.current?.focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (ready) submit(response);
      else if (!top) topRef.current?.focus();
    }
  };
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 3);
  const signed = (v: string) => {
    const neg = /^[-−–]/.test(v.trim());
    const d = v.replace(/\D/g, "").slice(0, 4);
    return neg ? `−${d}` : d;
  };

  const mark: Mark = done ? "right" : feedback?.kind === "notYet" ? "notYet" : "none";
  const answerMark =
    item.answer.kind === "fraction" ? <Stacked n={item.answer.n} d={item.answer.d} className="text-t2" /> : item.answer.kind === "number" ? <span className="font-opmono text-t2 font-medium">{String(item.answer.value).replace("-", "−")}</span> : null;

  const well = `rounded-sm border border-border bg-panel2 text-center font-opmono font-medium text-ink inset-shadow-well tabular-nums transition-colors duration-(--duration-quick) hover:border-border-strong focus-visible:border-accent focus-visible:bg-panel focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-accent disabled:text-ink ${
    young ? "size-16 text-d3" : "size-14 text-t1"
  }`;

  const record = done
    ? helped
      ? t("land.record.helped")
      : t("land.record.own")
    : tries > 0
      ? t("land.record.trying", { n: tries })
      : t("land.record.none");
  const RecordIcon = done ? (helped ? IconHint : IconCheck) : tries > 0 ? IconNotYet : null;

  return (
    <>
      <div className={young ? "px-4 pb-6 pt-6 sm:px-8 sm:pt-8" : "px-4 pb-5 pt-6 sm:px-8 sm:pt-7"}>
        <div className="flex items-start justify-between gap-4">
          <p id={promptId} className={`min-w-0 font-brand font-semibold text-ink ${young ? "text-d3" : "text-t1"}`}>
            <MathText parts={item.prompt} />
          </p>
          <button
            type="button"
            onClick={say}
            aria-pressed={speaking}
            aria-label={speaking ? t("stage.stopReading") : t("stage.readAloud")}
            title={speaking ? t("stage.stopReading") : t("stage.readAloud")}
            className={`k-btn-secondary shrink-0 px-0 aria-pressed:border-accent aria-pressed:text-accent ${young ? "size-14" : "size-target"} ${canSpeak ? "" : "invisible"}`}
          >
            {speaking ? <IconStop size={young ? 24 : 20} /> : <IconReadAloud size={young ? 24 : 20} />}
          </button>
        </div>

        <div className="mt-4">
          {item.visual?.kind === "number-line" ? (
            <HeroLine {...item.visual} alt={item.alt ?? ""} tint={SUBJECT_TINT.math} mark={mark} answer={answerMark} />
          ) : item.visual ? (
            <div className={`flex justify-center py-2 ${young ? "[&_svg]:max-w-[min(100%,22rem)]!" : ""}`}>
              <VisualView visual={item.visual} alt={item.alt ?? ""} tint={SUBJECT_TINT.math} />
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4">
          {item.input === "fraction" && (
            <fieldset className="contents" disabled={done}>
              <legend className="sr-only">{t("land.sheet.fraction")}</legend>
              <span className="inline-flex flex-col items-center gap-1.5">
                <input
                  ref={topRef}
                  value={top}
                  onChange={(e) => edit(setTop, digits(e.target.value))}
                  onKeyDown={onTopKey}
                  inputMode="numeric"
                  autoComplete="off"
                  enterKeyHint="next"
                  placeholder="?"
                  aria-label={t("practice.numerator")}
                  className={well}
                />
                <span aria-hidden="true" className="h-0.5 w-16 rounded-full bg-ink" />
                <input
                  ref={bottomRef}
                  value={bottom}
                  onChange={(e) => edit(setBottom, digits(e.target.value))}
                  onKeyDown={onBottomKey}
                  inputMode="numeric"
                  autoComplete="off"
                  enterKeyHint="done"
                  placeholder="?"
                  aria-label={t("practice.denominator")}
                  className={well}
                />
              </span>
            </fieldset>
          )}
          {item.input === "keypad" && (
            <span className="inline-flex items-center gap-2">
              {item.keys?.includes("-") && (
                <button
                  type="button"
                  disabled={done}
                  aria-pressed={num.startsWith("−")}
                  aria-label={t("land.sheet.negative")}
                  title={t("land.sheet.negative")}
                  onClick={() => {
                    setNum((v) => (v.startsWith("−") ? v.slice(1) : `−${v}`));
                    numRef.current?.focus();
                  }}
                  className="k-btn-secondary size-target px-0 aria-pressed:border-accent aria-pressed:bg-accent/8 aria-pressed:text-accent"
                >
                  <IconMinus size={20} strokeWidth={2.2} />
                </button>
              )}
              <input
                ref={numRef}
                value={num}
                disabled={done}
                onChange={(e) => edit(setNum, signed(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (ready) submit(num);
                  }
                }}
                inputMode="numeric"
                autoComplete="off"
                enterKeyHint="done"
                placeholder="?"
                aria-label={t("practice.yourAnswer")}
                className={`${well} w-28`}
              />
            </span>
          )}
          {item.input === "choices" && item.choices && (
            <div role="group" aria-label={t("land.sheet.choices")} className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
              {item.choices.map((c, i) => {
                const right = done && picked === i;
                const miss = tried.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pick(i)}
                    disabled={done && !right}
                    className={`relative grid min-h-18 place-items-center rounded-md border bg-panel font-opmono text-d3 font-medium text-ink shadow-soft transition-[border-color,background-color,box-shadow,transform] duration-(--duration-quick) ease-out-quart hover:border-border-strong active:scale-[0.98] active:shadow-none disabled:opacity-45 ${
                      right ? "border-good bg-good/8 shadow-none" : miss ? "border-dashed border-border-strong bg-panel2 text-muted shadow-none" : "border-border"
                    }`}
                  >
                    {c.label}
                    {right && <IconCheck size={20} className="k-draw absolute right-2.5 top-2.5 text-good" />}
                  </button>
                );
              })}
            </div>
          )}
          <div className={`flex flex-col items-start gap-3 ${item.input === "choices" ? "w-full" : "min-w-[13rem] flex-1"}`}>
            {done ? (
              <button ref={nextRef} type="button" onClick={onNext} className={btn("primary", "md", young ? "min-h-14 min-w-44 text-body" : "min-w-40")}>
                {t("land.sheet.another")} <IconArrowRight size={young ? 18 : 16} />
              </button>
            ) : (
              item.input !== "choices" && (
                <Button onClick={() => submit(response)} disabled={!ready} className="min-w-32">
                  {t("practice.check")}
                </Button>
              )
            )}
            <div aria-live="polite" className={`flex min-h-7 items-start ${young ? "text-t3" : "text-sm"} ${done && item.input === "choices" ? "order-first" : ""}`}>
              {done && (
                <p className="flex items-center gap-2 font-semibold text-good">
                  <IconCheck size={18} className="k-draw" /> {helped ? t("practice.rightHelped") : t("practice.right")}
                </p>
              )}
              {feedback?.kind === "notYet" && (
                <p className="k-enter flex items-start gap-2 font-medium text-ink">
                  <IconNotYet size={18} className="mt-0.5 shrink-0 text-muted" />
                  <span>{feedback.form ? t(FORM_KEY[feedback.form]) : tries >= 2 ? t("practice.notYetSteps") : t("practice.notYet")}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {hints > 0 && (
          <ol aria-label={t("practice.hints")} className="mt-3 space-y-2">
            {item.hints.slice(0, hints).map((h, i) => (
              <li key={i} className={`k-enter flex items-start gap-3 rounded-sm bg-panel2 px-4 py-3 text-ink ${young ? "text-body" : "text-sm"}`}>
                <IconHint size={18} className="mt-0.5 text-warn" />
                <span className="min-w-0 flex-1">{h}</span>
              </li>
            ))}
          </ol>
        )}
        {shown && (
          <div className="k-enter mt-3 rounded-sm border border-border px-4 py-3">
            <p className="text-sm font-semibold text-ink">{t("practice.howTitle")}</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm text-ink marker:font-opmono marker:text-muted">
              {item.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            {!done && <p className="mt-2 text-xs text-muted">{t("practice.howNote")}</p>}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {!done && hints < item.hints.length && (
            <Button variant="secondary" size={young ? "md" : "sm"} onClick={() => setHints((n) => n + 1)}>
              <IconHint size={16} /> {hints === 0 ? t("practice.hint") : t("practice.anotherHint")}
            </Button>
          )}
          {!done && !shown && (tries >= 2 || hints >= item.hints.length) && (
            <Button variant="ghost" size={young ? "md" : "sm"} onClick={() => setShown(true)}>
              {t("practice.showHow")}
            </Button>
          )}
          {!done && (
            <Button variant="ghost" size={young ? "md" : "sm"} onClick={next} className="ml-auto">
              <IconRefresh size={16} /> {t("land.sheet.new")}
            </Button>
          )}
        </div>
        {young && <p className="mt-4 text-sm text-muted">{t("land.sheet.k2")}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 rounded-b-lg border-t border-border bg-panel2/60 px-4 py-3 sm:px-8">
        <p className="flex min-h-6 items-center gap-2 text-sm text-ink">
          <span className="text-muted">{t("land.record.label")}:</span>
          {RecordIcon && <RecordIcon size={16} className={done ? (helped ? "text-warn" : "text-good") : "text-muted"} />}
          <span className="font-medium">{record}</span>
        </p>
        <p className="text-xs text-muted">{t("land.sheet.foot")}</p>
        {done && helped && <p className="k-enter w-full text-xs text-muted">{t("land.record.why")}</p>}
      </div>
    </>
  );
}
