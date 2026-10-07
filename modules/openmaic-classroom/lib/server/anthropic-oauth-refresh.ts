/**
 * Keep the process's Claude subscription OAuth access token current.
 *
 * A Claude subscription credential is an OAuth access token that the issuer
 * rotates, and the launcher captures one into the server environment ONCE at
 * boot. The deployment layer interpolates `${ANTHROPIC_AUTH_TOKEN}` into the
 * provider config on first use and keeps it for the life of the process
 * (lib/server/model-config/runtime.ts, by design), so a server that outlives a
 * rotation presents a revoked token until it is restarted — observed as HTTP
 * 401 "OAuth access token has been revoked" on every generation and chat call.
 *
 * The fix is to refresh the one copy the wire actually reads
 * (`currentOAuthToken` in lib/ai/anthropic-oauth.ts re-stamps Authorization at
 * the last hop), by re-running the SAME resolver the launcher already uses.
 * Nothing here mints, stores or refreshes a token itself: the central
 * credential store stays the only authority, and this is one subscriber to it.
 *
 * Server-only (`node:*`), opt-in, and inert unless the launcher asks for it:
 *
 *   OPENMAIC_ANTHROPIC_REFRESH_ARGV  JSON array: the resolver command to run
 *   OPENMAIC_ANTHROPIC_REFRESH_MS    optional interval, default 5min, floor 60s
 *
 * The token is never logged, never written to disk, and never leaves this
 * process: only `process.env` is updated in place.
 */
import { spawn } from 'node:child_process';

import { createLogger } from '@/lib/logger';

const log = createLogger('AnthropicOAuthRefresh');

/** Hard bounds on the resolver child. Matches the launcher's supervision. */
const TIMEOUT_MS = 20_000;
const STDOUT_CAP = 64 * 1024;

const DEFAULT_INTERVAL_MS = 5 * 60_000;
const MIN_INTERVAL_MS = 60_000;

/** The one endpoint a Claude subscription credential may be addressed to. */
const CANONICAL_BASE = 'https://api.anthropic.com';
/** The only api_mode that reaches the native Messages route. */
const REQUIRED_API_MODE = 'anthropic_messages';

export interface RefreshHandle {
  stop(): void;
}

/**
 * Run the resolver as its own process-group leader and collect stdout.
 *
 * Detached so a wedged managed-runtime wrapper AND the python it spawns are
 * both reaped: signalling only the wrapper orphans its grandchildren, and this
 * runs on a timer, so one orphan per tick would accumulate for the life of the
 * server. stderr is drained and discarded — resolver chatter is not ours to
 * log, and it is the stream most likely to quote a credential.
 */
function runResolver(argv: readonly string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const [command, ...args] = argv;
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    let out = '';
    let settled = false;
    const killGroup = (signal: NodeJS.Signals) => {
      try {
        if (child.pid) process.kill(-child.pid, signal);
      } catch {
        /* already gone */
      }
    };
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      killGroup('SIGKILL');
      if (error) reject(error);
      else resolve(out);
    };
    const timer = setTimeout(() => finish(new Error('resolver timed out')), TIMEOUT_MS);
    child.stdout.on('data', (chunk: Buffer) => {
      if (out.length > STDOUT_CAP) return finish(new Error('resolver output too large'));
      out += chunk.toString('utf8');
    });
    child.stderr.on('data', () => {
      /* drained and discarded on purpose */
    });
    child.on('error', () => finish(new Error('resolver could not be started')));
    child.on('exit', (code) =>
      finish(code === 0 ? undefined : new Error('resolver exited non-zero')),
    );
  });
}

/**
 * The token from a resolver payload that is acceptable, or throw.
 *
 * Identical gates to the launcher's, applied again because a rotation is a new
 * credential from a store that could answer differently than it did at boot:
 * wrong provider, wrong api_mode, a non-canonical endpoint or a credential
 * that is not an Anthropic OAuth access token is REFUSED, never adopted and
 * never normalized. Errors carry fixed copy — the rejected value is never
 * echoed, so no log line can end up next to a credential.
 */
export function acceptResolvedToken(stdout: string): string {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(stdout) as Record<string, unknown>;
  } catch {
    throw new Error('resolver output is not JSON');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('resolver output is not a credential object');
  }
  const str = (key: string) => (typeof payload[key] === 'string' ? (payload[key] as string) : '');
  if (str('provider').trim().toLowerCase() !== 'anthropic') {
    throw new Error('resolver provider is not anthropic');
  }
  if (str('api_mode').trim() !== REQUIRED_API_MODE) {
    throw new Error('resolver api_mode is not anthropic_messages');
  }
  // Empty means the provider default, which IS the canonical base. Anything
  // else must match exactly: a userinfo/port/path/query/fragment variant or a
  // suffix lookalike is a different destination, not a spelling.
  const baseUrl = str('base_url').trim().replace(/\/+$/, '');
  if (baseUrl && baseUrl !== CANONICAL_BASE) {
    throw new Error('resolver base_url is not the canonical Anthropic endpoint');
  }
  const token = str('api_key').trim();
  if (!token.startsWith('sk-ant-oat')) {
    throw new Error('resolved credential is not an Anthropic OAuth access token');
  }
  return token;
}

/**
 * One refresh: resolve, validate, adopt. Returns whether the token changed.
 *
 * On ANY failure the current token is kept and the error is logged with its
 * fixed message: a resolver that is briefly unavailable must not blank the
 * credential or substitute another one, and there is no fallback provider.
 */
export async function refreshOnce(argv: readonly string[]): Promise<boolean> {
  let token: string;
  try {
    token = acceptResolvedToken(await runResolver(argv));
  } catch (error) {
    // Fixed copy only; a resolver payload may quote a credential.
    log.warn(
      `Credential refresh skipped, keeping the current token: ${
        error instanceof Error ? error.message : 'resolver failed'
      }`,
    );
    return false;
  }
  if (process.env.ANTHROPIC_AUTH_TOKEN === token) return false;
  process.env.ANTHROPIC_AUTH_TOKEN = token;
  log.info('Anthropic OAuth access token rotated; subsequent requests use the current one');
  return true;
}

/** The resolver argv the launcher asked for, or undefined when opted out. */
function configuredArgv(): string[] | undefined {
  const raw = process.env.OPENMAIC_ANTHROPIC_REFRESH_ARGV?.trim();
  if (!raw) return undefined;
  try {
    const argv: unknown = JSON.parse(raw);
    if (Array.isArray(argv) && argv.length > 0 && argv.every((a) => typeof a === 'string' && a)) {
      return argv as string[];
    }
  } catch {
    /* reported below */
  }
  log.warn('OPENMAIC_ANTHROPIC_REFRESH_ARGV is not a non-empty JSON array of strings; ignoring it');
  return undefined;
}

function configuredIntervalMs(): number {
  const raw = Number(process.env.OPENMAIC_ANTHROPIC_REFRESH_MS?.trim());
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_INTERVAL_MS;
  return Math.max(MIN_INTERVAL_MS, raw);
}

/**
 * Start the refresh schedule, or do nothing when it is not configured.
 *
 * Only a timer: `register` must return before the server is ready, so this
 * never blocks on the resolver. The boot token was just resolved by the
 * launcher, so the first tick is a full interval away. Unref'd — a pending
 * refresh must not hold the process open — and single-flighted, because a
 * resolver slower than the interval would otherwise stack children.
 *
 * ponytail: a fixed interval, not expiry-driven. The resolver does not report
 * an expiry here; switch to scheduling off `expires_at` if one is exposed.
 */
export function startAnthropicOAuthRefresh(): RefreshHandle {
  const argv = configuredArgv();
  if (!argv) return { stop: () => {} };
  let inFlight: Promise<boolean> | undefined;
  const timer = setInterval(() => {
    inFlight ??= refreshOnce(argv).finally(() => {
      inFlight = undefined;
    });
  }, configuredIntervalMs());
  timer.unref();
  log.info('Anthropic OAuth credential refresh is on');
  return { stop: () => clearInterval(timer) };
}
