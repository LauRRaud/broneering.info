-- Chapter 13: enforce the existing V1 model without copying canonical records.
ALTER TABLE bookings
  ADD CONSTRAINT booking_version_positive CHECK(version>0),
  ADD CONSTRAINT booking_duration_bounds CHECK(duration BETWEEN 5 AND 720),
  ADD CONSTRAINT booking_buffer_bounds CHECK(buffer_before BETWEEN 0 AND 240 AND buffer_after BETWEEN 0 AND 240),
  ADD CONSTRAINT booking_duration_matches_time CHECK(end_at=start_at+duration*interval '1 minute'),
  ADD CONSTRAINT booking_allocation_matches_buffers CHECK(
    lower(occupied)=start_at-buffer_before*interval '1 minute' AND
    upper(occupied)=end_at+buffer_after*interval '1 minute');
ALTER TABLE services ADD CONSTRAINT services_version_positive CHECK(version>0),
  ADD COLUMN currency text NOT NULL DEFAULT 'EUR' CHECK(currency='EUR');
ALTER TABLE staff_services ADD CONSTRAINT staff_services_version_positive CHECK(version>0),
  ADD CONSTRAINT staff_services_price_bounds CHECK(price<=100000000),
  ADD COLUMN currency text NOT NULL DEFAULT 'EUR' CHECK(currency='EUR');
ALTER TABLE service_groups ADD CONSTRAINT service_groups_version_positive CHECK(version>0);
ALTER TABLE staff ADD CONSTRAINT staff_version_positive CHECK(version>0);
ALTER TABLE tenants ADD CONSTRAINT tenant_rules_version_positive CHECK(rules_version>0),
  ADD CONSTRAINT tenant_management_version_positive CHECK(management_policy_version>0);

-- A location is 1:1 with the tenant in V1. This projection has no independent
-- address/timezone copy that could diverge from the availability engine.
CREATE VIEW locations WITH(security_invoker=true,security_barrier=true) AS
  SELECT id, id AS tenant_id,address,timezone,rules_version AS version
  FROM tenants WHERE id=nullif(current_setting('app.tenant_id',true),'')::uuid;
-- V1 allocates exactly one staff member. The same canonical range is protected
-- by bookings_no_overlap, including attendance states and both buffers.
CREATE VIEW booking_allocations WITH(security_invoker=true) AS
  SELECT id,tenant_id,id AS booking_id,staff_id,start_at AS service_start,end_at AS service_end,
    occupied,buffer_before,buffer_after,version,status<>'cancelled' AS active FROM bookings;
GRANT SELECT ON locations,booking_allocations TO booking_app;

CREATE FUNCTION valid_tenant_timezone() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=NEW.timezone) THEN
    RAISE EXCEPTION 'Unknown location time zone' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tenant_timezone_valid BEFORE INSERT OR UPDATE OF timezone ON tenants FOR EACH ROW EXECUTE FUNCTION valid_tenant_timezone();

CREATE FUNCTION valid_schedule_intervals(value jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE item jsonb; first_minute integer; last_minute integer; previous_end integer := -1;
BEGIN
  IF jsonb_typeof(value)<>'array' THEN RETURN false; END IF;
  FOR item IN SELECT v FROM jsonb_array_elements(value) AS items(v) ORDER BY (v->>0)::numeric LOOP
    IF jsonb_typeof(item)<>'array' OR jsonb_array_length(item)<>2 OR
      jsonb_typeof(item->0)<>'number' OR jsonb_typeof(item->1)<>'number' OR
      (item->>0)::numeric<>trunc((item->>0)::numeric) OR (item->>1)::numeric<>trunc((item->>1)::numeric) THEN RETURN false; END IF;
    first_minute:=(item->>0)::integer; last_minute:=(item->>1)::integer;
    IF first_minute<0 OR last_minute>1440 OR first_minute>=last_minute OR first_minute<previous_end THEN RETURN false; END IF;
    previous_end:=last_minute;
  END LOOP;
  RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
ALTER TABLE schedule_exceptions ADD CONSTRAINT exception_intervals_valid CHECK(valid_schedule_intervals(intervals)),
  ADD CONSTRAINT closed_exception_empty CHECK(NOT closed OR intervals='[]'::jsonb);
ALTER TABLE weekly_hours ADD CONSTRAINT weekly_staff_no_overlap EXCLUDE USING gist
  (tenant_id WITH =,staff_id WITH =,weekday WITH =,int4range(start_minute,end_minute,'[)') WITH &&) WHERE(staff_id IS NOT NULL);
ALTER TABLE weekly_hours ADD CONSTRAINT weekly_location_no_overlap EXCLUDE USING gist
  (tenant_id WITH =,weekday WITH =,int4range(start_minute,end_minute,'[)') WITH &&) WHERE(staff_id IS NULL);

-- Queue metadata; actual SMTP claiming/sending remains chapter 17.
ALTER TABLE outbox
  ADD CONSTRAINT outbox_booking_version_positive CHECK(booking_version>0),
  ADD COLUMN attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
  ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN last_attempt_at timestamptz,
  ADD COLUMN last_error_code text CHECK(last_error_code ~ '^[A-Z0-9_]{1,100}$'),
  ADD COLUMN sent_at timestamptz,
  ADD COLUMN delivery_status text NOT NULL DEFAULT 'unknown' CHECK(delivery_status IN ('unknown','delivered','bounced')),
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0);
CREATE INDEX outbox_due ON outbox(next_attempt_at,tenant_id,id) WHERE status IN ('pending','failed');
COMMENT ON COLUMN bookings.customer_name IS 'Service recipient name snapshot; email and phone may belong to a separate contact person';
COMMENT ON COLUMN customers.source_key IS 'Original complete contact snapshot used for exact grouping; contains personal data and must be included in the retention/anonymisation workflow';
