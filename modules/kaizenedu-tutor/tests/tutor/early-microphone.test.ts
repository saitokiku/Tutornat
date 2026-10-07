// @vitest-environment jsdom
/**
 * The microphone handoff from the landing press to the session screen (D36):
 * the stream asked for inside the gesture is taken once by the screen, and a
 * stream nobody takes (the start failed, "Not now", an unmount) is stopped
 * rather than left live with the browser's recording indicator on.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  releaseEarlyMicrophone,
  requestMicrophoneEarly,
  takeEarlyMicrophone,
} from '@/lib/tutor/voice/recorder';

function fakeStream() {
  const track = { kind: 'audio', enabled: true, stop: vi.fn() };
  return {
    getTracks: () => [track],
    getAudioTracks: () => [track],
    track,
  } as unknown as MediaStream & { track: { stop: ReturnType<typeof vi.fn> } };
}

let getUserMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  getUserMedia = vi.fn();
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
  // jsdom has no MediaRecorder; the support check needs the name to exist.
  vi.stubGlobal('MediaRecorder', class {});
  releaseEarlyMicrophone();
});

afterEach(() => {
  releaseEarlyMicrophone();
  vi.unstubAllGlobals();
});

describe('the early microphone', () => {
  it('asks once and hands the same stream to whoever takes it', async () => {
    const stream = fakeStream();
    getUserMedia.mockResolvedValue(stream);
    requestMicrophoneEarly();
    requestMicrophoneEarly();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    const taken = takeEarlyMicrophone();
    expect(taken).not.toBeNull();
    await expect(taken).resolves.toBe(stream);
    expect(takeEarlyMicrophone()).toBeNull();
    expect(stream.track.stop).not.toHaveBeenCalled();
  });

  it('stops a stream nobody took', async () => {
    const stream = fakeStream();
    getUserMedia.mockResolvedValue(stream);
    requestMicrophoneEarly();
    releaseEarlyMicrophone();
    await Promise.resolve();
    await Promise.resolve();
    expect(stream.track.stop).toHaveBeenCalledTimes(1);
    expect(takeEarlyMicrophone()).toBeNull();
  });

  it('forgets a refusal so the next press asks again', async () => {
    getUserMedia.mockRejectedValueOnce(Object.assign(new Error('no'), { name: 'NotAllowedError' }));
    requestMicrophoneEarly();
    await Promise.resolve();
    await Promise.resolve();
    expect(takeEarlyMicrophone()).toBeNull();
    getUserMedia.mockResolvedValue(fakeStream());
    requestMicrophoneEarly();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });
});
