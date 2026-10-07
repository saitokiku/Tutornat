"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard, TextLink } from "@/components/auth/AuthFrame";
import { Guard } from "@/components/gate";
import { Button, Field } from "@/components/ui";
import { useT } from "@/i18n";
import { signUp, type FieldErrors } from "@/lib/auth";

export default function SignUpPage() {
  const t = useT();
  const router = useRouter();
  const [form, setForm] = useState({ displayName: "", email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await signUp(form);
    setBusy(false);
    if (!r.ok) return setErrors(r.fields ?? {});
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
          <Field label={t("auth.name")} hint={t("auth.nameHint")} error={err("displayName")}>
            {(a) => <input {...a} autoComplete="name" className="k-input" value={form.displayName} onChange={set("displayName")} />}
          </Field>
          <Field label={t("auth.email")} error={err("email")}>
            {(a) => <input {...a} type="email" autoComplete="email" className="k-input" value={form.email} onChange={set("email")} />}
          </Field>
          <Field label={t("auth.password")} hint={t("auth.passwordHint")} error={err("password")}>
            {(a) => <input {...a} type="password" autoComplete="new-password" className="k-input" value={form.password} onChange={set("password")} />}
          </Field>
          <Button type="submit" loading={busy} className="w-full">
            {t("auth.signUp")}
          </Button>
        </form>
      </AuthCard>
    </Guard>
  );
}
