ALTER TABLE subscriptions ADD COLUMN contract_start date;
UPDATE subscriptions SET contract_start=period_start;
ALTER TABLE subscriptions ALTER COLUMN contract_start SET NOT NULL;
CREATE OR REPLACE FUNCTION initialize_subscription_anchor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.anchor_day IS NULL THEN NEW.anchor_day=extract(day FROM NEW.period_start)::integer; END IF;
  IF NEW.contract_start IS NULL THEN NEW.contract_start=NEW.period_start; END IF;
  RETURN NEW;
END $$;
GRANT UPDATE(status,paid_through) ON subscriptions TO booking_app;
ALTER TABLE payment_records ADD COLUMN bank_entry_id text CHECK(length(btrim(bank_entry_id)) BETWEEN 1 AND 200);
CREATE UNIQUE INDEX payment_bank_entry_once ON payment_records(tenant_id,invoice_id,bank_entry_id)
WHERE reversed_at IS NULL AND bank_entry_id IS NOT NULL;
GRANT INSERT ON payment_records TO booking_app;
GRANT UPDATE(reversed_at,reversed_by,reversal_reason,version) ON payment_records TO booking_app;
GRANT UPDATE(version) ON invoices TO booking_app;
