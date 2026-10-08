"use client";

import { useEffect, useRef, useState } from "react";
import { IconCheck, IconChevronDown, IconChevronUp } from "@/components/icons";
import { useT } from "@/i18n";
import type { Widget } from "@/lib/types";
import { Hear, sentences, useHear } from "../hear";
import { Spoken } from "../narration";
import type { Segment } from "../useSpeech";
import { CheckRow } from "./CheckRow";
import { Act, roundButton } from "./Stepper";
import { scramble } from "./order";

type SequenceWidget = Extract<Widget, { kind: "sequence" }>;
type Props = { widget: SequenceWidget; onCheck?: (correct: boolean) => boolean | void; onSay?: (segments: Segment[]) => void; lang?: string };

/** The order a sequence opens in: scrambled the same way every time, never already right. */
export const startOrder = (w: SequenceWidget) => scramble(w.items.map((i) => i.id)).map((i) => w.items[i].id);
/** Swap the item at `from` with its neighbour (`dir` −1 up, +1 down). */
export function shift(order: string[], from: number, dir: -1 | 1) {
  const to = from + dir;
  if (to < 0 || to >= order.length) return order;
  const next = [...order];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/**
 * Put steps in order (a life cycle, a story, how to do something) with "move up" and "move down"
 * buttons. No dragging. Focus follows the step being moved, and the new place is read out. Read aloud
 * reads the steps in the order they stand now.
 */
export function Sequence({ widget, onCheck, onSay, lang }: Props) {
  const t = useT();
  const { young } = useHear();
  const [start] = useState(() => startOrder(widget));
  const [order, setOrder] = useState(start);
  const [said, setSaid] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);
  const focus = useRef<{ id: string; dir: "up" | "down" } | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement | null>());
  const text = (id: string) => widget.items.find((i) => i.id === id)?.text ?? "";

  // After a move, keep focus on the same step's button in its new place.
  useEffect(() => {
    const f = focus.current;
    if (f) buttons.current.get(`${f.id}:${f.dir}`)?.focus();
    focus.current = null;
  }, [order]);
  useEffect(() => {
    onSay?.(order.map((id) => ({ key: `seq.${id}`, text: widget.items.find((i) => i.id === id)?.text ?? "" })));
  }, [order, onSay, widget.items]);

  const move = (from: number, dir: -1 | 1) => {
    const id = order[from];
    const next = shift(order, from, dir);
    if (next === order) return;
    focus.current = { id, dir: dir < 0 ? "up" : "down" };
    setOrder(next);
    setSaid(t("stg.seq.moved", { item: text(id), n: from + dir + 1, total: order.length }));
    setResult(null);
    setChecked(false);
  };
  const arrow = `${roundButton(young)} border border-border bg-panel text-ink hover:border-ink/30`;

  return (
    <div className="space-y-5">
      <ol className="space-y-2.5" lang={lang}>
        {order.map((id, i) => {
          const right = checked && widget.items[i].id === id;
          const wrong = checked && !right;
          const mark = checked ? t(wrong ? "stg.seq.wrong" : "stg.seq.right") : "";
          return (
            <li key={id} className={`flex items-center gap-3 rounded-md border px-3 py-2.5 sm:px-4 ${wrong ? "border-bad/50 bg-bad/5" : "border-border bg-panel"}`}>
              <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full bg-panel2 font-opmono tabular-nums text-ink ${young ? "size-10 text-body" : "size-8 text-sm"}`}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`break-words text-ink ${young ? "text-t3" : "text-body"}`}>
                  <span className="sr-only">{t("stg.seq.step", { n: i + 1 })}: </span>
                  <Spoken k={`seq.${id}`} text={text(id)} />
                </p>
                {checked && (
                  <p className={`mt-0.5 inline-flex items-center gap-1 font-medium ${young ? "text-sm" : "text-xs"} ${wrong ? "text-bad" : "text-good"}`}>
                    {wrong ? mark : (
                      <>
                        <IconCheck size={14} /> {mark}
                      </>
                    )}
                  </p>
                )}
              </div>
              <Hear text={mark ? sentences(text(id), mark) : text(id)} />
              <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                <Act
                  ref={(el) => void buttons.current.set(`${id}:up`, el)}
                  off={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label={t("stg.seq.up", { item: text(id) })}
                  className={arrow}
                >
                  <IconChevronUp size={young ? 22 : 18} />
                </Act>
                <Act
                  ref={(el) => void buttons.current.set(`${id}:down`, el)}
                  off={i === order.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={t("stg.seq.down", { item: text(id) })}
                  className={arrow}
                >
                  <IconChevronDown size={young ? 22 : 18} />
                </Act>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex items-center gap-3">
        <p aria-live="polite" className="text-sm text-muted">
          {said}
        </p>
        {said && <Hear text={said} />}
      </div>
      <CheckRow
        disabled={order.every((id, i) => start[i] === id)}
        result={result}
        onCheck={() => {
          const ok = order.every((id, i) => widget.items[i].id === id);
          if (onCheck?.(ok) === false) return;
          setResult(ok);
          setChecked(true);
        }}
      />
    </div>
  );
}
