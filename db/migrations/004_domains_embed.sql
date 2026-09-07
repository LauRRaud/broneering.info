-- Domain history survives tenant removal so an old customer link cannot change owner.
CREATE TABLE domain_reservations (
  hostname text PRIMARY KEY,
  tenant_id uuid NOT NULL,
  reserved_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO domain_reservations(hostname,tenant_id) SELECT hostname,tenant_id FROM tenant_domains;
REVOKE ALL ON domain_reservations FROM PUBLIC,booking_app;

CREATE FUNCTION reserve_tenant_domain() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous_owner uuid;
BEGIN
  INSERT INTO domain_reservations(hostname,tenant_id) VALUES(NEW.hostname,NEW.tenant_id) ON CONFLICT DO NOTHING;
  SELECT tenant_id INTO previous_owner FROM domain_reservations WHERE hostname=NEW.hostname;
  IF previous_owner IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'Domain has already been reserved for another tenant' USING ERRCODE='23505';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER reserve_tenant_domain BEFORE INSERT OR UPDATE ON tenant_domains
  FOR EACH ROW EXECUTE FUNCTION reserve_tenant_domain();

ALTER TABLE tenant_domains ADD COLUMN ready boolean NOT NULL DEFAULT true;
-- Provisioning explicitly creates pending domains; existing deployed domains remain ready.
CREATE TABLE tenant_embed_origins (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  origin text NOT NULL CHECK(length(origin) BETWEEN 8 AND 300),
  PRIMARY KEY(tenant_id,origin)
);
ALTER TABLE tenant_embed_origins ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_embed_origins FORCE ROW LEVEL SECURITY;
CREATE POLICY embed_origins_tenant ON tenant_embed_origins
  USING(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid);
GRANT SELECT,INSERT,DELETE ON tenant_embed_origins TO booking_app;
