/**
 * Copy selection by audience (design-system "Copy": say what it does, what it
 * costs, what it will not do; no exclamation points, no questions as
 * headlines, no banned words).
 */
import type { AgeBand } from '@/kaizen.config';
import type {
  CourseworkStatus,
  Entitlement,
  InputMode,
  MasteryStatus,
  Role,
} from '@/lib/tutor/contracts';

export interface Greeting {
  title: string;
  subtitle: string;
}

/**
 * "1 minutes left" is the kind of detail that makes a product feel unfinished,
 * and a learner on their last minute is exactly who sees it.
 */
export function minuteCount(minutes: number): string {
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

export function greetingFor(name: string, band: AgeBand | null): Greeting {
  const first = name.trim().split(/\s+/)[0] || 'there';
  switch (band) {
    case '4-8':
    case '9-12':
      return {
        title: `Hi ${first}.`,
        subtitle: 'Pick something to work on. The tutor talks with you and draws as you go.',
      };
    case '13-17':
      return {
        title: `Hi ${first}.`,
        subtitle: 'Start with your homework or the next skill. You can talk or type.',
      };
    default:
      return {
        title: `Welcome back, ${first}.`,
        subtitle: 'Start with a problem you brought or the next skill in the sequence.',
      };
  }
}

/**
 * A guest has no name to greet by (the learner row says `You`, which is not a
 * name to say hello to), so the greeting is by visit: the first time, and
 * every time after. The subtitle is the whole instruction (D35).
 */
export function guestGreeting(hasSessions: boolean): Greeting {
  return {
    title: hasSessions ? 'Welcome back.' : 'Hi.',
    subtitle: 'Say what you want to work on and start.',
  };
}

export function masteryStatusLabel(status: MasteryStatus): string {
  switch (status) {
    case 'not_started':
      return 'Not started';
    case 'in_progress':
      return 'In progress';
    case 'mastered':
      return 'Mastered (estimate)';
    case 'confirmed':
      return 'Confirmed';
  }
}

export function masteryStatusHint(status: MasteryStatus): string {
  switch (status) {
    case 'not_started':
      return 'No checks yet.';
    case 'in_progress':
      return 'Checked in session; the estimate is still moving.';
    case 'mastered':
      return 'Estimate from checks in session. An unaided check a day or more later confirms it.';
    case 'confirmed':
      return 'Confirmed by an unaided check at least a day after the estimate.';
  }
}

export function courseworkStatusLabel(status: CourseworkStatus): string {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'extracting':
      return 'Reading the upload';
    case 'failed':
      return 'Could not read the upload';
  }
}

export function inputModeLabel(mode: InputMode): string {
  return mode === 'voice' ? 'Voice' : 'Text';
}

export type Tone = 'neutral' | 'warning' | 'stop';

export interface EntitlementMessage {
  tone: Tone;
  text: string;
  /** Whether the reader can act on it (parents and adults manage billing). */
  canManage: boolean;
}

/**
 * The minutes banner (spec R7: warning at 80 percent, hard stop at the cap).
 * A guest's pool is the free daily allowance (D35): no plan, no billing link,
 * nobody to ask, and the count starts again the next day.
 */
export function entitlementMessage(entitlement: Entitlement, role: Role): EntitlementMessage {
  const { remainingMinutes, status } = entitlement;
  if (entitlement.guest) {
    if (remainingMinutes <= 0) {
      return {
        tone: 'stop',
        text: 'Today’s free minutes are used up. Come back tomorrow.',
        canManage: false,
      };
    }
    return {
      tone: entitlement.warnAt80 ? 'warning' : 'neutral',
      text: `${remainingMinutes} of ${entitlement.pooledMinutes} free minutes left today.`,
      canManage: false,
    };
  }
  const canManage = role !== 'learner';
  if (status === 'canceled') {
    return {
      tone: 'stop',
      text: canManage
        ? 'The subscription is canceled. Restart it to keep tutoring.'
        : 'The plan is paused. Ask your parent to restart it.',
      canManage,
    };
  }
  if (remainingMinutes <= 0) {
    let text: string;
    if (status === 'trial') {
      text = canManage
        ? 'The free trial minutes are used up. Subscribe to keep going.'
        : 'The free trial is used up. Ask your parent about the plan.';
    } else {
      text = canManage
        ? 'This month’s minutes are used up. They reset at the next billing date.'
        : 'This month’s minutes are used up. Ask your parent about the plan.';
    }
    return { tone: 'stop', text, canManage };
  }
  if (entitlement.warnAt80) {
    return {
      tone: 'warning',
      text:
        status === 'trial'
          ? `${minuteCount(remainingMinutes)} of trial left.`
          : `${minuteCount(remainingMinutes)} left this month.`,
      canManage,
    };
  }
  return {
    tone: 'neutral',
    text:
      status === 'trial'
        ? `${minuteCount(remainingMinutes)} of free trial left. No card needed.`
        : `${minuteCount(remainingMinutes)} left this month.`,
    canManage,
  };
}

export function roleLabel(role: Role): string {
  switch (role) {
    case 'parent':
      return 'Parent';
    case 'adult':
      return 'Adult learner';
    case 'learner':
      return 'Learner';
  }
}
