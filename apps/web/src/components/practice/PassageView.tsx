import { useId } from "react";
import type { ReadingText } from "@/practice/types";

type Level = 2 | 3 | 4 | 5;

/**
 * The text a reading question is about, set as something to read: left-aligned body text at reading
 * weight, the title and headings as real headings (at `level`, so they fit the page's outline), and
 * fact boxes, glossaries and timelines set apart. Line breaks inside a block (poem lines, numbered
 * steps, glossary entries) are kept. `compact` is the smaller size for the tutor board and the review.
 */
export function PassageView({ texts, compact, level = 2 }: { texts: ReadingText[]; compact?: boolean; level?: Level }) {
  const id = useId();
  const Title = `h${level}` as const;
  const Heading = `h${level + 1}` as "h3" | "h4" | "h5" | "h6";
  return (
    <div className="mx-auto max-w-prose space-y-8 text-left">
      {texts.map((text, i) => (
        <article key={i} aria-labelledby={`${id}-${i}`} className="space-y-3">
          <Title id={`${id}-${i}`} className={`font-brand font-semibold text-ink ${compact ? "text-body" : "text-t2"}`}>
            {text.label ? `${text.label}: ${text.title}` : text.title}
          </Title>
          {text.blocks.map((b, k) =>
            b.kind === "heading" ? (
              <Heading key={k} className={`pt-2 font-brand font-semibold text-ink ${compact ? "text-sm" : "text-t3"}`}>
                {b.text}
              </Heading>
            ) : b.kind === "box" ? (
              <aside key={k} className={`whitespace-pre-line rounded-md border border-border bg-panel2 px-4 py-3 text-ink ${compact ? "text-xs" : "text-sm sm:text-body"}`}>
                {b.text}
              </aside>
            ) : (
              <p key={k} className={`whitespace-pre-line text-ink ${compact ? "text-sm" : "text-body sm:text-t3 sm:leading-relaxed"}`}>
                {b.text}
              </p>
            ),
          )}
        </article>
      ))}
    </div>
  );
}
