"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthCard, TextLink } from "@/components/auth/AuthFrame";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { Button, Field, Notice, btn } from "@/components/ui";
import { useT } from "@/i18n";
import { resetPassword, resetTokenValid } from "@/lib/auth";

export default function ResetPasswordPage() {
  const t = useT();
  useTitle(t("auth.resetTitle"));
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const valid = resetTokenValid(token);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await resetPassword(token, password);
    setBusy(false);
    if (r.ok) return setDone(true);
    setError(t(r.fields?.password ?? r.error ?? "auth.resetInvalid"));
  }

  return (
    <Guard need="guest">
      <AuthCard title={t("auth.resetTitle")} footer={<TextLink href="/sign-in">{t("auth.signIn")}</TextLink>}>
        {done ? (
          <div className="space-y-4">
            <Notice tone="good">{t("auth.resetDone")}</Notice>
            <Link href="/sign-in" className={btn("primary")}>
              {t("auth.signIn")}
            </Link>
          </div>
        ) : !valid ? (
          <div className="space-y-4">
            <Notice tone="bad">{t("auth.resetInvalid")}</Notice>
            <Link href="/forgot-password" className={btn("secondary")}>
              {t("auth.sendLink")}
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5" noValidate>
            <Field label={t("auth.newPassword")} hint={t("auth.passwordHint")} error={error ?? undefined}>
              {(a) => <input {...a} type="password" autoComplete="new-password" className="k-input" value={password} onChange={(e) => setPassword(e.target.value)} />}
            </Field>
            <Button type="submit" loading={busy} className="w-full">
              {t("auth.resetSubmit")}
            </Button>
          </form>
        )}
      </AuthCard>
    </Guard>
  );
}
