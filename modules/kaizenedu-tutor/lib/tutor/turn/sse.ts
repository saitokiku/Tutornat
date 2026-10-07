/**
 * Server-Sent Events for the turn route. Every frame is one
 * `data: <TurnEvent JSON>\n\n`; nothing else is on the wire, so the client
 * parser in `lib/tutor/voice/sse-client.ts` reads it with no event names.
 *
 * The response is unbuffered on purpose: `no-cache`, `no-transform`, and
 * `X-Accel-Buffering: no` keep a proxy from holding the first sentence, which
 * is the whole latency budget (spec §5.3).
 */
import type { TurnEvent } from '@/lib/tutor/contracts';

export const SSE_HEADERS: Readonly<Record<string, string>> = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-cache, no-transform',
  connection: 'keep-alive',
  'x-accel-buffering': 'no',
};

export function encodeTurnEvent(event: TurnEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Drains the engine's events into a `text/event-stream` body. A failure after
 * the headers have gone out cannot become an HTTP status, so it is sent as a
 * final `error` frame; the client treats that as the end of the turn.
 */
export function turnEventStream(
  events: AsyncGenerator<TurnEvent>,
  onError?: (error: unknown) => void,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  // Set once the consumer cancels (barge-in, closed tab). A `pull` that was
  // awaiting the engine when that happened must not touch the controller
  // again: enqueue and close both throw `Invalid state` on a cancelled stream.
  let cancelled = false;
  const send = (controller: ReadableStreamDefaultController<Uint8Array>, event: TurnEvent) => {
    if (cancelled) return;
    try {
      controller.enqueue(encoder.encode(encodeTurnEvent(event)));
    } catch {
      cancelled = true;
    }
  };
  const close = (controller: ReadableStreamDefaultController<Uint8Array>) => {
    if (cancelled) return;
    try {
      controller.close();
    } catch {
      cancelled = true;
    }
  };
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await events.next();
        if (next.done) {
          close(controller);
          return;
        }
        send(controller, next.value);
      } catch (error) {
        if (!cancelled) onError?.(error);
        send(controller, {
          type: 'error',
          code: 'INTERNAL_ERROR',
          message: 'The tutor stopped unexpectedly. Try again.',
        });
        close(controller);
      }
    },
    async cancel() {
      cancelled = true;
      // The learner closed the tab or barged in: let the generator run its
      // `finally` so the usage line and the partial turn are still written.
      await events.return(undefined as never).catch(() => undefined);
    },
  });
}
