import { z } from 'zod';
import { adminActor, adminError, adminJson, assertAdminHost } from '@/lib/admin-http';
import { authBaseUrl } from '@/lib/auth-host';
import { isAccountMailConfigured, sendAccountMail } from '@/lib/auth-mail';
import { changeMemberRole, createSupportGrant, revokeMember, revokeSupportGrant, transferOwnership, updateMemberPermissions } from '@/lib/access';
import { acceptInvitation, cancelInvitation, inviteMember } from '@/lib/invitations';
import { AppError } from '@/lib/errors';
import { limitTenant, readJson } from '@/lib/http';
import {serviceManagementSchemas,type ServiceManagementAction} from '@/lib/service-management-contracts';
import {saveServiceManagement} from '@/lib/service-management';
import {scheduleSchemas,type ScheduleAction} from '@/lib/schedule-contracts';
import {saveSchedule,ScheduleConflictError} from '@/lib/schedule-management';
import {saveEmbedOrigins} from '@/lib/embed';

const tenantId = z.uuid();
const userId = z.string().min(1).max(128);
const role = z.enum(['receptionist', 'staff']);
const staffId = z.uuid().nullable().optional();
const permissions = z.array(z.enum(['services.manage','schedules.manage','theme.publish','schedules.own'])).max(4);
const schemas = {
  ...scheduleSchemas,
  ...serviceManagementSchemas,
  'embedding-settings': z.object({tenantId,origins:z.array(z.string().min(1).max(300)).max(10)}).strict(),
  invite: z.object({tenantId, email: z.email().max(254), role, staffId, permissions}).strict(),
  'accept-invitation': z.object({token: z.string().min(30).max(256)}).strict(),
  'cancel-invitation': z.object({tenantId, invitationId: z.uuid()}).strict(),
  'revoke-member': z.object({tenantId, userId}).strict(),
  'update-permissions': z.object({tenantId, userId, permissions}).strict(),
  'change-role': z.object({tenantId, userId, role, staffId}).strict(),
  'transfer-owner': z.object({tenantId, newOwnerUserId: userId}).strict(),
  'support-start': z.object({tenantId, reason: z.string().trim().min(10).max(500)}).strict(),
  'support-stop': z.object({grantId: z.uuid()}).strict(),
};
type Action = keyof typeof schemas;

export async function POST(request: Request, context: {params: Promise<{action: string}>}) {
  try {
    assertAdminHost(request, true);
    const { action } = await context.params;
    if (!Object.hasOwn(schemas, action)) throw new AppError(404, 'NOT_FOUND', 'Toimingut ei leitud.');
    const actor = await adminActor(request);
    await limitTenant(`admin:${actor.id}`, 60);
    const body: unknown = await readJson(request);
    const validated = schemas[action as Action].safeParse(body);
    if (!validated.success) throw new AppError(400, 'INVALID_INPUT', 'Kontrolli vormi andmeid.');

    if (Object.hasOwn(serviceManagementSchemas,action)) {
      await saveServiceManagement(actor,action as ServiceManagementAction,body);
      return adminJson({ok:true});
    }
    if(Object.hasOwn(scheduleSchemas,action)){
      await saveSchedule(actor,action as ScheduleAction,body);
      return adminJson({ok:true});
    }

    // Parse the already validated body with the selected schema to keep each branch typed.
    switch (action as Action) {
      case 'embedding-settings': {
        const data=schemas['embedding-settings'].parse(body);
        await saveEmbedOrigins(actor,data.tenantId,data.origins);
        break;
      }
      case 'invite': {
        if (!isAccountMailConfigured()) throw new AppError(503, 'MAIL_UNAVAILABLE', 'Kutsete saatmine ei ole veel seadistatud.');
        const data = schemas.invite.parse(body);
        await limitTenant(`admin-invite:${data.tenantId}`, 10);
        const invitation = await inviteMember(actor, data);
        try {
          const url = new URL('/', authBaseUrl);
          url.searchParams.set('invitation', invitation.token);
          await sendAccountMail({to: invitation.email, subject: 'Kutse broneering.info ettevõtte kasutajaks', text: `Sulle saadeti kutse ettevõtte halduskeskkonda. Kutse kehtib kuni ${invitation.expiresAt}.\n\nAva kutse ja kinnita oma e-post: ${url}\n\nKui sa seda kutset ei oodanud, võid kirja ignoreerida.`});
        } catch {
          await cancelInvitation(actor, data.tenantId, invitation.id);
          throw new AppError(503, 'MAIL_FAILED', 'Kutset ei õnnestunud saata. Palun proovi uuesti.');
        }
        return adminJson({ok: true});
      }
      case 'accept-invitation': {
        const data = schemas['accept-invitation'].parse(body);
        const membership = await acceptInvitation(actor, data.token);
        return adminJson({ok: true, tenantId: membership.tenantId});
      }
      case 'cancel-invitation': {
        const data = schemas['cancel-invitation'].parse(body);
        await cancelInvitation(actor, data.tenantId, data.invitationId);
        break;
      }
      case 'revoke-member': {
        const data = schemas['revoke-member'].parse(body);
        await revokeMember(actor, data.tenantId, data.userId);
        break;
      }
      case 'update-permissions': await updateMemberPermissions(actor, schemas['update-permissions'].parse(body)); break;
      case 'change-role': await changeMemberRole(actor, schemas['change-role'].parse(body)); break;
      case 'transfer-owner': {
        const data = schemas['transfer-owner'].parse(body);
        await transferOwnership(actor, data.tenantId, data.newOwnerUserId);
        break;
      }
      case 'support-start': {
        const data = schemas['support-start'].parse(body);
        const grant = await createSupportGrant(actor, data.tenantId, data.reason);
        return adminJson({ok: true, grant});
      }
      case 'support-stop': await revokeSupportGrant(actor, schemas['support-stop'].parse(body).grantId); break;
    }
    return adminJson({ok: true});
  } catch (error) {
    if(error instanceof ScheduleConflictError)return adminJson({error:error.message,code:error.code,conflicts:error.conflicts,total:error.total},409);
    return adminError(error,request);
  }
}
