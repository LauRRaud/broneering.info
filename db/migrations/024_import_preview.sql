ALTER TABLE import_rows ADD COLUMN warning_codes jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(warning_codes)='array');
GRANT UPDATE(fingerprint,warning_codes) ON import_rows TO booking_app;
CREATE INDEX import_row_completed_fingerprint ON import_rows(tenant_id,fingerprint) WHERE status='imported';
CREATE INDEX import_row_completed_external ON import_rows(tenant_id,(normalized->>'externalId')) WHERE status='imported';
