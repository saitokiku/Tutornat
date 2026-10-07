"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconArrowRight, IconCheck, IconChat, IconLightbulb, IconX } from "@/components/icons";
import { useTitle } from "@/components/LangSync";
import { HearContext, Hear, speakText } from "@/components/stage/hear";
import { VisualView } from "@/components/stage/visuals";
import { Button, SUBJECT_TINT, btn } from "@/components/ui";
import { useT } from "@/i18n";
import type { Key } from "@/i18n/en";
import { levelInSet, placementNext, RULES } from "@/learning/engine";
import type { PracticeSet } from "@/learning/types";
import { answersIn, finishSet, recordAnswer, setStart, settingsOf, statusesOf } from "@/lib/practice";
import { read, update, useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { check, type Verdict } from "@/practice/answer";
import { randomSeed } from "@/practice/rng";
import { getSkill, makeItem } from "@/practice/skills";
import type { Item } from "@/practice/types";
import { AnswerInput } from "./AnswerPad";
import { MathText } from "./MathText";
import { useTutorDock } from "./tutor-dock";

type Feedback = { kind: "right" } | { kind: "notYet"; form?: Verdict["form"] } | null;

const FORM_KEY: Record<NonNullable<Verdict["form"]>, Key> = {
  simplest: "practice.form.simplest",
  factored: "practice.form.factored",
  expanded: "practice.form.expanded",
  remainder: "practice.form.remainder",
};

const KIND_LABEL: Record<PracticeSet["kind"], Key> = {
  daily: "practice.kind.daily",
  pick: "practice.kind.pick",
  review: "practice.kind.review",
  check: "practice.kind.check",
  placement: "practice.kind.placement",
  prep: "practice.kind.prep",
  feedback: "practice.kind.feedback",
};

export const isYoung = (p: Profile) => p.grade === "K" || p.grade === "1" || p.grade === "2";

/** Plays one practice set: problems one at a time, help on request, corrections at the end, an honest finish. */
export function Runner({ set, learner, exitHref }: { set: PracticeSet; learner: Profile; exitHref: string }) {
  const t = useT();
  const young = isYoung(learner);
  const subjectTint = SUBJECT_TINT[set.subject];
  const silent = set.kind === "check" || set.kind === "placement";
  const skill = getSkill(set.skillId);
  useTitle(skill ? `${t(KIND_LABEL[set.kind])} · ${skill.title[learner.locale]}` : t("practice.title"));

  const answers = useStore((s) => answersIn(s, set.id));
  const liveSet = useStore((s) => s.sets.find((x) => x.id === set.id)) ?? set;
  const [startLevel] = useState(() => statusesOf(read(), learner.id, Date.now())[set.skillId]?.level ?? 1);
  const resolvedSeeds = useMemo(() => new Set(answers.map((a) => a.seed)), [answers]);

  const [skipped, setSkipped] = useState<Set<number>>(() => new Set());
  const order = liveSet.slots.map((_, i) => i);
  const unresolved = order.filter((i) => !resolvedSeeds.has(liveSet.slots[i].seed));
  const work = unresolved.filter((i) => !skipped.has(i));
  const fixing = work.length === 0 && unresolved.length > 0;
  // After a right answer the problem stays on screen until Next, even though it is already recorded.
  const [hold, setHold] = useState<number | null>(null);
  const index = hold ?? (fixing ? unresolved[0] : work[0]);
  const done = hold === null && unresolved.length === 0 && !(set.kind === "placement" && !liveSet.finishedAt);

  // Per-problem state, reset whenever the problem changes.
  const [tries, setTries] = useState(0);
  const [hints, setHints] = useState(0);
  const [steps, setSteps] = useState(false);
  const [value, setValue] = useState("");
  const [picked, setPicked] = useState<number | undefined>();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const shownAt = useRef(0);
  const [current, setCurrent] = useState(index);
  if (current !== index) {
    setCurrent(index);
    setTries(0);
    setHints(0);
    setSteps(false);
    setValue("");
    setPicked(undefined);
    setFeedback(null);
  }

  const slot = index !== undefined ? liveSet.slots[index] : undefined;
  const slotSkill = slot ? getSkill(slot.skillId) : undefined;
  const mainAnswers = answers.filter((a) => a.skillId === set.skillId && a.mode !== "review");
  const level = slot ? slot.level ?? levelInSet(startLevel, slotSkill?.levels ?? 1, mainAnswers) : 1;
  const item: Item | undefined = useMemo(
    () => (slot && slotSkill ? makeItem(slot.skillId, level, slot.seed, learner.locale) : undefined),
    [slot, slotSkill, level, learner.locale],
  );

  useEffect(() => {
    shownAt.current = Date.now();
    if (item && young) speakText(item.say, learner.locale);
    requestAnimationFrame(() => document.getElementById("problem")?.focus());
  }, [item, young, learner.locale]);

  // Finishing: mark the set done once every problem has an answer.
  useEffect(() => {
    if (unresolved.length === 0 && set.kind !== "placement") finishSet(set.id);
  }, [unresolved.length, set.id, set.kind]);

  const dock = useTutorDock();
  const helped = hints > 0 || steps || tries > 0 || dock.usedOn === item?.id;

  const resolve = (correct: boolean, assisted: boolean, response: string) => {
    if (index === undefined || !item) return;
    recordAnswer(set.id, { slot: index, level: item.level, correct, assisted, seconds: (Date.now() - shownAt.current) / 1000, response });
  };

  const submit = (response: string | number) => {
    if (!item || feedback?.kind === "right") return;
    const text = typeof response === "number" ? (item.choices?.[response]?.label ?? String(response)) : response;
    if (typeof response === "string" && !response.trim()) return;
    const verdict = check(item.answer, response);
    if (set.kind === "placement") {
      resolve(verdict.correct, false, text);
      const history = [...answers.filter((a) => a.mode === "placement"), { skillId: item.skillId, correct: verdict.correct }];
      const next = placementNext(set.subject, learner.grade, history);
      update((s) => {
        const live = s.sets.find((x) => x.id === set.id);
        if (!live) return;
        if ("done" in next) {
          live.finishedAt = Date.now();
          live.skillId = next.start;
        } else live.slots.push({ skillId: next.skillId, seed: randomSeed(), role: "placement", level: getSkill(next.skillId)!.levels });
      });
      if ("done" in next) setStart(learner.id, set.subject, next.start);
      return;
    }
    if (silent) return resolve(verdict.correct, false, text);
    if (verdict.correct) {
      setHold(index ?? null);
      resolve(true, helped, text);
      setFeedback({ kind: "right" });
      return;
    }
    setTries((n) => n + 1);
    setFeedback({ kind: "notYet", form: verdict.form });
    if (item.input !== "text" && item.input !== "expr") setValue("");
    setPicked(undefined);
  };

  const skip = () => {
    if (index === undefined) return;
    if (fixing) resolve(false, helped, value);
    else setSkipped((s) => new Set(s).add(index));
  };

  const tally = {
    own: answers.filter((a) => a.correct && !a.assisted).length,
    help: answers.filter((a) => a.correct && a.assisted).length,
    missed: answers.filter((a) => !a.correct).length,
  };

  if (done || (set.kind === "placement" && liveSet.finishedAt && hold === null)) return <Finish set={liveSet} learner={learner} tally={tally} answers={answers} exitHref={exitHref} />;
  if (!item || index === undefined) return null;

  const hintText = item.hints.slice(0, hints);
  return (
    <HearContext.Provider value={{ hear: true, young, locale: learner.locale }}>
      <div className="min-h-dvh bg-paper">
        <header className="sticky top-0 z-10 border-b border-border bg-panel/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-2.5 sm:px-6">
            <Link href={exitHref} aria-label={t("practice.exit")} className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-panel2 hover:text-ink">
              <IconX size={20} />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{skill?.title[learner.locale]}</p>
              <p className="text-xs text-muted">{t(KIND_LABEL[set.kind])}{fixing ? ` · ${t("practice.fixThese")}` : ""}</p>
            </div>
            <Progress set={liveSet} answers={answers} index={index} />
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
          {silent && index === 0 && answers.length === 0 && (
            <p className="mb-5 rounded-md border border-border bg-panel2 px-4 py-3 text-sm text-ink">
              {set.kind === "check" ? t("practice.checkIntro", { n: RULES.checkSize }) : t("practice.placementIntro")}
            </p>
          )}
          <section aria-labelledby="problem" className="rounded-lg border border-border bg-panel p-5 shadow-soft sm:p-8">
            {item.visual && (
              <div className="mb-6 flex justify-center">
                <VisualView visual={item.visual} alt={item.alt ?? ""} tint={subjectTint} />
              </div>
            )}
            {item.picture && (
              <div className="mb-4 flex justify-center">
                <span role="img" aria-label={item.alt} className="text-7xl leading-none sm:text-8xl">
                  {item.picture}
                </span>
              </div>
            )}
            <div className="flex items-start justify-center gap-3">
              <h1 id="problem" tabIndex={-1} className={`text-center font-brand font-semibold text-ink outline-none ${young ? "text-t1 sm:text-d3" : "text-t2 sm:text-t1"}`}>
                <span className="sr-only">{t("practice.problemN", { n: index + 1, total: liveSet.slots.length })}. </span>
                <MathText parts={item.prompt} blank={feedback?.kind === "right" ? <span className="font-opmono text-good">{typeof picked === "number" ? item.choices?.[picked]?.label : value}</span> : undefined} />
              </h1>
              <Hear text={item.say} className="mt-1" />
            </div>

            <div aria-live="polite" className="mt-5 min-h-6 text-center">
              {feedback?.kind === "right" && (
                <p className="inline-flex items-center gap-2 font-semibold text-good">
                  <IconCheck size={18} /> {helped ? t("practice.rightHelped") : t("practice.right")}
                </p>
              )}
              {feedback?.kind === "notYet" && (
                <p className="font-medium text-ink">{feedback.form ? t(FORM_KEY[feedback.form]) : tries >= 2 ? t("practice.notYetSteps") : t("practice.notYet")}</p>
              )}
            </div>
          </section>

          {hintText.length > 0 && !silent && (
            <ol className="mt-4 space-y-2" aria-label={t("practice.hints")}>
              {hintText.map((h, i) => (
                <li key={i} className="flex gap-3 rounded-md border border-border bg-panel2 px-4 py-3 text-sm text-ink">
                  <IconLightbulb size={18} className="mt-0.5 shrink-0 text-warn" />
                  <span>{h}</span>
                  <Hear text={h} className="ml-auto" />
                </li>
              ))}
            </ol>
          )}
          {steps && !silent && (
            <div className="mt-4 rounded-md border border-border bg-panel px-4 py-4">
              <p className="text-sm font-semibold text-ink">{t("practice.howTitle")}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink">
                {item.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              <p className="mt-2 text-xs text-muted">{t("practice.howNote")}</p>
            </div>
          )}

          <div className="mt-6">
            {feedback?.kind === "right" ? (
              <div className="flex justify-center">
                <NextButton
                  label={t("practice.next")}
                  onNext={() => {
                    setHold(null);
                    setFeedback(null);
                  }}
                />
              </div>
            ) : (
              <>
                <AnswerInput
                  input={item.input}
                  keys={item.keys}
                  choices={item.choices}
                  value={value}
                  onChange={(v) => {
                    setValue(v);
                    if (feedback?.kind === "notYet") setFeedback(null);
                  }}
                  onSubmit={() => submit(value)}
                  onPick={(i) => {
                    setPicked(i);
                    submit(i);
                  }}
                  young={young}
                  label={t("practice.yourAnswer")}
                />
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {item.input !== "choices" && (
                    <Button onClick={() => submit(value)} disabled={!value.trim()} className="min-w-36">
                      {silent ? t("practice.answer") : t("practice.check")}
                    </Button>
                  )}
                  {!silent && hints < item.hints.length && (
                    <Button variant="secondary" onClick={() => setHints((n) => n + 1)}>
                      <IconLightbulb size={16} /> {hints === 0 ? t("practice.hint") : t("practice.anotherHint")}
                    </Button>
                  )}
                  {!silent && !steps && (tries >= 2 || hints >= item.hints.length) && (
                    <Button variant="secondary" onClick={() => setSteps(true)}>
                      {t("practice.showHow")}
                    </Button>
                  )}
                  {!silent && (
                    <Button variant="ghost" onClick={() => dock.open({ item, setId: set.id, tries, lastAnswer: value || (picked !== undefined ? item.choices?.[picked]?.label : undefined) })}>
                      <IconChat size={16} /> {t("practice.askTutor")}
                    </Button>
                  )}
                  {!silent && (
                    <Button variant="ghost" onClick={skip}>
                      {fixing ? t("practice.giveUp") : t("practice.skip")}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </HearContext.Provider>
  );

}

function NextButton({ label, onNext }: { label: string; onNext: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <button ref={ref} type="button" onClick={onNext} className={btn("primary", "md", "min-w-40")}>
      {label} <IconArrowRight size={16} />
    </button>
  );
}

function Progress({ set, answers, index }: { set: PracticeSet; answers: { seed: number; correct: boolean; assisted: boolean }[]; index: number }) {
  const t = useT();
  const bySeed = new Map(answers.map((a) => [a.seed, a]));
  const done = answers.length;
  return (
    <div className="flex items-center gap-2">
      <ol className="hidden items-center gap-1 sm:flex" aria-hidden="true">
        {set.slots.map((s, i) => {
          const a = bySeed.get(s.seed);
          const cls = !a
            ? i === index
              ? "bg-panel ring-2 ring-accent"
              : "bg-panel2 ring-1 ring-border"
            : !a.correct
              ? "bg-panel ring-2 ring-bad/60"
              : a.assisted
                ? "bg-warn/60"
                : "bg-good";
          return <li key={s.seed} className={`size-2.5 rounded-full ${cls}`} />;
        })}
      </ol>
      <span className="font-opmono text-xs tabular-nums text-muted">{t("practice.count", { n: Math.min(done + 1, set.slots.length), total: set.slots.length })}</span>
    </div>
  );
}

function Finish({
  set,
  learner,
  tally,
  answers,
  exitHref,
}: {
  set: PracticeSet;
  learner: Profile;
  tally: { own: number; help: number; missed: number };
  answers: { seconds: number; seed: number; skillId: string; level: number }[];
  exitHref: string;
}) {
  const t = useT();
  const settings = settingsOf(learner);
  const skill = getSkill(set.skillId);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const seconds = answers.reduce((n, a) => n + a.seconds, 0);
  const pace = answers.reduce((n, a) => n + makeItem(a.skillId, a.level, a.seed, learner.locale).seconds, 0);
  const minutes = (s: number) => Math.max(1, Math.round(s / 60));
  const passed = set.kind === "check" && tally.own >= RULES.checkPass;

  let title: string;
  let body: string;
  if (set.kind === "check") {
    title = passed ? t("practice.checkPassed") : t("practice.checkNotYet");
    body = passed ? t("practice.checkPassedBody", { n: tally.own, total: answers.length }) : t("practice.checkNotYetBody", { n: tally.own, total: answers.length });
  } else if (set.kind === "placement") {
    title = t("practice.placementDone");
    body = t("practice.placementDoneBody", { skill: skill?.title[learner.locale] ?? "" });
  } else {
    title = t("practice.setDone");
    body = "";
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12 sm:py-20">
      <h1 ref={heading} tabIndex={-1} className="font-brand text-d3 font-semibold text-ink outline-none">
        {title}
      </h1>
      {body && <p className="mt-3 text-t3 text-ink">{body}</p>}
      {set.kind !== "placement" && (
        <dl className="mt-8 divide-y divide-border rounded-lg border border-border bg-panel">
          {[
            ["practice.ownLabel", tally.own, "bg-good"],
            ["practice.helpLabel", tally.help, "bg-warn/60"],
            ["practice.missedLabel", tally.missed, "bg-panel ring-2 ring-bad/60"],
          ].map(([k, v, dot]) => (
            <div key={k as string} className="flex items-center gap-3 px-5 py-3.5">
              <span aria-hidden="true" className={`size-2.5 rounded-full ${dot}`} />
              <dt className="flex-1 text-sm text-ink">{t(k as Key)}</dt>
              <dd className="font-opmono text-sm tabular-nums text-ink">{v as number}</dd>
            </div>
          ))}
          {settings.timer && set.kind !== "check" && (
            <div className="flex items-center gap-3 px-5 py-3.5">
              <span aria-hidden="true" className="size-2.5" />
              <dt className="flex-1 text-sm text-ink">{t("practice.timeLabel")}</dt>
              <dd className="font-opmono text-sm tabular-nums text-ink">{t("practice.timeValue", { n: minutes(seconds), pace: minutes(pace) })}</dd>
            </div>
          )}
        </dl>
      )}
      {set.kind !== "check" && set.kind !== "placement" && <p className="mt-4 text-sm text-muted">{t("practice.honest")}</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={exitHref} className={btn("primary")}>
          {exitHref === "/home" ? t("practice.backToday") : t("practice.backPractice")}
        </Link>
        {set.kind !== "check" && set.kind !== "placement" && skill && (
          <Link href={`/practice?again=${encodeURIComponent(skill.id)}`} className={btn("secondary")}>
            {t("practice.again")}
          </Link>
        )}
      </div>
    </main>
  );
}

/** A practice set started from anywhere: creates the set and returns its URL. */
export function setHref(setId: string, from?: "today" | "practice") {
  return `/practice/${setId}${from === "today" ? "?from=today" : ""}`;
}
