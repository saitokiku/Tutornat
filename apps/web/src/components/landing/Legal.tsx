"use client";

import Link from "next/link";
import { KaizenMark, KaizenWordmark } from "@/components/brand";
import { useTitle } from "@/components/LangSync";
import { btn } from "@/components/ui";
import { useLocale, useT, type Key } from "@/i18n";
import { update, useStore } from "@/lib/store";
import type { Locale } from "@/lib/types";

// The privacy notice and the terms, in the landing's reading column: plain words, dated, one idea per
// section. They describe what the product does today; when that changes, these pages change first.

const UPDATED = "2026-10-07";

const DOCS = {
  privacy: {
    title: "land.privacy.title",
    intro: "land.privacy.intro",
    sections: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"],
    other: { href: "/terms", label: "land.parents.terms.link" },
  },
  terms: {
    title: "land.terms.title",
    intro: "land.terms.intro",
    sections: ["s1", "s2", "s3", "s4", "s5", "s6", "s7"],
    other: { href: "/privacy", label: "land.parents.privacy.link" },
  },
} as const;

export type LegalKind = keyof typeof DOCS;

export function Legal({ kind }: { kind: LegalKind }) {
  const t = useT();
  const locale = useLocale();
  const canSwitch = useStore((s) => !s.profiles.some((p) => p.id === s.session.profileId));
  const doc = DOCS[kind];
  useTitle(t(doc.title));
  const other: Locale = locale === "en" ? "es" : "en";
  const date = new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${UPDATED}T12:00:00Z`));
  // Section bodies may name other screens; those names come from the same dictionary as the screens.
  const vars = { where: t("nav.settings"), action: t("settings.deleteAll") };

  return (
    <div className="min-h-dvh bg-paper">
      <header className="mx-auto flex max-w-wide items-center justify-between gap-3 px-gutter py-4 sm:px-8 sm:py-5">
        <Link href="/" className="-m-1.5 inline-flex items-center gap-2.5 rounded-sm p-1.5">
          <KaizenMark size={30} />
          <KaizenWordmark size={17} />
        </Link>
        {canSwitch && (
          <button type="button" lang={other} onClick={() => update((s) => void (s.prefs.locale = other))} className={btn("ghost", "sm", "-mr-3")}>
            {t("land.otherLang")}
          </button>
        )}
      </header>

      {/* Headings in a narrow left column, the words at a reading measure beside them. Names of
          services never break across lines, so the prose here doesn't hyphenate. */}
      <main className="mx-auto max-w-[58rem] px-gutter pt-8 pb-20 sm:px-8 sm:pt-14 sm:pb-28">
        <h1 className="font-brand text-d3 font-semibold text-ink sm:text-d2">{t(doc.title)}</h1>
        <p className="mt-3 text-sm text-muted">
          {t("land.legal.updated")} <time dateTime={UPDATED}>{date}</time>
        </p>
        <p className="mt-8 max-w-[40rem] text-t3 text-ink/85 hyphens-manual">{t(doc.intro)}</p>

        <div className="mt-12 divide-y divide-border border-t border-ink">
          {doc.sections.map((s) => (
            <section key={s} aria-labelledby={`${kind}-${s}`} className="grid gap-x-10 gap-y-2 py-7 sm:grid-cols-[minmax(0,13rem)_minmax(0,40rem)]">
              <h2 id={`${kind}-${s}`} className="font-brand text-t3 font-semibold text-ink">
                {t(`land.${kind}.${s}.t` as Key)}
              </h2>
              <p className="text-body text-ink/85 hyphens-manual">{t(`land.${kind}.${s}.b` as Key, vars)}</p>
            </section>
          ))}
        </div>

        <nav aria-label={t("land.footer.nav")} className="-mx-3 mt-10 flex flex-wrap gap-x-1 gap-y-1">
          <Link href={doc.other.href} className={btn("ghost", "sm")}>
            {t(doc.other.label)}
          </Link>
          <Link href="/" className={btn("ghost", "sm")}>
            {t("land.legal.home")}
          </Link>
        </nav>
      </main>
    </div>
  );
}
