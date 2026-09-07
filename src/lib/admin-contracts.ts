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
  embedding?: {origins:string[];domains:Array<{hostname:string;ready:boolean}>};
  platformTenants?: Array<{id: string; name: string; slug: string; active: boolean}>;
};

// These are the explicit owner-controlled exceptions from chapter 04, not a role editor.
export const delegationOptions = [
  { permission: 'services.manage', label: 'Teenuste hinna ja kestuse muutmine', role: 'receptionist' },
  { permission: 'schedules.manage', label: 'Kõigi graafikute muutmine', role: 'receptionist' },
  { permission: 'theme.publish', label: 'Kujunduse avaldamine', role: 'receptionist' },
  { permission: 'schedules.own', label: 'Oma graafiku muutmine', role: 'staff' },
] as const;
