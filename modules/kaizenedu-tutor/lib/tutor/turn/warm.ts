/**
 * Warming the turn path at session start (spec §5.3, R1).
 *
 * Everything a first turn does for the first time lands on the one turn the
 * learner judges the product by: the provider catalog is imported, the model
 * client is constructed, eight prompt files are read off disk, and a TLS
 * connection to the provider is opened from scratch. None of that needs the
 * learner's words, so none of it needs to happen while they wait.
 *
 * Measured on 2026-09-05 in a cold Node process: importing the provider
 * catalog and the prompt builder costs 412–419 ms (3.7 s on the very first run
 * of a machine, before the file cache is warm); the first
 * `resolveModel` + `buildStaticSections` after that costs 2.6–3.0 ms and the
 * second 0.1 ms. The import is the prize, and this module being imported by
 * the session route is what moves it — but only where the session and turn
 * routes share a process (the Docker image does; a per-route serverless
 * deployment does not, and there the win is the 3 ms and the prompt cache).
 *
 * `warmTurnPath` does the ones that are free — no tokens, no ledger line, no
 * database write — and is called fire-and-forget when a session is created. It
 * is idempotent per process and never throws. Two warms are always on: the
 * live-turn model client and the band's prompt files. The third, a connection
 * probe to the provider, is opt-in (`TUTOR_WARM_CONNECTION=1`) and bounded by
 * a race against a timer — see `connectionProbeEnabled`.
 *
 * What it does not do: send a real model request. A throwaway completion would
 * warm the provider's own routing too, but it costs money on every session
 * start and would have to be metered against the session ceiling (invariant
 * d), which defeats the point.
 */
import { getProvider } from '@/lib/ai/providers';
import { createLogger } from '@/lib/logger';
import { resolveModel } from '@/lib/server/resolve-model';
import { TUTOR_LLM_SOURCES } from '@/lib/tutor/cost/sources';
import { buildStaticSections } from '@/lib/tutor/prompts/build';
import { tutorModelSelection } from '@/lib/tutor/turn/llm-call';

import type { AgeBand } from '@/kaizen.config';
import type { ProviderId } from '@/lib/types/provider';

const log = createLogger('tutor-warm');

/** Long enough for a handshake on a slow link, short enough to never pile up. */
export const CONNECT_TIMEOUT_MS = 2_000;

export interface WarmResult {
  /** The live-turn model resolved and its client was constructed. */
  model: boolean;
  /** The band's static prompt sections are in the per-process cache. */
  prompts: boolean;
  /** A connection to the provider host was opened (or was already open). */
  connection: boolean;
  ms: number;
}

export interface WarmOptions {
  /** Injected in tests so warming never touches the network. */
  fetchImpl?: typeof fetch;
}

const STATE = Symbol.for('natural-tutor.turn-warm');
interface WarmState {
  done?: Set<string>;
}
const state = ((globalThis as Record<symbol, unknown>)[STATE] ??= {}) as WarmState;

function alreadyWarm(key: string): boolean {
  state.done ??= new Set();
  if (state.done.has(key)) return true;
  state.done.add(key);
  return false;
}

/** Tests only. */
export function resetWarmStateForTests(): void {
  state.done = new Set();
}

/**
 * The connection probe is opt-in (`TUTOR_WARM_CONNECTION=1`).
 *
 * Off by default on purpose. The benefit — a TLS handshake the first turn does
 * not have to pay for — could not be measured in the environment this was
 * built in, and the cost is real: with egress to the provider blocked, a HEAD
 * request to it hung for over a minute and the socket outlived its own
 * `AbortController`, keeping the process alive with nothing to show for it.
 * Turn it on where the handshake can actually be timed.
 */
function connectionProbeEnabled(): boolean {
  const raw = process.env.TUTOR_WARM_CONNECTION?.trim();
  return raw === '1' || raw === 'true';
}

/**
 * Opens a connection to the provider origin so the first real request reuses
 * it. The response is discarded — a 404 from the base URL is a perfectly good
 * handshake. Only the origin is contacted, and only a URL the server operator
 * configured.
 *
 * Bounded by construction: the fetch is raced against a timer, so this settles
 * within `CONNECT_TIMEOUT_MS` even when the request itself never will.
 */
async function openConnection(
  baseUrl: string | undefined,
  fetchImpl: typeof fetch,
): Promise<boolean> {
  if (!baseUrl || !connectionProbeEnabled()) return false;
  let origin: string;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return false;
  }
  const abort = new AbortController();
  const attempt = (async () => {
    const response = await fetchImpl(origin, { method: 'HEAD', signal: abort.signal });
    // Draining keeps the socket in the pool instead of destroying it.
    await response.arrayBuffer().catch(() => undefined);
    return true;
  })().catch(() => false);
  const timeout = new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      abort.abort();
      resolve(false);
    }, CONNECT_TIMEOUT_MS);
    // Never a reason to hold a serverless invocation open.
    (timer as unknown as { unref?: () => void }).unref?.();
  });
  return Promise.race([attempt, timeout]);
}

/**
 * Warms the live-turn path for one band. Safe to call on every session start:
 * the work happens once per process per band and the result is cached.
 */
export async function warmTurnPath(band: AgeBand, options: WarmOptions = {}): Promise<WarmResult> {
  const started = Date.now();
  const result: WarmResult = { model: false, prompts: false, connection: false, ms: 0 };

  if (!alreadyWarm(`prompts:${band}`)) {
    try {
      buildStaticSections(band);
      result.prompts = true;
    } catch (error) {
      log.debug(`prompt warm skipped: ${error instanceof Error ? error.name : 'error'}`);
    }
  }

  // Keyed by band: a band routed to another provider warms that provider.
  if (!alreadyWarm(`model:${band}`)) {
    try {
      const resolved = await resolveModel(tutorModelSelection(TUTOR_LLM_SOURCES.liveTurn, band));
      result.model = true;
      // `resolveBaseUrl` answers undefined when the operator configured none
      // and the SDK falls back to the provider's own default; warm that.
      const baseUrl =
        resolved.baseUrl ?? getProvider(resolved.providerId as ProviderId)?.defaultBaseUrl;
      result.connection = await openConnection(baseUrl, options.fetchImpl ?? fetch);
    } catch (error) {
      log.debug(`model warm skipped: ${error instanceof Error ? error.name : 'error'}`);
    }
  }

  result.ms = Date.now() - started;
  return result;
}

/** Fire-and-forget wrapper for a request path: never awaited, never throws. */
export function warmTurnPathInBackground(band: AgeBand): void {
  void warmTurnPath(band).catch(() => undefined);
}
