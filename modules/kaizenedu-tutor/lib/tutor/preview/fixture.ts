/**
 * The preview fixture: one sample learner and everything the product screens
 * need to render, with no database behind it.
 *
 * Why this exists. Until an operator sets DATABASE_URL, every product screen
 * would otherwise be a "not configured" panel, which shows nothing about the
 * product. In preview mode the screens render from this fixture instead, so
 * the whole surface can be walked through before any infrastructure exists.
 *
 * Two rules keep this honest, and both are enforced rather than documented:
 * every preview screen carries a visible banner saying the data is a sample
 * (components/tutor/preview/banner.tsx), and every write is refused with
 * PREVIEW_READ_ONLY rather than silently accepted. Nothing here is ever
 * reachable once DATABASE_URL is set — `isPreviewMode()` is false from that
 * moment, and the fixture is not imported by any real path.
 *
 * The learner is invented. No real person's work appears here.
 */
import type {
  CourseworkItem,
  Entitlement,
  Learner,
  MisconceptionState,
  ParentReport,
  Principal,
  SessionSummary,
  SkillMastery,
  SkillNode,
  TurnRecord,
  TutorSession,
} from '../contracts';
import type { ProgressResponse } from '../wire';

export const PREVIEW_ACCOUNT_ID = 'acc_preview';
export const PREVIEW_LEARNER_ID = 'lrn_preview';
const NOW = Date.UTC(2026, 8, 4, 15, 0, 0);

/** Deterministic timestamps: a preview that shifts under you reads as a bug. */
function daysAgo(days: number): string {
  return new Date(NOW - days * 86_400_000).toISOString();
}
function hoursFromNow(hours: number): string {
  return new Date(NOW + hours * 3_600_000).toISOString();
}

export const previewPrincipal: Principal = {
  accountId: PREVIEW_ACCOUNT_ID,
  learnerId: PREVIEW_LEARNER_ID,
  role: 'parent',
  band: '9-12',
  authSessionId: 'sess_preview',
  staff: false,
  guest: false,
};

/** The learner-side principal, for the learner surfaces. */
export const previewLearnerPrincipal: Principal = {
  ...previewPrincipal,
  role: 'learner',
};

export const previewLearner: Learner = {
  id: PREVIEW_LEARNER_ID,
  accountId: PREVIEW_ACCOUNT_ID,
  displayName: 'Sample learner',
  birthYear: 2015,
  band: '9-12',
  status: 'active',
  kind: 'child',
  loginName: null,
  createdAt: daysAgo(21),
};

export const previewLearners: Learner[] = [previewLearner];

export const previewCoursework: CourseworkItem[] = [
  {
    id: 'cw_preview_1',
    learnerId: PREVIEW_LEARNER_ID,
    title: 'Equivalent fractions worksheet',
    source: 'upload',
    status: 'ready',
    text: 'Write three fractions equivalent to $\\frac{2}{3}$. Then explain why multiplying the numerator and the denominator by the same number does not change the value.',
    skillIds: ['F3'],
    createdAt: daysAgo(3),
  },
  {
    id: 'cw_preview_2',
    learnerId: PREVIEW_LEARNER_ID,
    title: 'Adding unlike denominators',
    source: 'text',
    status: 'ready',
    text: 'Work out $\\frac{2}{3} + \\frac{1}{6}$ and show the common denominator you used.',
    skillIds: ['F8'],
    createdAt: daysAgo(1),
  },
];

/**
 * A deliberately mixed picture: one skill confirmed by a delayed unassisted
 * check, one estimated but not yet confirmed, several in progress, the rest
 * untouched. A preview that showed everything mastered would misrepresent
 * both the product and the pace of real learning.
 */
export const previewMastery: SkillMastery[] = [
  {
    learnerId: PREVIEW_LEARNER_ID,
    skillId: 'F1',
    estimate: 0.93,
    nItems: 9,
    nSessions: 3,
    status: 'confirmed',
    updatedAt: daysAgo(2),
    lastSeenAt: daysAgo(2),
    nextCheckAt: null,
  },
  {
    learnerId: PREVIEW_LEARNER_ID,
    skillId: 'F2',
    estimate: 0.86,
    nItems: 6,
    nSessions: 2,
    status: 'mastered',
    updatedAt: daysAgo(1),
    lastSeenAt: daysAgo(1),
    nextCheckAt: hoursFromNow(5),
  },
  {
    learnerId: PREVIEW_LEARNER_ID,
    skillId: 'F3',
    estimate: 0.64,
    nItems: 5,
    nSessions: 2,
    status: 'in_progress',
    updatedAt: daysAgo(1),
    lastSeenAt: daysAgo(1),
    nextCheckAt: null,
  },
  {
    learnerId: PREVIEW_LEARNER_ID,
    skillId: 'F4',
    estimate: 0.41,
    nItems: 3,
    nSessions: 1,
    status: 'in_progress',
    updatedAt: daysAgo(4),
    lastSeenAt: daysAgo(4),
    nextCheckAt: null,
  },
];

export const previewMisconceptions: MisconceptionState[] = [
  {
    learnerId: PREVIEW_LEARNER_ID,
    tag: 'add_across',
    status: 'open',
    firstSeenAt: daysAgo(4),
    resolvedAt: null,
    cleanStreak: 1,
  },
  {
    learnerId: PREVIEW_LEARNER_ID,
    tag: 'whole_number_bias',
    status: 'resolved',
    firstSeenAt: daysAgo(18),
    resolvedAt: daysAgo(6),
    cleanStreak: 3,
  },
];

const previewSummary: SessionSummary = {
  recap:
    'We worked on why two fourths and one half name the same amount. You drew the bar model yourself and caught that the pieces change size but the shaded part does not.',
  practice: [
    'Write two fractions equivalent to 3/4.',
    'Is 5/10 the same as 1/2? Show why on a number line.',
  ],
  tutorNote:
    'Equivalence is landing when a picture is available; the symbolic rule is still shaky without one. Next session moves to comparing without a drawing.',
  skillsTouched: ['F3'],
  checks: 3,
  checksCorrect: 2,
};

export const previewSessions: TutorSession[] = [
  {
    id: 'ses_preview_1',
    learnerId: PREVIEW_LEARNER_ID,
    accountId: PREVIEW_ACCOUNT_ID,
    startedAt: daysAgo(1),
    endedAt: daysAgo(1),
    minutes: 15,
    mode: 'voice',
    costCents: 78,
    thumbs: 'up',
    phase: 'ended',
    skillId: 'F3',
    courseworkId: 'cw_preview_1',
    summary: previewSummary,
  },
  {
    id: 'ses_preview_2',
    learnerId: PREVIEW_LEARNER_ID,
    accountId: PREVIEW_ACCOUNT_ID,
    startedAt: daysAgo(4),
    endedAt: daysAgo(4),
    minutes: 14,
    mode: 'voice',
    costCents: 71,
    thumbs: null,
    phase: 'ended',
    skillId: 'F4',
    courseworkId: null,
    summary: {
      recap: 'We compared fractions with different denominators using one half as a landmark.',
      practice: ['Which is bigger, 3/8 or 1/2? Say how you know.'],
      tutorNote:
        'Comparing against one half works well. Comparing two fractions that are both close to one half still needs a common denominator.',
      skillsTouched: ['F4'],
      checks: 2,
      checksCorrect: 1,
    },
  },
];

export const previewTurns: TurnRecord[] = [
  {
    id: 'trn_preview_1',
    sessionId: 'ses_preview_1',
    role: 'tutor',
    text: 'Last time we drew fraction bars. Want to pick up where we left off with equivalent fractions?',
    audioMs: null,
    latencyMs: 1180,
    model: 'preview',
    costCents: 3,
    ts: daysAgo(1),
  },
  {
    id: 'trn_preview_2',
    sessionId: 'ses_preview_1',
    role: 'learner',
    text: 'yeah but I still don’t get why two fourths is the same as a half',
    audioMs: 2400,
    latencyMs: null,
    model: null,
    costCents: 0,
    ts: daysAgo(1),
  },
  {
    id: 'trn_preview_3',
    sessionId: 'ses_preview_1',
    role: 'tutor',
    text: 'Good place to start. Before I draw anything: if you cut a chocolate bar into four equal pieces and take two, how much of the bar is gone?',
    audioMs: null,
    latencyMs: 1320,
    model: 'preview',
    costCents: 4,
    ts: daysAgo(1),
  },
];

export const previewEntitlement: Entitlement = {
  status: 'trial',
  pooledMinutes: 30,
  usedMinutes: 0,
  trialMinutesUsed: 29,
  remainingMinutes: 1,
  warnAt80: true,
};

export const previewReport: ParentReport = {
  learnerId: PREVIEW_LEARNER_ID,
  weekStart: daysAgo(4),
  sessions: 2,
  minutes: 29,
  skills: [
    {
      skillId: 'F1',
      name: 'Fraction as part of a whole; unit fractions',
      startingEstimate: 0.71,
      currentEstimate: 0.93,
      status: 'confirmed',
    },
    {
      skillId: 'F2',
      name: 'Fractions on a number line',
      startingEstimate: 0.6,
      currentEstimate: 0.86,
      status: 'mastered',
    },
    {
      skillId: 'F3',
      name: 'Equivalent fractions',
      startingEstimate: 0.38,
      currentEstimate: 0.64,
      status: 'in_progress',
    },
    {
      skillId: 'F4',
      name: 'Comparing and ordering',
      startingEstimate: 0.3,
      currentEstimate: 0.41,
      status: 'in_progress',
    },
  ],
  misconceptionsOpen: ['add_across'],
  misconceptionsResolved: ['whole_number_bias'],
  nextSkill: { id: 'F5', name: 'Simplifying (GCF)' },
  sessionNotes: previewSessions.map((session) => ({
    sessionId: session.id,
    date: session.startedAt,
    note: session.summary?.tutorNote ?? '',
    thumbs: session.thumbs,
  })),
  attention: null,
};

/**
 * The twelve launch-slice skills, so the learner's progress screen has a
 * shape to render before the graph is seeded into a database. Names match
 * the pedagogy skill graph; only the first four carry mastery above, which
 * is why the rest read as not started.
 */
const PREVIEW_SKILLS: SkillNode[] = [
  {
    id: 'F1',
    name: 'Fraction as part of a whole; unit fractions',
    prereqs: [],
    tags: [],
    slice: 'fractions-to-pre-algebra',
  },
  {
    id: 'F2',
    name: 'Fractions on a number line',
    prereqs: ['F1'],
    tags: [],
    slice: 'fractions-to-pre-algebra',
  },
  {
    id: 'F3',
    name: 'Equivalent fractions',
    prereqs: ['F1', 'F2'],
    tags: [],
    slice: 'fractions-to-pre-algebra',
  },
  {
    id: 'F4',
    name: 'Comparing and ordering',
    prereqs: ['F3'],
    tags: [],
    slice: 'fractions-to-pre-algebra',
  },
  {
    id: 'F5',
    name: 'Simplifying (GCF)',
    prereqs: ['F3'],
    tags: [],
    slice: 'fractions-to-pre-algebra',
  },
  {
    id: 'F6',
    name: 'Mixed numbers and improper fractions',
    prereqs: ['F2'],
    tags: [],
    slice: 'fractions-to-pre-algebra',
  },
  {
    id: 'F7',
    name: 'Add and subtract with like denominators',
    prereqs: ['F1'],
    tags: [],
    slice: 'fractions-to-pre-algebra',
  },
  {
    id: 'F8',
    name: 'Add and subtract with unlike denominators',
    prereqs: ['F5', 'F7'],
    tags: [],
    slice: 'fractions-to-pre-algebra',
  },
  {
    id: 'F9',
    name: 'Multiply fractions',
    prereqs: ['F5'],
    tags: [],
    slice: 'fractions-to-pre-algebra',
  },
  {
    id: 'F10',
    name: 'Divide fractions',
    prereqs: ['F9'],
    tags: [],
    slice: 'fractions-to-pre-algebra',
  },
  {
    id: 'F11',
    name: 'Fractions, decimals, percents',
    prereqs: ['F5'],
    tags: [],
    slice: 'fractions-to-pre-algebra',
  },
  {
    id: 'F12',
    name: 'Ratios and simple proportions',
    prereqs: ['F11'],
    tags: [],
    slice: 'fractions-to-pre-algebra',
  },
];

export const previewProgress: ProgressResponse = {
  skills: PREVIEW_SKILLS,
  mastery: previewMastery,
  misconceptions: previewMisconceptions,
  nextSkill: PREVIEW_SKILLS.find((skill) => skill.id === 'F5') ?? null,
  // F2 is estimated but not confirmed, and its delayed unassisted check is
  // due — the moment the product's central rule becomes visible on screen.
  dueChecks: [{ skillId: 'F2', dueAt: hoursFromNow(5) }],
  sessions: previewSessions.length,
  minutes: previewSessions.reduce((total, session) => total + session.minutes, 0),
};
