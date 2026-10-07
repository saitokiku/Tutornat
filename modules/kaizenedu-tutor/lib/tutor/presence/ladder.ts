/**
 * The attention-recovery ladder (spec §5.10 C; D15).
 *
 * Recovery, not engagement maximization: every step returns to the lesson,
 * never to a reward, and the session still ends at its scheduled length. The
 * ladder only runs for bands that have an `attentionThresholdMs` in
 * `kaizen.config.ts` — 9-12 (Gate 2) and 4-8 (Gate 3); 13-17 and adult have
 * `null` and never escalate, which is also why Gate 1 records signals without
 * acting on them (R28).
 *
 * Steps at this gate are 1-4 and 6. Step 5 (the movement break) needs
 * `BANDS[band].movementBreak`, which is only true for 4-8, so it is listed but
 * cannot fire until Gate 3. A parent may switch off any step
 * (`ParentSettings.recoveryStepsDisabled`); a disabled step is skipped, not
 * waited on. Step 6 is not an escalation but a stop: `away` past
 * `ATTENTION.pauseAfterAwayMs` pauses the session and notifies the account
 * holder.
 *
 * Pure: the caller supplies `now` and the current attention state, performs
 * the step, and posts the `recovery_events` row.
 */
import type { AgeBand, AttentionState } from '@/kaizen.config';
import { publicConfig } from '@/kaizen.config';

export type LadderStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface LadderStepSpec {
  step: LadderStep;
  /** What the session screen does; the outcome recorded on the event row. */
  tactic:
    | 'prosody_name'
    | 'direct_question'
    | 'modality_switch'
    | 'micro_interaction'
    | 'movement_break'
    | 'pause_notify';
  /** Shown to the learner; plain, no exclamation, no guilt (design-system copy rules). */
  label: string;
  /** True when the step needs `BANDS[band].movementBreak`. */
  needsMovementBreak: boolean;
}

export const LADDER: readonly LadderStepSpec[] = [
  {
    step: 1,
    tactic: 'prosody_name',
    label: 'Change of pace, and the learner’s name.',
    needsMovementBreak: false,
  },
  {
    step: 2,
    tactic: 'direct_question',
    label: 'A short question that needs an answer.',
    needsMovementBreak: false,
  },
  {
    step: 3,
    tactic: 'modality_switch',
    label: 'Draw it on the board instead of saying it.',
    needsMovementBreak: false,
  },
  {
    step: 4,
    tactic: 'micro_interaction',
    label: 'A 20-30 second turn on the board.',
    needsMovementBreak: false,
  },
  {
    step: 5,
    tactic: 'movement_break',
    label: 'Stand up and stretch, then back to it.',
    needsMovementBreak: true,
  },
  {
    step: 6,
    tactic: 'pause_notify',
    label: 'Paused. The account holder has been told.',
    needsMovementBreak: false,
  },
];

/** The escalating steps; step 6 is the stop and is chosen by time away, not by cadence. */
const ESCALATING = LADDER.filter((entry) => entry.step <= 5);
const PAUSE_STEP = LADDER[LADDER.length - 1];

export interface LadderState {
  /** When the current drifting/away run began; null while attending. */
  runStartedAt: number | null;
  runState: AttentionState | null;
  /** When the last step fired. */
  lastStepAt: number | null;
  /** Highest step taken in this run. */
  step: number;
  /** Steps taken across the session, for `recovery_events` and the parent report. */
  recoveries: number;
  paused: boolean;
}

export const INITIAL_LADDER: LadderState = {
  runStartedAt: null,
  runState: null,
  lastStepAt: null,
  step: 0,
  recoveries: 0,
  paused: false,
};

export interface LadderInput {
  now: number;
  band: AgeBand;
  state: AttentionState;
  /** Steps the parent switched off (`ParentSettings.recoveryStepsDisabled`). */
  disabledSteps?: readonly number[];
}

export interface RecoveryFired {
  spec: LadderStepSpec;
  triggerState: AttentionState;
  at: number;
  /** True for step 6: the session pauses and the account holder is told. */
  pause: boolean;
}

/** True when this band escalates at all (spec §5.10 C; `BANDS[band].attentionThresholdMs`). */
export function ladderRunsFor(band: AgeBand): boolean {
  return publicConfig.bands[band].attentionThresholdMs !== null;
}

function nextStep(
  after: number,
  band: AgeBand,
  disabled: ReadonlySet<number>,
): LadderStepSpec | null {
  const movementBreak = publicConfig.bands[band].movementBreak;
  for (const spec of ESCALATING) {
    if (spec.step <= after) continue;
    if (spec.needsMovementBreak && !movementBreak) continue;
    if (disabled.has(spec.step)) continue;
    return spec;
  }
  return null;
}

/**
 * Advance the ladder by one tick. Returns the new state and the step to
 * perform, if any. At most one step fires per `ATTENTION.ladderStepMs`, and
 * only after the run has lasted `BANDS[band].attentionThresholdMs`.
 */
export function stepLadder(
  state: LadderState,
  input: LadderInput,
): { state: LadderState; fired: RecoveryFired | null } {
  if (state.paused) return { state, fired: null };
  if (!ladderRunsFor(input.band)) {
    // The signal is still recorded; nothing escalates (Gate 1 bands, R28).
    return { state, fired: null };
  }
  if (input.state === 'attending') {
    if (state.runStartedAt === null) return { state, fired: null };
    return {
      state: { ...state, runStartedAt: null, runState: null, lastStepAt: null, step: 0 },
      fired: null,
    };
  }

  const runStartedAt = state.runStartedAt ?? input.now;
  const runState = input.state;
  const base: LadderState = { ...state, runStartedAt, runState };
  const threshold = publicConfig.bands[input.band].attentionThresholdMs;
  if (threshold === null) return { state: base, fired: null };
  const runMs = input.now - runStartedAt;

  // Step 6 is a stop, not a rung: `away` past the pause window ends the run
  // whatever the ladder cadence says.
  if (input.state === 'away' && runMs >= publicConfig.attention.pauseAfterAwayMs) {
    const disabled = new Set(input.disabledSteps ?? []);
    if (disabled.has(PAUSE_STEP.step)) return { state: base, fired: null };
    return {
      state: {
        ...base,
        paused: true,
        step: PAUSE_STEP.step,
        lastStepAt: input.now,
        recoveries: state.recoveries + 1,
      },
      fired: { spec: PAUSE_STEP, triggerState: input.state, at: input.now, pause: true },
    };
  }

  if (runMs < threshold) return { state: base, fired: null };
  if (
    state.lastStepAt !== null &&
    input.now - state.lastStepAt < publicConfig.attention.ladderStepMs
  ) {
    return { state: base, fired: null };
  }
  const spec = nextStep(state.step, input.band, new Set(input.disabledSteps ?? []));
  if (!spec) return { state: base, fired: null };
  return {
    state: {
      ...base,
      step: spec.step,
      lastStepAt: input.now,
      recoveries: state.recoveries + 1,
    },
    fired: { spec, triggerState: input.state, at: input.now, pause: false },
  };
}
