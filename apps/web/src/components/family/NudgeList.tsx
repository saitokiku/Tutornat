"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconArrowRight } from "@/components/icons";
import { t as tr, useLocale, useT } from "@/i18n";
import { logNudges, type Nudge } from "@/lib/nudges";
import { selectLearner } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { Locale, Profile } from "@/lib/types";
import { getSkill } from "@/practice/skills";

/** How many nudges a card shows before "Show more", so the card stays a glance. */
export const NUDGES_SHOWN = 3;

/** A nudge as one plain sentence, in the grown-up's language. */
export function nudgeText(n: Nudge, name: string, locale: Locale): string {
  const skill = n.skillId ? (getSkill(n.skillId)?.title[locale] ?? n.skillId) : "";
  switch (n.kind) {
    case "prep":
      return tr(locale, n.event!.kind === "quiz" ? "fam.nudge.quiz" : "fam.nudge.test", { name, n: n.days, title: n.event!.title });
    case "check":
      return tr(locale, "fam.nudge.check", { name, skill, n: n.days });
    case "stuck":
      return tr(locale, "fam.nudge.stuck", { name, skill });
    case "idle":
      return tr(locale, "fam.nudge.idle", { name, n: n.days });
  }
}

export function nudgeAction(n: Nudge, name: string, locale: Locale): string {
  if (n.kind === "prep") return tr(locale, n.event!.kind === "quiz" ? "fam.act.quiz" : "fam.act.test");
  return tr(locale, "fam.act.today", { name });
}

/**
 * Nudges for one learner, each a sentence and one action link. Grown-ups only: it renders nothing in
 * a child's session. Showing them records a nudge act (once a day each), from an effect.
 */
export function NudgeList({ child, nudges }: { child: Profile; nudges: Nudge[] }) {
  const t = useT();
  const locale = useLocale();
  const parent = useStore((s) => s.session.profileId === "parent");
  const [all, setAll] = useState(false);
  const shown = all ? nudges : nudges.slice(0, NUDGES_SHOWN);
  const keys = shown.map((n) => n.key).join("|");

  useEffect(() => {
    if (parent && keys) logNudges(child.id, shown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `keys` stands for `shown`: log again only when what is shown changes
  }, [parent, child.id, keys]);

  if (!parent || shown.length === 0) return null;
  const rest = nudges.length - NUDGES_SHOWN;
  return (
    <section aria-labelledby={`nudges-${child.id}`} className="space-y-2">
      <h3 id={`nudges-${child.id}`} className="text-xs font-semibold text-muted">
        {t("fam.nudges")}
      </h3>
      <ul id={`nudge-list-${child.id}`} className="divide-y divide-warn/20 overflow-hidden rounded-md border border-warn/30 bg-warn/5">
        {shown.map((n) => (
          <li key={n.key} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
            <p className="flex min-w-0 flex-1 basis-56 gap-2.5 text-sm text-ink">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-warn" />
              <span className="min-w-0 break-words">{nudgeText(n, child.nickname, locale)}</span>
            </p>
            <Link
              href={n.action.href}
              onNavigate={n.action.handover ? () => selectLearner(child.id) : undefined}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-ink underline decoration-border underline-offset-4 hover:text-accent"
            >
              {nudgeAction(n, child.nickname, locale)} <IconArrowRight size={14} />
            </Link>
          </li>
        ))}
      </ul>
      {rest > 0 && (
        <button
          type="button"
          aria-expanded={all}
          aria-controls={`nudge-list-${child.id}`}
          onClick={() => setAll(!all)}
          className="inline-flex min-h-11 items-center text-sm text-muted underline decoration-border underline-offset-4 hover:text-ink"
        >
          {all ? t("fam.fewer") : t("fam.more", { n: rest })}
        </button>
      )}
    </section>
  );
}
