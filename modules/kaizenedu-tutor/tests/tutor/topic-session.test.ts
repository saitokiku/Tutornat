/**
 * Topic sessions (D35): any subject off the fractions graph. The subject
 * skill ids, the topic parser, the session target, the prompt context, the
 * WRAP fallback wording, and what the progress view lists.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { POST as createSessionRoute } from '@/app/(learner)/api/tutor/session/route';
import { POST as createCourseworkRoute } from '@/app/(learner)/api/tutor/coursework/route';
import { TUTOR_API } from '@/lib/tutor/contracts';
import { setTutorDbForTests, type TutorDb } from '@/lib/tutor/db';
import { isGraphSkillId, isMisconceptionTag, isSkillId, skillById } from '@/lib/tutor/graph/graph';
import { subjectOfSkillId, subjectSkillId, SUBJECTS } from '@/lib/tutor/graph/subjects';
import {
  buildStaticSections,
  buildSystemPrompt,
  type PromptContext,
} from '@/lib/tutor/prompts/build';
import { initialState, normalizeState } from '@/lib/tutor/session/state';
import { parseSessionTopic, TOPIC_TEXT_MAX } from '@/lib/tutor/session/topic';
import { fallbackSummary } from '@/lib/tutor/wrap/service';
import type { CourseworkItemResponse, CreateSessionResponse } from '@/lib/tutor/wire';

import { call } from './_api';
import { testDb } from './_db';
import { setUpLearner, type Learner } from './_turn-helpers';

let db: TutorDb;
let learner: Learner;

beforeAll(async () => {
  vi.stubEnv('TUTOR_MODE', '1');
  db = await testDb();
  learner = await setUpLearner(db, 'topic-a@example.com');
});

afterAll(async () => {
  await setTutorDbForTests(null);
  await db.end();
  vi.unstubAllEnvs();
});

describe('subject skills', () => {
  it('every subject has a synthetic skill the model layer accepts and the graph layer does not', () => {
    for (const subject of SUBJECTS) {
      const id = subjectSkillId(subject.id);
      expect(isSkillId(id)).toBe(true);
      expect(isGraphSkillId(id)).toBe(false);
      expect(subjectOfSkillId(id)).toBe(subject.id);
      expect(skillById(id)?.name).toBe(subject.label);
      expect(skillById(id)?.prereqs).toEqual([]);
    }
    expect(isSkillId('S-astrology')).toBe(false);
    expect(isGraphSkillId('F1')).toBe(true);
  });

  it('accepts the generic misconception tags beside the fractions ones', () => {
    expect(isMisconceptionTag('add_across')).toBe(true);
    expect(isMisconceptionTag('misread')).toBe(true);
    expect(isMisconceptionTag('vocabulary')).toBe(true);
    expect(isMisconceptionTag('nonsense')).toBe(false);
  });
});

describe('the topic parser', () => {
  it('accepts a subject and trimmed text, and refuses the rest', () => {
    expect(parseSessionTopic(undefined)).toEqual({ ok: true, topic: null });
    expect(parseSessionTopic(null)).toEqual({ ok: true, topic: null });
    expect(parseSessionTopic({ subject: 'math', text: '  long   division \u0007 ' })).toEqual({
      ok: true,
      topic: { subject: 'math', text: 'long division' },
    });
    expect(parseSessionTopic({ subject: 'magic', text: 'x' }).ok).toBe(false);
    expect(parseSessionTopic({ subject: 'math', text: '' }).ok).toBe(false);
    expect(parseSessionTopic({ subject: 'math', text: 'x'.repeat(TOPIC_TEXT_MAX + 1) }).ok).toBe(
      false,
    );
    expect(parseSessionTopic('math').ok).toBe(false);
  });
});

describe('a topic session', () => {
  it('has the topic target, the subject skill, and no diagnostic, even for a brand-new learner', async () => {
    const fresh = await setUpLearner(db, 'topic-new@example.com', { brandNew: true });
    const created = await call<CreateSessionResponse>(createSessionRoute, TUTOR_API.session, {
      cookie: fresh.cookie,
      body: {
        mode: 'text',
        topic: { subject: 'social-studies', text: 'Causes of the American Revolution' },
      },
    });
    expect(created.status).toBe(201);
    expect(created.body.session.skillId).toBe('S-social-studies');
    const { rows } = await db.query<{ state: unknown }>(
      `SELECT state FROM sessions WHERE id = $1`,
      [created.body.session.id],
    );
    const state = normalizeState(rows[0]!.state, created.body.band, new Date());
    expect(state.target).toBe('topic');
    expect(state.diagnostic).toBeNull();
    expect(state.topic?.text).toBe('Causes of the American Revolution');
    expect(state.skillsTouched).toEqual(['S-social-studies']);
  });

  it('coursework off the graph still gets a subject skill so checks can be offered', async () => {
    const coursework = await call<CourseworkItemResponse>(
      createCourseworkRoute,
      TUTOR_API.coursework,
      {
        cookie: learner.cookie,
        body: {
          title: 'Essay outline',
          text: 'Write an outline for a five paragraph essay on recycling.',
        },
      },
    );
    expect(coursework.status).toBe(201);
    const created = await call<CreateSessionResponse>(createSessionRoute, TUTOR_API.session, {
      cookie: learner.cookie,
      body: {
        mode: 'text',
        courseworkId: coursework.body.item.id,
        topic: { subject: 'writing', text: 'my essay' },
      },
    });
    expect(created.status).toBe(201);
    expect(created.body.session.courseworkId).toBe(coursework.body.item.id);
    expect(created.body.session.skillId).toBe('S-writing');
  });

  it('refuses a malformed topic', async () => {
    const created = await call(createSessionRoute, TUTOR_API.session, {
      cookie: learner.cookie,
      body: { mode: 'text', topic: { subject: 'math' } },
    });
    expect(created.status).toBe(400);
  });

  it('survives an older state row with no topic field', () => {
    const state = normalizeState({ version: 1, target: 'skill' }, '9-12', new Date());
    expect(state.topic).toBeNull();
    const fresh = initialState({
      band: '9-12',
      target: 'topic',
      startedAt: new Date(),
      skillId: 'S-math',
      diagnostic: null,
      delayedCheck: null,
      topic: { subject: 'math', text: 'fractions' },
    });
    expect(fresh.topic).toEqual({ subject: 'math', text: 'fractions' });
  });
});

describe('the prompt for a topic session', () => {
  function context(overrides: Partial<PromptContext> = {}): PromptContext {
    return {
      band: '9-12',
      phase: 'greet',
      remainingMs: 15 * 60_000,
      target: 'topic',
      topic: { subject: 'science', text: 'Why the moon has phases' },
      level: '6th to 7th grade',
      skill: { id: 'S-science', name: 'Science', estimate: 0.5, status: 'not_started', nItems: 0 },
      prereqs: [],
      openMisconceptions: ['misread'],
      profile: null,
      coursework: null,
      boardLines: [],
      pendingCheck: null,
      lastCheckResult: null,
      checkDue: null,
      diagnostic: null,
      delayedCheck: null,
      coach: { attempts: 0, showMeUnlocked: false, answerShown: false, askedForAnswer: false },
      reteachUsed: [],
      silence: false,
      greet: true,
      wrap: { due: false, softContinueAvailable: false, extended: false },
      learnerTurnsSoFar: 0,
      breakDue: false,
      ...overrides,
    };
  }

  it('names the level, the subject, the learner’s words, and the subject skill for checks', () => {
    const system = buildSystemPrompt(context());
    expect(system).toContain('Learner level: 6th to 7th grade');
    expect(system).toContain('Subject: Science');
    expect(system).toContain('"Why the moon has phases"');
    expect(system).toContain('Subject skill for checks: S-science');
    expect(system).toContain('go straight to it');
    expect(system).not.toContain('Target skill: S-science');
    // The generic re-teach move rides along with the fractions ones.
    expect(system).toContain('misread: misread the question');
  });

  it('carries the subjects section for every band and stays AI-labelled', () => {
    for (const band of ['4-8', '9-12', '13-17', 'adult'] as const) {
      const sections = buildStaticSections(band).join('\n');
      expect(sections).toContain('# Subjects');
      expect(sections).toContain('AI tutor');
      expect(sections).not.toMatch(/[^!]!(?!\[)/);
    }
  });

  it('a fractions session keeps its target-skill line', () => {
    const system = buildSystemPrompt(
      context({
        target: 'skill',
        topic: null,
        level: null,
        skill: {
          id: 'F3',
          name: 'Equivalent fractions',
          estimate: 0.4,
          status: 'in_progress',
          nItems: 2,
        },
      }),
    );
    expect(system).toContain('Target skill: F3 Equivalent fractions');
    expect(system).not.toContain('Learner level');
  });
});

describe('WRAP without a graph skill', () => {
  it('names the learner’s topic instead of "fractions"', () => {
    const summary = fallbackSummary({
      skillsTouched: ['S-science'],
      checks: 2,
      checksCorrect: 1,
      minutes: 12,
      openMisconceptions: [],
      topic: 'why the moon has phases',
    });
    expect(summary.recap).toContain('why the moon has phases');
    expect(summary.recap).not.toContain('fractions');
    const bare = fallbackSummary({
      skillsTouched: [],
      checks: 0,
      checksCorrect: 0,
      minutes: 3,
      openMisconceptions: [],
    });
    expect(bare.recap).toContain('what you brought');
  });
});
