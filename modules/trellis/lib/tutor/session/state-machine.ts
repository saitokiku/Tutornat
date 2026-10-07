/**
 * The session loop (spec §5.2): GREET → INTAKE → DIAGNOSE → WORK ⇄ CHECK →
 * WRAP → ENDED, with the band timer and its one soft continue. Pure functions
 * over `phase` + `SessionState`; the turn engine and the check route call them
 * and persist the result.
 */
import { STUDENT_MODEL } from '@/lib/tutor/config';
import type { SessionPhase } from '@/lib/tutor/contracts';
import { SKILLS } from '@/lib/tutor/graph/graph';

import { applyLearnerMessage, looksLikeConfusion } from './coach';
import {
  DIAGNOSTIC_MAX_ITEMS,
  SOFT_CONTINUE_MINUTES,
  type DiagnosticItemRecord,
  type DiagnosticState,
  type SessionState,
} from './state';

const AFFIRMATIVE =
  /^\s*(yes|yeah|yep|yup|sure|ok|okay|keep going|continue|more|let'?s keep going|a bit more|five more|go on|please)\b/i;

/** Turns per band before a check is due even if the clock has not run out ("at topic end"). */
const TURNS_PER_CHECK: Record<SessionState['band'], number> = {
  '4-8': 4,
  '9-12': 5,
  '13-17': 7,
  adult: 7,
};

export function remainingMs(state: SessionState, now: Date): number {
  return Math.max(0, new Date(state.timer.deadlineAt).getTime() - now.getTime());
}

export function timerExpired(state: SessionState, now: Date): boolean {
  return remainingMs(state, now) === 0;
}

export function isCheckDue(state: SessionState, phase: SessionPhase, now: Date): boolean {
  if (phase !== 'work' || state.pendingCheck) return false;
  if (remainingMs(state, now) < 60_000) return false;
  const sinceLast = now.getTime() - new Date(state.lastCheckAt).getTime();
  return (
    sinceLast >= STUDENT_MODEL.checkEveryMs || state.turnsSinceCheck >= TURNS_PER_CHECK[state.band]
  );
}

export interface TurnPlan {
  /** The phase the model is told about for this turn. */
  phase: SessionPhase;
  state: SessionState;
  greet: boolean;
  silence: boolean;
  wrapDue: boolean;
  softContinueAvailable: boolean;
  checkDue: boolean;
  /** The phase to persist when the turn ends without a check being issued. */
  phaseAfterTurn: SessionPhase;
}

export interface BeginTurnInput {
  text: string;
  inputMode: 'voice' | 'text';
  now: Date;
  entitlementMinutes: number;
}

/**
 * Decides the phase for one learner turn and updates the counters that do
 * not depend on the model's output. Throws on an ended session.
 */
export function beginTurn(
  phase: SessionPhase,
  input: BeginTurnInput,
  previous: SessionState,
): TurnPlan {
  if (phase === 'ended') throw new Error('session has ended');
  const state: SessionState = {
    ...previous,
    coach: { ...previous.coach },
    timer: { ...previous.timer },
  };
  const trimmed = input.text.trim();
  const greet = phase === 'greet';
  const silence = !greet && trimmed === '' && input.inputMode === 'voice';

  if (!greet && !silence) {
    state.learnerTurns += 1;
    state.turnsSinceCheck += 1;
    state.coach = applyLearnerMessage(state.coach, trimmed);
    if (looksLikeConfusion(trimmed) && !state.reteachUsed.includes('re-teach requested')) {
      // The model picks the approach; the counter tells it not to repeat one.
      state.reteachUsed = [...state.reteachUsed, 're-teach requested'];
    }
  }

  let nextPhase: SessionPhase = phase;
  let wrapDue = false;
  let softContinueAvailable = false;

  const expired = timerExpired(state, input.now);
  if (phase === 'wrap') {
    const canExtend =
      !state.timer.extended &&
      state.timer.softContinueOffered &&
      input.entitlementMinutes >= SOFT_CONTINUE_MINUTES &&
      AFFIRMATIVE.test(trimmed);
    if (canExtend) {
      state.timer = {
        ...state.timer,
        extended: true,
        deadlineAt: new Date(input.now.getTime() + SOFT_CONTINUE_MINUTES * 60_000).toISOString(),
      };
      nextPhase = state.pendingCheck ? 'check' : 'work';
    } else {
      wrapDue = true;
    }
  } else if (expired && !greet) {
    nextPhase = 'wrap';
    wrapDue = true;
    softContinueAvailable =
      !state.timer.extended && input.entitlementMinutes >= SOFT_CONTINUE_MINUTES;
    state.timer = { ...state.timer, softContinueOffered: softContinueAvailable };
  }

  let phaseAfterTurn: SessionPhase = nextPhase;
  if (greet) {
    phaseAfterTurn = state.diagnostic && !state.diagnostic.done ? 'diagnose' : 'intake';
  } else if (nextPhase === 'intake') {
    phaseAfterTurn = 'work';
  }

  const checkDue = !greet && !silence && !wrapDue && isCheckDue(state, nextPhase, input.now);
  return {
    phase: nextPhase,
    state,
    greet,
    silence,
    wrapDue,
    softContinueAvailable,
    checkDue,
    phaseAfterTurn,
  };
}

/** After the model's turn: a check was issued → CHECK; otherwise the planned phase. */
export function endTurn(plan: TurnPlan, issuedCheck: boolean, now: Date): SessionPhase {
  if (issuedCheck) {
    plan.state.lastCheckAt = now.toISOString();
    plan.state.turnsSinceCheck = 0;
    return 'check';
  }
  return plan.phaseAfterTurn;
}

/** After the check route graded the pending check. */
export function afterCheckGraded(state: SessionState, now: Date): SessionPhase {
  if (state.diagnostic && !state.diagnostic.done) return 'diagnose';
  if (timerExpired(state, now)) return 'wrap';
  return 'work';
}

// ---------------------------------------------------------------------------
// Diagnostic placement (spec §5.2 DIAGNOSE, tutor-10): binary search over the
// graph ordinals, at most four items, never the same representation twice in
// a row.
// ---------------------------------------------------------------------------

export function newDiagnostic(startOrdinal?: number): DiagnosticState {
  const high = SKILLS.length - 1;
  return {
    max: DIAGNOSTIC_MAX_ITEMS,
    low: 0,
    high,
    firstOrdinal: startOrdinal === undefined ? null : Math.max(0, Math.min(high, startOrdinal)),
    asked: [],
    placedSkillId: null,
    done: false,
  };
}

/** The skill to probe next, or null when the search is over. */
export function nextDiagnosticSkill(diagnostic: DiagnosticState): string | null {
  if (
    diagnostic.done ||
    diagnostic.asked.length >= diagnostic.max ||
    diagnostic.low > diagnostic.high
  )
    return null;
  const first = diagnostic.firstOrdinal;
  if (
    diagnostic.asked.length === 0 &&
    first !== null &&
    first >= diagnostic.low &&
    first <= diagnostic.high
  ) {
    return SKILLS[first]?.id ?? null;
  }
  const mid = Math.floor((diagnostic.low + diagnostic.high) / 2);
  return SKILLS[mid]?.id ?? null;
}

export function recordDiagnosticAnswer(
  diagnostic: DiagnosticState,
  record: DiagnosticItemRecord,
): DiagnosticState {
  const ordinal = SKILLS.findIndex((skill) => skill.id === record.skillId);
  const next: DiagnosticState = { ...diagnostic, asked: [...diagnostic.asked, record] };
  if (ordinal >= 0) {
    if (record.correct) next.low = Math.max(next.low, ordinal + 1);
    else next.high = Math.min(next.high, ordinal - 1);
  }
  if (next.asked.length >= next.max || next.low > next.high) {
    next.done = true;
    next.placedSkillId = deterministicPlacement(next);
  }
  return next;
}

/** Lowest skill answered wrong; otherwise the skill after the highest correct one (clamped to the graph). */
export function deterministicPlacement(diagnostic: DiagnosticState): string {
  const wrong = diagnostic.asked
    .filter((item) => !item.correct)
    .map((item) => SKILLS.findIndex((skill) => skill.id === item.skillId))
    .filter((ordinal) => ordinal >= 0);
  if (wrong.length > 0) return SKILLS[Math.min(...wrong)]!.id;
  const correct = diagnostic.asked
    .filter((item) => item.correct)
    .map((item) => SKILLS.findIndex((skill) => skill.id === item.skillId))
    .filter((ordinal) => ordinal >= 0);
  const after = correct.length > 0 ? Math.max(...correct) + 1 : 0;
  return SKILLS[Math.min(after, SKILLS.length - 1)]!.id;
}
