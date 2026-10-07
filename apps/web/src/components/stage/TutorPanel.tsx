"use client";

import { KaizenMark } from "@/components/brand";
import { IconArrowRight } from "@/components/icons";
import { useT } from "@/i18n";

/** The tutor's seat on the stage. Honest about being disconnected until the AI tutor is wired in. */
export function TutorPanel() {
  const t = useT();
  return (
    <aside aria-labelledby="tutor-title" className="flex h-full flex-col rounded-lg border border-border bg-panel">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <KaizenMark size={24} />
        <h2 id="tutor-title" className="font-brand text-t3 font-semibold text-ink">
          {t("tutor.title")}
        </h2>
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-warn" />
          {t("demo.badge")}
        </span>
      </div>
      <div className="flex-1 space-y-2 px-4 py-4">
        <p className="text-sm font-medium text-ink">{t("tutor.notConnected")}</p>
        <p className="text-sm text-muted">{t("tutor.notConnectedBody")}</p>
      </div>
      <form className="flex items-end gap-2 border-t border-border p-3" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="tutor-input" className="sr-only">
          {t("tutor.placeholder")}
        </label>
        <textarea
          id="tutor-input"
          rows={2}
          disabled
          aria-describedby="tutor-title"
          placeholder={t("tutor.placeholder")}
          className="min-h-11 flex-1 resize-none rounded-sm border border-border bg-panel2 px-3 py-2 text-sm text-muted placeholder:text-muted/70"
        />
        <button type="submit" disabled aria-label={t("tutor.send")} className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-paper opacity-30">
          <IconArrowRight size={18} />
        </button>
      </form>
    </aside>
  );
}
