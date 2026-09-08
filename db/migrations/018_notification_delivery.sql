ALTER TABLE tenants
  ADD COLUMN notification_email text,
  ADD COLUMN reminder_minutes integer CHECK(reminder_minutes BETWEEN 5 AND 43200),
  ADD COLUMN notification_settings_version integer NOT NULL DEFAULT 1 CHECK(notification_settings_version>0);
ALTER TABLE bookings ADD COLUMN customer_notifications boolean NOT NULL DEFAULT true;
ALTER TABLE booking_management_tokens ADD COLUMN encrypted_token text;

ALTER TABLE outbox DROP CONSTRAINT outbox_status_check;
ALTER TABLE outbox ADD CONSTRAINT outbox_status_check CHECK(status IN ('pending','sending','sent','failed','superseded','skipped'));
ALTER TABLE outbox
  ADD COLUMN recipient_kind text NOT NULL DEFAULT 'customer' CHECK(recipient_kind IN ('customer','company')),
  ADD COLUMN claim_token uuid,
  ADD COLUMN locked_until timestamptz,
  ADD COLUMN retry_budget integer NOT NULL DEFAULT 8 CHECK(retry_budget BETWEEN 1 AND 80),
  ADD COLUMN transport_id text,
  ADD COLUMN captured_at timestamptz;
CREATE INDEX outbox_claim_due ON outbox(tenant_id,next_attempt_at,id) WHERE status IN ('pending','failed','sending');
COMMENT ON COLUMN outbox.sent_at IS 'SMTP acceptance time, not proof of delivery or reading';
COMMENT ON COLUMN booking_management_tokens.encrypted_token IS 'Optional AES-GCM encrypted token for notification delivery; never exposed by state APIs';

CREATE TABLE notification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  outbox_id uuid NOT NULL,
  attempt integer NOT NULL CHECK(attempt>0),
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  finished_at timestamptz,
  outcome text NOT NULL DEFAULT 'sending' CHECK(outcome IN ('sending','sent','failed','skipped','superseded','capture')),
  error_code text CHECK(error_code ~ '^[A-Z0-9_]{1,100}$'),
  UNIQUE(tenant_id,outbox_id,attempt)
);
ALTER TABLE outbox ADD CONSTRAINT outbox_tenant_identity UNIQUE(tenant_id,id);
ALTER TABLE notification_attempts ADD FOREIGN KEY(tenant_id,outbox_id) REFERENCES outbox(tenant_id,id) ON DELETE CASCADE;
ALTER TABLE notification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_attempts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notification_attempts USING(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid);
GRANT SELECT,INSERT,UPDATE ON notification_attempts TO booking_app;
