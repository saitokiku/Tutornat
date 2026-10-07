'use client';

import { publicConfig } from '@/kaizen.config';
import type { TurnMetrics } from '@/lib/tutor/voice/turn-controller';

/**
 * The `?metrics=1` overlay: the measured end-of-speech to first-audio time for
 * every turn this session, against the budget in `kaizen.config.ts`
 * (`LATENCY.firstAudioP50Ms` / `firstAudioP90Ms`).
 *
 * These are real `performance.now()` readings taken by the turn controller
 * (`MARKS.eos` to `MARKS.firstAudio`), not estimates: a blank cell means the
 * hop did not happen on that turn, and it is left blank rather than filled in
 * with a guess.
 */
function ms(value: number | null): string {
  return value === null ? '—' : String(Math.round(value));
}

function span(from: number, to: number | null): number | null {
  return to === null ? null : Math.round(to - from);
}

function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

export function MetricsOverlay({ metrics }: { metrics: readonly TurnMetrics[] }) {
  const firstAudio = metrics
    .map((turn) => span(turn.eosAt, turn.firstAudioAt))
    .filter((value): value is number => value !== null);
  const p50 = percentile(firstAudio, 50);
  const p90 = percentile(firstAudio, 90);

  return (
    <aside className="nt-metrics" aria-label="Turn latency">
      <p className="font-medium">End of speech to first audio (ms)</p>
      <p className="nt-small">
        p50 {ms(p50)} · p90 {ms(p90)} · budget {publicConfig.latency.firstAudioP50Ms}/
        {publicConfig.latency.firstAudioP90Ms} · {firstAudio.length} of {metrics.length} turns
        measured
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Turn</th>
            <th scope="col">ASR</th>
            <th scope="col">Delta</th>
            <th scope="col">Sentence</th>
            <th scope="col">Audio</th>
            <th scope="col">Stop</th>
          </tr>
        </thead>
        <tbody>
          {metrics.length === 0 ? (
            <tr>
              <td colSpan={6}>No turns yet.</td>
            </tr>
          ) : (
            metrics.map((turn, index) => {
              const audio = span(turn.eosAt, turn.firstAudioAt);
              return (
                <tr key={turn.clientTurnId}>
                  <th scope="row">
                    {index + 1} {turn.inputMode === 'text' ? 'txt' : 'voi'}
                  </th>
                  <td>{ms(span(turn.eosAt, turn.asrAt))}</td>
                  <td>{ms(span(turn.eosAt, turn.firstDeltaAt))}</td>
                  <td>{ms(span(turn.eosAt, turn.firstSentenceAt))}</td>
                  <td data-over={audio !== null && audio > publicConfig.latency.firstAudioP90Ms}>
                    {ms(audio)}
                  </td>
                  <td>
                    {ms(turn.bargeInAt === null ? null : span(turn.bargeInAt, turn.audioStoppedAt))}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </aside>
  );
}
