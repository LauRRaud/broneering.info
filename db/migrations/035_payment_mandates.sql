ALTER TABLE subscriptions ADD COLUMN payment_mode text NOT NULL DEFAULT 'invoice' CHECK(payment_mode IN ('invoice','autopay'));
GRANT UPDATE(payment_mode) ON subscriptions TO booking_app;
ALTER TABLE payment_attempts DROP CONSTRAINT payment_attempts_amount_check;
ALTER TABLE payment_attempts ADD CONSTRAINT payment_attempt_amount CHECK(amount BETWEEN 0 AND 100000000 AND (amount>0 OR method='enroll'));
ALTER TABLE payment_provider_events ADD COLUMN available_at timestamptz NOT NULL DEFAULT now();
GRANT UPDATE(available_at) ON payment_provider_events TO booking_app;
CREATE TABLE payment_mandates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),subscription_id uuid NOT NULL,setup_attempt_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','revoked','failed','expired','test_complete')),
 consent_by text NOT NULL REFERENCES auth_user(id),consent_at timestamptz NOT NULL DEFAULT now(),terms jsonb NOT NULL CHECK(jsonb_typeof(terms)='object'),
 encrypted_token text,valid_until date,activated_at timestamptz,revoked_at timestamptz,revoked_by text REFERENCES auth_user(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,setup_attempt_id),
 FOREIGN KEY(tenant_id,subscription_id) REFERENCES subscriptions(tenant_id,id),
 FOREIGN KEY(tenant_id,setup_attempt_id) REFERENCES payment_attempts(tenant_id,id),
 CHECK(status<>'active' OR (encrypted_token IS NOT NULL AND valid_until IS NOT NULL AND activated_at IS NOT NULL)),
 CHECK(status<>'revoked' OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL AND encrypted_token IS NULL))
);
CREATE UNIQUE INDEX payment_one_mandate ON payment_mandates(tenant_id) WHERE status IN ('pending','active');
ALTER TABLE payment_mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_mandates FORCE ROW LEVEL SECURITY;
CREATE POLICY payment_mandate_tenant ON payment_mandates USING(tenant_id=current_setting('app.tenant_id',true)::uuid) WITH CHECK(tenant_id=current_setting('app.tenant_id',true)::uuid);
GRANT SELECT,INSERT ON payment_mandates TO booking_app;
GRANT UPDATE(status,encrypted_token,valid_until,activated_at,revoked_at,revoked_by,version) ON payment_mandates TO booking_app;
CREATE FUNCTION protect_payment_mandate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (to_jsonb(NEW)-ARRAY['status','encrypted_token','valid_until','activated_at','revoked_at','revoked_by','version']) IS DISTINCT FROM
 (to_jsonb(OLD)-ARRAY['status','encrypted_token','valid_until','activated_at','revoked_at','revoked_by','version']) OR
 (OLD.status='revoked' AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD)) THEN
  RAISE EXCEPTION 'Mandate consent and revocation are immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER payment_mandate_immutable BEFORE UPDATE ON payment_mandates FOR EACH ROW EXECUTE FUNCTION protect_payment_mandate();
