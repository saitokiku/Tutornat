"use client";

import { useState } from "react";
import { IconCheck } from "@/components/icons";
import { useT } from "@/i18n";
import type { Widget } from "@/lib/types";
import { CheckRow } from "./CheckRow";

type Props = { widget: Extract<Widget, { kind: "sorter" }>; onCheck?: (correct: boolean) => void; lang?: string };

/** Put each item in a category by tapping it — no dragging needed. After checking, wrong ones are marked. */
export function Sorter({ widget, onCheck, lang }: Props) {
  const t = useT();
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  const sorted = widget.items.filter((i) => picks[i.id] !== undefined).length;

  return (
    <div className="space-y-5">
      <ul className="space-y-3" lang={lang}>
        {widget.items.map((item) => {
          const pick = picks[item.id];
          const wrong = checked && pick !== item.answer;
          return (
            <li key={item.id} className={`rounded-md border px-4 py-3 ${wrong ? "border-bad/50 bg-bad/5" : "border-border bg-panel"}`}>
              <p className="text-body text-ink">{item.text}</p>
              <div role="group" aria-label={item.text} className="mt-2.5 flex flex-wrap items-center gap-2">
                {widget.categories.map((c, ci) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={pick === ci}
                    aria-label={t("w.sort.put", { item: item.text, category: c })}
                    onClick={() => (setPicks({ ...picks, [item.id]: ci }), setChecked(false), setResult(null))}
                    className="k-chip min-h-10 px-4 text-sm"
                  >
                    <span aria-hidden="true">{c}</span>
                  </button>
                ))}
                {checked && (
                  <span className={`ml-auto inline-flex items-center gap-1 text-xs font-medium ${wrong ? "text-bad" : "text-good"}`}>
                    {wrong ? t("w.sort.wrong") : (
                      <>
                        <IconCheck size={14} /> {t("w.sort.right")}
                      </>
                    )}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="font-opmono text-xs tabular-nums text-muted">
        {t("w.sort.readout", { n: sorted, total: widget.items.length })}
      </p>
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
