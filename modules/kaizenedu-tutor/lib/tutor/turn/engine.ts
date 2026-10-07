/**
 * One tutor turn, start to finish (spec §5.2, §5.3, §5.6, R1, R2, R8, R9).
 *
 * `startTurn` does the refusals a route answers as JSON — an unknown session,
 * an ended one, a malformed body — and otherwise hands back an async generator
 * of `TurnEvent`s that the route encodes as Server-Sent Events. Inside the
 * generator, in order:
 *
 *   1. `phase` (always the first frame; carries the minutes left)
 *   2. the safety pre-filter: a crisis disclosure answers the referral text and
 *      ends the session *without calling the model*; a disallowed request gets
 *      the one-sentence redirect, also without a model call
 *   3. the ceilings: the session budget against the ledger's session total and
 *      the learner's daily cap against today's total. A breach is an `error`
 *      frame (`COST_CEILING` / `DAILY_CAP`) and the session ends
 *   4. the model stream, parsed by `tags.ts`: speech becomes `text_delta` and,
 *      at each sentence boundary, `sentence`; `[[wb …]]` becomes `action` the
 *      moment the tag closes; `[[check …]]` becomes `check` (the answer key
 *      stays in the session state, server-side); `[[hint]]` writes hint
 *      evidence; `[[reaction …]]` becomes `reaction`
 *   5. `usage`, then `done` — or `error` and stop
 *
 * A repeated `clientTurnId` replays the stored tutor text as one `text_delta`
 * and `done`: no second model call, no second charge.
 */
import { COST, STAFF } from '@/kaizen.config';
import { createLogger } from '@/lib/logger';
import { newId } from '@/lib/tutor/auth/session';
import { getEntitlement } from '@/lib/tutor/billing/entitlement';
import { pendingFromBankItem, pendingFromTag, toCheckPrompt } from '@/lib/tutor/checks/prompt';
import type {
  Principal,
  ReactionKind,
  SessionPhase,
  TurnEvent,
  TurnRequest,
  WhiteboardAction,
  SessionTopic,
} from '@/lib/tutor/contracts';
import {
  DailyCap,
  learnerSpentTodayCents,
  SessionBudget,
  sessionSpentCents,
  TUTOR_LLM_SOURCES,
} from '@/lib/tutor/cost';
import type { Queryable } from '@/lib/tutor/db';
import { getBankItem } from '@/lib/tutor/graph/items';
import { isSubjectSkillId, subjectSkillId } from '@/lib/tutor/graph/subjects';
import { writeEvidence } from '@/lib/tutor/model/evidence';
import { touchSkill } from '@/lib/tutor/model/service';
import {
  crisisReferralText,
  pageSafetyEvent,
  redirectText,
  screenLearnerText,
} from '@/lib/tutor/safety';
import {
  loadSession,
  meterMinutes,
  saveSessionState,
  type SessionRecord,
} from '@/lib/tutor/session/service';
import { breakReminderDue } from '@/lib/tutor/session/sitting';
import type { PendingCheckState, SessionState } from '@/lib/tutor/session/state';
import { parseSessionTopic } from '@/lib/tutor/session/topic';
import { beginTurn, endTurn, remainingMs } from '@/lib/tutor/session/state-machine';
import { createSentenceSplitter } from '@/lib/tutor/voice/sentence-splitter';

import {
  applyToBoard,
  boardElementIds,
  createIdFactory,
  validateWhiteboardAction,
} from './actions';
import { buildTurnContext } from './context';
import { tutorStreamLLM } from './llm-call';
import { createTagParser, isTagName, type RawTag } from './tags';

const log = createLogger('tutor-turn');

/**
 * What one turn is assumed to cost before it runs, so a ceiling refuses the
 * call rather than discovering the breach after the provider has billed.
 */
export const TURN_ESTIMATE_CENTS = 2;

/**
 * Per-learner daily ceiling. Four full sessions at the hard per-session
 * ceiling, or the staff cap for an operator's own account — raised so testing
 * does not run out, never removed, so a loop still stops (invariant d).
 */
export function dailyCapCents(env: NodeJS.ProcessEnv = process.env, staff = false): number {
  if (staff) return STAFF.dailyCapCents;
  const raw = Number.parseInt(env.TUTOR_DAILY_CAP_CENTS ?? '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : COST.hardCeilingCentsPerSession * 4;
}

export type TurnRefusalCode = 'NOT_FOUND' | 'SESSION_ENDED' | 'INVALID_REQUEST';

export interface TurnRefusal {
  ok: false;
  code: TurnRefusalCode;
  status: number;
  message: string;
}

export interface TurnStream {
  ok: true;
  events: AsyncGenerator<TurnEvent>;
}

export type StartedTurn = TurnRefusal | TurnStream;

export interface StartTurnInput {
  db: Queryable;
  principal: Principal;
  body: TurnRequest;
  now?: () => Date;
  signal?: AbortSignal;
  /** The public origin, for the link in a safety notice; APP_URL when absent. */
  baseUrl?: string | null;
}

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_LEARNER_CHARS = 4_000;
const REACTIONS: readonly ReactionKind[] = ['smile', 'not_quite', 'neutral'];

interface TurnRowLite extends Record<string, unknown> {
  id: string;
  text: string;
  phase?: SessionPhase;
}

/** Validates the wire body; the session and learner come from the principal. */
export function parseTurnRequest(body: unknown): TurnRequest | null {
  if (!body || typeof body !== 'object') return null;
  const raw = body as Partial<TurnRequest>;
  if (typeof raw.sessionId !== 'string' || !ID.test(raw.sessionId)) return null;
  if (typeof raw.clientTurnId !== 'string' || !ID.test(raw.clientTurnId)) return null;
  if (raw.inputMode !== 'voice' && raw.inputMode !== 'text') return null;
  if (typeof raw.text !== 'string' || raw.text.length > MAX_LEARNER_CHARS) return null;
  return {
    sessionId: raw.sessionId,
    clientTurnId: raw.clientTurnId,
    inputMode: raw.inputMode,
    text: raw.text,
  };
}

export async function startTurn(input: StartTurnInput): Promise<StartedTurn> {
  const body = parseTurnRequest(input.body);
  if (!body) {
    return {
      ok: false,
      code: 'INVALID_REQUEST',
      status: 400,
      message: 'sessionId, clientTurnId, inputMode, and text are required.',
    };
  }
  // Two independent reads, one round trip: the session and the idempotency
  // lookup do not depend on each other, and every serial hop here is time the
  // learner spends waiting for the first word (spec §5.3). The replay query is
  // scoped by `account_id` as well as the session, so running it before the
  // ownership check can never surface another account's row (invariant a).
  const [record, replayRows] = await Promise.all([
    loadSession(input.db, input.principal, body.sessionId),
    input.db.query<TurnRowLite>(
      `SELECT id, text FROM turns
       WHERE account_id = $1 AND session_id = $2 AND client_turn_id = $3 AND role = 'tutor'`,
      [input.principal.accountId, body.sessionId, body.clientTurnId],
    ),
  ]);
  if (!record || !input.principal.learnerId) {
    return { ok: false, code: 'NOT_FOUND', status: 404, message: 'No such session.' };
  }
  if (record.session.phase === 'ended') {
    return { ok: false, code: 'SESSION_ENDED', status: 409, message: 'This session has ended.' };
  }
  if (body.text.trim() === '' && body.inputMode === 'text' && record.session.phase !== 'greet') {
    return { ok: false, code: 'INVALID_REQUEST', status: 400, message: 'Say something first.' };
  }

  const replay = replayRows.rows[0];
  if (replay) {
    return { ok: true, events: replayTurn(record, replay, input.now?.() ?? new Date()) };
  }
  return { ok: true, events: runTurn({ ...input, body }, record) };
}

/** A retried `clientTurnId`: the stored answer, no model call, no new charge. */
async function* replayTurn(
  record: SessionRecord,
  turn: TurnRowLite,
  now: Date,
): AsyncGenerator<TurnEvent> {
  yield {
    type: 'phase',
    phase: record.session.phase,
    remainingMs: remainingMs(record.state, now),
  };
  yield { type: 'text_delta', text: turn.text };
  yield { type: 'done', turnId: turn.id, phase: record.session.phase };
}

interface TurnOutcome {
  text: string;
  reaction: ReactionKind | null;
  /** One entry per `[[hint]]`, holding the skill it was about. */
  hints: string[];
  issuedCheck: boolean;
  actions: number;
  dropped: number;
  /** A `[[topic]]` tag (D36): the subject and words an open session is now about. */
  topic: SessionTopic | null;
}

async function* runTurn(
  input: StartTurnInput & { body: TurnRequest },
  record: SessionRecord,
): AsyncGenerator<TurnEvent> {
  const clock = input.now ?? (() => new Date());
  const now = clock();
  const { db, principal, body } = input;
  const learnerId = principal.learnerId!;
  const { accountId } = principal;
  const sessionId = record.session.id;
  const band = record.band;
  const turnId = newId('trn');
  const scope = { accountId, learnerId, sessionId, turnId };

  // The entitlement and both ledger totals are independent reads and all three
  // sit in front of the model call, so they go out together: three round trips
  // of first-audio budget become one (spec §5.3). The ceiling still binds
  // before the model is called (invariant d) — only the waiting is overlapped.
  const [entitlement, spentSession, spentToday] = await Promise.all([
    getEntitlement(db, accountId),
    sessionSpentCents(db, sessionId),
    learnerSpentTodayCents(db, accountId, learnerId),
  ]);
  const plan = beginTurn(
    record.session.phase,
    {
      text: body.text,
      inputMode: body.inputMode,
      now,
      entitlementMinutes: entitlement.remainingMinutes,
    },
    record.state,
  );
  const state = plan.state;

  yield { type: 'phase', phase: plan.phase, remainingMs: remainingMs(state, now) };

  // --- Safety pre-filter (spec §5.6): both branches skip the model entirely.
  const verdict = screenLearnerText(body.text, band);
  if (verdict.kind === 'crisis') {
    const spoken = crisisReferralText(verdict.category);
    yield* speak(spoken);
    const flagId = await flagCrisis(db, accountId, learnerId, sessionId, verdict.category);
    const ended = await meterMinutes(db, record, now, { settleRemainder: true });
    const crisisState: SessionState = { ...ended.state, crisis: true, pendingCheck: null };
    await writeTurnRows(db, {
      accountId,
      sessionId,
      turnId,
      clientTurnId: body.clientTurnId,
      learnerText: body.text,
      tutorText: spoken,
      latencyMs: 0,
      model: null,
      cents: 0,
      now,
    });
    await writeEvidence(db, {
      accountId,
      learnerId,
      sessionId,
      type: 'observation',
      assisted: false,
      payload: { kind: 'crisis_referral', category: verdict.category, turnId },
    });
    await saveSessionState(db, sessionId, 'ended', crisisState, { endedAt: now });
    log.warn(`crisis referral session=${sessionId} learner=${learnerId} turn=${turnId}`);
    // After the row and the ended state are safe, and before the stream closes:
    // a person is told (docs/SAFETY-RUNBOOK.md). Never throws.
    await pageSafetyEvent(
      db,
      {
        flagId,
        accountId,
        learnerId,
        sessionId,
        category: verdict.category,
        severity: 'critical',
        source: 'screen',
        at: now,
      },
      { baseUrl: input.baseUrl ?? null },
    );
    yield { type: 'usage', turnId, cents: 0, sessionCents: record.session.costCents };
    yield { type: 'done', turnId, phase: 'ended' };
    return;
  }
  if (verdict.kind === 'redirect') {
    const spoken = redirectText(verdict.category, band);
    yield* speak(spoken);
    await writeTurnRows(db, {
      accountId,
      sessionId,
      turnId,
      clientTurnId: body.clientTurnId,
      learnerText: body.text,
      tutorText: spoken,
      latencyMs: 0,
      model: null,
      cents: 0,
      now,
    });
    await writeEvidence(db, {
      accountId,
      learnerId,
      sessionId,
      type: 'observation',
      assisted: false,
      payload: { kind: 'redirect', category: verdict.category, turnId },
    });
    const phase = plan.phaseAfterTurn;
    await saveSessionState(db, sessionId, phase, state);
    yield { type: 'usage', turnId, cents: 0, sessionCents: record.session.costCents };
    yield { type: 'done', turnId, phase };
    return;
  }

  // --- Ceilings (invariant d; spec R9). Checked before every model call.
  const breach = ceilingBreach(spentSession, spentToday, learnerId, principal.staff);
  if (breach) {
    const ended = await meterMinutes(db, record, now, { settleRemainder: true });
    await saveSessionState(db, sessionId, 'ended', ended.state, { endedAt: now });
    log.warn(`${breach.code} session=${sessionId} learner=${learnerId} spent=${spentSession}`);
    yield { type: 'error', code: breach.code, message: breach.message };
    return;
  }

  // --- The sitting clock (reference §5, SB 243): the reminder belongs to the
  // one turn that crosses a three-hour boundary, and the boundary is recorded
  // before the model is asked so a failed turn does not owe it twice.
  let breakDue = false;
  if (state.sitting) {
    const reminder = breakReminderDue(state.sitting, now.getTime());
    if (reminder.due) {
      breakDue = true;
      state.sitting = { ...state.sitting, remindersGiven: reminder.boundary };
    }
  }

  // --- The model turn.
  const learnerText = modelInput(body.text, plan.greet, plan.silence);
  const context = await buildTurnContext(
    {
      db,
      accountId,
      learnerId,
      band,
      sessionId,
      courseworkId: record.session.courseworkId,
      skillId: record.session.skillId,
      level: record.level,
      phase: plan.phase,
      state,
      remainingMs: remainingMs(state, now),
      greet: plan.greet,
      silence: plan.silence,
      wrapDue: plan.wrapDue,
      softContinueAvailable: plan.softContinueAvailable,
      checkDue: plan.checkDue,
      breakDue,
    },
    learnerText,
  );

  const outcome: TurnOutcome = {
    text: '',
    reaction: null,
    hints: [],
    issuedCheck: false,
    actions: 0,
    dropped: 0,
    topic: null,
  };
  const splitter = createSentenceSplitter();
  const parser = createTagParser();
  const ids = createIdFactory(turnId.replace(/^trn_/, ''));
  let board: WhiteboardAction[] = [...state.board];
  let sentenceIndex = 0;
  let firstDeltaAt: number | null = null;
  let cents = 0;
  let failed: { code: string; message: string } | null = null;

  const stream = await tutorStreamLLM({
    db,
    scope,
    source: TUTOR_LLM_SOURCES.liveTurn,
    band,
    system: context.system,
    messages: context.messages,
    ...(input.signal ? { abortSignal: input.signal } : {}),
  });
  const modelString = stream.modelString;

  /** One closed tag becomes zero or one frame; anything malformed is a drop. */
  const applyTag = async (tag: RawTag): Promise<TurnEvent[]> => {
    if (!isTagName(tag.name)) {
      outcome.dropped += 1;
      return [];
    }
    if (tag.name === 'hint') {
      outcome.hints.push(context.skillId ?? record.session.skillId ?? 'unknown');
      state.hints += 1;
      if (state.coach.showMeUnlocked) state.coach = { ...state.coach, answerShown: true };
      return [];
    }
    if (tag.name === 'reaction') {
      const kind = tag.body.replace(/["'{}]/g, '').trim();
      if (!(REACTIONS as readonly string[]).includes(kind) || outcome.reaction !== null) {
        outcome.dropped += 1;
        return [];
      }
      outcome.reaction = kind as ReactionKind;
      return [{ type: 'reaction', kind: outcome.reaction }];
    }
    const payload = parseJson(tag.body);
    if (payload === undefined) {
      outcome.dropped += 1;
      return [];
    }
    if (tag.name === 'topic') {
      // An open session learns what it is about (D36): once per turn, only
      // while the session is a topic session, and validated like a request.
      const parsed = parseSessionTopic(payload);
      if (!parsed.ok || !parsed.topic || outcome.topic || state.target !== 'topic') {
        outcome.dropped += 1;
        return [];
      }
      outcome.topic = parsed.topic;
      state.topic = parsed.topic;
      return [];
    }
    if (tag.name === 'wb') {
      const validated = validateWhiteboardAction(payload, ids, boardElementIds(board));
      if (!validated.ok) {
        outcome.dropped += 1;
        log.debug(`dropped action turn=${turnId}: ${validated.reason}`);
        return [];
      }
      board = applyToBoard(board, validated.action);
      outcome.actions += 1;
      return [{ type: 'action', action: validated.action }];
    }
    // A check: one per turn, and its answer key never leaves the server.
    if (outcome.issuedCheck || state.pendingCheck) {
      outcome.dropped += 1;
      return [];
    }
    const diagnostic = Boolean(state.diagnostic && !state.diagnostic.done);
    const parsed = pendingFromTag(payload, {
      skillId: context.skillId,
      diagnostic,
      issuedTurnId: turnId,
      now,
    });
    if (!parsed.ok) {
      outcome.dropped += 1;
      log.debug(`dropped check turn=${turnId}: ${parsed.reason}`);
      return [];
    }
    let pending: PendingCheckState;
    if ('itemId' in parsed) {
      const item = await getBankItem(db, parsed.itemId);
      if (!item) {
        outcome.dropped += 1;
        return [];
      }
      pending = pendingFromBankItem(item, { diagnostic, issuedTurnId: turnId, now });
    } else {
      pending = parsed.pending;
    }
    state.pendingCheck = pending;
    outcome.issuedCheck = true;
    return [{ type: 'check', check: toCheckPrompt(pending) }];
  };

  /** One stream chunk (or `null` for end of stream) becomes ordered frames. */
  const handle = async (chunk: string | null): Promise<TurnEvent[]> => {
    const frames: TurnEvent[] = [];
    for (const event of chunk === null ? parser.flush() : parser.push(chunk)) {
      if (event.kind === 'text') {
        if (firstDeltaAt === null) firstDeltaAt = Date.now();
        outcome.text += event.text;
        frames.push({ type: 'text_delta', text: event.text });
        for (const sentence of splitter.push(event.text)) {
          frames.push({ type: 'sentence', index: sentenceIndex++, text: sentence });
        }
        continue;
      }
      frames.push(...(await applyTag(event.tag)));
    }
    if (chunk === null) {
      for (const sentence of splitter.flush()) {
        frames.push({ type: 'sentence', index: sentenceIndex++, text: sentence });
      }
    }
    return frames;
  };

  try {
    for await (const chunk of stream.textStream) {
      for (const frame of await handle(chunk)) yield frame;
    }
    for (const frame of await handle(null)) yield frame;
  } catch (error) {
    failed = {
      code: 'UPSTREAM_ERROR',
      message: 'The tutor could not answer that one. Try again.',
    };
    // The name alone hid a day of 429s and a wrong base URL behind
    // "AI_APICallError"; the status and the first line of the message are
    // ids and vendor text, never the learner's words.
    log.error(
      `turn stream failed session=${sessionId} turn=${turnId}: ${describeModelError(error)}`,
    );
  } finally {
    const settled = await stream.settle().catch(() => ({ cents: 0 }));
    cents = settled.cents;
  }

  if (parser.abandoned > 0) {
    // An unterminated tag: almost always the output cap cutting a payload in
    // half. Worth a line, because the learner saw the words and no drawing.
    log.warn(`turn ${turnId} dropped ${parser.abandoned} unterminated tag(s)`);
  }
  outcome.dropped += parser.abandoned;
  const finishedAt = clock();
  const latencyMs = firstDeltaAt === null ? null : Math.max(0, firstDeltaAt - now.getTime());

  state.board = board;
  state.droppedActions += outcome.dropped;
  if (context.skillId && !state.skillsTouched.includes(context.skillId)) {
    state.skillsTouched = [...state.skillsTouched, context.skillId];
  }
  // A topic tag moves the session's skill to the named subject's, so the
  // checks from here on land on the right row; a graph skill is never moved.
  const sessionSkillId =
    outcome.topic && (!context.skillId || isSubjectSkillId(context.skillId))
      ? subjectSkillId(outcome.topic.subject)
      : context.skillId;
  if (sessionSkillId && !state.skillsTouched.includes(sessionSkillId)) {
    state.skillsTouched = [...state.skillsTouched, sessionSkillId];
  }
  const phase = endTurn(plan, outcome.issuedCheck, finishedAt);

  await writeTurnRows(db, {
    accountId,
    sessionId,
    turnId,
    // A failed turn must not claim the id: the client retries with the same
    // `clientTurnId`, and a stored row would replay the failure instead of
    // trying the model again.
    clientTurnId: failed ? null : body.clientTurnId,
    learnerText: body.text,
    tutorText: outcome.text,
    latencyMs,
    model: modelString,
    cents,
    now,
  });
  for (const skillId of outcome.hints) {
    await writeEvidence(db, {
      accountId,
      learnerId,
      sessionId,
      type: 'hint',
      assisted: true,
      payload: { skillId, turnId, phase },
    });
  }
  await writeEvidence(db, {
    accountId,
    learnerId,
    sessionId,
    type: 'turn',
    assisted: outcome.hints.length > 0,
    payload: {
      turnId,
      phase,
      inputMode: body.inputMode,
      skillId: context.skillId,
      hints: outcome.hints.length,
      actions: outcome.actions,
      droppedActions: outcome.dropped,
      issuedCheck: outcome.issuedCheck,
      reaction: outcome.reaction,
      latencyMs,
      cents,
      silence: plan.silence,
    },
  });
  if (context.skillId) await touchSkill(db, accountId, learnerId, context.skillId, finishedAt);
  await saveSessionState(db, sessionId, phase, state, {
    skillId: sessionSkillId,
    costCentsDelta: cents,
  });

  if (failed) {
    yield { type: 'error', code: failed.code, message: failed.message };
    return;
  }
  yield {
    type: 'usage',
    turnId,
    cents,
    sessionCents: record.session.costCents + cents,
  };
  yield { type: 'done', turnId, phase };
}

/** Text the server speaks itself (safety paths): one delta plus its sentences. */
function* speak(text: string): Generator<TurnEvent> {
  yield { type: 'text_delta', text };
  const splitter = createSentenceSplitter();
  let index = 0;
  for (const sentence of [...splitter.push(text), ...splitter.flush()]) {
    yield { type: 'sentence', index: index++, text: sentence };
  }
}

function parseJson(body: string): unknown {
  if (!body) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

/** One line for the log: the error's name, HTTP status when it has one, and the start of its message. */
function describeModelError(error: unknown): string {
  if (!(error instanceof Error)) return 'error';
  const status = (error as { statusCode?: unknown }).statusCode;
  const cause = (error as { cause?: unknown }).cause;
  const causeText =
    cause instanceof Error ? ` cause=${cause.name}: ${cause.message.slice(0, 120)}` : '';
  return `${error.name}${typeof status === 'number' ? ` status=${status}` : ''} ${error.message
    .split('\n')[0]!
    .slice(0, 200)}${causeText}`;
}

/** What the model is told the learner said; silence and the greeting are markers. */
function modelInput(text: string, greet: boolean, silence: boolean): string {
  const trimmed = text.trim();
  if (trimmed) return trimmed;
  if (greet) return '(the learner just joined the session and has not spoken yet)';
  if (silence) return '(the learner has gone quiet for a while)';
  return '(no answer)';
}

function ceilingBreach(
  spentSession: number,
  spentToday: number,
  learnerId: string,
  staff = false,
): { code: 'COST_CEILING' | 'DAILY_CAP'; message: string } | null {
  const budget = new SessionBudget(staff ? { ceilingCents: STAFF.sessionCeilingCents } : {});
  let over = false;
  try {
    if (spentSession > 0) {
      budget.record({ kind: 'llm', cents: spentSession, label: TUTOR_LLM_SOURCES.liveTurn });
    }
  } catch {
    over = true;
  }
  if (over || !budget.canSpend(TURN_ESTIMATE_CENTS)) {
    return {
      code: 'COST_CEILING',
      message: 'This session has reached its cost limit. Start a new session to keep going.',
    };
  }
  const cap = new DailyCap({ capCents: dailyCapCents(process.env, staff) });
  cap.seed(learnerId, spentToday);
  if (!cap.canSpend(learnerId, TURN_ESTIMATE_CENTS)) {
    return {
      code: 'DAILY_CAP',
      message: "That's all the tutoring for today. Come back tomorrow.",
    };
  }
  return null;
}

interface TurnRowsInput {
  accountId: string;
  sessionId: string;
  turnId: string;
  /** Null when the turn failed, so a retry is a retry and not a replay. */
  clientTurnId: string | null;
  learnerText: string;
  tutorText: string;
  latencyMs: number | null;
  model: string | null;
  cents: number;
  now: Date;
}

/**
 * The learner's turn (when they said anything) and the tutor's. The tutor row
 * carries `client_turn_id`, so a retry finds it and replays instead of paying
 * for a second call; a racing duplicate insert is ignored.
 */
async function writeTurnRows(db: Queryable, input: TurnRowsInput): Promise<void> {
  const learnerText = input.learnerText.trim();
  if (learnerText) {
    await db.query(
      `INSERT INTO turns (id, account_id, session_id, role, text, ts) VALUES ($1, $2, $3, 'learner', $4, $5)`,
      [newId('trn'), input.accountId, input.sessionId, learnerText, input.now.toISOString()],
    );
  }
  // An empty tutor turn is only ever a failure; keeping it would put a blank
  // bubble in the transcript and in the next turn's context.
  if (!input.tutorText.trim() && input.clientTurnId === null) return;
  try {
    await db.query(
      `INSERT INTO turns (id, account_id, session_id, role, text, latency_ms, model, cost_cents, client_turn_id, ts)
       VALUES ($1, $2, $3, 'tutor', $4, $5, $6, $7, $8, $9)`,
      [
        input.turnId,
        input.accountId,
        input.sessionId,
        input.tutorText,
        input.latencyMs,
        input.model,
        Math.max(0, Math.round(input.cents)),
        input.clientTurnId,
        new Date(input.now.getTime() + 1).toISOString(),
      ],
    );
  } catch (error) {
    // The unique (session_id, client_turn_id) index rejected a racing retry;
    // the answer is already stored, so there is nothing to do.
    log.warn(
      `turn row not written session=${input.sessionId} turn=${input.turnId}: ${
        error instanceof Error ? error.name : 'error'
      }`,
    );
  }
}

async function flagCrisis(
  db: Queryable,
  accountId: string,
  learnerId: string,
  sessionId: string,
  category: string,
): Promise<string> {
  const flagId = newId('flg');
  await db.query(
    `INSERT INTO flags (id, account_id, learner_id, session_id, kind, note) VALUES ($1, $2, $3, $4, 'unsafe', $5)`,
    [flagId, accountId, learnerId, sessionId, `crisis:${category}`],
  );
  return flagId;
}
