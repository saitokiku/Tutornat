// Live end-to-end check: boots the REAL server, makes REAL Fable calls through
// ai_bridge.py, validates the lesson against the shared contract, then grades a
// synthetic answer and asks for real feedback. Two live calls. No fallbacks.
//
//   node lesson/tests/live-e2e.mjs
//
// It is a PROVIDER + CONTRACT proof, not a curriculum-quality claim.
import { createServer } from '../server.mjs';
import { validateLesson, gradeAnswer, chooseNext } from '../core.mjs';
import { request } from 'node:http';
import { writeFileSync, mkdirSync } from 'node:fs';

const server = createServer();            // real DEFAULT_AI_CMD -> managed Hermes runtime
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const call = (path, body) => new Promise((resolve, reject) => {
  const payload = body === undefined ? null : JSON.stringify(body);
  const req = request({ host: '127.0.0.1', port, path, method: body === undefined ? 'GET' : 'POST',
    headers: { host: `127.0.0.1:${port}`, origin: `http://127.0.0.1:${port}`,
      ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}) },
  }, (res) => { let raw = ''; res.setEncoding('utf8'); res.on('data', (c) => { raw += c; });
    res.on('end', () => resolve({ status: res.statusCode, body: raw })); });
  req.on('error', reject);
  if (payload) req.write(payload);
  req.end();
});

const log = [];
const step = (name, ok, detail) => { log.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };

try {
  const health = await call('/api/health');
  step('health responds (liveness of this process only, NOT provider proof)',
    health.status === 200 && JSON.parse(health.body).ok === true, health.body);

  // ---- LIVE CALL 1: generate a lesson
  const t0 = Date.now();
  const res = await call('/api/lesson', { goal: 'compare fractions with the same numerator',
    subject: 'math', grade: '3', locale: 'en', adultTest: true });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  step('POST /api/lesson returned 200 from a live model call', res.status === 200, `${res.status} in ${elapsed}s`);
  if (res.status !== 200) throw new Error(`lesson failed: ${res.body}`);
  const { lesson, provenance } = JSON.parse(res.body);

  step('lesson revalidates against the shared contract', (() => { validateLesson(lesson); return true; })(),
    `${lesson.steps.length} steps, visuals: ${lesson.steps.map((s) => s.visual.kind).join(',')}`);
  step('third step is a DISTINCT fresh check',
    lesson.steps[2].prompt.toLowerCase() !== lesson.steps[0].prompt.toLowerCase(), lesson.steps[2].prompt);
  step('request subject/grade/locale honoured',
    lesson.subject === 'math' && lesson.grade === '3' && lesson.locale === 'en',
    `${lesson.subject}/${lesson.grade}/${lesson.locale}`);
  step('provenance declares a live call and does not fake a wire identity',
    provenance.live === true && provenance.provider === 'anthropic',
    JSON.stringify(provenance));

  // ---- Local grading is canonical (no live call)
  const fresh = lesson.steps[2];
  const wrong = fresh.kind === 'choice'
    ? fresh.choices.find((c) => c !== fresh.answer)
    : (fresh.kind === 'numeric' ? '99999' : 'the');
  const wrongVerdict = gradeAnswer(fresh, wrong);
  step('local check marks a deliberately wrong synthetic answer not-correct',
    wrongVerdict.verdict !== 'correct', `${JSON.stringify(wrong)} -> ${wrongVerdict.verdict}`);

  // ---- LIVE CALL 2: real feedback on that actual wrong answer
  const fb = await call('/api/feedback', { adultTest: true, lesson, stepId: fresh.id,
    answer: String(wrong), mode: 'answer', priorHints: 1 });
  step('POST /api/feedback returned 200 from a live model call', fb.status === 200, String(fb.status));
  if (fb.status !== 200) throw new Error(`feedback failed: ${fb.body}`);
  const { feedback } = JSON.parse(fb.body);
  step('model could not overturn the local verdict',
    feedback.verdict === wrongVerdict.verdict, `local=${wrongVerdict.verdict} served=${feedback.verdict}`);
  step('wrong answer routes to retry with a DIFFERENT explanation',
    feedback.nextAction === (wrongVerdict.verdict === 'ungraded' ? 'continue' : 'retry')
    && feedback.alternateExplanation !== fresh.explanation,
    `nextAction=${feedback.nextAction}`);
  step('feedback text is specific, not boilerplate', feedback.text.length > 20, feedback.text.slice(0, 140));

  // ---- Growth path from real evidence (no live call)
  const assistedPass = chooseNext(lesson, [{ lessonId: lesson.id, stepId: fresh.id, answer: String(fresh.answer),
    verdict: 'correct', assisted: true, source: 'local-check', at: new Date().toISOString() }]);
  step('hint-assisted success does NOT advance', assistedPass.kind === 'reinforce', assistedPass.goal);
  const cleanPass = chooseNext(lesson, [{ lessonId: lesson.id, stepId: fresh.id, answer: String(fresh.answer),
    verdict: 'correct', assisted: false, source: 'local-check', at: new Date().toISOString() }]);
  step('unassisted correct fresh check suggests advance (suggestion, not mastery)',
    cleanPass.kind === (fresh.kind === 'writing' ? 'reinforce' : 'advance'), cleanPass.goal);

  mkdirSync(new URL('../evidence/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../evidence/live-e2e.json', import.meta.url), JSON.stringify({
    at: new Date().toISOString(), elapsed_lesson_s: Number(elapsed),
    provenance, lesson, feedback, checks: log,
    caveats: ['adultTest is a development acknowledgment, not verified age or parental consent',
      'answer keys are AI-generated, not reviewed curriculum',
      'model_wire_proved is false: the managed runtime does not surface the wire model id',
      'advance is a conservative suggestion; it is never a mastery claim'],
  }, null, 2));
} finally {
  server.close();
}
const failed = log.filter((l) => !l.ok);
console.log(`\n${log.length - failed.length}/${log.length} live checks passed`);
process.exit(failed.length ? 1 : 0);
