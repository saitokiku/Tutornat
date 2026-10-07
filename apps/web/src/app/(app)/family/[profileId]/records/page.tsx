"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { NotFound } from "@/components/courses/NotFound";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { IconArrowLeft } from "@/components/icons";
import { Button } from "@/components/ui";
import { gradeLabel, useT } from "@/i18n";
import { dailyRecords, recordsCsv } from "@/lib/family";
import { learnersOf } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import { addDays, fromLocalDate, localDate } from "@/planner/dates";
import { getSkill } from "@/practice/skills";

export default function RecordsPage() {
  return (
    <Guard need="parent">
      <Records />
    </Guard>
  );
}

/** Homeschool-style records: a dated log of learning, exportable. It records; it does not certify. */
function Records() {
  const t = useT();
  const { profileId } = useParams<{ profileId: string }>();
  const child = useStore((s) => learnersOf(s).find((p) => p.id === profileId));
  useTitle(t("records.title"));
  const [now] = useState(() => Date.now());
  const today = localDate(now);
  const [from, setFrom] = useState(() => today.slice(0, 8) + "01");
  const [to, setTo] = useState(today);
  const rows = useStore((s) => (child ? dailyRecords(s, child.id, from, to, now) : []));
  if (!child) return <NotFound />;
  const locale = child.locale;
  const title = (id: string) => getSkill(id)?.title[locale] ?? id;
  const total = rows.reduce((n, r) => n + r.minutes.math + r.minutes.english + r.minutes.science + r.minutes.other, 0);
  const fmt = (d: string) => new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { weekday: "short", month: "short", day: "numeric" }).format(fromLocalDate(d));
  const headers = [t("records.date"), t("subject.math"), t("subject.english"), t("subject.science"), t("subject.other"), t("records.total"), t("records.sets"), t("records.lessons"), t("records.proved"), t("records.books")];
  const download = () => {
    const blob = new Blob([recordsCsv(rows, headers, title)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kaizenedu-${child.nickname.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-8">
      <Link href={`/family/${child.id}`} className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted hover:text-ink print:hidden">
        <IconArrowLeft size={16} /> {child.nickname}
      </Link>
      <header className="space-y-2">
        <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("records.heading", { name: child.nickname })}</h1>
        <p className="text-sm text-muted">
          {gradeLabel(locale, child.grade)} · {t("records.range", { from: fmt(from), to: fmt(to) })}
        </p>
        <p className="max-w-prose text-sm text-muted print:hidden">{t("records.why")}</p>
      </header>

      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <label className="space-y-1">
          <span className="block text-xs font-semibold text-muted">{t("records.from")}</span>
          <input type="date" className="k-input" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-semibold text-muted">{t("records.to")}</span>
          <input type="date" className="k-input" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
        </label>
        <Button variant="ghost" onClick={() => (setFrom(addDays(today, -29)), setTo(today))}>
          {t("records.last30")}
        </Button>
        <span className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={download} disabled={!rows.length}>
            {t("records.csv")}
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            {t("records.print")}
          </Button>
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        {(
          [
            ["records.days", rows.length],
            ["records.hours", Math.round((total / 60) * 10) / 10],
            ["records.provedCount", rows.reduce((n, r) => n + r.proved.length, 0)],
          ] as const
        ).map(([k, n]) => (
          <div key={k} className="flex flex-col-reverse rounded-md border border-border bg-panel px-4 py-3">
            <dt className="text-xs text-muted">{t(k)}</dt>
            <dd className="font-opmono text-t1 font-semibold tabular-nums text-ink">{n}</dd>
          </div>
        ))}
      </dl>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">{t("records.empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-panel">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted">
              <tr>
                {headers.map((h, i) => (
                  <th key={h} scope="col" className={`px-3 py-2.5 font-semibold ${i >= 1 && i <= 7 ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.date}>
                  <th scope="row" className="whitespace-nowrap px-3 py-2.5 font-medium text-ink">
                    {fmt(r.date)}
                  </th>
                  {[r.minutes.math, r.minutes.english, r.minutes.science, r.minutes.other, r.minutes.math + r.minutes.english + r.minutes.science + r.minutes.other, r.sets, r.lessons].map((v, i) => (
                    <td key={i} className="px-3 py-2.5 text-right font-opmono tabular-nums text-ink">
                      {v || "–"}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-ink">{r.proved.map(title).join(", ")}</td>
                  <td className="px-3 py-2.5 text-ink">{r.books.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted">{t("records.note")}</p>
    </div>
  );
}
