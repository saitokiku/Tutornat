"use client";

import { useState } from "react";
import { useT } from "@/i18n";
import type { Key } from "@/i18n/en";
import { useSyncState } from "@/lib/auth";
import type { SyncState } from "@/lib/sync";

const DOT = { saved: "bg-good", saving: "bg-muted", problem: "bg-warn" } as const;

/** The line to show, and whether it is a problem (offline, refused, storage, error). */
export function syncLine(s: SyncState): { key: Key; vars?: { n: number }; tone: keyof typeof DOT } {
  if (s.storage) return { key: "acct.sync.storage", tone: "problem" };
  if (s.phase === "offline") return s.pending ? { key: "acct.sync.offlineCount", vars: { n: s.pending }, tone: "problem" } : { key: "acct.sync.offline", tone: "problem" };
  if (s.phase === "error") return { key: "acct.sync.error", tone: "problem" };
  if (s.refused) return { key: "acct.sync.refused", vars: { n: s.refused }, tone: "problem" };
  // "Saving" only while there is something to save; a round that only pulls changes nothing here.
  if (s.pending) return { key: "acct.sync.saving", tone: "saving" };
  return { key: "acct.sync.saved", tone: "saved" };
}

/**
 * Whether the family's work is saved to their account, in one quiet line. Renders nothing in the
 * browser-only version (there the store's own "Saved on this device" line applies).
 *
 * The line isn't a live region: it changes with every save. A separate one speaks only when
 * something goes wrong (offline, an error, a refused change, no storage), and once more when all is
 * saved again; the visible line is hidden from screen readers while that region says the same thing.
 */
export function SyncStatus({ className = "" }: { className?: string }) {
  const t = useT();
  const s = useSyncState();
  const [live, setLive] = useState("");
  const [recovering, setRecovering] = useState(false);
  const line = s ? syncLine(s) : null;
  const text = line ? t(line.key, line.vars) : "";
  const saved = t("acct.sync.saved");
  // Adjusting state while rendering: React's pattern for state that follows a change in props.
  let next = "";
  let nextRecovering = recovering;
  if (line?.tone === "problem") [next, nextRecovering] = [text, true];
  else if (recovering) [next, nextRecovering] = text === saved ? [saved, false] : ["", true];
  else if (live === saved && text === saved) next = saved;
  if (next !== live) setLive(next);
  if (nextRecovering !== recovering) setRecovering(nextRecovering);
  if (!s || !line) return null;
  return (
    <>
      <p aria-hidden={live !== "" && live === text ? true : undefined} className={`flex items-center gap-2 text-xs text-muted ${className}`}>
        <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${DOT[line.tone]}`} />
        <span>{text}</span>
      </p>
      <p role="status" className="sr-only">
        {live}
      </p>
    </>
  );
}
