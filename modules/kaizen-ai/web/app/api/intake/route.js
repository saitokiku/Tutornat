// POST /api/intake — the universal front door for INLINE input. Claude reads
// ARBITRARY student input (syllabus, brain dump, single task, attached
// text/PDF/image/Word files sent as base64) plus the student's existing
// courses and returns a normalized patch merged client-side via lib/intake.js.
//
// This route is for small/one-shot input under the ~4.5MB serverless body
// limit. For many/large files the client uses /api/intake/ingest (storage-first
// batch) instead. Both share web/lib/server/intakeCore.js.

import mammoth from 'mammoth';
import { getCaller, getSettings, checkEntitlement, recordUsage } from '@/lib/server/context';
import { rateLimitResponse } from '@/lib/server/ratelimit';
import { runIntake, sanitizeExistingCourses, MAX_CHARS, IMAGE_TYPES } from '@/lib/server/intakeCore';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_MEDIA = 5;                     // pdf/image blocks per request
const MAX_B64 = 5 * 1024 * 1024;         // per-file base64 guard (~3.75MB source)

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'Not configured: set ANTHROPIC_API_KEY on the server.' }, { status: 501 });
  }
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });

  const limited = await rateLimitResponse(caller, req);
  if (limited) return limited;

  const ent = await checkEntitlement(caller, 'syllabus_parse');
  if (!ent.ok) return Response.json({ error: ent.reason }, { status: 429 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }

  // Assemble input. Text (pasted + text files + Word extraction) is capped and
  // inlined; PDFs and images become their own Claude content blocks.
  const textParts = [];
  const pasted = String(body?.text || '').trim();
  if (pasted) textParts.push(pasted);

  const mediaBlocks = [];
  const files = Array.isArray(body?.files) ? body.files.slice(0, 10) : [];

  for (const f of files) {
    if (!f) continue;
    const name = String(f.name || 'file').slice(0, 120);
    const kind = String(f.kind || (typeof f.text === 'string' ? 'text' : ''));

    if (kind === 'text' && typeof f.text === 'string') {
      textParts.push(`--- attached file: ${name} ---\n${f.text}`);
      continue;
    }
    if (typeof f.data !== 'string' || f.data.length === 0 || f.data.length > MAX_B64) continue;

    if (kind === 'pdf' && mediaBlocks.length < MAX_MEDIA) {
      mediaBlocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.data } });
    } else if (kind === 'image' && mediaBlocks.length < MAX_MEDIA) {
      const mt = IMAGE_TYPES.has(f.mediaType) ? f.mediaType : 'image/png';
      mediaBlocks.push({ type: 'image', source: { type: 'base64', media_type: mt, data: f.data } });
    } else if (kind === 'docx') {
      try {
        const { value } = await mammoth.extractRawText({ buffer: Buffer.from(f.data, 'base64') });
        if (value && value.trim()) textParts.push(`--- attached file: ${name} ---\n${value.trim()}`);
      } catch { /* unreadable doc — skip, other inputs may still carry the load */ }
    }
  }

  let combinedText = textParts.join('\n\n').slice(0, MAX_CHARS);

  if (combinedText.trim().length < 20 && mediaBlocks.length === 0) {
    return Response.json({ error: 'Tell me a little more — a class name, an assignment, or attach your syllabus.' }, { status: 422 });
  }
  // Media-only submissions still need a text instruction for the model.
  if (!combinedText.trim()) combinedText = 'The attached file(s) are my course material — organize them.';

  const existingCourses = sanitizeExistingCourses(body?.existingCourses);
  const settings = await getSettings();

  try {
    // `caller` is what the cost governor charges — without it the call is
    // unmetered (H5). The ledger row below stays here; runIntake does not write one.
    const { patch, model, cost } = await runIntake({
      combinedText, mediaBlocks, existingCourses, settings, caller, plan: caller.profile?.plan,
    });
    recordUsage(caller, 'syllabus_parse', 1, cost.usd, { model, mode: 'intake', files: mediaBlocks.length }).catch(() => {});
    return Response.json(patch);
  } catch (err) {
    // Two failures reach here and they are not the same thing. Running out of
    // AI budget is not a content problem: "try adding a bit more detail" sends
    // a learner round a loop that cannot succeed until the month rolls over, no
    // matter what they paste. Say what happened, and say what still works —
    // everything downstream of the model does.
    if (err?.code === 'over_budget') {
      return Response.json({
        error: "This month's AI budget is used up, so I can't read new pastes or files until it resets. "
          + 'You can still add classes and assignments by hand, and practice, checks and reviews are unaffected.',
        code: 'over_budget',
      }, { status: 429 });
    }
    // Everything else is a genuine failure to read the input, and asking for
    // more detail IS the advice that helps. If the model ran and billed before
    // returning something unusable it carries its measured cost out with it:
    // book that rather than losing it, at quantity 0, because the learner got
    // nothing and a failed read must not eat one of their parses. (The dollar
    // budget already accrued inside meteredCall; this is the audit row.) A call
    // that never came back has no cost to claim, so it writes nothing.
    if (err?.cost) {
      recordUsage(caller, 'syllabus_parse', 0, err.cost.usd, {
        mode: 'intake', outcome: 'unusable_reply', files: mediaBlocks.length,
      }).catch(() => {});
    }
    return Response.json({ error: "I couldn't sort that — try adding a bit more detail." }, { status: 422 });
  }
}
