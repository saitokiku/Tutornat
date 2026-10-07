// The live voice tutor must carry the same wellbeing guardrails as text chat.
//
// A minor can disclose self-harm or abuse to the voice tutor exactly as they can
// in text, and there is no human in the loop either way. The text route composed
// STUDENT_SAFETY into its system prompt; the realtime voice route did not, so the
// voice tutor would keep tutoring through a crisis. These tests lock the fix in
// so it cannot silently regress — a safety guardrail with no test is one refactor
// from gone.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { STUDENT_SAFETY } from '@/lib/prompts.js';

const here = dirname(fileURLToPath(import.meta.url));
const routeSrc = readFileSync(
  join(here, '..', 'app', 'api', 'voice', 'realtime-token', 'route.js'),
  'utf8',
);

test('STUDENT_SAFETY carries the crisis resources a minor might need', () => {
  // The specific numbers matter — a vague "seek help" is not a referral.
  assert.match(STUDENT_SAFETY, /988/, 'Suicide & Crisis Lifeline');
  assert.match(STUDENT_SAFETY, /741741/, 'Crisis Text Line');
  assert.match(STUDENT_SAFETY, /911/, 'immediate danger');
  assert.match(STUDENT_SAFETY, /1-800-422-4453/, 'Childhelp / abuse');
  assert.match(STUDENT_SAFETY, /minor/i, 'age-appropriate boundary');
});

test('the live voice route composes STUDENT_SAFETY into the session instructions', () => {
  assert.match(routeSrc, /import\s*\{[^}]*STUDENT_SAFETY[^}]*\}\s*from\s*'@\/lib\/prompts'/,
    'route must import the shared safety block, not inline its own');
  assert.match(routeSrc, /STUDENT_SAFETY/,
    'STUDENT_SAFETY must appear in the composed instructions');
  // The persona-only string that used to be the entire instruction must no
  // longer be handed to the model on its own.
  assert.doesNotMatch(
    routeSrc,
    /instructions:\s*'You are Kaizen, a Socratic voice tutor\. Keep every reply under 3 sentences\. Ask one question at a time\. Never give final homework answers directly\.'/,
    'the bare persona string (no safety guardrails) must not be the instructions',
  );
});

test('the voice route tells the model it is being heard, not read', () => {
  // VOICE_NOTE stops the model emitting Markdown/LaTeX a speaker would read aloud
  // as literal symbols. Wired in the same place as the safety block.
  assert.match(routeSrc, /VOICE_NOTE/, 'voice route should apply the spoken-output note');
});
