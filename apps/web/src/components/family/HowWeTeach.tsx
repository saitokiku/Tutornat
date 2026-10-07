"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { IconCheck } from "@/components/icons";
import { Button, btn } from "@/components/ui";
import { useT } from "@/i18n";
import { REPRESENTATIONS, type Fact } from "@/learning/profile";
import { useAiMode } from "@/lib/ai/client";
import { setTeaching, teachingOf, TEACHING_NOTE_MAX } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { Profile, TeachingPrefs } from "@/lib/types";
import { useSay } from "./say";

/**
 * "How we teach {name}": the teaching profile with the evidence behind each fact. A grown-up can set
 * the pictures that help and hint-or-example first, leave a note for the tutor, and clear their edits.
 */
export function HowWeTeach({ child, now }: { child: Profile; now: number }) {
  const t = useT();
  const ai = useAiMode();
  const profile = useStore((s) => teachingOf(s, child, now));
  const prefs = child.teaching ?? {};
  const edit = (patch: Partial<TeachingPrefs>) => setTeaching(child.id, { ...prefs, ...patch });
  const id = `teach-${child.id}`;
  return (
    <section aria-labelledby={id} className="space-y-4">
      <div>
        <h2 id={id} tabIndex={-1} className="font-brand text-t2 font-semibold text-ink outline-none">
          {t("lm.how.title", { name: child.nickname })}
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted">{t("lm.how.body", { name: child.nickname })}</p>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border bg-panel">
        <FactRow label={t("lm.fact.rung")} fact={profile.hintRung} show={(v) => t(`lm.rungValue.${v}`)} />
        <FactRow label={t("lm.fact.lead")} fact={profile.leadWith} show={(v) => t(`lm.leadValue.${v}`)}>
          <Choice
            label={t("lm.fact.lead")}
            value={prefs.leadWith}
            options={(["hint", "example"] as const).map((v) => ({ value: v, label: t(`lm.leadValue.${v}`) }))}
            onChange={(leadWith) => edit({ leadWith })}
          />
        </FactRow>
        <FactRow label={t("lm.fact.repr")} fact={profile.representation} show={(v) => t(`lm.repr.${v}`)}>
          <Choice
            label={t("lm.fact.repr")}
            value={prefs.representation}
            options={REPRESENTATIONS.map((v) => ({ value: v, label: t(`lm.repr.${v}`) }))}
            onChange={(representation) => edit({ representation })}
            hint={t("lm.how.reprHint")}
          />
        </FactRow>
        <FactRow label={t("lm.fact.pace")} fact={profile.pace} show={(v) => t(`lm.pace.${v}`)} />
        <FactRow label={t("lm.fact.sessions")} fact={profile.sessions} show={(v) => t(`lm.sessions.${v}`)} />
        <FactRow label={t("lm.fact.why")} fact={profile.misconceptions} show={(v) => t("lm.why.value", { n: v.length })} />
        <FactRow label={t("lm.fact.time")} fact={profile.timeOfDay} show={(v) => t(`lm.time.${v}`)} />
        <FactRow label={t("lm.fact.day")} fact={profile.weekday} show={(v) => t(`lm.day.${v as 0 | 1 | 2 | 3 | 4 | 5 | 6}`)} />
        <FactRow label={t("lm.fact.lang")} fact={profile.language} show={(v) => t(`lang.${v.locale}`)} />
        <NoteRow child={child} saved={prefs.note ?? ""} onSave={(note) => edit({ note })} />
      </ul>
      {ai && <p className="text-xs text-muted">{ai === "demo" ? t("lm.how.demo") : t("lm.how.ai")}</p>}
      {child.teaching && (
        <ClearEdits
          onClear={() => {
            setTeaching(child.id, {});
            requestAnimationFrame(() => document.getElementById(id)?.focus());
          }}
        />
      )}
    </section>
  );
}

function FactRow<V>({ label, fact, show, children }: { label: string; fact: Fact<V>; show: (v: V) => string; children?: ReactNode }) {
  const t = useT();
  const say = useSay();
  const value = fact.value !== null ? show(fact.value) : fact.enough ? t("lm.how.even") : t("lm.how.notYet");
  return (
    <li className="space-y-1.5 px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h3 className="text-sm font-semibold text-ink">{label}</h3>
        <p className={`text-sm first-letter:uppercase ${fact.value !== null ? "text-ink" : "text-muted"}`}>{value}</p>
        {fact.source === "grown-up" && <p className="text-xs font-semibold text-accent">{t("lm.how.set")}</p>}
        {fact.source === "settings" && <p className="text-xs text-muted">{t("lm.how.settings")}</p>}
      </div>
      <p className="max-w-prose text-xs text-muted">{fact.says.map(say).join(" ")}</p>
      {fact.source === "grown-up" && (
        <p className="text-xs text-muted">{fact.derived != null ? t("lm.how.derived", { what: show(fact.derived) }) : t("lm.how.derivedNone")}</p>
      )}
      {children}
    </li>
  );
}

/** One choice among a few, or "follow the record". Native radios: arrow keys move, tap or Space picks. */
function Choice<T extends string>({ label, value, options, onChange, hint }: { label: string; value: T | undefined; options: { value: T; label: string }[]; onChange: (v: T | undefined) => void; hint?: string }) {
  const t = useT();
  const name = useId();
  const all: { value: T | undefined; label: string }[] = [{ value: undefined, label: t("lm.how.fromRecord") }, ...options];
  return (
    <fieldset className="pt-1">
      <legend className="sr-only">{label}</legend>
      <p aria-hidden="true" className="mb-1.5 text-xs font-medium text-muted">
        {t("lm.how.yourChoice")}
      </p>
      <div className="flex flex-wrap gap-2">
        {all.map((o) => {
          const on = value === o.value;
          return (
            <label key={o.value ?? ""} className="block">
              <input type="radio" name={name} value={o.value ?? ""} checked={on} onChange={() => onChange(o.value)} className="peer sr-only" />
              <span className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-panel px-4 text-sm text-muted hover:border-ink/30 peer-checked:border-ink peer-checked:font-medium peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                {on && <IconCheck size={14} strokeWidth={2.4} />}
                {o.label}
              </span>
            </label>
          );
        })}
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </fieldset>
  );
}

function NoteRow({ child, saved, onSave }: { child: Profile; saved: string; onSave: (note: string) => void }) {
  const t = useT();
  const id = useId();
  const [draft, setDraft] = useState(saved);
  const [done, setDone] = useState(false);
  // The saved note changed: from this Save (keep "Saved"), or from elsewhere, like clearing edits.
  const [synced, setSynced] = useState(saved);
  const [saving, setSaving] = useState(false);
  if (saved !== synced) {
    setSynced(saved);
    setDraft(saved);
    setDone(saving);
    setSaving(false);
  }
  return (
    <li className="space-y-2 px-4 py-3.5 sm:px-5">
      <h3 className="text-sm font-semibold text-ink">
        <label htmlFor={`${id}-note`}>{t("lm.fact.note")}</label>
      </h3>
      <textarea
        id={`${id}-note`}
        rows={3}
        maxLength={TEACHING_NOTE_MAX}
        value={draft}
        onChange={(e) => (setDraft(e.target.value), setDone(false), setSaving(false))}
        placeholder={t("lm.how.notePlaceholder")}
        aria-describedby={`${id}-hint`}
        className="k-input resize-y text-sm"
      />
      <p id={`${id}-hint`} className="text-xs text-muted">
        {t("lm.how.noteHint", { name: child.nickname })}
      </p>
      <div className="flex items-center gap-3">
        {/* Never disabled after saving: a focused button that disables itself drops keyboard focus. */}
        <Button variant="secondary" onClick={() => (setSaving(true), setDone(true), onSave(draft))}>
          {t("common.save")}
        </Button>
        <span role="status" className="text-xs text-good">
          {done ? t("child.saved") : ""}
        </span>
      </div>
    </li>
  );
}

/** Clearing is behind a confirm step. Focus follows: onto the confirm, back to the button on cancel. */
function ClearEdits({ onClear }: { onClear: () => void }) {
  const t = useT();
  const [asking, setAsking] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  if (!asking)
    return (
      <button ref={opener} type="button" className={btn("secondary")} onClick={() => setAsking(true)}>
        {t("lm.how.clear")}
      </button>
    );
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-panel2 px-4 py-3">
      <p className="min-w-0 flex-1 text-sm text-ink">{t("lm.how.clearAsk")}</p>
      <Button variant="ghost" onClick={() => (setAsking(false), requestAnimationFrame(() => opener.current?.focus()))}>
        {t("common.cancel")}
      </Button>
      <Button variant="secondary" autoFocus onClick={onClear}>
        {t("lm.how.clearYes")}
      </Button>
    </div>
  );
}
