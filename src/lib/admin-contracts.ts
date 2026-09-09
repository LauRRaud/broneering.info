import type {ServiceManagementState} from './service-management-contracts';
import type {ScheduleState} from './schedule-contracts';
import type {SupportGrant} from './access';
export type AdminRole = 'owner' | 'receptionist' | 'staff';
export type AdminIdentity = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  isPlatformAdmin: boolean;
};
export type AdminMembership = {
  dataAccessExpired?:boolean;
  tenantId: string;
  tenantName: string;
  role: AdminRole;
  staffId: string | null;
  permissions: string[];
};
export type AdminMember = {
  userId: string;
  name: string;
  email: string;
  role: AdminRole;
  staffId: string | null;
  permissions: string[];
  active: boolean;
  twoFactorEnabled: boolean;
};
export type AdminInvitation = {
  id: string;
  email: string;
  role: AdminRole;
  expiresAt: string;
};
export type AdminState = {
  user: AdminIdentity | null;
  memberships: AdminMembership[];
  mailAvailable: boolean;
  selected?: AdminMembership;
  members?: AdminMember[];
  invitations?: AdminInvitation[];
  staff?: Array<{id: string; name: string}>;
  catalog?: ServiceManagementState;
  schedules?:ScheduleState;
  embedding?: {origins:string[];domains:Array<{hostname:string;ready:boolean}>};
  platformTenants?: Array<{id: string; name: string; slug: string; active: boolean}>;
  supportGrants?:SupportGrant[];
};

// These are the explicit owner-controlled exceptions from chapter 04, not a role editor.
export const delegationOptions = [
  { permission: 'services.manage', label: 'Teenuste hinna ja kestuse muutmine', role: 'receptionist' },
  { permission: 'schedules.manage', label: 'Kõigi graafikute muutmine', role: 'receptionist' },
  { permission: 'theme.publish', label: 'Kujunduse avaldamine', role: 'receptionist' },
  { permission: 'schedules.own', label: 'Oma graafiku muutmine', role: 'staff' },
] as const;
