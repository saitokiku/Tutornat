"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { bandOf } from "@/catalogue";
import { IconArrowRight, IconPaperclip, IconX } from "@/components/icons";
import { statusLine } from "@/components/practice/status";
import { Button, Field, Notice, Spinner } from "@/components/ui";
import { useT } from "@/i18n";
import { useAiMode } from "@/lib/ai/client";
import { screen } from "@/lib/ai/safety";
import { blobPersistence, INTAKE_ACCEPT, prepareFile, pruneBlobs, type FileProblem } from "@/lib/blobs";
import { sizeLabel } from "@/lib/files";
import {
  AI_FILE_MAX_BYTES,
  TEXT_MAX,
  builderHref,
  classifyIntake,
  isSchoolKind,
  mergeGuess,
  practiceSearchHref,
  readWithAi,
  redactNames,
  saveSchoolItem,
  type AiRead,
  type IntakeGuess,
  type IntakeKind,
} from "@/lib/intake";
import { aiQuestions, startAiSet, startSet, statusesOf } from "@/lib/practice";
import { addNote, learnersOf } from "@/lib/profiles";
import { classesOf } from "@/lib/school";
import { newId, read, useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { isDay, localDate } from "@/planner/dates";
import { getSkill } from "@/practice/skills";
import { INTAKE_EXAMPLES } from "./examples";
import { KindRow } from "./KindRow";

type Attached = { key: string; blob: Blob; name: string; image: boolean; url?: string };

/**
 * The universal box: homework, a test, practice or something to learn, typed or as a photo/PDF. The
 * guess shows as a choice row before anything is made; the family can change it, then confirms.
 * School work becomes an item on the calendar (and opens its page), practice opens a set, learning
 * opens the course builder.
 */
export function IntakeBox({ learner, initialText = "", variant = "compact" }: { learner: Profile; initialText?: string; variant?: "compact" | "page" }) {
  const t = useT();
  const router = useRouter();
  const id = useId();
  const locale = learner.locale;
  const band = bandOf(learner.grade);
  const [now] = useState(() => Date.now());
  const [today] = useState(() => localDate(now));
  const classes = useStore((s) => classesOf(s, learner.id));
  const statuses = useStore((s) => statusesOf(s, learner.id, now));
  const mode = useAiMode();
  const aiOn = mode !== null && mode !== "demo";

  const form = useRef<HTMLFormElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const dateInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const [text, setText] = useState(initialText.slice(0, TEXT_MAX));
  const [file, setFile] = useState<Attached | null>(null);
  const [fileError, setFileError] = useState<FileProblem | "save" | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [persist, setPersist] = useState<"device" | "memory">("device");
  const [dragging, setDragging] = useState(false);
  const [aiRead, setAiRead] = useState<{ key: string; result: AiRead | null } | null>(null);
  const [inFlight, setInFlight] = useState<string | null>(null);
  // What the family changed by hand; null follows the guess.
  const [picked, setPicked] = useState<IntakeKind | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ title?: boolean; date?: boolean }>({});
  const [need, setNeed] = useState<"practice" | "learn" | null>(null);
  const [safety, setSafety] = useState<string | null>(null);
  const [noted, setNoted] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [questionsFailed, setQuestionsFailed] = useState(false);

  const words = text.trim();
  const fileKey = file ? `file:${file.key}` : null;
  const textKey = `text:${words}`;
  const key = fileKey ?? textKey;
  const aiNow = aiRead?.key === key ? aiRead.result : null;
  const fileTooBig = !!file && file.blob.size > AI_FILE_MAX_BYTES;
  const readingFile = aiOn && !!file && !fileTooBig && aiRead?.key !== fileKey;
  const reading = readingFile || inFlight === textKey;
  const readFailed = aiOn && !!file && aiRead?.key === fileKey && aiRead.result === null;
  const fileOnly = !!file && !words;

  // Files whose school item is gone (deleted elsewhere, a learner removed, the store cleared) leave the device.
  useEffect(() => {
    void pruneBlobs(read().events.flatMap((e) => (e.attachment?.blobId ? [e.attachment.blobId] : [])));
  }, []);

  // The photo or PDF is read as soon as it is added, with what was typed as context (if it passes the safety screen).
  useEffect(() => {
    if (!aiOn || !file || file.blob.size > AI_FILE_MAX_BYTES) return;
    let live = true;
    const names = learnersOf(read()).map((p) => p.nickname);
    const typed = area.current?.value ?? "";
    const context = screen(typed, locale).kind === "ok" ? typed : "";
    readWithAi({ text: context, file: file.blob, today, locale, grade: learner.grade, names }).then((result) => live && setAiRead({ key: `file:${file.key}`, result }));
    return () => {
      live = false;
    };
  }, [aiOn, file, today, locale, learner.grade]);

  // A longer typed request is read once typing pauses. Short ones are left to the rules.
  const readText = aiOn && !file && words.length >= 24 && screen(words, locale).kind === "ok" && aiRead?.key !== textKey;
  useEffect(() => {
    if (!readText) return;
    let live = true;
    const timer = setTimeout(() => {
      setInFlight(textKey);
      const names = learnersOf(read()).map((p) => p.nickname);
      readWithAi({ text: textKey.slice(5), today, locale, grade: learner.grade, names }).then((result) => {
        if (live) setAiRead({ key: textKey, result });
        setInFlight((k) => (k === textKey ? null : k));
      });
    }, 900);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [readText, textKey, today, locale, learner.grade]);

  // A photo's preview address lasts as long as the photo does.
  useEffect(() => {
    const url = file?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  const rules = classifyIntake(text, { today, classes });
  // A photo or PDF with nothing telling it apart is most likely school work.
  const fileBias = !!file && !aiNow && (fileOnly || rules.reason.rule === "default");
  const guess: IntakeGuess = aiNow ? mergeGuess(rules, aiNow, { today, classes }) : fileBias ? { ...rules, kind: "homework" } : rules;
  const kind = picked ?? guess.kind;
  const school = isSchoolKind(kind);
  const titleValue = title ?? guess.title;
  const dateValue = date ?? guess.date ?? "";
  const classValue = classId ?? guess.classId ?? "";
  const ready = words.length >= 3 || !!file;
  const skillId = guess.skillIds.find((x) => getSkill(x));
  const topic = (aiNow?.topic || guess.title || words).trim();
  const goal = words || aiNow?.topic || aiNow?.title || "";

  const resetChoices = () => {
    setPicked(null);
    setTitle(null);
    setDate(null);
    setClassId(null);
    setErrors({});
    setNeed(null);
    setSafety(null);
    setQuestionsFailed(false);
  };

  const changeText = (v: string) => {
    setText(v);
    setSafety(null);
    setNeed(null);
    if (!v.trim() && !file) resetChoices();
  };

  const take = async (f: File | undefined) => {
    if (!f) return;
    setFileError(null);
    setPreparing(true);
    const out = await prepareFile(f);
    setPreparing(false);
    if ("error" in out) return setFileError(out.error);
    const image = out.blob.type.startsWith("image/");
    setFile({ key: newId(), blob: out.blob, name: out.name, image, url: image ? URL.createObjectURL(out.blob) : undefined });
    setPersist(await blobPersistence());
  };

  const removeFile = () => {
    setFile(null);
    setFileError(null);
    if (!words) resetChoices();
  };

  const confirm = async () => {
    if (!ready || busy) return;
    const said = words ? screen(words, locale) : null;
    if (said && said.kind !== "ok") {
      setSafety(said.reply);
      // One note for the grown-ups per thing said, however many times it is sent.
      if (said.kind !== "offLimits" && noted !== words) {
        addNote(learner.id, t(said.kind === "abuse" ? "intake.safetyNoteAbuse" : "intake.safetyNoteCrisis"), "safety");
        setNoted(words);
      }
      return;
    }
    if (school) {
      const bad = { title: !titleValue.trim(), date: !isDay(dateValue) };
      setErrors(bad);
      if (bad.title) return titleInput.current?.focus();
      if (bad.date) return dateInput.current?.focus();
      setBusy(true);
      const made = await saveSchoolItem(learner.id, {
        kind,
        title: titleValue,
        date: dateValue,
        classId: classValue || undefined,
        skillIds: guess.skillIds,
        text: words,
        file: file ? { blob: file.blob, name: file.name } : undefined,
        source: aiNow ? "ai" : "typed",
      });
      if (typeof made !== "string") return router.push(`/calendar/${made.id}`);
      setBusy(false);
      if (made === "err.file") setFileError("save");
      else setErrors({ title: made === "err.title", date: made === "err.date" });
      return;
    }
    if (kind === "practice") {
      if (skillId) {
        const set = startSet(read(), { profile: learner, kind: "pick", skillIds: [skillId], now });
        if (set) return router.push(`/practice/${set}`);
      }
      if (!topic) return setNeed("practice");
      if (!aiOn) return router.push(practiceSearchHref(topic, guess.subject));
      setBusy(true);
      setQuestionsFailed(false);
      // The topic goes to the model without any learner's name in it; the set keeps the words as typed.
      const questions = await aiQuestions(
        redactNames(
          topic,
          learnersOf(read()).map((p) => p.nickname),
        ).text,
        learner.grade,
        locale,
      );
      const set = questions && startAiSet(learner, topic, questions, now);
      if (set) return router.push(`/practice/${set}`);
      setBusy(false);
      return setQuestionsFailed(true);
    }
    if (!goal) return setNeed("learn");
    router.push(builderHref(goal));
  };

  const submit = () => form.current?.requestSubmit();

  const label = !ready
    ? t("intake.go")
    : school
      ? t(`intake.confirm.${kind}`)
      : kind === "practice"
        ? t(skillId ? "intake.confirm.practice" : aiOn ? "intake.confirm.practiceAi" : "intake.confirm.practiceSearch")
        : t("intake.confirm.learn");

  const guessKind = t(`intake.kind.${guess.kind}`);
  const reason = aiNow
    ? t("intake.reason.ai", { kind: guessKind })
    : fileBias
      ? t("intake.reason.file", { kind: guessKind })
      : guess.reason.rule === "default"
        ? t("intake.reason.default", { kind: guessKind })
        : t(guess.reason.rule === "date" ? "intake.reason.date" : "intake.reason.word", { kind: guessKind, cue: guess.reason.cue ?? "" });
  const skillNames = guess.skillIds
    .map((x) => getSkill(x)?.title[locale])
    .filter(Boolean)
    .join(", ");
  const fileNote = !file ? null : !aiOn ? (mode === null ? null : t("intake.photoNeedsAi")) : fileTooBig ? t("intake.fileTooBigForAi") : readFailed ? t("intake.aiReadFailed") : null;

  return (
    <form
      ref={form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void confirm();
      }}
      onDragOver={(e) => {
        if (!Array.from(e.dataTransfer.types).includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => e.currentTarget.contains(e.relatedTarget as Node) || setDragging(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDragging(false);
        void take(e.dataTransfer.files[0]);
      }}
      className={`relative rounded-lg border bg-panel shadow-soft transition-colors has-[textarea:focus]:border-accent has-[textarea:focus]:ring-2 has-[textarea:focus]:ring-accent/15 ${dragging ? "border-accent ring-4 ring-accent/15" : "border-border"}`}
    >
      <div className="px-5 pb-4 pt-5 sm:px-6">
        <label htmlFor={`${id}-text`} className={`block font-brand font-semibold text-ink ${variant === "page" ? "text-t2" : "text-t3"}`}>
          {t("intake.label")}
        </label>
        <p id={`${id}-help`} className="mt-0.5 text-sm text-muted">
          {t("intake.help")}
        </p>
        <textarea
          ref={area}
          id={`${id}-text`}
          value={text}
          maxLength={TEXT_MAX}
          rows={variant === "page" ? 4 : 2}
          aria-describedby={`${id}-help`}
          onChange={(e) => changeText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          onPaste={(e) => {
            const f = Array.from(e.clipboardData.files).find((x) => x.type.startsWith("image/") || x.type === "application/pdf");
            if (!f) return;
            e.preventDefault();
            void take(f);
          }}
          placeholder={t(`intake.placeholder.${band}`)}
          className="mt-3 w-full resize-none bg-transparent text-t3 leading-relaxed text-ink placeholder:text-muted/70 focus:outline-none"
        />
        <ul aria-label={t("intake.examples")} className="mt-1 flex flex-wrap gap-2">
          {INTAKE_EXAMPLES[locale][band].map((ex) => (
            <li key={ex}>
              <button
                type="button"
                lang={locale}
                className="k-chip min-h-11 px-3.5 py-1.5 text-left text-sm"
                onClick={() => {
                  resetChoices();
                  setText(ex);
                  area.current?.focus();
                }}
              >
                {ex}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {file && (
        <div className="mx-5 mb-4 space-y-2 sm:mx-6">
          <div className="flex items-center gap-3 rounded-sm border border-border px-3 py-2 text-sm">
            {file.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- a local object URL; next/image can't optimize it
              <img src={file.url} alt="" className="size-11 shrink-0 rounded-[6px] border border-border object-cover" />
            ) : (
              <span className="w-11 shrink-0 text-center font-opmono text-[11px] font-semibold text-muted">PDF</span>
            )}
            <span className="min-w-0 flex-1 truncate text-ink">{file.name}</span>
            <span className="shrink-0 font-opmono text-xs tabular-nums text-muted">{sizeLabel(file.blob.size)}</span>
            <button
              type="button"
              aria-label={t("intake.remove", { name: file.name })}
              onClick={removeFile}
              className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-panel2 hover:text-ink"
            >
              <IconX size={16} />
            </button>
          </div>
          {persist === "memory" && <p className="text-xs text-muted">{t("intake.fileMemory")}</p>}
        </div>
      )}
      {fileError && (
        <div className="mx-5 mb-4 sm:mx-6">
          <Notice tone="warn">{t(`intake.fileError.${fileError}`)}</Notice>
        </div>
      )}

      {ready && (
        <div className="space-y-4 border-t border-border px-5 py-4 sm:px-6 animate-fade-up">
          <KindRow
            value={kind}
            onChange={(k) => {
              setPicked(k);
              setNeed(null);
              setErrors({});
            }}
            onEnter={submit}
            describedBy={`${id}-reason`}
          />
          <div className="space-y-1">
            {/* Read with the choice row (aria-describedby), not announced on every keystroke. */}
            <p id={`${id}-reason`} className="text-xs text-muted">
              {reason}
            </p>
            {/* Announced: the AI tutor reading, and its guess when it arrives. */}
            <p role="status" className="flex items-center gap-2 text-xs text-muted empty:hidden">
              {reading ? (
                <>
                  <Spinner /> {t("intake.reading")}
                </>
              ) : aiNow ? (
                <span className="sr-only">{reason}</span>
              ) : null}
            </p>
          </div>
          {aiNow && aiNow.notes.length > 0 && (
            <details className="text-xs text-muted">
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-ink">{t("intake.aiGuesses")}</summary>
              <ul className="list-disc space-y-0.5 pl-5">
                {aiNow.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </details>
          )}

          {school && (
            <div className="space-y-3">
              {fileNote && <Notice>{fileNote}</Notice>}
              <div className={`grid gap-3 ${classes.length ? "sm:grid-cols-[1fr_10.5rem_10.5rem]" : "sm:grid-cols-[1fr_11rem]"}`}>
                <Field label={t("intake.name")} error={errors.title ? t("calendar.errTitle") : undefined}>
                  {(a) => (
                    <input
                      {...a}
                      ref={titleInput}
                      className="k-input h-11 py-0 text-sm"
                      maxLength={160}
                      value={titleValue}
                      onChange={(e) => (setTitle(e.target.value), setErrors((x) => ({ ...x, title: false })))}
                      placeholder={t("calendar.whatPlaceholder")}
                    />
                  )}
                </Field>
                <Field label={kind === "homework" || kind === "project" ? t("intake.due") : t("intake.day")} error={errors.date ? t("calendar.errDate") : undefined}>
                  {(a) => (
                    <input
                      {...a}
                      ref={dateInput}
                      type="date"
                      className="k-input h-11 py-0 text-sm"
                      value={dateValue}
                      onChange={(e) => (setDate(e.target.value), setErrors((x) => ({ ...x, date: false })))}
                    />
                  )}
                </Field>
                {classes.length > 0 && (
                  <Field label={t("calendar.class")}>
                    {(a) => (
                      <select {...a} className="k-input h-11 py-0 text-sm" value={classValue} onChange={(e) => setClassId(e.target.value)}>
                        <option value="">{t("calendar.noClass")}</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                )}
              </div>
              <p className="text-xs text-muted">{skillNames ? t("intake.skills", { skills: skillNames }) : t("intake.noSkills")}</p>
            </div>
          )}

          {kind === "practice" && (
            <div className="space-y-2">
              <p className="text-sm text-ink">
                {skillId
                  ? t("intake.practice.skill", { skill: getSkill(skillId)!.title[locale], status: statusLine(statuses[skillId], now, locale) })
                  : topic
                    ? t(aiOn ? "intake.practice.ai" : "intake.practice.search", { topic })
                    : t("intake.practice.needTopic")}
              </p>
              {questionsFailed && (
                <Notice
                  tone="warn"
                  action={
                    <Button size="sm" variant="secondary" onClick={() => router.push(practiceSearchHref(topic, guess.subject))}>
                      {t("intake.practice.searchInstead")}
                    </Button>
                  }
                >
                  {t("intake.practice.aiFailed")}
                </Notice>
              )}
            </div>
          )}
          {kind === "learn" && <p className="text-sm text-ink">{goal ? t("intake.learn.goal", { goal: goal.length > 80 ? `${goal.slice(0, 80)}…` : goal }) : t("intake.learn.needGoal")}</p>}
          {!school && file && !aiNow && <p className="text-xs text-muted">{t("intake.fileUnused")}</p>}
          {need && (
            <p role="alert" className="text-xs font-medium text-bad">
              {t(need === "practice" ? "intake.practice.needTopic" : "intake.learn.needGoal")}
            </p>
          )}
        </div>
      )}

      {safety && (
        <div className="mx-5 mb-4 sm:mx-6">
          <Notice tone="bad">{safety}</Notice>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 sm:px-5">
        <input
          ref={fileInput}
          type="file"
          accept={INTAKE_ACCEPT}
          aria-label={t("intake.attach")}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => (void take(e.target.files?.[0]), (e.target.value = ""))}
        />
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          aria-label={t("intake.camera")}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => (void take(e.target.files?.[0]), (e.target.value = ""))}
        />
        <Button variant="ghost" loading={preparing} onClick={() => fileInput.current?.click()}>
          {!preparing && <IconPaperclip size={16} />} {t("intake.attach")}
        </Button>
        <Button variant="ghost" className="pointer-fine:hidden" onClick={() => cameraInput.current?.click()}>
          <CameraIcon /> {t("intake.camera")}
        </Button>
        <Button type="submit" className="ml-auto" disabled={!ready} loading={busy}>
          {label} <IconArrowRight size={16} />
        </Button>
      </div>

      {dragging && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center rounded-lg bg-panel/85 font-brand text-t3 font-semibold text-accent">
          {t("intake.dropHere")}
        </div>
      )}
    </form>
  );
}

function CameraIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx={12} cy={13} r={3.5} />
    </svg>
  );
}
