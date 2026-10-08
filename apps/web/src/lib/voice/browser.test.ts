import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { browserSpeechIn, browserSpeechOut, browserVoice, type Recognition, type RecognitionCtor } from "./browser";
import { sentenceFeed } from "./chunk";
import { chooseVoice } from "./voices";

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

function outSetup({ voices = VOICES, names = [] as string[], locale = "en" as "en" | "es", online = false, band = "69" as "k2" | "35" | "69" } = {}) {
  const s = synth(voices);
  const pick = chooseVoice(voices, locale, { online });
  const out = browserSpeechOut({ locale, pick, names, band, synth: s as unknown as SpeechSynthesis, Utterance: FakeUtt as unknown as typeof SpeechSynthesisUtterance })!;
  const seen = { starts: 0, ends: [] as boolean[], words: [] as number[], errors: [] as string[] };
  out.onStart(() => seen.starts++);
  out.onEnd((e) => seen.ends.push(e.cancelled));
  out.onBoundary((i) => seen.words.push(i));
  out.onError((e) => seen.errors.push(e.code));
  return { s, out, seen };
}

const tick = () => vi.advanceTimersByTimeAsync(0);

describe("browser read-aloud", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("is null where the browser can't speak, or when only robots are on offer", () => {
    expect(browserSpeechOut({ locale: "en", pick: null, synth: undefined, Utterance: undefined })).toBeNull();
    const robots = [voice("Microsoft David - English (United States)", "en-US", true), voice("Zarvox", "en-US", true)];
    const pick = chooseVoice(robots, "en", { online: true });
    expect(pick).toBeNull();
    expect(browserSpeechOut({ locale: "en", pick, synth: synth(robots) as unknown as SpeechSynthesis, Utterance: FakeUtt as unknown as typeof SpeechSynthesisUtterance })).toBeNull();
  });

  it("waits for the browser's voices before picking one", async () => {
    let fire = () => {};
    let list: SpeechSynthesisVoice[] = [];
    const s = { ...synth(), getVoices: () => list, addEventListener: (_: string, fn: () => void) => (fire = fn), removeEventListener: () => {} };
    const p = browserVoice({ locale: "es", online: false, synth: s as unknown as SpeechSynthesis });
    list = VOICES;
    fire();
    expect((await p)?.voice.name).toBe("Local MX");
  });

  it("an on-device voice may say the learner's name; an online one never gets it", async () => {
    const local = outSetup({ names: ["Ada"] });
    void local.out.speak("Nice work, Ada.");
    await tick();
    expect(local.s.queue.map((u) => u.text)).toEqual(["Nice work, Ada."]);
    const online = outSetup({ names: ["Ada"], locale: "es", online: true, voices: [voice("Local US", "en-US", true), voice("Google español", "es-ES", false)] });
    void online.out.speak("Muy bien, Ada.");
    await tick();
    expect(online.s.queue.map((u) => u.text)).toEqual(["Muy bien."]);
  });

  it("joins a chunk cut at a clause to the rest of its sentence, so its intonation doesn't restart at the comma", async () => {
    const { s, out } = outSetup();
    const feed = sentenceFeed({ mode: "voice" });
    void out.speak(feed.sentences);
    feed.write("Look at the bottom number of the fraction on the left side, and tell me what it says. Next");
    await tick();
    expect(s.queue.map((u) => u.text)).toEqual(["Look at the bottom number of the fraction on the left side, and tell me what it says."]);
  });

  it("a speculative reply waits for its turn to be committed before a word is spoken", async () => {
    const { s, out, seen } = outSetup();
    let commit!: () => void;
    void out.speak("Seven is right.", { after: new Promise<void>((ok) => (commit = ok)) });
    await tick();
    expect(s.queue).toHaveLength(0);
    commit();
    await tick();
    expect(s.queue.map((u) => u.text)).toEqual(["Seven is right."]);
    expect(seen.ends).toEqual([]);
  });

  it("dispose stops speaking", async () => {
    const { s, out } = outSetup();
    void out.speak("One. Two.");
    await tick();
    out.dispose();
    expect(s.cancel).toHaveBeenCalled();
    expect(out.state).toBe("idle");
  });

  it("speaks sentence by sentence with the band's pause, says math in words, and highlights the written words", async () => {
    const { s, out, seen } = outSetup({ band: "k2" });
    const done = out.speak("Shade 3/4. Is it big?");
    await tick();
    expect(s.queue.map((u) => u.text)).toEqual(["Shade three fourths."]);
    expect(s.queue[0]).toMatchObject({ lang: "en-US", rate: 1 });
    expect(s.queue[0].voice?.name).toBe("Local US");
    const [a] = s.queue;
    expect(out.state).toBe("waiting");
    a.onstart!();
    expect(out.state).toBe("speaking");
    a.onboundary!({ name: "word", charIndex: 6 }); // "three"
    a.onboundary!({ name: "word", charIndex: 12 }); // "fourths."
    expect(out.heardUpTo()).toBe(1);
    a.onend!();
    // K–2: 400 ms after a sentence, 300 ms more before a question.
    await vi.advanceTimersByTimeAsync(650);
    expect(s.queue).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(60);
    const b = s.queue[1];
    expect(b.text).toBe("Is it big?");
    b.onstart!();
    b.onboundary!({ name: "word", charIndex: 3 }); // "it"
    b.onend!();
    await done;
    expect(seen.starts).toBe(1);
    expect(seen.words).toEqual([0, 1, 1, 2, 3]);
    expect(seen.ends).toEqual([false]);
    expect(out.heardUpTo()).toBe(4);
    expect(out.state).toBe("idle");
  });

  it("speaks a streaming reply as each sentence completes", async () => {
    const { s, out } = outSetup();
    const feed = sentenceFeed();
    void out.speak(feed.sentences);
    feed.write("First one. Seco");
    await tick();
    expect(s.queue.map((u) => u.text)).toEqual(["First one."]);
    s.queue[0].onend!();
    feed.write("nd one.");
    feed.end();
    await vi.advanceTimersByTimeAsync(200);
    expect(s.queue.map((u) => u.text)).toEqual(["First one.", "Second one."]);
  });

  it("cancel stops at once and reports it; an aborted signal does the same", async () => {
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
    const ctl = new AbortController();
    const again = out.speak("Three.", { signal: ctl.signal });
    ctl.abort();
    await again;
    expect(seen.ends).toEqual([true, true]);
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

  it("knows its tier: a natural voice may read by itself, a plain one only on a tap", () => {
    expect(outSetup().out.tier).toBe("B");
    expect(outSetup({ voices: [voice("Ava (Premium)", "en-US", true)] }).out.tier).toBe("A");
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
  expect(input.duplex).toBe(false); // the browser's recognizer is half duplex: the mic is closed while the tutor speaks
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
