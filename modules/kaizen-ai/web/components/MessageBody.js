'use client';

// Rich renderer for assistant messages. Markdown (GFM) + LaTeX math (KaTeX) +
// syntax-highlighted code + safe function graphs + lazy mermaid diagrams.
//
// Safety: react-markdown with NO rehype-raw means raw HTML in the model output
// is inert (escaped, never parsed) — XSS-safe by construction. Links are
// sanitized by react-markdown's default url transform and open in a new tab.
//
// Streaming: while `live` (the message is still streaming), heavy graphics show
// a lightweight skeleton instead of re-rendering every token; an unclosed code
// fence just renders as a plain code block. The component is memoized so the
// finished messages above the streaming one never re-render.

import 'katex/dist/katex.min.css';
import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import CodeBlock from '@/components/md/CodeBlock';
import FunctionGraph from '@/components/md/FunctionGraph';
import MermaidDiagram from '@/components/md/MermaidDiagram';
import ImageGen from '@/components/md/ImageGen';

const remarkPlugins = [remarkGfm, remarkMath, remarkBreaks];
const rehypePlugins = [[rehypeKatex, { throwOnError: false, errorColor: 'rgb(var(--c-accent))', strict: 'ignore' }]];

// A widget that has not been drawn yet reads as a reserved slot, not as a
// finished element: dashed hairline, inset fill, and the label in the record
// font so it is legible as machine state rather than as prose the model wrote.
function Skeleton({ label }) {
  return (
    <div className="my-3 rounded-md border border-dashed border-border bg-panel2/60 px-4 py-6 text-center font-opmono text-micro uppercase text-muted animate-pulse">
      {label}
    </div>
  );
}

function makeComponents(live) {
  return {
    // Unwrap <pre> so block widgets aren't nested inside a <pre> element.
    pre: ({ children }) => <>{children}</>,
    a: ({ children, href }) => (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-accent underline underline-offset-2">{children}</a>
    ),
    code({ className, children }) {
      const text = String(children ?? '');
      const match = /language-(\w+)/.exec(className || '');
      const isBlock = !!match || text.includes('\n');
      if (!isBlock) return <code className="k-inline-code">{children}</code>;

      const code = text.replace(/\n$/, '');
      const lang = (match?.[1] || '').toLowerCase();

      if (lang === 'graph') {
        if (live) return <Skeleton label="Plotting graph…" />;
        try { return <FunctionGraph spec={JSON.parse(code)} />; }
        catch { return <CodeBlock code={code} lang="graph" />; }
      }
      if (lang === 'mermaid') {
        if (live) return <Skeleton label="Drawing diagram…" />;
        return <MermaidDiagram code={code} />;
      }
      if (lang === 'image') {
        if (live) return <Skeleton label="…" />;
        return <ImageGen prompt={code.trim()} />;
      }
      return <CodeBlock code={code} lang={lang} />;
    },
  };
}

const liveComponents = makeComponents(true);
const doneComponents = makeComponents(false);

function MessageBody({ content, live = false }) {
  return (
    <div className="k-md">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={live ? liveComponents : doneComponents}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  );
}

// Re-render only when this message's own content or live-ness changes — so the
// streaming message updating never re-renders the stable messages above it.
export default memo(MessageBody, (a, b) => a.content === b.content && a.live === b.live);
