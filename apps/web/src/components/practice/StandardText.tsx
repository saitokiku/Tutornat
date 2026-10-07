"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui";
import { useT } from "@/i18n";
import type { Standard } from "@/knowledge";
import { know } from "@/lib/knowledge";
import type { Locale } from "@/lib/types";

// The standard behind a skill, in its own words: tap the code and the Common Core text is fetched
// through /api/know (cached a day there; nothing about the learner is sent). Science codes (NGSS) are
// shown as codes only, because the knowledge layer has no source for their wording.

/** Codes the Common Core lookup can resolve: K–8 math and ELA, and high-school math (A-REI.B.3). */
export const isCommonCore = (code: string) => /^([K1-8]\.[A-Z]|[A-Z]{1,2}\.[K1-9]\.|[A-Z]-[A-Z]+\.)/.test(code);

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
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (found.has(code)) return;
    let live = true;
    know.standard(code).then((s) => {
      if (!live) return;
      if (s) {
        found.set(code, s);
        setStandard(s);
      } else setFailed(true);
    });
    return () => {
      live = false;
    };
  }, [code, attempt]);

  return (
    <div id={id} role="region" aria-label={t("pr.std.region", { code })} aria-busy={!standard && !failed} className="basis-full rounded-md border border-border bg-panel2 px-4 py-3">
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
      ) : failed ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm text-ink">{t("pr.std.failed")}</p>
          <Button
            variant="secondary"
            onClick={() => {
              setFailed(false);
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
