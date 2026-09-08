-- SQL CHECK treats NULL as satisfied: required conditional reasons must be explicit.
ALTER TABLE invoices ADD CONSTRAINT void_reason_required CHECK(status<>'void' OR (void_reason IS NOT NULL AND length(btrim(void_reason))>=3));
ALTER TABLE payment_records ADD CONSTRAINT reversal_reason_required CHECK(reversed_at IS NULL OR (reversal_reason IS NOT NULL AND length(btrim(reversal_reason))>=3));
CREATE FUNCTION protect_plan_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN
    RAISE EXCEPTION 'Create a new plan version instead of changing an existing one' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER plan_version_immutable BEFORE UPDATE ON plan_versions FOR EACH ROW EXECUTE FUNCTION protect_plan_version();
