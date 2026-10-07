"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Avatar } from "@/components/profiles/Avatar";
import { Badge, Button, Notice } from "@/components/ui";
import { gradeLabel, useLocale, useT } from "@/i18n";
import type { Key } from "@/i18n/en";
import {
  accountsOnServer,
  grantConsent,
  loadConsent,
  revokeConsent,
  useServerStatus,
  type ConsentMethodInfo,
  type ConsentOptions,
  type ConsentReceipt,
  type ConsentScope,
} from "@/lib/auth";
import { learnersOf } from "@/lib/profiles";
import { consentAllows, DEV_METHOD, gradeAge, needsConsent, PARENT_METHOD } from "@/lib/server/db/policy";
import { useStore } from "@/lib/store";
import { useReceipts } from "@/lib/sync";
import type { Locale, Profile } from "@/lib/types";

// The grown-up's consent desk: for each child, whether the AI tutor and voice are on, a way to give
// consent, and every receipt (method, time, notice version, scope, who gave it), each revocable.

const when = (at: number, l: Locale) => new Intl.DateTimeFormat(l === "es" ? "es-US" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(at);

function useMethodLabel() {
  const t = useT();
  return (id: string): { label: string; body?: string } =>
    id === DEV_METHOD
      ? { label: t("acct.method.dev"), body: t("acct.method.devBody") }
      : id === PARENT_METHOD
        ? { label: t("acct.method.parent"), body: t("acct.method.parentBody") }
        : { label: t("acct.method.verified") };
}

export function ConsentManager() {
  const t = useT();
  const kids = useStore((s) => learnersOf(s).filter((p) => needsConsent(p.grade)));
  const receipts = useReceipts();
  const status = useServerStatus();
  const [options, setOptions] = useState<ConsentOptions | null | "error">(null);
  const [attempt, setAttempt] = useState(0);
  const server = accountsOnServer();

  useEffect(() => {
    if (!server) return;
    let live = true;
    void loadConsent().then((o) => live && setOptions(o ?? "error"));
    return () => {
      live = false;
    };
  }, [server, attempt]);

  if (!server) return <Notice>{t("acct.consent.localOnly")}</Notice>;
  if (options === null)
    return (
      <p aria-busy="true" className="text-sm text-muted">
        {t("common.loading")}
      </p>
    );
  if (options === "error")
    return (
      <Notice
        tone="bad"
        action={
          <Button variant="secondary" onClick={() => (setOptions(null), setAttempt((n) => n + 1))}>
            {t("acct.consent.retry")}
          </Button>
        }
      >
        {t("acct.err.offline")}
      </Notice>
    );

  const production = status?.production ?? true;
  const verified = options.methods.some((m) => m.verified && m.forUnder13);
  return (
    <div className="space-y-6">
      {production && !verified && <Notice tone="warn">{t("acct.consent.noVerified")}</Notice>}
      {kids.length === 0 ? (
        <p className="text-sm text-muted">{t("acct.consent.noChildren")}</p>
      ) : (
        <ul className="space-y-4">
          {kids.map((k) => (
            <ConsentRow key={k.id} learner={k} receipts={receipts.filter((r) => r.profileId === k.id)} methods={options.methods} production={production} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ConsentRow({ learner, receipts, methods, production }: { learner: Profile; receipts: ConsentReceipt[]; methods: ConsentMethodInfo[]; production: boolean }) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const on = (scope: ConsentScope) => consentAllows({ grade: learner.grade, receipts, scope, production });
  const titleId = useId();
  const newestFirst = [...receipts].sort((a, b) => b.grantedAt - a.grantedAt);
  return (
    <li aria-labelledby={titleId} className="rounded-lg border border-border bg-panel p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar profile={learner} size="sm" />
        <h2 id={titleId} className="font-brand text-t3 font-semibold text-ink">
          {learner.nickname}
        </h2>
        <span className="text-xs text-muted">{gradeLabel(locale, learner.grade)}</span>
      </div>
      <dl className="mt-4 grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
        {(["ai", "voice"] as const).map((s) => (
          <div key={s} className="contents">
            <dt className="text-muted">{t(s === "ai" ? "acct.consent.ai" : "acct.consent.voice")}</dt>
            <dd className="flex items-center gap-2 font-medium text-ink">
              <span aria-hidden="true" className={`size-2 rounded-full ${on(s) ? "bg-good" : "bg-border"}`} />
              {t(on(s) ? "acct.consent.on" : "acct.consent.off")}
            </dd>
          </div>
        ))}
      </dl>
      {saved && !open && (
        <div className="mt-4">
          <Notice tone="good">{t("acct.consent.saved")}</Notice>
        </div>
      )}
      <div className="mt-5">
        {open ? (
          <ConsentForm learner={learner} methods={methods} onCancel={() => setOpen(false)} onDone={() => (setOpen(false), setSaved(true))} />
        ) : (
          <Button variant="secondary" onClick={() => (setOpen(true), setSaved(false))}>
            {t("acct.consent.give", { name: learner.nickname })}
          </Button>
        )}
      </div>
      {newestFirst.length > 0 && (
        <section className="mt-6 border-t border-border pt-5">
          <h3 className="text-sm font-semibold text-ink">{t("acct.consent.receipts")}</h3>
          <ul className="mt-3 space-y-3">
            {newestFirst.map((r) => (
              <Receipt key={r.id} receipt={r} name={learner.nickname} />
            ))}
          </ul>
        </section>
      )}
    </li>
  );
}

export function ConsentForm({ learner, methods, onDone, onCancel }: { learner: Profile; methods: ConsentMethodInfo[]; onDone: () => void; onCancel: () => void }) {
  const t = useT();
  const methodLabel = useMethodLabel();
  const id = useId();
  const age = gradeAge(learner.grade);
  const [under13, setUnder13] = useState(age !== "adult");
  const [scope, setScope] = useState<ConsentScope[]>(["ai", "voice"]);
  const [picked, setPicked] = useState<string | null>(null);
  const [read, setRead] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  const [busy, setBusy] = useState(false);
  const usable = methods.filter((m) => !under13 || m.forUnder13);
  const method = usable.some((m) => m.id === picked) ? picked : (usable[0]?.id ?? null);
  const ready = scope.length > 0 && method && read;
  const toggle = (s: ConsentScope) => setScope((list) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || !method) return;
    setBusy(true);
    const r = await grantConsent({ profileId: learner.id, scope, method, under13 });
    setBusy(false);
    if (r.ok) onDone();
    else setError(r.error);
  }

  const option = "flex min-h-11 cursor-pointer items-start gap-3 rounded-sm px-1 py-1.5 text-sm text-ink";
  return (
    <form onSubmit={submit} className="space-y-5 rounded-md border border-border bg-panel2 p-4 sm:p-5" noValidate>
      {error && <Notice tone="bad">{t(error)}</Notice>}
      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-ink">{t("acct.consent.scope")}</legend>
        {(["ai", "voice"] as const).map((s) => (
          <label key={s} className={option}>
            <input type="checkbox" checked={scope.includes(s)} onChange={() => toggle(s)} className="mt-0.5 size-5 shrink-0 accent-ink" />
            <span>{t(s === "ai" ? "acct.consent.ai" : "acct.consent.voice")}</span>
          </label>
        ))}
      </fieldset>
      {age === "ask" && (
        <fieldset>
          <legend className="mb-1 text-sm font-semibold text-ink">{t("acct.consent.age", { name: learner.nickname })}</legend>
          {[true, false].map((u) => (
            <label key={String(u)} className={option}>
              <input type="radio" name={`${id}-age`} checked={under13 === u} onChange={() => setUnder13(u)} className="mt-0.5 size-5 shrink-0 accent-ink" />
              <span>{t(u ? "acct.consent.under13" : "acct.consent.over13")}</span>
            </label>
          ))}
        </fieldset>
      )}
      {usable.length === 0 ? (
        <Notice tone="warn">{t("acct.consent.noMethod", { name: learner.nickname })}</Notice>
      ) : (
        <fieldset>
          <legend className="mb-1 text-sm font-semibold text-ink">{t("acct.consent.method")}</legend>
          {usable.map((m) => {
            const { label, body } = methodLabel(m.id);
            return (
              <label key={m.id} className={option}>
                <input type="radio" name={`${id}-method`} checked={method === m.id} onChange={() => setPicked(m.id)} className="mt-0.5 size-5 shrink-0 accent-ink" />
                <span>
                  <span className="block font-medium">{label}</span>
                  {body && <span className="block text-xs text-muted">{body}</span>}
                </span>
              </label>
            );
          })}
        </fieldset>
      )}
      <div className="space-y-1">
        <Link href="/privacy" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink underline decoration-border underline-offset-4 hover:decoration-accent">
          {t("acct.privacyLink")}
        </Link>
        <label className={option}>
          <input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-ink" />
          <span>{t("acct.consent.read")}</span>
        </label>
      </div>
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" loading={busy} disabled={!ready}>
          {t("acct.consent.submit")}
        </Button>
      </div>
    </form>
  );
}

function Receipt({ receipt: r, name }: { receipt: ConsentReceipt; name: string }) {
  const t = useT();
  const locale = useLocale();
  const methodLabel = useMethodLabel();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const scope = r.scope.map((s) => t(s === "ai" ? "acct.consent.ai" : "acct.consent.voice")).join(", ");
  return (
    <li className="rounded-sm border border-border bg-panel2 p-4 text-sm">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-opmono text-xs text-ink">{t("acct.consent.receipt", { id: r.id.slice(0, 8) })}</span>
        <Badge tone={r.verified ? "good" : "warn"}>{t(r.verified ? "acct.consent.verifiedBadge" : "acct.consent.notVerified")}</Badge>
        {r.revokedAt && <Badge>{t("acct.consent.revokedBadge")}</Badge>}
      </p>
      {/* A long email must wrap rather than push a phone's page sideways. */}
      <dl className="mt-3 grid min-w-0 gap-x-4 gap-y-1 [overflow-wrap:anywhere] sm:grid-cols-[auto_minmax(0,1fr)]">
        <dt className="text-muted">{t("acct.consent.covers")}</dt>
        <dd className="text-ink">{scope}</dd>
        <dt className="text-muted">{t("acct.consent.method")}</dt>
        <dd className="text-ink">{methodLabel(r.method).label}</dd>
        <dt className="text-muted">{t("acct.consent.givenLabel")}</dt>
        <dd className="text-ink">{t("acct.consent.given", { when: when(r.grantedAt, locale), email: r.grantedBy })}</dd>
        <dt className="text-muted">{t("acct.consent.noticeLabel")}</dt>
        <dd className="font-opmono text-xs text-ink">{r.noticeVersion}</dd>
        {r.revokedAt && (
          <>
            <dt className="text-muted">{t("acct.consent.revokedLabel")}</dt>
            <dd className="text-ink">{when(r.revokedAt, locale)}</dd>
          </>
        )}
      </dl>
      {!r.revokedAt && (
        <div className="mt-3">
          {confirm ? (
            <div className="space-y-3 rounded-sm border border-bad/30 bg-panel p-3">
              <p className="text-ink">{t("acct.consent.revokeConfirm", { name })}</p>
              {failed && <p className="text-xs font-medium text-bad">{t("acct.err.offline")}</p>}
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => setConfirm(false)}>
                  {t("common.cancel")}
                </Button>
                <button
                  type="button"
                  autoFocus
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const ok = await revokeConsent(r.id);
                    setBusy(false);
                    setFailed(!ok);
                    if (ok) setConfirm(false);
                  }}
                  className="k-btn bg-bad text-paper hover:bg-bad/90"
                >
                  {t("acct.consent.revokeYes")}
                </button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setConfirm(true)}>
              {t("acct.consent.revoke")}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
