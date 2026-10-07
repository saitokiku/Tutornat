/**
 * Error-text scrubber (spec §8.5 "Sentry scrubbing verified"; CLAUDE.md logs
 * rule). Removes anything that looks like an email, a key or bearer token, a
 * secret query parameter, a long opaque token, or a quoted passage (the shape
 * a transcript takes inside a provider error), then truncates.
 */
export const MAX_ERROR_MESSAGE_LENGTH = 500;
export const MAX_STACK_LENGTH = 2_000;

const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/g;
const SECRET_PARAM = /\b(api[_-]?key|token|secret|password|signature|sig|auth)=([^&\s"'`]+)/gi;
const KEY_LIKE = /\b(?:sk|pk|rk|whsec|phc|phx|phs|xox[abp]|ghp|AKIA)[-_][A-Za-z0-9_-]{8,}\b/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const LONG_TOKEN = /\b[A-Za-z0-9_-]{32,}\b/g;
const QUOTED = /"[^"\n]{20,}"|'[^'\n]{20,}'|“[^”\n]{20,}”/g;

export function scrubErrorText(text: string, max = MAX_ERROR_MESSAGE_LENGTH): string {
  const scrubbed = text
    .replace(BEARER, 'Bearer [redacted]')
    .replace(SECRET_PARAM, '$1=[redacted]')
    .replace(KEY_LIKE, '[key]')
    .replace(EMAIL, '[email]')
    .replace(LONG_TOKEN, '[token]')
    .replace(QUOTED, '[quoted]');
  return scrubbed.length > max ? `${scrubbed.slice(0, max - 1)}…` : scrubbed;
}
