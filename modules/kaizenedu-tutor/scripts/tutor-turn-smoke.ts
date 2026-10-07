/**
 * Live end-to-end check of the tutor loop (spec R1, R2; tutor-08).
 *
 * Drives one real turn through the real engine against the configured model,
 * on an in-process PGlite database, and prints every SSE frame exactly as the
 * turn route would send it. Nothing is mocked below `startTurn`: the prompt,
 * the tag parser, the whiteboard validator, the ledger, and the turn rows are
 * the shipped ones.
 *
 * It is the check the acceptance criterion asks for — a whiteboard action in a
 * fraction explanation — so it exits non-zero when the model produced none.
 *
 *   npx tsx scripts/tutor-turn-smoke.ts
 *   npx tsx scripts/tutor-turn-smoke.ts --text "why do I need a common denominator"
 *   npx tsx scripts/tutor-turn-smoke.ts --turns 3      # greet, then two work turns
 *   npx tsx scripts/tutor-turn-smoke.ts --rate 10      # the R2 80% drawing rate
 *
 * Requires a provider key in `.env.local` (or the environment) for whatever
 * DEFAULT_MODEL / MODEL_ROUTES resolves the `tutor-live-turn` stage to. It
 * spends real money: one model call per turn, at the live-turn stage.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function loadEnvFile(name: string): void {
  let content: string;
  try {
    content = readFileSync(join(process.cwd(), name), 'utf8');
  } catch {
    return;
  }
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');
process.env.TUTOR_MODE = '1';

/** Fraction questions that must produce a drawing (R2 acceptance, spec §5.2). */
const EXPLANATION_PROMPTS = [
  'I have to add one half plus one third and I keep getting two fifths. Why is that wrong?',
  'Why does one half plus one third not equal two fifths?',
  'Which is bigger, three fifths or two thirds, and how do I tell?',
  'How do I turn seven fourths into a mixed number?',
  'Why is two sixths the same as one third?',
  'How do I divide three quarters by one half?',
  'Why does multiplying by one half make the answer smaller?',
  'How do I find a common denominator for one sixth and one eighth?',
  'What does three quarters look like on a number line?',
  'How do I write two fifths as a decimal and a percent?',
];

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const arg = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const rate = arg('--rate') ? Number.parseInt(arg('--rate')!, 10) : 0;
  // Free-tier Gemini answers 429 with a ~40 s retryDelay a few calls in, and a
  // rate-limited sample is not a sample. Space them out and count them apart.
  const delayMs = Number.parseInt(arg('--delay') ?? '15000', 10);
  const turnCount = Number.parseInt(arg('--turns') ?? '2', 10);
  const learnerLine =
    arg('--text') ??
    'I have to add one half plus one third and I keep getting two fifths. Why is that wrong?';

  const { PGlite } = await import('@electric-sql/pglite');
  const { setTutorDbForTests, wrapPool } = await import('@/lib/tutor/db');
  const { hashPassword } = await import('@/lib/tutor/auth/password');
  const { newId } = await import('@/lib/tutor/auth/session');
  const { createSession } = await import('@/lib/tutor/session');
  const { startTurn } = await import('@/lib/tutor/turn');
  const { resolveModel } = await import('@/lib/server/resolve-model');

  const pg = new PGlite();
  await pg.waitReady;
  const db = wrapPool({
    query: (text, params) => pg.query(text, params),
    async connect() {
      return { query: (text, params) => pg.query(text, params), release() {} };
    },
    end: () => pg.close(),
  });
  await setTutorDbForTests(db, true);

  const accountId = newId('acc');
  const learnerId = newId('lrn');
  await db.query(
    `INSERT INTO accounts (id, email, display_name, password_hash) VALUES ($1, $2, 'Smoke', $3)`,
    [accountId, `smoke-${Date.now()}@example.test`, await hashPassword('smoke test password')],
  );
  await db.query(
    `INSERT INTO learners (id, account_id, display_name, birth_year, age_band, kind)
     VALUES ($1, $2, 'Smoke learner', $3, '13-17', 'teen')`,
    [learnerId, accountId, new Date().getUTCFullYear() - 14],
  );
  // Not brand new, so the session works a skill instead of running the diagnostic.
  await db.query(
    `INSERT INTO skill_mastery (account_id, learner_id, skill_id, estimate, n_items, n_sessions, status)
     VALUES ($1, $2, 'F8', 0.55, 3, 1, 'in_progress')`,
    [accountId, learnerId],
  );

  const principal = {
    accountId,
    learnerId,
    role: 'parent' as const,
    band: '13-17' as const,
    authSessionId: 'smoke',
    // The smoke run exercises the real learner path, ceilings included.
    staff: false,
    guest: false,
  };
  const created = await createSession(db, principal, { mode: 'voice', skillId: 'F8' });
  const sessionId = created.session.id;
  const resolved = await resolveModel({ stage: 'tutor-live-turn' });

  console.log(`model:   ${resolved.modelString}`);
  console.log(`session: ${sessionId} band=${created.band} minutes=${created.sessionMinutes}`);

  let actions = 0;
  let checks = 0;
  if (rate > 0) {
    // Each sample is one fresh explanation turn in the WORK phase, so nothing
    // carries over between them and the rate is per explanation, not per run.
    let drew = 0;
    let answered = 0;
    let failed = 0;
    for (let sample = 0; sample < rate; sample += 1) {
      const text = EXPLANATION_PROMPTS[sample % EXPLANATION_PROMPTS.length]!;
      await db.query(`UPDATE sessions SET phase = 'work' WHERE id = $1`, [sessionId]);
      await db.query(`DELETE FROM turns WHERE session_id = $1`, [sessionId]);
      const started = await startTurn({
        db,
        principal,
        body: { sessionId, text, inputMode: 'voice', clientTurnId: `rate-${sample}` },
      });
      if (!started.ok) {
        console.error(`refused: ${started.code} ${started.message}`);
        process.exitCode = 1;
        break;
      }
      let sampleActions = 0;
      let spoken = '';
      let errored = false;
      for await (const event of started.events) {
        if (event.type === 'action') sampleActions += 1;
        if (event.type === 'text_delta') spoken += event.text;
        if (event.type === 'error') {
          errored = true;
          console.log(`SKIP  provider error ${event.code}`);
        }
      }
      if (errored) {
        failed += 1;
      } else {
        actions += sampleActions;
        answered += 1;
        if (sampleActions > 0) drew += 1;
        console.log(
          `${sampleActions > 0 ? 'drew' : 'NONE'} ${String(sampleActions).padStart(2)} action(s)  "${text.slice(0, 48)}"  -> ${spoken.trim().slice(0, 70)}`,
        );
      }
      if (sample + 1 < rate && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    const pct = answered > 0 ? Math.round((drew / answered) * 100) : 0;
    console.log(
      `\ndrawing rate: ${drew}/${answered} answered = ${pct}% (R2 acceptance: at least 80%)` +
        (failed > 0 ? `; ${failed} sample(s) skipped on a provider error` : ''),
    );
    if (answered === 0 || pct < 80) process.exitCode = 1;
    await setTutorDbForTests(null);
    await db.end();
    return;
  }
  for (let turn = 0; turn < Math.max(1, turnCount); turn += 1) {
    const isGreeting = turn === 0;
    const text = isGreeting ? '' : learnerLine;
    console.log(`\n--- turn ${turn + 1} ${isGreeting ? '(greeting)' : `learner: ${text}`} ---`);
    const startedAt = Date.now();
    let firstFrameAt: number | null = null;

    const started = await startTurn({
      db,
      principal,
      body: {
        sessionId,
        text,
        inputMode: 'voice',
        clientTurnId: `smoke-${turn}`,
      },
    });
    if (!started.ok) {
      console.error(`refused: ${started.code} ${started.message}`);
      process.exitCode = 1;
      break;
    }
    for await (const event of started.events) {
      if (event.type === 'text_delta' && firstFrameAt === null) firstFrameAt = Date.now();
      if (event.type === 'action') actions += 1;
      if (event.type === 'check') checks += 1;
      console.log(`data: ${JSON.stringify(event)}`);
      if (event.type === 'error') process.exitCode = 1;
    }
    console.log(
      `# first delta ${firstFrameAt === null ? 'never' : `${firstFrameAt - startedAt} ms`}, turn ${Date.now() - startedAt} ms`,
    );
    // The learner reads the tutor's turn before answering; keep the run honest.
    if (turn === 0) await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const usage = await db.query<{ n: number; cents: number }>(
    `SELECT count(*)::int AS n, COALESCE(SUM(cents), 0)::int AS cents FROM usage_ledger WHERE session_id = $1`,
    [sessionId],
  );
  const turns = await db.query<{ role: string; latency_ms: number | null }>(
    `SELECT role, latency_ms FROM turns WHERE session_id = $1 ORDER BY ts`,
    [sessionId],
  );
  const evidence = await db.query<{ type: string; n: number }>(
    `SELECT type, count(*)::int AS n FROM evidence_events WHERE session_id = $1 GROUP BY type ORDER BY type`,
    [sessionId],
  );
  const state = await db.query<{ phase: string; state: unknown }>(
    `SELECT phase, state FROM sessions WHERE id = $1`,
    [sessionId],
  );
  const parsed = (
    typeof state.rows[0]?.state === 'string'
      ? JSON.parse(state.rows[0]!.state as string)
      : state.rows[0]?.state
  ) as { board: unknown[]; droppedActions: number };

  console.log('\n--- persisted ---');
  console.log(
    `turns:     ${turns.rows.map((row) => `${row.role}(${row.latency_ms ?? '-'}ms)`).join(', ')}`,
  );
  console.log(
    `evidence:  ${evidence.rows.map((row) => `${row.type}=${row.n}`).join(', ') || 'none'}`,
  );
  console.log(`usage:     ${usage.rows[0]?.n ?? 0} lines, ${usage.rows[0]?.cents ?? 0} cents`);
  console.log(
    `board:     ${parsed?.board?.length ?? 0} elements, ${parsed?.droppedActions ?? 0} dropped`,
  );
  console.log(`phase:     ${state.rows[0]?.phase}`);
  console.log(`\nactions ${actions}, checks ${checks}`);

  if (actions === 0) {
    console.error('FAIL: the model drew nothing on a fraction explanation (R2 acceptance).');
    process.exitCode = 1;
  }
  await setTutorDbForTests(null);
  await db.end();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
