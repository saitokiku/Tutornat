"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { IconBook, IconCheckCircle, IconChevronRight, IconClock } from "@/components/icons";
import { useLocale, useT } from "@/i18n";
import { stripLines, type StripLine, type TodayStatus } from "@/lib/plan";
import { getSkill } from "@/practice/skills";
import { BigHear } from "./BigHear";

type Props = {
  status: TodayStatus;
  learnerId: string;
  /** K–2: bigger targets, read-aloud, and no minute numbers for the child. */
  young: boolean;
  grownUp: boolean;
  /** Starts the next check (the learner's own view): see lib/plan.ts checkToStart. */
  onStartCheck?: () => void;
};

type Cell = { key: string; icon: ReactNode; label: string; value: string; say: string; href?: string; onClick?: () => void };
type ActionLine = Exclude<StripLine, { kind: "minutes" }>;

/**
 * Today at a glance: what's due, the next test, checks ready, and the minutes left. Each cell goes where
 * you act on it, and a cell with nothing to say is not shown. The minutes are a fact, not a place to go,
 * so they sit at the strip's end as a quiet line; on their own they are only that line, never a card for
 * one number. Every number comes straight from the record.
 */
export function StatusStrip({ status, learnerId, young, grownUp, onStartCheck }: Props) {
  const t = useT();
  const locale = useLocale();
  const lines = stripLines(status, { young, grownUp });
  const actions = lines.filter((l): l is ActionLine => l.kind !== "minutes");
  const minutes = lines.find((l) => l.kind === "minutes");
  const childPage = `/family/${learnerId}`;
  const names = (list: string[]) => list.join(", ");

  const cell = (line: ActionLine): Cell => {
    switch (line.kind) {
      case "due": {
        const titles = names(line.events.map((e) => e.title));
        const one = line.events.length === 1 ? line.events[0] : null;
        return {
          key: "due",
          icon: <IconBook size={18} />,
          label: t("today.strip.due"),
          value: titles,
          say: `${t("today.strip.due")}: ${titles}`,
          href: one ? `/calendar/${one.id}` : "/calendar",
        };
      }
      case "test": {
        const quiz = line.event.kind === "quiz";
        const label = line.inDays === 0 ? t(quiz ? "today.strip.quizToday" : "today.strip.testToday") : t(quiz ? "today.strip.quiz" : "today.strip.test", { n: line.inDays });
        return {
          key: "test",
          icon: <IconClock size={18} />,
          label,
          value: line.event.title,
          say: `${label}: ${line.event.title}`,
          href: `/calendar/${line.event.id}`,
        };
      }
      case "checks": {
        const skills = names(status.checks.map((id) => getSkill(id)?.title[locale] ?? id));
        const label = t("today.strip.checks", { n: line.n });
        return {
          key: "checks",
          icon: <IconCheckCircle size={18} className="text-accent" />,
          label,
          value: skills,
          say: `${label}: ${skills}`,
          ...(grownUp || !onStartCheck ? { href: childPage } : { onClick: onStartCheck }),
        };
      }
    }
  };

  const left = minutes && (
    <span className="k-meta inline-flex items-center gap-1.5">
      <IconClock size={14} className="shrink-0" />
      {t("hm.strip.left", { n: minutes.left, budget: status.budget })}
    </span>
  );
  if (!actions.length) return left ? <p className="-mt-2">{left}</p> : null;

  const height = young && !grownUp ? "min-h-16" : "min-h-14";
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-panel shadow-soft">
      {/* Cells grow to fill each row as they wrap; the negative margins hide the outer hairlines. */}
      <ul aria-label={t("today.strip.label")} className="-ml-px -mt-px flex flex-wrap">
        {actions.map(cell).map(({ key, icon, label, value, say, href, onClick }) => {
          const body = (
            <>
              <span aria-hidden="true" className="shrink-0 text-muted">
                {icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-muted">{label}</span>
                <span className="block truncate text-sm font-medium text-ink">{value}</span>
              </span>
              <IconChevronRight size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
            </>
          );
          const cls = `group flex ${height} min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-panel2/60`;
          return (
            <li key={key} className="flex min-w-0 flex-1 basis-48 items-center gap-1 border-l border-t border-border">
              {href ? (
                <Link href={href} aria-label={say} className={cls}>
                  {body}
                </Link>
              ) : (
                <button type="button" onClick={onClick} aria-label={say} className={cls}>
                  {body}
                </button>
              )}
              <span className="pr-3 empty:hidden">
                <BigHear text={say} />
              </span>
            </li>
          );
        })}
        {left && <li className="flex flex-none items-center border-l border-t border-border px-4 py-2.5">{left}</li>}
      </ul>
    </div>
  );
}
