"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PolicyLinks, CONTACT_EMAIL } from "@/app/(legal)/legal";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { IconLogout } from "@/components/icons";
import { GoalsPicker } from "@/components/profiles/GoalsPicker";
import { Button, Field, Notice, btn } from "@/components/ui";
import { useT } from "@/i18n";
import { useAiMode } from "@/lib/ai/client";
import { signOut } from "@/lib/auth";
import { goalsOf } from "@/lib/family";
import { currentAccount, currentLearner, renameAccount, updateLearner } from "@/lib/profiles";
import { update, useStore } from "@/lib/store";
import type { Account, Locale } from "@/lib/types";
import { DataSection } from "./DataSection";
import { LearnersSection } from "./LearnersSection";
import { Section } from "./parts";
import { WeeklyEmail } from "./WeeklyEmail";

export default function SettingsPage() {
  return (
    <Guard need="selected">
      <Settings />
    </Guard>
  );
}

function LanguageChoice({ value, onPick }: { value: Locale; onPick: (l: Locale) => void }) {
  const t = useT();
  return (
    <div className="flex flex-wrap gap-2">
      {(["en", "es"] as const).map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={value === l} onClick={() => onPick(l)} className="k-chip min-h-11 px-5 text-sm">
          {t(`lang.${l}` as const)}
        </button>
      ))}
    </div>
  );
}

function AiStatus() {
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
      <Link href="/privacy#ai" className="inline-flex min-h-11 items-center text-sm font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-accent">
        {t("trust.settings.aiPrivacy")}
      </Link>
    </div>
  );
}

function About() {
  const t = useT();
  const [before, after] = t("trust.legal.contact", { email: "\u0000" }).split("\u0000");
  return (
    <Section id="about" title={t("trust.about.title")}>
      <p className="max-w-prose text-sm text-muted">{t("trust.about.body")}</p>
      <PolicyLinks />
      <p className="text-sm text-muted">
        {before}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-ink underline decoration-border underline-offset-4 hover:decoration-accent">
          {CONTACT_EMAIL}
        </a>
        {after}
      </p>
    </Section>
  );
}

function Settings() {
  const t = useT();
  useTitle(t("settings.title"));
  const learner = useStore(currentLearner);
  const confirming = useSearchParams().has("weekly");

  // A learner is using the app: only their language here; the rest is the grown-up's.
  if (learner)
    return (
      <div>
        <h1 className="mb-6 font-brand text-t1 font-semibold text-ink sm:text-d3">{t("settings.title")}</h1>
        {confirming && <Notice tone="warn">{t("trust.weekly.parentFirst")}</Notice>}
        <Section id="language" title={t("settings.learnerLanguage", { name: learner.nickname })}>
          <LanguageChoice value={learner.locale} onPick={(l) => updateLearner(learner.id, { nickname: learner.nickname, grade: learner.grade, locale: l })} />
        </Section>
        <Section id="account" title={t("settings.account")}>
          <p className="text-sm text-muted">{t("settings.grownUps")}</p>
          <Link href="/profiles" className={btn("secondary", "sm", "min-h-11")}>
            {t("nav.switch")}
          </Link>
        </Section>
        <About />
      </div>
    );

  return <GrownUpSettings />;
}

function GrownUpSettings() {
  const t = useT();
  const account = useStore(currentAccount) as Account;
  const goals = useStore(goalsOf);
  const prefLocale = useStore((s) => s.prefs.locale);
  const [name, setName] = useState(account.displayName);
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <h1 className="mb-6 font-brand text-t1 font-semibold text-ink sm:text-d3">{t("settings.title")}</h1>

      <Section id="account" title={t("settings.account")}>
        <p className="text-sm text-muted">{t("settings.signedInAs", { email: account.email })}</p>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            renameAccount(name);
            setSaved(true);
          }}
        >
          <div className="min-w-0 flex-1 basis-56">
            <Field label={t("auth.name")}>{(a) => <input {...a} className="k-input" maxLength={80} value={name} onChange={(e) => (setName(e.target.value), setSaved(false))} />}</Field>
          </div>
          <Button type="submit" variant="secondary" disabled={!name.trim() || name.trim() === account.displayName}>
            {t("common.save")}
          </Button>
          <span role="status" className="text-xs text-good">
            {saved ? t("settings.saved") : ""}
          </span>
        </form>
        <Button variant="ghost" size="sm" className="min-h-11" onClick={signOut}>
          <IconLogout size={16} /> {t("nav.signOut")}
        </Button>
      </Section>

      <Section id="language" title={t("settings.language")}>
        <p className="text-sm text-muted">{t("settings.languageBody")}</p>
        <LanguageChoice value={prefLocale} onPick={(l) => update((s) => void (s.prefs.locale = l))} />
      </Section>

      <Section id="goals" title={t("settings.goals")}>
        <GoalsPicker key={(goals ?? []).join()} initial={goals ?? []} compact />
      </Section>

      <Section id="ai" title={t("settings.ai")}>
        <AiStatus />
      </Section>

      <LearnersSection />
      <WeeklyEmail account={account} />
      <DataSection accountId={account.id} />

      <Section id="review" title={t("trust.settings.reviewTitle")}>
        <p className="max-w-prose text-sm text-muted">{t("trust.settings.reviewBody")}</p>
        <Link href="/review" className={btn("secondary", "sm", "min-h-11")}>
          {t("trust.settings.reviewOpen")}
        </Link>
      </Section>

      <About />
    </div>
  );
}
