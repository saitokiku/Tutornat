/**
 * Problem extraction from a photo or a PDF (spec R3, tutor-06). The learner
 * uploads a page of homework; the `tutor-problem-extract` stage transcribes it
 * to Markdown with `$…$` math and names the skills it exercises, and the result
 * becomes a coursework row the learner confirms or corrects before the session.
 *
 * Rules that make this safe and cheap: four types only (JPEG, PNG, HEIC, PDF),
 * 8 MB, one model hop, and the bytes never touch disk — they go from the
 * request to the provider as a message part and are dropped (invariant b's
 * sibling rule for uploads; nothing here is written to storage). An iPhone HEIC
 * is transcoded to JPEG in memory first, because no provider reads HEIC.
 *
 * A failure is not a dead end: the row is kept with `status: 'failed'` and a
 * one-sentence reason in `text`, so the learner can retry the photo or type the
 * problem instead.
 */
import type { ModelMessage } from 'ai';

import type { AgeBand } from '@/kaizen.config';
import { createLogger } from '@/lib/logger';
import type { CourseworkItem } from '@/lib/tutor/contracts';
import { TUTOR_LLM_SOURCES } from '@/lib/tutor/cost/sources';
import { createCoursework, type Scope } from '@/lib/tutor/coursework/service';
import type { Queryable } from '@/lib/tutor/db';
import { isSkillId } from '@/lib/tutor/graph/graph';
import { loadPromptFile } from '@/lib/tutor/prompts/loader';
import { extractJsonObject, tutorCallLLM, type TutorLlmScope } from '@/lib/tutor/turn/llm-call';

const log = createLogger('tutor-extract');

/** Spec R3: a phone photo or a scanned page, nothing larger. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const TEXT_LIMIT = 8_000;

export const ACCEPTED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
} as const;

export type AcceptedType = keyof typeof ACCEPTED_TYPES;

export type UploadRejection =
  | { code: 'MISSING_FILE'; message: string }
  | { code: 'TOO_LARGE'; message: string }
  | { code: 'BAD_TYPE'; message: string };

export interface AcceptedUpload {
  bytes: Uint8Array;
  mediaType: AcceptedType;
  filename: string;
}

const HEIC_NAME = /\.(heic|heif)$/i;

/** The declared media type, falling back to the extension when the browser sent none. */
export function mediaTypeOf(declared: string, filename: string): string {
  const type = declared.split(';')[0]!.trim().toLowerCase();
  if (type && type !== 'application/octet-stream') {
    return type === 'image/heif' ? 'image/heic' : type;
  }
  if (HEIC_NAME.test(filename)) return 'image/heic';
  if (/\.pdf$/i.test(filename)) return 'application/pdf';
  if (/\.png$/i.test(filename)) return 'image/png';
  if (/\.jpe?g$/i.test(filename)) return 'image/jpeg';
  return type;
}

export function acceptUpload(
  file: { size: number; type: string; name: string } | null,
  bytes: Uint8Array | null,
): { ok: true; upload: AcceptedUpload } | { ok: false; rejection: UploadRejection } {
  if (!file || !bytes || bytes.byteLength === 0) {
    return {
      ok: false,
      rejection: { code: 'MISSING_FILE', message: 'Attach a photo or a PDF of the problem.' },
    };
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      rejection: {
        code: 'TOO_LARGE',
        message: 'That file is larger than 8 MB. Try a photo of one page.',
      },
    };
  }
  const mediaType = mediaTypeOf(file.type, file.name);
  if (!(mediaType in ACCEPTED_TYPES)) {
    return {
      ok: false,
      rejection: {
        code: 'BAD_TYPE',
        message: 'Upload a JPEG, PNG, HEIC photo, or a PDF.',
      },
    };
  }
  return {
    ok: true,
    upload: { bytes, mediaType: mediaType as AcceptedType, filename: file.name },
  };
}

/** HEIC in, JPEG out. Everything else passes through untouched. */
export async function toModelBytes(
  upload: AcceptedUpload,
): Promise<{ bytes: Uint8Array; mediaType: string }> {
  if (upload.mediaType !== 'image/heic') {
    return { bytes: upload.bytes, mediaType: upload.mediaType };
  }
  const { default: convert } = await import('heic-convert');
  const jpeg = await convert({ buffer: upload.bytes, format: 'JPEG', quality: 0.9 });
  return { bytes: new Uint8Array(jpeg), mediaType: 'image/jpeg' };
}

export interface ExtractedProblem {
  title: string;
  text: string;
  skillIds: string[];
}

/** Parses the extract stage's JSON. Skill ids are constrained to the F1–F12 graph. */
export function parseExtraction(reply: string): ExtractedProblem | null {
  const json = extractJsonObject(reply);
  if (!json) return null;
  const text = typeof json.text === 'string' ? json.text.trim().slice(0, TEXT_LIMIT) : '';
  const title = typeof json.title === 'string' ? json.title.trim() : '';
  if (!text) return null;
  const skillIds = Array.isArray(json.skillIds)
    ? [...new Set(json.skillIds.filter(isSkillId))].slice(0, 6)
    : [];
  return { title: title || 'Uploaded problem', text, skillIds };
}

export interface ExtractInput {
  db: Queryable;
  scope: Scope;
  upload: AcceptedUpload;
  /** A title the learner typed; the model's own title is the fallback. */
  title?: string;
  /** The learner's band, for a per-band model override (`TUTOR_BAND_MODEL_ROUTES`). */
  band?: AgeBand | null;
}

/**
 * One model hop over the uploaded page, then a coursework row. Always answers
 * a row: `ready` with the transcription, or `failed` with the reason.
 */
export async function extractProblem(input: ExtractInput): Promise<CourseworkItem> {
  const { db, scope } = input;
  const llmScope: TutorLlmScope = {
    accountId: scope.accountId,
    learnerId: scope.learnerId,
    sessionId: null,
    turnId: null,
  };
  let reason: string | null = null;
  let extracted: ExtractedProblem | null = null;
  try {
    const { bytes, mediaType } = await toModelBytes(input.upload);
    const messages: ModelMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Transcribe the problems on this page. Do not solve them.' },
          { type: 'file', data: bytes, mediaType, filename: input.upload.filename },
        ],
      },
    ];
    const result = await tutorCallLLM({
      db,
      scope: llmScope,
      source: TUTOR_LLM_SOURCES.problemExtract,
      band: input.band ?? null,
      system: loadPromptFile('extract'),
      messages,
      maxOutputTokens: 1_200,
    });
    extracted = parseExtraction(result.text);
    if (!extracted) reason = 'unreadable';
  } catch (error) {
    reason = error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'provider_error';
    log.warn(
      `extraction failed learner=${scope.learnerId}: ${
        error instanceof Error ? error.name : 'error'
      }`,
    );
  }

  if (!extracted) {
    return createCoursework(db, scope, {
      title: input.title?.trim() || 'Could not read that page',
      source: 'upload',
      status: 'failed',
      text:
        reason === 'unreadable'
          ? 'We could not read the problems on that page. Try a clearer photo, or type the problem instead.'
          : 'Reading that page did not work this time. Try again, or type the problem instead.',
      extractError: reason,
    });
  }
  return createCoursework(db, scope, {
    title: input.title?.trim() || extracted.title,
    source: 'upload',
    status: 'ready',
    text: extracted.text,
    skillIds: extracted.skillIds,
  });
}
