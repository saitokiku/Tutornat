"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthCard, TextLink } from "@/components/auth/AuthFrame";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { Button, Field, Notice, btn } from "@/components/ui";
import { useLocale, useT } from "@/i18n";
import { requestPasswordReset, useServerStatus, validate, type ResetRequest } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const t = useT();
  useTitle(t("auth.forgotTitle"));
  const locale = useLocale();
  const server = useServerStatus()?.mode === "server";
  const [email, setEmail] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<ResetRequest | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (validate({ email }).email) return setError(true);
    setBusy(true);
    setSent(await requestPasswordReset(email, locale));
    setBusy(false);
  }

  const done = sent?.ok ? sent : null;
  return (
    <Guard need="guest">
      <AuthCard title={t("auth.forgotTitle")} body={t("auth.forgotBody")} footer={<TextLink href="/sign-in">{t("auth.signIn")}</TextLink>}>
        {done ? (
          <div className="space-y-4">
            {done.delivery === "sent" || !server ? (
              <Notice tone="good">{t("auth.linkSent", { email: email.trim() })}</Notice>
            ) : done.delivery === "failed" ? (
              <Notice tone="bad">{t("acct.reset.failed")}</Notice>
            ) : (
              !done.link && <Notice tone="warn">{t("acct.reset.noEmail")}</Notice>
            )}
            {done.link && (
              <div className="space-y-3 rounded-sm bg-panel2 p-4">
                {/* Browser-only there is no email at all; with a server, only development shows the link. */}
                <p className="text-xs text-muted">{t(server ? "acct.reset.devLink" : "auth.demoLink")}</p>
                <Link href={done.link} className={btn("secondary")}>
                  {t("auth.openLink")}
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5" noValidate>
            {sent && !sent.ok && <Notice tone="bad">{t(sent.error, { minutes: sent.retryMinutes ?? 1 })}</Notice>}
            <Field label={t("auth.email")} error={error ? t("err.email") : undefined}>
              {(a) => <input {...a} type="email" autoComplete="email" className="k-input" value={email} onChange={(e) => (setEmail(e.target.value), setError(false))} />}
            </Field>
            <Button type="submit" loading={busy} className="w-full">
              {t("auth.sendLink")}
            </Button>
          </form>
        )}
      </AuthCard>
    </Guard>
  );
}
