"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconTrash } from "@/components/icons";
import { Avatar } from "@/components/profiles/Avatar";
import { Button, Notice, btn } from "@/components/ui";
import { gradeLabel, useLocale, useT } from "@/i18n";
import { dataCounts, deleteLearnerData } from "@/lib/export";
import { learnersOf } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { useCountLabels } from "./DataSection";
import { Counts, Section } from "./parts";

/** Each learner: their page, and deleting them with everything that is theirs (behind a confirm step). */
export function LearnersSection() {
  const t = useT();
  const kids = useStore(learnersOf);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<string | null>(null);
  return (
    <Section id="learners" title={t("settings.learners")}>
      {deleted && <Notice tone="good">{t("trust.learner.deleted", { name: deleted })}</Notice>}
      <ul className="divide-y divide-border rounded-md border border-border bg-panel">
        {kids.map((k) =>
          confirming === k.id ? (
            <ConfirmDelete
              key={k.id}
              learner={k}
              onCancel={() => setConfirming(null)}
              onDelete={() => {
                deleteLearnerData(k.id);
                setConfirming(null);
                setDeleted(k.nickname);
              }}
            />
          ) : (
            <LearnerRow key={k.id} learner={k} onDelete={() => (setConfirming(k.id), setDeleted(null))} />
          ),
        )}
      </ul>
      <Link href="/profiles" className={btn("secondary", "sm", "min-h-11")}>
        {t("settings.manageLearners")}
      </Link>
    </Section>
  );
}

function LearnerRow({ learner, onDelete }: { learner: Profile; onDelete: () => void }) {
  const t = useT();
  const locale = useLocale();
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-sm">
      <Avatar profile={learner} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-ink">{learner.nickname}</span>
        <span className="block text-xs text-muted">
          {gradeLabel(locale, learner.grade)} · {t(`lang.${learner.locale}` as const)}
        </span>
      </span>
      <Link href={`/family/${learner.id}`} className="inline-flex min-h-11 items-center text-xs font-medium text-muted underline underline-offset-4 hover:text-ink">
        {t("settings.learnerSettings")}
      </Link>
      <Button variant="ghost" size="sm" className="min-h-11 hover:text-bad" onClick={onDelete} aria-label={t("trust.learner.deleteLabel", { name: learner.nickname })}>
        <IconTrash size={14} /> {t("trust.learner.delete")}
      </Button>
    </li>
  );
}

function ConfirmDelete({ learner, onCancel, onDelete }: { learner: Profile; onCancel: () => void; onDelete: () => void }) {
  const t = useT();
  const labels = useCountLabels();
  const counts = useStore((s) => dataCounts(s, { profileId: learner.id }));
  const rest = Object.fromEntries(Object.entries(counts).filter(([k]) => k !== "learners"));
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => cancel.current?.focus(), []);
  return (
    <li role="group" aria-labelledby={`del-${learner.id}`} className="space-y-3 bg-bad/5 px-4 py-4">
      <p id={`del-${learner.id}`} className="text-sm font-semibold text-ink">
        {t("trust.learner.confirmTitle", { name: learner.nickname })}
      </p>
      <p className="text-sm text-ink">{t("trust.learner.confirmBody", { name: learner.nickname })}</p>
      <Counts label={t("trust.data.counts")} counts={rest} labels={labels} />
      <div className="flex flex-wrap justify-end gap-2">
        <button ref={cancel} type="button" onClick={onCancel} className="k-btn-ghost">
          {t("common.cancel")}
        </button>
        <button type="button" onClick={onDelete} className="k-btn bg-bad text-paper hover:bg-bad/90">
          {t("trust.learner.confirm", { name: learner.nickname })}
        </button>
      </div>
    </li>
  );
}
