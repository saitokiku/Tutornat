'use client';

import katex from 'katex';
import { useMemo } from 'react';

/**
 * Renders problem text that carries inline maths, which is how coursework
 * arrives: the extraction prompt asks for Markdown with `$…$` spans, so a
 * worksheet reaches us as "Write three fractions equivalent to $\frac{2}{3}$".
 * Printed as a plain string that reads as source code to a ten-year-old.
 *
 * Only the maths spans are handed to KaTeX. Everything between them stays an
 * ordinary React text node, so it is escaped by React and can never become
 * markup. KaTeX is called with `trust: false`, which refuses the commands that
 * can emit arbitrary HTML or follow a URL (`\href`, `\url`, `\includegraphics`),
 * and with `throwOnError: false` so a malformed formula degrades to visible
 * red source rather than taking the page down. That matters here because the
 * text is model-authored and shown to a child: the product's rule is that
 * un-reviewed model output is never rendered as HTML, and structured maths
 * rendering under those two flags is the exception that keeps the rule.
 */

/** `$…$` and `$$…$$`, skipping `\$` so a literal dollar sign survives. */
const MATH = /\$\$([\s\S]+?)\$\$|(?<!\\)\$([^$\n]+?)(?<!\\)\$/g;

interface Segment {
  kind: 'text' | 'math';
  value: string;
  display: boolean;
}

export function splitMath(source: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const match of source.matchAll(MATH)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      segments.push({ kind: 'text', value: source.slice(cursor, start), display: false });
    }
    const display = match[1] !== undefined;
    segments.push({ kind: 'math', value: (match[1] ?? match[2] ?? '').trim(), display });
    cursor = start + match[0].length;
  }
  if (cursor < source.length) {
    segments.push({ kind: 'text', value: source.slice(cursor), display: false });
  }
  return segments;
}

export function MathText({ children, className }: { children: string; className?: string }) {
  const segments = useMemo(() => splitMath(children), [children]);
  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.kind === 'text' ? (
          // eslint-disable-next-line react/no-array-index-key -- segments are positional
          <span key={index}>{segment.value}</span>
        ) : (
          <span
            // eslint-disable-next-line react/no-array-index-key -- segments are positional
            key={index}
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(segment.value, {
                displayMode: segment.display,
                throwOnError: false,
                trust: false,
                strict: false,
                output: 'html',
              }),
            }}
          />
        ),
      )}
    </span>
  );
}
