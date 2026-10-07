'use strict';
/* student-pages.test.cjs — repair cycle 2, student-page slice (F2-05 / F2-06 / F2-07). New file; original tests untouched.
 * APP_ROOT selects the frontend under test (defaults to the parent of tests/). Copy is exercised through copy.js; the
 * app.js call sites are guarded at source level here and exercised in a real browser by student-pages.e2e.cjs. */
const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path');
const ROOT = process.env.APP_ROOT || path.resolve(__dirname, '..');
const C = require(path.join(ROOT, 'copy.js'));
const APP = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const has = (k, locale) => k in C.DICT[locale];

test('F2-05 grades 3–5 student Record disclosure never promises date proposals/decisions (EN/ES) but keeps every actual sharing item', () => {
  for (const locale of ['en', 'es']) {
    assert.ok(has('rec_student_p_35', locale), locale + ' rec_student_p_35 must exist');
    assert.doesNotMatch(C.t(locale, 'rec_student_p_35'), /propos|propuesta|decision|decisión/i, locale + ' 3–5 text must not mention proposals/decisions');
  }
  const en = C.t('en', 'rec_student_p_35');
  for (const w of ['task', 'step', 'help', 'scripted', 'check', 'stuck', 'done', 'observation', 'school']) assert.match(en, new RegExp(w, 'i'), 'EN 3–5 must still disclose: ' + w);
  const es = C.t('es', 'rec_student_p_35');
  for (const w of ['tarea', 'paso', 'ayuda', 'guionizad', 'verificaci', 'atascad', 'hecha', 'observaci', 'escuela']) assert.match(es, new RegExp(w, 'i'), 'ES 3–5 must still disclose: ' + w);
});

test('F2-05 grades 6–8 disclosure still includes proposals; K–2 wording unchanged verbatim; app.js renders the band-specific key', () => {
  assert.match(C.t('en', 'rec_student_p'), /date proposals and their decisions/);
  assert.match(C.t('es', 'rec_student_p'), /propuestas de fecha y sus decisiones/);
  assert.equal(C.t('en', 'rec_k2_p'), 'Your grown-up can see what you did here, when you asked for help, and what they wrote about it.');
  assert.equal(C.t('es', 'rec_k2_p'), 'Tu adulto puede ver lo que hiciste aquí, cuándo pediste ayuda y lo que escribió sobre eso.');
  assert.match(APP, /rec_student_p_35/, 'app.js must render the 3–5 disclosure key');
  assert.match(APP, /rec_student_p/, 'app.js must keep the 6–8 disclosure key');
});

test('F2-06 parent Workspace shared-record line is parent-facing (EN/ES); student heading stays student-facing', () => {
  assert.equal(C.t('en', 'ws_shared_record_h'), 'Shared record for this task');
  assert.equal(C.t('es', 'ws_shared_record_h'), 'Registro compartido de esta tarea');
  assert.equal(C.t('en', 'rec_student_h'), 'What your parent can see');
  assert.equal(C.t('es', 'rec_student_h'), 'Lo que puede ver tu madre/padre');
  const start = APP.indexOf('} else if (isParent()) {', APP.indexOf('workspace() {')); const end = APP.indexOf('} else if (!started) {', start);
  assert.ok(start > 0 && end > start, 'parent branch of workspace() located');
  const parentBranch = APP.slice(start, end);
  assert.match(parentBranch, /ws_shared_record_h/, 'parent workspace notice must use the parent-facing key');
  assert.doesNotMatch(parentBranch, /rec_student_h/, 'parent workspace notice must not use the student-facing key');
});

test('F2-07 saved tally text is count-aware at save time: 0/1/2 marks in EN and ES', () => {
  assert.equal(C.tn('en', 'ws_tally_text', 0), 'Tally: 0 marks');
  assert.equal(C.tn('en', 'ws_tally_text', 1), 'Tally: 1 mark');
  assert.equal(C.tn('en', 'ws_tally_text', 2), 'Tally: 2 marks');
  assert.equal(C.tn('es', 'ws_tally_text', 0), 'Conteo: 0 marcas');
  assert.equal(C.tn('es', 'ws_tally_text', 1), 'Conteo: 1 marca');
  assert.equal(C.tn('es', 'ws_tally_text', 2), 'Conteo: 2 marcas');
  assert.match(APP, /tn\('ws_tally_text'/, 'tally save call site must use the plural-aware tn helper');
  assert.doesNotMatch(APP, /[^n]t\('ws_tally_text'/, 'the count-blind t() call must be gone');
});

test('F2 copy parity: no EN/ES key gaps after the student-page copy changes', () => { assert.deepEqual(C.missingKeys(), []); });
