-- Forward-only, migration-managed offer ledger. Adopt B's provisional fixture
-- without discarding its rows; new calls always use the writer function.
CREATE TABLE IF NOT EXISTS e2.assessment_offers (
  household_id text NOT NULL REFERENCES e2.households,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  seq bigint GENERATED ALWAYS AS IDENTITY,
  learner_id text NOT NULL,
  skill_id text NOT NULL,
  operation_id text NOT NULL,
  kind text NOT NULL CHECK(kind IN ('offered','taken','restarted','escalated')),
  offer_id uuid,
  exposure_seq bigint NOT NULL CHECK(exposure_seq>=0),
  causal_seq bigint NOT NULL,
  open boolean NOT NULL DEFAULT false,
  request jsonb NOT NULL CHECK(jsonb_typeof(request)='object'),
  reason jsonb NOT NULL CHECK(jsonb_typeof(reason)='object'),
  provenance jsonb NOT NULL,
  at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  rule_version text NOT NULL,
  PRIMARY KEY(household_id,id),
  FOREIGN KEY(household_id,learner_id) REFERENCES e2.learners,
  CHECK(NOT open OR kind='offered'),
  CHECK((kind IN ('taken','restarted')) = (offer_id IS NOT NULL))
);
-- The proposal may already exist as B's fixture. Add authority metadata without
-- changing any of its original columns. The migration transaction hides this
-- brief trigger replacement; ordinary callers have no table write grants below.
ALTER TABLE e2.assessment_offers ADD COLUMN IF NOT EXISTS operation_id text;
ALTER TABLE e2.assessment_offers ADD COLUMN IF NOT EXISTS causal_seq bigint;
ALTER TABLE e2.assessment_offers ADD COLUMN IF NOT EXISTS request jsonb;
ALTER TABLE e2.assessment_offers ADD COLUMN IF NOT EXISTS provenance jsonb;
DROP TRIGGER IF EXISTS close_only ON e2.assessment_offers;
UPDATE e2.assessment_offers SET
  operation_id=coalesce(operation_id,'legacy:'||id::text),
  causal_seq=coalesce(causal_seq,exposure_seq),
  request=coalesce(request,reason||jsonb_build_object('operationId','legacy:'||id::text)),
  provenance=coalesce(provenance,jsonb_build_object('source','B-provisional-fixture','causalSeqIsExposureSnapshot',true))
  WHERE operation_id IS NULL OR causal_seq IS NULL OR request IS NULL OR provenance IS NULL;
ALTER TABLE e2.assessment_offers ALTER COLUMN operation_id SET NOT NULL;
ALTER TABLE e2.assessment_offers ALTER COLUMN causal_seq SET NOT NULL;
ALTER TABLE e2.assessment_offers ALTER COLUMN request SET NOT NULL;
ALTER TABLE e2.assessment_offers ALTER COLUMN provenance SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS assessment_offers_operation
  ON e2.assessment_offers(household_id,learner_id,operation_id);
CREATE UNIQUE INDEX IF NOT EXISTS assessment_offers_scope_id
  ON e2.assessment_offers(household_id,learner_id,skill_id,id);
DO $$ BEGIN
  IF NOT EXISTS(SELECT FROM pg_constraint WHERE conrelid='e2.assessment_offers'::regclass AND conname='assessment_offers_rule_fk') THEN
    ALTER TABLE e2.assessment_offers ADD CONSTRAINT assessment_offers_rule_fk
      FOREIGN KEY(household_id,rule_version) REFERENCES e2.rule_versions;
  END IF;
  IF NOT EXISTS(SELECT FROM pg_constraint WHERE conrelid='e2.assessment_offers'::regclass AND conname='assessment_offers_offer_fk') THEN
    ALTER TABLE e2.assessment_offers ADD CONSTRAINT assessment_offers_offer_fk
      FOREIGN KEY(household_id,learner_id,skill_id,offer_id)
      REFERENCES e2.assessment_offers(household_id,learner_id,skill_id,id);
  END IF;
  IF NOT EXISTS(SELECT FROM pg_constraint WHERE conrelid='e2.assessment_offers'::regclass AND conname='assessment_offers_metadata_check') THEN
    ALTER TABLE e2.assessment_offers ADD CONSTRAINT assessment_offers_metadata_check
      CHECK(exposure_seq>=0 AND jsonb_typeof(request)='object' AND jsonb_typeof(reason)='object');
  END IF;
END; $$;
CREATE UNIQUE INDEX IF NOT EXISTS assessment_offers_one_open
  ON e2.assessment_offers(household_id,learner_id,skill_id) WHERE kind='offered' AND open;
CREATE UNIQUE INDEX IF NOT EXISTS assessment_offers_one_take
  ON e2.assessment_offers(household_id,offer_id) WHERE kind='taken';
CREATE UNIQUE INDEX IF NOT EXISTS assessment_offers_one_restart
  ON e2.assessment_offers(household_id,offer_id) WHERE kind='restarted';
ALTER TABLE e2.assessment_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE e2.assessment_offers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_isolation ON e2.assessment_offers;
CREATE POLICY household_isolation ON e2.assessment_offers
  USING(household_id=e2.household_id()) WITH CHECK(household_id=e2.household_id());

CREATE OR REPLACE FUNCTION e2.assessment_offers_close_only() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'assessment offer history is retained' USING ERRCODE='55000';
  END IF;
  IF NOT OLD.open OR NEW.open OR
     (to_jsonb(NEW)-'open') IS DISTINCT FROM (to_jsonb(OLD)-'open') THEN
    RAISE EXCEPTION 'only closing an open offer may change a row' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION e2.assessment_offers_close_only() FROM PUBLIC;
DROP TRIGGER IF EXISTS close_only ON e2.assessment_offers;
CREATE TRIGGER close_only BEFORE UPDATE OR DELETE ON e2.assessment_offers
  FOR EACH ROW EXECUTE FUNCTION e2.assessment_offers_close_only();
DROP TRIGGER IF EXISTS no_truncate ON e2.assessment_offers;
CREATE TRIGGER no_truncate BEFORE TRUNCATE ON e2.assessment_offers
  FOR EACH STATEMENT EXECUTE FUNCTION e2.reject_mutation();
REVOKE ALL ON e2.assessment_offers FROM PUBLIC,learner,tutor,report,assessment,e2_writer;
-- Column ACLs survive a table-level REVOKE; remove B's interim column grant too.
REVOKE UPDATE(open) ON e2.assessment_offers FROM PUBLIC,learner,tutor,report,assessment;
GRANT SELECT ON e2.assessment_offers TO learner,tutor,report,assessment,e2_writer;
GRANT INSERT,UPDATE(open) ON e2.assessment_offers TO e2_writer;
GRANT USAGE ON SEQUENCE e2.assessment_offers_seq_seq TO e2_writer;

CREATE OR REPLACE FUNCTION e2.offer_transition(p_learner text,p_skill text,p_kind text,p_offer uuid,p_reason jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE
  h text:=e2.household_id(); op text; rule_id text; row_kind text;
  prior e2.assessment_offers; offered e2.assessment_offers; result e2.assessment_offers;
  g e2.skill_guards; params jsonb; reason jsonb;
  stamp timestamptz; priority_at timestamptz; priority_seq bigint; delay_hours numeric; escalation_days numeric;
  required_reps integer; clean_reps bigint; restarts bigint; seq bigint; eligible boolean;
BEGIN
  IF h IS NULL THEN RAISE EXCEPTION 'missing household principal' USING ERRCODE='42501'; END IF;
  IF p_learner IS NULL OR p_skill IS NULL OR p_skill='' OR
     p_kind IS NULL OR p_kind NOT IN ('offer','take','restart','escalate') OR
     p_reason IS NULL OR jsonb_typeof(p_reason)<>'object' OR
     jsonb_typeof(p_reason->'operationId') IS DISTINCT FROM 'string' OR
     coalesce(p_reason->>'operationId','')='' THEN
    RAISE EXCEPTION 'offer request requires scope, kind and reason.operationId' USING ERRCODE='P0001';
  END IF;
  IF (p_kind IN ('take','restart')) IS DISTINCT FROM (p_offer IS NOT NULL) THEN
    RAISE EXCEPTION 'take/restart require an offer; offer/escalate require null' USING ERRCODE='P0001';
  END IF;
  op:=p_reason->>'operationId';
  rule_id:=coalesce(p_reason->>'ruleVersion','e2-draft-1');
  row_kind:=CASE p_kind WHEN 'offer' THEN 'offered' WHEN 'take' THEN 'taken' WHEN 'restart' THEN 'restarted' ELSE 'escalated' END;
  IF NOT EXISTS(SELECT FROM e2.learners WHERE household_id=h AND id=p_learner) THEN
    RAISE EXCEPTION 'learner unavailable' USING ERRCODE='P0002';
  END IF;
  PERFORM e2.lock_skills(p_learner,ARRAY[p_skill],rule_id);
  SELECT * INTO prior FROM e2.assessment_offers
    WHERE household_id=h AND learner_id=p_learner AND operation_id=op;
  IF FOUND THEN
    IF prior.skill_id IS DISTINCT FROM p_skill OR prior.kind IS DISTINCT FROM row_kind OR
       prior.offer_id IS DISTINCT FROM p_offer OR prior.request IS DISTINCT FROM p_reason THEN
      RAISE EXCEPTION 'offer operation conflict' USING ERRCODE='P0001';
    END IF;
    RETURN to_jsonb(prior);
  END IF;
  IF p_offer IS NOT NULL THEN
    SELECT * INTO offered FROM e2.assessment_offers WHERE household_id=h AND learner_id=p_learner
      AND skill_id=p_skill AND id=p_offer AND kind='offered' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'offer unavailable' USING ERRCODE='P0002'; END IF;
    IF offered.rule_version IS DISTINCT FROM rule_id THEN
      RAISE EXCEPTION 'offer rule version conflict' USING ERRCODE='P0001';
    END IF;
    IF NOT offered.open THEN RAISE EXCEPTION 'offer_closed' USING ERRCODE='P0001'; END IF;
  END IF;
  SELECT parameters INTO params FROM e2.rule_versions WHERE household_id=h AND id=rule_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'rule version unavailable' USING ERRCODE='P0002'; END IF;
  -- These defaults match e2-draft-1 when older fixtures only stored delayHours.
  delay_hours:=(params->>'delayHours')::numeric;
  escalation_days:=coalesce((params->>'escalationDays')::numeric,14);
  IF delay_hours IS NULL OR delay_hours<48 OR escalation_days<14 OR
     coalesce((params->>'quietWindowReps')::numeric,10)<1 OR
     trunc(coalesce((params->>'quietWindowReps')::numeric,10))<>coalesce((params->>'quietWindowReps')::numeric,10) THEN
    RAISE EXCEPTION 'invalid offer rule parameters' USING ERRCODE='P0001';
  END IF;
  required_reps:=coalesce((params->>'quietWindowReps')::integer,10);
  SELECT * INTO g FROM e2.skill_guards WHERE household_id=h AND learner_id=p_learner AND skill_id=p_skill;
  -- B uses now(); keeping transaction time makes long transactions conservative.
  -- Causal ordering is always from exposure_seq, even when timestamps are equal.
  stamp:=transaction_timestamp();
  eligible:=g.last_exposure_at IS NULL OR stamp>=g.last_exposure_at+delay_hours*interval '1 hour';
  IF p_kind='take' AND g.exposure_seq>offered.exposure_seq THEN
    RAISE EXCEPTION 'help_after_offer' USING ERRCODE='P0001',
      DETAIL=jsonb_build_object('reason','help_after_offer','offerExposureSeq',offered.exposure_seq,'exposureSeq',g.exposure_seq,'lastExposureAt',g.last_exposure_at)::text;
  END IF;
  IF p_kind IN ('offer','take') AND NOT eligible THEN
    RAISE EXCEPTION 'quiet_window_not_elapsed' USING ERRCODE='P0001',
      DETAIL=jsonb_build_object('reason','quiet_window_not_elapsed','eligibleAt',g.last_exposure_at+delay_hours*interval '1 hour','delayHours',delay_hours)::text;
  END IF;
  IF p_kind='restart' AND g.exposure_seq<=offered.exposure_seq THEN
    RAISE EXCEPTION 'no_help_after_offer' USING ERRCODE='P0001';
  END IF;
  reason:=p_reason||jsonb_build_object('exposureSeq',g.exposure_seq,'lastExposureAt',g.last_exposure_at,'delayHours',delay_hours);
  IF p_kind IN ('offer','escalate') THEN
    SELECT count(*) INTO clean_reps FROM e2.evidence_events WHERE household_id=h AND learner_id=p_learner
      AND skill_id=p_skill AND class='corrections-practice' AND payload->'correct'='true'::jsonb
      AND (NOT payload ? 'assisted' OR payload->'assisted'='false'::jsonb);
    IF clean_reps<required_reps THEN RAISE EXCEPTION 'practice_priority_not_reached' USING ERRCODE='P0001'; END IF;
    SELECT received_at,causal_seq INTO priority_at,priority_seq FROM e2.evidence_events WHERE household_id=h AND learner_id=p_learner
      AND skill_id=p_skill AND class='corrections-practice' AND payload->'correct'='true'::jsonb
      AND (NOT payload ? 'assisted' OR payload->'assisted'='false'::jsonb) ORDER BY causal_seq,received_at,id OFFSET required_reps-1 LIMIT 1;
    IF EXISTS(SELECT FROM e2.assessment_offers WHERE household_id=h AND learner_id=p_learner AND skill_id=p_skill AND open) THEN
      RAISE EXCEPTION 'open_offer_exists; restart an invalidated offer first' USING ERRCODE='P0001';
    END IF;
    reason:=reason||jsonb_build_object('cleanReps',clean_reps,'requiredReps',required_reps,'priorityAt',priority_at,'prioritySeq',priority_seq);
    IF p_kind='escalate' THEN
      IF eligible OR stamp<priority_at+escalation_days*interval '24 hours' OR
         EXISTS(SELECT FROM e2.assessment_offers WHERE household_id=h AND learner_id=p_learner AND skill_id=p_skill AND kind='taken' AND
           (causal_seq>priority_seq OR (provenance->>'source'='B-provisional-fixture' AND at>=priority_at))) THEN
        RAISE EXCEPTION 'no_window_escalation_not_due' USING ERRCODE='P0001';
      END IF;
      SELECT count(*) INTO restarts FROM e2.assessment_offers WHERE household_id=h AND learner_id=p_learner
        AND skill_id=p_skill AND kind='restarted' AND
        (causal_seq>priority_seq OR (provenance->>'source'='B-provisional-fixture' AND at>=priority_at));
      reason:=reason||jsonb_build_object('since',priority_at,'heldMicros',extract(epoch FROM stamp-priority_at)*1000000,
        'restarts',restarts,'escalationDays',escalation_days,
        'explanation',format('Skill %s has held practice priority for at least %s days without a taken check; help is still restarting its %s-hour quiet window (%s recorded restarts).',p_skill,escalation_days,delay_hours,restarts),
        'plan',format('For the next %s hours, help freely with other skills and pause teaching this skill; offer its independent check when the quiet window elapses.',delay_hours));
    END IF;
  ELSE
    reason:=reason||jsonb_build_object('offerId',p_offer,'offerExposureSeq',offered.exposure_seq);
  END IF;
  -- Write the guard on every successful new transition: stale RR/serializable
  -- snapshots fail 40001 rather than reading through a prior offer transition.
  UPDATE e2.skill_guards SET causal_seq=causal_seq+1 WHERE household_id=h AND learner_id=p_learner AND skill_id=p_skill
    RETURNING causal_seq INTO seq;
  INSERT INTO e2.assessment_offers(household_id,learner_id,skill_id,operation_id,kind,offer_id,exposure_seq,causal_seq,open,request,reason,provenance,at,rule_version)
    VALUES(h,p_learner,p_skill,op,row_kind,p_offer,g.exposure_seq,seq,p_kind='offer',p_reason,reason,
      jsonb_build_object('source','e2.offer_transition','login',session_user),stamp,rule_id) RETURNING * INTO result;
  IF p_offer IS NOT NULL THEN
    UPDATE e2.assessment_offers SET open=false WHERE household_id=h AND id=p_offer;
  END IF;
  RETURN to_jsonb(result);
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RAISE EXCEPTION 'invalid offer rule parameters' USING ERRCODE='P0001';
WHEN unique_violation THEN
  RAISE EXCEPTION 'offer operation conflict' USING ERRCODE='P0001';
END; $$;
ALTER FUNCTION e2.offer_transition(text,text,text,uuid,jsonb) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.offer_transition(text,text,text,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.offer_transition(text,text,text,uuid,jsonb) TO tutor,assessment,learner;
