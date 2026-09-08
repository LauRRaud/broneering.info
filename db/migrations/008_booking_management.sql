ALTER TABLE tenants
  ADD COLUMN contact_email text NOT NULL DEFAULT '',
  ADD COLUMN contact_phone text NOT NULL DEFAULT '',
  ADD COLUMN management_link_hours integer CHECK (management_link_hours BETWEEN 0 AND 8760),
  ADD COLUMN management_policy_version integer NOT NULL DEFAULT 1;
-- NULL means the owner has not enabled new management links.
ALTER TABLE bookings DROP CONSTRAINT bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('confirmed','completed','cancelled','no_show'));
ALTER TABLE bookings ALTER COLUMN customer_email DROP NOT NULL;
ALTER TABLE bookings ADD COLUMN source text NOT NULL DEFAULT 'online' CHECK (source IN ('online','manual'));
ALTER TABLE bookings ADD COLUMN attention_reason text;
ALTER TABLE bookings ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE booking_requests ADD COLUMN response_data jsonb;
ALTER TABLE booking_requests ADD COLUMN encrypted_link text;
-- Freeze creation responses before subsequent edits are introduced.
UPDATE booking_requests r SET response_data=jsonb_build_object(
  'id',b.id,'reference',b.reference,'serviceName',b.service_name,'staffName',b.staff_name,
  'start',to_char(b.start_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'end',to_char(b.end_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'price',b.price,'duration',b.duration,'cancellationHours',b.cancellation_hours,'status',b.status,'version',b.version)
FROM bookings b WHERE b.tenant_id=r.tenant_id AND b.id=r.booking_id;

CREATE TABLE booking_management_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id), booking_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL, after_end_hours integer NOT NULL CHECK (after_end_hours BETWEEN 0 AND 8760), revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id,booking_id) REFERENCES bookings(tenant_id,id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX booking_one_active_token ON booking_management_tokens(tenant_id,booking_id) WHERE revoked_at IS NULL;
CREATE TABLE booking_commands (
  tenant_id uuid NOT NULL REFERENCES tenants(id), request_key uuid NOT NULL, booking_id uuid NOT NULL,
  principal text NOT NULL, payload_hash text NOT NULL, encrypted_result text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (tenant_id,request_key),
  FOREIGN KEY (tenant_id,booking_id) REFERENCES bookings(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE booking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id), booking_id uuid NOT NULL,
  actor_user_id text REFERENCES auth_user(id) ON DELETE SET NULL,
  action text NOT NULL, reason text NOT NULL DEFAULT '', before_data jsonb, after_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id,booking_id) REFERENCES bookings(tenant_id,id) ON DELETE CASCADE
);
CREATE INDEX booking_events_history ON booking_events(tenant_id,booking_id,created_at,id);
CREATE INDEX bookings_attention ON bookings(tenant_id,start_at) WHERE status='confirmed' AND attention_reason IS NOT NULL;
ALTER TABLE outbox DROP CONSTRAINT outbox_status_check;
ALTER TABLE outbox ADD CONSTRAINT outbox_status_check CHECK (status IN ('pending','sent','failed','superseded','skipped'));
GRANT UPDATE ON bookings,booking_requests,outbox TO booking_app;
GRANT SELECT,INSERT,UPDATE ON booking_management_tokens TO booking_app;
GRANT SELECT,INSERT ON booking_commands,booking_events TO booking_app;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['booking_management_tokens','booking_commands','booking_events'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = nullif(current_setting(''app.tenant_id'',true),'''')::uuid) WITH CHECK (tenant_id = nullif(current_setting(''app.tenant_id'',true),'''')::uuid)',t);
  END LOOP;
END $$;
