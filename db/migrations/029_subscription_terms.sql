-- Owner-approved terms: EUR 35 gross, unlimited staff, no trial, due in 7 days, no grace.
INSERT INTO plan_versions(id,version,code,name,monthly_price,currency,staff_limit,entitlements)
VALUES('e3a9a986-fc1f-4d22-b548-99e18f6a7929',1,'standard','Standard',3500,'EUR',NULL,
  '{"taxIncluded":true,"trialDays":0,"paymentTermDays":7,"graceDays":0}');

ALTER TABLE subscriptions ADD COLUMN anchor_day integer;
UPDATE subscriptions SET anchor_day=extract(day FROM period_start)::integer;
ALTER TABLE subscriptions ALTER COLUMN anchor_day SET NOT NULL;
ALTER TABLE subscriptions ADD CONSTRAINT subscription_anchor CHECK(anchor_day BETWEEN 1 AND 31);
-- Old fixtures/imported subscriptions can omit the anchor; new commands persist it explicitly.
CREATE FUNCTION initialize_subscription_anchor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.anchor_day IS NULL THEN NEW.anchor_day=extract(day FROM NEW.period_start)::integer; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER subscription_anchor_default BEFORE INSERT ON subscriptions
FOR EACH ROW EXECUTE FUNCTION initialize_subscription_anchor();
ALTER TABLE subscriptions ADD CONSTRAINT standard_no_trial CHECK(
  plan_id<>'e3a9a986-fc1f-4d22-b548-99e18f6a7929' OR (status<>'trial' AND trial_ends_at IS NULL));

CREATE TABLE billing_commands (
  tenant_id uuid NOT NULL REFERENCES tenants(id),request_key uuid NOT NULL,
  action text NOT NULL CHECK(length(action) BETWEEN 1 AND 80),
  payload_hash text NOT NULL CHECK(payload_hash ~ '^[0-9a-f]{64}$'),
  reply jsonb NOT NULL CHECK(jsonb_typeof(reply)='object'),
  actor_user_id text NOT NULL REFERENCES auth_user(id),created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,request_key)
);
ALTER TABLE billing_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_commands FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON billing_commands
USING(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid)
WITH CHECK(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid);
GRANT SELECT,INSERT ON billing_commands TO booking_app;
GRANT INSERT ON subscriptions TO booking_app;
GRANT UPDATE(billing_contact_name,billing_email) ON subscriptions TO booking_app;
