ALTER TABLE customers ADD COLUMN merged_into_id uuid,
 ADD FOREIGN KEY(tenant_id,merged_into_id) REFERENCES customers(tenant_id,id),
 ADD CHECK(merged_into_id IS NULL OR merged_into_id<>id);
CREATE INDEX customer_merge_target ON customers(tenant_id,merged_into_id) WHERE merged_into_id IS NOT NULL;
CREATE TABLE customer_merges (
 tenant_id uuid NOT NULL REFERENCES tenants(id),request_key uuid NOT NULL,source_id uuid NOT NULL,target_id uuid NOT NULL,
 payload_hash text NOT NULL,booking_count integer NOT NULL CHECK(booking_count>=0),created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,request_key),FOREIGN KEY(tenant_id,source_id) REFERENCES customers(tenant_id,id),FOREIGN KEY(tenant_id,target_id) REFERENCES customers(tenant_id,id),CHECK(source_id<>target_id)
);
ALTER TABLE customer_merges ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_merges FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON customer_merges USING(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid) WITH CHECK(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid);
GRANT SELECT,INSERT ON customer_merges TO booking_app;
-- Preserve exact contact matching through explicitly merged aliases. Merge commands
-- flatten aliases under the tenant lock; unrelated same-email customers stay separate.
CREATE OR REPLACE FUNCTION assign_booking_customer() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE customer uuid;
BEGIN
 INSERT INTO customers(tenant_id,source_key,name,email,phone)
 VALUES(NEW.tenant_id,booking_customer_key(NEW.customer_name,NEW.customer_email,NEW.customer_phone,NEW.id),NEW.customer_name,NEW.customer_email,NEW.customer_phone)
 ON CONFLICT(tenant_id,source_key) DO UPDATE SET source_key=EXCLUDED.source_key
 RETURNING COALESCE(merged_into_id,id) INTO customer;
 NEW.customer_id:=customer;
 RETURN NEW;
END $$;
