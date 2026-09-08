-- Chapter 13 schema foundations. No plans, charges, files or jobs are created.
-- Application writes stay disabled until their chapter-specific workflows exist.
CREATE TABLE plan_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(), version integer NOT NULL CHECK(version>0),
  code text NOT NULL CHECK(code ~ '^[a-z][a-z0-9_-]{1,49}$'),
  name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 150),
  monthly_price integer NOT NULL CHECK(monthly_price BETWEEN 1 AND 100000000),
  currency text NOT NULL DEFAULT 'EUR' CHECK(currency='EUR'),
  staff_limit integer CHECK(staff_limit>0),
  entitlements jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(entitlements)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(id,version),UNIQUE(code,version)
);
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL UNIQUE REFERENCES tenants(id),
  plan_id uuid NOT NULL,plan_version integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','trial','active','limited','ended')),
  period_start date NOT NULL,period_end date NOT NULL CHECK(period_end>period_start),
  paid_through date,trial_ends_at timestamptz,ends_at timestamptz,
  billing_contact_name text NOT NULL DEFAULT '',billing_email text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1 CHECK(version>0),created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,id),FOREIGN KEY(plan_id,plan_version) REFERENCES plan_versions(id,version),
  CHECK(status<>'trial' OR trial_ends_at IS NOT NULL),CHECK(status<>'ended' OR ends_at IS NOT NULL)
);
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),subscription_id uuid NOT NULL,
  request_key uuid NOT NULL,number text UNIQUE CHECK(length(btrim(number)) BETWEEN 1 AND 100),
  period_start date NOT NULL,period_end date NOT NULL CHECK(period_end>period_start),due_date date NOT NULL,
  issuer_snapshot jsonb NOT NULL CHECK(jsonb_typeof(issuer_snapshot)='object'),
  recipient_snapshot jsonb NOT NULL CHECK(jsonb_typeof(recipient_snapshot)='object'),
  lines_snapshot jsonb NOT NULL CHECK(jsonb_typeof(lines_snapshot)='array' AND jsonb_array_length(lines_snapshot)>0),
  subtotal integer NOT NULL CHECK(subtotal>=0),tax integer NOT NULL CHECK(tax>=0),total integer NOT NULL CHECK(total>=0),
  currency text NOT NULL DEFAULT 'EUR' CHECK(currency='EUR'),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','issued','void')),
  issued_at timestamptz,void_reason text,version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),UNIQUE(tenant_id,subscription_id,period_start,period_end),
  FOREIGN KEY(tenant_id,subscription_id) REFERENCES subscriptions(tenant_id,id),
  CHECK(total::bigint=subtotal::bigint+tax::bigint),
  CHECK(status<>'issued' OR (number IS NOT NULL AND issued_at IS NOT NULL)),
  CHECK(status<>'draft' OR issued_at IS NULL),CHECK(status<>'void' OR length(btrim(void_reason))>=3)
);
CREATE FUNCTION protect_issued_invoice() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.issued_at IS NOT NULL AND
    (to_jsonb(NEW)-ARRAY['status','void_reason','version']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','void_reason','version']) THEN
    RAISE EXCEPTION 'Issued invoice snapshot is immutable' USING ERRCODE='23514';
  END IF;
  IF OLD.status='void' AND NEW.status<>'void' THEN
    RAISE EXCEPTION 'Voided invoice cannot be reopened' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER invoice_snapshot_immutable BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION protect_issued_invoice();
CREATE TABLE payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),invoice_id uuid NOT NULL,
  request_key uuid NOT NULL,amount integer NOT NULL CHECK(amount>0),currency text NOT NULL DEFAULT 'EUR' CHECK(currency='EUR'),
  received_on date NOT NULL,recorded_by text NOT NULL REFERENCES auth_user(id),recorded_at timestamptz NOT NULL DEFAULT now(),
  reference text NOT NULL DEFAULT '' CHECK(length(reference)<=200),
  reversed_at timestamptz,reversed_by text REFERENCES auth_user(id),reversal_reason text,
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),FOREIGN KEY(tenant_id,invoice_id) REFERENCES invoices(tenant_id,id),
  CHECK((reversed_at IS NULL AND reversed_by IS NULL AND reversal_reason IS NULL) OR
    (reversed_at IS NOT NULL AND reversed_by IS NOT NULL AND length(btrim(reversal_reason))>=3))
);
CREATE FUNCTION protect_payment_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW)-ARRAY['reversed_at','reversed_by','reversal_reason','version']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['reversed_at','reversed_by','reversal_reason','version']) OR
    (OLD.reversed_at IS NOT NULL AND (NEW.reversed_at,NEW.reversed_by,NEW.reversal_reason) IS DISTINCT FROM (OLD.reversed_at,OLD.reversed_by,OLD.reversal_reason)) THEN
    RAISE EXCEPTION 'Payment corrections require a reversal and a new record' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER payment_record_immutable BEFORE UPDATE ON payment_records FOR EACH ROW EXECUTE FUNCTION protect_payment_record();
CREATE INDEX invoices_due ON invoices(tenant_id,due_date) WHERE status='issued';
CREATE INDEX payment_invoice ON payment_records(tenant_id,invoice_id,received_on);

CREATE TABLE media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
  storage_key text NOT NULL UNIQUE CHECK(storage_key ~ '^[a-zA-Z0-9_-]+(/[a-zA-Z0-9_.-]+)*$' AND storage_key !~ '(^|/)\.{1,2}(/|$)'),
  purpose text NOT NULL CHECK(purpose IN ('theme','staff','import','export','invoice')),
  content_type text NOT NULL CHECK(length(content_type) BETWEEN 3 AND 150),
  byte_size bigint NOT NULL CHECK(byte_size>0),sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
  status text NOT NULL DEFAULT 'quarantined' CHECK(status IN ('quarantined','ready','rejected','deleted')),
  created_by text REFERENCES auth_user(id),created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK(version>0),UNIQUE(tenant_id,id),CHECK(expires_at IS NULL OR expires_at>created_at)
);
CREATE TABLE theme_configs (
  tenant_id uuid NOT NULL REFERENCES tenants(id),version integer NOT NULL CHECK(version>0),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  config jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(config)='object'),logo_media_id uuid,
  created_by text REFERENCES auth_user(id),created_at timestamptz NOT NULL DEFAULT now(),published_at timestamptz,
  PRIMARY KEY(tenant_id,version),FOREIGN KEY(tenant_id,logo_media_id) REFERENCES media(tenant_id,id),
  CHECK(status<>'published' OR published_at IS NOT NULL)
);
CREATE UNIQUE INDEX theme_single_draft ON theme_configs(tenant_id) WHERE status='draft';
CREATE UNIQUE INDEX theme_single_published ON theme_configs(tenant_id) WHERE status='published';
CREATE FUNCTION protect_published_theme() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.published_at IS NOT NULL AND (to_jsonb(NEW)-'status') IS DISTINCT FROM (to_jsonb(OLD)-'status') THEN
    RAISE EXCEPTION 'Published theme content is immutable' USING ERRCODE='23514';
  END IF;
  IF OLD.published_at IS NOT NULL AND NEW.status='draft' THEN
    RAISE EXCEPTION 'Create a new draft version' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER theme_snapshot_immutable BEFORE UPDATE ON theme_configs FOR EACH ROW EXECUTE FUNCTION protect_published_theme();

CREATE TABLE import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),request_key uuid NOT NULL,
  source_media_id uuid NOT NULL,requested_by text NOT NULL REFERENCES auth_user(id),created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'uploaded' CHECK(status IN ('uploaded','preview','approved','running','completed','failed','cancelled')),
  mapping jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(mapping)='object'),
  error_report jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(error_report)='array'),
  total_rows integer NOT NULL DEFAULT 0 CHECK(total_rows>=0),imported_rows integer NOT NULL DEFAULT 0 CHECK(imported_rows>=0),
  rejected_rows integer NOT NULL DEFAULT 0 CHECK(rejected_rows>=0),
  approved_by text REFERENCES auth_user(id),approved_at timestamptz,
  reminders_enabled boolean NOT NULL DEFAULT false,reminders_approved_by text REFERENCES auth_user(id),reminders_approved_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),FOREIGN KEY(tenant_id,source_media_id) REFERENCES media(tenant_id,id),
  CHECK(imported_rows::bigint+rejected_rows::bigint<=total_rows::bigint),
  CHECK(status NOT IN ('approved','running','completed') OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  CHECK(NOT reminders_enabled OR (reminders_approved_by IS NOT NULL AND reminders_approved_at IS NOT NULL))
);
CREATE TABLE import_rows (
  tenant_id uuid NOT NULL,batch_id uuid NOT NULL,row_number integer NOT NULL CHECK(row_number>0),
  fingerprint text NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
  status text NOT NULL CHECK(status IN ('preview','imported','rejected','skipped')),error_code text,
  service_id uuid,staff_id uuid,customer_id uuid,booking_id uuid,
  PRIMARY KEY(tenant_id,batch_id,row_number),
  FOREIGN KEY(tenant_id,batch_id) REFERENCES import_batches(tenant_id,id),
  FOREIGN KEY(tenant_id,service_id) REFERENCES services(tenant_id,id),FOREIGN KEY(tenant_id,staff_id) REFERENCES staff(tenant_id,id),
  FOREIGN KEY(tenant_id,customer_id) REFERENCES customers(tenant_id,id),FOREIGN KEY(tenant_id,booking_id) REFERENCES bookings(tenant_id,id),
  CHECK((status='imported' AND num_nonnulls(service_id,staff_id,customer_id,booking_id)=1) OR
    (status<>'imported' AND num_nonnulls(service_id,staff_id,customer_id,booking_id)=0))
);
CREATE TABLE export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),request_key uuid NOT NULL,
  requested_by text NOT NULL REFERENCES auth_user(id),created_at timestamptz NOT NULL DEFAULT now(),
  scope jsonb NOT NULL CHECK(jsonb_typeof(scope)='object'),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','ready','failed','expired','cancelled')),
  result_media_id uuid,download_token_hash text UNIQUE CHECK(download_token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL,last_error_code text,version integer NOT NULL DEFAULT 1 CHECK(version>0),
  UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),FOREIGN KEY(tenant_id,result_media_id) REFERENCES media(tenant_id,id),
  CHECK(expires_at>created_at),CHECK(status<>'ready' OR (result_media_id IS NOT NULL AND download_token_hash IS NOT NULL))
);
CREATE INDEX export_expiration ON export_jobs(expires_at) WHERE status='ready';
CREATE TABLE retention_policies (
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  data_class text NOT NULL CHECK(data_class IN ('booking_contacts','billing','access_tokens','notifications','audit','exports','backups')),
  retain_days integer CHECK(retain_days>0),action text CHECK(action IN ('delete','anonymize')),
  approved_by text REFERENCES auth_user(id),approved_at timestamptz,legal_hold boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1 CHECK(version>0),PRIMARY KEY(tenant_id,data_class),
  CHECK((retain_days IS NULL AND action IS NULL AND approved_by IS NULL AND approved_at IS NULL) OR
    (retain_days IS NOT NULL AND action IS NOT NULL AND approved_by IS NOT NULL AND approved_at IS NOT NULL))
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['subscriptions','invoices','payment_records','media','theme_configs','import_batches','import_rows','export_jobs','retention_policies'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING(tenant_id=nullif(current_setting(''app.tenant_id'',true),'''')::uuid) WITH CHECK(tenant_id=nullif(current_setting(''app.tenant_id'',true),'''')::uuid)',t);
    EXECUTE format('GRANT SELECT ON %I TO booking_app',t);
  END LOOP;
END $$;
GRANT SELECT ON plan_versions TO booking_app;
COMMENT ON TABLE plan_versions IS 'Global versioned platform catalogue; no customer data and no assumed price or staff limit';
COMMENT ON TABLE retention_policies IS 'No configured duration means no automated deletion; durations and approvals belong to chapter 21';
