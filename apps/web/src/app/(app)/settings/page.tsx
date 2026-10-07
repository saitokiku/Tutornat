"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Guard } from "@/components/gate";
import { IconLogout } from "@/components/icons";
import { Avatar } from "@/components/profiles/Avatar";
import { Button, Field, btn } from "@/components/ui";
import { gradeLabel, useLocale, useT } from "@/i18n";
import { signOut } from "@/lib/auth";
import { currentAccount, learnersOf, renameAccount } from "@/lib/profiles";
import { clearAll, update, useStore } from "@/lib/store";
import type { Account } from "@/lib/types";

export default function SettingsPage() {
  return (
    <Guard need="selected">
      <Settings />
    </Guard>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-border py-7 md:grid-cols-[14rem_1fr]">
      <h2 className="font-brand text-t3 font-semibold text-ink">{title}</h2>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

function Settings() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const account = useStore(currentAccount) as Account;
  const kids = useStore(learnersOf);
  const prefLocale = useStore((s) => s.prefs.locale);
  const [name, setName] = useState(account.displayName);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState("");

  return (
    <div>
      <h1 className="mb-6 font-brand text-t1 font-semibold text-ink sm:text-d3">{t("settings.title")}</h1>

      <Section title={t("settings.account")}>
        <p className="text-sm text-muted">{t("settings.signedInAs", { email: account.email })}</p>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            renameAccount(name);
            setSaved(true);
          }}
        >
          <div className="min-w-56 flex-1">
            <Field label={t("auth.name")}>{(a) => <input {...a} className="k-input" maxLength={80} value={name} onChange={(e) => (setName(e.target.value), setSaved(false))} />}</Field>
          </div>
          <Button type="submit" variant="secondary" disabled={!name.trim() || name.trim() === account.displayName}>
            {t("common.save")}
          </Button>
          <span role="status" className="text-xs text-good">
            {saved ? t("settings.saved") : ""}
          </span>
        </form>
        <Button variant="ghost" size="sm" onClick={() => (signOut(), router.push("/"))}>
          <IconLogout size={16} /> {t("nav.signOut")}
        </Button>
      </Section>

      <Section title={t("settings.language")}>
        <p className="text-sm text-muted">{t("settings.languageBody")}</p>
        <div className="flex gap-2">
          {(["en", "es"] as const).map((l) => (
            <button key={l} type="button" lang={l} aria-pressed={prefLocale === l} onClick={() => update((s) => void (s.prefs.locale = l))} className="k-chip min-h-10 px-4 text-sm">
              {t(`lang.${l}` as const)}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("settings.learners")}>
        <ul className="space-y-2">
          {kids.map((k) => (
            <li key={k.id} className="flex items-center gap-3 text-sm text-ink">
              <Avatar profile={k} size="sm" />
              {k.nickname}
              <span className="text-muted">
                · {gradeLabel(locale, k.grade)} · {t(`lang.${k.locale}` as const)}
              </span>
            </li>
          ))}
        </ul>
        <Link href="/profiles" className={btn("secondary", "sm")}>
          {t("settings.manageLearners")}
        </Link>
      </Section>

      <Section title={t("settings.data")}>
        <p className="text-sm text-muted">{t("settings.dataBody")}</p>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (confirm !== "DELETE") return;
            router.push("/");
            clearAll();
          }}
        >
          <div className="min-w-56 flex-1">
            <Field label={t("settings.deleteType")}>
              {(a) => <input {...a} className="k-input" autoComplete="off" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
            </Field>
          </div>
          <button type="submit" disabled={confirm !== "DELETE"} className="k-btn bg-bad text-paper hover:bg-bad/90">
            {t("settings.deleteAll")}
          </button>
        </form>
      </Section>

      <Section title={t("settings.about")}>
        <p className="max-w-prose text-sm text-muted">{t("settings.aboutBody")}</p>
      </Section>
    </div>
  );
}
