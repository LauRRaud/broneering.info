ALTER TABLE import_batches
  ADD COLUMN kind text CHECK(kind IN ('services','staff','customers','bookings')),
  ADD COLUMN delimiter text CHECK(delimiter IN (',',';')),
  ADD COLUMN headers jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(headers)='array'),
  ADD COLUMN cutover_at timestamptz,
  ADD COLUMN timezone text;
ALTER TABLE import_rows ADD COLUMN source_values jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(source_values)='array'),
  ADD COLUMN normalized jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(normalized)='object');
GRANT INSERT ON import_batches,import_rows TO booking_app;
GRANT UPDATE(status,mapping,error_report,imported_rows,rejected_rows,approved_by,approved_at,reminders_enabled,reminders_approved_by,reminders_approved_at,version,cutover_at,timezone) ON import_batches TO booking_app;
GRANT UPDATE(status,error_code,normalized,service_id,staff_id,customer_id,booking_id) ON import_rows TO booking_app;
