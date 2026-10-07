/**
 * Wire contracts, the subset of KaizenEdu `lib/tutor/wire.ts` (pinned commit
 * 20a971b4…) that the imported closure answers. No HTTP route exists in this
 * repository yet; these are the shapes the check, progress and report
 * boundaries will serialize.
 */
import type {
  CheckResult,
  MisconceptionState,
  ParentReport,
  SkillMastery,
  SkillNode,
} from './contracts';

/** POST check: the learner's answer to a CheckPrompt. */
export interface CheckAnswerRequest {
  sessionId: string;
  checkId: string;
  answer: string | string[] | number;
  latencyMs?: number;
}
export interface CheckAnswerResponse {
  result: CheckResult;
  mastery: SkillMastery | null;
}

/** GET progress. */
export interface ProgressResponse {
  skills: SkillNode[];
  mastery: SkillMastery[];
  misconceptions: MisconceptionState[];
  nextSkill: SkillNode | null;
  dueChecks: Array<{ skillId: string; dueAt: string }>;
  sessions: number;
  minutes: number;
}

/** GET report?learnerId= */
export interface ReportResponse {
  report: ParentReport;
  generatedLabel: string;
}
