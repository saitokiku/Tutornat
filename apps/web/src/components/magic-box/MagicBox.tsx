"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { bandOf } from "@/catalogue";
import { IconArrowRight, IconChevronDown, IconPaperclip, IconX } from "@/components/icons";
import { Button, Notice } from "@/components/ui";
import { useT } from "@/i18n";
import { createDraft } from "@/lib/courses";
import { ACCEPT, KIND_TAG, addFiles, sizeLabel, type FileError } from "@/lib/files";
import { guessSubject } from "@/lib/generate";
import { DEMO } from "@/lib/mode";
import { SUBJECTS, type CourseLength, type Locale, type Profile, type SourceItem, type Subject } from "@/lib/types";
import { EXAMPLES } from "./examples";

export const GOAL_MAX = 2000;

/**
 * The magic box: one input for "what do you want to learn", plus files. Submitting saves a draft
 * course and opens the outline builder. Same component on Home (compact) and /courses/new (page).
 */
export function MagicBox({ learner, variant = "compact", initialGoal = "" }: { learner: Profile; variant?: "compact" | "page"; initialGoal?: string }) {
  const t = useT();
  const router = useRouter();
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [goal, setGoal] = useState(initialGoal);
  const [files, setFiles] = useState<SourceItem[]>([]);
  const [errors, setErrors] = useState<FileError[]>([]);
  const [dragging, setDragging] = useState(false);
  const [showOptions, setShowOptions] = useState(variant === "page");
  const [length, setLength] = useState<CourseLength>("short");
  const [subject, setSubject] = useState<Subject | null>(null); // null = follow the guess
  const [locale, setLocale] = useState<Locale>(learner.locale);
  const band = bandOf(learner.grade);
  const ready = goal.trim().length >= 3 || files.length > 0;
  const effectiveSubject = subject ?? guessSubject(goal);

  const take = (list: FileList | null) => {
    if (!list?.length) return;
    const r = addFiles(files, Array.from(list, (f) => ({ name: f.name, size: f.size })));
    setFiles(r.files);
    setErrors(r.errors);
  };

  const submit = () => {
    if (!ready) return;
    const draft = createDraft({ goal: goal.trim(), grade: learner.grade, subject: effectiveSubject, length, locale, sources: files }, learner.id);
    router.push(`/courses/new/${draft.id}?fresh=1`);
  };

  return (
    <form
      onSubmit={(e) => (e.preventDefault(), submit())}
      onDragOver={(e) => (e.preventDefault(), setDragging(true))}
      onDragLeave={(e) => e.currentTarget.contains(e.relatedTarget as Node) || setDragging(false)}
      onDrop={(e) => (e.preventDefault(), setDragging(false), take(e.dataTransfer.files))}
      className={`relative rounded-lg border bg-panel shadow-soft transition-colors ${dragging ? "border-accent ring-4 ring-accent/15" : "border-border"}`}
    >
      <div className="px-5 pb-3 pt-5 sm:px-6">
        <label htmlFor={`${id}-goal`} className={`block font-brand font-semibold text-ink ${variant === "page" ? "text-t2" : "text-t3"}`}>
          {t("box.label")}
        </label>
        <textarea
          id={`${id}-goal`}
          value={goal}
          maxLength={GOAL_MAX}
          rows={variant === "page" ? 4 : 2}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={t(`box.placeholder.${band}` as const)}
          aria-describedby={`${id}-count`}
          className="mt-3 w-full resize-none bg-transparent text-t3 leading-relaxed text-ink placeholder:text-muted/70 focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="sr-only">{t("box.examples")}</span>
          {EXAMPLES[learner.locale][band].map((ex) => (
            <button key={ex} type="button" className="k-chip" onClick={() => setGoal(ex)}>
              {ex}
            </button>
          ))}
          <span id={`${id}-count`} className={`ml-auto font-opmono text-xs tabular-nums ${goal.length >= GOAL_MAX ? "text-bad" : "text-muted"} ${goal.length < GOAL_MAX * 0.8 ? "sr-only" : ""}`}>
            {t("box.counter", { n: goal.length, max: GOAL_MAX })}
          </span>
        </div>
      </div>

      {files.length > 0 && (
        <ul className="mx-5 mb-3 divide-y divide-border rounded-sm border border-border sm:mx-6">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-9 shrink-0 font-opmono text-[11px] font-semibold text-muted">{KIND_TAG[f.kind]}</span>
              <span className="min-w-0 flex-1 truncate text-ink">{f.name}</span>
              <span className="shrink-0 font-opmono text-xs tabular-nums text-muted">{sizeLabel(f.size)}</span>
              <button
                type="button"
                aria-label={t("box.remove", { name: f.name })}
                onClick={() => setFiles(files.filter((x) => x.id !== f.id))}
                className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-panel2 hover:text-ink"
              >
                <IconX size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {files.length > 0 && DEMO && <p className="mx-5 mb-3 text-xs text-muted sm:mx-6">{t("box.filesDemo")}</p>}
      {errors.length > 0 && (
        <div className="mx-5 mb-3 sm:mx-6">
          <Notice tone="warn">
            <ul className="space-y-0.5">
              {errors.map((e, i) => (
                <li key={i}>{t(e.key, e.vars)}</li>
              ))}
            </ul>
          </Notice>
        </div>
      )}

      {showOptions && (
        <div className="grid gap-4 border-t border-border px-5 py-4 sm:grid-cols-3 sm:px-6">
          <Segmented
            legend={t("box.length")}
            value={length}
            onChange={setLength}
            options={(["lesson", "short", "full"] as const).map((v) => ({ value: v, label: t(`box.length.${v}` as const) }))}
          />
          <div className="space-y-1.5">
            <label htmlFor={`${id}-subject`} className="block text-xs font-medium text-muted">
              {t("box.subject")}
            </label>
            <select id={`${id}-subject`} className="k-input py-2.5 text-sm" value={effectiveSubject} onChange={(e) => setSubject(e.target.value as Subject)}>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {t(`subject.${s}` as const)}
                </option>
              ))}
            </select>
          </div>
          <Segmented
            legend={t("box.language")}
            value={locale}
            onChange={setLocale}
            options={(["en", "es"] as const).map((v) => ({ value: v, label: t(`lang.${v}` as const) }))}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 sm:px-5">
        <input ref={fileInput} type="file" multiple accept={ACCEPT} className="sr-only" tabIndex={-1} onChange={(e) => (take(e.target.files), (e.target.value = ""))} />
        <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
          <IconPaperclip size={16} /> {t("box.attach")}
        </Button>
        <Button variant="ghost" size="sm" aria-expanded={showOptions} onClick={() => setShowOptions(!showOptions)}>
          {t("box.options")} <IconChevronDown size={14} className={`transition-transform ${showOptions ? "rotate-180" : ""}`} />
        </Button>
        {band !== "k2" && <span className="ml-auto hidden font-opmono text-xs text-muted sm:inline">{t("box.shortcut")}</span>}
        {band === "k2" && <span className="ml-auto" />}
        <Button type="submit" disabled={!ready}>
          {t("box.submit")} <IconArrowRight size={16} />
        </Button>
      </div>

      {dragging && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center rounded-lg bg-panel/85 font-brand text-t3 font-semibold text-accent">
          {t("box.dropHere")}
        </div>
      )}
    </form>
  );
}

function Segmented<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1.5 text-xs font-medium text-muted">{legend}</legend>
      <div className="flex rounded-sm border border-border bg-panel2 p-0.5">
        {options.map((o) => (
          <label key={o.value} className="flex-1">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="peer sr-only" />
            <span className="flex min-h-10 cursor-pointer items-center justify-center rounded-[8px] px-2 text-center text-xs font-medium text-muted peer-checked:bg-panel peer-checked:text-ink peer-checked:shadow-soft peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
