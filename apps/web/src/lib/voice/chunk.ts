import type { SpeakSource } from "./types";

// Streaming replies become speakable sentences the moment each one is complete, so the first sentence
// is heard while the rest is still being written. When in doubt it does not split: two sentences read
// as one sound fine, "Dr." read as a sentence of its own does not. Splits only ever happen at
// whitespace, so the words of the sentences are exactly the words of the text (word indexes line up).

const TERMINAL = ".?!…";
const CLOSERS = `"'”’)]»`;
// Month abbreviations, English and Spanish ("Oct. 12", "12 dic. 2026").
const MONTHS = ["jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec", "ene", "abr", "ago", "dic"];
// Abbreviations whose period never ends a sentence (lowercased, without the final period).
const ABBREV = new Set([
  "mr", "mrs", "ms", "mx", "dr", "prof", "st", "jr", "sr", "vs", "e.g", "i.e", "fig", "approx", "p", "pp", "vol", "ch", "no", "nos",
  "u.s", "a.m", "p.m", "sra", "srta", "dra", "ud", "uds", "lic", "ing", "núm", "pág", "págs", "cap", "aprox", "av", "ee", "uu", "ee.uu", "a.c", "d.c",
  "etc", "ej",
  ...MONTHS,
]);
// "no." is a real word too ("I said no.", "Vamos al mar."), so these only count as abbreviations
// before a number ("No. 5", "Oct. 12", "mar. 3").
const BEFORE_NUMBER_ONLY = new Set(["no", "nos", "p", "pp", "fig", "vol", "ch", "núm", "pág", "págs", "cap", ...MONTHS]);

export type ChunkOptions = {
  /** Split a run-on sentence at a clause mark once it grows past this. Never at a bare space. */
  maxChars?: number;
  /** The first sentence splits earlier, at a clause, so the first audio starts sooner. */
  firstMaxChars?: number;
  /**
   * "voice": a spoken reply — the first sentence is cut only past 60 characters, and only at ";", ":",
   * " — " or ", and / but / so / because" (y, pero, así que, porque). "narration": whole-text reading,
   * no early first cut. "text" (default): as before, at any clause mark.
   */
  mode?: "voice" | "narration" | "text";
};

type Decision = "split" | "no" | "wait";

function decide(buf: string, i: number, j: number, final: boolean): Decision {
  if (j >= buf.length) return final ? "split" : "wait";
  if (!/\s/.test(buf[j])) return "no"; // 3.14, e.g., U.S.A, "word."next
  let k = j;
  while (k < buf.length && /\s/.test(buf[k])) k++;
  if (k >= buf.length) return buf.slice(j).includes("\n") || final ? "split" : "wait";
  const next = buf[k];
  if (/\p{Ll}/u.test(next)) return "no"; // "approx. five", "Really?" she asked, "Hmm... let me see"
  const run = buf.slice(i, j).replace(/["'”’)\]»]+$/, "");
  if (run === ".") {
    const before = buf.slice(0, i);
    if (/^\s*\d{1,3}$/.test(before)) return "no"; // "1. Add the ones" (a list marker)
    const word = /[\p{L}\p{N}.]*$/u.exec(before)?.[0].replace(/^\.+/, "") ?? "";
    const lower = word.toLowerCase();
    if (ABBREV.has(lower) && (!BEFORE_NUMBER_ONLY.has(lower) || /\p{N}/u.test(next))) return "no";
    if (/^\p{Lu}$/u.test(word)) return "no"; // initials: J. K. Rowling
  }
  return "split";
}

/** Where to cut a segment that ran past `limit`: after the last clause mark inside it; never at a bare space. */
function forcedCut(buf: string, limit: number): number {
  const head = buf.slice(0, limit);
  let cut = -1;
  for (const m of head.matchAll(/[,;:—–](?=\s)/g)) if (m.index >= 30) cut = m.index + 1;
  return cut;
}

// A spoken first sentence is cut only where a speaker would breathe.
const VOICE_CLAUSE = /[;:](?=\s)|\s[—–](?=\s)|,(?=\s+(?:and|but|so|because|y|pero|así que|porque)\b)/giu;

/** The voice mode's first cut: the first clause mark 20 or more characters in. */
function voiceCut(buf: string): number {
  for (const m of buf.matchAll(VOICE_CLAUSE)) if (m.index >= 20) return m.index + m[0].length;
  return -1;
}

export function createChunker({ maxChars = 220, firstMaxChars, mode = "text" }: ChunkOptions = {}) {
  const firstLimit = firstMaxChars ?? (mode === "voice" ? 60 : mode === "narration" ? Infinity : 120);
  let buf = "";
  let first = true;
  let out: string[] = [];

  const emit = (s: string) => {
    const t = s.trim();
    if (!t) return;
    out.push(t);
    first = false;
  };

  function scan(final: boolean) {
    let i = 0;
    while (i < buf.length) {
      const c = buf[i];
      if (c === "\n") {
        emit(buf.slice(0, i));
        buf = buf.slice(i + 1);
        i = 0;
        continue;
      }
      if (TERMINAL.includes(c)) {
        let j = i;
        while (j < buf.length && TERMINAL.includes(buf[j])) j++;
        while (j < buf.length && CLOSERS.includes(buf[j])) j++;
        const d = decide(buf, i, j, final);
        if (d === "wait") break;
        if (d === "split") {
          emit(buf.slice(0, j));
          buf = buf.slice(j);
          i = 0;
          continue;
        }
        i = j;
        continue;
      }
      i++;
    }
    if (final) return;
    // A sentence that keeps going: speak it in clause-sized parts rather than wait.
    for (;;) {
      const text = buf.trimStart();
      const lead = buf.length - text.length;
      const limit = first ? firstLimit : maxChars;
      if (text.length <= limit) return;
      let cut = first && mode === "voice" ? voiceCut(text) : forcedCut(text, limit);
      if (cut < 0 && text.length > maxChars) cut = forcedCut(text, maxChars);
      if (cut < 0) return;
      emit(text.slice(0, cut));
      buf = buf.slice(lead + cut);
    }
  }

  return {
    /** Adds streamed text; returns the sentences it completed. */
    push(delta: string): string[] {
      buf += delta.replace(/\r\n?/g, "\n");
      scan(false);
      const done = out;
      out = [];
      return done;
    },
    /** The reply is over; returns whatever is left as sentences. */
    end(): string[] {
      scan(true);
      emit(buf);
      buf = "";
      const done = out;
      out = [];
      return done;
    },
    /** Text not yet returned as a sentence. */
    pending: () => buf,
  };
}

export type Chunker = ReturnType<typeof createChunker>;

/** A whole text, as sentences. */
export function splitSentences(text: string, opts?: ChunkOptions): string[] {
  const c = createChunker(opts);
  return [...c.push(text), ...c.end()];
}

/** A push-to-pull queue: values pushed in come out of the async iterator in order. */
export function asyncQueue<T>() {
  const items: T[] = [];
  let ended = false;
  let wake: (() => void) | null = null;
  const poke = () => {
    wake?.();
    wake = null;
  };
  return {
    push(v: T) {
      if (ended) return;
      items.push(v);
      poke();
    },
    end() {
      ended = true;
      poke();
    },
    get ended() {
      return ended;
    },
    async *[Symbol.asyncIterator](): AsyncGenerator<T> {
      for (;;) {
        if (items.length) {
          yield items.shift() as T;
          continue;
        }
        if (ended) return;
        await new Promise<void>((r) => (wake = r));
      }
    },
  };
}

export type FeedOptions = ChunkOptions & {
  /**
   * The sentence-release point: each sentence passes here, in order, before it is spoken (index from
   * 0). Return it (or a replacement) to speak it, null to hold it back. Output admission and the
   * latency log ("first sentence released") hook in here.
   */
  release?: (sentence: string, index: number) => string | null;
};

/**
 * Feeds a reply as it streams and hands out sentences as they complete, for `speechOut.speak(feed.sentences)`.
 * write() takes new text; set() takes the whole reply so far (it speaks only what was added);
 * partDone() says a text part of the reply is finished, so its last sentence is spoken at once.
 */
export function sentenceFeed(opts?: FeedOptions) {
  const chunker = createChunker(opts);
  const q = asyncQueue<string>();
  let seen = "";
  let released = 0;
  const push = (s: string) => {
    const out = opts?.release ? opts.release(s, released) : s;
    released++;
    if (out?.trim()) q.push(out);
  };
  const write = (delta: string) => {
    if (q.ended || !delta) return;
    seen += delta;
    for (const s of chunker.push(delta)) push(s);
  };
  return {
    sentences: q as AsyncIterable<string>,
    write,
    set(full: string) {
      if (full.startsWith(seen)) write(full.slice(seen.length));
    },
    /** A text part of the reply is done (a tool call follows): its last sentence goes now, and the next part never glues onto it. */
    partDone() {
      write("\n");
    },
    /** The reply is complete: the rest is spoken. */
    end() {
      if (q.ended) return;
      for (const s of chunker.end()) push(s);
      q.end();
    },
    /** Stop feeding without speaking what's left. */
    abort() {
      q.end();
    },
  };
}

/** Text deltas (a model stream, a fetch body reader) → sentences as each completes. */
export async function* sentencesOf(deltas: AsyncIterable<string>, opts?: ChunkOptions): AsyncGenerator<string> {
  const c = createChunker(opts);
  for await (const d of deltas) yield* c.push(d);
  yield* c.end();
}

/** Any SpeakSource as an async stream of sentences (a plain string is split here). */
export async function* sentencesFrom(source: SpeakSource): AsyncGenerator<string> {
  if (typeof source === "string") {
    yield* splitSentences(source);
    return;
  }
  for await (const s of source as AsyncIterable<string>) if (s.trim()) yield s.trim();
}
