import { afterEach, describe, expect, it } from "vitest";
import { chooseVoice, isOnline, loadVoices, pickBrowserVoice, rankVoices, tierOf, type VoiceLike } from "./voices";

// getVoices() lists as each browser returns them (names and languages copied from real devices; the
// lists are trimmed, keeping every voice that could win or must never win).

const v = (name: string, lang: string, localService = true, voiceURI = name): VoiceLike => ({ name, lang, localService, voiceURI });

const MAC_NOVELTY = ["Albert", "Bad News", "Bahh", "Bells", "Boing", "Bubbles", "Cellos", "Fred", "Good News", "Jester", "Junior", "Kathy", "Organ", "Ralph", "Superstar", "Trinoids", "Whisper", "Wobble", "Zarvox"].map((n) => v(n, "en-US"));
const MAC_ELOQUENCE = [
  v("Eddy (English (US))", "en-US"),
  v("Flo (English (US))", "en-US"),
  v("Grandma (English (US))", "en-US"),
  v("Grandpa (English (US))", "en-US"),
  v("Reed (English (US))", "en-US"),
  v("Rocko (English (US))", "en-US"),
  v("Sandy (English (US))", "en-US"),
  v("Shelley (English (US))", "en-US"),
  v("Eddy (Spanish (Spain))", "es-ES"),
  v("Eddy (Spanish (Mexico))", "es-MX"),
  v("Flo (Spanish (Mexico))", "es-MX"),
  v("Reed (Spanish (Spain))", "es-ES"),
];

const FIXTURES = {
  // Chrome on macOS: the system voices plus Google's online ones. No Enhanced voice downloaded.
  macChrome: [
    ...MAC_NOVELTY,
    ...MAC_ELOQUENCE,
    v("Daniel (English (United Kingdom))", "en-GB"),
    v("Karen", "en-AU"),
    v("Samantha", "en-US"),
    v("Mónica", "es-ES"),
    v("Paulina", "es-MX"),
    v("Google US English", "en-US", false),
    v("Google UK English Female", "en-GB", false),
    v("Google español", "es-ES", false),
    v("Google español de Estados Unidos", "es-US", false),
  ],
  // Safari on macOS with two downloaded voices.
  macSafari: [
    ...MAC_NOVELTY,
    ...MAC_ELOQUENCE,
    v("Samantha", "en-US", true, "com.apple.voice.compact.en-US.Samantha"),
    v("Ava (Premium)", "en-US", true, "com.apple.voice.premium.en-US.Ava"),
    v("Zoe (Enhanced)", "en-US", true, "com.apple.voice.enhanced.en-US.Zoe"),
    v("Paulina", "es-MX", true, "com.apple.voice.compact.es-MX.Paulina"),
    v("Paulina (Enhanced)", "es-MX", true, "com.apple.voice.enhanced.es-MX.Paulina"),
    v("Mónica", "es-ES", true, "com.apple.voice.compact.es-ES.Monica"),
  ],
  // Safari on an iPad that never downloaded a voice.
  iosSafari: [
    ...MAC_NOVELTY,
    v("Eddy (English (US))", "en-US"),
    v("Eddy (Spanish (Mexico))", "es-MX"),
    v("Samantha", "en-US"),
    v("Daniel", "en-GB"),
    v("Paulina", "es-MX"),
    v("Mónica", "es-ES"),
  ],
  // Edge on Windows: the old SAPI voices are local, the natural ones online.
  winEdge: [
    v("Microsoft David - English (United States)", "en-US"),
    v("Microsoft Mark - English (United States)", "en-US"),
    v("Microsoft Zira - English (United States)", "en-US"),
    v("Microsoft Sabina - Spanish (Mexico)", "es-MX"),
    v("Microsoft Helena - Spanish (Spain)", "es-ES"),
    v("Microsoft Libby Online (Natural) - English (United Kingdom)", "en-GB", false),
    v("Microsoft Aria Online (Natural) - English (United States)", "en-US", false),
    v("Microsoft Guy Online (Natural) - English (United States)", "en-US", false),
    v("Microsoft Jenny Online (Natural) - English (United States)", "en-US", false),
    v("Microsoft AvaMultilingual Online (Natural) - English (United States)", "en-US", false),
    v("Microsoft Andrew Online (Natural) - English (United States)", "en-US", false),
    v("Microsoft Elvira Online (Natural) - Spanish (Spain)", "es-ES", false),
    v("Microsoft Jorge Online (Natural) - Spanish (Mexico)", "es-MX", false),
    v("Microsoft Dalia Online (Natural) - Spanish (Mexico)", "es-MX", false),
    v("Microsoft Paloma Online (Natural) - Spanish (United States)", "es-US", false),
    v("Microsoft Alonso Online (Natural) - Spanish (United States)", "es-US", false),
  ],
  // Chrome on Windows: SAPI plus Google's online voices.
  winChrome: [
    v("Microsoft David - English (United States)", "en-US"),
    v("Microsoft Mark - English (United States)", "en-US"),
    v("Microsoft Zira - English (United States)", "en-US"),
    v("Microsoft Sabina - Spanish (Mexico)", "es-MX"),
    v("Google US English", "en-US", false),
    v("Google UK English Male", "en-GB", false),
    v("Google español", "es-ES", false),
    v("Google español de Estados Unidos", "es-US", false),
  ],
  // Chrome on Android: the phone's own Google TTS voices, local.
  android: [
    v("English United States", "en-US", true, "English United States"),
    v("English United Kingdom", "en-GB", true),
    v("Spanish Spain", "es-ES", true),
    v("Spanish United States", "es-US", true),
  ],
  // ChromeOS: its own robotic voices and Google's online ones.
  chromeOs: [
    v("Chrome OS US English 1", "en-US"),
    v("Chrome OS español", "es-US"),
    v("Google US English", "en-US", false),
    v("Google español de Estados Unidos", "es-US", false),
  ],
};

const DESKTOP = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/152.0 Safari/537.36";
const ANDROID = "Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 Chrome/152.0 Mobile Safari/537.36";

type Row = [keyof typeof FIXTURES, "en" | "es", boolean, string | null, "A" | "B" | null, string?];
// [device, language, online voices allowed, expected voice, expected tier]
const ROWS: Row[] = [
  ["macChrome", "en", true, "Samantha", "B"],
  // Not "Eddy (Spanish (Spain))", which Chrome on this Mac used to pick.
  ["macChrome", "es", true, "Paulina", "B"],
  ["macChrome", "es", false, "Paulina", "B"],
  ["macSafari", "en", false, "Ava (Premium)", "A"],
  ["macSafari", "es", false, "Paulina (Enhanced)", "A"],
  ["iosSafari", "en", false, "Samantha", "B"],
  ["iosSafari", "es", false, "Paulina", "B"],
  ["winEdge", "en", true, "Microsoft AvaMultilingual Online (Natural) - English (United States)", "A"],
  ["winEdge", "es", true, "Microsoft Paloma Online (Natural) - Spanish (United States)", "A"],
  // An under-13 learner without a grown-up's consent: no online voice, and SAPI never speaks.
  ["winEdge", "en", false, null, null],
  ["winChrome", "en", true, "Google US English", "B"],
  ["winChrome", "es", true, "Google español de Estados Unidos", "B"],
  ["winChrome", "en", false, null, null],
  ["android", "en", false, "English United States", "A", ANDROID],
  ["android", "es", false, "Spanish United States", "A", ANDROID],
  ["chromeOs", "en", true, "Google US English", "B"],
  ["chromeOs", "en", false, null, null],
];

describe("the browser voice picker", () => {
  it.each(ROWS)("%s %s (online %s) → %s, tier %s", (device, locale, online, name, tier, ua = DESKTOP) => {
    const pick = pickBrowserVoice(FIXTURES[device], locale, { online, userAgent: ua });
    expect(pick?.voice.name ?? null).toBe(name);
    expect(pick?.tier ?? null).toBe(tier);
  });

  it("never picks Eddy, a novelty voice, an old SAPI voice or a Chrome OS voice", () => {
    for (const list of Object.values(FIXTURES))
      for (const locale of ["en", "es"] as const)
        for (const p of rankVoices(list, locale, { online: true, userAgent: DESKTOP })) {
          expect(p.voice.name).not.toMatch(/^(Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Albert|Zarvox|Bad News|Fred|Junior|Kathy|Ralph)\b/);
          expect(p.voice.name).not.toMatch(/^Microsoft (David|Mark|Zira|Sabina|Helena) -/);
          expect(p.voice.name).not.toMatch(/^Chrome OS/);
        }
  });

  it("never uses a voice from another language", () => {
    expect(pickBrowserVoice([v("Samantha", "en-US")], "es", { online: true })).toBeNull();
    expect(tierOf(v("Paulina", "es-MX"), "en")).toBe("C");
  });

  it("orders Spanish regions: United States, Mexico, Latin America, Spain last", () => {
    const list = [v("Mónica", "es-ES"), v("X", "es-AR"), v("Y", "es-419"), v("Paulina", "es-MX"), v("Z", "es-US")];
    expect(rankVoices(list, "es", { online: true }).map((p) => p.voice.name)).toEqual(["Paulina", "Z", "Y", "X", "Mónica"]);
  });

  it("orders English regions inside a tier: US, Canada, then the rest", () => {
    const list = [v("Karen", "en-AU"), v("Nora", "en-CA"), v("Tom", "en-US")];
    expect(rankVoices(list, "en", { online: true }).map((p) => p.voice.name)).toEqual(["Tom", "Nora", "Karen"]);
  });

  it("flags online voices, which need a grown-up's consent for an under-13 learner", () => {
    expect(isOnline(v("Microsoft Ava Online (Natural) - English (United States)", "en-US", false))).toBe(true);
    expect(isOnline(v("Google US English", "en-US", false))).toBe(true);
    expect(isOnline(v("Ava (Premium)", "en-US"))).toBe(false);
    expect(rankVoices(FIXTURES.winEdge, "en", { online: false })).toEqual([]);
  });

  it("Android local voices are Tier A only on an Android phone", () => {
    expect(tierOf(FIXTURES.android[0], "en", ANDROID)).toBe("A");
    expect(tierOf(FIXTURES.android[0], "en", DESKTOP)).toBe("B");
  });
});

describe("remembering the pick", () => {
  afterEach(() => localStorage.clear());

  it("keeps the same voice for a learner across sessions, and re-ranks when it disappears", () => {
    const list = [v("Samantha", "en-US"), v("Tom", "en-US")];
    localStorage.setItem("kaizenedu.voice.L1.en", JSON.stringify({ voiceURI: "Tom", name: "Tom" }));
    expect(chooseVoice(list, "en", { online: true, learner: "L1" })?.voice.name).toBe("Tom");
    expect(chooseVoice([v("Samantha", "en-US")], "en", { online: true, learner: "L1" })?.voice.name).toBe("Samantha");
    expect(JSON.parse(localStorage.getItem("kaizenedu.voice.L1.en")!).name).toBe("Samantha");
  });

  it("moves to a natural voice when one becomes available", () => {
    localStorage.setItem("kaizenedu.voice.L1.en", JSON.stringify({ voiceURI: "Samantha", name: "Samantha" }));
    expect(chooseVoice(FIXTURES.macSafari, "en", { online: false, learner: "L1" })?.voice.name).toBe("Ava (Premium)");
  });

  it("works when storage throws", () => {
    const get = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    try {
      expect(chooseVoice(FIXTURES.iosSafari, "en", { online: false, learner: "L1" })?.voice.name).toBe("Samantha");
    } finally {
      Storage.prototype.getItem = get;
    }
  });
});

describe("loading the voices", () => {
  it("waits for voiceschanged, up to a second", async () => {
    let fire: () => void = () => {};
    let list: VoiceLike[] = [];
    const synth = {
      getVoices: () => list as SpeechSynthesisVoice[],
      addEventListener: (_: string, fn: () => void) => (fire = fn),
      removeEventListener: () => {},
    } as unknown as SpeechSynthesis;
    const p = loadVoices(synth, 1000);
    list = [v("Samantha", "en-US")];
    fire();
    expect((await p).map((x) => x.name)).toEqual(["Samantha"]);
  });

  it("gives up after the wait with whatever is there", async () => {
    const synth = { getVoices: () => [], addEventListener: () => {}, removeEventListener: () => {} } as unknown as SpeechSynthesis;
    expect(await loadVoices(synth, 5)).toEqual([]);
  });
});
