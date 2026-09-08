ALTER TABLE tenants ADD COLUMN booking_terms text NOT NULL DEFAULT '' CHECK(length(booking_terms)<=5000);
ALTER TABLE tenants ADD COLUMN reviewed_rules_version integer;
ALTER TABLE tenants ADD COLUMN published_at timestamptz;
ALTER TABLE bookings ADD COLUMN is_test boolean NOT NULL DEFAULT false;
UPDATE bookings b SET is_test=true FROM tenants t WHERE t.id=b.tenant_id AND t.demo;
CREATE INDEX booking_test_tenant ON bookings(tenant_id) WHERE is_test;
