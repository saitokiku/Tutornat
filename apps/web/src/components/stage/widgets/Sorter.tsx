"use client";

import { useState } from "react";
import { IconCheck } from "@/components/icons";
import { useT } from "@/i18n";
import type { Widget } from "@/lib/types";
import { Hear, sentences, useHear } from "../hear";
import { Spoken } from "../narration";
import { CheckRow } from "./CheckRow";

type Props = { widget: Extract<Widget, { kind: "sorter" }>; onCheck?: (correct: boolean) => void; lang?: string };

/** A word sort: every item is a word or a short phrase, so the cards sit two to a row. */
export const isWordSort = (w: Extract<Widget, { kind: "sorter" }>) => w.items.every((i) => i.text.length <= 24);

/**
 * Put each item in a category by tapping it — no dragging needed. After checking, wrong ones are
 * marked. Works for sentences (main idea or detail?) and for word sorts (noun or verb?).
 */
export function Sorter({ widget, onCheck, lang }: Props) {
  const t = useT();
  const { young } = useHear();
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  const sorted = widget.items.filter((i) => picks[i.id] !== undefined).length;
  const words = isWordSort(widget);
  const readout = t("w.sort.readout", { n: sorted, total: widget.items.length });

  return (
    <div className="space-y-5">
      {young && (
        <div className="flex flex-wrap items-center gap-3" lang={lang}>
          {widget.categories.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-panel2 py-1 pl-4 pr-1 text-body font-medium text-ink">
              {c}
              <Hear text={c} />
            </span>
          ))}
        </div>
      )}
      <ul className={words ? "grid gap-3 sm:grid-cols-2" : "space-y-3"} lang={lang}>
        {widget.items.map((item) => {
          const pick = picks[item.id];
          const wrong = checked && pick !== item.answer;
          const mark = checked ? t(wrong ? "w.sort.wrong" : "w.sort.right") : "";
          return (
            <li key={item.id} className={`rounded-md border px-4 py-3 ${wrong ? "border-bad/50 bg-bad/5" : "border-border bg-panel"}`}>
              <div className="flex items-start gap-3">
                <p className={`flex-1 text-ink ${words ? "font-semibold" : ""} ${young ? "text-t3" : "text-body"}`}>
                  <Spoken k={`item.${item.id}`} text={item.text} />
                </p>
                <Hear text={mark ? sentences(item.text, mark) : item.text} />
              </div>
              <div role="group" aria-label={item.text} className="mt-2.5 flex flex-wrap items-center gap-2">
                {widget.categories.map((c, ci) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={pick === ci}
                    aria-label={t("w.sort.put", { item: item.text, category: c })}
                    onClick={() => (setPicks({ ...picks, [item.id]: ci }), setChecked(false), setResult(null))}
                    className={`k-chip border-border bg-panel px-4 font-semibold text-ink hover:border-ink/40 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper ${young ? "min-h-14 px-5 text-body" : "min-h-11 text-sm"}`}
                  >
                    <span aria-hidden="true">{c}</span>
                  </button>
                ))}
                {checked && (
                  <span className={`ml-auto inline-flex items-center gap-1 text-xs font-medium ${wrong ? "text-bad" : "text-good"}`}>
                    {wrong ? mark : (
                      <>
                        <IconCheck size={14} /> {mark}
                      </>
                    )}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-3">
        <p aria-live="polite" className={`font-opmono tabular-nums text-muted ${young ? "text-sm" : "text-xs"}`}>
          {readout}
        </p>
        <Hear text={readout} />
      </div>
      <CheckRow
        disabled={sorted < widget.items.length}
        result={result}
        onCheck={() => {
          const ok = widget.items.every((i) => picks[i.id] === i.answer);
          setChecked(true);
          setResult(ok);
          onCheck?.(ok);
        }}
      />
    </div>
  );
}
