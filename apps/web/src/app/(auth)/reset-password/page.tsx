"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthCard, TextLink } from "@/components/auth/AuthFrame";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { Button, Field, Notice, btn } from "@/components/ui";
import { useT } from "@/i18n";
import { checkResetToken, resetPassword } from "@/lib/auth";

export default function ResetPasswordPage() {
  const t = useT();
  useTitle(t("auth.resetTitle"));
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState<{ token: string; valid: boolean } | null>(null);
  const valid = checked?.token === token ? checked.valid : null;

  useEffect(() => {
    let live = true;
    void checkResetToken(token).then((v) => live && setChecked({ token, valid: v }));
    return () => {
      live = false;
    };
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await resetPassword(token, password);
    setBusy(false);
    // With a server the reset also signs this browser in, and the page moves on to the family.
    if (r.ok) return setDone(true);
    setError(t(r.fields?.password ?? r.error ?? "auth.resetInvalid", { minutes: r.retryMinutes ?? 1 }));
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
        ) : valid === null ? (
          <p aria-busy="true" className="text-sm text-muted">
            {t("common.loading")}
          </p>
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
