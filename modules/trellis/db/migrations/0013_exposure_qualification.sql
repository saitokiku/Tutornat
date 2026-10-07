-- Same-skill help immediately removes stale retention availability.
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
  stamp:=e2.operation_clock();
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
  -- The exposure and visible retention availability commit together. Only
  -- existing projection partitions need refresh; the ledger remains the clock.
  FOREACH s IN ARRAY canonical LOOP
    IF EXISTS(SELECT FROM e2.projections WHERE household_id=h AND learner_id=p_learner AND skill_id=s) THEN
      PERFORM e2.rebuild_projection(p_learner,s);
    END IF;
  END LOOP;
  RETURN to_jsonb(e);
END; $$;
ALTER FUNCTION e2.record_exposure(text,text[],text,text,text,jsonb,jsonb,text) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.record_exposure(text,text[],text,text,text,jsonb,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.record_exposure(text,text[],text,text,text,jsonb,jsonb,text) TO tutor,assessment;

