ALTER TABLE tenants ADD COLUMN default_language text NOT NULL DEFAULT 'et' CHECK(default_language IN ('et','en','ru'));
ALTER TABLE memberships ADD COLUMN admin_language text NOT NULL DEFAULT 'et' CHECK(admin_language IN ('et','en','ru'));
ALTER TABLE bookings ADD COLUMN customer_language text NOT NULL DEFAULT 'et' CHECK(customer_language IN ('et','en','ru'));
ALTER TABLE outbox ADD COLUMN language text NOT NULL DEFAULT 'et' CHECK(language IN ('et','en','ru'));
COMMENT ON COLUMN bookings.customer_language IS 'Customer-selected interface language, preserved for notifications independently of staff and tenant preferences';
