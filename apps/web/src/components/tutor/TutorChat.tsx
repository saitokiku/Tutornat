"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { onRemoteCancel } from "@/lib/remote-lifecycle";
import { useEffect, useRef, useState } from "react";
import { IconArrowRight, IconSpeaker, IconStop, IconX } from "@/components/icons";
import { speakText } from "@/components/stage/hear";
import { Button, Notice, SubjectDot } from "@/components/ui";
import { useT, type Key } from "@/i18n";
import type { TutorContext } from "@/lib/ai/context";
import { useAiMode } from "@/lib/ai/client";
import { screen } from "@/lib/ai/safety";
import { know } from "@/lib/knowledge";
import { nextSkillFor, recentSkills, settingsOf } from "@/lib/practice";
import { addNote } from "@/lib/profiles";
import { read } from "@/lib/store";
import { familyNames, logTutorAct, saveThread, withoutNames, type BoardCard } from "@/lib/tutor";
import { demoAnswer, demoOpening, demoPhoto, openTalk, type DemoContext, type DemoState } from "@/lib/tutor-demo";
import type { Profile, Subject } from "@/lib/types";
import { localDate } from "@/planner/dates";
import type { TutorThread } from "@/planner/types";
import { randomSeed } from "@/practice/rng";
import { getSkill } from "@/practice/skills";
import type { Item } from "@/practice/types";
import { Board, CardView, SayButton, youngGrade, type BoardItem } from "./Board";
import { cardsOf, repliesIn, skillsIn } from "./cards";
import { PhotoError, photoForTurn, shrinkPhoto, withoutPhoto, type Photo } from "./photo";
import { PhotoButton } from "./PhotoButton";
import { useListen, useSpeakStream } from "./useVoice";

export { Worked } from "./Board";

// The tutor conversation, used beside a problem (drawer), on the lesson stage, and full screen (Talk,
// with a board). With AI connected it streams from /api/tutor and draws whatever the tutor's tools put
// on the board. Without AI it is the demo tutor: real sources, vetted hints, worked examples and
// practice that fits — and it says so once.

export type Entry = { id: string; role: "learner" | "tutor"; text: string; cards: BoardCard[]; replies?: string[]; streaming?: boolean; flag?: string; photo?: string };

export type ChatSetup = {
  learner: Profile;
  surface: TutorThread["surface"];
  item?: Item;
  /** The practice set the problem is in, when the tutor sits beside one. */
  setId?: string;
  /** Hints the learner already opened on the problem. */
  hintsSeen?: number;
  tries?: number;
  lastAnswer?: string;
  lesson?: { title: string; scene: string };
  homework?: { title: string; notes?: string };
  title: string;
  /** Commit the assistance latch before any instructional text, card or audio can be released. */
  beforeHelp?: (deliveryId: string) => boolean;
};

function opening(setup: ChatSetup, t: ReturnType<typeof useT>, choices: string[]): string {
  if (setup.item) return t("tutor.open.problem");
  if (setup.homework) return t("tutor.open.homework", { title: setup.homework.title });
  if (setup.lesson) return t("tutor.open.lesson");
  return openTalk(setup.learner.locale, setup.learner.grade, choices);
}

export function TutorChat({ setup, board = false }: { setup: ChatSetup; board?: boolean }) {
  const mode = useAiMode();
  const t = useT();
  // Topics to tap for an open conversation: the next skill in each subject on this learner's map.
  const [topics] = useState(() =>
    setup.item || setup.homework || setup.lesson
      ? []
      : (["math", "english", "science"] as Subject[]).map((sub) => nextSkillFor(read(), setup.learner, sub, Date.now())).filter((id): id is string => !!id && !!getSkill(id)),
  );
  if (mode === null) return <p className="px-4 py-6 text-sm text-muted">{t("common.loading")}</p>;
  return mode === "demo" ? <DemoChat setup={setup} board={board} topics={topics} /> : <AiChat setup={setup} board={board} topics={topics} />;
}

const titles = (ids: string[], setup: ChatSetup) => ids.map((id) => getSkill(id)!.title[setup.learner.locale]);

/* ------------------------------------------------------------------ AI */

const photoOf = (m: UIMessage) => (m.parts.find((p) => p.type === "file") as { url?: string } | undefined)?.url;

function AiChat({ setup, board, topics }: { setup: ChatSetup; board: boolean; topics: string[] }) {
  const t = useT();
  const { learner } = setup;
  const [working] = useState(() => recentSkills(read(), learner.id, Date.now()).slice(0, 6));
  // The learner's day for the dates the tutor offers: sent with every turn, and used to check them here.
  const [today] = useState(() => localDate(Date.now()));
  // Learner names never go to a model: the family's names are taken out of everything sent, including a
  // teacher's note on homework and anything the child types.
  const [names] = useState(() => familyNames(read(), learner.id));
  const clean = (text: string) => withoutNames(text, names);
  const context: TutorContext = {
    locale: learner.locale,
    grade: learner.grade,
    surface: setup.surface,
    item: setup.item ? { skillId: setup.item.skillId, level: setup.item.level, seed: setup.item.seed } : undefined,
    tries: setup.tries,
    lastAnswer: setup.lastAnswer && clean(setup.lastAnswer),
    lesson: setup.lesson && { title: clean(setup.lesson.title), scene: clean(setup.lesson.scene) },
    homework: setup.homework && { title: clean(setup.homework.title), notes: setup.homework.notes && clean(setup.homework.notes) },
    interests: learner.interests,
    working,
  };
  // A photo travels only with its turn and the next; the server checks it again either way.
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/tutor",
        prepareSendMessagesRequest: ({ id, messages, body, trigger, messageId }) => ({
          body: {
            ...body,
            id,
            // Every line, the child's and our own opening ("Let's look at Ada's science fair") alike.
            messages: photoForTurn(messages).map((m) => ({ ...m, parts: m.parts.map((p) => (p.type === "text" ? { ...p, text: withoutNames(p.text, names) } : p)) })),
            trigger,
            messageId,
          },
        }),
      }),
  );
  const [initial] = useState<UIMessage[]>(() => [{ id: "open", role: "assistant", parts: [{ type: "text", text: opening(setup, t, titles(topics, setup)) }] }]);
  const { messages, sendMessage, setMessages, status, error, stop } = useChat({ transport, messages: initial });
  useEffect(() => onRemoteCancel(() => { void stop(); }), [stop]);
  const failure = error?.message ?? "";
  const photoRefused = /photo_too_big|bad_photo/.test(failure);
  // A photo the server refused is taken off the message, so the next turn doesn't send it (and fail) again.
  useEffect(() => {
    if (photoRefused) setMessages((ms) => ms.map((m) => (m.role === "user" ? withoutPhoto(m) : m)));
  }, [photoRefused, setMessages]);

  const entries: Entry[] = messages.map((m, i) => ({
    id: m.id,
    role: m.role === "user" ? "learner" : "tutor",
    // Text before and after a tool call are separate sentences ("Let me look that up." / "A fallacy is…").
    text: m.parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join("\n"),
    cards: m.role === "user" ? [] : cardsOf(m, learner.locale, today),
    replies: m.role === "assistant" && status === "ready" && i === messages.length - 1 ? repliesIn(m) : [],
    streaming: i === messages.length - 1 && m.role === "assistant" && (status === "streaming" || status === "submitted"),
    flag: (m.metadata as { flag?: string } | undefined)?.flag,
    photo: m.role === "user" ? photoOf(m) : undefined,
  }));
  const skillIds = [...new Set([...(setup.item ? [setup.item.skillId] : []), ...messages.flatMap(skillsIn)])];

  return (
    <ChatView
      setup={setup}
      board={board}
      entries={entries}
      busy={status === "submitted" || status === "streaming"}
      error={error ? t(/photo_too_big/.test(failure) ? "tut.photo.tooBig" : /bad_photo/.test(failure) ? "tut.photo.unreadable" : "tutor.error") : null}
      onSend={(text, photo) => sendMessage({ text, files: photo ? [{ type: "file", mediaType: photo.mediaType, url: photo.url, filename: "problem.jpg" }] : undefined }, { body: { context, hintsSeen: setup.hintsSeen, today: localDate(Date.now()) } })}
      onStop={stop}
      label={t("tut.label.ai")}
      readsPhotos
      skillIds={skillIds}
      topics={topics}
    />
  );
}

/* ------------------------------------------------------------------ demo */

function DemoChat({ setup, board, topics }: { setup: ChatSetup; board: boolean; topics: string[] }) {
  const { learner, item } = setup;
  const t = useT();
  const [ctx] = useState<DemoContext>(() => ({
    locale: learner.locale,
    grade: learner.grade,
    today: localDate(Date.now()),
    item,
    hintsSeen: setup.hintsSeen,
    homework: setup.homework,
    lesson: setup.lesson ? { title: setup.lesson.title } : undefined,
    choices: titles(topics, setup),
    names: familyNames(read(), learner.id),
    seed: randomSeed,
  }));
  const [first] = useState(() => demoOpening(ctx));
  const state = useRef<DemoState>({ ...first.state, tries: setup.tries ?? 0 });
  const [skillIds, setSkillIds] = useState<string[]>(first.state.skillId ? [first.state.skillId] : []);
  const [entries, setEntries] = useState<Entry[]>(() => [{ id: "open", role: "tutor", text: first.text, cards: first.cards }]);
  const [busy, setBusy] = useState(false);
  const photos = useRef<string[]>([]);
  useEffect(() => () => photos.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const add = (...e: Omit<Entry, "id">[]) => setEntries((x) => [...x, ...e.map((y) => ({ ...y, id: crypto.randomUUID() }))]);

  const send = async (text: string) => {
    add({ role: "learner", text, cards: [] });
    const s = screen(text, learner.locale);
    if (s.kind !== "ok") return add({ role: "tutor", text: s.reply, cards: [], flag: s.kind });
    setBusy(true);
    try {
      // Today as of this message: "tomorrow" said after midnight means the day after the new today.
      const r = await demoAnswer(text, { ...ctx, today: localDate(Date.now()) }, state.current, know);
      state.current = r.state;
      const skill = r.state.skillId;
      if (skill) setSkillIds((ids) => (ids.includes(skill) ? ids : [...ids, skill]));
      add({ role: "tutor", text: r.text, cards: r.cards });
    } finally {
      setBusy(false);
    }
  };

  // A photo never leaves the device in the demo: it's shown back, and the tutor asks for it typed.
  const photo = (url: string) => {
    photos.current.push(url);
    add({ role: "learner", text: "", cards: [], photo: url }, { role: "tutor", text: demoPhoto(ctx, state.current).text, cards: [] });
  };

  return (
    <ChatView
      setup={setup}
      board={board}
      entries={entries}
      busy={busy}
      error={null}
      onSend={(text) => void send(text)}
      onDevicePhoto={photo}
      label={t("tutor.demoLabel")}
      readsPhotos={false}
      skillIds={skillIds}
      topics={topics}
    />
  );
}

/* ------------------------------------------------------------------ view */

type Quick = { label: string; fill?: [string, string]; subject?: Subject };

function ChatView({
  setup,
  board,
  entries: incoming,
  busy,
  error,
  onSend,
  onStop,
  onDevicePhoto,
  label,
  readsPhotos,
  skillIds,
  topics,
}: {
  setup: ChatSetup;
  board: boolean;
  entries: Entry[];
  busy: boolean;
  error: string | null;
  onSend: (text: string, photo?: Photo) => void;
  onStop?: () => void;
  /** Demo: the photo stays on this device (an object URL) and is never read. */
  onDevicePhoto?: (url: string) => void;
  label: string | null;
  /** True when the tutor can read photos (AI connected): the photo is shrunk and sent with the message. */
  readsPhotos: boolean;
  /** The skills the conversation has turned to, in order. */
  skillIds: string[];
  /** Skills to tap at the start of an open conversation. */
  topics: string[];
}) {
  const t = useT();
  const { learner } = setup;
  const locale = learner.locale;
  const young = youngGrade(learner);
  const settings = settingsOf(learner);
  const [input, setInput] = useState("");
  const [readAloud, setReadAloud] = useState(young);
  const speak = useSpeakStream(locale, readAloud);
  const listen = useListen(locale, (text) => submit(text));
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const [threadId] = useState(() => crypto.randomUUID());
  const [startedAt] = useState(() => Date.now());
  const handled = useRef(new Set<string>());
  // When each line was first seen, so a grown-up's view says when it was said.
  const said = useRef(new Map<string, number>());
  const [boardOpen, setBoardOpen] = useState(true);
  const [pending, setPending] = useState<Photo | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<"tut.photo.tooBig" | "tut.photo.unreadable" | null>(null);
  const skillId = skillIds.at(-1);
  const [admitted, setAdmitted] = useState<ReadonlySet<string>>(() => new Set());
  const [admissionFailed, setAdmissionFailed] = useState(false);
  const [admissionRetry, setAdmissionRetry] = useState(0);
  const beforeHelp = setup.beforeHelp;
  const entries = incoming.filter((e) => e.role === "learner" || e.id === "open" || e.flag || !beforeHelp || admitted.has(e.id));
  useEffect(() => {
    if (!beforeHelp) return;
    let live = true;
    const ready: string[] = [];
    let failed = false;
    for (const e of incoming) {
      if (e.role !== "tutor" || e.id === "open" || e.flag || admitted.has(e.id) || (!e.text && !e.cards.length && !e.replies?.length)) continue;
      if (beforeHelp(e.id)) ready.push(e.id);
      else failed = true;
    }
    // Storage admission is synchronous; publish its acknowledgement on the next microtask.
    // The current render still withholds text/cards/audio until that acknowledgement arrives.
    queueMicrotask(() => {
      if (!live) return;
      if (ready.length) setAdmitted((ids) => new Set([...ids, ...ready]));
      setAdmissionFailed(failed);
    });
    if (failed) onStop?.();
    return () => { live = false; };
  }, [incoming, beforeHelp, admitted, admissionRetry, onStop]);
  const replies = entries.at(-1)?.role === "tutor" ? entries.at(-1)?.replies ?? [] : [];
  // Whether the learner is moving by keyboard (not tapping), so a chip reached by Tab can say its name.
  const byKeyboard = useRef(false);
  useEffect(() => {
    const keys = () => (byKeyboard.current = true);
    const taps = () => (byKeyboard.current = false);
    window.addEventListener("keydown", keys, true);
    window.addEventListener("pointerdown", taps, true);
    return () => {
      window.removeEventListener("keydown", keys, true);
      window.removeEventListener("pointerdown", taps, true);
    };
  }, []);

  // What changed in the conversation, as one string: the AI view rebuilds `entries` on every render.
  const changed = entries.map((e) => `${e.id}:${e.text.length}:${e.cards.length}:${e.streaming ? 1 : 0}:${e.flag ?? ""}:${e.photo ? 1 : 0}`).join("|");

  // Read replies aloud as they arrive; keep the transcript for grown-ups; act on safety flags and notes
  // once; record each skill the conversation turned to.
  useEffect(() => {
    const now = Date.now();
    for (const e of entries) if (!said.current.has(e.id)) said.current.set(e.id, e.id === "open" ? startedAt : now);
    const last = entries.at(-1);
    if (last?.role === "tutor") {
      // Sentence by sentence (useSpeakStream queues each one), as it streams or all at once.
      speak.feed(last.id, last.text, !last.streaming);
    }
    const still = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    end.current?.scrollIntoView?.({ block: "end", behavior: still ? "auto" : "smooth" });
    for (const e of entries) {
      if (e.streaming) continue;
      if (e.flag && e.flag !== "offLimits" && !handled.current.has(`flag:${e.id}`)) {
        handled.current.add(`flag:${e.id}`);
        addNote(learner.id, t(e.flag === "abuse" ? "tutor.safetyNoteAbuse" : "tutor.safetyNoteCrisis"), "safety");
      }
      e.cards.forEach((c, i) => {
        const key = `note:${e.id}:${i}`;
        if (c.type === "note" && c.text && !handled.current.has(key)) {
          handled.current.add(key);
          addNote(learner.id, c.text, "tutor");
        }
      });
    }
    // Only released instructional replies log a teaching act; opening and failed delivery are neutral.
    const talked = entries.some((e) => e.role === "tutor" && e.id !== "open" && !e.flag && (e.text || e.cards.length));
    for (const id of talked ? skillIds : []) {
      if (handled.current.has(`act:${id}`)) continue;
      handled.current.add(`act:${id}`);
      logTutorAct(learner.id, threadId, id, setup.item?.skillId === id ? setup.setId : undefined);
    }
    if (entries.some((e) => e.streaming)) return; // the transcript is saved when the reply is complete
    const firstAsk = entries.find((e) => e.role === "learner");
    const line = (e: Entry) => (e.photo ? `${t("tut.photo.sent")} ${e.text}`.trim() : e.text);
    saveThread({
      id: threadId,
      profileId: learner.id,
      startedAt,
      surface: setup.surface,
      title: setup.surface === "talk" && firstAsk ? line(firstAsk).slice(0, 80) : setup.title,
      flagged: entries.some((e) => e.flag && e.flag !== "offLimits") || undefined,
      lines: entries.filter((e) => e.text || e.photo).map((e) => ({ role: e.role, text: line(e), at: said.current.get(e.id) ?? startedAt })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per change of the conversation
  }, [changed, skillIds.join(",")]);

  function submit(text: string) {
    const clean = text.trim().slice(0, 1000);
    if ((!clean && !pending) || busy) return;
    speak.stop();
    onSend(clean || t("tut.photo.default"), pending ?? undefined);
    setInput("");
    setPending(null);
  }

  const onFile = async (file: File) => {
    setPhotoError(null);
    if (!readsPhotos) return onDevicePhoto?.(URL.createObjectURL(file));
    setPhotoBusy(true);
    try {
      setPending(await shrinkPhoto(file));
      box.current?.focus();
    } catch (e) {
      setPhotoError(e instanceof PhotoError && e.code === "tooBig" ? "tut.photo.tooBig" : "tut.photo.unreadable");
    } finally {
      setPhotoBusy(false);
    }
  };

  const fill = ([start, endText]: [string, string]) => {
    setInput(start + endText);
    requestAnimationFrame(() => {
      box.current?.focus();
      box.current?.setSelectionRange(start.length, start.length);
    });
  };

  const skillChip = (id: string): Quick => ({ label: getSkill(id)!.title[locale], subject: getSkill(id)!.subject });
  const define: Quick = { label: t("tut.quick.define"), fill: [t("tut.quick.defineStart"), t("tut.quick.defineEnd")] };
  const book: Quick = { label: t("tut.quick.book"), fill: [t("tut.quick.bookStart"), ""] };
  const explain: Quick = { label: t("tutor.quick.explain") };
  // A young learner never gets a chip that needs typing.
  const typing = young ? [] : [define];
  const asks: Quick[] = [
    ...replies.map((label) => ({ label })),
    ...(setup.item
      ? [{ label: t("tutor.quick.hint") }, { label: t("tutor.quick.similar") }, explain, ...typing]
      : setup.homework
        ? [{ label: t("tutor.quick.whereStart") }, explain, ...typing]
        : setup.lesson
          ? [explain, ...typing]
          : skillId && entries.some((e) => e.role === "learner")
            ? young
              ? [{ label: t("tut.quick.example") }, explain, { label: t("tut.quick.poem") }]
              : [{ label: t("tutor.quick.hint") }, { label: t("tut.quick.example") }, explain, define, book]
            : young
              ? [...topics.map(skillChip), { label: t("tut.quick.poem") }]
              : [define, book, ...topics.slice(0, 2).map(skillChip)]),
  ].filter((q, i, all) => all.findIndex((x) => x.label === q.label) === i);

  // The newest reply's cards on top, each reply's cards in the order the tutor gave them. A practice
  // offer already on the board isn't drawn twice; the older reply's pointer goes to the one shown.
  const items: BoardItem[] = [];
  const shownAt = new Map<string, string>();
  if (board) {
    const practiceAt = new Map<string, string>();
    for (const e of [...entries].reverse())
      e.cards.forEach((card, i) => {
        const key = `${e.id}-${i}`;
        if (card.type === "note") return;
        if (card.type === "practice") {
          const newer = practiceAt.get(card.skillId);
          if (newer) return void shownAt.set(key, newer);
          practiceAt.set(card.skillId, key);
        }
        items.push({ key, card });
      });
  }
  const show = (key: string) => {
    setBoardOpen(true);
    requestAnimationFrame(() => {
      const el = document.getElementById(`card-${shownAt.get(key) ?? key}`);
      el?.scrollIntoView?.({ block: "nearest" });
      el?.focus();
    });
  };

  const conversation = (
    <div className={`flex min-h-0 flex-1 flex-col ${board ? "lg:pr-6" : ""}`}>
      {admissionFailed && <Notice tone="warn">{t("practice.evidenceSaveFailed")} <Button variant="ghost" onClick={() => setAdmissionRetry((n) => n + 1)}>{t("common.retry")}</Button></Notice>}
      <div className={`flex-1 space-y-3 overflow-y-auto ${board ? "py-4" : "px-4 py-4"}`} role="log" aria-live="polite" aria-relevant="additions">
        <p className="text-xs text-muted">
          {t("tutor.disclosure")}
          {label && <span className="ml-1 font-medium text-ink">· {label}</span>}
        </p>
        {entries.map((e) =>
          e.role === "learner" ? (
            <div key={e.id} className="ml-10 flex flex-col items-end gap-1.5">
              {e.photo && (
                // eslint-disable-next-line @next/next/no-img-element -- a local data/object URL, never a remote image
                <img src={e.photo} alt={t("tut.photo.alt")} className="max-h-48 max-w-full rounded-md border border-border object-contain" />
              )}
              {e.text && <p className="whitespace-pre-wrap rounded-lg rounded-br-sm bg-ink px-3.5 py-2.5 text-sm text-paper">{e.text}</p>}
            </div>
          ) : (
            <div key={e.id} className="mr-4 space-y-2">
              {e.text && (
                <div className="flex items-start gap-2">
                  <p className={`min-w-0 whitespace-pre-wrap break-words rounded-lg rounded-bl-sm bg-panel2 px-3.5 py-2.5 text-ink ${young ? "text-base" : "text-sm"} ${e.flag && e.flag !== "offLimits" ? "border border-accent/40" : ""}`}>
                    {e.text}
                    {e.streaming && <span aria-hidden="true" className="ml-1 inline-block size-2 animate-pulse rounded-full bg-muted align-middle" />}
                  </p>
                  {!e.streaming && <SayButton text={e.text} locale={locale} big={young} />}
                </div>
              )}
              {board ? (
                <>
                  {e.cards.map((c, i) => (c.type === "note" ? <CardView key={i} card={c} learner={learner} /> : null))}
                  {e.cards.some((c) => c.type !== "note") && (
                    <button
                      type="button"
                      onClick={() => show(`${e.id}-${e.cards.findIndex((c) => c.type !== "note")}`)}
                      className={`flex ${young ? "min-h-14 text-base" : "min-h-11 text-xs"} w-full items-center rounded-sm border border-border bg-panel px-3 text-left text-muted hover:border-ink/30 hover:text-ink`}
                    >
                      {t("tut.board.on", { what: [...new Set(e.cards.filter((c) => c.type !== "note").map((c) => t(`tut.kind.${c.type}` as Key)))].join(", ") })}
                    </button>
                  )}
                </>
              ) : (
                e.cards.map((c, i) => <CardView key={i} card={c} learner={learner} />)
              )}
            </div>
          ),
        )}
        {busy && entries.at(-1)?.role === "learner" && <p className="text-sm text-muted">{t("tutor.thinking")}</p>}
        {error && <p className="rounded-md border border-bad/40 bg-panel px-3 py-2 text-sm text-ink">{error}</p>}
        <div ref={end} />
      </div>
      <div className={`border-t border-border ${board ? "pt-3" : "p-3"}`}>
        <div className="mb-2 flex flex-wrap items-start gap-2">
          {/* Focus stays here when a tapped chip goes away or waits for the reply, so keyboard users keep their place. */}
          <div ref={chips} tabIndex={-1} role="group" aria-label={t("tut.quick.label")} className="flex min-w-0 flex-1 flex-wrap gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent">
            {asks.map((q) => (
              <button
                key={q.label}
                type="button"
                disabled={busy}
                onFocus={() => {
                  // A young learner who can't read the chip hears it when they reach it by keyboard.
                  if (young && readAloud && byKeyboard.current) speakText(q.label, locale);
                }}
                onClick={() => {
                  if (q.fill) return fill(q.fill);
                  chips.current?.focus();
                  submit(q.label);
                }}
                className={`${young ? "k-btn-secondary min-h-14 px-5 text-base" : "k-btn-secondary min-h-11 px-3.5 text-xs"} gap-2`}
              >
                {q.subject && <SubjectDot subject={q.subject} />}
                {q.label}
              </button>
            ))}
          </div>
          {speak.supported && (
            <button
              type="button"
              aria-pressed={readAloud}
              onClick={() => (readAloud && speak.stop(), setReadAloud(!readAloud))}
              className={`ml-auto inline-flex ${young ? "min-h-14 px-4 text-base" : "min-h-11 px-3 text-xs"} items-center gap-1.5 rounded-full text-muted hover:bg-panel2 aria-pressed:text-accent`}
            >
              <IconSpeaker size={young ? 18 : 14} /> {readAloud ? t("tutor.readingOn") : t("tutor.readingOff")}
            </button>
          )}
        </div>
        {(pending || photoBusy) && (
          <div className="mb-2 flex items-center gap-3 rounded-md border border-border bg-panel p-2">
            {pending ? (
              // eslint-disable-next-line @next/next/no-img-element -- the learner's own photo, shrunk in this browser
              <img src={pending.url} alt={t("tut.photo.alt")} className="size-14 rounded-sm object-cover" />
            ) : (
              <span aria-hidden="true" className="size-14 animate-pulse rounded-sm bg-panel2" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink" role="status">
                {pending ? t("tut.photo.ready") : t("common.loading")}
              </span>
              <span className="block text-xs text-muted">{t("tut.photo.privacy")}</span>
            </span>
            {pending && (
              <button type="button" onClick={() => setPending(null)} aria-label={t("tut.photo.remove")} className={`grid ${young ? "size-14" : "size-11"} shrink-0 place-items-center rounded-full text-muted hover:bg-panel2 hover:text-ink`}>
                <IconX size={18} />
              </button>
            )}
          </div>
        )}
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
        >
          <PhotoButton onFile={(f) => void onFile(f)} disabled={busy || photoBusy} big={young} />
          {settings.voiceInput && listen.supported && (
            <button
              type="button"
              onClick={() => (listen.listening ? listen.stop() : listen.start())}
              aria-pressed={listen.listening}
              aria-label={listen.listening ? t("tutor.micStop") : t("tutor.micStart")}
              className={`grid ${young ? "size-14" : "size-11"} shrink-0 place-items-center rounded-full border ${listen.listening ? "border-accent bg-accent text-paper" : "border-border bg-panel text-ink hover:bg-panel2"}`}
            >
              {listen.listening ? <IconStop size={18} /> : <MicIcon />}
            </button>
          )}
          <label htmlFor={`tutor-say-${threadId}`} className="sr-only">
            {setup.item ? t("tutor.placeholder") : t("tutor.placeholderTalk")}
          </label>
          <textarea
            ref={box}
            id={`tutor-say-${threadId}`}
            rows={1}
            value={listen.listening ? listen.partial : input}
            readOnly={listen.listening}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            placeholder={listen.listening ? t("tutor.listening") : setup.item ? t("tutor.placeholder") : t("tutor.placeholderTalk")}
            className={`${young ? "min-h-14 text-base" : "min-h-11 text-sm"} min-w-0 flex-1 resize-none rounded-sm border border-border bg-panel px-3 py-2.5 text-ink placeholder:text-muted/80 focus:border-accent focus:outline-none`}
          />
          {busy && onStop ? (
            <button type="button" onClick={onStop} aria-label={t("tutor.stop")} className={`grid ${young ? "size-14" : "size-11"} shrink-0 place-items-center rounded-full border border-border bg-panel text-ink`}>
              <IconStop size={18} />
            </button>
          ) : (
            <button type="submit" aria-label={t("tutor.send")} disabled={(!input.trim() && !pending) || busy} className={`grid ${young ? "size-14" : "size-11"} shrink-0 place-items-center rounded-full bg-ink text-paper disabled:opacity-30`}>
              <IconArrowRight size={18} />
            </button>
          )}
        </form>
        {!readsPhotos && <span className="sr-only">{t("tut.photo.demoNote")}</span>}
        {photoError && (
          <p role="alert" className="mt-2 text-xs text-bad">
            {t(photoError)}
          </p>
        )}
        {listen.error && <p className="mt-2 text-xs text-muted">{t("tutor.micError")}</p>}
      </div>
    </div>
  );

  if (!board) return conversation;
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row-reverse">
      <Board items={items} learner={learner} open={boardOpen} onToggle={() => setBoardOpen(!boardOpen)} />
      {conversation}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </svg>
  );
}
