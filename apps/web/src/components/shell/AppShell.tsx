"use client";

// The KaizenEDU shell (DESIGN.md → Composition). Wide screens: a 240px rail on panel2 — logo, the one
// primary action, the places, then status and who's learning. Phones: a header with who's learning and a
// bottom bar of four places plus Me. The selection is one rose-marked tile (rail) or rule (bar) that
// travels to the place you chose the moment you choose it; the page cross-fades in place behind still
// chrome. K–2 (data-band="k2", set by <BandSync>): bigger pictures, 56px targets, and a speaker that names
// the tabs. Number keys jump between places (never while typing; can be turned off).
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, ViewTransition, type CSSProperties, type ReactNode } from "react";
import { KaizenLogo, KaizenMark, KaizenWordmark } from "@/components/brand";
import { HandoverScope } from "@/components/family/Handover";
import { StoreHealthNotice } from "@/components/gate";
import { IconBook, IconCalendar, IconFamily, IconHome, IconPlus, IconPractice, IconSettings, IconSprout, IconTutor } from "@/components/icons";
import { Kbd, Spinner, announce, btn, useBand } from "@/components/ui";
import { useT } from "@/i18n";
import { useWeeklyEmail } from "@/lib/email/weekly";
import { currentLearner } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { HearTabs } from "./HearTabs";
import { LEARNER_TABS, PARENT_TABS, barTabs, digitOf, placeOf, type Place } from "./nav";
import { RouteFocus, SkipLink, useScopeKey } from "./route";
import { OfflineChip, StatusLines, useConnectionNews, useOnline } from "./Status";
import { Switcher, WhoButton } from "./Switcher";
import "./shell.css";

type IconFn = (p: { size?: number; className?: string }) => ReactNode;
const ICON: Partial<Record<Place, IconFn>> = {
  home: IconHome,
  practice: IconPractice,
  talk: IconTutor,
  learn: IconBook,
  calendar: IconCalendar,
  growth: IconSprout,
  family: IconFamily,
  settings: IconSettings,
};
const TAB_TYPES = ["k-tab"];
const KEYS_PREF = "kaizenedu.tabKeys";

/** "Me" on the phone bar is the learner's own initial in ink, ringed in their colour. Identity is the ring;
 *  being the current place is the rose rule above it, as for every other tab. Never a colour fill. */
function MeMark({ learner, on, size }: { learner: Profile; on: boolean; size: number }) {
  return (
    <span
      aria-hidden="true"
      className={`k-icon grid place-items-center rounded-full border-2 font-brand text-xs font-semibold text-ink transition-colors duration-(--duration-quick) ${on ? "bg-panel" : "bg-panel2"}`}
      style={{ "--k-icon-size": `${size}px`, borderColor: learner.color } as CSSProperties}
    >
      {learner.nickname.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** The trailing slot of a rail link: a spinner while a slow navigation is on its way, else the key hint. */
function Trail({ digit }: { digit: number | null }) {
  const { pending } = useLinkStatus();
  if (pending) return <Spinner className="text-muted" />;
  if (!digit) return null;
  return (
    <span aria-hidden="true" className="opacity-0 transition-opacity duration-(--duration-quick) group-hover:opacity-100 group-focus-visible:opacity-100">
      <Kbd>{digit}</Kbd>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const path = usePathname();
  const router = useRouter();
  const learner = useStore(currentLearner);
  const k2 = useBand() === "k2";
  const online = useOnline();
  useConnectionNews(online);
  useWeeklyEmail();

  const rail = learner ? LEARNER_TABS : PARENT_TABS;
  const bar = barTabs(Boolean(learner));
  const home = learner ? "/home" : "/family";

  // Optimistic selection: the mark moves on the press; once the path changes, the path decides again.
  const [pending, setPending] = useState<string | null>(null);
  const [seen, setSeen] = useState(path);
  if (seen !== path) {
    setSeen(path);
    setPending(null);
  }
  const shown = pending ?? path;
  const railAt = rail.findIndex((tab) => tab.place === placeOf(shown, rail));
  const barAt = bar.findIndex((tab) => tab.place === placeOf(shown, bar));

  const [speaking, setSpeaking] = useState<{ list: "rail" | "bar"; i: number } | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const [keys, setKeys] = useState(() => {
    try {
      return localStorage.getItem(KEYS_PREF) !== "off";
    } catch {
      return true;
    }
  });
  const toggleKeys = () => {
    try {
      localStorage.setItem(KEYS_PREF, keys ? "off" : "on");
    } catch {}
    setKeys(!keys);
    announce(t(keys ? "shell.keysOffNote" : "shell.keysOnNote", { n: rail.length }));
  };
  const shortcuts = keys && !k2;

  // 1–9 jump to the rail's places. Never while typing, with a modifier, or over a dialog or the switcher.
  useEffect(() => {
    if (!shortcuts) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || switcherOpen) return;
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest("input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox'], [role='slider'], [role='spinbutton']")) return;
      if (document.querySelector("dialog[open]")) return;
      const n = digitOf(e);
      const tab = n ? rail[n - 1] : undefined;
      if (!tab || placeOf(path, rail) === tab.place) return;
      e.preventDefault();
      setPending(tab.href);
      router.push(tab.href, { transitionTypes: TAB_TYPES });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcuts, switcherOpen, rail, path, router]);

  // A new learner gets their pages fresh; the arrival rises in (only after a switch, never on first load).
  const scope = useScopeKey();
  const [firstScope] = useState(scope);

  // A child sees only what needs doing something about (not saving, offline); the grown-up view also
  // sees where work is saved and which tutor is answering.
  const status = <StatusLines online={online} full={!learner} />;
  const railLabels = rail.map((tab) => t(tab.label));
  const barLabels = bar.map((tab) => t(tab.label));
  const iconSize = k2 ? 26 : 20;

  return (
    <div className="min-h-dvh bg-paper">
      <RouteFocus />
      <SkipLink to="k-main" />

      {/* Wide screens: the rail. Furniture on panel2; the work sits on paper. */}
      <header
        data-k-chrome
        data-print="hide"
        className="k-vt-rail fixed inset-y-0 left-0 z-20 hidden w-(--k-rail) flex-col border-r border-border bg-panel2 lg:flex"
      >
        <div className="flex items-center justify-between gap-2 px-5 pt-6 pb-5">
          <KaizenLogo size={32} href={home} caption={k2 ? undefined : t("brand.tagline")} />
          {k2 && <HearTabs labels={railLabels} onSpeak={(i) => setSpeaking(i === null ? null : { list: "rail", i })} />}
        </div>
        {learner && (
          <div className="px-3 pb-4">
            {/* Secondary: the page owns the one ink action (Start on Today's next thing). */}
            <Link href="/courses/new" className={btn("secondary", "md", "w-full")}>
              <IconPlus size={18} /> {t("nav.new")}
            </Link>
          </div>
        )}
        <nav aria-label={t("nav.main")} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
          <div className="k-rail-list" style={{ "--k-i": railAt } as CSSProperties}>
            {railAt >= 0 && <span aria-hidden="true" className="k-rail-sel" />}
            <ul>
              {rail.map((tab, i) => {
                const on = i === railAt;
                const Icon = ICON[tab.place]!;
                const lit = speaking?.list === "rail" && speaking.i === i;
                return (
                  <li key={tab.href}>
                    <Link
                      href={tab.href}
                      transitionTypes={TAB_TYPES}
                      onNavigate={() => setPending(tab.href)}
                      aria-current={on ? "page" : undefined}
                      aria-keyshortcuts={shortcuts ? String(i + 1) : undefined}
                      data-speaking={lit ? "" : undefined}
                      className={`group relative flex h-(--k-item) items-center gap-3 rounded-sm pr-2 pl-4 text-sm font-medium transition-colors duration-(--duration-quick) ${
                        on ? "text-ink" : "text-muted hover:bg-panel/55 hover:text-ink active:bg-panel/80"
                      } data-speaking:bg-accent/10 data-speaking:text-ink`}
                    >
                      <Icon size={iconSize} className={on || lit ? "text-accent" : "text-muted transition-colors group-hover:text-ink"} />
                      <span className="min-w-0 flex-1 truncate">{t(tab.label)}</span>
                      <Trail digit={shortcuts ? i + 1 : null} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          {/* The number keys are a grown-up's setting: a child learns them from the key shown on hover. */}
          {!learner && (
            <p className="mt-3 hidden flex-wrap items-center gap-x-2 gap-y-0.5 px-4 text-xs text-muted pointer-fine:flex">
              {keys ? (
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <Kbd>1</Kbd>–<Kbd>{rail.length}</Kbd>
                  <span className="ml-0.5">{t("shell.keys")}</span>
                </span>
              ) : (
                <span className="whitespace-nowrap">{t("shell.keysOffNote")}</span>
              )}
              <button
                type="button"
                onClick={toggleKeys}
                className="-mx-1.5 inline-flex min-h-8 items-center rounded-sm px-1.5 font-medium whitespace-nowrap underline decoration-border-strong transition-colors hover:text-ink hover:decoration-accent"
              >
                {keys ? t("shell.keysOff") : t("shell.keysOn")}
              </button>
            </p>
          )}
        </nav>
        <div className="border-t border-border px-3 pt-3 pb-3">
          <StatusLines online={online} full={!learner} className="px-2 pb-3 empty:hidden" />
          <div className="flex items-center gap-1">
            <WhoButton variant="rail" open={switcherOpen} />
            <Link
              href="/settings"
              aria-label={t("nav.settings")}
              title={t("nav.settings")}
              aria-current={path === "/settings" ? "page" : undefined}
              className="k-btn-ghost size-target shrink-0 px-0 py-0 aria-[current=page]:bg-panel aria-[current=page]:text-accent aria-[current=page]:shadow-soft"
            >
              <IconSettings size={20} />
            </Link>
          </div>
        </div>
      </header>

      {/* Phones: the header carries the logo and who's learning; the places live in the bar below. */}
      <header data-k-chrome data-print="hide" className="k-vt-header mx-auto flex max-w-4xl items-center gap-2 px-gutter pt-[max(1rem,env(safe-area-inset-top))] pb-1 lg:hidden">
        <Link href={home} aria-label="KaizenEDU" className="flex min-h-target shrink-0 items-center gap-2 rounded-sm">
          <KaizenMark size={28} />
          <KaizenWordmark size={16} className="max-[22.5rem]:hidden" />
        </Link>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          {!online && <OfflineChip />}
          {k2 && <HearTabs labels={barLabels} onSpeak={(i) => setSpeaking(i === null ? null : { list: "bar", i })} />}
          <WhoButton variant="bar" open={switcherOpen} />
        </div>
      </header>

      {/* overflow-x: clip — a page element a few pixels too wide must never widen a phone's viewport
          (that zooms the whole app out and breaks the tab cross-fade); clip is not a scroll container,
          so sticky headers inside pages keep working. */}
      <div className="overflow-x-clip lg:pl-(--k-rail)">
        <main
          id="k-main"
          tabIndex={-1}
          className="mx-auto max-w-4xl px-gutter pt-4 pb-[calc(7rem+env(safe-area-inset-bottom))] outline-none lg:px-8 lg:pt-10 lg:pb-16"
        >
          <div className="mb-6 empty:hidden">
            <StoreHealthNotice />
          </div>
          <ViewTransition update={{ "k-tab": "k-tab", default: "none" }} default="none">
            <HandoverScope>
              <div key={scope} className={scope !== firstScope ? "k-enter" : undefined}>
                {children}
              </div>
            </HandoverScope>
          </ViewTransition>
        </main>
      </div>

      {/* Phones: the same places in a bar, the rose rule riding its hairline. */}
      <nav
        data-k-chrome
        aria-label={t("nav.main")}
        className="k-vt-tabbar fixed inset-x-0 bottom-0 z-30 border-t border-border bg-panel/90 pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
      >
        <div className="relative mx-auto max-w-lg" style={{ "--k-i": barAt, "--k-n": bar.length } as CSSProperties}>
          {barAt >= 0 && <span aria-hidden="true" className="k-bar-rule" />}
          <ul className="grid" style={{ gridTemplateColumns: `repeat(${bar.length}, minmax(0, 1fr))` }}>
            {bar.map((tab, i) => {
              const on = i === barAt;
              const lit = speaking?.list === "bar" && speaking.i === i;
              const Icon = ICON[tab.place];
              return (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    transitionTypes={TAB_TYPES}
                    onNavigate={() => setPending(tab.href)}
                    aria-current={on ? "page" : undefined}
                    data-speaking={lit ? "" : undefined}
                    className="k-bar-tab group flex min-h-14 flex-col items-center justify-center gap-1 rounded-sm px-1 pt-2.5 pb-2 text-xs font-medium data-speaking:bg-accent/10"
                  >
                    {Icon ? (
                      <Icon size={k2 ? 28 : 22} className={on || lit ? "text-accent" : "text-muted group-hover:text-ink"} />
                    ) : (
                      learner && <MeMark learner={learner} on={on} size={k2 ? 28 : 22} />
                    )}
                    <span className={`max-w-full truncate leading-tight ${on ? "text-ink" : "text-muted group-hover:text-ink"}`}>{t(tab.label)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <Switcher status={status} onOpenChange={setSwitcherOpen} />
    </div>
  );
}
