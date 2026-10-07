-- Forward-only. SQL authority substrate; product routes and full E13 certification belong to A/B/E3.
-- All mutating entry points share skill advisory locks, then guard rows, then attempt rows.
CREATE OR REPLACE FUNCTION e2.lock_skills(p_learner text,p_skills text[],p_version text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE s text; h text := e2.household_id(); BEGIN
  IF h IS NULL OR p_learner IS NULL OR p_version IS NULL OR p_skills IS NULL OR cardinality(p_skills)=0 OR array_position(p_skills,NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'missing principal or skill scope' USING ERRCODE='42501';
  END IF;
  FOR s IN SELECT DISTINCT unnest(p_skills) COLLATE "C" ORDER BY 1 LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(array_to_json(ARRAY[h,p_learner,s])::text,0));
    INSERT INTO e2.skill_guards(household_id,learner_id,skill_id)
      VALUES(h,p_learner,s) ON CONFLICT DO NOTHING;
    PERFORM 1 FROM e2.skill_guards WHERE household_id=h AND learner_id=p_learner AND skill_id=s FOR UPDATE;
  END LOOP;
END; $$;
ALTER FUNCTION e2.lock_skills(text,text[],text) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.lock_skills(text,text[],text) FROM PUBLIC;

-- Guard-row writes make stale repeatable-read/serializable snapshots conflict
-- rather than silently missing a revocation that won the content lock.
CREATE OR REPLACE FUNCTION e2.lock_content(p_household text,p_kind text,p_id text,p_version text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
  PERFORM pg_advisory_xact_lock_shared(hashtextextended(array_to_json(ARRAY['e2-content',p_household,p_kind,p_id,p_version])::text,0));
  INSERT INTO e2.content_guards(household_id,target_kind,target_id,target_version)
    VALUES(p_household,p_kind,p_id,p_version) ON CONFLICT DO NOTHING;
  PERFORM 1 FROM e2.content_guards WHERE household_id=p_household AND target_kind=p_kind AND target_id=p_id AND target_version=p_version FOR UPDATE;
END; $$;
ALTER FUNCTION e2.lock_content(text,text,text,text) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.lock_content(text,text,text,text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION e2.issue_attempt(p_learner text,p_item text,p_item_version text,p_operation text,p_session text,p_scorer text,p_scorer_version text,p_rule text DEFAULT 'e2-draft-1') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h text:=e2.household_id(); i e2.items; a e2.attempts; g e2.skill_guards; BEGIN
  SELECT * INTO i FROM e2.items WHERE household_id=h AND id=p_item AND version=p_item_version;
  IF NOT FOUND THEN RAISE EXCEPTION 'item unavailable' USING ERRCODE='P0002'; END IF;
  PERFORM e2.lock_skills(p_learner,ARRAY[i.skill_id],i.skill_version);
  PERFORM e2.lock_content(h,'item',i.id,i.version);
  PERFORM e2.lock_content(h,'rubric',i.rubric_id,i.rubric_version);
  SELECT * INTO a FROM e2.attempts WHERE household_id=h AND learner_id=p_learner AND operation_id=p_operation;
  IF FOUND THEN
    IF a.item_id IS DISTINCT FROM p_item OR a.item_version IS DISTINCT FROM p_item_version OR a.session_id IS DISTINCT FROM p_session OR a.scorer_id IS DISTINCT FROM p_scorer OR a.scorer_version IS DISTINCT FROM p_scorer_version OR a.rule_version IS DISTINCT FROM p_rule THEN
      RAISE EXCEPTION 'issue operation conflict' USING ERRCODE='P0001';
    END IF;
    RETURN to_jsonb(a);
  END IF;
  IF i.approval<>'approved' OR NOT EXISTS(SELECT FROM e2.rubrics WHERE household_id=h AND id=i.rubric_id AND version=i.rubric_version AND approval='approved') OR EXISTS(SELECT FROM e2.content_revocations WHERE household_id=h AND ((target_kind='item' AND target_id=i.id AND target_version=i.version) OR (target_kind='rubric' AND target_id=i.rubric_id AND target_version=i.rubric_version))) THEN
    RAISE EXCEPTION 'content is not approved' USING ERRCODE='P0001';
  END IF;
  UPDATE e2.skill_guards SET causal_seq=causal_seq+1 WHERE household_id=h AND learner_id=p_learner AND skill_id=i.skill_id RETURNING * INTO g;
  INSERT INTO e2.attempts(household_id,operation_id,learner_id,item_id,item_version,key_version,rubric_id,rubric_version,skill_id,skill_version,family_id,context_tag,scorer_id,scorer_version,rule_version,session_id,issued_seq,exposure_seq)
    VALUES(h,p_operation,p_learner,i.id,i.version,i.key_version,i.rubric_id,i.rubric_version,i.skill_id,i.skill_version,i.family_id,i.context_tag,p_scorer,p_scorer_version,p_rule,p_session,g.causal_seq,g.exposure_seq) RETURNING * INTO a;
  RETURN to_jsonb(a);
END; $$;
ALTER FUNCTION e2.issue_attempt(text,text,text,text,text,text,text,text) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.issue_attempt(text,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.issue_attempt(text,text,text,text,text,text,text,text) TO assessment;

CREATE OR REPLACE FUNCTION e2.submit_attempt(p_learner text,p_attempt uuid,p_response jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h text:=e2.household_id(); a e2.attempts; BEGIN
  SELECT * INTO a FROM e2.attempts WHERE household_id=h AND learner_id=p_learner AND id=p_attempt;
  IF NOT FOUND THEN RAISE EXCEPTION 'attempt unavailable' USING ERRCODE='P0002'; END IF;
  PERFORM e2.lock_skills(p_learner,ARRAY[a.skill_id],a.skill_version);
  SELECT * INTO a FROM e2.attempts WHERE household_id=h AND learner_id=p_learner AND id=p_attempt FOR UPDATE;
  IF p_response IS NULL OR p_response='null'::jsonb THEN RAISE EXCEPTION 'response required' USING ERRCODE='22023'; END IF;
  IF a.response IS NOT NULL THEN
    IF a.response IS DISTINCT FROM p_response THEN RAISE EXCEPTION 'response conflict' USING ERRCODE='P0001'; END IF;
    RETURN to_jsonb(a);
  END IF;
  IF a.state<>'issued' THEN RAISE EXCEPTION 'attempt is not issued' USING ERRCODE='P0001'; END IF;
  UPDATE e2.attempts SET state='submitted',response=p_response,submitted_at=clock_timestamp() WHERE household_id=h AND id=p_attempt RETURNING * INTO a;
  RETURN to_jsonb(a);
END; $$;
ALTER FUNCTION e2.submit_attempt(text,uuid,jsonb) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.submit_attempt(text,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.submit_attempt(text,uuid,jsonb) TO learner,assessment;

CREATE OR REPLACE FUNCTION e2.record_exposure(p_learner text,p_skills text[],p_version text,p_operation text,p_session text,p_payload jsonb,p_provenance jsonb,p_rule text DEFAULT 'e2-draft-1') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h text:=e2.household_id(); s text; seq bigint; seqs jsonb:='{}'; e e2.exposure_events; stamp timestamptz; canonical text[]; BEGIN
  SELECT array_agg(x ORDER BY x COLLATE "C") INTO canonical FROM (SELECT DISTINCT unnest(p_skills) x) q;
  PERFORM e2.lock_skills(p_learner,canonical,p_version);
  SELECT * INTO e FROM e2.exposure_events WHERE household_id=h AND learner_id=p_learner AND operation_id=p_operation;
  IF FOUND THEN
    IF e.skill_ids IS DISTINCT FROM canonical OR e.skill_version IS DISTINCT FROM p_version OR e.session_id IS DISTINCT FROM p_session OR e.payload IS DISTINCT FROM p_payload OR e.provenance IS DISTINCT FROM p_provenance OR e.rule_version IS DISTINCT FROM p_rule THEN
      RAISE EXCEPTION 'exposure operation conflict' USING ERRCODE='P0001';
    END IF;
    RETURN to_jsonb(e);
  END IF;
  stamp:=clock_timestamp();
  FOREACH s IN ARRAY canonical LOOP
    UPDATE e2.skill_guards SET causal_seq=causal_seq+1,exposure_seq=causal_seq+1,last_exposure_at=stamp
      WHERE household_id=h AND learner_id=p_learner AND skill_id=s;
    SELECT causal_seq INTO seq FROM e2.skill_guards WHERE household_id=h AND learner_id=p_learner AND skill_id=s;
    seqs:=seqs||jsonb_build_object(s,seq);
  END LOOP;
  -- Completed history is outside the observation interval. In-flight attempts latch by causal order, not timestamp comparison.
  UPDATE e2.attempts SET assistance_latched=true WHERE household_id=h AND learner_id=p_learner AND skill_id=ANY(canonical) AND state IN ('issued','submitted');
  INSERT INTO e2.exposure_events(household_id,learner_id,operation_id,session_id,skill_ids,skill_version,causal_sequences,received_at,payload,provenance,rule_version)
    VALUES(h,p_learner,p_operation,p_session,canonical,p_version,seqs,stamp,p_payload,p_provenance,p_rule) RETURNING * INTO e;
  RETURN to_jsonb(e);
END; $$;
ALTER FUNCTION e2.record_exposure(text,text[],text,text,text,jsonb,jsonb,text) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.record_exposure(text,text[],text,text,text,jsonb,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.record_exposure(text,text[],text,text,text,jsonb,jsonb,text) TO tutor,assessment;

CREATE OR REPLACE FUNCTION e2.append_practice(p_learner text,p_skill text,p_version text,p_operation text,p_session text,p_payload jsonb,p_provenance jsonb,p_rule text DEFAULT 'e2-draft-1') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h text:=e2.household_id(); e e2.evidence_events; seq bigint; BEGIN
  PERFORM e2.lock_skills(p_learner,ARRAY[p_skill],p_version);
  SELECT * INTO e FROM e2.evidence_events WHERE household_id=h AND learner_id=p_learner AND operation_id='practice:'||p_operation;
  IF FOUND THEN
    IF e.class<>'corrections-practice' OR e.payload IS DISTINCT FROM p_payload OR e.provenance IS DISTINCT FROM p_provenance OR e.skill_id IS DISTINCT FROM p_skill OR e.skill_version IS DISTINCT FROM p_version OR e.session_id IS DISTINCT FROM p_session OR e.rule_version IS DISTINCT FROM p_rule THEN
      RAISE EXCEPTION 'practice operation conflict' USING ERRCODE='P0001';
    END IF;
    RETURN to_jsonb(e);
  END IF;
  UPDATE e2.skill_guards SET causal_seq=causal_seq+1 WHERE household_id=h AND learner_id=p_learner AND skill_id=p_skill RETURNING causal_seq INTO seq;
  INSERT INTO e2.evidence_events(household_id,learner_id,operation_id,session_id,skill_id,skill_version,causal_seq,class,qualifying,payload,provenance,rule_version)
    VALUES(h,p_learner,'practice:'||p_operation,p_session,p_skill,p_version,seq,'corrections-practice',false,p_payload,p_provenance,p_rule) RETURNING * INTO e;
  RETURN to_jsonb(e);
END; $$;
ALTER FUNCTION e2.append_practice(text,text,text,text,text,jsonb,jsonb,text) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.append_practice(text,text,text,text,text,jsonb,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.append_practice(text,text,text,text,text,jsonb,jsonb,text) TO tutor,assessment;

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
  PERFORM e2.lock_content(h,'item',i.id,i.version);
  PERFORM e2.lock_content(h,'rubric',i.rubric_id,i.rubric_version);
  SELECT * INTO g FROM e2.skill_guards WHERE household_id=h AND learner_id=p_learner AND skill_id=a.skill_id;
  stamp:=clock_timestamp();
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
  INSERT INTO e2.projections(household_id,learner_id,skill_id,skill_version,rule_version,evidence_ids,independent_successes)
    SELECT h,p_learner,a.skill_id,a.skill_version,a.rule_version,COALESCE(array_agg(id ORDER BY causal_seq,id) FILTER(WHERE qualifying),'{}'::uuid[]),count(*) FILTER(WHERE qualifying)
    FROM e2.evidence_events WHERE household_id=h AND learner_id=p_learner AND skill_id=a.skill_id AND skill_version=a.skill_version AND rule_version=a.rule_version
    ON CONFLICT(household_id,learner_id,skill_id,skill_version,rule_version) DO UPDATE SET evidence_ids=EXCLUDED.evidence_ids,independent_successes=EXCLUDED.independent_successes,updated_at=clock_timestamp();
  RETURN result;
END; $$;
ALTER FUNCTION e2.finalize_attempt(text,uuid,jsonb,jsonb) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.finalize_attempt(text,uuid,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.finalize_attempt(text,uuid,jsonb,jsonb) TO assessment;
