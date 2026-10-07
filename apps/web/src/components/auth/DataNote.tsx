"use client";

import { useT } from "@/i18n";
import { useSyncState } from "@/lib/auth";
import { SyncStatus } from "./SyncStatus";

/**
 * Where the family's work is kept, for Settings' "Data on this device". Browser-only it is the same
 * line as before; with an account on the server it says the account keeps everything, so deleting
 * here only takes this device's copy (and signs it out).
 */
export function DataNote() {
  const t = useT();
  const sync = useSyncState();
  if (!sync) return <p className="text-sm text-muted">{t("settings.dataBody")}</p>;
  return (
    <div className="space-y-2">
      <p className="max-w-prose text-sm text-muted">{t("acct.settings.dataServer")}</p>
      <SyncStatus />
    </div>
  );
}
