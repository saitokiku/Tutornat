/**
 * The incremental parser for the tutor's output grammar (spec §5.2, R2;
 * `lib/tutor/prompts/whiteboard.md`). Everything the model writes is speech
 * except `[[name payload]]` tags, which are stripped from the speech and
 * executed the moment they close.
 *
 * Incremental means a tag may arrive split across any number of stream chunks:
 * `[[wb {"type":"wb_`, `draw_latex"...}]]`. The parser buffers a partial tag
 * and never emits half of one, and it holds back a trailing `[` (or `]`) that
 * could still turn into a delimiter. `]]` inside a JSON string is not a
 * terminator, so `{"content":"a]]b"}` survives, and neither is one inside an
 * open bracket or brace, so a nested array (`"points":[[40,110],[240,110]]`,
 * a table's rows) closes its own brackets before the tag closes.
 *
 * Pure: no I/O, no clock. The engine turns the events into SSE frames.
 */

/** One tag the model closed: the name and the raw payload text after it. */
export interface RawTag {
  name: string;
  /** Everything between the name and `]]`, trimmed. Empty for `[[hint]]`. */
  body: string;
}

export type TagEvent = { kind: 'text'; text: string } | { kind: 'tag'; tag: RawTag };

/**
 * A tag longer than this never closes in practice; the parser gives up on it,
 * drops it, and returns to speech so one malformed tag cannot swallow a turn.
 */
export const MAX_TAG_CHARS = 4_000;

/** Tag names the engine understands; anything else is dropped as unknown. */
export const TAG_NAMES = ['wb', 'check', 'hint', 'reaction', 'topic'] as const;
export type TagName = (typeof TAG_NAMES)[number];

export function isTagName(value: string): value is TagName {
  return (TAG_NAMES as readonly string[]).includes(value);
}

export interface TagParser {
  /** Feed one stream chunk; returns the speech and tags it completed. */
  push(chunk: string): TagEvent[];
  /** End of stream: emits held-back speech and drops any unterminated tag. */
  flush(): TagEvent[];
  /** Tags abandoned because they never closed (counted as drops). */
  readonly abandoned: number;
}

function splitTag(raw: string): RawTag | null {
  const trimmed = raw.trimStart();
  const match = /^([A-Za-z_][A-Za-z0-9_-]*)/.exec(trimmed);
  if (!match) return null;
  const name = match[1]!;
  return { name, body: trimmed.slice(name.length).trim() };
}

/**
 * `[[` opens a tag, `]]` closes it, but only outside a JSON string (the model
 * writes `\\frac` and quoted prose inside the payload) and only once every
 * bracket and brace the payload opened has closed again. Depth never goes
 * below zero, so a stray `}` cannot leave a tag that no `]]` can close.
 */
export function createTagParser(): TagParser {
  let text = '';
  let tag: string | null = null;
  let inString = false;
  let escaped = false;
  let depth = 0;
  let abandoned = 0;

  /** Speech is safe to emit except a trailing `[` that may become `[[`. */
  const drainText = (): string => {
    let cut = text.length;
    if (text.endsWith('[')) cut -= 1;
    const out = text.slice(0, cut);
    text = text.slice(cut);
    return out;
  };

  const consume = (chunk: string, events: TagEvent[]): void => {
    for (const ch of chunk) {
      if (tag === null) {
        text += ch;
        if (text.endsWith('[[')) {
          const speech = text.slice(0, -2);
          text = '';
          if (speech) events.push({ kind: 'text', text: speech });
          tag = '';
          inString = false;
          escaped = false;
          depth = 0;
        }
        continue;
      }
      // Inside a tag.
      if (inString) {
        tag += ch;
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
      } else if (ch === '"') {
        tag += ch;
        inString = true;
      } else {
        tag += ch;
        if (ch === '{' || ch === '[') depth += 1;
        else if (ch === '}' || ch === ']') depth = Math.max(0, depth - 1);
        if (depth === 0 && tag.endsWith(']]')) {
          const parsed = splitTag(tag.slice(0, -2));
          tag = null;
          if (parsed) events.push({ kind: 'tag', tag: parsed });
          else abandoned += 1;
          continue;
        }
      }
      if (tag !== null && tag.length > MAX_TAG_CHARS) {
        // Unterminated: drop it and go back to speech rather than stall.
        tag = null;
        inString = false;
        escaped = false;
        depth = 0;
        abandoned += 1;
      }
    }
  };

  return {
    push(chunk: string): TagEvent[] {
      if (!chunk) return [];
      const events: TagEvent[] = [];
      consume(chunk, events);
      if (tag === null) {
        const speech = drainText();
        if (speech) events.push({ kind: 'text', text: speech });
      }
      return events;
    },
    flush(): TagEvent[] {
      const events: TagEvent[] = [];
      if (tag !== null) {
        tag = null;
        inString = false;
        escaped = false;
        depth = 0;
        abandoned += 1;
      }
      const speech = text;
      text = '';
      if (speech) events.push({ kind: 'text', text: speech });
      return events;
    },
    get abandoned(): number {
      return abandoned;
    },
  };
}

/** Convenience for tests and evals: parse a complete model reply in one go. */
export function parseTags(reply: string): { text: string; tags: RawTag[]; abandoned: number } {
  const parser = createTagParser();
  const events = [...parser.push(reply), ...parser.flush()];
  return {
    text: events
      .filter((event): event is { kind: 'text'; text: string } => event.kind === 'text')
      .map((event) => event.text)
      .join(''),
    tags: events
      .filter((event): event is { kind: 'tag'; tag: RawTag } => event.kind === 'tag')
      .map((event) => event.tag),
    abandoned: parser.abandoned,
  };
}
