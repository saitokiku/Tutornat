"use client";

import type { CSSProperties } from "react";
import { useLocale } from "@/i18n";
import type { Key } from "@/i18n/en";
import { shortDate } from "@/lib/format";
import type { GrowthWeek } from "@/lib/growth";

/**
 * The three places a skill can stand, bottom to top, in the skill map's status colours. Each fill is
 * at least 3:1 against the panel, and practicing is striped so it never depends on telling rose from
 * brown.
 */
export const SERIES: { key: "proved" | "ready" | "practicing"; label: Key; fill: string; style?: CSSProperties }[] = [
  { key: "proved", label: "fam.proved", fill: "bg-good" },
  { key: "ready", label: "fam.ready", fill: "bg-accent/75" },
  {
    key: "practicing",
    label: "fam.practicing",
    fill: "bg-panel",
    style: { backgroundImage: "repeating-linear-gradient(135deg, var(--color-warn) 0 2.5px, transparent 2.5px 5px)" },
  },
];

/**
 * Skills by where they stood at the end of each week, as stacked columns, oldest week on the left.
 * The picture is one reading of numbers that are also in its label and in the week-by-week table.
 */
export function WeekChart({ weeks, label }: { weeks: GrowthWeek[]; label: string }) {
  const locale = useLocale();
  // A floor, so one skill reads as a start rather than a full column.
  const max = Math.max(4, ...weeks.map((w) => w.proved + w.ready + w.practicing));
  return (
    <div role="img" aria-label={label}>
      <div className="flex h-28 items-end gap-1 border-b border-border sm:gap-2">
        {weeks.map((w, i) => (
          <div key={w.start} className="flex h-full min-w-0 flex-1 flex-col-reverse items-center">
            {/* A panel-coloured hairline between stacked segments keeps each one's edge visible. */}
            {SERIES.filter((x) => w[x.key] > 0).map((x, k) => (
              <span
                key={x.key}
                className={`block w-full max-w-10 shrink-0 origin-bottom motion-safe:animate-split ${x.fill} ${k > 0 ? "border-b-2 border-panel" : ""}`}
                style={{ ...x.style, height: `${(w[x.key] / max) * 100}%`, animationDelay: `${i * 40}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1 sm:gap-2">
        {/* Phone: only the first and last week are labelled, at the two ends. */}
        {weeks.map((w, i) => (
          <span
            key={w.start}
            className={`min-w-0 flex-1 truncate font-opmono text-micro tracking-normal text-muted sm:text-center ${
              i === 0 ? "text-left" : i === weeks.length - 1 ? "text-right" : "hidden sm:block"
            }`}
          >
            {shortDate(w.start, locale)}
          </span>
        ))}
      </div>
    </div>
  );
}

/** The legend swatch for one series, drawn the same way as its column segment. */
export function Swatch({ series }: { series: (typeof SERIES)[number] }) {
  return <span aria-hidden="true" className={`size-3 shrink-0 ring-1 ring-border ${series.fill}`} style={series.style} />;
}
