CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_key text NOT NULL,
  name text NOT NULL CHECK(length(name) BETWEEN 2 AND 120),
  email text, phone text,
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,id), UNIQUE(tenant_id,source_key)
);
ALTER TABLE bookings ADD COLUMN customer_id uuid;
ALTER TABLE bookings ADD FOREIGN KEY(tenant_id,customer_id) REFERENCES customers(tenant_id,id);
-- Match only the complete original contact snapshot; never merge by name/email alone.
-- Without a contact, each booking gets its own profile.
CREATE FUNCTION booking_customer_key(n text,e text,p text,b uuid) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN coalesce(e,'')='' AND coalesce(p,'')='' THEN b::text
    ELSE jsonb_build_array(n,e,p)::text END
$$;
INSERT INTO customers(tenant_id,source_key,name,email,phone)
SELECT DISTINCT tenant_id,booking_customer_key(customer_name,customer_email,customer_phone,id),customer_name,customer_email,customer_phone FROM bookings;
UPDATE bookings b SET customer_id=c.id FROM customers c
WHERE c.tenant_id=b.tenant_id AND c.source_key=booking_customer_key(b.customer_name,b.customer_email,b.customer_phone,b.id);
ALTER TABLE bookings ALTER COLUMN customer_id SET NOT NULL;
CREATE FUNCTION assign_booking_customer() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO customers(tenant_id,source_key,name,email,phone)
  VALUES(NEW.tenant_id,booking_customer_key(NEW.customer_name,NEW.customer_email,NEW.customer_phone,NEW.id),NEW.customer_name,NEW.customer_email,NEW.customer_phone)
  ON CONFLICT(tenant_id,source_key) DO UPDATE SET source_key=EXCLUDED.source_key
  RETURNING id INTO NEW.customer_id;
  RETURN NEW;
END $$;
CREATE TRIGGER assign_booking_customer BEFORE INSERT ON bookings FOR EACH ROW EXECUTE FUNCTION assign_booking_customer();
CREATE INDEX bookings_customer_history ON bookings(tenant_id,customer_id,start_at,id);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON customers
USING(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid)
WITH CHECK(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid);
GRANT SELECT,INSERT,UPDATE ON customers TO booking_app;
