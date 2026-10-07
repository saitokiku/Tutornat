"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { AuthCard, TextLink } from "@/components/auth/AuthFrame";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { Button, Field, Notice } from "@/components/ui";
import { useT } from "@/i18n";
import { signUp, useServerStatus, type FieldErrors, type Result } from "@/lib/auth";

export default function SignUpPage() {
  const t = useT();
  useTitle(t("auth.signUp"));
  const router = useRouter();
  const server = useServerStatus()?.mode === "server";
  const adultId = useId();
  const [form, setForm] = useState({ displayName: "", email: "", password: "" });
  const [adult, setAdult] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<Extract<Result, { ok: false }> | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await signUp({ ...form, adult: server ? adult : undefined });
    setBusy(false);
    if (!r.ok) {
      setErrors(r.fields ?? {});
      setFailure(r.error ? r : null);
      return;
    }
    router.push("/profiles");
  }

  const err = (k: keyof FieldErrors) => (errors[k] ? t(errors[k]!) : undefined);
  return (
    <Guard need="guest">
      <AuthCard
        title={t("auth.signUpTitle")}
        body={t("auth.signUpBody")}
        footer={<>{t("auth.haveAccount")} <TextLink href="/sign-in">{t("auth.signIn")}</TextLink></>}
      >
        <form onSubmit={submit} className="space-y-5" noValidate>
          {failure?.error && failure.error !== "acct.err.adult" && <Notice tone="bad">{t(failure.error, { minutes: failure.retryMinutes ?? 1 })}</Notice>}
          <Field label={t("auth.name")} hint={t("auth.nameHint")} error={err("displayName")}>
            {(a) => <input {...a} autoComplete="name" className="k-input" value={form.displayName} onChange={set("displayName")} />}
          </Field>
          <Field label={t("auth.email")} error={err("email")}>
            {(a) => <input {...a} type="email" autoComplete="email" className="k-input" value={form.email} onChange={set("email")} />}
          </Field>
          <Field label={t("auth.password")} hint={t("auth.passwordHint")} error={err("password")}>
            {(a) => <input {...a} type="password" autoComplete="new-password" className="k-input" value={form.password} onChange={set("password")} />}
          </Field>
          {server && (
            // Parent-first: accounts belong to grown-ups; children are added as learners afterwards.
            <div className="space-y-1.5">
              <label htmlFor={adultId} className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-ink">
                <input
                  id={adultId}
                  type="checkbox"
                  checked={adult}
                  onChange={(e) => (setAdult(e.target.checked), setFailure(null))}
                  aria-describedby={failure?.error === "acct.err.adult" ? `${adultId}-error` : undefined}
                  aria-invalid={failure?.error === "acct.err.adult" || undefined}
                  className="mt-0.5 size-5 shrink-0 accent-ink"
                />
                <span>{t("acct.signup.adult")}</span>
              </label>
              {failure?.error === "acct.err.adult" && (
                <p id={`${adultId}-error`} className="text-xs font-medium text-bad">
                  {t("acct.err.adult")}
                </p>
              )}
            </div>
          )}
          <Button type="submit" loading={busy} className="w-full">
            {t("auth.signUp")}
          </Button>
        </form>
      </AuthCard>
    </Guard>
  );
}
