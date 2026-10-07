-- ADR-0064 is PROPOSED in the build's product record. e2-draft-1 remains
-- noncertifying. Qualification is a separately auditable protocol state.
ALTER TABLE e2.projections ADD COLUMN IF NOT EXISTS qualification_state text NOT NULL DEFAULT 'pending'
  CHECK(qualification_state IN ('pending','eligible','qualified'));
ALTER TABLE e2.projections ADD COLUMN IF NOT EXISTS qualification_reasons jsonb NOT NULL DEFAULT '["first_success_required"]';
ALTER TABLE e2.projections ADD COLUMN IF NOT EXISTS qualification jsonb NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS e2.qualification_events (
  household_id text NOT NULL,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_order bigint GENERATED ALWAYS AS IDENTITY,
  learner_id text NOT NULL,
  skill_id text NOT NULL,
  skill_version text NOT NULL,
  rule_version text NOT NULL,
  previous_state text,
  state text NOT NULL CHECK(state IN ('pending','eligible','qualified')),
  reasons jsonb NOT NULL CHECK(jsonb_typeof(reasons)='array' AND jsonb_array_length(reasons)>0),
  facts jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT e2.operation_clock(),
  provenance jsonb NOT NULL,
  FOREIGN KEY(household_id,learner_id) REFERENCES e2.learners,
  FOREIGN KEY(household_id,rule_version) REFERENCES e2.rule_versions
);
ALTER TABLE e2.qualification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE e2.qualification_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_isolation ON e2.qualification_events;
CREATE POLICY household_isolation ON e2.qualification_events
  USING(household_id=e2.household_id()) WITH CHECK(household_id=e2.household_id());
REVOKE ALL ON e2.qualification_events FROM PUBLIC,learner,tutor,report,assessment;
GRANT SELECT ON e2.qualification_events TO learner,tutor,report,assessment;
GRANT SELECT,INSERT ON e2.qualification_events TO e2_writer;
GRANT USAGE ON SEQUENCE e2.qualification_events_event_order_seq TO e2_writer;
DROP TRIGGER IF EXISTS append_only ON e2.qualification_events;
CREATE TRIGGER append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON e2.qualification_events
  FOR EACH STATEMENT EXECUTE FUNCTION e2.reject_mutation();

-- Called under the existing skill/content locks, after rebuilding contributors.
-- The anchor is the first protocol success, even if later withdrawn. A withdrawn
-- anchor cannot count and cannot silently shift the window to a later success.
-- Old rows without e13 protocol facts remain visible independent successes but
-- cannot be upgraded into E13 evidence by rebuilding.
CREATE OR REPLACE FUNCTION e2.qualification_facts(p_learner text,p_skill text,p_version text,p_rule text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h text:=e2.household_id(); anchor e2.evidence_events; zone text; days jsonb:='[]';
  contexts integer:=0; retention boolean:=false; anchor_retained boolean:=false;
  current_day integer; delay_hours numeric; last_help timestamptz; state text:='pending';
  reasons jsonb:='[]'; ids uuid[]; window_start integer; window_end integer;
BEGIN
  SELECT * INTO anchor FROM e2.evidence_events
    WHERE household_id=h AND learner_id=p_learner AND skill_id=p_skill AND skill_version=p_version
      AND rule_version=p_rule AND qualifying AND payload ? 'e13'
    ORDER BY causal_seq,id LIMIT 1;
  SELECT evidence_ids INTO ids FROM e2.projections WHERE household_id=h AND learner_id=p_learner
    AND skill_id=p_skill AND skill_version=p_version AND rule_version=p_rule;
  SELECT (parameters->>'delayHours')::numeric,
    COALESCE((parameters->'daySeven'->>0)::integer,6),COALESCE((parameters->'daySeven'->>1)::integer,9)
    INTO delay_hours,window_start,window_end FROM e2.rule_versions WHERE household_id=h AND id=p_rule;
  IF anchor.id IS NULL THEN
    reasons:='["first_success_required"]';
  ELSE
    zone:=anchor.payload->'e13'->>'timezone';
    anchor_retained:=anchor.id=ANY(ids);
    current_day:=(e2.operation_clock() AT TIME ZONE zone)::date-(anchor.received_at AT TIME ZONE zone)::date;
    WITH retained AS (
      SELECT e.id,e.received_at,e.causal_seq,a.family_id,a.context_tag,(e.received_at AT TIME ZONE zone)::date AS local_day
      FROM e2.evidence_events e JOIN e2.attempts a ON a.household_id=e.household_id AND a.id=e.attempt_id
      WHERE e.household_id=h AND e.id=ANY(ids) AND e.payload ? 'e13'
    )
    SELECT COALESCE((SELECT jsonb_agg(d.local_day ORDER BY d.local_day) FROM (SELECT DISTINCT local_day FROM retained) d),'[]'),
      CASE WHEN EXISTS(SELECT FROM retained a JOIN retained b ON a.family_id<>b.family_id AND a.context_tag<>b.context_tag
        WHERE a.family_id<>'' AND b.family_id<>'' AND a.context_tag<>'' AND b.context_tag<>'') THEN 2
        WHEN EXISTS(SELECT FROM retained) THEN 1 ELSE 0 END,
      EXISTS(SELECT FROM retained a JOIN retained b ON a.family_id<>b.family_id AND a.context_tag<>b.context_tag
        WHERE a.id=anchor.id AND b.causal_seq>a.causal_seq AND b.local_day<>a.local_day
          AND b.local_day-a.local_day BETWEEN window_start AND window_end
          AND a.family_id<>'' AND b.family_id<>'' AND a.context_tag<>'' AND b.context_tag<>'')
      INTO days,contexts,retention;
    SELECT last_exposure_at INTO last_help FROM e2.skill_guards WHERE household_id=h AND learner_id=p_learner AND skill_id=p_skill;
    IF retention AND anchor_retained AND contexts=2 AND jsonb_array_length(days)>=2 THEN
      state:='qualified'; reasons:='["e13_conditions_met","adr_0064_proposed_no_certification"]';
    ELSE
      IF NOT anchor_retained THEN reasons:=reasons||'"anchor_withdrawn"'::jsonb; END IF;
      IF contexts<2 THEN reasons:=reasons||'"two_contexts_required"'::jsonb; END IF;
      IF contexts=1 AND cardinality(ids)>1 THEN reasons:=reasons||'"repeated_family"'::jsonb; END IF;
      IF jsonb_array_length(days)<2 THEN reasons:=reasons||'"separate_days_required"'::jsonb; END IF;
      IF NOT retention THEN reasons:=reasons||'"retention_pending"'::jsonb; END IF;
      IF current_day<window_start THEN reasons:=reasons||'"retention_window_not_open"'::jsonb;
      ELSIF current_day>window_end THEN reasons:=reasons||'"retention_window_missed"'::jsonb;
      ELSIF last_help IS NOT NULL AND e2.operation_clock()-last_help<delay_hours*interval '1 hour' THEN
        reasons:=reasons||'"quiet_window_not_elapsed"'::jsonb;
      ELSIF anchor_retained THEN state:='eligible'; reasons:=reasons||'"retention_check_available"'::jsonb;
      END IF;
    END IF;
  END IF;
  RETURN jsonb_build_object('state',state,'reasons',reasons,'anchorEvidenceId',anchor.id,
    'anchorAt',anchor.received_at,'timezone',zone,'localDays',days,'contextCount',contexts,
    'retentionSatisfied',retention,'windowStartDay',window_start,'windowEndDay',window_end,'ruleVersion',p_rule);
END; $$;
ALTER FUNCTION e2.qualification_facts(text,text,text,text) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.qualification_facts(text,text,text,text) FROM PUBLIC,learner,tutor,report,assessment;

CREATE OR REPLACE FUNCTION e2.rebuild_projection(p_learner text,p_skill text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h text:=e2.household_id(); skills text[]; target record; output jsonb; facts jsonb; prior_state text; BEGIN
  IF NOT EXISTS(SELECT FROM e2.learners WHERE household_id=h AND id=p_learner) THEN
    RAISE EXCEPTION 'learner unavailable' USING ERRCODE='P0002';
  END IF;
  SELECT array_agg(DISTINCT skill_id) INTO skills FROM (
    SELECT skill_id FROM e2.evidence_events WHERE household_id=h AND learner_id=p_learner
    UNION SELECT skill_id FROM e2.projections WHERE household_id=h AND learner_id=p_learner
    UNION SELECT p_skill WHERE p_skill IS NOT NULL
  ) s WHERE p_skill IS NULL OR skill_id=p_skill;
  IF skills IS NULL THEN RETURN '[]'::jsonb; END IF;
  PERFORM e2.lock_skills(p_learner,skills,'all-retained-versions');
  -- Touch guards so stale RR/serializable snapshots retry, then lock every
  -- referenced content version before reading revocations (same order as issue).
  UPDATE e2.skill_guards SET causal_seq=causal_seq+1 WHERE household_id=h AND learner_id=p_learner AND skill_id=ANY(skills);
  PERFORM e2.lock_projection_content(p_learner,skills);
  -- qualifying is the retained decision made under the immutable rule on that
  -- row. Never reinterpret it under a newer rule or promote rejected evidence.
  -- Revocation withdraws contributions, without altering original evidence.
  INSERT INTO e2.projections(household_id,learner_id,skill_id,skill_version,rule_version,evidence_ids,independent_successes)
  WITH partitions AS (
    SELECT skill_id,skill_version,rule_version FROM e2.evidence_events WHERE household_id=h AND learner_id=p_learner AND skill_id=ANY(skills)
    UNION SELECT skill_id,skill_version,rule_version FROM e2.projections WHERE household_id=h AND learner_id=p_learner AND skill_id=ANY(skills)
  ), retained AS (
    SELECT e.* FROM e2.evidence_events e
    JOIN e2.rule_versions r ON r.household_id=e.household_id AND r.id=e.rule_version
    JOIN e2.attempts a ON a.household_id=e.household_id AND a.id=e.attempt_id AND a.rule_version=r.id
    WHERE e.household_id=h AND e.learner_id=p_learner AND e.skill_id=ANY(skills) AND e.qualifying
      AND NOT EXISTS(SELECT FROM e2.content_revocations v WHERE v.household_id=h AND
        ((v.target_kind='item' AND v.target_id=a.item_id AND v.target_version=a.item_version) OR
         (v.target_kind='rubric' AND v.target_id=a.rubric_id AND v.target_version=a.rubric_version)))
  )
  SELECT h,p_learner,p.skill_id,p.skill_version,p.rule_version,
    COALESCE(array_agg(e.id ORDER BY e.causal_seq,e.id) FILTER(WHERE e.id IS NOT NULL),'{}'::uuid[]),count(e.id)::integer
  FROM partitions p LEFT JOIN retained e USING(skill_id,skill_version,rule_version)
  GROUP BY p.skill_id,p.skill_version,p.rule_version
  ON CONFLICT(household_id,learner_id,skill_id,skill_version,rule_version)
    DO UPDATE SET evidence_ids=EXCLUDED.evidence_ids,independent_successes=EXCLUDED.independent_successes,updated_at=e2.operation_clock();
  FOR target IN SELECT * FROM e2.projections WHERE household_id=h AND learner_id=p_learner AND skill_id=ANY(skills) LOOP
    facts:=e2.qualification_facts(p_learner,target.skill_id,target.skill_version,target.rule_version);
    IF target.qualification IS DISTINCT FROM facts THEN
      prior_state:=CASE WHEN target.qualification='{}'::jsonb THEN NULL ELSE target.qualification_state END;
      UPDATE e2.projections SET qualification_state=facts->>'state',qualification_reasons=facts->'reasons',qualification=facts,
        updated_at=e2.operation_clock() WHERE household_id=h AND learner_id=p_learner AND skill_id=target.skill_id
          AND skill_version=target.skill_version AND rule_version=target.rule_version;
      INSERT INTO e2.qualification_events(household_id,learner_id,skill_id,skill_version,rule_version,previous_state,state,reasons,facts,provenance)
        VALUES(h,p_learner,target.skill_id,target.skill_version,target.rule_version,prior_state,facts->>'state',facts->'reasons',facts,
          jsonb_build_object('source','rebuild_projection','login',session_user));
    END IF;
  END LOOP;
  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY skill_id,skill_version,rule_version),'[]') INTO output
    FROM e2.projections p WHERE household_id=h AND learner_id=p_learner AND skill_id=ANY(skills);
  RETURN output;
END; $$;
ALTER FUNCTION e2.rebuild_projection(text,text) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.rebuild_projection(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.rebuild_projection(text,text) TO assessment;


CREATE OR REPLACE FUNCTION e2.finalize_attempt(p_learner text,p_attempt uuid,p_response jsonb,p_score jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h text:=e2.household_id(); a e2.attempts; i e2.items; g e2.skill_guards; e e2.evidence_events; reasons jsonb:='[]'; result jsonb; eligible boolean; stamp timestamptz; anchor e2.evidence_events; zone text; offset_day integer; in_window boolean:=false; protocol jsonb; projection jsonb; window_start integer; window_end integer; BEGIN
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
  offset_day:=CASE WHEN anchor.id IS NULL THEN 0 ELSE (stamp AT TIME ZONE zone)::date-(anchor.received_at AT TIME ZONE zone)::date END;
  in_window:=anchor.id IS NOT NULL AND offset_day BETWEEN window_start AND window_end;
  protocol:=jsonb_build_object('timezone',zone,'localDate',(stamp AT TIME ZONE zone)::date,
    'localDayOffset',offset_day,'retentionInWindow',in_window,'ruleVersion',a.rule_version);
  eligible:=jsonb_array_length(reasons)=0;
  UPDATE e2.skill_guards SET causal_seq=causal_seq+1 WHERE household_id=h AND learner_id=p_learner AND skill_id=a.skill_id RETURNING * INTO g;
  INSERT INTO e2.evidence_events(household_id,learner_id,operation_id,attempt_id,session_id,skill_id,skill_version,causal_seq,class,qualifying,received_at,payload,provenance,rule_version)
    VALUES(h,p_learner,'attempt:'||a.id,a.id,a.session_id,a.skill_id,a.skill_version,g.causal_seq,CASE WHEN eligible AND in_window THEN 'delayed-retention' ELSE 'unassisted-attempt' END,eligible,stamp,
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

CREATE OR REPLACE VIEW e2.report_projection WITH (security_invoker=true,security_barrier=true) AS
  SELECT household_id,learner_id,skill_id,skill_version,rule_version,evidence_ids,independent_successes,certification,updated_at,
    qualification_state,qualification_reasons,qualification FROM e2.projections;
