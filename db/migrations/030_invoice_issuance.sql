CREATE TABLE billing_issuer_versions (
  version integer PRIMARY KEY CHECK(version>0),
  request_key uuid NOT NULL UNIQUE,payload_hash text NOT NULL CHECK(payload_hash ~ '^[0-9a-f]{64}$'),
  settings jsonb NOT NULL CHECK(jsonb_typeof(settings)='object'),
  approved_by text NOT NULL REFERENCES auth_user(id),approved_at timestamptz NOT NULL DEFAULT now(),
  approval_note text NOT NULL CHECK(length(btrim(approval_note)) BETWEEN 10 AND 1000)
);
-- Business issuer details are not secrets. Public endpoints never expose configuration.
-- Append-only application access: a new version is required for any change.
GRANT SELECT,INSERT ON billing_issuer_versions TO booking_app;
CREATE SEQUENCE invoice_number_counter AS bigint MAXVALUE 999999999999;
GRANT USAGE ON SEQUENCE invoice_number_counter TO booking_app;
ALTER TABLE subscriptions ADD COLUMN billing_recipient jsonb NOT NULL DEFAULT '{}'
  CHECK(jsonb_typeof(billing_recipient)='object');
GRANT UPDATE(billing_recipient) ON subscriptions TO booking_app;
GRANT INSERT ON invoices TO booking_app;
ALTER TABLE invoices ADD COLUMN issued_on date;
ALTER TABLE invoices ADD COLUMN snapshot_hash text CHECK(snapshot_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE invoices ADD COLUMN issuer_version integer REFERENCES billing_issuer_versions(version);
-- Older schema fixtures remain readable; real issuance always writes all three together.
ALTER TABLE invoices ADD CONSTRAINT invoice_issuance_metadata CHECK(
 (issued_on IS NULL AND snapshot_hash IS NULL AND issuer_version IS NULL) OR
 (issued_on IS NOT NULL AND snapshot_hash IS NOT NULL AND issuer_version IS NOT NULL));
