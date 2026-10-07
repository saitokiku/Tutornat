"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { IconLogout } from "@/components/icons";
import { Avatar } from "@/components/profiles/Avatar";
import { Button, Field, btn } from "@/components/ui";
import { gradeLabel, useLocale, useT } from "@/i18n";
import { signOut } from "@/lib/auth";
import { currentAccount, currentLearner, learnersOf, renameAccount, updateLearner } from "@/lib/profiles";
import { clearAll, update, useStore } from "@/lib/store";
import { useAiMode } from "@/lib/ai/client";
import { goalsOf } from "@/lib/family";
import { GoalsPicker } from "@/components/profiles/GoalsPicker";
import type { Account } from "@/lib/types";

function AiStatusLine() {
  const t = useT();
  const mode = useAiMode();
  if (!mode) return <p className="text-sm text-muted">{t("common.loading")}</p>;
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <span aria-hidden="true" className={`size-2 rounded-full ${mode === "demo" ? "bg-warn" : "bg-good"}`} />
        {mode === "demo" ? t("settings.aiDemo") : t("settings.aiOn")}
      </p>
      <p className="max-w-prose text-sm text-muted">{mode === "demo" ? t("settings.aiDemoBody") : t("settings.aiOnBody")}</p>
    </div>
  );
}

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
  useTitle(t("settings.title"));
  const locale = useLocale();
  const account = useStore(currentAccount) as Account;
  const learner = useStore(currentLearner);
  const kids = useStore(learnersOf);
  const goals = useStore(goalsOf);
  const prefLocale = useStore((s) => s.prefs.locale);
  const [name, setName] = useState(account.displayName);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState("");

  if (learner)
    return (
      <div>
        <h1 className="mb-6 font-brand text-t1 font-semibold text-ink sm:text-d3">{t("settings.title")}</h1>
        <Section title={t("settings.learnerLanguage", { name: learner.nickname })}>
          <div className="flex gap-2">
            {(["en", "es"] as const).map((l) => (
              <button
                key={l}
                type="button"
                lang={l}
                aria-pressed={learner.locale === l}
                onClick={() => updateLearner(learner.id, { nickname: learner.nickname, grade: learner.grade, locale: l })}
                className="k-chip min-h-11 px-5 text-sm"
              >
                {t(`lang.${l}` as const)}
              </button>
            ))}
          </div>
        </Section>
        <Section title={t("settings.account")}>
          <p className="text-sm text-muted">{t("settings.grownUps")}</p>
          <Link href="/profiles" className={btn("secondary", "sm")}>
            {t("nav.switch")}
          </Link>
        </Section>
        <Section title={t("settings.about")}>
          <p className="max-w-prose text-sm text-muted">{t("settings.aboutBody")}</p>
        </Section>
      </div>
    );

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
        <Button variant="ghost" size="sm" onClick={signOut}>
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

      <Section title={t("settings.goals")}>
        <GoalsPicker key={(goals ?? []).join()} initial={goals ?? []} compact />
      </Section>

      <Section title={t("settings.ai")}>
        <AiStatusLine />
      </Section>

      <Section title={t("settings.learners")}>
        <ul className="space-y-2">
          {kids.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center gap-3 text-sm text-ink">
              <Avatar profile={k} size="sm" />
              {k.nickname}
              <span className="text-muted">
                · {gradeLabel(locale, k.grade)} · {t(`lang.${k.locale}` as const)}
              </span>
              <Link href={`/family/${k.id}`} className="ml-auto text-xs font-medium text-muted underline underline-offset-4 hover:text-ink">
                {t("settings.learnerSettings")}
              </Link>
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
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload after wiping data
            window.location.assign("/");
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
