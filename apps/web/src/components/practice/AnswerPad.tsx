"use client";

import { useEffect, useRef, useState } from "react";
import { IconX } from "@/components/icons";
import { Hear } from "@/components/stage/hear";
import { useT } from "@/i18n";
import type { Choice, Input, Pad } from "@/practice/types";
import { ClockPad } from "./ClockPad";
import { FractionBarPad } from "./FractionBarPad";
import { NumberLinePad } from "./NumberLinePad";
import { hearSize } from "./targets";

// How a learner answers. Big targets, the physical keyboard works everywhere, nothing is drag-only.
// Every pad reports a plain string (choices report the index), so the checker sees one shape.
// Touch pads (number line, fraction bar, clock) answer by doing; see their files for the conventions.

type PadProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  young?: boolean;
};

const KEY = "grid place-items-center rounded-md border border-border bg-panel font-opmono text-ink shadow-soft transition-colors hover:border-ink/30 active:bg-panel2 disabled:opacity-40";

function Keys({ onKey, extra, disabled, young }: { onKey: (k: string) => void; extra: string[]; disabled?: boolean; young?: boolean }) {
  const t = useT();
  const size = young ? "h-16 text-2xl" : "h-13 text-xl";
  // 1–9, then the last row: minus (or a gap), 0, delete; a decimal point gets its own key under 0.
  const last = [extra.includes("-") ? "-" : "", "0", "⌫"];
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ...last, ...(extra.includes(".") ? ["", ".", ""] : [])];
  const name = (k: string) => (k === "⌫" ? t("practice.delete") : k === "-" ? t("practice.minus") : k === "." ? t("practice.point") : k);
  return (
    // data-answers: Enter on a focused key answers (it would otherwise type that key again).
    <div className="grid grid-cols-3 gap-2" role="group" aria-label={t("practice.keypad")} data-answers>
      {keys.map((k, i) =>
        k ? (
          <button key={i} type="button" disabled={disabled} onClick={() => onKey(k)} aria-label={name(k)} className={`${KEY} ${size} ${k === "⌫" ? "text-muted" : ""}`}>
            {k === "-" ? "\u2212" : k === "⌫" ? <IconX size={20} /> : k}
          </button>
        ) : (
          <span key={i} aria-hidden="true" />
        ),
      )}
    </div>
  );
}

const apply = (v: string, k: string, max = 12) => {
  if (k === "⌫") return v.slice(0, -1);
  if (k === "-") return v.startsWith("-") ? v.slice(1) : `-${v}`;
  if (k === "." && v.includes(".")) return v;
  return v.length >= max ? v : v + k;
};

/** Controls that answer Enter themselves (a hint button, a counter, a link, a slider). */
const OWN_ENTER = "button, a[href], summary, [role=slider], [role=spinbutton], [role=tab]";

/**
 * Typing on a hardware keyboard while a pad is on screen. Enter answers, unless it is aimed at a
 * control that answers Enter itself (Hint, Skip, a counter being marked, a pad's own toggle); the
 * pad's keys and answer fields carry `data-answers`, so Enter on them answers. Without `onSubmit`,
 * Enter is left alone entirely (choice tiles are buttons and press themselves).
 */
function useTyping(active: boolean, onKey: (k: string) => void, onSubmit: (() => void) | undefined, allowed: RegExp) {
  const keyRef = useRef(onKey);
  const submitRef = useRef(onSubmit);
  useEffect(() => {
    keyRef.current = onKey;
    submitRef.current = onSubmit;
  });
  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter") {
        const submit = submitRef.current;
        if (!submit) return;
        if (target?.closest(OWN_ENTER) && !target.closest("[data-answers]")) return;
        e.preventDefault();
        submit();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        keyRef.current("⌫");
      } else if (allowed.test(e.key)) {
        e.preventDefault();
        keyRef.current(e.key);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [active, allowed]);
}

const DIGITS = /^[0-9]$/;
const DIGITS_NEG = /^[0-9-]$/;
const DIGITS_DOT = /^[0-9.]$/;
const DIGITS_ALL = /^[0-9.-]$/;

export function Keypad({ value, onChange, onSubmit, disabled, young, keys = [] }: PadProps & { keys?: ("-" | ".")[] }) {
  const t = useT();
  const press = (k: string) => onChange(apply(value, k));
  const allowed = keys.includes("-") && keys.includes(".") ? DIGITS_ALL : keys.includes("-") ? DIGITS_NEG : keys.includes(".") ? DIGITS_DOT : DIGITS;
  useTyping(!disabled, press, onSubmit, allowed);
  return (
    <div className="mx-auto w-full max-w-xs space-y-3">
      <output aria-live="polite" aria-label={t("practice.yourAnswer")} className={`flex items-center justify-center rounded-md border-2 border-ink/80 bg-panel px-4 font-opmono tabular-nums text-ink ${young ? "h-20 text-4xl" : "h-16 text-3xl"}`}>
        {value ? value.replace("-", "−") : <span className="text-muted/50">?</span>}
      </output>
      <Keys onKey={press} extra={keys} disabled={disabled} young={young} />
    </div>
  );
}

/** Numerator over denominator, with an optional whole number in front for mixed numbers. */
export function FractionPad({ value, onChange, onSubmit, disabled, young }: PadProps) {
  const t = useT();
  const parse = (v: string) => {
    const m = /^(-?\d*)(?: (\d*))?\/(\d*)$/.exec(v);
    if (!m) return { whole: "", num: v, den: "" };
    return m[2] !== undefined ? { whole: m[1], num: m[2], den: m[3] } : { whole: "", num: m[1], den: m[3] };
  };
  const [focus, setFocus] = useState<"whole" | "num" | "den">("num");
  const [mixed, setMixed] = useState(false);
  const parts = parse(value);
  const write = (p: { whole: string; num: string; den: string }) => onChange(p.whole ? `${p.whole} ${p.num}/${p.den}` : `${p.num}/${p.den}`);
  const press = (k: string) => {
    const next = { ...parts };
    if (k === "-") {
      const field = mixed ? "whole" : "num";
      next[field] = next[field].startsWith("-") ? next[field].slice(1) : `-${next[field]}`;
    } else next[focus] = apply(next[focus], k, 5);
    write(next);
  };
  useTyping(!disabled, (k) => (k === "/" ? setFocus("den") : press(k)), onSubmit, /^[0-9/-]$/);
  const box = (field: "whole" | "num" | "den", label: string) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setFocus(field)}
      aria-label={`${label}: ${parts[field] || t("practice.empty")}`}
      aria-pressed={focus === field}
      className={`grid min-w-16 place-items-center rounded-md border-2 bg-panel px-3 font-opmono tabular-nums ${young ? "h-16 text-3xl" : "h-14 text-2xl"} ${
        focus === field ? "border-accent text-ink" : "border-border text-ink"
      }`}
    >
      {parts[field] ? parts[field].replace("-", "−") : <span className="text-muted/40">?</span>}
    </button>
  );
  return (
    <div className="mx-auto w-full max-w-xs space-y-3">
      <div className="flex items-center justify-center gap-3" aria-live="polite" data-answers>
        {mixed && box("whole", t("practice.whole"))}
        <div className="flex flex-col items-center gap-1.5">
          {box("num", t("practice.numerator"))}
          <span aria-hidden="true" className="h-0.5 w-20 rounded-full bg-ink" />
          {box("den", t("practice.denominator"))}
        </div>
      </div>
      <div className="flex justify-center gap-2">
        <button type="button" onClick={() => setFocus(focus === "num" ? "den" : "num")} className="k-btn-ghost text-xs">
          {focus === "num" ? t("practice.toBottom") : t("practice.toTop")}
        </button>
        <button
          type="button"
          aria-pressed={mixed}
          onClick={() => {
            setMixed(!mixed);
            if (mixed) write({ ...parts, whole: "" });
            setFocus(mixed ? "num" : "whole");
          }}
          className="k-btn-ghost text-xs"
        >
          {mixed ? t("practice.noWhole") : t("practice.addWhole")}
        </button>
      </div>
      <Keys onKey={press} extra={["-"]} disabled={disabled} young={young} />
    </div>
  );
}

export function RemainderPad({ value, onChange, onSubmit, disabled, young }: PadProps) {
  const t = useT();
  const [q, r = ""] = value.split(" R ");
  const [focus, setFocus] = useState<"q" | "r">("q");
  const write = (nq: string, nr: string) => onChange(nr ? `${nq} R ${nr}` : nq);
  const press = (k: string) => (focus === "q" ? write(apply(q, k, 6), r) : write(q, apply(r, k, 4)));
  useTyping(!disabled, (k) => (k === "r" || k === "R" ? setFocus("r") : press(k)), onSubmit, /^[0-9rR]$/);
  const box = (field: "q" | "r", text: string, label: string) => (
    <button
      type="button"
      onClick={() => setFocus(field)}
      aria-label={`${label}: ${text || t("practice.empty")}`}
      aria-pressed={focus === field}
      className={`grid min-w-20 place-items-center rounded-md border-2 bg-panel px-3 font-opmono tabular-nums ${young ? "h-16 text-3xl" : "h-14 text-2xl"} ${focus === field ? "border-accent" : "border-border"}`}
    >
      {text || <span className="text-muted/40">?</span>}
    </button>
  );
  return (
    <div className="mx-auto w-full max-w-xs space-y-3">
      <div className="flex items-center justify-center gap-3" data-answers>
        {box("q", q, t("practice.quotient"))}
        <span className="font-brand text-t2 font-semibold text-muted">R</span>
        {box("r", r, t("practice.remainder"))}
      </div>
      <Keys onKey={press} extra={[]} disabled={disabled} young={young} />
    </div>
  );
}

/**
 * The tile a typed digit picks: when the choices are numbers, the tile showing that digit (typing 4
 * answers "4", never the fourth tile); otherwise the k-th tile. -1 when nothing fits.
 */
export function choiceForKey(choices: Pick<Choice, "label">[], key: string) {
  if (choices.some((c) => /^[−-]?\d/.test(c.label))) return choices.findIndex((c) => c.label === key);
  const i = Number(key) - 1;
  return i >= 0 && i < choices.length ? i : -1;
}

/** Tap to answer. Young learners can hear each choice first. Enter and Space press a focused tile. */
export function ChoiceTiles({ choices, onPick, disabled, young, picked }: { choices: Choice[]; onPick: (i: number) => void; disabled?: boolean; young?: boolean; picked?: number }) {
  const twoUp = choices.length <= 4 && choices.every((c) => c.label.length <= 24);
  useTyping(!disabled, (k) => {
    const i = choiceForKey(choices, k);
    if (i >= 0) onPick(i);
  }, undefined, /^[1-9]$/);
  return (
    <ul className={`grid gap-3 ${twoUp ? "grid-cols-2" : "grid-cols-1"}`}>
      {choices.map((c, i) => (
        <li key={i} className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(i)}
            aria-pressed={picked === i}
            className={`flex w-full items-center justify-center gap-3 rounded-md border-2 border-border bg-panel px-4 text-center text-ink shadow-soft transition-colors hover:border-ink/40 disabled:opacity-60 aria-pressed:border-accent aria-pressed:bg-accent/5 ${
              young ? "min-h-20 text-2xl" : "min-h-16 text-lg"
            } ${c.say ? (young ? "pr-18" : "pr-14") : ""}`}
          >
            {c.picture && (
              <span aria-hidden="true" className={young ? "text-4xl" : "text-3xl"}>
                {c.picture}
              </span>
            )}
            <span className="font-medium">{c.label}</span>
          </button>
          {c.say && <Hear text={c.say} className={`absolute right-2 top-1/2 -translate-y-1/2 ${hearSize(young)}`} />}
        </li>
      ))}
    </ul>
  );
}

/** Words and algebra. Algebra gets helper keys for symbols a phone keyboard hides. */
export function TextAnswer({ value, onChange, onSubmit, disabled, algebra, label }: PadProps & { algebra?: boolean; label: string }) {
  const t = useT();
  const ref = useRef<HTMLInputElement>(null);
  const add = (s: string) => {
    onChange(value + s);
    ref.current?.focus();
  };
  return (
    <div className="mx-auto w-full max-w-md space-y-3">
      <input
        ref={ref}
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.slice(0, 80))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
        }}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder={algebra ? t("practice.algebraPlaceholder") : t("practice.textPlaceholder")}
        className="k-input h-14 text-center font-opmono text-xl"
      />
      {algebra && (
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label={t("practice.symbols")}>
          {["x", "y", "^2", "(", ")", "-", "+", "/", ","].map((s) => (
            <button key={s} type="button" disabled={disabled} onClick={() => add(s)} className={`${KEY} h-11 min-w-11 px-3 text-base`}>
              {s === "^2" ? "x²" : s === "-" ? "−" : s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AnswerInput(props: PadProps & { input: Input; keys?: ("-" | ".")[]; choices?: Choice[]; onPick: (i: number) => void; label: string; pad?: Pad; tint?: string }) {
  const { pad } = props;
  switch (props.input) {
    case "number-line":
      return <NumberLinePad {...props} pad={pad?.kind === "number-line" ? pad : undefined} />;
    case "fraction-bar":
      return <FractionBarPad {...props} pad={pad?.kind === "fraction-bar" ? pad : undefined} />;
    case "clock":
      return <ClockPad {...props} pad={pad?.kind === "clock" ? pad : undefined} />;
    case "keypad":
      return <Keypad {...props} />;
    case "fraction":
      return <FractionPad {...props} />;
    case "remainder":
      return <RemainderPad {...props} />;
    case "choices":
      return <ChoiceTiles choices={props.choices ?? []} onPick={props.onPick} disabled={props.disabled} young={props.young} />;
    case "expr":
      return <TextAnswer {...props} algebra />;
    case "text":
      return <TextAnswer {...props} />;
  }
}
