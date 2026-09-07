ALTER TABLE tenants ADD COLUMN rules_version integer NOT NULL DEFAULT 1;
-- Older bookings have no verifiable snapshot of these terms; leave them unknown.
ALTER TABLE bookings ADD COLUMN cancellation_hours integer CHECK (cancellation_hours>=0);
ALTER TABLE schedule_exceptions ADD COLUMN kind text NOT NULL DEFAULT 'other'
  CHECK (kind IN ('vacation','illness','extra_work','other'));
CREATE TABLE schedule_versions (
  tenant_id uuid NOT NULL REFERENCES tenants(id), staff_id uuid,
  version integer NOT NULL DEFAULT 0 CHECK (version>=0),
  FOREIGN KEY (tenant_id,staff_id) REFERENCES staff(tenant_id,id),
  UNIQUE NULLS NOT DISTINCT (tenant_id,staff_id)
);
ALTER TABLE schedule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON schedule_versions
 USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid)
 WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid);
GRANT SELECT,INSERT,UPDATE ON schedule_versions TO booking_app;
GRANT INSERT,UPDATE,DELETE ON weekly_hours,schedule_exceptions TO booking_app;
