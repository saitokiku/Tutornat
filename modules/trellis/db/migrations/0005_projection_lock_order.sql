-- Follow-up to the first native runtime proof: globally order content locks
-- before finalize acquires any content guard. Retain migration 0004 checksum.
CREATE OR REPLACE FUNCTION e2.lock_projection_content(p_learner text,skills text[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h text:=e2.household_id(); target record; BEGIN
  FOR target IN SELECT kind,id,version FROM (
    SELECT 'item'::text kind,a.item_id id,a.item_version version FROM e2.attempts a WHERE a.household_id=h AND a.learner_id=p_learner AND a.skill_id=ANY(skills)
    UNION SELECT 'rubric',a.rubric_id,a.rubric_version FROM e2.attempts a WHERE a.household_id=h AND a.learner_id=p_learner AND a.skill_id=ANY(skills)
  ) c ORDER BY kind COLLATE "C",id COLLATE "C",version COLLATE "C" LOOP
    PERFORM e2.lock_content(h,target.kind,target.id,target.version);
  END LOOP;
END; $$;
ALTER FUNCTION e2.lock_projection_content(text,text[]) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.lock_projection_content(text,text[]) FROM PUBLIC;

CREATE OR REPLACE FUNCTION e2.rebuild_projection(p_learner text,p_skill text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h text:=e2.household_id(); skills text[]; target record; output jsonb; BEGIN
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
  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY skill_id,skill_version,rule_version),'[]') INTO output
    FROM e2.projections p WHERE household_id=h AND learner_id=p_learner AND skill_id=ANY(skills);
  RETURN output;
END; $$;
ALTER FUNCTION e2.rebuild_projection(text,text) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.rebuild_projection(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.rebuild_projection(text,text) TO assessment;

CREATE OR REPLACE FUNCTION e2.finalize_attempt(p_learner text,p_attempt uuid,p_response jsonb,p_score jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h text:=e2.household_id(); a e2.attempts; i e2.items; g e2.skill_guards; e e2.evidence_events; reasons jsonb:='[]'; result jsonb; eligible boolean; stamp timestamptz; BEGIN
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
  eligible:=jsonb_array_length(reasons)=0;
  UPDATE e2.skill_guards SET causal_seq=causal_seq+1 WHERE household_id=h AND learner_id=p_learner AND skill_id=a.skill_id RETURNING * INTO g;
  INSERT INTO e2.evidence_events(household_id,learner_id,operation_id,attempt_id,session_id,skill_id,skill_version,causal_seq,class,qualifying,received_at,payload,provenance,rule_version)
    VALUES(h,p_learner,'attempt:'||a.id,a.id,a.session_id,a.skill_id,a.skill_version,g.causal_seq,'unassisted-attempt',eligible,stamp,
      jsonb_build_object('score',p_score,'reasons',reasons,'response',a.response),
      jsonb_build_object('itemId',a.item_id,'itemVersion',a.item_version,'keyVersion',a.key_version,'rubricId',a.rubric_id,'rubricVersion',a.rubric_version,'familyId',a.family_id,'contextTag',a.context_tag,'scorerId',a.scorer_id,'scorerVersion',a.scorer_version,'issuedSeq',a.issued_seq,'exposureSeq',g.exposure_seq),a.rule_version) RETURNING * INTO e;
  result:=jsonb_build_object('attemptId',a.id,'evidenceId',e.id,'qualifying',eligible,'reasons',reasons,'certification','none','ruleVersion',a.rule_version);
  UPDATE e2.attempts SET state='finalized',finalized_at=stamp,final_result=result WHERE household_id=h AND id=a.id;
  PERFORM e2.rebuild_projection(p_learner,a.skill_id);
  RETURN result;
END; $$;
ALTER FUNCTION e2.finalize_attempt(text,uuid,jsonb,jsonb) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.finalize_attempt(text,uuid,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.finalize_attempt(text,uuid,jsonb,jsonb) TO assessment;
