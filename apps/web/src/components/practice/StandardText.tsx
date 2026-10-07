"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui";
import { useT } from "@/i18n";
import type { Standard } from "@/knowledge";
import { standardWording } from "@/lib/practice";
import type { Locale } from "@/lib/types";

// The standard behind a skill, in its own words: tap the code and the Common Core text is fetched
// through /api/know (cached a day there; nothing about the learner is sent). Codes the lookup cannot
// resolve are shown as codes only: science (NGSS), whose wording the knowledge layer has no source
// for, and high-school codes (A-REI.B.3, W.9-10.1a), which the lookup does not match yet.

/** Codes the Common Core lookup resolves: K–8 math (4.NF.A.1) and K–8 ELA (RF.K.3a, L.4.2). */
export const isCommonCore = (code: string) => /^([K1-8]\.[A-Z]|[A-Z]{1,2}\.[K1-8]\.)/.test(code);

const found = new Map<string, Standard>();

/** The code as a toggle (or plain text when its wording can't be looked up). */
export function StandardButton({ code, open, onToggle, panelId }: { code: string; open: boolean; onToggle: () => void; panelId: string }) {
  const t = useT();
  if (!isCommonCore(code)) return <span className="font-opmono text-xs text-muted">{code}</span>;
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      onClick={onToggle}
      aria-label={t("pr.std.show", { code })}
      className="inline-flex min-h-11 items-center rounded-full px-2 font-opmono text-xs text-ink underline decoration-border underline-offset-4 hover:decoration-accent"
    >
      {code}
    </button>
  );
}

/** What the standard says, with its source; fetched when first shown. Spans the full row (basis-full). */
export function StandardPanel({ code, locale, id }: { code: string; locale: Locale; id: string }) {
  const t = useT();
  const [standard, setStandard] = useState<Standard | undefined>(() => found.get(code));
  // "failed": the lookup did not load (worth a retry); "missing": the data has no such code.
  const [problem, setProblem] = useState<"failed" | "missing" | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (found.has(code)) return;
    let live = true;
    standardWording(code).then((s) => {
      if (!live) return;
      if (s && s !== "missing") {
        found.set(code, s);
        setStandard(s);
      } else setProblem(s === "missing" ? "missing" : "failed");
    });
    return () => {
      live = false;
    };
  }, [code, attempt]);

  return (
    <div id={id} role="region" aria-label={t("pr.std.region", { code })} aria-busy={!standard && !problem} className="basis-full rounded-md border border-border bg-panel2 px-4 py-3">
      {standard ? (
        <figure>
          <blockquote lang="en" className="text-sm text-ink">
            {standard.text}
          </blockquote>
          <figcaption className="mt-2 text-xs text-muted">
            {t("pr.std.source", { code: standard.code, source: standard.source })}
            {locale === "es" && <span className="block">{t("pr.std.english")}</span>}
          </figcaption>
        </figure>
      ) : problem === "missing" ? (
        <p className="text-sm text-ink">{t("pr.std.missing", { code })}</p>
      ) : problem === "failed" ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm text-ink">{t("pr.std.failed")}</p>
          <Button
            variant="secondary"
            onClick={() => {
              setProblem(null);
              setAttempt((n) => n + 1);
            }}
          >
            {t("common.retry")}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted">{t("pr.std.loading")}</p>
      )}
    </div>
  );
}

/** Button and panel together, for places where the panel can sit right after the code. */
export function StandardCode({ code, locale }: { code: string; locale: Locale }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <>
      <StandardButton code={code} open={open} onToggle={() => setOpen(!open)} panelId={id} />
      {open && <StandardPanel code={code} locale={locale} id={id} />}
    </>
  );
}
