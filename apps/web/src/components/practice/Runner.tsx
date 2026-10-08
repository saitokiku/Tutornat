"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { IconArrowRight, IconCheck, IconChat, IconLightbulb, IconX } from "@/components/icons";
import { useTitle } from "@/components/LangSync";
import { SkillResources } from "@/components/resources/ResourceList";
import { HearContext, Hear, speakText } from "@/components/stage/hear";
import { VisualView } from "@/components/stage/visuals";
import { ColumnVisual } from "@/components/stage/visuals-practice";
import { StoreHealthNotice } from "@/components/gate";
import { Badge, Button, SUBJECT_TINT, btn } from "@/components/ui";
import { useT } from "@/i18n";
import type { Key } from "@/i18n/en";
import { levelInSet, placementNext, RULES } from "@/learning/engine";
import { attemptIdentity } from "@/learning/evidence";
import type { PracticeSet } from "@/learning/types";
import { logAct } from "@/lib/acts";
import { answersIn, finishSet, openPracticeAttempt, paceOf, practiceSource, recordAnswer, setStart, settingsOf, statusesOf, wholeMinutes } from "@/lib/practice";
import { attemptFor, evidenceProblem, recordFirstMiss, recordHelp } from "@/lib/evidence";
import { isReviewed } from "@/lib/review";
import { read, reload, storeHealth, update, useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { check, misconceptionOf, type Verdict } from "@/practice/answer";
import { randomSeed } from "@/practice/rng";
import { getSkill, makeItem } from "@/practice/skills";
import type { Input, Item } from "@/practice/types";
import { AnswerInput } from "./AnswerPad";
import { isMarkable, MarkCounters } from "./MarkCounters";
import { MathText } from "./MathText";
import { exitFor, nextOffer, offerTitle, planFinished, startOffer } from "./next";
import { responseOf } from "./pad-math";
import { SaveNotice } from "./SaveNotice";
import { HEAR } from "./targets";
import { useTutorDock } from "./tutor-dock";

type Feedback = { kind: "right" } | { kind: "notYet"; form?: Verdict["form"] } | null;

const FORM_KEY: Record<NonNullable<Verdict["form"]>, Key> = {
  simplest: "practice.form.simplest",
  factored: "practice.form.factored",
  expanded: "practice.form.expanded",
  simplified: "practice.form.simplified",
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

/** Pads whose answer is built by moving something: after a miss it stays where it was, to adjust. */
const KEEPS_VALUE = new Set<Input>(["text", "expr", "number-line", "fraction-bar", "clock"]);

/** The help a skipped problem had, kept until it comes back at the end of the set. */
type KeptHelp = { tries: number; hints: number; steps: boolean; tutored: boolean; lastMiss?: string | number };

/** Worked steps are read aloud only when they hold no notation a speech voice would garble (3/4, |−7|, x^2). */
export const speakableSteps = (steps: string[]) => !steps.some((s) => /\d\s*\/\s*\d|\||\^|[{}]/.test(s));

export const isYoung = (p: Profile) => p.grade === "K" || p.grade === "1" || p.grade === "2";

/** Plays one practice set: problems one at a time, help on request, corrections at the end, an honest finish. */
export function Runner({ set, learner, from }: { set: PracticeSet; learner: Profile; from?: string | null }) {
  const t = useT();
  const exit = exitFor(from);
  const young = isYoung(learner);
  const subjectTint = SUBJECT_TINT[set.subject];
  const silent = set.kind === "check" || set.kind === "placement";
  const skill = getSkill(set.skillId);
  const heading = skill?.title[learner.locale] ?? set.topic ?? "";
  useTitle(heading ? `${t(KIND_LABEL[set.kind])} · ${heading}` : t("practice.title"));

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

  // Per-problem state. The help a problem had (misses, hints, the steps, the tutor) belongs to that
  // problem for the whole set: a problem skipped and fixed at the end is still "with help", the hints
  // already shown come back with it, and leaving it keeps the last thing tried.
  const [localTries, setTries] = useState(0);
  const [localHints, setHints] = useState(0);
  const [localSteps, setSteps] = useState(false);
  const [tutored, setTutored] = useState(false);
  const [lastMiss, setLastMiss] = useState<string | number | undefined>();
  const [kept, setKept] = useState<ReadonlyMap<number, KeptHelp>>(() => new Map());
  const [value, setValue] = useState("");
  const [picked, setPicked] = useState<number | undefined>();
  const [feedback, setFeedback] = useState<Feedback>(null);
  // Why the last save didn't happen, until the next one does (SaveNotice says it).
  const [problem, setProblem] = useState<"storage" | "stale" | null>(null);
  const shownAt = useRef(0);
  const pad = useRef<HTMLDivElement>(null);
  /** What began the last press on Hint or Show me how ("mouse", "touch", "pen"), from its pointerdown. */
  const pressedWith = useRef("");
  const [current, setCurrent] = useState(index);
  if (current !== index) {
    const back = index !== undefined ? kept.get(index) : undefined;
    setCurrent(index);
    setTries(back?.tries ?? 0);
    setHints(back?.hints ?? 0);
    setSteps(back?.steps ?? false);
    setTutored(back?.tutored ?? false);
    setLastMiss(back?.lastMiss);
    setValue("");
    setPicked(undefined);
    setFeedback(null);
  }

  const slot = index !== undefined ? liveSet.slots[index] : undefined;
  const slotSkill = slot ? getSkill(slot.skillId) : undefined;
  // Sets mix skills (review slots, prep and review sets), so the label follows the problem on screen,
  // and the finish names drafts when any problem in the set came from one.
  const draft = useStore((s) => (slotSkill ? !isReviewed(s, slotSkill) : false));
  const anyDraft = useStore((s) => liveSet.slots.some((sl) => {
    const k = getSkill(sl.skillId);
    return k ? !isReviewed(s, k) : false;
  }));
  const mainAnswers = answers.filter((a) => a.skillId === set.skillId && a.mode !== "review");
  const level = slot ? slot.level ?? levelInSet(startLevel, slotSkill?.levels ?? 1, mainAnswers) : 1;
  const aiQ = index !== undefined ? liveSet.ai?.[index] : undefined;
  const item: Item | undefined = useMemo(() => {
    if (slot && aiQ) return fromAi(aiQ, slot.skillId, slot.seed);
    return slot && slotSkill ? makeItem(slot.skillId, level, slot.seed, learner.locale) : undefined;
  }, [slot, slotSkill, aiQ, level, learner.locale]);
  // The question's identity, and the help and first miss saved for it: a reload brings them back, so
  // help taken before it can't turn into "on your own".
  const source = slot ? practiceSource(liveSet, index!, level) : undefined;
  const attemptId = source ? attemptIdentity(source) : undefined;
  const persisted = useStore((s) => (source ? attemptFor(source, s) : undefined));
  const tries = Math.max(localTries, persisted?.firstResponse ? 1 : 0);
  const hints = Math.max(localHints, ...(persisted?.help ?? []).filter((h) => h.kind === "hint").map((h) => Number(h.detail) || 1));
  const steps = localSteps || !!persisted?.help.some((h) => h.kind === "steps");
  /** A save that didn't happen: say why; another tab's change is read again. Anything else is a bug. */
  const failed = (e: unknown) => {
    const p = evidenceProblem(e);
    setProblem(p);
    if (p !== "stale") return;
    // The question may come back different (another tab pinned its level): start it fresh.
    setValue("");
    setPicked(undefined);
    setFeedback(null);
    reload();
  };
  // The question's difficulty is pinned when it is shown (once per question, not per store write).
  useEffect(() => {
    if (index === undefined || !item) return;
    let live = true;
    try {
      openPracticeAttempt(set.id, index, item.level);
    } catch (e) {
      const p = evidenceProblem(e);
      queueMicrotask(() => live && setProblem(p));
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  // A new problem: start its clock, read it aloud for young learners, move focus to it. Keyed by the
  // problem's id, so recording an answer (which rewrites the store) does not repeat any of this.
  const itemId = item?.id;
  const itemSay = item?.say;
  useEffect(() => {
    if (!itemId) return;
    shownAt.current = Date.now();
    if (young && itemSay) speakText(itemSay, learner.locale);
    requestAnimationFrame(() => document.getElementById("problem")?.focus());
  }, [itemId, itemSay, young, learner.locale]);

  // Finishing: mark the set done once every problem has an answer. Nothing else starts.
  useEffect(() => {
    if (unresolved.length === 0 && set.kind !== "placement") finishSet(set.id);
  }, [unresolved.length, set.id, set.kind]);

  const dock = useTutorDock();
  const helped = !!persisted?.assistance.assisted || hints > 0 || steps || tries > 0 || tutored || dock.usedOn === item?.id;
  const say = (key: Key) => young && speakText(t(key), learner.locale);
  const labelOf = (response: string | number) => (typeof response === "number" ? (item?.choices?.[response]?.label ?? String(response)) : response);

  /**
   * Records the problem's one answer, before any feedback. A wrong one carries the misconception it
   * shows, when tagged. False when it wasn't taken (a check this device can't keep, or a stale tab).
   */
  const resolve = (correct: boolean, assisted: boolean, response?: string | number) => {
    if (index === undefined || !item) return false;
    try {
      recordAnswer(set.id, {
        slot: index,
        level: item.level,
        correct,
        assisted,
        seconds: (Date.now() - shownAt.current) / 1000,
        response: response === undefined ? undefined : labelOf(response),
        why: correct || response === undefined ? undefined : misconceptionOf(item, response),
        attemptId,
      });
    } catch (e) {
      failed(e);
      return false;
    }
    setProblem(null);
    return true;
  };

  /** Help is a teaching act: its intent is that the next try on this problem is right. */
  const helpAct = (kind: "hint" | "steps", detail?: string) => {
    if (!item || index === undefined) return;
    logAct({ profileId: learner.id, kind, intent: "next-try-right", skillId: item.skillId, setId: set.id, ref: String(index), detail });
  };
  /**
   * Help hands Enter back to the answer: focus returns to the pad's answer target, so an answer typed
   * before or after a hint is checked, never taken as a second hint. A tap leaves focus alone: a touch
   * screen has no Enter to take, and a phone's keyboard would rise over the hint just asked for.
   * Which it was comes from the press, not the click: some browsers (older Safari) send the click as a
   * plain MouseEvent with no pointer type. A click with no count (detail 0) came from the keyboard; a
   * counted click with no mouse pointerdown before it is taken as a tap.
   */
  const toAnswer = (e: MouseEvent) => {
    const by = e.detail === 0 ? "keyboard" : pressedWith.current;
    pressedWith.current = "";
    if (by !== "keyboard" && by !== "mouse") return;
    pad.current?.querySelector<HTMLElement>("[data-answer-target]")?.focus({ preventScroll: true });
  };
  const pressed = (e: PointerEvent) => void (pressedWith.current = e.pointerType);
  const hintList = useRef<HTMLOListElement>(null);
  const stepsBox = useRef<HTMLDivElement>(null);
  /**
   * Help just shown comes into view: on a short screen it would otherwise sit above, scrolled away, with
   * only the keypad showing. A K–2 learner hears it too; screen readers get it from its live region.
   */
  const reveal = (box: () => Element | null | undefined, text: string) =>
    requestAnimationFrame(() => {
      const still = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      box()?.scrollIntoView?.({ block: "nearest", behavior: still ? "auto" : "smooth" });
      if (young && text) speakText(text, learner.locale);
    });
  /** Saves help before it shows. False when it wasn't saved, and then it doesn't show. */
  const saveHelp = (kind: "hint" | "steps", n?: number) => {
    if (!source) return false;
    try {
      recordHelp(source, n === undefined ? { kind } : { kind, key: String(n), detail: String(n) });
    } catch (e) {
      failed(e);
      return false;
    }
    setProblem(null);
    return true;
  };
  const takeHint = (e: MouseEvent) => {
    if (!saveHelp("hint", hints + 1)) return;
    setHints(hints + 1);
    helpAct("hint", String(hints + 1));
    toAnswer(e);
    reveal(() => hintList.current?.lastElementChild, item?.hints[hints] ?? "");
  };
  const showSteps = (e: MouseEvent) => {
    if (!saveHelp("steps")) return;
    setSteps(true);
    helpAct("steps");
    toAnswer(e);
    reveal(() => stepsBox.current, item && speakableSteps(item.steps) ? item.steps.join(" ") : "");
  };

  const submit = (response: string | number) => {
    if (!item || feedback?.kind === "right") return;
    if (typeof response === "string" && !response.trim()) return;
    const verdict = check(item.answer, response);
    // A check or placement answer is the problem's first and only one: saved whole, or not taken at
    // all (then the next submit is the first saved answer). A right answer is saved before "Right."
    if (set.kind === "placement") {
      if (!resolve(verdict.correct, false, response)) return;
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
    if (silent) return resolve(verdict.correct, false, response);
    if (verdict.correct) {
      if (!resolve(true, helped, response)) return;
      setHold(index ?? null);
      setFeedback({ kind: "right" });
      say(helped ? "practice.rightHelped" : "practice.right");
      return;
    }
    // A miss: the first one is saved before "Not yet", so a reload keeps the next answer helped.
    try {
      recordFirstMiss(source!, { response: labelOf(response), ...(typeof response === "number" ? { choice: response } : {}) });
    } catch (e) {
      failed(e);
      return;
    }
    setProblem(null);
    setTries((n) => n + 1);
    setLastMiss(response);
    setFeedback({ kind: "notYet", form: verdict.form });
    say(verdict.form ? FORM_KEY[verdict.form] : tries + 1 >= 2 ? "practice.notYetSteps" : "practice.notYet");
    if (!KEEPS_VALUE.has(item.input)) setValue("");
    setPicked(undefined);
  };

  const skip = () => {
    if (index === undefined) return;
    // Leaving a problem while fixing records it as not yet, with the last thing the learner tried.
    if (fixing) return resolve(false, helped, lastMiss ?? (value.trim() || undefined));
    setKept((m) => new Map(m).set(index, { tries, hints, steps, tutored: tutored || dock.usedOn === item?.id, lastMiss }));
    setSkipped((s) => new Set(s).add(index));
  };

  // Opening the tutor on a problem is help on it (the drawer saves it, TutorDrawer).
  const askTutor = () => {
    if (!item) return;
    setTutored(true);
    dock.open({ item, setId: set.id, source, hints, tries, lastAnswer: value || (lastMiss !== undefined ? labelOf(lastMiss) : undefined) });
  };

  const tally = {
    own: answers.filter((a) => a.correct && !a.assisted).length,
    help: answers.filter((a) => a.correct && a.assisted).length,
    missed: answers.filter((a) => !a.correct).length,
  };

  if (done || (set.kind === "placement" && liveSet.finishedAt && hold === null))
    return (
      <HearContext.Provider value={{ hear: true, young, locale: learner.locale }}>
        <Finish set={liveSet} learner={learner} tally={tally} answers={answers} exit={exit} draft={anyDraft} />
      </HearContext.Provider>
    );
  if (!item || index === undefined) return null;

  const holding = feedback?.kind === "right";
  const response = responseOf(item.input, value);
  const hintText = item.hints.slice(0, hints);
  const primarySize = young ? "min-h-14 px-7 text-base" : "";
  // K–2 learners get 56 px targets on every action, not just the main one.
  const secondarySize = young ? "min-h-14 px-6 text-base" : "";
  const hear = HEAR;
  const counting = item.markable && isMarkable(item.visual) ? item.visual : undefined;
  const column = item.visual?.kind === "column" && item.input === "keypad" ? item.visual : undefined;
  // A keypad answer is written where the question leaves its blank (and in a column sum's answer row),
  // like on paper: one place the answer goes, so the keypad keeps no box of its own.
  const inBlank = item.input === "keypad" && item.prompt.some((p) => typeof p !== "string" && "blank" in p);
  const typed = value.replace("-", "−");
  const blank = holding ? (typeof picked === "number" ? item.choices?.[picked]?.label : typed) : inBlank && value ? typed : undefined;
  // What was marked "Not yet" stays on screen, struck through, until the next answer.
  const missed = feedback?.kind === "notYet" && lastMiss !== undefined ? String(labelOf(lastMiss)).replace("-", "−") : undefined;
  // Check and Hint stay pinned to the bottom of a phone screen while the pad scrolls under them, so a
  // hint that pushes the pad down never pushes Check out of reach. Choice tiles answer themselves.
  const pin =
    item.input !== "choices"
      ? "max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:-mx-4 max-sm:border-t max-sm:border-border max-sm:bg-paper max-sm:px-4 max-sm:py-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      : "";
  return (
    <HearContext.Provider value={{ hear: true, young, locale: learner.locale }}>
      <div className="min-h-dvh bg-paper">
        <header className="sticky top-0 z-10 border-b border-border bg-panel/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-2 sm:px-6">
            <Link href={exit.href} aria-label={t("practice.exit")} className="grid size-target shrink-0 place-items-center rounded-full text-muted hover:bg-panel2 hover:text-ink">
              <IconX size={20} />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{heading}</p>
              <p className="k-meta flex flex-wrap items-center gap-x-2">
                <span>
                  {set.ai ? t("practice.aiQuestions") : t(KIND_LABEL[set.kind])}
                  {fixing ? ` · ${t("practice.fixThese")}` : ""}
                </span>
                {/* A pre-reader's screen carries no status words; the grown-up's line sits at the foot. */}
                {draft && !young && <Badge>{t("practice.draft")}</Badge>}
              </p>
            </div>
            <Progress set={liveSet} answers={answers} index={index} />
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
          <div className="mb-5 space-y-3 empty:hidden">
            {/* A K–2 learner can't read the grown-up's notice: they hear that a grown-up is needed. */}
            {young && problem !== "storage" && storeHealth() === "memory" && <SaveNotice problem="unsaved" young locale={learner.locale} />}
            <StoreHealthNotice />
            {problem && <SaveNotice problem={problem} young={young} locale={learner.locale} />}
          </div>
          {silent && index === 0 && answers.length === 0 && (
            <p className="mb-5 rounded-md border border-border bg-panel2 px-4 py-3 text-sm text-ink">
              {set.kind === "check" ? t("practice.checkIntro", { n: RULES.checkSize }) : t("practice.placementIntro")}
            </p>
          )}
          <section aria-labelledby="problem" className="rounded-lg border border-border bg-panel p-5 shadow-soft sm:p-8">
            {column ? (
              <div className="mb-6 flex justify-center">
                <ColumnVisual {...column} alt={item.alt ?? ""} tint={subjectTint} value={holding || inBlank ? typed : undefined} right={holding} />
              </div>
            ) : (
              item.visual &&
              !counting && (
                <div className="mb-6 flex justify-center">
                  <VisualView visual={item.visual} alt={item.alt ?? ""} tint={subjectTint} />
                </div>
              )
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
                <MathText center parts={item.prompt} blank={blank} right={holding} />
              </h1>
              <Hear text={item.say} className={`mt-1 ${hear}`} />
            </div>
            {counting && (
              // Counting pictures come after the question, so Tab from the question reaches the counters
              // first. On phones they use the card's side padding, which keeps 56 px squares at 320 px.
              <div className="-mx-5 mt-6 sm:mx-0">
                <MarkCounters key={item.id} visual={counting} alt={item.alt ?? ""} tint={subjectTint} young={young} />
              </div>
            )}

            <div aria-live="polite" className="mt-5 min-h-6 text-center">
              {holding && (
                <p className="inline-flex items-center gap-2 font-semibold text-good">
                  <IconCheck size={18} /> {helped ? t("practice.rightHelped") : t("practice.right")}
                </p>
              )}
              {feedback?.kind === "notYet" && (
                <p className="font-medium text-ink">
                  {missed && (
                    <>
                      <s aria-hidden="true" className="mr-2 text-muted tabular-nums decoration-bad/70 decoration-2">
                        {missed}
                      </s>
                      <span className="sr-only">{t("pp.tried", { answer: missed })} </span>
                    </>
                  )}
                  <span>{feedback.form ? t(FORM_KEY[feedback.form]) : tries >= 2 ? t("practice.notYetSteps") : t("practice.notYet")}</span>
                </p>
              )}
            </div>
          </section>

          {!silent && (
            // Help is announced as it arrives (this live region) and brought into view (reveal).
            <div aria-live="polite">
              {hintText.length > 0 && (
                <ol ref={hintList} className="mt-4 space-y-2" aria-label={t("practice.hints")}>
                  {hintText.map((h, i) => (
                    <li key={i} className="flex scroll-mt-24 scroll-mb-28 items-start gap-3 rounded-md border border-border bg-panel2 px-4 py-3 text-sm text-ink">
                      <IconLightbulb size={18} className="mt-0.5 shrink-0 text-warn" />
                      <span className="min-w-0 flex-1 self-center">{h}</span>
                      <Hear text={h} className={hear} />
                    </li>
                  ))}
                </ol>
              )}
              {steps && (
                <div ref={stepsBox} className="mt-4 scroll-mt-24 scroll-mb-28 rounded-md border border-border bg-panel px-4 py-4">
                  <div className="flex items-start gap-3">
                    <p className="flex-1 text-sm font-semibold text-ink">{t("practice.howTitle")}</p>
                    {speakableSteps(item.steps) && <Hear text={item.steps.join(" ")} className={hear} />}
                  </div>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink">
                    {item.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                  <p className="mt-2 text-xs text-muted">{t("pr.howNote")}</p>
                </div>
              )}
            </div>
          )}

          <div ref={pad} className="mt-6">
            {/* The pad stays on screen after a right answer, still showing what the learner did. */}
            <AnswerInput
              key={item.id}
              input={item.input}
              keys={item.keys}
              choices={item.choices}
              pad={item.pad}
              tint={subjectTint}
              value={value}
              picked={picked}
              disabled={holding}
              readout={!inBlank}
              onChange={(v) => {
                setValue(v);
                if (feedback?.kind === "notYet") setFeedback(null);
              }}
              onSubmit={() => submit(response)}
              onPick={(i) => {
                setPicked(i);
                submit(i);
              }}
              young={young}
              label={t("practice.yourAnswer")}
            />
            <div className={`mt-5 flex flex-wrap items-center justify-center gap-2 ${pin}`}>
              {holding ? (
                <NextButton
                  label={t("practice.next")}
                  className={primarySize}
                  onNext={() => {
                    setHold(null);
                    setFeedback(null);
                  }}
                />
              ) : (
                <>
                  {item.input !== "choices" && (
                    <Button onClick={() => submit(response)} disabled={!response.trim()} className={`min-w-28 max-sm:flex-1 sm:min-w-36 ${primarySize}`}>
                      {silent ? t("practice.answer") : t("practice.check")}
                    </Button>
                  )}
                  {!silent && hints < item.hints.length && (
                    <Button variant="secondary" onPointerDown={pressed} onClick={takeHint} className={`max-sm:flex-1 ${secondarySize}`}>
                      <IconLightbulb size={16} /> {hints === 0 ? t("practice.hint") : t("practice.anotherHint")}
                    </Button>
                  )}
                  {!silent && !steps && (tries >= 2 || hints >= item.hints.length) && (
                    <Button variant="secondary" onPointerDown={pressed} onClick={showSteps} className={`max-sm:flex-1 ${secondarySize}`}>
                      {t("practice.showHow")}
                    </Button>
                  )}
                </>
              )}
            </div>
            {!holding && !silent && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <Button variant="ghost" onClick={askTutor} className={secondarySize}>
                  <IconChat size={16} /> {t("practice.askTutor")}
                </Button>
                <Button variant="ghost" onClick={skip} className={secondarySize}>
                  {fixing ? t("practice.giveUp") : t("practice.skip")}
                </Button>
              </div>
            )}
          </div>
          {/* The honesty line for the grown-up beside a pre-reader: quiet, at the foot, never on the child's work. */}
          {draft && young && <p className="k-meta mt-12 text-center">{t("pr.finish.draft")}</p>}
        </main>
      </div>
    </HearContext.Provider>
  );
}

function NextButton({ label, onNext, className = "" }: { label: string; onNext: () => void; className?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <button ref={ref} type="button" onClick={onNext} className={btn("primary", "md", `min-w-40 ${className}`)}>
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
      <span className="k-meta whitespace-nowrap">{t("practice.count", { n: Math.min(done + 1, set.slots.length), total: set.slots.length })}</span>
    </div>
  );
}

const PACE_KEY = { quicker: "pr.pace.quicker", usual: "pr.pace.usual", slower: "pr.pace.slower" } as const;

/**
 * The end of a sitting: an honest tally, pace in words (when a grown-up turned it on), and a clean
 * stop. "I'm done for today" is always there and goes back to Today; what comes next is offered as a
 * choice and never starts by itself.
 */
function Finish({
  set,
  learner,
  tally,
  answers,
  exit,
  draft,
}: {
  set: PracticeSet;
  learner: Profile;
  tally: { own: number; help: number; missed: number };
  answers: { seconds: number; seed: number; skillId: string; level: number }[];
  exit: ReturnType<typeof exitFor>;
  draft: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const young = isYoung(learner);
  const settings = settingsOf(learner);
  const skill = getSkill(set.skillId);
  const fromToday = exit.from === "today";
  const heading = useRef<HTMLHeadingElement>(null);
  const [now] = useState(() => Date.now());
  const offer = useStore((s) => nextOffer(s, learner, set, now));
  // Only when every line of today's plan is done does the finish say so (homework lines count too).
  const planDone = useStore((s) => fromToday && planFinished(s, learner, set, now));
  const [starting, setStarting] = useState(false);
  const seconds = answers.reduce((n, a) => n + a.seconds, 0);
  const standard = answers.reduce((n, a) => n + (getSkill(a.skillId) ? makeItem(a.skillId, a.level, a.seed, learner.locale).seconds : 30), 0);
  const passed = set.kind === "check" && tally.own >= RULES.checkPass;
  const practiceSet = set.kind !== "check" && set.kind !== "placement";

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
  // Young learners hear the result and the choice that follows it, since they may not read the buttons.
  const result = set.kind === "placement" ? `${title}. ${body}` : `${title}. ${t("pr.finish.say", { own: tally.own, help: tally.help, missed: tally.missed })}`;
  const spoken = `${result} ${t("pr.finish.sayChoice")}`;

  useEffect(() => {
    heading.current?.focus();
    if (young) speakText(spoken, learner.locale);
  }, [young, spoken, learner.locale]);

  const start = () => {
    if (!offer) return;
    setStarting(true);
    const href = startOffer(read(), learner, offer, exit.from, Date.now());
    if (href) router.push(href);
    else setStarting(false);
  };
  const big = young ? "min-h-14 px-7 text-base" : "";
  const hear = HEAR;

  return (
    <main className="mx-auto max-w-xl px-4 py-12 sm:py-20">
      <div className="flex items-start gap-3">
        <h1 ref={heading} tabIndex={-1} className="flex-1 font-brand text-d3 font-semibold text-ink outline-none">
          {title}
        </h1>
        {young && <Hear text={spoken} className={`mt-1 ${hear}`} />}
      </div>
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
              <dd className="font-brand text-t3 font-semibold tabular-nums text-ink">{v as number}</dd>
            </div>
          ))}
        </dl>
      )}
      {settings.timer && practiceSet && answers.length > 0 && (
        <p className="mt-4 text-sm text-ink">{t(PACE_KEY[paceOf(seconds, standard)], { n: wholeMinutes(seconds), pace: wholeMinutes(standard) })}</p>
      )}
      {practiceSet && <p className="mt-4 text-sm text-muted">{t("practice.honest")}</p>}
      {draft && <p className="mt-2 text-sm text-muted">{t("pr.finish.draft")}</p>}
      {set.ai && <p className="mt-2 text-sm text-muted">{t("practice.aiNote")}</p>}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link href="/home" className={btn("primary", "md", big)}>
          {t("pr.finish.done")}
        </Link>
        {young && <Hear text={t("pr.finish.done")} className={hear} />}
      </div>

      <section aria-labelledby="after" className="mt-10 border-t border-border pt-6">
        <h2 id="after" className="text-sm font-medium text-muted">
          {t("pr.finish.more")}
        </h2>
        {offer ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-panel px-5 py-4">
            <p className="min-w-0 flex-1 font-semibold text-ink">{offerTitle(offer, learner.locale)}</p>
            {young && <Hear text={offerTitle(offer, learner.locale)} className={hear} />}
            <Button variant="secondary" loading={starting} onClick={start} className={big}>
              {t("practice.start")}
            </Button>
          </div>
        ) : (
          planDone && <p className="mt-2 text-sm text-ink">{t("pr.finish.planDone")}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={exit.href} className={btn("ghost", "md", big)}>
            {t(exit.label)}
          </Link>
          {practiceSet && skill && (
            <Link href={`/practice?again=${encodeURIComponent(skill.id)}`} className={btn("ghost", "md", big)}>
              {t("practice.again")}
            </Link>
          )}
        </div>
        {skill && set.kind !== "placement" && !young && (
          <div className="mt-8">
            <SkillResources skillId={skill.id} locale={learner.locale} max={2} />
          </div>
        )}
      </section>
    </main>
  );
}

/** An AI-written question as a practice item: tap a choice, vetted by its own key index. */
function fromAi(q: { prompt: string; choices: string[]; answer: number; hints: string[]; explain: string }, skillId: string, seed: number): Item {
  return {
    id: `${skillId}:${seed}`,
    skillId,
    level: 1,
    seed,
    prompt: [q.prompt],
    say: q.prompt,
    input: "choices",
    choices: q.choices.map((c) => ({ label: c, say: c })),
    answer: { kind: "choice", index: q.answer },
    hints: q.hints,
    steps: [q.explain],
    seconds: 30,
  };
}
