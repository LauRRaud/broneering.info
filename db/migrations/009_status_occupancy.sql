-- Completing attendance does not release the agreed post-service buffer.
-- Only an explicit cancellation releases occupancy.
ALTER TABLE bookings DROP CONSTRAINT bookings_tenant_id_staff_id_occupied_excl;
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (tenant_id WITH =, staff_id WITH =, occupied WITH &&)
  WHERE (status <> 'cancelled');
