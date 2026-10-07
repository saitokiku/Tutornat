"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SyncStatus } from "@/components/auth/SyncStatus";
import { KaizenLogo } from "@/components/brand";
import { IconFamily, IconLogout, IconPen, IconPlus, IconTrash } from "@/components/icons";
import { useTitle } from "@/components/LangSync";
import { Avatar } from "@/components/profiles/Avatar";
import { GoalsPicker } from "@/components/profiles/GoalsPicker";
import { LearnerForm } from "@/components/profiles/LearnerForm";
import { ParentGate } from "@/components/profiles/ParentGate";
import { Button, btn } from "@/components/ui";
import { gradeLabel, useLocale, useT } from "@/i18n";
import { signOut, useSyncState } from "@/lib/auth";
import { goalsOf } from "@/lib/family";
import { createLearner, learnersOf, removeLearner, selectLearner, updateLearner } from "@/lib/profiles";
import { needsConsent } from "@/lib/server/db/policy";
import { read, useStore } from "@/lib/store";

export default function ProfilesPage() {
  const t = useT();
  useTitle(t("profiles.title"));
  const locale = useLocale();
  const router = useRouter();
  const learners = useStore(learnersOf);
  const [mode, setMode] = useState<"pick" | "manage">("pick");
  const [form, setForm] = useState<"add" | string | null>(null); // "add" or a learner id being edited
  const [confirm, setConfirm] = useState<string | null>(null);
  const unlocked = useStore((s) => Boolean(s.session.unlocked));
  const goals = useStore(goalsOf);
  // Signed in to an account on a server (null in the browser-only version).
  const server = useSyncState() !== null;
  // Parent-only actions wait behind the grown-up gate when a child was the last one using the app.
  const [gate, setGate] = useState<"parent" | "manage" | "add" | null>(null);
  // Forms and manage mode are grown-up only; a kept-alive page must not reopen them for a child.
  const showForm = unlocked ? (form ?? (learners.length === 0 ? "add" : null)) : null;
  const managing = unlocked && mode === "manage";
  const editing = learners.find((l) => l.id === showForm);
  const pendingGate = gate ?? (learners.length === 0 && !unlocked ? "add" : null);

  // The picker belongs to the family, not to whoever used the app last.
  useEffect(() => {
    if (read().session.profileId) selectLearner(null);
  }, []);

  const open = (id: string | "parent") => {
    setForm(null);
    setMode("pick");
    setGate(null);
    setConfirm(null);
    selectLearner(id);
    router.push(id === "parent" ? "/family" : "/home");
  };
  const act = (action: "parent" | "manage" | "add") => {
    setGate(null);
    if (action === "parent") open("parent");
    if (action === "manage") setMode(mode === "pick" ? "manage" : "pick");
    if (action === "add") setForm("add");
  };
  const guarded = (action: "parent" | "manage" | "add") => (unlocked ? act(action) : (setGate(action), setForm(null)));

  return (
    <div className="min-h-dvh bg-paper">
      <header className="mx-auto flex max-w-wide items-center justify-between px-5 py-5 sm:px-8">
        <KaizenLogo size={32} href="/" />
        <Button variant="ghost" size="sm" onClick={signOut}>
          <IconLogout size={16} /> {t("nav.signOut")}
        </Button>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-20 pt-6 sm:px-8 sm:pt-12">
        <h1 className="text-center font-brand text-t1 font-semibold text-ink sm:text-d3">{t("profiles.title")}</h1>
        <SyncStatus className="mt-2 justify-center" />
        {learners.length === 0 && <p className="mt-3 text-center text-sm text-muted">{t("profiles.empty")}</p>}
        {unlocked && goals === undefined && learners.length > 0 && (
          <div className="mt-8">
            <GoalsPicker />
          </div>
        )}

        {learners.length > 0 && (
          <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {learners.map((p) => (
              <li key={p.id} className="relative">
                <Tile onClick={() => !managing && open(p.id)} disabled={managing} label={p.nickname} sub={gradeLabel(locale, p.grade)}>
                  <Avatar profile={p} />
                </Tile>
                {managing && (
                  <div className="absolute inset-x-3 bottom-3 flex justify-center gap-2">
                    {confirm === p.id ? (
                      <div className="w-full rounded-sm border border-bad/30 bg-panel p-2 text-center shadow-soft">
                        <p className="text-xs text-ink">{t(server ? "acct.profiles.removeConfirm" : "profiles.removeConfirm", { name: p.nickname })}</p>
                        <div className="mt-2 flex justify-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>
                            {t("common.cancel")}
                          </Button>
                          <button type="button" autoFocus onClick={() => (removeLearner(p.id), setConfirm(null))} className="k-btn min-h-9 bg-bad px-3.5 text-xs text-paper hover:bg-bad/90">
                            {t("common.confirmDelete")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => setForm(p.id)} aria-label={t("profiles.edit", { name: p.nickname })}>
                          <IconPen size={14} />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setConfirm(p.id)} aria-label={t("profiles.remove", { name: p.nickname })}>
                          <IconTrash size={14} />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
            {!managing && (
              <li>
                <Tile onClick={() => guarded("parent")} label={t("profiles.parent")} sub={t("profiles.parentHint")}>
                  <span className="grid size-16 place-items-center rounded-full border border-border bg-panel2 text-ink sm:size-20">
                    <IconFamily size={30} />
                  </span>
                </Tile>
              </li>
            )}
            <li>
              <Tile onClick={() => guarded("add")} label={t("profiles.add")} dashed>
                <span className="grid size-16 place-items-center rounded-full border border-dashed border-border text-muted sm:size-20">
                  <IconPlus size={28} />
                </span>
              </Tile>
            </li>
          </ul>
        )}

        {learners.length > 0 && (
          <div className="mt-6 text-center">
            <Button variant="ghost" size="sm" onClick={() => (managing ? (setMode("pick"), setForm(null)) : guarded("manage"), setConfirm(null))}>
              {managing ? t("profiles.doneManaging") : t("profiles.manage")}
            </Button>
          </div>
        )}

        {unlocked && !managing && !showForm && server && learners.some((l) => needsConsent(l.grade)) && (
          // Parent-first: the AI tutor and voice stay off for children until a grown-up consents.
          <section aria-labelledby="consent-card" className="mx-auto mt-10 flex max-w-xl flex-wrap items-center gap-4 rounded-lg border border-border bg-panel p-5 shadow-soft">
            <div className="min-w-0 flex-1 basis-60">
              <h2 id="consent-card" className="font-brand text-t3 font-semibold text-ink">
                {t("acct.consent.title")}
              </h2>
              <p className="mt-1 text-sm text-muted">{t("acct.consent.cardBody")}</p>
            </div>
            <Link href="/consent" className={btn("secondary")}>
              {t("acct.consent.review")}
            </Link>
          </section>
        )}

        {pendingGate && (
          <div className="mt-10">
            <ParentGate onPass={() => act(pendingGate)} onCancel={() => setGate(null)} />
          </div>
        )}

        {showForm && !pendingGate && (
          <section className="mx-auto mt-10 max-w-md rounded-lg border border-border bg-panel p-6 shadow-soft animate-fade-up">
            <h2 className="mb-5 font-brand text-t2 font-semibold text-ink">{editing ? t("profiles.edit", { name: editing.nickname }) : t("profiles.add")}</h2>
            <LearnerForm
              key={showForm}
              initial={editing && { nickname: editing.nickname, grade: editing.grade, locale: editing.locale }}
              submitLabel={editing ? t("profiles.saveChanges") : t("profiles.create")}
              onCancel={learners.length ? () => setForm(null) : undefined}
              onSubmit={(v) => {
                const r = editing ? updateLearner(editing.id, v) : createLearner(v);
                if (typeof r === "string") return t(r);
                setForm(null);
                return null;
              }}
            />
          </section>
        )}
      </main>
    </div>
  );
}

function Tile({
  children,
  label,
  sub,
  onClick,
  disabled,
  dashed,
}: {
  children: React.ReactNode;
  label: string;
  sub?: string;
  onClick: () => void;
  disabled?: boolean;
  dashed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={disabled || undefined}
      className={`flex h-full min-h-44 w-full flex-col items-center justify-center gap-3 rounded-lg border px-3 py-6 text-center transition-[border-color,box-shadow,transform] duration-150 ${
        dashed ? "border-dashed border-border hover:border-ink/30" : "border-border bg-panel shadow-soft hover:-translate-y-0.5 hover:shadow-lift"
      } ${disabled ? "pointer-events-none pb-16" : ""}`}
    >
      {children}
      <span>
        <span className="block font-brand text-t3 font-semibold text-ink">{label}</span>
        {sub && <span className="mt-0.5 block text-xs text-muted">{sub}</span>}
      </span>
    </button>
  );
}
