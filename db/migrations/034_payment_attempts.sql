CREATE TABLE payment_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),invoice_id uuid NOT NULL,
 request_key uuid NOT NULL,payload_hash text NOT NULL CHECK(payload_hash ~ '^[0-9a-f]{64}$'),
 method text NOT NULL CHECK(method IN ('link','enroll','autopay')),
 environment text NOT NULL CHECK(environment IN ('test','live')),shop_id uuid NOT NULL,
 amount integer NOT NULL CHECK(amount BETWEEN 1 AND 100000000),currency text NOT NULL DEFAULT 'EUR' CHECK(currency='EUR'),
 reference text NOT NULL,created_by text REFERENCES auth_user(id),created_at timestamptz NOT NULL DEFAULT now(),
 state text NOT NULL DEFAULT 'creating' CHECK(state IN ('creating','ready','pending','completed','cancelled','expired','unknown','failed','review')),
 transaction_id uuid,redirect_url text,provider_status text,checked_at timestamptz,error_code text,
 consent jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(consent)='object'),
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,request_key),UNIQUE(environment,shop_id,transaction_id),
 FOREIGN KEY(tenant_id,invoice_id) REFERENCES invoices(tenant_id,id)
);
CREATE UNIQUE INDEX payment_one_open_attempt ON payment_attempts(tenant_id,invoice_id) WHERE state IN ('creating','ready','pending','unknown','review');
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts FORCE ROW LEVEL SECURITY;
CREATE POLICY payment_attempt_tenant ON payment_attempts USING(tenant_id=current_setting('app.tenant_id',true)::uuid) WITH CHECK(tenant_id=current_setting('app.tenant_id',true)::uuid);
GRANT SELECT,INSERT ON payment_attempts TO booking_app;
GRANT UPDATE(state,transaction_id,redirect_url,provider_status,checked_at,error_code) ON payment_attempts TO booking_app;
CREATE FUNCTION protect_payment_attempt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (to_jsonb(NEW)-ARRAY['state','transaction_id','redirect_url','provider_status','checked_at','error_code']) IS DISTINCT FROM
 (to_jsonb(OLD)-ARRAY['state','transaction_id','redirect_url','provider_status','checked_at','error_code']) OR
 (OLD.transaction_id IS NOT NULL AND NEW.transaction_id IS DISTINCT FROM OLD.transaction_id) THEN
  RAISE EXCEPTION 'Payment attempt identity is immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER payment_attempt_immutable BEFORE UPDATE ON payment_attempts FOR EACH ROW EXECUTE FUNCTION protect_payment_attempt();

CREATE TABLE payment_provider_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),attempt_id uuid NOT NULL,
 digest text NOT NULL CHECK(digest ~ '^[0-9a-f]{64}$'),message_type text NOT NULL CHECK(message_type IN ('payment_return','token_return')),
 encrypted_message text NOT NULL,received_at timestamptz NOT NULL DEFAULT now(),processed_at timestamptz,
 tries integer NOT NULL DEFAULT 0 CHECK(tries>=0),error_code text,
 UNIQUE(tenant_id,digest),FOREIGN KEY(tenant_id,attempt_id) REFERENCES payment_attempts(tenant_id,id)
);
ALTER TABLE payment_provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_provider_events FORCE ROW LEVEL SECURITY;
CREATE POLICY payment_event_tenant ON payment_provider_events USING(tenant_id=current_setting('app.tenant_id',true)::uuid) WITH CHECK(tenant_id=current_setting('app.tenant_id',true)::uuid);
GRANT SELECT,INSERT ON payment_provider_events TO booking_app;
GRANT UPDATE(processed_at,tries,error_code) ON payment_provider_events TO booking_app;

ALTER TABLE payment_records ALTER COLUMN recorded_by DROP NOT NULL;
ALTER TABLE payment_records ADD COLUMN source text NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','makecommerce'));
ALTER TABLE payment_records ADD COLUMN provider_attempt_id uuid;
ALTER TABLE payment_records ADD CONSTRAINT payment_receipt_source CHECK(
 (source='manual' AND recorded_by IS NOT NULL AND provider_attempt_id IS NULL) OR
 (source='makecommerce' AND recorded_by IS NULL AND provider_attempt_id IS NOT NULL));
ALTER TABLE payment_records ADD CONSTRAINT payment_receipt_attempt FOREIGN KEY(tenant_id,provider_attempt_id) REFERENCES payment_attempts(tenant_id,id);
CREATE UNIQUE INDEX payment_provider_receipt_once ON payment_records(tenant_id,provider_attempt_id) WHERE provider_attempt_id IS NOT NULL;
