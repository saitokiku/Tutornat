// The honest record: server-derived, read through the report capability.
// Practised = corrections-practice rows (assisted work, counted as progress, never mastery).
// Proven = qualifying evidence rows (none can exist from this app: only the assessment
// service may append qualifying evidence, and web/ has no assessment connection).
import { reportPool, dbConfigured } from "./db";
import { LEARNER, RULE_VERSION, SKILL } from "./lesson";

export type SkillRecord = {
  learnerId: string;
  learnerName: string;
  skillId: string;
  skillLabel: string;
  practised: number; // corrections-practice events
  cleanReps: number; // correct, unassisted practice reps (count toward quiet-window priority)
  helped: number; // assisted-help exposures
  proven: number; // qualifying evidence events (unassisted, delayed)
  certification: string; // always "none" from the seam today
  lastHelpAt: string | null;
  eligibleAt: string | null; // lastHelpAt + delayHours
  eligibleNow: boolean;
  delayHours: number;
  quietWindowReps: number;
  offerOpen: boolean;
  ruleVersion: string;
  source: "seam" | "unconfigured";
};

export const RECORD_SQL = `
WITH p AS (SELECT parameters FROM e2.rule_versions WHERE id=$3),
g AS (SELECT last_exposure_at FROM e2.skill_guards WHERE learner_id=$1 AND skill_id=$2),
ev AS (SELECT
  count(*) FILTER (WHERE class='corrections-practice') AS practised,
  count(*) FILTER (WHERE class='corrections-practice' AND payload->'correct'='true'::jsonb AND (NOT payload ? 'assisted' OR payload->'assisted'='false'::jsonb)) AS clean_reps,
  count(*) FILTER (WHERE qualifying) AS proven
  FROM e2.evidence_events WHERE learner_id=$1 AND skill_id=$2),
ex AS (SELECT count(*) AS helped FROM e2.exposure_events WHERE learner_id=$1 AND $2=ANY(skill_ids)),
pr AS (SELECT certification FROM e2.report_projection WHERE learner_id=$1 AND skill_id=$2),
o AS (SELECT bool_or(open) AS offer_open FROM e2.assessment_offers WHERE learner_id=$1 AND skill_id=$2)
SELECT jsonb_build_object(
  'practised',(SELECT practised FROM ev),'cleanReps',(SELECT clean_reps FROM ev),'proven',(SELECT proven FROM ev),
  'helped',(SELECT helped FROM ex),
  'certification',coalesce((SELECT certification FROM pr),'none'),
  'lastHelpAt',(SELECT last_exposure_at FROM g),
  'delayHours',coalesce((SELECT (parameters->>'delayHours')::numeric FROM p),48),
  'quietWindowReps',coalesce((SELECT (parameters->>'quietWindowReps')::numeric FROM p),10),
  'eligibleAt',(SELECT last_exposure_at + coalesce((SELECT (parameters->>'delayHours')::numeric FROM p),48)*interval '1 hour' FROM g),
  'eligibleNow',coalesce((SELECT now() >= last_exposure_at + coalesce((SELECT (parameters->>'delayHours')::numeric FROM p),48)*interval '1 hour' FROM g),true),
  'offerOpen',coalesce((SELECT offer_open FROM o),false)
) AS value`;

export async function readRecord(): Promise<SkillRecord> {
  const base = {
    learnerId: LEARNER.id, learnerName: LEARNER.name, skillId: SKILL.id, skillLabel: SKILL.label, ruleVersion: RULE_VERSION,
  };
  if (!dbConfigured()) {
    return { ...base, practised: 0, cleanReps: 0, helped: 0, proven: 0, certification: "none", lastHelpAt: null,
      eligibleAt: null, eligibleNow: true, delayHours: 48, quietWindowReps: 10, offerOpen: false, source: "unconfigured" };
  }
  const r = await reportPool().query(RECORD_SQL, [LEARNER.id, SKILL.id, RULE_VERSION]);
  const v = r.rows[0]?.value ?? {};
  return {
    ...base,
    practised: Number(v.practised ?? 0), cleanReps: Number(v.cleanReps ?? 0), helped: Number(v.helped ?? 0), proven: Number(v.proven ?? 0),
    certification: String(v.certification ?? "none"),
    lastHelpAt: v.lastHelpAt ?? null, eligibleAt: v.eligibleAt ?? null, eligibleNow: Boolean(v.eligibleNow),
    delayHours: Number(v.delayHours ?? 48), quietWindowReps: Number(v.quietWindowReps ?? 10), offerOpen: Boolean(v.offerOpen),
    source: "seam",
  };
}

// Plain words a parent understands. Nothing here claims mastery or certification.
export function honestAnswer(r: SkillRecord): string {
  if (r.proven > 0) return `The record shows ${r.proven} unassisted check(s) on this skill. Certification is "${r.certification}" under rule ${r.ruleVersion}.`;
  const practice = r.practised === 0 ? "no practice yet" : `${r.practised} practice turn(s), ${r.cleanReps} clean`;
  const clock = r.lastHelpAt
    ? r.eligibleNow
      ? "The quiet window has passed, so an independent check can be offered."
      : `Trellis last helped on it at ${r.lastHelpAt}; an independent check is possible from ${r.eligibleAt} (${r.delayHours} h later).`
    : "Trellis has not helped on this skill yet, so a check could be offered.";
  return `Not proven. ${r.learnerName} has ${practice} on "${r.skillLabel}". Practice with help counts as progress, never as mastery. ${clock} Nothing here can certify that no one else helped at home.`;
}
