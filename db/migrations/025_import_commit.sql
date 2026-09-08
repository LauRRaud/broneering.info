ALTER TABLE bookings DROP CONSTRAINT bookings_source_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_source_check CHECK(source IN ('online','manual','import'));
ALTER TABLE import_batches ADD COLUMN commit_options jsonb CHECK(commit_options IS NULL OR jsonb_typeof(commit_options)='object');
GRANT UPDATE(commit_options) ON import_batches TO booking_app;
