'use client';

// Syntax-highlighted code with a copy button. PrismLight keeps only a handful
// of languages in the bundle instead of all of Prism.
//
// The frame is ours (paper well, hairline, panel2 rail, mono micro labels); the
// token colors inside come from Prism's oneLight, which is the one place a
// third-party palette is allowed to reach the screen. The product is light top
// to bottom, so there is no dark code well anywhere.

import { useState } from 'react';
import { IconCheck } from '@/components/Icons';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';

SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('js', javascript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('py', python);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('html', markup);
SyntaxHighlighter.registerLanguage('xml', markup);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('sql', sql);

const KNOWN = new Set(['jsx', 'javascript', 'js', 'python', 'py', 'json', 'bash', 'sh', 'html', 'xml', 'css', 'sql']);

export default function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  const language = KNOWN.has(lang) ? lang : 'text';

  async function copy() {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* noop */ }
  }

  return (
    <div className="my-3 rounded-md border border-border overflow-hidden bg-paper">
      <div className="flex items-center justify-between gap-3 px-3 py-1.5 border-b border-border bg-panel2">
        <span className="k-label">{lang || 'text'}</span>
        <button onClick={copy} className="inline-flex items-center gap-1 font-opmono text-micro uppercase text-muted transition-colors hover:text-accent">
          {copied ? <><IconCheck size={11} />Copied</> : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneLight}
        customStyle={{ margin: 0, background: 'transparent', fontSize: '0.8125rem', lineHeight: 1.55, padding: '12px 14px' }}
        codeTagProps={{ style: { fontFamily: 'var(--font-opmono), ui-monospace, SFMono-Regular, Menlo, monospace' } }}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
