/**
 * Invariant (b): audio bytes are never written to disk, database, object
 * storage, logs, or error reports (CLAUDE.md; spec §5.3, §8.5).
 *
 * Behavioural half: the transcription route is called with a real multipart
 * upload carrying a marker byte string while every filesystem write API is
 * replaced by a recorder; the ASR provider is mocked so no network happens.
 * Source half: every module that handles captured learner audio is scanned
 * for persistence APIs, with a count guard so a rename cannot empty the scan.
 */
import { randomUUID } from 'node:crypto';

import type { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { argsContainBytes, buildRequest, grepFiles, listFiles } from './_helpers';

const mocks = vi.hoisted(() => ({
  transcribeAudio: vi.fn(async (_config: unknown, _audio: unknown) => ({
    text: 'two thirds plus one sixth',
  })),
  writes: [] as Array<{ api: string; args: unknown[] }>,
}));

function recording(api: string) {
  return (...args: unknown[]) => {
    mocks.writes.push({ api, args });
    return undefined as never;
  };
}

vi.mock('@/lib/audio/asr-providers', () => ({ transcribeAudio: mocks.transcribeAudio }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    writeFileSync: recording('fs.writeFileSync'),
    appendFileSync: recording('fs.appendFileSync'),
    createWriteStream: recording('fs.createWriteStream'),
    promises: {
      ...actual.promises,
      writeFile: recording('fs.promises.writeFile'),
      appendFile: recording('fs.promises.appendFile'),
    },
  };
});
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    writeFile: recording('fsp.writeFile'),
    appendFile: recording('fsp.appendFile'),
  };
});

async function postTranscription(formData: FormData) {
  const { POST } = await import('@/app/api/transcription/route');
  return POST(buildRequest({ path: '/api/transcription', formData }) as NextRequest);
}

describe('invariant (b): learner audio is never persisted', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    mocks.writes.length = 0;
    mocks.transcribeAudio.mockClear();
    vi.stubEnv('ASR_OPENAI_API_KEY', 'sk-test-asr');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('the transcription route forwards the clip to the provider and writes nothing', async () => {
    const marker = `KAIZEN-AUDIO-MARKER-${randomUUID()}`;
    const bytes = Buffer.concat([Buffer.from('RIFFfake-webm-header'), Buffer.from(marker)]);
    const formData = new FormData();
    formData.set('audio', new File([bytes], 'clip.webm', { type: 'audio/webm' }));
    formData.set('providerId', 'openai-whisper');
    formData.set('language', 'en');

    const response = await postTranscription(formData);
    const payload = (await response.json()) as { success?: boolean; text?: string };

    expect(response.status).toBe(200);
    expect(payload.text).toBe('two thirds plus one sixth');
    expect(mocks.transcribeAudio).toHaveBeenCalledTimes(1);
    const forwarded = mocks.transcribeAudio.mock.calls[0]?.[1] as File | undefined;
    expect(forwarded?.size).toBe(bytes.byteLength);

    const audioWrites = mocks.writes.filter((write) => argsContainBytes(write.args, marker));
    expect(audioWrites, 'filesystem writes that contain the audio bytes').toEqual([]);
    expect(
      mocks.writes.map((write) => write.api),
      'any filesystem write during a transcription request',
    ).toEqual([]);
  });
});

describe('invariant (b): modules that touch captured audio do not persist it', () => {
  const CAPTURED_AUDIO_MODULES = [
    'app/api/transcription/route.ts',
    'lib/audio/asr-providers.ts',
    'lib/hooks/use-audio-recorder.ts',
  ] as const;
  const PERSISTENCE_APIS =
    /\bwriteFile(Sync)?\b|\bappendFile(Sync)?\b|\bcreateWriteStream\b|\baudioFiles\b|@\/lib\/persistence\/|@openmaic\/storage|from 'dexie'|\bassetStore\b|\bputObject\b|PutObjectCommand/;

  it('the scanned module set is non-empty and every file exists', () => {
    const present = CAPTURED_AUDIO_MODULES.filter((file) =>
      listFiles(file.slice(0, file.lastIndexOf('/'))).includes(file),
    );
    expect(present).toEqual([...CAPTURED_AUDIO_MODULES]);
  });

  it('no captured-audio module references a persistence API', () => {
    const tutorVoice = listFiles('lib/tutor/voice');
    const files = [...CAPTURED_AUDIO_MODULES, ...tutorVoice];
    const hits = grepFiles(files, PERSISTENCE_APIS);
    expect(
      hits,
      `persistence APIs referenced by captured-audio modules (${files.length} files)`,
    ).toEqual([]);
  });
});
