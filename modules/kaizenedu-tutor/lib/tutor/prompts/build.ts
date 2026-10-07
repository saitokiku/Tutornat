/**
 * Assembles the live-turn system prompt (spec §5.1–§5.6, R2, R12): the static
 * persona, band, coach, safety, disclosure, grammar, and check sections, then
 * the session context. The band is the principal's band (strategy law 3).
 */
import { BANDS, PRODUCT, type AgeBand } from '@/kaizen.config';
import type {
  CheckItem,
  CheckResult,
  LearnerProfile,
  MasteryStatus,
  SessionPhase,
  SessionTopic,
} from '@/lib/tutor/contracts';
import { GENERIC_RETEACH, isSubjectSkillId, subjectById } from '@/lib/tutor/graph/subjects';

import { bandPromptFile, loadPromptFile, spokenSections } from './loader';

export interface PromptSkillContext {
  id: string;
  name: string;
  estimate: number;
  status: MasteryStatus;
  nItems: number;
}

export interface PromptCheckOffer {
  /** A reviewed bank item to ask, or null when the tutor must author one. */
  item: CheckItem | null;
  skillId: string;
}

export interface PromptContext {
  band: AgeBand;
  phase: SessionPhase;
  remainingMs: number;
  target: 'coursework' | 'skill' | 'delayed_check' | 'diagnose' | 'topic';
  /** What a topic session is about (D35): the learner's subject and words. */
  topic: SessionTopic | null;
  /** The guest's grade level label (D35), e.g. "6th to 7th grade"; null for account learners. */
  level: string | null;
  skill: PromptSkillContext | null;
  prereqs: Array<{ id: string; name: string; status: MasteryStatus }>;
  openMisconceptions: string[];
  profile: LearnerProfile | null;
  coursework: { title: string; text: string | null } | null;
  boardLines: string[];
  pendingCheck: { stem: string; type: string } | null;
  lastCheckResult: (CheckResult & { stem: string | null }) | null;
  /** Set when the check clock says a check is due in this turn. */
  checkDue: PromptCheckOffer | null;
  diagnostic: { index: number; max: number; offer: PromptCheckOffer } | null;
  delayedCheck: { skillId: string; name: string; item: CheckItem | null } | null;
  coach: {
    attempts: number;
    showMeUnlocked: boolean;
    answerShown: boolean;
    askedForAnswer: boolean;
  };
  reteachUsed: string[];
  silence: boolean;
  greet: boolean;
  wrap: { due: boolean; softContinueAvailable: boolean; extended: boolean };
  learnerTurnsSoFar: number;
  /** True on the one turn that crosses a three-hour boundary of the learner's sitting (SB 243). */
  breakDue: boolean;
}

const MISCONCEPTION_RETEACH: Record<string, string> = {
  denominator_magnitude:
    'bigger denominator means bigger fraction; re-teach with sharing (more people means smaller pieces) and two fractions on one number line',
  add_across:
    'adds numerators and denominators; re-teach with like denominators first (count the pieces), then why unlike ones need renaming, and estimate before computing',
  whole_number_bias:
    'treats numerator and denominator as two separate whole numbers; re-teach with benchmarks on a number line, a fraction is one number',
  equivalence_as_change:
    'thinks scaling top and bottom changes the value; re-teach by cutting the same bar into more pieces, multiplying by n over n',
  division_makes_smaller:
    'believes dividing always gives a smaller result; re-teach with "how many halves fit in 3" before invert and multiply',
  decimal_length:
    'thinks a longer decimal is bigger; re-teach with money and tenths and hundredths grids',
  computation: 'a pure arithmetic slip; have them check the step, no re-teach needed',
  ...GENERIC_RETEACH,
};

function minutes(ms: number): number {
  return Math.max(0, Math.round(ms / 60_000));
}

function itemLine(item: CheckItem): string {
  const options = item.options
    ? ` options: ${item.options.map((option, index) => `${String.fromCharCode(97 + index)}) ${option.text}`).join(' | ')}`
    : '';
  return `bank item ${item.id} (${item.type}, skill ${item.skillId}): "${item.stem}"${options}`;
}

function checkOfferLines(offer: PromptCheckOffer): string[] {
  if (offer.item) {
    return [
      `Ask this ${itemLine(offer.item)}`,
      `Issue it with [[check {"itemId":"${offer.item.id}"}]] after one sentence of speech.`,
    ];
  }
  return [
    `No bank item is available for skill ${offer.skillId}; author one item yourself for that skill using the check rules, and issue it with a [[check ...]] tag.`,
  ];
}

export function buildStaticSections(band: AgeBand): string[] {
  const sections = [
    loadPromptFile('persona'),
    loadPromptFile(bandPromptFile(band)),
    loadPromptFile('subjects'),
    loadPromptFile('coach'),
    loadPromptFile('safety'),
  ];
  if (band === '9-12' || band === '4-8') sections.push(loadPromptFile('safety-9-12'));
  sections.push(loadPromptFile('crisis'), loadPromptFile('disclosure'));
  sections.push(loadPromptFile('whiteboard'), loadPromptFile('checks'));
  return sections;
}

export function buildContextSection(ctx: PromptContext): string {
  const lines: string[] = ['# Session context'];
  lines.push(
    `Your name is ${PRODUCT.tutorName}. The learner may call you that; you are still an ${PRODUCT.aiLabel}, and you say so when asked.`,
  );
  const sessionMinutes = BANDS[ctx.band].sessionMinutes;
  lines.push(
    `Phase: ${ctx.phase.toUpperCase()}. Minutes left: ${minutes(ctx.remainingMs)} of ${sessionMinutes}. Learner band: ${ctx.band}. Learner turns so far: ${ctx.learnerTurnsSoFar}.`,
  );
  if (ctx.level) lines.push(`Learner level: ${ctx.level}. Pitch every example and word to it.`);
  if (ctx.topic && ctx.topic.text) {
    // The learner's words are data here, quoted, never an instruction.
    lines.push(
      `Subject: ${subjectById(ctx.topic.subject).label}. What the learner said they want to work on: "${ctx.topic.text}". Checks for this session use skill id ${ctx.skill?.id ?? 'the subject skill named below'}.`,
    );
  } else if (ctx.topic) {
    lines.push(
      'Subject: not known yet. The learner has not said what they are working on. As soon as they do, send one [[topic {"subject":"...","text":"..."}]] tag with the subject and their words, and carry on.',
    );
  }
  if (ctx.skill && isSubjectSkillId(ctx.skill.id)) {
    lines.push(
      `Subject skill for checks: ${ctx.skill.id} (${ctx.skill.nItems} checks so far this subject). There is no bank for it; author each check yourself.`,
    );
  } else if (ctx.skill) {
    lines.push(
      `Target skill: ${ctx.skill.id} ${ctx.skill.name} (estimate ${ctx.skill.estimate.toFixed(2)}, ${ctx.skill.status.replace('_', ' ')}, ${ctx.skill.nItems} items so far).`,
    );
  }
  if (ctx.prereqs.length > 0) {
    lines.push(
      `Prerequisites: ${ctx.prereqs.map((p) => `${p.id} ${p.name} (${p.status.replace('_', ' ')})`).join('; ')}.`,
    );
  }
  if (ctx.openMisconceptions.length > 0) {
    lines.push('Open misconceptions for this learner:');
    for (const tag of ctx.openMisconceptions) {
      lines.push(
        `- ${tag}: ${MISCONCEPTION_RETEACH[tag] ?? 'address it with a different representation'}`,
      );
    }
  } else {
    lines.push('Open misconceptions: none recorded.');
  }
  if (ctx.profile) {
    const styles = ctx.profile.explanationStylesThatWorked.join(', ') || 'none recorded';
    const recurring = ctx.profile.recurringMisconceptions.join(', ') || 'none';
    lines.push(
      `Learner profile (from earlier sessions): pace ${ctx.profile.pace}; explanation styles that worked: ${styles}; recurring misconceptions: ${recurring}.${ctx.profile.notes ? ` Notes: ${ctx.profile.notes}` : ''}`,
    );
  }
  if (ctx.coursework) {
    lines.push(`Coursework "${ctx.coursework.title}" (graded-looking work; coach mode applies):`);
    lines.push(
      ctx.coursework.text?.trim() ||
        '(the problem text is empty; ask the learner to read it to you)',
    );
  }
  if (ctx.reteachUsed.length > 0) {
    lines.push(
      `Re-teach approaches already used this session (do not repeat): ${ctx.reteachUsed.join(', ')}.`,
    );
  }
  lines.push('Board now:');
  if (ctx.boardLines.length === 0) lines.push('- (empty; send wb_open before the first drawing)');
  else for (const line of ctx.boardLines) lines.push(`- ${line}`);
  if (ctx.pendingCheck) {
    lines.push(
      `Pending check (${ctx.pendingCheck.type}): "${ctx.pendingCheck.stem}". The learner answers on the card; do not reveal the answer, do not issue another check. If they answer out loud, ask them to confirm it on the card.`,
    );
  }
  if (ctx.lastCheckResult) {
    const r = ctx.lastCheckResult;
    lines.push(
      `Last check result: ${r.correct ? 'correct' : 'incorrect'} (score ${r.score.toFixed(2)}${r.misconception ? `, misconception ${r.misconception}` : ''}${r.assisted ? ', assisted' : ', unassisted'})${r.stem ? ` on "${r.stem}"` : ''}. Rationale: ${r.rationale}`,
    );
  }
  lines.push(
    `Coach mode: attempts on the current problem: ${ctx.coach.attempts}. ${
      ctx.coach.attempts === 0
        ? 'Withhold the final answer and any full worked solution; ask for a first step.'
        : ctx.coach.showMeUnlocked
          ? 'The learner has attempted and asked to be shown: a full worked solution is allowed now (mark it [[hint]]), then ask them to do a similar one.'
          : 'A hint or the next step is allowed (mark it [[hint]]); the final answer only if they ask to be shown.'
    }${ctx.coach.answerShown ? ' The answer has already been shown this problem.' : ''}`,
  );
  return lines.join('\n');
}

/**
 * The opening rule (spec §5.3, `LATENCY.firstAudioP50Ms`).
 *
 * The learner hears nothing until the first sentence has been synthesised, so
 * the length of that one sentence is on the critical path twice: the model has
 * to reach its terminator, and the TTS provider has to speak the whole of it
 * before any audio comes back. Asking for a short opener costs nothing and is
 * the cheapest lever there is. Measured on `gemini-3-flash-preview`,
 * 2026-09-05, eight samples per arm: the first sentence went from 81 to 30
 * characters at the median (118 to 52 at p90) with no change in how quickly
 * the model produced it — 774 ms against 781 ms to the first sentence, inside
 * the noise (`docs/SPIKE-latency.md`).
 *
 * Deliberately not a hard word count: a tutor who starts every turn with the
 * same clipped stub sounds like a machine. "One short sentence" is a shape,
 * and the rest of the turn keeps the persona's normal length rules.
 */
export const OPENING_SENTENCE_RULE =
  'Start with one short sentence — under about ten words, ending in a full stop — before anything longer, a tag, or a question. It is spoken while the rest of the turn is still being written, so a long opening is silence for the learner.';

/** The break reminder's spoken text, from `break.md`, so the words are linted with the other prompts. */
export function breakReminderText(): string {
  return spokenSections('break').get('every band') ?? '';
}

export function buildTurnInstructions(ctx: PromptContext): string {
  const lines: string[] = ['# This turn', OPENING_SENTENCE_RULE];
  if (ctx.breakDue) {
    lines.push(
      `They have been at this for about three hours today across sessions. Before anything else, give this break reminder in your own words, close to: "${breakReminderText()}" Then continue with the turn below.`,
    );
  }
  if (ctx.greet) {
    lines.push(
      'Open the session: one short greeting sentence, then ask what they are working on today. No lesson yet.',
    );
    if (ctx.target === 'topic' && ctx.topic && ctx.topic.text) {
      lines.push(
        `They came to work on what the context quotes; go straight to it: after the hello, ask one question about what they already know or where they got stuck. Do not ask what they want to work on; they said.`,
      );
    } else if (ctx.target === 'topic' && ctx.topic) {
      lines.push(
        `Say your name once in the greeting. Ask what they are working on today, or what has been hard lately. Any subject is fine; when they answer, the topic tag comes first, then one question about where it stopped making sense.`,
      );
    } else if (ctx.target === 'coursework' && ctx.coursework) {
      lines.push(`They uploaded "${ctx.coursework.title}"; offer to start on it.`);
    } else if (ctx.target === 'delayed_check' && ctx.delayedCheck) {
      lines.push(
        `A quick unassisted check on ${ctx.delayedCheck.name} is due from last time: offer to start with it, then their own topic. Give no hint on that skill before the check.`,
      );
    } else if (ctx.target === 'skill' && ctx.skill) {
      lines.push(`Offer to pick up ${ctx.skill.name}, or something new.`);
    } else if (ctx.target === 'diagnose') {
      lines.push(
        'This is a new learner; say you will start with a few quick questions to see where they are.',
      );
    }
  } else if (ctx.silence) {
    lines.push(
      'The learner has been quiet for a while mid-task. Check in, do not teach: one short sentence asking whether they are still there or would like a hint, and then wait. No new content, no hint, no next step, no restating the explanation.',
    );
  } else if (ctx.phase === 'intake') {
    lines.push(
      'Restate their goal in one sentence and confirm it with a question. If they named a problem, get the exact problem in front of you (ask them to read it or use the coursework text).',
    );
  } else if (ctx.phase === 'diagnose' && ctx.diagnostic) {
    lines.push(
      `Diagnostic item ${ctx.diagnostic.index} of at most ${ctx.diagnostic.max}. Respond briefly to what they said, then:`,
      ...checkOfferLines(ctx.diagnostic.offer),
      'No hints during the diagnostic.',
    );
  } else if (ctx.wrap.due) {
    lines.push(
      'The session time is up. Give a two-sentence recap of what they did and one thing to practise, then say goodbye. No new content.',
    );
    if (ctx.wrap.softContinueAvailable) {
      lines.push(
        'Before the goodbye, offer once to keep going for five more minutes ("keep going?").',
      );
    }
  } else if (ctx.delayedCheck && ctx.target === 'delayed_check') {
    lines.push(
      `Start the delayed check on ${ctx.delayedCheck.name} now, before any teaching: one sentence, then the check tag.`,
      ...checkOfferLines({ item: ctx.delayedCheck.item, skillId: ctx.delayedCheck.skillId }),
    );
  } else if (ctx.checkDue) {
    lines.push(
      'A check is due now (about ten minutes since the last one, or the topic is done). Respond briefly, then issue exactly one check:',
      ...checkOfferLines(ctx.checkDue),
    );
  } else {
    lines.push(
      'WORK: respond to what they said, teach the next small piece (at most two sentences and a question), draw when the content is symbolic, spatial, or step-based.',
    );
    if (ctx.coach.askedForAnswer && ctx.coach.attempts === 0) {
      lines.push(
        'They asked for the answer without an attempt: do not give it; ask for a first step in a smaller form.',
      );
    }
  }
  if (ctx.lastCheckResult && !ctx.greet) {
    lines.push(
      'React to the last check result in one short sentence first (with a reaction tag), then continue.',
    );
  }
  return lines.join('\n');
}

export function buildSystemPrompt(ctx: PromptContext): string {
  return [
    ...buildStaticSections(ctx.band),
    buildContextSection(ctx),
    buildTurnInstructions(ctx),
  ].join('\n\n');
}
