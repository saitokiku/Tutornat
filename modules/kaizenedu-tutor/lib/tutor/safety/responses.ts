/**
 * The spoken crisis referral (spec §5.6). The text lives in
 * `lib/tutor/prompts/crisis.md` so the prompt linter covers it and the model
 * sees the same words it must use; this module reads it for the server's own
 * no-model path.
 */
import { spokenSections } from '@/lib/tutor/prompts/loader';

import type { CrisisCategory } from './patterns';

export function crisisReferralText(category: CrisisCategory): string {
  const sections = spokenSections('crisis');
  const key = category === 'self_harm' ? 'self-harm' : 'abuse';
  for (const [heading, body] of sections) {
    if (heading.toLowerCase().startsWith(key)) return body;
  }
  throw new Error(`crisis.md has no spoken section for ${category}`);
}
