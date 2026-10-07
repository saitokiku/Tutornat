"use client";

import { useState } from "react";
import { Button, Field } from "@/components/ui";
import { gradeLabel, useLocale, useT } from "@/i18n";
import { useSyncState } from "@/lib/auth";
import { GRADES, type Grade, type Locale } from "@/lib/types";

export type LearnerInput = { nickname: string; grade: Grade; locale: Locale };

export function LearnerForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: LearnerInput;
  submitLabel: string;
  onSubmit: (v: LearnerInput) => string | null; // returns an error message or null
  onCancel?: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [v, setV] = useState<LearnerInput>(initial ?? { nickname: "", grade: "3", locale });
  const [error, setError] = useState<string | null>(null);
  // With an account on a server the nickname is part of the family's record, not just this device's.
  const server = useSyncState() !== null;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setError(onSubmit(v));
      }}
      className="space-y-5"
    >
      <Field label={t("profiles.nickname")} hint={t(server ? "acct.profiles.nicknameHint" : "profiles.nicknameHint")} error={error ?? undefined}>
        {(a) => (
          <input
            {...a}
            autoComplete="off"
            maxLength={40}
            className="k-input"
            value={v.nickname}
            onChange={(e) => (setV({ ...v, nickname: e.target.value }), setError(null))}
          />
        )}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("profiles.grade")}>
          {(a) => (
            <select {...a} className="k-input" value={v.grade} onChange={(e) => setV({ ...v, grade: e.target.value as Grade })}>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {gradeLabel(locale, g)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <fieldset className="space-y-1.5">
          <legend className="mb-1.5 text-sm font-medium text-ink">{t("profiles.language")}</legend>
          <div className="flex gap-2">
            {(["en", "es"] as const).map((l) => (
              <label key={l} className="flex-1">
                <input type="radio" name="locale" value={l} checked={v.locale === l} onChange={() => setV({ ...v, locale: l })} className="peer sr-only" />
                <span className="flex min-h-12 cursor-pointer items-center justify-center rounded-sm border border-border bg-panel text-sm font-medium text-muted peer-checked:border-ink peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                  {t(`lang.${l}`)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="flex flex-wrap justify-end gap-3 pt-1">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        )}
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
