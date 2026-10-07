"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n";
import type { Widget } from "@/lib/types";
import { Hear, useHear } from "../hear";
import { Spoken } from "../narration";
import type { Segment } from "../useSpeech";
import { CheckRow } from "./CheckRow";
import { Act } from "./Stepper";
import { scramble } from "./order";

type SentenceWidget = Extract<Widget, { kind: "sentence-builder" }>;
type Props = { widget: SentenceWidget; onCheck?: (correct: boolean) => void; onSay?: (segments: Segment[]) => void; lang?: string };

/** An answer as positions in `words` (repeated words take the next unused copy). */
function asIndices(words: string[], answer: string[]) {
  const used = new Set<number>();
  return answer.map((w) => {
    const i = words.findIndex((x, k) => x === w && !used.has(k));
    used.add(i);
    return i;
  });
}

/** The word bank's order: scrambled the same way every time, and never already a whole right answer. */
export const bankOrder = (w: SentenceWidget) => scramble(w.words, w.answers.filter((a) => a.length === w.words.length).map((a) => asIndices(w.words, a)));
/** Right when the words, in order, are exactly one of the answers. */
export const matchesAnswer = (built: string[], answers: string[][]) => answers.some((a) => a.length === built.length && a.every((w, i) => w === built[i]));

/**
 * Tap words to build a sentence; tap a word in the sentence to take it back out. Any of the answers
 * counts. Every word is a button, focus stays in the bank or the sentence as words move, and the
 * sentence so far is read out. Read aloud reads the words still waiting in the bank.
 */
export function SentenceBuilder({ widget, onCheck, onSay, lang }: Props) {
  const t = useT();
  const { young } = useHear();
  const [bank] = useState(() => bankOrder(widget));
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const refs = useRef(new Map<string, HTMLButtonElement | null>());
  const next = useRef<string | null>(null);
  const left = bank.filter((i) => !picked.includes(i));
  const built = picked.map((i) => widget.words[i]);
  const sentence = built.join(" ");

  useEffect(() => {
    if (next.current) refs.current.get(next.current)?.focus();
    next.current = null;
  }, [picked]);
  useEffect(() => {
    onSay?.(bank.filter((i) => !picked.includes(i)).map((i) => ({ key: `word.${i}`, text: widget.words[i] })));
  }, [bank, picked, onSay, widget.words]);

  const add = (i: number) => {
    const k = left.indexOf(i);
    const rest = left.filter((x) => x !== i);
    next.current = rest.length ? `bank:${rest[Math.min(k, rest.length - 1)]}` : `line:${picked.length}`;
    setPicked([...picked, i]);
    setResult(null);
  };
  const remove = (pos: number) => {
    const i = picked[pos];
    const rest = picked.filter((_, p) => p !== pos);
    next.current = rest.length ? `line:${Math.min(pos, rest.length - 1)}` : `bank:${i}`;
    setPicked(rest);
    setResult(null);
  };
  const chip = `k-chip border-border bg-panel px-4 font-semibold text-ink hover:border-ink/40 ${young ? "min-h-14 text-t3" : "min-h-11 text-body"}`;

  return (
    <div className="space-y-5">
      <section aria-label={t("stg.sb.line")} className="space-y-2">
        <div lang={lang} className={`flex min-h-16 flex-wrap items-center gap-2 rounded-md border-2 border-dashed px-3 py-2.5 ${picked.length ? "border-ink/25 bg-panel" : "border-border bg-panel2"}`}>
          {picked.length ? (
            picked.map((i, pos) => (
              <button
                key={`${i}-${pos}`}
                ref={(el) => void refs.current.set(`line:${pos}`, el)}
                type="button"
                onClick={() => remove(pos)}
                aria-label={t("stg.sb.remove", { word: widget.words[i] })}
                className={`${chip} border-ink bg-ink text-paper hover:bg-ink/90`}
              >
                {widget.words[i]}
              </button>
            ))
          ) : (
            <>
              <p className={`flex-1 px-1 text-muted ${young ? "text-body" : "text-sm"}`}>{t("stg.sb.empty")}</p>
              <Hear text={t("stg.sb.empty")} />
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Act variant="ghost" off={!picked.length} onClick={() => (setPicked([]), setResult(null))}>
            {t("stg.sb.clear")}
          </Act>
          {sentence && <Hear text={sentence} />}
        </div>
      </section>

      <section aria-label={t("stg.sb.bank")}>
        <ul className="flex flex-wrap gap-2" lang={lang}>
          {left.map((i) => (
            <li key={i} className="flex items-center gap-1">
              <button ref={(el) => void refs.current.set(`bank:${i}`, el)} type="button" onClick={() => add(i)} aria-label={t("stg.sb.add", { word: widget.words[i] })} className={chip}>
                <Spoken k={`word.${i}`} text={widget.words[i]} />
              </button>
              <Hear text={widget.words[i]} />
            </li>
          ))}
        </ul>
      </section>

      <p aria-live="polite" className="text-sm text-muted">
        {sentence ? t("stg.sb.yours", { text: sentence }) : ""}
      </p>
      <CheckRow
        disabled={!picked.length}
        result={result}
        onCheck={() => {
          const ok = matchesAnswer(built, widget.answers);
          setResult(ok);
          onCheck?.(ok);
        }}
      />
    </div>
  );
}
