-- Close stale access created before staff archiving revoked pending invitations.
-- Restoring a profile must not revive either an old invitation or membership.
WITH cancelled AS (
 UPDATE invitations i SET cancelled_at=now()
 FROM staff s
 WHERE (s.tenant_id,s.id)=(i.tenant_id,i.staff_id) AND NOT s.active
   AND i.accepted_at IS NULL AND i.cancelled_at IS NULL
 RETURNING i.tenant_id,i.id,i.staff_id
)
INSERT INTO access_audit_log(tenant_id,action,target_id,metadata)
 SELECT tenant_id,'member.invitation.cancelled',id::text,
   jsonb_build_object('reason','staff-archived-migration','staffId',staff_id)
 FROM cancelled;

WITH revoked AS (
 UPDATE memberships m SET active=false,updated_at=now()
 FROM staff s
 WHERE (s.tenant_id,s.id)=(m.tenant_id,m.staff_id) AND NOT s.active
   AND m.active AND m.role<>'owner'
 RETURNING m.tenant_id,m.user_id,m.staff_id
), logged AS (
 INSERT INTO access_audit_log(tenant_id,target_user_id,action,target_id)
 SELECT tenant_id,user_id,'member.revoked.staff-archived',staff_id::text FROM revoked
)
DELETE FROM auth_session WHERE user_id IN (SELECT user_id FROM revoked);
