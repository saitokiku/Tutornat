"use client";

import { useState } from "react";
import { Button, Field } from "@/components/ui";
import { useT } from "@/i18n";
import type { Key } from "@/i18n/en";
import { dataCounts, deleteFamily, downloadFile, exportFamily, exportFileName, reloadHome } from "@/lib/export";
import { read, useStore } from "@/lib/store";
import { PolicyLinks } from "@/app/(legal)/legal";
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
  const [saved, setSaved] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const word = t("trust.data.confirmWord");
  const ready = confirm.trim().toLocaleUpperCase() === word.toLocaleUpperCase();

  const download = () => {
    const now = Date.now();
    const data = exportFamily(read(), accountId, { at: now, note: t("trust.data.exportBody") });
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
        <p className="max-w-prose text-sm text-muted">{t("trust.data.exportBody")}</p>
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
          className="flex flex-wrap items-end gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!ready || busy) return;
            setBusy(true);
            await deleteFamily(accountId);
            reloadHome();
          }}
        >
          <div className="min-w-0 flex-1 basis-56">
            <Field label={t("trust.data.typeToConfirm", { word })}>
              {(a) => <input {...a} className="k-input" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
            </Field>
          </div>
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
