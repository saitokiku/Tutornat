/**
 * The topic a learner brings (D35): a subject and their own words. Parsed
 * once here for the session route and the guest route, so both refuse the
 * same shapes. The text is the learner's, so it is data in the prompt's
 * context section and never an instruction; control characters are dropped
 * and the length is bounded.
 */
import type { SessionTopic } from '@/lib/tutor/contracts';
import { isSubjectId } from '@/lib/tutor/graph/subjects';

export const TOPIC_TEXT_MAX = 300;

export type ParsedTopic = { ok: true; topic: SessionTopic | null } | { ok: false; message: string };

/** `undefined`/`null` is "no topic"; anything else must be a well-formed topic. */
export function parseSessionTopic(value: unknown): ParsedTopic {
  if (value === undefined || value === null) return { ok: true, topic: null };
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, message: 'topic must be an object with subject and text.' };
  }
  const { subject, text } = value as Record<string, unknown>;
  if (!isSubjectId(subject)) return { ok: false, message: 'topic.subject is not a known subject.' };
  if (typeof text !== 'string') return { ok: false, message: 'topic.text must be a string.' };
  const cleaned = text
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return { ok: false, message: 'topic.text is required.' };
  if (cleaned.length > TOPIC_TEXT_MAX) {
    return { ok: false, message: `topic.text must be ${TOPIC_TEXT_MAX} characters or fewer.` };
  }
  return { ok: true, topic: { subject, text: cleaned } };
}
