/**
 * Product tables (spec §8.5 plus the evidence ledger from
 * docs/STRATEGY-INTEGRATION.md). Idempotent DDL in the same style as upstream's
 * `ensure*Schema`: run on first request, safe to re-run. Every tenant-scoped
 * table carries `account_id`; queries always filter on it (invariant a).
 *
 * `evidence_events` is append-only: a trigger raises on UPDATE or DELETE, so
 * a correction is a new row. No table has an audio column, a frame, a landmark,
 * or a template (invariants b and c).
 */
export const TUTOR_SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS learners (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    birth_year INTEGER NOT NULL,
    age_band TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    kind TEXT NOT NULL,
    login_name TEXT UNIQUE,
    login_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS learners_account_idx ON learners (account_id)`,
  `CREATE TABLE IF NOT EXISTS account_sessions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    learner_id TEXT REFERENCES learners(id) ON DELETE SET NULL,
    role TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS consents (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    method TEXT NOT NULL,
    notice_version TEXT NOT NULL,
    policy_version TEXT NOT NULL,
    camera BOOLEAN NOT NULL DEFAULT false,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ,
    evidence_ref TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS coursework (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready',
    text TEXT,
    skill_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS coursework_learner_idx ON coursework (account_id, learner_id)`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    minutes INTEGER NOT NULL DEFAULT 0,
    mode TEXT NOT NULL DEFAULT 'text',
    cost_cents INTEGER NOT NULL DEFAULT 0,
    thumbs TEXT,
    phase TEXT NOT NULL DEFAULT 'greet',
    skill_id TEXT,
    coursework_id TEXT REFERENCES coursework(id) ON DELETE SET NULL,
    summary JSONB,
    state JSONB NOT NULL DEFAULT '{}'::jsonb
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_learner_idx ON sessions (account_id, learner_id, started_at DESC)`,
  `CREATE TABLE IF NOT EXISTS turns (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    audio_ms INTEGER,
    latency_ms INTEGER,
    model TEXT,
    cost_cents INTEGER NOT NULL DEFAULT 0,
    ts TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS turns_session_idx ON turns (session_id, ts)`,
  `CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    prereqs JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    slice TEXT NOT NULL,
    ordinal INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS check_items (
    id TEXT PRIMARY KEY,
    skill_id TEXT NOT NULL REFERENCES skills(id),
    type TEXT NOT NULL,
    stem TEXT NOT NULL,
    options JSONB,
    answer JSONB,
    representation TEXT NOT NULL,
    band TEXT NOT NULL,
    source TEXT NOT NULL,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS check_items_skill_idx ON check_items (skill_id)`,
  `CREATE TABLE IF NOT EXISTS skill_mastery (
    account_id TEXT NOT NULL,
    learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    skill_id TEXT NOT NULL,
    estimate DOUBLE PRECISION NOT NULL DEFAULT 0,
    n_items INTEGER NOT NULL DEFAULT 0,
    n_sessions INTEGER NOT NULL DEFAULT 0,
    session_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'not_started',
    starting_estimate DOUBLE PRECISION,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ,
    next_check_at TIMESTAMPTZ,
    PRIMARY KEY (learner_id, skill_id)
  )`,
  `CREATE TABLE IF NOT EXISTS misconceptions (
    account_id TEXT NOT NULL,
    learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    clean_streak INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (learner_id, tag)
  )`,
  `CREATE TABLE IF NOT EXISTS evidence_events (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    learner_id TEXT NOT NULL,
    session_id TEXT,
    type TEXT NOT NULL,
    assisted BOOLEAN NOT NULL DEFAULT false,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    ts TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS evidence_learner_idx ON evidence_events (account_id, learner_id, ts)`,
  `CREATE OR REPLACE FUNCTION tutor_evidence_immutable() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'evidence_events is append-only; write a new row instead';
    END;
  $$ LANGUAGE plpgsql`,
  `DROP TRIGGER IF EXISTS evidence_events_immutable ON evidence_events`,
  `CREATE TRIGGER evidence_events_immutable BEFORE UPDATE OR DELETE ON evidence_events
    FOR EACH ROW EXECUTE FUNCTION tutor_evidence_immutable()`,
  `CREATE TABLE IF NOT EXISTS learner_profiles (
    learner_id TEXT PRIMARY KEY REFERENCES learners(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS usage_ledger (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    learner_id TEXT,
    session_id TEXT,
    turn_id TEXT,
    kind TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
    unit TEXT,
    cents INTEGER NOT NULL DEFAULT 0,
    ts TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS usage_ledger_account_day_idx ON usage_ledger (account_id, ts)`,
  `CREATE INDEX IF NOT EXISTS usage_ledger_session_idx ON usage_ledger (session_id)`,
  `CREATE TABLE IF NOT EXISTS subscriptions (
    account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'trial',
    plan TEXT NOT NULL DEFAULT 'monthly',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    pooled_minutes INTEGER NOT NULL DEFAULT 0,
    used_minutes INTEGER NOT NULL DEFAULT 0,
    trial_minutes_used INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS flags (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    learner_id TEXT,
    session_id TEXT,
    kind TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ
  )`,
  `CREATE TABLE IF NOT EXISTS deletion_requests (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    learner_id TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
  )`,
  `CREATE TABLE IF NOT EXISTS attention_stats (
    session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    camera_enabled BOOLEAN NOT NULL DEFAULT false,
    attending_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
    drift_count INTEGER NOT NULL DEFAULT 0,
    away_count INTEGER NOT NULL DEFAULT 0,
    recoveries INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS recovery_events (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    trigger_state TEXT NOT NULL,
    ladder_step INTEGER NOT NULL,
    outcome TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  // Fail-closed gates are seeded shut; flipping one is an explicit operator action.
  `INSERT INTO app_settings (key, value) VALUES
    ('under13_gate', 'false'::jsonb),
    ('camera_sensing_enabled', 'false'::jsonb),
    ('billing_enabled', 'false'::jsonb),
    ('ai_kill_switch', 'false'::jsonb),
    ('beta_invites_open', 'true'::jsonb)
   ON CONFLICT (key) DO NOTHING`,
  // Stripe webhook idempotency (billing-23): one row per delivered event id.
  // Append-only; a replayed id conflicts and the handler skips it.
  `CREATE TABLE IF NOT EXISTS stripe_events (
    id TEXT PRIMARY KEY,
    type TEXT,
    received_at TIMESTAMPTZ
  )`,
  // Parent settings (wire ParentSettings): camera sensing, recovery-ladder
  // steps switched off, weekly email. One row per account, cascades away with it.
  `CREATE TABLE IF NOT EXISTS parent_settings (
    account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  // Turn idempotency (spec R1, tutor-08): the client mints `clientTurnId` and
  // retries with it, so a repeated POST replays the stored tutor text instead
  // of paying for a second model call. Unique per session; older rows are null.
  `ALTER TABLE turns ADD COLUMN IF NOT EXISTS client_turn_id TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS turns_client_turn_idx
     ON turns (session_id, client_turn_id) WHERE client_turn_id IS NOT NULL`,
  // Why an extraction failed (spec R3): the row survives with status 'failed'
  // so the learner can retry the photo or type the problem instead. A short
  // machine reason; the learner-facing sentence is `coursework.text`.
  `ALTER TABLE coursework ADD COLUMN IF NOT EXISTS extract_error TEXT`,
  // One-time links (password reset now; the parent invitation next). The
  // token itself is sent once inside the link and never stored: the row keeps
  // its SHA-256, the purpose, the address it went to, and when it expires and
  // was used. `account_id` is null for an invitation, which exists before the
  // account it will create; `payload` carries what that account needs.
  `CREATE TABLE IF NOT EXISTS auth_tokens (
    id TEXT PRIMARY KEY,
    account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    purpose TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS auth_tokens_account_idx ON auth_tokens (account_id, purpose)`,
  `CREATE TABLE IF NOT EXISTS support_requests (
    id TEXT PRIMARY KEY,
    account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
    learner_id TEXT,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    page TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivered_at TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS support_requests_created_idx ON support_requests (created_at DESC)`,
  // Guest mode (D35): an anonymous account created behind a cookie with no
  // email, name or password. The flag is what every guest-aware read keys on;
  // the placeholder email exists only because the column is NOT NULL UNIQUE.
  `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS guest BOOLEAN NOT NULL DEFAULT false`,
  // The grade level a guest chose (a content setting, not an age); null for
  // account learners, whose band comes from a parent-entered birth year.
  `ALTER TABLE learners ADD COLUMN IF NOT EXISTS level TEXT`,
  // The planner (D35): what the learner has on their plate, with a due date.
  // Learner-scoped like coursework; cascades away with the learner.
  `CREATE TABLE IF NOT EXISTS planner_items (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT 'other',
    due_on DATE,
    status TEXT NOT NULL DEFAULT 'todo',
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS planner_items_learner_idx ON planner_items (account_id, learner_id, status, due_on)`,
  // One row per (account, learner, kind, period) claimed before a promotional
  // send, so a cron can fire hourly without double-sending (parent-comms
  // skill). Rows carry ids, the kind, the period and the outcome; never a
  // subject with a name in it. `learner_id` is '' for account-level mail.
  `CREATE TABLE IF NOT EXISTS email_log (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    learner_id TEXT NOT NULL DEFAULT '',
    kind TEXT NOT NULL,
    period TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ,
    UNIQUE (account_id, learner_id, kind, period)
  )`,
];

/** Table names that must never carry audio or face data; checked by the invariant suite. */
export const TUTOR_TABLES = [
  'accounts',
  'learners',
  'account_sessions',
  'consents',
  'coursework',
  'sessions',
  'turns',
  'skills',
  'check_items',
  'skill_mastery',
  'misconceptions',
  'evidence_events',
  'learner_profiles',
  'usage_ledger',
  'subscriptions',
  'flags',
  'deletion_requests',
  'attention_stats',
  'recovery_events',
  'app_settings',
  'parent_settings',
  'stripe_events',
  'support_requests',
  'email_log',
  'auth_tokens',
  'planner_items',
] as const;
