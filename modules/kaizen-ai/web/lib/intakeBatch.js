'use client';

// Magic-box-at-scale client engine. Uploads each file straight to the private
// `documents` Storage bucket, then calls /api/intake/ingest once per file with
// a small concurrency pool. Patches merge progressively (each file sees the
// courses the previous ones created, via getExistingCourses), so a whole
// semester of mixed files becomes one organized dashboard without ever hitting
// the ~4.5MB request-body limit.

import { supabase } from '@/lib/supabaseClient';

const TEXTY = /\.(txt|md|markdown|csv|json|tex|py|js|html?)$/i;
const IMAGE_MEDIA = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };

export const BATCH_CAPS = {
  files: 30,
  totalBytes: 150 * 1024 * 1024,   // 150MB per batch
  fileBytes: 25 * 1024 * 1024,     // 25MB per file (bucket enforces this too)
};

export function classifyFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const type = file.type || '';
  if (TEXTY.test(file.name) || type.startsWith('text/')) return { kind: 'text' };
  if (ext === 'pdf' || type === 'application/pdf') return { kind: 'pdf', mediaType: 'application/pdf' };
  if (IMAGE_MEDIA[ext] || type.startsWith('image/')) return { kind: 'image', mediaType: IMAGE_MEDIA[ext] || type };
  if (ext === 'docx' || ext === 'doc' || type.includes('word') || type.includes('officedocument')) return { kind: 'docx' };
  return { kind: 'text' };
}

export function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);
}

async function sha256Hex(file) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeName(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80) || 'file';
}

// runIntakeBatch(items, opts)
//   items: [{ id, file, name, size, kind, mediaType }]
//   getExistingCourses(): fresh [{id,name,topics}] — called per file so dedupe
//     sees courses created by earlier files in the same batch
//   onProgress(id, status, error): 'uploading'|'reading'|'done'|'duplicate'|'failed'|'limited'
//   onResult(patch, document): merge into app state (patch) + library (document)
// Storage errors were surfaced raw, so a student uploading a syllabus saw
// "Bucket not found" — an infrastructure message they cannot act on, about a
// problem that is ours. Translate the ones with a known cause and keep the
// original in the console for whoever has to fix it.
export function uploadErrorMessage(err) {
  // Only a string or a .message is usable. An object without one must NOT fall
  // through to String(err) — `{}` is truthy and stringifies to "[object Object]",
  // which is precisely the kind of thing that ends up in front of a student.
  const raw =
    (typeof err === 'string' && err) ||
    (typeof err?.message === 'string' && err.message) ||
    'Upload failed.';
  const lower = raw.toLowerCase();
  if (typeof console !== 'undefined') console.error('[intake] storage upload failed:', raw);

  // The bucket row is absent — migration 0006/0014 was never applied.
  if (lower.includes('bucket not found') || lower.includes('bucket_not_found')) {
    return 'File uploads aren’t switched on for this site yet. Nothing you did wrong — we’ve been told.';
  }
  // RLS denial: policy missing or the path prefix isn't the caller's uid.
  if (lower.includes('row-level security') || lower.includes('violates') || lower.includes('unauthorized')) {
    return 'We couldn’t save that file — a permissions problem on our side.';
  }
  if (lower.includes('payload too large') || lower.includes('exceeded') || lower.includes('maximum size')) {
    return 'That file is too big to upload. Try splitting or compressing it.';
  }
  if (lower.includes('jwt') || lower.includes('expired')) {
    return 'Your session expired — refresh the page and try again.';
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Lost connection while uploading. Check your signal and retry.';
  }
  return raw;
}

/**
 * @param {Array} items
 * @param {{getExistingCourses?: Function, onProgress?: Function, onResult?: Function, concurrency?: number}} [opts]
 */
export async function runIntakeBatch(items, { getExistingCourses, onProgress, onResult, concurrency = 2 } = {}) {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess?.session?.user?.id;
  const token = sess?.session?.access_token;
  if (!uid || !token) throw new Error('Sign in to upload files.');

  async function process(item) {
    const set = (status, error = null) => onProgress?.(item.id, status, error);
    try {
      if (item.file.size > BATCH_CAPS.fileBytes) return set('failed', 'Over 25MB — split or compress it.');
      set('uploading');
      const sha = await sha256Hex(item.file);
      const path = `${uid}/${item.id}/${safeName(item.name)}`;
      const up = await supabase.storage.from('documents').upload(path, item.file, {
        upsert: true, contentType: item.file.type || undefined,
      });
      if (up.error) return set('failed', uploadErrorMessage(up.error));

      set('reading');
      const res = await fetch('/api/intake/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          docId: item.id, storagePath: path, name: item.name,
          mime: item.file.type || item.mediaType || null, kind: item.kind,
          sha256: sha, size: item.size,
          existingCourses: getExistingCourses?.() || [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        set(data.code === 'limit' ? 'limited' : 'failed', data.error || `Failed (${res.status}).`);
        return;
      }
      if (data.duplicate) { set('duplicate'); onResult?.(data.patch, data.document); return; }
      if (data.error) { set('failed', data.error); if (data.document) onResult?.(data.patch, data.document); return; }
      set('done');
      onResult?.(data.patch, data.document);
    } catch (e) {
      set('failed', e.message || 'Failed.');
    }
  }

  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      await process(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}
