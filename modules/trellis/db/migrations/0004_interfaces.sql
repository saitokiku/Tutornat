-- Forward-only interface additions for A. No product caller takes locks.
-- Only the migration owner can opt a database into deterministic fixture time.
CREATE TABLE IF NOT EXISTS e2.fixture_control (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  enabled boolean NOT NULL DEFAULT false,
  owner_login name NOT NULL DEFAULT session_user
);
INSERT INTO e2.fixture_control(singleton) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS e2.fixture_clock_transactions (
  backend_pid integer PRIMARY KEY,
  transaction_id xid8 NOT NULL
);
REVOKE ALL ON e2.fixture_control,e2.fixture_clock_transactions FROM PUBLIC,learner,tutor,report,assessment,e2_writer;
CREATE OR REPLACE FUNCTION e2.set_fixture_clock(p_clock timestamptz) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
  IF NOT EXISTS(SELECT FROM e2.fixture_control WHERE singleton AND enabled AND owner_login=session_user
    AND current_setting('role') IN ('none',owner_login::text)) THEN
    RAISE EXCEPTION 'fixture clock requires the migration owner in an opted-in fixture database' USING ERRCODE='42501';
  END IF;
  INSERT INTO e2.fixture_clock_transactions VALUES(pg_backend_pid(),pg_current_xact_id())
    ON CONFLICT(backend_pid) DO UPDATE SET transaction_id=EXCLUDED.transaction_id;
  PERFORM set_config('e2.fixture_clock',COALESCE(p_clock::text,''),true);
END; $$;
REVOKE ALL ON FUNCTION e2.set_fixture_clock(timestamptz) FROM PUBLIC,learner,tutor,report,assessment,e2_writer;
CREATE OR REPLACE FUNCTION e2.operation_clock() RETURNS timestamptz
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE fixture text; BEGIN
  IF EXISTS(SELECT FROM e2.fixture_control WHERE singleton AND enabled AND owner_login=session_user
      AND current_setting('role') IN ('none',owner_login::text))
    AND EXISTS(SELECT FROM e2.fixture_clock_transactions WHERE backend_pid=pg_backend_pid() AND transaction_id=pg_current_xact_id()) THEN
    fixture:=NULLIF(current_setting('e2.fixture_clock',true),'');
    IF fixture IS NOT NULL THEN RETURN fixture::timestamptz; END IF;
  END IF;
  RETURN clock_timestamp();
END; $$;
REVOKE ALL ON FUNCTION e2.operation_clock() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.operation_clock() TO e2_writer;
ALTER TABLE e2.attempts ALTER COLUMN issued_at SET DEFAULT e2.operation_clock();
ALTER TABLE e2.evidence_events ALTER COLUMN received_at SET DEFAULT e2.operation_clock();
ALTER TABLE e2.projections ALTER COLUMN updated_at SET DEFAULT e2.operation_clock();

CREATE TABLE IF NOT EXISTS e2.attempt_events (
  household_id text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_order bigint GENERATED ALWAYS AS IDENTITY,
  attempt_id uuid NOT NULL,
  learner_id text NOT NULL,
  state text NOT NULL CHECK(state IN ('issued','submitted','finalized','expired','cancelled')),
  received_at timestamptz NOT NULL,
  snapshot jsonb NOT NULL,
  provenance jsonb NOT NULL,
  PRIMARY KEY(household_id,id),
  UNIQUE(household_id,attempt_id,state),
  FOREIGN KEY(household_id,attempt_id) REFERENCES e2.attempts,
  FOREIGN KEY(household_id,learner_id) REFERENCES e2.learners
);
ALTER TABLE e2.attempt_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE e2.attempt_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_isolation ON e2.attempt_events;
CREATE POLICY household_isolation ON e2.attempt_events USING(household_id=e2.household_id()) WITH CHECK(household_id=e2.household_id());
REVOKE ALL ON e2.attempt_events FROM PUBLIC,learner,tutor,report,assessment;
GRANT SELECT ON e2.attempt_events TO learner,tutor,report,assessment;
GRANT SELECT,INSERT ON e2.attempt_events TO e2_writer;
GRANT USAGE ON SEQUENCE e2.attempt_events_event_order_seq TO e2_writer;
DROP TRIGGER IF EXISTS append_only ON e2.attempt_events;
CREATE TRIGGER append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON e2.attempt_events FOR EACH STATEMENT EXECUTE FUNCTION e2.reject_mutation();
-- Existing history has trustworthy issue/submit/finalize timestamps, but no
-- original transition snapshots. Label reconstructed events explicitly.
INSERT INTO e2.attempt_events(household_id,attempt_id,learner_id,state,received_at,snapshot,provenance)
  SELECT a.household_id,a.id,a.learner_id,v.state,v.stamp,'{}',
    jsonb_build_object('source','migration-0004-reconstructed','snapshotUnavailable',true)
  FROM e2.attempts a CROSS JOIN LATERAL (VALUES
    ('issued',a.issued_at),('submitted',a.submitted_at),('finalized',a.finalized_at)) v(state,stamp)
  WHERE v.stamp IS NOT NULL ON CONFLICT(household_id,attempt_id,state) DO NOTHING;
CREATE OR REPLACE FUNCTION e2.audit_attempt_transition() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
  IF TG_OP='INSERT' OR NEW.state IS DISTINCT FROM OLD.state THEN
    INSERT INTO e2.attempt_events(household_id,attempt_id,learner_id,state,received_at,snapshot,provenance)
      VALUES(NEW.household_id,NEW.id,NEW.learner_id,NEW.state,
        CASE NEW.state WHEN 'issued' THEN NEW.issued_at WHEN 'submitted' THEN NEW.submitted_at WHEN 'finalized' THEN NEW.finalized_at ELSE e2.operation_clock() END,
        to_jsonb(NEW),jsonb_build_object('source','attempt-transition','login',session_user));
  END IF;
  RETURN NEW;
END; $$;
ALTER FUNCTION e2.audit_attempt_transition() OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.audit_attempt_transition() FROM PUBLIC;
DROP TRIGGER IF EXISTS audit_attempt_transition ON e2.attempts;
CREATE TRIGGER audit_attempt_transition AFTER INSERT OR UPDATE ON e2.attempts FOR EACH ROW EXECUTE FUNCTION e2.audit_attempt_transition();

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
  FOR target IN SELECT DISTINCT kind,id,version FROM (
    SELECT 'item'::text kind,a.item_id id,a.item_version version FROM e2.attempts a WHERE a.household_id=h AND a.learner_id=p_learner AND a.skill_id=ANY(skills)
    UNION SELECT 'rubric',a.rubric_id,a.rubric_version FROM e2.attempts a WHERE a.household_id=h AND a.learner_id=p_learner AND a.skill_id=ANY(skills)
  ) c ORDER BY kind COLLATE "C",id COLLATE "C",version COLLATE "C" LOOP
    PERFORM e2.lock_content(h,target.kind,target.id,target.version);
  END LOOP;
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

CREATE OR REPLACE FUNCTION e2.end_attempt(p_learner text,p_attempt uuid,p_state text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h text:=e2.household_id(); a e2.attempts; BEGIN
  IF p_state NOT IN ('expired','cancelled') OR p_state IS NULL THEN RAISE EXCEPTION 'invalid terminal state' USING ERRCODE='22023'; END IF;
  SELECT * INTO a FROM e2.attempts WHERE household_id=h AND learner_id=p_learner AND id=p_attempt;
  IF NOT FOUND THEN RAISE EXCEPTION 'attempt unavailable' USING ERRCODE='P0002'; END IF;
  PERFORM e2.lock_skills(p_learner,ARRAY[a.skill_id],a.skill_version);
  SELECT * INTO a FROM e2.attempts WHERE household_id=h AND learner_id=p_learner AND id=p_attempt FOR UPDATE;
  IF a.state=p_state THEN RETURN to_jsonb(a); END IF;
  IF a.state NOT IN ('issued','submitted') THEN RAISE EXCEPTION 'attempt is already terminal' USING ERRCODE='P0001'; END IF;
  UPDATE e2.skill_guards SET causal_seq=causal_seq+1 WHERE household_id=h AND learner_id=p_learner AND skill_id=a.skill_id;
  UPDATE e2.attempts SET state=p_state WHERE household_id=h AND id=a.id RETURNING * INTO a;
  RETURN to_jsonb(a);
END; $$;
ALTER FUNCTION e2.end_attempt(text,uuid,text) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.end_attempt(text,uuid,text) FROM PUBLIC;
CREATE OR REPLACE FUNCTION e2.expire_attempt(p_learner text,p_attempt uuid) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT e2.end_attempt(p_learner,p_attempt,'expired') $$;
CREATE OR REPLACE FUNCTION e2.cancel_attempt(p_learner text,p_attempt uuid) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT e2.end_attempt(p_learner,p_attempt,'cancelled') $$;
ALTER FUNCTION e2.expire_attempt(text,uuid) OWNER TO e2_writer;
ALTER FUNCTION e2.cancel_attempt(text,uuid) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.expire_attempt(text,uuid),e2.cancel_attempt(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.expire_attempt(text,uuid),e2.cancel_attempt(text,uuid) TO assessment;

-- Immutable queue entries; consumption is derived from one uniquely linked
-- evidence row. No mutable pending flag can be re-opened by a stale writer.
CREATE TABLE IF NOT EXISTS e2.practice_checks (
  household_id text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  learner_id text NOT NULL,
  skill_id text NOT NULL,
  skill_version text NOT NULL,
  check_id text NOT NULL,
  session_id text NOT NULL,
  rule_version text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT e2.operation_clock(),
  PRIMARY KEY(household_id,id),
  UNIQUE(household_id,learner_id,session_id,check_id),
  FOREIGN KEY(household_id,learner_id) REFERENCES e2.learners,
  FOREIGN KEY(household_id,rule_version) REFERENCES e2.rule_versions
);
ALTER TABLE e2.practice_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE e2.practice_checks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_isolation ON e2.practice_checks;
CREATE POLICY household_isolation ON e2.practice_checks USING(household_id=e2.household_id()) WITH CHECK(household_id=e2.household_id());
REVOKE ALL ON e2.practice_checks FROM PUBLIC,learner,tutor,report,assessment;
GRANT SELECT ON e2.practice_checks TO learner,tutor,report,assessment;
GRANT SELECT,INSERT ON e2.practice_checks TO e2_writer;
DROP TRIGGER IF EXISTS append_only ON e2.practice_checks;
CREATE TRIGGER append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON e2.practice_checks FOR EACH STATEMENT EXECUTE FUNCTION e2.reject_mutation();
ALTER TABLE e2.evidence_events ADD COLUMN IF NOT EXISTS practice_check_id uuid;
DO $$ BEGIN
  IF NOT EXISTS(SELECT FROM pg_constraint WHERE conrelid='e2.evidence_events'::regclass AND conname='practice_check_reference') THEN
    ALTER TABLE e2.evidence_events ADD CONSTRAINT practice_check_reference FOREIGN KEY(household_id,practice_check_id) REFERENCES e2.practice_checks;
    ALTER TABLE e2.evidence_events ADD CONSTRAINT practice_check_once UNIQUE(household_id,practice_check_id);
    ALTER TABLE e2.evidence_events ADD CONSTRAINT practice_check_unqualified CHECK(practice_check_id IS NULL OR (class='corrections-practice' AND NOT qualifying AND attempt_id IS NULL));
  END IF;
END; $$;
CREATE OR REPLACE VIEW e2.evidence_view WITH (security_invoker=true,security_barrier=true) AS SELECT * FROM e2.evidence_events;

CREATE OR REPLACE FUNCTION e2.queue_practice_check(p_learner text,p_skill text,p_version text,p_check text,p_session text,p_rule text DEFAULT 'e2-draft-1') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h text:=e2.household_id(); pending e2.practice_checks; BEGIN
  IF p_check IS NULL OR p_check='' OR p_session IS NULL OR p_session='' THEN RAISE EXCEPTION 'check and session required' USING ERRCODE='22023'; END IF;
  PERFORM e2.lock_skills(p_learner,ARRAY[p_skill],p_version);
  SELECT * INTO pending FROM e2.practice_checks WHERE household_id=h AND learner_id=p_learner AND session_id=p_session AND check_id=p_check;
  IF FOUND THEN
    IF pending.skill_id IS DISTINCT FROM p_skill OR pending.skill_version IS DISTINCT FROM p_version OR pending.rule_version IS DISTINCT FROM p_rule THEN RAISE EXCEPTION 'practice check conflict' USING ERRCODE='P0001'; END IF;
    RETURN to_jsonb(pending);
  END IF;
  IF EXISTS(SELECT FROM e2.practice_checks p WHERE p.household_id=h AND p.learner_id=p_learner AND p.skill_id=p_skill AND p.session_id=p_session
    AND NOT EXISTS(SELECT FROM e2.evidence_events e WHERE e.household_id=h AND e.practice_check_id=p.id)) THEN
    RAISE EXCEPTION 'a practice check is pending' USING ERRCODE='P0001';
  END IF;
  UPDATE e2.skill_guards SET causal_seq=causal_seq+1 WHERE household_id=h AND learner_id=p_learner AND skill_id=p_skill;
  INSERT INTO e2.practice_checks(household_id,learner_id,skill_id,skill_version,check_id,session_id,rule_version)
    VALUES(h,p_learner,p_skill,p_version,p_check,p_session,p_rule) RETURNING * INTO pending;
  RETURN to_jsonb(pending);
END; $$;
ALTER FUNCTION e2.queue_practice_check(text,text,text,text,text,text) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.queue_practice_check(text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.queue_practice_check(text,text,text,text,text,text) TO tutor,assessment;

CREATE OR REPLACE FUNCTION e2.practice_check(p_learner text,p_skill text,p_version text,p_operation text,p_session text,p_payload jsonb,p_provenance jsonb,p_rule text DEFAULT 'e2-draft-1') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h text:=e2.household_id(); pending e2.practice_checks; e e2.evidence_events; seq bigint; BEGIN
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
    VALUES(h,p_learner,'practice-check:'||p_operation,p_session,p_skill,p_version,seq,'corrections-practice',false,p_payload,p_provenance,p_rule,pending.id) RETURNING * INTO e;
  RETURN jsonb_build_object('ok',true,'evidence',to_jsonb(e));
END; $$;
ALTER FUNCTION e2.practice_check(text,text,text,text,text,jsonb,jsonb,text) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.practice_check(text,text,text,text,text,jsonb,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.practice_check(text,text,text,text,text,jsonb,jsonb,text) TO tutor,assessment;

-- Existing signatures now use the protected clock and revocation-aware rebuild.
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
  UPDATE e2.attempts SET state='submitted',response=p_response,submitted_at=e2.operation_clock() WHERE household_id=h AND id=p_attempt RETURNING * INTO a;
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
  RETURN to_jsonb(e);
END; $$;
ALTER FUNCTION e2.record_exposure(text,text[],text,text,text,jsonb,jsonb,text) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.record_exposure(text,text[],text,text,text,jsonb,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.record_exposure(text,text[],text,text,text,jsonb,jsonb,text) TO tutor,assessment;

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
