"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { IconCheck, IconChevronDown, IconChevronUp, IconPlus, IconSpeaker, IconStop } from "@/components/icons";
import { MathText } from "@/components/practice/MathText";
import { speakText } from "@/components/stage/hear";
import { VisualView } from "@/components/stage/visuals";
import { Badge, btn, Button, SUBJECT_TINT } from "@/components/ui";
import { useT } from "@/i18n";
import { addFromCatalogue } from "@/lib/courses";
import { dayLabel } from "@/lib/format";
import { startSet } from "@/lib/practice";
import { isReviewed } from "@/lib/review";
import { addEvent } from "@/lib/school";
import { read, useStore } from "@/lib/store";
import type { BoardCard } from "@/lib/tutor";
import type { Locale, Profile } from "@/lib/types";
import { fromLocalDate } from "@/planner/dates";
import { getSkill } from "@/practice/skills";
import type { Item } from "@/practice/types";

// The tutor's board: pictures, worked examples, cited facts, definitions, our lessons' key points,
// books, poems, practice and dates the tutor offers. Every knowledge card names its source and links to
// it. Practice starts and dates are added in one tap.

export const youngGrade = (p: Pick<Profile, "grade">) => ["K", "1", "2"].includes(p.grade);

/** Short name of a card, for "On the board: …" and the card's own label. */
export function cardLabel(card: BoardCard, t: ReturnType<typeof useT>, locale: Locale): string {
  switch (card.type) {
    case "fact":
      return card.title;
    case "definition":
      return t("tut.card.definitionOf", { word: card.word });
    case "lesson":
      return card.lessonTitle;
    case "practice":
      return t("tut.card.practice", { skill: getSkill(card.skillId)?.title[locale] ?? card.skillId });
    case "calendar":
      return card.title;
    case "books":
      return t("tut.card.books", { topic: card.topic });
    case "poem":
      return card.title;
    case "standard":
      return t("tut.card.standard", { code: card.code });
    case "resources":
      return t("tut.card.sources");
    case "visual":
      return t("tut.card.picture");
    case "worked":
      return t("tut.card.worked");
    case "note":
      return t("tutor.noteLeft");
  }
}

const speechOk = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** Reads one text aloud: 44px, or 56px for a young learner, for whom hearing it is the main way in. */
export function SayButton({ text, locale, label, big = false }: { text: string; locale: Locale; label?: string; big?: boolean }) {
  const t = useT();
  const [on, setOn] = useState(false);
  if (!speechOk() || !text) return null;
  return (
    <button
      type="button"
      aria-label={label ?? `${t("stage.readAloud")}: ${text.slice(0, 60)}`}
      aria-pressed={on}
      onClick={() => {
        if (on) {
          speechSynthesis.cancel();
          setOn(false);
        } else if (speakText(text, locale, () => setOn(false))) setOn(true);
      }}
      className={`inline-grid ${big ? "size-14" : "size-11"} shrink-0 place-items-center rounded-full border transition-colors ${on ? "border-accent bg-accent/10 text-accent" : "border-border bg-panel text-muted hover:border-ink/30 hover:text-ink"}`}
    >
      {on ? <IconStop size={18} /> : <IconSpeaker size={18} />}
    </button>
  );
}

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  const t = useT();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-medium text-ink underline underline-offset-4 hover:text-accent">
      {children}
      <span className="sr-only"> {t("tut.card.newTab")}</span>
    </a>
  );
}

function Shell({ id, label, children, aside }: { id?: string; label: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <article id={id} tabIndex={id ? -1 : undefined} aria-label={label} className="rounded-md border border-border bg-panel p-3.5 outline-none focus-visible:ring-2 focus-visible:ring-accent">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">{children}</div>
        {aside}
      </div>
    </article>
  );
}

export function CardView({ card, learner, id }: { card: BoardCard; learner: Profile; id?: string }) {
  const t = useT();
  const router = useRouter();
  const locale = learner.locale;
  const young = youngGrade(learner);
  // A date already on this learner's calendar shows as added, so the same card can't add it twice.
  const added = useStore(
    (s) => card.type === "calendar" && !!card.date && s.events.some((e) => e.profileId === learner.id && e.date === card.date && e.kind === card.kind && e.title === card.title.replace(/\s+/g, " ").trim()),
  );
  const reviewed = useStore((s) => (card.type === "practice" && getSkill(card.skillId) ? isReviewed(s, getSkill(card.skillId)!) : true));
  const label = cardLabel(card, t, locale);
  switch (card.type) {
    case "visual":
      return (
        <Shell id={id} label={label}>
          <figure>
            <div className="flex justify-center">
              <VisualView visual={card.visual} alt={card.description} tint={SUBJECT_TINT.math} />
            </div>
            {card.description && <figcaption className="mt-2 text-xs text-muted">{card.description}</figcaption>}
          </figure>
        </Shell>
      );
    case "worked":
      return (
        <Shell id={id} label={label}>
          <Worked item={card.item} />
        </Shell>
      );
    case "practice": {
      const skill = getSkill(card.skillId);
      if (!skill) return null;
      return (
        <Shell id={id} label={label}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className={`block font-medium text-ink ${young ? "text-base" : "text-sm"}`}>{skill.title[locale]}</span>
              <span className="block text-xs text-muted">{card.reason || t("tutor.practiceCard")}</span>
              {!reviewed && (
                <span className="mt-1 inline-block">
                  <Badge tone="warn">{t("practice.draft")}</Badge>
                </span>
              )}
            </span>
            <Button
              className={young ? "min-h-14 px-7 text-base" : ""}
              onClick={() => {
                const setId = startSet(read(), { profile: learner, kind: "pick", skillIds: [skill.id], now: Date.now() });
                if (setId) router.push(`/practice/${setId}`);
              }}
            >
              {t("practice.start")}
            </Button>
          </div>
        </Shell>
      );
    }
    case "calendar":
      return (
        <Shell id={id} label={label}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink">{card.title}</span>
              <span className="block text-xs text-muted">
                {card.date ? t("tut.card.calendarFor", { kind: t(`event.${card.kind}`), date: dayLabel(fromLocalDate(card.date).getTime(), locale) }) : t(`event.${card.kind}`)}
              </span>
            </span>
            {!card.date ? (
              <Link href={`/calendar?add=${card.kind === "event" ? "other" : card.kind}`} className={btn("secondary", "md")}>
                {t("tut.card.pickDate")}
              </Link>
            ) : added ? (
              <span role="status" className="inline-flex min-h-11 items-center gap-1 text-sm text-good">
                <IconCheck size={16} /> {t("tutor.added")}
              </span>
            ) : (
              <Button variant="secondary" onClick={() => addEvent(learner.id, { title: card.title, kind: card.kind, date: card.date!, skillIds: card.skillIds }, "tutor")}>
                <IconPlus size={16} /> {t("tutor.addToCalendar")}
              </Button>
            )}
          </div>
        </Shell>
      );
    case "resources":
      return (
        <Shell id={id} label={label}>
          <h3 className="text-sm font-semibold text-ink">{t("tut.card.sources")}</h3>
          <ul className="mt-1 divide-y divide-border">
            {card.list.map((r) => (
              <li key={r.url}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 flex-col justify-center py-2 hover:text-accent">
                  <span className="text-sm font-medium text-ink underline-offset-4 hover:underline">{r.title}</span>
                  <span className="text-xs text-muted">
                    {r.source} · {t("resources.opensSite")}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Shell>
      );
    case "note":
      return <p className="text-xs text-muted">{t("tutor.noteLeft")}</p>;
    case "fact":
      return (
        <Shell id={id} label={label} aside={<SayButton text={card.extract} locale={card.lang} big={young} />}>
          <h3 className="font-brand text-t3 font-semibold text-ink">{card.title}</h3>
          <blockquote cite={card.url} lang={card.lang} className="mt-1.5 border-l-2 border-border pl-3 text-sm text-ink">
            {card.extract}
          </blockquote>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span>{t("tut.card.license")}</span>
            <span aria-hidden="true">·</span>
            <SourceLink href={card.url}>{t("tut.card.readArticle")}</SourceLink>
          </p>
        </Shell>
      );
    case "definition":
      return (
        <Shell id={id} label={label} aside={<SayButton text={`${card.word}. ${card.senses.map((s) => s.text).join(" ")}`} locale="en" big={young} />}>
          <h3 className="font-brand text-t3 font-semibold text-ink" lang="en">
            {card.word}
          </h3>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-ink" lang="en">
            {card.senses.map((s, i) => (
              <li key={i}>
                {s.partOfSpeech && <span className="mr-1 italic text-muted">{s.partOfSpeech}</span>}
                {s.text}
              </li>
            ))}
          </ol>
          <p className="mt-1 text-xs text-muted">
            <SourceLink href={card.url}>{t("tut.card.dictionary")}</SourceLink>
          </p>
        </Shell>
      );
    case "lesson":
      return (
        <Shell id={id} label={label} aside={<SayButton text={[card.lead, ...card.points].filter(Boolean).join(" ")} locale={locale} big={young} />}>
          <h3 className="font-brand text-t3 font-semibold text-ink">{card.lessonTitle}</h3>
          {card.lead && <p className="mt-1 text-sm text-ink">{card.lead}</p>}
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink">
            {card.points.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="min-w-0 flex-1 text-xs text-muted">{t("tut.card.fromLesson", { lesson: card.lessonTitle, course: card.courseTitle })}</span>
            <Button
              variant="secondary"
              onClick={() => {
                const courseId = addFromCatalogue(card.catalogueId, learner.id);
                if (courseId) router.push(`/learn/${courseId}/${card.lessonId}`);
              }}
            >
              {t("tut.card.openLesson")}
            </Button>
          </div>
        </Shell>
      );
    case "books":
      return (
        <Shell id={id} label={label}>
          <h3 className="text-sm font-semibold text-ink">{t("tut.card.books", { topic: card.topic })}</h3>
          <ul className="mt-1 divide-y divide-border">
            {card.list.map((b) => (
              <li key={b.url}>
                <a href={b.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 flex-col justify-center py-2 hover:text-accent">
                  <span className="text-sm font-medium text-ink underline-offset-4 hover:underline">{b.title}</span>
                  <span className="text-xs text-muted">
                    {[b.author && t("tut.card.by", { author: b.author }), b.year, `${b.source}: ${t(b.kind === "audio" ? "tut.card.audio" : b.kind === "read" ? "tut.card.readOnline" : "tut.card.borrow")}`].filter(Boolean).join(" · ")}
                    <span className="sr-only"> {t("tut.card.newTab")}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Shell>
      );
    case "poem":
      return (
        <Shell id={id} label={label} aside={<SayButton text={`${card.title}. ${card.lines.join(" ")}`} locale="en" big={young} />}>
          <h3 className="font-brand text-t3 font-semibold text-ink" lang="en">
            {card.title}
          </h3>
          <p className="text-xs text-muted">{t("tut.card.by", { author: card.author })}</p>
          <p lang="en" className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">
            {card.lines.join("\n")}
          </p>
          <p className="mt-1 text-xs text-muted">
            <SourceLink href={card.url}>{t("tut.card.poemSource")}</SourceLink>
          </p>
        </Shell>
      );
    case "standard":
      return (
        <Shell id={id} label={label}>
          <h3 className="text-sm font-semibold text-ink">
            {t("tut.card.standard", { code: card.code })} <span className="font-normal text-muted">· {card.subject}</span>
          </h3>
          <p className="mt-1 text-sm text-ink" lang="en">
            {card.text}
          </p>
          <p className="mt-1 text-xs text-muted">
            <SourceLink href={card.url}>{t("tut.card.standardSource")}</SourceLink>
          </p>
        </Shell>
      );
  }
}

/** A similar problem with its full worked solution, so the learner can follow a model and return to theirs. */
export function Worked({ item }: { item: Item }) {
  const t = useT();
  const tint = SUBJECT_TINT[getSkill(item.skillId)?.subject ?? "math"];
  return (
    <div>
      {item.visual && (
        <div className="mb-2 flex justify-center">
          <VisualView visual={item.visual} alt={item.alt ?? ""} tint={tint} />
        </div>
      )}
      {item.picture && item.alt && (
        <div className="mb-2 flex justify-center">
          <span role="img" aria-label={item.alt} className="text-5xl leading-none">
            {item.picture}
          </span>
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

export type BoardItem = { key: string; card: BoardCard };

/**
 * The board beside the conversation: the right column on wide screens, a panel above the conversation
 * on phones that can be folded away. `items` come newest reply first.
 */
export function Board({ items, learner, open, onToggle }: { items: BoardItem[]; learner: Profile; open: boolean; onToggle: () => void }) {
  const t = useT();
  return (
    <section aria-labelledby="board-title" className="flex min-h-0 flex-col border-b border-border bg-paper lg:w-[44%] lg:max-w-xl lg:border-b-0 lg:border-l lg:pl-6">
      <div className="flex items-center gap-2 py-2 lg:py-3">
        <h2 id="board-title" className="font-brand text-t3 font-semibold text-ink">
          {t("talk.board")}
        </h2>
        {items.length > 0 && <span className="text-xs text-muted">· {t("tut.board.latest")}</span>}
        {items.length > 0 && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls="board-cards"
            className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-xs font-medium text-muted hover:bg-panel2 hover:text-ink lg:hidden"
          >
            {t("tut.board.toggle", { n: items.length })}
            {open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="pb-2 text-xs text-muted lg:rounded-md lg:border lg:border-dashed lg:border-border lg:px-4 lg:py-6 lg:text-center lg:text-sm">{t("talk.boardEmpty")}</p>
      ) : (
        <div id="board-cards" className={`${open ? "block" : "hidden"} max-h-[38dvh] min-h-0 space-y-3 overflow-y-auto pb-3 lg:block lg:max-h-none lg:flex-1`}>
          {items.map((x) => (
            <CardView key={x.key} id={`card-${x.key}`} card={x.card} learner={learner} />
          ))}
        </div>
      )}
    </section>
  );
}
