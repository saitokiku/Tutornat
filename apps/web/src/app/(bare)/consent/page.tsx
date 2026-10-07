"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { KaizenLogo } from "@/components/brand";
import { IconArrowLeft } from "@/components/icons";
import { useTitle } from "@/components/LangSync";
import { ConsentManager } from "@/components/profiles/ConsentManager";
import { ParentGate } from "@/components/profiles/ParentGate";
import { btn } from "@/components/ui";
import { useT } from "@/i18n";
import { useStore } from "@/lib/store";

/** Where a grown-up gives, reads and revokes consent for AI features and voice. Grown-ups only. */
export default function ConsentPage() {
  const t = useT();
  useTitle(t("acct.consent.title2"));
  const router = useRouter();
  const unlocked = useStore((s) => Boolean(s.session.unlocked));
  return (
    <div className="min-h-dvh bg-paper">
      <header className="mx-auto flex max-w-wide items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <KaizenLogo size={32} href="/" />
        <Link href="/profiles" className={btn("ghost")}>
          <IconArrowLeft size={16} /> {t("acct.consent.back")}
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-4 sm:px-8 sm:pt-10">
        <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("acct.consent.title2")}</h1>
        <p className="mt-3 max-w-prose text-sm text-muted">{t("acct.consent.intro2")}</p>
        <Link href="/privacy" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-ink underline decoration-border underline-offset-4 hover:decoration-accent">
          {t("acct.privacyLink")}
        </Link>
        <div className="mt-8">{unlocked ? <ConsentManager /> : <ParentGate onPass={() => {}} onCancel={() => router.push("/profiles")} />}</div>
      </main>
    </div>
  );
}
