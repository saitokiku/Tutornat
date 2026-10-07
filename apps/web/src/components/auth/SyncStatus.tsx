"use client";

import { useT } from "@/i18n";
import { useSyncState } from "@/lib/auth";

const DOT = { idle: "bg-good", syncing: "bg-muted", offline: "bg-warn", error: "bg-warn" } as const;

/**
 * Whether the family's work is saved to their account, in one quiet line. Renders nothing in the
 * browser-only version (there the store's own "Saved on this device" line applies).
 */
export function SyncStatus({ className = "" }: { className?: string }) {
  const t = useT();
  const s = useSyncState();
  if (!s) return null;
  const text =
    s.phase === "offline"
      ? s.pending
        ? t("acct.sync.offlineCount", { n: s.pending })
        : t("acct.sync.offline")
      : s.phase === "error"
        ? t("acct.sync.error")
        : s.phase === "syncing" || s.pending
          ? t("acct.sync.saving")
          : t("acct.sync.saved");
  const tone = s.phase === "idle" && s.pending ? "syncing" : s.phase;
  return (
    <p role="status" className={`flex items-center gap-2 text-xs text-muted ${className}`}>
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${DOT[tone]}`} />
      <span>{text}</span>
    </p>
  );
}
