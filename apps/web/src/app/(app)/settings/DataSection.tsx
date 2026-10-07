"use client";

import { useRef, useState } from "react";
import { PolicyLinks } from "@/app/(legal)/legal";
import { Button, Field } from "@/components/ui";
import { useT } from "@/i18n";
import type { Key } from "@/i18n/en";
import { signIn } from "@/lib/auth";
import { attachedFiles, dataCounts, deleteFamily, downloadFile, exportFamily, exportFileName, reloadHome } from "@/lib/export";
import { read, useStore } from "@/lib/store";
import { Counts, Section } from "./parts";

export const COUNT_LABELS: Record<keyof ReturnType<typeof dataCounts>, Key> = {
  learners: "trust.data.count.learners",
  courses: "trust.data.count.courses",
  answers: "trust.data.count.answers",
  conversations: "trust.data.count.conversations",
  schoolItems: "trust.data.count.schoolItems",
  notes: "trust.data.count.notes",
  books: "trust.data.count.books",
};

export function useCountLabels() {
  const t = useT();
  return Object.fromEntries(Object.entries(COUNT_LABELS).map(([k, v]) => [k, t(v)]));
}

/** Download everything for this family, or delete it. */
export function DataSection({ accountId }: { accountId: string }) {
  const t = useT();
  const labels = useCountLabels();
  const counts = useStore((s) => dataCounts(s, { accountId }));
  const files = useStore((s) => attachedFiles(s, accountId));
  const email = useStore((s) => s.accounts.find((a) => a.id === accountId)?.email ?? "");
  const [saved, setSaved] = useState("");
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);
  const passwordBox = useRef<HTMLInputElement>(null);
  const word = t("trust.data.confirmWord");
  const ready = confirm.trim().toLocaleUpperCase() === word.toLocaleUpperCase() && password.length > 0;
  const body = [t("trust.data.exportBody"), ...(files ? [t("trust.data.exportNoFiles", { n: files })] : [])].join(" ");

  const download = () => {
    const now = Date.now();
    const data = exportFamily(read(), accountId, { at: now, note: body });
    if (!data) return;
    const name = exportFileName(now);
    downloadFile(name, JSON.stringify(data, null, 2));
    setSaved(name);
  };

  return (
    <Section id="data" title={t("trust.data.title")}>
      <p className="max-w-prose text-sm text-ink">{t("trust.data.where")}</p>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-ink">{t("trust.data.exportTitle")}</h3>
        <p className="max-w-prose text-sm text-muted">{body}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={download}>
            {t("trust.data.export")}
          </Button>
          <span role="status" className="font-opmono text-xs text-good">
            {saved ? t("trust.data.exported", { file: saved }) : ""}
          </span>
        </div>
      </div>

      <div className="space-y-3 rounded-md border border-bad/25 bg-panel p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-ink">{t("trust.data.deleteTitle")}</h3>
        <p className="max-w-prose text-sm text-ink">{t("trust.data.deleteBody")}</p>
        <Counts label={t("trust.data.counts")} counts={counts} labels={labels} />
        <p className="max-w-prose text-xs text-muted">{t("trust.data.deleteLater")}</p>
        <form
          className="max-w-md space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!ready || busy) return;
            setBusy(true);
            // The password again, so nobody else using this device (a teen in a hurry) can erase the family.
            const check = await signIn(email, password);
            if (!check.ok) {
              setBusy(false);
              setWrong(true);
              passwordBox.current?.focus();
              return;
            }
            await deleteFamily(accountId);
            reloadHome();
          }}
        >
          <Field label={t("trust.data.password")} hint={t("trust.data.passwordWhy")} error={wrong ? t("trust.data.badPassword") : undefined}>
            {(a) => (
              <input {...a} ref={passwordBox} type="password" className="k-input" autoComplete="current-password" value={password} onChange={(e) => (setPassword(e.target.value), setWrong(false))} />
            )}
          </Field>
          <Field label={t("trust.data.typeToConfirm", { word })}>
            {(a) => <input {...a} className="k-input" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
          </Field>
          <button type="submit" disabled={!ready || busy} aria-busy={busy || undefined} className="k-btn bg-bad text-paper hover:bg-bad/90">
            {t("trust.data.deleteAll")}
          </button>
        </form>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted">{t("trust.data.policies")}</h3>
        <PolicyLinks className="mt-1" />
      </div>
    </Section>
  );
}
