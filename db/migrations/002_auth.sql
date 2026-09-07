-- Better Auth 1.7.3 PostgreSQL schema generated from src/lib/auth.ts.
-- Auth tables are global; they intentionally do not participate in tenant RLS.
CREATE TABLE auth_user (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL,
  image text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  two_factor_enabled boolean,
  is_platform_admin boolean NOT NULL DEFAULT false,
  disabled boolean NOT NULL DEFAULT false
);

CREATE TABLE auth_session (
  id text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  user_id text NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  mfa_verified_at timestamptz
);

CREATE TABLE auth_account (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL
);

CREATE TABLE auth_verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auth_two_factor (
  id text PRIMARY KEY,
  secret text NOT NULL,
  backup_codes text NOT NULL,
  user_id text NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  verified boolean,
  failed_verification_count integer,
  locked_until timestamptz
);

CREATE TABLE auth_rate_limit (
  id text PRIMARY KEY,
  key text NOT NULL UNIQUE,
  count integer NOT NULL,
  last_request bigint NOT NULL
);

CREATE INDEX auth_session_user_id_idx ON auth_session(user_id);
CREATE INDEX auth_account_user_id_idx ON auth_account(user_id);
CREATE INDEX auth_verification_identifier_idx ON auth_verification(identifier);
CREATE INDEX auth_two_factor_secret_idx ON auth_two_factor(secret);
CREATE INDEX auth_two_factor_user_id_idx ON auth_two_factor(user_id);

REVOKE ALL ON auth_user,auth_session,auth_account,auth_verification,auth_two_factor,auth_rate_limit FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE,DELETE ON auth_user,auth_session,auth_account,auth_verification,auth_two_factor,auth_rate_limit TO booking_app;
