"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { KaizenLogo } from "@/components/brand";
import { useTitle } from "@/components/LangSync";
import { LangToggle } from "@/components/LangToggle";
import { useLocale, useT } from "@/i18n";
import type { Key } from "@/i18n/en";

// The public policy pages. They render on the server in English and switch to the family's
// language in the browser (no store needed to read them).

/** Where privacy questions and data requests go. The mailbox must exist before launch. */
export const CONTACT_EMAIL = "privacy@kaizenedu.net";
/** The date on the current drafts. Change it whenever a policy's wording changes. */
export const POLICY_DATE = "2026-10-07";

export const POLICIES: { href: "/privacy" | "/terms" | "/retention"; title: Key }[] = [
  { href: "/privacy", title: "trust.privacy.title" },
  { href: "/terms", title: "trust.terms.title" },
  { href: "/retention", title: "trust.retention.title" },
];

/** Links to the three policies, for footers and Settings. */
export function PolicyLinks({ className = "" }: { className?: string }) {
  const t = useT();
  return (
    <ul className={`flex flex-wrap gap-x-5 gap-y-1 ${className}`}>
      {POLICIES.map((p) => (
        <li key={p.href}>
          <Link href={p.href} className="inline-flex min-h-11 items-center text-sm text-ink underline decoration-border underline-offset-4 hover:decoration-accent">
            {t(p.title)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function LegalFrame({ children }: { children: ReactNode }) {
  const t = useT();
  const path = usePathname();
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="mx-auto flex w-full max-w-wide items-center justify-between gap-4 px-4 py-5 sm:px-8">
        <KaizenLogo size={32} href="/" />
        <LangToggle />
      </header>
      <nav aria-label={t("trust.legal.nav")} className="mx-auto w-full max-w-prose px-4 sm:px-0">
        <ul className="flex flex-wrap gap-2">
          {POLICIES.map((p) => (
            <li key={p.href}>
              <Link href={p.href} aria-current={path === p.href ? "page" : undefined} className="k-chip min-h-11 px-4 text-sm aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-paper">
                {t(p.title)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="mx-auto w-full max-w-prose flex-1 px-4 pb-16 pt-8 sm:px-0">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-wide flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-muted sm:px-8">
          <KaizenLogo size={24} />
          <span>{t("trust.legal.contact", { email: CONTACT_EMAIL })}</span>
        </div>
      </footer>
    </div>
  );
}

export type Block = { p: Key } | { list: Key[] } | { rows: [Key, Key][] };
export type PolicySection = { id: string; title: Key; blocks: Block[] };

/** One policy: title, the draft notice, contents, sections, contact. */
export function LegalPage({ title, intro, sections }: { title: Key; intro: Key; sections: PolicySection[] }) {
  const t = useT();
  const locale = useLocale();
  useTitle(t(title));
  const [y, m, d] = POLICY_DATE.split("-").map(Number);
  const dated = new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { dateStyle: "long", timeZone: "UTC" }).format(Date.UTC(y, m - 1, d, 12));
  return (
    <article className="space-y-8">
      <header className="space-y-4">
        <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t(title)}</h1>
        <div role="note" className="rounded-md border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-ink">
          <p className="font-semibold">{t("trust.legal.draft")}</p>
          <p className="mt-1">{t("trust.legal.draftBody")}</p>
          <p className="mt-1 font-opmono text-xs text-muted">{t("trust.legal.dated", { date: dated })}</p>
        </div>
        <p className="text-body text-ink">{t(intro)}</p>
      </header>

      {sections.length > 4 && (
        <nav aria-labelledby="toc" className="k-well px-5 py-4">
          <h2 id="toc" className="text-xs font-semibold text-muted">
            {t("trust.legal.onThisPage")}
          </h2>
          <ol className="mt-2 grid gap-x-6 sm:grid-cols-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="inline-flex min-h-11 items-center text-sm text-ink underline decoration-border underline-offset-4 hover:decoration-accent sm:min-h-9">
                  {t(s.title)}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {sections.map((s) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-6 space-y-3">
          <h2 id={`${s.id}-h`} className="font-brand text-t2 font-semibold text-ink">
            {t(s.title)}
          </h2>
          {s.blocks.map((b, i) => (
            <BlockView key={i} block={b} />
          ))}
        </section>
      ))}
    </article>
  );
}

function BlockView({ block }: { block: Block }) {
  const t = useT();
  if ("p" in block)
    return <p className="text-body text-ink">{block.p === "trust.legal.contact" ? <ContactLine /> : t(block.p)}</p>;
  if ("list" in block)
    return (
      <ul className="list-disc space-y-1.5 pl-5 text-body text-ink marker:text-accent">
        {block.list.map((k) => (
          <li key={k}>{t(k)}</li>
        ))}
      </ul>
    );
  return (
    <div className="overflow-hidden rounded-md border border-border bg-panel">
      <table className="w-full text-left text-sm">
        <thead className="bg-panel2 text-xs text-muted">
          <tr>
            <th scope="col" className="w-2/5 px-4 py-2 font-semibold">
              {t("trust.legal.what")}
            </th>
            <th scope="col" className="px-4 py-2 font-semibold">
              {t("trust.legal.howLong")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border align-top">
          {block.rows.map(([what, how]) => (
            <tr key={what}>
              <th scope="row" className="px-4 py-3 font-medium text-ink">
                {t(what)}
              </th>
              <td className="px-4 py-3 text-ink">{t(how)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContactLine() {
  const t = useT();
  const [before, after] = t("trust.legal.contact", { email: "\u0000" }).split("\u0000");
  return (
    <>
      {before}
      <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-accent">
        {CONTACT_EMAIL}
      </a>
      {after}
    </>
  );
}
