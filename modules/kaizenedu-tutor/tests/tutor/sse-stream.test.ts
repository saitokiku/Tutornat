/**
 * The turn route's event stream after the learner barges in (D36 wave 1):
 * a `pull` that was waiting on the engine when the consumer cancelled must
 * not touch the cancelled controller. Before this guard every barge-in
 * logged `Invalid state: Controller is already closed` as a turn failure.
 */
import { describe, expect, it } from 'vitest';

import type { TurnEvent } from '@/lib/tutor/contracts';
import { encodeTurnEvent, turnEventStream } from '@/lib/tutor/turn/sse';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('turnEventStream', () => {
  it('frames every event and closes when the engine is done', async () => {
    async function* events(): AsyncGenerator<TurnEvent> {
      yield { type: 'text_delta', text: 'Hi.' };
      yield { type: 'sentence', index: 0, text: 'Hi.' };
    }
    const reader = turnEventStream(events()).getReader();
    const decoder = new TextDecoder();
    let out = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      out += decoder.decode(value);
    }
    expect(out).toBe(
      encodeTurnEvent({ type: 'text_delta', text: 'Hi.' }) +
        encodeTurnEvent({ type: 'sentence', index: 0, text: 'Hi.' }),
    );
  });

  it('ignores an event that arrives after the consumer cancelled, and still lets the engine finish', async () => {
    const gate = deferred<void>();
    let finished = false;
    const errors: unknown[] = [];
    async function* events(): AsyncGenerator<TurnEvent> {
      try {
        yield { type: 'text_delta', text: 'One.' };
        await gate.promise;
        yield { type: 'text_delta', text: 'Two.' };
      } finally {
        finished = true;
      }
    }
    const stream = turnEventStream(events(), (error) => errors.push(error));
    const reader = stream.getReader();
    const first = await reader.read();
    expect(first.done).toBe(false);
    // The second pull is now parked on the gate; the learner barges in.
    const pending = reader.read().catch(() => undefined);
    await reader.cancel();
    gate.resolve();
    await pending;
    // Give the parked pull a tick to observe the cancelled controller.
    await new Promise((r) => setTimeout(r, 0));
    expect(finished).toBe(true);
    expect(errors).toEqual([]);
  });
});
