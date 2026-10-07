import { NextResponse } from 'next/server';

export const API_ERROR_CODES = {
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  MISSING_API_KEY: 'MISSING_API_KEY',
  MISSING_PROVIDER: 'MISSING_PROVIDER',
  MISSING_MODEL: 'MISSING_MODEL',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  ASSET_NOT_FOUND: 'ASSET_NOT_FOUND',
  PROVIDER_DISABLED: 'PROVIDER_DISABLED',
  VOXCPM_AUTO_VOICE_REQUIRES_CONTEXT: 'VOXCPM_AUTO_VOICE_REQUIRES_CONTEXT',
  INVALID_URL: 'INVALID_URL',
  REDIRECT_NOT_ALLOWED: 'REDIRECT_NOT_ALLOWED',
  TOO_MANY_REDIRECTS: 'TOO_MANY_REDIRECTS',
  CONTENT_SENSITIVE: 'CONTENT_SENSITIVE',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  QWEN_VC_CONFIG_MISSING: 'QWEN_VC_CONFIG_MISSING',
  QWEN_VC_ENDPOINT_INVALID: 'QWEN_VC_ENDPOINT_INVALID',
  QWEN_VC_HTTP_ERROR: 'QWEN_VC_HTTP_ERROR',
  QWEN_VC_TIMEOUT: 'QWEN_VC_TIMEOUT',
  QWEN_VC_TRANSPORT_ERROR: 'QWEN_VC_TRANSPORT_ERROR',
  QWEN_VC_RESPONSE_JSON_INVALID: 'QWEN_VC_RESPONSE_JSON_INVALID',
  QWEN_VC_RESPONSE_VOICE_MISSING: 'QWEN_VC_RESPONSE_VOICE_MISSING',
  QWEN_VC_RESPONSE_AUDIO_URL_MISSING: 'QWEN_VC_RESPONSE_AUDIO_URL_MISSING',
  QWEN_VC_AUDIO_URL_INVALID: 'QWEN_VC_AUDIO_URL_INVALID',
  QWEN_VC_AUDIO_DOWNLOAD_FAILED: 'QWEN_VC_AUDIO_DOWNLOAD_FAILED',
  QWEN_VC_AUDIO_TOO_LARGE: 'QWEN_VC_AUDIO_TOO_LARGE',
  QWEN_VC_AUDIO_EMPTY: 'QWEN_VC_AUDIO_EMPTY',
  QWEN_VC_VOICE_NOT_FOUND: 'QWEN_VC_VOICE_NOT_FOUND',
  QWEN_VC_BOOTSTRAP_UNSUPPORTED: 'QWEN_VC_BOOTSTRAP_UNSUPPORTED',
  QWEN_VC_REFERENCE_AUDIO_INVALID: 'QWEN_VC_REFERENCE_AUDIO_INVALID',
  QWEN_TTS_ERROR: 'QWEN_TTS_ERROR',
  GENERATION_FAILED: 'GENERATION_FAILED',
  TRANSCRIPTION_FAILED: 'TRANSCRIPTION_FAILED',
  PARSE_FAILED: 'PARSE_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  // KAIZEN: product routes (app/(learner), app/(parent)) answer typed refusals
  // the parent and learner UIs branch on: ownership (404/403), duplicate
  // identifiers, plan limits, profile state, fail-closed gates, and billing.
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  LOGIN_NAME_TAKEN: 'LOGIN_NAME_TAKEN',
  PROFILE_LIMIT: 'PROFILE_LIMIT',
  LEARNER_LOCKED: 'LEARNER_LOCKED',
  LEARNER_FROZEN: 'LEARNER_FROZEN',
  GATE_CLOSED: 'GATE_CLOSED',
  BILLING_NOT_ENABLED: 'BILLING_NOT_ENABLED',
  // KAIZEN: the tutor loop's two terminal session refusals. The learner client
  // treats both as terminal (lib/tutor/voice/turn-controller TERMINAL_ERROR_CODES),
  // so the strings must stay identical there: CAP_REACHED means the plan has no
  // minutes left (spec R7 hard stop), SESSION_ENDED that the session is over.
  CAP_REACHED: 'CAP_REACHED',
  SESSION_ENDED: 'SESSION_ENDED',
  // KAIZEN: this deploy has no provider key, so no turn can ever succeed on
  // it. Terminal in the client (turn-controller TERMINAL_ERROR_CODES): a
  // retry cannot install a key, and retrying turns one clear message into a
  // session that looks like it is trying.
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  // KAIZEN: a one-time link (password reset, parent invitation) that is
  // expired, already used, or unknown. One code for all three on purpose:
  // telling a caller which it was tells them which tokens exist.
  INVALID_TOKEN: 'INVALID_TOKEN',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export interface ApiErrorBody {
  success: false;
  errorCode: ApiErrorCode;
  error: string;
  details?: string;
}

export function apiError(
  code: ApiErrorCode,
  status: number,
  error: string,
  details?: string,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      success: false as const,
      errorCode: code,
      error,
      ...(details ? { details } : {}),
    },
    { status },
  );
}

export function apiSuccess<T extends Record<string, unknown>>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, ...data }, { status });
}
