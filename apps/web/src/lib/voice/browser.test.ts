import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { browserSpeechIn, browserSpeechOut, pickVoice, type Recognition, type RecognitionCtor } from "./browser";
import { sentenceFeed } from "./chunk";

// ---- speech synthesis double

class FakeUtt {
  lang = "";
  voice: SpeechSynthesisVoice | null = null;
  rate = 1;
  volume = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onboundary: ((e: { name: string; charIndex: number }) => void) | null = null;
  constructor(public text: string) {}
}

const voice = (name: string, lang: string, localService: boolean) => ({ name, lang, localService, default: false, voiceURI: name }) as SpeechSynthesisVoice;
const VOICES = [voice("Cloud US", "en-US", false), voice("Local UK", "en-GB", true), voice("Local US", "en-US", true), voice("Local MX", "es-MX", true)];

function synth(voices = VOICES) {
  const s = {
    queue: [] as FakeUtt[],
    speak: vi.fn((u: FakeUtt) => void s.queue.push(u)),
    cancel: vi.fn(() => {
      const q = s.queue;
      s.queue = [];
      q.forEach((u) => u.onerror?.({ error: "interrupted" }));
    }),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: () => voices,
  };
  return s;
}

function outSetup({ voices = VOICES, names = [] as string[], locale = "en" as "en" | "es" } = {}) {
  const s = synth(voices);
  const out = browserSpeechOut({ locale, names, synth: s as unknown as SpeechSynthesis, Utterance: FakeUtt as unknown as typeof SpeechSynthesisUtterance })!;
  const seen = { starts: 0, ends: [] as boolean[], words: [] as number[], errors: [] as string[] };
  out.onStart(() => seen.starts++);
  out.onEnd((e) => seen.ends.push(e.cancelled));
  out.onBoundary((i) => seen.words.push(i));
  out.onError((e) => seen.errors.push(e.code));
  return { s, out, seen };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("browser read-aloud", () => {
  it("is null where the browser can't speak", () => {
    expect(browserSpeechOut({ locale: "en", synth: undefined, Utterance: undefined })).toBeNull();
  });

  it("prefers an on-device voice in the exact language", () => {
    expect(pickVoice(VOICES, "en")?.name).toBe("Local US");
    expect(pickVoice(VOICES, "es")?.name).toBe("Local MX");
    expect(pickVoice([], "en")).toBeNull();
  });

  it("an on-device voice may say the learner's name; an online one never gets it", async () => {
    const local = outSetup({ names: ["Ada"] });
    void local.out.speak("Nice work, Ada.");
    await tick();
    expect(local.s.queue.map((u) => u.text)).toEqual(["Nice work, Ada."]);
    // Spanish on a computer with only English voices: Chrome would use its online Spanish voice.
    const online = outSetup({ names: ["Ada"], locale: "es", voices: [voice("Local US", "en-US", true), voice("Google español", "es-ES", false)] });
    void online.out.speak("Muy bien, Ada.");
    await tick();
    expect(online.s.queue.map((u) => u.text)).toEqual(["Muy bien."]);
    // Voices not loaded yet: the browser picks its default, which may be online.
    const unknown = outSetup({ names: ["Ada"], voices: [] });
    void unknown.out.speak("Your turn, Ada.");
    await tick();
    expect(unknown.s.queue.map((u) => u.text)).toEqual(["Your turn."]);
  });

  it("dispose stops speaking", async () => {
    const { s, out } = outSetup();
    void out.speak("One. Two.");
    await tick();
    out.dispose();
    expect(s.cancel).toHaveBeenCalled();
    expect(out.state).toBe("idle");
  });

  it("speaks sentence by sentence, says math in words, and highlights the written words", async () => {
    const { s, out, seen } = outSetup();
    const done = out.speak("Shade 3/4. Count the dots.");
    await tick();
    expect(s.queue.map((u) => u.text)).toEqual(["Shade 3 fourths.", "Count the dots."]);
    expect(s.queue[0]).toMatchObject({ lang: "en-US", rate: 0.95 });
    expect(s.queue[0].voice?.name).toBe("Local US");
    const [a, b] = s.queue;
    expect(out.state).toBe("waiting");
    a.onstart!();
    expect(out.state).toBe("speaking");
    a.onboundary!({ name: "word", charIndex: 6 }); // "3"
    a.onboundary!({ name: "word", charIndex: 8 }); // "fourths."
    a.onend!();
    b.onstart!();
    b.onboundary!({ name: "word", charIndex: 6 }); // "the"
    b.onend!();
    await done;
    expect(seen.starts).toBe(1);
    expect(seen.words).toEqual([0, 1, 1, 2, 3]);
    expect(seen.ends).toEqual([false]);
    expect(out.state).toBe("idle");
  });

  it("speaks a streaming reply as each sentence completes", async () => {
    const { s, out } = outSetup();
    const feed = sentenceFeed();
    void out.speak(feed.sentences);
    feed.write("First one. Seco");
    await tick();
    expect(s.queue.map((u) => u.text)).toEqual(["First one."]);
    feed.write("nd one.");
    feed.end();
    await tick();
    expect(s.queue.map((u) => u.text)).toEqual(["First one.", "Second one."]);
  });

  it("cancel stops at once and reports it", async () => {
    const { s, out, seen } = outSetup();
    const done = out.speak("One. Two.");
    await tick();
    s.queue[0].onstart!();
    out.cancel();
    await done;
    expect(s.cancel).toHaveBeenCalled();
    expect(seen.ends).toEqual([true]);
    expect(seen.errors).toEqual([]);
    expect(out.state).toBe("idle");
  });

  it("pauses and resumes", async () => {
    const { s, out } = outSetup();
    void out.speak("One.");
    await tick();
    s.queue[0].onstart!();
    out.pause();
    expect(s.pause).toHaveBeenCalled();
    expect(out.state).toBe("paused");
    out.resume();
    expect(s.resume).toHaveBeenCalled();
    expect(out.state).toBe("speaking");
    out.pause();
    out.cancel();
    expect(s.resume).toHaveBeenCalledTimes(2); // a cancelled pause doesn't leave the synthesizer stuck
  });

  it("reports a real speech error and still finishes", async () => {
    const { s, out, seen } = outSetup();
    const done = out.speak("One.");
    await tick();
    s.queue[0].onerror!({ error: "synthesis-failed" });
    await done;
    expect(seen.errors).toEqual(["speak"]);
    expect(seen.ends).toEqual([false]);
  });
});

// ---- speech recognition double

class FakeRec implements Recognition {
  static all: FakeRec[] = [];
  lang = "";
  interimResults = false;
  continuous = false;
  maxAlternatives = 0;
  onstart: (() => void) | null = null;
  onresult: Recognition["onresult"] = null;
  onspeechstart: (() => void) | null = null;
  onspeechend: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  start = vi.fn(() => queueMicrotask(() => this.onstart?.()));
  stop = vi.fn();
  abort = vi.fn();
  results: { isFinal: boolean; 0: { transcript: string }; length: number }[] = [];
  constructor() {
    FakeRec.all.push(this);
  }
  hear(transcript: string, isFinal: boolean) {
    const last = this.results[this.results.length - 1];
    const r = { isFinal, 0: { transcript }, length: 1 };
    if (last && !last.isFinal) this.results[this.results.length - 1] = r;
    else this.results.push(r);
    this.onresult?.({ resultIndex: 0, results: this.results });
  }
}

function inSetup() {
  FakeRec.all = [];
  const input = browserSpeechIn({ locale: "en", Recognition: FakeRec as unknown as RecognitionCtor })!;
  const seen = { partial: [] as string[], final: [] as string[], turns: [] as string[], speech: 0, errors: [] as string[] };
  input.onPartial((t) => seen.partial.push(t));
  input.onFinal((t) => seen.final.push(t));
  input.onEndOfTurn((t) => seen.turns.push(t));
  input.onSpeechStart(() => seen.speech++);
  input.onError((e) => seen.errors.push(e.code));
  return { input, seen, rec: () => FakeRec.all[FakeRec.all.length - 1] };
}

describe("browser listening", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => vi.useRealTimers());

  it("is null without speech recognition", () => {
    expect(browserSpeechIn({ locale: "en", Recognition: undefined })).toBeNull();
  });

  it("hands-free: listens continuously in the learner's language and ends a turn after a pause", async () => {
    const { input, seen, rec } = inSetup();
    await input.start({ turns: "auto" });
    expect(rec()).toMatchObject({ lang: "en-US", continuous: true, interimResults: true });
    rec().onspeechstart!();
    rec().hear("three", false);
    rec().hear("three fourths", true);
    expect(seen.speech).toBe(1);
    expect(seen.partial).toEqual(["three", "three fourths"]);
    expect(seen.final).toEqual(["three fourths"]);
    await vi.advanceTimersByTimeAsync(1300);
    expect(seen.turns).toEqual([]);
    await vi.advanceTimersByTimeAsync(200);
    expect(seen.turns).toEqual(["three fourths"]);
  });

  it("is push-to-talk by default and can't measure a level", async () => {
    const { input, seen, rec } = inSetup();
    await input.start();
    rec().hear("three fourths", true);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(seen.turns).toEqual([]);
    expect(input.level()).toBeNull();
  });

  it("starts again when the browser ends recognition on its own", async () => {
    const { input, rec } = inSetup();
    await input.start();
    const first = rec();
    await vi.advanceTimersByTimeAsync(5000);
    first.onend!();
    expect(FakeRec.all).toHaveLength(2);
    expect(rec().start).toHaveBeenCalled();
    expect(input.listening).toBe(true);
  });

  it("stop() makes what was said the turn", async () => {
    const { input, seen, rec } = inSetup();
    await input.start({ turns: "manual" });
    rec().hear("seven", false);
    input.stop();
    expect(rec().stop).toHaveBeenCalled();
    rec().hear("seven tens", true);
    rec().onend!();
    expect(seen.turns).toEqual(["seven tens"]);
    expect(input.listening).toBe(false);
  });

  it("abort() keeps nothing", async () => {
    const { input, seen, rec } = inSetup();
    await input.start();
    rec().hear("never mind", false);
    input.abort();
    rec().onend?.();
    await vi.advanceTimersByTimeAsync(5000);
    expect(seen.turns).toEqual([]);
    expect(input.listening).toBe(false);
  });

  it("a refused microphone rejects start and says why", async () => {
    const { input, seen, rec } = inSetup();
    const started = input.start();
    rec().start.mockImplementation(() => {});
    rec().onerror!({ error: "not-allowed" });
    await expect(started).rejects.toMatchObject({ code: "denied" });
    expect(seen.errors).toEqual(["denied"]);
    expect(input.listening).toBe(false);
  });
});
