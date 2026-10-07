"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { KaizenMark, KaizenWordmark } from "@/components/brand";
import { IconArrowRight, IconHomework, IconPractice, IconTest } from "@/components/icons";
import { btn, useBand } from "@/components/ui";
import { useLocale, useT } from "@/i18n";
import { useAiMode } from "@/lib/ai/client";
import { update, useStore } from "@/lib/store";
import type { Locale } from "@/lib/types";
import type { BandKey, LandingData } from "./data";
import { Engine } from "./Faces";
import { Courses, Parents, SkillMap, Status } from "./Sections";
import { Sheet, type Outcome } from "./Sheet";

// The front door. A parent, usually on a phone, decides tonight. The opening says what this is in one
// line, offers the three questions families actually arrive with as working doors into the product, and
// puts a real, checked practice problem beside them. Right under it, the parent's record fills in from
// that problem; then the engine, what's covered, and where things stand. Nothing on the page claims more
// than works today, and the help door says what help means on this deployment.

/** Each door: signed out it starts an account with that goal; signed in it opens the matching screen. */
const DOORS = [
  { id: "help", Icon: IconHomework, goal: "help", app: "/talk", q: "land.door.help.q", a: "land.door.help.demo", aOn: "land.door.help.a" },
  { id: "test", Icon: IconTest, goal: "organized", app: "/calendar?add=test", q: "land.door.test.q", a: "land.door.test.a", aOn: "land.door.test.a" },
  { id: "daily", Icon: IconPractice, goal: "daily", app: "/home", q: "land.door.daily.q", a: "land.door.daily.a", aOn: "land.door.daily.a" },
] as const;

const setLocale = (l: Locale) => update((s) => void (s.prefs.locale = l));

export function Landing({ data }: { data: LandingData }) {
  const t = useT();
  const locale = useLocale();
  const signedIn = useStore((s) => Boolean(s.session.accountId));
  // A learner's own language wins over the switch, so the switch is offered only when it can act.
  const canSwitch = useStore((s) => !s.profiles.some((p) => p.id === s.session.profileId));
  // Promises follow the deployment: until we know the AI tutor is on, the page promises the built-in one.
  const mode = useAiMode();
  const aiOn = mode !== null && mode !== "demo";
  // A K–2 learner who opens the front page meets a K–2 problem first.
  const learnerBand = useBand();
  const [picked, setPicked] = useState<BandKey | null>(null);
  const band: BandKey = picked ?? (learnerBand === "k2" ? "k2" : "35");
  const [turn, setTurn] = useState<Record<BandKey, number>>({ k2: 0, "35": 0, "69": 0 });
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);

  const set = data.hero[band];
  const pool = set.items[locale];
  const item = pool[turn[band] % pool.length];
  const other: Locale = locale === "en" ? "es" : "en";

  return (
    <div className="min-h-dvh bg-paper">
      <header className="mx-auto flex max-w-wide items-center justify-between gap-3 px-gutter py-4 sm:px-8 sm:py-5">
        <Link href="/" className="-m-1.5 inline-flex items-center gap-2.5 rounded-sm p-1.5">
          <KaizenMark size={30} />
          <KaizenWordmark size={17} />
        </Link>
        <nav aria-label={t("nav.main")} className="flex items-center gap-1 sm:gap-2">
          {canSwitch && (
            <button type="button" lang={other} onClick={() => setLocale(other)} className={btn("ghost", "sm", "max-[22.4rem]:px-2.5")}>
              {t("land.otherLang")}
            </button>
          )}
          {signedIn ? (
            <Link href="/profiles" className={btn("secondary", "sm", "whitespace-nowrap")}>
              {t("landing.openApp")}
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className={btn("ghost", "sm", "hidden sm:inline-flex")}>
                {t("landing.signIn")}
              </Link>
              {/* Secondary: the problem on the page owns the one ink action. On a 320px phone it says "Start". */}
              <Link href="/sign-up" className={btn("secondary", "sm", "whitespace-nowrap")}>
                <span className="max-[22.4rem]:hidden">{t("landing.cta")}</span>
                <span className="hidden max-[22.4rem]:inline">{t("land.start")}</span>
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section aria-labelledby="hero-title" className="mx-auto max-w-wide px-gutter pt-6 pb-16 sm:px-8 sm:pt-10 sm:pb-24 lg:pt-14">
          <h1 id="hero-title" className="font-brand text-d3 font-semibold text-ink sm:text-d2 lg:text-d1">
            {t("landing.title")}
          </h1>
          <p className="mt-4 max-w-[36rem] text-t3 text-ink/80 hyphens-manual sm:mt-5 sm:text-t2 sm:leading-snug">{t("land.lede")}</p>

          <div className="mt-8 grid items-start gap-10 sm:mt-12 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-5">
              <Doors signedIn={signedIn} aiOn={aiOn} />
              {!signedIn && (
                <p className="mt-4 text-sm text-muted">
                  {t("land.door.have")}{" "}
                  <Link href="/sign-in" className="k-link">
                    {t("landing.signIn")}
                  </Link>
                </p>
              )}
            </div>
            <div className="min-w-0 lg:col-span-7">
              <Sheet
                set={set}
                item={item}
                band={band}
                onBand={setPicked}
                locale={locale}
                onResult={(o) => setOutcomes((list) => [o, ...list])}
                onNext={() => setTurn((x) => ({ ...x, [band]: x[band] + 1 }))}
              />
            </div>
          </div>
        </section>

        <Parents data={data} outcomes={outcomes} />
        <Engine set={set} item={item} locale={locale} aiOn={aiOn} />
        <SkillMap data={data} locale={locale} onLocale={setLocale} />
        <Courses courses={data.courses} locale={locale} />
        <Status data={data} aiOn={aiOn} />

        <section aria-labelledby="close" className="border-t border-border">
          <div className="mx-auto grid max-w-wide gap-10 px-gutter py-14 sm:px-8 sm:py-24 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-6">
              <h2 id="close" className="font-brand text-t1 font-semibold text-ink sm:text-d2">
                {t("land.close.title")}
              </h2>
              <p className="mt-4 max-w-[30rem] text-body text-muted">{t("land.close.body")}</p>
            </div>
            <div className="lg:col-span-6">
              <Doors signedIn={signedIn} aiOn={aiOn} compact />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-wide flex-wrap items-center justify-between gap-x-8 gap-y-4 px-gutter py-8 sm:px-8">
          <p className="inline-flex items-center gap-2.5 text-xs text-muted">
            <KaizenMark size={20} />
            <span translate="no">{t("landing.footer")}</span>
          </p>
          {/* -mx-3: the ghost pills' padding hangs outside the gutter, so their words line up with it. */}
          <nav aria-label={t("land.footer.nav")} className="-mx-3 flex flex-wrap items-center gap-x-1 gap-y-1">
            <Link href="/privacy" className={btn("ghost", "sm")}>
              {t("land.footer.privacy")}
            </Link>
            <Link href="/terms" className={btn("ghost", "sm")}>
              {t("land.footer.terms")}
            </Link>
            {!signedIn && (
              <Link href="/sign-in" className={btn("ghost", "sm")}>
                {t("landing.signIn")}
              </Link>
            )}
            {canSwitch && (
              <button type="button" lang={other} onClick={() => setLocale(other)} className={btn("ghost", "sm")}>
                {t("land.otherLang")}
              </button>
            )}
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** The three questions families arrive with, as rows ruled like a notebook. Each row is one link. */
function Doors({ signedIn, aiOn, compact = false }: { signedIn: boolean; aiOn: boolean; compact?: boolean }) {
  const t = useT();
  const base = useId();
  return (
    <ul aria-label={t("land.doors.title")} className="border-b border-border-strong">
      {DOORS.map(({ id, Icon, goal, app, q, a, aOn }) => (
        <li key={id} className="border-t border-border-strong">
          <Link
            href={signedIn ? app : `/sign-up?goal=${goal}`}
            aria-labelledby={`${base}-${id}-q`}
            aria-describedby={compact ? undefined : `${base}-${id}-a`}
            className={`group -mx-3 my-1.5 flex items-center gap-4 rounded-md px-3 transition-[background-color,box-shadow,scale] duration-(--duration-quick) ease-out-quart hover:bg-panel hover:shadow-soft focus-visible:bg-panel focus-visible:shadow-soft active:scale-[0.995] active:bg-panel2/70 active:shadow-none ${
              compact ? "min-h-16 py-2" : "min-h-20 py-3 sm:min-h-24 sm:py-4"
            }`}
          >
            <Icon size={22} className="mt-0.5 shrink-0 self-start text-muted transition-colors duration-(--duration-quick) group-hover:text-accent group-focus-visible:text-accent" />
            <span className="min-w-0 flex-1">
              <span id={`${base}-${id}-q`} className="block font-brand text-t2 font-semibold text-ink">
                {t(q)}
              </span>
              {!compact && (
                <span id={`${base}-${id}-a`} className="mt-1 block text-sm text-muted hyphens-manual">
                  {t(aiOn ? aOn : a)}
                </span>
              )}
            </span>
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-full border border-border-strong text-ink transition-[background-color,border-color,color] duration-(--duration-quick) group-hover:border-ink group-hover:bg-ink group-hover:text-paper group-focus-visible:border-ink group-focus-visible:bg-ink group-focus-visible:text-paper"
            >
              <IconArrowRight size={18} className="transition-transform duration-(--duration-quick) ease-out-quart motion-safe:group-hover:translate-x-0.5" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
