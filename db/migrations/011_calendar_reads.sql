-- Keep frequent calendar refreshes and customer history reads bounded by tenant.
CREATE INDEX outbox_booking_notice ON outbox(tenant_id,booking_id,booking_version,created_at DESC,id DESC);
CREATE INDEX bookings_tenant_staff_start ON bookings(tenant_id,staff_id,start_at,id);
CREATE INDEX customers_tenant_name ON customers(tenant_id,name,id);
CREATE INDEX customer_correction_history ON access_audit_log(tenant_id,target_id,created_at DESC)
WHERE action='customer.correct';
