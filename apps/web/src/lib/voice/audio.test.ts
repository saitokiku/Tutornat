import { afterEach, describe, expect, it, vi } from "vitest";
import { appSpeechOut } from "./app-out";
import { micSession, playbackSession, resetAudioForTests, unlockAudio } from "./audio";
import { FakeAudio } from "./fakes";

// iOS audio sessions (live tutor spec §2.6): "playback" while reading aloud, so the ring/silent switch
// doesn't mute the tutor; "play-and-record" only while the microphone is open.

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1";

function withSession() {
  const session = { type: "auto" as string };
  vi.stubGlobal("navigator", { userAgent: IPHONE, audioSession: session });
  return session;
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetAudioForTests();
});

describe("the iOS audio session", () => {
  it("the first tap's warm() sets playback before any microphone opened", () => {
    const session = withSession();
    const audio = new FakeAudio();
    resetAudioForTests(() => audio as unknown as AudioContext);
    appSpeechOut().warm();
    expect(session.type).toBe("playback");
    expect(audio.sources).toHaveLength(1); // the silent sample that unlocks Web Audio
  });

  it("play-and-record only while the microphone is open; a tap meanwhile doesn't take it away", () => {
    const session = withSession();
    micSession(true);
    expect(session.type).toBe("play-and-record");
    unlockAudio(new FakeAudio() as unknown as AudioContext);
    playbackSession();
    expect(session.type).toBe("play-and-record");
    micSession(false);
    expect(session.type).toBe("playback");
    micSession(false); // a second release changes nothing
    playbackSession();
    expect(session.type).toBe("playback");
  });
});
