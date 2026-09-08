ALTER TABLE invoices ADD COLUMN replaced_invoice_id uuid;
ALTER TABLE invoices ADD CONSTRAINT invoice_replaced_fk FOREIGN KEY(tenant_id,replaced_invoice_id) REFERENCES invoices(tenant_id,id);
CREATE FUNCTION validate_invoice_replacement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE original invoices%ROWTYPE;
BEGIN
 IF NEW.replaced_invoice_id IS NOT NULL THEN
  SELECT * INTO original FROM invoices WHERE tenant_id=NEW.tenant_id AND id=NEW.replaced_invoice_id FOR UPDATE;
  IF NOT FOUND OR original.kind<>'invoice' OR original.status<>'void' OR NEW.kind<>'invoice' OR NEW.status<>'issued'
   OR (NEW.subscription_id,NEW.period_start,NEW.period_end,NEW.currency,NEW.total)
    IS DISTINCT FROM (original.subscription_id,original.period_start,original.period_end,original.currency,original.total)
   OR NOT EXISTS(SELECT 1 FROM invoices c WHERE c.tenant_id=NEW.tenant_id AND c.original_invoice_id=original.id AND c.kind='credit') THEN
   RAISE EXCEPTION 'Replacement requires a fully credited invoice for the same period and total' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER invoice_replacement_valid BEFORE INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION validate_invoice_replacement();
