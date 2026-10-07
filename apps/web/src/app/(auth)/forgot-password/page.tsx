"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthCard, TextLink } from "@/components/auth/AuthFrame";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { Button, Field, Notice, btn } from "@/components/ui";
import { useT } from "@/i18n";
import { requestReset, validate } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const t = useT();
  useTitle(t("auth.forgotTitle"));
  const [email, setEmail] = useState("");
  const [error, setError] = useState(false);
  const [sent, setSent] = useState<{ token: string | null } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (validate({ email }).email) return setError(true);
    setSent({ token: requestReset(email) });
  }

  return (
    <Guard need="guest">
      <AuthCard title={t("auth.forgotTitle")} body={t("auth.forgotBody")} footer={<TextLink href="/sign-in">{t("auth.signIn")}</TextLink>}>
        {sent ? (
          <div className="space-y-4">
            <Notice tone="good">{t("auth.linkSent", { email: email.trim() })}</Notice>
            {sent.token && (
              <div className="space-y-3 rounded-sm bg-panel2 p-4">
                <p className="text-xs text-muted">{t("auth.demoLink")}</p>
                <Link href={`/reset-password?token=${sent.token}`} className={btn("secondary", "sm")}>
                  {t("auth.openLink")}
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5" noValidate>
            <Field label={t("auth.email")} error={error ? t("err.email") : undefined}>
              {(a) => <input {...a} type="email" autoComplete="email" className="k-input" value={email} onChange={(e) => (setEmail(e.target.value), setError(false))} />}
            </Field>
            <Button type="submit" className="w-full">
              {t("auth.sendLink")}
            </Button>
          </form>
        )}
      </AuthCard>
    </Guard>
  );
}
