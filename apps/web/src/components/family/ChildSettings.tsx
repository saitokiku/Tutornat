"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui";
import { useT } from "@/i18n";
import { setInterests, settingsOf, setStart, startOf, updateSettings } from "@/lib/practice";
import type { Profile, Subject } from "@/lib/types";
import { skillsFor } from "@/practice/skills";

const MINUTES = [10, 15, 20, 30, 45, 60];
const SUBJECTS: Subject[] = ["math", "english", "science"];

/** What a grown-up decides for one learner: how much a day, which subjects, timer, voice, interests, starting points. */
export function ChildSettings({ child }: { child: Profile }) {
  const t = useT();
  const s = settingsOf(child);
  const [interests, setText] = useState((child.interests ?? []).join(", "));
  const [saved, setSaved] = useState(false);
  return (
    <section aria-labelledby={`settings-${child.id}`} className="space-y-5">
      <h2 id={`settings-${child.id}`} className="font-brand text-t2 font-semibold text-ink">
        {t("child.settings")}
      </h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink">{t("child.minutes")}</span>
          <select className="k-input" value={s.dailyMinutes} onChange={(e) => updateSettings(child.id, { dailyMinutes: Number(e.target.value) })}>
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {t("common.minutes", { n: m })}
              </option>
            ))}
          </select>
          <span className="block text-xs text-muted">{t("child.minutesWhy")}</span>
        </label>
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium text-ink">{t("child.subjects")}</legend>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((x) => {
              const on = s.subjects.includes(x);
              return (
                <button
                  key={x}
                  type="button"
                  aria-pressed={on}
                  onClick={() => updateSettings(child.id, { subjects: on ? s.subjects.filter((y) => y !== x) : [...s.subjects, x] })}
                  className="min-h-10 rounded-full border border-border bg-panel px-4 text-sm text-muted aria-pressed:border-ink aria-pressed:text-ink"
                >
                  {t(`subject.${x}`)}
                </button>
              );
            })}
          </div>
          <span className="block text-xs text-muted">{t("child.subjectsWhy")}</span>
        </fieldset>
      </div>
      <div className="space-y-3">
        <Toggle on={s.timer} onChange={(v) => updateSettings(child.id, { timer: v })} label={t("child.timer")} body={t("child.timerWhy")} />
        <Toggle on={s.voiceInput} onChange={(v) => updateSettings(child.id, { voiceInput: v })} label={t("child.voice", { name: child.nickname })} body={t("child.voiceWhy")} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`interests-${child.id}`} className="text-sm font-medium text-ink">
          {t("child.interests")}
        </label>
        <div className="flex flex-wrap gap-2">
          <input id={`interests-${child.id}`} className="k-input min-w-0 flex-1" value={interests} maxLength={240} onChange={(e) => (setText(e.target.value), setSaved(false))} placeholder={t("child.interestsPlaceholder")} />
          <Button variant="secondary" onClick={() => (setInterests(child.id, interests.split(",")), setSaved(true))}>
            {saved ? t("child.saved") : t("common.save")}
          </Button>
        </div>
        <span className="block text-xs text-muted">{t("child.interestsWhy")}</span>
      </div>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink">{t("child.starts")}</legend>
        <p className="text-xs text-muted">{t("child.startsWhy")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {SUBJECTS.map((x) => {
            const list = skillsFor(x);
            if (!list.length) return null;
            return (
              <label key={x} className="block space-y-1">
                <span className="text-xs font-semibold text-muted">{t(`subject.${x}`)}</span>
                <select className="k-input text-sm" value={startOf(child, x) ?? list[0].id} onChange={(e) => setStart(child.id, x, e.target.value)}>
                  {list.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.grade === "K" ? "K" : k.grade} · {k.title[child.locale]}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
        <p className="text-xs text-muted">
          {t("child.placementHint")}{" "}
          <Link href="/practice" className="underline underline-offset-4 hover:text-ink">
            {t("practice.placementLink")}
          </Link>
        </p>
      </fieldset>
    </section>
  );
}

function Toggle({ on, onChange, label, body }: { on: boolean; onChange: (v: boolean) => void; label: string; body: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-start gap-3 rounded-md border border-border bg-panel px-4 py-3 text-left hover:bg-panel2">
      <span aria-hidden="true" className={`mt-0.5 flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors ${on ? "bg-ink" : "bg-border"}`}>
        <span className={`size-5 rounded-full bg-panel shadow-soft transition-transform ${on ? "translate-x-4" : ""}`} />
      </span>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-xs text-muted">{body}</span>
      </span>
    </button>
  );
}
