/**
 * Presence rules: silence check-ins, backchannel cues, and the non-camera
 * attention signals (spec §5.10 A and B; D15, D16; R28).
 *
 * Every function here is pure — inputs in, a decision out, no clock of its
 * own, no DOM, no network. The session screen samples the browser (page
 * visibility, pointer activity, the turn controller's phase and timestamps),
 * calls these functions, and does the acting and the posting itself. That
 * keeps the rules testable under fake timers and keeps this directory free of
 * both capture APIs and network calls, which is what
 * `tests/invariants/no-camera-egress.test.ts` checks for the camera work that
 * lands here at Gate 2 (see README.md).
 *
 * At Gate 1 the signals are recorded, not acted on, for bands whose
 * `attentionThresholdMs` is null (13-17 and adult) — the ladder in
 * `ladder.ts` refuses to run for them.
 */
import type { AgeBand, AttentionState } from '@/kaizen.config';
import { publicConfig } from '@/kaizen.config';
import type { AttentionSample } from '@/lib/tutor/contracts';

/** The turn controller's phase, restated so this module imports no voice code. */
export type PresencePhase = 'idle' | 'listening' | 'thinking' | 'speaking';

/** A learner utterance must run this long before a backchannel is worth it (spec §5.10 A). */
export const BACKCHANNEL_MIN_UTTERANCE_MS = 6_000;
/** At most one cue per this window, whatever else happens. */
export const BACKCHANNEL_MIN_GAP_MS = 8_000;
/** Consecutive unanswered check-ins before the screen stops asking. */
export const MAX_CONSECUTIVE_CHECK_INS = 2;
/** A check-in with no answer after this long is a drift signal. */
export const CHECK_IN_NO_RESPONSE_MS = 15_000;
/** Samples are emitted at most this often while the state is unchanged. */
export const SAMPLE_HEARTBEAT_MS = 15_000;

export interface PresenceInput {
  now: number;
  band: AgeBand;
  phase: PresencePhase;
  /** A turn is in flight (stream open or audio queued). */
  busy: boolean;
  /** Last time the learner spoke, typed, or answered a check. */
  lastLearnerInputAt: number | null;
  /** When the tutor last went quiet after a turn. */
  idleSince: number | null;
  /** Page Visibility: the tab is hidden or the window lost focus. */
  documentHidden: boolean;
  /** When it went hidden; null while visible. */
  hiddenSince: number | null;
  /** Last pointer, key, or touch event anywhere on the session screen. */
  lastPointerAt: number | null;
  /** The controller's check-in bookkeeping. */
  checkIns: { lastAt: number | null; consecutive: number };
  /** A check card is open and unanswered. */
  awaitingCheck: boolean;
  /** The session is over or paused; every rule goes quiet. */
  stopped: boolean;
}

function silenceWindowMs(band: AgeBand): number {
  return publicConfig.bands[band].silenceCheckInMs;
}

/** Milliseconds since the learner last did anything, using the tutor's last quiet moment as the floor. */
export function quietForMs(input: PresenceInput): number {
  const from = Math.max(input.idleSince ?? 0, input.lastLearnerInputAt ?? 0);
  if (from === 0) return 0;
  return Math.max(0, input.now - from);
}

/**
 * The silence check-in (spec §5.10 A): the learner has been quiet mid-task
 * past the band's window, so the tutor asks a short question. The caller sends
 * it as an empty voice turn (`TurnController.checkIn()`), which is what makes
 * it a question rather than a restatement of the last explanation.
 */
export function shouldCheckIn(input: PresenceInput): boolean {
  if (input.stopped || input.busy || input.awaitingCheck) return false;
  if (input.phase !== 'idle') return false;
  if (input.documentHidden) return false;
  if (input.checkIns.consecutive >= MAX_CONSECUTIVE_CHECK_INS) return false;
  const window = silenceWindowMs(input.band);
  if (quietForMs(input) < window) return false;
  // One per window: a check-in that was just sent has not had time to land.
  if (input.checkIns.lastAt !== null && input.now - input.checkIns.lastAt < window) return false;
  return true;
}

export interface BackchannelState {
  /** When the current learner utterance began; null when not listening. */
  utteranceStartedAt: number | null;
  lastCueAt: number | null;
  /** A cue already went out for this utterance. */
  cuedThisUtterance: boolean;
}

export const INITIAL_BACKCHANNEL: BackchannelState = {
  utteranceStartedAt: null,
  lastCueAt: null,
  cuedThisUtterance: false,
};

/** Display-only cues. Nothing here is spoken: the tutor never talks over the learner. */
export const BACKCHANNEL_CUES = ['mm-hm', 'right', 'go on'] as const;
export type BackchannelCue = (typeof BACKCHANNEL_CUES)[number];

/**
 * Track the listening run and decide whether a cue is due: the learner has
 * been talking longer than `BACKCHANNEL_MIN_UTTERANCE_MS`, no cue has gone out
 * for this utterance, and the last cue was at least
 * `BACKCHANNEL_MIN_GAP_MS` ago.
 */
export function stepBackchannel(
  state: BackchannelState,
  input: Pick<PresenceInput, 'now' | 'phase' | 'stopped'>,
): { state: BackchannelState; cue: BackchannelCue | null } {
  if (input.phase !== 'listening' || input.stopped) {
    return {
      state: { ...state, utteranceStartedAt: null, cuedThisUtterance: false },
      cue: null,
    };
  }
  const startedAt = state.utteranceStartedAt ?? input.now;
  const next: BackchannelState = { ...state, utteranceStartedAt: startedAt };
  if (next.cuedThisUtterance) return { state: next, cue: null };
  if (input.now - startedAt < BACKCHANNEL_MIN_UTTERANCE_MS) return { state: next, cue: null };
  if (state.lastCueAt !== null && input.now - state.lastCueAt < BACKCHANNEL_MIN_GAP_MS) {
    return { state: next, cue: null };
  }
  const index =
    state.lastCueAt === null ? 0 : Math.abs(Math.round(startedAt / 1000)) % BACKCHANNEL_CUES.length;
  return {
    state: { ...next, lastCueAt: input.now, cuedThisUtterance: true },
    cue: BACKCHANNEL_CUES[index],
  };
}

/**
 * The coarse attention state from non-camera signals only (R28). `no_face` is
 * a camera verdict and is never produced here.
 *
 * - the tab is hidden or the window is not focused → `away`;
 * - a check-in went unanswered past `CHECK_IN_NO_RESPONSE_MS` → `drifting`;
 * - the tutor is waiting and nothing has happened for longer than the band's
 *   silence window → `drifting`;
 * - anything else → `attending`.
 */
export function attentionStateFor(input: PresenceInput): AttentionState {
  if (input.documentHidden) return 'away';
  if (
    input.checkIns.lastAt !== null &&
    input.checkIns.consecutive > 0 &&
    input.now - input.checkIns.lastAt >= CHECK_IN_NO_RESPONSE_MS &&
    (input.lastLearnerInputAt ?? 0) < input.checkIns.lastAt
  ) {
    return 'drifting';
  }
  if (input.phase === 'idle' && !input.busy && quietForMs(input) >= silenceWindowMs(input.band)) {
    return 'drifting';
  }
  return 'attending';
}

/** Which non-camera signal produced the state, for the sample's `source`. */
export function attentionSourceFor(
  input: PresenceInput,
  state: AttentionState,
): AttentionSample['source'] {
  if (state === 'away' || input.documentHidden) return 'visibility';
  if (
    state === 'drifting' &&
    input.checkIns.lastAt !== null &&
    input.now - input.checkIns.lastAt >= CHECK_IN_NO_RESPONSE_MS
  ) {
    return 'response';
  }
  return 'idle';
}

export interface SamplerState {
  last: AttentionState | null;
  lastAt: number | null;
}

export const INITIAL_SAMPLER: SamplerState = { last: null, lastAt: null };

/**
 * Emit a sample on every state change and once per `SAMPLE_HEARTBEAT_MS`
 * otherwise, so a long attending run still contributes to the percentage
 * without producing a sample per tick.
 */
export function stepSampler(
  state: SamplerState,
  input: PresenceInput,
): { state: SamplerState; sample: AttentionSample | null } {
  if (input.stopped) return { state, sample: null };
  const next = attentionStateFor(input);
  const changed = next !== state.last;
  const stale = state.lastAt === null || input.now - state.lastAt >= SAMPLE_HEARTBEAT_MS;
  if (!changed && !stale) return { state, sample: null };
  return {
    state: { last: next, lastAt: input.now },
    sample: { state: next, ts: input.now, source: attentionSourceFor(input, next) },
  };
}

export interface AttentionCounts {
  attending: number;
  drifting: number;
  away: number;
  no_face: number;
}

export interface AttentionAggregate extends AttentionCounts {
  total: number;
  /** 0-100, rounded to one decimal. */
  attendingPct: number;
}

/**
 * Counts, never the samples themselves. The route stores this shape; the raw
 * `{state, ts}` list is dropped as soon as it is folded in.
 */
export function aggregateSamples(
  samples: readonly Pick<AttentionSample, 'state'>[],
  base: Partial<AttentionCounts> = {},
): AttentionAggregate {
  const counts: AttentionCounts = {
    attending: base.attending ?? 0,
    drifting: base.drifting ?? 0,
    away: base.away ?? 0,
    no_face: base.no_face ?? 0,
  };
  for (const sample of samples) counts[sample.state] += 1;
  const total = counts.attending + counts.drifting + counts.away + counts.no_face;
  const pct = total === 0 ? 0 : Math.round((counts.attending / total) * 1000) / 10;
  return { ...counts, total, attendingPct: pct };
}
