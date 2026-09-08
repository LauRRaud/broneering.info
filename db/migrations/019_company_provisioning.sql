ALTER TABLE tenants ADD COLUMN public_state text NOT NULL DEFAULT 'published'
  CHECK(public_state IN ('draft','published','paused','closed'));
ALTER TABLE tenants ADD COLUMN lifecycle_version integer NOT NULL DEFAULT 1 CHECK(lifecycle_version > 0);

CREATE TABLE company_provision_requests (
  actor_user_id text NOT NULL REFERENCES auth_user(id),
  request_key uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  payload_hash text NOT NULL CHECK(payload_hash ~ '^[0-9a-f]{64}$'),
  encrypted_reply text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(actor_user_id,request_key)
);
ALTER TABLE company_provision_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_provision_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY company_provision_actor ON company_provision_requests
  USING(actor_user_id=nullif(current_setting('app.user_id',true),''));
GRANT SELECT,INSERT ON company_provision_requests TO booking_app;
GRANT INSERT ON tenants,tenant_domains TO booking_app;

-- The trigger alone may write reservations. No direct application access is granted.
CREATE OR REPLACE FUNCTION reserve_tenant_domain() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE previous_owner uuid;
BEGIN
  INSERT INTO public.domain_reservations(hostname,tenant_id) VALUES(NEW.hostname,NEW.tenant_id) ON CONFLICT DO NOTHING;
  SELECT tenant_id INTO previous_owner FROM public.domain_reservations WHERE hostname=NEW.hostname;
  IF previous_owner IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'Domain has already been reserved for another tenant' USING ERRCODE='23505';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION reserve_tenant_domain() FROM PUBLIC;
