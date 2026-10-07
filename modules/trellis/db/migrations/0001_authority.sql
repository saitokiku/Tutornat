-- Forward-only: event history must not be destroyed by an automatic down migration.
-- Apply through db/migrate.cjs (transaction + advisory migration lock + checksum).
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'learner') THEN CREATE ROLE learner NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'tutor') THEN CREATE ROLE tutor NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'report') THEN CREATE ROLE report NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'assessment') THEN CREATE ROLE assessment NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'e2_writer') THEN CREATE ROLE e2_writer NOLOGIN; END IF;
END; $$;
ALTER ROLE learner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
ALTER ROLE tutor NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
ALTER ROLE report NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
ALTER ROLE assessment NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
ALTER ROLE e2_writer NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
-- Remove inherited capabilities from the application roles, including indirect
-- membership chains left by an earlier local fixture configuration.
DO $$ DECLARE membership record; BEGIN
  FOR membership IN SELECT parent.rolname AS parent_name, child.rolname AS child_name
    FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid JOIN pg_roles child ON child.oid=m.member
    WHERE child.rolname IN ('learner','tutor','report','assessment','e2_writer') LOOP
    EXECUTE format('REVOKE %I FROM %I CASCADE',membership.parent_name,membership.child_name);
  END LOOP;
END; $$;
CREATE SCHEMA IF NOT EXISTS e2;
REVOKE ALL ON SCHEMA e2 FROM PUBLIC;
GRANT USAGE ON SCHEMA e2 TO learner, tutor, report, assessment, e2_writer;
-- An immutable login binding, provisioned only by the fixture/migration owner.
-- No custom GUC is trusted for tenant identity.
CREATE TABLE IF NOT EXISTS e2.principals (
  login name PRIMARY KEY,
  household_id text NOT NULL
);
ALTER TABLE e2.principals ENABLE ROW LEVEL SECURITY;
ALTER TABLE e2.principals FORCE ROW LEVEL SECURITY;
REVOKE ALL ON e2.principals FROM PUBLIC, learner, tutor, report, assessment, e2_writer;
CREATE OR REPLACE FUNCTION e2.household_id() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $$ SELECT household_id FROM e2.principals WHERE login = session_user $$;
REVOKE ALL ON FUNCTION e2.household_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.household_id() TO learner, tutor, report, assessment, e2_writer;

CREATE TABLE IF NOT EXISTS e2.households (
  household_id text PRIMARY KEY,
  timezone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE IF NOT EXISTS e2.learners (
  household_id text NOT NULL REFERENCES e2.households,
  id text NOT NULL,
  PRIMARY KEY(household_id, id)
);
CREATE TABLE IF NOT EXISTS e2.rule_versions (
  household_id text NOT NULL REFERENCES e2.households,
  id text NOT NULL,
  parameters jsonb NOT NULL CHECK(parameters ? 'delayHours' AND jsonb_typeof(parameters->'delayHours')='number' AND (parameters->>'delayHours')::numeric>=48),
  provenance jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(household_id, id)
);
CREATE TABLE IF NOT EXISTS e2.rubrics (
  household_id text NOT NULL REFERENCES e2.households,
  id text NOT NULL,
  version text NOT NULL,
  approval text NOT NULL CHECK(approval IN ('draft','approved','rejected')),
  content jsonb NOT NULL,
  provenance jsonb NOT NULL,
  PRIMARY KEY(household_id, id, version)
);
CREATE TABLE IF NOT EXISTS e2.items (
  household_id text NOT NULL REFERENCES e2.households,
  id text NOT NULL,
  version text NOT NULL,
  key_version text NOT NULL,
  rubric_id text NOT NULL,
  rubric_version text NOT NULL,
  skill_id text NOT NULL,
  skill_version text NOT NULL,
  family_id text NOT NULL,
  context_tag text NOT NULL,
  approval text NOT NULL CHECK(approval IN ('draft','approved','rejected')),
  content jsonb NOT NULL,
  answer_key jsonb NOT NULL,
  provenance jsonb NOT NULL,
  PRIMARY KEY(household_id, id, version),
  FOREIGN KEY(household_id, rubric_id, rubric_version) REFERENCES e2.rubrics
);
CREATE TABLE IF NOT EXISTS e2.content_guards (
  household_id text NOT NULL REFERENCES e2.households,
  target_kind text NOT NULL CHECK(target_kind IN ('item','rubric')),
  target_id text NOT NULL,
  target_version text NOT NULL,
  revision bigint NOT NULL DEFAULT 0,
  PRIMARY KEY(household_id,target_kind,target_id,target_version)
);
CREATE TABLE IF NOT EXISTS e2.content_revocations (
  household_id text NOT NULL REFERENCES e2.households,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  target_kind text NOT NULL CHECK(target_kind IN ('item','rubric')),
  target_id text NOT NULL,
  target_version text NOT NULL,
  reason text NOT NULL,
  provenance jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(household_id,id)
);
CREATE TABLE IF NOT EXISTS e2.skill_guards (
  household_id text NOT NULL,
  learner_id text NOT NULL,
  skill_id text NOT NULL,
  causal_seq bigint NOT NULL DEFAULT 0,
  exposure_seq bigint NOT NULL DEFAULT 0,
  last_exposure_at timestamptz,
  PRIMARY KEY(household_id, learner_id, skill_id),
  FOREIGN KEY(household_id, learner_id) REFERENCES e2.learners
);
CREATE TABLE IF NOT EXISTS e2.attempts (
  household_id text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  operation_id text NOT NULL,
  issue_order bigint GENERATED ALWAYS AS IDENTITY,
  learner_id text NOT NULL,
  item_id text NOT NULL,
  item_version text NOT NULL,
  key_version text NOT NULL,
  rubric_id text NOT NULL,
  rubric_version text NOT NULL,
  skill_id text NOT NULL,
  skill_version text NOT NULL,
  family_id text NOT NULL,
  context_tag text NOT NULL,
  scorer_id text NOT NULL,
  scorer_version text NOT NULL,
  rule_version text NOT NULL,
  session_id text NOT NULL,
  state text NOT NULL DEFAULT 'issued' CHECK(state IN ('issued','submitted','finalized','expired','cancelled')),
  issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  issued_seq bigint NOT NULL,
  exposure_seq bigint NOT NULL,
  response jsonb,
  submitted_at timestamptz,
  finalized_at timestamptz,
  assistance_latched boolean NOT NULL DEFAULT false,
  final_result jsonb,
  PRIMARY KEY(household_id, id),
  UNIQUE(household_id, learner_id, operation_id),
  FOREIGN KEY(household_id, learner_id) REFERENCES e2.learners,
  FOREIGN KEY(household_id, item_id, item_version) REFERENCES e2.items,
  FOREIGN KEY(household_id, rubric_id, rubric_version) REFERENCES e2.rubrics,
  FOREIGN KEY(household_id, rule_version) REFERENCES e2.rule_versions,
  CHECK(state NOT IN ('submitted','finalized') OR response IS NOT NULL),
  CHECK((state = 'finalized') = (final_result IS NOT NULL)),
  CHECK((state = 'finalized') = (finalized_at IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS e2.exposure_events (
  household_id text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  learner_id text NOT NULL,
  operation_id text NOT NULL,
  session_id text NOT NULL,
  skill_ids text[] NOT NULL CHECK(cardinality(skill_ids)>0),
  skill_version text NOT NULL,
  causal_sequences jsonb NOT NULL,
  class text NOT NULL DEFAULT 'assisted-help' CHECK(class='assisted-help'),
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  payload jsonb NOT NULL,
  provenance jsonb NOT NULL,
  rule_version text NOT NULL,
  PRIMARY KEY(household_id,id),
  UNIQUE(household_id,learner_id,operation_id),
  FOREIGN KEY(household_id,learner_id) REFERENCES e2.learners,
  FOREIGN KEY(household_id,rule_version) REFERENCES e2.rule_versions
);
CREATE TABLE IF NOT EXISTS e2.evidence_events (
  household_id text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  learner_id text NOT NULL,
  operation_id text NOT NULL,
  attempt_id uuid,
  session_id text NOT NULL,
  skill_id text NOT NULL,
  skill_version text NOT NULL,
  causal_seq bigint NOT NULL,
  class text NOT NULL CHECK(class IN ('assisted-help','corrections-practice','unassisted-attempt','delayed-retention')),
  qualifying boolean NOT NULL DEFAULT false,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  payload jsonb NOT NULL,
  provenance jsonb NOT NULL,
  rule_version text NOT NULL,
  PRIMARY KEY(household_id,id),
  UNIQUE(household_id,learner_id,operation_id),
  UNIQUE(household_id,attempt_id),
  FOREIGN KEY(household_id,learner_id) REFERENCES e2.learners,
  FOREIGN KEY(household_id,attempt_id) REFERENCES e2.attempts,
  FOREIGN KEY(household_id,rule_version) REFERENCES e2.rule_versions,
  CHECK(NOT qualifying OR (attempt_id IS NOT NULL AND class IN ('unassisted-attempt','delayed-retention')))
);
CREATE TABLE IF NOT EXISTS e2.projections (
  household_id text NOT NULL,
  learner_id text NOT NULL,
  skill_id text NOT NULL,
  skill_version text NOT NULL,
  rule_version text NOT NULL,
  evidence_ids uuid[] NOT NULL,
  independent_successes integer NOT NULL CHECK(independent_successes>=0),
  certification text NOT NULL DEFAULT 'none' CHECK(certification='none'),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(household_id,learner_id,skill_id,skill_version,rule_version),
  FOREIGN KEY(household_id,learner_id) REFERENCES e2.learners,
  FOREIGN KEY(household_id,rule_version) REFERENCES e2.rule_versions
);
-- All tenant data uses the same login-bound policy, including internal state.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['households','learners','rule_versions','rubrics','items','content_guards','content_revocations','skill_guards','attempts','exposure_events','evidence_events','projections'] LOOP
    EXECUTE format('ALTER TABLE e2.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE e2.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS household_isolation ON e2.%I', t);
    EXECUTE format('CREATE POLICY household_isolation ON e2.%I USING(household_id=e2.household_id()) WITH CHECK(household_id=e2.household_id())', t);
  END LOOP;
END; $$;
CREATE OR REPLACE FUNCTION e2.reject_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE='55000';
END; $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['rule_versions','rubrics','items','content_revocations','exposure_events','evidence_events'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS append_only ON e2.%I',t);
    EXECUTE format('CREATE TRIGGER append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON e2.%I FOR EACH STATEMENT EXECUTE FUNCTION e2.reject_mutation()',t);
  END LOOP;
END; $$;
CREATE OR REPLACE FUNCTION e2.freeze_attempt() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'attempt history is retained' USING ERRCODE='55000'; END IF;
  IF (to_jsonb(NEW)-ARRAY['state','response','submitted_at','finalized_at','assistance_latched','final_result']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['state','response','submitted_at','finalized_at','assistance_latched','final_result']) THEN
    RAISE EXCEPTION 'attempt provenance is frozen' USING ERRCODE='55000';
  END IF;
  IF OLD.assistance_latched AND NOT NEW.assistance_latched THEN
    RAISE EXCEPTION 'assistance latch is permanent' USING ERRCODE='55000';
  END IF;
  IF OLD.response IS NOT NULL AND NEW.response IS DISTINCT FROM OLD.response THEN
    RAISE EXCEPTION 'response conflict' USING ERRCODE='P0001';
  END IF;
  IF OLD.state IN ('finalized','expired','cancelled') AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'terminal attempt is frozen' USING ERRCODE='55000';
  END IF;
  IF NEW.state IS DISTINCT FROM OLD.state AND NOT
    ((OLD.state='issued' AND NEW.state IN ('submitted','expired','cancelled')) OR
     (OLD.state='submitted' AND NEW.state IN ('finalized','expired','cancelled'))) THEN
    RAISE EXCEPTION 'invalid attempt transition' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS freeze_attempt ON e2.attempts;
CREATE TRIGGER freeze_attempt BEFORE UPDATE OR DELETE ON e2.attempts FOR EACH ROW EXECUTE FUNCTION e2.freeze_attempt();
-- Views execute with the caller's privileges/RLS, including an updatable evidence view.
CREATE OR REPLACE VIEW e2.report_projection WITH (security_invoker=true, security_barrier=true) AS
  SELECT household_id,learner_id,skill_id,skill_version,rule_version,evidence_ids,independent_successes,certification,updated_at FROM e2.projections;
CREATE OR REPLACE VIEW e2.evidence_view WITH (security_invoker=true, security_barrier=true) AS SELECT * FROM e2.evidence_events;
CREATE OR REPLACE VIEW e2.item_presentations WITH (security_invoker=true, security_barrier=true) AS
  SELECT household_id,id,version,skill_id,skill_version,family_id,context_tag,content FROM e2.items;
REVOKE ALL ON ALL TABLES IN SCHEMA e2 FROM PUBLIC,learner,tutor,report,assessment;
GRANT SELECT ON e2.households,e2.learners,e2.rule_versions,e2.content_guards,e2.content_revocations,e2.skill_guards,e2.attempts,e2.exposure_events,e2.evidence_events,e2.projections,e2.report_projection,e2.evidence_view TO learner,tutor,report,assessment;
GRANT SELECT(household_id,id,version,skill_id,skill_version,family_id,context_tag,content) ON e2.items TO learner,tutor,report;
GRANT SELECT ON e2.item_presentations TO learner,tutor,report,assessment;
GRANT SELECT ON e2.items,e2.rubrics TO assessment;
GRANT SELECT,INSERT,UPDATE ON e2.content_guards,e2.skill_guards,e2.attempts,e2.projections TO e2_writer;
GRANT SELECT,INSERT ON e2.exposure_events,e2.evidence_events TO e2_writer;
GRANT SELECT ON e2.items,e2.rubrics,e2.rule_versions,e2.learners,e2.content_revocations TO e2_writer;
-- Ordinary roles cannot call trigger helpers directly or inherit the internal writer.
REVOKE ALL ON FUNCTION e2.reject_mutation(),e2.freeze_attempt() FROM PUBLIC;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA e2 TO e2_writer;

-- A revocation serializes with issue/finalize on the same content version.
CREATE OR REPLACE FUNCTION e2.lock_content_revocation() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(array_to_json(ARRAY['e2-content',NEW.household_id,NEW.target_kind,NEW.target_id,NEW.target_version])::text,0));
  INSERT INTO e2.content_guards(household_id,target_kind,target_id,target_version,revision)
    VALUES(NEW.household_id,NEW.target_kind,NEW.target_id,NEW.target_version,1)
    ON CONFLICT(household_id,target_kind,target_id,target_version) DO UPDATE SET revision=e2.content_guards.revision+1;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION e2.lock_content_revocation() FROM PUBLIC;
DROP TRIGGER IF EXISTS lock_content_revocation ON e2.content_revocations;
CREATE TRIGGER lock_content_revocation BEFORE INSERT ON e2.content_revocations FOR EACH ROW EXECUTE FUNCTION e2.lock_content_revocation();
