CREATE TABLE invoice_mail_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),invoice_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','failed','sent','capture','skipped')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),next_attempt_at timestamptz NOT NULL DEFAULT now(),
 last_error_code text,sent_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,invoice_id),FOREIGN KEY(tenant_id,invoice_id) REFERENCES invoices(tenant_id,id) ON DELETE CASCADE
);
ALTER TABLE invoice_mail_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_mail_outbox FORCE ROW LEVEL SECURITY;
CREATE POLICY invoice_mail_tenant ON invoice_mail_outbox USING(tenant_id=current_setting('app.tenant_id',true)::uuid) WITH CHECK(tenant_id=current_setting('app.tenant_id',true)::uuid);
GRANT SELECT,INSERT,UPDATE ON invoice_mail_outbox TO booking_app;
CREATE INDEX invoice_mail_pending ON invoice_mail_outbox(tenant_id,next_attempt_at) WHERE status IN ('pending','failed');
