"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthCard, TextLink } from "@/components/auth/AuthFrame";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { Button, Field, Notice } from "@/components/ui";
import { useT } from "@/i18n";
import type { Key } from "@/i18n/en";
import { signIn } from "@/lib/auth";

/** Only follow a ?next= that stays on this site (blocks //evil and /\\evil tricks). */
function sameSite(next: string | null) {
  if (!next) return null;
  try {
    const u = new URL(next, window.location.origin);
    return u.origin === window.location.origin ? u.pathname + u.search : null;
  } catch {
    return null;
  }
}

export default function SignInPage() {
  const t = useT();
  useTitle(t("auth.signIn"));
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<Key | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await signIn(email, password);
    setBusy(false);
    if (!r.ok) return setError(r.error ?? "err.badLogin");
    router.push(sameSite(next) ?? "/profiles");
  }

  return (
    <Guard need="guest">
      <AuthCard title={t("auth.signInTitle")} footer={<>{t("auth.noAccount")} <TextLink href="/sign-up">{t("auth.signUp")}</TextLink></>}>
        <form onSubmit={submit} className="space-y-5" noValidate>
          {error && <Notice tone="bad">{t(error)}</Notice>}
          <Field label={t("auth.email")}>
            {(a) => <input {...a} type="email" autoComplete="email" required className="k-input" value={email} onChange={(e) => setEmail(e.target.value)} />}
          </Field>
          <Field label={t("auth.password")}>
            {(a) => (
              <input {...a} type="password" autoComplete="current-password" required className="k-input" value={password} onChange={(e) => setPassword(e.target.value)} />
            )}
          </Field>
          <div className="flex items-center justify-between gap-3 pt-1">
            <TextLink href="/forgot-password">{t("auth.forgot")}</TextLink>
            <Button type="submit" loading={busy}>
              {t("auth.signIn")}
            </Button>
          </div>
        </form>
      </AuthCard>
    </Guard>
  );
}
