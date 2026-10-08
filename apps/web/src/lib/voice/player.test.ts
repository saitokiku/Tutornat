import { describe, expect, it } from "vitest";
import { FakeAudio } from "./fakes";
import { createPlayer, LEAD_MS } from "./player";
import { speakable } from "./speakable";
import type { Band } from "./types";

// The player on a clock the test moves. Audio is fake (silence), timings are ElevenLabs-shaped
// character alignments relative to each chunk. 1 character = 50 ms of audio.

const SR = 24000;
const MS_PER_CHAR = 50;

function setup(band: Band = "69") {
  const ctx = new FakeAudio();
  let clock = 1000;
  const now = () => clock;
  const seen = { scheduled: [] as [number, number][], boundaries: [] as number[], starts: [] as number[], stalls: 0 };
  const player = createPlayer({
    ctx: ctx as unknown as AudioContext,
    sampleRate: SR,
    band,
    now,
    onWordScheduled: (w, at) => seen.scheduled.push([w, at]),
    onBoundary: (w) => seen.boundaries.push(w),
    onStart: (at) => seen.starts.push(at),
    onStall: () => seen.stalls++,
  });
  const advance = (ms: number) => {
    clock += ms;
    ctx.advance(ms);
    player.tick();
  };
  return { ctx, player, seen, advance, setClock: (ms: number) => (clock = ms) };
}

/** Sends `sentences` (written text) and returns what the vendor would get. */
function send(player: ReturnType<typeof createPlayer>, sentences: string[]) {
  let base = 0;
  const spoken: string[] = [];
  for (const s of sentences) {
    const sp = speakable(s, "en");
    player.addSentence(sp.text, sp.words.map((w) => base + w), /\?\s*$/.test(s));
    base += s.split(/\s+/).filter(Boolean).length;
    spoken.push(`${sp.text} `);
  }
  return spoken.join("");
}

/** The vendor's reply to `text`, cut into chunks at the given character counts. */
function chunks(text: string, sizes: number[]) {
  const out: { pcm: Float32Array; al: { chars: string[]; charStartTimesMs: number[] } }[] = [];
  let i = 0;
  for (const n of [...sizes, Infinity]) {
    const part = [...text.slice(i, i + n)];
    if (!part.length) break;
    out.push({ pcm: new Float32Array((part.length * MS_PER_CHAR * SR) / 1000), al: { chars: part, charStartTimesMs: part.map((_, k) => k * MS_PER_CHAR) } });
    i += n;
  }
  return out;
}

describe("the player", () => {
  it("holds the first audio until 150 ms is buffered, then fades in over 10 ms", () => {
    const { ctx, player, seen } = setup();
    const text = send(player, ["Hi there."]);
    const [a, b] = chunks(text, [2]); // "Hi" = 100 ms, not enough yet
    player.push(a.pcm, a.al);
    expect(ctx.sources).toHaveLength(0);
    player.push(b.pcm, b.al);
    player.end();
    expect(ctx.sources.length).toBeGreaterThan(0);
    expect(ctx.sources[0].at).toBeCloseTo(LEAD_MS / 1000, 5);
    expect(seen.starts).toHaveLength(1);
    const gain = ctx.gains[0].gain;
    expect(gain.events.find((e) => e.type === "set")?.value).toBe(0);
    expect(gain.lastRamp()).toMatchObject({ value: 1, at: ctx.sources[0].at + 0.01 });
  });

  it("starts after 250 ms even with less than 150 ms buffered", () => {
    const { ctx, player, advance } = setup();
    const text = send(player, ["Hi there."]);
    const [a] = chunks(text, [2]);
    player.push(a.pcm, a.al);
    advance(200);
    expect(ctx.sources).toHaveLength(0);
    advance(60);
    expect(ctx.sources).toHaveLength(1);
  });

  it("adds the output latency to when a word is heard", () => {
    const { ctx, player, seen } = setup();
    ctx.outputLatency = 0.2;
    const text = send(player, ["One two."]);
    for (const c of chunks(text, [])) player.push(c.pcm, c.al);
    player.end();
    // "two" starts 4 characters in: 200 ms after the 50 ms lead, heard 200 ms later still.
    expect(seen.scheduled).toEqual([
      [0, 1000 + 50 + 200],
      [1, 1000 + 50 + 200 + 200],
    ]);
  });

  it("schedules only up to the newest word start, so a gap never cuts a word", () => {
    const { ctx, player } = setup();
    const text = send(player, ["Seven eight nine."]);
    const [a, b] = chunks(text, [8]); // "Seven ei"
    player.push(a.pcm, a.al);
    const samples = ctx.sources.reduce((n, s) => n + s.length, 0);
    // Held at the start of "eight" (6 characters), not at the end of the chunk (8).
    expect(samples).toBe((6 * MS_PER_CHAR * SR) / 1000);
    player.push(b.pcm, b.al);
    player.end();
    expect(ctx.sources.reduce((n, s) => n + s.length, 0)).toBe((text.length * MS_PER_CHAR * SR) / 1000);
  });

  it("puts the band's pause before each sentence after the first, and more before a K–2 question", () => {
    for (const [band, gap] of [["69", 0.12], ["35", 0.25], ["k2", 0.7]] as const) {
      const { ctx, player } = setup(band);
      const text = send(player, ["One two.", "Is it three?"]);
      for (const c of chunks(text, [])) player.push(c.pcm, c.al);
      player.end();
      const first = ctx.sources[0];
      const second = ctx.sources[ctx.sources.length - 1];
      // The second sentence starts at its first character (9 in: "One two. "), plus the pause.
      expect(second.at - (first.at + first.duration)).toBeCloseTo(gap, 5);
      expect(first.length).toBe((9 * MS_PER_CHAR * SR) / 1000);
    }
  });

  it("a sentence that arrives after a gap longer than the pause gets no extra pause", () => {
    const { ctx, player, advance } = setup("k2");
    const s1 = send(player, ["One two."]);
    for (const c of chunks(s1, [])) player.push(c.pcm, c.al);
    advance(2000); // the first sentence has played; the model is slow with the second
    const sp = speakable("Three four.", "en");
    player.addSentence(sp.text, [2, 3], false);
    for (const c of chunks(`${sp.text} `, [])) player.push(c.pcm, c.al);
    player.end();
    const last = ctx.sources[ctx.sources.length - 1];
    expect(last.at).toBeCloseTo(ctx.currentTime + LEAD_MS / 1000, 5);
  });

  it("keeps word indexes when the timings leave out or add spaces between sentences", () => {
    const { player, seen } = setup();
    const text = send(player, ["One two.", "Three four."]);
    const [s1, s2] = text.split("Three");
    // The vendor's timings: no trailing space on the first, two leading spaces on the second.
    for (const c of [...chunks(s1.trimEnd(), []), ...chunks(`  Three${s2}`, [])]) player.push(c.pcm, c.al);
    player.end();
    expect(seen.scheduled.map(([w]) => w)).toEqual([0, 1, 2, 3]);
  });

  it("drifts at most one word over a 60-word reply cut at every odd place", () => {
    const words = Array.from({ length: 60 }, (_, i) => ["the", "top", "number", "is", "bigger", "than", "the", "bottom"][i % 8]);
    const sentences = [words.slice(0, 20).join(" ") + ".", words.slice(20, 41).join(" ") + "?", words.slice(41).join(" ") + "."];
    const { player, seen } = setup();
    const text = send(player, sentences);
    for (const c of chunks(text, [3, 17, 1, 40, 9, 2, 55, 11, 23])) player.push(c.pcm, c.al);
    player.end();
    const got = seen.scheduled.map(([w]) => w);
    expect(got).toHaveLength(60);
    expect(got.every((w, i) => Math.abs(w - i) <= 1)).toBe(true);
    expect(got[59]).toBe(59);
    expect(seen.scheduled.every(([, at], i, a) => i === 0 || at > a[i - 1][1])).toBe(true);
  });

  it("fires boundaries when each word is heard, and knows which words were heard", () => {
    const { player, seen, advance } = setup();
    const text = send(player, ["One two three."]);
    for (const c of chunks(text, [])) player.push(c.pcm, c.al);
    player.end();
    expect(player.heardUpTo()).toBe(-1);
    advance(60); // "One" started
    expect(seen.boundaries).toEqual([0]);
    advance(200); // "two" started: "One" is over
    expect(seen.boundaries).toEqual([0, 1]);
    expect(player.heardUpTo()).toBe(0);
    advance(2000);
    expect(seen.boundaries).toEqual([0, 1, 2]);
    expect(player.heardUpTo()).toBe(2);
    expect(player.drained()).toBe(true);
  });

  it("ducks, restores and fades out on cancel", () => {
    const { ctx, player, advance } = setup();
    const text = send(player, ["One two three four."]);
    for (const c of chunks(text, [])) player.push(c.pcm, c.al);
    advance(100);
    const g = ctx.gains[0].gain;
    player.duck(0.3, 80);
    expect(g.lastRamp()).toMatchObject({ value: 0.3 });
    expect(g.lastRamp()!.at).toBeCloseTo(ctx.currentTime + 0.08, 5);
    player.unduck(250);
    expect(g.lastRamp()).toMatchObject({ value: 1 });
    player.cancel(120);
    expect(g.lastRamp()).toMatchObject({ value: 0 });
    expect(g.lastRamp()!.at).toBeCloseTo(ctx.currentTime + 0.12, 5);
    expect(ctx.sources.every((s) => s.stopped && s.stoppedAt! >= ctx.currentTime + 0.12 - 1e-9)).toBe(true);
  });

  it("drops a failed sentence and what follows, for a retry from there", () => {
    const { ctx, player, seen } = setup();
    const text = send(player, ["One two.", "Three four."]);
    const [a] = chunks(text, [13]); // all of sentence 1 and "Thre"
    player.push(a.pcm, a.al);
    expect(player.firstIncomplete()).toBe(1);
    player.truncateFrom(1);
    const kept = ctx.sources.filter((s) => !s.stopped).reduce((n, s) => n + s.length, 0);
    expect(kept).toBe((9 * MS_PER_CHAR * SR) / 1000);
    // Resend sentence 2: it is timed again from its first word.
    const sp = speakable("Three four.", "en");
    player.addSentence(sp.text, [2, 3], false);
    for (const c of chunks(`${sp.text} `, [])) player.push(c.pcm, c.al);
    player.end();
    expect(seen.scheduled.map(([w]) => w)).toEqual([0, 1, 2, 3]);
  });

  it("pauses at the word being heard and resumes from there", () => {
    const { ctx, player, advance } = setup();
    const text = send(player, ["One two three."]);
    for (const c of chunks(text, [])) player.push(c.pcm, c.al);
    player.end();
    advance(300);
    player.pause();
    expect(ctx.sources.every((s) => s.stopped)).toBe(true);
    advance(1000);
    player.resume();
    const resumed = ctx.sources.filter((s) => !s.stopped);
    expect(resumed.length).toBeGreaterThan(0);
    expect(resumed[0].at).toBeGreaterThanOrEqual(ctx.currentTime);
  });

  it("says when the audio clock stops while audio waits to play", () => {
    const { ctx, player, seen, advance } = setup();
    const text = send(player, ["One two three four five six."]);
    for (const c of chunks(text, [])) player.push(c.pcm, c.al);
    advance(100);
    expect(seen.stalls).toBe(0);
    ctx.state = "interrupted";
    advance(25);
    expect(seen.stalls).toBeGreaterThan(0);
  });
});
