/**
 * Incremental sentence splitter over streamed text deltas (voice-16).
 *
 * The turn route already emits `sentence` frames; this module is the client
 * fallback when a stream carries only `text_delta` frames, and the pure
 * function behind it is what the tests pin. Rules:
 *
 * - A sentence ends at `.`, `!`, or `?` (runs allowed, closing quotes and
 *   brackets may follow) only once the next character has arrived and is
 *   whitespace, so "2.5" and "3.75." never split early and "2/3 + 1/6 = ?"
 *   stays one sentence until the space after the question mark.
 * - A period after a known abbreviation (Dr., e.g., vs.) or a single initial
 *   does not end a sentence.
 * - When the buffer passes `softMaxChars` without a terminator, the last clause
 *   boundary (`,`, `;`, `:` followed by a space) is emitted early so the first
 *   TTS request goes out fast; past `hardMaxChars` the last space is used.
 *
 * No I/O, no DOM. Safe to run on the server as well.
 */

export interface SentenceSplitterOptions {
  /** Emit a clause-bounded chunk once the pending text is at least this long. Default 80. */
  softMaxChars?: number;
  /** Emit at the last space once the pending text is at least this long. Default 240. */
  hardMaxChars?: number;
  /** Minimum length of an early (clause or space) chunk. Default 24. */
  minChunkChars?: number;
}

export interface SentenceSplitter {
  /** Feed a delta; returns the sentences completed by it (possibly none). */
  push(delta: string): string[];
  /** Emit whatever is pending as a final sentence (end of turn). */
  flush(): string[];
  /** Text received but not yet emitted. */
  pending(): string;
}

const ABBREVIATIONS = new Set([
  'dr',
  'mr',
  'mrs',
  'ms',
  'prof',
  'sr',
  'jr',
  'st',
  'vs',
  'etc',
  'e.g',
  'i.e',
  'approx',
  'no',
  'fig',
  'eq',
  'ch',
  'pg',
  'p',
  'pp',
  'a.m',
  'p.m',
]);

const TERMINATOR = /[.!?]+["')\]]*$/;

/** True when the text ending at `end` (exclusive) closes a sentence. */
function closesSentence(text: string, end: number): boolean {
  const head = text.slice(0, end);
  const match = TERMINATOR.exec(head);
  if (!match) return false;
  const punctuation = match[0].replace(/["')\]]+$/, '');
  if (!punctuation.includes('.')) return true;
  if (punctuation.length > 1) return true; // "..." or "?!" are always terminal
  // A period: reject abbreviations and single-letter initials.
  const before = head.slice(0, head.length - match[0].length);
  const wordMatch = /([A-Za-z][A-Za-z.]*)$/.exec(before);
  if (wordMatch) {
    const word = wordMatch[1].toLowerCase();
    if (ABBREVIATIONS.has(word)) return false;
    if (word.length === 1 && wordMatch[1] === wordMatch[1].toUpperCase()) return false;
  }
  return true;
}

/**
 * Index of the first whitespace that follows a sentence terminator in `text`,
 * or -1 when no complete sentence is pending yet.
 */
function findTerminator(text: string): number {
  for (let i = 1; i < text.length; i += 1) {
    const ch = text[i];
    if (ch !== ' ' && ch !== '\n' && ch !== '\t' && ch !== '\r') continue;
    const prev = text[i - 1];
    if (prev === '.' || prev === '!' || prev === '?' || '"\')]'.includes(prev)) {
      if (closesSentence(text, i)) return i;
    }
  }
  return -1;
}

function findEarlyBreak(text: string, options: Required<SentenceSplitterOptions>): number {
  if (text.length < options.softMaxChars) return -1;
  // The first clause boundary past the minimum keeps the first chunk short.
  for (let i = options.minChunkChars; i < text.length; i += 1) {
    const ch = text[i];
    const prev = text[i - 1];
    if ((ch === ' ' || ch === '\n') && (prev === ',' || prev === ';' || prev === ':')) {
      return i;
    }
  }
  if (text.length < options.hardMaxChars) return -1;
  const space = text.lastIndexOf(' ', options.hardMaxChars);
  return space >= options.minChunkChars ? space : -1;
}

export function createSentenceSplitter(options: SentenceSplitterOptions = {}): SentenceSplitter {
  const resolved: Required<SentenceSplitterOptions> = {
    softMaxChars: options.softMaxChars ?? 80,
    hardMaxChars: options.hardMaxChars ?? 240,
    minChunkChars: options.minChunkChars ?? 24,
  };
  let buffer = '';

  const drain = (): string[] => {
    const out: string[] = [];
    for (;;) {
      const terminator = findTerminator(buffer);
      const cut = terminator !== -1 ? terminator : findEarlyBreak(buffer, resolved);
      if (cut === -1) break;
      const sentence = buffer.slice(0, cut).trim();
      buffer = buffer.slice(cut).replace(/^\s+/, '');
      if (sentence) out.push(sentence);
    }
    return out;
  };

  return {
    push(delta: string): string[] {
      if (!delta) return [];
      buffer += delta;
      return drain();
    },
    flush(): string[] {
      const out = drain();
      const rest = buffer.trim();
      buffer = '';
      if (rest) out.push(rest);
      return out;
    },
    pending(): string {
      return buffer;
    },
  };
}

/** Split a complete text into sentences with the same rules. */
export function splitSentences(text: string, options: SentenceSplitterOptions = {}): string[] {
  const splitter = createSentenceSplitter(options);
  return [...splitter.push(text), ...splitter.flush()];
}
