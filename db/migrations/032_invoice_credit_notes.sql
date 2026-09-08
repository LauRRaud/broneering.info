ALTER TABLE invoices ADD COLUMN kind text NOT NULL DEFAULT 'invoice' CHECK(kind IN ('invoice','credit'));
ALTER TABLE invoices ADD COLUMN original_invoice_id uuid;
ALTER TABLE invoices ADD COLUMN correction_reason text;
ALTER TABLE invoices ADD CONSTRAINT invoice_original_fk FOREIGN KEY(tenant_id,original_invoice_id) REFERENCES invoices(tenant_id,id);
ALTER TABLE invoices ADD CONSTRAINT invoice_credit_reference CHECK(kind<>'credit' OR (original_invoice_id IS NOT NULL AND length(btrim(correction_reason)) BETWEEN 10 AND 500));
ALTER TABLE invoices DROP CONSTRAINT invoices_subtotal_check;
ALTER TABLE invoices DROP CONSTRAINT invoices_tax_check;
ALTER TABLE invoices DROP CONSTRAINT invoices_total_check;
ALTER TABLE invoices ADD CONSTRAINT invoice_signed_amounts CHECK(
 (kind='invoice' AND subtotal>=0 AND tax>=0 AND total>=0) OR
 (kind='credit' AND subtotal<=0 AND tax<=0 AND total<=0));
-- Replace the original four-column unique constraint regardless of PostgreSQL's truncated name.
DO $$ DECLARE item record; BEGIN
 FOR item IN SELECT conname FROM pg_constraint WHERE conrelid='invoices'::regclass AND contype='u'
 AND conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='invoices'::regclass AND attname='tenant_id'),
 (SELECT attnum FROM pg_attribute WHERE attrelid='invoices'::regclass AND attname='subscription_id'),
 (SELECT attnum FROM pg_attribute WHERE attrelid='invoices'::regclass AND attname='period_start'),
 (SELECT attnum FROM pg_attribute WHERE attrelid='invoices'::regclass AND attname='period_end')]::smallint[]
 LOOP EXECUTE format('ALTER TABLE invoices DROP CONSTRAINT %I',item.conname); END LOOP;
END $$;
CREATE UNIQUE INDEX invoice_active_period ON invoices(tenant_id,subscription_id,period_start,period_end) WHERE kind='invoice' AND status<>'void';
CREATE UNIQUE INDEX invoice_full_credit_once ON invoices(tenant_id,original_invoice_id) WHERE kind='credit';
GRANT UPDATE(status,void_reason) ON invoices TO booking_app;
