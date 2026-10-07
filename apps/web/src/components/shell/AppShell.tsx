"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { KaizenLogo } from "@/components/brand";
import { StoreHealthNotice } from "@/components/gate";
import { IconBook, IconFamily, IconHome, IconLayers, IconPlus, IconSettings, IconSprout } from "@/components/icons";
import { Avatar } from "@/components/profiles/Avatar";
import { btn } from "@/components/ui";
import { gradeLabel, useLocale, useT } from "@/i18n";
import type { Key } from "@/i18n/en";
import { signOut } from "@/lib/auth";
import { DEMO } from "@/lib/mode";
import { currentAccount, currentLearner } from "@/lib/profiles";
import { useStore } from "@/lib/store";

type Tab = { href: string; label: Key; Icon: (p: { size?: number; className?: string }) => ReactNode };

const LEARNER_TABS: Tab[] = [
  { href: "/home", label: "nav.home", Icon: IconHome },
  { href: "/practice", label: "nav.practice", Icon: IconLayers },
  { href: "/courses", label: "nav.courses", Icon: IconBook },
  { href: "/growth", label: "nav.growth", Icon: IconSprout },
];
const PARENT_TABS: Tab[] = [
  { href: "/family", label: "nav.family", Icon: IconFamily },
  { href: "/growth", label: "nav.growth", Icon: IconSprout },
];

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const locale = useLocale();
  const path = usePathname();
  const learner = useStore(currentLearner);
  const account = useStore(currentAccount);
  const tabs = learner ? LEARNER_TABS : PARENT_TABS;
  const active = (href: string) => path === href || (href !== "/home" && path.startsWith(`${href}/`));

  return (
    <div className="min-h-dvh bg-paper">
      {/* The rail sits on panel2 so the chrome reads as furniture and the work reads as paper.
          Rose marks the selection; ink stays the action color. */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-border bg-panel2 lg:flex">
        <div className="px-5 pb-5 pt-6">
          <KaizenLogo size={32} href={learner ? "/home" : "/family"} caption={t("brand.tagline")} />
        </div>
        {learner && (
          <div className="px-3 pb-4">
            <Link href="/courses/new" className={btn("primary", "md", "w-full")}>
              <IconPlus size={18} /> {t("nav.new")}
            </Link>
          </div>
        )}
        <nav aria-label={t("nav.main")} className="flex-1 space-y-0.5 px-3">
          {tabs.map(({ href, label, Icon }) => {
            const on = active(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`group relative flex items-center gap-3 rounded-sm py-2.5 pl-4 pr-3 text-sm font-medium transition-colors ${
                  on ? "bg-panel text-ink shadow-soft" : "text-muted hover:bg-panel/70 hover:text-ink"
                }`}
              >
                <span aria-hidden="true" className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full ${on ? "bg-accent" : "bg-transparent"}`} />
                <Icon size={18} className={on ? "text-accent" : "text-muted group-hover:text-ink"} />
                {t(label)}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-3 border-t border-border px-3 pb-4 pt-3">
          <Link href="/profiles" className="flex items-center gap-2.5 rounded-sm px-2 py-2 hover:bg-panel/70">
            {learner ? (
              <Avatar profile={learner} size="sm" />
            ) : (
              <span className="grid size-8 place-items-center rounded-full border border-border bg-panel text-ink">
                <IconFamily size={16} />
              </span>
            )}
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-medium text-ink">{learner?.nickname ?? account?.displayName}</span>
              <span className="block text-xs text-muted">{learner ? gradeLabel(locale, learner.grade) : t("profiles.parent")}</span>
            </span>
            <span className="ml-auto text-xs text-muted">{t("nav.switchShort")}</span>
          </Link>
          {DEMO && (
            <p className="flex items-center gap-2 px-2 text-xs text-muted">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-warn" />
              {t("demo.status")}
            </p>
          )}
          <div className="flex items-center gap-1 text-xs">
            <Link href="/settings" className="inline-flex min-h-10 items-center rounded-sm px-2 text-muted hover:bg-panel/70 hover:text-ink">
              {t("nav.settings")}
            </Link>
            <button type="button" onClick={signOut} className="inline-flex min-h-10 items-center rounded-sm px-2 text-muted hover:bg-panel/70 hover:text-bad">
              {t("nav.signOut")}
            </button>
          </div>
        </div>
      </aside>

      <main className="lg:pl-60">
        <div className="mx-auto max-w-4xl px-4 pb-28 pt-5 lg:px-8 lg:pb-16 lg:pt-10">
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <KaizenLogo size={28} href={learner ? "/home" : "/family"} />
            <Link href="/profiles" aria-label={t("nav.switch")} className="rounded-full">
              {learner ? <Avatar profile={learner} size="sm" /> : <IconFamily size={22} />}
            </Link>
          </div>
          <StoreHealthNotice />
          {children}
        </div>
      </main>

      {/* Same selection language as the rail, one rose rule per tab, so phone and laptop read as one product. */}
      <nav aria-label={t("nav.main")} className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-panel/90 backdrop-blur-xl lg:hidden">
        <div className={`mx-auto grid max-w-lg ${learner ? "grid-cols-5" : "grid-cols-3"}`}>
          {(learner
            ? [LEARNER_TABS[0], LEARNER_TABS[1], { href: "/courses/new", label: "nav.newShort" as Key, Icon: IconPlus }, LEARNER_TABS[2]]
            : PARENT_TABS
          )
            .concat({ href: "/settings", label: "nav.me", Icon: IconSettings })
            .map(({ href, label, Icon }) => {
              const on = href === "/courses/new" ? path === href : active(href) && !(href === "/courses" && path === "/courses/new");
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={on ? "page" : undefined}
                  className="relative flex flex-col items-center gap-1 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
                >
                  <span aria-hidden="true" className={`absolute inset-x-6 top-0 h-0.5 rounded-full ${on ? "bg-accent" : "bg-transparent"}`} />
                  <Icon size={21} className={on ? "text-accent" : "text-muted"} />
                  <span className={`text-[11px] font-medium ${on ? "text-accent" : "text-muted"}`}>{t(label)}</span>
                </Link>
              );
            })}
        </div>
      </nav>
    </div>
  );
}
