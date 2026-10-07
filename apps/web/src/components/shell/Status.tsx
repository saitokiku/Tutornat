"use client";

// What a family should know about this device at a glance, said plainly: where the work is saved,
// whether we're online, and which tutor is answering. Facts, not alarms; colour only backs the words.
import { useEffect, useRef, useSyncExternalStore } from "react";
import { IconAlert } from "@/components/icons";
import { announce } from "@/components/ui";
import { useT } from "@/i18n";
import { useAiMode } from "@/lib/ai/client";
import { DEMO } from "@/lib/mode";
import { storeHealth } from "@/lib/store";

const subscribe = (fn: () => void) => {
  window.addEventListener("online", fn);
  window.addEventListener("offline", fn);
  return () => {
    window.removeEventListener("online", fn);
    window.removeEventListener("offline", fn);
  };
};

/** navigator.onLine, live. */
export function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

/** Says it once when the connection drops or comes back (mounted by the shell). */
export function useConnectionNews(online: boolean) {
  const t = useT();
  const was = useRef(online);
  useEffect(() => {
    if (was.current === online) return;
    was.current = online;
    announce(t(online ? "shell.online" : "shell.offlineNow"), { assertive: !online });
  }, [online, t]);
}

const DOT = { quiet: "bg-border-strong", good: "bg-good", warn: "bg-warn", bad: "bg-bad" } as const;

function Line({ tone, children }: { tone: keyof typeof DOT; children: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${DOT[tone]}`} />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

/** Two quiet lines: saving/connection, then the tutor. The tutor line holds its height while it's asked for. */
export function StatusLines({ online, className = "" }: { online: boolean; className?: string }) {
  const t = useT();
  const mode = useAiMode();
  const health = storeHealth();
  return (
    <ul aria-label={t("shell.status")} className={`space-y-1 text-xs text-muted ${className}`.trim()}>
      {health === "memory" ? (
        <Line tone="bad">{t("shell.notSaving")}</Line>
      ) : !online ? (
        <Line tone="warn">{t("shell.offline")}</Line>
      ) : (
        DEMO && <Line tone="quiet">{t("demo.saved")}</Line>
      )}
      {mode === null ? (
        <li aria-hidden="true" className="h-[1.5em]" />
      ) : mode === "demo" ? (
        <Line tone="warn">{t("demo.status")}</Line>
      ) : (
        <Line tone="good">{t("settings.aiOn")}</Line>
      )}
    </ul>
  );
}

/** Phones: a small chip in the header while offline. */
export function OfflineChip() {
  const t = useT();
  return (
    <span className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full bg-warn/10 pr-3 pl-2 text-xs font-medium text-ink">
      <IconAlert size={15} className="text-warn" />
      {t("shell.offlineShort")}
    </span>
  );
}
