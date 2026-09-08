CREATE TABLE payment_refunds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),payment_id uuid NOT NULL,provider_attempt_id uuid NOT NULL,event_id uuid NOT NULL,
 amount integer NOT NULL CHECK(amount>0),total_refunded integer NOT NULL CHECK(total_refunded>=amount),
 refunded_at timestamptz NOT NULL,recorded_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,provider_attempt_id,total_refunded),UNIQUE(event_id),
 FOREIGN KEY(tenant_id,payment_id) REFERENCES payment_records(tenant_id,id),
 FOREIGN KEY(tenant_id,provider_attempt_id) REFERENCES payment_attempts(tenant_id,id),
 FOREIGN KEY(event_id) REFERENCES payment_provider_events(id)
);
ALTER TABLE payment_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_refunds FORCE ROW LEVEL SECURITY;
CREATE POLICY payment_refund_tenant ON payment_refunds USING(tenant_id=current_setting('app.tenant_id',true)::uuid) WITH CHECK(tenant_id=current_setting('app.tenant_id',true)::uuid);
GRANT SELECT,INSERT ON payment_refunds TO booking_app;
CREATE INDEX payment_refund_receipt ON payment_refunds(tenant_id,payment_id);
CREATE FUNCTION invoice_paid_amount(p_tenant uuid,p_invoice uuid) RETURNS bigint LANGUAGE sql STABLE AS $$
 SELECT COALESCE((SELECT sum(p.amount) FROM payment_records p WHERE p.tenant_id=p_tenant AND p.invoice_id=p_invoice AND p.reversed_at IS NULL),0)
 -COALESCE((SELECT sum(r.amount) FROM payment_refunds r JOIN payment_records p ON (p.tenant_id,p.id)=(r.tenant_id,r.payment_id)
 WHERE p.tenant_id=p_tenant AND p.invoice_id=p_invoice AND p.reversed_at IS NULL),0)
$$;
GRANT EXECUTE ON FUNCTION invoice_paid_amount(uuid,uuid) TO booking_app;
