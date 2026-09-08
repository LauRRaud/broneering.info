ALTER TABLE tenants
  ADD COLUMN booking_stops_at timestamptz,
  ADD COLUMN service_ends_at timestamptz,
  ADD COLUMN data_access_until timestamptz,
  ADD COLUMN deletion_not_before timestamptz,
  ADD COLUMN exit_agreement text,
  ADD COLUMN exit_approved_by text REFERENCES auth_user(id),
  ADD COLUMN exit_approved_at timestamptz,
  ADD COLUMN exit_version integer NOT NULL DEFAULT 1 CHECK(exit_version>0),
  ADD CONSTRAINT company_exit_complete CHECK(
    num_nonnulls(booking_stops_at,service_ends_at,data_access_until,deletion_not_before,exit_agreement,exit_approved_by,exit_approved_at)=0 OR
    (num_nonnulls(booking_stops_at,service_ends_at,data_access_until,deletion_not_before,exit_agreement,exit_approved_by,exit_approved_at)=7
      AND booking_stops_at<=service_ends_at AND service_ends_at<=data_access_until
      AND data_access_until<=deletion_not_before AND length(btrim(exit_agreement)) BETWEEN 10 AND 1000));
GRANT UPDATE(ends_at,version) ON subscriptions TO booking_app;
COMMENT ON COLUMN tenants.deletion_not_before IS 'Earliest contract-approved deletion time, not an automatic deletion instruction; retention policy and legal holds still apply';
