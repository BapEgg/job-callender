CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY, username text UNIQUE NOT NULL, password_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_attempts (
 key text PRIMARY KEY, failures integer NOT NULL DEFAULT 0, window_start timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_state (
 user_id uuid PRIMARY KEY REFERENCES users(id), revision integer NOT NULL DEFAULT 0,
 data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS state_history (
 user_id uuid NOT NULL REFERENCES users(id), revision integer NOT NULL, data jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id, revision)
);
CREATE TABLE IF NOT EXISTS submissions (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), application_id text NOT NULL,
 version integer NOT NULL, snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id, application_id, version)
);
CREATE OR REPLACE FUNCTION prevent_submission_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Submissions are immutable'; END $$;
DROP TRIGGER IF EXISTS immutable_submission ON submissions;
CREATE TRIGGER immutable_submission BEFORE UPDATE OR DELETE ON submissions FOR EACH ROW EXECUTE FUNCTION prevent_submission_mutation();
CREATE TABLE IF NOT EXISTS tasks (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), type text NOT NULL CHECK(type IN ('search','draft','questions')),
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','succeeded','failed','cancelled')),
 dedupe_key text NOT NULL, input jsonb NOT NULL, result jsonb, error_code text,
 attempt integer NOT NULL DEFAULT 0, attempt_token uuid, lease_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
 UNIQUE(user_id,dedupe_key)
);
CREATE TABLE IF NOT EXISTS runner_status (id integer PRIMARY KEY CHECK(id=1), seen_at timestamptz NOT NULL, capabilities jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS notification_records (
 user_id uuid NOT NULL REFERENCES users(id), key text NOT NULL,
 status text NOT NULL CHECK(status IN ('pending','sent','failed','uncertain','cancelled')),
 payload jsonb NOT NULL, attempted_at timestamptz, PRIMARY KEY(user_id,key)
);
CREATE TABLE IF NOT EXISTS files (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), name text NOT NULL,
 mime text NOT NULL, size integer NOT NULL, sha256 text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
