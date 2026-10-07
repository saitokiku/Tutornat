-- Compatibility fixture for the unchanged E1 suite only. This is not the E2
-- authority schema. The adapter creates it in a fresh, private test schema.
CREATE FUNCTION fixture_now() RETURNS timestamptz LANGUAGE sql STABLE AS
  $$ SELECT current_setting('e1.fixture_time')::timestamptz $$;
CREATE TABLE accounts(id text PRIMARY KEY);
CREATE TABLE learners(id text PRIMARY KEY, account_id text, age_band text);
CREATE TABLE sessions(id text PRIMARY KEY, account_id text, learner_id text, started_at timestamptz,
  ended_at timestamptz, minutes integer DEFAULT 0, mode text DEFAULT 'text', cost_cents integer DEFAULT 0,
  thumbs text, phase text, skill_id text, coursework_id text, summary jsonb, state jsonb);
CREATE TABLE turns(id text PRIMARY KEY, account_id text, session_id text, role text, text text, audio_ms integer,
  latency_ms integer, model text, cost_cents integer DEFAULT 0, client_turn_id text, ts timestamptz);
CREATE TABLE skills(id text PRIMARY KEY, name text, prereqs jsonb DEFAULT '[]', tags jsonb DEFAULT '[]',
  slice text, ordinal integer DEFAULT 0);
CREATE TABLE check_items(id text PRIMARY KEY, skill_id text, type text, stem text, options jsonb, answer jsonb,
  representation text, band text, source text, reviewed_by text, reviewed_at timestamptz);
CREATE TABLE skill_mastery(account_id text, learner_id text, skill_id text, estimate double precision,
  n_items integer DEFAULT 0, n_sessions integer DEFAULT 0, session_ids jsonb DEFAULT '[]', status text,
  starting_estimate double precision, updated_at timestamptz, last_seen_at timestamptz, next_check_at timestamptz,
  PRIMARY KEY(learner_id, skill_id));
CREATE TABLE misconceptions(account_id text, learner_id text, tag text, status text, first_seen_at timestamptz,
  resolved_at timestamptz, clean_streak integer, PRIMARY KEY(learner_id, tag));
CREATE TABLE evidence_events(id text PRIMARY KEY, account_id text, learner_id text, session_id text, type text,
  assisted boolean, payload jsonb, ts timestamptz NOT NULL DEFAULT fixture_now(),
  fixture_order bigint GENERATED ALWAYS AS IDENTITY);
CREATE TABLE attention_stats(session_id text PRIMARY KEY, account_id text, camera_enabled boolean DEFAULT false,
  attending_pct double precision DEFAULT 0, drift_count integer DEFAULT 0, away_count integer DEFAULT 0,
  recoveries integer DEFAULT 0);
CREATE FUNCTION reject_evidence_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'evidence_events is append-only' USING ERRCODE = '55000'; END; $$;
CREATE TRIGGER evidence_no_update BEFORE UPDATE OR DELETE ON evidence_events
  FOR EACH ROW EXECUTE FUNCTION reject_evidence_mutation();
