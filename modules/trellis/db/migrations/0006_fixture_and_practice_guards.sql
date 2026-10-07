-- Follow-up native findings: distinguish the result variable from SQL aliases;
-- private fixture metadata follows the schema-wide FORCE RLS convention.
ALTER TABLE e2.fixture_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE e2.fixture_control FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fixture_owner ON e2.fixture_control;
CREATE POLICY fixture_owner ON e2.fixture_control USING(current_user=owner_login) WITH CHECK(current_user=owner_login);
ALTER TABLE e2.fixture_clock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE e2.fixture_clock_transactions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fixture_owner ON e2.fixture_clock_transactions;
CREATE POLICY fixture_owner ON e2.fixture_clock_transactions
  USING(current_user=(SELECT owner_login FROM e2.fixture_control WHERE singleton))
  WITH CHECK(current_user=(SELECT owner_login FROM e2.fixture_control WHERE singleton));

CREATE OR REPLACE FUNCTION e2.practice_check(p_learner text,p_skill text,p_version text,p_operation text,p_session text,p_payload jsonb,p_provenance jsonb,p_rule text DEFAULT 'e2-draft-1') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h text:=e2.household_id(); pending e2.practice_checks; recorded e2.evidence_events; seq bigint; BEGIN
  IF jsonb_typeof(p_payload->'checkId') IS DISTINCT FROM 'string' OR p_payload->>'checkId'='' OR p_operation IS NULL OR p_operation='' THEN
    RAISE EXCEPTION 'checkId and operation required' USING ERRCODE='22023';
  END IF;
  PERFORM e2.lock_skills(p_learner,ARRAY[p_skill],p_version);
  SELECT p.* INTO pending FROM e2.practice_checks p WHERE p.household_id=h AND p.learner_id=p_learner AND p.skill_id=p_skill
    AND p.skill_version=p_version AND p.session_id=p_session AND p.check_id=p_payload->>'checkId'
    AND NOT EXISTS(SELECT FROM e2.evidence_events e WHERE e.household_id=h AND e.practice_check_id=p.id);
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','NO_PENDING_CHECK'); END IF;
  IF pending.rule_version IS DISTINCT FROM p_rule THEN RAISE EXCEPTION 'practice rule conflict' USING ERRCODE='P0001'; END IF;
  IF EXISTS(SELECT FROM e2.evidence_events WHERE household_id=h AND learner_id=p_learner AND operation_id='practice-check:'||p_operation) THEN
    RAISE EXCEPTION 'practice operation conflict' USING ERRCODE='P0001';
  END IF;
  UPDATE e2.skill_guards SET causal_seq=causal_seq+1 WHERE household_id=h AND learner_id=p_learner AND skill_id=p_skill RETURNING causal_seq INTO seq;
  INSERT INTO e2.evidence_events(household_id,learner_id,operation_id,session_id,skill_id,skill_version,causal_seq,class,qualifying,payload,provenance,rule_version,practice_check_id)
    VALUES(h,p_learner,'practice-check:'||p_operation,p_session,p_skill,p_version,seq,'corrections-practice',false,p_payload,p_provenance,p_rule,pending.id) RETURNING * INTO recorded;
  RETURN jsonb_build_object('ok',true,'evidence',to_jsonb(recorded));
END; $$;
ALTER FUNCTION e2.practice_check(text,text,text,text,text,jsonb,jsonb,text) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.practice_check(text,text,text,text,text,jsonb,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.practice_check(text,text,text,text,text,jsonb,jsonb,text) TO tutor,assessment;

