"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconArrowRight, IconCheck, IconPlus, IconSpeaker, IconStop } from "@/components/icons";
import { MathText } from "@/components/practice/MathText";
import { Hear } from "@/components/stage/hear";
import { VisualView } from "@/components/stage/visuals";
import { Button, SUBJECT_TINT } from "@/components/ui";
import { useT } from "@/i18n";
import type { TutorContext } from "@/lib/ai/context";
import { useAiMode } from "@/lib/ai/client";
import { screen } from "@/lib/ai/safety";
import { recentSkills, settingsOf, startSet } from "@/lib/practice";
import { addNote } from "@/lib/profiles";
import { addEvent } from "@/lib/school";
import { read } from "@/lib/store";
import { saveThread } from "@/lib/tutor";
import { demoReply, intentOf, type DemoState } from "@/lib/tutor-demo";
import type { Profile, Visual } from "@/lib/types";
import type { EventKind, TutorThread } from "@/planner/types";
import { matchSkills } from "@/planner/skillmatch";
import { getSkill, makeItem, SKILLS } from "@/practice/skills";
import type { Item } from "@/practice/types";
import { resourcesFor } from "@/resources";
import { useListen, useSpeakStream } from "./useVoice";

// The tutor conversation, used beside a problem (drawer) and full screen (Talk). With AI connected it
// streams from /api/tutor and draws whatever the tutor's tools put on the board. Without AI it is the
// demo tutor: vetted hints, worked examples and practice that fits — and it says so.

type Card =
  | { type: "visual"; visual: Visual; description: string }
  | { type: "worked"; item: Item }
  | { type: "practice"; skillId: string; reason?: string }
  | { type: "calendar"; key: string; title: string; kind: EventKind; date: string }
  | { type: "resources"; list: { title: string; source: string; url: string }[] }
  | { type: "note"; text: string };

export type Entry = { id: string; role: "learner" | "tutor"; text: string; cards: Card[]; streaming?: boolean; flag?: string };

export type ChatSetup = {
  learner: Profile;
  surface: TutorThread["surface"];
  item?: Item;
  tries?: number;
  lastAnswer?: string;
  lesson?: { title: string; scene: string };
  homework?: { title: string; notes?: string };
  title: string;
};

function opening(setup: ChatSetup, t: ReturnType<typeof useT>): string {
  if (setup.item) return t("tutor.open.problem");
  if (setup.homework) return t("tutor.open.homework", { title: setup.homework.title });
  if (setup.lesson) return t("tutor.open.lesson");
  return t("tutor.open.talk");
}

export function TutorChat({ setup, board = false }: { setup: ChatSetup; board?: boolean }) {
  const mode = useAiMode();
  const t = useT();
  if (mode === null) return <p className="px-4 py-6 text-sm text-muted">{t("common.loading")}</p>;
  return mode === "demo" ? <DemoChat setup={setup} board={board} /> : <AiChat setup={setup} board={board} />;
}

/* ------------------------------------------------------------------ AI */

function AiChat({ setup, board }: { setup: ChatSetup; board: boolean }) {
  const t = useT();
  const { learner } = setup;
  const [working] = useState(() => recentSkills(read(), learner.id, Date.now()).slice(0, 6));
  const context: TutorContext = {
    locale: learner.locale,
    grade: learner.grade,
    surface: setup.surface,
    item: setup.item ? { skillId: setup.item.skillId, level: setup.item.level, seed: setup.item.seed } : undefined,
    tries: setup.tries,
    lastAnswer: setup.lastAnswer,
    lesson: setup.lesson,
    homework: setup.homework,
    interests: learner.interests,
    working,
  };
  const [transport] = useState(() => new DefaultChatTransport({ api: "/api/tutor" }));
  const [initial] = useState<UIMessage[]>(() => [{ id: "open", role: "assistant", parts: [{ type: "text", text: opening(setup, t) }] }]);
  const { messages, sendMessage, status, error, stop } = useChat({ transport, messages: initial });

  const entries: Entry[] = messages.map((m, i) => ({
    id: m.id,
    role: m.role === "user" ? "learner" : "tutor",
    text: m.parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join(""),
    cards: cardsOf(m, learner.locale),
    streaming: i === messages.length - 1 && m.role === "assistant" && (status === "streaming" || status === "submitted"),
    flag: (m.metadata as { flag?: string } | undefined)?.flag,
  }));

  return (
    <ChatView
      setup={setup}
      board={board}
      entries={entries}
      busy={status === "submitted" || status === "streaming"}
      error={error ? t("tutor.error") : null}
      onSend={(text) => sendMessage({ text }, { body: { context } })}
      onStop={stop}
      label={null}
    />
  );
}

function cardsOf(m: UIMessage, locale: Profile["locale"]): Card[] {
  const out: Card[] = [];
  for (const raw of m.parts) {
    const p = raw as { type: string; state?: string; input?: Record<string, unknown>; output?: Record<string, unknown>; toolCallId?: string };
    if (!p.type.startsWith("tool-") || p.state === "input-streaming") continue;
    const input = p.input ?? {};
    switch (p.type) {
      case "tool-show_visual":
        out.push({ type: "visual", visual: input.visual as Visual, description: String(input.description ?? "") });
        break;
      case "tool-similar_problem": {
        const o = p.output as { skillId?: string; level?: number; seed?: number } | undefined;
        if (o?.skillId && getSkill(o.skillId) && o.seed !== undefined) out.push({ type: "worked", item: makeItem(o.skillId, o.level ?? 1, o.seed, locale) });
        break;
      }
      case "tool-start_practice":
        if (getSkill(String(input.skillId))) out.push({ type: "practice", skillId: String(input.skillId), reason: String(input.reason ?? "") });
        break;
      case "tool-add_to_calendar":
        out.push({ type: "calendar", key: p.toolCallId ?? String(input.title), title: String(input.title), kind: input.kind as EventKind, date: String(input.date) });
        break;
      case "tool-find_resources": {
        const list = (p.output as { resources?: { title: string; source: string; url: string }[] } | undefined)?.resources;
        if (list?.length) out.push({ type: "resources", list });
        break;
      }
      case "tool-note_for_grownup":
        out.push({ type: "note", text: String(input.text ?? "") });
        break;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ demo */

function DemoChat({ setup, board }: { setup: ChatSetup; board: boolean }) {
  const t = useT();
  const { learner, item } = setup;
  const locale = learner.locale;
  const [entries, setEntries] = useState<Entry[]>(() => [{ id: "open", role: "tutor", text: item ? `${t("tutor.demo.open")} ${item.hints[0]}` : opening(setup, t), cards: [] }]);
  const [state, setState] = useState<DemoState>({ hintsGiven: item ? 1 : 0, tries: setup.tries ?? 0 });

  const reply = (text: string): Omit<Entry, "id" | "role"> => {
    const s = screen(text, locale);
    if (s.kind !== "ok") return { text: s.reply, cards: [], flag: s.kind };
    if (item) {
      const intent = intentOf(text);
      const r = demoReply(item, locale, intent, state);
      if (intent === "hint") setState((x) => ({ ...x, hintsGiven: x.hintsGiven + 1 }));
      return { text: r.text, cards: r.similar ? [{ type: "worked", item: r.similar }] : [] };
    }
    // No problem on screen: find practice and real sources that fit what they asked about.
    const q = text.toLowerCase();
    const ids = [...new Set([...matchSkills(text), ...SKILLS.filter((k) => k.title.en.toLowerCase().includes(q) || k.title.es.toLowerCase().includes(q)).map((k) => k.id)])].slice(0, 3);
    const sources = resourcesFor({ topic: text, grade: learner.grade, locale }).slice(0, 3);
    const cards: Card[] = ids.map((id) => ({ type: "practice", skillId: id }));
    if (sources.length) cards.push({ type: "resources", list: sources.map((r) => ({ title: r.title, source: r.source, url: r.url })) });
    return { text: cards.length ? t("tutor.demo.found") : t("tutor.demo.talkOther"), cards };
  };

  const send = (text: string) => {
    const r = reply(text);
    setEntries((e) => [...e, { id: crypto.randomUUID(), role: "learner", text, cards: [] }, { id: crypto.randomUUID(), role: "tutor", ...r }]);
  };

  return <ChatView setup={setup} board={board} entries={entries} busy={false} error={null} onSend={send} label={t("tutor.demoLabel")} />;
}

/* ------------------------------------------------------------------ view */

function ChatView({
  setup,
  board,
  entries,
  busy,
  error,
  onSend,
  onStop,
  label,
}: {
  setup: ChatSetup;
  board: boolean;
  entries: Entry[];
  busy: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onStop?: () => void;
  label: string | null;
}) {
  const t = useT();
  const { learner } = setup;
  const locale = learner.locale;
  const young = ["K", "1", "2"].includes(learner.grade);
  const settings = settingsOf(learner);
  const [input, setInput] = useState("");
  const [readAloud, setReadAloud] = useState(young);
  const speak = useSpeakStream(locale, readAloud);
  const listen = useListen(locale, (text) => onSend(text));
  const end = useRef<HTMLDivElement>(null);
  const threadId = useRef(crypto.randomUUID());
  const [startedAt] = useState(() => Date.now());
  const handled = useRef(new Set<string>());

  // Read replies aloud as they arrive; keep the transcript for grown-ups; act on safety flags and notes once.
  useEffect(() => {
    const last = entries.at(-1);
    if (last?.role === "tutor") speak.feed(last.id, last.text, !last.streaming);
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
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
    saveThread({
      id: threadId.current,
      profileId: learner.id,
      startedAt,
      surface: setup.surface,
      title: setup.title,
      flagged: entries.some((e) => e.flag && e.flag !== "offLimits") || undefined,
      lines: entries.filter((e) => e.text).map((e) => ({ role: e.role, text: e.text, at: startedAt })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per change of the conversation
  }, [entries]);

  const submit = (text: string) => {
    const clean = text.trim().slice(0, 1000);
    if (!clean || busy) return;
    speak.stop();
    onSend(clean);
    setInput("");
  };
  const quick = setup.item
    ? [t("tutor.quick.hint"), t("tutor.quick.similar"), t("tutor.quick.why")]
    : setup.homework
      ? [t("tutor.quick.whereStart"), t("tutor.quick.explain")]
      : [t("tutor.quick.fractions"), t("tutor.quick.reading"), t("tutor.quick.science")];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={`flex-1 space-y-3 overflow-y-auto ${board ? "px-1 py-4" : "px-4 py-4"}`} role="log" aria-live="polite" aria-relevant="additions">
        <p className="text-xs text-muted">
          {t("tutor.disclosure")}
          {label && <span className="ml-1 inline-flex items-center gap-1 font-medium text-ink">· {label}</span>}
        </p>
        {entries.map((e) =>
          e.role === "learner" ? (
            <p key={e.id} className="ml-10 whitespace-pre-wrap rounded-lg rounded-br-sm bg-ink px-3.5 py-2.5 text-sm text-paper">
              {e.text}
            </p>
          ) : (
            <div key={e.id} className="mr-4 space-y-2">
              {e.text && (
                <div className="flex items-start gap-2">
                  <p className={`whitespace-pre-wrap rounded-lg rounded-bl-sm bg-panel2 px-3.5 py-2.5 text-ink ${young ? "text-base" : "text-sm"} ${e.flag && e.flag !== "offLimits" ? "border border-accent/40" : ""}`}>
                    {e.text}
                    {e.streaming && <span aria-hidden="true" className="ml-1 inline-block size-2 animate-pulse rounded-full bg-muted align-middle" />}
                  </p>
                  {!e.streaming && <Hear text={e.text} />}
                </div>
              )}
              {e.cards.map((c, i) => (
                <CardView key={i} card={c} learner={learner} />
              ))}
            </div>
          ),
        )}
        {busy && entries.at(-1)?.role === "learner" && <p className="text-sm text-muted">{t("tutor.thinking")}</p>}
        {error && <p className="rounded-md border border-bad/40 bg-panel px-3 py-2 text-sm text-ink">{error}</p>}
        <div ref={end} />
      </div>
      <div className={`border-t border-border ${board ? "pt-3" : "p-3"}`}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {quick.map((q) => (
            <button key={q} type="button" disabled={busy} onClick={() => submit(q)} className="k-btn-secondary min-h-9 px-3 text-xs">
              {q}
            </button>
          ))}
          {speak.supported && (
            <button type="button" aria-pressed={readAloud} onClick={() => (readAloud && speak.stop(), setReadAloud(!readAloud))} className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs text-muted hover:bg-panel2 aria-pressed:text-accent">
              <IconSpeaker size={14} /> {readAloud ? t("tutor.readingOn") : t("tutor.readingOff")}
            </button>
          )}
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
        >
          {settings.voiceInput && listen.supported && (
            <button
              type="button"
              onClick={() => (listen.listening ? listen.stop() : listen.start())}
              aria-pressed={listen.listening}
              aria-label={listen.listening ? t("tutor.micStop") : t("tutor.micStart")}
              className={`grid size-11 shrink-0 place-items-center rounded-full border ${listen.listening ? "border-accent bg-accent text-paper" : "border-border bg-panel text-ink hover:bg-panel2"}`}
            >
              {listen.listening ? <IconStop size={18} /> : <MicIcon />}
            </button>
          )}
          <label htmlFor="tutor-say" className="sr-only">
            {t("tutor.placeholder")}
          </label>
          <textarea
            id="tutor-say"
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
            className="min-h-11 flex-1 resize-none rounded-sm border border-border bg-panel px-3 py-2.5 text-sm text-ink placeholder:text-muted/80 focus:border-accent focus:outline-none"
          />
          {busy && onStop ? (
            <button type="button" onClick={onStop} aria-label={t("tutor.stop")} className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-panel text-ink">
              <IconStop size={18} />
            </button>
          ) : (
            <button type="submit" aria-label={t("tutor.send")} disabled={!input.trim()} className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-paper disabled:opacity-30">
              <IconArrowRight size={18} />
            </button>
          )}
        </form>
        {listen.error && <p className="mt-2 text-xs text-muted">{t("tutor.micError")}</p>}
      </div>
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

function CardView({ card, learner }: { card: Card; learner: Profile }) {
  const t = useT();
  const router = useRouter();
  const locale = learner.locale;
  const [added, setAdded] = useState(false);
  switch (card.type) {
    case "visual":
      return (
        <figure className="rounded-md border border-border bg-panel p-3">
          <div className="flex justify-center">
            <VisualView visual={card.visual} alt={card.description} tint={SUBJECT_TINT.math} />
          </div>
          {card.description && <figcaption className="mt-2 text-xs text-muted">{card.description}</figcaption>}
        </figure>
      );
    case "worked":
      return <Worked item={card.item} />;
    case "practice": {
      const skill = getSkill(card.skillId)!;
      return (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-panel px-3 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-ink">{skill.title[locale]}</span>
            <span className="block text-xs text-muted">{card.reason || t("tutor.practiceCard")}</span>
          </span>
          <Button
            size="sm"
            onClick={() => {
              const id = startSet(read(), { profile: learner, kind: "pick", skillIds: [skill.id], now: Date.now() });
              if (id) router.push(`/practice/${id}`);
            }}
          >
            {t("practice.start")}
          </Button>
        </div>
      );
    }
    case "calendar":
      return (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-panel px-3 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-ink">{card.title}</span>
            <span className="block text-xs text-muted">
              {t(`event.${card.kind}`)} · {card.date}
            </span>
          </span>
          {added ? (
            <span className="inline-flex items-center gap-1 text-xs text-good">
              <IconCheck size={14} /> {t("tutor.added")}
            </span>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => (addEvent(learner.id, { title: card.title, kind: card.kind, date: card.date }, "tutor"), setAdded(true))}>
              <IconPlus size={14} /> {t("tutor.addToCalendar")}
            </Button>
          )}
        </div>
      );
    case "resources":
      return (
        <ul className="divide-y divide-border rounded-md border border-border bg-panel">
          {card.list.map((r) => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex flex-col px-3 py-2.5 hover:bg-panel2">
                <span className="text-sm font-medium text-ink underline-offset-4 hover:underline">{r.title}</span>
                <span className="text-xs text-muted">
                  {r.source} · {t("resources.opensSite")}
                </span>
              </a>
            </li>
          ))}
        </ul>
      );
    case "note":
      return <p className="text-xs text-muted">{t("tutor.noteLeft")}</p>;
  }
}

/** A similar problem with its full worked solution, so the learner can follow a model and return to theirs. */
export function Worked({ item }: { item: Item }) {
  const t = useT();
  const tint = SUBJECT_TINT[getSkill(item.skillId)?.subject ?? "math"];
  return (
    <div className="rounded-md border border-border bg-panel p-3">
      {item.visual && (
        <div className="mb-2 flex justify-center">
          <VisualView visual={item.visual} alt={item.alt ?? ""} tint={tint} />
        </div>
      )}
      <p className="font-medium text-ink">
        <MathText parts={item.prompt} />
      </p>
      <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm text-ink">
        {item.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-muted">{t("tutor.backToYours")}</p>
    </div>
  );
}
