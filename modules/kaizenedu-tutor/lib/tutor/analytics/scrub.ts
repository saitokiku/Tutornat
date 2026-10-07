/**
 * Property scrubber shared by the server and browser trackers (CLAUDE.md:
 * analytics carry ids, never transcripts, names, or media). Pure; no imports
 * that would pull server code into the client bundle.
 */
import type { AnalyticsValue } from './events';

export const MAX_PROP_LENGTH = 200;

const FORBIDDEN_KEY = /text|transcript|name|email|note/i;
const EMAIL_LIKE = /[^\s@]+@[^\s@]+\.[A-Za-z]{2,}/;

export function isForbiddenPropName(key: string): boolean {
  return FORBIDDEN_KEY.test(key);
}

/**
 * Keeps strings (≤ 200 chars, not email-shaped), finite numbers, and
 * booleans under allowed names; drops everything else, including nested
 * objects, so a payload can never smuggle content.
 */
export function scrubAnalyticsProps(
  props: Record<string, unknown>,
): Record<string, Exclude<AnalyticsValue, undefined>> {
  const out: Record<string, Exclude<AnalyticsValue, undefined>> = {};
  for (const [key, value] of Object.entries(props)) {
    if (isForbiddenPropName(key)) continue;
    if (typeof value === 'string') {
      if (value.length > MAX_PROP_LENGTH || EMAIL_LIKE.test(value)) continue;
      out[key] = value;
    } else if (typeof value === 'number') {
      if (Number.isFinite(value)) out[key] = value;
    } else if (typeof value === 'boolean') {
      out[key] = value;
    }
  }
  return out;
}
