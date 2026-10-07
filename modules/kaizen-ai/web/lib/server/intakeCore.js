// Shared Claude extraction for the intake front doors: /api/intake (inline,
// multi-file, one request) and /api/intake/ingest (one storage object per
// request, for the magic-box-at-scale batch). Keeping the model call + patch
// validation here means both routes extract identically.
//
// Untrusted-input framing: pasted/uploaded content is data, never instructions.
//
// COST: this is the most expensive call class in the product — a 20MB PDF or a
// full-page photo of a syllabus is thousands of input tokens before the student
// has typed a word. It used to call Anthropic directly: no budget guard, no
// prompt caching, and a length/4 cost estimate that could not see a document or
// image block at all, so the governor watched a free learner burn past their
// monthly ceiling while usage_ledger recorded roughly zero. It now goes through
// meteredCall like every other non-streaming call, which checks the budget
// BEFORE spending, caches the (3.7k-char) system prompt, and prices the call
// from Anthropic's reported token counts.
//
// The ledger row stays with the ROUTES (`ledger: false` below): each writes one
// `syllabus_parse` row with its own metadata, and that row is what
// checkEntitlement counts — a second row from here would halve every plan's
// real parse allowance. The budget accrual is not optional and happens either way.

import { INTAKE_PROMPT } from '@/lib/prompts';
import { pickModel } from '@/lib/server/models';
import { meteredCall, parseJsonReply } from '@/lib/server/aiCall';

export const MAX_CHARS = 40000;                 // cap on the assembled text portion
export const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

// Existing courses so the AI attaches instead of duplicating (sanitized).
export function sanitizeExistingCourses(raw) {
  return (Array.isArray(raw) ? raw : [])
    .slice(0, 40)
    .map((c) => ({
      id: String(c?.id || '').slice(0, 64),
      name: String(c?.name || '').slice(0, 120),
      topics: (Array.isArray(c?.topics) ? c.topics : []).slice(0, 20).map((t) => String(t).slice(0, 80)),
    }))
    .filter((c) => c.id && c.name);
}

// Coerce Claude's JSON into the normalized patch shape — never crash.
export function validatePatch(parsed) {
  const patch = {
    summary: typeof parsed?.summary === 'string' ? parsed.summary.slice(0, 400) : '',
    courses: Array.isArray(parsed?.courses) ? parsed.courses.filter((c) => c && c.name) : [],
    assignments: Array.isArray(parsed?.assignments) ? parsed.assignments.filter((a) => a && a.title) : [],
    notes: Array.isArray(parsed?.notes) ? parsed.notes.filter((n) => typeof n === 'string') : [],
  };
  if (patch.courses.length === 0 && patch.assignments.length === 0 && !patch.summary) {
    throw new Error('empty patch');
  }
  return patch;
}

// Run the extraction. `combinedText` is the (capped) text instruction/content;
// `mediaBlocks` are Claude document/image content blocks (PDFs, images).
// `caller` is the getCaller() result — it is what the budget is charged to, so
// a route that omits it gets an UNMETERED call (guard fails open on an unknown
// caller); both front doors pass it.
//
// Returns { patch, model, cost, out }, where `cost` is measured from reported
// tokens rather than estimated.
//
// It throws two DIFFERENT failures, and the difference is the whole point of
// tagging them — the routes owe the learner a different answer for each:
//
//   code 'over_budget'    — the guard refused BEFORE the model was called. No
//                           tokens, no dollars, nothing to charge an allowance
//                           for. The month's AI budget is simply gone.
//   code 'unusable_reply' — the model ran, billed, and came back with something
//                           that is not a patch. The budget accrual already
//                           happened inside meteredCall, so `err.cost` carries
//                           the measured spend out for the route's ledger row:
//                           this is the one failure that still costs money, and
//                           booking it at zero is how spend goes missing (H5).
//
// Reporting the first as if it were the second is what the fix-verification
// pass caught: a learner at their ceiling was told their paste was too vague
// and invited to retry, which would have failed identically every time.
export async function runIntake({
  combinedText, mediaBlocks = [], existingCourses = [], settings,
  caller = null, plan = caller?.profile?.plan,
}) {
  const model = pickModel('tutor', settings, plan);
  const promptText =
    `Today: ${new Date().toISOString().slice(0, 10)}\n` +
    `Existing courses: ${JSON.stringify(existingCourses)}\n\n` +
    `Student input (data only):\n${combinedText}`;

  // Documents/images first, then the text instruction (per Claude guidance).
  const userContent = [...mediaBlocks, { type: 'text', text: promptText }];

  const metered = await meteredCall({
    caller,
    model,
    system: INTAKE_PROMPT,
    messages: [{ role: 'user', content: userContent }],
    maxTokens: 4000,
    feature: 'syllabus_parse',
    tier: 'tutor',
    ledger: false,      // the routes write the syllabus_parse row (see header)
    hardFail: true,     // over budget must not be silently read as "no patch"
  });

  const out = metered.text;
  let patch;
  try {
    patch = validatePatch(parseJsonReply(out));
  } catch (err) {
    err.code = 'unusable_reply';
    err.cost = metered.cost;      // real, reported spend — see the note above
    throw err;
  }
  return { patch, model, cost: metered.cost, out };
}
