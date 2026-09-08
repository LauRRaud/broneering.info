ALTER TABLE invoice_mail_outbox ADD COLUMN kind text NOT NULL DEFAULT 'issued' CHECK(kind IN ('issued','overdue'));
ALTER TABLE invoice_mail_outbox DROP CONSTRAINT invoice_mail_outbox_tenant_id_invoice_id_key;
ALTER TABLE invoice_mail_outbox ADD UNIQUE(tenant_id,invoice_id,kind);
