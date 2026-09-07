import { z } from 'zod';
import { getIdentity } from '@/lib/auth';
import { isAccountMailConfigured } from '@/lib/auth-mail';
import { listMemberships, listMembers, listPlatformTenants, requireMembership, requireOwnerInTransaction } from '@/lib/access';
import { listInvitations } from '@/lib/invitations';
import { withTenant } from '@/lib/db';
import { adminError, adminJson, assertAdminHost } from '@/lib/admin-http';
import { AppError } from '@/lib/errors';
import type { AdminState } from '@/lib/admin-contracts';
import {serviceManagementState} from '@/lib/service-management';
import {embeddingSettings} from '@/lib/embed';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    assertAdminHost(request);
    const actor = await getIdentity(request.headers);
    const state: AdminState = { user: actor, memberships: [], mailAvailable: isAccountMailConfigured() };
    if (!actor) return adminJson(state);
    const memberships = (await listMemberships(actor)).filter(item => item.active);
    state.memberships = memberships;
    const requestedId = new URL(request.url).searchParams.get('tenantId');
    if (requestedId && !z.uuid().safeParse(requestedId).success) {
      throw new AppError(400, 'INVALID_TENANT', 'Vigane ettevõtte tunnus.');
    }
    const selected = requestedId ? memberships.find(item => item.tenantId === requestedId) : memberships[0];
    if (requestedId && !selected) throw new AppError(403, 'MEMBERSHIP_REQUIRED', 'Sul ei ole selle ettevõtte liikmesust.');
    if (selected) state.selected = selected;

    // The identity and own memberships stay visible so a new owner can enroll MFA.
    // Privileged company information is not fetched until the server gate succeeds.
    if (selected && selected.role === 'owner' && actor.twoFactorEnabled) {
      await requireMembership(actor, selected.tenantId, 'members.manage');
      const [members, invitations, staff] = await Promise.all([
        listMembers(actor, selected.tenantId),
        listInvitations(actor, selected.tenantId),
        withTenant(selected.tenantId, async client => {
          await requireOwnerInTransaction(actor, selected.tenantId, client);
          const result = await client.query<{id: string; name: string}>('SELECT id,name FROM staff WHERE tenant_id=$1 AND active ORDER BY name,id', [selected.tenantId]);
          return result.rows;
        }),
      ]);
      state.members = members;
      state.invitations = invitations.filter(item => !item.acceptedAt && !item.cancelledAt && Date.parse(item.expiresAt) > Date.now());
      state.staff = staff;
      state.embedding = await embeddingSettings(actor,selected.tenantId);
    }
    if (selected && ((selected.role==='owner' && actor.twoFactorEnabled) || (selected.role==='receptionist' && selected.permissions.includes('services.manage')))) {
      state.catalog=await serviceManagementState(actor,selected.tenantId);
    }
    if (actor.isPlatformAdmin && actor.twoFactorEnabled) {
      state.platformTenants = await listPlatformTenants(actor);
    }
    return adminJson(state);
  } catch (error) { return adminError(error); }
}
