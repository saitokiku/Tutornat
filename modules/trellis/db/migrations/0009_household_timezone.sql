-- Account provisioning remains owner-only. Changes are validated and audited
-- even when made directly by that trusted owner; application grants do not grow.
CREATE TABLE IF NOT EXISTS e2.household_timezone_events (
  household_id text NOT NULL REFERENCES e2.households,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_order bigint GENERATED ALWAYS AS IDENTITY,
  old_timezone text,
  new_timezone text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT e2.operation_clock(),
  rule_version text NOT NULL DEFAULT 'e2-draft-1',
  provenance jsonb NOT NULL
);
ALTER TABLE e2.household_timezone_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE e2.household_timezone_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_isolation ON e2.household_timezone_events;
CREATE POLICY household_isolation ON e2.household_timezone_events
  USING(household_id=e2.household_id()) WITH CHECK(household_id=e2.household_id());
REVOKE ALL ON e2.household_timezone_events FROM PUBLIC,learner,tutor,report,assessment;
GRANT SELECT ON e2.household_timezone_events TO learner,tutor,report,assessment;
DROP TRIGGER IF EXISTS append_only ON e2.household_timezone_events;
CREATE TRIGGER append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON e2.household_timezone_events
  FOR EACH STATEMENT EXECUTE FUNCTION e2.reject_mutation();

CREATE OR REPLACE FUNCTION e2.validate_household_timezone() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
  IF NOT EXISTS(SELECT FROM pg_timezone_names WHERE name=NEW.timezone) THEN
    RAISE EXCEPTION 'household timezone must be an IANA timezone' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION e2.validate_household_timezone() FROM PUBLIC;
DROP TRIGGER IF EXISTS validate_household_timezone ON e2.households;
CREATE TRIGGER validate_household_timezone BEFORE INSERT OR UPDATE OF timezone ON e2.households
  FOR EACH ROW EXECUTE FUNCTION e2.validate_household_timezone();
CREATE OR REPLACE FUNCTION e2.audit_household_timezone() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO e2.household_timezone_events(household_id,old_timezone,new_timezone,provenance)
      VALUES(NEW.household_id,NULL,NEW.timezone,jsonb_build_object('source','account-creation','login',session_user));
  ELSIF NEW.timezone IS DISTINCT FROM OLD.timezone THEN
    INSERT INTO e2.household_timezone_events(household_id,old_timezone,new_timezone,provenance)
      VALUES(NEW.household_id,OLD.timezone,NEW.timezone,jsonb_build_object('source','timezone-change','login',session_user));
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION e2.audit_household_timezone() FROM PUBLIC;
DROP TRIGGER IF EXISTS audit_household_timezone ON e2.households;
CREATE TRIGGER audit_household_timezone AFTER INSERT OR UPDATE OF timezone ON e2.households
  FOR EACH ROW EXECUTE FUNCTION e2.audit_household_timezone();
GRANT SELECT ON e2.households TO e2_writer;
