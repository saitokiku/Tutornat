"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { IconBook, IconCheckCircle, IconChevronRight, IconClock } from "@/components/icons";
import { Hear } from "@/components/stage/hear";
import { useLocale, useT } from "@/i18n";
import { stripLines, type StripLine, type TodayStatus } from "@/lib/plan";
import { getSkill } from "@/practice/skills";

type Props = {
  status: TodayStatus;
  learnerId: string;
  /** K–2: bigger targets, read-aloud, and no minute numbers for the child. */
  young: boolean;
  grownUp: boolean;
  /** Starts the first check on the plan (the learner's own view). */
  onStartCheck?: () => void;
};

type Cell = { key: string; icon: ReactNode; label: string; value: ReactNode; say: string; href?: string; onClick?: () => void };

/**
 * Today at a glance: what's due, the next test, checks ready, minutes left. Each cell goes where you act
 * on it, and a cell with nothing to say is not shown. Every number comes straight from the record.
 */
export function StatusStrip({ status, learnerId, young, grownUp, onStartCheck }: Props) {
  const t = useT();
  const locale = useLocale();
  const lines = stripLines(status, { young, grownUp });
  if (!lines.length) return null;
  const childPage = `/family/${learnerId}`;
  const names = (list: string[]) => list.join(", ");

  const cell = (line: StripLine): Cell => {
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
      case "minutes": {
        const value = t("today.strip.minutesOf", { n: line.left, budget: status.budget });
        return {
          key: "minutes",
          icon: <IconClock size={18} />,
          label: t("today.strip.left"),
          value: <span className="font-opmono tabular-nums">{value}</span>,
          say: `${t("today.strip.left")}: ${value}`,
          // The learner uses time left by doing the next thing; a grown-up can change the budget.
          href: grownUp ? childPage : "#today",
        };
      }
    }
  };

  const height = young && !grownUp ? "min-h-16" : "min-h-14";
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-panel shadow-soft">
      {/* Cells grow to fill each row as they wrap; the negative margins hide the outer hairlines. */}
      <ul aria-label={t("today.strip.label")} className="-ml-px -mt-px flex flex-wrap">
        {lines.map(cell).map(({ key, icon, label, value, say, href, onClick }) => {
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
              {href?.startsWith("#") ? (
                <a href={href} aria-label={say} className={cls}>
                  {body}
                </a>
              ) : href ? (
                <Link href={href} aria-label={say} className={cls}>
                  {body}
                </Link>
              ) : (
                <button type="button" onClick={onClick} aria-label={say} className={cls}>
                  {body}
                </button>
              )}
              <span className="pr-3 empty:hidden">
                <Hear text={say} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
