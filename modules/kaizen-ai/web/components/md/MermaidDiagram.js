'use client';

// Renders a ```mermaid fence. Mermaid is a large dependency, so it is imported
// lazily the first time a diagram actually appears — it never touches the
// dashboard's initial bundle. securityLevel 'strict' disables click-handlers /
// inline scripts in diagram source. Any parse/render error falls back to
// showing the raw source as a code block, so a malformed diagram never breaks
// the message.
//
// The mermaid theme is left at 'neutral' on purpose: it is a light, low-chroma
// theme that sits correctly on paper, and mermaid derives dozens of shades from
// its theme variables by colour maths, so feeding it token strings buys a small
// hue match at the cost of a render that can throw. The frame around it is ours.

import { useEffect, useRef, useState } from 'react';
import CodeBlock from '@/components/md/CodeBlock';

let mermaidPromise = null;
function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral', fontFamily: 'inherit' });
      return mermaid;
    });
  }
  return mermaidPromise;
}

let idSeq = 0;

export default function MermaidDiagram({ code }) {
  const [svg, setSvg] = useState('');
  const [failed, setFailed] = useState(false);
  const holder = useRef(null);

  useEffect(() => {
    let alive = true;
    const id = `mmd-${(idSeq += 1)}`;
    loadMermaid()
      .then((mermaid) => mermaid.render(id, code))
      .then(({ svg: out }) => { if (alive) { setSvg(out); setFailed(false); } })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [code]);

  if (failed) return <CodeBlock code={code} lang="mermaid" />;
  if (!svg) {
    // Same reserved-slot treatment as the streaming skeleton in MessageBody, so
    // a diagram that is still loading looks like the same missing thing.
    return (
      <div className="my-3 rounded-md border border-dashed border-border bg-panel2/60 px-4 py-6 text-center font-opmono text-micro uppercase text-muted">
        Drawing diagram…
      </div>
    );
  }
  return (
    <figure ref={holder} className="my-3 rounded-md border border-border bg-panel p-4 overflow-x-auto [&_svg]:mx-auto [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }} />
  );
}
