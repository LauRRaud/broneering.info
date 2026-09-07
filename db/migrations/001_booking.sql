CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z][a-z0-9-]{1,48}[a-z0-9]$' AND slug NOT IN ('haldus','app','api','admin','cdn','www','mail')),
  name text NOT NULL, address text NOT NULL, description text NOT NULL DEFAULT '',
  timezone text NOT NULL DEFAULT 'Europe/Tallinn',
  lead_minutes integer NOT NULL DEFAULT 120 CHECK (lead_minutes >= 0),
  window_days integer NOT NULL DEFAULT 90 CHECK (window_days BETWEEN 1 AND 365),
  step_minutes integer NOT NULL DEFAULT 15 CHECK (step_minutes BETWEEN 5 AND 60),
  cancellation_hours integer NOT NULL DEFAULT 24 CHECK (cancellation_hours >= 0),
  active boolean NOT NULL DEFAULT true, demo boolean NOT NULL DEFAULT true
);
CREATE TABLE tenant_domains (
  hostname text PRIMARY KEY CHECK (hostname = lower(hostname)),
  tenant_id uuid NOT NULL REFERENCES tenants(id)
);
CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL, description text NOT NULL DEFAULT '', category text NOT NULL,
  active boolean NOT NULL DEFAULT true, online boolean NOT NULL DEFAULT true,
  UNIQUE (tenant_id,id)
);
CREATE TABLE staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL, title text NOT NULL DEFAULT '', active boolean NOT NULL DEFAULT true,
  online boolean NOT NULL DEFAULT true, UNIQUE (tenant_id,id)
);
CREATE TABLE staff_services (
  tenant_id uuid NOT NULL REFERENCES tenants(id), staff_id uuid NOT NULL, service_id uuid NOT NULL,
  price integer NOT NULL CHECK (price >= 0), duration integer NOT NULL CHECK (duration BETWEEN 5 AND 720),
  buffer_before integer NOT NULL DEFAULT 0 CHECK (buffer_before BETWEEN 0 AND 240),
  buffer_after integer NOT NULL DEFAULT 0 CHECK (buffer_after BETWEEN 0 AND 240),
  PRIMARY KEY (tenant_id,staff_id,service_id),
  FOREIGN KEY (tenant_id,staff_id) REFERENCES staff(tenant_id,id),
  FOREIGN KEY (tenant_id,service_id) REFERENCES services(tenant_id,id)
);
-- A NULL staff_id means location hours. Multiple intervals per day are supported.
CREATE TABLE weekly_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  staff_id uuid, weekday integer NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_minute integer NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
  end_minute integer NOT NULL CHECK (end_minute BETWEEN 1 AND 1440 AND end_minute > start_minute),
  FOREIGN KEY (tenant_id,staff_id) REFERENCES staff(tenant_id,id)
);
CREATE TABLE schedule_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  staff_id uuid, day date NOT NULL, closed boolean NOT NULL DEFAULT true,
  intervals jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(intervals) = 'array'),
  UNIQUE NULLS NOT DISTINCT (tenant_id,staff_id,day),
  FOREIGN KEY (tenant_id,staff_id) REFERENCES staff(tenant_id,id)
);
CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  reference text NOT NULL UNIQUE, service_id uuid NOT NULL, staff_id uuid NOT NULL,
  service_name text NOT NULL, staff_name text NOT NULL,
  customer_name text NOT NULL, customer_email text NOT NULL, customer_phone text,
  start_at timestamptz NOT NULL, end_at timestamptz NOT NULL CHECK (end_at > start_at),
  occupied tstzrange NOT NULL CHECK (NOT isempty(occupied) AND NOT lower_inf(occupied) AND NOT upper_inf(occupied)
    AND lower_inc(occupied) AND NOT upper_inc(occupied) AND lower(occupied) <= start_at AND upper(occupied) >= end_at),
  price integer NOT NULL CHECK (price >= 0), currency text NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  duration integer NOT NULL CHECK (duration > 0), buffer_before integer NOT NULL, buffer_after integer NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,id),
  FOREIGN KEY (tenant_id,staff_id) REFERENCES staff(tenant_id,id),
  FOREIGN KEY (tenant_id,service_id) REFERENCES services(tenant_id,id),
  EXCLUDE USING gist (tenant_id WITH =, staff_id WITH =, occupied WITH &&) WHERE (status = 'confirmed')
);
CREATE TABLE booking_requests (
  tenant_id uuid NOT NULL REFERENCES tenants(id), request_key uuid NOT NULL,
  payload_hash text NOT NULL, booking_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id,request_key),
  FOREIGN KEY (tenant_id,booking_id) REFERENCES bookings(tenant_id,id)
);
CREATE TABLE outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
  booking_id uuid NOT NULL, booking_version integer NOT NULL,
  kind text NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,booking_id,booking_version,kind),
  FOREIGN KEY (tenant_id,booking_id) REFERENCES bookings(tenant_id,id)
);
CREATE INDEX weekly_hours_tenant_staff ON weekly_hours(tenant_id,staff_id,weekday);
CREATE INDEX bookings_tenant_start ON bookings(tenant_id,start_at);
CREATE INDEX outbox_pending ON outbox(tenant_id,status,created_at);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['services','staff','staff_services','weekly_hours','schedule_exceptions','bookings','booking_requests','outbox'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)', t);
  END LOOP;
END $$;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO booking_app;
GRANT SELECT ON tenants,tenant_domains,services,staff,staff_services,weekly_hours,schedule_exceptions,bookings,booking_requests,outbox TO booking_app;
GRANT INSERT ON bookings,booking_requests,outbox TO booking_app;
-- Row locks require UPDATE privileges. No public API exposes these writes.
GRANT UPDATE ON tenants,staff TO booking_app;
