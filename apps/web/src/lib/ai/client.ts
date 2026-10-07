"use client";

import { useEffect, useState } from "react";

// Which tutor this deployment runs, asked once per page load.
export type AiMode = "anthropic" | "gateway" | "demo";

let pending: Promise<AiMode> | null = null;
export function aiStatus(): Promise<AiMode> {
  pending ??= fetch("/api/ai/status")
    .then((r) => (r.ok ? r.json() : { mode: "demo" }))
    .then((j: { mode?: AiMode }) => j.mode ?? "demo")
    .catch(() => "demo" as const);
  return pending;
}

/** null while unknown. */
export function useAiMode(): AiMode | null {
  const [mode, setMode] = useState<AiMode | null>(null);
  useEffect(() => {
    let live = true;
    aiStatus().then((m) => live && setMode(m));
    return () => {
      live = false;
    };
  }, []);
  return mode;
}
