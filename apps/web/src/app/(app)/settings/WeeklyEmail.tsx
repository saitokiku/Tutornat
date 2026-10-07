"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, Field, Notice } from "@/components/ui";
import { useLocale, useT } from "@/i18n";
import {
  askConfirmation,
  codeFrom,
  confirmCodeInUrl,
  confirmWeekly,
  emailMode,
  previewWeekly,
  setWeeklyOn,
  useLastSend,
  useSentFromParentView,
  useWeeklyEmail,
  weeklyOf,
  type AskResult,
  type EmailMode,
} from "@/lib/email/weekly";
import { shortDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Account } from "@/lib/types";
import { Section, Switch } from "./parts";

const ASK_MESSAGE = { rate: "trust.weekly.rate", failed: "trust.weekly.failed", preview: "trust.weekly.notConnected" } as const;

/** Opt-in weekly email: the switch, confirming the address with an emailed code, and a preview of exactly what goes out. */
export function WeeklyEmail({ account }: { account: Account }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  // The emailed link carries its code in the fragment (#weekly=…), which never reaches a server.
  const [linkCode] = useState(confirmCodeInUrl);
  const w = useStore((s) => weeklyOf(s, account.id));
  const [now] = useState(() => Date.now());
  const [origin] = useState(() => window.location.origin);
  const preview = useStore((s) => previewWeekly(s, account.id, now, origin));
  const [mode, setMode] = useState<EmailMode | null>(null);
  const [ask, setAsk] = useState<AskResult | null>(null);
  const [asking, setAsking] = useState(false);
  const [link, setLink] = useState<"ok" | "bad" | null>(null);
  const shellSends = useSentFromParentView();
  const lastSend = useLastSend();

  // Last week's email, if it is due (see lib/email/weekly.ts for why the browser sends it).
  useWeeklyEmail("settings");
  useEffect(() => {
    let live = true;
    emailMode().then((m) => live && setMode(m));
    return () => {
      live = false;
    };
  }, []);

  // The confirmation link from the email lands here: check its code, keep the token, tidy the address bar.
  useEffect(() => {
    if (linkCode === null) return;
    confirmWeekly(linkCode).then((ok) => setLink(ok ? "ok" : "bad"));
    router.replace("/settings#weekly");
  }, [linkCode, router]);

  const request = async () => {
    setAsking(true);
    setAsk(await askConfirmation());
    setAsking(false);
  };
  const toggle = (on: boolean) => {
    setWeeklyOn(on);
    setAsk(null);
    setLink(null);
    if (on && mode === "send" && !w?.confirmed) void request();
  };
  const on = Boolean(w?.on);
  const sentLink = ask === "sent" || (ask === null && Boolean(w?.askedAt));
  const message = mode === "preview" ? t("trust.weekly.notConnected") : ask && ask !== "sent" ? t(ASK_MESSAGE[ask]) : mode === "send" && on && w?.confirmed && lastSend === "failed" ? t("trust.weekly.sendFailed") : "";

  return (
    <Section id="weekly" title={t("trust.weekly.title")}>
      <p className="max-w-prose text-sm text-ink">{t("trust.weekly.body", { email: account.email })}</p>
      {link && <Notice tone={link === "ok" ? "good" : "warn"}>{t(link === "ok" ? "trust.weekly.confirmed" : "trust.weekly.badLink")}</Notice>}
      <Switch on={on} onChange={toggle} label={t("trust.weekly.toggle")} body={t("trust.weekly.toggleBody")} disabled={mode === null} />

      {mode === "send" && on && w?.confirmed && (
        <div className="space-y-3 text-sm">
          <p className="text-ink">{t("trust.weekly.on", { email: account.email })}</p>
          <p className="max-w-prose text-muted">{t(shellSends ? "trust.weekly.how" : "trust.weekly.howSettings")}</p>
          {w.lastSentAt && <p className="text-muted">{t("trust.weekly.lastSent", { date: shortDate(w.lastSentAt, locale) })}</p>}
        </div>
      )}
      {mode === "send" && on && !w?.confirmed && (
        <div className="space-y-4 text-sm">
          <p className="max-w-prose text-ink">{sentLink ? t("trust.weekly.linkSent", { email: account.email }) : t("trust.weekly.confirmNeeded", { email: account.email })}</p>
          {sentLink && <CodeForm onConfirmed={() => setLink("ok")} />}
          <Button variant="secondary" loading={asking} onClick={request}>
            {sentLink ? t("trust.weekly.sendAgain") : t("trust.weekly.sendLink")}
          </Button>
        </div>
      )}
      {/* Only the message is live, so a change doesn't re-read the buttons around it. */}
      <p role="status" className={`max-w-prose text-sm empty:m-0 ${mode === "preview" ? "text-muted" : "text-warn"}`}>
        {message}
      </p>

      <details className="group rounded-md border border-border bg-panel">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 text-sm font-medium text-ink">
          {t("trust.weekly.previewTitle")}
          <span aria-hidden="true" className="ml-auto text-muted transition-transform group-open:rotate-90">
            ›
          </span>
        </summary>
        <div className="space-y-4 border-t border-border px-4 py-4">
          {preview ? (
            <>
              <p className="text-xs text-muted">{t("trust.weekly.previewNote")}</p>
              <p className="text-sm">
                <span className="text-xs font-semibold text-muted">{t("trust.weekly.subject")}: </span>
                <span className="text-ink">{preview.subject}</span>
              </p>
              <div>
                <h3 className="text-xs font-semibold text-muted">{t("trust.weekly.plain")}</h3>
                <pre tabIndex={0} aria-label={t("trust.weekly.plain")} className="k-well mt-1 whitespace-pre-wrap px-4 py-3 font-body text-sm text-ink [overflow-wrap:anywhere]">
                  {preview.text}
                </pre>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-muted">{t("trust.weekly.inbox")}</h3>
                <iframe title={t("trust.weekly.frame")} srcDoc={preview.html} sandbox="" className="mt-1 h-96 w-full rounded-md border border-border bg-paper" />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">{t("trust.weekly.previewEmpty")}</p>
          )}
        </div>
      </details>
    </Section>
  );
}

/** Typing or pasting the code from the confirmation email: works on any device, whatever browser the email app opens. */
function CodeForm({ onConfirmed }: { onConfirmed: () => void }) {
  const t = useT();
  const [code, setCode] = useState("");
  const [bad, setBad] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        if (!codeFrom(code)) {
          setBad(true);
          input.current?.focus();
          return;
        }
        setBusy(true);
        const ok = await confirmWeekly(code);
        setBusy(false);
        if (ok) return onConfirmed();
        setBad(true);
        input.current?.focus();
      }}
    >
      <div className="min-w-0 flex-1 basis-56">
        <Field label={t("trust.weekly.code")} hint={t("trust.weekly.codeHint")} error={bad ? t("trust.weekly.badCode") : undefined}>
          {(a) => (
            <input
              {...a}
              ref={input}
              className="k-input font-opmono"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={300}
              value={code}
              onChange={(e) => (setCode(e.target.value), setBad(false))}
            />
          )}
        </Field>
      </div>
      <Button type="submit" loading={busy}>
        {t("trust.weekly.codeSubmit")}
      </Button>
    </form>
  );
}
