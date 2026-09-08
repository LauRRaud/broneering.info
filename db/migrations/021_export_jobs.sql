ALTER TABLE export_jobs ADD COLUMN attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5);
ALTER TABLE export_jobs ADD COLUMN claim_token uuid;
ALTER TABLE export_jobs ADD COLUMN locked_until timestamptz;
ALTER TABLE export_jobs ADD COLUMN record_count bigint NOT NULL DEFAULT 0 CHECK(record_count>=0);
ALTER TABLE export_jobs ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT now();
-- Downloads require a live owner session. No anonymous bearer download is exposed.
DO $$ DECLARE c record; BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='export_jobs'::regclass AND contype='c'
    AND pg_get_constraintdef(oid) LIKE '%download_token_hash IS NOT NULL%' LOOP
    EXECUTE format('ALTER TABLE export_jobs DROP CONSTRAINT %I',c.conname);
  END LOOP;
END $$;
ALTER TABLE export_jobs ADD CONSTRAINT export_ready_media CHECK(status<>'ready' OR result_media_id IS NOT NULL);
GRANT INSERT,UPDATE ON export_jobs,media TO booking_app;
CREATE INDEX export_work_queue ON export_jobs(tenant_id,next_attempt_at,created_at) WHERE status IN('pending','running','failed');
