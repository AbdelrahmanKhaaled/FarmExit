import type { StaffMe } from '@/lib/api/types/admin-dashboard';
import { ADMIN_ROLE, SUPER_ADMIN_ROLE } from './roles';

/** Mirrors `api/src/modules/authorization/staff-permissions.ts` string values. */
export const StaffPermission = {
  PrivateLocationRead: 'farms.private-location.read',
  RequestsRead: 'requests.read',
  RequestsReview: 'requests.review',
  RequestsForward: 'requests.forward',
  CommunicationRelay: 'communication.relay',
  EvaluationsManage: 'evaluations.manage',
  StaffManage: 'staff.manage',
} as const;

export type StaffPermissionValue = (typeof StaffPermission)[keyof typeof StaffPermission];

const CONSOLE_STAFF_ROLES = new Set(['admin', 'superAdmin', 'caseAgent', 'reviewer']);

export function staffIsAdminScope(roles: readonly string[]): boolean {
  return roles.includes(ADMIN_ROLE) || roles.includes(SUPER_ADMIN_ROLE);
}

export function staffHasConsoleAccess(staff: Pick<StaffMe, 'roles'>): boolean {
  return staff.roles.some((role) => CONSOLE_STAFF_ROLES.has(role));
}

export function staffHasPermission(staff: Pick<StaffMe, 'permissions'>, permission: StaffPermissionValue): boolean {
  return staff.permissions.includes(permission);
}

export function staffHasAnyPermission(
  staff: Pick<StaffMe, 'permissions'>,
  permissions: readonly StaffPermissionValue[],
): boolean {
  return permissions.some((p) => staff.permissions.includes(p));
}

export function staffHasStaffRole(staff: Pick<StaffMe, 'roles'>, roles: readonly string[]): boolean {
  return roles.some((role) => staff.roles.includes(role));
}
