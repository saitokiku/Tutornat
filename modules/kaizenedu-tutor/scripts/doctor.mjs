#!/usr/bin/env node
/**
 * Environment doctor for Natural Tutor. Reads .env and .env.local (if present) plus the
 * process environment and reports what is set, what is missing, and which
 * phase each item unblocks. Never prints a secret value; only its presence.
 * Usage: pnpm doctor [--staging]   (--staging also requires ACCESS_CODE)
 */
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const staging = process.argv.includes('--staging');
const env = { ...process.env };
// .env.local first (it overrides), then the committed non-secret .env.
for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    const v = t
      .slice(i + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    if (!(k in env) && v) env[k] = v;
  }
}
const has = (k) => Boolean(env[k] && env[k].trim());
const anyOf = (...ks) => ks.find(has);

const checks = [];
const add = (phase, name, ok, hint) => checks.push({ phase, name, ok, hint });

// Toolchain
const ver = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
};
const node = ver('node --version');
add(
  'local',
  'Node >= 22.19',
  node !== null && Number(node.slice(1).split('.')[0]) >= 22,
  `found ${node ?? 'none'}`,
);
const pnpm = ver('pnpm --version');
add('local', 'pnpm 10', pnpm !== null && pnpm.startsWith('10'), `found ${pnpm ?? 'none'}`);
add('local', 'node_modules installed', existsSync('node_modules/next'), 'run pnpm install');
add(
  'local',
  'upstream remote',
  (ver('git remote') ?? '').includes('upstream'),
  'git remote add upstream https://github.com/THU-MAIC/OpenMAIC',
);

// Product gate
add(
  'day-2',
  'TUTOR_MODE=1',
  env.TUTOR_MODE === '1' || env.TUTOR_MODE === 'true',
  'product routes 404 without it',
);

// Model routing (spike-05, tutor-07)
const llmKey = anyOf(
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GOOGLE_API_KEY',
  'AZURE_OPENAI_API_KEY',
  'OPENROUTER_API_KEY',
  'BEDROCK_REGION',
);
add(
  'day-2',
  'at least one LLM provider key',
  Boolean(llmKey),
  'OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY (spec §8.4 wants a fast model for live turns and a stronger one for grading)',
);
add(
  'day-2',
  'a routed model (DEFAULT_MODEL or MODEL_ROUTES)',
  has('DEFAULT_MODEL') || has('MODEL_ROUTES'),
  'e.g. DEFAULT_MODEL=google:gemini-3-flash-preview and MODEL_ROUTES=\'{"chat-adapter":"google:<fast>","quiz-grade":"anthropic:<sonnet>"}\'',
);
add(
  'day-2',
  'a TTS provider key',
  Boolean(
    anyOf(
      'TTS_OPENAI_API_KEY',
      'TTS_ELEVENLABS_API_KEY',
      'TTS_AZURE_API_KEY',
      'TTS_MINIMAX_API_KEY',
      'TTS_DOUBAO_API_KEY',
    ),
  ),
  'TTS_OPENAI_API_KEY first (spike row 1); TTS_ELEVENLABS_API_KEY optional',
);
add(
  'day-2',
  'an ASR provider key',
  Boolean(anyOf('ASR_OPENAI_API_KEY', 'ASR_AZURE_API_KEY', 'ASR_QWEN_API_KEY')),
  'ASR_OPENAI_API_KEY first (spike row 1); ASR_AZURE_API_KEY for the real-time row',
);

// Persistence and storage (infra-02)
add(
  'day-2',
  'DATABASE_URL (Neon pooled endpoint)',
  has('DATABASE_URL'),
  'Neon project → pooled connection string; locally, `pnpm dev:db` prints one',
);
add(
  'day-2',
  'object storage (ASSET_S3_BUCKET + AWS_* or R2 endpoint)',
  has('ASSET_S3_BUCKET') && has('AWS_ACCESS_KEY_ID'),
  'R2: ASSET_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION=auto, AWS_ENDPOINT_URL_S3=https://<account>.r2.cloudflarestorage.com',
);
if (staging)
  add(
    'day-2',
    'ACCESS_CODE (staging gate)',
    has('ACCESS_CODE'),
    'any long random string; off on prod',
  );

// Later phases (reserved; reported so the gaps are visible)
add('day-7', 'accounts (built-in; D18 replaced Clerk with email + password)', true, 'auth-21');
add(
  'day-7',
  'email (RESEND_API_KEY + EMAIL_FROM)',
  has('RESEND_API_KEY') && has('EMAIL_FROM'),
  'password reset, the parent invitation and the weekly report go nowhere without it (docs/DO-THIS-NEXT.md)',
);
add(
  'day-7',
  'safety paging (SAFETY_ALERT_EMAILS, on top of email)',
  has('SAFETY_ALERT_EMAILS') && has('RESEND_API_KEY') && has('EMAIL_FROM'),
  'a crisis match or an unsafe report tells nobody without it (docs/SAFETY-RUNBOOK.md); ALERT_WEBHOOK_URL is optional on top',
);
add(
  'day-7',
  'support inbox (SUPPORT_EMAIL, on top of email)',
  has('SUPPORT_EMAIL') && has('RESEND_API_KEY') && has('EMAIL_FROM'),
  '/support saves the message and says plainly that nobody was told',
);
add(
  'day-7',
  'weekly report (CRON_SECRET, on top of email)',
  has('CRON_SECRET') && has('RESEND_API_KEY') && has('EMAIL_FROM'),
  'any long random string; Vercel sends it as the bearer token on the schedule in vercel.json',
);
add(
  'day-12',
  'Stripe (STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET + STRIPE_PRICE_MONTHLY)',
  has('STRIPE_SECRET_KEY') && has('STRIPE_WEBHOOK_SECRET') && has('STRIPE_PRICE_MONTHLY'),
  'billing-23',
);
add(
  'day-12',
  'PostHog (NEXT_PUBLIC_POSTHOG_KEY + NEXT_PUBLIC_POSTHOG_HOST)',
  has('NEXT_PUBLIC_POSTHOG_KEY') && has('NEXT_PUBLIC_POSTHOG_HOST'),
  'data-29',
);
add('day-12', 'Sentry (SENTRY_DSN)', has('SENTRY_DSN') || has('NEXT_PUBLIC_SENTRY_DSN'), 'data-29');

let missing = 0;
let currentPhase = '';
for (const c of checks) {
  if (c.phase !== currentPhase) {
    currentPhase = c.phase;
    console.log(`\n[${c.phase}]`);
  }
  console.log(`  ${c.ok ? 'ok     ' : 'MISSING'} ${c.name}${c.ok ? '' : `  → ${c.hint}`}`);
  if (!c.ok && (c.phase === 'local' || c.phase === 'day-2')) missing += 1;
}
console.log(
  `\ndoctor: ${missing === 0 ? 'ready for Day 2 (spike-05 and staging)' : `${missing} item(s) block Day 2`}`,
);
process.exit(missing === 0 ? 0 : 1);
