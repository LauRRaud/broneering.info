ALTER TABLE invoices ADD CONSTRAINT credit_reason_required CHECK(kind<>'credit' OR correction_reason IS NOT NULL);
CREATE FUNCTION validate_full_credit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE original invoices%ROWTYPE;
BEGIN
 IF NEW.kind='credit' THEN
  SELECT * INTO original FROM invoices WHERE tenant_id=NEW.tenant_id AND id=NEW.original_invoice_id FOR UPDATE;
  IF NOT FOUND OR original.kind<>'invoice' OR original.status<>'issued' OR
   NEW.status<>'issued' OR NEW.issued_on IS NULL OR
   (NEW.subscription_id,NEW.period_start,NEW.period_end,NEW.currency,NEW.issuer_snapshot,NEW.recipient_snapshot,NEW.issuer_version,NEW.subtotal,NEW.tax,NEW.total)
   IS DISTINCT FROM
   (original.subscription_id,original.period_start,original.period_end,original.currency,original.issuer_snapshot,original.recipient_snapshot,original.issuer_version,-original.subtotal,-original.tax,-original.total) THEN
   RAISE EXCEPTION 'Full credit must reverse its original invoice' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER invoice_full_credit_valid BEFORE INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION validate_full_credit();
