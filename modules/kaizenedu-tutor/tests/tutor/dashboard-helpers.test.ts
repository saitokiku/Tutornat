/**
 * The pure helpers behind /learn and /parent. These are the rules that would
 * be expensive to get wrong: the mastery-versus-estimate wording (strategy
 * law 2), the minutes banner, the start-a-session body, and the typed
 * deletion confirmation. No DOM is involved, so they run in the node suite.
 */
import { describe, expect, it } from 'vitest';

import {
  ageBandForBirthYear,
  BANDS,
  GUEST,
  GUEST_LEVELS,
  PLAN,
  representativeBirthYear,
} from '@/kaizen.config';
import { PASSWORD_MIN_LENGTH as SERVER_PASSWORD_MIN_LENGTH } from '@/lib/tutor/auth/password';
import {
  attentionSentence,
  bandForBirthYear,
  buildProgressRows,
  checkStartSelection,
  daysUntil,
  deletionPhraseFor,
  dueCheckLabel,
  entitlementMessage,
  exportFileName,
  formatEstimate,
  formatMinutes,
  greetingFor,
  groupPlannerItems,
  guestGreeting,
  guestLevelFor,
  isConfirmedMastery,
  learnerProgressSentence,
  localIsoDate,
  masteryStatusLabel,
  matchesDeletionPhrase,
  nextDueCheck,
  openMisconceptions,
  PASSWORD_MIN_LENGTH,
  PLANNER_NOTES_MAX_LENGTH,
  PLANNER_TITLE_MAX_LENGTH,
  plannerDueLabel,
  profileWillBeLocked,
  progressSentence,
  recentlyLearned,
  reportSkillSentence,
  sessionMinutesFor,
  sessionsSentence,
  signInUrlFor,
  startBlockedReason,
  summarizeLearning,
  tallyProgress,
  togglePlannerStatus,
  TOPIC_TEXT_MAX_LENGTH,
  touchedRows,
  unauthenticatedUrlFor,
  untouchedRows,
  upgradePathFor,
  validatePlannerDueOn,
  validatePlannerNotes,
  validatePlannerTitle,
  validateTopicText,
  validateUploadFile,
} from '@/lib/tutor/client';
import type {
  Entitlement,
  MisconceptionState,
  ParentReportSkill,
  PlannerItem,
  SkillMastery,
  SkillNode,
} from '@/lib/tutor/contracts';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

const SKILLS: SkillNode[] = [
  { id: 'F1', name: 'Fraction as part of a whole', prereqs: [], tags: [], slice: 'fractions' },
  { id: 'F2', name: 'Fractions on a number line', prereqs: ['F1'], tags: [], slice: 'fractions' },
  { id: 'F3', name: 'Equivalent fractions', prereqs: ['F2'], tags: [], slice: 'fractions' },
];

function mastery(overrides: Partial<SkillMastery> & Pick<SkillMastery, 'skillId'>): SkillMastery {
  return {
    learnerId: 'learner_1',
    estimate: 0.5,
    nItems: 4,
    nSessions: 2,
    status: 'in_progress',
    updatedAt: '2026-09-01T00:00:00.000Z',
    lastSeenAt: '2026-09-01T00:00:00.000Z',
    nextCheckAt: null,
    ...overrides,
  };
}

function entitlement(overrides: Partial<Entitlement> = {}): Entitlement {
  return {
    status: 'trial',
    pooledMinutes: 30,
    usedMinutes: 0,
    trialMinutesUsed: 0,
    remainingMinutes: 30,
    warnAt80: false,
    ...overrides,
  };
}

describe('progress rows', () => {
  it('gives every skill a row, in graph order, with defaults for untouched skills', () => {
    const rows = buildProgressRows(SKILLS, [mastery({ skillId: 'F2', estimate: 0.82 })]);
    expect(rows.map((row) => row.skill.id)).toEqual(['F1', 'F2', 'F3']);
    expect(rows[0]).toMatchObject({ status: 'not_started', estimate: 0, nItems: 0, dueNow: false });
    expect(rows[1]).toMatchObject({ status: 'in_progress', estimate: 0.82 });
  });

  it('clamps an estimate to 0 to 1 and marks the checks the API says are due', () => {
    const rows = buildProgressRows(
      SKILLS,
      [
        mastery({ skillId: 'F1', estimate: 1.4, status: 'mastered', nextCheckAt: 'x' }),
        mastery({ skillId: 'F2', estimate: Number.NaN }),
      ],
      [{ skillId: 'F1', dueAt: '2026-09-02T00:00:00.000Z' }],
    );
    expect(rows[0].estimate).toBe(1);
    expect(rows[0].dueNow).toBe(true);
    expect(rows[1].estimate).toBe(0);
    expect(rows[1].dueNow).toBe(false);
  });

  it('keeps only the open misconceptions', () => {
    const entries: MisconceptionState[] = [
      {
        learnerId: 'l',
        tag: 'add_across',
        status: 'open',
        firstSeenAt: 'a',
        resolvedAt: null,
        cleanStreak: 0,
      },
      {
        learnerId: 'l',
        tag: 'decimal_length',
        status: 'resolved',
        firstSeenAt: 'a',
        resolvedAt: 'b',
        cleanStreak: 3,
      },
    ];
    expect(openMisconceptions(entries).map((entry) => entry.tag)).toEqual(['add_across']);
  });
});

describe('mastery wording (strategy law 2)', () => {
  it('calls only a confirmed skill mastery', () => {
    expect(isConfirmedMastery('confirmed')).toBe(true);
    for (const status of ['not_started', 'in_progress', 'mastered'] as const) {
      expect(isConfirmedMastery(status)).toBe(false);
    }
  });

  it('labels the estimate as an estimate and the confirmation as confirmed', () => {
    expect(masteryStatusLabel('mastered')).toMatch(/estimate/i);
    expect(masteryStatusLabel('confirmed')).toBe('Confirmed');
    expect(masteryStatusLabel('in_progress')).toBe('In progress');
  });

  it('never claims mastery in the summary sentence for an unconfirmed skill', () => {
    const rows = buildProgressRows(SKILLS, [
      mastery({ skillId: 'F1', status: 'mastered' }),
      mastery({ skillId: 'F2', status: 'in_progress' }),
    ]);
    const tally = tallyProgress(rows);
    expect(tally).toMatchObject({ total: 3, confirmed: 0, estimated: 1, inProgress: 1 });
    const sentence = progressSentence(tally);
    expect(sentence).toMatch(/0 of 3 confirmed/);
    expect(sentence).toMatch(/not confirmed yet/);
    expect(sentence.toLowerCase()).not.toContain('mastery');
    expect(sentence.toLowerCase()).not.toContain('mastered');
  });

  it('counts a confirmed skill and says so', () => {
    const rows = buildProgressRows(SKILLS, [mastery({ skillId: 'F3', status: 'confirmed' })]);
    expect(progressSentence(tallyProgress(rows))).toMatch(/1 of 3 confirmed by an unaided check/);
  });

  it('says nothing is recorded when no skill has been checked', () => {
    expect(progressSentence(tallyProgress(buildProgressRows(SKILLS, [])))).toBe(
      'No checks recorded yet across 3 skills.',
    );
  });

  it('reads a delayed check as due now or as overdue by days', () => {
    const now = new Date('2026-09-04T12:00:00.000Z');
    expect(dueCheckLabel('2026-09-04T09:00:00.000Z', now)).toBe('Due now');
    expect(dueCheckLabel('2026-09-03T09:00:00.000Z', now)).toBe('Due since yesterday');
    expect(dueCheckLabel('2026-09-01T09:00:00.000Z', now)).toBe('Due for 3 days');
    expect(dueCheckLabel('not a date', now)).toBe('Due now');
  });
});

describe('what the learner dashboard leads with', () => {
  it('separates the skills that have been touched from the graph behind them', () => {
    const rows = buildProgressRows(SKILLS, [
      mastery({ skillId: 'F1', status: 'confirmed' }),
      mastery({ skillId: 'F2', status: 'in_progress' }),
    ]);
    expect(touchedRows(rows).map((row) => row.skill.id)).toEqual(['F1', 'F2']);
    expect(untouchedRows(rows).map((row) => row.skill.id)).toEqual(['F3']);
  });

  it('shows confirmed skills before estimates, strongest first, and never more than asked', () => {
    const rows = buildProgressRows(SKILLS, [
      mastery({ skillId: 'F1', status: 'mastered', estimate: 0.81 }),
      mastery({ skillId: 'F2', status: 'confirmed', estimate: 0.9 }),
      mastery({ skillId: 'F3', status: 'mastered', estimate: 0.86 }),
    ]);
    expect(recentlyLearned(rows).map((row) => row.skill.id)).toEqual(['F2', 'F3', 'F1']);
    expect(recentlyLearned(rows, 2).map((row) => row.skill.id)).toEqual(['F2', 'F3']);
    // An in-progress skill is not something the learner has got down.
    const early = buildProgressRows(SKILLS, [mastery({ skillId: 'F1', status: 'in_progress' })]);
    expect(recentlyLearned(early)).toEqual([]);
  });

  it('names the one check that is due, or nothing', () => {
    const rows = buildProgressRows(
      SKILLS,
      [mastery({ skillId: 'F2', status: 'mastered' })],
      [{ skillId: 'F2', dueAt: '2026-09-02T00:00:00.000Z' }],
    );
    expect(nextDueCheck(rows)?.skill.name).toBe('Fractions on a number line');
    expect(nextDueCheck(buildProgressRows(SKILLS, []))).toBeNull();
  });

  it('leads with work done, and still refuses to call an estimate mastery', () => {
    const brandNew = learnerProgressSentence(tallyProgress(buildProgressRows(SKILLS, [])));
    expect(brandNew).toBe('Nothing checked yet. Your first session sets the starting point.');
    // The old sentence opened with "0 of 12", which is the graph's size, not
    // the learner's progress. The new one never leads with what is missing.
    expect(brandNew).not.toMatch(/0 of 3/);

    const sentence = learnerProgressSentence(
      tallyProgress(
        buildProgressRows(SKILLS, [
          mastery({ skillId: 'F1', status: 'confirmed' }),
          mastery({ skillId: 'F2', status: 'mastered' }),
          mastery({ skillId: 'F3', status: 'in_progress' }),
        ]),
      ),
    );
    expect(sentence).toBe(
      '3 skills worked on so far, 1 confirmed by a check with no help, 1 waiting on that check.',
    );
    expect(sentence.toLowerCase()).not.toContain('mastery');
    expect(sentence.toLowerCase()).not.toContain('mastered');
  });

  it('states sessions and minutes, or says there are none', () => {
    expect(sessionsSentence(0, 0)).toBe('No sessions yet.');
    expect(sessionsSentence(1, 15)).toBe('1 session, 15 min in total.');
    expect(sessionsSentence(4, 95, 'this week')).toBe('4 sessions, 1 h 35 min this week.');
  });
});

describe('the parent overview summary', () => {
  function skill(overrides: Partial<ParentReportSkill> = {}): ParentReportSkill {
    return {
      skillId: 'F1',
      name: 'Equivalent fractions',
      startingEstimate: 0.4,
      currentEstimate: 0.6,
      status: 'in_progress',
      ...overrides,
    };
  }

  it('answers "is my child learning" in plain sentences, with names and no ids', () => {
    const summary = summarizeLearning({
      sessions: 2,
      minutes: 29,
      skills: [
        skill({ skillId: 'F1', name: 'Fractions on a number line', status: 'confirmed' }),
        skill({ skillId: 'F2', name: 'Equivalent fractions' }),
      ],
      nextSkill: { name: 'Simplifying (GCF)' },
    });
    expect(summary.activity).toBe('2 sessions this week, 29 min in total.');
    expect(summary.progress).toBe('Checked without help: Fractions on a number line.');
    expect(summary.next).toBe('Simplifying (GCF)');
    for (const line of [summary.activity, summary.progress, summary.next]) {
      expect(line ?? '').not.toMatch(/\bF\d+\b/);
    }
  });

  it('falls back to movement, then to what is being worked on, then to nothing', () => {
    const moving = summarizeLearning({
      sessions: 1,
      minutes: 15,
      skills: [skill({ startingEstimate: 0.3, currentEstimate: 0.64 })],
      nextSkill: null,
    });
    expect(moving.progress).toBe('Getting better at Equivalent fractions.');
    expect(moving.next).toBeNull();

    const flat = summarizeLearning({
      sessions: 1,
      minutes: 15,
      skills: [skill({ startingEstimate: 0.64, currentEstimate: 0.64 })],
      nextSkill: null,
    });
    expect(flat.progress).toBe('Working on Equivalent fractions.');

    const empty = summarizeLearning({ sessions: 0, minutes: 0, skills: [], nextSkill: null });
    expect(empty.activity).toBe('No sessions this week.');
    expect(empty.progress).toBeNull();
  });

  it('lists at most three names and counts the rest', () => {
    const many = summarizeLearning({
      sessions: 1,
      minutes: 15,
      skills: ['One', 'Two', 'Three', 'Four'].map((name, index) =>
        skill({ skillId: `F${index + 1}`, name, status: 'confirmed' }),
      ),
      nextSkill: null,
    });
    expect(many.progress).toBe('Checked without help: One, Two and Three and 1 more.');
  });

  it('never calls an estimate a confirmation on the parent surface', () => {
    const estimated = summarizeLearning({
      sessions: 1,
      minutes: 15,
      skills: [skill({ status: 'mastered', startingEstimate: 0.5, currentEstimate: 0.86 })],
      nextSkill: null,
    });
    expect(estimated.progress).toBe('Getting better at Equivalent fractions.');
    expect(estimated.progress?.toLowerCase()).not.toContain('without help');
    expect(estimated.progress?.toLowerCase()).not.toContain('mastery');
  });
});

describe('band-appropriate copy', () => {
  it('greets by first name in a register that fits the band', () => {
    expect(greetingFor('Maya Okonkwo-Fitzgerald', '9-12')).toEqual({
      title: 'Hi Maya.',
      subtitle: 'Pick something to work on. The tutor talks with you and draws as you go.',
    });
    expect(greetingFor('Sam', '13-17').subtitle).toMatch(/homework or the next skill/);
    expect(greetingFor('Dana', 'adult').title).toBe('Welcome back, Dana.');
    expect(greetingFor('   ', null).title).toBe('Welcome back, there.');
  });

  it('plans a session no longer than the band default or the minutes left', () => {
    expect(sessionMinutesFor('13-17', BANDS, 120)).toBe(BANDS['13-17'].sessionMinutes);
    expect(sessionMinutesFor('9-12', BANDS, 120)).toBe(15);
    expect(sessionMinutesFor('9-12', BANDS, 7)).toBe(7);
    expect(sessionMinutesFor(null, BANDS, 120)).toBe(BANDS.adult.sessionMinutes);
    expect(sessionMinutesFor('adult', BANDS, 0)).toBe(0);
  });

  it('locks an under-13 profile while the gate is shut and never locks a teen', () => {
    expect(profileWillBeLocked('4-8', true)).toBe(true);
    expect(profileWillBeLocked('9-12', false)).toBe(true);
    expect(profileWillBeLocked('9-12', true)).toBe(false);
    expect(profileWillBeLocked('13-17', false)).toBe(false);
  });
});

describe('entitlement formatting', () => {
  it('states the minutes left and needs no card during the trial', () => {
    const message = entitlementMessage(entitlement(), 'parent');
    expect(message).toMatchObject({ tone: 'neutral', canManage: true });
    expect(message.text).toBe('30 minutes of free trial left. No card needed.');
  });

  it('says minute, not minutes, on the last one', () => {
    // A learner on their final minute is exactly who saw "1 trial minutes left".
    const message = entitlementMessage(
      { ...entitlement(), remainingMinutes: 1, trialMinutesUsed: 29, warnAt80: true },
      'parent',
    );
    expect(message.text).toContain('1 minute of trial left');
    expect(message.text).not.toContain('1 minutes');
  });

  it('warns at 80 percent without changing who can act', () => {
    const message = entitlementMessage(
      entitlement({
        status: 'active',
        pooledMinutes: 480,
        usedMinutes: 400,
        remainingMinutes: 80,
        warnAt80: true,
      }),
      'parent',
    );
    expect(message.tone).toBe('warning');
    expect(message.text).toBe('80 minutes left this month.');
  });

  it('sends a teen to their parent and an account holder to the plan', () => {
    const spent = entitlement({ remainingMinutes: 0, trialMinutesUsed: 30, warnAt80: true });
    expect(entitlementMessage(spent, 'learner')).toMatchObject({
      tone: 'stop',
      canManage: false,
    });
    expect(entitlementMessage(spent, 'learner').text).toMatch(/Ask your parent/);
    expect(entitlementMessage(spent, 'parent').text).toMatch(/Subscribe to keep going/);
    expect(upgradePathFor('learner')).toBe('ask_parent');
    expect(upgradePathFor('parent')).toBe('manage');
    expect(upgradePathFor('adult')).toBe('manage');
  });

  it('formats minutes and estimates the way both dashboards show them', () => {
    expect(formatMinutes(0)).toBe('0 min');
    expect(formatMinutes(59)).toBe('59 min');
    expect(formatMinutes(PLAN.pooledMinutesMonthly)).toBe('8 h');
    expect(formatMinutes(95)).toBe('1 h 35 min');
    expect(formatEstimate(0.784)).toBe('78%');
    expect(formatEstimate(null)).toBe('No data');
    expect(formatEstimate(2)).toBe('100%');
  });
});

describe('starting a session', () => {
  it('refuses an incomplete choice and names the field to focus', () => {
    expect(
      checkStartSelection({ source: null, courseworkId: null, skillId: null, mode: null }),
    ).toMatchObject({ ok: false, field: 'source' });
    expect(
      checkStartSelection({
        source: 'coursework',
        courseworkId: null,
        skillId: null,
        mode: 'voice',
      }),
    ).toMatchObject({ ok: false, field: 'coursework' });
    expect(
      checkStartSelection({ source: 'next_skill', courseworkId: null, skillId: 'F3', mode: null }),
    ).toMatchObject({ ok: false, field: 'mode' });
  });

  it('builds the exact request body for each source', () => {
    expect(
      checkStartSelection({
        source: 'coursework',
        courseworkId: 'cw_1',
        skillId: 'F3',
        mode: 'text',
      }),
    ).toEqual({ ok: true, body: { mode: 'text', courseworkId: 'cw_1' } });
    expect(
      checkStartSelection({
        source: 'next_skill',
        courseworkId: 'cw_1',
        skillId: 'F3',
        mode: 'voice',
      }),
    ).toEqual({ ok: true, body: { mode: 'voice', skillId: 'F3' } });
  });

  it('blocks a session for a locked, frozen, or out-of-minutes profile', () => {
    expect(startBlockedReason(null, entitlement())).toMatch(/Choose a learner/);
    expect(startBlockedReason({ status: 'locked' }, entitlement())).toMatch(/consent review/);
    expect(startBlockedReason({ status: 'frozen' }, entitlement())).toMatch(/frozen/);
    expect(startBlockedReason({ status: 'active' }, entitlement({ remainingMinutes: 0 }))).toMatch(
      /no minutes left/i,
    );
    expect(startBlockedReason({ status: 'active' }, entitlement({ status: 'canceled' }))).toMatch(
      /canceled/,
    );
    expect(startBlockedReason({ status: 'active' }, entitlement())).toBeNull();
  });

  it('accepts the upload types the extractor takes and rejects the rest', () => {
    expect(validateUploadFile({ name: 'worksheet.HEIC', size: 1_000, type: '' })).toBeNull();
    expect(validateUploadFile({ name: 'p.pdf', size: 1_000, type: 'application/pdf' })).toBeNull();
    expect(validateUploadFile({ name: 'notes.docx', size: 10, type: '' })).toMatch(/photo/);
    expect(validateUploadFile({ name: 'p.png', size: 0, type: 'image/png' })).toMatch(/empty/);
    expect(
      validateUploadFile({ name: 'p.png', size: 21 * 1024 * 1024, type: 'image/png' }),
    ).toMatch(/20 MB/);
  });
});

describe('parent report wording', () => {
  it('reads a skill as starting-then-now, and says when there is no earlier estimate', () => {
    expect(
      reportSkillSentence({
        skillId: 'F1',
        name: 'Fractions',
        startingEstimate: 0.42,
        currentEstimate: 0.78,
        status: 'in_progress',
      }),
    ).toBe('Fractions — starting 42%, now 78%');
    expect(
      reportSkillSentence({
        skillId: 'F2',
        name: 'Number line',
        startingEstimate: null,
        currentEstimate: 0.6,
        status: 'in_progress',
      }),
    ).toBe('Number line — now 60%, first week measured');
    expect(
      reportSkillSentence({
        skillId: 'F3',
        name: 'Equivalence',
        startingEstimate: null,
        currentEstimate: 0,
        status: 'not_started',
      }),
    ).toBe('Equivalence — no checks yet');
  });

  it('reports attention as numbers, not as a judgement', () => {
    expect(attentionSentence({ attendingPct: 87.4, recoveries: 1 })).toBe(
      'Looking at the screen 87% of session time, with 1 check-in from the tutor.',
    );
    expect(attentionSentence({ attendingPct: 140, recoveries: 0 })).toMatch(/100% of session time/);
  });
});

describe('deletion and export', () => {
  it('asks for the learner name, or the account phrase, typed exactly', () => {
    expect(deletionPhraseFor({ displayName: 'Maya' })).toBe('delete Maya');
    expect(deletionPhraseFor(null)).toBe('delete my account');
  });

  it('accepts case and spacing differences but nothing else', () => {
    expect(matchesDeletionPhrase('  Delete   Maya ', 'delete Maya')).toBe(true);
    expect(matchesDeletionPhrase('delete maya!', 'delete Maya')).toBe(false);
    expect(matchesDeletionPhrase('', 'delete my account')).toBe(false);
    expect(matchesDeletionPhrase('delete', 'delete my account')).toBe(false);
  });

  it('names the export file with ids and a date, never with a person', () => {
    expect(exportFileName('learner_42', '2026-09-04T10:11:12.000Z')).toBe(
      'natural-tutor-learner_42-2026-09-04.json',
    );
    expect(exportFileName('learner_42', 'unknown')).toBe('natural-tutor-learner_42-export.json');
  });
});

describe('client copies of server rules', () => {
  it('keeps the birth-year band rule identical to the server rule', () => {
    const now = new Date('2026-09-04T00:00:00.000Z');
    for (const year of [2026, 2022, 2018, 2014, 2010, 2006, 1990]) {
      expect(bandForBirthYear(year, now)).toBe(ageBandForBirthYear(year, now));
    }
  });

  it('keeps the password minimum identical to the server rule', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(SERVER_PASSWORD_MIN_LENGTH);
  });
});

describe('guest mode and topic sessions (D35)', () => {
  it('builds a topic body from a subject and the learner’s trimmed words', () => {
    expect(
      checkStartSelection({
        source: 'topic',
        topic: { subject: 'science', text: '  Why the moon has phases  ' },
        courseworkId: null,
        skillId: null,
        mode: 'voice',
      }),
    ).toEqual({
      ok: true,
      body: { mode: 'voice', topic: { subject: 'science', text: 'Why the moon has phases' } },
    });
  });

  it('refuses a topic with no words, too many words, or an unknown subject', () => {
    const base = {
      source: 'topic' as const,
      courseworkId: null,
      skillId: null,
      mode: 'text' as const,
    };
    expect(checkStartSelection({ ...base, topic: { subject: 'math', text: '   ' } })).toMatchObject(
      { ok: false, field: 'topic' },
    );
    expect(
      checkStartSelection({
        ...base,
        topic: { subject: 'math', text: 'x'.repeat(TOPIC_TEXT_MAX_LENGTH + 1) },
      }),
    ).toMatchObject({
      ok: false,
      field: 'topic',
      error: `Use at most ${TOPIC_TEXT_MAX_LENGTH} characters.`,
    });
    expect(
      checkStartSelection({
        ...base,
        topic: { subject: 'astrology' as never, text: 'Anything' },
      }),
    ).toMatchObject({ ok: false, field: 'topic' });
    expect(checkStartSelection({ ...base, topic: null })).toMatchObject({
      ok: false,
      field: 'topic',
    });
    expect(validateTopicText('x'.repeat(TOPIC_TEXT_MAX_LENGTH))).toBeNull();
  });

  it('words the free daily minutes for a guest, with no plan and nobody to ask', () => {
    const guest = entitlement({
      guest: true,
      status: 'active',
      pooledMinutes: GUEST.dailyMinutes,
      usedMinutes: 20,
      remainingMinutes: GUEST.dailyMinutes - 20,
    });
    expect(entitlementMessage(guest, 'learner')).toEqual({
      tone: 'neutral',
      text: `${GUEST.dailyMinutes - 20} of ${GUEST.dailyMinutes} free minutes left today.`,
      canManage: false,
    });
    expect(
      entitlementMessage(
        { ...guest, remainingMinutes: 10, usedMinutes: 110, warnAt80: true },
        'learner',
      ),
    ).toMatchObject({
      tone: 'warning',
      text: `10 of ${GUEST.dailyMinutes} free minutes left today.`,
    });
    const spent = entitlementMessage(
      { ...guest, remainingMinutes: 0, usedMinutes: GUEST.dailyMinutes, warnAt80: true },
      'learner',
    );
    expect(spent).toMatchObject({ tone: 'stop', canManage: false });
    expect(spent.text).toBe('Today’s free minutes are used up. Come back tomorrow.');
    for (const message of [spent.text]) {
      expect(message.toLowerCase()).not.toMatch(/plan|parent|subscri|trial|billing/);
    }
    expect(upgradePathFor('learner', true)).toBe('none');
    expect(upgradePathFor('parent', true)).toBe('none');
    expect(upgradePathFor('learner')).toBe('ask_parent');
  });

  it('blocks a guest only when today’s minutes are gone, in the guest’s words', () => {
    expect(
      startBlockedReason(
        { status: 'active' },
        { guest: true, status: 'active', remainingMinutes: 0 },
      ),
    ).toBe('Today’s free minutes are used up. Come back tomorrow.');
    expect(
      startBlockedReason(
        { status: 'active' },
        { guest: true, status: 'active', remainingMinutes: 5 },
      ),
    ).toBeNull();
  });

  it('greets a guest by visit, never by the placeholder name', () => {
    expect(guestGreeting(false)).toEqual({
      title: 'Hi.',
      subtitle: 'Say what you want to work on and start.',
    });
    expect(guestGreeting(true).title).toBe('Welcome back.');
    expect(guestGreeting(true).title).not.toContain('You');
  });

  it('reads a guest level back from the band and the representative birth year', () => {
    const now = new Date('2026-09-30T00:00:00.000Z');
    const level = GUEST_LEVELS.find((entry) => entry.id === '6-7')!;
    expect(
      guestLevelFor(
        { band: level.band, birthYear: representativeBirthYear('6-7', now) },
        GUEST_LEVELS,
        now,
      )?.id,
    ).toBe('6-7');
    // A row created before a year boundary still lands in the same band.
    const nextYear = new Date('2027-01-02T00:00:00.000Z');
    expect(
      guestLevelFor(
        { band: level.band, birthYear: representativeBirthYear('6-7', now) },
        GUEST_LEVELS,
        nextYear,
      )?.band,
    ).toBe(level.band);
    expect(guestLevelFor({ band: '13-17', birthYear: 1900 }, GUEST_LEVELS, now)?.band).toBe(
      '13-17',
    );
  });

  it('sends a signed-out browser to the landing page, and never bounces the landing or auth pages', () => {
    expect(unauthenticatedUrlFor('/learn')).toBe(PRODUCT_ROUTES.landing);
    expect(unauthenticatedUrlFor('/session/abc')).toBe(PRODUCT_ROUTES.landing);
    expect(unauthenticatedUrlFor(PRODUCT_ROUTES.landing)).toBeNull();
    expect(unauthenticatedUrlFor('/')).toBeNull();
    expect(unauthenticatedUrlFor(PRODUCT_ROUTES.signIn)).toBeNull();
    expect(unauthenticatedUrlFor(PRODUCT_ROUTES.signUp)).toBeNull();
    // The auth forms still build their own return link.
    expect(signInUrlFor('/parent', '?tab=billing')).toBe('/sign-in?next=%2Fparent%3Ftab%3Dbilling');
  });
});

describe('the planner', () => {
  function item(overrides: Partial<PlannerItem> & Pick<PlannerItem, 'id'>): PlannerItem {
    return {
      learnerId: 'learner_1',
      title: `Item ${overrides.id}`,
      subject: 'math',
      dueOn: null,
      status: 'todo',
      notes: '',
      createdAt: '2026-09-01T00:00:00.000Z',
      completedAt: null,
      ...overrides,
    };
  }
  const today = '2026-09-30';

  it('groups items by when they are due, drops empty groups, and sorts open items by date', () => {
    const groups = groupPlannerItems(
      [
        item({ id: 'undated' }),
        item({ id: 'far', dueOn: '2026-10-20' }),
        item({ id: 'week2', dueOn: '2026-10-06' }),
        item({ id: 'week1', dueOn: '2026-10-02' }),
        item({ id: 'today', dueOn: '2026-09-30' }),
        item({ id: 'late', dueOn: '2026-09-28' }),
        item({ id: 'done', dueOn: '2026-09-01', status: 'done' }),
      ],
      today,
    );
    expect(groups.map((group) => group.key)).toEqual(['overdue', 'today', 'week', 'later', 'done']);
    expect(groups.map((group) => group.items.map((entry) => entry.id))).toEqual([
      ['late'],
      ['today'],
      ['week1', 'week2'],
      ['far', 'undated'],
      ['done'],
    ]);
    expect(groups.map((group) => group.label)).toEqual([
      'Overdue',
      'Today',
      'This week',
      'Later',
      'Done',
    ]);
  });

  it('shows only the groups that have something in them', () => {
    expect(groupPlannerItems([], today)).toEqual([]);
    expect(
      groupPlannerItems([item({ id: 'a', dueOn: '2026-10-07' })], today).map((g) => g.key),
    ).toEqual(['later']);
    // Six days out is still this week; seven is later.
    expect(groupPlannerItems([item({ id: 'a', dueOn: '2026-10-06' })], today)[0]?.key).toBe('week');
  });

  it('reads a due date relative to today', () => {
    expect(plannerDueLabel(null, today)).toBe('No due date');
    expect(plannerDueLabel('2026-09-30', today)).toBe('Due today');
    expect(plannerDueLabel('2026-10-01', today)).toBe('Due tomorrow');
    expect(plannerDueLabel('2026-10-03', today)).toBe('Due Saturday');
    expect(plannerDueLabel('2026-10-14', today)).toBe('Due Oct 14, 2026');
    expect(plannerDueLabel('2026-09-29', today)).toBe('Due yesterday');
    expect(plannerDueLabel('2026-09-20', today)).toBe('Due 10 days ago');
    expect(plannerDueLabel('not a date', today)).toBe('No due date');
    expect(daysUntil('2026-10-02', today)).toBe(2);
  });

  it('validates the add form the way the server will', () => {
    expect(validatePlannerTitle('  ')).toMatch(/short title/);
    expect(validatePlannerTitle('x'.repeat(PLANNER_TITLE_MAX_LENGTH + 1))).toMatch(/at most/);
    expect(validatePlannerTitle('Chapter 4 quiz')).toBeNull();
    expect(validatePlannerNotes('x'.repeat(PLANNER_NOTES_MAX_LENGTH + 1))).toMatch(/at most/);
    expect(validatePlannerNotes('')).toBeNull();
    expect(validatePlannerDueOn('')).toBeNull();
    expect(validatePlannerDueOn('2026-10-02')).toBeNull();
    expect(validatePlannerDueOn('next week')).toMatch(/date/);
    expect(togglePlannerStatus('done')).toBe('todo');
    expect(togglePlannerStatus('todo')).toBe('done');
    expect(localIsoDate(new Date(2026, 8, 30, 23, 30))).toBe('2026-09-30');
  });
});
