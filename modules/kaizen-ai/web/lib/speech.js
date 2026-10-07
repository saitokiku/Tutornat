// Turn a rich Markdown/LaTeX tutor reply into something natural to READ ALOUD.
// Graphs/diagrams/code become a short spoken note; LaTeX becomes words
// ("\frac{a}{b}" → "a over b"); markdown punctuation is stripped. Used by the
// voice loop so the TTS never spells out symbols or reads "asterisk".

function humanizeMath(m) {
  return String(m)
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, ' $1 over $2 ')
    .replace(/\\d?frac/g, ' fraction ')
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, ' the square root of $1 ')
    .replace(/\\sqrt/g, ' square root ')
    .replace(/\^\s*\{?\s*2\s*\}?/g, ' squared ')
    .replace(/\^\s*\{?\s*3\s*\}?/g, ' cubed ')
    .replace(/\^\s*\{?([^\s{}]+)\}?/g, ' to the power $1 ')
    .replace(/_\s*\{?([^\s{}]+)\}?/g, ' sub $1 ')
    .replace(/\\times/g, ' times ')
    .replace(/\\cdot/g, ' times ')
    .replace(/\\div/g, ' divided by ')
    .replace(/\\pm/g, ' plus or minus ')
    .replace(/\\leq?|\\le\b/g, ' less than or equal to ')
    .replace(/\\geq?|\\ge\b/g, ' greater than or equal to ')
    .replace(/\\neq|\\ne\b/g, ' not equal to ')
    .replace(/\\approx/g, ' approximately ')
    .replace(/\\infty/g, ' infinity ')
    .replace(/\\pi\b/g, ' pi ')
    .replace(/\\theta\b/g, ' theta ')
    .replace(/\\alpha\b/g, ' alpha ')
    .replace(/\\beta\b/g, ' beta ')
    .replace(/\\[a-zA-Z]+/g, ' ')       // drop any remaining commands
    .replace(/[{}\\]/g, ' ')
    .replace(/\*/g, ' times ')
    .replace(/\//g, ' over ')
    .replace(/=/g, ' equals ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function speakable(text) {
  let t = String(text || '');
  // fenced blocks (code, graph, mermaid) → a short spoken note
  t = t.replace(/```(\w*)\n?[\s\S]*?```/g, (_, lang) =>
    /graph|mermaid/i.test(lang) ? ' I’ve put a diagram on your screen. ' : ' I’ve written some code on your screen. ');
  // unterminated trailing fence (mid-stream) → drop it
  t = t.replace(/```[\s\S]*$/g, ' ');
  // display + inline math → words
  t = t.replace(/\$\$([\s\S]*?)\$\$/g, (_, m) => ` ${humanizeMath(m)} `);
  t = t.replace(/\$([^$\n]+?)\$/g, (_, m) => ` ${humanizeMath(m)} `);
  // markdown noise
  t = t
    .replace(/!\[.*?\]\(.*?\)/g, ' ')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[*_`#>|~]/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}
