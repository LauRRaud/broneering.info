ALTER TABLE import_batches ADD COLUMN source_purged_at timestamptz;
GRANT UPDATE(source_purged_at,headers) ON import_batches TO booking_app;
