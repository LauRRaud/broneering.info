-- Preserve duplicate detection after the source payload has been removed.
ALTER TABLE import_rows ADD COLUMN external_id_hash text CHECK(external_id_hash ~ '^[0-9a-f]{64}$');
GRANT UPDATE(external_id_hash) ON import_rows TO booking_app;
