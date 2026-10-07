-- Qualification uses server response receipt, never grading completion.
-- The first success recognized by the authority freezes its receipt anchor.
CREATE OR REPLACE FUNCTION e2.finalize_attempt(p_learner text,p_attempt uuid,p_response jsonb,p_score jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h text:=e2.household_id(); a e2.attempts; i e2.items; g e2.skill_guards; e e2.evidence_events; reasons jsonb:='[]'; result jsonb; eligible boolean; stamp timestamptz; receipt timestamptz; anchor e2.evidence_events; zone text; offset_day integer; in_window boolean:=false; protocol jsonb; projection jsonb; window_start integer; window_end integer; BEGIN
  SELECT * INTO a FROM e2.attempts WHERE household_id=h AND learner_id=p_learner AND id=p_attempt;
  IF NOT FOUND THEN RAISE EXCEPTION 'attempt unavailable' USING ERRCODE='P0002'; END IF;
  PERFORM e2.lock_skills(p_learner,ARRAY[a.skill_id],a.skill_version);
  SELECT * INTO a FROM e2.attempts WHERE household_id=h AND learner_id=p_learner AND id=p_attempt FOR UPDATE;
  IF a.response IS DISTINCT FROM p_response OR p_response IS NULL THEN RAISE EXCEPTION 'response conflict' USING ERRCODE='P0001'; END IF;
  IF a.state='finalized' THEN RETURN a.final_result; END IF;
  IF a.state<>'submitted' THEN RAISE EXCEPTION 'attempt is not submitted' USING ERRCODE='P0001'; END IF;
  SELECT * INTO i FROM e2.items WHERE household_id=h AND id=a.item_id AND version=a.item_version;
  PERFORM e2.lock_projection_content(p_learner,ARRAY[a.skill_id]);
  PERFORM e2.lock_content(h,'item',i.id,i.version);
  PERFORM e2.lock_content(h,'rubric',i.rubric_id,i.rubric_version);
  SELECT * INTO g FROM e2.skill_guards WHERE household_id=h AND learner_id=p_learner AND skill_id=a.skill_id;
  stamp:=e2.operation_clock();
  receipt:=a.submitted_at;
  IF a.assistance_latched OR g.exposure_seq<>a.exposure_seq THEN reasons:=reasons||'"assistance_observed"'::jsonb; END IF;
  IF g.last_exposure_at IS NOT NULL AND a.issued_at-g.last_exposure_at<(SELECT (parameters->>'delayHours')::double precision*interval '1 hour' FROM e2.rule_versions WHERE household_id=h AND id=a.rule_version) THEN reasons:=reasons||'"delay_under_48h"'::jsonb; END IF;
  IF i.approval<>'approved' OR NOT EXISTS(SELECT FROM e2.rubrics WHERE household_id=h AND id=a.rubric_id AND version=a.rubric_version AND approval='approved') OR EXISTS(SELECT FROM e2.content_revocations WHERE household_id=h AND ((target_kind='item' AND target_id=i.id AND target_version=i.version) OR (target_kind='rubric' AND target_id=i.rubric_id AND target_version=i.rubric_version))) THEN reasons:=reasons||'"content_not_approved"'::jsonb; END IF;
  IF EXISTS(SELECT FROM e2.attempts WHERE household_id=h AND learner_id=p_learner AND item_id=a.item_id AND id<>a.id AND issue_order<a.issue_order) THEN reasons:=reasons||'"familiar_item"'::jsonb; END IF;
  IF p_score IS NULL OR jsonb_typeof(p_score->'correct') IS DISTINCT FROM 'boolean' OR p_score->'correct'<>'true'::jsonb THEN reasons:=reasons||'"not_correct_or_ungraded"'::jsonb; END IF;
  SELECT * INTO anchor FROM e2.evidence_events WHERE household_id=h AND learner_id=p_learner
    AND skill_id=a.skill_id AND skill_version=a.skill_version AND rule_version=a.rule_version AND qualifying AND payload ? 'e13'
    ORDER BY causal_seq,id LIMIT 1;
  SELECT timezone INTO zone FROM e2.households WHERE household_id=h;
  -- Freeze the household zone of the first success for this rule/skill cohort.
  -- An audited household change applies to subsequent cohorts, not old evidence.
  zone:=COALESCE(anchor.payload->'e13'->>'timezone',zone);
  SELECT COALESCE((parameters->'daySeven'->>0)::integer,6),COALESCE((parameters->'daySeven'->>1)::integer,9)
    INTO window_start,window_end FROM e2.rule_versions WHERE household_id=h AND id=a.rule_version;
  offset_day:=CASE WHEN anchor.id IS NULL THEN 0 ELSE (receipt AT TIME ZONE zone)::date-(anchor.received_at AT TIME ZONE zone)::date END;
  in_window:=anchor.id IS NOT NULL AND offset_day BETWEEN window_start AND window_end;
  protocol:=jsonb_build_object('timezone',zone,'localDate',(receipt AT TIME ZONE zone)::date,
    'localDayOffset',offset_day,'retentionInWindow',in_window,'ruleVersion',a.rule_version);
  eligible:=jsonb_array_length(reasons)=0;
  UPDATE e2.skill_guards SET causal_seq=causal_seq+1 WHERE household_id=h AND learner_id=p_learner AND skill_id=a.skill_id RETURNING * INTO g;
  INSERT INTO e2.evidence_events(household_id,learner_id,operation_id,attempt_id,session_id,skill_id,skill_version,causal_seq,class,qualifying,received_at,payload,provenance,rule_version)
    VALUES(h,p_learner,'attempt:'||a.id,a.id,a.session_id,a.skill_id,a.skill_version,g.causal_seq,CASE WHEN eligible AND in_window THEN 'delayed-retention' ELSE 'unassisted-attempt' END,eligible,receipt,
      jsonb_build_object('score',p_score,'reasons',reasons,'response',a.response,'e13',protocol),
      jsonb_build_object('itemId',a.item_id,'itemVersion',a.item_version,'keyVersion',a.key_version,'rubricId',a.rubric_id,'rubricVersion',a.rubric_version,'familyId',a.family_id,'contextTag',a.context_tag,'scorerId',a.scorer_id,'scorerVersion',a.scorer_version,'issuedSeq',a.issued_seq,'exposureSeq',g.exposure_seq),a.rule_version) RETURNING * INTO e;
  PERFORM e2.rebuild_projection(p_learner,a.skill_id);
  SELECT qualification INTO projection FROM e2.projections WHERE household_id=h AND learner_id=p_learner AND skill_id=a.skill_id AND skill_version=a.skill_version AND rule_version=a.rule_version;
  result:=jsonb_build_object('attemptId',a.id,'evidenceId',e.id,'qualifying',eligible,'reasons',reasons,'certification','none','ruleVersion',a.rule_version,'qualificationState',projection->>'state','qualificationReasons',projection->'reasons','qualification',projection);
  UPDATE e2.attempts SET state='finalized',finalized_at=stamp,final_result=result WHERE household_id=h AND id=a.id;
  RETURN result;
END; $$;
ALTER FUNCTION e2.finalize_attempt(text,uuid,jsonb,jsonb) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.finalize_attempt(text,uuid,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.finalize_attempt(text,uuid,jsonb,jsonb) TO assessment;

