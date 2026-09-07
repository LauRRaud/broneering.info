CREATE TABLE service_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  active boolean NOT NULL DEFAULT true, version integer NOT NULL DEFAULT 1,
  UNIQUE (tenant_id,id), UNIQUE (tenant_id,name)
);
ALTER TABLE service_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_groups FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON service_groups
 USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid)
 WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid);
ALTER TABLE services ADD COLUMN group_id uuid,
 ADD COLUMN default_price integer NOT NULL DEFAULT 0 CHECK (default_price BETWEEN 0 AND 100000000),
 ADD COLUMN default_duration integer NOT NULL DEFAULT 30 CHECK (default_duration BETWEEN 5 AND 720),
 ADD COLUMN buffer_before integer NOT NULL DEFAULT 0 CHECK (buffer_before BETWEEN 0 AND 240),
 ADD COLUMN buffer_after integer NOT NULL DEFAULT 0 CHECK (buffer_after BETWEEN 0 AND 240),
 ADD COLUMN version integer NOT NULL DEFAULT 1,
 ADD FOREIGN KEY (tenant_id,group_id) REFERENCES service_groups(tenant_id,id);
INSERT INTO service_groups(tenant_id,name) SELECT DISTINCT tenant_id,category FROM services;
UPDATE services s SET group_id=g.id FROM service_groups g WHERE g.tenant_id=s.tenant_id AND g.name=s.category;
-- Existing explicit offerings are preserved; one supplies an initial default.
UPDATE services s SET default_price=x.price,default_duration=x.duration,buffer_before=x.buffer_before,buffer_after=x.buffer_after
FROM (SELECT DISTINCT ON (tenant_id,service_id) * FROM staff_services ORDER BY tenant_id,service_id,staff_id) x
WHERE s.tenant_id=x.tenant_id AND s.id=x.service_id;
ALTER TABLE staff ADD COLUMN bio text NOT NULL DEFAULT '', ADD COLUMN photo_url text NOT NULL DEFAULT '', ADD COLUMN version integer NOT NULL DEFAULT 1;
-- NULL inherits this individual value, independently of the other overrides.
ALTER TABLE staff_services ALTER COLUMN price DROP NOT NULL, ALTER COLUMN duration DROP NOT NULL,
 ALTER COLUMN buffer_before DROP NOT NULL, ALTER COLUMN buffer_after DROP NOT NULL,
 ADD COLUMN active boolean NOT NULL DEFAULT true, ADD COLUMN version integer NOT NULL DEFAULT 1;
GRANT SELECT,INSERT,UPDATE ON service_groups TO booking_app;
GRANT INSERT,UPDATE ON services,staff,staff_services TO booking_app;
