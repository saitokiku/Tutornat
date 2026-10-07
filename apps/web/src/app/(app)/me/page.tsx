"use client";

import Link from "next/link";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { IconChevronRight, IconClock, IconPlus, IconSettings, IconSprout, IconFamily } from "@/components/icons";
import { Avatar } from "@/components/profiles/Avatar";
import { gradeLabel, useT } from "@/i18n";
import { currentLearner } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";

export default function MePage() {
  return (
    <Guard need="learner">
      <Me />
    </Guard>
  );
}

/** On phones, the places that don't fit in the bottom bar. */
function Me() {
  const t = useT();
  useTitle(t("nav.me"));
  const learner = useStore(currentLearner) as Profile;
  const links = [
    { href: "/calendar", label: t("nav.calendar"), Icon: IconClock },
    { href: "/growth", label: t("nav.growth"), Icon: IconSprout },
    { href: "/courses/new", label: t("nav.new"), Icon: IconPlus },
    { href: "/settings", label: t("nav.settings"), Icon: IconSettings },
    { href: "/profiles", label: t("nav.switch"), Icon: IconFamily },
  ];
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Avatar profile={learner} />
        <div>
          <h1 className="font-brand text-t1 font-semibold text-ink">{learner.nickname}</h1>
          <p className="text-sm text-muted">{gradeLabel(learner.locale, learner.grade)}</p>
        </div>
      </header>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-panel">
        {links.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link href={href} className="flex min-h-14 items-center gap-3 px-4 text-ink hover:bg-panel2">
              <Icon size={20} className="text-muted" />
              <span className="flex-1 font-medium">{label}</span>
              <IconChevronRight size={18} className="text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
