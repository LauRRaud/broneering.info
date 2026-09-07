-- Tenant access, invitations, audit events, and bounded platform support.
-- auth_user and auth_session are created by 002_auth.sql.

CREATE TABLE memberships (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  user_id text NOT NULL REFERENCES auth_user(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('owner','receptionist','staff')),
  staff_id uuid,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(permissions) = 'array'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,user_id),
  -- An owner may also be the public staff profile for this tenant.
  FOREIGN KEY (tenant_id,staff_id) REFERENCES staff(tenant_id,id)
);

CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  invited_by text REFERENCES auth_user(id) ON DELETE RESTRICT,
  email text NOT NULL CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 320),
  role text NOT NULL CHECK (role IN ('owner','receptionist','staff')),
  bootstrap boolean NOT NULL DEFAULT false,
  staff_id uuid,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(permissions) = 'array'),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id,staff_id) REFERENCES staff(tenant_id,id),
  CHECK (accepted_at IS NULL OR cancelled_at IS NULL),
  CHECK ((role = 'owner') = bootstrap),
  CHECK ((bootstrap AND invited_by IS NULL) OR (NOT bootstrap AND invited_by IS NOT NULL))
);
CREATE UNIQUE INDEX invitations_pending_email ON invitations(tenant_id,email)
  WHERE accepted_at IS NULL AND cancelled_at IS NULL;
CREATE INDEX invitations_tenant_created ON invitations(tenant_id,created_at DESC);

CREATE TABLE access_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id),
  actor_user_id text REFERENCES auth_user(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX access_audit_tenant_created ON access_audit_log(tenant_id,created_at DESC);

CREATE TABLE support_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  platform_user_id text NOT NULL REFERENCES auth_user(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 500),
  scope text NOT NULL DEFAULT 'read_only' CHECK (scope = 'read_only'),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_grants_active ON support_grants(platform_user_id,tenant_id,expires_at)
  WHERE revoked_at IS NULL;

GRANT SELECT,INSERT,UPDATE ON memberships,invitations,support_grants TO booking_app;
GRANT SELECT,INSERT ON access_audit_log TO booking_app;
GRANT DELETE ON auth_session TO booking_app;
GRANT USAGE,SELECT ON SEQUENCE access_audit_log_id_seq TO booking_app;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['memberships','invitations','access_audit_log','support_grants'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
CREATE POLICY access_memberships_tenant_or_self ON memberships
  USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid
      OR user_id = nullif(current_setting('app.user_id',true),''));
CREATE POLICY access_invitations_tenant_or_token ON invitations
  USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid
      OR token_hash = nullif(current_setting('app.invitation_hash',true),''));
CREATE POLICY access_audit_tenant_or_self ON access_audit_log
  USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid
      OR actor_user_id = nullif(current_setting('app.user_id',true),''));
CREATE POLICY access_support_tenant_or_platform ON support_grants
  USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid
      OR platform_user_id = nullif(current_setting('app.user_id',true),''));
