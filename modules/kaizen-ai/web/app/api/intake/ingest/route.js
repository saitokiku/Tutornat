// POST /api/intake/ingest — one storage object per request. The client uploads
// each file straight to the private `documents` bucket, then calls this once per
// file. The route downloads the object with the service role (so large files
// never transit the ~4.5MB client→serverless body limit), extracts it with the
// shared intake core, records the document row, and returns the patch + the
// library document so the client can merge both progressively.
//
// The service role bypasses RLS, so the storage-path prefix check below is
// LOAD-BEARING: it is the only thing stopping one user from ingesting another's
// object.

import mammoth from 'mammoth';
import { getCaller, getSettings, serviceClient, checkEntitlement, recordUsage, auditLog } from '@/lib/server/context';
import { checkRate, rateKey } from '@/lib/server/ratelimit';
import { runIntake, sanitizeExistingCourses, MAX_CHARS, IMAGE_TYPES } from '@/lib/server/intakeCore';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_PDF = 20 * 1024 * 1024;    // Anthropic PDF ceiling is 32MB base64 ≈ 24MB source
const MAX_IMAGE = 5 * 1024 * 1024;
const MIME_IMAGE = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'Not configured: set ANTHROPIC_API_KEY on the server.' }, { status: 501 });
  }
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ error: 'File intake needs a real account.' }, { status: 501 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Supabase not configured.' }, { status: 501 });

  // Higher-throughput bucket than the shared AI limiter so a whole batch fits.
  const rl = await checkRate(rateKey(caller, req, 'ingest'), { limit: 40, windowMs: 60_000 });
  if (!rl.ok) {
    return Response.json({ error: 'Uploading too fast — pausing a moment.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }

  const ent = await checkEntitlement(caller, 'syllabus_parse');
  if (!ent.ok) return Response.json({ error: ent.reason, code: 'limit' }, { status: 429 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }

  const docId = String(body?.docId || '').slice(0, 80);
  const storagePath = String(body?.storagePath || '');
  const name = String(body?.name || 'file').slice(0, 200);
  const mime = String(body?.mime || '').slice(0, 100) || null;
  const kind = String(body?.kind || 'text');
  const sha256 = body?.sha256 ? String(body.sha256).slice(0, 64) : null;
  const size = Number.isFinite(Number(body?.size)) ? Math.max(0, Math.round(Number(body.size))) : 0;
  const courseId = body?.courseId ? String(body.courseId).slice(0, 80) : null;

  if (!docId || !storagePath) return Response.json({ error: 'Missing file reference.' }, { status: 400 });
  // LOAD-BEARING: service role bypasses RLS — the object must be in the caller's folder.
  if (!storagePath.startsWith(`${caller.user.id}/`)) {
    return Response.json({ error: 'That file is not yours.' }, { status: 403 });
  }
  // ALSO LOAD-BEARING: documents.id is a client-generated text primary key and
  // the upsert below is onConflict:'id'. Without this check, posting someone
  // else's docId rewrites THEIR row — user_id, storage_path and text_content,
  // which feeds the tutor's context. The storagePath check above does not cover
  // it: an attacker passes their own valid path with a victim's id.
  const { data: owner, error: ownerErr } = await svc
    .from('documents').select('user_id').eq('id', docId).maybeSingle();
  if (ownerErr) return Response.json({ error: 'Could not verify the file.' }, { status: 500 });
  if (owner && owner.user_id !== caller.user.id) {
    return Response.json({ error: 'That file is not yours.' }, { status: 403 });
  }

  // Dedup: same bytes already in the library → return the existing entry, drop
  // the redundant upload, and don't spend a parse.
  if (sha256) {
    const { data: dup } = await svc.from('documents')
      .select('id,name,size_bytes,mime,course_id,concept,text_content,storage_path,sha256,created_at')
      .eq('user_id', caller.user.id).eq('sha256', sha256).neq('id', docId).maybeSingle();
    if (dup) {
      svc.storage.from('documents').remove([storagePath]).catch(() => {});
      return Response.json({ duplicate: true, document: shapeDoc(dup), patch: { summary: '', courses: [], assignments: [], notes: [] } });
    }
  }

  // Download the object (service role — bypasses RLS, hence the prefix check above).
  const { data: blob, error: dlErr } = await svc.storage.from('documents').download(storagePath);
  if (dlErr || !blob) return Response.json({ error: 'Could not read the uploaded file.' }, { status: 502 });
  const buf = Buffer.from(await blob.arrayBuffer());

  // Assemble Claude content by kind.
  const mediaBlocks = [];
  let textContent = null;         // stored on the document row (tutor context)
  let combinedText = 'The attached file is my course material — organize it.';

  try {
    if (kind === 'pdf') {
      if (buf.length > MAX_PDF) return failRow(svc, caller, docId, storagePath, name, size, mime, sha256, courseId, 'PDF is too large (max 20MB).');
      mediaBlocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') } });
    } else if (kind === 'image') {
      if (buf.length > MAX_IMAGE) return failRow(svc, caller, docId, storagePath, name, size, mime, sha256, courseId, 'Image is too large (max 5MB).');
      const ext = (name.split('.').pop() || '').toLowerCase();
      const mt = IMAGE_TYPES.has(mime) ? mime : (MIME_IMAGE[ext] || 'image/png');
      mediaBlocks.push({ type: 'image', source: { type: 'base64', media_type: mt, data: buf.toString('base64') } });
    } else if (kind === 'docx') {
      const { value } = await mammoth.extractRawText({ buffer: buf });
      textContent = (value || '').trim().slice(0, MAX_CHARS);
      if (textContent) combinedText = `--- ${name} ---\n${textContent}`;
    } else {
      textContent = buf.toString('utf8').slice(0, MAX_CHARS);
      if (textContent.trim()) combinedText = `--- ${name} ---\n${textContent}`;
    }
  } catch {
    return failRow(svc, caller, docId, storagePath, name, size, mime, sha256, courseId, 'That file could not be read.');
  }

  const existingCourses = sanitizeExistingCourses(body?.existingCourses);
  const settings = await getSettings();

  let result;
  let aiFailure = null;      // null | 'over_budget' | 'unusable_reply' | 'call_failed'
  try {
    // `caller` is what the cost governor charges — without it the call is
    // unmetered (H5). The ledger row below stays here; runIntake does not write one.
    result = await runIntake({ combinedText, mediaBlocks, existingCourses, settings, caller, plan: caller.profile?.plan });
  } catch (err) {
    // The file is still saved to the library; only the extraction failed. WHICH
    // way it failed decides both what the learner is told and what they are
    // charged — see the ledger and the responses below. An untagged throw is
    // the model call itself failing (timeout, API error): no patch, and no
    // usage figures to book either.
    aiFailure = (err?.code === 'over_budget' || err?.code === 'unusable_reply')
      ? err.code : 'call_failed';    // an SDK error's own `code` is not our taxonomy
    result = {
      patch: { summary: '', courses: [], assignments: [], notes: [] },
      model: null,
      cost: err?.cost || { usd: 0 },
    };
  }

  const row = {
    id: docId, user_id: caller.user.id, course_id: courseId,
    name, size_bytes: size, mime,
    text_content: textContent ? textContent.slice(0, 15000) : null,
    storage_path: storagePath, sha256, status: 'ready', error: null,
  };
  const { data: saved, error: upErr } = await svc.from('documents').upsert(row, { onConflict: 'id' }).select().maybeSingle();
  if (upErr) {
    console.error('[intake/ingest] document save failed', upErr.message);
    return Response.json({ error: 'Could not save the document — try again.' }, { status: 500 });
  }

  // The debit has to match what actually happened. Every outcome used to spend
  // one syllabus_parse — including the one where the budget guard refused
  // before the model was ever called, so a learner at their ceiling lost an
  // allowance to a call that never happened and saw nothing explaining it.
  //
  //   over_budget     no tokens, no dollars, no call — so no row at all.
  //   unusable_reply  the model ran and billed: book the real, already-accrued
  //                   dollars so the spend is not lost (H5), at quantity 0
  //                   because the learner got nothing back and a file we
  //                   couldn't read must not eat one of their parses.
  //   call_failed     same quantity 0, and a cost of zero because we have no
  //                   reported usage to claim — labelled, not guessed.
  //   parsed          quantity 1, the ordinary debit.
  if (aiFailure !== 'over_budget') {
    recordUsage(caller, 'syllabus_parse', aiFailure ? 0 : 1, result.cost?.usd || 0, {
      model: result.model, mode: 'ingest', kind, ...(aiFailure ? { outcome: aiFailure } : {}),
    }).catch(() => {});
  }
  auditLog(caller.user.id, 'intake.ingested', docId, { kind, name, outcome: aiFailure || 'parsed' }).catch(() => {});

  // Out of AI budget. This is the one failure that answers 429 rather than the
  // 200-with-an-error shape failRow uses, and the reason is the batch: the
  // client posts one request per file, up to forty of them, and an unreadable
  // FILE is a fact about that file while an exhausted budget is a fact about
  // the account. A 200 would march the whole batch through a wall it cannot
  // pass. The document still rides along so the library keeps the file.
  if (aiFailure === 'over_budget') {
    return Response.json({
      error: "This month's AI budget is used up. Your file is saved to your library, but I can't pull "
        + 'classes or assignments out of it until the budget resets. Practice, checks and reviews are unaffected.',
      code: 'over_budget',
      document: shapeDoc(saved || row),
      patch: result.patch,
    }, { status: 429 });
  }
  // The AI leg failed on this file — unusable reply, or the call never came
  // back. Saying so is the honest version of the silent empty patch this used
  // to return, and the file itself is still in the library either way.
  if (aiFailure) {
    return Response.json({
      error: "Saved to your library, but I couldn't pull classes or assignments out of this one — "
        + 'you can file it under a class by hand.',
      document: shapeDoc(saved || row),
      patch: result.patch,
    });
  }

  return Response.json({ patch: result.patch, document: shapeDoc(saved || row) });
}

// Persist a failed row (so the file still shows in the library) and return it.
async function failRow(svc, caller, docId, storagePath, name, size, mime, sha256, courseId, error) {
  const row = {
    id: docId, user_id: caller.user.id, course_id: courseId, name, size_bytes: size, mime,
    text_content: null, storage_path: storagePath, sha256, status: 'failed', error,
  };
  await svc.from('documents').upsert(row, { onConflict: 'id' });
  return Response.json({ error, document: shapeDoc(row), patch: { summary: '', courses: [], assignments: [], notes: [] } }, { status: 200 });
}

// Document row → client file-library shape (matches lib/cloud.js pullState).
function shapeDoc(d) {
  return {
    id: d.id, name: d.name, size: d.size_bytes || 0, type: d.mime || null,
    courseId: d.course_id || null, concept: d.concept || null,
    text: d.text_content || null, addedAt: d.created_at || new Date().toISOString(),
    storagePath: d.storage_path || null, sha256: d.sha256 || null, status: d.status || 'ready',
  };
}
