ALTER TABLE services ADD COLUMN source_language text NOT NULL DEFAULT 'et' CHECK(source_language IN ('et','en','ru'));
ALTER TABLE services ADD COLUMN content_version integer NOT NULL DEFAULT 1 CHECK(content_version>0);
UPDATE services s SET source_language=t.default_language FROM tenants t WHERE t.id=s.tenant_id;

CREATE FUNCTION service_content_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.name,NEW.description,NEW.source_language) IS DISTINCT FROM (OLD.name,OLD.description,OLD.source_language) THEN
    NEW.content_version := OLD.content_version+1;
  ELSE
    NEW.content_version := OLD.content_version;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER services_content_version BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION service_content_version();

CREATE TABLE service_translations (
  tenant_id uuid NOT NULL,
  service_id uuid NOT NULL,
  language text NOT NULL CHECK(language IN ('et','en','ru')),
  name text NOT NULL CHECK(length(name) BETWEEN 1 AND 150),
  description text NOT NULL CHECK(length(description)<=1000),
  source_version integer NOT NULL CHECK(source_version>0),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  status text NOT NULL CHECK(status IN ('draft','published')),
  origin text NOT NULL CHECK(origin IN ('manual','machine')),
  published_name text,
  published_description text,
  published_source_version integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,service_id,language),
  FOREIGN KEY(tenant_id,service_id) REFERENCES services(tenant_id,id) ON DELETE CASCADE,
  CHECK((published_name IS NULL AND published_description IS NULL AND published_source_version IS NULL) OR
    (published_name IS NOT NULL AND published_description IS NOT NULL AND published_source_version>0))
);
ALTER TABLE service_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_translations FORCE ROW LEVEL SECURITY;
CREATE POLICY service_translations_tenant ON service_translations USING(tenant_id=current_setting('app.tenant_id',true)::uuid) WITH CHECK(tenant_id=current_setting('app.tenant_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE,DELETE ON service_translations TO booking_app;
CREATE INDEX service_translation_history ON access_audit_log(tenant_id,target_id,created_at DESC) WHERE action LIKE 'translation.%' OR action='catalog.save-service';
