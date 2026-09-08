ALTER TABLE customers ADD COLUMN contact_redacted_at timestamptz;
ALTER TABLE bookings ADD COLUMN contact_redacted_at timestamptz;
CREATE TABLE contact_removals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 customer_ids uuid[] NOT NULL,booking_ids uuid[] NOT NULL,removed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 requested_by text REFERENCES auth_user(id),UNIQUE(tenant_id,id)
);
ALTER TABLE contact_removals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_removals FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON contact_removals USING(tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid);
GRANT SELECT ON contact_removals TO booking_app;

CREATE FUNCTION protect_removed_contacts() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.contact_redacted_at IS NOT NULL THEN
  IF TG_TABLE_NAME='customers' THEN
   IF (to_jsonb(NEW)-ARRAY['version','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['version','updated_at']) THEN
    RAISE EXCEPTION 'Removed customer contacts cannot be restored' USING ERRCODE='23514';
   END IF;
  ELSIF NEW.customer_name IS DISTINCT FROM OLD.customer_name OR NEW.customer_email IS DISTINCT FROM OLD.customer_email
    OR NEW.customer_phone IS DISTINCT FROM OLD.customer_phone OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
    OR NEW.contact_redacted_at IS DISTINCT FROM OLD.contact_redacted_at THEN
   RAISE EXCEPTION 'Removed booking contacts cannot be restored' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER removed_customer_contacts BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION protect_removed_contacts();
CREATE TRIGGER removed_booking_contacts BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION protect_removed_contacts();

-- Narrow exception to append-only audit permissions. Every relation is tenant-qualified;
-- callers cannot provide replacement audit payloads or another actor identity.
CREATE FUNCTION remove_customer_contacts(p_tenant uuid,p_customer uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE root_id uuid; ids uuid[]; bids uuid[]; removal_id uuid; actor_id text; redacted jsonb;
BEGIN
 actor_id:=nullif(current_setting('app.user_id',true),'');
 IF p_tenant IS DISTINCT FROM nullif(current_setting('app.tenant_id',true),'')::uuid OR actor_id IS NULL
 OR NOT EXISTS(SELECT 1 FROM public.memberships m JOIN public.auth_user u ON u.id=m.user_id
  WHERE m.tenant_id=p_tenant AND m.user_id=actor_id AND m.active AND m.role='owner' AND u.email_verified AND u.two_factor_enabled) THEN
  RAISE EXCEPTION 'Owner required' USING ERRCODE='42501';
 END IF;
 PERFORM id FROM public.tenants WHERE id=p_tenant FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.retention_policies WHERE tenant_id=p_tenant AND data_class IN ('booking_contacts','audit') AND legal_hold) THEN
  RAISE EXCEPTION 'Retention obligation prevents removal' USING ERRCODE='23514';
 END IF;
 IF EXISTS(SELECT 1 FROM public.import_batches WHERE tenant_id=p_tenant AND kind IN ('customers','bookings') AND source_purged_at IS NULL) THEN
  RAISE EXCEPTION 'Remove import source copies first' USING ERRCODE='23514';
 END IF;
 SELECT coalesce(merged_into_id,id) INTO root_id FROM public.customers WHERE tenant_id=p_tenant AND id=p_customer;
 IF root_id IS NULL THEN RAISE EXCEPTION 'Customer not found' USING ERRCODE='23514'; END IF;
 SELECT array_agg(id ORDER BY id) INTO ids FROM public.customers WHERE tenant_id=p_tenant AND (id=root_id OR merged_into_id=root_id);
 SELECT coalesce(array_agg(id ORDER BY id),'{}'::uuid[]) INTO bids FROM public.bookings WHERE tenant_id=p_tenant AND customer_id=ANY(ids);
 IF EXISTS(SELECT 1 FROM public.bookings WHERE tenant_id=p_tenant AND id=ANY(bids) AND status='confirmed' AND end_at>clock_timestamp()) THEN
  RAISE EXCEPTION 'Future active bookings prevent removal' USING ERRCODE='23514';
 END IF;
 IF EXISTS(SELECT 1 FROM public.customers WHERE tenant_id=p_tenant AND id=root_id AND contact_redacted_at IS NOT NULL) THEN
  SELECT id INTO removal_id FROM public.contact_removals WHERE tenant_id=p_tenant AND root_id=ANY(customer_ids) ORDER BY removed_at DESC LIMIT 1;
  RETURN removal_id;
 END IF;
 redacted:=jsonb_build_object('name','[removed]','email',NULL,'phone',NULL);
 UPDATE public.customers SET name='[removed]',email=NULL,phone=NULL,source_key='redacted:'||id::text,
  contact_redacted_at=clock_timestamp(),version=version+1,updated_at=clock_timestamp() WHERE tenant_id=p_tenant AND id=ANY(ids);
 UPDATE public.bookings SET customer_name='[removed]',customer_email=NULL,customer_phone=NULL,attention_reason=NULL,
  customer_notifications=false,contact_redacted_at=clock_timestamp(),version=version+1,updated_at=clock_timestamp() WHERE tenant_id=p_tenant AND id=ANY(bids);
 UPDATE public.booking_events SET reason='',before_data=before_data-'attentionReason',after_data=after_data-'attentionReason'
  WHERE tenant_id=p_tenant AND booking_id=ANY(bids);
 UPDATE public.access_audit_log SET metadata=CASE
  WHEN action='customer.correct' THEN jsonb_build_object('before',coalesce(metadata->'before','{}')||redacted,'after',coalesce(metadata->'after','{}')||redacted,'reason','')
  WHEN action='customer.merge' THEN jsonb_build_object('source',coalesce(metadata->'source','{}')||redacted,'target',coalesce(metadata->'target','{}')||redacted,'reason','','bookingsMoved',metadata->'bookingsMoved')
  ELSE '{}'::jsonb END
  WHERE tenant_id=p_tenant AND (target_id=ANY(ids::text[]) OR target_id=ANY(bids::text[]));
 UPDATE public.booking_management_tokens SET revoked_at=coalesce(revoked_at,clock_timestamp()),encrypted_token=NULL WHERE tenant_id=p_tenant AND booking_id=ANY(bids);
 UPDATE public.booking_requests SET encrypted_link=NULL WHERE tenant_id=p_tenant AND booking_id=ANY(bids);
 UPDATE public.outbox SET status='superseded',claim_token=NULL,locked_until=NULL,version=version+1
  WHERE tenant_id=p_tenant AND booking_id=ANY(bids) AND status IN ('pending','failed','sending');
 -- Invalidate even in-progress snapshots; their publication rechecks the claim.
 UPDATE public.export_jobs SET status='cancelled',claim_token=NULL,locked_until=NULL,last_error_code='CONTACTS_REMOVED',version=version+1
  WHERE tenant_id=p_tenant AND status IN ('pending','running','ready','failed');
 UPDATE public.media SET expires_at=clock_timestamp(),version=version+1 WHERE tenant_id=p_tenant AND purpose='export' AND status<>'deleted';
 INSERT INTO public.contact_removals(tenant_id,customer_ids,booking_ids,requested_by) VALUES(p_tenant,ids,bids,actor_id) RETURNING id INTO removal_id;
 RETURN removal_id;
END $$;
REVOKE ALL ON FUNCTION remove_customer_contacts(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION remove_customer_contacts(uuid,uuid) TO booking_app;
