import { useT } from "@/i18n";
import type { MathPart } from "@/practice/types";

/**
 * Renders a practice prompt: text, stacked fractions, powers and the answer blank. `blank` is what the
 * blank holds: the answer being written (the current place, marked rose) or, with `right`, the right one.
 */
export function MathText({ parts, blank, center, right }: { parts: MathPart[]; blank?: React.ReactNode; center?: boolean; right?: boolean }) {
  const t = useT();
  const filled = blank !== undefined && blank !== "";
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-1 gap-y-2 ${center ? "justify-center" : ""}`}>
      {parts.map((p, i) => {
        if (typeof p === "string") return <span key={i} className="whitespace-pre-wrap">{p}</span>;
        if ("frac" in p)
          return (
            <span key={i} className="mx-0.5 inline-flex flex-col items-center align-middle leading-none" aria-label={`${p.frac[0]}/${p.frac[1]}`}>
              <span className="px-1 pb-1">{p.frac[0]}</span>
              <span aria-hidden="true" className="h-0.5 w-full rounded-full bg-ink" />
              <span className="px-1 pt-1">{p.frac[1]}</span>
            </span>
          );
        if ("sup" in p)
          return (
            <span key={i}>
              {p.sup[0]}
              <sup className="text-[0.6em]">{p.sup[1]}</sup>
            </span>
          );
        return (
          <span
            key={i}
            className={`inline-flex min-w-12 items-center justify-center rounded-md border-2 px-2 py-0.5 tabular-nums ${
              !filled ? "border-dashed border-accent/60 text-accent" : right ? "border-good/60 text-good" : "border-accent text-ink"
            }`}
          >
            {filled ? blank : <span className="sr-only">{t("pr.blank")}</span>}
            {!filled && <span aria-hidden="true">?</span>}
          </span>
        );
      })}
    </span>
  );
}
