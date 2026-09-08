ALTER TABLE payment_attempts ADD COLUMN mandate_id uuid;
ALTER TABLE payment_attempts ADD CONSTRAINT attempt_mandate_fk FOREIGN KEY(tenant_id,mandate_id) REFERENCES payment_mandates(tenant_id,id);
ALTER TABLE payment_attempts ADD CONSTRAINT autopay_mandate_required CHECK(method<>'autopay' OR mandate_id IS NOT NULL);
ALTER TABLE payment_attempts ADD COLUMN charge_started_at timestamptz;
GRANT UPDATE(charge_started_at) ON payment_attempts TO booking_app;
CREATE UNIQUE INDEX invoice_one_automatic_charge ON payment_attempts(tenant_id,invoice_id) WHERE method='autopay';
CREATE OR REPLACE FUNCTION protect_payment_attempt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (to_jsonb(NEW)-ARRAY['state','transaction_id','redirect_url','provider_status','checked_at','error_code','charge_started_at']) IS DISTINCT FROM
 (to_jsonb(OLD)-ARRAY['state','transaction_id','redirect_url','provider_status','checked_at','error_code','charge_started_at']) OR
 (OLD.transaction_id IS NOT NULL AND NEW.transaction_id IS DISTINCT FROM OLD.transaction_id) OR
 (OLD.charge_started_at IS NOT NULL AND NEW.charge_started_at IS DISTINCT FROM OLD.charge_started_at) THEN
  RAISE EXCEPTION 'Payment attempt identity and charge start are immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
