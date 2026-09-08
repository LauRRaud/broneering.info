-- Operational, cross-process admission control. Keys are hashes of server-derived
-- scopes, never raw email addresses, bearer tokens, IPs or customer data.
CREATE TABLE request_limits (
  key_hash text PRIMARY KEY CHECK(key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz NOT NULL,
  requests integer NOT NULL CHECK(requests BETWEEN 1 AND 10000),
  rejected integer NOT NULL DEFAULT 0 CHECK(rejected BETWEEN 0 AND 1000000)
);
CREATE INDEX request_limits_expiry ON request_limits(window_started_at);
REVOKE ALL ON request_limits FROM PUBLIC, booking_app;

CREATE FUNCTION consume_request_limit(p_key text,p_maximum integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE accepted boolean; at_time timestamptz:=clock_timestamp();
BEGIN
  IF p_key IS NULL OR p_key !~ '^[0-9a-f]{64}$' OR p_maximum IS NULL OR p_maximum NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION 'Invalid admission scope' USING ERRCODE='22023';
  END IF;
  -- Bounded housekeeping; counters are operational and expire after a day.
  DELETE FROM public.request_limits WHERE key_hash IN (
    SELECT key_hash FROM public.request_limits WHERE window_started_at < at_time-interval '1 day'
    ORDER BY window_started_at LIMIT 64 FOR UPDATE SKIP LOCKED
  );
  INSERT INTO public.request_limits AS r(key_hash,window_started_at,requests,rejected)
  VALUES(p_key,at_time,1,0)
  ON CONFLICT(key_hash) DO UPDATE SET
    window_started_at=CASE WHEN r.window_started_at<=at_time-interval '1 minute' THEN at_time ELSE r.window_started_at END,
    requests=CASE WHEN r.window_started_at<=at_time-interval '1 minute' THEN 1 ELSE LEAST(r.requests+1,p_maximum) END,
    rejected=CASE WHEN r.window_started_at<=at_time-interval '1 minute' THEN 0 WHEN r.requests>=p_maximum THEN LEAST(r.rejected+1,1000000) ELSE r.rejected END
  RETURNING rejected=0 INTO accepted;
  RETURN accepted;
END $$;
REVOKE ALL ON FUNCTION consume_request_limit(text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_request_limit(text,integer) TO booking_app;
