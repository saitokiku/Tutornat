// Upload failures must be legible to a student.
//
// The intake flow surfaced Supabase Storage errors verbatim, so a 14-year-old
// uploading a syllabus was shown "Bucket not found" — an infrastructure message
// about a server-side misconfiguration they cannot act on and did not cause.

import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadErrorMessage } from '@/lib/intakeBatch.js';

// Silence the diagnostic console.error these paths intentionally emit.
const quiet = (fn) => {
  const orig = console.error;
  console.error = () => {};
  try { return fn(); } finally { console.error = orig; }
};

test('the bucket-missing error never reaches the student raw', () => {
  const msg = quiet(() => uploadErrorMessage({ message: 'Bucket not found' }));
  assert.ok(!/bucket/i.test(msg), `leaked infrastructure wording: ${msg}`);
  assert.ok(/aren’t switched on|not.*switched on/i.test(msg));
  // It must not blame the student for our missing migration.
  assert.ok(/nothing you did wrong/i.test(msg));
});

test('it matches the real shapes Supabase returns', () => {
  for (const raw of ['Bucket not found', 'bucket_not_found', 'The resource was not found: Bucket not found']) {
    const msg = quiet(() => uploadErrorMessage({ message: raw }));
    assert.ok(!/bucket/i.test(msg), `not translated: ${raw}`);
  }
});

test('each known cause gets its own actionable message', () => {
  const cases = [
    ['new row violates row-level security policy', /permissions problem/i],
    ['Payload too large', /too big/i],
    ['maximum size exceeded', /too big/i],
    ['JWT expired', /session expired/i],
    ['Failed to fetch', /lost connection/i],
  ];
  for (const [raw, expected] of cases) {
    const msg = quiet(() => uploadErrorMessage({ message: raw }));
    assert.match(msg, expected, `"${raw}" -> "${msg}"`);
  }
});

test('unknown errors pass through rather than being swallowed', () => {
  // Better an odd message than a silent failure nobody can debug.
  const msg = quiet(() => uploadErrorMessage({ message: 'some novel storage fault' }));
  assert.equal(msg, 'some novel storage fault');
});

test('null and malformed errors still produce something sayable', () => {
  assert.equal(quiet(() => uploadErrorMessage(null)), 'Upload failed.');
  assert.equal(quiet(() => uploadErrorMessage({})), 'Upload failed.');
  assert.equal(quiet(() => uploadErrorMessage('raw string')), 'raw string');
});
