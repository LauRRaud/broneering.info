CREATE TABLE invoice_payment_links (
 tenant_id uuid NOT NULL REFERENCES tenants(id),invoice_id uuid NOT NULL,
 token_hash text NOT NULL CHECK(token_hash ~ '^[0-9a-f]{64}$'),encrypted_token text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),revoked_at timestamptz,
 PRIMARY KEY(tenant_id,invoice_id),UNIQUE(token_hash),
 FOREIGN KEY(tenant_id,invoice_id) REFERENCES invoices(tenant_id,id)
);
ALTER TABLE invoice_payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payment_links FORCE ROW LEVEL SECURITY;
CREATE POLICY invoice_link_tenant ON invoice_payment_links USING(tenant_id=current_setting('app.tenant_id',true)::uuid) WITH CHECK(tenant_id=current_setting('app.tenant_id',true)::uuid);
GRANT SELECT,INSERT ON invoice_payment_links TO booking_app;
GRANT UPDATE(revoked_at) ON invoice_payment_links TO booking_app;
